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
var box = require("./box");
var icons = require("./icons");
var twisty = require("./twisty");
var u = require("./util");
////////////////////////////
//
// Info manages the display of textual information about the charts,
// such as ftdc metadata.
//
var Info = /** @class */ (function () {
    function Info(parent) {
        var _this = this;
        this.box = new box.Box(parent, icons.info, "Info", true, function () { return _this.onopen(); }, null);
        this.box.top.attr("id", "info");
        this.box.content.attr("id", "info-content");
    }
    Info.prototype.at = function () {
        return Number(this.atSelNode.value);
    };
    // format a document (such as ftdc metadata) into a nested
    // list structure we style it in css not to have bullets, etc.
    Info.prototype.formatDoc = function (into, doc) {
        for (var i in doc) {
            var li = into.append("li");
            var e = doc[i];
            if (e.source) {
                var liTwisty = new twisty.Twisty(li);
                li.append("span")
                    .classed("info-property", true)
                    .text(e.source + ":");
                var ul = li.append("ul");
                liTwisty.addControlled(ul);
                this.formatDoc(ul, e.meta);
            }
            else {
                var name_1 = "<span class='info-property'>" + e.Name + ":</span>";
                if (e.Name == "$logLines") {
                    this.formatLogLines(li, e.Value);
                }
                else if (Array.isArray(e)) {
                    this.formatDoc(into, e);
                }
                else if (!Array.isArray(e.Value)) {
                    if (e.Value != undefined)
                        li.append("p").html(name_1 + e.Value);
                    else
                        li.append("p").html(e);
                }
                else if (typeof (e.Value[0]) != "object") {
                    li.append("p").html(name_1 + "[" + e.Value.join(", ") + "]");
                }
                else {
                    li.append("span").html(name_1);
                    var ul = li.append("ul");
                    this.formatDoc(ul, e.Value);
                }
            }
        }
    };
    // format lines from a mongod log file returned by the back end
    // time field at beginning of line has class "info-log-time"
    // slowms field at end of line has class "info-log-slowms"
    Info.prototype.formatLogLines = function (into, lines) {
        var e_1, _a;
        var t = this.at();
        var found = false;
        try {
            for (var lines_1 = __values(lines), lines_1_1 = lines_1.next(); !lines_1_1.done; lines_1_1 = lines_1.next()) {
                var line = lines_1_1.value;
                var words = line.split(' ');
                // insert a marker at the requested time
                if (!found) {
                    var tt = new Date(words[0]) - 0;
                    if (tt >= t) {
                        var li = into.append("li").classed("info-log-mark", true);
                        li.append("span").classed("info-log-time", true)
                            .text(new Date(t).toISOString());
                        var mark = this.atSelNode.options.item(this.atSelNode.selectedIndex).text;
                        li.append("span").text(" " + mark);
                        li.style("position", "relative");
                        li.append("span")
                            .style("position", "absolute")
                            .style("left", "-1.2em").style("top", "-0.25em")
                            .style("font-weight", "bold")
                            .style("font-size", "1.5em")
                            .text("➥");
                        found = true;
                    }
                }
                // mark up the log line and insert it
                var p = into.append("li").append("p");
                p.append("span").classed("info-log-time", true).text(words[0]);
                if (line.endsWith("ms")) {
                    p.append("span").text(" " + words.slice(1, words.length - 1).join(" ") + " ");
                    p.append("span").classed("info-log-slowms", true).text(words[words.length - 1]);
                }
                else {
                    p.append("span").text(" " + words.slice(1, words.length).join(" "));
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (lines_1_1 && !lines_1_1.done && (_a = lines_1.return)) _a.call(lines_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    // request metadata at the selected time and display it
    Info.prototype.showMetadata = function () {
        var _this = this;
        var t = this.at();
        u.log("requesting metdata at", t);
        ctx_1.default().protocol.getMeta(t, ctx_1.default().dataset.getShifts(), "metadata", function (metadata) {
            // format the metadata
            _this.content.html("");
            _this.formatDoc(_this.content.append("ul"), metadata);
        });
    };
    Info.prototype.showRawContent = function () {
        var _this = this;
        var t = this.at();
        u.log("requesting raw content at", t);
        ctx_1.default().protocol.getMeta(t, ctx_1.default().dataset.getShifts(), "rawContent", function (rawContent) {
            // format the rawContent
            _this.content.html("");
            _this.formatDoc(_this.content.append("ul"), rawContent);
        });
    };
    Info.prototype.valueTable = function () {
        this.content.classed("info-values", true);
        this.content.html("");
        return this.content.append("table")
            .attr("cellspacing", 0).attr("cellpadding", 0).attr("border", "0");
    };
    // ask ChartSet to show displayed values in a table
    Info.prototype.showDisplayedValues = function () {
        ctx_1.default().chartSet.formatValues(this.valueTable(), this.at());
    };
    // show raw values in a table
    Info.prototype.showRawValues = function () {
        var table = this.valueTable();
        var shifts = ctx_1.default().dataset.getShifts();
        for (var source in ctx_1.default().rawSourceData) {
            var sourceTr = table.append("tr").append("td")
                .attr("colspan", 2)
                .classed("info-source", true);
            var sourceTwisty = new twisty.Twisty(sourceTr);
            sourceTr.append("div").text(source);
            var sourceData = ctx_1.default().rawSourceData[source];
            var ts = sourceData[new u.Path("ftdc", "start").key]; // xxx shd be desc.timebasePath
            var t = this.at() - (shifts[source] || 0);
            for (var metric in sourceData) {
                var y = u.sample(ts, sourceData[metric], t);
                var tr = table.append("tr");
                sourceTwisty.addControlled(tr);
                tr.append("td").classed("info-value", true).append("div").text(y.toString());
                tr.append("td")
                    .classed("info-metric", true)
                    .append("div").text(u.Path.fromKey(metric).displayString());
            }
        }
    };
    Info.prototype.onopen = function () {
        var _this = this;
        // clear it, we'll rebuild every time we're opened
        this.box.content.html("");
        // add a controls to select what to show and at what time
        var controls = this.box.content.append("div").attr("id", "info-controls");
        controls.append("span").html("Show:");
        // what to show
        var nowShowing; // function to show selected option - metadata, etc.
        var option = function (label, show) {
            var input = u.labelRight(controls, label)
                .append("input")
                .attr("type", "radio")
                .attr("name", "info-type")
                .on("click", function () {
                nowShowing = show;
                nowShowing();
            });
            return input;
        };
        var dflt = option("metadata", function () { return _this.showMetadata(); });
        option("displayed values", function () { return _this.showDisplayedValues(); });
        option("raw values", function () { return _this.showRawValues(); });
        option("raw content", function () { return _this.showRawContent(); });
        // list to select at what time - will be populated based on what is showing
        var atSel = u.labelLeft(controls, "at", "info-controls-at")
            .append("select")
            .on("change", function () {
            updateTimeInput();
            nowShowing();
        });
        this.atSelNode = atSel.node();
        // field to display time if selected from menu, or allow user to input a time
        var timeInput = controls
            .append("input")
            .attr("type", "textbox")
            .classed("info-controls-time", true)
            .on("focus", function () { return timeInputNode.select(); })
            .on("change", function () {
            var t = +new Date(timeInputNode.value);
            if (!isFinite(t)) {
                ctx_1.default().status.error("invalid date " + timeInputNode.value);
            }
            else {
                var marker = ctx_1.default().chartSet.markerSet.addMarkerAction(null, t);
                updateView(marker.t);
                nowShowing();
            }
        });
        var timeInputNode = timeInput.node();
        var updateTimeInput = function () {
            timeInputNode.value = new Date(_this.at()).toISOString();
        };
        // displayed content - metadata, etc.
        this.content = this.box.content.append("div").classed("info-values", true);
        // populate select with a list of significant times - chart/dataset start/end, markers
        var updateView = function (selectedT) {
            var e_2, _a;
            atSel.html("");
            var chartTmin = ctx_1.default().chartSet.tr.tMin;
            var chartTmax = ctx_1.default().chartSet.tr.tMax;
            var times = [];
            try {
                for (var _b = __values(ctx_1.default().chartSet.markerSet.getMarkerInfo()), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var m = _c.value;
                    times.push({ caption: "Marker " + m.letter, t: m.t });
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
            times.push({ caption: "Start of charts", t: chartTmin });
            times.push({ caption: "End of charts", t: chartTmax });
            times.sort(function (a, b) { return a.t - b.t; });
            times.forEach(function (t) {
                atSel.append("option").html(t.caption).attr("value", function () { return t.t; });
            });
            if (selectedT == 0)
                selectedT = chartTmin;
            _this.atSelNode.value = "" + selectedT;
            updateTimeInput(); // initial value
        };
        // all set up, select the default
        updateView(0);
        dflt.dispatch("click");
        var dfltNode = dflt.node();
        dfltNode.checked = true;
    };
    return Info;
}());
exports.Info = Info;
//# sourceMappingURL=info.js.map