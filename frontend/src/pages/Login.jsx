import {useLanguage} from "../language";
import { useAuth } from "../auth";
import { api } from "../services/api";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SignInReason from "../components/common/SignInReason";
import { loginDestination } from "../services/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";


export default function Login({ register = false }) {
 const {t}=useLanguage();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setNotice("");
    if (register && password !== confirmPassword) {
      setNotice("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData(event.currentTarget);
      if(register) await api("/auth/register",{method:"POST",body:{full_name:form.get("full_name"),email:form.get("email"),password,phone:form.get("phone")?.trim() || null}});
      await login(form.get("email"), password, false);
      navigate(loginDestination(location.state?.from),{replace:true});
    } catch(error) {setNotice(error.message);} finally {setLoading(false);}
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <section className="mx-auto grid max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col justify-between bg-[#102943] p-6 text-white sm:p-9">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-300">{t("NagrikSetu Citizen Portal")}</p>
            <h2 className="mt-5 text-2xl font-bold leading-tight sm:text-3xl">{t("Report civic issues, track progress, and stay informed.")}</h2>
          </div>
          <p className="mt-8 text-sm leading-6 text-slate-300">{t("Your reports, follow-ups, and verification requests stay together in one account.")}</p>
        </div>

        <div className="p-5 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
            {register ? t("Create your citizen account") : t("Welcome back")}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-[#102943] sm:text-4xl">
            {register ? t("Create Citizen Account") : t("Citizen Login")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {register ? t("Set up an account to prepare your complaint and follow up securely.") : t("Login to manage your reports and updates.")}
          </p>

          <SignInReason state={location.state}/>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {register && (
              <label className="block text-sm font-semibold text-slate-800">
                {t("Full name")}
                <input required name="full_name" maxLength={200} autoComplete="name" className="field" placeholder={t("Your full name")} />
              </label>
            )}

            {register && <label className="block text-sm font-semibold text-slate-800">{t("Phone (optional)")}<input name="phone" type="tel" autoComplete="tel" maxLength={30} className="field" /></label>}
            <label className="block text-sm font-semibold text-slate-800">
              {t("Email address")}
              <span className="relative mt-1.5 block">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required name="email" type="email" autoComplete="email" className="field !mt-0 !pl-10" placeholder="name@example.com" />
              </span>
            </label>

            <PasswordInput label={t("Password")} value={password} onChange={setPassword} show={showPassword} onToggle={() => setShowPassword((visible) => !visible)} autoComplete={register ? "new-password" : "current-password"} />
            {register && (
              <PasswordInput label={t("Confirm Password")} value={confirmPassword} onChange={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm((visible) => !visible)} autoComplete="new-password" />
            )}

            {register && (
              <p className="text-xs text-slate-500">
                Email verification is available at <Link to="/verify-email" className="font-semibold text-orange-700 underline">{t("Verify email")}</Link>.
              </p>
            )}

            
            {register && <label className="flex items-start gap-3 text-sm text-slate-600"><input required name="acknowledgement" type="checkbox" className="mt-1 accent-orange-600" /><span>{t("I agree to submit accurate civic reports and use NagrikSetu responsibly.")}</span></label>}
            {notice && <p role="status" className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">{t(notice)}</p>}

            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3 font-bold text-white transition hover:bg-orange-700 disabled:opacity-60">
              <ShieldCheck size={17} />
              {loading ? t("Please wait...") : register ? t("Create Account") : t("Login")}
            </button>
          </form>

          <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm" aria-label={t("Account links")}>
            {register ? (
              <Link to="/login" state={location.state} className="font-semibold text-orange-700">{t("Already have an account? Login")}</Link>
            ) : (
              <>
                <Link to="/signup" state={location.state} className="font-semibold text-orange-700">{t("Create Account")}</Link>
                <Link to="/forgot-password" state={location.state} className="text-slate-700">{t("Forgot Password?")}</Link>
              </>
            )}
            <Link to="/authority/login" className="font-semibold text-orange-700">{t("Authority Login")}</Link>
            <Link to="/help-support" className="text-slate-700">Help &amp; Support</Link>
          </nav>
        </div>
      </section>
    </main>
  );
}

function PasswordInput({ label, value, onChange, show, onToggle, autoComplete }) {
 const {t}=useLanguage();
  return (
    <label className="block text-sm font-semibold text-slate-800">
      {t(label)}
      <span className="relative mt-1.5 block">
        <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input required value={value} onChange={(event) => onChange(event.target.value)} type={show ? "text" : "password"} minLength={autoComplete === "new-password" ? 10 : 1} maxLength={128} autoComplete={autoComplete} className="field !mt-0 !pl-10 !pr-11" placeholder={t("Password")} />
        <button type="button" onClick={onToggle} aria-label={show ? t("Hide password") : t("Show password")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
    </label>
  );
}
