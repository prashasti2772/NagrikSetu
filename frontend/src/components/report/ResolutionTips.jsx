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

    </div>
  );
}