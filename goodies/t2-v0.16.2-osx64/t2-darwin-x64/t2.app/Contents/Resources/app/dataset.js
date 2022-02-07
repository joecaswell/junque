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
var os = require("os");
var d3 = require("d3");
var ctx_1 = require("./ctx");
var box = require("./box");
var icons = require("./icons");
var u = require("./util");
var Dataset = /** @class */ (function () {
    function Dataset(parent) {
        var _this = this;
        // option to hide a particular source
        this.hide = {};
        this.currentFileInfo = [];
        this.filesChanged = false;
        this.needShow = false;
        this.enableShift = false;
        //
        // hack to shift a source on the timeline to facilitate comparison
        //
        this.shifts = {};
        this.datasetBox = new box.Box(parent, icons.load, "Dataset", true, function () { return onopen(); }, function () { return onclose(); });
        this.datasetBox.top.attr("id", "dataset");
        this.datasetBox.content.attr("id", "dataset-content");
        // executed when we close this box
        var onclose = function () {
            if (_this.needShow) {
                _this.showCurrent();
                _this.updateUndoState();
                _this.needShow = false;
            }
        };
        var onopen = function () {
            var aligned = ctx_1.default().options.timeline == "aligned";
            if (_this.enableShift != aligned) {
                _this.enableShift = aligned;
                _this.updateView();
            }
        };
        // add "done" button
        this.datasetBox.addButton("done", "display updated file list", function () { return _this.datasetBox.close(); });
        // plus button useds a hidden input element to bring up file chooser
        var plusButton = function (text, tooltip, directory) {
            _this.datasetBox.addButton(text, tooltip, function () { addFileInputNode.click(); });
            var addFileInput = parent.append("input")
                .attr("type", "file")
                .attr("multiple", "multiple")
                .style("display", "none")
                .on("change", function () {
                var fileList = addFileInputNode.files;
                for (var i = 0; i < fileList.length; i++)
                    _this.currentFileInfo.push({ path: fileList[i].path });
                _this.filesChanged = true;
                _this.updateView();
                _this.tags = {};
                _this.needShow = true;
            });
            var addFileInputNode = addFileInput.node();
            if (directory)
                addFileInput.attr("webkitdirectory", "webkitdirectory");
        };
        plusButton(/*"&plus;&nbsp;d"*/ "dir", "add a directory", true);
        plusButton("&plus;", "add a file", false);
        // minus button to remove a file from the list
        this.datasetBox.addButton("&minus;", "remove a file", function () {
            _this.datasetBox.content.selectAll(".selected").each(function (path) {
                var i = _this.currentPaths().indexOf(path);
                if (i >= 0)
                    _this.currentFileInfo.splice(i, 1);
            });
            _this.filesChanged = true;
            _this.updateView();
            _this.tags = {};
            _this.needShow = true;
        });
        // content area is list of files
        this.datasetBox.content
            .style("overflow-x", "auto") // adds scrollbar if needed
            .style("overflow-y", "auto") // adds scrollbar if needed    
            .style("white-space", "nowrap");
    }
    // add a file to the chosen files
    Dataset.prototype.updateView = function (processedSourceData) {
        var _this = this;
        if (processedSourceData === void 0) { processedSourceData = null; }
        // we'll use a div, classed "dataset-top"
        this.datasetBox.content.html("");
        var top = this.datasetBox.content
            .append("div")
            .classed("dataset-top", true);
        var bySource = {}; // for counting tags
        var TBD = "TBD";
        for (var i in this.currentFileInfo) {
            var info = this.currentFileInfo[i];
            if (!info.source)
                info.source = TBD;
            var byPath = bySource[info.source];
            if (!byPath)
                byPath = bySource[info.source] = {};
            byPath[info.path] = info;
        }
        var bySourceSortedKeys = Object.keys(bySource).sort();
        var numSources = bySourceSortedKeys.length - (bySource[TBD] ? 1 : 0);
        // headings - src, file, tag
        var headings = top.append("span").classed("dataset-headings", true);
        headings.append("span").classed("dataset-src", true).html("src");
        headings.append("span").classed("dataset-file", true).html("file");
        if (numSources > 1) {
            headings.append("span").classed("dataset-show", true).html("show");
            if (this.enableShift)
                headings.append("span").classed("dataset-shift", true).html("shift");
            headings.append("span").classed("dataset-tag", true).html("tag");
        }
        // strip common prefix and suffix from source names that are path names
        var strippedSources = u.stripCommonPrefixAndSuffix(bySourceSortedKeys, "/", 60);
        var _loop_1 = function (i) {
            var source = bySourceSortedKeys[i];
            // allocate default tag if needed, and requested by passing in processedSourceData
            var tag = this_1.tags[source];
            if (!tag && processedSourceData) {
                tag = "";
                var space = "\u00A0"; // nbsp
                var dot = "·";
                var large = "●";
                for (var j = 0; j < numSources; j++) {
                    if (i == j) {
                        var id = processedSourceData[source].replSetMemberId;
                        tag += (id == undefined ? large : id) + space;
                    }
                    else {
                        tag += dot + space;
                    }
                }
                this_1.tags[source] = tag;
            }
            // name of source
            var sourceSpan = top.append("span").classed("dataset-source", true);
            var mid = strippedSources.mid; // the non-common part, if any, to use for display name
            var sourceDisplayName = mid.length > 0 ? mid[i] : strippedSources.pfx;
            sourceDisplayName = sourceDisplayName.replace(os.homedir(), "~");
            sourceSpan.append("span")
                .classed("dataset-src", true)
                .text(sourceDisplayName);
            if (numSources > 1 && source != TBD) {
                // hide/show option
                var showCheckBox = sourceSpan.append("span")
                    .classed("dataset-show", true)
                    .append("input")
                    .attr("type", "checkbox")
                    .attr("checked", "checked")
                    .datum(source)
                    .on("change", function (source) {
                    _this.hide[source] = !showCheckBoxNode_1.checked;
                    _this.needShow = true;
                });
                var showCheckBoxNode_1 = showCheckBox.node();
                showCheckBoxNode_1.checked = !this_1.hide[source];
                // shift hack
                if (this_1.enableShift) {
                    sourceSpan.append("span")
                        .classed("dataset-shift", true)
                        .append("input")
                        .attr("type", "textbox")
                        .attr("value", this_1.shifts[source] || "")
                        .attr("placeholder", "±hh:mm:ss")
                        .datum(source)
                        .on("change", function (source) {
                        var value = d3.event.currentTarget.value;
                        if (isFinite(u.parseDuration(value))) {
                            _this.shifts[source] = value;
                            _this.filesChanged = true; // flushes cache
                            _this.needShow = true;
                        }
                        else {
                            ctx_1.default().status.set("don't understand duration " + value);
                        }
                    });
                }
                // tag field
                sourceSpan.append("span")
                    .classed("dataset-tag", true)
                    .append("input")
                    .attr("type", "textbox")
                    .attr("value", tag)
                    .datum(source)
                    .on("change", function (source) {
                    _this.tags[source] = d3.event.currentTarget.value;
                    _this.needShow = true;
                });
            }
            // paths for this source
            var byPathSortedKeys = Object.keys(bySource[source]).sort();
            for (var i_1 in byPathSortedKeys) {
                var path = byPathSortedKeys[i_1];
                var pathDisplayName = path.replace(os.homedir(), "~");
                var pathSpan = top.append("span").classed("dataset-file", true);
                pathSpan.append("span")
                    .classed("dataset-file", true)
                    .on("click", function () {
                    var sel = d3.select(d3.event.currentTarget);
                    sel.classed("selected", !sel.classed("selected"));
                })
                    .datum(path)
                    .text(pathDisplayName);
            }
        };
        var this_1 = this;
        // for each source, in sorted order
        for (var i = 0; i < bySourceSortedKeys.length; i++) {
            _loop_1(i);
        }
    };
    // add paths to currentFileInfo - sets only path, source and type
    // will be supplied later
    Dataset.prototype.addPaths = function (paths) {
        var e_1, _a;
        try {
            for (var paths_1 = __values(paths), paths_1_1 = paths_1.next(); !paths_1_1.done; paths_1_1 = paths_1.next()) {
                var path = paths_1_1.value;
                this.currentFileInfo.push({ path: path });
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (paths_1_1 && !paths_1_1.done && (_a = paths_1.return)) _a.call(paths_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.filesChanged = true;
        this.updateView();
        this.tags = {};
        this.showCurrent();
        this.updateUndoState();
    };
    // compute tags if needed, using repl set id from ProcessedData, if available
    Dataset.prototype.computeTags = function (processedSourceData) {
        this.updateView(processedSourceData);
    };
    // set the complete currentFileInfo from a list of paths
    Dataset.prototype.setCurrentFileInfo = function (paths) {
        this.currentFileInfo = paths.map(function (path) { return { path: path }; });
        this.filesChanged = true;
    };
    // retrieve just the paths; returns array in same order as currentFileInfo
    Dataset.prototype.currentPaths = function () {
        return this.currentFileInfo.map(function (f) { return f.path; });
    };
    // this is done by the app on startup: show a set of files, and
    // then register initial state with undo
    Dataset.prototype.showPaths = function (paths) {
        this.setCurrentFileInfo(paths);
        this.tags = {};
        this.registerUndo();
    };
    // show the current set of files, and update currentFileInfo with
    // additional info returned by the back-end such as source and type
    Dataset.prototype.showCurrent = function (filesChanged) {
        var _this = this;
        if (filesChanged === void 0) { filesChanged = false; }
        if (filesChanged)
            this.filesChanged = true;
        ctx_1.default().showFiles(this.currentPaths(), this.filesChanged, this.filesChanged, function (info) {
            _this.currentFileInfo = info.files;
            _this.updateView();
            _this.filesChanged = false;
        });
    };
    //
    // We provide two separate pieces of undo state: our list of files, and our tags
    //
    Dataset.prototype.registerUndo = function () {
        var initialState = {
            files: this.currentFileInfo.map(function (f) { return f.path; }),
            tags: this.tags,
            hide: this.hide,
            shifts: this.shifts,
        };
        var currentState = ctx_1.default().undo.registerClient("dataset", this, initialState);
        this.restoreState(currentState);
    };
    Dataset.prototype.updateUndoState = function () {
        var undoState = {
            files: this.currentFileInfo.map(function (f) { return f.path; }),
            tags: this.tags,
            hide: this.hide,
            shifts: this.shifts,
        };
        ctx_1.default().undo.updateState({ "dataset": undoState });
    };
    Dataset.prototype.restoreState = function (undoState) {
        this.setCurrentFileInfo(undoState.files);
        this.tags = undoState.tags;
        this.hide = undoState.hide;
        this.shifts = undoState.shifts;
        this.filesChanged = true; // xxx always??
        this.showCurrent();
    };
    // return the shift for a source in ms
    Dataset.prototype.getShift = function (source) {
        if (ctx_1.default().options.timeline == "aligned") {
            var shift = u.parseDuration(this.shifts[source] || "") * 1000;
            return shift;
        }
        else {
            return 0;
        }
    };
    // compute shifts if none of the current sources has a shift
    Dataset.prototype.computeShifts = function () {
        var sources = ctx_1.default().loadedInfo.sources;
        for (var s in sources)
            if (this.shifts[s])
                return;
        var tMin = Infinity;
        for (var s in sources)
            if (sources[s].tMin < tMin)
                tMin = sources[s].tMin;
        for (var s in sources)
            this.shifts[s] = ((tMin - sources[s].tMin) / 1000).toString();
    };
    // return all shifts
    Dataset.prototype.getShifts = function () {
        this.computeShifts();
        var shifts = {};
        for (var source in this.shifts)
            shifts[source] = this.getShift(source);
        return shifts;
    };
    return Dataset;
}());
exports.Dataset = Dataset;
//# sourceMappingURL=dataset.js.map