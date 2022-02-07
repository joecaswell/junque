"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var box = require("./box");
var icons = require("./icons");
////////////////////////////
//
// Options manages user selectable options through a dialog box
//
// The caller passes a map parameter in which we will record the
// current values of the options for the client to examine, then adds
// some number of options using addEnumOption, addBoolOption, etc.
// When an option changes we will call onchange.
//
var Options = /** @class */ (function () {
    function Options(parent, options, onchange) {
        // for test: functions to change a value and programmatically
        // trigger corresponding change event
        this.test = {};
        this.options = options;
        this.onchange = onchange;
        var optionsBox = new box.Box(parent, icons.gear, "Options", false, null, null);
        optionsBox.top.attr("id", "options");
        optionsBox.content.classed("options", true);
        var col1 = optionsBox.content.append("div");
        var col2 = optionsBox.content.append("div");
        // xxx tooltips
        this.addBoolOption(col1, "merge", "merge related charts", "...", false, true);
        this.addBoolOption(col1, "showValues", "show chart values", "...", true);
        this.addBoolOption(col1, "showZero", "show all-zero charts", "...", false);
        this.addBoolOption(col1, "commonScale", "use common scale", "...", false, true);
        this.addBoolOption(col1, "autoScale", "autoscale numbers", "...", false);
        this.addBoolOption(col1, "showAlerts", "show alerts", "...", true);
        this.addBoolOption(col1, "showHeadings", "show headings", "...", true);
        this.addBoolOption(col2, "sourcePerFile", "source per file", "...", false, true);
        this.addBoolOption(col2, "sourcePerDir", "source per directory", "...", false, true);
        //addBoolOption(col2, "debug", "debug", "...", true)
        this.addAutoReloadOption(col2);
        col2.append("span").classed("fill", true);
        this.addEnumOption(col2, "chartSize", "chart size", "...", String, ["small", "medium", "large"], "small");
        this.addEnumOption(col2, "timeline", "timeline", "...", String, ["normal", "aligned", "condensed"], "normal", true);
        this.addEnumOption(col2, "nSamples", "number of samples", "...", Number, [100, 200, 500, 1000, 2000, 5000], 5000);
    }
    Options.prototype.addBoolOption = function (to, property, label, tooltip, value, filesChanged) {
        var _this = this;
        if (filesChanged === void 0) { filesChanged = false; }
        var l = to
            .append("label")
            .attr("title", tooltip);
        // the checkbox
        var checkbox = l.append("input")
            .attr("type", "checkbox")
            .style("outline", "none");
        var node = checkbox.node();
        this.options[property] = node.checked = value;
        checkbox.on("change", function () {
            _this.options[property] = node.checked;
            _this.onchange(filesChanged);
        });
        this.test[property] = function (value) {
            node.checked = value;
            checkbox.dispatch("change");
        };
        // the label
        l.append("span").html(label).style("padding-right", "0.2em");
    };
    Options.prototype.addEnumOption = function (to, property, label, tooltip, typ, values, value, filesChanged) {
        var _this = this;
        if (filesChanged === void 0) { filesChanged = false; }
        var l = to
            .append("label")
            .attr("title", tooltip);
        // the label
        l.append("span").html(label).style("padding-right", "0.5em");
        // the dropdown list
        var select = l.append("select")
            .classed("option-value", true)
            .on("change", function () {
            _this.options[property] = typ(node.value);
            _this.onchange(filesChanged);
        });
        values.forEach(function (value) {
            select.append("option").html(value);
        });
        var node = select.node();
        this.options[property] = node.value = value;
    };
    Options.prototype.addAutoReloadOption = function (to) {
        var _this = this;
        var label = "reload every";
        var tooltip = "...";
        var enableProperty = "reloadEnabled";
        var intervalProperty = "reloadInterval";
        var defaultInterval = 10;
        var l = to
            .append("label")
            .attr("title", tooltip);
        // the checkbox to enable/disable reload
        var checkbox = l.append("input")
            .attr("type", "checkbox")
            .style("outline", "none");
        var enableNode = checkbox.node();
        this.options[enableProperty] = enableNode.checked = false;
        checkbox.on("change", function () {
            _this.options[enableProperty] = enableNode.checked;
            _this.onchange(false);
        });
        // put the label and input area together in a span to align on baselines
        var labelAndInput = l.append("span")
            .style("display", "flex")
            .style("align-items", "baseline");
        labelAndInput.append("span").html(label).style("padding-right", "0.2em");
        // input box to specify reload interval
        var input = labelAndInput.append("input")
            .attr("type", "textarea")
            .style("width", "2.5em")
            .style("text-align", "right");
        var intervalNode = input.node();
        this.options[intervalProperty] = defaultInterval;
        intervalNode.value = "" + defaultInterval;
        input.on("change", function () {
            _this.options[intervalProperty] = +intervalNode.value;
            _this.onchange(false);
        });
        labelAndInput.append("span").html("s");
    };
    return Options;
}());
exports.Options = Options;
//# sourceMappingURL=options.js.map
