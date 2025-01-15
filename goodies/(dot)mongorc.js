var tojson = JSON.stringify

var _randomFun = Math.random; //default to generic random in generator functions
const _savedRandom = Math.random;
var setRandom = function(lambda) {
    if (typeof lambda == "function") {
        _randomFun = lambda;
        Math.random = lambda;
    }
}

var resetRandom = function() {
    Math.random = _savedRandom;
}

var seededRandom = function(seed, selectedprime) {
    if (this.x !== undefined) return new seededRandom(seed, selectedprime)
    var thisrand = this
    if (typeof seed == "number")
        thisrand.x = seed
    if (typeof thisrand.x === "undefined")
        thisrand.x = (new Date()).valueOf()
    var prime = 16525637
    if (typeof selectedprime == "number")
        prime = parseInt(selectedprime)
    return function() {
        thisrand.x = ((thisrand.x * 47543538.8) % prime)
        if (thisrand.x == prime)
            thisrand.x -= 1 / prime
        return thisrand.x / prime
    }
}

var setRandomSeed = function(seed, selectedprime) {
    if (typeof selectedprime == "number") {
        _randomFun = seededRandom(seed, selectedprimed)
    } else {
        _randomFun = seededRandom(seed)
    }
}

var human = function(size,places) {
    if (size == 0) return "0B";
    var sign = 1;
    if (size < 0) {
        size = 0-size;
        sign = -1;
    }
    if (places === undefined) places=2;
    var offset = Math.pow(10,places);
    var suffix = ["B","KiB","MiB","GiB","TiB", "PiB","EiB","ZiB","YiB"];
    var mag = Math.min((suffix.length-1),Math.floor(Math.log(size)/(Math.LN2*10)));
    var retsize = sign * Math.floor((size/Math.pow(1024,mag)) * offset)/offset;
    var ret = retsize + suffix[mag];
    return ret;
}

// Options:
//    timeout: ms  - terminate after number of milliseconds has elapsed 
//    seconds: n   - terminate after number of seconds has elapsed (takes precendence over timeout)
//    count: n  - terminate after n events
//    query: <query object> - filter oplog events
var oplogtail = function(options) {
    var duration = Math.pow(2,64)
    var count = -1
    var filter = {ts:{$gte:Timestamp(ISODate().valueOf()/1000,0)}}
    if (typeof options == "object") {
        if (typeof options.timeout == "number") {
            duration = ISODate().valueOf() + (options.timeout)
        }
        if (typeof options.seconds == "number") {
            duration = ISODate().valueOf() + (options.seconds * 1000)
        }
        if (typeof options.count == "number") {
            count = options.count
        }
        if (typeof options.query == "object") {
            filter = Object.merge(filter, options.query)
        }
    }
    var cursor = db.getSiblingDB("local").oplog.rs.find(filter).tailable({awaitData:true})
    while (!cursor.isClosed() && (duration > ISODate().valueOf()) && (count != 0)) {
        if (cursor.hasNext()) {
            printjson(cursor.next())
            count--
        }
    }
}

var firstStage = function(explainData) {
    if (typeof explainData.next == "function") {
        explainData = explainData.next();
    }
    var stage = false;
    if (explainData.ok) {
        if (explainData.stages) {
            stage = explainData.stages[0].$cursor.queryPlanner.winningPlan; 
        } else {
            stage = explainData.queryPlanner.winningPlan;
        }
    }
    return stage;
}

var allStages = function(explainData) {
    if (typeof explainData.next == "function") {
        explainData = explainData.next();
    }
    if (explainData.queryPlanner.parsedQuery) {
        print("Query:",tojsononeline(explainData.queryPlanner.parsedQuery));
    }
    if (exstats = explainData.executionStats) {
        print("Execution Stats");
        executionStages(exstats, "<- ");
        if (exstats.allPlansExecution) {
            print("All Plans");
            exstats.allPlansExecution.forEach( function(p,i) {
                print("Plan",i);
                executionStages(p, "<- ");
            })
        }
    } else {
        print("Winning Plan");
        stages(explainData);
    }
}

var stages = function(explainData) { 
    var curStage = firstStage(explainData);
    recursestages(curStage, "<- ");
}

var printStats = function(curStage,prefix) {
    var statnames = [
        "executionSuccess",
        "nreturned",
        "nReturned",
        "docsReturned",
        "executionTimeMillisEstimate",
        "executionTimeMillis",
        "totalKeysExamined",
        "totalDocsExamined",
        "keysExamined",
        "docsExamined",
        "works",
        "isEOF"
    ];
    statnames.forEach(function(s) {
        if (curStage[s] !== undefined) {
            print(" ".repeat(prefix.length),s + ":",curStage[s]);
        }
    });
}

var executionStages = function(stats,prefix) {
    printStats(stats,prefix)
    recursestages(stats.executionStages,prefix);
}

