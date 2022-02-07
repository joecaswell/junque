"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var ctx_1 = require("./ctx");
var u = require("./util");
////////////////////////////
//
// Undo records and manages state information necessary to implement
// undo and redo.
//
// The entire application state managed by undo/redo is divided into
// parts, called "clients", such that:
//
// * State information for each client can be saved and restored
//   independently of other clients. On each undo/redoable user action
//   only the affected clients inform Undo of the new state for that
//   client. This allows undo/redo to restore only the affected
//   portion of the total app state, avoiding unnecesary and
//   potentially expensive state updates.
//
// * State information for provided by each client is the total
//   information necessary to restore the state for that part of the
//   app.
//
// When a client registers via registerClient it passes in a default
// initial state. If the undo system already has a state for that
// client it is returned by registerClient; otherwise the supplied
// initial state is recorded as the current undo state, and is
// returned by registerClient. The client is expected to pass in a
// default initial state, but use as its initial state whatever is
// returned by registerClient. This supports "sticky" state that lasts
// across DOM reloads, context cloning, and restore saved state.
//
// Undo copies all state on the way in and on the way out so that
// clients don't have to worry about changes they make affecting
// recorded undo state, and vice versa. Copy is made via u.copy which
// works by serializing/deserializing through JSON. That function will
// need to be updated with any classes that need to be copied, like
// TimeRange.
//
// Saved state information must be guaranteed to be valid across
// arbitrary app state changes. For example times, file names, section
// names, DOM ids are typically valid; DOM objects, d3 selections, screen
// positions and so an are typically not.
//
// xxx move to css
var undoColorEnabled = "rgb(100, 100, 100)";
var undoColorDisabled = "rgb(230, 230, 230)";
var Undo = /** @class */ (function () {
    function Undo(parent, init) {
        var _this = this;
        // registry of clients by name
        this.clients = {};
        // we move back and forth through the list of states by undo/redo,
        // and clients extend the list of states with updateState
        this.states = [{ total: {}, undo: null, redo: null }];
        this.currentState = 0;
        // initial state can be
        // null: blank initial state
        // Undo: copy of another contexts initial state
        // "resume": read the initial state from ~/.t2
        if (init == "resume") {
            this.states[0].total = this.readState();
        }
        else if (init) {
            // xxx is the copy needed?
            // xxx doesn't copy undo history - should we?
            this.states[0].total = u.copy(init.states[init.currentState].total);
        }
        // debug
        var logStates = function () {
            u.log("total states is now:");
            for (var i = 0; i < _this.states.length; i++)
                u.log((i == _this.currentState ?
                    "* " :
                    "  ") + i + " " + JSON.stringify(_this.states[i].total));
            u.log("undo states is now:");
            for (var i = 0; i < _this.states.length; i++)
                u.log((i == _this.currentState ?
                    "* " :
                    "  ") + i + " " + JSON.stringify(_this.states[i].undo));
            u.log("redo states is now:");
            for (var i = 0; i < _this.states.length; i++)
                u.log((i == _this.currentState ?
                    "* " :
                    "  ") + i + " " + JSON.stringify(_this.states[i].redo));
        };
        logStates; // suppress unused error
        // used by undoAction/redoAction to restore clients to the specified state
        var restoreState = function (state) {
            state = u.copy(state);
            for (var clientName in state) {
                u.log("restoring " + clientName + " to " + JSON.stringify(state[clientName]));
                _this.clients[clientName].restoreState(state[clientName]);
            }
        };
        var undoAction = function () {
            var undoState = _this.states[_this.currentState].undo;
            if (undoState) {
                restoreState(undoState);
                _this.currentState--;
                _this.updateButtons();
                _this.writeState();
            }
        };
        var redoAction = function () {
            var redoState = _this.states[_this.currentState].redo;
            if (redoState) {
                restoreState(redoState);
                _this.currentState++;
                _this.updateButtons();
                _this.writeState();
            }
        };
        //
        // view
        //
        var top = parent.append("span").attr("id", "undo");
        var button = function (path, onclick, tooltip) {
            var svg = top
                .append("span")
                .attr("title", tooltip)
                .append("svg")
                .attr("viewBox", "0 0 1 1")
                .attr("preserveAspectRatio", "none")
                .style("width", "1.5em")
                .style("height", "1.2em")
                .style("fill", undoColorDisabled)
                .on("click", onclick);
            svg.append("path")
                .attr("d", path);
            return svg;
        };
        this.undoBtn = button("M .9 0  L .9 1  L 0 .5 Z", undoAction, "undo");
        this.redoBtn = button("M .1 0  L .1 1  L 1 .5 Z", redoAction, "redo");
        // initialize enabled/disabled state
        this.updateButtons();
    }
    Undo.prototype.updateButtons = function () {
        var state = this.states[this.currentState];
        this.undoBtn.style("fill", state.undo ? undoColorEnabled : undoColorDisabled);
        this.redoBtn.style("fill", state.redo ? undoColorEnabled : undoColorDisabled);
        //logStates()
    };
    // registers a new client, which must provide a restoreState
    // method that will be called on undo or redo. initialState is the
    // default state of the client at app startup. Returns the current state
    // for that client, which can be used to re-initialize the client
    // if it loses track of state, e.g. on a DOM rebuild.
    // Makes a copy of initialState on the way in, currentClientState on the way out.
    Undo.prototype.registerClient = function (clientName, client, initialState) {
        // register client
        this.clients[clientName] = client;
        // do we have a current state for this client or should client use initialState?
        var currentClientState = this.states[this.currentState].total[clientName];
        if (!currentClientState)
            currentClientState = this.states[0].total[clientName] = u.copy(initialState);
        // save state
        this.writeState();
        // return copy current state
        u.log("register", clientName, "initial state", JSON.stringify(currentClientState));
        return u.copy(currentClientState);
    };
    // retrieve a copy of the current state
    Undo.prototype.getCurrentState = function () {
        return u.copy(this.states[this.currentState].total);
    };
    // called by a client to provide the new state after an undo/redoable
    // user action. Contains one or more properties whose name is the
    // client name and whose value is the new state for that client.
    // Makes a copy of the supplied state so we don't see changes.
    Undo.prototype.updateState = function (stateUpdate) {
        // make copy on the way int
        stateUpdate = u.copy(stateUpdate);
        // our current state before stateUpdate
        var before = this.states[this.currentState];
        // what we have to do in the current state to redo this action
        before.redo = stateUpdate;
        // what we would have to change to undo and get back to the before state
        var undo = {};
        for (var clientName in stateUpdate)
            undo[clientName] = before.total[clientName];
        // our new total state is obtained by merging before total state and the state updates
        var afterTotal = Object.assign({}, before.total, stateUpdate);
        // record total, undo, and redo information for our new state
        this.currentState += 1;
        this.states[this.currentState] = {
            total: afterTotal,
            undo: undo,
            redo: null,
        };
        this.states.length = this.currentState + 1; // (not necessary - array is delimited by nulls)
        // show new button enabled/disable state
        this.updateButtons();
        // save most recent state
        this.writeState();
    };
    Undo.prototype.t2fn = function () {
        var home = process.env["HOME"];
        if (!home)
            throw "no home directory";
        return home + "/.t2";
    };
    Undo.prototype.writeState = function () {
        try {
            var state = {
                version: ctx_1.default().getVersion(),
                total: this.states[this.currentState].total
            };
            fs.writeFileSync(this.t2fn(), u.serialize(state), "utf-8");
        }
        catch (e) {
            u.log("writeState", e);
        }
    };
    Undo.prototype.readState = function () {
        try {
            var fn = this.t2fn();
            var state = u.deserialize(fs.readFileSync(fn, "utf-8"));
            if (state.version != ctx_1.default().getVersion()) {
                throw fn + " version " + state.version +
                    " does not match t2 version " + ctx_1.default().getVersion();
            }
            return state.total;
        }
        catch (e) {
            ctx_1.default().status.error(e);
            return {};
        }
    };
    return Undo;
}());
exports.Undo = Undo;
//# sourceMappingURL=undo.js.map