"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var d3 = require("d3");
var ctx_1 = require("./ctx");
////////////////////////////
//
// Box is a dialog box with title, buttons, and content area
//
var Box = /** @class */ (function () {
    function Box(parent, icon, title, searchable, onopen, onclose) {
        var _this = this;
        this.searchable = searchable;
        this.onopen = onopen;
        this.onclose = onclose;
        this.top = parent.append("div")
            .style("position", "relative");
        var tableWithTitle = function (title) {
            // table to contain our layout
            var table = _this.top.append("table")
                .classed("box", true)
                .style("background", "white")
                .attr("cellspacing", 0).attr("cellpadding", 0).attr("border", "0");
            // row for title and buttons
            var headRow = table.append("tr");
            // title in head row
            _this.titleCell = headRow.append("td")
                .classed("label-text", true) // xxx implied by box-heading?
                .classed("box-heading", true)
                .on("click", function () {
                _this.isOpen = !_this.isOpen;
                _this.update();
            });
            if (icon)
                icon(_this.titleCell);
            _this.titleCell.append("span").classed("box-title", true).html(title);
            return table;
        };
        // closed box (minimized button)
        tableWithTitle(title /* xxx + "&nbsp;..."*/)
            .attr("title", title) // tooltip
            .classed("box-closed", true)
            .select("tr td")
            .classed("box-closed", true);
        // open box
        this.box = tableWithTitle(title)
            .classed("box-open", true)
            .style("position", "absolute")
            .style("left", 0).style("top", 0);
        // click anywhere to close
        this.closer = this.top.append("div")
            .classed("closer", true)
            .style("position", "fixed")
            .style("left", 0).style("top", 0)
            .style("width", "100vw").style("height", "100vh")
            .on("click", function () { return _this.close(); });
        // add content area to open box
        this.content = this.box
            .append("tr")
            .append("td")
            .attr("colspan", 100)
            .append("div")
            .on("click", function () { if (d3.event.target == _this.content.node())
            _this.close(); });
        // initial state
        this.isOpen = false;
        this.update();
    }
    // update box state to opened or closed
    Box.prototype.update = function () {
        if (this.isOpen) {
            this.box.style("display", null);
            this.closer.style("display", null);
            if (this.searchable && ctx_1.default().search)
                ctx_1.default().search.reparent(this.titleCell); // move search to our title bar
            //button.style("display", "none")
            if (this.onopen)
                this.onopen(); // callback e.g. to fill in content
        }
        else {
            this.box.style("display", "none");
            this.closer.style("display", "none");
            if (this.searchable && ctx_1.default().search)
                ctx_1.default().search.reparent(); // move search back to original place
            //button.style("display", null)
        }
    };
    // close box
    Box.prototype.close = function () {
        this.isOpen = false;
        this.update();
        if (this.onclose)
            this.onclose();
    };
    Box.prototype.addButton = function (label, tooltip, onclick) {
        return this.box
            .select("tr")
            .append("td")
            .classed("box-heading-button", true)
            .style("width", "1px")
            .style("text-align", "center")
            .attr("title", tooltip)
            .html(label)
            .classed("label-text", true)
            .on("click", onclick);
    };
    return Box;
}());
exports.Box = Box;
//# sourceMappingURL=box.js.map