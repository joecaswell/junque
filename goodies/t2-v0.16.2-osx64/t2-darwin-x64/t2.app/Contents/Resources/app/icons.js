"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function plus(parent) {
    parent.append("svg")
        .classed("icon", true)
        .classed("icon-plus", true)
        .style("overflow", "visible")
        .attr("viewBox", "-5 -5 110 110")
        .append("path").attr("d", "M 0,50 L 100,50 M 50,0 L 50,100");
}
exports.plus = plus;
function close(parent) {
    parent.append("svg")
        .classed("icon", true)
        .classed("icon-close", true)
        .style("overflow", "visible")
        .attr("viewBox", "-15 -15 130 130")
        .append("path").attr("d", "M 0,0 L 100,100 M 0,100 L 100,0");
}
exports.close = close;
function clone(parent) {
    parent.append("svg")
        .classed("icon", true)
        .classed("icon-clone", true)
        .style("overflow", "visible")
        .attr("viewBox", "-5 -5 110 110")
        .append("path").attr("d", "\n            M 75,25 L 75,0 L 0,0 L 0,75 L 25,75\n            M 25,25 L 100,25 L 100,100 L 25,100 Z\n        ");
}
exports.clone = clone;
function load(parent) {
    parent.append("svg")
        .classed("icon", true)
        .classed("icon-load", true)
        .style("overflow", "visible")
        .attr("viewBox", "-3 -3 106 106")
        .append("path").attr("d", "\n            M 20,75 L 20,100 L 100,100 L 100,0 L 20,0 L 20,25\n            M -5,50 L 80,50\n            M 40,25 L 80,50 L 40,75\n        ");
}
exports.load = load;
function info(parent) {
    var svg = parent.append("svg")
        .classed("icon", true)
        .classed("icon-info", true)
        .style("overflow", "visible")
        .attr("viewBox", "0 0 100 100");
    svg.append("text")
        .attr("x", 51).attr("y", 52)
        .style('font-family', 'serif')
        .style('font-size', 90)
        .style('font-weight', 'light')
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'central')
        .text("i");
    svg.append("circle").attr("cx", 50).attr("cy", 50).attr("r", 50);
}
exports.info = info;
function tip(parent) {
    var svg = parent.append("svg")
        .classed("icon", true)
        .classed("icon-tip", true)
        .style("overflow", "visible")
        .attr("viewBox", "0 0 100 100");
    svg.append("text")
        .attr("x", 50).attr("y", 50)
        .style('text-anchor', 'middle')
        .style('dominant-baseline', 'central')
        .text("?");
    svg.append("circle").attr("cx", 50).attr("cy", 50).attr("r", 50);
}
exports.tip = tip;
function gear(parent) {
    parent.append("svg")
        .classed("icon", true)
        .style("overflow", "visible")
        .attr("viewBox", "80 80 350 350")
        .append("path").attr("d", "\n            M411.1,256c0-23.9,14.8-42.8,36.9-55.8c-4-13.3-9.3-26.2-15.8-38.2\n            c-24.9,6.5-45-3.2-62-20.2c-16.9-16.9-22.1-37.1-15.6-62\n            C342.6,73.3,329.8,68,316.4,64c-13,22.2-36.4,36.9-60.4,36.9\n            c-23.9,0-47.4-14.7-60.4-36.9c-13.4,4-26.2,9.3-38.2,15.8\n            c6.5,24.9,1.3,45-15.6,62c-16.9,16.9-37.1,26.7-61.9,20.2\n            C73.3,174,68,186.8,64,200.2c22.2,13,37,31.9,37,55.8\n            c0,23.9-14.8,47.4-37,60.4c4,13.4,9.3,26.2,15.8,38.2\n            c24.9-6.5,45-1.3,61.9,15.6c17,16.9,22.1,37.1,15.6,62\n            c12.1,6.5,24.8,11.8,38.2,15.8c13-22.2,36.5-36.9,60.4-36.9\n            c23.9,0,47.4,14.7,60.4,36.9c13.4-4,26.2-9.3,38.2-15.8\n            c-6.5-24.9-1.3-45,15.6-62c16.9-16.9,37.1-26.7,62-20.2\n            c6.5-12.1,11.8-24.9,15.8-38.2C425.8,298.8,411.1,279.9,411.1,256z\n            M256,354.3c-54.2,0-98.3-44-98.3-98.3c0-54.3,44-98.3,98.3-98.3\n            c54.3,0,98.3,44,98.3,98.3C354.3,310.3,310.3,354.3,256,354.3z\n        ");
}
exports.gear = gear;
//# sourceMappingURL=icons.js.map