var human = function(size,places) {
    if (places === undefined) places=2;
    var offset = Math.pow(10,places);
    var suffix = ["B","KiB","MiB","GiB","PiB","EiB","ZiB","YiB"];
    var mag = Math.min((suffix.length-1),Math.floor(Math.log(size)/(Math.LN2*10)));
    var retsize = Math.floor((size/Math.pow(1024,mag)) * offset)/offset;
    var ret = retsize + suffix[mag];
    return ret;
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

var executionStages = function(stats,prefix) {
    var statnames = [
        "executionSuccess",
        "nreturned",
        "nReturned",
        "docsReturned",
        "executionTimeMillisEstimate",
        "executionTimeMillis",
        "totalKeysExamined",
        "totalDocsExamined"
    ];
    statnames.forEach(function(s) {
        if (stats[s] !== undefined) {
            print(" ",s + ":",stats[s]);
        }
    });
    recursestages(stats.executionStages,prefix);
}

var recursestages = function(curStage,prefix) {
    if (curStage) {
        print(prefix + curStage.stage); 
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

var randomChar = function(set, cnt)
{
    if (cnt === undefined) cnt=1;
    var ret = "";
    var i;
    for(i=0;i<cnt;i++) ret += pick(set);
    return ret;
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
var randomString = function(cnt)
{
    if (cnt === undefined) cnt=Math.floor(Math.random()*10);
    return randomChar("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-=.abcdefghijklmnopqrstuvwxyz",cnt);
}

var randomInt = function(max) {
    if (max === undefined) max = Math.pow(2,32)-1;
    return getRandomInRange(0,max,0)
}


var pick = function(arr, max) {
    if (max === undefined) max = 1;
    if (max == 1) {
        return arr[Math.floor(Math.random()*arr.length)];
    } else {
        var ret = [];
        var len = arr.length;
        while (max > 0) {
            max -= 1;
            ret.push(arr[Math.floor(Math.random()*len)]);
        }
        return ret;
    }
}

DBCollection.prototype.embiggen = function(targetsize) {
    var dbase = this._db;
    var dbname = this._db._name;
    var coll = this;
    var collname = this._shortName;
    var stat = coll.stats()
    if (!stat.ok) {
        this.insertOne({i:randomHex(16),d:new Date(),s:randomString(128),x:Math.random()})
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
    return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
}

function randomPoint(lon, lat, radius) {
    // assumes perfectly spherical earth with radius 6,371 meters
    // and that the trig functions use radians
    lon = lon || 0
    lat = lat || 0
    if (radius == undefined) {
        radius = 6371 * Math.PI
    }
    
    // direction to travel from the original vector
    var t = Math.random() * 2 * Math.PI
    // longitude component
    var dx = Math.cos(t)
    // latitude component of the direction
    var dy = Math.sin(t)
    // offset from the original vector in radians
    var r = Math.random() * (radius/6371)
    print("radians:" + r)
    print("degress:" + r * 180/Math.PI)
    // offsets in degrees
    var x = r * dx * 180/Math.PI
    var y = r * dy * 180/Math.PI

    var nlat = lat + y;
    var nlon = lon + x;

    //normalize
    if (nlon < -180) nlon += 360
    if (nlon > 180) nlon -= 360
    if (nlat < -90) nlat = -180 - nlat
    if (nlat > 90) nlat = 180 - nlat

    return [ nlon, nlat ]
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
  lon = lon || 180 - (Math.random() * 360)
  lat = lat || 90 - (Math.random() * 180)

  var points=[];
  for(var i=0;i<npoints-1;i++) {
       points.push(randomPoint(lon, lat, radius))
  } 

  points.push(points[0])

  return points;
}

function randomDate(ago) {
    var now = (new Date()).valueOf()
    var range = ago || now
    var newdate = new Date(now - Math.trunc(Math.random() * range))
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
    
var shuffle = function(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

Object.extendedMerge = function (dst, src, deep) {
        for (var k in src) {
            var v = src[k];
            if (deep && typeof(v) == "object" && v !== null) {
                if (v.constructor === ObjectId) {  // convert ObjectId properly
                    eval("v = " + tojson(v));
                }else if (v.constructor === Date) {  // convert ISODate properly
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
    Object.keys(projection).forEach( function(k) {
        //truish to project-in
        if (!projection[k]) {
            throw Error('project out not yet supported');
        } else {
            var tmp = {};
            var field = k.split(".").reduce(function(a,b){
                // previous property not found, bail
                if (a === undefined) return a;
                if (a.o.hasOwnProperty(b)) {
                    if (typeof a.o[b] === "object"){
                        if (a.o[b] === null) {
                            a.point[b] = a.o[b];
                            a.name = "";
                            a.o = {} 
                        } else {
                            a.prev = a.point;
                            a.name = b;
                            var blank = (Array.isArray(a.o[b])?[]:{}); 
                            if (Array.isArray(a.point)) {
                                a.name = a.point.length;
                                a.point.push(blank);
                                a.point = a.point[a.name];
                            } else {
                                a.point[b] = blank;
                                a.point = a.point[b];
                            }
                            a.o = a.o[b];
                        }
                    } else {
                        a.point[b] = a.o[b];
                        a.name = "";
                        a.o = {};
                    }
                    return a;
                } else {
                    // property not found
                    return undefined;
                }
            }, {o:obj,point:tmp,prev:undefined,name:undefined});
            if (field !== undefined) {
                if (field.name != "") { 
                    if (typeof field.o.valueOf == "function") {
                        field.prev[field.name] = field.o.valueOf(); 
                    } else {
                        field.prev[field.name] = field.o;
                    }
                }
                res = Object.extendedMerge(res,tmp,true);
            }
        }
    });
    return res;
}})

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


