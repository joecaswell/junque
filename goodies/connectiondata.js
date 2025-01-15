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
