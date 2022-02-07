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
var u = require("./util");
var View = /** @class */ (function () {
    function View(options) {
        Object.assign(this, options);
        var initialState = {};
        this.overrides = ctx_1.default().undo.registerClient(this.viewClientName(), this, initialState);
    }
    // returns the explanation for this view. If explanation is a
    // string starting with #, it interprets the string as an id
    // referring to an element in views.html that contains the
    // explanation.
    View.prototype.getExplanation = function () {
        if (this.explanation.startsWith("#")) {
            var node = d3.select(ctx_1.default().topWindow.document).select("#view-explanations").node();
            var explanationsDoc = node.import;
            var explanationNode = d3.select(explanationsDoc).select(this.explanation).node();
            if (explanationNode != null)
                this.explanation = explanationNode.innerHTML; // xxx sanitize!
        }
        return this.explanation;
    };
    View.prototype.viewClientName = function () {
        // each view is a separate client of the undo/redo system because
        // its state (the overrides) can be updated independently
        return "view: " + this.name;
    };
    View.prototype.contains = function (desc) {
        if (this.overrides[desc.path.key] == "include")
            return true;
        else if (this.overrides[desc.name] == "include") 
            return true;
        else if (this.overrides[desc.id] == "include") 
            return true;
        else if (this.overrides[desc.id] == "exclude")
            return false;
        else if (this.overrides[desc.name] == "exclude")
            return false;
        else if (this.overrides[desc.path.key] == "exclude")
            return false;
        for (var i in this.exclude)
            if (desc.name.match(this.exclude[i]) || desc.path.key.match(this.exclude[i]))
                return false;
        for (var i in this.include)
            if (desc.name.match(this.include[i]) || desc.path.key.match(this.include[i]))
                return true;
        return false;
    };
    // add a metric to a view by setting its override to "include"
    View.prototype.add = function (desc) {
       // this.overrides[desc.id] = "include";
        u.log("Add: "+desc.name +", "+desc.key)
        this.overrides[desc.name] = "include";
    };
    // remove a metric from a view by setting its override to "exclude"
    View.prototype.remove = function (desc) {
       // this.overrides[desc.id] = "exclude";
        u.log("Remove: "+desc.name +", "+desc.key)
        this.overrides[desc.name] = "exclude";
    };
    // tell undo/redo about our new state, which is the set of overrides
    View.prototype.updateState = function () {
        var stateUpdate = {};
        stateUpdate[this.viewClientName()] = this.overrides;
        ctx_1.default().undo.updateState(stateUpdate);
    };
    // undo/redo calls this to restore our state
    View.prototype.restoreState = function (newState) {
        this.overrides = newState;
        ctx_1.default().show(false);
    };
    // toggles view membership for a list of metrics and renders the new state
    View.prototype.toggleMembershipAction = function (descs) {
        var e_1, _a;
        try {
            for (var descs_1 = __values(descs), descs_1_1 = descs_1.next(); !descs_1_1.done; descs_1_1 = descs_1.next()) {
                var desc = descs_1_1.value;
                u.log("Toggle: "+desc.names+", "+desc.key);
                if (this.contains(desc))
                    this.remove(desc);
                else
                    this.add(desc);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (descs_1_1 && !descs_1_1.done && (_a = descs_1.return)) _a.call(descs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        this.updateState(); // undo/redo
        ctx_1.default().show(false);
        u.log("VIEW EDIT: " + JSON.stringify(this));
    };
    View.prototype.reset = function () {
        this.overrides = {};
        this.updateState(); // undo/redo
        ctx_1.default().show(false);
    };
    View.prototype.isModified = function () {
        return !!Object.keys(this.overrides).length;
    };
    return View;
}());
//
// List of view definitions is built at load time by calls to addView.
//
var viewDefinitions = [];
function addView(viewOptions) {
    viewDefinitions.push(viewOptions);
}
//
// Each context instantiates a Views object which contains the view
// state for that context.
//
var Views = /** @class */ (function () {
    function Views() {
        var e_2, _a;
        this.views = new Map();
        try {
            for (var viewDefinitions_1 = __values(viewDefinitions), viewDefinitions_1_1 = viewDefinitions_1.next(); !viewDefinitions_1_1.done; viewDefinitions_1_1 = viewDefinitions_1.next()) {
                var viewDefinition = viewDefinitions_1_1.value;
                var view = new View(viewDefinition);
                if (viewDefinition.default)
                    this.defaultViewName = view.name;
                this.views.set(view.name, view);
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (viewDefinitions_1_1 && !viewDefinitions_1_1.done && (_a = viewDefinitions_1.return)) _a.call(viewDefinitions_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
    }
    Views.prototype.getView = function (name) {
        var view = this.views.get(name);
        if (!view)
            throw "unknown view name " + name;
        return view;
    };
    Views.prototype.getViewNames = function () {
        return this.views.keys();
    };
    return Views;
}());
exports.Views = Views;
//
// View definitions. Format is defined by ViewOptions type.
//
addView({
    name: "Custom",
    explanation: "\n        The Custom view is a starting point for building up your own\n        view from scratch.  You may instead start with a pre-defined\n        view selected from the menu and customize that.  Double-click\n        on a chart to add it to or remove it from the current view.\n    ",
    include: [],
    exclude: [],
    default: true
});
/* not really useful...
addView({
    name: "All metrics",
    explanation: "The default display of all metrics",
    include: [".*"],
    exclude: [],
})
*/
addView({
    name: "Basic",
    explanation: "#basic-view-explanation",
    include: [
        "serverStatus\u0000opcounters\u0000.*",
        "serverStatus\u0000opcountersRepl\u0000.*",
        "serverStatus\u0000opLatencies\u0000.*\u0000latency",
        "serverStatus\u0000globalLock\u0000activeClients\u0000.*",
        "serverStatus\u0000globalLock\u0000currentQueue\u0000.*",
        "serverStatus\u0000connections\u0000current$",
        "serverStatus\u0000metrics\u0000document\u0000.*",
        "serverStatus\u0000metrics\u0000queryExecutor\u0000.*",
        "replSetGetStatus\u0000members\u0000.*\u0000state",
        "replSetGetStatus\u0000members\u0000.*\u0000uptime",
        "replSetGetStatus\u0000members\u0000.*\u0000lag",
        "serverStatus\u0000network\u0000bytes(In|Out)",
        "serverStatus\u0000mem\u0000virtual",
        "serverStatus\u0000mem\u0000resident",
        "systemMetrics\u0000cpu\u0000(user|system|iowait|nice|steal|idle)_ms",
        "systemMetrics\u0000disks\u0000.*\u0000read_sectors",
        "systemMetrics\u0000disks\u0000.*\u0000write_sectors",
        "systemMetrics\u0000disks\u0000.*\u0000read_time_ms",
        "systemMetrics\u0000disks\u0000.*\u0000write_time_ms",
        "systemMetrics\u0000disks\u0000.*\u0000io_time_ms",
        "serverStatus\u0000wiredTiger\u0000cache\u0000bytes currently in the cache",
        "mongod\u0000bin 0",
        "mongod\u0000max",
    ],
    exclude: []
});
addView({
    name: "Memory",
    explanation: "#memory-view-explanation",
    include: [
        "serverStatus\u0000opcounters\u0000.*",
        "serverStatus\u0000opcountersRepl\u0000.*",
        "serverStatus\u0000connections\u0000current",
        "serverStatus\u0000uptime",
        "serverStatus\u0000mem\u0000virtual",
        "serverStatus\u0000mem\u0000resident",
        "serverStatus\u0000tcmalloc\u0000derived\u0000virtual minus heap",
        "serverStatus\u0000tcmalloc\u0000generic\u0000heap_size",
        "serverStatus\u0000tcmalloc\u0000generic\u0000current_allocated_bytes",
        "serverStatus\u0000tcmalloc\u0000derived\u0000allocated minus wt cache",
        "serverStatus\u0000wiredTiger\u0000data-handle\u0000connection data handles currently active",
        "serverStatus\u0000tcmalloc\u0000derived\u0000total free",
        "serverStatus\u0000tcmalloc\u0000tcmalloc\u0000pageheap_unmapped_bytes",
        "serverStatus\u0000heapProfile",
    ],
    exclude: []
});
addView({
    name: "Bottlenecks",
    explanation: "#bottlenecks-view-explanation",
    include: [
        "serverStatus\u0000globalLock\u0000activeClients\u0000.*",
        "serverStatus\u0000globalLock\u0000currentQueue\u0000.*",
        "systemMetrics\u0000disks\u0000.*\u0000io_queued_ms",
        "systemMetrics\u0000disks\u0000xvda\u0000io_time_ms",
        "systemMetrics\u0000cpu\u0000(user|system|iowait|nice|steal)_ms",
        "systemMetrics\u0000cpu\u0000procs_(running|blocked)",
        "serverStatus\u0000wiredTiger\u0000concurrentTransactions\u0000.*\u0000out",
        "serverStatus\u0000locks\u0000.*\u0000timeAcquiringMicros\u0000.*",
        "serverStatus\u0000wiredTiger\u0000.*usecs",
        "mongod\u0000bin 0",
        "mongod\u0000max",
    ],
    exclude: [],
});
addView({
    name: "Cache Overflow Usage",
    explanation: "\n        Information about cache overflow usage in WiredTiger. Cache overflow is\n        implemented using something called the lookaside table. The cost of\n        cache overflow is paid in several different places: reconciliation\n        becomes more expensive needing to write to the data file as well as\n        lookaside. Reads of data become more expensive because they require\n        reading from both the data file and lookaside, and there is also\n        additional maintenance to remove redundant content from the lookaside\n        file.\n        ",
    include: [
        ".*block-manager bytes.*",
        ".*cache eviction state.*",
        ".*bytes currently in the cache.*",
        ".*tracked dirty bytes in the cache.*",
        ".*lag.*",
        ".*lookaside.*",
        ".*currently operating in aggressive.*",
        ".*transaction checkpoint currently running.*",
        ".*transaction checkpoint most recent.*",
        ".*transaction range of IDs.*",
        ".*transaction range of timestamps.*",
    ],
    exclude: [
        ".*heartbeat.*lag.*",
    ],
});
addView({
    name: "Parallel Operations",
    explanation: "\n        Active concurrent operations. Spikes in the number of\n        concurrent operations can lead to contention opening\n        resources. Consistently high concurrent operations can\n        lead to CPU context switching, which reduces overall\n        performance.\n    ",
    include: ["concurrentTransactions.*out"],
    exclude: [],
});
addView({
    name: "WT Checkpoint",
    explanation: "Checkpoint health indicators.",
    include: [".*eckpoint"],
    exclude: ["oplog"],
});
addView({
    name: "WT Eviction Efficiency",
    explanation: "Eviction efficiency measures.",
    include: [
        "pages requested from the cache",
        "tracked dirty bytes in the cache",
        "eviction calls to get a page",
        "pages read into cache",
        "pages queued for eviction",
        "pages seen by eviction walk"
    ],
    exclude: ["oplog"],
});
addView({
    name: "WT Handle Counts",
    explanation: "Open WiredTiger thread and collection contexts.",
    include: [
        "open.*count",
        "connections created"
    ],
    exclude: ["oplog"],
});
addView({
    name: "WT IO",
    explanation: "IO load generated by WiredTiger.",
    include: [
        "block-manager.*bytes read",
        "block-manager.*bytes written"
    ],
    exclude: [],
});
addView({
    name: "WT Hot Pages",
    explanation: "Indicators that a workload has hot documents.",
    include: [
        "page acquire time sleeping",
        "reconciliation leaf page multi",
        "maximum page size at eviction"
    ],
    exclude: [],
});
//
// Views to diagnose particular known issues
//
// General metrics to describe mongod performance
var performanceMeasures = [
    "opcounters",
    "opLatencies.*latency",
    "activeClients",
    "currentQueue",
    "connections",
];
addView({
    name: "DX: Colocated Data and Journal",
    explanation: "#colocation-view-explanation",
    include: [
        "checkpoint currently running",
        "systemMetrics\u0000disks\u0000.*\u0000io_queued_ms",
        "systemMetrics\u0000disks\u0000xvda\u0000io_time_ms",
        "atomic update races|atomic updates raced",
        "found active slot closed",
        "slot join active slot closed|slot join races",
        "log sync time duration",
        "active filesystem fsync calls"
    ].concat(performanceMeasures),
    exclude: [],
});
addView({
    name: "DX: Pinning Single Oplog Batch",
    explanation: "\n    This view identifies whether content pinned in cache by a single oplog batch\n     causes a slowdown or hang.",
    include: [
        "apply\u0000batches\u0000num",
        "apply\u0000ops",
        "transaction range of timestamps currently pinned",
        "serverStatus\u0000wiredTiger\u0000cache\u0000bytes currently in the cache",
        "serverStatus\u0000wiredTiger\u0000cache\u0000tracked dirty bytes in the cache"
    ].concat(performanceMeasures),
    exclude: [],
});
addView({
    name: "DX: tcmalloc Heap Allocation",
    explanation: "This view identifies latency caused by >1mb heap frees.",
    include: [
        "pageheap",
        "spinlock_total_delay_ns"
    ].concat(performanceMeasures),
    exclude: [],
});
addView({
    name: "DX: Table Drop Performance",
    explanation: "\n    This view identifies drops in performance caused by dropping tables with\n     many open cursors.\n     ",
    include: [
        "cpu\u0000idle",
        "table drop",
        "serverStatus\u0000wiredTiger\u0000session\u0000open cursor count"
    ].concat(performanceMeasures),
    exclude: [],
});
//# sourceMappingURL=views.js.map
