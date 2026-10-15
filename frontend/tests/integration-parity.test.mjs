import { test } from "node:test";
import assert from "node:assert/strict";
import { categories as guidance } from "../src/data/categoriesData.js";
import { buildCategoryDirectory, matchesCategory } from "../src/services/categoryDirectory.js";
import { readLocalProfile, saveLocalProfile } from "../src/services/localProfile.js";

test("legacy guidance/search coexist with live department IDs and new departments",()=>{
 const departments=[{id:101,name:"Roads & Infrastructure"},{id:205,name:"Street Lighting"},{id:306,name:"Parks & Gardens"},{id:999,name:"New Department"}];
 const rows=buildCategoryDirectory(departments,guidance);
 assert.equal(rows.length,departments.length);
 assert.deepEqual(rows.map(row=>row.id),[101,205,306,999]);
 assert.equal(rows[0].title,"Roads & Infrastructure");
 assert.ok(matchesCategory(rows[0],"Roadways","Broken curb"));
 assert.ok(matchesCategory(rows[1],"Utilities","Loose electrical wire"));
 assert.ok(matchesCategory(rows[2],"Parks","Fallen branch blocking lane"));
 assert.ok(matchesCategory(rows[0],"Roads & Infrastructure","potholes"));
 assert.equal(matchesCategory(rows[0],"Utilities","Broken curb"),false);
 assert.ok(matchesCategory(rows[3],"New Department","new department"));
 assert.deepEqual(rows[3].reports,[]);
});

test("local address preferences are account-scoped and cannot store auth fields",()=>{
 const values=new Map();const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(saveLocalProfile(1,{address:"First Street",city:"City",role:"admin",password:"never-store-this"},storage),true);
 assert.deepEqual(readLocalProfile(1,storage),{address:"First Street",city:"City"});
 assert.deepEqual(readLocalProfile(2,storage),{address:"",city:""});
 assert.equal([...values.values()].some(value=>value.includes("password") || value.includes("admin")),false);
 assert.equal(saveLocalProfile(null,{address:"No account"},storage),false);
 values.set("nagrikSetuLocalProfile:1","bad-json");
 assert.deepEqual(readLocalProfile(1,storage),{address:"",city:""});
 const unavailable={getItem(){throw new Error("Unavailable");},setItem(){throw new Error("Unavailable");}};
 assert.deepEqual(readLocalProfile(1,unavailable),{address:"",city:""});
 assert.equal(saveLocalProfile(1,{address:"No storage"},unavailable),false);
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
 try {
  Object.defineProperty(globalThis,"localStorage",{configurable:true,get(){throw new Error("Storage blocked");}});
  assert.deepEqual(readLocalProfile(1),{address:"",city:""});
  assert.equal(saveLocalProfile(1,{address:"Blocked"}),false);
 } finally {
  if(descriptor)Object.defineProperty(globalThis,"localStorage",descriptor);
  else delete globalThis.localStorage;
 }
});
