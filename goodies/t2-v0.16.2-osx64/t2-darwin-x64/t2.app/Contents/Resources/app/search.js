"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron = require("electron");
var d3 = require("d3");
var u = require("./util");
////////////////////////////
//
// Search provides the ability to search page text, for example to
// find a metric by name. It used the built-in search capability of
// the browser.
//
var Search = /** @class */ (function () {
    function Search(parent) {
        var _this = this;
        this.currentSearch = "";
        this.freshSearch = false; // true if we just did a new search, false after next/prev
        // wrap our content in an extra span to hold our place when we reparent
        this.currentParent = this.originalParent = parent.append("span");
        this.content = this.currentParent.append("span");
        var delayMs = 500; // wait this long before searching
        var typing = 0;
        // handle response from main process to the find requests that we send it
        electron.ipcRenderer.on("found", function (event, count) {
            u.log("found", count);
            _this.input.style("display", null); // finished search, show input field again
            // retain focus after doing a new search so user can continue typing
            if (_this.freshSearch)
                _this.input.node().focus();
        });
        // the search input box
        this.input = this.content.append("input")
            .attr("id", "search")
            .attr("type", "textbox")
            .attr("placeholder", "Search")
            .on("keyup", function () {
            if (_this.input.node().value != _this.currentSearch) {
                typing++;
                setTimeout(function () {
                    try {
                        if (typing == 1) {
                            // send find request to main process
                            _this.currentSearch = _this.input.node().value;
                            _this.freshSearch = true;
                            _this.input.style("display", "none"); // so search doesn't find us
                            _this.currentParent.node().focus();
                            electron.ipcRenderer.send("find", _this.currentSearch, 0);
                        }
                    }
                    finally {
                        typing--;
                    }
                }, delayMs);
            }
        })
            // prevent clicking on input field from closing Box when we're in Box title area
            .on("click", function () { return d3.event.stopPropagation(); });
    }
    Search.prototype.reparent = function (newParent) {
        var _this = this;
        if (newParent === void 0) { newParent = this.originalParent; }
        newParent.append(function () { return _this.content.node(); });
        this.input.node().value = this.currentSearch = "";
    };
    Search.prototype.advance = function (n) {
        this.input.style("display", "none"); // so search doesn't find us
        if (this.freshSearch) {
            // we retain focus on a new search so we need to get back to first result
            electron.ipcRenderer.send("find", this.currentSearch, 1);
            this.freshSearch = false;
        }
        this.currentParent.node().focus();
        electron.ipcRenderer.send("find", this.currentSearch, n);
    };
    Search.prototype.startSearch = function () {
        // retain text and select input field when user does cmd-f so that a single keystroke
        // starts a new search (backspace), or continues typing (ctl-e on mac)
        this.input.node().select();
    };
    return Search;
}());
exports.Search = Search;
//# sourceMappingURL=search.js.map