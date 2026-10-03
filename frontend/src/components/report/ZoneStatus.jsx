import {
  FiActivity,
  FiCheckCircle,
  FiUsers,
} from "react-icons/fi";

import { zoneStatus } from "../../data/reportIssueData";

export default function ZoneStatus() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between">

        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
          Assigned Zone Status
        </span>

        <span className="h-2 w-2 rounded-full bg-emerald-400" />

      </div>

      <h2 className="mt-3 text-base font-bold text-slate-900">
        {zoneStatus.zone}
      </h2>

      <p className="mt-2 text-[10px] leading-5 text-slate-500">
        {zoneStatus.office}
      </p>

      <div className="mt-5">

        <div className="flex justify-between text-[10px]">
          <span className="text-slate-500">
            Ward 11 Redressal Rate:
          </span>

          <strong className="text-slate-900">
            {zoneStatus.rate} on time
          </strong>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-orange-500"
            style={{ width: zoneStatus.rate }}
          />
        </div>

      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">

        <div>
          <p className="text-[9px] text-slate-400">
            Avg Resolution
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            <FiActivity className="mr-1 inline" size={12} />
            {zoneStatus.resolution}
          </p>
        </div>

        <div>
          <p className="text-[9px] text-slate-400">
            Active Crews
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-700">
            <FiUsers className="mr-1 inline" size={12} />
            {zoneStatus.crews}
          </p>
        </div>

      </div>

    </div>
  );
}