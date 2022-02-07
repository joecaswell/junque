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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
var e_1, _a, e_2, _b, e_3, _c;
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var yaml = require("yaml");
var path = require("path");
var util = require("util");
var u = require("./util");

// all descriptors keyed by Desc.path.key (i.e. the metric)
// we may have multiple descriptors per metric to produce multiple charts with different options
var descriptors = new Map();
// sort order and section are determined by the values of these
// variables as descriptors are added, so the order of adding
// descriptors in this file is significant
var descriptorNumber = 0;
var currentSection = "NO SECTION";
// support command-line argument to ignore descriptors by path or pattern prefix
function ignore(paths) {
    var e_4, _a, e_5, _b, e_6, _c, e_7, _d, e_8, _e;
    try {
        for (var _f = __values(descriptors.values()), _g = _f.next(); !_g.done; _g = _f.next()) {
            var descs = _g.value;
            try {
                for (var descs_1 = (e_5 = void 0, __values(descs)), descs_1_1 = descs_1.next(); !descs_1_1.done; descs_1_1 = descs_1.next()) {
                    var desc = descs_1_1.value;
                    try {
                        for (var paths_1 = (e_6 = void 0, __values(paths)), paths_1_1 = paths_1.next(); !paths_1_1.done; paths_1_1 = paths_1.next()) {
                            var path_1 = paths_1_1.value;
                            if (desc.path.key.startsWith(path_1.key))
                                desc.ignore = true;
                        }
                    }
                    catch (e_6_1) { e_6 = { error: e_6_1 }; }
                    finally {
                        try {
                            if (paths_1_1 && !paths_1_1.done && (_c = paths_1.return)) _c.call(paths_1);
                        }
                        finally { if (e_6) throw e_6.error; }
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (descs_1_1 && !descs_1_1.done && (_b = descs_1.return)) _b.call(descs_1);
                }
                finally { if (e_5) throw e_5.error; }
            }
        }
    }
    catch (e_4_1) { e_4 = { error: e_4_1 }; }
    finally {
        try {
            if (_g && !_g.done && (_a = _f.return)) _a.call(_f);
        }
        finally { if (e_4) throw e_4.error; }
    }
    try {
        for (var patterns_1 = __values(patterns), patterns_1_1 = patterns_1.next(); !patterns_1_1.done; patterns_1_1 = patterns_1.next()) {
            var desc = patterns_1_1.value;
            try {
                for (var paths_2 = (e_8 = void 0, __values(paths)), paths_2_1 = paths_2.next(); !paths_2_1.done; paths_2_1 = paths_2.next()) {
                    var path_2 = paths_2_1.value;
                    if (desc.pattern && desc.pattern.key.startsWith(path_2.key))
                        desc.ignore = true;
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (paths_2_1 && !paths_2_1.done && (_e = paths_2.return)) _e.call(paths_2);
                }
                finally { if (e_8) throw e_8.error; }
            }
        }
    }
    catch (e_7_1) { e_7 = { error: e_7_1 }; }
    finally {
        try {
            if (patterns_1_1 && !patterns_1_1.done && (_d = patterns_1.return)) _d.call(patterns_1);
        }
        finally { if (e_7) throw e_7.error; }
    }
}
exports.ignore = ignore;
// default name is just path separated by spaces
function getName(desc) {
    if (!desc.path)
        throw "descriptor metric missing" + JSON.stringify(desc);
    if (!desc.name)
        desc.name = desc.path.path.join(" ");
    return desc.name;
}
// sort order used by charts is constructed from chart sort order by
// * appending source so that charts that are otherwise the same sort by source
// * inserting supplied data value if desc requests sorting by data
//   this has to be inserted in the middle to override the pattern match part - see searchPattern
var dataSortOrderMarker = "__DATA__";
function getOrder(desc, source, data) {
    var order = desc.order.concat(source);
    if (desc.sortByData) {
        var i = order.indexOf(dataSortOrderMarker);
        if (i >= 0)
            order[i] = data * desc.sortByData;
    }
    return order;
}
exports.getOrder = getOrder;
// use SECTION to provide a section for the descriptors added after calling it
function SECTION(s) {
    currentSection = s;
}
// load tips from tips.yml
var tipsPath = path.join(__dirname, 'tips.yml');
var infoTipsFile = fs.readFileSync(tipsPath, 'utf8');
var infoTips = process.env.T2TEST ? {} : yaml.parse(infoTipsFile); // don't test tips for now
// addDescriptor takes a partially constructed descriptor, fills in
// the missing information to make it a fully constructored
// descriptor, and enters it into the descriptors map, where it can be
// looked up by desc.path to construct a Chart for a given metric
function addDescriptor(desc) {
    if (!desc.path)
        throw "descriptor metric path missing " + JSON.stringify(desc);
    if (!desc.timebasePath && !desc.ignore)
        u.printStackTrace("descriptor timebase path missing for " + desc.path.key);
    if (desc.rate && desc.ratePath)
        throw "desc.rate and desc.ratePath should not both be set for " + desc.path;
    desc.id = descriptorNumber++;
    if (!desc.section)
        desc.section = currentSection;
    if (!desc.order)
        desc.order = [desc.id];
    desc.name = getName(desc);
    // look up infoTip if available, if not already supplied (e.g. from patternDesc.name)
    if (!desc.infoTip)
        desc.infoTip = infoTips[desc.name];
    // turn scale into a number
    // if scale is specified as a string it implies units
    if (typeof desc.scale == "string") {
        var unitScale = { "KiB": 1024, "MiB": 1024 * 1024, "MB": 1000 * 1000 }[desc.scale];
        if (unitScale) {
            desc.units = desc.scale;
            desc.scale = unitScale;
        }
    }
    // in case we want to append /s
    if (!desc.units)
        desc.units = "";
    // set or modify units if we"re doing a rate calculation
    if (desc.rate == "delta")
        desc.units = "delta";
    else if (desc.units == "#")
        desc.units = "";
    else if (desc.rate && !desc.ratePath && desc.units != "%" &&
        desc.units != "threads" && desc.units != "tasks" && desc.units != "cpus")
        desc.units += "/s";
    // add descriptor to map
    var descs = descriptors.get(desc.path.key);
    if (!descs)
        descs = [];
    descs.push(desc);
    descriptors.set(desc.path.key, descs);
    return desc;
}
//
// load descriptors from an external file
//
function loadDescriptors(fn) {
    var e_9, _a;
    try {
        u.log("reading", fn);
        throw "xxx";
        var json = fs.readFileSync(fn, "utf-8");
        var descs = JSON.parse(json);
        var _loop_1 = function (desc) {
            ["path", "timebasePath"].forEach(function (field) {
                var _a;
                if (desc[field])
                    desc[field] = new ((_a = u.Path).bind.apply(_a, __spread([void 0], desc[field])))();
            });
            addDescriptor(desc);
        };
        try {
            for (var descs_2 = __values(descs), descs_2_1 = descs_2.next(); !descs_2_1.done; descs_2_1 = descs_2.next()) {
                var desc = descs_2_1.value;
                _loop_1(desc);
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (descs_2_1 && !descs_2_1.done && (_a = descs_2.return)) _a.call(descs_2);
            }
            finally { if (e_9) throw e_9.error; }
        }
    }
    catch (e) {
        var msg = fn + ": " + e;
        u.log("ERROR", msg);
        // ctx() not ready yet, so errors during init can't go to gui
        //ctx().status.error(msg)
    }
}
exports.loadDescriptors = loadDescriptors;
function sortOrder(a, b) {
    var ao = a.order;
    var bo = b.order;
    var n = Math.max(ao.length, bo.length);
    for (var i = 0; i < n; i++) {
        var aa = i < ao.length ? ao[i] : 0;
        var bb = i < bo.length ? bo[i] : 0;
        if (aa < bb)
            return -1;
        if (aa > bb)
            return 1;
    }
    return 0;
}
exports.sortOrder = sortOrder;
//
// Patterns are used to process metrics that may have variable parts,
// e.g. disk metrics that have the name of the disk as part of the
// metric name
//
// The variable part is matched by a regexp. A selected group of
// fields ("name", "ratePath", "scalePath", "chart") may have
// references to the variable patterns consisting of the strings
// "{1}", "{2}" etc. that are substituted with the corresponding
// capture group in the pattern
//
// searchPatterns looks for pattern that matches a metric, constructs
// a descriptor from the exact metric that matched the pattern,
// applies the substitutions, enters it into the descriptors table,
// and returns that new descriptor
//
var patterns = [];
var patternGroupOrders = new Map();
function addPattern(desc, patternGroup) {
    if (desc.rate && desc.ratePath)
        throw "desc.rate and desc.ratePath should not both be set for " + desc.path;
    // each patternGroup is sorted according to the order of first occurrence
    if (!patternGroupOrders.get(patternGroup))
        patternGroupOrders.set(patternGroup, descriptorNumber++);
    // supply necessary fields, add to patterns list
    if (!desc.section)
        desc.section = currentSection;
    desc.order = [descriptorNumber++];
    desc.patternGroupOrder = patternGroupOrders.get(patternGroup);
    patterns.push(desc);
}
function searchPatterns(metric) {
    var descs = [];
    var _loop_2 = function (i) {
        var patternDesc = patterns[i];
        var match = patternDesc.pattern.regexp.exec(metric);
        if (match) {
            // pattern match, create a new descriptor by copying pattern descriptor and substituting
            var desc_1 = Object.assign({}, patternDesc);
            if (desc_1.sortPatternsByDesc)
                desc_1.order = [desc_1.patternGroupOrder, dataSortOrderMarker, desc_1.order, match[1]];
            else
                desc_1.order = [desc_1.patternGroupOrder, dataSortOrderMarker, match[1], desc_1.order];
            desc_1.path = u.Path.fromKey(metric);
            var _loop_3 = function (i_1) {
                var subst = function (field) {
                    var x = desc_1[field];
                    if (typeof x == "string") {
                        desc_1[field] = x.replace("{" + i_1 + "}", match[i_1]);
                    }
                    else if (x instanceof u.Path) {
                        var key = x.key.replace("{" + i_1 + "}", match[i_1]);
                        desc_1[field] = u.Path.fromKey(key);
                    }
                };
                subst("name");
                subst("ratePath");
                subst("addPath");
                subst("subtractPath");
                subst("divPath");
                subst("mulPath");
                subst("chart");
                subst("section");
            };
            for (var i_1 = 1; i_1 < match.length; i_1++) {
                _loop_3(i_1);
            }
            desc_1.infoTip = infoTips[patternDesc.name];
            addDescriptor(desc_1);
            descs.push(desc_1);
        }
    };
    for (var i in patterns) {
        _loop_2(i);
    }
    return descs.length > 0 ? descs : undefined;
}
var specials = [];
function addSpecial(special) {
    specials.push(special);
}
function executeSpecials(data, processedData) {
    var e_10, _a;
    try {
        for (var specials_1 = __values(specials), specials_1_1 = specials_1.next(); !specials_1_1.done; specials_1_1 = specials_1.next()) {
            var special = specials_1_1.value;
            special(data, processedData);
        }
    }
    catch (e_10_1) { e_10 = { error: e_10_1 }; }
    finally {
        try {
            if (specials_1_1 && !specials_1_1.done && (_a = specials_1.return)) _a.call(specials_1);
        }
        finally { if (e_10) throw e_10.error; }
    }
}
exports.executeSpecials = executeSpecials;
// alert on two thresheold values:
// < yellow: alert green
// >= yellow: alert yellow
// >= red: alert red
function gyrAlerter(yellow, red) {
    return function (ys) {
        var alerts = new Array(ys.length);
        for (var i = 0; i < ys.length; i++) {
            if (ys[i] >= red)
                alerts[i] = "red-alert";
            else if (ys[i] >= yellow)
                alerts[i] = "yellow-alert";
            else
                alerts[i] = "green-alert";
        }
        return alerts;
    };
}
//
// Look up the descriptors for a given metric. This is the main entry
// point for users of descriptors. If an exact match for the metric
// isn't found, try matching it against the list of patterns. If no
// match is found, construct default descriptors so that the metric
// is rendered with a default view.
//
function getDescriptors(key, rawData) {
    var e_11, _a;
    // look it up
    var descs = descriptors.get(key);
    if (descs)
        return descs;
    // if missing look for a pattern
    descs = searchPatterns(key);
    if (descs)
        return descs;
    // Add default if missing.
    var path = u.Path.fromKey(key);
    var fill = function (desc) {
        desc.id = descriptorNumber++;
        desc.path = path;
        desc.timebasePath = P(path.path[0], "start");
        desc.order = [desc.id];
        // hiding 0 charts screws up tree so disable that here
        if (desc.treeLevel != undefined)
            desc.showZero = true;
        return desc;
    };
    var add = function (desc) {
        fill(desc);
        return addDescriptor(desc);
    };
    if (path.path[0] == "csv") {
        // Process csv field names to extract metadata in following format:
        //     field name#rate;rateField=...;units=...;name=...
        var desc = {
            name: path.displayString(" "),
            section: "CSV"
        };
        var name_opts = path.path[1].split("#");
        if (name_opts.length > 1) {
            desc.name = "csv " + name_opts[0];
            var opts = name_opts[1].split(";");
            try {
                for (var opts_1 = __values(opts), opts_1_1 = opts_1.next(); !opts_1_1.done; opts_1_1 = opts_1.next()) {
                    var opt = opts_1_1.value;
                    var nv = opt.split("=");
                    if (nv[0] == "rate") {
                        desc.rate = true;
                    }
                    else if (nv[0] == "rateField") {
                        for (var k in rawData) {
                            var p = u.Path.fromKey(k);
                            if (p.path[1].split("#")[0] == nv[1])
                                desc.ratePath = p;
                        }
                    }
                    else {
                        desc[nv[0]] = isNaN(Number(nv[1])) ? nv[1] : Number(nv[1]);
                    }
                }
            }
            catch (e_11_1) { e_11 = { error: e_11_1 }; }
            finally {
                try {
                    if (opts_1_1 && !opts_1_1.done && (_a = opts_1.return)) _a.call(opts_1);
                }
                finally { if (e_11) throw e_11.error; }
            }
        }
        // don't add it to the descriptor table so that each csv file
        // is treated as a new set of possibly unrelated metrics with
        // descriptors created anew
        return [fill(desc)];
    }
    else {
        // Add two descriptors, one producing a chart for the raw
        // metric, one as a rate, because we don't know which is most
        // appropriate
        u.log("UNKNOWN: " + path.path);
        var name_1 = "UNKNOWN: " + path.displayString(" ");
        return [
            add({
                rate: false,
                name: name_1,
                autoScale: "auto",
                section: "Unknown"
            }),
            add({
                rate: true,
                name: name_1 + " rate",
                autoScale: "auto",
                section: "Unknown"
            })
        ];
    }
}
exports.getDescriptors = getDescriptors;
//
// Define some convenience functions for often repeated patterns of
// metrics.
//
// accumulate non-oplog collstats and emit in separate section
var csDescs = [];
function P() {
    var _a;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return new ((_a = u.Path).bind.apply(_a, __spread([void 0], args)))();
}
function prependPaths(desc, pre) {
    if (desc.path)
        desc.path = desc.path.prepend(pre);
    if (desc.ratePath)
        desc.ratePath = desc.ratePath.prepend(pre);
    if (desc.divPath)
        desc.divPath = desc.divPath.prepend(pre);
    if (desc.mulPath)
        desc.mulPath = desc.mulPath.prepend(pre);
    if (desc.addPath)
        if (Array.isArray(desc.addPath)){
            desc.addPath = desc.addPath.map(p => p.prepend(pre));
        }else{
            desc.addPath = desc.addPath.prepend(pre);
        }
    if (desc.subtractPath)
        desc.subtractPath = desc.subtractPath.prepend(pre);
    if (desc.pattern)
        desc.pattern = desc.pattern.prepend(pre);
}
function ss(desc) {
    desc.name = "ss " + getName(desc);
    prependPaths(desc, ["ftdc", "serverStatus"]);
    desc.timebasePath = P("ftdc", "serverStatus", "start");
    addDescriptor(desc);
}
function cs(desc) {
    var csDesc = Object.assign({}, desc);
    // oplog collStats is provided as part of ftdc
    desc.name = "oplog " + getName(desc);
    prependPaths(desc, ["ftdc", "local.oplog.rs.stats"]);
    desc.timebasePath = P("ftdc", "local.oplog.rs.stats", "start");
    addDescriptor(desc);
    // manually collected collStats
    csDesc.name = "collStats " + getName(csDesc);
    csDesc.section = "Collection metrics";
    prependPaths(csDesc, ["ftdc", "collStats"]);
    csDesc.timebasePath = P("ftdc", "collStats", "time");
    csDescs.push(csDesc);
}
function cps(desc) {
    desc.name = "connPoolStats " + getName(desc);
    prependPaths(desc, ["ftdc", "connPoolStats"]);
    desc.timebasePath = P("ftdc", "connPoolStats", "start");
    addDescriptor(desc);
}
// wt changed 'lookaside' to 'cache overflow'. The following supports
// old pre-change metrics by adding a metric with key 'lookaside' but
// leaves the output string as 'cache overflow' for consistency
// between the old and new. This means that for old data the metric
// name will be 'lookaside' but it will display as 'cache overflow'.
function lookasideHack(desc, disposition) {
    if (desc.path.key.indexOf('cache overflow') >= 0) {
        var altDesc = Object.assign({}, desc);
        altDesc.path = u.Path.fromKey(desc.path.key.replace('cache overflow', 'lookaside'));
        //u.log('adding desc')
        //u.log('    key:', altDesc.path.key)
        //u.log('    name:', altDesc.name)
        disposition(altDesc);
    }
}
function cs_wt(desc) {
    var wtDesc = Object.assign({}, desc);
    var csDesc = Object.assign({}, desc);
    // oplog collStats is provided as part of ftdc
    desc.name = "oplog wt " + getName(desc); // xxx generalize if we generalize
    prependPaths(desc, ["ftdc", "local.oplog.rs.stats", "wiredTiger"]);
    desc.timebasePath = P("ftdc", "local.oplog.rs.stats", "start");
    lookasideHack(desc, addDescriptor);
    addDescriptor(desc);
    // manually collected collStats
    csDesc.name = "collStats " + getName(csDesc);
    csDesc.section = "WiredTiger collection metrics";
    prependPaths(csDesc, ["ftdc", "collStats", "wiredTiger"]);
    csDesc.timebasePath = P("ftdc", "collStats", "time");
    lookasideHack(csDesc, function (desc) { return csDescs.push(desc); });
    csDescs.push(csDesc);
    // this supports wt native stats used for wt development which
    // output a serverStatus-like json format that includes per-table
    // information
    var pre = P("ftdc", "serverStatus", "wiredTigerTables", "(.+)");
    wtDesc.pattern = wtDesc.path.prepend(pre.path);
    wtDesc.name = "wt table " + getName(wtDesc);
    wtDesc.timebasePath = P("ftdc", "serverStatus", "localTime");
    wtDesc.section = "wt table {1}";
    lookasideHack(wtDesc, function (desc) { return addPattern(desc, "wiredTigerTables"); });
    addPattern(wtDesc, "wiredTigerTables");
}
function wt(desc) {
    // substitute WT units in our style for consistency    
    function subUnits(desc, name, a, b) {
        a = " (" + a + ")";
        if (name.endsWith(a)) {
            name = name.substring(0, name.length - a.length);
            if (!desc.units)
                desc.units = b;
        }
        return name;
    }
    var name = getName(desc);
    name = subUnits(desc, name, "usecs", "µs");
    name = subUnits(desc, name, "msecs", "ms");
    desc.name = "wt " + name;
    prependPaths(desc, ["wiredTiger"]);
    lookasideHack(desc, ss);
    ss(desc);
}
function sm(desc) {
    desc.name = "system " + getName(desc);
    prependPaths(desc, ["ftdc", "systemMetrics"]);
    desc.timebasePath = P("ftdc", "systemMetrics", "start");
    addDescriptor(desc);
}
/////////////////////////////////////////////////////////////////////////////////
//
// Actual descriptor definitions follow. As described above order
// matters wrt sections and wrt sort order when the charts are
// rendered.
//
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Thread profile");
//
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Server status");
//
function opcounters(node, chart) {
    // note: order matters here because it determines colors when merged
    ss({ path: P(node, "query"), rate: true, chart: chart });
    ss({ path: P(node, "insert"), rate: true, chart: chart });
    ss({ path: P(node, "update"), rate: true, chart: chart });
    ss({ path: P(node, "delete"), rate: true, chart: chart });
    ss({ path: P(node, "command"), rate: true, chart: chart });
    ss({ path: P(node, "getmore"), rate: true, chart: chart });
}
opcounters("opcounters", "ss_opcounters");
opcounters("opcountersRepl", "ss_opcounters_repl");
////
// xxx custome colors?
function ss_latency(name, color) {
    ss({
        path: P("opLatencies", name, "ops"),
        chart: "ss_latency_ops",
        name: "ops " + name,
        color: color,
        rate: true,
    });
    ss({
        path: P("opLatencies", name, "latency"),
        chart: "ss_latency_latency",
        name: "average latency " + name,
        color: color,
        units: "ms",
        ratePath: P("opLatencies", name, "ops"),
        scale: 1000,
    });
}
// note: order matters here because it determines colors when merged
ss_latency("reads");
ss_latency("writes");
ss_latency("commands", 4 /* color - matches index of command in opcounters */);
ss_latency("transactions");
ss({ path: P("opReadConcernCounters", "none"), rate: true, chart: "orcc" });
ss({ path: P("opReadConcernCounters", "available"), rate: true, chart: "orcc" });
ss({ path: P("opReadConcernCounters", "majority"), rate: true, chart: "orcc" });
ss({ path: P("opReadConcernCounters", "local"), rate: true, chart: "orcc" });
ss({ path: P("opReadConcernCounters", "snapshot"), rate: true, chart: "orcc" });
ss({ path: P("opReadConcernCounters", "linearizable"), rate: true, chart: "orcc" });
ss({
    path: P("globalLock", "activeClients", "readers"),
    name: "ss global: active readers",
    chart: "_ss_active_queue",
});
ss({
    path: P("globalLock", "activeClients", "writers"),
    name: "ss global: active writers",
    chart: "_ss_active_queue",
});
ss({
    path: P("globalLock", "currentQueue", "readers"),
    name: "ss global: queued readers",
    chart: "_ss_queue",
});
ss({
    path: P("globalLock", "currentQueue", "writers"),
    name: "ss global: queued writers",
    chart: "_ss_queue",
});
ss({ path: P("asserts", "msg"), rate: true });
ss({ path: P("asserts", "regular"), rate: true });
ss({ path: P("asserts", "rollovers"), rate: true });
ss({ path: P("asserts", "user"), rate: true });
ss({ path: P("asserts", "warning"), rate: true });
ss({ path: P("connections", "available"), autoScale: "decimal" });
ss({ path: P("connections", "current"), autoScale: "decimal", chart: "connections" });
ss({ path: P("connections", "active"), autoScale: "decimal", chart: "connections" });
ss({ path: P("connections", "totalCreated"), name: "connections created", rate: true });
ss({ path: P("connections", "current"), name: "connections net increase",
    rate: true, clipMin: 0 });
ss({ path: P("connections", "current"), name: "connections net decrease",
    rate: true, scale: -1, clipMin: 0 });
ss({ path: P("cursors", "clientCursors_size") });
ss({ path: P("cursors", "pinned") });
ss({ path: P("cursors", "timedOut") });
ss({ path: P("cursors", "totalNoTimeout") });
ss({ path: P("cursors", "totalOpen") });
// xxx is this the right place for these? do they need their own section?
ss({ path: P("logicalSessionRecordCache", "records") });
ss({ path: P("logicalSessionRecordCache", "activeSessionsCount") });
ss({ path: P("logicalSessionRecordCache", "activeSessionsCount"), name: "sessions increase", rate: true, clipMin: 0 });
ss({ path: P("logicalSessionRecordCache", "lastSessionsCollectionJobCursorsClosed") });
ss({ path: P("logicalSessionRecordCache", "lastSessionsCollectionJobDurationMillis"), units: "ms" });
ss({ path: P("logicalSessionRecordCache", "lastSessionsCollectionJobEntriesEnded") });
ss({ path: P("logicalSessionRecordCache", "lastSessionsCollectionJobEntriesRefreshed") });
ss({ path: P("logicalSessionRecordCache", "lastSessionsCollectionJobTimestamp"), ignore: true });
ss({ path: P("logicalSessionRecordCache", "lastTransactionReaperJobDurationMillis"), units: "ms" });
ss({ path: P("logicalSessionRecordCache", "lastTransactionReaperJobEntriesCleanedUp") });
ss({ path: P("logicalSessionRecordCache", "lastTransactionReaperJobTimestamp"), ignore: true });
ss({ path: P("logicalSessionRecordCache", "sessionCatalogSize") });
ss({ path: P("logicalSessionRecordCache", "sessionsCollectionJobCount"), rate: "delta" });
ss({ path: P("logicalSessionRecordCache", "transactionReaperJobCount"), rate: "delta" });
ss({ path: P("freeMonitoring", "registerErrors"), rate: "delta" });
ss({ path: P("freeMonitoring", "metricsErrors"), rate: "delta" });
ss({ path: P("freeMonitoring", "retryIntervalSecs"), ignore: true });
ss({ path: P("trafficRecording", "running") });
ss({ path: P("uptime"), units: "s", autoScale: "time" });
ss({ path: P("writeBacksQueued") });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Client latency histogram");
//
// xxx this is a special-purpose hack to support csv files that represent latency histograms
// triggered by csv files with field names of the form "bucket ..." where ... is the name
// generalize so that csv files can specify scaleGroup, section, rate, etc.?
addPattern({
    pattern: P("csv", "bucket (.*)"),
    name: "{1}",
    rate: true,
    scaleGroup: "client latency histogram",
    timebasePath: P("csv", "start")
}, "client-latency-histogram");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Query metrics");
//
// note: order matters here because it determines colors when merged
ss({ path: P("metrics", "document", "returned"), rate: true, chart: "metrics_document" });
ss({ path: P("metrics", "document", "inserted"), rate: true, chart: "metrics_document" });
ss({ path: P("metrics", "document", "updated"), rate: true, chart: "metrics_document" });
ss({ path: P("metrics", "document", "deleted"), rate: true, chart: "metrics_document" });
ss({
    path: P("metrics", "document", "returned"),
    ratePath: P("opcounters", "query"),
    name: "documents returned per query"
});
ss({ path: P("metrics", "queryExecutor", "scanned"), rate: true, chart: "qe_scanned" });
ss({ path: P("metrics", "queryExecutor", "scannedObjects"), rate: true, chart: "qe_scanned" });
ss({ path: P("metrics", "cursor", "open", "multiTarget"), chart: "cursor_open" });
ss({ path: P("metrics", "cursor", "open", "noTimeout"), chart: "cursor_open" });
ss({ path: P("metrics", "cursor", "open", "pinned"), chart: "cursor_open" });
ss({ path: P("metrics", "cursor", "open", "singleTarget"), chart: "cursor_open" });
ss({ path: P("metrics", "cursor", "open", "total"), chart: "cursor_open" });
ss({ path: P("metrics", "cursor", "timedOut"), rate: true });
ss({ path: P("metrics", "getLastError", "wtime", "num"), rate: true });
ss({ path: P("metrics", "getLastError", "wtime", "totalMillis"), rate: true });
ss({ path: P("metrics", "getLastError", "wtime", "totalMillis"),
    ratePath: P("metrics", "getLastError", "wtime", "num"), units: "ms",
    name: "average wtime"
});
ss({ path: P("metrics", "getLastError", "wtimeouts"), rate: true });
ss({ path: P("metrics", "operation", "fastmod"), rate: true });
ss({ path: P("metrics", "operation", "idhack"), rate: true });
ss({ path: P("metrics", "operation", "scanAndOrder"), rate: true });
ss({ path: P("metrics", "operation", "writeConflicts"), rate: true });
ss({ path: P("metrics", "query", "updateOneOpStyleBroadcastWithExactIDCount"), rate: true });
ss({ path: P("metrics", "record", "moves"), rate: true });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Transactions");
//
function ss_transaction_commit_types(metric) {
    ss({ path: P("transactions", "commitTypes", metric, "initiated"), rate: true });
    ss({ path: P("transactions", "commitTypes", metric, "successful"), rate: true });
    ss({ path: P("transactions", "commitTypes", metric, "successfulDurationMicros") });
}
ss({ path: P("transactions", "retriedCommandsCount"), rate: true });
ss({ path: P("transactions", "retriedStatementsCount"), rate: true });
ss({ path: P("transactions", "transactionsCollectionWriteCount"), rate: true });
ss({ path: P("transactions", "currentOpen"), name: "current open", chart: "txn_current" });
ss({ path: P("transactions", "currentActive"), name: "current active", chart: "txn_current" });
ss({ path: P("transactions", "currentInactive"), name: "current inactive", chart: "txn_current" });
ss({ path: P("transactions", "totalStarted"), name: "total started", chart: "txn_total", rate: true });
ss({ path: P("transactions", "totalCommitted"), name: "total committed", chart: "txn_total", rate: true });
ss({ path: P("transactions", "totalAborted"), name: "total aborted", chart: "txn_total", rate: true });
ss({ path: P("transactions", "currentPrepared"), name: "current prepared" });
ss({ path: P("transactions", "totalPrepared"), name: "total prepared", rate: true });
ss({ path: P("transactions", "totalPreparedThenCommitted"), name: "total prepared then committed", rate: true });
ss({ path: P("transactions", "totalPreparedThenAborted"), name: "total prepared then aborted", rate: true });
ss_transaction_commit_types("noShards");
ss_transaction_commit_types("readOnly");
ss_transaction_commit_types("recoverWithToken");
ss_transaction_commit_types("singleShard");
ss_transaction_commit_types("singleWriteShard");
ss_transaction_commit_types("twoPhaseCommit");
ss_transaction_commit_types("noShards");
ss({ path: P("transactions", "totalContactedParticipants"), name: "total contacted", rate: true });
ss({ path: P("transactions", "totalParticipantsAtCommit"), name: "total participants at commit", rate: true });
ss({ path: P("transactions", "totalRequestsTargeted"), name: "total requests targeted", rate: true });
ss({ path: P("twoPhaseCommitCoordinator", "currentInSteps", "waitingForDecisionAcks"), chart: "twpcccis" });
ss({ path: P("twoPhaseCommitCoordinator", "currentInSteps", "waitingForVotes"), chart: "twpcccis" });
ss({ path: P("twoPhaseCommitCoordinator", "currentInSteps", "writingDecision"), chart: "twpcccis" });
ss({ path: P("twoPhaseCommitCoordinator", "currentInSteps", "writingParticipantList"), chart: "twpcccis" });
ss({ path: P("twoPhaseCommitCoordinator", "currentInSteps", "deletingCoordinatorDoc"), chart: "twpcccis" });
ss({ path: P("twoPhaseCommitCoordinator", "totalCreated"), rate: true, chart: "tpcctc" });
ss({ path: P("twoPhaseCommitCoordinator", "totalStartedTwoPhaseCommit"), rate: true, chart: "tpcctc" });
ss({ path: P("twoPhaseCommitCoordinator", "totalAbortedTwoPhaseCommit"), rate: true, chart: "tpcctc" });
ss({ path: P("twoPhaseCommitCoordinator", "totalCommittedTwoPhaseCommit"), rate: true, chart: "tpcctc" });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Service executor");
//
function se(metric, desc) {
    if (desc === void 0) { desc = {}; }
    desc.path = P.apply(void 0, __spread(["network", "serviceExecutorTaskStats"], metric));
    desc.name = "serviceExecutor " + desc.name;
    ss(desc);
}
function se_task(metric, name) {
    se(metric.concat(["totalTimeQueuedMicros"]), {
        name: "tasks " + name + " currently queued",
        chart: "se_time_queued",
        rate: true,
        scale: 1000000,
        units: "tasks"
    });
    se(metric.concat(["totalTimeExecutingMicros"]), {
        name: "tasks " + name + " currently executing",
        chart: "se_time_executing",
        rate: true,
        scale: 1000000,
        units: "threads"
    });
    se(metric.concat(["totalQueued"]), {
        name: "tasks " + name + " queued",
        chart: "se_rate_queued",
        rate: true
    });
    se(metric.concat(["totalExecuted"]), {
        name: "tasks " + name + " executed",
        chart: "se_rate_executed",
        rate: true
    });
}
se_task([], "total");
se_task(["metricsByTask", "sourceMessage"], "source");
se_task(["metricsByTask", "processMessage"], "process");
se_task(["metricsByTask", "exhaustMessage"], "exhaust");
se_task(["metricsByTask", "startSession"], "start");
function se_pat(metric, name, chart, desc) {
    if (desc === void 0) { desc = {}; }
    desc.pattern = P("ftdc", "serverStatus", "network", "serviceExecutorTaskStats", "metricsByTask", "(.*)", metric);
    desc.timebasePath = P("ftdc", "serverStatus", "start");
    desc.name = "ss serviceExecutor {1} " + name;
    desc.rate = true;
    desc.chart = chart;
    addPattern(desc, "se");
}
se_pat("totalTimeQueuedMicros", "currently queued", "se_time_queued", { units: "tasks", scale: 1000000 });
se_pat("totalTimeExecutingMicros", "currently executing", "se_time_executing", { units: "threads", scale: 1000000 });
se_pat("totalQueued", "queued", "se_rate_queued");
se_pat("totalExecuted", "executed", "se_rate_executed");
se(["threadsRunning"], { name: "threads running", chart: "se_threads" });
se(["threadsInUse"], { name: "threads in use", chart: "se_threads" });
se(["threadsPending"], { name: "threads pending", chart: "se_threads" });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Server log");
//
addDescriptor({
    path: P("mongod", "bin -1"),
    timebasePath: P("mongod", "start"),
    name: "log entries",
    rate: true
});
addDescriptor({
    path: P("mongod", "bin 0"),
    timebasePath: P("mongod", "start"),
    name: "logged slow queries",
    rate: true,
});
addDescriptor({
    path: P("mongod", "max"),
    timebasePath: P("mongod", "start"),
    name: "logged slowest query durations",
    style: "ramps",
    units: "ms",
});
/*
// These two sees less useful, and they clutter the charts
// xxx consider reinstating when in/out of view is per-chart, not per-metric

addDescriptor({
    path: P("mongod", "max"),
    timebasePath: P("mongod", "start"),
    name: "logged slowest query",
    units: "ms",
})

addDescriptor({
    path: P("mongod", "max"),
    timebasePath: P("mongod", "start"),
    name: "logged slowest query filled ramps",
    style: "filledRamps",
    units: "ms",
})
*/
var bins = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100];
bins.forEach(function (bin) {
    addDescriptor({
        path: P("mongod", "bin " + bin),
        timebasePath: P("mongod", "start"),
        name: "logged slow queries ≥ " + bin + " ms",
        ratePath: P("mongod", "bin 0"),
        scale: .01,
        yMax: 100,
        units: "%"
    });
});
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Flow control");
//
ss({ path: P("flowControl", "enabled") });
ss({ path: P("flowControl", "isLagged") });
ss({ path: P("flowControl", "locksPerOp") });
ss({ path: P("flowControl", "sustainerRate"), autoScale: "decimal", units: "/s" });
ss({ path: P("flowControl", "targetRateLimit"), autoScale: "decimal", units: "/s" });
ss({ path: P("flowControl", "timeAcquiringMicros"), rate: true, scale: 1000000, units: "threads" });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Replica set status");
//
//
// compute lag and rename self member to "self"
//
//
// also process members array to a membersById that is indexed by
// member _id instead of by array position, for use in patterns
// result is that adding support for a new field in the rs members
// array requires updating 4 places - search for pingMs for example
// xxx can this be made more automatic?
//
addSpecial(function (data, processedData) {
    var e_12, _a, e_13, _b, e_14, _c;
    var byArrayPos = [];
    var byId = {};
    // extract member info
    for (var i = 0;; i++) {
        var id = data[P("ftdc", "replSetGetStatus", "members", "" + i, "_id").key];
        if (!id)
            break;
        byArrayPos[i] = {
            id: id,
            state: data[P("ftdc", "replSetGetStatus", "members", "" + i, "state").key],
            health: data[P("ftdc", "replSetGetStatus", "members", "" + i, "health").key],
            uptime: data[P("ftdc", "replSetGetStatus", "members", "" + i, "uptime").key],
            pingMs: data[P("ftdc", "replSetGetStatus", "members", "" + i, "pingMs").key],
            optimeDate: data[P("ftdc", "replSetGetStatus", "members", "" + i, "optimeDate").key],
            configVersion: data[P("ftdc", "replSetGetStatus", "members", "" + i, "configVersion").key],
            syncSourceId: data[P("ftdc", "replSetGetStatus", "members", "" + i, "syncSourceId").key],
            self: data[P("ftdc", "replSetGetStatus", "members", "" + i, "self").key],
            start: data[P("ftdc", "replSetGetStatus", "start").key],
            lastHeartbeat: data[P("ftdc", "replSetGetStatus", "members", "" + i, "lastHeartbeat").key],
            lastHeartbeatRecv: data[P("ftdc", "replSetGetStatus", "members", "" + i, "lastHeartbeatRecv").key],
            heartbeatLag: new Array(id.length),
            heartbeatRecvLag: new Array(id.length),
            lag: new Array(id.length),
        };
    }
    // have repl set info?
    if (byArrayPos.length == 0)
        return;
    var nSamples = byArrayPos[0].id.length;
    // compute heartbeat lags
    for (var i = 0; i < nSamples; i++) {
        try {
            for (var byArrayPos_1 = (e_12 = void 0, __values(byArrayPos)), byArrayPos_1_1 = byArrayPos_1.next(); !byArrayPos_1_1.done; byArrayPos_1_1 = byArrayPos_1.next()) {
                var info = byArrayPos_1_1.value;
                if (info.lastHeartbeatRecv)
                    info.heartbeatRecvLag[i] = info.start[i] - info.lastHeartbeatRecv[i];
                if (info.lastHeartbeat)
                    info.heartbeatLag[i] = info.start[i] - info.lastHeartbeat[i];
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (byArrayPos_1_1 && !byArrayPos_1_1.done && (_a = byArrayPos_1.return)) _a.call(byArrayPos_1);
            }
            finally { if (e_12) throw e_12.error; }
        }
    }
    // compute lag
    for (var i = 0; i < nSamples; i++) {
        var priOptimeDate = 0;
        try {
            for (var byArrayPos_2 = (e_13 = void 0, __values(byArrayPos)), byArrayPos_2_1 = byArrayPos_2.next(); !byArrayPos_2_1.done; byArrayPos_2_1 = byArrayPos_2.next()) {
                var info = byArrayPos_2_1.value;
                if (info.state[i] == 1)
                    priOptimeDate = info.optimeDate[i];
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (byArrayPos_2_1 && !byArrayPos_2_1.done && (_b = byArrayPos_2.return)) _b.call(byArrayPos_2);
            }
            finally { if (e_13) throw e_13.error; }
        }
        try {
            for (var byArrayPos_3 = (e_14 = void 0, __values(byArrayPos)), byArrayPos_3_1 = byArrayPos_3.next(); !byArrayPos_3_1.done; byArrayPos_3_1 = byArrayPos_3.next()) {
                var info = byArrayPos_3_1.value;
                if (info.optimeDate) {
                    var secOptimeDate = info.optimeDate[i];
                    if (secOptimeDate) { // may not have optimeDate, e.g. if recovering
                        var lag = priOptimeDate - secOptimeDate;
                        if (lag >= 0)
                            info.lag[i] = lag;
                    }
                }
            }
        }
        catch (e_14_1) { e_14 = { error: e_14_1 }; }
        finally {
            try {
                if (byArrayPos_3_1 && !byArrayPos_3_1.done && (_c = byArrayPos_3.return)) _c.call(byArrayPos_3);
            }
            finally { if (e_14) throw e_14.error; }
        }
    }
    // compute new metrics identified by member _id, which may be different from array pos
    // and may have varying array pos throughout the data, e.g. if members are added or removed
    // record replSetMemberId in processedData for use as a tag
    for (var i = 0; i < nSamples; i++) {
        for (var j = 0; j < byArrayPos.length; j++) {
            var id = "" + byArrayPos[j].id[i];
            if (byArrayPos[j].self && byArrayPos[j].self[i]) {
                processedData.replSetMemberId = id;
                id += "(self)";
            }
            var idInfo = byId[id];
            if (!idInfo) {
                byId[id] = idInfo = {
                    id: new Array(nSamples),
                    state: new Array(nSamples),
                    health: new Array(nSamples),
                    uptime: new Array(nSamples),
                    pingMs: new Array(nSamples),
                    configVersion: new Array(nSamples),
                    syncSourceId: new Array(nSamples),
                    optimeDate: new Array(nSamples),
                    self: new Array(nSamples),
                    start: new Array(nSamples),
                    lastHeartbeat: new Array(nSamples),
                    lastHeartbeatRecv: new Array(nSamples),
                    heartbeatLag: new Array(nSamples),
                    heartbeatRecvLag: new Array(nSamples),
                    lag: new Array(nSamples),
                };
            }
            for (var field in idInfo) {
                var data_1 = byArrayPos[j][field];
                if (data_1)
                    idInfo[field][i] = data_1[i];
            }
        }
    }
    // emit new metrics by member _id
    for (var id in byId) {
        for (var field in byId[id]) {
            var key = P("ftdc", "replSetGetStatus", "membersById", id, field).key;
            data[key] = byId[id][field];
        }
    }
    // compute optime lags. These are only for this member, i.e. not
    // part of the members array, so this computation is different from the above
    var applied = data[P("ftdc", "replSetGetStatus", "optimes", "appliedOpTime", "ts", "t").key];
    ["durableOpTime", "lastCommittedOpTime", "readConcernMajorityOpTime"].forEach(function (ot) {
        var t = data[P("ftdc", "replSetGetStatus", "optimes", ot, "ts", "t").key];
        if (applied != null && t != null) {
            var k = P("ftdc", "replSetGetStatus", "optimes", ot + "Lag").key;
            var n = applied.length;
            var lag = data[k] = new Array(n);
            for (var i = 0; i < n; i++)
                lag[i] = applied[i] - t[i];
        }
    });
    // same as above except using wall-clock times, which are higher precision
    var appliedWall = data[P("ftdc", "replSetGetStatus", "optimes", "lastAppliedWallTime").key];
    ["lastCommittedWallTime", "lastDurableWallTime", "readConcernMajorityWallTime"].forEach(function (wt) {
        var t = data[P("ftdc", "replSetGetStatus", "optimes", wt).key];
        if (appliedWall != null && t != null) {
            var k = P("ftdc", "replSetGetStatus", "optimes", wt + "Lag").key;
            var n = appliedWall.length;
            var lag = data[k] = new Array(n);
            for (var i = 0; i < n; i++)
                lag[i] = (appliedWall[i] - t[i]) / 1000.0; // scale to seconds
            //u.log("xxx applied", applied[0], "t", t[0], "lag", lag[0])
        }
    });
});
function rs_member(path, desc) {
    desc.pattern = P.apply(void 0, __spread(["replSetGetStatus", "membersById", "(.*)"].concat(path)));
    desc.timebasePath = P("ftdc", "replSetGetStatus", "start");
    desc.name = "rs member _id {1} " + (desc.name ? desc.name : path);
    desc.timebasePath = P("ftdc", "replSetGetStatus", "start");
    desc.sortPatternsByDesc = true;
    addPattern(desc, "rs");
}
// use alerter to color-code by state: primary is green, secondary yellow, all else red
rs_member(["state"], { chart: "rs_state", alwaysFill: true, alerter: gyrAlerter(2, 3) });
rs_member(["health"], { chart: "rs_health", alwaysFill: true });
rs_member(["uptime"], { chart: "rs_uptime", units: "s", alwaysFill: true, autoScale: "time" });
rs_member(["lag"], { scale: 1000, units: "s", chart: "rs_lag", autoScale: "time" });
rs_member(["heartbeatLag"], { scale: 1000, units: "s", chart: "rs_heartbeatResp", autoScale: "time", name: "heartbeat incoming response lag" });
rs_member(["heartbeatRecvLag"], { scale: 1000, units: "s", chart: "rs_heartbeatRecv", autoScale: "time", name: "heartbeat incoming request lag" });
rs_member(["pingMs"], { name: "ping time", units: "ms", chart: "rs_pingMs" });
rs_member(["id"], { ignore: true }); // xxx
rs_member(["configVersion"], { chart: "rs_configVersion", alwaysFill: true });
rs_member(["syncSourceId"], { chart: "rs_syncSourceId", showZero: true });
rs_member(["self"], { ignore: true }); // xxx
// ignore the original members array, as we computed an set of metrics based on member _id
addPattern({ pattern: P("ftdc", "replSetGetStatus", "members", "(.*)"), ignore: true }, "rs"),
    // optime lags (computed above)
    ["durable", "lastCommitted", "readConcernMajority"].forEach(function (ot) {
        addDescriptor({
            path: P("ftdc", "replSetGetStatus", "optimes", ot + "OpTimeLag"),
            timebasePath: P("ftdc", "replSetGetStatus", "start"),
            name: "rs " + ot + " lag (filtered)",
            yDisplayMax: Math.pow(2, 30),
            autoScale: "time",
            chart: "rs_optimes_filtered",
        });
        addDescriptor({
            path: P("ftdc", "replSetGetStatus", "optimes", ot + "OpTimeLag"),
            timebasePath: P("ftdc", "replSetGetStatus", "start"),
            name: "rs " + ot + " lag",
            autoScale: "time",
            chart: "rs_optimes",
        });
    });
