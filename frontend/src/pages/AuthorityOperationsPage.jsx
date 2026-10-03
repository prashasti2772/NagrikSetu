import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownToLine, ArrowRight, Bell, Building2,
  CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, Download, FileCheck2,
  Filter, Flag, MapPin, RefreshCw, Search, ShieldCheck, SlidersHorizontal,
  UserRound, Users, Wrench, Zap, Droplets, Trash2, X,
} from "lucide-react";
import AuthorityWorkspaceLayout from "../components/common/AuthorityWorkspaceLayout";
import {
  analyticsData,
  assignmentHistory,
  authorityNotifications,
  citizenFeedback,
  departments,
  dispatchCases,
  dispatchOfficers,
  routingRules,
  verificationCase,
  officers as officerRecords,
} from "../data/authorityOperationsData";

const pageTitles = {
  assignments: "Assignment & Routing",
  verification: "Verification",
  analytics: "Analytics & Reports",
  officers: "Officers",
  departments: "Departments",
  notifications: "Notifications",
  settings: "Settings",
};

export default function AuthorityOperationsPage({ page }) {
  return (
    <AuthorityWorkspaceLayout activeSection={page} title={pageTitles[page]}>
      {page === "assignments" && <AssignmentsPage />}
      {page === "verification" && <VerificationPage />}
      {page === "analytics" && <AnalyticsPage />}
      {page === "officers" && <OfficersPage />}
      {page === "departments" && <DepartmentsPage />}
      {page === "notifications" && <AuthorityNotificationsPage />}
      {page === "settings" && <SettingsPage />}
    </AuthorityWorkspaceLayout>
  );
}

