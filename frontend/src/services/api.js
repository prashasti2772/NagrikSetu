import { normalizeApiBase } from "./apiBase.js";
export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000");
const key = "nagrikSetuAccessToken";
let token;
try { token = sessionStorage.getItem(key); } catch { token = null; }
export function setToken(value) { token = value; try { if(value) sessionStorage.setItem(key,value); else sessionStorage.removeItem(key); } catch { /* In-memory session still works when browser storage is disabled. */ } }
export const getToken = () => token;
export async function api(path, {method="GET", body, accessToken=token, signal}={}) {
 const headers = new Headers(); const form = body instanceof FormData;
 if(body !== undefined && !form) headers.set("Content-Type","application/json");
 if(accessToken) headers.set("Authorization",`Bearer ${accessToken}`);
 let response;
 try { response = await fetch(`${API_BASE}/api/v1${path}`, {method, headers, body: body === undefined ? undefined : form ? body : JSON.stringify(body), signal}); }
 catch(error) { if(error.name === "AbortError") throw error; throw new Error("Cannot reach the backend. Check that the server is running and the API URL is correct."); }
 const data = await response.json().catch(()=>null);
 if(!response.ok) {
  if(response.status===401 && accessToken === token && token) { setToken(null); window.dispatchEvent(new Event("session-expired")); }
  const detail=data?.detail;
  const error=new Error(Array.isArray(detail) ? detail.map(x=>`${x.loc?.filter(v=>v!=="body").join(".")}: ${x.msg}`).join("; ") : typeof detail === "string" ? detail : `Request failed (${response.status})`);
  error.status=response.status; error.retryAfter=response.headers.get("Retry-After"); if(response.status===429 && error.retryAfter) error.message += ` Retry after ${error.retryAfter} seconds.`; throw error;
 }
 if(response.status!==204 && data===null) throw new Error("The backend returned an invalid response. Check the API URL and try again.");
 return data;
}
export async function listAll(path, signal) {
 const rows=[];
 for(let offset=0;;offset+=100) { const batch=await api(`${path}${path.includes("?")?"&":"?"}offset=${offset}&limit=100`,{signal}); if(!Array.isArray(batch))throw new Error("The backend returned an invalid list. Please try again."); rows.push(...batch); if(batch.length<100) return rows; }
}
export const label = value => String(value || "Unassigned").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase());
export const date = value => value ? new Date(/[Zz]|[+-]\d\d:\d\d$/.test(value)?value:`${value}Z`).toLocaleString() : "Not available";