// walltime lags (computed above)
["lastDurable", "lastCommitted", "readConcernMajority"].forEach(function (wt) {
    addDescriptor({
        path: P("ftdc", "replSetGetStatus", "optimes", wt + "WallTimeLag"),
        timebasePath: P("ftdc", "replSetGetStatus", "start"),
        name: "rs " + wt + " wall time lag",
        autoScale: "time",
        chart: "rs_walltimes",
    });
});
function rs(name, desc) {
    desc.path = P.apply(void 0, __spread(["ftdc", "replSetGetStatus"].concat(name))),
        desc.timebasePath = P("ftdc", "replSetGetStatus", "start");
    desc.name = "rs " + name;
    addDescriptor(desc);
}
rs("syncSourceId", { showZero: true });
rs("myState", { ignore: true }); // xxx
rs("ok", {});
rs("term", {});
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Sharding statistics");
//
ss({ path: P("shardingStatistics", "catalogCache", "numCollectionEntries") });
ss({ path: P("shardingStatistics", "catalogCache", "numDatabaseEntries") });
ss({ path: P("shardingStatistics", "catalogCache", "countFullRefreshesStarted"), rate: "delta" });
ss({ path: P("shardingStatistics", "catalogCache", "countIncrementalRefreshesStarted"), rate: "delta" });
ss({ path: P("shardingStatistics", "catalogCache", "countFailedRefreshes"), rate: "delta" });
ss({ path: P("shardingStatistics", "catalogCache", "numActiveFullRefreshes") });
ss({ path: P("shardingStatistics", "catalogCache", "numActiveIncrementalRefreshes") });
ss({ path: P("shardingStatistics", "catalogCache", "totalRefreshWaitTimeMicros"), rate: true, scale: 1e9, units: "threads" });
ss({ path: P("shardingStatistics", "catalogCache", "countStaleConfigErrors"), rate: "delta" });
ss({ path: P("shardingStatistics", "countDonorMoveChunkStarted"), rate: "delta" });
ss({ path: P("shardingStatistics", "countRecipientMoveChunkStarted"), rate: "delta" });
ss({ path: P("shardingStatistics", "countStaleConfigErrors"), rate: "delta" });
ss({ path: P("shardingStatistics", "totalDonorChunkCloneTimeMillis") });
ss({ path: P("shardingStatistics", "totalCriticalSectionTimeMillis") });
ss({ path: P("shardingStatistics", "totalCriticalSectionCommitTimeMillis") });
ss({ path: P("shardingStatistics", "countDocsClonedOnDonor"), rate: true });
ss({ path: P("shardingStatistics", "countDocsClonedOnRecipient"), rate: true });
ss({ path: P("shardingStatistics", "countDocsDeletedOnDonor"), rate: true });
ss({ path: P("shardingStatistics", "countDonorMoveChunkLockTimeout"), rate: true });
ss({ path: P("shardingStatistics", "rangeDeleterTasks") });
cps({ path: P("numAScopedConnections") });
cps({ path: P("numClientConnections") });
cps({ path: P("totalAvailable") });
cps({ path: P("totalCreated"), rate: true });
cps({ path: P("totalInUse") });
cps({ path: P("totalRefreshing") });
addPattern({
    name: "connPoolStats replicaSetPingTimesMillis {1} {2}",
    pattern: P("ftdc", "connPoolStats", "replicaSetPingTimesMillis", "(.*)", "(.*)"),
    timebasePath: P("ftdc", "connPoolStats", "start"),
    units: "ms"
}, "connPoolStats_pingTimes");
addPattern({
    name: "connPoolStats connectionsInUsePerPool {1} {2}",
    pattern: P("ftdc", "connPoolStats", "connectionsInUsePerPool", "(.*)", "(.*)"),
    timebasePath: P("ftdc", "connPoolStats", "start"),
    autoScale: "auto"
}, "connPoolStats_pools");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Network");
//
ss({ path: P("network", "bytesIn"), rate: true, scale: "MB", chart: "network bytes" });
ss({ path: P("network", "bytesOut"), rate: true, scale: "MB", chart: "network bytes" });
ss({ path: P("network", "physicalBytesIn"), rate: true, scale: "MB", chart: "network physical bytes" });
ss({ path: P("network", "physicalBytesOut"), rate: true, scale: "MB", chart: "network physical bytes" });
addPattern({
    name: "ss network {1} " + "{2}or {3}",
    pattern: P("ftdc", "serverStatus", "network", "compression", "(.*)", // {1} is name of compressor
    "(decompress|compress)(?:ed|or)", // {2} is "compress" or "decompress"
    "(bytesIn|bytesOut)" // {3} is "bytesIn" or "bytesOut"
    ),
    scale: "MB",
    timebasePath: P("ftdc", "serverStatus", "start"),
    rate: true,
    chart: "network_{2}or"
}, "networkCompression");
ss({ path: P("network", "numRequests"), rate: true });
// assumes csv file collected with net.py
// xxx fix this up when we get rx_queue in network stats
addDescriptor({
    path: P("ftdc", "serverStatus", "network", "numRequests"),
    ratePath: P("ftdc", "serverStatus", "network", "physicalBytesIn"),
    mulPath: P("csv", "rx_queue"),
    timebasePath: P("ftdc", "serverStatus", "start"),
    name: "ss network derived requests queued in kernel",
    units: "#"
});
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Process memory");
//
ss({ path: P("mem", "mapped"), scale: "MiB" });
ss({ path: P("mem", "mappedWithJournal"), scale: "MiB" });
ss({ path: P("mem", "virtual"), units: "MiB" });
ss({ path: P("mem", "resident"), units: "MiB" });
ss({ path: P("mem", "resident"), name: "resident increase",
    units: "MiB", rate: true, clipMin: 0 });
