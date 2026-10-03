import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  complaints,
  complaintWorklistFilters,
  complaintWorklistSummary,
} from "../data/complaintWorklistData";


import {
  FiSearch,
  FiChevronDown,
  FiDownload,
  FiMail,
  FiUsers,
  FiMapPin,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiCamera,
  FiTool,
  FiDroplet,
  FiZap,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiFilter,
  FiX,
  FiSend,
} from "react-icons/fi";

import {
  MdOutlineWaterDrop,
  MdOutlineDeleteSweep,
  MdOutlineElectricBolt,
  MdOutlineLocationOn,
} from "react-icons/md";


// --------------------------------------------------
// SMALL COMPONENTS
// --------------------------------------------------

const SeverityBadge = ({ type, children }) => {
  const styles = {
    high: "bg-red-100 text-red-600",
    critical: "bg-red-100 text-red-600",
    passed: "bg-emerald-100 text-emerald-700",
    routine: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold tracking-wide ${
        styles[type] || styles.routine
      }`}
    >
      {children}
    </span>
  );
};


const CategoryBadge = ({ type, children }) => {
  const icons = {
    water: <MdOutlineWaterDrop size={14} />,
    road: <FiTool size={13} />,
    waste: <MdOutlineDeleteSweep size={14} />,
    electric: <MdOutlineElectricBolt size={14} />,
  };

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
      {icons[type] || <FiFilter size={13} />}
      {children}
    </span>
  );
};


const SLAStatus = ({ type, children }) => {
  const styles = {
    critical: "bg-red-100 text-red-600",
    completed: "bg-gray-100 text-gray-600",
    normal: "bg-orange-100 text-orange-700",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold ${
        styles[type] || styles.normal
      }`}
    >
      {type === "completed" ? (
        <FiCheckCircle size={13} />
      ) : (
        <FiClock size={13} />
      )}

      {children}
    </span>
  );
};


// --------------------------------------------------
// COMPLAINT ROW
// --------------------------------------------------

const ComplaintRow = ({
  complaint,
  checked,
  onCheck,
}) => {
  return (
    <div
      className={`grid grid-cols-1 gap-5 border-b border-gray-200 px-4 py-5 transition hover:bg-gray-50 lg:grid-cols-[1.05fr_1.35fr_1.2fr_1.25fr_1.1fr] lg:items-center ${
        complaint.severityType === "critical"
          ? "bg-red-50/30"
          : ""
      }`}
    >

      {/* CHECKBOX + ID */}
      <div className="flex items-start gap-3">

        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheck(complaint.id)}
          className="mt-1 h-4 w-4 accent-[#ff6422]"
        />

        <div>

          <div className="flex items-center gap-2">

            <span className="font-bold text-[#07182d]">
              #{complaint.id}
            </span>

            {complaint.severityType === "critical" && (
              <FiAlertTriangle
                className="text-red-500"
                size={15}
              />
            )}

          </div>

          <p className="mt-1 text-xs text-gray-500">
            {complaint.date}
          </p>

          <SeverityBadge type={complaint.severityType}>
            {complaint.severity}
          </SeverityBadge>

        </div>

      </div>


      {/* CATEGORY */}
      <div>

        <h3 className="font-semibold text-[#07182d]">
          {complaint.title}
        </h3>

        <p className="mt-1 line-clamp-1 text-xs text-gray-500">
          {complaint.description}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2">

          <CategoryBadge type={complaint.categoryType}>
            {complaint.category}
          </CategoryBadge>

          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <FiCamera size={13} />
            {complaint.photos}
          </span>

        </div>

      </div>


      {/* CITIZEN */}
      <div>

        <div className="flex items-center gap-2">

          <p className="font-semibold text-[#07182d]">
            {complaint.citizen}
          </p>

          {complaint.verified && (
            <FiCheckCircle
              size={14}
              className="text-emerald-600"
            />
          )}

        </div>

        <p className="mt-1 truncate text-xs text-gray-500">
          {complaint.email}
        </p>

        <p className="text-xs text-gray-500">
          {complaint.phone}
        </p>

      </div>


      {/* LOCATION */}
      <div>

        <div className="flex items-start gap-1.5">

          <MdOutlineLocationOn
            size={18}
            className="mt-0.5 shrink-0 text-[#ff6422]"
          />

          <div>

            <p className="font-semibold text-[#07182d]">
              {complaint.ward}
            </p>

            <p className="text-xs text-gray-500">
              {complaint.location}
            </p>

            <p className="text-xs font-medium text-gray-500">
              {complaint.coordinates}
            </p>

          </div>

        </div>

      </div>


      {/* ASSIGNED UNIT + SLA */}
      <div>

        <div className="flex items-center gap-2">

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#07182d] text-[10px] font-bold text-white">
            {complaint.initials}
          </div>

          <div>

            <p className="font-semibold text-[#07182d]">
              {complaint.unit}
            </p>

            <p className="text-xs text-gray-500">
              {complaint.lead}
            </p>

          </div>

        </div>

        <div className="mt-3">
          <SLAStatus type={complaint.slaType}>
            {complaint.sla}
          </SLAStatus>
        </div>

      </div>

    </div>
  );
};


