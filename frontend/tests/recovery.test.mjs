import {test,after} from "node:test";
import assert from "node:assert/strict";
import {JSDOM} from "jsdom";
import {createServer} from "vite";
import {authRedirect,loginDestination} from "../src/services/navigation.js";
import {translate,readLanguage,saveLanguage} from "../src/services/i18n.js";
import {hasUnread} from "../src/services/notificationState.js";
import {chatRequest,replyLanguages} from "../src/services/chatLanguage.js";
import {resolveCategory} from "../src/services/categoryDirectory.js";
import {readFile} from "node:fs/promises";

test("protected citizen destinations, queries and expired reasons survive login and registration",()=>{
 for(const pathname of ["/report-issue","/track-complaint","/notifications"]){
  const redirect=authRedirect({pathname,search:"?id=42",hash:"#details"},["citizen"],true);
  assert.equal(redirect.to,"/login"); assert.equal(redirect.state.reason,"expired");
  assert.equal(redirect.state.authRequired,true);
  assert.equal(loginDestination(redirect.state.from),pathname+"?id=42#details");
 }
 assert.equal(authRedirect({pathname:"/authority/dashboard"},["authority","admin"]).to,"/authority/login");
 assert.equal(loginDestination("/authority/complaints/5",true),"/authority/complaints/5");
 assert.equal(loginDestination("//outside.example"),"/my-complaints");
});
test("authored Hindi preference and blocked storage fallback are safe",()=>{
 const storage={getItem:()=>"hi",setItem:()=>{}};
 assert.equal(readLanguage(storage),"hi"); assert.equal(translate("Report Issue","hi"),"समस्या दर्ज करें");
 assert.equal(translate("Private report entered by user","hi"),"Private report entered by user");
 assert.equal(saveLanguage({setItem(){throw new Error("blocked");}},"hi"),"hi");
 assert.equal(readLanguage({getItem(){throw new Error("blocked");}}),"en");
});
test("notification badge requires real unread state; language request honors selector",()=>{
 for(const rows of [undefined,[],[{is_read:true}],[{}]])assert.equal(hasUnread(rows),false);
 assert.equal(hasUnread([{is_read:false}]),true);
 assert.deepEqual(chatRequest("Hello","hi"),{message:"Hello",requested_language:"hi"});
 assert.equal(replyLanguages({response_language:"hi",detected_language:"en"},"hi").effectiveResponseLanguage,"hi");
});
test("home category hints select only an actually returned category",()=>{
 const live=[{id:87,name:"Water Supply"},{id:91,name:"Sanitation"}];
 assert.equal(resolveCategory("water",live),"Water Supply");
 assert.equal(resolveCategory("waste",live),"Sanitation");
 assert.equal(resolveCategory("roads",live),"");
 assert.equal(resolveCategory("Not a live department",live),"");
});
test("Render reference contains SPA rewrite; live setting still needs application",async()=>{
 const yaml=await readFile(new URL("../../render.yaml",import.meta.url),"utf8");
 assert.match(yaml,/rootDir: frontend/);assert.match(yaml,/type: rewrite\s+source: \/\*\s+destination: \/index\.html/);
});

