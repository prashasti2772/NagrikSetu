import {
  FiCheckCircle,
  FiClock,
  FiInfo,
} from "react-icons/fi";

import { resolutionTips } from "../../data/reportIssueData";

export default function ResolutionTips() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <FiInfo className="text-orange-500" />
        What helps faster resolution?
      </h2>

      <p className="mt-3 text-[10px] leading-5 text-slate-500">
        Following civic verification guidelines expedites priority municipal
        review.
      </p>

      <div className="mt-5 space-y-4">

        {resolutionTips.map((tip) => (
          <div
            key={tip}
            className="flex gap-3"
          >
            <FiCheckCircle
              className="mt-0.5 shrink-0 text-emerald-500"
              size={15}
            />

            <p className="text-[10px] leading-5 text-slate-600">
              {tip}
            </p>
          </div>
        ))}

      </div>

      <div className="mt-5 rounded-lg bg-slate-100 p-3">

        <p className="text-[9px] font-bold uppercase tracking-widest text-orange-600">
          Municipal SLA Commitment
        </p>

        <p className="mt-2 text-[10px] leading-4 text-slate-600">
          Mandatory statutory response within{" "}
          <strong className="text-slate-900">
            48 hours
          </strong>{" "}
          under Public Civic Service Charter.
        </p>

      </div>

    </div>
  );
}