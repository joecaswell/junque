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
var charts = require("./charts");
var ViewSelector = /** @class */ (function () {
    function ViewSelector(parent) {
        var e_1, _a;
        var _this = this;
        this.top = parent.append("div").classed("view-selector", true);
        var left = this.top.append("div").classed("view-selector-left", true);
        // "VIEW" label
        left.append("div")
            .classed("label-text", true)
            .html("VIEW");
        // the dropdown list
        this.select = left.append("select")
            .on("change", function () { return _this.showViewAction(_this.selectNode.value); });
        this.selectNode = this.select.node();
        // reset button
        this.reset = left.append("button")
            .style("visibility", "hidden")
            .text("Reset")
            .on("click", function () {
            ctx_1.default().views.getView(_this.currentState.viewName).reset();
        });
        // populate the list
        var viewNames = ctx_1.default().views.getViewNames();
        try {
            for (var viewNames_1 = __values(viewNames), viewNames_1_1 = viewNames_1.next(); !viewNames_1_1.done; viewNames_1_1 = viewNames_1.next()) {
                var viewName = viewNames_1_1.value;
                var option = this.select.append("option");
                var explanation = ctx_1.default().views.getView(viewName).getExplanation();
                explanation = explanation.replace(/( |\n)+/g, " ");
                explanation = explanation.replace(/^ /, "");
                option.attr("title", explanation);
                option.html(viewName);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (viewNames_1_1 && !viewNames_1_1.done && (_a = viewNames_1.return)) _a.call(viewNames_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // explanation area
        this.explanationArea = this.top.append("div").classed("view-selector-explanation", true);
        // state for undo/redo
        var initialState = { viewName: ctx_1.default().views.defaultViewName };
        this.currentState = ctx_1.default().undo.registerClient("viewSelector", this, initialState);
        this.selectNode.value = this.currentState.viewName;
        this.showExplanation();
    }
    ViewSelector.prototype.showExplanation = function () {
        var explanation = ctx_1.default().views.getView(this.currentState.viewName).getExplanation();
        this.explanationArea.html(explanation);
    };
    ViewSelector.prototype.hide = function (hide) {
        this.top.style("display", function () { return hide ? "none" : null; });
        var mod = ctx_1.default().views.getView(this.currentState.viewName).isModified();
        this.reset.style("visibility", function () { return mod ? "visible" : "hidden"; });
    };
    // restore state for undo/redo
    ViewSelector.prototype.restoreState = function (newState) {
        this.currentState = newState;
        this.selectNode.value = this.currentState.viewName;
        this.showExplanation();
        ctx_1.default().show(true);
    };
    ViewSelector.prototype.showViewAction = function (viewName) {
        this.currentState.viewName = this.selectNode.value = viewName;
        ctx_1.default().undo.updateState({ viewSelector: this.currentState });
        this.showExplanation();
        ctx_1.default().show(true);
    };
    return ViewSelector;
}());
exports.ViewSelector = ViewSelector;
function notInViewHeading(parent) {
    parent
        .classed("not-in-view-heading", true)
        .attr("colspan", charts.ChartRow.preChartCols + 1)
        .html("FOLLOWING CHARTS MAY BE ADDED TO THE VIEW BY DOUBLE-CLICKING");
}
exports.notInViewHeading = notInViewHeading;
//# sourceMappingURL=viewselector.js.map