function PageFrame({ eyebrow, title, description, actions, children }) {
  return (
    <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
      {(title || eyebrow) && (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            {eyebrow && <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-orange-700">{eyebrow}</p>}
            {title && <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>}
            {description && <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-600 sm:text-xs">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </main>
  );
}

function AssignmentsPage() {
  const [selected, setSelected] = useState(dispatchCases[0]);
  const [selectedOfficer, setSelectedOfficer] = useState(dispatchOfficers[0].name);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("All Departments (4)");
  const [priority, setPriority] = useState("All Priorities");
  const visibleCases = dispatchCases.filter((item) =>
    `${item.id} ${item.title} ${item.location}`.toLowerCase().includes(query.toLowerCase()) &&
    (priority === "All Priorities" || item.priority.startsWith(priority)) &&
    (department === "All Departments (4)" || item.category.includes(department))
  );

  return (
    <PageFrame
      eyebrow="Dispatch Operations Active · Ward 14 Regional Switchboard"
      title="Assignment & Routing"
      description="Triage incoming civic grievances, verify jurisdictional priority, and dispatch accountable zonal officers."
      actions={<div className="flex gap-2"><MetricChip icon={<AlertTriangle size={14} />} value="4" label="Pending Triage" /><MetricChip icon={<Clock3 size={14} />} value="18m" label="Avg Assignment SLA" /></div>}
    >
      <section className="mb-5 grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_0.8fr_auto]">
        <label className="relative"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search grievance ID, location..." className="h-9 w-full rounded-md bg-slate-100 pl-8 pr-3 text-[10px] outline-none focus:ring-2 focus:ring-orange-100" /></label>
        <SelectControl label="Department" value={department} onChange={setDepartment} options={["All Departments (4)", "Water Supply", "Roads", "Sanitation", "Electrical"]} />
        <SelectControl label="Priority" value={priority} onChange={setPriority} options={["All Priorities", "Critical", "High", "Medium", "Low"]} />
        <button type="button" onClick={() => { setQuery(""); setDepartment("All Departments (4)"); setPriority("All Priorities"); }} className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-slate-100 px-3 text-[10px] font-semibold text-slate-700 hover:bg-slate-200"><RefreshCw size={12} />Reset</button>
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.8fr)]">
        <section>
          <div className="mb-2 flex items-center justify-between"><h2 className="text-xs font-bold text-slate-900">Complaints Requiring Assignment</h2><span className="rounded-full bg-orange-100 px-2 py-1 text-[8px] font-bold text-orange-800">{visibleCases.length} IN PIPELINE</span></div>
          <div className="space-y-2">
            {visibleCases.map((item) => (
              <button key={item.id} type="button" onClick={() => { setSelected(item); setNotice(""); }} className={`w-full rounded-lg border-l-[3px] bg-white p-3 text-left shadow-sm transition hover:shadow ${selected.id === item.id ? "border-l-orange-600 ring-1 ring-orange-100" : "border-l-transparent border border-slate-100"}`}>
                <div className="flex flex-wrap items-center gap-1.5"><span className="font-mono text-[9px] font-bold text-slate-900">#{item.id}</span><PriorityBadge priority={item.priority.replace(" Priority", "")} /><span className="rounded bg-slate-100 px-2 py-1 text-[8px] text-slate-700">{item.category}</span><span className="ml-auto text-[8px] text-slate-500">{item.time}</span></div>
                <h3 className="mt-2 text-[11px] font-bold text-slate-900">{item.title}</h3><p className="mt-1 text-[9px] leading-4 text-slate-600">{item.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] text-slate-500"><span className="inline-flex items-center gap-1"><MapPin size={11} />{item.location}</span><span>{item.photos} Photos Attached</span><span className="font-semibold text-orange-700">Select to Assign →</span></div>
              </button>
            ))}
            {!visibleCases.length && <EmptyState title="No dispatch cases match" description="Adjust the current search or filters." />}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2"><div><p className="text-[8px] font-bold uppercase tracking-wide text-orange-700">Triage Dossier</p><h2 className="mt-1 text-sm font-bold text-slate-900">Assign Selected: #{selected.id}</h2></div><PriorityBadge priority={selected.priority.replace(" Priority", "")} /></div>
          <label className="mt-4 block text-[9px] font-semibold text-slate-700">Competent Department / Agency<SelectControl compact label="Department" value={selected.category} onChange={() => {}} options={[selected.category, "Roads & Bridges", "Water Supply", "Sanitation", "Electrical"]} /></label>
          <div className="mt-4 flex items-center justify-between"><h3 className="text-[10px] font-bold text-slate-800">Designated Sub-Divisional Officer</h3><span className="text-[8px] font-bold text-slate-500">3 Zonal Engineers On-Duty</span></div>
          <div className="mt-2 space-y-2">{dispatchOfficers.map((officer) => <button key={officer.name} type="button" onClick={() => setSelectedOfficer(officer.name)} className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${selectedOfficer === officer.name ? "bg-orange-50 ring-1 ring-orange-200" : "bg-slate-50 hover:bg-slate-100"}`}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[8px] font-bold text-white">{officer.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-[9px] font-semibold text-slate-900">{officer.name}</span><span className="block truncate text-[8px] text-slate-500">{officer.role}</span></span><span className={`rounded-full px-2 py-1 text-[7px] font-bold ${officer.status === "Available" ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>{officer.status}</span></button>)}</div>
          <div className="mt-4 rounded-lg bg-slate-100 p-3"><p className="text-[8px] font-bold uppercase text-slate-700">Dispatch SLA Level</p><div className="mt-2 grid grid-cols-3 gap-1"><span className="rounded bg-red-100 p-2 text-center text-[8px] font-semibold text-red-800">Critical<br />&lt; 2h</span><span className="rounded bg-white p-2 text-center text-[8px] text-slate-600">High<br />24h SLA</span><span className="rounded bg-white p-2 text-center text-[8px] text-slate-600">Standard<br />48h SLA</span></div></div>
          <label className="mt-3 block text-[8px] font-bold uppercase text-slate-700">Executive Dispatch Order / Technical Notes<textarea defaultValue="Inspect pole #42 line immediately, cut feeder section 3-B, and replace damaged junction wire before market peak hours." rows={3} className="mt-1.5 w-full resize-y rounded-md border border-slate-200 bg-slate-50 p-2 text-[9px] font-normal normal-case leading-4 text-slate-700 outline-none focus:border-orange-400" /></label>
          {notice && <p role="status" className="mt-2 text-[9px] font-semibold text-emerald-700">{notice}</p>}
          <button type="button" onClick={() => setNotice(`Assigned ${selected.id} to ${selectedOfficer}.`)} className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-orange-700 text-[10px] font-bold text-white hover:bg-orange-800"><Check size={13} />Confirm &amp; Assign Officer</button>
          <div className="mt-2 grid grid-cols-2 gap-2"><button type="button" onClick={() => setNotice(`${selected.id} marked as possible duplicate.`)} className="rounded-md bg-slate-100 py-2 text-[9px] font-semibold text-slate-700 hover:bg-slate-200">Mark Duplicate</button><button type="button" onClick={() => setNotice(`${selected.id} queued for ward rerouting.`)} className="rounded-md bg-slate-100 py-2 text-[9px] font-semibold text-slate-700 hover:bg-slate-200">Re-route Ward</button></div>
        </section>
      </div>

      <AssignmentsTable />
    </PageFrame>
  );
}

function AssignmentsTable() {
  return <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between px-4 py-3"><div><h2 className="text-xs font-bold text-slate-900">Recent Assignments Log</h2><p className="text-[9px] text-slate-500">Live audit ledger of assignments executed during this shift.</p></div><button type="button" className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-2 text-[9px] font-semibold text-slate-700"><Download size={12} />Export Shift Report</button></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[8px] font-bold uppercase text-slate-500"><tr>{["Grievance ID", "Category / Nature", "Assigned Department", "Assigned Officer", "Priority SLA", "Dispatched Time"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{assignmentHistory.map((entry) => <tr key={entry.id} className="text-[9px] text-slate-700"><td className="px-3 py-2 font-mono font-semibold">#{entry.id}</td><td className="px-3 py-2">{entry.issue}<span className="block text-[8px] text-slate-500">{entry.area}</span></td><td className="px-3 py-2">{entry.department}</td><td className="px-3 py-2">{entry.officer}</td><td className="px-3 py-2">{entry.priority}</td><td className="px-3 py-2">{entry.time}</td></tr>)}</tbody></table></div></section>;
}

function VerificationPage() {
  const [filter, setFilter] = useState("Reopened by Citizen (7)");
  const [decision, setDecision] = useState("Reassign Complaint");
  const [message, setMessage] = useState("");
  return <PageFrame eyebrow="Priority Review Case" title={`Case Dossier #${verificationCase.id}`} description={`${verificationCase.area} • ${verificationCase.department}`}>
    <div className="mb-3 flex flex-wrap gap-2">{["All Verifications (25)", "Awaiting Citizen Response (18)", "Reopened by Citizen (7)"].map((tab) => <button key={tab} type="button" onClick={() => setFilter(tab)} className={`rounded-full px-3 py-2 text-[9px] font-semibold ${filter === tab ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>{tab}</button>)}</div>
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[8px] font-bold uppercase tracking-wide text-orange-700">{verificationCase.priority}</p><h2 className="mt-1 text-sm font-bold text-slate-900">{verificationCase.title}</h2><p className="text-[9px] text-slate-500">{verificationCase.complaint}</p></div><span className="rounded-full bg-red-100 px-3 py-1.5 text-[8px] font-bold text-red-700">Action Required</span></div>
      <div className="mt-4 flex gap-3 rounded-lg bg-red-50 p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-red-100 text-red-700"><Flag size={15} /></span><div><p className="text-[10px] font-semibold text-slate-900">Citizen marked resolution as unsatisfactory</p><p className="mt-0.5 text-[9px] italic text-slate-600">“{verificationCase.citizenNote}”</p></div></div>
      <div className="mt-5 grid gap-2 md:grid-cols-3">{["Reassign Complaint", "Schedule Joint Site Visit", "Provide Clarification & Close"].map((option) => <label key={option} className={`flex cursor-pointer gap-2 rounded-lg border p-3 text-[9px] ${decision === option ? "border-orange-300 bg-orange-50" : "border-slate-200"}`}><input type="radio" name="decision" checked={decision === option} onChange={() => setDecision(option)} className="accent-orange-600" /><span><strong className="block text-slate-800">{option}</strong><span className="text-slate-500">{option === "Reassign Complaint" ? "Reject sign-off and order contractor hot-mix rework." : option === "Schedule Joint Site Visit" ? "Schedule executive engineer and complainant meeting." : "Issue an explanation and close the docket with supporting evidence."}</span></span></label>)}</div>
      <label className="mt-4 block text-[9px] font-semibold text-slate-800">Technical Remarks <span className="font-normal text-slate-500">Visible to PWD Executive Engineer</span><textarea rows={3} defaultValue={verificationCase.technicalRemarks} className="mt-1.5 w-full rounded-md border border-slate-200 p-3 text-[10px] font-normal leading-4 outline-none focus:border-orange-400" /></label>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3"><span className="text-[8px] text-slate-500"><ShieldCheck size={12} className="mr-1 inline" />Logged under Authority ID: #AUTH-WARD14-RAJIV</span><div className="flex gap-2"><button type="button" className="rounded-md border border-slate-200 px-3 py-2 text-[9px] font-semibold text-slate-700">Contact Citizen</button><button type="button" onClick={() => setMessage(`${decision} submitted for ${verificationCase.id}.`)} className="rounded-md bg-orange-700 px-3 py-2 text-[9px] font-bold text-white">{decision === "Reassign Complaint" ? "Reopen & Reassign Complaint" : decision}</button></div></div>{message && <p role="status" className="mt-2 text-right text-[9px] font-semibold text-emerald-700">{message}</p>}
    </section>
    <FeedbackTable />
  </PageFrame>;
}

function FeedbackTable() {
  return <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="px-4 py-3"><h2 className="text-xs font-bold text-slate-900">Recent Citizen Feedback Queue</h2><p className="text-[9px] text-slate-500">Review resolved dockets submitted for citizen validation.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[8px] font-bold uppercase text-slate-500"><tr>{["Complaint ID", "Issue Details", "Department", "Resolved Date", "Citizen Action", "Citizen Rating"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{citizenFeedback.map((item) => <tr key={item.id} className="text-[9px] text-slate-700"><td className="px-3 py-2 font-mono font-semibold">#{item.id}</td><td className="px-3 py-2">{item.issue}<span className="block text-[8px] text-slate-500">{item.detail}</span></td><td className="px-3 py-2">{item.department}</td><td className="px-3 py-2">{item.date}</td><td className="px-3 py-2">{item.action}</td><td className="px-3 py-2 font-semibold">{item.rating}</td></tr>)}</tbody></table></div></section>;
}

function AnalyticsPage() {
  const [range, setRange] = useState("Last 30 Days");
  return <PageFrame title="Analytics & Reports" actions={<button type="button" className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-[9px] font-semibold text-white"><Download size={13} />Export CSV Report</button>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"> <div className="flex gap-1 rounded-lg bg-slate-100 p-1">{["Last 7 Days", "Last 30 Days", "Last 3 Months", "Year to Date"].map((item) => <button key={item} onClick={() => setRange(item)} className={`rounded-md px-3 py-1.5 text-[8px] font-semibold ${range === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{item}</button>)}</div><select aria-label="Department filter" className="h-8 rounded-md border border-slate-200 bg-white px-3 text-[9px]"><option>All Departments</option>{analyticsData.departments.map((item) => <option key={item.name}>{item.name}</option>)}</select></div>
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]"><section className="rounded-xl border border-slate-200 bg-white p-4"><div className="mb-5"><h2 className="text-xs font-bold text-slate-900">Complaint Volume &amp; Resolution Trend</h2><p className="text-[9px] text-slate-500">Weekly intake vs verified resolutions · {range.toLowerCase()}</p></div><div className="flex h-48 items-end justify-around gap-4 border-b border-slate-200 px-2">{analyticsData.weeks.map((week, index) => <div key={week} className="flex h-full flex-1 items-end justify-center gap-1"> <div className="relative w-5 rounded-t bg-slate-800" style={{ height: `${analyticsData.received[index]}%` }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-500">{analyticsData.received[index]}</span></div><div className="relative w-5 rounded-t bg-emerald-600" style={{ height: `${analyticsData.resolved[index]}%` }}><span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] text-slate-500">{analyticsData.resolved[index]}</span></div><span className="absolute translate-y-6 text-[8px] text-slate-500">{week}</span></div>)}</div><div className="mt-8 flex justify-center gap-4 text-[8px]"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-800" />Received</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-600" />Resolved</span></div></section>
      <section className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between"><div><h2 className="text-xs font-bold text-slate-900">Complaints by Category</h2><p className="text-[9px] text-slate-500">Proportional distribution by domain</p></div><span className="text-[8px] font-bold text-slate-500">348 TOTAL</span></div><div className="mt-5 space-y-4">{analyticsData.categories.map((item) => <div key={item.name}><div className="mb-1 flex justify-between gap-2 text-[9px]"><span className="font-semibold text-slate-700">{item.name}</span><span className="whitespace-nowrap text-slate-500">{item.count} complaints · {item.percent}%</span></div><div className="h-1.5 rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percent}%` }} /></div></div>)}</div></section></div>
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white"><div className="px-4 py-3"><h2 className="text-xs font-bold text-slate-900">Department Performance Summary</h2><p className="text-[9px] text-slate-500">Operational throughput and citizen validation breakdown.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left"><thead className="bg-slate-50 text-[8px] font-bold uppercase text-slate-500"><tr>{["Department", "Complaints", "Reopened", "Resolved", "Citizen Rating"].map((heading) => <th key={heading} className="px-4 py-2">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{analyticsData.departments.map((item) => <tr key={item.name} className="text-[9px] text-slate-700"><td className="px-4 py-3 font-semibold">{item.name}<span className="block font-normal text-slate-500">{item.subtitle}</span></td><td className="px-4 py-3">{item.complaints}</td><td className="px-4 py-3 text-orange-700">{item.reopened}</td><td className="px-4 py-3 text-emerald-700">{item.resolved}</td><td className="px-4 py-3">★ {item.citizenRating} / 5.0</td></tr>)}</tbody></table></div></section>
  </PageFrame>;
}

function DepartmentsPage() {
  return <PageFrame eyebrow="Operational Registry" title="Departments" description="Overview of civic departments, operational heads, and complaint distribution across jurisdictional wards." actions={<div className="flex gap-2"><MetricChip value="48" label="Units" /><MetricChip value="24" label="Field Personnel Active" /><button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-[9px] font-semibold text-white">Register Desk</button></div>}>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{departments.map((department) => <DepartmentPanel key={department.name} department={department} />)}</div>
    <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between px-4 py-3"><div><h2 className="text-xs font-bold text-slate-900">Intake &amp; Routing Rules</h2><p className="text-[9px] text-slate-500">Automated triage matrix matching incoming citizen reports to dispatch desks.</p></div><button type="button" className="rounded-md bg-slate-100 px-3 py-2 text-[9px] font-semibold text-slate-700">Edit Routing Rules</button></div><div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left"><thead className="bg-slate-50 text-[8px] font-bold uppercase text-slate-500"><tr>{["Department Unit", "Mapped Categories", "Primary Desk Contact", "Escalation Authority", "Actions"].map((heading) => <th key={heading} className="px-3 py-2">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{routingRules.map((rule) => <tr key={rule.department} className="text-[9px] text-slate-700"><td className="px-3 py-3 font-semibold">{rule.department}</td><td className="px-3 py-3">{rule.categories}</td><td className="px-3 py-3">{rule.contact}</td><td className="px-3 py-3">{rule.authority}<span className="block text-slate-500">Escalation {rule.escalation}</span></td><td className="px-3 py-3"><button type="button" className="rounded bg-slate-100 px-2 py-1">Configure</button></td></tr>)}</tbody></table></div><p className="px-4 py-3 text-[8px] text-emerald-700">● Auto-sync with Central Municipal Grievance API active</p></section>
  </PageFrame>;
}

function AuthorityNotificationsPage() {
  const [items, setItems] = useState(authorityNotifications);
  const [filter, setFilter] = useState("All Notifications");
  const visible = items.filter((item) => filter === "All Notifications" || (filter === "Unread" && item.urgent) || item.type === filter.toLowerCase());
  const markAllRead = () => setItems((current) => current.map((item) => ({ ...item, urgent: false })));
  return <PageFrame eyebrow="Operations Desk · Live Telemetry" title="Notifications" description="Real-time operational alerts, citizen verification notices, and statutory civic escalations across Western Municipal Ward 14." actions={<button type="button" onClick={markAllRead} className="rounded-md bg-slate-100 px-3 py-2 text-[9px] font-semibold">✓ Mark All as Read</button>}>
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(230px,0.75fr)]"><div><div className="mb-3 flex flex-wrap gap-1.5">{["All Notifications", "Unread", "Citizen", "Triage", "Progress"].map((tab) => <button key={tab} onClick={() => setFilter(tab)} className={`rounded-full px-3 py-2 text-[8px] font-semibold ${filter === tab ? "bg-slate-900 text-white" : "bg-white text-slate-600"}`}>{tab}</button>)}</div><div className="space-y-2">{visible.map((item) => <article key={item.id} className={`rounded-xl border-l-[3px] bg-white p-4 shadow-sm ${item.urgent ? "border-orange-600" : "border-transparent"}`}><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-orange-100 px-2 py-1 text-[7px] font-bold uppercase text-orange-800">{item.type}</span><span className="text-[8px] text-slate-500">Complaint #{item.complaint} · {item.time}</span><span className="ml-auto text-[7px] font-bold uppercase text-slate-500">{item.area}</span></div><h2 className="mt-2 text-[11px] font-bold text-slate-900">{item.title}</h2><p className="mt-1 text-[9px] leading-4 text-slate-600">{item.detail}</p><div className="mt-3 flex flex-wrap gap-2"><Link to={item.type === "citizen" ? "/authority/verification" : "/authority/assignments"} className="rounded-md bg-slate-900 px-3 py-2 text-[8px] font-semibold text-white">{item.action}</Link><button onClick={() => setItems((current) => current.filter((notification) => notification.id !== item.id))} className="rounded-md bg-slate-100 px-3 py-2 text-[8px] font-semibold text-slate-600">Dismiss</button></div></article>)}</div></div><aside className="space-y-3"><section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-bold text-slate-900">Alert Distribution</h2><p className="text-[8px] text-slate-500">Today</p><div className="mt-3 space-y-2">{[{name:"High Priority SLAs",value:2,color:"text-red-700"},{name:"Citizen Disputed",value:3,color:"text-orange-700"},{name:"Citizen Validated",value:7,color:"text-emerald-700"}].map((row) => <div key={row.name} className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span className="text-[9px] font-semibold text-slate-700">{row.name}</span><strong className={`text-sm ${row.color}`}>{row.value}</strong></div>)}</div><p className="mt-4 text-[9px] font-semibold text-slate-600">Daily Ward Resolution Throughput <span className="float-right">78%</span></p><div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full w-[78%] rounded-full bg-orange-600" /></div></section><OfficerRoster /></aside></div>
  </PageFrame>;
}

function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [toggles, setToggles] = useState({ email: true, assignment: true, verification: true });
  return <PageFrame eyebrow="Authority Administration" title="Settings" description="Manage officer credentials, notification preferences, and access security.">
    <div className="grid items-start gap-4 xl:grid-cols-[1.2fr_0.9fr]"><div className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-4 flex items-center gap-2"><span className="rounded-md bg-orange-50 p-2 text-orange-700"><UserRound size={15} /></span><div><h2 className="text-xs font-bold text-slate-900">Personal Information</h2><p className="text-[8px] text-slate-500">Update authority credentials and contact details.</p></div></div><div className="grid gap-3 sm:grid-cols-2">{[["Full Legal Name", "Er. Rajiv Mehta"], ["Employee ID", "#AUTH-2025-104"], ["Designation", "Zonal Officer (Ward 14)"], ["Department", "Public Works Department"], ["Official Email", "rajiv.mehta@nagriksetu.in"], ["Phone Number", "+91 98112-34567"]].map(([label,value]) => <label key={label} className="text-[8px] font-semibold text-slate-700">{label}{label.includes("*") && <span className="text-red-600"> *</span>}<input defaultValue={value} className="mt-1.5 h-9 w-full rounded-md border border-slate-200 px-2.5 text-[9px] font-normal outline-none focus:border-orange-400" /></label>)}</div><div className="mt-4 flex justify-end gap-2"><button type="button" className="rounded-md px-3 py-2 text-[9px] text-slate-600">Cancel</button><button type="button" onClick={() => setSaved(true)} className="rounded-md bg-orange-700 px-3 py-2 text-[9px] font-semibold text-white">{saved ? "Saved" : "Save Changes"}</button></div></section><section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-3 flex items-center gap-2"><span className="rounded-md bg-slate-100 p-2 text-slate-700"><ShieldCheck size={15} /></span><div><h2 className="text-xs font-bold text-slate-900">Change Password</h2><p className="text-[8px] text-slate-500">Update your portal account credentials.</p></div></div><div className="grid gap-3 sm:grid-cols-2">{["Current Password", "New Password", "Confirm Password"].map((label) => <label key={label} className="text-[8px] font-semibold text-slate-700">{label}<input type="password" placeholder={label === "Current Password" ? "Enter current password" : "Enter new password"} className="mt-1.5 h-9 w-full rounded-md border border-slate-200 px-2.5 text-[9px] font-normal" /></label>)}</div><div className="mt-3 flex justify-end"><button type="button" className="rounded-md bg-slate-900 px-3 py-2 text-[9px] font-semibold text-white">Update Password</button></div></section></div><section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"><div className="mb-3 flex items-center gap-2"><span className="rounded-md bg-emerald-50 p-2 text-emerald-700"><Bell size={15} /></span><div><h2 className="text-xs font-bold text-slate-900">Notification Preferences</h2><p className="text-[8px] text-slate-500">Configure alert channels and event notifications.</p></div></div>{[{id:"email",title:"Email Notifications",description:"Master toggle to receive authority email notifications and digests."},{id:"assignment",title:"Assignment Alerts",description:"Notify when a complaint is assigned or routed to your department."},{id:"verification",title:"Verification Alerts",description:"Notify when a citizen verifies resolution or reopens a complaint."}].map((setting) => <label key={setting.id} className="flex cursor-pointer items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><span><span className="block text-[9px] font-semibold text-slate-800">{setting.title}</span><span className="mt-0.5 block text-[8px] text-slate-500">{setting.description}</span></span><input type="checkbox" checked={toggles[setting.id]} onChange={() => setToggles((current) => ({...current,[setting.id]:!current[setting.id]}))} className="h-4 w-4 accent-emerald-600" /></label>)}</section></div>
  </PageFrame>;
}

function OfficersPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All Departments");
  const visible = officerRecords.filter((officer) => `${officer.name} ${officer.id} ${officer.zone}`.toLowerCase().includes(search.toLowerCase()) && (department === "All Departments" || officer.department === department));
  const departmentOptions = ["All Departments", ...new Set(officerRecords.map((officer) => officer.department))];
  return <PageFrame eyebrow="Personnel Registry" title="Officers" description="Manage field assignments, coverage, and municipal officer availability." actions={<button className="rounded-md bg-orange-700 px-3 py-2 text-[9px] font-semibold text-white">+ Register Officer</button>}><div className="mb-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row"><label className="relative flex-1"><Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, employee ID, or phone..." className="h-9 w-full rounded-md bg-slate-100 pl-8 pr-3 text-[10px] outline-none" /></label><SelectControl label="Department" value={department} options={departmentOptions} onChange={setDepartment} /></div><section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="bg-slate-50 text-[8px] font-bold uppercase text-slate-500"><tr>{["Officer", "Department", "Contact", "Active Cases", "Resolved", "Status", "Zone"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{visible.map((officer) => <tr key={officer.id} className="text-[9px] text-slate-700"><td className="px-3 py-3"><strong className="block text-slate-900">{officer.name}</strong><span className="font-mono text-slate-500">{officer.id}</span></td><td className="px-3 py-3">{officer.department}</td><td className="px-3 py-3">{officer.phone}<span className="block text-slate-500">{officer.email}</span></td><td className="px-3 py-3">{officer.activeCases} Active</td><td className="px-3 py-3">{officer.resolved}</td><td className="px-3 py-3"><StatusPill value={officer.status} /></td><td className="px-3 py-3">{officer.zone}</td></tr>)}</tbody></table></div><TableFooter count={visible.length} label="officers" /></section></PageFrame>;
}

function SelectControl({ label, value, options, onChange }) {
  return <label className="relative block"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 w-full appearance-none rounded-md border border-slate-200 bg-white px-3 pr-7 text-[9px] text-slate-700 outline-none focus:border-orange-400">{options.map((option) => <option key={option}>{option}</option>)}</select><ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></label>;
}

function MetricChip({ icon, value, label }) {
  return <div className="flex min-w-[82px] items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 shadow-sm"><span className="text-orange-700">{icon}</span><span><strong className="block text-xs text-slate-900">{value}</strong><span className="block text-[7px] uppercase text-slate-500">{label}</span></span></div>;
}

function PriorityBadge({ priority }) {
  const styles = { Critical: "border-red-200 bg-red-50 text-red-700", High: "border-amber-200 bg-amber-50 text-amber-700", Medium: "border-blue-200 bg-blue-50 text-blue-700", Low: "border-slate-200 bg-slate-100 text-slate-600" };
  return <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-medium ${styles[priority] || styles.Medium}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{priority}</span>;
}

function StatusPill({ value }) {
  const active = value === "Available" || value === "On Shift";
  return <span className={`rounded-full px-2 py-1 text-[8px] font-semibold ${active ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>{value}</span>;
}

function TableFooter({ count, label }) {
  return <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[9px] text-slate-500"><span>Showing 1 to {count} of {count} {label}</span><div className="flex gap-1"><button disabled className="rounded border border-slate-200 px-2 py-1 opacity-40">‹</button><button className="rounded bg-slate-900 px-2.5 py-1 text-white">1</button><button disabled className="rounded border border-slate-200 px-2 py-1 opacity-40">›</button></div></div>;
}

function EmptyState({ title, description }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center"><Search size={22} className="mx-auto text-slate-400" /><h2 className="mt-2 text-xs font-bold text-slate-800">{title}</h2><p className="mt-1 text-[9px] text-slate-500">{description}</p></div>;
}

function DepartmentPanel({ department }) {
  const Icon = department.icon === "road" ? Wrench : department.icon === "water" ? Droplets : department.icon === "electric" ? Zap : Trash2;
  return <article className="flex min-h-[210px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><span className="rounded-lg bg-slate-100 p-2 text-slate-700"><Icon size={16} /></span><StatusPill value={department.status} /></div><h2 className="mt-3 text-xs font-bold text-slate-900">{department.name}</h2><p className="text-[8px] text-slate-500">{department.department}</p><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded bg-slate-50 p-2"><span className="block text-[7px] font-bold uppercase text-slate-500">Complaints</span><strong className="text-sm text-orange-700">{department.complaints}<span className="text-[8px] text-slate-500"> / {department.total}</span></strong></div><div className="rounded bg-slate-50 p-2"><span className="block text-[7px] font-bold uppercase text-slate-500">Staffing</span><strong className="text-[9px] text-slate-800">{department.staffing}</strong></div></div><p className="mt-3 text-[8px] text-slate-600">{department.priorityScope}</p><Link to="/authority/complaints" className="mt-auto pt-3 text-[9px] font-semibold text-orange-700">View Department Queue →</Link></article>;
}

function OfficerRoster() {
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><h2 className="text-xs font-bold text-slate-900">Duty Roster Officers</h2><div className="mt-3 space-y-3">{dispatchOfficers.map((officer) => <div key={officer.name} className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-[8px] font-bold text-white">{officer.initials}</span><span className="min-w-0 flex-1"><strong className="block truncate text-[9px] text-slate-800">{officer.name}</strong><span className="block truncate text-[8px] text-slate-500">{officer.role}</span></span><StatusPill value={officer.status} /></div>)}</div></section>;
}