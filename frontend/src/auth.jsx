import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { api, setToken, getToken } from "./services/api";
const AuthContext = createContext(null);
const normalize = u => ({...u, name:u.full_name, title:u.designation, mobile:u.phone, emailVerified:u.email_verified});
export function AuthProvider({children}) {
 const [user,setUserState]=useState(null), [loading,setLoading]=useState(true), [error,setError]=useState("");
 const setUser=u=>setUserState(u ? normalize(u):null);
 const logout=()=>{setToken(null);setUser(null);setError("");};
 const restore=async()=>{setLoading(true);setError("");try {if(getToken()) setUser(await api("/auth/me"));}catch(e){if(e.status!==401)setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{restore(); const expired=()=>{setUser(null);setError("");}; window.addEventListener("session-expired",expired);return()=>window.removeEventListener("session-expired",expired);},[]);
 useEffect(()=>{
  if(!user)return;
  try {
   const segment=getToken()?.split(".")[1];
   if(!segment)return;
   const claims=JSON.parse(atob(segment.replaceAll("-","+").replaceAll("_","/")));
   if(!Number.isFinite(claims.exp))return;
   const timer=setTimeout(()=>{setToken(null);setUserState(null);},Math.max(0,claims.exp*1000-Date.now()));
   return()=>clearTimeout(timer);
  } catch { /* The backend validates JWT signatures and expiry on every request. */ }
 },[user]);
 const login=async(email,password,staff=false)=>{
  const result=await api("/auth/login",{method:"POST",body:{email,password},accessToken:null});
  const account=await api("/auth/me",{accessToken:result.access_token});
  if(staff ? !["authority","admin"].includes(account.role) : account.role!=="citizen") throw new Error(staff?"Authority or admin account required.":"Use Authority Login for staff accounts.");
  setToken(result.access_token);setUser(account);setError("");return account;
 };
 return <AuthContext.Provider value={{user,setUser,loading,error,restore,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
export function AuthGuard({children,roles}) {
 const {user,loading,error,restore}=useAuth();const location=useLocation();
 if(loading)return <p role="status" className="p-8">Checking session...</p>;
 if(error)return <div role="alert" className="p-8">{error}<button onClick={restore} className="ml-3 underline">Retry</button></div>;
 if(!user)return <Navigate to={roles?.some(role=>["authority","admin"].includes(role))?"/authority/login":"/login"} state={{from:location.pathname}} replace/>;
 if(roles && !roles.includes(user.role))return <main className="p-8"><h1 className="text-xl font-bold">Access restricted</h1><p>Your account cannot access this page.</p><a href={user.role==="citizen"?"/my-complaints":"/authority/dashboard"}>Open your dashboard</a></main>;
 return children;
}
