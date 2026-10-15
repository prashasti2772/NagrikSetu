
import AuthorityWorkspaceLayout from "../components/common/AuthorityWorkspaceLayout";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { api, label, date } from "../services/api";
import { useResource, ResourceState } from "../services/useResource";
import {
  FiShield,
  FiCalendar,
  FiDownload,
  FiAlertTriangle,
  FiUsers,
  FiCheckCircle,
  FiClock,
  FiMapPin,
  FiEye,
  FiUserPlus,
  FiFileText,
  FiNavigation,
  FiCheck,
  FiZap,
  FiDroplet,
  FiTool,
} from "react-icons/fi";



const AuthorityDashboard = () => {
  const { user }=useAuth(); const navigate=useNavigate();
  const resource=useResource(async signal=>{const [dashboard,summary,departmentCounts]=await Promise.all([api("/authority/dashboard",{signal}),api("/authority/analytics/summary",{signal}),api("/authority/analytics/departments",{signal})]);return {dashboard,summary,departmentCounts};},[]);
  const counts=resource.data?.dashboard;
  const authorityDashboardData={
    jurisdiction:user.role === "admin" ? "All departments" : `Department #${user.department_id || "Unassigned"}`,
    statutoryGrid:label(user.role), officerEmail:user.email, sessionStatus:"Authenticated",reportDate:new Date().toLocaleDateString(),
    queueSummary:counts ? `${counts.total} reports in scope` : "Loading", grievanceFilters:[], cycleTarget:"Not configured",
    resolvedVelocity:resource.data?.summary.average_resolution_hours == null ? "No resolved samples" : `${resource.data.summary.average_resolution_hours.toFixed(1)} hours`,
    kpis:counts ? [{label:"Total Reports",value:counts.total,icon:"file",dark:true},{label:"In Progress",value:counts.in_progress,icon:"users",orange:true},{label:"Resolved",value:counts.resolved,icon:"check",green:true},{label:"Verification Pending",value:counts.verification_pending,icon:"alert"}] : [],
    grievances:(counts?.recent_complaints || []).map(c=>({...c,priority:label(c.priority),image:c.image_url,location:c.address || "No address",time:date(c.updated_at),citizen:`Reporter #${c.citizen_id || "unavailable"}`})),
    departments:(resource.data?.departmentCounts || []).map(d=>({name:d.department,value:d.total,progress:counts?.total?`${d.total/counts.total*100}%`:"0%",avg:"Not available",status:"Reports in scope",icon:"tool",iconClass:"bg-slate-100"})),zones:[],approvals:[]
  };
  const { grievances, departments }=authorityDashboardData;
  const departmentIcons = {
    tool: <FiTool size={18} />,
    water: <FiDroplet size={18} />,
    zap: <FiZap size={18} />,
  };

  return (
    <AuthorityWorkspaceLayout activeSection="dashboard" title="Authority Workspace">
      {/* =========================================================
          MAIN
      ========================================================= */}

      <main id="dashboard-overview" className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-7 lg:py-6">

        <ResourceState resource={resource} />
        {/* =====================================================
            COMMAND CENTER HEADER
        ===================================================== */}

            <section className="scroll-mt-20 bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:p-7 mb-6">

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            <div>

              <div className="flex flex-wrap items-center gap-2 mb-3">

                <span className="inline-flex items-center gap-2 bg-[#071d35] text-white rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Jurisdiction Hub
                </span>

                <span className="text-[10px] text-gray-500 font-bold uppercase">
                  {authorityDashboardData.jurisdiction}
                </span>

                <span className="text-gray-300">•</span>

                <span className="text-[10px] text-gray-500 font-bold uppercase">
                  {authorityDashboardData.statutoryGrid}
                </span>

              </div>

              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Civic Operations Command Center —
                <br className="hidden md:block" />
                {authorityDashboardData.jurisdiction}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-600">

                <FiShield
                  size={14}
                  className="text-emerald-600"
                />

                Connected:
                <strong className="text-gray-800">
                  {authorityDashboardData.officerEmail}
                </strong>

                <span>•</span>

                <span className="bg-gray-100 rounded px-2 py-1 font-semibold">
                  {authorityDashboardData.sessionStatus}
                </span>

              </div>

            </div>


            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:min-w-[230px]">

              <div className="h-11 bg-gray-100 rounded-lg px-4 flex items-center justify-between gap-4 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <FiCalendar size={16} />
                  {authorityDashboardData.reportDate}
                </span>

              </div>

              <button onClick={()=>navigate("/authority/complaints")} className="h-11 bg-[#071d35] hover:bg-[#0b2949] text-white rounded-lg px-4 flex items-center justify-center gap-2 text-sm font-semibold transition">
                <FiDownload size={16} />
                Open Complaints / Export CSV
              </button>

            </div>

          </div>

        </section>


        {/* =====================================================
            KPI CARDS
        ===================================================== */}

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">

          {authorityDashboardData.kpis.map((kpi) => (
            <KpiCard
              key={kpi.label}
              {...kpi}
              icon={{
                file: <FiFileText size={22} />,
                users: <FiUsers size={22} />,
                check: <FiCheckCircle size={22} />,
                alert: <FiAlertTriangle size={22} />,
              }[kpi.icon]}
            />
          ))}

        </section>


        {/* =====================================================
            CONTENT GRID
        ===================================================== */}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.9fr)] gap-6">


          {/* ===================================================
              LEFT COLUMN
          =================================================== */}

          <div className="space-y-6">


            {/* URGENT FEED */}

            <section id="complaints-feed" className="scroll-mt-20 bg-white rounded-xl border border-gray-100 shadow-sm p-5">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

                <div className="flex items-start gap-3">

                  <div className="w-9 h-9 rounded-lg bg-[#071d35] text-white flex items-center justify-center">
                    <FiFileText size={18} />
                  </div>

                  <div>

                    <h3 className="text-xl font-bold">
                      Recent Complaint Activity
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Recently updated reports within your authorized scope
                    </p>

                  </div>

                </div>

                <span className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <span className="w-2 h-2 bg-orange-500 rounded-full" />
                  {authorityDashboardData.queueSummary}
                </span>

              </div>


              {/* Filters */}

              <div className="flex flex-wrap gap-2 mb-5">

                {authorityDashboardData.grievanceFilters.map((text, index) => (
                  <FilterButton key={text} active={index === 0} text={text} />
                ))}

              </div>


              {/* Grievance list */}

              <div className="space-y-3">

                {grievances.map((item) => (
                  <GrievanceItem
                    key={item.id}
                    item={item}
                  />
                ))}

              </div>

            </section>


            {/* DEPARTMENT VELOCITY */}

            <section id="department-velocity" className="scroll-mt-20 bg-white rounded-xl border border-gray-100 shadow-sm p-5">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">

                <div>

                  <h3 className="text-xl font-bold">
                    Department Workload
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Operational progress across departments and report categories
                  </p>

                </div>

                <span className="bg-gray-100 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase">
                  Cycle Target: {authorityDashboardData.cycleTarget}
                </span>

              </div>


              {/* Department cards */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                {departments.map((department) => (
                  <DepartmentCard
                    key={department.name}
                    department={{
                      ...department,
                      icon: departmentIcons[department.icon],
                    }}
                  />
                ))}

              </div>


              <p className="mt-4 text-sm">Average resolution time: {authorityDashboardData.resolvedVelocity}</p>
            </section>

          </div>


          {/* ===================================================
              RIGHT COLUMN
          =================================================== */}

          <div className="space-y-6">


            {/* MAP */}

            <section id="geographic-map" className="scroll-mt-20 bg-white rounded-xl border border-gray-100 shadow-sm p-5">

              <div className="flex items-start justify-between gap-3">

                <div className="flex gap-3">

                  <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                    <FiNavigation size={18} />
                  </div>

                  <div>

                    <h3 className="font-bold text-lg">
                      Complaint Locations
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Locations supplied by reporters
                    </p>

                  </div>

                </div>

                <span className="bg-emerald-300 text-emerald-950 px-2 py-1 rounded text-[9px] font-bold uppercase">
                  Reported locations
                </span>

              </div>


              <div className="mt-4"><p className="my-4 text-xs">View reported locations in the map workspace.</p><Link to="/authority/map" className="text-orange-700 underline text-sm">Open complaint map</Link></div>

              {/* Zone breakdown */}

              <div className="mt-5">

                <p className="text-[10px] font-bold uppercase text-gray-500 mb-3">
                  Zone Breakdown
                </p>

                <div className="space-y-2"><p className="text-xs text-slate-500">No verified zone boundaries are available.</p>

                  {authorityDashboardData.zones.map((zone) => (
                    <ZoneRow key={zone.name} {...zone} />
                  ))}

                </div>

              </div>

            </section>


            <section className="rounded-xl bg-white border p-5"><h3 className="font-bold">Staff accounts</h3><p className="mt-2 text-xs">Staff provisioning is admin-controlled. There is no email approval queue.</p><Link to="/authority/officers" className="text-orange-700 underline text-sm">View officers</Link></section>

          </div>

        </div>

      </main>


    </AuthorityWorkspaceLayout>
  );
};


