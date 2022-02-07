"use strict";
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
var fs = require("fs");
var os = require("os");
var path = require("path");
var process = require("process");
var ctx_1 = require("./ctx");
//
// log file
//
var tmpDir = process.env.TMP || process.env.TEMP || "/tmp";
var logFn = path.join(tmpDir, "t2.log");
var logFd = fs.openSync(logFn, "a"); // append b/c main process opens it with "w"
function log() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var msg = Array.from(args).join(" ");
    var d = new Date().toISOString();
    var line = d + ' FRONT ' + msg + os.EOL;
    try {
        process.stdout.write(line);
        if (logFd >= 0)
            fs.writeSync(logFd, line);
    }
    catch (e) {
        console.log(e);
    }
}
exports.log = log;
function logRaw(line) {
    line = line.replace("\n", os.EOL); // ugh
    try {
        process.stdout.write(line);
        if (logFd >= 0)
            fs.writeSync(logFd, line);
    }
    catch (e) {
        console.log(e);
    }
}
exports.logRaw = logRaw;
//
// top-level error handlers
//
process.on('uncaughtException', function (error) {
    log("process uncaughtException", error.stack);
});
process.on('unhandledRejection', function (error) {
    log("process unhandledRejection", error.stack);
});
window.onunhandledrejection = function (event) {
    log("window onunhandledrejections", event.reason);
};
window.onerror = function (msg, url, lineNo, columnNo, error) {
    log("window onerror", msg, url, lineNo, columnNo);
    if (error && error.stack)
        log(error.stack);
};
//
// timing functions
//
var timers = {}; // xxx Map
function startTimer(name) {
    timers[name] = Date.now();
}
exports.startTimer = startTimer;
function endTimer(name) {
    var t = Date.now() - timers[name];
    log('TIMER ' + name + ': ' + t + ' ms');
    delete timers[name];
    return t;
}
exports.endTimer = endTimer;
function continueTimer(name) {
    if (!timers[name])
        startTimer(name);
    return Date.now() - timers[name];
}
exports.continueTimer = continueTimer;
function time(name, f) {
    return function () {
        startTimer(name);
        var result = f();
        endTimer(name);
        return result;
    };
}
exports.time = time;
//
// metrics are identified by paths through a document such as
// serverStatus. The metric may be represented either as an array of
// keys in the document, or as a single key which is the elements of
// the path joined by pathSep.
//
var Path = /** @class */ (function () {
    function Path() {
        var path = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            path[_i] = arguments[_i];
        }
        this.path = path; // xxx copy?
    }
    Path.fromKey = function (key) {
        return new (Path.bind.apply(Path, __spread([void 0], key.split(Path.pathSep))))();
    };
    Object.defineProperty(Path.prototype, "key", {
        get: function () {
            if (!this._key)
                this._key = this.path.join(Path.pathSep);
            return this._key;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Path.prototype, "regexp", {
        get: function () {
            if (!this._regexp)
                this._regexp = new RegExp(this.key);
            return this._regexp;
        },
        enumerable: true,
        configurable: true
    });
    Path.prototype.prepend = function (pre) {
        return new (Path.bind.apply(Path, __spread([void 0], pre.concat(this.path))))();
    };
    Path.prototype.displayString = function (sep) {
        if (sep === void 0) { sep = "/"; }
        return this.path.join(sep);
    };
    Path.prototype.get = function (doc) {
        var e_1, _a;
        var result = doc;
        try {
            for (var _b = __values(this.path), _c = _b.next(); !_c.done; _c = _b.next()) {
                var key = _c.value;
                if (key in result)
                    result = result[key];
                else
                    return undefined;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        return result;
    };
    Path.pathSep = '\0';
    return Path;
}());
exports.Path = Path;
//
//
//
function labelLeft(parent, text, classed) {
    if (classed === void 0) { classed = null; }
    var l = parent.append("label");
    if (classed)
        l.classed(classed, true);
    l.append("span").html(text);
    return l.append("span");
}
exports.labelLeft = labelLeft;
function labelRight(parent, text, classed) {
    if (classed === void 0) { classed = null; }
    var l = parent.append("label");
    if (classed)
        l.classed(classed, true);
    var result = l.append("span");
    l.append("span").html(text);
    return result;
}
exports.labelRight = labelRight;
function withStatus(status, f) {
    ctx_1.default().status.set(status);
    setTimeout(function () {
        startTimer(status);
        f();
        endTimer(status);
    }, 10);
}
exports.withStatus = withStatus;
//
// Make a copy by serializing/deserializing to JSON
// add special type handling as needed
//
function serialize(input) {
    return JSON.stringify(input, function (_key, value) {
        if (value instanceof TimeRange)
            return { "$type": "TimeRange", tMin: value.tMin, tMax: value.tMax };
        else
            return value;
    });
}
exports.serialize = serialize;
function deserialize(json) {
    return JSON.parse(json, function (_key, value) {
        var type = value ? value["$type"] : null;
        if (type == "TimeRange")
            return new TimeRange(value.tMin, value.tMax);
        else
            return value;
    });
}
exports.deserialize = deserialize;
function copy(input) {
    return deserialize(serialize(input));
}
exports.copy = copy;
//
//
//
function arrayMax(a) {
    return Math.max.apply(null, a);
}
exports.arrayMax = arrayMax;
function arrayMin(a) {
    return Math.min.apply(null, a);
}
exports.arrayMin = arrayMin;
////////////////////////////
//
// A TimeRange has a tMin and a tMax
//
var TimeRange = /** @class */ (function () {
    function TimeRange(tMin, tMax) {
        if (tMin == undefined || tMax == undefined)
            throw "undefined time range";
        this.tMin = tMin;
        this.tMax = tMax;
    }
    TimeRange.prototype.t2x = function (t, xMin, xMax) {
        return xMin + (xMax - xMin) * (t - this.tMin) / (this.tMax - this.tMin);
    };
    TimeRange.prototype.x2t = function (x, xMin, xMax) {
        return this.tMin + (this.tMax - this.tMin) * (x - xMin) / (xMax - xMin);
    };
    TimeRange.prototype.eq = function (that) {
        return this.tMin == that.tMin && this.tMax == that.tMax;
    };
    TimeRange.prototype.toString = function () {
        var duration = ((this.tMax - this.tMin) / 1000) + " s";
        var from = new Date(this.tMin).toISOString();
        var to = new Date(this.tMax).toISOString();
        return from + " to " + to + " duration " + duration;
    };
    return TimeRange;
}());
exports.TimeRange = TimeRange;
// sample a y value at time t
// xxx linear search - could do better, but seems fast enough so far
function sample(ts, ys, t) {
    for (var i = 0; i < ts.length; i++)
        if (ts[i] >= t)
            return ys[i];
    return NaN;
}
exports.sample = sample;
function assert(condition, msg) {
    if (!condition)
        throw msg;
}
exports.assert = assert;
function fmtTime(t) {
    return isFinite(t) ? new Date(t).toISOString() : "n/a";
}
exports.fmtTime = fmtTime;
function parseDuration(d) {
    var e_2, _a;
    d = d.trim();
    var sign = 1;
    if (d.startsWith("-")) {
        sign = -1;
        d = d.substr(1);
    }
    var result = 0;
    var ds = d.split(":");
    try {
        for (var ds_1 = __values(ds), ds_1_1 = ds_1.next(); !ds_1_1.done; ds_1_1 = ds_1.next()) {
            var d_1 = ds_1_1.value;
            result = result * 60 + Number(d_1);
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (ds_1_1 && !ds_1_1.done && (_a = ds_1.return)) _a.call(ds_1);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return sign * result;
}
exports.parseDuration = parseDuration;
// map from strings to scales, separated by type
var string2scale = {
    "decimal": { "µ": 1e-6, "m": 1e-3, "": 1, "k": 1e3, "M": 1e6, "G": 1e9, "T": 1e12 },
    "binary": { "Ki": 1024, "Mi": 1024 * 1024, "Gi": 1024 * 1024 * 1024, "Ti": 1024 * 1024 * 1024 * 1024 },
    "time": { "ms": 1e-3, "s": 1, "min": 60, "h": 60 * 60, "d": 60 * 60 * 24 },
};
// "decimal" and "binary" are prefixes, whereas "time" is a complete units string
// order matters here: must look for binary prefixes first else will see e.g. "M" instead of "Mi"
var prefixTypes = ["binary", "decimal"];
// map from scales to strings, separated by type ("decimal", "binary", "time")
var scale2string = {};
// lists of reverse sorted scales, separated by type ("decimal", "binary", "time")
var type2scales = {};
// compute scale2string and type2scales from string2scale
for (var type in string2scale) {
    var inverse = scale2string[type] = {};
    var scales = type2scales[type] = [];
    for (var str in string2scale[type]) {
        var scale = string2scale[type][str];
        inverse[scale] = str;
        scales.push(scale);
    }
    scales.sort(function (a, b) { return b - a; });
}
function autoScale(outType, // output autoscale type decimal, binary, or time
units, // complete unit string to be modified
value, // value to determine autoscale
values // values to be modified
) {
    // identify prefix, strip from units, leave prefix scale in scaleIn
    var scaleIn = 1;
    prefixTypes.forEach(function (inType) {
        var prefixes = string2scale[inType];
        for (var pfx in prefixes) {
            if (pfx != "" && units.startsWith(pfx)) {
                scaleIn = prefixes[pfx];
                units = units.substr(pfx.length);
                if (outType == "auto")
                    outType = inType;
            }
        }
    });
    // time strings aren't prefixes, so get rid of "s", to be replaced by the time string below
    if (outType == "time" && units == "s")
        units = "";
    // no input prefix, supply one here
    var scaleMin = 0; // xxx allow this as a parameter for the non-auto case
    if (outType == "auto") {
        outType = "decimal";
        if (units.startsWith("B"))
            outType = "binary";
        if (units == "%" || units == "/s" || units == "threads")
            scaleMin = 1;
    }
    // scale to appropriate output range, add prefix to units, leave prefix scale in scaleOut
    var scales = type2scales[outType];
    var scaleOut = 0;
    value = Math.abs(value);
    for (var i = 0; i < scales.length && scales[i] >= scaleMin; i++) {
        scaleOut = scales[i];
        if (value * scaleIn / scaleOut >= 1.0)
            break;
    }
    units = scale2string[outType][scaleOut] + units;
    // scale
    for (var name_1 in values)
        values[name_1] = values[name_1] * scaleIn / scaleOut;
    return units;
}
exports.autoScale = autoScale;
function printStackTrace(msg) {
    log("STACK", msg);
    log(new Error().stack);
}
exports.printStackTrace = printStackTrace;
//
// Takes a list of arrays of strings and returns the array of strings
// that is a common prefix to all arrays in the list
//
function commonPrefix(words) {
    var pfx = [];
    for (var i = 0;; i++) {
        var w = words.map(function (word) { return word[i]; }).reduce(function (a, b) { return a == b ? a : null; });
        if (w == null)
            break;
        pfx.push(w);
    }
    return pfx;
}
exports.commonPrefix = commonPrefix;
//
// Takes a list of strings and identifies the common prefix and suffix
// of all strings, and the unique portion of each string. The prefix
// will end and suffix will begin only just before or after an
// occurrence of sep.
//
function stripCommonPrefixAndSuffix(strings, sep, minLength) {
    var e_3, _a;
    if (minLength === void 0) { minLength = 0; }
    var splitter = new RegExp("(" + sep + ")", "g"); // includes delimiter as token in result
    var longStrings = [];
    try {
        for (var strings_1 = __values(strings), strings_1_1 = strings_1.next(); !strings_1_1.done; strings_1_1 = strings_1.next()) {
            var s = strings_1_1.value;
            if (s && s.length > minLength)
                longStrings.push(s);
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (strings_1_1 && !strings_1_1.done && (_a = strings_1.return)) _a.call(strings_1);
        }
        finally { if (e_3) throw e_3.error; }
    }
    if (longStrings.length == 0)
        return { pfx: "", mid: strings, sfx: "" };
    var words = longStrings.map(function (s) { return s.split(splitter); });
    var pfxWords = commonPrefix(words);
    var pfx = pfxWords.join("");
    if (words.every(function (w) { return w.length == pfxWords.length; })) {
        // prefix spans all strings; return all prefix, no suffix
        return {
            pfx: pfx,
            mid: [],
            sfx: ''
        };
    }
    else {
        var sfx_1 = commonPrefix(words.map(function (name) { return name.reverse(); })).reverse().join("");
        var strip_1 = function (s) {
            if (s.startsWith(pfx))
                s = s.substring(pfx.length);
            if (s.endsWith(sfx_1))
                s = s.substring(0, s.length - sfx_1.length);
            return s;
        };
        return {
            pfx: pfx,
            mid: strings.map(function (s) { return s ? strip_1(s) : s; }),
            sfx: sfx_1 // common suffic
        };
    }
}
exports.stripCommonPrefixAndSuffix = stripCommonPrefixAndSuffix;
//# sourceMappingURL=util.js.map