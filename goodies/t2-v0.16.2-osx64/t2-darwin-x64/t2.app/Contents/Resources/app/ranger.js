"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var d3 = require("d3");
var u = require("./util");
////////////////////////////
//
// Ranger adds a range selection behavior to parent. After selection
// of a range callback is called. Used by TimeAxis and Chart to add
// zoom capability.
//
// parent must be an svg xxx enforce via types?
// we make it overflow visible
//
var Ranger = /** @class */ (function () {
    function Ranger(parent, callback) {
        // we draw a bit outside parent's region
        parent.style("overflow", "visible");
        // range outline
        var rect = parent
            .append("rect")
            .attr("top", "-5%")
            .attr("width", 0)
            .attr("height", "110%")
            .attr("rx", "0.2em").attr("ry", "0.2em")
            .classed("ranger", true);
        var xStart, xEnd; // start, end of drag in pixels
        var parentWidth; // fetch on drag start - expensive while constructing tree
        // get mouse x, clipping to our size
        var x = function () {
            var x = d3.mouse(parent.node())[0];
            if (x < 0)
                x = 0;
            if (x > parentWidth)
                x = parentWidth;
            return x;
        };
        // don't allow selecting a tiny range; filters out clicks, allows canceling
        var permissible = function () {
            return Math.abs(xStart - xEnd) / parentWidth > 0.02;
        };
        // add a drag gesture to parent
        var drag = d3.drag()
            .on("start", function () {
            parentWidth = parent.node().getBoundingClientRect().width;
            xEnd = xStart = x();
        })
            .on("drag", function () {
            xEnd = x();
            if (permissible()) {
                var left = Math.min(xStart, xEnd);
                var width = Math.abs(xStart - xEnd);
                rect.attr("x", left).attr("width", width);
            }
            else {
                rect.attr("x", null).attr("width", 0);
            }
        })
            .on("end", function () {
            xEnd = x();
            rect.attr("x", null).attr("width", 0);
            if (permissible()) {
                // return range from 0.0 to 1.0
                var xMin = Math.min(xStart, xEnd) / parentWidth;
                var xMax = Math.max(xStart, xEnd) / parentWidth;
                u.log("range is " + xMin + " to " + xMax);
                callback(xMin, xMax);
            }
            else {
                u.log("range too small; not zooming");
            }
        });
        parent.call(drag);
    }
    return Ranger;
}());
exports.Ranger = Ranger;
//# sourceMappingURL=ranger.js.map