/* ===============================================================
   COMPONENTS
=============================================================== */
const KpiCard = ({
  dark = false,
  label,
  value,
  sub,
  icon,
  orange = false,
  green = false,
  red = false,
  badge,
}) => {

  let cardClass = "bg-white border-gray-100";
  let valueClass = "text-[#071d35]";

  if (dark) {
    cardClass = "bg-[#071d35] border-[#071d35] text-white";
    valueClass = "text-white";
  }

  if (green) {
    valueClass = "text-emerald-600";
  }

  if (red) {
    valueClass = "text-red-600";
  }

  if (orange) {
    valueClass = "text-[#c64d15]";
  }

  return (
    <div
      className={`relative rounded-xl border shadow-sm p-5 min-h-[155px] ${cardClass}`}
    >

      <div className="flex items-start justify-between">

        <p
          className={`text-[10px] uppercase tracking-wider font-bold ${
            dark ? "text-gray-300" : "text-gray-500"
          }`}
        >
          {label}
        </p>

        {icon && (
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              dark
                ? "bg-white/10 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {icon}
          </div>
        )}

      </div>

      {badge && (
        <span
          className={`absolute top-5 right-5 px-3 py-1 rounded-full text-[8px] font-bold ${
            green
              ? "bg-emerald-300 text-emerald-950"
              : "bg-red-100 text-red-700"
          }`}
        >
          {badge}
        </span>
      )}

      <p className={`text-4xl font-bold mt-5 ${valueClass}`}>
        {value}
      </p>

      <p
        className={`text-[10px] mt-2 ${
          dark ? "text-gray-300" : "text-gray-500"
        }`}
      >
        {sub}
      </p>

    </div>
  );
};