var recursestages = function(curStage,prefix) {
    if (curStage) {
        print(prefix + curStage.stage); 
        printStats(curStage,prefix);
        switch (curStage.stage) {
            case 'IXSCAN':
                print(" ".repeat(prefix.length) + tojson(curStage.keyPattern));
                break;
            case 'PROJECTION':
                print(" ".repeat(prefix.length) + tojson(curStage.transformBy));
                break;
            case 'COUNT_SCAN':
                print(" ".repeat(prefix.length) + tojson(curStage.keyPattern));
                break;
        }
        if (curStage.inputStages) {
            curStage.inputStages.forEach(function(s) {recursestages(s," " + prefix)});
        } else {
            recursestages(curStage.inputStage, " " + prefix); 
        }
    }
}

var stagenames = function(explainData){
    var curStage = firstStage(explainData);
    var stagelist = [];
    while (curStage){
        stagelist.unshift(curStage.stage);
        curStage = curStage.inputStage;
    }
    print(stagelist.join(" -> "));
}

var copyRoleToDB = function(roleName, dbName, stack) {
    if (!stack) stack=[];
    // roleName and any inherited roles must exist in the 'admin' database
    // permissions resources must have db:"" or db:"admin"
    if (stack.indexOf(roleName) >= 0 ) {
        return {ok:0, errmsg: "Circular inheritance: " + rolename + "[" + stack.join(",") + "]"};
    }
    var currentRoles = db.getSiblingDB(dbName).getRoles({showBuiltinRoles:true}).map(function(r){return r.role;});
    if (currentRoles.indexOf(roleName) >=0) {
        print("Role " + roleName + " already exists, skipping.");
        return {ok:1};
    }
    var template = db.getSiblingDB("admin").getRole(roleName,{showPrivileges:true});
    var newRole = {}
    newRole.createRole = template.role;
    newRole.roles = [];
    template.roles.forEach(function(r) {
        if ((r.db != "admin") && (r.db != dbName)) {
            print("Skipping role " + r.role + "@" + r.db);
        } else {
            result = copyRoleToDb(r.role, dbName, stack.concat([dbName]));
            if (result.ok != 1) {
                print("Failed to copy role " + r.role + ", skipping");
            } else {
                newRole.roles.push({"role":r.role,db:dbName});
            }
        }
    })
    newRole.privileges = [];
    template.privileges.forEach(function(p) {
        if ((p.resource.db == dbName) || (p.resource.db == "") || (p.resource.db == "admin")){
            p.resource.db = dbName;
            newRole.privileges.push(p);
        } else {
            print("skipping privilege " + tojson(p));
        }
    });
    var result = db.getSiblingDB(dbName).runCommand(newRole);
    return result;
}
var copyRoleToDb = copyRoleToDB;

var randomChar = function(set, _cnt)
{
    if (_cnt === undefined) _cnt=1;
    var _ret = "";
    var _i;
    for(_i=0;_i<_cnt;_i++) _ret += pick(set);
    return _ret;
}
var randomHex = function(cnt) {
    if (cnt === undefined) cnt=1;
    return randomChar("0123456789ABCDEF", cnt);
}
var randomLetter = function(cnt)
{
    if (cnt === undefined) cnt=1;
    return randomChar("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ", cnt);
}
var randomDigit = function(cnt)
{
    if (cnt === undefined) cnt=1;
    return randomChar("0123456789")
}
var randomString = function(cnt, charset)
{
    if (cnt === undefined) cnt=Math.floor(_randomFun()*10);
    if (charset === undefined) charset="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-=.abcdefghijklmnopqrstuvwxyz"
    return randomChar(charset,cnt);
}

var randomInt = function(max) {
    if (max === undefined) max = Math.pow(2,32)-1;
    return getRandomInRange(0,max,0)
}


var pick = function(arr, min, max) {
    if (max === undefined) max = min;
    if (max === undefined) max = 1;
    if (max < min) max = min
    if (max == 1) {
        return arr[Math.floor(_randomFun()*arr.length)];
    } else {
        var ret = [];
        var len = arr.length;
        while (max > 0) {
            max -= 1;
            ret.push(arr[Math.floor(_randomFun()*len)]);
        }
        return ret;
    }
}

var mod10_check = function(number) {
    try {
      let string = number.toString().replace(/[^0-9]/,"");
      return (string.length > 1) && (parseInt(string) > 0) && string.split("").map(c => parseInt(c)).reverse().reduce( (sum,digit,idx) => (sum + (((idx % 2)==0) ? digit : (((digit*2) % 10) + Math.floor( digit * 2 / 10 ))))) % 10 == 0
    } catch (e) {
      return false
    }
}