const dom=new JSDOM("<!doctype html><html lang='en'><body><div id='test-root'></div></body></html>",{url:"http://localhost/"});
for(const name of ["window","document","HTMLElement","Event","MouseEvent","FormData","sessionStorage","localStorage"])globalThis[name]=dom.window[name];
Object.defineProperty(globalThis,"navigator",{value:dom.window.navigator,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=await import("react");
const {act}=React;
const {createRoot}=await import("react-dom/client");
const vite=await createServer({server:{middlewareMode:true},appType:"custom",logLevel:"error"});
let root;
after(async()=>{try{if(root)await act(()=>root.unmount());}finally{await vite.close();dom.window.close();}});
const load=path=>vite.ssrLoadModule("/src/"+path);
const {MemoryRouter,Routes,Route,useLocation}=await import("react-router-dom");
const {LanguageProvider}=await load("language.jsx");
const {AuthProvider,AuthGuard}=await load("auth.jsx");
const {default:Login}=await load("pages/Login.jsx");
const {default:SignUp}=await load("pages/SignUp.jsx");
const {default:Navbar}=await load("components/common/Navbar.jsx");
const {setToken}=await load("services/api.js");
const h=React.createElement;
let account=null;
let failBackend=false;
let unread=false;
let lastState;
globalThis.fetch=async url=>{
 if(failBackend)return new Response("<html>Unavailable</html>",{status:503});
 if(String(url).endsWith("/auth/me"))return account?Response.json(account):Response.json({detail:"Invalid credentials"},{status:401});
 if(String(url).endsWith("/auth/login"))return Response.json({access_token:"mock-issued-session"});
 if(String(url).endsWith("/auth/register"))return Response.json({id:2});
 if(String(url).includes("/notifications"))return Response.json(unread?[{id:1,is_read:false}]:[]);
 throw new Error("Unexpected test request");
};
function Observe(){const location=useLocation();React.useEffect(()=>{lastState=location;},[location]);return null;}
async function settle(){await new Promise(resolve=>setTimeout(resolve,10));}
async function mount(path,{token=null,navbar=false}={}){
 if(root)await act(()=>root.unmount());
 document.getElementById("test-root").innerHTML="";
 localStorage.clear();sessionStorage.clear();setToken(token);
 root=createRoot(document.getElementById("test-root"));
 await act(async()=>{
  root.render(h(LanguageProvider,null,h(MemoryRouter,{initialEntries:[path]},h(AuthProvider,null,
   h(Observe),navbar?h(Navbar):null,
   h(Routes,null,
    h(Route,{path:"/",element:h("p",null,"Public home")}),
    h(Route,{path:"/login",element:h(Login)}),h(Route,{path:"/signup",element:h(SignUp)}),
    ...["/report-issue","/track-complaint","/notifications"].map(p=>h(Route,{key:p,path:p,element:h(AuthGuard,{roles:["citizen"]},h("p",null,"Protected "+p))})),
    h(Route,{path:"/authority/dashboard",element:h(AuthGuard,{roles:["authority","admin"]},h("p",null,"Staff dashboard"))}),
    h(Route,{path:"/authority/login",element:h("p",null,"Staff sign-in")})
   )))));
  await settle();
 });
 await act(settle);
}
async function click(element){assert.ok(element);await act(async()=>{element.dispatchEvent(new MouseEvent("click",{bubbles:true,cancelable:true}));await settle();});}
function findLink(text){return [...document.querySelectorAll("a")].find(el=>el.textContent.trim()===text);}
async function fill(input,value){await act(async()=>{Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype,"value").set.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));});}

