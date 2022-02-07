"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var descriptors = require("./descriptors");
var u = require("./util");
//
// processData takes sampled data as returned from the
// back-end and processes it for display as specified by the
// associated descriptors (see descriptors.js). Processing includes
// rate calculation, scaling, and computing derived metrics.
//
function processData(sources) {
    var result = {};
    for (var sourceName in sources)
        processSource(result, sourceName, sources[sourceName]);
    return result;
}
exports.processData = processData;
function processSource(result, source, rawData) {
    var e_1, _a;
    // our result
    var processedData = {
        data: new Map(),
        alerts: new Map(),
        replSetMemberId: undefined
    };
    // compute additional derived metrics
    descriptors.executeSpecials(rawData, processedData);
    // memoize dts by metric so we don't repeat computation
    var dtsByMetric = {};
    // memoize gapped ts by metric so we don't repeat computation
    var gtsByMetric = {};
    // process each metric
    for (var metric in rawData) {
        // get descriptors for each metric
        var descs = descriptors.getDescriptors(metric, rawData);
        var _loop_1 = function (desc) {
            // get our data
            var ys = rawData[metric];
            var isCopy = false;
            // anything for us to do?
            if (!desc || desc.ignore) {
                return "continue";
            }
            // get our ts
            var tbKey = desc.timebasePath.key;
            var ts = rawData[tbKey];
            if (!ts) {
                u.log("no data for", source, tbKey);
                return "continue";
            }
            // gaps are computed by the back end in condensed mode,
            // and represent the time shift required for each sample
            // to eliminate gaps between files.
            var gaps = rawData["gaps"];
            if (gaps) {
                var gts = gtsByMetric[tbKey];
                if (!gts) {
                    gtsByMetric[tbKey] = gts = new Array(ts.length);
                    for (var i = 0; i < ts.length; i++)
                        gts[i] = ts[i] - gaps[i];
                }
                ts = gts;
            }
            // get or compute delta ts for use in rate calculations
            // the delta ts are in seconds (not ms) for efficient use
            var dts = dtsByMetric[tbKey];
            if (!dts) {
                dtsByMetric[tbKey] = dts = new Array(ts.length);
                for (var i = 0; i < ts.length - 1; i++)
                    dts[i] = (ts[i + 1] - ts[i]) / 1000.0;
            }

            var needCopy = function () {
                if (!isCopy) {
                    ys = ys.slice();
                    isCopy = true;
                }
            };
 
            // desc.addPath: add a metric
            if (desc.addPath) {
                needCopy();
                var paths=desc.addPath;
                if (!Array.isArray(paths)){
                    paths = [paths]
                }
                paths.forEach(path => {
                var div = rawData[path.key];
                if (!div) {
                    u.log("missing " + path.displayString());
                    return "continue";
                }
                for (var j = 0; j < ys.length; j++)
                    ys[j] += div[j];
                })
            }
 
            // desc.subtractPath: subtract a metric
            if (desc.subtractPath) {
                needCopy();
                var div = rawData[desc.subtractPath.key];
                if (!div) {
                    u.log("missing " + desc.subtractPath.displayString());
                    return "continue";
                }
                for (var j = 0; j < ys.length; j++)
                    ys[j] -= div[j];
            }
 
            // desc.rate: y'/t' = dy/dt
            if (desc.rate) {
                var yy = new Array(ys.length);
                for (var j = 0; j < ys.length - 1; j++)
                    yy[j] = (ys[j + 1] - ys[j]) / dts[j];
                ys = yy;
                isCopy = true;
            }
            // desc.rateMetric: y'/r' = (dy/dt) / (dr/dt) = dy/dr
            if (desc.ratePath) {
                var yy = new Array(ys.length);
                var r = rawData[desc.ratePath.key];
                if (!r) {
                    u.log("missing " + desc.ratePath.displayString());
                    return "continue";
                }
                for (var j = 0; j < ys.length - 1; j++) {
                    var dr = r[j + 1] - r[j];
                    yy[j] = dr ? (ys[j + 1] - ys[j]) / dr : 0.0; // xxx null?
                }
                ys = yy;
                isCopy = true;
            }

            // desc.scale: scale by a number
            if (desc.scale) {
                needCopy();
                var scale = desc.scale;
                for (var j = 0; j < ys.length; j++)
                    ys[j] /= scale;
            }

            // desc.divPath: divide by a metric
            if (desc.divPath) {
                needCopy();
                var div = rawData[desc.divPath.key];
                if (!div) {
                    u.log("missing " + desc.divPath.displayString());
                    return "continue";
                }
                for (var j = 0; j < ys.length; j++) {
                    ys[j] = (div[j] == 0)? 0 : ( ys[j] / div[j] );
                }
            }
            // desc.mulPath: multiply by a metric
            if (desc.mulPath) {
                needCopy();
                var mul = rawData[desc.mulPath.key];
                if (!mul) {
                    u.log("missing " + desc.mulPath.displayString());
                    return "continue";
                }
                for (var j = 0; j < ys.length; j++)
                    ys[j] *= mul[j];
            }
            // clip min, e.g. for increase/decrease stats
            if (desc.clipMin != undefined) {
                needCopy();
                for (var j = 0; j < ys.length; j++)
                    if (ys[j] < desc.clipMin)
                        ys[j] = desc.clipMin;
            }
            // suppress samples larger than yDisplayMax
            if (desc.yDisplayMax != undefined) {
                var yy = new Array(ys.length);
                for (var j = 0; j < ys.length; j++)
                    yy[j] = ys[j] < desc.yDisplayMax ? ys[j] : null;
                ys = yy;
            }
            // omit missing data
            {
                var yy = new Array(ys.length);
                for (var j = 0; j < ys.length; j++)
                    yy[j] = ts[j] && dts[j] && isFinite(ys[j]) ? ys[j] : null;
                ys = yy;
            }
            // emit
            processedData.data.set(desc, { ts: ts, ys: ys });
            // compute alerts
            if (desc.alerter)
                processedData.alerts.set(desc, desc.alerter(ys));
        };
        try {
            // emit processed data item for each descriptor
            for (var descs_1 = (e_1 = void 0, __values(descs)), descs_1_1 = descs_1.next(); !descs_1_1.done; descs_1_1 = descs_1.next()) {
                var desc = descs_1_1.value;
                _loop_1(desc);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (descs_1_1 && !descs_1_1.done && (_a = descs_1.return)) _a.call(descs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    }
    // return our result
    result[source] = processedData;
}
//# sourceMappingURL=data.js.map
