"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process = require("child_process");
//import * as d3 from "d3"
var path = require("path");
var fs = require("fs");
var ctx_1 = require("./ctx");
var u = require("./util");
var tests = {};
var Test = /** @class */ (function () {
    function Test(name, steps, nonStop) {
        if (nonStop === void 0) { nonStop = false; }
        this.name = name;
        this.steps = steps;
        this.nonStop = nonStop;
        tests[name] = this;
    }
    return Test;
}());
var Step = /** @class */ (function () {
    function Step(run, check) {
        if (run === void 0) { run = function () { }; }
        if (check === void 0) { check = function () { }; }
        this.run = run;
        this.check = check;
    }
    return Step;
}());
var Frame = /** @class */ (function () {
    function Frame() {
    }
    return Frame;
}());
var stack = [];
var nonStop = false;
var testDir = process.env.T2TESTDIR;
var isFirstStep = true;
function stackTop() {
    return stack.length ? stack[stack.length - 1] : null;
}
function pushTest(name) {
    u.log("ENTER TEST", name);
    var test = tests[name];
    if (test) {
        stack.push({
            test: test,
            step: 0
        });
        if (test.nonStop)
            nonStop = true;
        nextStep(0);
    }
    else {
        u.log("TEST", name, "NOT FOUND");
    }
}
function popTest() {
    stack.pop();
    if (stack.length == 0 || !stack[stack.length - 1].test.nonStop)
        nonStop = false;
    nextStep(1);
}
function firstStep() {
    if (process.env.T2TEST) {
        var tests_1 = process.env.T2TEST.split(",");
        if (tests_1.length == 1) {
            pushTest(tests_1[0]);
        }
        else {
            new Test(process.env.T2TEST, tests_1, true);
            pushTest(process.env.T2TEST);
        }
    }
}
function runStep(top, step) {
    u.log("RUN TEST", top.test.name, "STEP", top.step);
    step.run();
    isFirstStep = false;
}
function nextStep(advance) {
    var top = stackTop();
    if (top) {
        top.step += advance;
        var step = top.test.steps[top.step];
        if (step instanceof Step) {
            runStep(top, step);
        }
        else if (typeof step == "string") {
            pushTest(step);
        }
        else {
            u.log("TEST", top.test.name, "SUCCEEDS");
            popTest();
        }
    }
}
// hook to check result of running test
function stepFinished() {
    var top = stackTop();
    if (top) {
        var step = top.test.steps[top.step];
        if (step instanceof Step) {
            u.log("CHECK TEST", top.test.name, "STEP", top.step);
            try {
                step.check();
            }
            catch (e) {
                u.log("TEST FAILED:", e);
                if (nonStop) {
                    u.log("non-stop mode, continuing");
                }
                else {
                    stack = []; // abort test
                }
            }
        }
        nextStep(1);
    }
}
exports.stepFinished = stepFinished;
//
//
//
/*
function checkEq(act: number, exp: number, msg: string) {
    if (act != exp)
        u.log("TEST ERROR: " + msg + ": expected", exp, "actual", act)
}

function checkSel(sel: string, exp: number, msg: string) {
    checkEq(ctx().document.selectAll(sel).size(), exp, msg)
}
*/
function read(fn) {
    try {
        fn = path.join(testDir, fn);
        return fs.readFileSync(fn).toString();
    }
    catch (e) {
        return null;
    }
}
function diff(act, fn) {
    var actFn = "/tmp/" + fn;
    var expFn = path.join(testDir, fn);
    fs.writeFileSync(actFn, act);
    var cmd = "diff -y " + expFn + " " + actFn;
    child_process.execSync(cmd, { stdio: "inherit" });
}
function checkText(sel, fn, msg) {
    var act = "";
    ctx_1.default().document.selectAll(sel).each(function () {
        var text = this.textContent.trim();
        if (text != "")
            act += text + "\n";
    });
    if (act != read(fn)) {
        u.log("TEST ERROR: " + msg + "; diff:");
        try {
            diff(act, fn);
        }
        catch (e) {
            //
        }
        throw "text doesn't match for " + fn;
    }
}
// initial paths to load, used by Ctx
exports.initPaths = [];
function loadFiles() {
    var paths = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        paths[_i] = arguments[_i];
    }
    paths = paths.map(function (p) { return path.join(testDir, p); });
    if (isFirstStep)
        exports.initPaths = paths;
    else
        ctx_1.default().newCtx(paths);
}
//
//
//
new Test("ftdc-basic", [
    new Step(function () {
        loadFiles("lkdb-2017/diagnostic.data/metrics.2017-03-28T23-09-30Z-00000");
    }, function () {
        checkText("#charts td", "test-ftdc-basic-charts.txt", "chart text");
    })
]);
new Test("ftdc-multi", [
    new Step(function () {
        loadFiles("lkdb-two/13/diagnostic.data", "lkdb-two/28/diagnostic.data");
    }, function () {
        checkText("#charts td", "test-ftdc-multi-charts.txt", "chart text");
    })
]);
new Test("ftdc-win", [
    new Step(function () {
        loadFiles("ftdc-win");
    }, function () {
        checkText("#charts td", "test-ftdc-win-charts.txt", "chart text");
    })
]);
new Test("ftdc-360", [
    new Step(function () {
        loadFiles("360rc4");
    }, function () {
        checkText("#charts td", "test-ftdc-364-charts.txt", "chart text");
    })
]);
new Test("ss-basic", [
    new Step(function () {
        loadFiles("ss/ss.log");
    }, function () {
        checkText("#charts td", "test-ss-basic-charts.txt", "chart text");
    })
]);
new Test("cs-basic", [
    new Step(function () {
        loadFiles("cs/cs.log");
    }, function () {
        checkText("#charts td", "test-cs-basic-charts.txt", "chart text");
    })
]);
new Test("wt-basic", [
    new Step(function () {
        loadFiles("wt/WiredTigerStat.28.12");
    }, function () {
        checkText("#charts td", "test-wt-basic-charts.txt", "chart text");
    })
]);
new Test("csv-basic", [
    new Step(function () {
        loadFiles("csv/perf.csv", "csv/perf.csv");
    }, function () {
        checkText("#charts td", "test-csv-basic-charts.txt", "chart text");
    })
]);
new Test("iostat-basic", [
    new Step(function () {
        loadFiles("iostat/iostat.log");
    }, function () {
        checkText("#charts td", "test-iostat-basic-charts.txt", "chart text");
    }),
    new Step(function () {
        // unmerge charts
        ctx_1.default().optionsBox.test["merge"](false);
    }, function () {
        checkText("#charts td", "test-iostat-basic-charts-unmerged.txt", "chart text");
    })
]);
new Test("iostat-basic-2", [
    new Step(function () {
        loadFiles("iostat/iostat2.log");
    }, function () {
        checkText("#charts td", "test-iostat-basic-2-charts.txt", "chart text");
    }),
]);
new Test("log-basic", [
    new Step(function () {
        loadFiles("log/mongodb.log.2015-11-03T06-54-30");
    }, function () {
        checkText("#charts td", "test-log-basic-charts.txt", "chart text");
    })
]);
new Test("heap-profiler", [
    new Step(function () {
        loadFiles("heap-profiler");
    }, function () {
        checkText("#charts td", "test-heap-profiler-charts.txt", "chart text");
    }),
    new Step(function () {
        ctx_1.default().viewSelector.showViewAction("Memory");
    }, function () {
        checkText("#charts td", "test-heap-profiler-charts-memory-view.txt", "chart text");
    })
]);
new Test("ftdc+log-basic", [
    new Step(function () {
        loadFiles("HELP-4086/diagnostic.data", "HELP-4086/mongod.log", "HELP-4086/mongod.log-20170406-1491462001");
    }, function () {
        checkText("#charts td", "test-ftdc+log-basic-charts.txt", "chart text");
    })
]);
var allSteps = [
    new Step(),
    "ftdc-360",
    "ftdc-basic",
    "ftdc-win",
    "log-basic",
    "ss-basic",
    "cs-basic",
    "wt-basic",
    "csv-basic",
    "iostat-basic",
    "iostat-basic-2",
    "ftdc-multi",
    //"heap-profiler",
    "ftdc+log-basic",
];
new Test("all", allSteps);
new Test("all-nonstop", allSteps, true);
//
// run initial test if any - must come last after tests are registered
//
firstStep();
//# sourceMappingURL=test.js.map