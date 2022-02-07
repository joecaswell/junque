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
////////////////////////////
//
// A Marker is a vertical line placed across all charts by the user to
// indicate a significant event. It has a circle for removing the
// marker and a letter to identify it.
//
var Marker = /** @class */ (function () {
    function Marker(letterSvg, markerSvg, markers, hasRemover) {
        var _this = this;
        this.letterSvg = letterSvg;
        // set the height of the svg that holds letter and remover
        this.letterSvg.style("height", Marker.letterHeight);
        if (hasRemover) {
            this.remover = this.letterSvg.append("circle")
                .attr("cx", "-1em").attr("cy", Marker.removerY)
                .attr("r", Marker.removerR)
                .classed("remover", true)
                .style("pointer-events", "auto") // b/c we're a child of svg which specified "none"
                .on("click", function () {
                markers.removeMarkerAction(_this);
                d3.event.stopPropagation();
            });
        }
        this.letter = this.letterSvg.append("text")
            .style("font-size", "80%")
            .style("text-anchor", "middle")
            .style("dominant-baseline", "hanging");
        this.line = markerSvg.append("line")
            .classed("marker", true);
    }
    // remove this marker
    Marker.prototype.remove = function () {
        if (this.remover)
            this.remover.remove();
        this.letter.remove();
        this.line.remove();
    };
    // set position by x. t must be computed by caller and passed in; used for save/restore state
    // x<0 means hide
    Marker.prototype.setPos = function (x, t) {
        this.x = x;
        this.t = t;
        var pixelWidth = this.letterSvg.node().getBoundingClientRect().width;
        if (0 <= x && x <= pixelWidth) {
            this.line.style("display", null);
            this.line.attr("x1", x).attr("y1", Marker.lineY);
            this.line.attr("x2", x).attr("y2", "100%");
            if (this.remover)
                this.remover.attr("cx", x);
            if (this.letter)
                this.letter.attr("x", x).attr("y", Marker.letterY);
        }
        else {
            this.line.style("display", "none");
            if (this.remover)
                this.remover.style("display", "none");
            if (this.letter)
                this.letter.style("display", "none");
        }
    };
    Marker.prototype.setLetter = function (letter) {
        this.letter.html(letter);
    };
    Marker.prototype.getLetter = function () {
        return this.letter.node().innerHTML;
    };
    // xxx any way to do this in css or let layout engine position?
    Marker.letterY = "0em";
    Marker.removerY = "1.1em";
    Marker.removerR = "0.35em";
    Marker.lineY = "1.7em";
    Marker.letterHeight = "1.8em";
    return Marker;
}());
//
// MarkerSet manages the Markers for a ChartSet
//
var MarkerSet = /** @class */ (function () {
    function MarkerSet(parent, specifiedWidth, tr) {
        // warning: calls getBoundingClientRect so do not call this while building DOM
        this._pixelWidth = 0;
        this.tr = tr;
        this.markers = [];
        this.markerSvg = parent
            .append("svg")
            .style("width", specifiedWidth)
            .style("overflow", "visible")
            .style("height", "100%")
            .style("position", "absolute") // relative to containing table
            .style("z-index", 1000) // draw in front of graphs
            .style("pointer-events", "none"); // but we don't want to steal the graphs' events
        this.letterSvg = parent
            .append("svg")
            .style("width", specifiedWidth)
            .style("overflow", "visible")
            .style("z-index", 1000) // draw in front of graphs
            .style("pointer-events", "none"); // but we don't want to steal the graphs' events
        this.mouseCursor = new Marker(this.letterSvg, this.markerSvg, this, false);
        // register with undo/redo, and restore our state if there was state from a previous Marker
        // xxx this makes Marker state always sticky - ok?
        var initialState = [];
        var currentState = ctx_1.default().undo.registerClient("markers", this, initialState);
        this.restoreState(currentState);
    }
    // our state is a list of marker times
    MarkerSet.prototype.getState = function () {
        return this.markers.map(function (marker) { return marker.t; });
    };
    // restore state by removing all markers and adding the requested markers by time
    MarkerSet.prototype.restoreState = function (state) {
        for (var i in this.markers)
            this.markers[i].remove();
        this.markers = [];
        for (var i in state) {
            var pixelWidth = this.letterSvg.node().getBoundingClientRect().width;
            var marker = new Marker(this.letterSvg, this.markerSvg, this, true);
            var t = state[i];
            marker.setPos(this.tr.t2x(t, 0, pixelWidth), t);
            this.markers[i] = marker;
        }
        this.reLetter();
    };
    // sort the markers and assign letters sorted by time
    MarkerSet.prototype.reLetter = function () {
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.markers.sort(function (a, b) { return a.t - b.t; });
        for (var i = 0; i < this.markers.length; i++)
            this.markers[i].setLetter(letters.substr(i % 26, 1));
    };
    MarkerSet.prototype.pixelWidth = function () {
        if (!this._pixelWidth)
            this._pixelWidth = this.markerSvg.node().getBoundingClientRect().width;
        return this._pixelWidth;
    };
    // warning: calls getBoundingClientRect so do not call this while building DOM
    MarkerSet.prototype.t2x = function (t) {
        return this.tr.t2x(t, 0, this.pixelWidth());
    };
    // warning: calls getBoundingClientRect so do not call this while building DOM
    MarkerSet.prototype.x2t = function (x) {
        return this.tr.x2t(x, 0, this.pixelWidth());
    };
    // add or retrieve marker at location specified by either x or t
    // if no marker exists at that location, create a new one,saving state for undo
    // if a marker already exists at that location it is returned
    MarkerSet.prototype.addMarkerAction = function (x, t) {
        var e_1, _a;
        // compute t from x or x from t
        if (x == null) {
            x = this.t2x(t);
        }
        if (t == null) {
            t = this.x2t(x);
        }
        try {
            // check if already exists. Compare time as displayed to
            // toISOString (which has ms precision) so if we copy a date
            // string from time field if Info box it's treated as already
            // existing
            for (var _b = __values(this.markers), _c = _b.next(); !_c.done; _c = _b.next()) {
                var marker_1 = _c.value;
                try {
                    if (new Date(marker_1.t).toISOString() == new Date(t).toISOString())
                        return marker_1;
                }
                catch (e) {
                    // xxx track down where these are coming from and fix
                    // for now just avoid crashing and log a message
                    ctx_1.default().status.error("invalid time " + t + " " + marker_1.t);
                    return marker_1;
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
        // nope, create new one
        var marker = new Marker(this.letterSvg, this.markerSvg, this, true);
        marker.setPos(x, t);
        this.markers.push(marker);
        this.markers.sort(function (a, b) { return a.x - b.x; });
        this.reLetter();
        ctx_1.default().undo.updateState({ markers: this.getState() });
        return marker;
    };
    // remove the specified marker, saving state for undo
    MarkerSet.prototype.removeMarkerAction = function (marker) {
        var i = this.markers.indexOf(marker);
        if (i >= 0) {
            this.markers.splice(i, 1);
            this.reLetter();
            marker.remove();
        }
        ctx_1.default().undo.updateState({ markers: this.getState() });
    };
    MarkerSet.prototype.snapToMarker = function (x) {
        var e_2, _a;
        var minMarker = null;
        var minDistance = Infinity;
        try {
            for (var _b = __values(this.markers), _c = _b.next(); !_c.done; _c = _b.next()) {
                var marker = _c.value;
                var distance = Math.abs(x - marker.x);
                if (distance < minDistance) {
                    minDistance = distance;
                    minMarker = marker;
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return minDistance < MarkerSet.snapToMarkerDistance ? minMarker.x : x;
    };
    // get letter markers, used e.g. by metadata Info to 
    MarkerSet.prototype.getMarkerInfo = function () {
        return this.markers.map(function (marker) {
            return { letter: marker.getLetter(), t: marker.t };
        });
    };
    MarkerSet.snapToMarkerDistance = 3;
    return MarkerSet;
}());
exports.MarkerSet = MarkerSet;
//
// Add an "event region" to parent which captures mouse movement
// events.  If a MarkerSet is specified, mouse movement moves the
// MarkerSet mouse cursor, which is a vertical line covering all
// charts; reported mouse position snaps to existing markers; and
// click adds a marker. Mouse movement events are reported via
// callback onmove; both x values and t values, computed using the
// supplied TimeRange, are reported. Used by Chart and TimeAxis to
// provide interaction with markers, and to provide tip boxes that
// report chart or time axis info at the current position.
//
function addEventRegion(parent, markers, tr, onmove) {
    var evr = parent.append("svg")
        .classed("event-region", true)
        .style("width", "100%")
        .style("height", "100%")
        .style("top", 0)
        .style("left", 0)
        .style("position", "absolute");
    var evrNode = evr.node();
    evr.on("mousemove", function () {
        var x = d3.mouse(d3.event.currentTarget)[0];
        if (markers) {
            x = markers.snapToMarker(x);
            markers.mouseCursor.setPos(x, 0);
        }
        if (ctx_1.default().options.showValues && onmove) {
            var pixelWidth = evrNode.getBoundingClientRect().width;
            var t = tr.x2t(x, 0, pixelWidth);
            onmove(x, t);
        }
    });
    evr.on("mouseout", function () {
        if (markers)
            markers.mouseCursor.setPos(-1, 0);
        if (onmove)
            onmove(null, 0);
    });
    // use a slight delay to allow double clicks to be handled elsewhere,
    // e.g. double click to move chart into/out of view.
    var clicks = 0;
    evr.on("click", function () {
        var x = d3.mouse(d3.event.currentTarget)[0];
        clicks++;
        if (clicks == 1) {
            setTimeout(function () {
                if (clicks == 1)
                    if (markers)
                        markers.addMarkerAction(x, null);
                clicks = 0;
            }, 300);
        }
    });
    return evr;
}
exports.addEventRegion = addEventRegion;
//# sourceMappingURL=markers.js.map