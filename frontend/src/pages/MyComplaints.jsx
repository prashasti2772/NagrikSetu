import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Search,
  Plus,
  CalendarDays,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  ClipboardCheck,
  ShieldCheck,
  CheckCircle2,
  CircleHelp,
  MapPin,
  Wrench,
  Trash2,
  Lightbulb,
  Droplets,
} from "lucide-react";

import {
  complaintStats,
  complaintFilters,
  complaints,
  pageContent,
} from "../data/myComplaintsData";

// ============================================================
// ICON MAP
// ============================================================

const complaintIcons = {
  water: Droplets,
  road: Wrench,
  garbage: Trash2,
  streetlight: Lightbulb,
};


// ============================================================
// STAT ICON MAP
// ============================================================

const statIcons = {
  total: ClipboardList,
  progress: ClipboardCheck,
  verification: ShieldCheck,
  resolved: CheckCircle2,
};


// ============================================================
// STAT COLOR MAP
// ============================================================

const statColors = {
  total: {
    icon: "text-slate-800",
    value: "text-slate-900",
    bar: "bg-slate-900",
  },

  progress: {
    icon: "text-[#b83205]",
    value: "text-[#b83205]",
    bar: "bg-[#ff5b27]",
  },

  verification: {
    icon: "text-[#31587e]",
    value: "text-slate-900",
    bar: "bg-[#31587e]",
  },

  resolved: {
    icon: "text-emerald-600",
    value: "text-emerald-600",
    bar: "bg-emerald-500",
  },
};


// ============================================================
// MAIN COMPONENT
// ============================================================

