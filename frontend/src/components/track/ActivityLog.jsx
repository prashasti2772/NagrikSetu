import {
  UserRound,
  Truck,
  Route,
  UserCheck,
} from "lucide-react";

const ActivityLog = ({ activities }) => {
  const icons = {
    inspector: UserRound,
    crew: Truck,
    route: Route,
    citizen: UserCheck,
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Auditable Activity Log
        </p>

        <h2 className="text-lg font-medium text-slate-900">
          Field Operations & Action Stream
        </h2>
      </div>

      <div className="relative space-y-3">
        <div className="absolute bottom-4 left-[11px] top-4 w-px bg-slate-200" />

        {activities.map((activity, index) => {
          const Icon = icons[activity.type] || Circle;

          return (
            <div
              key={index}
              className="relative flex gap-3"
            >
              <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white">
                <Icon className="h-3.5 w-3.5 text-orange-500" />
              </div>

              <div className="flex-1 rounded-lg bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xs font-semibold text-slate-900">
                    {activity.title}
                  </h3>

                  <span className="whitespace-nowrap text-[10px] font-semibold text-orange-500">
                    {activity.time}
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] leading-5 text-slate-600">
                  {activity.description}
                </p>

                {(activity.meta || activity.extra) && (
                  <div className="mt-2 flex flex-wrap gap-x-3 text-[9px] text-slate-500">
                    {activity.meta && <span>{activity.meta}</span>}
                    {activity.extra && <span>{activity.extra}</span>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ActivityLog;