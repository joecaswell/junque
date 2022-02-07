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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var d3 = require("d3");
var electron = require("electron");
var minimist = require("minimist");
var cache = require("./cache");
var ctxselector = require("./ctxselector");
var charts = require("./charts");
var data = require("./data");
var dataset = require("./dataset");
var descriptors = require("./descriptors");
var info = require("./info");
var keyinfo = require("./keyinfo");
var options = require("./options");
var protocol = require("./protocol");
var search = require("./search");
var status = require("./status");
var test = require("./test");
var transport = require("./transport");
var u = require("./util");
var undo = require("./undo");
var views = require("./views");
var viewselector = require("./viewselector");
var Ctx = /** @class */ (function () {
    function Ctx(initialPaths, clone) {
        var _this = this;
        if (clone === void 0) { clone = null; }
        this.options = {}; // managed by options box xxx be more specific
        this.loadedRange = null; // range of data loaded on server by "load" cmd
        this.shownRange = null; // range of data currently shown
        this.prevScrollTop = null; // track scrollTop to support jumping
        // add our ctx to the list and make active, making us available to other objects
        this.ctxName = "Context " + ++contextNumber;
        theCtxs.unshift(this); // add to front so menu shows most recent first
        activeCtx = this;
        // log message
        if (clone instanceof Ctx)
            u.log("cloning context", clone.ctxName, "to", this.ctxName);
        else if (clone == "resume")
            u.log("resuming saved state");
        else
            u.log("creating context", this.ctxName);
        // make protocol available to other components via ctx() for communicating with back-end
        this.protocol = theProtocol;
        // create our cache of processed data
        // xxx possible or useful to share between contexts?
        this.cache = new cache.Cache(this.ctxName);
        // create our window in an iframe
        this.topWindow = window;
        var topDocument = d3.select(this.topWindow.document);
        this.iframe = topDocument.select("body").append("iframe")
            .style("width", "100%")
            .style("height", "100%")
            .style("border", "none");
        this.window = this.iframe.node().contentWindow;
        this.document = d3.select(this.window.document);
        // receive drag&drop of files to be added anywhere in our window
        d3.select(this.window).on("dragover", function () {
            // override Chrome default behavior - required to receive the drop event
            // xxx give a visual indication here...
            d3.event.preventDefault();
            return false;
        });
        d3.select(this.window).on("drop", function () {
            var e_1, _a;
            d3.event.preventDefault();
            var paths = [];
            try {
                for (var _b = __values(d3.event.dataTransfer.files), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var file = _c.value;
                    paths.push(file.path);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            u.log("received drop of", paths);
            _this.dataset.addPaths(paths);
            return false;
        });
        // global key bindings
        d3.select(this.window).on("keydown", function () {
            // zoom by an amount specified by zoomLevel. This is
            // applied to the top-level document, so it is global
            // across contexts
            var zoom = function () {
                var scale = Math.pow(1.05, zoomLevel);
                d3.select(_this.topWindow.document).select("body")
                    .style("transform", "scale(" + scale + ")")
                    .style("transform-origin", "0px 0px")
                    .style("width", (100 / scale) + "vw")
                    .style("height", (100 / scale) + "vh");
                _this.status.set("zoom level " + zoomLevel);
                u.log("zoom level", zoomLevel, "scale", scale);
            };
            if (d3.event.code == "Equal" && d3.event.metaKey) {
                // increase zoom
                zoomLevel++;
                zoom();
                d3.event.preventDefault(); // use our zoom instead of Chrome's
            }
            else if (d3.event.code == "Minus" && d3.event.metaKey) {
                // decrease zoom
                zoomLevel--;
                zoom();
                d3.event.preventDefault(); // use our zoom instead of Chrome's
            }
            else if (d3.event.code == "Digit0" && d3.event.metaKey) {
                // reset zoom
                zoomLevel = 0;
                zoom();
                // allow default so we reset the Chrome zoom as well
            }
            else if (d3.event.code == "KeyF" && d3.event.metaKey) {
                // cmd-f to search
                _this.search.startSearch();
            }
            else if (d3.event.code == "KeyN" && d3.event.metaKey) {
                // cmd-n to go to next result
                _this.search.advance(1);
            }
            else if (d3.event.code == "KeyP" && d3.event.metaKey) {
                // cmd-p to go to prev result
                _this.search.advance(-1);
            }
            else if (d3.event.code == "Enter" && !d3.event.shiftKey) {
                // enter to go to next result
                _this.search.advance(1);
            }
            else if (d3.event.code == "Enter" && d3.event.shiftKey) {
                // shift-enter to go to prev result
                _this.search.advance(-1);
            }
            else if (d3.event.code == "KeyJ" && d3.event.metaKey) {
                // cmd-j to jump to top or back to previous scroll height
                _this.jumpScroller();
            }
        });
        // load our stylesheet; defer generating body until it's loaded to avoid flash
        this.document.select("head").append("link")
            .attr("href", "front.css")
            .attr("rel", "stylesheet")
            .attr("type", "text/css")
            .on("load", function () { return _this.generateBody(initialPaths, clone); });
    }
    // stylesheet is loaded, now render
    Ctx.prototype.generateBody = function (initialPaths, clone) {
        // initial state, as tracked by Undo
        // if clone is null, new blank state
        // if clone is Ctx, Undo will clone that Ctx's state
        // if clone is "resume" Undo reads state from ~/.t2
        var init = clone instanceof Ctx ? clone.undo : clone;
        // generate our body content
        var body = this.document.select("body");
        this.createToolbar(body, init);
        // div wrapper to provide scrollbar and expand to fill window
        this.scroller = body
            .append("div")
            .attr("id", "scroller") // used by search to find me xxx is there a better way?
            .style("width", "100%")
            .style("flex", "1") // expands to fill space not taken by toolbar
            .style("overflow", "scroll");
        // instantiate our Views object which maintains this context's own independent view state
        this.views = new views.Views();
        // add view selector to scrollable region
        var topMatter = this.scroller.append("div").classed("top-matter", true);
        this.viewSelector = new viewselector.ViewSelector(topMatter);
        // add key info box
        this.keyInfo = new keyinfo.KeyInfo(topMatter);
        // cautions - so far just relating to chart time shift
        this.cautions = this.scroller.append("div")
            .classed("cautions", true)
            .style("display", "none");
        // add the chart table to scrollable region
        this.chartTable = this.scroller
            .append("table")
            .attr("cellspacing", 0).attr("cellpadding", 0).attr("border", "0")
            .attr("id", "charts");
        // store version for display
        this.status.setIfEmpty(theVersion);
        // maintain this state across file loads etc.
        var initialState = { range: null };
        this.currentState = this.undo.registerClient("ctx", this, initialState);
        // activate - this populates the CtxSelector, hides other contexts
        this.activate();
        // all set up, now show the initial data
        this.dataset.showPaths(initialPaths);
    };
    Ctx.prototype.createToolbar = function (top, clone) {
        var _this = this;
        // set up toolbar at top of window
        var toolbar = top.append("div").style("position", "relative").attr("id", "toolbar");
        // create Status early so it's available to report errors
        this.status = new status.Status(toolbar);
        // CtxSelector allows switching between contexts
        this.ctxSelector = new ctxselector.CtxSelector(toolbar);
        // add the Undo control first so that other controls can register with it
        // xxx need model/view separation?
        this.undo = new undo.Undo(toolbar, clone);
        // Dataset manages selection of files
        this.dataset = new dataset.Dataset(toolbar);
        // Info displays metadata xxx etc.
        this.info = new info.Info(toolbar);
        // Options manages user-selectable options
        this.options = {};
        this.optionsBox = new options.Options(toolbar, this.options, function (filesChanged) {
            if (_this.reload()) {
                // did a reload, no need to show
            }
            else if (filesChanged) {
                _this.dataset.showCurrent(true);
            }
            else {
                _this.show(false);
            }
        });
        // Search
        this.search = new search.Search(toolbar);
        // re-position the Status element at the end of the toolbar
        // xxx should follow this approach for positioning all of the elements in order to
        // decouple order of creation from layout
        this.status.top.raise();
    };
    // report timing and memory used in the status line
    Ctx.prototype.reportInfo = function (ctx, t) {
        var time = d3.format(".1f")(t / 1000) + " s";
        var backMem = Math.floor(theProtocol.memory / 1024 / 1024) + " MiB";
        var frontMem = Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + " MiB";
        //ctx.status.set(time + "<br/>back: " + backMem + "<br/>front: " + frontMem)
        //ctx.status.set(time + "; back: " + backMem + "; front: " + frontMem)
        var spc = "&emsp;&mdash;&emsp;";
        //const spc = " &mdash; "
        var status = time + spc + frontMem + spc + backMem;
        if (theProtocol.evicted)
            status += spc + theProtocol.evicted + " evicted";
        theProtocol.evicted = 0;
        ctx.status.set(status);
        ctx.cache.stats();
    };
    //
    //
    //
    Ctx.prototype.getVersion = function () {
        return theVersion;
    };
    Ctx.prototype.activate = function (ctxName, restart) {
        var e_2, _a;
        var _this = this;
        if (ctxName === void 0) { ctxName = null; }
        if (restart === void 0) { restart = false; }
        // fetch context names
        var ctxNames = theCtxs.map(function (c) { return c.ctxName; });
        // look up ctxName if needed
        if (ctxName) {
            var i = ctxNames.indexOf(ctxName);
            activeCtx = theCtxs[i];
        }
        else {
            activeCtx = this;
        }
        // populate the CtxSelector with list of ctx names b/c it might have changes since last time
        activeCtx.ctxSelector.populate(ctxNames, activeCtx.ctxName);
        var _loop_1 = function (ctx_1) {
            ctx_1.iframe.style("display", function () { return ctx_1 != activeCtx ? "none" : null; });
        };
        try {
            // display the active context, hide the others
            for (var theCtxs_1 = __values(theCtxs), theCtxs_1_1 = theCtxs_1.next(); !theCtxs_1_1.done; theCtxs_1_1 = theCtxs_1.next()) {
                var ctx_1 = theCtxs_1_1.value;
                _loop_1(ctx_1);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (theCtxs_1_1 && !theCtxs_1_1.done && (_a = theCtxs_1.return)) _a.call(theCtxs_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        // back-end has notion of currently loaded dataset; restore that to activeCtx's files
        if (activeCtx.loadedFiles) {
            u.startTimer("load context");
            this.lastLoaded = null; // prevent auto-reload while we're loading
            theProtocol.load(activeCtx.loadedFiles, function (info) {
                var t = u.endTimer("load context");
                u.log("ctx switch reloaded", JSON.stringify(info));
                if (restart)
                    activeCtx.status.error("back-end failed; restarting and reloading data");
                else
                    //activeCtx.status.set("loaded data for " + activeCtx.ctxName)
                    _this.reportInfo(activeCtx, t);
                _this.loaded();
            });
        }
        else if (restart) {
            activeCtx.status.error("back-end failed; restarting");
        }
        // new active window gets key events
        activeCtx.window.focus();
        // save new active context state in ~/.t2 for --resume
        activeCtx.undo.writeState();
    };
    // reactiveate this ctx to reload back-end on a back-end restart
    Ctx.prototype.reactivate = function () {
        this.activate(this.ctxName, true);
    };
    // user action to open a new context
    Ctx.prototype.newCtx = function (initialPaths) {
        new Ctx(initialPaths);
    };
    // user action to close current context
    Ctx.prototype.close = function () {
        // remove our rendering
        this.iframe.remove();
        // remove us from list of Ctxs
        var i = theCtxs.indexOf(this);
        theCtxs.splice(i, 1);
        // activate a different Ctx
        if (theCtxs.length == 0)
            new Ctx([]);
        else
            theCtxs[0].activate();
    };
    // user action to clone current context
    Ctx.prototype.clone = function () {
        new Ctx([], this);
    };
    Ctx.prototype.rename = function (newName) {
        this.ctxName = newName;
        var ctxNames = theCtxs.map(function (c) { return c.ctxName; });
        this.ctxSelector.populate(ctxNames, this.ctxName);
    };
    //
    //
    //
    // render processed data - generate chart table
    Ctx.prototype.render = function (cacheEntry, range, bigChange) {
        var _this = this;
        u.withStatus("rendering", function () {
            if (!_this.loadedRange)
                throw "rendering but no loaded data";
            // are we showing the whole data range or only a part?
            // this controls whether an additional overview timeline is shown
            var overallRange = _this.loadedRange.eq(range) ? null : _this.loadedRange;
            // remember our position: if it's a big change we go back
            // to the top, else keep the same scroll y position
            var scrollTop = bigChange ? 0 : _this.scroller.node().scrollTop;
            // render data - generate charts table
            _this.chartTable.html("");
            _this.chartSet = new charts.ChartSet(_this.chartTable, cacheEntry, overallRange, range, _this.viewSelector.currentState.viewName);
            // caution about chart time shift
            if (_this.options.timeline == "aligned") {
                _this.cautions.html("\n                    Caution: some charts may be shifted relative to\n                    displayed timeline, so values on the time axis may\n                    not match the data.  Use the Dataset box to adjust\n                    chart time shift if needed.\n                ");
                _this.cautions.style("display", null);
            }
            else if (_this.options.timeline == "condensed") {
                _this.cautions.html("\n                    Caution: time gaps between files have been\n                    removed, so values on the time axis may not match\n                    the data, and separate sources may not be\n                    correctly aligned.\n                ");
                _this.cautions.style("display", null);
            }
            else {
                _this.cautions.html("");
                _this.cautions.style("display", "none");
            }
            // rendered charts, so make view selector visible
            _this.viewSelector.hide(false);
            // restore position
            _this.scroller.node().scrollTop = scrollTop;
            // report timing and memory
            var t = u.endTimer("update view");
            _this.reportInfo(_this, t);
            // if testing advance to next step
            test.stepFinished();
        });
    };
    // shows the current state including options
    // if bigChange is true we scroll back to the top after rendering
    Ctx.prototype.show = function (bigChange) {
        var _this = this;
        if (!this.loadedRange)
            throw "showing but no data loaded";
        u.continueTimer("update view");
        // null means show the whole loaded range
        this.shownRange = this.currentState.range ? this.currentState.range : this.loadedRange;
        // nothing to show
        if (!this.shownRange) {
            this.status.set("no data loaded");
            test.stepFinished();
            return;
        }
        // adjust this.shownRange - e.g. if files have been removed
        if (this.shownRange.tMax > this.loadedRange.tMax)
            this.shownRange.tMax = this.loadedRange.tMax;
        if (this.shownRange.tMin < this.loadedRange.tMin)
            this.shownRange.tMin = this.loadedRange.tMin;
        if (this.shownRange.tMax <= this.shownRange.tMin)
            this.shownRange = new u.TimeRange(this.loadedRange.tMin, this.loadedRange.tMax);
        // type guard
        if (!this.shownRange)
            throw "can't get here";
        // number of samples to request from back-end
        var nSamples = this.options.nSamples;
        // look for data for this range and number of samples in the cache
        var cacheEntry = this.cache.get(this.shownRange, nSamples);
        // did we alredy sample and process the data for this request?
        if (cacheEntry) {
            // yes, just render it and done
            u.log("using procssedData from cache for range " + this.shownRange);
            this.rawSourceData = cacheEntry.rawSourceData;
            this.render(cacheEntry, this.shownRange, bigChange);
        }
        else {
            // nope, we need to fetch samples, process, then render
            var delta = (this.shownRange.tMax - this.shownRange.tMin) / nSamples;
            u.log("show tMin", this.shownRange.tMin, "tMax", this.shownRange.tMax, "delta", delta);
            if (delta < 1000)
                delta = 1000;
            var receiveData = function (sourceList) {
                var e_3, _a;
                // got data?
                if (!sourceList || sourceList.length == 0) {
                    u.log("no data");
                    u.endTimer("update view");
                    return;
                }
                // log some stuff
                u.log(sourceList.length, "filesets:");
                for (var i in sourceList) {
                    var source = sourceList[i];
                    var data_1 = source.data[Object.keys(source.data)[0]];
                    var nSamples_1 = data_1 ? data_1.length : 0;
                    u.log("  ", i, source.source, source.type, nSamples_1);
                }
                // extract sourceList into a map by source name,
                // merging multiple sources with the same name (and
                // presumably different types, and therefore different
                // metrics)
                _this.rawSourceData = {};
                try {
                    for (var sourceList_1 = __values(sourceList), sourceList_1_1 = sourceList_1.next(); !sourceList_1_1.done; sourceList_1_1 = sourceList_1.next()) {
                        var source = sourceList_1_1.value;
                        var sourceData = _this.rawSourceData[source.source];
                        if (!sourceData)
                            sourceData = _this.rawSourceData[source.source] = {};
                        Object.assign(sourceData, source.data);
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (sourceList_1_1 && !sourceList_1_1.done && (_a = sourceList_1.return)) _a.call(sourceList_1);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                // process data - compute rates, etc. - then render
                u.withStatus("processing", function () {
                    if (!_this.shownRange)
                        throw "can't get here";
                    var processedSourceData = data.processData(_this.rawSourceData);
                    cacheEntry = _this.cache.put(_this.shownRange, nSamples, _this.rawSourceData, processedSourceData);
                    _this.render(cacheEntry, _this.shownRange, bigChange);
                });
            };
            // sample the data
            theProtocol.sampleData(this.shownRange, delta, this.dataset.getShifts(), receiveData);
        }
    };
    // jump the scroller to the top or jump to previous location if already at the top
    Ctx.prototype.jumpScroller = function () {
        if (this.scroller.node().scrollTop > 0) {
            this.prevScrollTop = this.scroller.node().scrollTop;
            this.scroller.node().scrollTop = 0;
        }
        else if (this.prevScrollTop) {
            this.scroller.node().scrollTop = this.prevScrollTop;
        }
    };
    // load requested paths, and then show them
    Ctx.prototype.showFiles = function (paths, // files to show
    filesChanged, // whether we should clear the cache
    bigChange, // whether scroll position will still be meaningful
    onload // callback
    ) {
        var _this = this;
        // clear cache if files changed as the data will be different
        if (filesChanged)
            this.cache.clear();
        // no data to show, buh-buh
        // xxx can this be folded into this.show?
        if (paths.length == 0) {
            this.viewSelector.hide(true);
            this.chartTable.html("");
            this.status.setIfEmpty("no data loaded");
            test.stepFinished();
            return;
        }
        // show the files!
        u.startTimer("update view");
        this.lastLoaded = null; // prevent auto-reload while we're loading
        theProtocol.load(paths, function (info, allMeta) {
            if (info.tMin > info.tMax) {
                _this.status.set("no data loaded");
                return;
            }
            if (onload)
                onload(info);
            _this.loadedFiles = u.copy(paths); // record the loaded files
            _this.loadedRange = new u.TimeRange(info.tMin, info.tMax); // record the new loaded range
            _this.loadedInfo = info;
            _this.loaded();
            u.log("loaded range ", _this.loadedRange);
            _this.keyInfo.show(allMeta);
            _this.show(bigChange);
        });
    };
    //
    // Support for auto-reload.
    //
    // Call reload() to check whether it might be time for an auto
    // reload. This checks whether reload is enabled, we're still the
    // active context, and we're not in the middle of a reload. If so
    // then look to see when we should do a reload; if that time has
    // already passed, reload; else schedule a call again for the
    // future. In any case return true if we reloaded.
    //
    Ctx.prototype.reload = function () {
        var _this = this;
        if (this.options.reloadEnabled && activeCtx == this && this.lastLoaded) {
            var reloadAt = new Date(this.lastLoaded.getTime() + this.options.reloadInterval * 1000);
            var now = new Date();
            if (now >= reloadAt) {
                // time to reload
                this.showFiles(this.loadedFiles, true, false, function () { });
                return true;
            }
            else {
                // not time yet, schedule for the future
                this.window.setTimeout(function () { return _this.reload(); }, reloadAt.getTime() - now.getTime() + 100);
            }
        }
        return false;
    };
    Ctx.prototype.loaded = function () {
        this.lastLoaded = new Date();
        this.reload(); // normally will just schedule for the future
    };
    //
    // query current time range of the files loaded on the server
    //
    Ctx.prototype.getLoadedRange = function () {
        return this.loadedRange;
    };
    //
    //
    //
    // change range in response to a user action. Records change for undo/redo
    Ctx.prototype.showRangeAction = function (range) {
        this.currentState.range = range;
        this.undo.updateState({ ctx: this.currentState });
        this.show(false);
    };
    // restore state for undo/redo
    Ctx.prototype.restoreState = function (newState) {
        this.currentState = newState;
        this.show(false);
    };
    return Ctx;
}());
exports.Ctx = Ctx;
//
// process-global state
//
var theCtxs = []; // all existing Ctxs,
var contextNumber = 0; // for default context name
var activeCtx; // one of which is active
var theProtocol; // endpoint for communicating with back-end
var theVersion; // this app version
var zoomLevel = 0; // applied to top-level html element, so global
// all other modules use this function to obtain the current active Ctx
function ctx() {
    return activeCtx;
}
exports.default = ctx;
// this is our initial entry point
window.onload = function () {
    var e_4, _a, _b;
    // debug info
    u.log("cwd", process.cwd());
    u.log("__filename", __filename);
    // set some module globals
    theVersion = electron.remote.app.getVersion();
    u.log("version", theVersion);
    // parse command line args
    var argv = electron.remote.process.argv;
    u.log("initial argv", JSON.stringify(argv));
    argv = argv.slice(electron.remote.app.isPackaged ? 1 : 2);
    u.log("trimmed argv", JSON.stringify(argv));
    var args = minimist(argv, {
        boolean: ["ws", "resume"],
    });
    u.log("parsed args", JSON.stringify(args));
    // transport to back is normally pipe, optionally websocket
    var transportClass = args.ws ? transport.WebSocketTransport : transport.PipeTransport;
    // initial paths from command line plus test.initPaths
    var initPaths = args._.concat(test.initPaths);
    // initial state is blank, or resumed from ~/.t2
    var clone = args.resume ? "resume" : null;
    // bit of a hack: we get get the html size from css and resize window to that
    // this allows us to specify initial window size in em units
    var document = d3.select(window.document);
    var content = document.select("html").node().getBoundingClientRect();
    window.resizeTo(content.width, content.height);
    window.moveTo(50, 50);
    // register callback that will process paths sent by osx "open"
    // command received if this process is already open. They come in
    // one at a time so set a timer to process them all at once.
    var openFilePaths = [];
    electron.remote.app.on("open-file", function (_, path) {
        if (openFilePaths.length == 0) {
            setTimeout(function () {
                u.log("opening", openFilePaths);
                new Ctx(openFilePaths);
                openFilePaths = [];
            }, 100);
        }
        u.log("open-file path", path);
        openFilePaths.push(path);
    });
    // load external descriptors
    var descriptorsFile = process.env["DESCRIPTORS"];
    if (descriptorsFile)
        descriptors.loadDescriptors(descriptorsFile);
    // process T2_IGNORE environment variable: comma-separated list of
    // path prefixes to ignore each path prefix is a dot-separated
    // list of metrics.
    if (process.env.T2_IGNORE) {
        var paths = [];
        try {
            for (var _c = __values(process.env.T2_IGNORE.split(",")), _d = _c.next(); !_d.done; _d = _c.next()) {
                var prefix = _d.value;
                paths.push(new ((_b = u.Path).bind.apply(_b, __spread([void 0], prefix.split("."))))());
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
            }
            finally { if (e_4) throw e_4.error; }
        }
        descriptors.ignore(paths);
    }
    // kick things off - create Protocol which creates a transport
    // which starts the back-end. We provide a callback that creates
    // our first Ctx when the back-end is ready.
    new protocol.Protocol(
    // which transport class to use (Pipe, WebSocket, ...)
    transportClass, 
    // onopen
    function (protocol) {
        // global, used by all Ctxs
        theProtocol = protocol;
        if (!activeCtx) {
            // initial startup; show files on command line, if any
            u.log("command line args: " + args);
            new Ctx(initPaths, clone);
        }
        else {
            // back-end restart; re-active activeCtx to reload it's data in back-end
            activeCtx.reactivate();
        }
    }, 
    // onmessage - handle unsolicited messages
    function (msg) {
        if (msg.status)
            activeCtx.status.set(msg.status, msg.progress);
    });
    // waiting until this point and then doing this on a delay reduces screen flash on startup
    // xxx not needed for electron, it seems
    //setTimeout(() => gui.Window.get().show(), 200)
};
//# sourceMappingURL=ctx.js.map