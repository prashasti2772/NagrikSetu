import { useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Save,
  ShieldCheck,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { complaintStats } from "../data/myComplaintsData";

const defaultProfile = {
  name: "Rajesh Verma",
  email: "rajesh.verma@example.com",
  mobile: "+91 98765 43210",
  address: "Flat 402, Block C, Shanti Vihar, Sector 4",
  city: "New Delhi",
  residentId: "DEL-88219",
  joined: "August 2024",
};

const defaultPreferences = [
  { id: "email", title: "Email Notifications", description: "Receive status updates and verification requests by email.", enabled: true },
  { id: "sms", title: "SMS / WhatsApp Updates", description: "Receive instant stage updates on your registered phone.", enabled: true },
  { id: "resolution", title: "Complaint Resolution Alerts", description: "Immediate prompt when resolution evidence is uploaded.", enabled: true },
  { id: "digest", title: "Monthly Civic Digest", description: "Summary of resolved issues in your locality.", enabled: false },
];

function readProfile() {
  try {
    const user = JSON.parse(localStorage.getItem("nagrikSetuUser") || "null");
    return { ...defaultProfile, ...user, name: user?.name || defaultProfile.name };
  } catch {
    return defaultProfile;
  }
}

function ProfileSettings() {
  const [profile, setProfile] = useState(readProfile);
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("nagrikSetuNotificationPreferences") || "null");
      return defaultPreferences.map((preference) => ({
        ...preference,
        enabled: stored?.[preference.id] ?? preference.enabled,
      }));
    } catch {
      return defaultPreferences;
    }
  });
  const [saved, setSaved] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [passwordMessage, setPasswordMessage] = useState("");

  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const saveProfile = (event) => {
    event.preventDefault();
    let existingUser = {};
    try {
      existingUser = JSON.parse(localStorage.getItem("nagrikSetuUser") || "{}");
    } catch {
      existingUser = {};
    }
    localStorage.setItem("nagrikSetuUser", JSON.stringify({ ...existingUser, ...profile }));
    setSaved(true);
  };

  const togglePreference = (id) => {
    setPreferences((current) => {
      const updated = current.map((preference) =>
        preference.id === id ? { ...preference, enabled: !preference.enabled } : preference
      );
      localStorage.setItem(
        "nagrikSetuNotificationPreferences",
        JSON.stringify(Object.fromEntries(updated.map(({ id: key, enabled }) => [key, enabled])))
      );
      return updated;
    });
  };

  const updatePassword = (event) => {
    event.preventDefault();
    if (password.next.length < 8) {
      setPasswordMessage("Use at least 8 characters for your new password.");
      return;
    }
    if (password.next !== password.confirm) {
      setPasswordMessage("The new passwords do not match.");
      return;
    }
    setPasswordMessage("Password updated successfully.");
    setPassword({ current: "", next: "", confirm: "" });
  };

  const stats = {
    total: complaintStats.find((stat) => stat.type === "total")?.value ?? 0,
    resolved: complaintStats.find((stat) => stat.type === "resolved")?.value ?? 0,
    pending: complaintStats.find((stat) => stat.type === "verification")?.value ?? 0,
  };
  const initials = profile.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <main className="mx-auto max-w-[1450px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
      <section className="relative mb-5 overflow-hidden rounded-xl border border-slate-100 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
        <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-700">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-600" />
              Citizen Portal Settings
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Citizen Profile &amp; Settings</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
              Manage your contact details, locality, and notification preferences to keep your civic updates accurate and timely.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-white/80 px-3 py-2 text-xs shadow-sm">
            <BadgeCheck size={17} className="text-emerald-600" />
            <span><strong className="block text-slate-800">Resident ID #{profile.residentId || profile.id}</strong><span className="text-[10px] text-slate-500">Identity verified</span></span>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><UserRound size={17} /></span>
                <div><h2 className="text-sm font-semibold text-slate-900">Personal Information</h2><p className="text-[10px] text-slate-500">Update primary contact credentials and resident address.</p></div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[8px] font-bold tracking-wide text-slate-700">PRIMARY</span>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-slate-100 p-3">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
                  {initials || "RV"}
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-[9px] text-white"><Check size={11} /></span>
                </div>
                <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900">{profile.name}</p><p className="text-[9px] text-slate-500">Registered Citizen · {profile.joined}</p><p className="mt-0.5 text-[8px] font-bold uppercase tracking-wide text-orange-700">{profile.ward || "SHANTI VIHAR RESIDENT"}</p></div>
              </div>

              <label className="block text-[10px] font-semibold text-slate-800">Full Name<input required value={profile.name} onChange={(event) => updateProfile("name", event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-100 bg-white px-3 text-xs font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[10px] font-semibold text-slate-800">Email Address<span className="float-right inline-flex items-center gap-1 text-[9px] text-emerald-600"><BadgeCheck size={11} /> Verified</span><input type="email" value={profile.email} onChange={(event) => updateProfile("email", event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-100 px-3 text-xs font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
                <label className="block text-[10px] font-semibold text-slate-800">Phone Number<input value={profile.mobile} onChange={(event) => updateProfile("mobile", event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-100 px-3 text-xs font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
              </div>
              <label className="block text-[10px] font-semibold text-slate-800">Residential Locality / Address<textarea rows={2} value={profile.address} onChange={(event) => updateProfile("address", event.target.value)} className="mt-1.5 w-full resize-y rounded-md border border-slate-100 px-3 py-2 text-xs font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
              <label className="block text-[10px] font-semibold text-slate-800">City / Region<input value={profile.city} onChange={(event) => updateProfile("city", event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-slate-100 px-3 text-xs font-normal outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" /></label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-[9px] text-slate-500">Changes are stored in this browser.</p>
                <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md bg-orange-600 px-4 text-xs font-semibold text-white transition hover:bg-orange-700"><Save size={14} />{saved ? "Changes Saved" : "Save Profile Changes"}<ArrowRight size={14} /></button>
              </div>
            </form>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><LockKeyhole size={16} /></span>
              <div><h2 className="text-sm font-semibold text-slate-900">Change Password</h2><p className="text-[10px] text-slate-500">Protect your account with a secure passphrase.</p></div>
            </div>
            <form onSubmit={updatePassword} className="space-y-3">
              <PasswordField label="Current Password" value={password.current} onChange={(value) => setPassword((current) => ({ ...current, current: value }))} visible={passwordVisible} toggle={() => setPasswordVisible((visible) => !visible)} placeholder="Enter current password" />
              <div className="grid gap-3 sm:grid-cols-2">
                <PasswordField label="New Password" value={password.next} onChange={(value) => setPassword((current) => ({ ...current, next: value }))} visible={passwordVisible} toggle={() => setPasswordVisible((visible) => !visible)} placeholder="Minimum 8 characters" />
                <PasswordField label="Confirm New Password" value={password.confirm} onChange={(value) => setPassword((current) => ({ ...current, confirm: value }))} visible={passwordVisible} toggle={() => setPasswordVisible((visible) => !visible)} placeholder="Re-enter new password" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className={`text-[10px] ${passwordMessage.includes("successfully") ? "text-emerald-700" : "text-slate-500"}`}>{passwordMessage || "Use at least 8 characters."}</p>
                <button type="submit" className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-slate-800"><ShieldCheck size={14} />Update Password</button>
              </div>
            </form>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Bell size={16} /></span>
              <div><h2 className="text-sm font-semibold text-slate-900">Notification Preferences</h2><p className="text-[10px] text-slate-500">Choose how you receive community updates.</p></div>
            </div>
            <div className="divide-y divide-slate-100">
              {preferences.map((preference) => (
                <label key={preference.id} className="flex cursor-pointer items-center justify-between gap-3 py-3 first:pt-1 last:pb-1">
                  <span className="min-w-0"><span className="block text-[11px] font-semibold text-slate-800">{preference.title}</span><span className="mt-0.5 block text-[9px] leading-4 text-slate-500">{preference.description}</span></span>
                  <input type="checkbox" checked={preference.enabled} onChange={() => togglePreference(preference.id)} className="peer sr-only" />
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${preference.enabled ? "bg-orange-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${preference.enabled ? "left-[18px]" : "left-0.5"}`} /></span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div><h2 className="text-sm font-semibold text-slate-900">My Civic Summary</h2><p className="text-[10px] text-slate-500">Participation metrics across {profile.city}.</p></div>
              <TrendingUp size={17} className="text-orange-600" />
            </div>
            <div className="mb-3 flex justify-between rounded-md bg-slate-100 px-3 py-2 text-[9px]"><span className="text-slate-600">Civic Member Since</span><strong className="text-slate-800">{profile.joined}</strong></div>
            <div className="grid grid-cols-2 gap-2">
              <SummaryTile label="TOTAL FILED" value={stats.total} detail="grievances" color="text-slate-900" />
              <SummaryTile label="RESOLVED" value={stats.resolved} detail="completed" color="text-emerald-700" />
              <SummaryTile label="VERIFICATION" value={stats.pending} detail="pending" color="text-orange-700" />
              <SummaryTile label="SIGN-OFFS" value="2" detail="citizen verified" color="text-slate-900" />
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-100 p-3">
              <div><p className="text-[10px] font-semibold text-slate-800">Active Citizen Contributor</p><p className="text-[9px] text-slate-500">100% verification response rate</p></div>
              <span className="rounded bg-white px-2 py-1 text-[8px] font-bold text-slate-700">TIER 1</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-900 p-3 text-white">
              <div><p className="text-[10px] font-semibold">Public Support</p><p className="mt-0.5 text-[9px] text-slate-300">Need assistance changing your registered locality?</p></div>
              <a href="/help-support" className="shrink-0 rounded-md bg-white px-3 py-2 text-[9px] font-semibold text-slate-900">Contact Desk</a>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function PasswordField({ label, value, onChange, visible, toggle, placeholder }) {
  return (
    <label className="block text-[10px] font-semibold text-slate-800">
      {label}
      <span className="mt-1.5 flex h-10 items-center rounded-md border border-slate-100 px-3 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
        <LockKeyhole size={13} className="shrink-0 text-slate-500" />
        <input type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent px-2 text-xs font-normal outline-none placeholder:text-slate-400" />
        <button type="button" onClick={toggle} aria-label={visible ? "Hide password" : "Show password"} className="text-slate-500">{visible ? <EyeOff size={14} /> : <Eye size={14} />}</button>
      </span>
    </label>
  );
}

function SummaryTile({ label, value, detail, color }) {
  return (
    <div className="rounded-lg bg-slate-100 p-3">
      <p className="text-[8px] font-bold tracking-wide text-slate-600">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}<span className="ml-1 text-[9px] font-normal text-slate-600">{detail}</span></p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-300"><div className={`h-full rounded-full ${label === "RESOLVED" ? "bg-emerald-500" : label === "VERIFICATION" ? "bg-orange-500" : "bg-slate-800"}`} style={{ width: `${Math.min(Number(value) * 25, 100)}%` }} /></div>
    </div>
  );
}

export default ProfileSettings;