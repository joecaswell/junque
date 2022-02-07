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
var d3 = require("d3");
var ctx_1 = require("./ctx");
var descriptors = require("./descriptors");
var markers = require("./markers");
var ranger = require("./ranger");
var timeaxis = require("./timeaxis");
var u = require("./util");
var viewselector = require("./viewselector");
var icons = require("./icons");
// xxx missing d3 function - move to util?
function nextSibling(selection) {
    var node = selection.node().nextSibling;
    return node ? d3.select(node) : null;
}
////////////////////////////
//
// A Curve represents a series of y values derived from a single
// metric together with a timebase, which provides the times for each
// y value.
//
// A curve also has a color and fill. Those will depend on whether the
// Curve shares the Chart with other curves, so they are set later.
//
var Curve = /** @class */ (function () {
    function Curve(tr, ts, ys, alerts, desc, source, tag) {
        this.tr = tr;
        this.ts = ts;
        this.ys = ys;
        this.alerts = alerts;
        this.desc = desc;
        this.source = source;
        this.tag = tag;
        this.name = desc.name; // xxx guess this is redundant w/ this.desc
        this.treeLevel = desc.treeLevel;
        this.infoTip = desc.infoTip;
        this.distinctName = desc.distinctName;
        this.alwaysFill = !!desc.alwaysFill;
        // compute min/max for both data and for chart
        this.yMinData = d3.min(ys);
        this.yMaxData = d3.max(ys);
        this.yMinChart = 0;
        this.yMaxChart = desc.yMax ? desc.yMax : this.yMaxData;
        // compute average
        var ySum = 0;
        for (var i = 0; i < ys.length; i++)
            ySum += ys[i];
        this.yAvg = ySum / ys.length;
        // get the sort order, taking into account how we sort by source and possibly by data
        this.order = descriptors.getOrder(desc, source, this.yMaxData);
    }
    // unfortunately we can't use svg transforms to transform directly
    // from data to screen coordinates because of range and precision
    // limitations, so we transform to ts and ys to the range (0,1)
    // before passing to svg
    Curve.prototype.addTo = function (svg, yMax, fillPass) {
        function curve(ts, ys, color) {
            // construct the path
            var path = [];
            var penUp = true;
            for (var j = 0; j < ys.length; j++) {
                if (ys[j] == null) { // xxx Nan?
                    penUp = true;
                }
                else if (penUp) {
                    path.push('M', ts[j], ys[j]);
                    path.push('L', ts[j], ys[j]); // make single-point lines visible
                    penUp = false;
                }
                else {
                    path.push('L', ts[j], ys[j]);
                }
            }
            // add it to the svg element
            svg.append("path")
                .style("stroke-width", 1)
                .style("vector-effect", "non-scaling-stroke")
                .attr("d", path.join(" "))
                .style("stroke", color)
                .style("fill", "none")
                .style("stroke-linecap", "round"); // make single-point fill visible
        }
        function ramps(ts, ys, ratio, color) {
            // construct the ramps
            var path = [];
            for (var i = 0; i < ys.length; i++) {
                if (ys[i] != null && ys[i] > 0) {
                    path.push('M', ts[i], ys[i]);
                    path.push('L', ts[i] - ys[i] * ratio, 0);
                }
            }
            // add it to the svg element
            svg.append("path")
                .style("stroke-width", 1)
                .style("vector-effect", "non-scaling-stroke")
                .attr("d", path.join(" "))
                .style("stroke", color)
                .style("fill", "none")
                .style("stroke-linecap", "round"); // make single-point visible
        }
        function filledRamps(ts, ys, ratio, color) {
            // construct the ramps
            for (var i = 0; i < ys.length; i++) {
                if (ys[i] != null) {
                    var path = [];
                    path.push('M', ts[i], ys[i]);
                    path.push('L', ts[i] - ys[i] * ratio, 0);
                    path.push('L', ts[i], 0);
                    path.push('Z');
                    svg.append("path")
                        .attr("d", path.join(" "))
                        .style("stroke", "none")
                        .style("fill", color)
                        .style("opacity", 0.05);
                }
            }
        }
        function fill(ts, ys, color) {
            // close the path
            function close(x0) {
                if (!penUp) {
                    path.push('L', x0, 0);
                    path.push('L', penDownAt, 0);
                    path.push('Z');
                    penUp = true;
                }
            }
            // construct the path
            var path = [];
            var penUp = true;
            var penDownAt = null;
            for (var j = 0; j < ys.length; j++) {
                if (ys[j] == null) { // xxx Nan?
                    close(ts[j - 1]);
                }
                else if (penUp) {
                    path.push('M', ts[j], ys[j]);
                    penUp = false;
                    penDownAt = ts[j];
                }
                else {
                    path.push('L', ts[j], ys[j]);
                }
            }
            close(ts[ts.length - 1]);
            // add it to the svg element
            svg.append("path")
                .style("stroke-width", 1)
                .style("vector-effect", "non-scaling-stroke")
                .attr("d", path.join(" "))
                .style("stroke", color) // make single-point fill visible
                .style("fill", color);
        }
        // xxx this is more general than fill, so consider using it in
        // place of fill, but need to evaluate performance as
        // multiFill is more complex so probably more expensive, and
        // fill us used on a lot of charts
        function multiFill(ts, ys, alerts) {
            // close the path
            function close(x, y, add) {
                if (!penUp) {
                    path.push('L', x, y);
                    path.push('L', x, 0);
                    path.push('Z');
                    if (add) {
                        svg.append("path")
                            .style("stroke-width", 1)
                            .style("vector-effect", "non-scaling-stroke")
                            .attr("d", path.join(" "))
                            .classed(lastAlert, true);
                        path.length = 0;
                    }
                    penUp = true;
                }
            }
            // construct the path
            var path = [];
            var penUp = true;
            var lastAlert = null;
            for (var j = 0; j < ys.length; j++) {
                if (ys[j] == null) { // xxx Nan?
                    close(ts[j - 1], ys[j - 1], true);
                }
                else {
                    if (alerts[j] != lastAlert) {
                        var x = (ts[j] + ts[j - 1]) / 2;
                        var y = (ys[j] + ys[j - 1]) / 2;
                        close(x, y, true);
                    }
                    if (penUp) {
                        if (j > 0 && ys[j - 1] != null) {
                            var x = (ts[j] + ts[j - 1]) / 2;
                            var y = (ys[j] + ys[j - 1]) / 2;
                            path.push('M', x, 0);
                            path.push('L', x, y);
                            path.push('L', ts[j], ys[j]);
                        }
                        else {
                            var x = ts[j];
                            var y = ys[j];
                            path.push('M', x, 0);
                            path.push('L', x, y);
                        }
                        penUp = false;
                    }
                    else {
                        path.push('L', ts[j], ys[j]);
                    }
                }
                lastAlert = alerts[j];
            }
            close(ts[ts.length - 1], ys[ys.length - 1], true);
        }
        // Scale t values into svg viewbox range, which is 0 to 1
        // also apply chart shift here
        var tsScaled = new Array(this.ts.length);
        var shift = ctx_1.default().dataset.getShift(this.source);
        for (var i = 0; i < this.ts.length; i++)
            tsScaled[i] = (this.ts[i] + shift - this.tr.tMin) / (this.tr.tMax - this.tr.tMin);
        // Scale y values into svg view box range, which is 0 to 1
        // logarithmic scaling is applied here
        var ysScaled = new Array(this.ys.length);
        var logMin = this.desc.logMin;
        if (logMin) {
            var min = Math.log(logMin);
            var range = Math.log(yMax) - min;
            for (var i = 0; i < this.ys.length; i++) {
                var y = this.ys[i];
                if (y < logMin)
                    y = logMin / 2;
                ysScaled[i] = (Math.log(y) - min) / range - 0.05; // make logMin drop off chart
            }
        }
        else {
            for (var i = 0; i < this.ys.length; i++)
                ysScaled[i] = this.ys[i] == null ? null : this.ys[i] / yMax;
        }
        // Add the graphics
        if (this.desc.style == "ramps") {
            if (!fillPass) {
                var ratio = yMax / (this.tr.tMax - this.tr.tMin);
                ramps(tsScaled, ysScaled, ratio, this.color);
            }
        }
        else if (this.desc.style == "filledRamps") {
            if (!fillPass) {
                var ratio = yMax / (this.tr.tMax - this.tr.tMin);
                filledRamps(tsScaled, ysScaled, ratio, this.color);
            }
        }
        else {
            if (!fillPass) {
                curve(tsScaled, ysScaled, this.color);
            }
            else if (this.alerts && ctx_1.default().options.showAlerts) {
                multiFill(tsScaled, ysScaled, this.alerts);
            }
            else if (this.fill) {
                fill(tsScaled, ysScaled, "#EEEEEE");
            }
        }
    };
    // xxx autoscale?
    Curve.prototype.formatValues = function (table, t) {
        var tr = table.append("tr");
        var value = fmtStat(this.sample(t));
        tr.append("td").classed("stat", true).append("div").html(value);
        tr.append("td").classed("units", true).append("div").html(this.desc.units || "");
        if (this.tag)
            tr.append("td").classed("tag", true).append("div").html(this.tag);
        tr.append("td").classed("name", true).append("div").html(this.name);
    };
    Curve.prototype.sample = function (t) {
        return u.sample(this.ts, this.ys, t);
    };
    return Curve;
}()); // Curve
////////////////////////////
//
// A Chart is set of Curves sharing a timebase displayed on a single
// x,y axis.
//
// xxx could (or should) this be done with css instead?
var chartWidth = "28em";
var Chart = /** @class */ (function () {
    function Chart(chartSet, source, tag, chartSize) {
        this.unitScale = 1; // amount to scale by for display in units
        this.chartSet = chartSet;
        this.source = source;
        this.tag = tag;
        this.chartSize = chartSize;
        this.chartCache = this.chartSet.cacheEntry.chartCache;
        this.curves = [];
        this.treeChildren = [];
    }
    // colors to use if there are multiple curves
    Chart.prototype.color = function (i) {
        var colors = [
            'rgb(50,102,204)',
            'rgb(220,57,24)',
            'rgb(255,180,0)',
            'rgb(153,20,153)',
            'rgb(20,150,24)',
            'rgb(200,200,200)'
        ];
        return i < colors.length ? colors[i] : colors[colors.length - 1];
    };
    // map curve i to a color. Uses desc.color if specified, else uses curve number
    Chart.prototype.curveColor = function (i) {
        return this.color(this.curves[i].desc.color || i);
    };
    // merge a set of names. Common prefix and suffix are black;
    // distinguishing words are color coded to match the curve colors
    // optionally set curves[i].distinctName if it's not already set (e.g. by descriptor)
    Chart.prototype.mergeNames = function (names, setDistinctNames, sep) {
        var x = u.stripCommonPrefixAndSuffix(names, sep);
        var mid = "";
        for (var i = 0; i < x.mid.length; i++) {
            if (setDistinctNames)
                if (!this.curves[i].distinctName)
                    this.curves[i].distinctName = x.mid[i];
            if (i > 0)
                mid += " ";
            mid += "<span style='color:" + this.curveColor(i) + "'>" + x.mid[i] + "</span>";
        }
        return { pfx: x.pfx, mid: mid, sfx: x.sfx };
    };
    // compute cache key for this chart: include source and id for all curves on chart
    // include chartSize which determines how tall the chart is
    // also include yMaxChart which can vary depending on options (e.g. commonScale)
    // this will allow us to re-use the computed svg for this chart
    Chart.prototype.chartCacheKey = function () {
        var key = this.source + ":" + this.yMaxChart + ":" + this.chartSize + ":" +
            (ctx_1.default().options.showAlerts ? "alerts" : "noalerts") + ":" +
            this.curves.map(function (curve) { return curve.desc.id; }).join(",");
        return key;
    };
    // add a curve to our list
    // after adding all call finish() to compute stuff across curves like stats, colors, etc.
    Chart.prototype.addCurve = function (curve) {
        this.curves.push(curve);
    };
    // compute stuff across curves like stats, colors, etc.
    Chart.prototype.finish = function () {
        // sort curves by requested order so labels come out in right order
        this.curves.sort(descriptors.sortOrder);
        this.order = this.curves[0].order;
        // compute our stats
        this.yMinChart = 0;
        this.yMinData = Infinity;
        this.yMaxData = this.yMaxChart = -Infinity;
        for (var i in this.curves) {
            var curve = this.curves[i];
            if (curve.yMaxData > this.yMaxData)
                this.yMaxData = curve.yMaxData;
            if (curve.yMaxChart > this.yMaxChart)
                this.yMaxChart = curve.yMaxChart;
            if (curve.yMinData < this.yMinData)
                this.yMinData = curve.yMinData;
        }
        // color the curves and compute our name and stats
        if (this.curves.length > 1) {
            // compute merged colorized name for merged charts, setting curve[*].distinctName
            var merged = this.mergeNames(this.curves.map(function (curve) { return curve.name; }), true, " ");
            this.name = merged.pfx + merged.mid + merged.sfx;
            // compute infoTip
            // xxx compute lazily?
            if (this.curves.some(function (c) { return !!c.infoTip; })) {
                // try to generate merged infoTip
                if (this.curves.every(function (c) { return !!c.infoTip; })) {
                    var tips = this.curves.map(function (curve) { return curve.infoTip.replace(/ +/g, ' '); });
                    var merged_1 = this.mergeNames(tips, false, "[. ]");
                    if (merged_1.pfx.length + merged_1.sfx.length > 20 /* xxx better hack? */) {
                        this.infoTip = merged_1.pfx + merged_1.mid + merged_1.sfx;
                    }
                }
                // didn't generate merged intoTip, so generate table
                if (!this.infoTip) {
                    this.infoTip = "<table>";
                    for (var i = 0; i < this.curves.length; i++) {
                        var curve = this.curves[i];
                        if (curve.infoTip) {
                            var td = "<td style='color:" + this.curveColor(i) + "'>";
                            this.infoTip += "<tr>" + td + curve.distinctName + "&nbsp;</td>";
                            this.infoTip += "<td>" + curve.infoTip + "</td></tr>";
                        }
                    }
                }
            }
            // yAvg is meaningless
            this.yAvg = NaN;
            // assign colors
            for (var i = 0; i < this.curves.length; i++) {
                this.curves[i].color = this.curveColor(i);
                this.curves[i].fill = this.curves[i].alwaysFill;
            }
        }
        else {
            this.name = this.curves[0].name;
            this.infoTip = this.curves[0].infoTip;
            this.yAvg = this.curves[0].yAvg;
            this.curves[0].color = "black";
            this.curves[0].fill = true;
        }
        // If we're part of a tree note it, and construct the tree data structue.
        // Note that this requires that the tree be fed to us in depth-first traversal order.
        // That requires that the tree node metrics be generated at the source in that order,
        // and that that order be preserved by t2 as the metrics are read.
        // xxx consider adding a Desc.parentMetric instead
        this.treeLevel = this.curves[0].treeLevel;
        if (this.treeLevel != undefined) {
            if (this.treeLevel == 0)
                this.chartSet.treeRoots.push(this);
            var ts = this.chartSet.treeStack;
            var top_1 = ts.pop();
            while (top_1 && top_1.treeLevel >= this.treeLevel) {
                top_1 = ts.pop();
            }
            if (top_1) {
                top_1.treeChildren.push(this);
                ts.push(top_1);
            }
            this.treeParent = top_1;
            ts.push(this);
        }
        // xxx check if all same?
        this.units = this.curves[0].desc.units;
        this.autoScale = this.curves[0].desc.autoScale;
    };
    Chart.prototype.addTo = function (parent, // parent for chart
    yLabels, // parent for y axis labels
    cacheStats) {
        var e_1, _a;
        var _this = this;
        // extra space allowed within svg
        var extraTop = 0.02; // allows for >0 line width of curves not to be clipped
        var extraBot = 0.05; // allows small negative values to go below 0 baseline
        // we need an element without left/right padding to put stuff into
        this.top = parent.append("div")
            .classed("chart-container", true)
            .style("position", "relative");
        // don't divide by 0 if degenerate
        var yMax = this.yMaxChart == 0 ? 1 : this.yMaxChart;
        if (yMax == undefined)
            throw "empty curve";
        // we'll add ticks if this is a large chart; compute tickDelta,
        // which is the spacing between ticks
        var tickDelta = 0;
        if (this.chartSize == "large") {
            var targetTicks = 5;
            var yMaxScaled = yMax * this.unitScale;
            var m = Math.pow(10, Math.floor(Math.log10(yMaxScaled)));
            tickDelta = yMaxScaled / m / targetTicks;
            try {
                for (var _b = __values([0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10]), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var td = _c.value;
                    if (tickDelta < td) {
                        tickDelta = td * m;
                        break;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            u.log("tickDelta " + tickDelta);
        }
        // look in chart cache
        var chartSvg = this.chartCache.get(this.chartCacheKey());
        //u.log("chartCache[" + this.chartCacheKey + "] -> " + chartSvg)
        if (chartSvg) {
            // cached
            cacheStats.cached++;
            // just add the cached chart svg to the top
            // xxx seems to work, but if height is set as 100% goes wonky here
            this.top.append(function () { return chartSvg.node(); });
        }
        else {
            // not cached
            cacheStats.notCached++;
            // generate the chart
            var vbYMin = -extraTop;
            var vbYMax = 1 + extraBot;
            var chartSvg_1 = this.top
                .append("svg")
                .attr("viewBox", "0 " + vbYMin + " 1 " + (vbYMax - vbYMin))
                .attr("preserveAspectRatio", "none")
                .style("width", chartWidth)
                .classed("chart-size-" + this.chartSize, true); // sets height
            // from curve y coordinates (increase going up) to svg (increase going down)
            var g = chartSvg_1.append("g")
                .attr("transform", "scale(1,-1) translate(0,-1)");
            // first add fill if any
            for (var i = this.curves.length - 1; i >= 0; i--)
                this.curves[i].addTo(g, yMax, true);
            // add ticks if wanted
            if (tickDelta) {
                var yMaxScaled = yMax * this.unitScale;
                var tickPath = "";
                for (var i = 0; i * tickDelta <= yMaxScaled; i++) {
                    var tick = tickDelta * i / yMaxScaled;
                    tickPath += "M " + 0 + "," + tick + " L " + 1 + "," + tick + " ";
                }
                g.append("path")
                    .classed("yaxis-tick", true)
                    .style("stroke-width", 1)
                    .style("vector-effect", "non-scaling-stroke")
                    .attr("d", tickPath);
            }
            // then overlay with curves
            // do this in reverse order, so first curve overlays others,
            // assuming first curve is most important
            for (var i = this.curves.length - 1; i >= 0; i--)
                this.curves[i].addTo(g, yMax, false);
            // cache it
            this.chartCache.set(this.chartCacheKey(), chartSvg_1);
            //u.log("chartCache[" + this.chartCacheKey + "] <- " + chartSvg)
        }
        // do tick y labels if graph has ticks
        if (tickDelta) {
            var yMaxScaled = yMax * this.unitScale;
            var labelDiv = yLabels.append("div")
                .classed("chart-size-" + this.chartSize, true) // sets height
                .style("position", "relative");
            var m = 1;
            while (m * tickDelta < 1000)
                m *= 10;
            tickDelta = Math.round(tickDelta * m); // avoid precision issues for formatted number
            for (var tick = 0; tick <= m * yMaxScaled; tick += tickDelta) {
                var y = tick / m;
                var yPct = (y / yMaxScaled / (1 + extraBot + extraTop) + extraTop) * 100;
                labelDiv.append("span")
                    .classed("y-label", true)
                    .style("position", "absolute")
                    .style("bottom", yPct + '%')
                    .style("right", 0)
                    .style("transform", "translate(0, 50%)")
                    .text(y);
            }
        }
        // "tip" box for showing chart values
        this.valueTip = this.top.append("div")
            .classed("tip", true)
            .classed("valueTip", true)
            .style("display", "none");
        // event capture region so we can move markers and tip with this chart
        var evr = markers.addEventRegion(this.top, this.chartSet.markerSet, this.chartSet.tr, function (x, t) { return _this.setValueTip(x, t); });
        // double click moves chart in or out of view
        evr.on("dblclick", function () {
            var descs = [];
            var move = function (chart) {
                var e_2, _a;
                try {
                    for (var _b = __values(chart.curves), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var curve = _c.value;
                        descs.push(curve.desc);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            };
            if (_this.treeLevel != undefined) {
                // move entire tree in our out of view
                var moveTree_1 = function (chart) {
                    var e_3, _a;
                    move(chart);
                    try {
                        for (var _b = __values(chart.treeChildren), _c = _b.next(); !_c.done; _c = _b.next()) {
                            var c = _c.value;
                            moveTree_1(c);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                };
                var root = _this;
                while (root.treeParent)
                    root = root.treeParent;
                moveTree_1(root);
            }
            else {
                // move just this chart
                move(_this);
            }
            ctx_1.default().views.getView(_this.chartSet.viewName).toggleMembershipAction(descs);
        });
        // give chart ranger capability - enables zoom like on TimeAxis
        new ranger.Ranger(evr, function (xMin, xMax) {
            var tMin = _this.chartSet.tr.x2t(xMin, 0, 1);
            var tMax = _this.chartSet.tr.x2t(xMax, 0, 1);
            ctx_1.default().showRangeAction(new u.TimeRange(tMin, tMax));
        });
    };
    Chart.prototype.formatValues = function (table, t) {
        var shift = ctx_1.default().dataset.getShift(this.source);
        for (var i in this.curves)
            this.curves[i].formatValues(table, t - shift);
    };
    // format a tip with value(s) at time t at the specified x position
    Chart.prototype.setValueTip = function (x, t) {
        // show the tip
        if (x != null) {
            var units = this.units || "";
            var shift = ctx_1.default().dataset.getShift(this.source);
            // format chart values tip as a table
            this.valueTip.html("");
            var table = this.valueTip.append("table");
            // first row of table is date
            table.append("tr").append("td").attr("colspan", 3).text(new Date(t).toISOString());
            // for each curve of the chart
            for (var i = 0; i < this.curves.length; i++) {
                // table row for that curve
                var tr = table.append("tr");
                // for merged charts include the unique portion of the name in the appropriate color
                if (this.curves.length > 1) {
                    var name_1 = this.curves[i].distinctName;
                    var color = this.curveColor(i);
                    tr.append("td").style("color", color).text(name_1);
                }
                // the chart value itself. For merged charts value is
                // right-aligned with units in a separate column in first row only
                var y = this.curves[i].sample(t - shift) * this.unitScale;
                var text = fmtStat(y) + " ";
                if (this.curves.length > 1) {
                    tr.append("td").style("text-align", "right").html(text);
                    if (i == 0)
                        tr.append("td").text(units);
                }
                else {
                    tr.append("td").html(text + units);
                }
            }
            // display it at the specified x position
            this.valueTip.style("left", x);
            this.valueTip.style("display", null);
            // select the text in the tip so we can copy it with ^c
            // css styles the selected text so it looks like ordinary text
            var sel = ctx_1.default().window.getSelection();
            if (sel)
                sel.selectAllChildren(this.valueTip.node());
            ctx_1.default().status.set("type cmd-c to copy chart values at cursor to clipboard", 0, false);
        }
        else {
            // hide the tip (when mouse leaves the chart area)
            this.valueTip.style("display", "none");
        }
    };
    return Chart;
}()); // Chart
exports.Chart = Chart;
////////////////////////////
//
// ChartRow creates a new row and defines the layout of columns
// within each row of the charts table
//
var ChartRow = /** @class */ (function () {
    function ChartRow(table, chartSize) {
        this.tr = table.append("tr")
            .classed("chart-row", true)
            .classed("chart-row-" + chartSize, true);
        this.avgCol = this.tr.append("td").classed("stat", true);
        this.maxCol = this.tr.append("td").classed("stat", true);
        this.unitsCol = this.tr.append("td").classed("units", true);
        this.chartCol = this.tr.append("td").classed("chart", true);
        this.tagCol = this.tr.append("td").classed("tag", true);
        this.nameCol = this.tr.append("td").classed("name", true);
    }
    ChartRow.preChartCols = 3; // number of columns before chart; used for colspan
    return ChartRow;
}());
exports.ChartRow = ChartRow;
var LargeChartRow = /** @class */ (function () {
    function LargeChartRow(table) {
        this.tr = table.append("tr")
            .classed("chart-row", true)
            .classed("chart-row-large", true);
        this.statsCol = this.tr.append("td").classed("stat", true);
        this.yLabelCol = this.tr.append("td").classed("y-label", true)
            .attr("colspan", 2);
        this.chartCol = this.tr.append("td").classed("chart", true);
        this.tagCol = this.tr.append("td").classed("tag", true);
        this.nameCol = this.tr.append("td").classed("name", true);
    }
    return LargeChartRow;
}());
exports.LargeChartRow = LargeChartRow;
var HeadingRow = /** @class */ (function () {
    function HeadingRow(table) {
        this.tr = table.append("tr");
        this.headingCol = this.tr.append("td")
            .classed("heading", true)
            .attr("colspan", ChartRow.preChartCols);
        this.chartCol = this.tr.append("td").classed("chart", true);
    }
    return HeadingRow;
}());
////////////////////////////
//
// SectionHeadings manages the section heading rows of a table, adding
// open/close section behavior.
// xxx generalize, pull out, re-use for dataset table?
//
var SectionHeadings = /** @class */ (function () {
    function SectionHeadings(table) {
        this.table = table;
        // list of sections that are closed
        // register with undo/redo, and restore our state if there was state from a previous
        // instance xxx this makes section heading state always sticky - ok?
        var initialState = {};
        this.closedIds = ctx_1.default().undo.registerClient("sectionHeadings", this, initialState);
        // map from sectioIds to sections
        this.allSections = {};
    }
    // called by undo/redo to set heading state
    SectionHeadings.prototype.restoreState = function (newState) {
        this.closedIds = newState;
        this.updateAllSections();
    };
    // open or close all sections
    SectionHeadings.prototype.updateAllSections = function () {
        for (var sectionId in this.allSections)
            this.updateSection(sectionId);
    };
    // open or close a section according to it's (new) state in closedIds
    SectionHeadings.prototype.updateSection = function (sectionId) {
        var tr = this.allSections[sectionId];
        var closed = !!this.closedIds[sectionId];
        // update twisty
        var path = closed ? "M .2 0  L .2 1  L 1 .5 Z" : "M 0 .2  L 1 .2  L .5 1 Z";
        tr.select("td svg path").attr("d", path);
        // show/hide charts in section
        for (var sib = nextSibling(tr); sib && sib.classed("chart-row"); sib = nextSibling(sib))
            sib.style("display", function () { return closed ? "none" : null; });
    };
    SectionHeadings.prototype.addSectionHeading = function (sectionName, inOrOut) {
        var _this = this;
        var row = new HeadingRow(this.table);
        // section may occur both in and out of view, so we prepend "in" or "out" to distinguish
        var sectionId = inOrOut + "-" + sectionName.replace(/ /g, "");
        this.allSections[sectionId] = row.tr;
        // the tr has an identifying id, is classed "section-heading"
        // and handles the click event to open/close the section
        row.tr
            .attr("id", sectionId)
            .classed("section-heading-row", true)
            .on('click', function () {
            // toggle section between open and closed in response to click on section heading
            var isClosed = !!_this.closedIds[sectionId];
            if (isClosed)
                delete _this.closedIds[sectionId];
            else
                _this.closedIds[sectionId] = "closed";
            _this.updateSection(sectionId);
            ctx_1.default().undo.updateState({ sectionHeadings: _this.closedIds });
        });
        // twisty indicates whether section is open or closed
        row.headingCol.append("svg")
            .classed("section-heading-twisty", true)
            .attr("viewBox", "0 0 1 1")
            .append("path");
        // finally emit the section heading itself
        row.headingCol
            .classed("section-heading", true)
            .append("span")
            .html(" " + sectionName);
    };
    return SectionHeadings;
}()); // SectionHeadings
////////////////////////////
//
// ChartSet renders a set of charts in the specified table
//
// processedData is a map from descriptors to arrays of values - see data.js for more info
// each value represents a single sample
// all value arrays must have the same length
//
// function to format a stat such as avg or max for display
// xxx - util.js?
function fmtStat(x) {
    if (x == null || !isFinite(x))
        return "<span class='quiet'>n/a</span>";
    else
        return d3.format(",.3f")(x);
}
var ChartSet = /** @class */ (function () {
    function ChartSet(table, cacheEntry, overviewRange, tr, viewName) {
        this.table = table;
        this.viewName = viewName;
        this.cacheEntry = cacheEntry;
        this.tr = tr;
        this.treeStack = [];
        this.treeRoots = [];
        // get our data from the cache entry
        this.numSources = Object.keys(this.cacheEntry.processedSourceData).length;
        // if we're not displaying the whole time range of the data set show an overview TimeAxis
        if (overviewRange) {
            var row = new HeadingRow(this.table);
            new timeaxis.TimeAxis(null, row.chartCol, chartWidth, overviewRange, this.tr);
            //row.nameCol.html("overview timeline")
        }
        // add markers
        var markersRow = new HeadingRow(this.table);
        markersRow.headingCol.attr("rowspan", 2);
        // markers in same row
        this.markerSet = new markers.MarkerSet(markersRow.chartCol, chartWidth, this.tr);
        // add the time labels and graph divisions
        var timeAxisCol = this.table.append("tr").append("td").classed("chart", true);
        new timeaxis.TimeAxis(this.markerSet, timeAxisCol, chartWidth, this.tr, null);
        // manages section headings
        this.sectionHeadings = new SectionHeadings(this.table);
        // remember the charts we've plotted so we can query them for values
        this.allCharts = [];
        // show curves that are in view
        var view = ctx_1.default().views.getView(this.viewName);
        this.show(function (desc) { return view.contains(desc); }, "in", ctx_1.default().options.chartSize);
        // show curves not in view
        viewselector.notInViewHeading(new HeadingRow(this.table).headingCol);
        this.show(function (desc) { return !view.contains(desc); }, "out", "small");
        // now that all the charts are in place we can update the section heading states
        // this may not be all open: on reload we will carry over the previous section heading state
        this.sectionHeadings.updateAllSections();
    }
    ChartSet.prototype.show = function (filter, inOrOut, chartSize) {
        var e_4, _a, e_5, _b, e_6, _c, e_7, _d, e_8, _e, e_9, _f, e_10, _g, e_11, _h, e_12, _j, e_13, _k;
        var _this = this;
        // compute tags if needed. Pass in processedSourceData so that
        // repl set ids can be used for tags if available
        ctx_1.default().dataset.computeTags(this.cacheEntry.processedSourceData);
        // construct the charts for all sources
        var charts = []; // these include all sources
        var scaleGroups = {};
        for (var source in this.cacheEntry.processedSourceData) {
            // get tag for display provided by user for this source
            var tag = this.numSources > 1 ? ctx_1.default().dataset.tags[source] : undefined;
            // get the data for this source
            var processedData = this.cacheEntry.processedSourceData[source];
            // construct the charts for this source, one for each descriptor
            var namedCharts = {}; // xxx Map
            try {
                for (var _l = (e_4 = void 0, __values(processedData.data.keys())), _m = _l.next(); !_m.done; _m = _l.next()) {
                    var desc = _m.value;
                    // anything to do?
                    if (desc.ignore)
                        continue;
                    // filter in or out of view
                    if (!filter(desc))
                        continue;
                    // make a Curve from the processed data
                    var _o = processedData.data.get(desc), ts = _o.ts, ys = _o.ys;
                    var alerts = processedData.alerts.get(desc);
                    var curve = new Curve(this.tr, ts, ys, alerts, desc, source, tag);
                    // record scale groups (curves from separate charts that share a scale)
                    if (desc.scaleGroup) {
                        if (!scaleGroups[desc.scaleGroup])
                            scaleGroups[desc.scaleGroup] = [];
                        scaleGroups[desc.scaleGroup].push(curve);
                    }
                    // add the Curve to a Chart
                    var chartShowsAlerts = desc.alerter && ctx_1.default().options.showAlerts;
                    if (ctx_1.default().options.merge && desc.chart && !chartShowsAlerts) {
                        // we're grouping multiple curves together on a named chart
                        var chart = namedCharts[desc.chart];
                        if (!chart) {
                            var size = curve.treeLevel == undefined ? chartSize : "tree";
                            chart = new Chart(this, source, tag, size);
                            chart.section = desc.section;
                            namedCharts[desc.chart] = chart;
                            charts.push(chart);
                        }
                        chart.addCurve(curve);
                    }
                    else {
                        // chart has a single curve
                        // override chart size if this is a tree so tree lines work
                        var size = curve.treeLevel == undefined ? chartSize : "tree";
                        var chart = new Chart(this, source, tag, size);
                        chart.section = desc.section;
                        chart.addCurve(curve);
                        charts.push(chart);
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_m && !_m.done && (_a = _l.return)) _a.call(_l);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
        // compute updated yMaxChart for each member of a scale group
        // reflecting the max y value for that scale group
        for (var scaleGroup in scaleGroups) {
            var yMaxChart = 0;
            try {
                for (var _p = (e_5 = void 0, __values(scaleGroups[scaleGroup])), _q = _p.next(); !_q.done; _q = _p.next()) {
                    var curve = _q.value;
                    if (curve.yMaxChart > yMaxChart)
                        yMaxChart = curve.yMaxChart;
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_q && !_q.done && (_b = _p.return)) _b.call(_p);
                }
                finally { if (e_5) throw e_5.error; }
            }
            try {
                for (var _r = (e_6 = void 0, __values(scaleGroups[scaleGroup])), _s = _r.next(); !_s.done; _s = _r.next()) {
                    var curve = _s.value;
                    curve.yMaxChart = yMaxChart;
                }
            }
            catch (e_6_1) { e_6 = { error: e_6_1 }; }
            finally {
                try {
                    if (_s && !_s.done && (_c = _r.return)) _c.call(_r);
                }
                finally { if (e_6) throw e_6.error; }
            }
        }
        // if we're doing a common scale across all sources, compute an updated yMaxChart
        // for each Curve based on the yMax for all curves (across all sources) that share
        // that descriptor
        if (ctx_1.default().options.commonScale) {
            var yMaxes = {}; // descriptor.id -> yMax
            try {
                for (var charts_1 = __values(charts), charts_1_1 = charts_1.next(); !charts_1_1.done; charts_1_1 = charts_1.next()) {
                    var chart = charts_1_1.value;
                    try {
                        for (var _t = (e_8 = void 0, __values(chart.curves)), _u = _t.next(); !_u.done; _u = _t.next()) {
                            var curve = _u.value;
                            var yMax = yMaxes[curve.desc.id] || 0;
                            yMaxes[curve.desc.id] = curve.yMaxChart > yMax ? curve.yMaxChart : yMax;
                        }
                    }
                    catch (e_8_1) { e_8 = { error: e_8_1 }; }
                    finally {
                        try {
                            if (_u && !_u.done && (_e = _t.return)) _e.call(_t);
                        }
                        finally { if (e_8) throw e_8.error; }
                    }
                }
            }
            catch (e_7_1) { e_7 = { error: e_7_1 }; }
            finally {
                try {
                    if (charts_1_1 && !charts_1_1.done && (_d = charts_1.return)) _d.call(charts_1);
                }
                finally { if (e_7) throw e_7.error; }
            }
            try {
                for (var charts_2 = __values(charts), charts_2_1 = charts_2.next(); !charts_2_1.done; charts_2_1 = charts_2.next()) {
                    var chart = charts_2_1.value;
                    try {
                        for (var _v = (e_10 = void 0, __values(chart.curves)), _w = _v.next(); !_w.done; _w = _v.next()) {
                            var curve = _w.value;
                            curve.yMaxChart = yMaxes[curve.desc.id];
                        }
                    }
                    catch (e_10_1) { e_10 = { error: e_10_1 }; }
                    finally {
                        try {
                            if (_w && !_w.done && (_g = _v.return)) _g.call(_v);
                        }
                        finally { if (e_10) throw e_10.error; }
                    }
                }
            }
            catch (e_9_1) { e_9 = { error: e_9_1 }; }
            finally {
                try {
                    if (charts_2_1 && !charts_2_1.done && (_f = charts_2.return)) _f.call(charts_2);
                }
                finally { if (e_9) throw e_9.error; }
            }
        }
        try {
            // having added all the Curves, now finish Charts,
            // computing aggregate stats, colors, etc.
            for (var charts_3 = __values(charts), charts_3_1 = charts_3.next(); !charts_3_1.done; charts_3_1 = charts_3.next()) {
                var chart = charts_3_1.value;
                chart.finish();
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (charts_3_1 && !charts_3_1.done && (_h = charts_3.return)) _h.call(charts_3);
            }
            finally { if (e_11) throw e_11.error; }
        }
        // sort Charts by order provided by desc
        charts.sort(descriptors.sortOrder);
        // now that we've sorted, add this batch of charts
        // xxx doing this here means formatValues for Info will show first in- then out-of-view,
        //     i.e. same order as seen by user in the Charts view - ok?
        this.allCharts = this.allCharts.concat(charts);
        // add the Charts, section headings,  and the stats to the table
        var currentSection = null;
        var cacheStats = { cached: 0, notCached: 0 }; // count cache usage for debugging
        var showing = 0;
        var _loop_1 = function (chart) {
            // skip if we're not showing 0s
            if (chart.yMaxData == 0 && !ctx_1.default().options.showZero && !chart.curves[0].desc.showZero)
                return "continue";
            // check whether user has chosen in Dataset not to show
            // this source
            //
            // note we do this here instead of the loop above where we
            // constructed chart so that we can still compute the
            // common vertical scale for metrics across all sources,
            // whether hidden or not
            if (ctx_1.default().dataset.hide[chart.source])
                return "continue";
            // show section heading every time we encounter a new section
            if (chart.section != currentSection && ctx_1.default().options.showHeadings) {
                this_1.sectionHeadings.addSectionHeading(chart.section, inOrOut);
                currentSection = chart.section;
            }
            // autoscale if requested
            if (ctx_1.default().options.autoScale || chart.autoScale) {
                var values = { unitScale: chart.unitScale };
                var units = chart.units || "";
                var yMax = chart.yMaxChart;
                chart.units = u.autoScale(chart.autoScale || "auto", units, yMax, values);
                chart.unitScale = values.unitScale;
            }
            // two different layouts, one for large, one for medium/small
            if (chart.chartSize != "large") {
                // small and medium charts
                chart.row = new ChartRow(this_1.table, chart.chartSize);
                // we put avg in col 1, max in col 2, units in col 3
                chart.row.avgCol
                    .html(fmtStat(chart.yAvg * chart.unitScale))
                    .attr("title", "avg");
                chart.row.maxCol
                    .html(fmtStat(chart.yMaxData * chart.unitScale))
                    .attr("title", "max");
                chart.row.unitsCol.html(chart.units || "");
                // Chart puts chart in chartCol (col 4)
                chart.addTo(chart.row.chartCol, null, cacheStats);
            }
            else {
                // large chart
                chart.row = new LargeChartRow(this_1.table);
                // we put stats vertically in col 1
                var statDiv_1 = chart.row.statsCol.append("div")
                    .style("position", "relative")
                    .style("display", "flex")
                    .style("flex-direction", "column");
                var statRow = function (name, value) {
                    var row = statDiv_1.append("span")
                        .style("display", "flex")
                        .style("flex-direction", "row");
                    row.append("span").html(name + "&nbsp;&nbsp;&nbsp;").classed("stat-name", true);
                    var valueString = fmtStat(value * chart.unitScale);
                    row.append("span").style("margin-left", "auto").html(valueString);
                };
                statRow("max", chart.yMaxData); // emit max
                statRow("avg", chart.yAvg); // emit avg
                statRow("min", chart.yMinData); // emit min
                statDiv_1.append("span") // units go just to right of top stat (max)
                    .classed("stat-units", true)
                    .style("position", "absolute")
                    .style("left", "calc(100% + 0.5em)")
                    .text(chart.units || "");
                // Chart puts y axis labels in col 2-3, chart in col 4
                chart.addTo(chart.row.chartCol, chart.row.yLabelCol, cacheStats);
            }
            // tag, if any
            if (chart.tag) {
                chart.row.tagCol.html(chart.tag);
            }
            else {
                chart.row.tagCol.style("display", "none"); // avoid padding (if any)
            }
            // if ordinary chart just set name here; will handle tree later
            if (chart.treeLevel == undefined) {
                chart.row.nameCol.html(chart.name);
            }
            // add infoTip
            if (chart.infoTip) {
                var infoTip_1 = chart.row.nameCol.append("div")
                    .html(chart.infoTip)
                    .classed("tip", true)
                    .classed("infoTip", true)
                    .on('click', function () { return d3.event.stopPropagation(); });
                var button = chart.row.nameCol.append("span")
                    .on("click", function () {
                    if (_this.currentInfoTip != infoTip_1) {
                        d3.event.stopPropagation();
                        if (_this.currentInfoTip)
                            _this.currentInfoTip.style('display', 'none');
                        infoTip_1.style('display', 'block');
                        _this.currentInfoTip = infoTip_1;
                    }
                })
                    .classed("infoTipButton", true);
                icons.tip(button);
            }
            // dismiss currently open infotip on any click on the name column
            chart.row.nameCol.on("click", function () {
                if (_this.currentInfoTip) {
                    _this.currentInfoTip.style('display', 'none');
                    _this.currentInfoTip = null;
                }
            });
            // keep statistics
            showing++;
        };
        var this_1 = this;
        try {
            for (var charts_4 = __values(charts), charts_4_1 = charts_4.next(); !charts_4_1.done; charts_4_1 = charts_4.next()) {
                var chart = charts_4_1.value;
                _loop_1(chart);
            }
        }
        catch (e_12_1) { e_12 = { error: e_12_1 }; }
        finally {
            try {
                if (charts_4_1 && !charts_4_1.done && (_j = charts_4.return)) _j.call(charts_4);
            }
            finally { if (e_12) throw e_12.error; }
        }
        var _loop_2 = function (treeRoot) {
            // set chart name, adding graphics for tree and current tree state 
            var setTreeName = function (chart) {
                // xxx would be more efficient to update only the icon part
                chart.row.nameCol.html("");
                // icon to indicate tree state
                var icons = { 'open': '▽', 'partlyOpen': '◇', 'closed': '▷', 'leaf': '⚬' };
                var icon = icons[chart.treeChildren.length ? chart.treeState : 'leaf'];
                // add tree lines and behavior
                chart.row.nameCol
                    .append("span")
                    .classed("treeLines", true)
                    .html(chart.treePfx + icon)
                    .on("click", function () {
                    u.log("click", chart.treeLevel, chart.name);
                    if (chart.treeState == 'open')
                        treeClose(chart);
                    else if (chart.treeState == 'closed')
                        treeOpen(chart, false);
                    else
                        treeOpen(chart, true);
                });
                // add chart name
                chart.row.nameCol.append("span").html(chart.name);
            };
            var treeOpen = function (chart, full) {
                var e_14, _a;
                chart.treeState = full ? 'open' : 'partlyOpen';
                chart.row.tr.classed('treeHidden', false);
                setTreeName(chart);
                try {
                    for (var _b = (e_14 = void 0, __values(chart.treeChildren)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var c = _c.value;
                        if (full)
                            treeOpen(c, full);
                        else
                            treeClose(c);
                    }
                }
                catch (e_14_1) { e_14 = { error: e_14_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_14) throw e_14.error; }
                }
            };
            var treeClose = function (chart, hide) {
                var e_15, _a;
                if (hide === void 0) { hide = false; }
                chart.treeState = 'closed';
                chart.row.tr.classed('treeHidden', hide);
                if (!hide)
                    setTreeName(chart);
                try {
                    for (var _b = (e_15 = void 0, __values(chart.treeChildren)), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var c = _c.value;
                        treeClose(c, true);
                    }
                }
                catch (e_15_1) { e_15 = { error: e_15_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_15) throw e_15.error; }
                }
            };
            // compute tree lines by traversing tree from root
            var computeTreePfx = function (chart, pfx) {
                var tree_line = '│';
                var tree_mid = '├';
                var tree_last = '└';
                var tree_blank = '&nbsp;';
                //u.log('prt', chart.name, chart.treeLevel, chart.treeChildren.length, pfx)
                for (var i = 0; i < chart.treeChildren.length; i++) {
                    var child = chart.treeChildren[i];
                    if (i < chart.treeChildren.length - 1)
                        child.treePfx = pfx + tree_mid;
                    else if (i > 0)
                        child.treePfx = pfx + tree_last;
                    else
                        child.treePfx = pfx + tree_blank;
                    var pc = i < chart.treeChildren.length - 1 ? tree_line : tree_blank;
                    computeTreePfx(child, pfx + pc);
                }
            };
            treeRoot.treePfx = '';
            computeTreePfx(treeRoot, treeRoot.treePfx);
            // initial view: partially open
            treeOpen(treeRoot, false);
        };
        try {
            // if there was a tree process it now
            for (var _x = __values(this.treeRoots), _y = _x.next(); !_y.done; _y = _x.next()) {
                var treeRoot = _y.value;
                _loop_2(treeRoot);
            }
        }
        catch (e_13_1) { e_13 = { error: e_13_1 }; }
        finally {
            try {
                if (_y && !_y.done && (_k = _x.return)) _k.call(_x);
            }
            finally { if (e_13) throw e_13.error; }
        }
        // say "EMPTY" if there were no charts
        if (charts.length == 0) {
            new HeadingRow(this.table).chartCol
                .html("EMPTY")
                .classed("no-data", true);
        }
        // report stats for debugging
        u.log(filter);
        u.log("  total", charts.length, "showing", showing, "cached", cacheStats.cached, "not cached", cacheStats.notCached);
    }; // show()
    // format values at time t from allCharts into parent
    ChartSet.prototype.formatValues = function (table, t) {
        for (var i in this.allCharts)
            this.allCharts[i].formatValues(table, t);
    };
    return ChartSet;
}()); // ChartSet
exports.ChartSet = ChartSet;
//# sourceMappingURL=charts.js.map