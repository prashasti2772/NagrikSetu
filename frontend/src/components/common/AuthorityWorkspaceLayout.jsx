import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBell,
  FiLogOut,
  FiMenu,
  FiSearch,
  FiX,
} from "react-icons/fi";
import {
  MdOutlineAssessment,
  MdOutlineDashboard,
  MdOutlineMap,
  MdOutlineReportProblem,
  MdOutlineVerifiedUser,
} from "react-icons/md";
import { FiTool, FiUsers } from "react-icons/fi";
import logo from "../../assets/logo/nagriksetu-logo.png";

const workspaceLinks = [
  { label: "Dashboard", icon: <MdOutlineDashboard size={15} />, to: "/authority-dashboard", key: "dashboard" },
  { label: "Complaints", icon: <MdOutlineReportProblem size={15} />, to: "/authority/complaints", key: "complaints" },
  { label: "Assignment & Routing", icon: <MdOutlineMap size={15} />, to: "/authority/assignments", key: "assignments" },
  { label: "Verification", icon: <MdOutlineVerifiedUser size={15} />, to: "/authority/verification", key: "verification" },
  { label: "Analytics & Reports", icon: <MdOutlineAssessment size={15} />, to: "/authority/analytics", key: "analytics" },
  { label: "Officers", icon: <FiUsers size={15} />, to: "/authority/officers", key: "officers" },
  { label: "Departments", icon: <FiTool size={15} />, to: "/authority/departments", key: "departments" },
  { label: "Notifications", icon: <FiBell size={15} />, to: "/authority/notifications", key: "notifications" },
  { label: "Settings", icon: <MdOutlineAssessment size={15} />, to: "/authority/settings", key: "settings" },
];

export default function AuthorityWorkspaceLayout({ activeSection, title, children }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authority] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nagrikSetuUser") || "null");
    } catch {
      return null;
    }
  });

  const logout = () => {
    localStorage.removeItem("nagrikSetuAuth");
    localStorage.removeItem("nagrikSetuRole");
    localStorage.removeItem("nagrikSetuUser");
    navigate("/login");
  };

  const initials = (authority?.name || "Rajiv Mehta")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#10253e]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close authority navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 md:hidden"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[180px] flex-col bg-[#10253e] text-white transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[58px] items-center gap-2.5 border-b border-white/10 px-4">
          <img src={logo} alt="" className="h-7 w-7 rounded bg-white object-contain p-0.5" />
          <span className="min-w-0"><span className="block truncate text-xs font-bold">Authority Portal</span><span className="block text-[7px] uppercase tracking-wider text-slate-400">Govt. Administration</span></span>
          <button type="button" onClick={(event) => { event.preventDefault(); setSidebarOpen(false); }} aria-label="Close authority navigation" className="ml-auto rounded p-1 text-slate-300 hover:bg-white/10 md:hidden"><FiX size={16} /></button>
        </div>

        <p className="px-3 pb-1 pt-5 text-[8px] font-bold uppercase tracking-widest text-slate-400">Administrative Management</p>
        <nav className="flex-1 space-y-1 overflow-y-auto px-2" aria-label="Authority workspace">
          {workspaceLinks.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex min-h-8 items-center gap-2 rounded-md px-2.5 py-2 text-[9px] font-medium transition ${activeSection === item.key ? "bg-[#a93905] text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
            >
              {item.icon}<span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <button type="button" onClick={logout} className="flex items-center gap-2 border-t border-white/10 px-4 py-4 text-[10px] font-medium text-slate-300 hover:bg-white/5 hover:text-white">
          <FiLogOut size={14} />Logout
        </button>
      </aside>

      <div className="min-h-screen md:pl-[180px]">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
          <div className="flex h-[58px] items-center gap-3 px-4 sm:px-6">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open authority navigation" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 md:hidden"><FiMenu size={17} /></button>
            <div className="hidden items-center gap-2 text-[9px] sm:flex"><span className="text-slate-500">Civic Ops</span><span className="text-slate-300">›</span><span className="font-semibold text-orange-700">{title}</span></div>
            <div className="relative ml-auto hidden w-full max-w-[250px] sm:block">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search authority workspace" placeholder="Search complaint ID, officer..." className="h-8 w-full rounded-md bg-slate-100 pl-8 pr-3 text-[9px] outline-none focus:ring-2 focus:ring-orange-200" />
            </div>
            <Link to="/authority/notifications" aria-label="Notifications" className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"><FiBell size={15} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-600" /></Link>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="text-right"><p className="text-[9px] font-semibold text-slate-800">{authority?.name || "Er. Rajiv Mehta"}</p><p className="text-[7px] text-slate-500">Authority Administrator</p></div>
              <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-[9px] font-semibold text-slate-700">{initials}</div>
            </div>
            <button type="button" onClick={logout} aria-label="Logout" title="Logout" className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 md:flex"><FiLogOut size={14} /></button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}