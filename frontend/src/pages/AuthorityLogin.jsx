import { useAuth } from "../auth";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";


export default function AuthorityLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const form = new FormData(event.currentTarget);
      await login(form.get("email"), form.get("password"), true);
      navigate("/authority/dashboard",{replace:true});
    } catch(error) {setNotice(error.message);} finally {setLoading(false);}
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="mx-auto max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="bg-[#102943] px-6 py-7 text-white sm:px-9">
          <p className="text-xs font-bold uppercase tracking-wide text-orange-300">NagrikSetu authorized access</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Authority Login</h1>
          <p className="mt-2 text-sm text-slate-300">Authorized staff access only.</p>
        </header>

        <form onSubmit={submit} className="space-y-4 p-6 sm:p-9">
          <label className="block text-sm font-semibold">
            Work email
            <span className="relative mt-1.5 block">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required name="email" type="email" autoComplete="username" className="field !mt-0 !pl-10" placeholder="name@department.example" />
            </span>
          </label>

          <label className="block text-sm font-semibold">
            Password
            <span className="relative mt-1.5 block">
              <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input required name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="field !mt-0 !pl-10 !pr-11" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          <div className="flex justify-between">
            <Link to="/login" className="text-sm font-semibold text-orange-700">Citizen Login</Link>
            <Link to="/forgot-password" className="text-sm font-semibold text-orange-700">Forgot Password?</Link>
          </div>

          
          {notice && <p role="status" className="rounded-md bg-amber-50 p-3 text-xs leading-5 text-amber-900">{notice}</p>}

          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-3 font-bold text-white disabled:opacity-60">
            <ShieldCheck size={17} />
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
