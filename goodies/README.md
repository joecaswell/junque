Some bits and bobs from my time at MongoDB

<details>
    <summary>.mongorc.js (for the legacy shell)</summary>
    <blockquote>This file should be saved as `.mongorc.js` in the home directory
<details>
        <summary>Functions added to the global shell</summary>
    
- `shuffle(array)` - return the array with elements in random order, original array remains unmodified. (usual caveats about object references within the array)  
- `oplogWindow(seconds, verbose)` - Returns oplog window.  If `seconds` is provided, estimates the oplog window based on the oplog usage in the last `seconds`  
- `randomDate(milliseconds)` - return a javascript Date object up to `milliseconds` in the past.  If `milliseconds` omitted, return a random date between epoch and now  
- `randomLoc(lon, lat, radius)` - return a random point with `radius` meters of [`lon`, `lat`]  
- `randomPolygon(lon, lat, radius, npoints)` - return a random polygon consisting of `npoints` points within `radius` meters of [`lon`, `lat`].  **NOTE**: still needs work, currently returns a set of completly random points that may or may not be a valid polygon  
- `randomPoint(lon, lat, radius)` - wrap the `randomLoc` output in a geoJSON point  
- `pick(array, min, max)` - return between `min` and `max` randomly selected elements from the array (may be duplicates).  Default to 1 element if `min` and `max` omitted  
- `randomInt(max)` - return a random integer from 0 to `max`.  Defaults to 32-bit integer if `max` omitted  
- `randomString(cnt, charset)` - return a string of `cnt` characters randomly selected from charset.  Defaults: `charset` = base64 character set, `cnt` = 10  
- `randomDigit(cnt)` - return a `cnt`(default=1)-digit number as a string  
- `randomLetter(cnt)` - return a `cnt`(default=1)-character string consisting of upper- and lower-case letters  
- `randomHex(cnt)` - return a `cnt`(default=1)-character hexadecimal string  
- `human(size, places)` - return the size in human-readable form using power of 2 sizes (i.e. GiB), rouned to `places` decimal places  
- `setRandomSeed(seed, prime)` - functions in this file will use a seeded random number generator instead of Math.random().  Default `seed` is current time, default `prime` is 16525637  
- `resetRandom()` - revert to using Math.random()  
- `copyRoleToDB(roleName, dbName)` - copy role `roleName`, and all inherited roles, from admin database to `dbName`
- `mod10check(number)` - validate `number` using the Luhn algorithm
- `happy(number)` - return true if `number` is happy
    
</details>
<details>
        <summary>Functions added to the javascript Object class</summary>
        
- `Object.extendedMerge(src, dst, deep)` - recurse into arrays and subobject when merging, convert ObjectID, ISODate, NumberLong to JSON
- `Object.prototype.project(projection)` - Provide project-in capability for javascript objects, use `*` to match any field. Example: `db.serverStatus().project({"wiredTiger.*.URI":1})`
</details>       
<details>
        <summary>Functions added to the MongoDB DB class</summary>
        
- `db.eachCollection(lambdaOrMethod, ...args)` - iterate the collections in the current db, run the provided function on each.  `lambdaOrMethod` can be either a method of the collection class as a string, or a javascript `function(collection, ...args)`. 
            Examples: 
            `db.eachCollection("stats")`, 
            `db.eachCollection("stats",{indexDetails:true})`, 
            `db.eachCollection(function(coll){return {name:coll.name, data:coll.stats({indexDetails:true}).project({"indexDetails.*.uri":1})}})`
- `db.eachDB(lambdaOrMethod, ...args)` - iterate the database list with method name or `function(db, ...args)`
           Example:
           `db.eachDB("eachCollection",function(coll){return {name:coll.db + "." + coll.name, data:coll.stats({indexDetails:true}).project({"indexDetails.*.uri":1})}})`
        </details>
    </blockquote>
</details>