// --------------------------------------------------
// MAIN PAGE
// --------------------------------------------------

const ComplaintWorklist = () => {

  const [search, setSearch] = useState("");

  const [category, setCategory] =
    useState(complaintWorklistFilters.defaultCategory);

  const [status, setStatus] =
    useState(complaintWorklistFilters.statuses[0]);

  const [ward, setWard] =
    useState(complaintWorklistFilters.wards[0]);

  const [priority, setPriority] =
    useState(complaintWorklistFilters.priorities[0]);

  const [selected, setSelected] = useState(
    complaints
      .filter((item) => item.selected)
      .map((item) => item.id)
  );

  const [page, setPage] = useState(1);


  // --------------------------------------------------
  // FILTER
  // --------------------------------------------------

  const filteredComplaints = useMemo(() => {

    return complaints.filter((complaint) => {

      const searchValue = search.toLowerCase();

      const matchesSearch =
        !searchValue ||
        complaint.id.toLowerCase().includes(searchValue) ||
        complaint.citizen.toLowerCase().includes(searchValue) ||
        complaint.ward.toLowerCase().includes(searchValue) ||
        complaint.title.toLowerCase().includes(searchValue);

      const matchesCategory =
        category === "All Categories" ||
        complaint.categoryType === complaintWorklistFilters.categoryTypes[category];

      const matchesPriority =
        priority !== "Critical Only" ||
        complaint.severityType === "critical";

      return matchesSearch &&
        matchesCategory &&
        matchesPriority;
    });

  }, [search, category, priority]);


  // --------------------------------------------------
  // CHECKBOX HANDLERS
  // --------------------------------------------------

  const toggleComplaint = (id) => {

    setSelected((current) => {

      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      return [...current, id];
    });
  };


  const toggleAll = () => {

    if (
      selected.length === filteredComplaints.length
    ) {
      setSelected([]);
    } else {
      setSelected(
        filteredComplaints.map(
          (item) => item.id
        )
      );
    }
  };


  // --------------------------------------------------
  // EXPORT
  // --------------------------------------------------

  const exportCSV = () => {

    const header = [
      "Ticket ID",
      "Date",
      "Severity",
      "Category",
      "Citizen",
      "Ward",
      "Assigned Unit",
      "SLA",
    ];

    const rows = complaints.map((item) => [
      item.id,
      item.date,
      item.severity,
      item.category,
      item.citizen,
      item.ward,
      item.unit,
      item.sla,
    ]);

    const csv = [
      header,
      ...rows,
    ]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "nagriksetu-complaints.csv";

    link.click();

    URL.revokeObjectURL(url);
  };


  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#07182d]">

      {/* PAGE HEADER */}
      <section className="border-b border-gray-100 bg-[#f5f7f9]">

        <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8">

          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-end">

            <div>

              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] font-bold tracking-wider">

                <span className="rounded-full bg-[#07182d] px-3 py-1.5 text-white">
                  STATUTORY JURISDICTION TIER-1
                </span>

                <span className="text-orange-500">
                  ●
                </span>

                <span className="text-gray-500">
                  WARD REGISTRY SYNC: LIVE
                </span>

              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-end">

                <h1 className="text-3xl font-bold leading-tight md:text-4xl">
                  Complaints Worklist & Resolution Audit
                </h1>

                <span className="hidden pb-1 text-sm text-gray-500 md:block">
                  | {complaintWorklistSummary.session}
                </span>

              </div>

            </div>


            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

              <SummaryCard
                icon={<FiAlertTriangle />}
                value={complaintWorklistSummary.criticalSla}
                label="CRITICAL SLA"
                iconClass="bg-red-100 text-red-600"
              />

              <SummaryCard
                icon={<FiCamera />}
                value={complaintWorklistSummary.fieldActive}
                label="FIELD ACTIVE"
                iconClass="bg-orange-100 text-orange-600"
              />

              <SummaryCard
                icon={<FiCheckCircle />}
                value={complaintWorklistSummary.auditedToday}
                label="AUDITED TODAY"
                iconClass="bg-emerald-100 text-emerald-700"
              />

            </div>

          </div>

        </div>

      </section>


      {/* MAIN */}
      <main className="mx-auto max-w-[1400px] px-5 py-7 md:px-8">


        {/* FILTER PANEL */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">

            {/* SEARCH */}
            <div className="relative lg:col-span-2">

              <FiSearch
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
              />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search Ticket ID (#NS-...), Citizen, or Sector..."
                className="h-12 w-full rounded-lg bg-[#f1f3f5] pl-11 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-orange-200"
              />

            </div>


            <FilterSelect
              value={category}
              onChange={setCategory}
              options={complaintWorklistFilters.categories}
            />

            <FilterSelect
              value={status}
              onChange={setStatus}
              options={complaintWorklistFilters.statuses}
            />

            <FilterSelect
              value={ward}
              onChange={setWard}
              options={complaintWorklistFilters.wards}
            />

          </div>


          {/* SECOND FILTER ROW */}
          <div className="mt-4 flex flex-col justify-between gap-4 border-t border-gray-100 pt-4 xl:flex-row xl:items-center">

            <div className="flex flex-wrap items-center gap-3">

              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">

                <input
                  type="checkbox"
                  checked={
                    filteredComplaints.length > 0 &&
                    selected.length ===
                      filteredComplaints.length
                  }
                  onChange={toggleAll}
                  className="h-4 w-4 accent-[#ff6422]"
                />

                Select All (
                {selected.length} Tickets Selected)

              </label>

              <span className="hidden h-5 w-px bg-gray-300 sm:block" />

              <span className="text-sm text-gray-500">
                Showing{" "}
                <strong className="text-gray-700">
                  {filteredComplaints.length}
                </strong>{" "}
                of {complaintWorklistSummary.totalActiveDockets} active dockets
              </span>

            </div>


            {/* ACTIONS */}
            <div className="flex flex-wrap gap-2">

              <ActionButton
                icon={<FiUsers />}
                text="Bulk Assign Department"
              />

              <ActionButton
                icon={<FiMail />}
                text="Send Citizen Email Batch"
              />

              <button
                onClick={exportCSV}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e9edef] px-4 text-sm font-semibold text-[#07182d] transition hover:bg-gray-200"
              >
                <FiDownload size={16} />
                Export CSV
              </button>

            </div>

          </div>

        </section>


        {/* WORKLIST */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

          {/* TABLE HEADER */}
          <div className="hidden grid-cols-[1.05fr_1.35fr_1.2fr_1.25fr_1.1fr] gap-5 bg-[#f0f2f4] px-4 py-4 text-[11px] font-bold uppercase tracking-wide text-gray-600 lg:grid">

            <span>
              Ticket ID & Timeline
            </span>

            <span>
              Category & Grievance Summary
            </span>

            <span>
              Citizen & Contact
            </span>

            <span>
              Ward & GPS Location
            </span>

            <span>
              Assigned Unit / SLA Status
            </span>

          </div>


          {/* ROWS */}
          {filteredComplaints.length > 0 ? (

            filteredComplaints.map((complaint) => (

              <ComplaintRow
                key={complaint.id}
                complaint={complaint}
                checked={selected.includes(
                  complaint.id
                )}
                onCheck={toggleComplaint}
              />

            ))

          ) : (

            <div className="flex min-h-[250px] flex-col items-center justify-center px-5 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
                <FiSearch
                  size={24}
                  className="text-gray-400"
                />
              </div>

              <h3 className="mt-4 font-semibold">
                No complaints found
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filters.
              </p>

            </div>

          )}


          {/* AUDIT + PAGINATION */}
          <div className="flex flex-col justify-between gap-4 bg-[#f1f3f5] px-4 py-4 text-xs md:flex-row md:items-center">

            <div className="flex items-center gap-2 text-gray-600">

              <span className="h-2 w-2 rounded-full bg-orange-500" />

              Statutory Audit Logs cryptographic signature:

              <span className="rounded bg-white px-2 py-1 font-mono text-[10px]">
                {complaintWorklistSummary.auditSignature}
              </span>

            </div>


            <div className="flex items-center gap-1">

              <PaginationButton
                icon={<FiChevronLeft />}
                disabled={page === 1}
                onClick={() =>
                  setPage(
                    Math.max(1, page - 1)
                  )
                }
              />

              {complaintWorklistSummary.visiblePages.map((number) => (

                <PaginationButton
                  key={number}
                  text={number}
                  active={page === number}
                  onClick={() =>
                    setPage(number)
                  }
                />

              ))}

              <span className="px-2 text-gray-400">
                ...
              </span>

              <PaginationButton
                text={String(complaintWorklistSummary.totalPages)}
                active={page === complaintWorklistSummary.totalPages}
                onClick={() =>
                  setPage(complaintWorklistSummary.totalPages)
                }
              />

              <PaginationButton
                icon={<FiChevronRight />}
                onClick={() =>
                  setPage(
                    Math.min(complaintWorklistSummary.totalPages, page + 1)
                  )
                }
              />

            </div>

          </div>

        </section>


        {/* BULK ACTION INFO */}
        {selected.length > 0 && (

          <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-32px)] max-w-xl -translate-x-1/2 items-center justify-between gap-4 rounded-xl bg-[#07182d] px-5 py-4 text-white shadow-2xl">

            <div>

              <p className="text-sm font-semibold">
                {selected.length} complaint
                {selected.length > 1 ? "s" : ""} selected
              </p>

              <p className="text-xs text-gray-300">
                Ready for bulk action.
              </p>

            </div>

            <div className="flex gap-2">

              <button
                onClick={() => setSelected([])}
                className="rounded-lg px-3 py-2 text-xs font-semibold hover:bg-white/10"
              >
                <FiX />
              </button>

              <button
                className="inline-flex items-center gap-2 rounded-lg bg-[#ff6422] px-4 py-2 text-xs font-bold hover:bg-[#e95417]"
              >
                <FiSend />
                Process Selected
              </button>

            </div>

          </div>

        )}

      </main>


    </div>
  );
};


// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

const SummaryCard = ({
  icon,
  value,
  label,
  iconClass,
}) => {

  return (
    <div className="flex min-w-[145px] items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">

      <div
        className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}
      >
        {icon}
      </div>

      <div>

        <p className="text-xl font-bold leading-none">
          {value}
        </p>

        <p className="mt-1 text-[10px] font-bold tracking-wider text-gray-500">
          {label}
        </p>

      </div>

    </div>
  );
};


// --------------------------------------------------
// FILTER SELECT
// --------------------------------------------------

const FilterSelect = ({
  value,
  onChange,
  options,
}) => {

  return (
    <div className="relative">

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="h-12 w-full appearance-none rounded-lg bg-[#f1f3f5] px-4 pr-10 text-sm font-medium text-gray-700 outline-none transition focus:ring-2 focus:ring-orange-200"
      >

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}

      </select>

      <FiChevronDown
        size={17}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
      />

    </div>
  );
};


// --------------------------------------------------
// ACTION BUTTON
// --------------------------------------------------

const ActionButton = ({
  icon,
  text,
}) => {

  return (
    <button
      type="button"
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e9edef] px-4 text-sm font-semibold text-[#07182d] transition hover:bg-gray-200"
    >
      {icon}
      {text}
    </button>
  );
};


// --------------------------------------------------
// PAGINATION
// --------------------------------------------------

const PaginationButton = ({
  icon,
  text,
  active,
  disabled,
  onClick,
}) => {

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
        active
          ? "bg-white text-[#07182d] shadow-sm"
          : "text-gray-500 hover:bg-white"
      } ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : ""
      }`}
    >
      {icon || text}
    </button>
  );
};


export default ComplaintWorklist;