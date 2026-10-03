import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiUser,
  FiLogOut,
} from "react-icons/fi";
import {
  MdOutlineDashboard,
  MdOutlineReportProblem,
  MdOutlineMap,
  MdOutlineAssessment,
  MdOutlineVerifiedUser,
} from "react-icons/md";
import logo from "../../assets/logo/nagriksetu-logo.png";

export default function AuthorityNavbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isDashboardActive = ["/admin", "/authority-dashboard"].includes(pathname);
  const isComplaintsActive = pathname === "/authority/complaints";
  const isAuthorityLoggedIn =
    localStorage.getItem("nagrikSetuAuth") === "true" &&
    localStorage.getItem("nagrikSetuRole") === "authority";
  let authority = null;

  if (isAuthorityLoggedIn) {
    try {
      authority = JSON.parse(localStorage.getItem("nagrikSetuUser") || "null");
    } catch {
      authority = null;
    }
  }

  const openDashboard = () => {
    setMobileMenuOpen(false);
    navigate("/authority-dashboard");
  };

  const openComplaints = () => {
    setMobileMenuOpen(false);
    navigate("/authority/complaints");
  };

  const handleLogout = () => {
    localStorage.removeItem("nagrikSetuAuth");
    localStorage.removeItem("nagrikSetuRole");
    localStorage.removeItem("nagrikSetuUser");
    setProfileOpen(false);
    setMobileMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-[1500px] px-5 lg:px-4 2xl:px-8">
        <div className="flex h-[72px] items-center justify-between gap-2 xl:gap-4">
          <div className="flex min-w-fit items-center gap-3">
            <div className="flex h-10 w-12 items-center justify-center">
              <img src={logo} alt="NagrikSetu" className="h-9 w-9 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">NagrikSetu</h1>
              <p className="mt-1 text-[8px] uppercase tracking-wider text-gray-500">
                Authority Portal
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 2xl:flex">
            <span className="rounded bg-[#071d35] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Municipal Governance Command
            </span>
            <span className="rounded bg-[#ffe0d5] px-3 py-1.5 text-[10px] font-bold uppercase text-[#9d3c18]">
              Official Authority Portal
            </span>
          </div>

          <nav className="hidden h-full items-center lg:flex" aria-label="Authority dashboard">
            <NavItem
              active={isDashboardActive}
              icon={<MdOutlineDashboard size={18} />}
              text="Dashboard"
              onClick={openDashboard}
            />
            <NavItem
              active={isComplaintsActive}
              icon={<MdOutlineReportProblem size={18} />}
              text="Complaints Worklist"
              onClick={openComplaints}
            />
            <NavItem icon={<MdOutlineMap size={18} />} text="Live Map & Zones" />
            <NavItem icon={<MdOutlineAssessment size={18} />} text="Reports & SLA" />
            <NavItem icon={<MdOutlineVerifiedUser size={18} />} text="Officer Verification" />
          </nav>

          {isAuthorityLoggedIn && (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                aria-label="Open authority profile"
                aria-expanded={profileOpen}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#071d35] text-white"
              >
                <FiUser size={16} />
              </button>
              {profileOpen && (
                <AuthorityProfile authority={authority} onLogout={handleLogout} />
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? "Close dashboard menu" : "Open dashboard menu"}
            aria-expanded={mobileMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 lg:hidden"
          >
            {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav className="border-t border-gray-200 py-2 lg:hidden" aria-label="Authority dashboard">
            <NavItem
              active={isDashboardActive}
              mobile
              icon={<MdOutlineDashboard size={18} />}
              text="Dashboard"
              onClick={openDashboard}
            />
            <NavItem
              active={isComplaintsActive}
              mobile
              icon={<MdOutlineReportProblem size={18} />}
              text="Complaints Worklist"
              onClick={openComplaints}
            />
            <NavItem
              mobile
              icon={<MdOutlineMap size={18} />}
              text="Live Map & Zones"
              onClick={() => setMobileMenuOpen(false)}
            />
            <NavItem
              mobile
              icon={<MdOutlineAssessment size={18} />}
              text="Reports & SLA"
              onClick={() => setMobileMenuOpen(false)}
            />
            <NavItem
              mobile
              icon={<MdOutlineVerifiedUser size={18} />}
              text="Officer Verification"
              onClick={() => setMobileMenuOpen(false)}
            />
            {isAuthorityLoggedIn && (
              <div className="border-t border-gray-200 px-2 pt-3">
                <AuthorityProfile
                  authority={authority}
                  onLogout={handleLogout}
                  mobile
                />
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

function AuthorityProfile({ authority, onLogout, mobile = false }) {
  return (
    <div
      className={`${mobile ? "w-full" : "absolute right-0 top-12 z-50 w-72 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"} text-sm`}
    >
      <p className="font-semibold text-[#071d35]">
        {authority?.name || "Authority Officer"}
      </p>
      <div className="mt-3 space-y-2 text-xs text-gray-600">
        {authority?.role && <p>Role: {authority.role}</p>}
        {authority?.email && <p>Email: {authority.email}</p>}
        {authority?.mobile && <p>Mobile: {authority.mobile}</p>}
        {authority?.id && <p>Authority ID: {authority.id}</p>}
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 px-3 py-2 font-semibold text-gray-800 transition hover:bg-gray-200"
      >
        <FiLogOut size={15} />
        Log out
      </button>
    </div>
  );
}

function NavItem({ icon, text, active = false, mobile = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${mobile ? "w-full justify-start rounded-lg px-4 py-3" : "h-[72px] border-b-4 px-2 text-[10px] lg:gap-1.5 xl:px-3 xl:text-xs 2xl:gap-2"} flex items-center gap-2 font-semibold transition ${
        active
          ? "border-[#ff6422] bg-[#eef3f7] text-[#071d35]"
          : "border-transparent text-gray-600 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}