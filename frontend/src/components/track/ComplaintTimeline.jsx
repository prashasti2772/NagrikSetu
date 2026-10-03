import {
  Check,
  Clock3,
  Circle,
  Hammer,
} from "lucide-react";

const ComplaintTimeline = ({ timeline }) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-orange-500" />

          <h2 className="text-lg font-semibold text-slate-900">
            Statutory Lifecycle Progression
          </h2>
        </div>

        <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-600">
          Stage 4 of 6 Active
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-y-8 md:grid-cols-6 md:gap-0">
        <div className="absolute left-[8%] right-[8%] top-5 hidden h-px bg-slate-200 md:block" />

        {timeline.map((item) => {
          const isCompleted = item.status === "completed";
          const isActive = item.status === "active";

          return (
            <div
              key={item.number}
              className="relative z-10 flex flex-col items-center text-center"
            >
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full border-4 border-white
                  ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isActive
                      ? "bg-orange-500 text-white"
                      : "bg-slate-100 text-slate-400"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : isActive ? (
                  <Hammer className="h-4 w-4" />
                ) : (
                  <span className="text-xs">{item.number}</span>
                )}
              </div>

              <p
                className={`mt-2 text-xs font-semibold ${
                  isActive
                    ? "text-orange-600"
                    : isCompleted
                    ? "text-slate-900"
                    : "text-slate-500"
                }`}
              >
                {item.title}
              </p>

              <p className="mt-1 text-[10px] text-slate-500">
                {item.time}
              </p>

              <p
                className={`mt-1 text-[10px] font-medium ${
                  isCompleted
                    ? "text-emerald-600"
                    : isActive
                    ? "text-orange-500"
                    : "text-slate-400"
                }`}
              >
                {item.note}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ComplaintTimeline;