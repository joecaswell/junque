"use strict";
//
// This is the main module run at startup time from the main process.
// Everything else runs in the renderer process, via front.html,
// starting with window.onload in ./ctx
//
// Don't import any other local modules as that will drag everything in
//
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var os = require("os");
var path = require("path");
var electron = require("electron");
var tmpDir = process.env.TMP || process.env.TEMP || "/tmp";
var logFn = path.join(tmpDir, "t2.log");
var logFd = fs.openSync(logFn, "w");
function log() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var msg = Array.from(args).join(" ");
    var d = new Date().toISOString();
    var line = d + ' MAIN  ' + msg + os.EOL;
    try {
        process.stdout.write(line);
        if (logFd >= 0)
            fs.writeSync(logFd, line);
    }
    catch (e) {
        console.log(e);
    }
}
exports.log = log;
// osx args specified using "open -a ..." arrive here if this process
// was started by the open command, so we just add them to argv.
electron.app.on("open-file", function (_, path) {
    log("open-file got path", path);
    process.argv.push(path);
});
// keep global ref to prevent gc
var win = null;
electron.app.on("activate", createWindow);
electron.app.on("ready", createWindow);
electron.app.on("window-all-closed", function () {
    //if (process.platform !== "darwin")
    electron.app.quit();
});
function createWindow() {
    // already created?
    if (win != null)
        return;
    // Create the browser window.
    win = new electron.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true
        }
    });
    // load html stub, which the loads top.js to kick things off
    win.loadFile("front.html");
    // emitted when the window is closed.
    win.on("closed", function () { return win = null; });
    // forward find results to renderer process
    win.webContents.on("found-in-page", function (event, result) {
        log("found-in-page", JSON.stringify(result));
        if (result.finalUpdate)
            win.webContents.send("found", result.matches);
    });
}
// handle find requests from renderer process
electron.ipcMain.on("find", function (event, text, dir) {
    log("find", JSON.stringify(text), dir);
    if (!win)
        return;
    if (text.length) {
        var forward = dir >= 0;
        var findNext = dir != 0;
        if (!findNext)
            win.webContents.stopFindInPage("clearSelection");
        var requestId = win.webContents.findInPage(text, { forward: forward, findNext: findNext });
    }
    else {
        win.webContents.stopFindInPage("keepSelection");
        win.webContents.send("found", 0);
    }
});
//# sourceMappingURL=front.js.map