const FilterButton = ({ text, active = false }) => {
  return (
    <button
      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition ${
        active
          ? "bg-[#071d35] text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {text}
    </button>
  );
};


const GrievanceItem = ({ item }) => {

  const navigate=useNavigate();
  const isResolved = item.status === "resolved";

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">

      <div className="flex flex-col md:flex-row gap-3">

        {/* Image */}

        <img
          hidden={!item.image}
          src={item.image}
          alt=""
          className="w-full md:w-16 h-16 object-cover rounded-lg"
        />


        {/* Content */}

        <div className="flex-1 min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <span
              className={`px-2 py-1 rounded text-[8px] font-bold ${
                isResolved
                  ? "bg-emerald-200 text-emerald-800"
                  : item.priority === "CRITICAL"
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              }`}
            >
              {item.priority}
            </span>

            <span className="bg-gray-200 rounded px-2 py-1 text-[8px] font-bold">
              {item.category}
            </span>

            <span className="flex items-center gap-1 text-[9px] text-gray-500">
              <FiClock size={11} />
              {item.time}
            </span>

          </div>

          <h4 className="font-bold text-sm mt-2 truncate">
            {item.title}
          </h4>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[9px] text-gray-500">

            <span className="flex items-center gap-1">
              <FiMapPin size={11} className="text-orange-500" />
              {item.location}
            </span>

            <span>
              Citizen:{" "}
              <strong className="text-gray-700">
                {item.citizen}
              </strong>
            </span>

            {item.verified && (
              <span className="text-emerald-600 font-semibold">
                (Verified Voter)
              </span>
            )}

          </div>

        </div>


        {/* Buttons */}

        <div className="flex md:flex-col gap-2 md:w-[145px]">

          {!isResolved && (
            <button onClick={()=>navigate(`/authority/complaints/${item.id}`)} className="flex-1 bg-[#ff6422] hover:bg-[#e95315] text-white rounded-lg px-3 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition">
              <FiUserPlus size={13} />
              Assign Field Officer
            </button>
          )}

          {isResolved && (
            <button onClick={()=>navigate(`/authority/complaints/${item.id}`)} className="flex-1 bg-emerald-800 text-white rounded-lg px-3 py-2 text-[10px] font-bold flex items-center justify-center gap-1">
              <FiCheck size={13} />
              Review Resolution
            </button>
          )}

          <button onClick={()=>navigate(`/authority/complaints/${item.id}`)} className="flex-1 bg-gray-200 hover:bg-gray-300 rounded-lg px-3 py-2 text-[10px] font-semibold flex items-center justify-center gap-1 transition">
            <FiEye size={13} />
            {isResolved ? "Audit Geo-Stamp" : "Review Details"}
          </button>

        </div>

      </div>

    </div>
  );
};


const DepartmentCard = ({ department }) => {
  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2">

          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${department.iconClass}`}
          >
            {department.icon}
          </div>

          <span className="font-semibold text-sm">
            {department.name}
          </span>

        </div>

        <span className="font-bold">
          {department.value}
        </span>

      </div>


      <div className="h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">

        <div
          className="h-full bg-[#071d35] rounded-full"
          style={{
            width: department.progress,
          }}
        />

      </div>


      <div className="flex justify-between mt-3 text-[9px]">

        <span className="text-gray-500">
          Avg fix:{" "}
          <strong className="text-gray-700">
            {department.avg}
          </strong>
        </span>

        <span className="text-emerald-600 font-bold">
          {department.status}
        </span>

      </div>

    </div>
  );
};


const ZoneRow = ({ color, name, reports }) => {
  return (
    <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">

      <div className="flex items-center gap-2 min-w-0">

        <span
          className={`w-2 h-2 rounded-full shrink-0 ${color}`}
        />

        <span className="text-[10px] truncate">
          {name}
        </span>

      </div>

      <span className="text-[10px] font-bold whitespace-nowrap">
        {reports}
      </span>

    </div>
  );
};


export default AuthorityDashboard;