import { Link } from "react-router-dom";
import logo from "../../assets/logo/nagriksetu-logo.png";

export default function Footer({ authority = false }) {
  if (authority) {
    return (
      <footer className="mt-10 bg-[#071d35] text-white">
        <div className="mx-auto max-w-[1500px] px-5 py-10 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="text-2xl">🏛️</div>
                <span className="text-lg font-bold">NagrikSetu</span>
              </div>
              <span className="mb-3 inline-block rounded bg-orange-500 px-2 py-1 text-[9px] font-bold uppercase text-white">
                Civic Grievance Workspace
              </span>
              <p className="text-xs leading-5 text-gray-300">
                Tools for reviewing reports, monitoring progress, and checking resolution evidence.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-wide">
                Quick Links
              </h4>
              <div className="space-y-3 text-xs text-gray-400">
                <Link to="/authority/reports" className="block hover:text-white">Reports</Link>
                <Link to="/authority/departments" className="block hover:text-white">Departments</Link>
                <Link to="/authority/notifications" className="block hover:text-white">Notifications</Link>
                <Link to="/authority/profile" className="block hover:text-white">Profile</Link>
              </div>
            </div>

            <div className="xl:col-span-2">
              <h4 className="mb-4 text-xs font-bold uppercase tracking-wide">
                Support
              </h4>
              <div className="max-w-[350px] rounded-xl bg-[#020f20] p-5">
                <p className="text-[9px] uppercase text-gray-400">
                  Public support email
                </p>
                <a href="mailto:nagriksetuprashasti@gmail.com" className="mt-1 block text-sm font-bold hover:text-orange-300">
                  nagriksetuprashasti@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-5 text-[10px] text-gray-500 md:flex-row">
            <p>© 2026 NagrikSetu</p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#0c2239] px-5 py-12 text-white lg:px-8">
      <div className="mx-auto max-w-[1380px]">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <img src={logo} alt="NagrikSetu" className="h-9 w-9 object-contain" />
              <span className="font-bold">NagrikSetu</span>
            </div>
            <p className="mt-4 max-w-xs text-[9px] leading-5 text-slate-300">
              AI-assisted civic grievance tracking and citizen verification.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold">Quick Links</h3>
            <div className="mt-4 space-y-2 text-[9px] text-slate-300">
              <Link to="/resources" className="block hover:text-white">Resources</Link>
              <Link to="/help-support" className="block hover:text-white">Help &amp; Support</Link>
              <Link to="/report-issue" className="block hover:text-white">Report Issue</Link>
              <Link to="/track-complaint" className="block hover:text-white">Track Complaint</Link>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold">Resources &amp; Guides</h3>
            <div className="mt-4 space-y-2 text-[9px] text-slate-300">
              <p>How to report an issue</p>
              <p>Complaint tracking</p>
              <p>Resolution verification</p>
              <p>Privacy &amp; evidence guidance</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold">Public Support</h3>
            <p className="mt-4 text-[9px] text-slate-300">For help using NagrikSetu, contact:</p>
            <a href="mailto:nagriksetuprashasti@gmail.com" className="mt-4 block break-all text-xs font-bold hover:text-white">
              ✉ nagriksetuprashasti@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-700 pt-5">
          <div className="flex flex-col justify-between gap-3 text-[8px] text-slate-400 sm:flex-row">
            <span>© 2026 NagrikSetu</span>
          </div>
        </div>
      </div>
    </footer>
  );
}