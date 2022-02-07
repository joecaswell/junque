"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var u = require("./util");
////////////////////////////
//
// Status allows the display of status messages. A status message may
// include a progress indication which is displayed as a filled
// circular wedge
//
// xxx util.js? stylesheet?
var statusColor = "rgb(150, 150, 150)";
var Status = /** @class */ (function () {
    function Status(parent) {
        this.top = parent.append("div")
            .attr("id", "status")
            .style("color", statusColor)
            .style("text-align", "right");
        this.progressElt = this.top.append("svg")
            .attr("viewBox", "-1 -1 2 2")
            .style("padding-right", "0.5em")
            .style("width", "1em")
            .style("height", "1em")
            .style("position", "relative")
            .style("top", "0.1em")
            .append("g")
            .attr("transform", "scale(1,-1)")
            .append("path")
            .style("fill", statusColor);
        this.statusElt = this.top.append("span");
    }
    Status.prototype.set = function (status, progress, log) {
        if (progress === void 0) { progress = 0; }
        if (log === void 0) { log = true; }
        if (log)
            u.log("status: " + status + " " + progress);
        if (progress) {
            var x = Math.sin(2 * Math.PI * progress);
            var y = Math.cos(2 * Math.PI * progress);
            var flags = progress < 0.5 ? "0,0" : "1,0";
            var path = "M 0 0   L 0 1   A 1,1 0 " + flags + " " + x + " " + y + " Z";
            this.progressElt.attr("d", path);
        }
        else {
            this.progressElt.attr("d", null);
        }
        this.statusElt.html(status);
    };
    Status.prototype.setIfEmpty = function (status) {
        if (this.statusElt.text() == "")
            this.set(status);
    };
    Status.prototype.error = function (msg) {
        this.set("<span class='error'>" + msg + "</span>");
    };
    return Status;
}());
exports.Status = Status;
//# sourceMappingURL=status.js.map