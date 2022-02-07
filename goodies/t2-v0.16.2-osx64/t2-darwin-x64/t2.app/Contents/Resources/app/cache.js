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
var u = require("./util");
////////////////////////////
//
// Cache and caches data to improve UI responsiveness. Cached data
// includes
//
// * the sampled and processed timeseries data for a give time range
//    and number of samples
//
// * the generated chart svg elements
//
var Entry = /** @class */ (function () {
    function Entry(rawSourceData, processedSourceData) {
        // will be used by charts.Chart to cache chart svgs
        this.chartCache = new Map();
        this.rawSourceData = rawSourceData;
        this.processedSourceData = processedSourceData;
    }
    return Entry;
}());
exports.Entry = Entry;
var MAX_ENTRIES = 5;
var lruArray = Array(MAX_ENTRIES).fill({});
var Cache = /** @class */ (function () {
    function Cache(name) {
        this.cache = new Map();
        this.name = name;
    }
    Cache.prototype.key = function (range, nSamples) {
        return range.tMin + "," + range.tMax + "," + nSamples;
    };
    Cache.prototype.put = function (range, nSamples, rawSourceData, processedSourceData) {
        // add entry to cache
        var entry = new Entry(rawSourceData, processedSourceData);
        var newKey = this.key(range, nSamples);
        this.cache.set(newKey, entry);
        // delete oldest lru entry, add our entry
        var lru = lruArray.pop();
        if (lru.cache && lru.key) {
            lru.cache.cache.delete(lru.key);
            u.log(lru.cache.name, "delete entry leaving", lru.cache.cache.size);
        }
        lruArray.unshift({ cache: this, key: newKey });
        return entry;
    };
    Cache.prototype.get = function (range, nSamples) {
        var key = this.key(range, nSamples);
        // update shared lru array
        var index;
        for (index = 0; index < lruArray.length; index++)
            if (lruArray[index].cache === this && lruArray[index].key === key)
                break;
        if (index < lruArray.length) {
            lruArray.splice(index, 1);
            lruArray.unshift({ cache: this, key: key });
            u.log(this.name, "moved key to front");
        }
        return this.cache.get(key);
    };
    Cache.prototype.clear = function () {
        this.cache = new Map();
    };
    Cache.prototype.stats = function () {
        var e_1, _a;
        u.log(this.name, "cache entries:", this.cache.size);
        var chartCacheEntries = 0;
        try {
            for (var _b = __values(this.cache.values()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var entry = _c.value;
                chartCacheEntries += entry.chartCache.size;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        u.log(this.name, "chart cache entries:", chartCacheEntries);
    };
    return Cache;
}());
exports.Cache = Cache;
//# sourceMappingURL=cache.js.map