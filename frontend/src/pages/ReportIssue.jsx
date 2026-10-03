import {
  FiAlertCircle,
  FiPhoneCall,
  FiShield,
} from "react-icons/fi";

import Footer from "../components/common/Footer";
import { reportStatus } from "../data/reportIssueData";

import ReportForm from "../components/report/ReportForm";
import ResolutionTips from "../components/report/ResolutionTips";
import ZoneStatus from "../components/report/ZoneStatus";
import EscalationCard from "../components/report/EscalationCard";

export default function ReportIssue() {
  return (
    <div className="min-h-screen bg-[#f5f7f9]">

      {/* Top status bar */}
      <div className="border-b border-slate-200 bg-[#eef1f3]">

        <div className="mx-auto flex max-w-[1450px] flex-col justify-between gap-2 px-5 py-2 text-[9px] sm:flex-row lg:px-8">

          <div className="flex flex-wrap items-center gap-4">

            <span className="flex items-center gap-2 font-semibold text-slate-700">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              {reportStatus.wardMessage}
            </span>

            <span className="text-slate-400">
              •
            </span>

            <span className="text-slate-500">
              {reportStatus.serviceSla}
            </span>

          </div>

          <span className="flex items-center gap-2 text-slate-600">
            <FiShield className="text-orange-600" size={12} />
            {reportStatus.registryForm}
          </span>

        </div>
      </div>

      <main>

        {/* Page heading */}
        <section className="mx-auto max-w-[1450px] px-5 pb-6 pt-8 lg:px-8 lg:pt-10">

          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

            <div>

              <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-orange-600">
                <FiAlertCircle size={13} />
                Direct Municipal Lodgement
              </p>

              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Report a Civic Grievance
              </h1>

              <p className="mt-2 max-w-3xl text-xs leading-5 text-slate-600">
                Submit geotagged evidence directly to jurisdictional municipal
                authorities with automated SLA tracking.
              </p>

            </div>

            <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 shadow-sm">

              <FiPhoneCall
                className="text-orange-600"
                size={22}
              />

              <div>

                <p className="text-[10px] font-semibold text-slate-800">
                  Life Hazard or Gas / Live Wire?
                </p>

                <p className="text-xs font-bold text-orange-600">
                  Dial 1916 Instant Dispatch →
                </p>

              </div>

            </div>

          </div>
        </section>

        {/* Main content */}
        <section className="mx-auto max-w-[1450px] px-5 pb-16 lg:px-8">

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_300px] xl:grid-cols-[minmax(0,1fr)_300px]">

            {/* Form */}
            <ReportForm />

            {/* Right sidebar */}
            <aside className="space-y-4">

              <ResolutionTips />

              <ZoneStatus />

              <EscalationCard />

            </aside>

          </div>

        </section>

      </main>

    </div>
  );
}