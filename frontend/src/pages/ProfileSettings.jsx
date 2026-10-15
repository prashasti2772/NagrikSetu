import { api } from "../services/api";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Languages, LockKeyhole, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../auth";
import { readLocalProfile, saveLocalProfile } from "../services/localProfile";

const defaultPreferences = { email: true, resolution: true, digest: false, sms: false };

function readPreferences() {
  try { return { ...defaultPreferences, ...JSON.parse(localStorage.getItem("nagrikSetuNotificationPreferences") || "{}") }; }
  catch { return defaultPreferences; }
}

function readLanguage() {
  try { return localStorage.getItem("nagrikSetuPreferredLanguage") || "English"; }
  catch { return "English"; }
}

export default function ProfileSettings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => ({ name: user?.full_name || "", email: user?.email || "", phone:user?.phone || "" }));
  const [preferences, setPreferences] = useState(readPreferences);
  const [language, setLanguage] = useState(readLanguage);
  const [message, setMessage] = useState("");
  const emailChanged = profile.email !== (user?.email || "");

  useEffect(() => setProfile({ name: user?.full_name || "", email: user?.email || "", phone:user?.phone || "" }), [user]);

  const handleLogout = () => { logout(); navigate("/login", { replace: true }); };
  const [saving,setSaving]=useState(false);
  const saveProfile = async event => {
    event.preventDefault();setSaving(true);
    try{setUser(await api("/auth/me",{method:"PATCH",body:{full_name:profile.name,phone:profile.phone || null}}));setMessage("Profile saved.");}catch(e){setMessage(e.message);}finally{setSaving(false);}
  };
  const updatePreference = (id) => {
    setPreferences((current) => {
      const next = { ...current, [id]: !current[id] };
      try { localStorage.setItem("nagrikSetuNotificationPreferences", JSON.stringify(next)); } catch { /* Storage is optional. */ }
      return next;
    });
  };
  const updateLanguage = (value) => {
    setLanguage(value);
    try { localStorage.setItem("nagrikSetuPreferredLanguage", value); } catch { /* Storage is optional. */ }
  };
  const emailVerified = !emailChanged && (user?.emailVerified === true || user?.verified === true);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <section className="mb-5 rounded-xl bg-[#102943] px-6 py-7 text-white sm:px-9">
        <p className="text-xs font-bold uppercase tracking-wide text-orange-300">Account settings</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Profile &amp; Settings</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">Manage the details and preferences linked to your account.</p>
      </section>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3"><UserRound className="text-orange-700" /><div><h2 className="font-bold text-slate-900">Personal Information</h2><p className="text-xs text-slate-500">Details from your current account session</p></div></div>
          <form onSubmit={saveProfile} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">Full name<input value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} placeholder="Not available" className="field" /></label>
            <label className="block text-sm font-semibold text-slate-700">Email<input readOnly type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} placeholder="Not available" className="field" /></label>
            <label className="block text-sm font-semibold">Phone<input maxLength={30} value={profile.phone} onChange={e=>setProfile(p=>({...p,phone:e.target.value}))} className="field"/></label><a href="/verify-email" className="text-sm text-orange-700 underline">Verify email</a><p className="flex items-center gap-2 text-sm text-slate-600"><Mail size={16} className="text-orange-700" />Email verification: <strong>{emailChanged ? "Needs verification" : emailVerified ? "Verified" : "Not verified"}</strong></p>
            <button disabled={saving} className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white">Save Changes</button>
            {message && <p role="status" className="text-xs text-amber-800">{message}</p>}
          </form>
          <LocalAddressPreferences key={user?.id} userId={user?.id}/>
        </section>
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3"><Bell className="text-orange-700" /><h2 className="font-bold text-slate-900">Local Display Preferences</h2></div>
            {[{ id: "email", label: "Show email update preference (local only)" }, { id: "resolution", label: "Show resolution preference (local only)" }, { id: "digest", label: "Show digest preference (local only)" }, { id: "sms", label: "Show SMS / WhatsApp preference (local only)" }].map((item) => <label key={item.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><span className="text-sm text-slate-700">{item.label}</span><input type="checkbox" checked={preferences[item.id]} onChange={() => updatePreference(item.id)} className="h-4 w-4 accent-orange-600" /></label>)}
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3"><Languages className="text-orange-700" /><h2 className="font-bold text-slate-900">Preferred Language</h2></div>
            <select value={language} onChange={(event) => updateLanguage(event.target.value)} className="field !mt-0"><option>English</option><option>Hindi</option></select>
            <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4"><LockKeyhole className="text-orange-700" /><h2 className="font-bold text-slate-900">Security</h2></div>
            <p className="mt-2 text-sm text-slate-600">Change your password through the account recovery flow.</p>
            <a href="/forgot-password" className="mt-3 inline-flex text-sm font-semibold text-orange-700 underline"><ShieldCheck size={16} className="mr-2" />Change Password</a>
            <button type="button" onClick={handleLogout} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut size={16} />Log Out</button>
          </section>
        </div>
      </div>
    </main>
  );
}

function LocalAddressPreferences({userId}) {
  const [profile,setProfile]=useState(()=>readLocalProfile(userId));
  const [message,setMessage]=useState("");
  return <form onSubmit={event=>{event.preventDefault();setMessage(saveLocalProfile(userId,profile)?"Address preferences saved in this browser.":"Browser storage is unavailable; address preferences were not saved.");}} className="mt-6 space-y-4 border-t border-slate-100 pt-5">
    <h3 className="font-bold text-slate-900">Address preferences</h3>
    <p className="text-xs text-slate-500">Saved only in this browser for this account; not synced to your account or used to verify your address.</p>
    <label className="block text-sm font-semibold text-slate-700">Residential address<textarea value={profile.address} maxLength={500} onChange={event=>setProfile(current=>({...current,address:event.target.value}))} className="field" /></label>
    <label className="block text-sm font-semibold text-slate-700">City<input value={profile.city} maxLength={120} onChange={event=>setProfile(current=>({...current,city:event.target.value}))} className="field" /></label>
    <button className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-800">Save address preferences</button>
    {message && <p role="status" className="text-xs text-amber-800">{message}</p>}
  </form>;
}
