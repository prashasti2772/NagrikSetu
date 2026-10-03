import logo from "../../assets/logo/nagriksetu-logo.png";

export default function Footer() {
  return (
    <footer className="bg-[#0c2239] px-5 py-12 text-white lg:px-8">

      <div className="mx-auto max-w-[1380px]">

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">

          <div>
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="NagrikSetu"
                className="h-9 w-9 object-contain"
              />

              <span className="font-bold">
                NagrikSetu
              </span>
            </div>

            <p className="mt-4 max-w-xs text-[9px] leading-5 text-slate-300">
              Official Citizen Services & Urban Grievance Redressal Gateway.
              Empowering common citizens through transparent, accountable,
              and responsive public governance.
            </p>

            <p className="mt-4 text-[9px] font-semibold text-emerald-400">
              ACTIVE MUNICIPAL WARDS: 48
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold">
              Quick Links
            </h3>

            <div className="mt-4 space-y-2 text-[9px] text-slate-300">
              <p>Public Portal Home</p>
              <p>Lodge Grievance</p>
              <p>Live Status Tracker</p>
              <p>Department Directory</p>
              <p>Zonal & Ward Locator</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold">
              Resources & Guides
            </h3>

            <div className="mt-4 space-y-2 text-[9px] text-slate-300">
              <p>Citizen Charter & Timelines</p>
              <p>Service Level Agreements</p>
              <p>Municipal Open Data</p>
              <p>Redressal Escalation Matrix</p>
              <p>Frequently Asked Questions</p>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold">
              Emergency Civic Contacts
            </h3>

            <p className="mt-4 text-[9px] text-slate-300">
              24/7 Centralized Civic Helpline for immediate hazards and
              municipal distress.
            </p>

            <p className="mt-4 text-xl font-bold">
              ☎ Toll-Free 1916
            </p>

            <p className="text-[9px] text-slate-400">
              Central Control Room
            </p>

            <p className="mt-3 text-[9px] text-slate-300">
              ✉ support@nagriksetu.gov.in
            </p>

            <p className="text-[9px] text-slate-300">
              Municipal Administrative Complex
            </p>
          </div>

        </div>

        <div className="mt-10 border-t border-slate-700 pt-5">

          <div className="flex flex-col justify-between gap-3 text-[8px] text-slate-400 sm:flex-row">

            <div className="flex flex-wrap gap-4">
              <span>Privacy Policy</span>
              <span>Terms of Service</span>
              <span>Hyperlinking Policy</span>
              <span>Accessibility Statement</span>
            </div>

            <span>
              © 2025 NagrikSetu Civic Platform. All rights reserved.
            </span>

          </div>

        </div>

      </div>
    </footer>
  );
}