import {api} from "../services/api";
import {useAuth} from "../auth";
import { useState } from "react";
import {useLocation} from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, Eye, EyeOff, Mail, ShieldCheck } from "lucide-react";

const stages = ["Email", "Verify OTP", "New password", "Complete"];

export default function ForgotPassword() {
  const location=useLocation();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const cooldown = 0;

  const {logout}=useAuth();
  const [resetToken,setResetToken]=useState("");
  const [busy,setBusy]=useState(false);
  const run=async task=>{if(busy)return;setBusy(true);setMessage("");try{await task();}catch(e){setMessage(e.message);}finally{setBusy(false);}};
  const requestOtp=event=>{event.preventDefault();run(async()=>{const result=await api("/auth/forgot-password",{method:"POST",body:{email}});setStep(2);setMessage(result.message);});};
  const verifyOtp=event=>{event.preventDefault();run(async()=>{const result=await api("/auth/verify-otp",{method:"POST",body:{email,otp}});setResetToken(result.reset_token);setStep(3);});};
  const resend=()=>run(async()=>{const result=await api("/auth/forgot-password",{method:"POST",body:{email}});setMessage(result.message);});
  const submitPassword=event=>{event.preventDefault();if(password!==confirm){setMessage("Passwords do not match.");return;}run(async()=>{await api("/auth/reset-password",{method:"POST",body:{reset_token:resetToken,new_password:password}});setResetToken("");logout();setStep(4);});};

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"><section className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><header className="bg-[#102943] px-6 py-7 text-white sm:px-9"><p className="text-xs font-bold uppercase tracking-wide text-orange-300">Account security</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Reset your password</h1><p className="mt-2 text-sm text-slate-300">Recover access securely using your registered email.</p></header><div className="p-5 sm:p-9"><ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Password reset progress">{stages.map((label, index) => <li key={label} className="text-center"><span className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${step > index + 1 ? "bg-emerald-100 text-emerald-800" : step === index + 1 ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-500"}`}>{step > index + 1 ? <Check size={15} /> : index + 1}</span><span className={`mt-2 block text-[10px] sm:text-xs ${step === index + 1 ? "font-bold text-slate-900" : "text-slate-500"}`}>{label}</span></li>)}</ol>
      {step === 1 && <form onSubmit={requestOtp} className="space-y-4"><h2 className="text-xl font-bold text-[#102943]">Enter your email</h2><label className="block text-sm font-semibold">Registered email<span className="relative mt-1.5 block"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field !mt-0 !pl-10" placeholder="name@example.com" /></span></label><button disabled={busy} className="w-full rounded-lg bg-orange-600 py-3 font-bold text-white">Continue</button></form>}
      {step === 2 && <form onSubmit={verifyOtp} className="space-y-4"><h2 className="text-xl font-bold text-[#102943]">Verify email OTP</h2><p className="break-all text-sm text-slate-600">Code destination: {maskEmail(email)}</p><label className="block text-sm font-semibold">6-digit OTP<input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))} className="field text-center text-xl tracking-[0.35em]" placeholder="------" /></label><div className="flex justify-between text-xs"><button type="button" onClick={resend} disabled={cooldown > 0} className="font-semibold text-orange-700 disabled:text-slate-400">{cooldown ? `Resend in ${cooldown}s` : "Resend OTP"}</button><span className="text-slate-500">Expiry status provided by recovery service</span></div><button disabled={busy} className="w-full rounded-lg bg-orange-600 py-3 font-bold text-white">Verify OTP</button></form>}
      {step === 3 && <form onSubmit={submitPassword} className="space-y-4"><h2 className="text-xl font-bold text-[#102943]">Choose a new password</h2><PasswordField label="New password" value={password} onChange={setPassword} show={showPassword} toggle={() => setShowPassword((value) => !value)} /><PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} show={showConfirm} toggle={() => setShowConfirm((value) => !value)} /><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3 font-bold text-white"><ShieldCheck size={16} />Reset Password</button></form>}
      {step === 4 && <div className="text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800"><Check size={24} /></span><h2 className="mt-4 text-2xl font-bold text-[#102943]">Password reset complete</h2><p className="mt-2 text-sm text-slate-600">Your password was changed. Sign in with your new password.</p><Link to="/login" state={location.state} className="mt-5 inline-flex rounded-lg bg-orange-600 px-5 py-3 font-bold text-white">Return to Sign In</Link></div>}
      {message && <p role="status" className="mt-5 rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">{message}</p>}
      <Link to="/login" state={location.state} className="mt-5 inline-flex items-center gap-1 text-sm text-slate-600"><ArrowLeft size={15} />Return to Sign In</Link>
    </div></section></main>;
}

function PasswordField({ label, value, onChange, show, toggle }) {
  return <label className="block text-sm font-semibold">{label}<span className="relative mt-1.5 block"><input required minLength={10} maxLength={128} type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="field !mt-0 !pr-11" placeholder="At least 10 characters" /><button type="button" onClick={toggle} aria-label={show ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>;
}

function maskEmail(email) {
  if (!email.includes("@")) return "your registered email";
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}${"•".repeat(Math.max(2, name.length - 1))}@${domain}`;
}