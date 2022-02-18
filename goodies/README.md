Some bits and bobs from my time at MongoDB

<details>
    <summary>.mongorc.js (for the legacy shell)</summary>
    Functions added to the global shell:
    - shuffle(array) - return the array with elements in random order, original array remains unmodified. (usual caveats about object references within the array)
    - oplogWindow(Seconds(Int), Verbose(Bool)) - Both arguments optional.  Returns oplog window.  If Seconds is provided, estimates the oplog window based on the oplog usage in the last [Seconds]
    - randomDate(Milliseconds) - return a javascript Date object up to Milliseconds in the past.  If Milliseconds not provided, return a random date between epoch and now
    - randomLoc(lon, lat, radius) - return a random point with radius meters of [lon, lat]
    - randomPolygon(lon, lat, radius, npoints) - return a random polygon consisting of npoints points within radius meters of [lon, lat].  NOTE: still needs work, currently returns a set of completly random points that may or may not be a valid polygon
    - randomPoint(lon, lat, radius) - wrap the randomLoc output in a geoJSON point
    - pick(array, min, max) - return between min and max randomly selected elements from the array (may be duplicates)
    - randomInt(max) - return a random integer from 0 to max.  Defaults to 32-bit integer if max is not provided
    - randomString(cnt, charset) - return a string of cnt characters randomly selected from charset.  Defaults: charset = base64 character set, cnt = 10
    - randomDigit(cnt) - return a cnt(default=1)-digit number as a string
    - randomLetter(cnt) - return a cnt(default=1)-character string consisting of upper- and lower-case letters
    - randomHex(cnt) - return a cnt(default=1)-character hexadecimal string
    - human(size, places) - return the size in human-readable form using power of 2 sizes (i.e. GiB), rouned to places decimals
    - setRandomSeed(seed, prime) - functions in this file will use a seeded random number generator instead of Math.random().  Default seed is current time, defaul prime is 16525637
    - resetRandom() - revert to using Math.random()

    There are some other, I'll add notes as I find time
</details>
