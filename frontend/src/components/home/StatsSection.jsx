import { homeStats } from "../../data/homeData";

export default function StatsSection() {
  return (
    <section className="bg-[#0c2239] px-5 py-7 lg:px-8">

      <div className="mx-auto grid max-w-[1380px] grid-cols-2 gap-7 lg:grid-cols-4">

        {homeStats.map((stat, index) => (
          <div key={stat.label}>

            <p
              className={`text-3xl font-bold ${
                index === 1
                  ? "text-emerald-400"
                  : index === 3
                  ? "text-orange-300"
                  : "text-white"
              }`}
            >
              {stat.value}
            </p>

            <p className="mt-1 text-xs font-semibold text-white">
              {stat.label}
            </p>

            <p className="mt-1 text-[9px] text-slate-300">
              {stat.description}
            </p>

          </div>
        ))}

      </div>
    </section>
  );
}