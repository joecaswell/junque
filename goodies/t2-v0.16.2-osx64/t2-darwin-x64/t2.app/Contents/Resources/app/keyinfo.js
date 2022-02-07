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
Object.defineProperty(exports, "__esModule", { value: true });
//import ctx from "./ctx"
var u = require("./util");
////////////////////////////
//
// KeyInfo
//
var paths = {
    "version": new u.Path("buildInfo", "version"),
    "os type": new u.Path("hostInfo", "os", "type"),
    "memSizeMB": new u.Path("hostInfo", "system", "memSizeMB"),
    "numCores": new u.Path("hostInfo", "system", "numCores")
};
var KeyInfo = /** @class */ (function () {
    function KeyInfo(parent) {
        this.top = parent.append("div").classed("keyinfo", true);
    }
    KeyInfo.prototype.show = function (allMeta) {
        this.top.html("");
        for (var key in paths) {
            var path = paths[key];
            var valueSet = new Set(path.get(allMeta));
            var valueString = __spread(valueSet).join(", ");
            var div = this.top.append("div");
            div.append("span").classed("keyinfo-key", true).text(key);
            div.append("span").classed("keyinfo-value", true).text(valueString);
        }
    };
    return KeyInfo;
}());
exports.KeyInfo = KeyInfo;
//# sourceMappingURL=keyinfo.js.map