test("actual guest routes explain required sign-in, signup preserves return and login returns",async()=>{
 for(const destination of ["/report-issue","/track-complaint?id=42","/notifications"]){
  account=null;failBackend=false;await mount(destination);
  assert.equal(lastState.pathname,"/login");
  assert.match(document.body.textContent,/Sign in required/);
  assert.equal(lastState.state.from,destination);
  await click(findLink("Create Account"));
  assert.equal(lastState.pathname,"/signup");assert.equal(lastState.state.from,destination);
  await click(findLink("Already have an account? Login"));
  await fill(document.querySelector('input[name="email"]'),"citizen@example.com");
  await fill(document.querySelector('input[type="password"]'),"synthetic-test-password");
  account={id:2,role:"citizen",full_name:"Citizen",email:"citizen@example.com"};
  await act(async()=>{document.querySelector("form").dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));await settle();});
  assert.equal(lastState.pathname+lastState.search,destination);
  assert.match(document.body.textContent,/Protected/);
 }
});
test("header Create Account is distinct and Hindi selector updates actual navigation and form",async()=>{
 account=null;failBackend=false;await mount("/",{navbar:true});
 assert.ok(document.querySelector('a[href="/signup"]'));assert.ok(document.querySelector('a[href="/login"]'));
 assert.equal(document.querySelector('[aria-label="Unread notifications"]'),null);
 await click(findLink("Create Account"));assert.equal(lastState.pathname,"/signup");
 const selector=document.querySelector('select[aria-label="Interface language / भाषा"]');
 await act(async()=>{selector.value="hi";selector.dispatchEvent(new Event("change",{bubbles:true}));});
 assert.equal(document.documentElement.lang,"hi");
 assert.match(document.body.textContent,/नागरिक खाता बनाएँ/);assert.match(document.body.textContent,/समस्या दर्ज करें/);
});
test("backend unavailability does not masquerade as an unauthenticated session",async()=>{
 failBackend=true;account=null;await mount("/report-issue",{token:"test-session"});
 assert.equal(lastState.pathname,"/report-issue");assert.match(document.body.textContent,/Temporary service unavailability/);
 assert.equal(document.querySelector('input[name="email"]'),null);failBackend=false;
});
test("expired sessions clear auth and preserve protected destination",async()=>{
 account={id:2,role:"citizen",full_name:"Citizen"};await mount("/notifications",{token:"test-session"});
 await act(async()=>{setToken(null);window.dispatchEvent(new Event("session-expired"));await settle();});
 assert.equal(lastState.pathname,"/login");assert.equal(lastState.state.from,"/notifications");
 assert.match(document.body.textContent,/session expired/);
});
test("authority dashboard permits staff and rejects a citizen account",async()=>{
 account={id:4,role:"authority",full_name:"Officer"};await mount("/authority/dashboard",{token:"staff-session"});
 assert.match(document.body.textContent,/Staff dashboard/);
 account={id:2,role:"citizen",full_name:"Citizen"};await mount("/authority/dashboard",{token:"citizen-session"});
 assert.match(document.body.textContent,/Access restricted/);assert.doesNotMatch(document.body.textContent,/Staff dashboard/);
});
test("header unread indicator follows authenticated notifications and read events",async()=>{
 account={id:2,role:"citizen",full_name:"Citizen"};unread=true;await mount("/",{token:"test-session",navbar:true});
 assert.ok(document.querySelector('[aria-label="Unread notifications"]'));
 unread=false;await act(async()=>{window.dispatchEvent(new Event("notifications-updated"));await settle();});
 assert.equal(document.querySelector('[aria-label="Unread notifications"]'),null);
});
test("mobile navigation exposes distinct signup action and accessible language control",async()=>{
 account=null;await mount("/",{navbar:true});
 const menu=document.querySelector('button[aria-label="Open navigation"]');
 await click(menu);assert.equal(menu.getAttribute("aria-expanded"),"true");
 const actions=[...document.querySelectorAll('a[href="/signup"]')];assert.equal(actions.length,2);
 await click(actions.at(-1));assert.equal(lastState.pathname,"/signup");
});
test("late notification response cannot restore a stale unread badge",async()=>{
 const normalFetch=globalThis.fetch;
 let completeOld;let notificationRequests=0;
 globalThis.fetch=async url=>{
  if(!String(url).includes("/notifications"))return normalFetch(url);
  notificationRequests++;
  if(notificationRequests===1)return new Promise(resolve=>{completeOld=resolve;});
  return Response.json([]);
 };
 try{
  account={id:2,role:"citizen",full_name:"Citizen"};await mount("/",{token:"test-session",navbar:true});
  assert.equal(typeof completeOld,"function");
  await act(async()=>{window.dispatchEvent(new Event("notifications-updated"));await settle();});
  await act(async()=>{completeOld(Response.json([{id:1,is_read:false}]));await settle();});
  assert.equal(document.querySelector('[aria-label="Unread notifications"]'),null);
 }finally{globalThis.fetch=normalFetch;}
});
