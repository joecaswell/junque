"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ctx_1 = require("./ctx");
var u = require("./util");
var Protocol = /** @class */ (function () {
    function Protocol(transportClass, onopen, onmessage) {
        var _this = this;
        // match responses to requests
        this.pendingResponses = new Map();
        this.nextRequestId = 0;
        // start timing first view update
        u.continueTimer("update view");
        // start up a transport, which starts the back-end
        var createTransport = function () {
            new transportClass(
            // onopen
            function (transport) {
                _this.transport = transport;
                onopen(_this);
            }, 
            // onmessage
            function (msg) {
                // did we get memory stats?
                if (msg.memory)
                    _this.memory = msg.memory;
                if (msg.evicted)
                    _this.evicted += msg.evicted;
                // is it response or unsolicited?
                var callback = _this.pendingResponses.get("" + msg.id);
                _this.pendingResponses.delete("" + msg.id);
                if (msg.error) {
                    u.log("ERROR " + msg.error);
                    ctx_1.default().status.error(msg.error);
                }
                else if (callback) {
                    // received a response to a request
                    callback(msg);
                }
                else {
                    // received an unsolicited message
                    onmessage(msg);
                }
            }, 
            // onclose
            function () {
                ctx_1.default().status.set("back-end exited; restarting");
                createTransport();
            });
        };
        // start up a transport, which starts the back-end
        createTransport();
    }
    // add id, remember this request, send it via transport
    Protocol.prototype.sendRequest = function (msg, callback) {
        msg.id = this.nextRequestId++;
        this.pendingResponses.set("" + msg.id, callback);
        u.log("snd req " + msg.id + " " + msg.request);
        this.transport.sendRequest(msg);
    };
    // xxx support multiple paths - DataSet
    Protocol.prototype.load = function (paths, callback) {
        var req = {
            request: "load",
            paths: paths,
            sourcePerFile: ctx_1.default().options.sourcePerFile,
            sourcePerDir: ctx_1.default().options.sourcePerDir,
            condensed: ctx_1.default().options.timeline == "condensed",
        };
        this.sendRequest(req, function (msg) {
            callback(msg.info, msg.allMeta); // xxx run-time typecheck possible?
        });
    };
    // xxx switch to start, delta, n
    Protocol.prototype.sampleData = function (tr, delta, shifts, callback) {
        this.sendRequest({
            request: "data",
            tMin: tr.tMin,
            tMax: tr.tMax,
            delta: delta,
            shifts: shifts,
        }, function (msg) {
            callback(msg.data);
        });
    };
    // get metadata at time t
    Protocol.prototype.getMeta = function (t, shifts, type, callback) {
        this.sendRequest({
            request: "meta",
            type: type,
            t: t,
            shifts: shifts,
        }, function (msg) {
            callback(msg.meta);
        });
    };
    // get aggregated metadata
    Protocol.prototype.getAllMeta = function (callback) {
        this.sendRequest({
            request: "allMmeta",
        }, function (msg) {
            callback(msg.allMeta);
        });
    };
    return Protocol;
}());
exports.Protocol = Protocol;
//# sourceMappingURL=protocol.js.map