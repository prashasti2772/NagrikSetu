import { useAuth } from "../../auth";
import { useEffect, useState } from "react";
import {api} from "../../services/api";
import {hasUnread} from "../../services/notificationState";
import {LanguagePicker, useLanguage} from "../../language";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiUser,
  FiLogOut,
  FiBell,
  FiSettings,
} from "react-icons/fi";

import logo from "../../assets/logo/nagriksetu-logo.png";

const navItems = [
  {
    label: "Home",
    path: "/",
  },
  {
    label: "Report Issue",
    path: "/report-issue",
  },
  {
    label: "Track Complaint",
    path: "/track-complaint",
  },
  {
    label: "Categories",
    path: "/categories",
  },
  {
    label: "Resources",
    path: "/resources",
  },
  {
    label: "About",
    path: "/about",
  },
  {
    label: "Help & Support",
    path: "/help-support",
  },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const {t}=useLanguage();
  const [badge,setBadge]=useState(null);
  useEffect(()=>{
    if(!user)return;
    const controller=new AbortController();
    let latest=0;
    const refresh=()=>{const request=++latest;return api("/notifications?is_read=false&limit=1",{signal:controller.signal})
      .then(rows=>{if(!controller.signal.aborted && request===latest)setBadge({owner:user.id,unread:hasUnread(rows)});})
      .catch(()=>{if(!controller.signal.aborted && request===latest)setBadge(null);});};
    refresh();window.addEventListener("notifications-updated",refresh);
    return()=>{controller.abort();window.removeEventListener("notifications-updated",refresh);};
  },[user,location.pathname]);
  const unread=Boolean(user && badge?.owner===user.id && badge.unread);
  const isLoggedIn = Boolean(user);
  const isStaff = ["authority", "admin"].includes(user?.role);
  const dashboardPath = isStaff ? "/authority/dashboard" : "/my-complaints";
  const visibleNavItems = isStaff
    ? [navItems[0], { label: t("Authority Dashboard"), path: dashboardPath }, ...navItems.slice(4)]
    : isLoggedIn
      ? [...navItems.slice(0, 3), { label: t("My Complaints"), path: dashboardPath }, ...navItems.slice(3)]
      : navItems;
  const handleLogout = () => { logout(); setProfileOpen(false); setMenuOpen(false); navigate("/login"); };

  const isActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#10253e]">
      <nav className="mx-auto flex min-h-[64px] max-w-[1450px] items-center justify-between px-5 lg:px-8">

        {/* Logo */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2"
        >
          <img
            src={logo}
            alt="NagrikSetu"
            className="h-9 w-9 rounded bg-white p-0.5 object-contain"
          />

          <span className="text-[18px] font-bold tracking-tight text-white">
            NagrikSetu
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 xl:flex">

          {visibleNavItems.map((item) => {
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  relative px-3 py-5 text-[11px] font-medium
                  transition-all duration-200
                  ${
                    active
                      ? "font-bold text-orange-600"
                      : "text-white hover:text-orange-400"
                  }
                `}
              >
                {t(item.label)}

                {/* Active underline */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[3px] rounded-full bg-orange-500" />
                )}
              </Link>
            );
          })}

          {/* Language */}
          <LanguagePicker />

          <Link
            to="/notifications"
            aria-label={t("Notifications")}
            title={t("Notifications")}
            className={`relative ml-2 flex h-9 w-9 items-center justify-center rounded-full transition ${isActive("/notifications") ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            <FiBell size={16} />
            {unread && <span aria-label={t("Unread notifications")} className="absolute right-1 top-1 h-2 w-2 rounded-full bg-orange-600" />}
          </Link>

          {/* Login */}
          {!isLoggedIn && (
            <Link
              to="/login"
              className="ml-3 rounded-lg bg-orange-500 px-5 py-2.5 text-[11px] font-bold leading-tight text-white transition hover:bg-orange-600"
            >
              {t("Login")}
            </Link>
          )}
          {!isLoggedIn && <Link to="/signup" className="ml-2 rounded-lg border border-orange-300 px-3 py-3 text-xs text-white">{t("Create Account")}</Link>}

          {isLoggedIn && (
            <div className="relative ml-3">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Open account menu"
                aria-expanded={profileOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white"
              >
                <FiUser size={15} />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 z-50 w-64 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg">
                  <p className="font-semibold text-slate-900">{user?.name || "Citizen"}</p>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    {user?.email && <p>{user.email}</p>}
                  </div>
                  <div className="mt-3 space-y-2">
                    <Link to="/profile" onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-200">
                      <FiUser size={14} />
                      {t("My Profile")}
                    </Link>
                    <Link to={dashboardPath} onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-200">
                      <FiSettings size={14} />
                      {isStaff ? t("Authority Dashboard") : t("My Complaints")}
                    </Link>
                    <Link to="/notifications" onClick={() => setProfileOpen(false)} className="flex w-full items-center gap-2 rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-200">
                      <FiBell size={14} />
                      {t("Notifications")}
                    </Link>
                    <button type="button" onClick={handleLogout} className="mt-1 flex w-full items-center gap-2 rounded-md bg-slate-100 px-3 py-2 font-semibold text-slate-800 hover:bg-slate-200">
                      <FiLogOut size={14} />
                      {t("Logout")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Mobile menu */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 text-white xl:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
        >
          <FiMenu size={20} />
        </button>
      </nav>

      {/* Mobile navigation */}
      {menuOpen && (
        <div className="border-t border-white/10 bg-[#10253e] px-5 py-4 xl:hidden">

          <div className="flex flex-col">

            {isLoggedIn && (
              <div className="mb-3 rounded-lg bg-slate-50 p-4">
                <p className="font-semibold text-slate-900">
                  {user?.name || "Citizen"}
                </p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  {user?.email && <p>{user.email}</p>}
                  {user?.mobile && <p>Mobile: {user.mobile}</p>}
                  {user?.ward && <p>Ward: {user.ward}</p>}
                  {user?.id && <p>Citizen ID: {user.id}</p>}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  <FiSettings size={15} />
                  {t("Profile Settings")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-800"
                >
                  <FiLogOut size={15} />
                  {t("Log out")}
                </button>
              </div>
            )}

            {visibleNavItems.map((item) => {
              const active = isActive(item.path);

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`
                    border-l-4 px-4 py-3 text-sm
                    ${
                      active
                        ? "border-orange-500 bg-orange-50 font-semibold text-orange-600"
                        : "border-transparent text-white"
                    }
                  `}
                >
                {t(item.label)}
                </Link>
              );
            })}

            <Link
              to="/notifications"
              onClick={() => setMenuOpen(false)}
              className={`border-l-4 px-4 py-3 text-sm ${isActive("/notifications") ? "border-orange-500 bg-orange-50 font-semibold text-orange-600" : "border-transparent text-white"}`}
            >
              {t("Notifications")}
            </Link>

            <LanguagePicker />
            {isLoggedIn ? (
              <>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-sm text-white">{t("My Profile")}</Link>
                <Link to={dashboardPath} onClick={() => setMenuOpen(false)} className="px-4 py-3 text-sm text-white">{isStaff ? t("Authority Dashboard") : t("My Complaints")}</Link>
                <Link to="/notifications" onClick={() => setMenuOpen(false)} className="px-4 py-3 text-sm text-white">{t("Notifications")}</Link>
                <button type="button" onClick={handleLogout} className="mt-2 rounded-lg bg-slate-100 px-4 py-3 text-left text-sm font-semibold text-slate-800">{t("Logout")}</button>
              </>
            ) : (
              <><Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                className="mt-3 rounded-lg bg-orange-500 px-4 py-3 text-center text-sm font-bold text-white"
              >
                {t("Login")}
              </Link><Link to="/signup" onClick={()=>setMenuOpen(false)} className="mt-2 rounded-lg border border-orange-300 px-4 py-3 text-center text-sm text-white">{t("Create Account")}</Link></>
            )}

          </div>
        </div>
      )}
    </header>
  );
}
