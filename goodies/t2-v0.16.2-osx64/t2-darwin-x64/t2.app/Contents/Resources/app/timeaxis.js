"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var d3 = require("d3");
var ctx_1 = require("./ctx");
var markers = require("./markers");
var ranger = require("./ranger");
var u = require("./util");
////////////////////////////
//
// TimeAxis
//
// tr specifies the timerange for this TimeAxis.
//
// zoomTr specifies the time range for another TimeAxis. Use: if this
// is the overall dataset TimeAxis, zoomTr will specify the time range
// for the zoomed-in chart TimeAxis, and we will draw a shaded
// trapezoid indicating mapping from this tr to zoom Tr.
//
// xxx a lot of repetition - do some refactoring
// xxx pull stuff out to css
// xxx moar documentation
//
var TimeAxis = /** @class */ (function () {
    function TimeAxis(markerSet, parent, chartWidth, tr, zoomTr) {
        // if zoomTr is not null we draw a shaded trapezoid showing how
        // zoomTr relates to this TimeAxis. xxx can these be pulled out to css?
        var zoomOverallHeight = "7em"; // total height including axis and zoom trapezoid
        var zoomHeight = "3.5em"; // height of zoom trapezoid itself
        var topSvgHeight = "1.8em";
        var zoomStrokeColor = "rgb(220,220,200)";
        var zoomFillColor = "rgb(235,235,235)";
        var dotColor = "rgb(150,150,150)";
        var dotRadius = 2;
        // position of axis line relative to captions
        var axisLineY = "0.85em";
        // xxx util?
        function t2x(t) {
            return tr.t2x(t, 0, 1);
        }
        // xxx util?
        function pct(x) {
            return (x * 100) + '%';
        }
        // xxx should depend on width
        var targetTicks = 6;
        // compute tickDelta and tickMin
        var tickRanges = [
            1, 2, 5, 10, 15, 20, 30, 60,
            1 * 60, 2.5 * 60, 5 * 60, 10 * 60, 15 * 60, 20 * 60, 30 * 60, 60 * 60,
            1 * 3600, 2 * 3600, 3 * 3600, 4 * 3600, 6 * 3600, 8 * 3600, 12 * 3600, 24 * 3600,
            Infinity // multi-day
        ];
        var tickDelta = (tr.tMax - tr.tMin) / targetTicks / 1000; // in seconds
        for (var i in tickRanges) {
            if (tickDelta < tickRanges[i]) {
                if (tickRanges[i] == Infinity)
                    tickDelta = Math.ceil(tickDelta / (24 * 3600)) * (24 * 3600);
                else
                    tickDelta = tickRanges[i];
                break;
            }
        }
        u.log("tickDelta " + tickDelta);
        tickDelta *= 1000; // now in ms
        var tickMin = Math.ceil(tr.tMin / tickDelta) * tickDelta;
        // compute tick times
        var ticks = [];
        //ticks.push(tr.tMin) // DEBUGGING: add tick at left edge of timebase
        for (var i = 0; i < targetTicks; i++) {
            var t = tickMin + i * tickDelta;
            if (t > tr.tMax)
                break;
            ticks.push(t);
        }
        //ticks.push(tr.tMax) // DEBUGGING: add tick at right edge of timebase
        if (zoomTr)
            parent.style("height", zoomOverallHeight); // allow room for the "zoom lines"
        // top-level svg
        var topDiv = parent
            .append("div")
            .style("position", "relative");
        var topSvg = topDiv
            .append("svg")
            .classed("timeaxis", true)
            .style("width", chartWidth)
            .style("height", topSvgHeight)
            .style("overflow", "visible");
        // draw rect for reference range
        if (zoomTr) {
            var xMin = t2x(zoomTr.tMin);
            var xMax = t2x(zoomTr.tMax);
            var pa = function (path) {
                var args = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    args[_i - 1] = arguments[_i];
                }
                return path + " " + Array.from(args).join(" ");
            };
            // zoom trapezoid with gradient fill
            // define a vertical linear gradient from c1 to c2
            var gradient = function (id, c1, c2) {
                var gradient = topSvg.append("defs")
                    .append("linearGradient")
                    .attr("id", id)
                    .attr("x1", 0).attr("x2", 0)
                    .attr("y1", 0).attr("y2", 1);
                gradient.append("stop").attr("offset", "0%").attr("stop-color", c1);
                gradient.append("stop").attr("offset", "100%").attr("stop-color", c2);
            };
            gradient("zoomStroke", zoomStrokeColor, "white");
            gradient("zoomFill", zoomFillColor, "white");
            var path = "";
            path = pa(path, "M", xMin, 0);
            path = pa(path, "L", 0, 1);
            path = pa(path, "L", 1, 1);
            path = pa(path, "L", xMax, 0);
            path = pa(path, "Z");
            // draw the zoom trapezoid with gradient fill
            topSvg.append("svg")
                .attr("y", axisLineY)
                .attr("height", zoomHeight)
                .style("width", "100%")
                .attr("viewBox", "0 0 1 1")
                .attr("preserveAspectRatio", "none")
                .style("overflow", "visible")
                .append("path")
                .style("stroke-width", 1 /*zoomLineStrokeWidth*/) // xxx
                .style("vector-effect", "non-scaling-stroke")
                .style("stroke", "url(#zoomStroke)")
                .style("fill", "url(#zoomFill)")
                .attr("d", path);
            // dots showing tMin tMax on horizontal time axis
            topSvg.append("circle")
                .style("fill", dotColor)
                .attr("cx", pct(xMin)).attr("cy", axisLineY)
                .attr("r", dotRadius);
            topSvg.append("circle")
                .style("fill", dotColor)
                .attr("cx", pct(xMax)).attr("cy", axisLineY)
                .attr("r", dotRadius);
        }
        // horizontal axis line
        topSvg.append("line")
            .classed("timeaxis-tick", true)
            .attr("x1", pct(0)).attr("y1", axisLineY)
            .attr("x2", pct(1)).attr("y2", axisLineY);
        var tip = topDiv.append("div")
            .classed("tip", true)
            .classed("valueTip", true)
            .style("display", "none");
        // set tip position
        var setTip = function (x, t) {
            if (x != null) {
                tip.html("");
                tip.append("span").text(new Date(t).toISOString());
                tip.append("span").classed("spacer", true);
                if (zoomTr) {
                    tip.append("span").text("dataset timeline");
                    //tip.append("span").text("all times are in UTC")
                    tip.append("span").text("drag to zoom");
                    tip.append("span").text("double click to show full range");
                }
                else {
                    tip.append("span").text("chart timeline");
                    //tip.append("span").text("all times are in UTC")
                    tip.append("span").text("drag to zoom");
                }
                tip.append("span").classed("spacer", true);
                tip.append("span").text("start: " + u.fmtTime(tr.tMin));
                tip.append("span").text("end:  " + u.fmtTime(tr.tMax));
                var fmt = d3.format(".2f");
                var duration = (tr.tMax - tr.tMin) / 1000;
                if (duration > 24 * 60 * 60)
                    duration = "duration: " + fmt(duration / 24 / 60 / 60) + " d";
                else if (duration > 60 * 60)
                    duration = "duration: " + fmt(duration / 60 / 60) + " h";
                else if (duration > 60)
                    duration = "duration: " + fmt(duration / 60) + " m";
                else
                    duration = "duration: " + fmt(duration) + " s";
                tip.append("span").text(duration);
                tip.style("left", x);
                tip.style("display", null);
                var sel = ctx_1.default().window.getSelection();
                if (sel)
                    sel.selectAllChildren(tip.node());
            }
            else {
                tip.style("display", "none");
            }
        };
        // event capture region so we can move markers (if supplied
        // when our constructor was called), and provide tip with this
        // time axis
        var evr = markers.addEventRegion(topDiv, markerSet, tr, setTip);
        // add zoom drag behavior to time axes
        new ranger.Ranger(evr, function (xMin, xMax) {
            var tMin = tr.x2t(xMin, 0, 1);
            var tMax = tr.x2t(xMax, 0, 1);
            ctx_1.default().showRangeAction(new u.TimeRange(tMin, tMax));
        });
        // double click means show whole range
        if (zoomTr) {
            evr.on("dblclick", function () {
                ctx_1.default().showRangeAction(null);
            });
        }
        // compute and add tick labels. The nested svg allows us to
        // specify a smaller font without disturbing meaning of em for top
        var svg = topSvg.append("svg")
            .style("width", "100%")
            .style("font-size", "80%")
            .style("overflow", "visible");
        // compute and add tick labels and ticks
        var prevDate = undefined;
        for (var i = 0; i < ticks.length; i++) {
            // tick for time t goes at position x
            var t = ticks[i];
            var x = pct(t2x(t));
            // add label
            var dateTime = new Date(t).toISOString();
            var date = dateTime.substr(2, 8);
            var time = dateTime.substr(11, 8);
            var text = svg.append("text")
                .attr("y", "2em")
                .style("text-anchor", "middle");
            text.append("tspan").attr("x", x).html(time);
            if (date != prevDate)
                text.append("tspan").attr("x", x).attr("dy", "-1em").html(date);
            prevDate = date;
            // add tick
            var y1 = zoomTr ? "-20%" : /*"100%"*/ "-20%";
            var y2 = zoomTr ? "140%" : "1e6%"; /* xxx too tall */
            svg.append("line")
                .classed("timeaxis-tick", true)
                .attr("x1", x).attr("y1", y1)
                .attr("x2", x).attr("y2", y2);
        }
    }
    return TimeAxis;
}());
exports.TimeAxis = TimeAxis;
//# sourceMappingURL=timeaxis.js.map