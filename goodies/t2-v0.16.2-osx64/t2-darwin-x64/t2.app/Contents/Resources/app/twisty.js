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
var Twisty = /** @class */ (function () {
    function Twisty(parent) {
        var _this = this;
        this.twistyPath = parent.append("svg")
            .attr("viewBox", "0 0 1 1")
            .classed("twisty", true)
            .on("mousedown", function () { _this.open = !_this._open; })
            .append("path");
        this.controlled = [];
        this.open = true;
        parent.classed("twisty-parent", true);
    }
    Twisty.prototype.addControlled = function (e) {
        var _this = this;
        this.controlled.push(e);
        e.style("display", function () { return _this._open ? null : "none"; });
    };
    Object.defineProperty(Twisty.prototype, "open", {
        set: function (_open) {
            var e_1, _a;
            var _this = this;
            this._open = _open;
            var path = _open ? "M 0 .2  L 1 .2  L .5 1 Z" : "M .2 0  L .2 1  L 1 .5 Z";
            this.twistyPath.attr("d", path);
            try {
                for (var _b = __values(this.controlled), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var e = _c.value;
                    e.style("display", function () { return _this._open ? null : "none"; });
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        },
        enumerable: true,
        configurable: true
    });
    return Twisty;
}());
exports.Twisty = Twisty;
//# sourceMappingURL=twisty.js.map