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
var ctx_1 = require("./ctx");
var icons = require("./icons");
var CtxSelector = /** @class */ (function () {
    function CtxSelector(parent) {
        var _this = this;
        // fake combo
        var combo = parent.append("span")
            .classed("ctx-combo", true);
        // the dropdown list
        this.select = combo.append("select")
            .classed("ctx-select", true)
            .attr("title", "Select a context")
            .on("change", function () { return ctx_1.default().activate(_this.selectNode.value); }); // calls populate()
        this.selectNode = this.select.node();
        // open menu icon
        combo.append("svg")
            .classed("ctx-open-menu", true)
            .attr("viewBox", "0 0 1 1")
            .append("path")
            .attr("d", "M 0.25,0.4 0.5,0 0.75,0.4 Z M 0.25,0.6 0.5,1 0.75,0.6 Z");
        // the input field
        this.input = combo.append("input")
            .classed("ctx-input", true)
            .attr("title", "Current context\nClick to rename")
            .on("change", function () { return ctx_1.default().rename(_this.inputNode.value.trim()); })
            .on("focus", function () { return _this.inputNode.select(); });
        this.inputNode = this.input.node();
        // + to add a new context
        var plus = parent.append("label")
            .attr("title", "Open a new context")
            .on("click", function () { return ctx_1.default().newCtx([]); });
        icons.plus(plus);
        // icon to clone context
        var clone = parent.append("label")
            .attr("title", "Clone current context")
            .on("click", function () { return ctx_1.default().clone(); });
        icons.clone(clone);
        // x to close context
        var close = parent.append("label")
            .attr("title", "Close current context")
            .on("click", function () { return ctx_1.default().close(); });
        icons.close(close);
    }
    CtxSelector.prototype.setSelected = function (ctxName) {
        this.selectNode.value = ctxName;
        this.inputNode.value = ctxName;
    };
    // populate the list of context names
    CtxSelector.prototype.populate = function (ctxNames, activeCtx) {
        var e_1, _a;
        this.select.html("");
        try {
            for (var ctxNames_1 = __values(ctxNames), ctxNames_1_1 = ctxNames_1.next(); !ctxNames_1_1.done; ctxNames_1_1 = ctxNames_1.next()) {
                var ctxName = ctxNames_1_1.value;
                var option = this.select.append("option");
                option.html(ctxName);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (ctxNames_1_1 && !ctxNames_1_1.done && (_a = ctxNames_1.return)) _a.call(ctxNames_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.setSelected(activeCtx);
    };
    return CtxSelector;
}());
exports.CtxSelector = CtxSelector;
//# sourceMappingURL=ctxselector.js.map