/* mongosh killed some cool stuff
DBCollection.prototype.embiggen = function(targetsize) {
    var dbase = this._db;
    var dbname = this._db._name;
    var coll = this;
    var collname = this._shortName;
    var stat = coll.stats()
    if (!stat.ok) {
        this.insertOne({i:randomHex(16),d:new Date(),s:randomString(128),x:_randomFun()})
    }
    var stat = coll.stats()
    if (!stat.ok) {
        return "Unable to read collection '" + dbname + "." + collname;
    }
    while ((cursize = (stat = coll.stats()).size) < targetsize) {
        print(stat.count,stat.size);
        coll.mapReduce(
            function() {emit(new ObjectId(),this);},
            function(a,b) {return b[0]},
            {out:{merge: collname, db: dbname}}
            );
    }
    return coll.stats();
}

DBCollection.prototype.cleanupOrphans = function() {
    var results = [];
    var thisdb = this.getDB();
    var admindb = thisdb.getSiblingDB("admin")
    var ns = this.getFullName()
    if (this.count() > 0){
        var cmdobj = {cleanupOrphaned:ns};
        while ( cmdobj.nextKey !== null ) {
            printjsononeline(cmdobj)
            var result = admindb.runCommand(cmdobj);
            cmdobj.nextKey = result.stoppedAtKey;
            if (result.ok != 1) {
                results.push("Unable to complete: failure or timeout.");
                cmdobj.nextKey = null;
            }
            results.push(result)
        }

    }
    return {ns:ns, result:results}
}

DBCollection.prototype.countLargeShardKeys = function(suffix) {
        var c = db.getSiblingDB("config").collections.findOne({_id:this._fullName,dropped:false})
        var result = {collection: this._fullName, total: 0, large: 0, sharded: true};
        if (!c) {
            result.sharded = false;
            result.total = this.count();
            return result;
        }
        var keys = Object.keys(c.key);
        if (keys.filter(function(k){return c.key[k]=="hashed"}).length > 0){
            result.hashed = true;
            return result
        }
        eval('function map() {'
              +'shardkey = {};'
              +'var keys = ' + JSON.stringify(keys) +';'
              +'keys.forEach(k=>shardkey[k] = eval("this." + k));'
              +'if (JSON.bsonsize(shardkey) > 512) {'
              +'    emit("large",1);'
              +'}'
              +'emit("total",1);'
            +'}');
        function reduce(a,b) {
            var sum=function(total,num) {return total+num};
            return b.reduce(sum);
        }
        var big = this.mapReduce(map,reduce,{out:{inline:1}});
        if (big.counts.output > 0) {
            var summary = {};
            big.results.forEach(function(k){summary[k._id]=k.value})
            Object.assign(result, summary)
        }
        return result;
}

DB.prototype.countLargeShardKeys = function() {
    var res = this.runCommand({listCollections: 1, filter: {}});
    if (!res.ok) {
        throw _getErrorWithCode(res, "listCollections failed: " + tojson(res));
    }
    var collections =  new DBCommandCursor(res._mongo, res).toArray()
    return collections.map(function(cinfo) {
        var cname = cinfo.name;
        var coll = new DBCollection(this.db._mongo, this.db, cname, this.db._name + "." + cname);
        return coll.countLargeShardKeys();
    })
}



DBCollection.prototype.checkForLargeShardKeys = function(suffix) {
        if (!suffix) suffix = ".largeShardKeys"; 
        if (suffix[0] != ".") suffix = "." + suffix;
        var c = db.getSiblingDB("config").collections.findOne({_id:this._fullName,dropped:false})
        if (!c) {
            return this._fullName + " is not sharded";
        }
        var keys = Object.keys(c.key);
        if (keys.filter(function(k){return (c.key[k]=="hashed");}).length > 0){
            return c._id + " hashed shard key";
        }

        var outcoll = this._shortName + suffix;
        var stat = this._db.getCollection(outcoll).stats();
        
        if (stat.ok == 1) {
            return("Skipping '" + this._fullName + "': collection '" + outcoll + "' already exists in database '" + this._db + "'. Drop this collection or select a different suffix like `db." + this._shortName + ".checkForLargeShardKeys(\"othersuffix\")`.");
        }
        
        eval('function map() {'
              +'shardkey = {};'
              +'var keys = ' + JSON.stringify(keys) +';'
              +'keys.forEach(k=>shardkey[k] = eval("this." + k));'
              +'if (JSON.bsonsize(shardkey) > 512) {'
              +'    var res = {};'
              +'    res.shardKey = shardkey;'
              +'    res.shardKeySize = JSON.bsonsize(shardkey);'
              +'    emit(this._id,res);'
              +'}'
            +'}');
        function reduce(a,b) {
            return b;
        }
        var big = this.mapReduce(map,reduce,{out:outcoll});
        if (big.counts.output == 0) {
            this._db.getCollection(outcoll).drop();
            return c._id + " no large shard keys";
        }
        return ("Collection '" + this._shortName + "' has " + big.counts.output + " large shard keys, see collection '" + outcoll + "'.");
    }

DB.prototype.checkForLargeShardKeys = function() {
    var res = this.runCommand({listCollections: 1, filter: {}});
    if (!res.ok) {
        throw _getErrorWithCode(res, "listCollections failed: " + tojson(res));
    }
    var collections =  new DBCommandCursor(res._mongo, res).toArray()
    return collections.map(function(cinfo) {
        var cname = cinfo.name;
        var coll = new DBCollection(this.db._mongo, this.db, cname, this.db._name + "." + cname)
        return ({collection:cname, result:coll.checkForLargeShardKeys()});
    })
}
*/

