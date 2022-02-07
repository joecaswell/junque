"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = require("child_process");
var path = require("path");
var ctx_1 = require("./ctx");
var u = require("./util");
////////////////////////////
//
// PipeTransport
//
var PipeTransport = /** @class */ (function () {
    function PipeTransport(onopen, onmessage, onclose) {
        var _this = this;
        u.log("PipeTransport");
        // spawn back-end
        var backPath = path.join(__dirname, "back");
        this.back = child_process.spawn(backPath);
        // handle errors
        this.back.on("error", function (error) {
            var msg = "error spawning back end: " + error;
            ctx_1.default().status.set(msg);
        });
        // accumulate an incoming message
        var pendingBytes = 0;
        var pendingData = [];
        // handler for incoming on stdout
        this.back.stdout.on("data", function (data) {
            // process our entire incoming buffer
            while (data.length) {
                // nothing pending, start a new message by reading length
                if (!pendingBytes) {
                    pendingBytes = data.readInt32LE(0);
                    data = data.slice(4);
                }
                // split off the data for the pending message
                var pending = data.slice(0, pendingBytes);
                data = data.slice(pendingBytes);
                // squirrel away the data for the pending message
                pendingBytes -= pending.length;
                pendingData.push(pending);
                // if we've assembled an entire message...
                if (pendingBytes == 0) {
                    // put the pieces togeter
                    var msg = Buffer.concat(pendingData);
                    // parse JSON
                    u.startTimer("parse response data");
                    var parsedMsg = JSON.parse(msg.toString());
                    u.endTimer("parse response data");
                    // inform our caller (i.e. Protocol)
                    onmessage(parsedMsg);
                    // nothing pending now
                    pendingData = [];
                }
            }
        });
        // forward close to caller
        this.back.stdout.on("close", onclose);
        // forward stderr which is logging stuff
        this.back.stderr.on("data", function (data) { return u.logRaw(data.toString()); });
        // we're ready now
        setTimeout(function () { return onopen(_this); }, 0);
    }
    // send a request: length followed by JSON message
    PipeTransport.prototype.sendRequest = function (msg) {
        var stringMsg = JSON.stringify(msg);
        var bufMsg = Buffer.from(stringMsg, 'utf8');
        var len = Buffer.allocUnsafe(4);
        len.writeInt32LE(bufMsg.length, 0);
        this.back.stdin.write(len);
        this.back.stdin.write(bufMsg);
    };
    return PipeTransport;
}());
exports.PipeTransport = PipeTransport;
////////////////////////////
//
// WebSocketTransport starts the back-end on port 27080 and commu
//
var WebSocketTransport = /** @class */ (function () {
    function WebSocketTransport(onopen, onmessage, onclose) {
        var _this = this;
        u.log("WebSocketTransport");
        // spawn back end
        var back = child_process.spawn("./back", ["--ws"]);
        back.stdout.on("data", function (data) { process.stdout.write(data); });
        back.stderr.on("data", function (data) { process.stderr.write(data); });
        back.on("close", function (code) { return u.log("back exited with code " + code); });
        // handle errors
        back.on("error", function (error) {
            var msg = "error spawning back end: " + error;
            ctx_1.default().status.set(msg);
        });
        // xxx need to handle close
        onclose;
        // for retry
        var opened = false;
        // wrap this in a function so we can retry with a setTimeout
        var createWebSocket = function () {
            // initialize connection to back end
            _this.webSocket = new WebSocket("ws://localhost:27080");
            // retry on error
            _this.webSocket.onerror = function (event) {
                u.log("webSocket error " + event);
                ctx_1.default().status.set("connecting to back");
                if (!opened)
                    setTimeout(createWebSocket, 100);
            };
            // handle messages from back end
            _this.webSocket.onmessage = function (event) {
                // handle string messages
                u.log("rcv msg len " + event.data.length);
                if (typeof (event.data) == "string") {
                    // parse to json
                    u.startTimer("parse response data");
                    var msg = JSON.parse(event.data);
                    u.endTimer("parse response data");
                    // forward message to our listener, which will be Protocol
                    try {
                        onmessage(msg);
                    }
                    catch (e) {
                        u.log("exception processing", msg.id, e.stack);
                    }
                }
                // xxx binary data?
            };
            // handle opened event
            _this.webSocket.onopen = function () {
                opened = true;
                onopen(_this);
            };
        };
        // start this off
        createWebSocket();
    }
    // send a request, call callback to provide response
    WebSocketTransport.prototype.sendRequest = function (msg) {
        this.webSocket.send(JSON.stringify(msg));
    };
    return WebSocketTransport;
}());
exports.WebSocketTransport = WebSocketTransport;
//# sourceMappingURL=transport.js.map