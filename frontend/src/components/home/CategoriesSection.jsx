import { civicCategories } from "../../data/homeData";
import {Link} from "react-router-dom";

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
              Choose an issue type to start a report.
            </p>
          </div>

          <p className="text-xs text-slate-500">Example issue types. Available reporting categories load from the application backend.</p>

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
                  ISSUE TYPE
                </span>

              </div>

              <h3 className="mt-5 text-sm font-semibold text-slate-900">
                {category.title}
              </h3>

              <p className="mt-2 min-h-[50px] text-[10px] leading-5 text-slate-500">
                {category.description}
              </p>

              <Link
                to={`/report-issue?category=${encodeURIComponent(category.id)}`}
                className="mt-5 flex items-center justify-between text-[9px] font-medium text-orange-500"
              >
                {category.action}
                <span className="text-base">→</span>
              </Link>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}
