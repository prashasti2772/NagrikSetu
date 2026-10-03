import { civicCategories } from "../../data/homeData";

export default function CategoriesSection() {
  return (
    <section className="bg-[#f1f4f6] px-5 py-14 lg:px-8">

      <div className="mx-auto max-w-[1380px]">

        <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-500">
              Civic Catalog
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Explore Common Categories
            </h2>

            <p className="mt-2 text-xs text-slate-500">
              Select a department to view regional live issues or lodge a
              localized grievance.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">
              Filter Ward:
            </span>

            <select className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs outline-none">
              <option>All Municipal Wards (Citywide)</option>
              <option>Ward 14</option>
              <option>Ward 28</option>
              <option>Ward 42</option>
            </select>
          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

          {civicCategories.map((category, index) => (
            <div
              key={category.id}
              className="rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >

              <div className="flex items-start justify-between">

                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  {index === 0
                    ? "⚑"
                    : index === 1
                    ? "▣"
                    : index === 2
                    ? "◯"
                    : index === 3
                    ? "◉"
                    : index === 4
                    ? "≋"
                    : "♧"}
                </div>

                <span className="rounded-full bg-orange-100 px-3 py-1 text-[8px] font-bold text-orange-700">
                  {category.issues} IN PROGRESS
                </span>

              </div>

              <h3 className="mt-5 text-sm font-semibold text-slate-900">
                {category.title}
              </h3>

              <p className="mt-2 min-h-[50px] text-[10px] leading-5 text-slate-500">
                {category.description}
              </p>

              <a
                href="/report-issue"
                className="mt-5 flex items-center justify-between text-[9px] font-medium text-orange-500"
              >
                {category.action}
                <span className="text-base">→</span>
              </a>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}