function checkForLargeShardKeys(query,configDb) {
    if (configDb === undefined) configDb = db.getSiblingDB("config")
    function checkCollection(c) {
        var dot = c._id.indexOf(".");
        var dbname = c._id.substr(0, dot);
        var collname = c._id.substr(dot+1);
        return db.getSiblingDB(dbname).getCollection(collname).checkForLargeShardKeys()
    }
    
    if (query === undefined) query = {ns:new RegExp('^' + db.toString() + '\.'),dropped:false};
    var collections = configDb.collections.find(query);
    var allresults = collections.map(checkCollection);
    var largeKeys = allresults.filter(function(e){return typeof e != "string"});
    var others = allresults.filter(function(e){typeof e == "string"});
    return { good:others,bad:largeKeys };
}

function getRandomInRange(from, to, fixed) {
    return (_randomFun() * (to - from) + from).toFixed(fixed) * 1;
}

function randomPoint(lon, lat, radius) {
    return {
       type: "Point",
       coordinates: randomLoc(lon, lat, radius)
    }
}

function distance(frmlon, frmlat, tolon, tolat, R) {
    
    R = R || 6371000;

    // a = sin²(Δφ/2) + cos(φ1)⋅cos(φ2)⋅sin²(Δλ/2)
    // δ = 2·atan2(√(a), √(1−a))
    // see mathforum.org/library/drmath/view/51879.html for derivation

    const dlat = tolat - frmlat;
    const dlon = tolon - frmlon;

    const a = Math.sin(dlat/2)*Math.sin(dlat/2) + Math.cos(frmlat)*Math.cos(tolat) * Math.sin(dlon/2)*Math.sin(dlon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;

    return d;
}

function randomLoc(dlon, dlat, radius) {

    // assumes perfectly spherical earth with radius 6,371 meters
    // and that the trig functions use radians
    var lon = dlon || 0;
    var lat = dlat || 0;
    lon = lon * Math.PI / 180;
    lat = lat * Math.PI / 180;
    const earthRadius = 6371000;
    if (radius == undefined) {
        radius = earthRadius * Math.PI;
    }
    
    // direction to travel from the original vector
    var b = _randomFun() * 2 * Math.PI;
    // distance to travel
    var d = _randomFun() * radius;

    const nlat = Math.asin( Math.sin(lat)*Math.cos(d/earthRadius) +
                      Math.cos(lat)*Math.sin(d/earthRadius)*Math.cos(b) );
    const nlon = lon + Math.atan2(Math.sin(b)*Math.sin(d/earthRadius)*Math.cos(lat),
                           Math.cos(d/earthRadius)-Math.sin(lat)*Math.sin(nlat));
    // normalize
    const flon = (nlon + 3*Math.PI) % (2*Math.PI) - Math.PI

    return [ flon * 180 / Math.PI, nlat * 180 / Math.PI ];
}

function randomPolygon(lon, lat, radius, npoints) {
  if (typeof lon == "Array") {
      npoints = radius
      radius = lat
      lat = lon[1]
      lon = lon[0]
  }
  npoints = npoints || 4;
  radius = radius || 1000;
  lon = lon || 180 - (_randomFun() * 360)
  lat = lat || 90 - (_randomFun() * 180)

  var points=[];
  for(var _i=0;_i<npoints-1;_i++) {
       points.push(randomPoint(lon, lat, radius))
  } 

  points.push(points[0])

  return points;
}

function randomDateRange(from, to) {
    var range = to.valueOf() - from.valueOf()
    var newdate = new Date(from.valueOf() + Math.trunc(_randomFun() * range))
    return newdate
}

function randomDate(ago) {
    var now = (new Date()).valueOf()
    var range = ago || now
    var newdate = new Date(now - Math.trunc(_randomFun() * range))
    return newdate
}

function oplogWindow(seconds, verbose) {
    if (typeof seconds == "boolean") {
        verbose = seconds;
        seconds = undefined;
    }
    var limited = (typeof seconds == "number") && (seconds > 0);
    var oplogstats = db.getSiblingDB("local").oplog.rs.stats();
    var oplogtimes;
    var newestevent;
    var cursor = db.getSiblingDB("local").oplog.rs.find().sort({$natural:-1}).limit(1);
    if (cursor.hasNext()) {
        newestevent = cursor.next();
        cursor.close();
    } else {
        throw Error("No entries in the oplog");
    }
 
    if (limited) {
       //ceil instead of trunc to make sure we have good ts for $lte
        var last = Math.ceil(newestevent.ts.getTime())+1;
        var first = last - seconds;
        cursor = db.getSiblingDB("local").oplog.rs.aggregate([{$match:{ts:{$gte:Timestamp(first,0),$lte:Timestamp(last,0)}}},{$group:{_id:null,first:{$min:"$ts"}, last:{$max:"$ts"}, count:{$sum:1}}}])
        if (cursor.hasNext()) {
            oplogtimes = cursor.next();
            cursor.close();
        } else {
            throw Error("Error querying the oplog")
        }
    } else {
        //cursor=db.getSiblingDB("local").oplog.rs.aggregate([{$group:{_id:null,first:{$min:"$ts"},last:{$max:"$ts"},count:{$sum:1}}}]);
        cursor = db.getSiblingDB("local").oplog.rs.find().sort({$natural:1}).limit(1);
        if (cursor.hasNext()) {
            oplogtimes = {};
            oplogtimes.first = cursor.next().ts;
            cursor.close();
            oplogtimes.last = newestevent.ts;
            oplogtimes.count = oplogstats.count;
        } else {
            throw Error("No entries in the oplog");
        }
    }
    var currentelapsed=oplogtimes.last.getTime() - oplogtimes.first.getTime()
    if (currentelapsed > 0) {
        var estsize = oplogtimes.count * oplogstats.avgObjSize
        var estwindow = (oplogstats.maxSize/(estsize/currentelapsed))
        if (verbose) {
            print ("Oplog size: ",oplogstats.size);
            print("Oplog maxSize: ",oplogstats.maxSize);
            print("Avergate object size: ",oplogstats.avgObjSize);
            print("In the last ", currentelapsed/3600, " hours, there were ", oplogtimes.count, " entries");
            if (limited) { print("Estimated size: ", oplogtimes.count, "*", oplogstats.avgObjSize, "=", estsize, "bytes");}
            print("Estimated window: ", estwindow/3600, " hours");
        }
            return estwindow
        } else {
            throw Error("Oplog covers " + currentelapsed + " seconds, cannot compute window")
        }
}
    
var shuffle = function(_a) {
    var _j, _x, _i;
    for (_i = _a.length - 1; _i > 0; _i--) {
        _j = Math.floor(_randomFun() * (_i + 1));
        _x = _a[i];
        _a[_i] = _a[_j];
        _a[_j] = _x;
    }
    return _a;
}

Object.extendedMerge = function (dst, src, deep) {
        for (var k in src) {
            var v = src[k];
            if (deep && typeof(v) == "object" && v !== null) {
                if (v.constructor === ObjectId) {  // convert ObjectId properly
                    eval("v = " + tojson(v));
                } else if (v.constructor === Date) {  // convert ISODate properly
                    eval("v = " + tojson(v));
                } else if ("floatApprox" in v) {  // convert NumberLong properly
                    eval("v = " + tojson(v));
                } else {
                    var s = dst[k] || (typeof(v.length) == "number" ? [] : {})
                    v = Object.extendedMerge(s, v, true);
                }
            }
            dst[k] = v;
        }
        return dst;
    }

Object.defineProperty(Object.prototype,"project",{
    configurable: true,
    enumerable: false,
    value: function(projection){
    if (typeof projection !== "object") {
        throw Error('Cannot convert ' + typeof projection + ' to object');
    }
    //avoid modifying the orignal while truncating deep recursion
    var obj = Object.extendedMerge({},this,true);
    var res={};
    var mergeFields = function(dest, src) {
        if (src !== undefined ) {
            if (src.name != "" && src.o !== undefined) { 
                if (typeof src.point.valueOf == "function") {
                    src.prev[src.name] = src.o.valueOf(); 
                } else {
                    src.prev[field.name] = src.o;
                }
            }
            return Object.extendedMerge(dest, src.result, true);
        } else {
            return {};
        }
    }
    var projectKeyReduce = function(obj, point, prev, name, fields){
        //print("projectKeyReduce(obj:",tojson(obj),", point:",tojson(point),", prev:",tojson(prev),", name:",tojson( name),",fields: ",tojson(fields))
        if (fields === undefined && point !== undefined) {
            var tmp = {}
            var localFields = point.slice();
            var result = projectKeyReduce(obj, tmp, undefined, undefined, localFields); 
            //print("result:",tojson(result));
            if (result) result.result = tmp;
            return result;
        }
        if (fields.length == 0 || obj === undefined) {
            //printjsononeline({intermediate:{o:obj,prev:prev,point:point,name:name}})
            return {o:obj, prev:prev, point:point, name:name}
        }
        var b = fields.shift();
        //print ("check",tojson(obj),"for",b)
        if (obj !== null && obj.hasOwnProperty(b)) {
            if (typeof obj[b] === "object"){
                if (obj[b] === null) {
                    point[b] = obj[b];
                    name = "";
                    obj = {} 
                } else {
                    prev = point;
                    name = b;
                    var blank = (Array.isArray(obj[b])?[]:{}); 
                    if (Array.isArray(point)) {
                        name = point.length;
                        point.push(blank);
                        point = point[name];
                    } else {
                        //print(b,"is Object");
                        point[b] = blank;
                        point = point[b];
                    }
                    obj = obj[b];
                }
            } else {
                //print("Found:",obj[b]);
                point[b] = obj[b];
                name = "";
                obj = undefined;
            }
            return projectKeyReduce(obj, point, prev, name, fields)
        } else if (b == "*") {
            for (var propkey in obj) {
                if (obj.hasOwnProperty.call(obj, propkey)) {
                   //print("Merge",propkey);
                   var found = projectKeyReduce(obj[propkey], fields);
                   //print("Found:",tojson(found));
                   if (found)
                       if (Object.keys(found.result).length !== 0 || found.result.constructor !== Object) {
                          var tmpres = {};
                          mergeFields(tmpres, found)
                          //print("Set ",propkey,"to",tojson(tmpres));
                          point[propkey]=tmpres;
                       }
                }
            }
            //print("Point:",tojson(point));
            //return projectKeyReduce(undefined, point, prev, name, [])
            return projectKeyReduce(undefined, point, prev, name, [])
        } else {
            // property not found
            return undefined;
        }
    }

    Object.keys(projection).forEach( function(k) {
        //truish to project-in
        if (!projection[k]) {
            throw Error('project out not yet supported');
        } else {
            var matched = projectKeyReduce(obj, k.split("."));
            //print("Matched: ", tojson(matched));
            mergeFields(res, matched)
        }
    });
    //print("returning:",tojsononeline(res))
    return res;
}})
/*
// pass db method as a string or a function with 1 argument
// function will be passed the db object, eachDB will return the value returned in an array
DB.prototype.eachDB = function(lambdaOrMethod) {
    var _dbs = this.adminCommand("listDatabases").databases;
    var _thisdb = this
    var _mapfun;
    var _args = arguments;
    var _eachDBArgs = Object.keys(_args).map(function(k){return _args[k]});
    _eachDBArgs.shift();
    if (typeof lambdaOrMethod == "string") {
        _mapfun = function(_dbase){ return _thisdb.getSiblingDB(_dbase.name)[lambdaOrMethod](..._eachDBArgs); }
    } else if (typeof lambdaOrMethod == "function") {
        _mapfun = function(_dbase){ return lambdaOrMethod(_thisdb.getSiblingDB(_dbase.name),..._eachDBArgs)}
    } else {
        throw Error('eachDB requires a function or method')
    }
    return _dbs.map(_mapfun).reduce(function(a,b){return a.concat(b)},[])
}

DB.prototype.eachCollection = function(lambdaOrMethod) {
    var _thisdb = this;
    var _args = arguments;
    var _eachCollectionArgs = Object.keys(_args).map(function(k){return _args[k]});
    _eachCollectionArgs.shift();
    if (typeof lambdaOrMethod == "string") {
        _mapfun = function(_coll){ return _coll[lambdaOrMethod](..._eachCollectionArgs) }
    } else if (typeof lambdaOrMethod == "function") {
        _mapfun = function(_coll){ return lambdaOrMethod(_coll,..._eachCollectionArgs)}
    } else {
        throw Error('eachCollection requires a function or method')
    }

    return _thisdb.getCollectionNames().map(function(n) {
        var _collection = _thisdb.getCollection(n);
        return _mapfun(_collection);
    }).reduce(function(a,b){return a.concat(b)},[])
}
*/
function happy(n,chain) {
    chain = chain || [];
    if (n==1) return true;
    if (chain.indexOf(n) >=0 ) return false;
    return happy(n.toString().split("").reduce((a,c)=>{d=parseInt(c); return d*d+a;},0),chain.concat([n]))
}

function deepDiff(a, b, tag=null) {
    let diffmsg = {}
        if (a === b) return {}

        if (a == null || b == null ||
            typeof a != "object" ||
            typeof b != "object"){
          return {a:a,b:b}
        }

    let keya = Object.keys(a)
        let keyb = Object.keys(b)

        for (let key of keya) {
            if (keyb.includes(key)) {
                    let diff = deepDiff(a[key],b[key], tag + "." + key)
                    if (Object.keys(diff).length > 0 ) {
                       diffmsg[key] = diff
                    }
                } else {
                diffmsg[key] = {a:a[key],b:undefined}
                }
        }
        for (let key of keyb) {
            if (!keya.includes(key)) {
            diffmsg[key] = {a:undefined,b:b[key]}
            }
        }
    return diffmsg
}

function connectionData(dbname,collname){
	tag=65;
	sw=String.fromCharCode(tag);
	c=db.getSiblingDB(dbname).getCollection(collname);
	branches=c.find({ id: 20698 }, { t: 1, _id: 0 }).toArray().map(
	  function (o) {
	     return {case:{$lt:["$t",o.t]},then:String.fromCharCode(tag++)};
	});
	if (branches.length > 0) {
	   sw={'$switch':{'branches':branches,default:String.fromCharCode(tag)}};
	}
	return c.aggregate([
	  {$match:{id:{$in:[22943,22944,22989,51800,51803,20429,20250,20883,5286306]}}},
      {$sort: {t:1}},
	  {$addFields:{conn:{$toString:{$ifNull:["$attr.connectionId",{$substr:["$ctx",4,-1]}]}}}},
	  {$group:{
	      _id:{connection:"$conn",restart:sw},
	      reslen:{$sum:"$attr.reslen"},
	      hasStart:{$sum:{$cond:[{$eq:["$id",22943]},1,0]}},
	      hasEnd:{$sum:{$cond:[{$eq:["$id",22944]},1,0]}},
	      hasMetadata:{$sum:{$cond:[{$eq:["$id",51800]},1,0]}},
	      first:{$min:"$t"},
	      last:{$max:"$t"},
	      count:{$sum:1},
	      auth:{$addToSet:{$cond:[{$in:["$id",[5286306,20429,20250]]},{success:{$in:["$id",[5286306,20250]]},principal:{$ifNull:["$attr.principalName","$attr.user"]},db:{$ifNull:["$attr.authenticationDatabase","$attr.db"]}},"$$REMOVE"]}},
	      remote:{$addToSet:"$attr.remote"},
	      app:{$addToSet:"$attr.doc.application.name"},
	      driver:{$addToSet:"$attr.doc.driver"},
	      os:{$addToSet:"$attr.doc.os"},
          errors:{$addToSet:"$attr.error.errmsg"},
          disconnect:{$addToSet:{$cond:[{$eq:["$id",20883]},"$msg",undefined]}}
      }},
      {$addFields:{
            errors:{$concatArrays:["$errors",{$filter:{input:"$disconnect",cond:{$ne:["$$this",null]}}}]}
      }},
      {$project:{disconnect:0}},
      {$sort:{"_id.restart":1,"first":1}}
	])
}

function connectionCSVOrig(filename, dbname, collname) {
  if (filename === undefined) {
      print("Usage:\n\tconnection(<filename>,<dbname>,<collection name>)")
      return
  }
  require("fs");
  return fs.writeFileSync(filename,
               ['"Restart","Connection","Remote","Connect","Disconnect","Duration","Authentication","Driver Name","Driver Version","Application","OS Type","OS Name","Version","Arch","Errors"'].concat(
               connectionData(dbname,collname).toArray().map(o=>{
                   return [
                      o._id.restart,
                      o._id.connection,
                      o.remote[0],
                      o.hasStart?o.first.toISOString():"",
                      o.hasEnd?o.last.toISOString():"",
                      (o.hasStart && o.hasEnd)?(o.last - o.first):"",
                      (o.auth.length>0)?o.auth.map(e=>e.principal + "@" + e.db + " " +e.success).join("/").replace(/,/g,""):"",
                      o.driver[0]?.name?o.driver[0].name:"",
                      o.driver[0]?.version?o.driver[0].version:"",
                      o.app[0]?o.app[0]:"",
                      o.os[0]?.type?o.os[0].type:"",
                      o.os[0]?.name?o.os[0].name:"",
                      o.os[0]?.version?o.os[0].version:"",
                      o.os[0]?.architecture?o.os[0].architecture:"",
                      o.errors.join(",").replace(/,/g," ")
                ].map(o=>JSON.stringify(o)).join(",")})).join("\n")
 )
}


async function connectionCSV(filename, dbname, collname) {
  if (filename === undefined) {
      print("Usage:\n\tconnection(<filename>,<dbname>,<collection name>)")
      return
  }
  require("fs");
 
  var handle = await fs.promises.open(filename,"w");
  if (!handle) {
      throw new Error("Failed to open file "+filename);
  }

  handle.write('"Restart","Connection","Remote","Connect","Disconnect","Duration","Authentication","Driver Name","Driver Version","Application","OS Type","OS Name","Version","Arch","Errors"');
  handle.write("\n");
  var cursor = connectionData(dbname,collname)
  while (cursor.hasNext()) {
      obj = cursor.next();
      var linedata = [
                      obj._id.restart,
                      obj._id.connection,
                      obj.remote[0],
                      obj.hasStart?obj.first.toISOString():"",
                      obj.hasEnd?obj.last.toISOString():"",
                      (obj.hasStart && obj.hasEnd)?(obj.last - obj.first):"",
                      (obj.auth.length>0)?obj.auth.map(e=>e.principal + "@" + e.db + " " +e.success).join("/").replace(/,/g,""):"",
                      obj.driver[0]?.name?obj.driver[0].name:"",
                      obj.driver[0]?.version?obj.driver[0].version:"",
                      obj.app[0]?obj.app[0]:"",
                      obj.os[0]?.type?obj.os[0].type:"",
                      obj.os[0]?.name?obj.os[0].name:"",
                      obj.os[0]?.version?obj.os[0].version:"",
                      obj.os[0]?.architecture?obj.os[0].architecture:"",
                      obj.errors.join(",").replace(/,/g," ")
                ];
      handle.write(linedata.map(ln => JSON.stringify(ln)).join(","));
      handle.write("\n");
  }
  await handle.sync();
  await handle.close();
}

function unhorkLong(size) { 
    let low = BigInt(size.low < 0 ? Math.pow(2, 32) + size.low : size.low); 
    let high = BigInt(size.high < 0 ? Math.pow(2, 32) + size.high : size.high); 
    let negative = (size.unsigned === false && size.high < 0); 
    let num=BigInt(Math.pow(2, 32)) * high + low; 
    if(negative){num = BigInt(-1*Math.pow(2,64)) + num}; 
    return num
}

// add toDate method to Timestamps
Timestamp.prototype.toDate = function() { return new Date(this.getHighBitsUnsigned()*1000)}

function waitForCheckpoint(limit) {
    if (!limit) limit = 3600000; //default to wait up to an hour for a checkpoint
    let start=new Date();
    let curgen = db.serverStatus().wiredTiger.transaction['transaction checkpoint generation'];
    let res = false;
    while ((new Date() - start) < limit) {
        if (db.serverStatus().wiredTiger.transaction['transaction checkpoint generation'] > curgen) return true;
        sleep(500);
    }
    return false
}

function decodeResumeToken(token, debug=false) {

    function Reader(hexstring) {

        this.buff = new Buffer.from(hexstring,"hex");

        this.debuglog = function(msg) {
            if (debug) {
                if (this.buff) {
                    console.log(msg, this.buff.hexSlice());
                }
            }
        }

        this.readers = {
            10: "readMinKey",
            20: "readNull",
            41: "readZero",
            43: "readUInt8",
            44: "readUInt16",
            46: "readUInt32",
            60: "readCString",
            70: "readObject",
            90: "readBinData",
            100: "readObjectId",
            110: "readBoolFalse",
            111: "readBoolTrue",
            130: "readTimestamp"
        }

        this.readMinKey = function() {
            this.debuglog("readMinKey");
            return MinKey();
        }

        this.readNull = function() {
            this.debuglog("readNull");
            return null;
        }

        this.readZero = function() {
            this.debuglog("readZero");
            return 0;
        }

        this.readUInt8 = function() {
            this.debuglog("readUInt8");
            let res = this.buff.readUInt8();
            this.buff = this.buff.subarray(1);
            this.debuglog(res);
            return res
        }

        this.readUInt16 = function() {
            this.debuglog("readUInt16");
            let res = this.buff.readUInt16BE();
            this.buff = this.buff.subarray(2);
            this.debuglog(res);
            return res
        }

        this.readUInt32 = function() {
            this.debuglog("readUInt32");
            let res = this.buff.readUInt32BE();
            this.buff = this.buff.subarray(4);
            this.debuglog(res);
            return res
        }

        this.readCString = function() {
            this.debuglog("readCString");
            let res = ""
            if (this.buff.length > 0 && this.buff[0] != 0) {
                if ((i=this.buff.indexOf(0)) > -1) {
                    if (i > 0) {
                        res = this.buff.subarray(0,i).toString();
                    }
                    this.buff = this.buff.subarray(i+1);
                }
            }
            this.debuglog(res);
            return res
        }

        this.readObject = function() {
            this.debuglog("readObject");
            let res = {}
            let type = 1;
            do {
                type = this.readUInt8();
                this.debuglog("type:" + type);
                if (type != 0) {
                    fieldname = this.readCString();
                    res[fieldname] = this.readNext();
                    this.debuglog("{" + fieldname + ": " + res[fieldname] + "}")
                }
            } while (type != 0);
            this.debuglog(res);
            return res
        }

        this.readBinData = function(){
            this.debuglog("readBinData");
            let size = this.readUInt8();
            let type = this.readUInt8();
            let data = this.buff.subarray(0,size);
            this.buff = this.buff.subarray(size);
            let res = new BinData(type, data.base64Slice());
            this.debuglog(res);
            return res;

        }

        this.readObjectId = function() {
            this.debuglog("readObjectId");
            let oid = this.buff.subarray(0,12);
            this.buff = this.buff.subarray(12);
            this.debuglog(oid);
            return new ObjectId(oid);
        }

        this.readBoolFalse = function() {
            this.debuglog("readBoolFalse");
            return false;
        }

        this.readBoolTrue = function() {
            this.debuglog("readBoolTrue");
            return true;
        }

        this.readTimestamp = function() {
            this.debuglog("readTimestamp");
            let ts = this.readUInt32();
            let cnt = this.readUInt32();
            let res = new Timestamp(ts,cnt);
            this.debuglog(res);
            return res
        }

        this.readNext = function() {
            let type = this.readUInt8();
            let fun = this.readers[type];
            this.debuglog("readNext", fun.name);
            if (fun && this[fun]) {
                let res = this[fun]();
                return res;
            } else {
                throw("Unknown type " + type);
            }
        }

        this.readArray = function() {
            this.debuglog("readArray");
            let result = []
            while (this.buff.length > 0 && this.buff[0] != 4) {
                result.push(this.readNext());
            } 
            this.debuglog(result);
            return result
        }
    }

    let reader = new Reader(token);
    return reader.readArray();
}

function resumeTokenTimestamp(token) {
    if (!token) throw("No resume token provided")
    let working = token;
    if (token.resumeAfter) { working = token.resumeAfter._data; }
    if (token._data) { working = token._data }
    if (typeof working != "string") throw("Expected string resume token");
    let tag = working.substring(0,2);
    if (tag != "82") throw("Invalid resume token");
    let epoch = parseInt(working.substring(2,10),16);
    let inc = parseInt(working.substring(10,18),16);
    return new Timestamp(epoch, inc);
} 
