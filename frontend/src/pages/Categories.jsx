import React, { useState } from "react";
import {
  Search,
  ArrowRight,
  Headphones,
  Building2,
  FileText,
} from "lucide-react";

import {
  categories,
  categoryFilters,
} from "../data/categoriesData";

function Categories() {
  const [activeFilter, setActiveFilter] = useState("All Issues");
  const [search, setSearch] = useState("");

  // Filter categories
  const filteredCategories = categories.filter((category) => {
    const matchesFilter =
      activeFilter === "All Issues" ||
      category.filter === activeFilter;

    const searchText = `
      ${category.title}
      ${category.department}
      ${category.description}
      ${category.reports.join(" ")}
    `.toLowerCase();

    const matchesSearch = searchText.includes(
      search.toLowerCase()
    );

    return matchesFilter && matchesSearch;
  });

  // Report issue
  const handleReport = (category) => {
    window.location.href = `/report-issue?category=${encodeURIComponent(
      category.title
    )}`;
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-gray-900">

      {/* ================= HERO ================= */}

      <section className="relative mx-3 mt-4 overflow-hidden rounded-xl bg-[#102943] px-5 py-7 text-white shadow-sm sm:mx-6 sm:mt-6 sm:px-8 sm:py-9 lg:mx-8">

        <div className="relative z-10 max-w-2xl">

          <div className="mb-4 flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-bold tracking-wide text-slate-200">
            <Building2 size={13} />
            NAGRIK MUNICIPAL DIRECTORY
          </div>

          <h1 className="mb-3 text-2xl font-bold leading-tight sm:text-3xl">
            Civic Issue Categories
          </h1>

          <p className="mb-5 max-w-xl text-xs leading-6 text-slate-400 sm:text-[13px]">
            Browse categories and report issues to the designated
            municipal departments. Select an issue domain to file a
            direct grievance or verify operational purview.
          </p>

          {/* Search */}

          <div className="flex h-11 w-full max-w-[460px] items-center rounded-xl border border-gray-300 bg-white pl-4 pr-1 text-gray-500">

            <Search size={19} />

            <input
              type="text"
              placeholder="Search categories, e.g., pothole, drainage, street light, water leak..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 px-2 text-xs text-gray-800 outline-none placeholder:text-gray-400"
            />

            <button className="h-9 rounded-lg bg-[#b83205] px-4 text-xs font-semibold text-white hover:bg-[#982c04]">
              Find
            </button>

          </div>
        </div>

        {/* Background icon */}

        <div className="absolute -bottom-4 right-5 hidden text-white/10 sm:block">
          <Building2 size={185} strokeWidth={1.3} />
        </div>

      </section>

      {/* ================= MAIN ================= */}

      <main className="px-3 py-7 sm:px-6 lg:px-8">

        {/* Heading + Filters */}

        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex flex-wrap items-center gap-2">

            <h2 className="text-base font-bold">
              Municipal Departments
            </h2>

            <span className="rounded-full bg-[#e2e5e8] px-2.5 py-1 text-[9px] font-bold text-gray-600">
              {categories.length} Categories Available
            </span>

          </div>

          {/* Filters */}

          <div className="flex gap-1 overflow-x-auto pb-1">

            {categoryFilters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] transition ${
                  activeFilter === filter
                    ? "bg-[#102943] font-semibold text-white"
                    : "bg-[#e9ebee] text-gray-700 hover:bg-gray-300"
                }`}
              >
                {filter}
              </button>
            ))}

          </div>

        </div>

        {/* ================= CARDS ================= */}

        {filteredCategories.length > 0 ? (

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">

            {filteredCategories.map((category) => {

              const Icon = category.icon;

              return (
                <article
                  key={category.id}
                  className="flex min-h-[308px] flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >

                  {/* Top */}

                  <div className="mb-3 flex items-center justify-between gap-3">

                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${category.iconStyle}`}
                    >
                      <Icon size={22} strokeWidth={2} />
                    </div>

                    <span className="rounded-full bg-[#e7e9eb] px-2.5 py-1.5 text-center text-[8px] font-bold tracking-wide text-gray-600">
                      {category.department}
                    </span>

                  </div>

                  {/* Title */}

                  <h3 className="mb-1 text-base font-semibold leading-6 text-gray-900">
                    {category.title}
                  </h3>

                  {/* Description */}

                  <p className="text-[11px] leading-[1.65] text-gray-700">
                    {category.description}
                  </p>

                  {/* Reports */}

                  <div className="mt-4">

                    <h4 className="mb-1.5 text-[9px] font-bold text-gray-500">
                      COMMON REPORTS
                    </h4>

                    <div className="flex flex-wrap gap-1.5">

                      {category.reports.map((report) => (
                        <span
                          key={report}
                          className="rounded bg-[#e9ebed] px-2 py-1 text-[9px] text-gray-600"
                        >
                          {report}
                        </span>
                      ))}

                    </div>

                  </div>

                  {/* Report Button */}

                  <button
                    onClick={() => handleReport(category)}
                    className="mt-auto flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-[#b83205] text-[11px] font-bold text-white transition hover:bg-[#982c04]"
                  >
                    Report Issue in this Category
                    <ArrowRight size={16} />
                  </button>

                </article>
              );
            })}

          </div>

        ) : (

          /* No results */

          <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl bg-white text-gray-500">

            <Search size={35} />

            <h3 className="mt-3 text-base font-semibold text-gray-800">
              No categories found
            </h3>

            <p className="mt-1 text-xs">
              Try searching with a different keyword.
            </p>

          </div>
        )}

        {/* ================= HELP ================= */}

        <section className="mt-9 flex flex-col gap-5 rounded-xl border border-gray-100 bg-white px-5 py-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-start gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#ffe1d8] text-[#b83205]">
              <Headphones size={23} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Can't find your category?
              </h3>

              <p className="mt-1 text-[10px] text-gray-600">
                Ask our Citizen Help Chatbot or report under
                General Civic Issues for manual department routing.
              </p>
            </div>

          </div>

          <div className="flex flex-col gap-2 sm:flex-row">

            <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#e6e8eb] px-4 text-[11px] font-semibold text-gray-800 hover:bg-gray-300">
              <FileText size={15} />
              Citizen Chatbot
            </button>

            <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-[#b83205] px-4 text-[11px] font-semibold text-white hover:bg-[#982c04]">
              <FileText size={15} />
              Report Issue
            </button>

          </div>

        </section>

      </main>
    </div>
  );
}

export default Categories;