function MyComplaints() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [showStatusDropdown, setShowStatusDropdown] =
    useState(false);

  const [showCategoryDropdown, setShowCategoryDropdown] =
    useState(false);


  // ==========================================================
  // FILTER COMPLAINTS
  // ==========================================================

  const filteredComplaints = useMemo(() => {
    return complaints.filter((complaint) => {
      const searchValue = `
        ${complaint.id}
        ${complaint.title}
        ${complaint.category}
        ${complaint.location}
        ${complaint.department}
      `.toLowerCase();

      const matchesSearch = searchValue.includes(
        search.toLowerCase()
      );

      const matchesStatus =
        statusFilter === "All" ||
        complaint.status === statusFilter;

      const matchesCategory =
        categoryFilter === "All" ||
        complaint.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory
      );
    });
  }, [search, statusFilter, categoryFilter]);


  // ==========================================================
  // REPORT NEW ISSUE
  // ==========================================================

  const handleReportIssue = () => {
    window.location.href = "/report-issue";
  };


  // ==========================================================
  // VIEW DETAILS
  // ==========================================================

  const handleViewDetails = (complaint) => {
  navigate(`/my-complaints/${complaint.id}`);
};


  // ==========================================================
  // VERIFY FIX
  // ==========================================================

  const handleVerifyFix = (complaint) => {
    navigate(`/my-complaints/${complaint.id}`);
  };


  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#111827]">


      {/* ======================================================
          PAGE CONTENT
      ====================================================== */}

      <main className="px-3 py-6 sm:px-6 lg:px-8">


        {/* ====================================================
            HERO
        ==================================================== */}

        <section className="relative mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white px-5 py-7 shadow-sm sm:px-7 sm:py-8">

          <div className="relative z-10 max-w-2xl">

            {/* Badge */}

            <div className="mb-3 flex items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e9ecef] text-[#24364a]">
                <ClipboardList size={18} />
              </div>

              <span className="text-[10px] font-bold tracking-wide text-[#b83205]">
                {pageContent.badge}
              </span>

            </div>


            {/* Title */}

            <h1 className="mb-2 text-2xl font-bold tracking-tight text-[#0d1f35] sm:text-3xl">
              {pageContent.title}
            </h1>


            {/* Description */}

            <p className="max-w-2xl text-xs leading-6 text-gray-700 sm:text-[13px]">
              {pageContent.description}
            </p>

          </div>


          {/* Report Button */}

          <button
            onClick={handleReportIssue}
            className="relative z-10 mt-5 flex h-10 items-center gap-2 rounded-lg bg-[#ff5b27] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#e84d1b] sm:absolute sm:right-7 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2"
          >
            <Plus size={17} />
            Report New Issue
          </button>


          {/* Decorative Shapes */}

          <div className="absolute -bottom-16 right-12 hidden h-28 w-28 rounded-full border border-gray-100 lg:block" />

          <div className="absolute -bottom-20 right-[-5px] hidden h-36 w-36 rounded-full border border-gray-100 lg:block" />

        </section>


        {/* ====================================================
            STATISTICS
        ==================================================== */}

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

          {complaintStats.map((stat) => {

            const Icon = statIcons[stat.type];

            const colors = statColors[stat.type];

            return (
              <div
                key={stat.id}
                className="rounded-xl border border-gray-100 bg-white px-5 py-5 shadow-sm"
              >

                {/* Header */}

                <div className="mb-4 flex items-center justify-between">

                  <span className="text-[9px] font-bold tracking-wide text-gray-700">
                    {stat.title}
                  </span>

                  <Icon
                    size={17}
                    className={colors.icon}
                  />

                </div>


                {/* Number */}

                <div className="flex items-end gap-2">

                  <span
                    className={`text-3xl font-medium ${colors.value}`}
                  >
                    {stat.value}
                  </span>

                  <span className="mb-1 text-[10px] text-gray-500">
                    {stat.subtitle}
                  </span>

                </div>


                {/* Progress */}

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8ebed]">

                  <div
                    className={`h-full rounded-full ${colors.bar}`}
                    style={{
                      width: `${stat.progress}%`,
                    }}
                  />

                </div>

              </div>
            );
          })}

        </section>


        {/* ====================================================
            FILTER BAR
        ==================================================== */}

        <section className="mb-6 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">

          <div className="flex flex-col gap-2 lg:flex-row">

            {/* Search */}

            <div className="flex h-10 flex-1 items-center rounded-lg bg-[#f0f2f4] px-3">

              <Search
                size={17}
                className="shrink-0 text-gray-500"
              />

              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search by ID (#NS-...) or title keyword..."
                className="ml-2 min-w-0 flex-1 bg-transparent text-xs text-gray-800 outline-none placeholder:text-gray-500"
              />

            </div>


            {/* Status */}

            <div className="relative">

              <button
                onClick={() =>
                  setShowStatusDropdown(
                    !showStatusDropdown
                  )
                }
                className="flex h-10 w-full min-w-[150px] items-center justify-between rounded-lg bg-[#f0f2f4] px-3 text-xs text-gray-800 lg:w-[150px]"
              >
                <span>
                  Status: {statusFilter}
                </span>

                <ChevronDown size={15} />
              </button>


              {showStatusDropdown && (
                <div className="absolute left-0 top-11 z-30 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">

                  {complaintFilters.statuses.map(
                    (status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setShowStatusDropdown(false);
                        }}
                        className="block w-full px-3 py-2.5 text-left text-xs hover:bg-gray-100"
                      >
                        {status}
                      </button>
                    )
                  )}

                </div>
              )}

            </div>


            {/* Category */}

            <div className="relative">

              <button
                onClick={() =>
                  setShowCategoryDropdown(
                    !showCategoryDropdown
                  )
                }
                className="flex h-10 w-full min-w-[150px] items-center justify-between rounded-lg bg-[#f0f2f4] px-3 text-xs text-gray-800 lg:w-[155px]"
              >
                <span>
                  Category: {categoryFilter}
                </span>

                <ChevronDown size={15} />
              </button>


              {showCategoryDropdown && (
                <div className="absolute left-0 top-11 z-30 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">

                  {complaintFilters.categories.map(
                    (category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setCategoryFilter(category);
                          setShowCategoryDropdown(false);
                        }}
                        className="block w-full px-3 py-2.5 text-left text-xs hover:bg-gray-100"
                      >
                        {category}
                      </button>
                    )
                  )}

                </div>
              )}

            </div>


            {/* Date */}

            <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#f0f2f4] px-4 text-xs text-gray-800">
              <CalendarDays size={15} />
              Date Range
            </button>


            {/* Filter */}

            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f0f2f4] text-gray-700">
              <SlidersHorizontal size={16} />
            </button>

          </div>

        </section>


        {/* ====================================================
            COMPLAINT TABLE
        ==================================================== */}

        <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">

          {/* Desktop Header */}

          <div className="hidden grid-cols-[2.4fr_1fr_1.2fr_1fr_1fr_110px] gap-4 bg-[#f1f3f5] px-5 py-4 text-[9px] font-bold tracking-wide text-gray-700 lg:grid">

            <span>COMPLAINT ID & ISSUE</span>

            <span>CATEGORY</span>

            <span>LOCATION</span>

            <span>SUBMISSION DATE</span>

            <span>STATUS</span>

            <span className="text-center">ACTION</span>

          </div>


          {/* Complaints */}

          {filteredComplaints.length > 0 ? (

            filteredComplaints.map(
              (complaint) => {

                const Icon =
                  complaintIcons[
                    complaint.icon
                  ];

                return (
                  <div
                    key={complaint.id}
                    className="border-b border-gray-100 last:border-b-0"
                  >

                    {/* Desktop */}

                    <div className="hidden grid-cols-[2.4fr_1fr_1.2fr_1fr_1fr_110px] items-center gap-4 px-5 py-4 lg:grid">

                      {/* Issue */}

                      <div className="flex min-w-0 items-start gap-2">

                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            complaint.statusType ===
                            "progress"
                              ? "bg-[#ffe0d5] text-[#b83205]"
                              : complaint.statusType ===
                                "verification"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-emerald-500"
                          }`}
                        >
                          <Icon size={14} />
                        </div>

                        <div className="min-w-0">

                          <div className="mb-1 text-[9px] font-bold text-[#b83205]">
                            #{complaint.id}
                          </div>

                          <h3 className="text-[15px] font-medium leading-5 text-gray-900">
                            {complaint.title}
                          </h3>

                          {complaint.description && (
                            <p
                              className={`mt-1 text-[10px] leading-4 ${
                                complaint.statusType ===
                                "resolved"
                                  ? "text-emerald-600"
                                  : "text-gray-600"
                              }`}
                            >
                              {complaint.description}
                            </p>
                          )}

                          <p className="mt-1 text-[10px] text-gray-600">
                            Department:{" "}
                            <span className="font-medium text-gray-800">
                              {complaint.department}
                            </span>
                          </p>

                        </div>

                      </div>


                      {/* Category */}

                      <div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] ${
                            complaint.statusType ===
                            "progress"
                              ? "bg-gray-100 text-gray-700"
                              : complaint.statusType ===
                                "verification"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              complaint.statusType ===
                              "progress"
                                ? "bg-[#ff5b27]"
                                : "bg-emerald-500"
                            }`}
                          />

                          {complaint.category}
                        </span>

                      </div>


                      {/* Location */}

                      <div className="flex items-start gap-1.5 text-[10px] leading-4 text-gray-800">

                        <MapPin
                          size={14}
                          className="mt-0.5 shrink-0 text-gray-500"
                        />

                        <span>
                          {complaint.location}
                        </span>

                      </div>


                      {/* Date */}

                      <div className="text-[10px] text-gray-700">
                        {complaint.submissionDate}
                      </div>


                      {/* Status */}

                      <StatusBadge
                        status={complaint.status}
                        type={complaint.statusType}
                      />


                      {/* Action */}

                      <ComplaintAction
                        complaint={complaint}
                        onView={handleViewDetails}
                        onVerify={handleVerifyFix}
                      />

                    </div>


                    {/* ==================================================
                        MOBILE CARD
                    ================================================== */}

                    <div className="p-4 lg:hidden">

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 gap-3">

                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                              complaint.statusType ===
                              "progress"
                                ? "bg-[#ffe0d5] text-[#b83205]"
                                : complaint.statusType ===
                                  "verification"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-emerald-500"
                            }`}
                          >
                            <Icon size={17} />
                          </div>

                          <div className="min-w-0">

                            <p className="text-[9px] font-bold text-[#b83205]">
                              #{complaint.id}
                            </p>

                            <h3 className="mt-1 text-sm font-semibold leading-5 text-gray-900">
                              {complaint.title}
                            </h3>

                          </div>

                        </div>

                        <StatusBadge
                          status={complaint.status}
                          type={complaint.statusType}
                        />

                      </div>


                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div>
                          <p className="text-[9px] font-bold text-gray-500">
                            CATEGORY
                          </p>

                          <p className="mt-1 text-xs">
                            {complaint.category}
                          </p>
                        </div>

                        <div>
                          <p className="text-[9px] font-bold text-gray-500">
                            DATE
                          </p>

                          <p className="mt-1 text-xs">
                            {complaint.submissionDate}
                          </p>
                        </div>

                        <div className="col-span-2">

                          <p className="text-[9px] font-bold text-gray-500">
                            LOCATION
                          </p>

                          <div className="mt-1 flex gap-1 text-xs">

                            <MapPin
                              size={13}
                              className="shrink-0 text-gray-500"
                            />

                            {complaint.location}

                          </div>

                        </div>

                      </div>


                      {complaint.description && (
                        <p
                          className={`mt-3 text-[10px] ${
                            complaint.statusType ===
                            "resolved"
                              ? "text-emerald-600"
                              : "text-gray-600"
                          }`}
                        >
                          {complaint.description}
                        </p>
                      )}


                      <div className="mt-4">

                        <ComplaintAction
                          complaint={complaint}
                          onView={handleViewDetails}
                          onVerify={handleVerifyFix}
                          mobile
                        />

                      </div>

                    </div>

                  </div>
                );
              }
            )

          ) : (

            /* Empty State */

            <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">

              <Search
                size={35}
                className="text-gray-400"
              />

              <h3 className="mt-3 text-sm font-semibold">
                No complaints found
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                Try changing your search or filters.
              </p>

            </div>

          )}


          {/* ==================================================
              TABLE FOOTER
          ================================================== */}

          <div className="flex flex-col gap-3 bg-[#f1f3f5] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">

            <span className="text-[10px] text-gray-600">
              Showing{" "}
              <strong>
                {filteredComplaints.length > 0
                  ? 1
                  : 0}
              </strong>{" "}
              to{" "}
              <strong>
                {filteredComplaints.length}
              </strong>{" "}
              of{" "}
              <strong>
                {filteredComplaints.length}
              </strong>{" "}
              complaints
            </span>


            <div className="flex items-center gap-1">

              <button
                disabled
                className="flex h-8 items-center gap-1 rounded-md bg-gray-200 px-3 text-[10px] text-gray-400"
              >
                <ChevronLeft size={13} />
                Previous
              </button>

              <button className="flex h-8 w-8 items-center justify-center rounded-md bg-[#102943] text-[10px] font-semibold text-white">
                1
              </button>

              <button
                disabled
                className="flex h-8 items-center gap-1 rounded-md bg-gray-200 px-3 text-[10px] text-gray-400"
              >
                Next
                <ChevronRight size={13} />
              </button>

            </div>

          </div>

        </section>


        {/* ====================================================
            ASSISTANCE
        ==================================================== */}

        <section className="mt-6 flex flex-col gap-4 rounded-xl border border-gray-100 bg-[#f1f3f5] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#ff5b27]">
              <CircleHelp size={22} />
            </div>

            <div>

              <h3 className="text-sm font-semibold text-gray-900">
                {pageContent.assistanceTitle}
              </h3>

              <p className="mt-1 text-[10px] text-gray-600">
                {pageContent.assistanceDescription}
              </p>

            </div>

          </div>


          <button className="flex h-9 items-center justify-center gap-2 rounded-lg bg-white px-5 text-[11px] font-semibold text-gray-800 shadow-sm">
            <CircleHelp size={15} />
            View FAQs
          </button>

        </section>

      </main>

    </div>
  );
}


// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({ status, type }) {
  const styles = {
    progress:
      "bg-[#ffdcd1] text-[#8e3217]",

    verification:
      "bg-[#cfe0ff] text-[#183c70]",

    resolved:
      "bg-[#e4e9e8] text-emerald-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-medium ${styles[type]}`}
    >
      {type === "progress" && (
        <span>↻</span>
      )}

      {type === "verification" && (
        <ShieldCheck size={11} />
      )}

      {type === "resolved" && (
        <CheckCircle2 size={11} />
      )}

      {status}
    </span>
  );
}


// ============================================================
// ACTION BUTTON
// ============================================================

function ComplaintAction({
  complaint,
  onView,
  onVerify,
  mobile = false,
}) {
  if (complaint.statusType === "verification") {
    return (
      <button
        onClick={() => onVerify(complaint)}
        className={`flex items-center justify-center gap-2 rounded-md bg-[#003d2e] px-4 py-2 text-[10px] font-semibold text-white transition hover:bg-[#002e23] ${
          mobile ? "w-full" : "w-full"
        }`}
      >
        <CheckCircle2 size={13} />
        Verify Fix
      </button>
    );
  }

  return (
    <button
      onClick={() => onView(complaint)}
      className={`flex items-center justify-center gap-2 rounded-md bg-[#e4e7e9] px-3 py-2 text-[10px] font-semibold text-gray-800 transition hover:bg-gray-300 ${
        mobile ? "w-full" : "w-full"
      }`}
    >
      <span>
        View
        <br className={!mobile ? "block" : "hidden"} />
        {!mobile && " Details"}
        {mobile && " Details"}
      </span>

      <ChevronRight size={14} />
    </button>
  );
}


export default MyComplaints;