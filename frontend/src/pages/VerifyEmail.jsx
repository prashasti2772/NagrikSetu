import {api} from "../services/api";
import {useAuth} from "../auth";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";

export default function VerifyEmail() {
  const {user,setUser}=useAuth();
  const location = useLocation();
  const email = user?.email || location.state?.email || "your registered email address";
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("Request a code if one has not arrived. Email delivery depends on backend configuration.");
  const cooldown = 0;
  const [loading, setLoading] = useState(false);

  const verify=async event=>{event.preventDefault();setLoading(true);try{await api("/auth/verify-email",{method:"POST",body:{otp}});setUser(await api("/auth/me"));setMessage("Email verified.");}catch(e){setMessage(e.message);}finally{setLoading(false);}};
  const resend=async()=>{setLoading(true);try{const result=await api("/auth/request-email-verification",{method:"POST"});setMessage(result.message);}catch(e){setMessage(e.message);}finally{setLoading(false);}};

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><section className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><header className="bg-[#102943] px-6 py-7 text-white sm:px-9"><p className="text-xs font-bold uppercase tracking-wide text-orange-300">Email verification</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Verify your email</h1><p className="mt-2 text-sm text-slate-300">Enter the six-digit code sent to your inbox.</p></header><div className="p-6 sm:p-9"><p className="flex items-center gap-2 break-all text-sm text-slate-700"><Mail size={17} className="shrink-0 text-orange-700" />{maskEmail(email)}</p><form onSubmit={verify} className="mt-6 space-y-4"><label className="block text-sm font-semibold text-slate-800">6-digit OTP<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} className="field text-center text-xl tracking-[0.35em]" placeholder="------" aria-label="Six-digit OTP" /></label><p role="status" className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">{message}</p><button disabled={loading || otp.length !== 6} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3 font-bold text-white disabled:opacity-50"><ShieldCheck size={17} />{loading ? "Verifying..." : "Verify"}</button></form><div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm"><button type="button" onClick={resend} disabled={loading} className="font-semibold text-orange-700 disabled:text-slate-400">{cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend OTP"}</button><Link to="/login" className="inline-flex items-center gap-1 text-slate-600"><ArrowLeft size={15} />Back to Sign In</Link></div><p className="mt-4 text-xs text-slate-500">Codes expire after their configured validity period. Expiration and delivery status require the verification service.</p></div></section></main>;
}

function maskEmail(email) {
  if (!email.includes("@")) return email;
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}${"•".repeat(Math.max(2, name.length - 1))}@${domain}`;
}