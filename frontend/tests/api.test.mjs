import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const values=new Map();
globalThis.sessionStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
globalThis.window=new EventTarget();
const source=(await readFile(new URL("../src/services/api.js",import.meta.url),"utf8")).replace("import.meta.env.VITE_API_BASE_URL",JSON.stringify("http://test.local/api/v1/"))
 .replace('"./apiBase.js"',JSON.stringify(new URL("../src/services/apiBase.js",import.meta.url).href));
const {api,setToken,getToken,listAll}=await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
test("shared API handles credentials, validation, permissions, expiry, uploads and pagination",async()=>{
 let captured;
 globalThis.fetch=async(url,options)=>{captured={url,options};return new Response(JSON.stringify({ok:true}));};
 setToken("issued-test-token");await api("/auth/me");assert.equal(captured.url,"http://test.local/api/v1/auth/me");assert.equal(captured.options.headers.get("Authorization"),"Bearer issued-test-token");
 const body=new FormData();body.set("file",new Blob(["image"]),"test.png");await api("/complaints/1/evidence/upload",{method:"POST",body});assert.equal(captured.options.body,body);assert.equal(captured.options.headers.has("Content-Type"),false);
 globalThis.fetch=async()=>new Response(JSON.stringify({detail:[{loc:["body","email"],msg:"invalid email"}]}),{status:422});await assert.rejects(api("/auth/register"),/email: invalid email/);
 globalThis.fetch=async()=>new Response(JSON.stringify({detail:"Access denied"}),{status:403});await assert.rejects(api("/authority/dashboard"),e=>e.status===403);assert.equal(getToken(),"issued-test-token");
 let expired=false;window.addEventListener("session-expired",()=>expired=true);
 globalThis.fetch=async()=>new Response(JSON.stringify({detail:"Invalid credentials"}),{status:401});await assert.rejects(api("/auth/login",{accessToken:null}));assert.equal(expired,false);
 await assert.rejects(api("/auth/me"),e=>e.status===401);assert.equal(expired,true);assert.equal(getToken(),null);assert.equal(values.size,0);
 globalThis.fetch=async()=>{throw new TypeError("connection refused");};await assert.rejects(api("/departments"),/Cannot reach the backend/);
 globalThis.fetch=async()=>new Response("<!doctype html><html>Wrong host</html>");await assert.rejects(api("/departments"),/invalid response/);
 globalThis.fetch=async()=>new Response(JSON.stringify({unexpected:true}));await assert.rejects(listAll("/authority/complaints"),/invalid list/);
 const offsets=[];globalThis.fetch=async url=>{const offset=Number(new URL(url).searchParams.get("offset"));offsets.push(offset);return new Response(JSON.stringify(Array.from({length:offset===0?100:2},(_,i)=>({id:offset+i}))));};
 assert.equal((await listAll("/authority/complaints?status=assigned")).length,102);assert.deepEqual(offsets,[0,100]);
 setToken("another-issued-test-token");setToken(null);assert.equal(getToken(),null);
});