ss({ path: P("mem", "resident"), name: "resident decrease",
    units: "MiB", rate: true, clipMin: 0, scale: -1 });
ss({ path: P("tcmalloc", "derived", "virtual minus heap"), scale: "MiB" });
ss({ path: P("tcmalloc", "generic", "heap_size"), scale: "MiB" });
ss({ path: P("tcmalloc", "generic", "current_allocated_bytes"), scale: "MiB" });
ss({ path: P("tcmalloc", "derived", "allocated minus wt cache"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "pageheap_unmapped_bytes"), scale: "MiB" });
// we compute total free including page_heap, whereas total_free_bytes does not so ignore it
ss({ path: P("tcmalloc", "derived", "total free"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "total_free_bytes"), ignore: true });
ss({ path: P("tcmalloc", "tcmalloc", "pageheap_free_bytes"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "central_cache_free_bytes"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "thread_cache_free_bytes"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "transfer_cache_free_bytes"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "current_total_thread_cache_bytes"), scale: "MiB" });
ss({
    path: P("tcmalloc", "tcmalloc", "current_total_thread_cache_bytes"),
    divPath: P("connections", "current"),
    name: "thread cache per connection", scale: "KiB"
});
ss({ path: P("tcmalloc", "tcmalloc", "max_total_thread_cache_bytes"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "aggressive_memory_decommit"), scale: "MiB" });
ss({ path: P("tcmalloc", "tcmalloc", "pageheap_committed_bytes"), scale: "MiB" });
["commit", "decommit", "reserve", "scavenge"].forEach(function (x) {
    var m = "pageheap_" + x + "_count";
    var n = "pageheap " + x + " count";
    ss({ path: P("tcmalloc", "tcmalloc", m), name: n, rate: true, chart: "tcmalloc_counts" });
});
["commit", "decommit", "reserve"].forEach(function (x) {
    var m = "pageheap_total_" + x + "_bytes";
    var n = "pageheap " + x + " bytes";
    ss({ path: P("tcmalloc", "tcmalloc", m), name: n, rate: true, chart: "tcmalloc_bytes", scale: "MiB" });
});
/*
ss({
    path: P("tcmalloc", "tcmalloc", "pageheap_total_decommit_bytes"),
    ratePath: P("tcmalloc", "tcmalloc", "pageheap_decommit_count"),
    scale: 4 * 1024, // 4 kB per page
    name: "pages per decommit",
    units: "pages"
})
*/
ss({ path: P("tcmalloc", "tcmalloc", "spinlock_total_delay_ns"), rate: true, scale: 1e9, units: "threads" });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Process resources");
//
ss({ path: P("extra_info", "maximum_resident_set_kb"), scale: 1024, units: "MiB" });
ss({ path: P("extra_info", "user_time_us"), rate: true, scale: 1e6, units: "cpus", chart: "cpus" });
ss({ path: P("extra_info", "system_time_us"), rate: true, scale: 1e6, units: "cpus", chart: "cpus" });
ss({ path: P("extra_info", "input_blocks"), rate: true, chart: "blocks" });
ss({ path: P("extra_info", "output_blocks"), rate: true, chart: "blocks" });
ss({ path: P("extra_info", "page_faults"), rate: true });
ss({ path: P("extra_info", "page_reclaims"), rate: true });
ss({ path: P("extra_info", "voluntary_context_switches"), rate: true, chart: "context_switches" });
ss({ path: P("extra_info", "involuntary_context_switches"), rate: true, chart: "context_switches" });
ss({ path: P("extra_info", "availPageFileMB"), units: "MiB" });
ss({ path: P("extra_info", "ramMB"), units: "MiB" });
ss({ path: P("extra_info", "totalPageFileMB"), units: "MiB" });
ss({ path: P("extra_info", "usagePageFileMB"), units: "MiB" });
// compute some derived memory stats
addSpecial(function (data) {
    // compute nSamples
    var ts = data[P("ftdc", "serverStatus", "start").key];
    if (!ts)
        return;
    var nSamples = ts.length;
    function tcmallocKey(a, b) {
        return P("ftdc", "serverStatus", "tcmalloc", a, b).key;
    }
    // compute total free
    var pageheapFree = data[tcmallocKey("tcmalloc", "pageheap_free_bytes")];
    var centralFree = data[tcmallocKey("tcmalloc", "central_cache_free_bytes")];
    var threadFree = data[tcmallocKey("tcmalloc", "thread_cache_free_bytes")];
    var transferFree = data[tcmallocKey("tcmalloc", "transfer_cache_free_bytes")];
    if (pageheapFree && centralFree && threadFree && transferFree) {
        var totalFree = data[tcmallocKey("derived", "total free")] = new Array(nSamples);
        for (var i = 0; i < nSamples; i++)
            totalFree[i] = pageheapFree[i] + centralFree[i] + threadFree[i] + transferFree[i];
    }
    // compute allocated minus wt cache
    var allocated = data[tcmallocKey("generic", "current_allocated_bytes")];
    var wtCachePath = ["ftdc", "serverStatus", "wiredTiger", "cache",
        "bytes currently in the cache"];
    var wtCache = data[P.apply(void 0, __spread(wtCachePath)).key];
    if (allocated && wtCache) {
        var allocatedMinusCache = data[tcmallocKey("derived", "allocated minus wt cache")]
            = new Array(nSamples);
        for (var i = 0; i < nSamples; i++)
            allocatedMinusCache[i] = allocated[i] - wtCache[i];
    }
    // compute virtual minus heap
    var virtual = data[P("ftdc", "serverStatus", "mem", "virtual").key];
    var heap = data[tcmallocKey("generic", "heap_size")];
    if (virtual && heap) {
        var virtualMinusHeap = data[tcmallocKey("derived", "virtual minus heap")]
            = new Array(nSamples);
        for (var i = 0; i < nSamples; i++)
            virtualMinusHeap[i] = virtual[i] * 1024 * 1024 - heap[i];
    }
    function systemMetricsKey(a,b) {
        return P("ftdc", "systemMetrics", a, b).key;
    }
    // compute CPU utilization (for Atlas autoscaling)
    var idle = data[systemMetricsKey("cpu", "idle_ms")];
    var iowait = data[systemMetricsKey("cpu", "iowait_ms")];
    var num_cpus = data[systemMetricsKey("cpu", "num_cpus")];
    if(idle && iowait && num_cpus) {
        var cpuUtilization = data[systemMetricsKey("cpu", "utilization(AutoScale)")] = new Array(nSamples);
        cpuUtilization[0] = 0; //don't have a diff for the first sample
        for (var i = 1; i < nSamples; i++) {
            if (num_cpus[i] > 0) {
                var idlenow = idle[i];
                var idleprev = idle[i-1];
                var iowaitnow = iowait[i];
                var iowaitprev = iowait[i-1];
                var max = (ts[i] - ts[i-1]) * num_cpus[i];
                if ((idlenow >= idleprev) && (iowaitnow >= iowaitprev)) {
                    cpuUtilization[i] = (1 - (idlenow - idleprev + iowaitnow - iowaitprev) / max) * 100;
                    u.log("***CPU Util sample:", ts[i], idlenow, idleprev,iowaitnow,iowaitprev,max,num_cpus[i],cpuUtilization[i]);
                } else {
                    cpuUtilization[i] = 0
                    u.log("***CPU Util: metric step back for sample",i);
                }
            }
            else {
                u.log("***CPU Util: zero CPUs for sample", i);
            }
        }
        u.log("***CPU Util Final:",cpuUtilization);
    }
});
ss({
    path: P("heapProfile", "stats", "totalActiveBytes"),
    name: "ss heap profile: total active bytes",
    scale: "MiB"
});
// xxx needs special computation
ss({ path: P("tcmalloc", "generic", "heap utilization (current_allocated_bytes / heap_size)") });
// xxx needs special computation
ss({
    path: P("heapProfile", "stats", "allocated minus active (internal fragmentation)"),
    name: "ss heap profile: allocated minus active (internal fragmentation)",
    scale: "MiB",
});
// xxx needs special computation
ss({
    path: P("heapProfile", "stats", "active minus wt cache"),
    name: "ss heap profile: active minus wt cache",
    scale: "MiB",
});
addPattern({
    name: "ss tcmalloc size_class {1} {2}",
    pattern: P("ftdc", "serverStatus", "tcmalloc", "tcmalloc", "size_classes", "(.*)", "(.*)"),
    timebasePath: P("ftdc", "serverStatus", "start"),
    autoScale: "auto"
}, "tcmallocSizeClasses");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Heap profiler");
//
addPattern({
    name: "ss heapProfile {1}",
    pattern: P("ftdc", "serverStatus", "heapProfile", "stacks", "(stack[0-9]+)", "activeBytes"),
    timebasePath: P("ftdc", "serverStatus", "start"),
    scale: "MiB",
    sortByData: -1,
}, "heapProfile");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Heap profiler histogram count");
//
addPattern({
    name: "ss heapProfile histogram size ≥ {1}",
    pattern: P("ftdc", "serverStatus", "heapProfile", "histogram", "([0-9]+)", "count"),
    timebasePath: P("ftdc", "serverStatus", "start"),
    rate: true,
}, "heapProfileHistogramCount");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Heap profiler histogram active");
//
addPattern({
    name: "ss heapProfile histogram size ≥ {1}",
    pattern: P("ftdc", "serverStatus", "heapProfile", "histogram", "([0-9]+)", "active"),
    timebasePath: P("ftdc", "serverStatus", "start"),
    scale: "MiB"
}, "heapProfileHistogramActive");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Heap profiler internals");
//
ss({ path: P("heapProfile", "stats", "bytesAllocated"), units: "B", autoScale: "binary" });
ss({ path: P("heapProfile", "stats", "bytesAllocated"), units: "B", autoScale: "binary", rate: true });
ss({ path: P("heapProfile", "stats", "maxObjEntriesUsed"), autoScale: "decimal" });
ss({ path: P("heapProfile", "stats", "currentObjEntries"), autoScale: "decimal" });
ss({ path: P("heapProfile", "stats", "numStacks"), autoScale: "decimal" });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("System memory");
//
//
// Linux
//
function sm_lnx_mem(metric, name, chart, desc) {
    desc = desc || {};
    sm(Object.assign(desc,{ path: P("memory", metric), name: "memory " + name, scale: 1024, units: "MiB", chart: chart }));
}
sm_lnx_mem("Cached_kb", "cached", "sm_lnx_mem");
sm_lnx_mem("Dirty_kb", "dirty", "sm_lnx_mem");
sm_lnx_mem("Buffers_kb", "buffers", "sm_lnx_mem");
sm_lnx_mem("MemFree_kb", "free", "sm_lnx_mem");
sm_lnx_mem("SwapTotal_kb", "swap total", "sm_swap");
sm_lnx_mem("SwapCached_kb", "swap cached", "sm_swap");
sm_lnx_mem("SwapFree_kb", "swap free", "sm_swap");
sm_lnx_mem("Cached_kb", "reclaimable", "sm_lnx_mem", {addPath: [P("memory", "Buffers_kb"),P("memory","MemFree_kb")] });
function addSpecialOp(result, left, op, right) {
    addSpecial(function (data) {
        var leftData = data[left.key];
        var rightData = data[right.key];
        if (leftData && rightData)
            data[result.key] = leftData.map(function (l, i) { return op(l, rightData[i]); });
    });
}
addSpecialOp(P("ftdc", "systemMetrics", "memory", "Total(anon)_kb"), P("ftdc", "systemMetrics", "memory", "Active(anon)_kb"), function (l, r) { return l + r; }, P("ftdc", "systemMetrics", "memory", "Inactive(anon)_kb"));
sm_lnx_mem("Total(anon)_kb", "anon total", "sm_anon");
sm_lnx_mem("Active(anon)_kb", "anon active", "sm_anon");
sm_lnx_mem("Inactive(anon)_kb", "anon inactive", "sm_anon");
addSpecialOp(P("ftdc", "systemMetrics", "memory", "Total(file)_kb"), P("ftdc", "systemMetrics", "memory", "Active(file)_kb"), function (l, r) { return l + r; }, P("ftdc", "systemMetrics", "memory", "Inactive(file)_kb"));
sm_lnx_mem("Total(file)_kb", "file total", "sm_file");
sm_lnx_mem("Active(file)_kb", "file active", "sm_file");
sm_lnx_mem("Inactive(file)_kb", "file inactive", "sm_file");
// Get the last component in a path delimited by \\
function tail(path) {
    var parts = path.split("\\");
    return parts[parts.length - 1];
}
//
// Windows
//
function sm_win_bytes(metric, chart) {
    var metric_name = tail(metric).replace(" Bytes", "");
    sm({
        path: P("memory", metric), name: metric_name,
        rate: false, scale: 1024 * 1024, units: "MiB", chart: chart
    });
}
sm_win_bytes("\\Memory\\Available Bytes", "sm_win_mem");
sm_win_bytes("\\Memory\\Cache Bytes", "sm_win_mem");
sm_win_bytes("\\Memory\\Committed Bytes", "sm_win_mem");
sm_win_bytes("\\Memory\\Commit Limit", "sm_win_mem");
sm_win_bytes("\\Memory\\Pool Nonpaged Bytes", "sm_win_mem2");
sm_win_bytes("\\Memory\\Pool Paged Bytes", "sm_win_mem2");
sm_win_bytes("\\Memory\\Pool Paged Resident Bytes", "sm_win_mem2");
sm_win_bytes("\\Memory\\System Cache Resident Bytes", "sm_win_mem3");
sm_win_bytes("\\Memory\\System Code Total Bytes", "sm_win_mem3");
function sm_win_mem_rate(metric, chart) {
    var metric_name = tail(metric).replace("/sec", "");
    sm({
        path: P("memory", metric), name: metric_name,
        rate: true, chart: chart
    });
}
sm_win_mem_rate("\\Memory\\Cache Faults/sec");
sm_win_mem_rate("\\Memory\\Page Reads/sec", "sm_win_page_rw");
sm_win_mem_rate("\\Memory\\Page Writes/sec", "sm_win_page_rw");
sm_win_mem_rate("\\Memory\\Pages Input/sec", "sm_win_page_io");
sm_win_mem_rate("\\Memory\\Pages Output/sec", "sm_win_page_io");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("System CPU");
//
//
// Linux
//
function sm_lnx_cpu(metric, name, chart) {
    sm({
        path: P("cpu", metric + "_ms"), name: "cpu " + name,
        divPath: P("cpu", "num_cpus"),
        rate: true, scale: 10, units: "%", yMax: 100, chart: chart
    });
}
sm_lnx_cpu("user", "user", "sm_lnx_cpu");
sm_lnx_cpu("system", "kernel", "sm_lnx_cpu");
sm_lnx_cpu("iowait", "iowait", "sm_lnx_cpu");
sm_lnx_cpu("nice", "nice", "sm_lnx_cpu");
sm_lnx_cpu("steal", "steal", "sm_lnx_cpu");
sm_lnx_cpu("idle", "idle");
sm({path: P("cpu","utilization(AutoScale)"), name:"cpu utilization(AutoScale)", units:"%",scale:1});
sm_lnx_cpu("softirq", "softirq", "sm_lnx_cpu_2");
sm_lnx_cpu("guest", "guest", "sm_lnx_cpu_2");
sm_lnx_cpu("guest_nice", "guest_nice", "sm_lnx_cpu_2");
sm_lnx_cpu("irq", "irq", "sm_lnx_cpu_2");
sm({ path: P("cpu", "procs_running"), name: "processes running", chart: "sm_processes" });
sm({ path: P("cpu", "procs_blocked"), name: "processes blocked", chart: "sm_processes" });
sm({ path: P("cpu", "ctxt"), name: "context switches", rate: true });
//
// Windows
//
function sm_win_cpu(metric, chart) {
    var metric_name = "CPU " + tail(metric).replace(" Time", "");
    sm({
        path: P("cpu", metric), name: metric_name,
        rate: true, scale: 1e9 / (100 * 100), units: "%", yMax: 100, chart: chart
    });
}
sm_win_cpu("\\Processor\\% User Time", "sm_win_cpu");
sm_win_cpu("\\Processor\\% Privileged Time", "sm_win_cpu");
sm_win_cpu("\\Processor\\% Interrupt Time", "sm_win_cpu");
sm_win_cpu("\\Processor\\% Idle Time", "sm_win_cpu2");
function sm_win_cpu_rate(metric) {
    var metric_name = tail(metric).replace("/sec", "");
    sm({
        path: P("cpu", metric), name: metric_name,
        rate: true, clipMin: 0,
    });
}
sm_win_cpu_rate("\\Processor\\Interrupts/sec");
sm_win_cpu_rate("\\System\\Context Switches/sec");
function sm_win_cpu_count(metric) {
    sm({
        path: P("cpu", metric), name: tail(metric),
        rate: false,
    });
}
sm_win_cpu_count("\\System\\Processes");
sm_win_cpu_count("\\System\\Threads");
sm_win_cpu_count("\\System\\Processor Queue Length");
sm({
    path: P("cpu", "\\System\\System Up Time"), name: "System Up Time",
    autoScale: "time"
});
///////////////////////////////////////////////////////////////////////////////
//
SECTION("CPU profile");
//
addPattern({
    pattern: P("csv", "cpu profile ([0-9]+ .*)"),
    name: "{1}",
    scale: 0.01,
    yMax: 100,
    units: "%",
    timebasePath: P("csv", "start")
}, "cpu-profile");
addPattern({
    pattern: P("csv", "threads ([0-9]+ .*)"),
    name: "{1}",
    units: "threads",
    timebasePath: P("csv", "start"),
    scaleGroup: "cpu profile threads" // xxxxxxxxxxxxxxxxx
}, "cpu-profile");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("System network");
//
function ns(metric, desc) {
    desc.path = P("netstat", metric);
    desc.name = metric.replace(":", " ");
    sm(desc);
}
ns("Ip:InReceives", { rate: true, chart: "ns_ip_ops" });
ns("Ip:InDelivers", { rate: true, chart: "ns_ip_ops" });
ns("Ip:OutRequests", { rate: true, chart: "ns_ip_ops" });
ns("IpExt:InOctets", { rate: true, scale: "MB", chart: "ns_ip_octets" });
ns("IpExt:OutOctets", { rate: true, scale: "MB", chart: "ns_ip_octets" });
ns("IpExt:InMcastOctets", { rate: true, scale: "MB", chart: "ns_ip_octets" });
ns("IpExt:OutMcastOctets", { rate: true, scale: "MB", chart: "ns_ip_octets" });
ns("IpExt:InBcastOctets", { rate: true, scale: "MB", chart: "ns_ip_octets" });
ns("IpExt:OutBcastOctets", { rate: true, scale: "MB", chart: "ns_ip_octets" });
ns("IpExt:InMcastPkts", { rate: true, chart: "ns_ip_other" });
ns("IpExt:OutMcastPkts", { rate: true, chart: "ns_ip_other" });
ns("IpExt:InBcastPkts", { rate: true, chart: "ns_ip_other" });
ns("IpExt:OutBcastPkts", { rate: true, chart: "ns_ip_other" });
ns("Ip:ReasmReqds", { rate: true, chart: "ns_ip_reasm" });
ns("Ip:ReasmOKs", { rate: true, chart: "ns_ip_reasm" });
ns("Ip:ReasmFails", { rate: true, chart: "ns_ip_reasm" });
ns("IpExt:InNoECTPkts", { rate: true, chart: "ns_ip_ect" });
ns("IpExt:InECT1Pkts", { rate: true, chart: "ns_ip_ect" });
ns("IpExt:InECT0Pkts", { rate: true, chart: "ns_ip_ect" });
ns("IpExt:InCEPkts", { rate: true, chart: "ns_ip_ect" });
ns("Ip:Forwarding", { rate: true, chart: "ns_ip_fwd" });
ns("Ip:ForwDatagrams", { rate: true, chart: "ns_ip_fwd" });
ns("Ip:DefaultTTL", { rate: true, chart: "ns_ip_times" });
ns("Ip:ReasmTimeout", { rate: true, chart: "ns_ip_times" });
ns("Ip:FragOKs", { rate: true, chart: "ns_ip_frag." });
ns("Ip:FragFails", { rate: true, chart: "ns_ip_frag." });
ns("Ip:FragCreates", { rate: true, chart: "ns_ip_frag." });
ns("Tcp:ActiveOpens", { rate: true, chart: "ns_tcp_open" });
ns("Tcp:PassiveOpens", { rate: true, chart: "ns_tcp_open" });
ns("Tcp:AttemptFails", { rate: true, chart: "ns_tcp_open" });
ns("TcpExt:ListenOverflows", { rate: true, chart: "ns_tcp_listen" });
ns("TcpExt:ListenDrops", { rate: true, chart: "ns_tcp_listen" });
ns("TcpExt:SyncookiesSent", { rate: true, chart: "ns_tcp_syn" });
ns("TcpExt:SyncookiesRecv", { rate: true, chart: "ns_tcp_syn" });
ns("TcpExt:SyncookiesFailed", { rate: true, chart: "ns_tcp_syn" });
ns("Tcp:CurrEstab", { chart: "ns_tcp_conn" });
ns("Tcp:MaxConn", { chart: "ns_tcp_conn" });
ns("Tcp:InSegs", { rate: true, chart: "ns_tcp_segs" });
ns("Tcp:OutSegs", { rate: true, chart: "ns_tcp_segs" });
ns("Tcp:OutRsts", { rate: true, chart: "ns_tcp_rst" });
ns("TcpExt:EmbryonicRsts", { rate: true, chart: "ns_tcp_rst" });
ns("Tcp:EstabResets", { rate: true, chart: "ns_tcp_rst" });
ns("TcpExt:DelayedACKs", { rate: true, chart: "ns_tcp_ack" });
ns("TcpExt:TCPPureAcks", { rate: true, chart: "ns_tcp_ack" });
ns("TcpExt:TCPHPAcks", { rate: true, chart: "ns_tcp_ack" });
ns("Tcp:RtoAlgorithm", {});
ns("Tcp:RtoMin", { units: "ms" });
ns("Tcp:RtoMax", { units: "ms" });
ns("TcpExt:TCPMD5Failure", { rate: true });
ns("TcpExt:TCPMTUPFail", { rate: true, chart: "tcpmtup" });
ns("TcpExt:TCPMTUPSuccess", { rate: true, chart: "tcpmtup" });
// errors - important so separate chart for each, and show before the "miscellaneous" bunch
ns("Ip:InDiscards", { rate: true });
ns("Ip:InHdrErrors", { rate: true });
ns("Ip:InUnknownProtos", { rate: true });
ns("Ip:InAddrErrors", { rate: true });
ns("IpExt:InNoRoutes", { rate: true });
ns("IpExt:InTruncatedPkts", { rate: true });
ns("IpExt:InCsumErrors", { rate: true });
ns("Ip:OutDiscards", { rate: true });
ns("Ip:OutNoRoutes", { rate: true });
ns("TcpExt:OfoPruned", { rate: true });
ns("TcpExt:RcvPruned", { rate: true });
ns("Tcp:InErrs", { rate: true });
ns("Tcp:InCsumErrors", { rate: true });
ns("Tcp:RetransSegs", { rate: true });
ns("TcpExt:TCPTimeouts", { rate: true });
ns("TcpExt:TCPLossProbes", { rate: true });
ns("TcpExt:TCPLossProbeRecovery", { rate: true });
ns("TcpExt:DelayedACKLost", { rate: true });
ns("TcpExt:TCPFullUndo", { rate: true });
ns("TcpExt:TCPPartialUndo", { rate: true });
ns("TcpExt:TCPDSACKUndo", { rate: true });
ns("TcpExt:TCPLoss", { rate: true });
ns("TcpExt:TCPLossUndo", { rate: true });
ns("TcpExt:TCPLostRetransmit", { rate: true });
ns("TcpExt:TCPRenoFailures", { rate: true });
ns("TcpExt:TCPSackFailures", { rate: true });
ns("TcpExt:TCPLossFailures", { rate: true });
ns("TcpExt:TCPFastRetrans", { rate: true });
ns("TcpExt:TCPForwardRetrans", { rate: true });
ns("TcpExt:TCPSlowStartRetrans", { rate: true });
ns("TcpExt:TCPRenoRecoveryFail", { rate: true });
ns("TcpExt:TCPSackRecoveryFail", { rate: true });
ns("TcpExt:TCPSchedulerFailed", { rate: true });
ns("TcpExt:TCPAbortOnData", { rate: true });
ns("TcpExt:TCPAbortOnClose", { rate: true });
ns("TcpExt:TCPAbortOnMemory", { rate: true });
ns("TcpExt:TCPAbortOnTimeout", { rate: true });
ns("TcpExt:TCPAbortOnLinger", { rate: true });
ns("TcpExt:TCPAbortFailed", { rate: true });
// miscellaneous (probably includes some that should be moved up above with the errors)
ns("TcpExt:DelayedACKLocked", { rate: true });
ns("TcpExt:PruneCalled", { rate: true });
ns("TcpExt:OutOfWindowIcmps", { rate: true });
ns("TcpExt:LockDroppedIcmps", { rate: true });
ns("TcpExt:ArpFilter", { rate: true });
ns("TcpExt:TW", { rate: true });
ns("TcpExt:TWRecycled", { rate: true });
ns("TcpExt:TWKilled", { rate: true });
ns("TcpExt:PAWSPassive", { rate: true });
ns("TcpExt:PAWSActive", { rate: true });
ns("TcpExt:PAWSEstab", { rate: true });
ns("TcpExt:TCPPrequeued", { rate: true });
ns("TcpExt:TCPDirectCopyFromBacklog", { rate: true });
ns("TcpExt:TCPDirectCopyFromPrequeue", { rate: true });
ns("TcpExt:TCPPrequeueDropped", { rate: true });
ns("TcpExt:TCPHPHits", { rate: true });
ns("TcpExt:TCPHPHitsToUser", { rate: true });
ns("TcpExt:TCPRenoRecovery", { rate: true });
ns("TcpExt:TCPSackRecovery", { rate: true });
ns("TcpExt:TCPSACKReneging", { rate: true });
ns("TcpExt:TCPFACKReorder", { rate: true });
ns("TcpExt:TCPSACKReorder", { rate: true });
ns("TcpExt:TCPRenoReorder", { rate: true });
ns("TcpExt:TCPTSReorder", { rate: true });
ns("TcpExt:TCPRcvCollapsed", { rate: true });
ns("TcpExt:TCPDSACKOldSent", { rate: true });
ns("TcpExt:TCPDSACKOfoSent", { rate: true });
ns("TcpExt:TCPDSACKRecv", { rate: true });
ns("TcpExt:TCPDSACKOfoRecv", { rate: true });
ns("TcpExt:TCPMemoryPressures", { rate: true });
ns("TcpExt:TCPSACKDiscard", { rate: true });
ns("TcpExt:TCPDSACKIgnoredOld", { rate: true });
ns("TcpExt:TCPDSACKIgnoredNoUndo", { rate: true });
ns("TcpExt:TCPSpuriousRTOs", { rate: true });
ns("TcpExt:TCPMD5NotFound", { rate: true });
ns("TcpExt:TCPMD5Unexpected", { rate: true });
ns("TcpExt:TCPSackShifted", { rate: true });
ns("TcpExt:TCPSackMerged", { rate: true });
ns("TcpExt:TCPSackShiftFallback", { rate: true });
ns("TcpExt:TCPBacklogDrop", { rate: true });
ns("TcpExt:TCPMinTTLDrop", { rate: true });
ns("TcpExt:TCPDeferAcceptDrop", { rate: true });
ns("TcpExt:IPReversePathFilter", { rate: true });
ns("TcpExt:TCPTimeWaitOverflow", { rate: true });
ns("TcpExt:TCPReqQFullDoCookies", { rate: true });
ns("TcpExt:TCPReqQFullDrop", { rate: true });
ns("TcpExt:TCPRetransFail", { rate: true });
ns("TcpExt:TCPRcvCoalesce", { rate: true });
ns("TcpExt:TCPOFOQueue", { rate: true });
ns("TcpExt:TCPOFODrop", { rate: true });
ns("TcpExt:TCPOFOMerge", { rate: true });
ns("TcpExt:TCPChallengeACK", { rate: true });
ns("TcpExt:TCPSYNChallenge", { rate: true });
ns("TcpExt:TCPFastOpenActive", { rate: true });
ns("TcpExt:TCPFastOpenActiveFail", { rate: true });
ns("TcpExt:TCPFastOpenPassive", { rate: true });
ns("TcpExt:TCPFastOpenPassiveFail", { rate: true });
ns("TcpExt:TCPFastOpenListenOverflow", { rate: true });
ns("TcpExt:TCPFastOpenCookieReqd", { rate: true });
ns("TcpExt:TCPSpuriousRtxHostQueues", { rate: true });
ns("TcpExt:BusyPollRxPackets", { rate: true });
ns("TcpExt:TCPAutoCorking", { rate: true });
ns("TcpExt:TCPFromZeroWindowAdv", { rate: true });
ns("TcpExt:TCPToZeroWindowAdv", { rate: true });
ns("TcpExt:TCPWantZeroWindowAdv", { rate: true });
ns("TcpExt:TCPSynRetrans", { rate: true });
ns("TcpExt:TCPOrigDataSent", { rate: true });
ns("TcpExt:TCPHystartTrainDetect", { rate: true });
ns("TcpExt:TCPHystartTrainCwnd", { rate: true });
ns("TcpExt:TCPHystartDelayDetect", { rate: true });
ns("TcpExt:TCPHystartDelayCwnd", { rate: true });
ns("TcpExt:TCPACKSkippedSynRecv", { rate: true });
ns("TcpExt:TCPACKSkippedPAWS", { rate: true });
ns("TcpExt:TCPACKSkippedSeq", { rate: true });
ns("TcpExt:TCPACKSkippedFinWait2", { rate: true });
ns("TcpExt:TCPACKSkippedTimeWait", { rate: true });
ns("TcpExt:TCPACKSkippedChallenge", { rate: true });
ns("TcpExt:TCPWinProbe", { rate: true });
ns("TcpExt:TCPKeepAlive", { rate: true });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("System storage");
//
//
// systemMetrics disk
//
// reads          number of read I/Os processed
// reads_merged   number of read I/Os merged with in-queue I/O
// read_sectors   number of sectors read
// read_time_ms   total wait time for read requests
// writes         number of write I/Os processed
// writes_merged  number of write I/Os merged with in-queue I/O
// write_sectors  number of sectors written
// write_time_ms  total wait time for write requests
// io_in_progress number of I/Os currently in flight
// io_time_ms     total time this block device has been active
// io_queued_ms   total wait time for all requests
// 
// total_sectors = read_sectors + write_sectors
// total_time_ms = read_time_ms + write_time_ms
// ios = reads + writes
//
// rrqm/s     RATE(reads_merged)                  read requests merged (/s)       DONE
// wrqm/s     RATE(reads_merged)                  write requests merged (/s)      DONE
// r/s        RATE(reads)                         read requests issued (/s)       DONE
// rkB/s      RATE(read_sectors) / fctr           bytes read (MB/s)               DONE
// wkB/s      RATE(write_sectors) / fctr          bytes written (MB/s)            DONE
// avgrq-sz   RATE(total_sectors) / RATE(ios)     average request size (sectors)  DONE
// avgqu-sz   RATE(io_queued_ms) / 1000           average queue length            DONE
// await      RATE(total_time_ms) / RATE(ios)     average wait time (ms)          WON"T DO
// r_await    RATE(read_time_ms) / RATE(reads)    average read wait time (ms)     DONE
// w_await    RATE(write_time_ms) / RATE(writes)  average write wait time (ms)    DONE
// svctm      %util / RATE(ios)                   average service time (ms)       NO GOOD
//
//
// Linux
//
var sector = 512; // this is by definition, for the metrics that use "sector"
function sm_lnx_disk(metric, name, chart, desc) {
    desc.pattern = P("disks", "(.*)", metric + "$"),
        desc.timebasePath = P("ftdc", "systemMetrics", "start");
    desc.section = "System storage disk {1}";
    desc.name = "disk {1} " + name;
    if (chart)
        desc.chart = chart;
    if (desc.chart)
        desc.chart += " {1}";
    if (!desc.ratePath)
        desc.rate = true;
    prependPaths(desc, ["ftdc", "systemMetrics"]);
    addPattern(desc, "sm_lnx_disk_group");
}
sm_lnx_disk("read_sectors", "bytes read", "sm_lnx_disk_data", { scale: 1024 * 1024 / sector, units: "MiB" });
sm_lnx_disk("write_sectors", "bytes written", "sm_lnx_disk_data", { scale: 1024 * 1024 / sector, units: "MiB" });
sm_lnx_disk("write_sectors", "bytes total", "sm_lnx_disk_data", { scale: 1024 * 1024 / sector, units: "MiB", addPath:P("disks", "{1}", "read_sectors") });
sm_lnx_disk("reads", "read requests issued", "sm_lnx_disk_ops", { rate: true });
sm_lnx_disk("writes", "write requests issued", "sm_lnx_disk_ops", { rate: true });
var readsMetric = P("disks", "{1}", "reads");
var writesMetric = P("disks", "{1}", "writes");
sm_lnx_disk("writes", "total requests issued", "sm_lnx_disk_ops", {addPath: readsMetric, rate: true });
sm_lnx_disk("reads_merged", "read requests merged", "sm_lnx_disk_merged", {});
sm_lnx_disk("writes_merged", "write requests merged", "sm_lnx_disk_merged", {});
sm_lnx_disk("read_time_ms", "average read wait time", "sm_average_wait_time", { ratePath: readsMetric, units: "ms" });
sm_lnx_disk("write_time_ms", "average write wait time", "sm_average_wait_time", { ratePath: writesMetric, units: "ms" });
sm_lnx_disk("read_sectors", "average read request size", "sm_average_request_size", { ratePath: readsMetric, scale: 1024 / sector, units: "KiB" });
sm_lnx_disk("write_sectors", "average write request size", "sm_average_request_size", { ratePath: writesMetric, scale: 1024 / sector, units: "KiB" });
sm_lnx_disk("io_queued_ms", "average queue length", null, { scale: 1000, units: "#" });
sm_lnx_disk("io_time_ms", "average utilization", null, { scale: 10, units: "%" });
//
// Windows
//
function sm_win_disk_base(name, metric, chart, desc) {
    var parts = metric.split("\\");
    desc.pattern = P("disks", "(.*)", parts.join("\\\\") + "$");
    desc.timebasePath = P("ftdc", "systemMetrics", "start");
    desc.section = "System storage disk {1}";
    desc.name = "disk {1} " + name;
    if (chart)
        desc.chart = chart;
    if (desc.chart)
        desc.chart += " {1}";
    prependPaths(desc, ["ftdc", "systemMetrics"]);
    addPattern(desc, "sm_win_disk_group");
}
function sm_win_disk(metric, chart, desc) {
    var metric_name = tail(metric).replace("/sec", "");
    sm_win_disk_base(metric_name, metric, chart, desc);
}
// this is just queue length x 100%, except we limit it to 100% in sm_win_disk_pct
sm_win_disk("\\PhysicalDisk\\% Disk Read Time", "sm_win_disk_rw_pct", { rate: true, units: "%", scale: 1e9 / (1000), yMax: 100 });
sm_win_disk("\\PhysicalDisk\\% Disk Write Time", "sm_win_disk_rw_pct", { rate: true, units: "%", scale: 1e9 / (1000), yMax: 100 });
sm_win_disk("\\PhysicalDisk\\Current Disk Queue Length", null, {});
sm_win_disk("\\PhysicalDisk\\Avg. Disk Read Queue Length", "sm_win_disk_avg_queue", { rate: true, scale: 1e9 / (1000), units: "#", yMax: 100 });
sm_win_disk("\\PhysicalDisk\\Avg. Disk Write Queue Length", "sm_win_disk_avg_queue", { rate: true, scale: 1e9 / (1000), units: "#", yMax: 100 });
sm_win_disk("\\PhysicalDisk\\Disk Reads/sec", "sm_win_disk_rw_rate", { rate: true });
sm_win_disk("\\PhysicalDisk\\Disk Writes/sec", "sm_win_disk_rw_rate", { rate: true });
sm_win_disk("\\PhysicalDisk\\Disk Read Bytes/sec", "sm_win_disk_rw_bps", { rate: true, scale: "MiB" });
sm_win_disk("\\PhysicalDisk\\Disk Write Bytes/sec", "sm_win_disk_rw_bps", { rate: true, scale: "MiB" });
try {
    //# bytes/op = (bytes/s) / (ops/s)
    for (var _d = __values(["Read", "Write"]), _e = _d.next(); !_e.done; _e = _d.next()) {
        var op = _e.value;
        var name_2 = util.format("Avg. Disk Bytes/%s", op);
        var numerator = util.format("\\PhysicalDisk\\Disk %s Bytes/sec", op);
        var ratePath = P("disks", "{1}", util.format("\\PhysicalDisk\\Disk %ss/sec", op));
        sm_win_disk_base(name_2, numerator, "sm_disk_bytes_per_op", { ratePath: ratePath, scale: 1024, units: "KiB" });
    }
}
catch (e_1_1) { e_1 = { error: e_1_1 }; }
finally {
    try {
        if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
    }
    finally { if (e_1) throw e_1.error; }
}
try {
    //# sec/op = (optime/s) / (op/s)
    for (var _f = __values(["Read", "Write"]), _g = _f.next(); !_g.done; _g = _f.next()) {
        var op = _g.value;
        var name_3 = util.format("Avg. Disk sec/%s", op);
        var numerator = util.format("\\PhysicalDisk\\% Disk %s Time", op);
        var ratePath = P("disks", "{1}", util.format("\\PhysicalDisk\\Disk %ss/sec", op));
        sm_win_disk_base(name_3, numerator, "sm_disk_sec_per_op", { ratePath: ratePath, scale: 1 / (100e-9 * 1000), units: "ms" });
    }
}
catch (e_2_1) { e_2 = { error: e_2_1 }; }
finally {
    try {
        if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
    }
    finally { if (e_2) throw e_2.error; }
}
///////////////////////////////////////////////////////////////////////////////
//
SECTION("System iostat");
//
function iostat_cpu(metric, name, chart) {
    addDescriptor({
        path: P("iostat", "cpu", "%" + metric),
        timebasePath: P("iostat", "start"),
        name: "iostat cpu " + name,
        units: "%",
        yMax: 100,
        chart: chart,
    });
}
iostat_cpu("user", "user", "iostat_cpu");
iostat_cpu("system", "kernel", "iostat_cpu");
iostat_cpu("iowait", "iowait", "iostat_cpu");
iostat_cpu("nice", "nice", "iostat_cpu");
iostat_cpu("steal", "steal", "iostat_cpu");
iostat_cpu("idle", "idle");
function iostat_disk(metric, name, units, chart, desc) {
    if (desc === void 0) { desc = {}; }
    desc.pattern = P("iostat", "(.*)", metric + "$"),
        desc.timebasePath = P("iostat", "start");
    desc.name = "iostat disk {1} " + name;
    desc.units = units;
    if (chart)
        desc.chart = chart + " {1}";
    addPattern(desc, "iostat_disk_group");
}
iostat_disk("rkB/s", "bytes read", "MiB/s", "iostat_disk_data", { scale: 1024 });
iostat_disk("wkB/s", "bytes written", "MiB/s", "iostat_disk_data", { scale: 1024 });
iostat_disk("rsec/s", "bytes read", "MiB/s", "iostat_disk_data", { scale: 512 });
iostat_disk("wsec/s", "bytes written", "MiB/s", "iostat_disk_data", { scale: 512 });
iostat_disk("r/s", "read requests issued", "/s", "iostat_disk_ops");
iostat_disk("w/s", "write requests issued", "/s", "iostat_disk_ops");
iostat_disk("rrqm/s", "read requests merged", "/s", "iostat_disk_merged");
iostat_disk("wrqm/s", "write requests merged", "/s", "iostat_disk_merged");
iostat_disk("%rrqm", "percent read requests merged", "%", "iostat_%rqm", { ymax: 100 });
iostat_disk("%wrqm", "percent write requests merged", "%", "iostat_%rqm", { ymax: 100 });
iostat_disk("r_await", "average read wait time", "ms", "iostat_average_wait_time");
iostat_disk("w_await", "average write wait time", "ms", "iostat_average_wait_time");
iostat_disk("avgrq-sz", "average request size", "KiB", undefined, { scale: 1024 / sector });
iostat_disk("areq-sz", "average request size", "KiB", undefined, { scale: 1024 / sector });
iostat_disk("rareq-sz", "average read request size", "KiB", "iostat_areq-sz", { scale: 1024 / sector });
iostat_disk("wareq-sz", "average write request size", "KiB", "iostat_areq-sz", { scale: 1024 / sector });
iostat_disk("avgqu-sz", "average queue length", "#");
iostat_disk("aqu-sz", "average queue length", "#");
iostat_disk("%util", "average utilization", "%", undefined, { yMax: 100 });
addDescriptor({ path: P("iostat", "start"), ignore: true });
iostat_disk("await", "", "", "", { ignore: true });
iostat_disk("svctm", "", "", "", { ignore: true });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Locks");
//
function ss_lock(name) {
    var e_15, _a, e_16, _b;
    var locks = ["acquireCount", "acquireWaitCount", "deadlockCount", "timeAcquiringMicros"];
    var modes = ["r", "w", "R", "W"];
    try {
        for (var locks_1 = __values(locks), locks_1_1 = locks_1.next(); !locks_1_1.done; locks_1_1 = locks_1.next()) {
            var lock = locks_1_1.value;
            try {
                for (var modes_1 = (e_16 = void 0, __values(modes)), modes_1_1 = modes_1.next(); !modes_1_1.done; modes_1_1 = modes_1.next()) {
                    var mode = modes_1_1.value;
                    if (lock == "timeAcquiringMicros")
                        ss({ path: P("locks", name, lock, mode), rate: true, scale: 1000000, units: "threads" });
                    else
                        ss({ path: P("locks", name, lock, mode), rate: true });
                }
            }
            catch (e_16_1) { e_16 = { error: e_16_1 }; }
            finally {
                try {
                    if (modes_1_1 && !modes_1_1.done && (_b = modes_1.return)) _b.call(modes_1);
                }
                finally { if (e_16) throw e_16.error; }
            }
        }
    }
    catch (e_15_1) { e_15 = { error: e_15_1 }; }
    finally {
        try {
            if (locks_1_1 && !locks_1_1.done && (_a = locks_1.return)) _a.call(locks_1);
        }
        finally { if (e_15) throw e_15.error; }
    }
}
ss_lock("Collection");
ss_lock("Database");
ss_lock("Global");
ss_lock("ParallelBatchWriterMode"); // Appears after Global because it is effectively a global lock
ss_lock("ReplicationStateTransition"); // Appears after Global because it is effectively a global lock
ss_lock("MMAPV1Journal");
ss_lock("Metadata");
ss_lock("Mutex"); // ???
ss_lock("oplog");
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Commands");
//
function ss_command(command) {
    ss({ path: P("metrics", "commands", command, "total"), rate: true });
    ss({ path: P("metrics", "commands", command, "failed"), rate: true });
}
// don"t know what this is
ss({ path: P("metrics", "commands", "<UNKNOWN>"), rate: true });
ss_command("_addShard");
ss_command("_cloneCatalogData");
ss_command("_cloneCollectionOptionsFromPrimaryShard");
ss_command("_configsvrAddShard");
ss_command("_configsvrAddShardToZone");
ss_command("_configsvrBalancerStart");
ss_command("_configsvrBalancerStatus");
ss_command("_configsvrBalancerStop");
ss_command("_configsvrCommitChunkMerge");
ss_command("_configsvrCommitChunkMigration");
ss_command("_configsvrCommitChunkSplit");
ss_command("_configsvrCommitMovePrimary");
ss_command("_configsvrCreateCollection");
ss_command("_configsvrCreateDatabase");
ss_command("_configsvrDropCollection");
ss_command("_configsvrDropDatabase");
ss_command("_configsvrEnableSharding");
ss_command("_configsvrMoveChunk");
ss_command("_configsvrMovePrimary");
ss_command("_configsvrRemoveShard");
ss_command("_configsvrRemoveShardFromZone");
ss_command("_configsvrSetFeatureCompatibilityVersion");
ss_command("_configsvrShardCollection");
ss_command("_configsvrUpdateZoneKeyRange");
ss_command("_flushDatabaseCacheUpdates");
ss_command("_flushRoutingTableCacheUpdates");
ss_command("_getNextSessionMods");
ss_command("_getUserCacheGeneration");
ss_command("_hashBSONElement");
ss_command("_isSelf");
ss_command("_mergeAuthzCollections");
ss_command("_migrateClone");
ss_command("_movePrimary");
ss_command("_recvChunkAbort");
ss_command("_recvChunkCommit");
ss_command("_recvChunkStart");
ss_command("_recvChunkStatus");
ss_command("_shardsvrShardCollection");
ss_command("_transferMods");
ss_command("abortTransaction");
ss_command("addShard");
ss_command("addShardToZone");
ss_command("aggregate");
ss_command("appendOplogNote");
ss_command("applyOps");
ss_command("authSchemaUpgrade");
ss_command("authenticate");
ss_command("availableQueryOptions");
ss_command("buildInfo");
ss_command("captrunc");
ss_command("checkShardingIndex");
ss_command("cleanupOrphaned");
ss_command("clone");
ss_command("cloneCollection");
ss_command("cloneCollectionAsCapped");
ss_command("collMod");
ss_command("collStats");
ss_command("commitTransaction");
ss_command("compact");
ss_command("configureFailPoint");
ss_command("connPoolStats");
ss_command("connPoolSync");
ss_command("connectionStatus");
ss_command("convertToCapped");
ss_command("coordinateCommitTransaction");
ss_command("copydb");
ss_command("copydbgetnonce");
ss_command("copydbsaslstart");
ss_command("count");
ss_command("create");
ss_command("createIndexes");
ss_command("createRole");
ss_command("createUser");
ss_command("currentOp");
ss_command("currentOpCtx");
ss_command("cursorInfo");
ss_command("balancerStart");
ss_command("balancerStatus");
ss_command("balancerStop");
ss_command("dataSize");
ss_command("dbHash");
ss_command("dbStats");
ss_command("delete");
ss_command("diagLogging");
ss_command("distinct");
ss_command("driverOIDTest");
ss_command("drop");
ss_command("dropAllRolesFromDatabase");
ss_command("dropAllUsersFromDatabase");
ss_command("dropDatabase");
ss_command("dropConnections");
ss_command("dropIndexes");
ss_command("dropRole");
ss_command("dropUser");
ss_command("emptycapped");
ss_command("enableSharding");
ss_command("endSessions");
ss_command("eval");
ss_command("explain");
ss_command("features");
ss_command("filemd5");
ss_command("find");
ss_command("findAndModify");
ss_command("flushRouterConfig");
ss_command("forceRoutingTableRefresh");
ss_command("forceerror");
ss_command("fsync");
ss_command("fsyncUnlock");
ss_command("geoNear");
ss_command("geoSearch");
ss_command("getCmdLineOpts");
ss_command("getDatabaseVersion");
ss_command("getDiagnosticData");
ss_command("getFreeMonitoringStatus");
ss_command("getLastError");
ss_command("getLog");
ss_command("getMore");
ss_command("getParameter");
ss_command("getPrevError");
ss_command("getShardMap");
ss_command("getShardVersion");
ss_command("getnonce");
ss_command("godinsert");
ss_command("grantPrivilegesToRole");
ss_command("grantRolesToRole");
ss_command("grantRolesToUser");
ss_command("group");
ss_command("handshake");
ss_command("hostInfo");
ss_command("insert");
ss_command("invalidateUserCache");
ss_command("isdbgrid");
ss_command("isMaster");
ss_command("journalLatencyTest");
ss_command("killAllSessions");
ss_command("killAllSessionsByPattern");
ss_command("killCursors");
ss_command("killOp");
ss_command("killSessions");
ss_command("listCollections");
ss_command("listCommands");
ss_command("listDatabases");
ss_command("listIndexes");
ss_command("listShards");
ss_command("lockInfo");
ss_command("logRotate");
ss_command("logout");
ss_command("makeSnapshot");
ss_command("mapReduce");
ss_command("medianKey");
ss_command("mergeChunks");
ss_command("moveChunk");
ss_command("movePrimary");
ss_command("netstat");
ss_command("parallelCollectionScan");
ss_command("ping");
ss_command("planCacheClear");
ss_command("planCacheClearFilters");
ss_command("planCacheListFilters");
ss_command("planCacheListPlans");
ss_command("planCacheListQueryShapes");
ss_command("planCacheSetFilter");
ss_command("prepareTransaction");
ss_command("profile");
ss_command("reIndex");
ss_command("refreshSessions");
ss_command("refreshSessionsInternal");
ss_command("removeShard");
ss_command("removeShardFromZone");
ss_command("renameCollection");
ss_command("repairCursor");
ss_command("repairDatabase");
ss_command("replSetAbortPrimaryCatchUp");
ss_command("replSetDeclareElectionWinner");
ss_command("replSetElect");
ss_command("replSetFreeze");
ss_command("replSetFresh");
ss_command("replSetGetConfig");
ss_command("replSetGetRBID");
ss_command("replSetGetStatus");
ss_command("replSetHeartbeat");
ss_command("replSetInitiate");
ss_command("replSetMaintenance");
ss_command("replSetReconfig");
ss_command("replSetRequestVotes");
ss_command("replSetResizeOplog");
ss_command("replSetStepDown");
ss_command("replSetStepUp");
ss_command("replSetSyncFrom");
ss_command("replSetTest");
ss_command("replSetUpdatePosition");
ss_command("resetError");
ss_command("resync");
ss_command("revokePrivilegesFromRole");
ss_command("revokeRolesFromRole");
ss_command("revokeRolesFromUser");
ss_command("rolesInfo");
ss_command("saslContinue");
ss_command("saslStart");
ss_command("serverStatus");
ss_command("setCommittedSnapshot");
ss_command("setFeatureCompatibilityVersion");
ss_command("setFreeMonitoring");
ss_command("setIndexCommitQuorum");
ss_command("setParameter");
ss_command("setShardVersion");
ss_command("shardCollection");
ss_command("shardConnPoolStats");
ss_command("shardingState");
ss_command("shutdown");
ss_command("sleep");
ss_command("split");
ss_command("splitChunk");
ss_command("splitVector");
ss_command("stageDebug");
ss_command("startRecordingTraffic");
ss_command("startSession");
ss_command("stopRecordingTraffic");
ss_command("text");
ss_command("top");
ss_command("touch");
ss_command("twoPhaseCreateIndexes");
ss_command("unsetSharding");
ss_command("update");
ss_command("updateZoneKeyRange");
ss_command("updateRole");
ss_command("updateUser");
ss_command("usersInfo");
ss_command("validate");
ss_command("voteCommitIndexBuild");
ss_command("whatsmyuri");
ss_command("writebacklisten");
ss_command(P("mapreduce", "shardedfinish").key);
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Replication metrics");
//
ss({ path: P("metrics", "repl", "apply", "batches", "num"), rate: true });
ss({ path: P("metrics", "repl", "apply", "batches", "totalMillis"), rate: true });
ss({ path: P("metrics", "repl", "apply", "ops"), rate: true });
ss({ path: P("metrics", "repl", "apply", "batchSize"), rate: true });
ss({ path: P("metrics", "repl", "apply", "attemptsToBecomeSecondary") });
ss({ path: P("metrics", "repl", "buffer", "count") });
ss({ path: P("metrics", "repl", "buffer", "maxSizeBytes"), scale: "MiB" });
ss({ path: P("metrics", "repl", "buffer", "sizeBytes"), scale: "MiB" });
ss({ path: P("metrics", "repl", "executor", "counters", "cancels"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "eventCreated"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "eventWait"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "scheduledDBWork"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "scheduledNetCmd"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "scheduledWork"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "scheduledWorkAt"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "scheduledXclWork"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "schedulingFailures"), rate: true });
ss({ path: P("metrics", "repl", "executor", "counters", "waits"), rate: true });
ss({ path: P("metrics", "repl", "executor", "pool", "inProgressCount") });
ss({ path: P("metrics", "repl", "executor", "eventWaiters") });
ss({ path: P("metrics", "repl", "executor", "queues", "dbWorkInProgress") });
ss({ path: P("metrics", "repl", "executor", "queues", "exclusiveInProgress") });
ss({ path: P("metrics", "repl", "executor", "queues", "free") });
ss({ path: P("metrics", "repl", "executor", "queues", "networkInProgress") });
ss({ path: P("metrics", "repl", "executor", "queues", "ready") });
ss({ path: P("metrics", "repl", "executor", "queues", "sleepers") });
ss({ path: P("metrics", "repl", "executor", "shuttingDown") });
ss({ path: P("metrics", "repl", "executor", "unsignaledEvents") });
ss({ path: P("metrics", "repl", "initialSync", "completed") });
ss({ path: P("metrics", "repl", "initialSync", "failedAttempts") });
ss({ path: P("metrics", "repl", "initialSync", "failures") });
ss({ path: P("metrics", "repl", "network", "bytes"), rate: true, scale: "MB" });
ss({ path: P("metrics", "repl", "network", "getmores", "num"), rate: true });
ss({ path: P("metrics", "repl", "network", "getmores", "totalMillis"), rate: true });
ss({ path: P("metrics", "repl", "network", "notMasterLegacyUnacknowledgedWrites"), rate: true });
ss({ path: P("metrics", "repl", "network", "notMasterUnacknowledgedWrites"), rate: true });
ss({ path: P("metrics", "repl", "network", "ops"), rate: true });
ss({ path: P("metrics", "repl", "network", "readersCreated"), rate: true });
ss({ path: P("metrics", "repl", "preload", "docs", "num"), rate: true });
ss({ path: P("metrics", "repl", "preload", "docs", "totalMillis"), rate: true });
ss({ path: P("metrics", "repl", "preload", "indexes", "num"), rate: true });
ss({ path: P("metrics", "repl", "preload", "indexes", "totalMillis"), rate: true });
ss({ path: P("metrics", "repl", "stepDown", "userOperationsKilled") });
ss({ path: P("metrics", "repl", "stepDown", "userOperationsRunning") });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("TTL metrics");
//
ss({ path: P("metrics", "ttl", "deletedDocuments"), rate: true });
ss({ path: P("metrics", "ttl", "passes"), rate: true });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("WiredTiger");
//
ss({ path: P("wiredTiger", "concurrentTransactions", "read", "available")}); // xxx
ss({ path: P("wiredTiger", "concurrentTransactions", "read", "out") });
ss({ path: P("wiredTiger", "concurrentTransactions", "read", "totalTickets") });
ss({ path: P("wiredTiger", "concurrentTransactions", "write", "available")});
ss({ path: P("wiredTiger", "concurrentTransactions", "write", "out") });
ss({ path: P("wiredTiger", "concurrentTransactions", "write", "totalTickets") });
ss({ path: P("storageEngine", "backupCursorOpen") });
ss({ path: P("storageEngine", "dropPendingIdents") });
wt({ path: P("LSM", "application work units currently queued") });
wt({ path: P("LSM", "bloom filter false positives"), rate: true });
wt({ path: P("LSM", "bloom filter hits"), rate: true });
wt({ path: P("LSM", "bloom filter misses"), rate: true });
wt({ path: P("LSM", "bloom filter pages evicted from cache"), rate: true });
wt({ path: P("LSM", "bloom filter pages read into cache"), rate: true });
wt({ path: P("LSM", "bloom filters in the LSM tree") });
wt({ path: P("LSM", "chunks in the LSM tree") });
wt({ path: P("LSM", "highest merge generation in the LSM tree") });
wt({ path: P("LSM", "merge work units currently queued") });
wt({ path: P("LSM", "queries that could have benefited from a Bloom filter that did not ex"), rate: true });
wt({ path: P("LSM", "rows merged in an LSM tree"), rate: true });
wt({ path: P("LSM", "sleep for LSM checkpoint throttle"), rate: true });
wt({ path: P("LSM", "sleep for LSM merge throttle"), rate: true });
wt({ path: P("LSM", "switch work units currently queued") });
wt({ path: P("LSM", "total size of bloom filters") });
wt({ path: P("LSM", "tree maintenance operations discarded"), rate: true });
wt({ path: P("LSM", "tree maintenance operations executed"), rate: true });
wt({ path: P("LSM", "tree maintenance operations scheduled"), rate: true });
wt({ path: P("LSM", "tree queue hit maximum"), rate: true });
wt({ path: P("async", "current work queue length") });
wt({ path: P("async", "maximum work queue length") });
wt({ path: P("async", "number of allocation state races"), rate: true });
wt({ path: P("async", "number of flush calls"), rate: true });
wt({ path: P("async", "number of operation slots viewed for allocation"), rate: true });
wt({ path: P("async", "number of times operation allocation failed"), rate: true });
wt({ path: P("async", "number of times worker found no work"), rate: true });
wt({ path: P("async", "total allocations"), rate: true });
wt({ path: P("async", "total compact calls"), rate: true });
wt({ path: P("async", "total insert calls"), rate: true });
wt({ path: P("async", "total remove calls"), rate: true });
wt({ path: P("async", "total search calls"), rate: true });
wt({ path: P("async", "total update calls"), rate: true });
wt({ path: P("block-manager", "allocations requiring file extension"), rate: true });
wt({ path: P("block-manager", "blocks allocated"), rate: true });
wt({ path: P("block-manager", "blocks freed"), rate: true });
wt({ path: P("block-manager", "blocks pre-loaded"), rate: true });
wt({ path: P("block-manager", "blocks read"), chart: "wt_block-manager_blocks", rate: true });
wt({ path: P("block-manager", "blocks written"), chart: "wt_block-manager_blocks", rate: true });
wt({ path: P("block-manager", "bytes read"), chart: "wt_block-manager_bytes", scale: "MiB", rate: true });
wt({ path: P("block-manager", "bytes written"), chart: "wt_block-manager_bytes", scale: "MiB", rate: true });
wt({ path: P("block-manager", "checkpoint size") });
wt({ path: P("block-manager", "file allocation unit size") });
wt({ path: P("block-manager", "file bytes available for reuse"), scale: "MiB" });
wt({ path: P("block-manager", "file size in bytes"), scale: "MiB" });
wt({ path: P("block-manager", "mapped blocks read"), rate: true });
wt({ path: P("block-manager", "mapped bytes read"), rate: true, scale: "MiB" });
wt({ path: P("block-manager", "bytes written for checkpoint"), rate: true, scale: "MiB" });
wt({ path: P("btree", "column-store fixed-size leaf pages") });
wt({ path: P("btree", "column-store internal pages") });
wt({ path: P("btree", "column-store variable-size deleted values") });
wt({ path: P("btree", "column-store variable-size leaf pages") });
wt({ path: P("btree", "cursor create calls"), rate: true });
wt({ path: P("btree", "cursor insert calls"), rate: true });
wt({ path: P("btree", "cursor next calls"), rate: true });
wt({ path: P("btree", "cursor prev calls"), rate: true });
wt({ path: P("btree", "cursor remove calls"), rate: true });
wt({ path: P("btree", "cursor reset calls"), rate: true });
wt({ path: P("btree", "cursor search calls"), rate: true });
wt({ path: P("btree", "cursor search near calls"), rate: true });
wt({ path: P("btree", "cursor update calls"), rate: true });
wt({ path: P("btree", "fixed-record size") });
wt({ path: P("btree", "maximum internal page item size") });
wt({ path: P("btree", "maximum internal page size") });
wt({ path: P("btree", "maximum leaf page item size") });
wt({ path: P("btree", "maximum leaf page size") });
wt({ path: P("btree", "maximum tree depth") });
wt({ path: P("btree", "number of key/value pairs") });
wt({ path: P("btree", "overflow pages") });
wt({ path: P("btree", "pages rewritten by compaction"), rate: true });
wt({ path: P("btree", "row-store internal pages") });
wt({ path: P("btree", "row-store leaf pages") });
wt({ path: P("cache", "application threads page read from disk to cache count"), rate: true });
wt({ path: P("cache", "application threads page read from disk to cache time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("cache", "application threads page write from cache to disk count"), rate: true });
wt({ path: P("cache", "application threads page write from cache to disk time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("cache", "bytes dirty in the cache cumulative"), rate: true, scale: "MiB" });
wt({ path: P("cache", "bytes belonging to page images in the cache"), scale: "MiB" });
wt({ path: P("cache", "bytes belonging to the cache overflow table in the cache"), scale: "MiB" });
wt({ path: P("cache", "bytes currently in the cache"), scale: "MiB" });
wt({ path: P("cache", "bytes currently in the cache"),
    divPath: P("cache", "maximum bytes configured"),
    scale: 0.01, units: "%", name: "cache fill ratio",
    alerter: gyrAlerter(80, 95)
});
wt({ path: P("cache", "pages read into cache"),
    divPath: P("cache", "pages requested from the cache"),
    scale: 0.01, units: "%", name: "cache miss ratio"
});
wt({ path: P("cache", "bytes not belonging to page images in the cache"), scale: "MiB" });
wt({ path: P("cache", "bytes read into cache"), chart: "wt_cache_bytes_cache", scale: "MiB", rate: true });
wt({ path: P("cache", "bytes written from cache"), chart: "wt_cache_bytes_cache", scale: "MiB", rate: true });
wt({ path: P("cache", "cache overflow cursor application thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("cache", "cache overflow cursor internal thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("cache", "cache overflow table max on-disk size"), scale: "MiB" });
wt({ path: P("cache", "cache overflow table on-disk size"), scale: "MiB" });
wt({ path: P("cache", "checkpoint blocked page eviction"), rate: true });
wt({ path: P("cache", "data source pages selected for eviction unable to be evicted") });
wt({ path: P("cache", "eviction calls to get a page found queue empty after locking"), rate: true });
wt({ path: P("cache", "eviction calls to get a page found queue empty"), rate: true });
wt({ path: P("cache", "eviction calls to get a page"), rate: true });
wt({ path: P("cache", "eviction currently operating in aggressive mode") });
wt({ path: P("cache", "eviction empty score") });
wt({ path: P("cache", "eviction passes of a file"), rate: true });
wt({ path: P("cache", "eviction server candidate queue empty when topping up"), rate: true });
wt({ path: P("cache", "eviction server candidate queue not empty when topping up"), rate: true });
wt({ path: P("cache", "eviction server evicting pages"), rate: true });
wt({ path: P("cache", "eviction server populating queue, but not evicting pages"), rate: true });
wt({ path: P("cache", "eviction server skipped very large page"), rate: true });
wt({ path: P("cache", "eviction server slept, because we did not make progress with eviction"), rate: true });
wt({ path: P("cache", "eviction server unable to reach eviction goal"), rate: "delta" });
wt({ path: P("cache", "eviction server waiting for a leaf page"), rate: true });
wt({ path: P("cache", "eviction server waiting for an internal page sleep (usec)"), rate: true, scale: 1e6, units: "threads" });
wt({ path: P("cache", "eviction server waiting for an internal page yields"), rate: true });
wt({ path: P("cache", "eviction state") });
wt({ path: P("cache", "eviction walk target pages histogram - 0-9"), rate: true });
wt({ path: P("cache", "eviction walk target pages histogram - 10-31"), rate: true });
wt({ path: P("cache", "eviction walk target pages histogram - 128 and higher"), rate: true });
wt({ path: P("cache", "eviction walk target pages histogram - 32-63"), rate: true });
wt({ path: P("cache", "eviction walk target pages histogram - 64-128"), rate: true });
wt({ path: P("cache", "eviction walks abandoned"), rate: true });
wt({ path: P("cache", "eviction walks gave up because they restarted their walk twice"), rate: true });
wt({ path: P("cache", "eviction walks gave up because they saw too many pages and found no candidates"), rate: true });
wt({ path: P("cache", "eviction walks gave up because they saw too many pages and found too few candidates"), rate: true });
wt({ path: P("cache", "eviction walks reached end of tree"), rate: true });
wt({ path: P("cache", "eviction walks started from root of tree"), rate: true });
wt({ path: P("cache", "eviction walks started from saved location in tree"), rate: true });
wt({ path: P("cache", "eviction worker thread active") });
wt({ path: P("cache", "eviction worker thread created") });
wt({ path: P("cache", "eviction worker thread evicting pages"), rate: true });
wt({ path: P("cache", "eviction worker thread removed") });
wt({ path: P("cache", "eviction worker thread stable number") });
wt({ path: P("cache", "failed eviction of pages that exceeded the in-memory maximum count"), rate: true });
wt({ path: P("cache", "failed eviction of pages that exceeded the in-memory maximum time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("cache", "failed eviction of pages that exceeded the in-memory maximum"), rate: true });
wt({ path: P("cache", "files with active eviction walks") });
wt({ path: P("cache", "files with new eviction walks started"), rate: true });
wt({ path: P("cache", "force re-tuning of eviction workers once in a while"), rate: true });
wt({ path: P("cache", "forced eviction - pages evicted that were clean count"), rate: true });
wt({ path: P("cache", "forced eviction - pages evicted that were clean time (usecs)"), rate: true, scale: 1e6, units: "threads" });
wt({ path: P("cache", "forced eviction - pages evicted that were dirty count"), rate: true });
wt({ path: P("cache", "forced eviction - pages evicted that were dirty time (usecs)"), rate: true, scale: 1e6, units: "threads" });
wt({ path: P("cache", "forced eviction - pages selected because of too many deleted items count"), rate: true });
wt({ path: P("cache", "forced eviction - pages selected count"), rate: true, scale: 1e6, units: "threads" });
wt({ path: P("cache", "forced eviction - pages selected unable to be evicted count"), rate: true });
wt({ path: P("cache", "forced eviction - pages selected unable to be evicted time"), rate: true, scale: 1e6, units: "threads" });
wt({ path: P("cache", "hazard pointer blocked page eviction"), rate: true });
wt({ path: P("cache", "hazard pointer check calls"), rate: true });
wt({ path: P("cache", "hazard pointer check entries walked"), rate: true });
wt({ path: P("cache", "hazard pointer maximum array length") });
wt({ path: P("cache", "in-memory page passed criteria to be split"), rate: true });
wt({ path: P("cache", "in-memory page splits"), rate: true });
wt({ path: P("cache", "internal pages evicted"), rate: true });
wt({ path: P("cache", "internal pages split during eviction"), rate: true });
wt({ path: P("cache", "leaf pages split during eviction"), rate: true });
wt({ path: P("cache", "cache overflow score") });
wt({ path: P("cache", "cache overflow table entries") });
wt({ path: P("cache", "cache overflow table insert calls"), rate: true });
wt({ path: P("cache", "cache overflow table remove calls"), rate: true });
wt({ path: P("cache", "maximum bytes configured"), scale: "MiB" });
wt({ path: P("cache", "maximum page size at eviction"), scale: "MiB" });
wt({ path: P("cache", "modified pages evicted by application threads"), rate: true });
wt({ path: P("cache", "modified pages evicted"), rate: true });
wt({ path: P("cache", "operations timed out waiting for space in cache"), rate: true });
wt({ path: P("cache", "overflow pages read into cache"), rate: true });
wt({ path: P("cache", "overflow values cached in memory") });
wt({ path: P("cache", "page split during eviction deepened the tree"), rate: true });
wt({ path: P("cache", "page written requiring cache overflow records"), rate: true });
wt({ path: P("cache", "pages currently held in the cache") });
wt({ path: P("cache", "pages evicted because they exceeded the in-memory maximum count"), rate: true });
wt({ path: P("cache", "pages evicted because they exceeded the in-memory maximum time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("cache", "pages evicted because they exceeded the in-memory maximum"), rate: true });
wt({ path: P("cache", "pages evicted because they had chains of deleted items count"), rate: true });
wt({ path: P("cache", "pages evicted because they had chains of deleted items time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("cache", "pages evicted because they had chains of deleted items"), rate: true });
wt({ path: P("cache", "pages evicted by application threads"), rate: true });
wt({ path: P("cache", "pages queued for eviction"), rate: true });
wt({ path: P("cache", "pages queued for eviction post lru sorting"), rate: true });
wt({ path: P("cache", "pages queued for urgent eviction during walk"), rate: true });
wt({ path: P("cache", "pages queued for urgent eviction"), rate: true });
wt({ path: P("cache", "pages read into cache"), chart: "wt_cache_pages_cache", rate: true });
wt({ path: P("cache", "pages read into cache requiring cache overflow entries"), rate: true });
wt({ path: P("cache", "pages read into cache requiring cache overflow for checkpoint"), rate: true });
wt({ path: P("cache", "pages read into cache skipping older cache overflow entries"), rate: true });
wt({ path: P("cache", "pages read into cache with skipped cache overflow entries needed later"), rate: true });
wt({ path: P("cache", "pages read into cache with skipped cache overflow entries needed later by checkpoint"), rate: true });
wt({ path: P("cache", "pages read into cache after truncate in prepare state"), rate: true });
wt({ path: P("cache", "pages read into cache after truncate"), rate: true });
wt({ path: P("cache", "pages requested from the cache"), rate: true });
wt({ path: P("cache", "pages seen by eviction walk"), rate: true });
wt({ path: P("cache", "pages selected for eviction unable to be evicted"), rate: true });
wt({ path: P("cache", "pages split during eviction"), rate: true });
wt({ path: P("cache", "pages walked for eviction"), rate: true, autoScale: "decimal" });
wt({ path: P("cache", "pages written from cache"), chart: "wt_cache_pages_cache", rate: true });
wt({ path: P("cache", "pages written requiring in-memory restoration"), rate: true });
wt({ path: P("cache", "percentage overhead") });
wt({ path: P("cache", "tracked bytes belonging to internal pages in the cache"), scale: "MiB" });
wt({ path: P("cache", "tracked bytes belonging to leaf pages in the cache"), scale: "MiB" });
wt({ path: P("cache", "tracked bytes belonging to overflow pages in the cache"), scale: "MiB" });
wt({ path: P("cache", "tracked dirty bytes in the cache"), scale: "MiB" });
wt({ path: P("cache", "tracked dirty bytes in the cache"),
    divPath: P("cache", "maximum bytes configured"),
    scale: 0.01, units: "%", name: "cache dirty fill ratio",
    alerter: gyrAlerter(5, 20)
});
wt({ path: P("cache", "tracked dirty pages in the cache") });
wt({ path: P("cache", "unmodified pages evicted"), rate: true });
wt({ path: P("capacity", "background fsync file handles considered"), rate: true });
wt({ path: P("capacity", "background fsync file handles synced"), rate: true });
wt({ path: P("capacity", "background fsync time (msecs)") });
wt({ path: P("capacity", "bytes read"), rate: true, scale: "MiB" });
wt({ path: P("capacity", "bytes written for checkpoint"), rate: true, scale: "MiB" });
wt({ path: P("capacity", "bytes written for eviction"), rate: true, scale: "MiB" });
wt({ path: P("capacity", "bytes written for log"), rate: true, scale: "MiB" });
wt({ path: P("capacity", "bytes written total"), rate: true, scale: "MiB" });
wt({ path: P("capacity", "threshold to call fsync") });
wt({ path: P("capacity", "time waiting due to total capacity (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("capacity", "time waiting during checkpoint (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("capacity", "time waiting during eviction (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("capacity", "time waiting during logging (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("capacity", "time waiting during read (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("compression", "compressed pages read"), chart: "wt_compression_compressed_pages", rate: true });
wt({ path: P("compression", "compressed pages written"), chart: "wt_compression_compressed_pages", rate: true });
wt({ path: P("compression", "page written failed to compress"), rate: true });
wt({ path: P("compression", "page written was too small to compress"), rate: true });
wt({ path: P("compression", "raw compression call failed, additional data available"), rate: true });
wt({ path: P("compression", "raw compression call failed, no additional data available"), rate: true });
wt({ path: P("compression", "raw compression call succeeded"), rate: true });
wt({ path: P("connection", "auto adjusting condition resets"), rate: true });
wt({ path: P("connection", "auto adjusting condition wait calls"), rate: true });
wt({ path: P("connection", "detected system time went backwards"), rate: true });
wt({ path: P("connection", "files currently open") });
wt({ path: P("connection", "memory allocations"), rate: true });
wt({ path: P("connection", "memory frees"), rate: true });
wt({ path: P("connection", "memory re-allocations"), rate: true });
wt({ path: P("connection", "pthread mutex condition wait calls"), rate: true });
wt({ path: P("connection", "pthread mutex shared lock read-lock calls"), rate: true });
wt({ path: P("connection", "pthread mutex shared lock write-lock calls"), rate: true });
wt({ path: P("connection", "total fsync I/Os"), rate: true });
wt({ path: P("connection", "total read I/Os"), chart: "wt_connection_total_I/Os", rate: true });
wt({ path: P("connection", "total write I/Os"), chart: "wt_connection_total_I/Os", rate: true });
wt({ path: P("cursor", "cached cursor count") });
wt({ path: P("cursor", "cursor sweep buckets"), rate: true });
wt({ path: P("cursor", "cursor sweep cursors closed"), rate: true });
wt({ path: P("cursor", "cursor sweep cursors examined"), rate: true });
wt({ path: P("cursor", "cursor sweeps"), rate: true });
wt({ path: P("cursor", "cursors cached on close"), rate: true });
wt({ path: P("cursor", "cursors reused from cache"), rate: true });
wt({ path: P("cursor", "bulk-loaded cursor-insert calls"), rate: true });
wt({ path: P("cursor", "create calls"), rate: true });
wt({ path: P("cursor", "cursor create calls"), rate: true });
wt({ path: P("cursor", "cursor insert calls"), rate: true });
wt({ path: P("cursor", "cursor modify calls"), rate: true });
wt({ path: P("cursor", "cursor next calls"), rate: true });
wt({ path: P("cursor", "cursor operation restarted"), rate: true });
wt({ path: P("cursor", "cursor prev calls"), rate: true });
wt({ path: P("cursor", "cursor remove calls"), rate: true });
wt({ path: P("cursor", "cursor reserve calls"), rate: true });
wt({ path: P("cursor", "cursor reset calls"), rate: true });
wt({ path: P("cursor", "cursor restarted searches"), rate: true });
wt({ path: P("cursor", "cursor search calls"), rate: true });
wt({ path: P("cursor", "cursor search near calls"), rate: true });
wt({ path: P("cursor", "cursor truncate calls"), rate: true });
wt({ path: P("cursor", "cursor update calls"), rate: true });
wt({ path: P("cursor", "cursor-insert key and value bytes inserted"), scale: "MiB" });
wt({ path: P("cursor", "cursor-remove key bytes removed"), scale: "MiB" });
wt({ path: P("cursor", "cursor-update value bytes updated"), scale: "MiB" });
wt({ path: P("cursor", "insert calls"), rate: true });
wt({ path: P("cursor", "next calls"), rate: true });
wt({ path: P("cursor", "open cursor count") });
wt({ path: P("cursor", "prev calls"), rate: true });
wt({ path: P("cursor", "remove calls"), rate: true });
wt({ path: P("cursor", "reset calls"), rate: true });
wt({ path: P("cursor", "search calls"), rate: true });
wt({ path: P("cursor", "search near calls"), rate: true });
wt({ path: P("cursor", "truncate calls"), rate: true });
wt({ path: P("cursor", "update calls"), rate: true });
wt({ path: P("cursor", "cursor bulk loaded cursor insert calls"), rate: true });
wt({ path: P("cursor", "cursor close calls that result in cache"), rate: true });
wt({ path: P("cursor", "cursor insert key and value bytes"), rate: true, scale: "MiB" });
wt({ path: P("cursor", "cursor modify key and value bytes affected"), rate: true, scale: "MiB" });
wt({ path: P("cursor", "cursor modify value bytes modified"), rate: true, scale: "MiB" });
wt({ path: P("cursor", "cursor remove key bytes removed"), rate: true, scale: "MiB" });
wt({ path: P("cursor", "cursor update key and value bytes"), rate: true, scale: "MiB" });
wt({ path: P("cursor", "cursor update value size change"), rate: true });
wt({ path: P("data-handle", "connection candidate referenced"), rate: true });
wt({ path: P("data-handle", "connection data handles currently active") });
wt({ path: P("data-handle", "connection data handles currently active"), name: "estimated data handle memory overhead", scale: 1024.0 / 30, units: "MiB" });
wt({ path: P("data-handle", "connection data handle size"), scale: "MiB" });
wt({ path: P("data-handle", "connection dhandles swept"), rate: true });
wt({ path: P("data-handle", "connection sweep candidate became referenced"), rate: true });
wt({ path: P("data-handle", "connection sweep dhandles closed"), rate: true });
wt({ path: P("data-handle", "connection sweep dhandles removed from hash list"), rate: true });
wt({ path: P("data-handle", "connection sweep time-of-death sets"), rate: true });
wt({ path: P("data-handle", "connection sweeps"), rate: true });
wt({ path: P("data-handle", "connection time-of-death sets"), rate: true });
wt({ path: P("data-handle", "session dhandles swept"), rate: true });
wt({ path: P("data-handle", "session sweep attempts"), rate: true });
wt({ path: P("lock", "checkpoint lock acquisitions"), rate: true });
wt({ path: P("lock", "checkpoint lock application thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "checkpoint lock internal thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "commit timestamp queue lock application thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "commit timestamp queue lock application thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "commit timestamp queue lock internal thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "commit timestamp queue lock internal thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "commit timestamp queue read lock acquisitions"), rate: true });
wt({ path: P("lock", "commit timestamp queue write lock acquisitions"), rate: true });
wt({ path: P("lock", "dhandle lock application thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "dhandle lock internal thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "dhandle lock application thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "dhandle lock internal thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "dhandle read lock acquisitions"), rate: true });
wt({ path: P("lock", "dhandle write lock acquisitions"), rate: true });
wt({ path: P("lock", "handle-list lock acquisitions"), rate: true });
wt({ path: P("lock", "handle-list lock application thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "handle-list lock eviction thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "handle-list lock internal thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "metadata lock acquisitions"), rate: true });
wt({ path: P("lock", "metadata lock application thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "metadata lock internal thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "read timestamp queue lock application thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "read timestamp queue lock internal thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "read timestamp queue lock application thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "read timestamp queue lock internal thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "read timestamp queue read lock acquisitions"), rate: true });
wt({ path: P("lock", "read timestamp queue write lock acquisitions"), rate: true });
wt({ path: P("lock", "schema lock acquisitions"), rate: true });
wt({ path: P("lock", "schema lock application thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "schema lock internal thread wait time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "table lock acquisitions"), rate: true });
wt({ path: P("lock", "table lock application thread time waiting for the table lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "table lock internal thread time waiting for the table lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "table read lock acquisitions"), rate: true });
wt({ path: P("lock", "table write lock acquisitions"), rate: true });
wt({ path: P("lock", "txn global lock application thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "txn global lock internal thread time waiting for the dhandle lock (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "txn global lock application thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "txn global lock internal thread time waiting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("lock", "txn global read lock acquisitions"), rate: true });
wt({ path: P("lock", "txn global write lock acquisitions"), rate: true });
wt({ path: P("log", "busy returns attempting to switch slots"), rate: true });
wt({ path: P("log", "consolidated slot closures"), rate: true });
wt({ path: P("log", "consolidated slot join active slot closed"), rate: true });
wt({ path: P("log", "consolidated slot join races"), rate: true });
wt({ path: P("log", "consolidated slot join transitions"), rate: true });
wt({ path: P("log", "consolidated slot joins"), rate: true });
wt({ path: P("log", "consolidated slot transitions unable to find free slot"), rate: true });
wt({ path: P("log", "consolidated slot unbuffered writes"), rate: true });
wt({ path: P("log", "failed to find a slot large enough for record"), rate: true });
wt({ path: P("log", "force archive time sleeping (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("log", "force checkpoint calls slept"), rate: true });
wt({ path: P("log", "log buffer size increases"), rate: true });
wt({ path: P("log", "log bytes of payload data"), scale: "MiB", rate: true });
wt({ path: P("log", "log bytes written"), scale: "MiB", rate: true });
wt({ path: P("log", "log files manually zero-filled"), rate: true });
wt({ path: P("log", "log flush operations"), rate: true });
wt({ path: P("log", "log force write operations skipped"), rate: true });
wt({ path: P("log", "log force write operations"), rate: true });
wt({ path: P("log", "log read operations"), rate: true });
wt({ path: P("log", "log records compressed"), rate: true });
wt({ path: P("log", "log records not compressed"), rate: true });
wt({ path: P("log", "log records too small to compress"), rate: true });
wt({ path: P("log", "log release advances write LSN"), rate: true });
wt({ path: P("log", "log scan operations"), rate: true });
wt({ path: P("log", "log scan records requiring two reads"), rate: true });
wt({ path: P("log", "log server thread advances write LSN"), rate: true });
wt({ path: P("log", "log server thread write LSN walk skipped"), rate: true });
wt({ path: P("log", "log sync operations"), rate: true });
wt({ path: P("log", "log sync time duration (usecs)"), rate: true, scale: 1000, units: "ms" });
wt({ path: P("log", "log sync_dir operations"), rate: true });
wt({ path: P("log", "log sync_dir time duration (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("log", "log write operations"), rate: true });
wt({ path: P("log", "logging bytes consolidated"), scale: "MiB", rate: true });
wt({ path: P("log", "maximum log file size"), scale: "MiB" });
wt({ path: P("log", "number of pre-allocated log files to create") });
wt({ path: P("log", "pre-allocated log files not ready and missed"), rate: true });
wt({ path: P("log", "pre-allocated log files prepared"), rate: true });
wt({ path: P("log", "pre-allocated log files used"), rate: true });
wt({ path: P("log", "record size exceeded maximum"), rate: true });
wt({ path: P("log", "records processed by log scan"), rate: true });
wt({ path: P("log", "slot close lost race"), rate: true });
wt({ path: P("log", "slot close unbuffered waits"), rate: true });
wt({ path: P("log", "slot closures"), rate: true });
wt({ path: P("log", "slot join atomic update races"), rate: true });
wt({ path: P("log", "slot join calls atomic updates raced"), rate: true });
wt({ path: P("log", "slot join calls did not yield"), rate: true });
wt({ path: P("log", "slot join calls found active slot closed"), rate: true });
wt({ path: P("log", "slot join calls slept"), rate: true });
wt({ path: P("log", "slot join calls yielded"), rate: true });
wt({ path: P("log", "slot join found active slot closed"), rate: true });
wt({ path: P("log", "slot joins yield time (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("log", "slot transitions unable to find free slot"), rate: true });
wt({ path: P("log", "slot unbuffered writes"), rate: true });
wt({ path: P("log", "slots selected for switching that were unavailable"), rate: true });
wt({ path: P("log", "total in-memory size of compressed records"), scale: "MiB", rate: true });
wt({ path: P("log", "total log buffer size"), scale: "MiB" });
wt({ path: P("log", "total size of compressed records"), scale: "MiB", rate: true });
wt({ path: P("log", "written slots coalesced"), rate: true });
wt({ path: P("log", "yields waiting for previous log file close"), rate: true });
wt({ path: P("perf", "file system read latency histogram (bucket 1) - 10-49ms"), rate: true, chart: "fs_lat_1" });
wt({ path: P("perf", "file system read latency histogram (bucket 2) - 50-99ms"), rate: true, chart: "fs_lat_2" });
wt({ path: P("perf", "file system read latency histogram (bucket 3) - 100-249ms"), rate: true, chart: "fs_lat_3" });
wt({ path: P("perf", "file system read latency histogram (bucket 4) - 250-499ms"), rate: true, chart: "fs_lat_4" });
wt({ path: P("perf", "file system read latency histogram (bucket 5) - 500-999ms"), rate: true, chart: "fs_lat_5" });
wt({ path: P("perf", "file system read latency histogram (bucket 6) - 1000ms+"), rate: true, chart: "fs_lat_6" });
wt({ path: P("perf", "file system write latency histogram (bucket 1) - 10-49ms"), rate: true, chart: "fs_lat_1" });
wt({ path: P("perf", "file system write latency histogram (bucket 2) - 50-99ms"), rate: true, chart: "fs_lat_2" });
wt({ path: P("perf", "file system write latency histogram (bucket 3) - 100-249ms"), rate: true, chart: "fs_lat_3" });
wt({ path: P("perf", "file system write latency histogram (bucket 4) - 250-499ms"), rate: true, chart: "fs_lat_4" });
wt({ path: P("perf", "file system write latency histogram (bucket 5) - 500-999ms"), rate: true, chart: "fs_lat_5" });
wt({ path: P("perf", "file system write latency histogram (bucket 6) - 1000ms+"), rate: true, chart: "fs_lat_6" });
wt({ path: P("perf", "operation read latency histogram (bucket 1) - 100-249us"), rate: true, chart: "op_lat_1" });
wt({ path: P("perf", "operation read latency histogram (bucket 2) - 250-499us"), rate: true, chart: "op_lat_2" });
wt({ path: P("perf", "operation read latency histogram (bucket 3) - 500-999us"), rate: true, chart: "op_lat_3" });
wt({ path: P("perf", "operation read latency histogram (bucket 4) - 1000-9999us"), rate: true, chart: "op_lat_4" });
wt({ path: P("perf", "operation read latency histogram (bucket 5) - 10000us+"), rate: true, chart: "op_lat_5" });
wt({ path: P("perf", "operation write latency histogram (bucket 1) - 100-249us"), rate: true, chart: "op_lat_1" });
wt({ path: P("perf", "operation write latency histogram (bucket 2) - 250-499us"), rate: true, chart: "op_lat_2" });
wt({ path: P("perf", "operation write latency histogram (bucket 3) - 500-999us"), rate: true, chart: "op_lat_3" });
wt({ path: P("perf", "operation write latency histogram (bucket 4) - 1000-9999us"), rate: true, chart: "op_lat_4" });
wt({ path: P("perf", "operation write latency histogram (bucket 5) - 10000us+"), rate: true, chart: "op_lat_5" });
wt({ path: P("reconciliation", "dictionary matches"), rate: true });
wt({ path: P("reconciliation", "fast-path pages deleted"), rate: true });
wt({ path: P("reconciliation", "internal page key bytes discarded using suffix compression"), scale: "MiB" });
wt({ path: P("reconciliation", "internal page multi-block writes"), rate: true });
wt({ path: P("reconciliation", "internal-page overflow keys"), rate: true });
wt({ path: P("reconciliation", "leaf page key bytes discarded using prefix compression"), scale: "MiB" });
wt({ path: P("reconciliation", "leaf page multi-block writes"), rate: true });
wt({ path: P("reconciliation", "leaf-page overflow keys"), rate: true });
wt({ path: P("reconciliation", "maximum blocks required for a page") });
wt({ path: P("reconciliation", "overflow values written"), rate: true });
wt({ path: P("reconciliation", "page checksum matches"), rate: true });
wt({ path: P("reconciliation", "page reconciliation calls for eviction"), rate: true });
wt({ path: P("reconciliation", "page reconciliation calls"), rate: true });
wt({ path: P("reconciliation", "pages deleted"), rate: true });
wt({ path: P("reconciliation", "split bytes currently awaiting free"), scale: "MiB" });
wt({ path: P("reconciliation", "split objects currently awaiting free") });
wt({ path: P("session", "object compaction") });
wt({ path: P("session", "open cursor count") });
wt({ path: P("session", "open session count") });
wt({ path: P("session", "session query timestamp calls"), rate: true });
wt({ path: P("session", "table alter successful calls"), rate: true });
wt({ path: P("session", "table alter failed calls"), rate: true });
wt({ path: P("session", "table alter unchanged and skipped"), rate: true });
wt({ path: P("session", "table compact successful calls"), rate: true });
wt({ path: P("session", "table compact failed calls"), rate: true });
wt({ path: P("session", "table create successful calls"), rate: true });
wt({ path: P("session", "table create failed calls"), rate: true });
wt({ path: P("session", "table drop successful calls"), rate: true });
wt({ path: P("session", "table drop failed calls"), rate: true });
wt({ path: P("session", "table import failed calls"), rate: true });
wt({ path: P("session", "table import successful calls"), rate: true });
wt({ path: P("session", "table rebalance successful calls"), rate: true });
wt({ path: P("session", "table rebalance failed calls"), rate: true });
wt({ path: P("session", "table rename successful calls"), rate: true });
wt({ path: P("session", "table rename failed calls"), rate: true });
wt({ path: P("session", "table salvage successful calls"), rate: true });
wt({ path: P("session", "table salvage failed calls"), rate: true });
wt({ path: P("session", "table truncate successful calls"), rate: true });
wt({ path: P("session", "table truncate failed calls"), rate: true });
wt({ path: P("session", "table verify successful calls"), rate: true });
wt({ path: P("session", "table verify failed calls"), rate: true });
wt({ path: P("snapshot-window-settings", "cache pressure percentage threshold") });
wt({ path: P("snapshot-window-settings", "current cache pressure percentage") });
wt({ path: P("snapshot-window-settings", "current available snapshots window size in seconds") });
wt({ path: P("snapshot-window-settings", "max target available snapshots window size in seconds") });
wt({ path: P("snapshot-window-settings", "target available snapshots window size in seconds") });
wt({ path: P("snapshot-window-settings", "total number of SnapshotTooOld errors"), rate: true });
wt({ path: P("snapshot-window-settings", "total number of cache overflow disk writes"), rate: true });
wt({ path: P("thread-state", "active filesystem fsync calls") });
wt({ path: P("thread-state", "active filesystem read calls") });
wt({ path: P("thread-state", "active filesystem write calls") });
wt({ path: P("thread-yield", "application thread time evicting (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("thread-yield", "application thread time waiting for cache (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("thread-yield", "connection close blocked waiting for transaction state stabilization"), rate: true });
wt({ path: P("thread-yield", "connection close blocked waiting for transaction state stabilization"), rate: true });
wt({ path: P("thread-yield", "connection close yielded for lsm manager shutdown"), rate: true });
wt({ path: P("thread-yield", "connection close yielded for lsm manager shutdown"), rate: true });
wt({ path: P("thread-yield", "data handle lock yielded"), rate: true });
wt({ path: P("thread-yield", "data handle lock yielded"), rate: true });
wt({ path: P("thread-yield", "get reference for page index and slot time sleeping (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("thread-yield", "get reference for page index and slot time sleeping (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("thread-yield", "log server sync yielded for log write"), rate: true });
wt({ path: P("thread-yield", "log server sync yielded for log write"), rate: true });
wt({ path: P("thread-yield", "page access yielded due to prepare state change"), rate: true });
wt({ path: P("thread-yield", "page acquire busy blocked"), rate: true });
wt({ path: P("thread-yield", "page acquire eviction blocked"), rate: true });
wt({ path: P("thread-yield", "page acquire locked blocked"), rate: true });
wt({ path: P("thread-yield", "page acquire read blocked"), rate: true });
wt({ path: P("thread-yield", "page acquire time sleeping (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("thread-yield", "page delete rollback time sleeping for state change (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("thread-yield", "page delete rollback time sleeping for state change (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("thread-yield", "page delete rollback yielded for instantiation"), rate: true });
wt({ path: P("thread-yield", "page reconciliation yielded due to child modification"), rate: true });
wt({ path: P("thread-yield", "page reconciliation yielded due to child modification"), rate: true });
wt({ path: P("thread-yield", "reference for page index and slot yielded"), rate: true });
wt({ path: P("thread-yield", "tree descend one level yielded for split page index update"), rate: true });
wt({ path: P("thread-yield", "tree descend one level yielded for split page index update"), rate: true });
wt({ path: P("transaction", "commit timestamp queue entries walked"), rate: true });
wt({ path: P("transaction", "commit timestamp queue inserts to head"), rate: true });
wt({ path: P("transaction", "number of named snapshots created"), rate: true });
wt({ path: P("transaction", "number of named snapshots dropped"), rate: true });
wt({ path: P("transaction", "prepared transactions committed"), rate: true });
wt({ path: P("transaction", "prepared transactions currently active") });
wt({ path: P("transaction", "prepared transactions rolled back"), rate: true });
wt({ path: P("transaction", "prepared transactions"), rate: true });
wt({ path: P("transaction", "read timestamp queue entries walked"), rate: true });
wt({ path: P("transaction", "rollback to stable calls"), rate: true });
wt({ path: P("transaction", "rollback to stable updates aborted"), rate: true });
wt({ path: P("transaction", "rollback to stable updates removed from cache overflow"), rate: true });
wt({ path: P("transaction", "transaction begins"), rate: true });
wt({ path: P("transaction", "transaction checkpoint currently running") });
wt({ path: P("transaction", "transaction checkpoint generation") });
wt({ path: P("transaction", "transaction checkpoint max time (msecs)") });
wt({ path: P("transaction", "transaction checkpoint min time (msecs)") });
wt({ path: P("transaction", "transaction checkpoint most recent time (msecs)") });
wt({ path: P("transaction", "transaction checkpoint scrub dirty target") });
wt({ path: P("transaction", "transaction checkpoint scrub time (msecs)") });
wt({ path: P("transaction", "transaction checkpoint total time (msecs)"), rate: "delta" });
wt({ path: P("transaction", "transaction checkpoints"), rate: "delta" });
wt({ path: P("transaction", "transaction checkpoints skipped because database was clean"), rate: "delta" });
wt({ path: P("transaction", "transaction failures due to cache overflow"), rate: true });
wt({ path: P("transaction", "transaction fsync calls for checkpoint after allocating the transaction ID"), rate: "delta" });
wt({ path: P("transaction", "transaction fsync calls for checkpoint before allocating the transaction ID"), rate: "delta" });
wt({ path: P("transaction", "transaction fsync duration for checkpoint after allocating the transaction ID (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("transaction", "transaction fsync duration for checkpoint before allocating the transaction ID (usecs)"), rate: true, scale: 1000000, units: "threads" });
wt({ path: P("transaction", "transaction read timestamp of the oldest active reader"), ignore: true });
wt({ path: P("transaction", "transaction range of IDs currently pinned by a checkpoint") });
wt({ path: P("transaction", "transaction range of IDs currently pinned by named snapshots") });
wt({ path: P("transaction", "transaction range of IDs currently pinned") });
wt({ path: P("transaction", "transaction range of timestamps pinned by a checkpoint"),
    name: "transaction range of timestamps pinned by a checkpoint (filtered)",
    yDisplayMax: Math.pow(2, 30), scale: Math.pow(2, 32), autoScale: "time" });
wt({ path: P("transaction", "transaction range of timestamps pinned by the oldest active read timestamp"), scale: Math.pow(2, 32), autoScale: "time" });
wt({ path: P("transaction", "commit timestamp queue insert to empty"), rate: true, chart: "commit_timestamp_queue" });
wt({ path: P("transaction", "commit timestamp queue inserts to tail"), rate: true, chart: "commit_timestamp_queue" });
wt({ path: P("transaction", "commit timestamp queue inserts total"), rate: true, chart: "commit_timestamp_queue" });
wt({ path: P("transaction", "commit timestamp queue length") });
wt({ path: P("transaction", "Number of prepared updates"), rate: true });
wt({ path: P("transaction", "Number of prepared updates added to cache overflow"), rate: true });
wt({ path: P("transaction", "Number of prepared updates resolved"), rate: true });
wt({ path: P("transaction", "read timestamp queue insert to empty"), rate: true, chart: "read_timestamp_queue" });
wt({ path: P("transaction", "read timestamp queue inserts to head"), rate: true, chart: "read_timestamp_queue" });
wt({ path: P("transaction", "read timestamp queue inserts total"), rate: true, chart: "read_timestamp_queue" });
wt({ path: P("transaction", "read timestamp queue length") });
wt({ path: P("transaction", "set timestamp commit calls"), rate: true, chart: "set_timestamp_calls" });
wt({ path: P("transaction", "set timestamp oldest calls"), rate: true, chart: "set_timestamp_calls" });
wt({ path: P("transaction", "set timestamp stable calls"), rate: true, chart: "set_timestamp_calls" });
wt({ path: P("transaction", "set timestamp commit updates"), rate: true, chart: "set_timestamp_updates" });
wt({ path: P("transaction", "set timestamp oldest updates"), rate: true, chart: "set_timestamp_updates" });
wt({ path: P("transaction", "set timestamp stable updates"), rate: true, chart: "set_timestamp_updates" });
wt({ path: P("transaction", "query timestamp calls"), rate: true });
wt({ path: P("transaction", "set timestamp calls"), rate: true });
wt({ path: P("transaction", "transaction range of timestamps currently pinned"),
    name: "transaction range of timestamps currently pinned (filtered)",
    yDisplayMax: Math.pow(2, 30), scale: Math.pow(2, 32), autoScale: "time" });
wt({ path: P("transaction", "transaction range of timestamps pinned by the oldest timestamp"),
    name: "transaction range of timestamps pinned by the oldest timestamp (filtered)",
    yDisplayMax: Math.pow(2, 30), scale: Math.pow(2, 32), autoScale: "time" });
wt({ path: P("transaction", "transaction range of timestamps currently pinned"),
    scale: Math.pow(2, 32), autoScale: "time" });
wt({ path: P("transaction", "transaction range of timestamps pinned by the oldest timestamp"),
    scale: Math.pow(2, 32), autoScale: "time" });
wt({ path: P("transaction", "transaction sync calls"), rate: true });
wt({ path: P("transaction", "transactions commit timestamp queue inserts to head"), rate: true });
wt({ path: P("transaction", "transactions commit timestamp queue inserts total"), rate: true });
wt({ path: P("transaction", "transactions commit timestamp queue length") });
wt({ path: P("transaction", "transactions committed"), rate: true });
wt({ path: P("transaction", "transactions read timestamp queue inserts to head"), rate: true });
wt({ path: P("transaction", "transactions read timestamp queue inserts total"), rate: true });
wt({ path: P("transaction", "transactions read timestamp queue length") });
wt({ path: P("transaction", "transactions rolled back"), rate: true });
wt({ path: P("transaction", "update conflicts"), rate: true });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("MMAPv1");
//
// dur resets stats every so many seconds
// should get this from dt, but that is sometimes 0...
var durSecs = 3;
ss({ path: P("backgroundFlushing", "average_ms") });
ss({ path: P("backgroundFlushing", "flushes"), rate: true });
ss({ path: P("backgroundFlushing", "last_finished"), ignore: true }); // is an absolute time
ss({ path: P("backgroundFlushing", "last_ms") });
ss({ path: P("backgroundFlushing", "total_ms"), rate: true });
ss({ path: P("dur", "commits"), scale: durSecs, units: "/s" });
ss({ path: P("dur", "commitsInWriteLock"), scale: durSecs, units: "/s" });
ss({ path: P("dur", "compression") });
ss({ path: P("dur", "earlyCommits") });
ss({ path: P("dur", "journaledMB"), scale: durSecs, units: "MB/s" });
ss({ path: P("dur", "writeToDataFilesMB"), scale: durSecs, units: "MB/s" });
ss({ path: P("dur", "timeMs", "commits"), scale: durSecs * 1000, units: "threads" });
ss({ path: P("dur", "timeMs", "commitsInWriteLock"), scale: durSecs * 1000, units: "threads" });
ss({ path: P("dur", "timeMs", "dt"), ignore: true });
ss({ path: P("dur", "timeMs", "prepLogBuffer"), scale: durSecs * 1000, units: "threads" });
ss({ path: P("dur", "timeMs", "remapPrivateView"), scale: durSecs * 1000, units: "threads" });
ss({ path: P("dur", "timeMs", "writeToDataFiles"), scale: durSecs * 1000, units: "threads" });
ss({ path: P("dur", "timeMs", "writeToJournal"), scale: durSecs * 1000, units: "threads" });
ss({ path: P("metrics", "storage", "freelist", "search", "bucketExhausted"), rate: true });
ss({ path: P("metrics", "storage", "freelist", "search", "requests"), rate: true });
ss({ path: P("metrics", "storage", "freelist", "search", "scanned"), rate: true });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Oplog");
//
cs({ path: P("count"), autoScale: "decimal" });
cs({ path: P("nindexes") });
cs({ path: P("size"), scale: "MiB", autoScale: "binary" });
cs({ path: P("maxSize"), scale: "MiB", autoScale: "binary" });
cs({ path: P("storageSize"), scale: "MiB", autoScale: "binary" });
cs({ path: P("totalIndexSize"), scale: "MiB", autoScale: "binary" });
cs({ path: P("avgObjSize") });
cs({ path: P("sleepCount"), rate: true });
cs({ path: P("sleepMS"), rate: true });
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Oplog WiredTiger");
//
cs_wt({ path: P("LSM", "bloom filter false positives"), rate: true });
cs_wt({ path: P("LSM", "bloom filter hits"), rate: true });
cs_wt({ path: P("LSM", "bloom filter misses"), rate: true });
cs_wt({ path: P("LSM", "bloom filter pages evicted from cache"), rate: true });
cs_wt({ path: P("LSM", "bloom filter pages read into cache"), rate: true });
cs_wt({ path: P("LSM", "bloom filters in the LSM tree") });
cs_wt({ path: P("LSM", "chunks in the LSM tree") });
cs_wt({ path: P("LSM", "highest merge generation in the LSM tree") });
cs_wt({ path: P("LSM", "queries that could have benefited from a Bloom filter that did not exist"), rate: true });
cs_wt({ path: P("LSM", "sleep for LSM checkpoint throttle"), rate: true });
cs_wt({ path: P("LSM", "sleep for LSM merge throttle"), rate: true });
cs_wt({ path: P("LSM", "total size of bloom filters"), scale: "MiB" });
cs_wt({ path: P("block-manager", "allocations requiring file extension"), rate: true });
cs_wt({ path: P("block-manager", "blocks allocated"), rate: true });
cs_wt({ path: P("block-manager", "blocks freed"), rate: true });
cs_wt({ path: P("block-manager", "checkpoint size"), scale: "MiB" });
cs_wt({ path: P("block-manager", "file bytes available for reuse"), scale: "MiB" });
cs_wt({ path: P("block-manager", "file size in bytes"), scale: "MiB" });
cs_wt({ path: P("block-manager", "file allocation unit size"), ignore: true });
cs_wt({ path: P("block-manager", "file magic number"), ignore: true });
cs_wt({ path: P("block-manager", "file major version number"), ignore: true });
cs_wt({ path: P("btree", "btree checkpoint generation") });
cs_wt({ path: P("btree", "column-store fixed-size leaf pages") });
cs_wt({ path: P("btree", "column-store internal pages") });
cs_wt({ path: P("btree", "column-store variable-size deleted values") });
cs_wt({ path: P("btree", "column-store variable-size leaf pages") });
cs_wt({ path: P("btree", "column-store variable-size RLE encoded values") });
cs_wt({ path: P("btree", "fixed-record size"), scale: "KiB" });
cs_wt({ path: P("btree", "maximum internal page key size"), scale: "KiB" });
cs_wt({ path: P("btree", "maximum internal page size"), scale: "KiB" });
cs_wt({ path: P("btree", "maximum leaf page key size"), scale: "KiB" });
cs_wt({ path: P("btree", "maximum leaf page size"), scale: "KiB" });
cs_wt({ path: P("btree", "maximum leaf page value size"), scale: "KiB" });
cs_wt({ path: P("btree", "maximum tree depth") });
cs_wt({ path: P("btree", "number of key/value pairs") });
cs_wt({ path: P("btree", "overflow pages") });
cs_wt({ path: P("btree", "pages rewritten by compaction"), rate: true });
cs_wt({ path: P("btree", "row-store empty values") });
cs_wt({ path: P("btree", "row-store internal pages") });
cs_wt({ path: P("btree", "row-store leaf pages") });
cs_wt({ path: P("cache", "bytes currently in the cache"), scale: "MiB" });
cs_wt({ path: P("cache", "bytes dirty in the cache cumulative"), rate: true, scale: "MiB" });
cs_wt({ path: P("cache", "bytes read into cache"), rate: true, scale: "MiB" });
cs_wt({ path: P("cache", "bytes written from cache"), rate: true, scale: "MiB" });
cs_wt({ path: P("cache", "checkpoint blocked page eviction"), rate: true });
cs_wt({ path: P("cache", "data source pages selected for eviction unable to be evicted"), rate: true });
cs_wt({ path: P("cache", "eviction walk passes of a file"), rate: true });
cs_wt({ path: P("cache", "eviction walk target pages histogram - 0-9"), rate: true });
cs_wt({ path: P("cache", "eviction walk target pages histogram - 10-31"), rate: true });
cs_wt({ path: P("cache", "eviction walk target pages histogram - 128 and higher"), rate: true });
cs_wt({ path: P("cache", "eviction walk target pages histogram - 32-63"), rate: true });
cs_wt({ path: P("cache", "eviction walk target pages histogram - 64-128"), rate: true });
cs_wt({ path: P("cache", "eviction walks abandoned"), rate: true });
cs_wt({ path: P("cache", "eviction walks gave up because they restarted their walk twice"), rate: true });
cs_wt({ path: P("cache", "eviction walks gave up because they saw too many pages and found no candidates"), rate: true });
cs_wt({ path: P("cache", "eviction walks gave up because they saw too many pages and found too few candidates"), rate: true });
cs_wt({ path: P("cache", "eviction walks reached end of tree"), rate: true });
cs_wt({ path: P("cache", "eviction walks started from root of tree"), rate: true });
cs_wt({ path: P("cache", "eviction walks started from saved location in tree"), rate: true });
cs_wt({ path: P("cache", "hazard pointer blocked page eviction"), rate: true });
cs_wt({ path: P("cache", "in-memory page passed criteria to be split"), rate: true });
cs_wt({ path: P("cache", "in-memory page splits"), rate: true });
cs_wt({ path: P("cache", "internal pages evicted"), rate: true });
cs_wt({ path: P("cache", "internal pages split during eviction"), rate: true });
cs_wt({ path: P("cache", "leaf pages split during eviction"), rate: true });
cs_wt({ path: P("cache", "modified pages evicted"), rate: true });
cs_wt({ path: P("cache", "overflow pages read into cache"), rate: true });
cs_wt({ path: P("cache", "overflow values cached in memory") });
cs_wt({ path: P("cache", "page split during eviction deepened the tree"), rate: true });
cs_wt({ path: P("cache", "page written requiring cache overflow records"), rate: true });
cs_wt({ path: P("cache", "pages read into cache after truncate"), rate: true });
cs_wt({ path: P("cache", "pages read into cache after truncate in prepare state"), rate: true });
cs_wt({ path: P("cache", "pages read into cache requiring cache overflow entries"), rate: true });
cs_wt({ path: P("cache", "pages read into cache"), rate: true });
cs_wt({ path: P("cache", "pages seen by eviction walk"), rate: true });
cs_wt({ path: P("cache", "pages split during eviction"), rate: true });
cs_wt({ path: P("cache", "pages written from cache"), rate: true });
cs_wt({ path: P("cache", "unmodified pages evicted"), rate: true });
cs_wt({ path: P("cache", "pages requested from the cache"), rate: true });
cs_wt({ path: P("cache", "pages written requiring in-memory restoration"), rate: true });
cs_wt({ path: P("cache", "tracked dirty bytes in the cache"), scale: "MiB" });
cs_wt({ path: P("cache_walk", "Average difference between current eviction generation when the page was last considered") });
cs_wt({ path: P("cache_walk", "Average on-disk page image size seen"), scale: "KiB" });
cs_wt({ path: P("cache_walk", "Average time in cache for pages that have been visited by the eviction server") });
cs_wt({ path: P("cache_walk", "Average time in cache for pages that have not been visited by the eviction server") });
cs_wt({ path: P("cache_walk", "Clean pages currently in cache") });
cs_wt({ path: P("cache_walk", "Current eviction generation") });
cs_wt({ path: P("cache_walk", "Dirty pages currently in cache") });
cs_wt({ path: P("cache_walk", "Entries in the root page") });
cs_wt({ path: P("cache_walk", "Internal pages currently in cache") });
cs_wt({ path: P("cache_walk", "Leaf pages currently in cache") });
cs_wt({ path: P("cache_walk", "Maximum difference between current eviction generation when the page was last considered") });
cs_wt({ path: P("cache_walk", "Maximum page size seen"), scale: "KiB" });
cs_wt({ path: P("cache_walk", "Minimum on-disk page image size seen"), scale: "KiB" });
cs_wt({ path: P("cache_walk", "Number of pages never visited by eviction server") });
cs_wt({ path: P("cache_walk", "On-disk page image sizes smaller than a single allocation unit") });
cs_wt({ path: P("cache_walk", "Pages created in memory and never written") });
cs_wt({ path: P("cache_walk", "Pages currently queued for eviction") });
cs_wt({ path: P("cache_walk", "Pages that could not be queued for eviction") });
cs_wt({ path: P("cache_walk", "Refs skipped during cache traversal") });
cs_wt({ path: P("cache_walk", "Size of the root page"), scale: "KiB" });
cs_wt({ path: P("cache_walk", "Total number of pages currently in cache") });
cs_wt({ path: P("cursor", "cursor operation restarted"), rate: true });
cs_wt({ path: P("cursor", "modify calls"), rate: true });
cs_wt({ path: P("cursor", "reserve calls"), rate: true });
cs_wt({ path: P("cursor", "restarted searches"), rate: true });
cs_wt({ path: P("cursor", "truncate calls"), rate: true });
cs_wt({ path: P("compression", "compressed pages read"), rate: true });
cs_wt({ path: P("compression", "compressed pages written"), rate: true });
cs_wt({ path: P("compression", "compressed page maximum internal page size prior to compression"), scale: "KiB" });
cs_wt({ path: P("compression", "compressed page maximum leaf page size prior to compression"), scale: "KiB" }); // Included for when/if the added space in the metric is removed
cs_wt({ path: P("compression", "compressed page maximum leaf page size prior to compression "), scale: "KiB" });
cs_wt({ path: P("compression", "page written failed to compress"), rate: true });
cs_wt({ path: P("compression", "page written was too small to compress"), rate: true });
cs_wt({ path: P("compression", "raw compression call failed, additional data available"), rate: true });
cs_wt({ path: P("compression", "raw compression call failed, no additional data available"), rate: true });
cs_wt({ path: P("compression", "raw compression call succeeded"), rate: true });
cs_wt({ path: P("cursor", "bulk-loaded cursor-insert calls"), rate: true });
cs_wt({ path: P("cursor", "bulk-loaded cursor insert calls"), rate: true });
cs_wt({ path: P("cursor", "bulk loaded cursor insert calls"), rate: true });
cs_wt({ path: P("cursor", "cache cursors reuse count"), rate: true });
cs_wt({ path: P("cursor", "close calls that result in cache"), rate: true });
cs_wt({ path: P("cursor", "create calls"), rate: true });
cs_wt({ path: P("cursor", "cursor-insert key and value bytes inserted"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "cursor-remove key bytes removed"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "cursor-update value bytes updated"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "cursors cached on close"), rate: true });
cs_wt({ path: P("cursor", "cursors reused from cache"), rate: true });
cs_wt({ path: P("cursor", "insert key and value bytes"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "insert calls"), rate: true });
cs_wt({ path: P("cursor", "next calls"), rate: true });
cs_wt({ path: P("cursor", "prev calls"), rate: true });
cs_wt({ path: P("cursor", "remove calls"), rate: true });
cs_wt({ path: P("cursor", "reset calls"), rate: true });
cs_wt({ path: P("cursor", "search calls"), rate: true });
cs_wt({ path: P("cursor", "search near calls"), rate: true });
cs_wt({ path: P("cursor", "update calls"), rate: true });
cs_wt({ path: P("cursor", "modify"), rate: true });
cs_wt({ path: P("cursor", "modify key and value bytes affected"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "modify value bytes modified"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "open cursor count") });
cs_wt({ path: P("cursor", "operation restarted"), rate: true });
cs_wt({ path: P("cursor", "remove key bytes removed"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "update key and value bytes"), rate: true, scale: "MiB" });
cs_wt({ path: P("cursor", "update value size change"), rate: true });
cs_wt({ path: P("reconciliation", "dictionary matches"), rate: true });
cs_wt({ path: P("reconciliation", "fast-path pages deleted"), rate: true });
cs_wt({ path: P("reconciliation", "internal page key bytes discarded using suffix compression"), scale: "MiB", rate: true });
cs_wt({ path: P("reconciliation", "internal page multi-block writes"), rate: true });
cs_wt({ path: P("reconciliation", "internal-page overflow keys"), rate: true });
cs_wt({ path: P("reconciliation", "leaf page key bytes discarded using prefix compression"), scale: "MiB", rate: true });
cs_wt({ path: P("reconciliation", "leaf page multi-block writes"), rate: true });
cs_wt({ path: P("reconciliation", "leaf-page overflow keys"), rate: true });
cs_wt({ path: P("reconciliation", "maximum blocks required for a page") });
cs_wt({ path: P("reconciliation", "overflow values written"), rate: true });
cs_wt({ path: P("reconciliation", "page checksum matches"), rate: true });
cs_wt({ path: P("reconciliation", "page reconciliation calls"), rate: true });
cs_wt({ path: P("reconciliation", "page reconciliation calls for eviction"), rate: true });
cs_wt({ path: P("reconciliation", "pages deleted"), rate: true });
cs_wt({ path: P("session", "cached cursor count") });
cs_wt({ path: P("session", "object compaction"), rate: true });
cs_wt({ path: P("session", "open cursor count") });
cs_wt({ path: P("transaction", "update conflicts"), rate: true });
try {
    // these must be emitted at the very end so that they are in their own section
    for (var csDescs_1 = __values(csDescs), csDescs_1_1 = csDescs_1.next(); !csDescs_1_1.done; csDescs_1_1 = csDescs_1.next()) {
        var csDesc = csDescs_1_1.value;
        addDescriptor(csDesc);
    }
}
catch (e_3_1) { e_3 = { error: e_3_1 }; }
finally {
    try {
        if (csDescs_1_1 && !csDescs_1_1.done && (_c = csDescs_1.return)) _c.call(csDescs_1);
    }
    finally { if (e_3) throw e_3.error; }
}
///////////////////////////////////////////////////////////////////////////////
//
SECTION("Cloud alerts: resources used");
//
function cloud(metric, name) {
    addDescriptor({ path: P("csv", metric), name: name, timebasePath: P("csv", "start"),
        autoScale: "auto" });
    addDescriptor({ path: P("csv", metric + " filtered"), name: name + " filtered",
        timebasePath: P("csv", "start"), autoScale: "auto" });
    addDescriptor({ path: P("csv", metric + " filtered sigma"), name: name + " filtered sigma",
        timebasePath: P("csv", "start"), alerter: gyrAlerter(3, 6), yMax: 8 });
    addDescriptor({ path: P("csv", metric + " binned"), name: name + " binned",
        timebasePath: P("csv", "start"), autoScale: "auto" });
    addDescriptor({ path: P("csv", metric + " binned sigma"), name: name + " binned sigma",
        timebasePath: P("csv", "start"), alerter: gyrAlerter(3, 6), yMax: 8 });
}
addDescriptor({ path: P("csv", "event"), timebasePath: P("csv", "start") });
cloud("SYSTEM_NORMALIZED_CPU_USER", "cpu user");
cloud("SYSTEM_NORMALIZED_CPU_KERNEL", "cpu kernel");
cloud("SYSTEM_NORMALIZED_CPU_IOWAIT", "cpu iowait");
cloud("MEMORY_VIRTUAL", "memory virtual");
cloud("MEMORY_MAPPED", "memory mapped");
cloud("MEMORY_RESIDENT", "memory resident");
cloud("EXTRA_INFO_PAGE_FAULTS", "page faults");
cloud("DB_DATA_SIZE_TOTAL", "db size");
cloud("DB_STORAGE_TOTAL", "db storage");
cloud("GLOBAL_LOCK_CURRENT_QUEUE_READERS", "queued readers");
cloud("GLOBAL_LOCK_CURRENT_QUEUE_WRITERS", "queued writers");
cloud("GLOBAL_LOCK_CURRENT_QUEUE_TOTAL", "queued total");
cloud("CONNECTIONS", "connections open");
cloud("CURSORS_TOTAL_OPEN", "cursors open");
cloud("CURSORS_TOTAL_TIMED_OUT", "cursors timed out");
cloud("ASSERT_WARNING", "asserts warning");
cloud("ASSERT_USER", "asserts user");
cloud("ASSERT_MSG", "asserts message");
cloud("ASSERT_REGULAR", "asserts regular");
SECTION("Cloud alerts: load serviced");
cloud("OPCOUNTER_QUERY", "opcounter query");
cloud("OPCOUNTER_INSERT", "opcounter insert");
cloud("OPCOUNTER_UPDATE", "opcounter update");
cloud("OPCOUNTER_DELETE", "opcounter delete");
cloud("OPCOUNTER_CMD", "opcounter command");
cloud("OPCOUNTER_GETMORE", "opcounter getmore");
cloud("OPCOUNTER_REPL_INSERT", "opcounter repl insert");
cloud("OPCOUNTER_REPL_UPDATE", "opcounter repl update");
cloud("OPCOUNTER_REPL_DELETE", "opcounter repl delete");
cloud("OPCOUNTER_REPL_CMD", "opcounter repl command");
cloud("DOCUMENT_METRICS_RETURNED", "documents returned");
cloud("DOCUMENT_METRICS_INSERTED", "documents inserted");
cloud("DOCUMENT_METRICS_UPDATED", "documents updated");
cloud("DOCUMENT_METRICS_DELETED", "documents deleted");
cloud("NETWORK_NUM_REQUESTS", "network requests");
cloud("NETWORK_BYTES_IN", "network bytes in");
cloud("NETWORK_BYTES_OUT", "network bytes out");
///////////////////////////////////////////////////////////////////////////////
//
// ignored metrics
// xxx revisit these
//
function ignoreFtdc(p) {
    addDescriptor({ path: P.apply(void 0, __spread(["ftdc"].concat(p))), ignore: true });
}
ignoreFtdc(["end"]);
ignoreFtdc(["host"]);
ignoreFtdc(["local.oplog.rs.stats", "capped"]);
ignoreFtdc(["local.oplog.rs.stats", "end"]);
ignoreFtdc(["local.oplog.rs.stats", "max"]);
ignoreFtdc(["local.oplog.rs.stats", "ns"]);
ignoreFtdc(["local.oplog.rs.stats", "ok"]);
ignoreFtdc(["local.oplog.rs.stats", "start"]);
ignoreFtdc(["local.oplog.rs.stats", "scaleFactor"]);
ignoreFtdc(["local.oplog.rs.stats", "wiredTiger", "block-manager", "file allocation unit size"]);
ignoreFtdc(["local.oplog.rs.stats", "wiredTiger", "block-manager", "file magic number"]);
ignoreFtdc(["local.oplog.rs.stats", "wiredTiger", "block-manager", "file major version number"]);
ignoreFtdc(["local.oplog.rs.stats", "wiredTiger", "block-manager", "minor version number"]);
ignoreFtdc(["local.oplog.rs.stats", "wiredTiger", "metadata", "formatVersion"]);
ignoreFtdc(["local.oplog.rs.stats", "wiredTiger", "metadata", "oplogKeyExtractionVersion"]);
ignoreFtdc(["replSetGetStatus", "code"]);
ignoreFtdc(["replSetGetStatus", "date"]);
ignoreFtdc(["replSetGetStatus", "end"]);
ignoreFtdc(["replSetGetStatus", "heartbeatIntervalMillis"]);
ignoreFtdc(["replSetGetStatus", "optime", "t"]);
// we report lag for these separate from replication lag
ignoreFtdc(["replSetGetStatus", "optimes", "appliedOpTime", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "appliedOpTime", "i"]);
ignoreFtdc(["replSetGetStatus", "optimes", "appliedOpTime", "ts", "i"]);
ignoreFtdc(["replSetGetStatus", "optimes", "appliedOpTime", "ts", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "durableOpTime", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "durableOpTime", "i"]);
ignoreFtdc(["replSetGetStatus", "optimes", "durableOpTime", "ts", "i"]);
ignoreFtdc(["replSetGetStatus", "optimes", "durableOpTime", "ts", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "lastCommittedOpTime", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "lastCommittedOpTime", "ts", "i"]);
ignoreFtdc(["replSetGetStatus", "optimes", "lastCommittedOpTime", "ts", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "readConcernMajorityOpTime", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "readConcernMajorityOpTime", "ts", "i"]);
ignoreFtdc(["replSetGetStatus", "optimes", "readConcernMajorityOpTime", "ts", "t"]);
ignoreFtdc(["replSetGetStatus", "optimes", "lastAppliedWallTime"]);
ignoreFtdc(["replSetGetStatus", "optimes", "lastCommittedWallTime"]);
ignoreFtdc(["replSetGetStatus", "optimes", "lastDurableWallTime"]);
ignoreFtdc(["replSetGetStatus", "optimes", "readConcernMajorityWallTime"]);
ignoreFtdc(["replSetGetStatus", "start"]);
ignoreFtdc(["replSetGetStatus", "state"]);
ignoreFtdc(["replSetGetStatus", "uptime"]);
ignoreFtdc(["serverStatus", "cursors", "note"]);
ignoreFtdc(["serverStatus", "end"]);
ignoreFtdc(["serverStatus", "extra_info", "heap_usage_bytes"]);
ignoreFtdc(["serverStatus", "extra_info", "note"]);
ignoreFtdc(["serverStatus", "globalLock", "activeClients", "total"]);
ignoreFtdc(["serverStatus", "globalLock", "currentQueue", "total"]);
ignoreFtdc(["serverStatus", "globalLock", "totalTime"]);
ignoreFtdc(["serverStatus", "localTime"]);
ignoreFtdc(["serverStatus", "mem", "bits"]);
ignoreFtdc(["serverStatus", "mem", "supported"]);
ignoreFtdc(["serverStatus", "ok"]);
ignoreFtdc(["serverStatus", "pid"]);
ignoreFtdc(["serverStatus", "process"]);
ignoreFtdc(["serverStatus", "repl", "ismaster"]);
ignoreFtdc(["serverStatus", "repl", "isreplicaset"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "lastWriteDate"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "opTime", "t"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "opTime", "ts", "i"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "opTime", "ts", "t"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "majorityOpTime", "t"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "majorityOpTime", "ts", "i"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "majorityOpTime", "ts", "t"]);
ignoreFtdc(["serverStatus", "repl", "lastWrite", "majorityWriteDate"]);
ignoreFtdc(["serverStatus", "repl", "rbid"]);
ignoreFtdc(["serverStatus", "repl", "secondary"]);
ignoreFtdc(["serverStatus", "repl", "setVersion"]);
ignoreFtdc(["serverStatus", "security", "SSLServerCertificateExpirationDate"]);
ignoreFtdc(["serverStatus", "security", "SSLServerHasCertificateAuthority"]);
ignoreFtdc(["serverStatus", "sharding", "lastSeenConfigServerOpTime", "t"]);
ignoreFtdc(["serverStatus", "sharding", "lastSeenConfigServerOpTime", "ts", "i"]);
ignoreFtdc(["serverStatus", "sharding", "lastSeenConfigServerOpTime", "ts", "t"]);
ignoreFtdc(["serverStatus", "start"]);
ignoreFtdc(["serverStatus", "storageEngine", "persistent"]);
ignoreFtdc(["serverStatus", "storageEngine", "readOnly"]);
ignoreFtdc(["serverStatus", "storageEngine", "supportsCommittedReads"]);
ignoreFtdc(["serverStatus", "storageEngine", "supportsSnapshotReadConcern"]);
ignoreFtdc(["serverStatus", "storageEngine", "supportsPendingDrops"]);
ignoreFtdc(["serverStatus", "storageEngine"]);
ignoreFtdc(["serverStatus", "uptimeEstimate"]);
ignoreFtdc(["serverStatus", "uptimeMillis"]);
ignoreFtdc(["serverStatus", "version"]);
ignoreFtdc(["serverStatus", "wiredTiger", "block-manager", "file magic number"]);
ignoreFtdc(["serverStatus", "wiredTiger", "block-manager", "file major version number"]);
ignoreFtdc(["serverStatus", "wiredTiger", "block-manager", "minor version number"]);
ignoreFtdc(["serverStatus", "wiredTiger", "wiredTiger", "uri"]);
ignoreFtdc(["start"]);
ignoreFtdc(["systemMetrics", "cpu", "btime"]);
ignoreFtdc(["systemMetrics", "cpu", "num_cpus"]);
ignoreFtdc(["systemMetrics", "cpu", "processes"]);
ignoreFtdc(["systemMetrics", "end"]);
ignoreFtdc(["systemMetrics", "memory", "Active_kb", "active"]);
ignoreFtdc(["systemMetrics", "memory", "Active_kb"]);
ignoreFtdc(["systemMetrics", "memory", "Inactive_kb", "inactive"]);
ignoreFtdc(["systemMetrics", "memory", "Inactive_kb"]);
ignoreFtdc(["systemMetrics", "memory", "MemTotal_kb", "total"]);
ignoreFtdc(["systemMetrics", "memory", "MemTotal_kb"]);
ignoreFtdc(["systemMetrics", "start"]);
ignoreFtdc(["systemMetrics", "timebase"]);
ignoreFtdc(["systemMetrics", "cpu", "\\Processor\\% Processor Time"]);
ignoreFtdc(["connPoolStats", "start"]);
ignoreFtdc(["connPoolStats", "end"]);
addDescriptor({ path: P("mongod", "start"), ignore: true });
addDescriptor({ path: P("csv", "start"), ignore: true });
addPattern({ pattern: P("ftdc", "serverStatus", "timing"), ignore: true }, "ignore");
addPattern({ pattern: P("ftdc", "systemMetrics", ".* Time Base"), ignore: true }, "ignore");
// ignore requires a pattern
sm_lnx_disk("io_in_progress", "i/o in progress", null, { ignore: true });
// ignore requires a pattern
rs_member(["lastHeartbeat"], { ignore: true });
rs_member(["lastHeartbeatRecv"], { ignore: true });
rs_member(["start"], { ignore: true });
rs_member(["optime", "t"], { ignore: true });
rs_member(["optime", "i"], { ignore: true });
rs_member(["optime", "ts", "i"], { ignore: true });
rs_member(["optime", "ts", "t"], { ignore: true });
rs_member(["optimeDate"], { ignore: true });
rs_member(["optimeDurable"], { ignore: true });
rs_member(["optimeDurable", "ts", "i"], { ignore: true });
rs_member(["optimeDurable", "ts", "t"], { ignore: true });
rs_member(["optimeDurableDate"], { ignore: true });
rs_member(["electionDate"], { ignore: true });
//# sourceMappingURL=descriptors.js.map
