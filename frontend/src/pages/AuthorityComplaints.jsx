import { useMemo, useState } from "react";
import { Download, MapPin, RefreshCw, Search, SlidersHorizontal, ArrowDownUp } from "lucide-react";
import AuthorityWorkspaceLayout from "../components/common/AuthorityWorkspaceLayout";
import { authorityComplaints, complaintDateRanges, complaintPriorities, complaintStatuses } from "../data/authorityComplaintsData";

const allOption = (values, label) => [label, ...new Set(values)];

export default function AuthorityComplaints() {
  const departments = allOption(authorityComplaints.map((item) => item.department), "All Departments");
  const areas = allOption(authorityComplaints.map((item) => item.area), "All Areas");
  const officers = allOption(authorityComplaints.map((item) => item.officer), "All Officers");
  const categories = allOption(authorityComplaints.map((item) => item.category), "All Categories");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(complaintStatuses[0]);
  const [category, setCategory] = useState(categories[0]);
  const [priority, setPriority] = useState(complaintPriorities[0]);
  const [department, setDepartment] = useState(departments[0]);
  const [area, setArea] = useState(areas[0]);
  const [officer, setOfficer] = useState(officers[0]);
  const [dateRange, setDateRange] = useState(complaintDateRanges[0]);
  const [sort, setSort] = useState("Newest First");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = authorityComplaints.filter((complaint) => (
      (!query || [complaint.id, complaint.title, complaint.category, complaint.location, complaint.officer].some((field) => field.toLowerCase().includes(query))) &&
      (status === "All Statuses" || complaint.status === status) &&
      (category === "All Categories" || complaint.category === category) &&
      (priority === "All Priorities" || complaint.priority === priority) &&
      (department === "All Departments" || complaint.department === department) &&
      (area === "All Areas" || complaint.area === area) &&
      (officer === "All Officers" || complaint.officer === officer)
    ));
    return result.sort((left, right) => sort === "Newest First" ? right.id.localeCompare(left.id) : left.id.localeCompare(right.id));
  }, [search, status, category, priority, department, area, officer, sort]);

  const resetFilters = () => {
    setSearch("");
    setStatus(complaintStatuses[0]);
    setCategory(categories[0]);
    setPriority(complaintPriorities[0]);
    setDepartment(departments[0]);
    setArea(areas[0]);
    setOfficer(officers[0]);
    setDateRange(complaintDateRanges[0]);
  };

  const exportCsv = () => {
    const headers = ["Complaint ID", "Issue", "Category", "Location", "Date", "Priority", "Status", "Department", "Assigned Officer"];
    const csv = [headers, ...filtered.map((item) => [item.id, item.title, item.category, item.location, item.date, item.priority, item.status, item.department, item.officer])]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "authority-complaints.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AuthorityWorkspaceLayout activeSection="complaints" title="All Complaints">
      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
        <div className="mb-5">
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">All Complaints</h1>
          <p className="mt-1 text-xs text-slate-600">Review, filter and manage reported civic issues.</p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <label className="relative sm:col-span-2 xl:col-span-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search complaint ID, citizen, keyword..." className="h-9 w-full rounded-md border border-slate-200 pl-8 pr-3 text-[10px] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
            </label>
            <FilterSelect label="Status" value={status} options={complaintStatuses} onChange={setStatus} />
            <FilterSelect label="Category" value={category} options={categories} onChange={setCategory} />
            <FilterSelect label="Priority" value={priority} options={complaintPriorities} onChange={setPriority} />
            <FilterSelect label="Department" value={department} options={departments} onChange={setDepartment} />
            <FilterSelect label="Area" value={area} options={areas} onChange={setArea} />
            <FilterSelect label="Assigned Officer" value={officer} options={officers} onChange={setOfficer} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
              <span className="font-semibold">Timeline:</span>
              <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Date range" className="h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[10px] outline-none focus:border-orange-400">
                {complaintDateRanges.map((range) => <option key={range}>{range}</option>)}
              </select>
              <span className="text-slate-500">{dateRange === "All Time" ? "All submitted dates" : dateRange === "Last 7 Days" ? "Since 17 Oct 2025" : "Since 24 Sep 2025"}</span>
            </div>
            <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100"><RefreshCw size={13} />Reset Filters</button>
          </div>
        </section>

        <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-slate-700">Showing <strong>{filtered.length}</strong> complaints</p>
          <div className="flex items-center gap-2">
            <label className="relative">
              <span className="sr-only">Sort complaints</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-9 appearance-none rounded-md border border-slate-200 bg-white py-2 pl-3 pr-8 text-[10px] text-slate-700 outline-none focus:border-orange-400">
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
              <ArrowDownUp size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </label>
            <button type="button" onClick={exportCsv} className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-50"><Download size={14} />Export CSV</button>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="hidden grid-cols-[1fr_2fr_1.25fr_1.6fr_0.9fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[8px] font-bold uppercase tracking-wide text-slate-500 lg:grid xl:px-5">
            <span>Complaint ID</span><span>Issue</span><span>Category</span><span>Location</span><span>Date</span><span>Priority</span>
          </div>
          {filtered.length ? filtered.map((complaint) => (
            <article key={complaint.id} className="grid gap-2 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50/70 lg:grid-cols-[1fr_2fr_1.25fr_1.6fr_0.9fr_0.8fr] lg:items-center lg:gap-3 xl:px-5">
              <div className="flex items-center justify-between gap-3 lg:block">
                <span className="font-mono text-[9px] font-bold text-slate-900">#{complaint.id}</span>
                <PriorityBadge priority={complaint.priority} mobileOnly />
              </div>
              <div className="min-w-0"><h2 className="truncate text-[11px] font-semibold text-slate-900">{complaint.title}</h2><p className="mt-0.5 text-[9px] text-slate-500 lg:hidden">{complaint.status} · {complaint.department}</p></div>
              <div><span className="rounded bg-slate-100 px-2 py-1 text-[9px] text-slate-700">{complaint.category}</span></div>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-600"><MapPin size={12} className="shrink-0 text-slate-400" />{complaint.location}</div>
              <span className="text-[9px] text-slate-600">{complaint.date}</span>
              <PriorityBadge priority={complaint.priority} desktopOnly />
            </article>
          )) : (
            <div className="px-5 py-14 text-center"><SlidersHorizontal size={24} className="mx-auto text-slate-400" /><h2 className="mt-3 text-sm font-semibold text-slate-800">No complaints match these filters</h2><p className="mt-1 text-xs text-slate-500">Try adjusting your search or filter selections.</p></div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3 text-[9px] text-slate-500 sm:px-5">
            <span>Showing {filtered.length ? 1 : 0} to {filtered.length} of {filtered.length} complaints</span>
            <div className="flex items-center gap-1"><button disabled className="rounded border border-slate-200 px-2.5 py-1.5 disabled:opacity-40">‹ Previous</button><button className="rounded bg-slate-900 px-2.5 py-1.5 font-semibold text-white">1</button><button disabled className="rounded border border-slate-200 px-2.5 py-1.5 disabled:opacity-40">Next ›</button></div>
          </div>
        </section>
      </main>
    </AuthorityWorkspaceLayout>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-7 text-[10px] text-slate-700 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <SlidersHorizontal size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </label>
  );
}

function PriorityBadge({ priority, mobileOnly = false, desktopOnly = false }) {
  const color = {
    Critical: "border-red-200 bg-red-50 text-red-700",
    High: "border-amber-200 bg-amber-50 text-amber-700",
    Medium: "border-blue-200 bg-blue-50 text-blue-700",
    Low: "border-slate-200 bg-slate-100 text-slate-600",
  }[priority];
  return <span className={`${mobileOnly ? "lg:hidden" : ""} ${desktopOnly ? "hidden lg:inline-flex" : ""} inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-medium ${color}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{priority}</span>;
}