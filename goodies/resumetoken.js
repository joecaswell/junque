
    function Reader(hexstring) {

        this.buff = new Buffer.from(hexstring,"hex");

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
            return MinKey();
        }

        this.readNull = function() {
            return null;
        }

        this.readZero = function() {
            return 0;
        }

        this.readUInt8 = function() {
            let res = this.buff.readUInt8();
            this.buff = this.buff.subarray(1);
            return res
        }

        this.readUInt16 = function() {
            let res = this.buff.readUInt16BE();
            this.buff = this.buff.subarray(2);
            return res
        }

        this.readUInt32 = function() {
            let res = this.buff.readUInt32BE();
            this.buff = this.buff.subarray(4);
            return res
        }

        this.readCString = function() {
            let res = ""
            if (this.buff.length > 0 && this.buff[0] != 0) {
                if ((i=this.buff.indexOf(0)) > -1) {
                    if (i > 0) {
                        res = this.buff.subarray(0,i).toString()
                    }
                    this.buff = this.buff.subarray(i+1)
                }
            }
            return res
        }

        this.readObject = function() {
            let res = {}
            let type = 1;
            do {
                type = this.readUInt8();
                if (type != 0) {
                    fieldname = this.readCString();
                    res[fieldname] = this.readNext();
                }
            } while (type != 0)
            return res
        }

        this.readBinData = function(){
            let size = this.readUInt8();
            let type = this.readUInt8();
            let data = this.buff.subarray(0,size);
            this.buff = this.buff.subarray(size);
            return new BinData(type, data.hexSlice())
        }

        this.readObjectId = function() {
            let oid = this.buff.subarray(0,12)
            this.buff = this.buff.subarray(12)
            return new ObjectId(oid)
        }

        this.readBoolFalse = function() {
            return false;
        }

        this.readBoolTrue = function() {
            return true;
        }

        this.readTimestamp = function() {
            let ts = this.readUInt32();
            let cnt = this.readUInt32();
            return Timestamp(ts,cnt);
        }

        this.readNext = function() {
            let type = this.readUInt8();
            let fun = this.readers[type];
            if (fun && this[fun]) {
                return this[fun]()
            } else {
                throw("Unknown type " + type);
            }
        }

        this.readArray = function() {
            let result = []
            while (this.buff.length > 0 && this.buff[0] != 4) {
                result.push(this.readNext())
            }
            return result
        }
    }

function decodeResumeToken(token) {
    let reader = new Reader(token);
    return reader.readArray();
}
