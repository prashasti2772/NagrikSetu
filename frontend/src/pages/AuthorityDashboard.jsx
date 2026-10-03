import AuthorityFooter from "../components/common/AuthorityFooter";
import AuthorityWorkspaceLayout from "../components/common/AuthorityWorkspaceLayout";
import { authorityDashboardData } from "../data/authorityDashboardData";
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
  FiActivity,
  FiMail,
  FiPhone,
  FiChevronDown,
  FiArrowUpRight,
  FiLock,
  FiFileText,
  FiNavigation,
  FiCheck,
  FiBarChart2,
  FiZap,
  FiDroplet,
  FiTool,
} from "react-icons/fi";

import {
  MdOutlineSecurity,
} from "react-icons/md";

const AuthorityDashboard = () => {
  const { grievances, departments, approvals } = authorityDashboardData;
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
                Central Ward IV
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

              <button className="h-11 bg-gray-100 rounded-lg px-4 flex items-center justify-between gap-4 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <FiCalendar size={16} />
                  {authorityDashboardData.reportDate}
                </span>

                <FiChevronDown size={16} />
              </button>

              <button className="h-11 bg-[#071d35] hover:bg-[#0b2949] text-white rounded-lg px-4 flex items-center justify-center gap-2 text-sm font-semibold transition">
                <FiDownload size={16} />
                Export Daily SLA Report (CSV)
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
                      Urgent Grievance Feed & Rapid Triage
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      High-priority jurisdictional reports requiring officer deployment & sign-off
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
                    Department Resolution Velocity
                  </h3>

                  <p className="text-xs text-gray-500 mt-1">
                    Statutory SLA compliance rates across central municipal operational engineering branches
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


              {/* Chart */}

              <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-4">

                <div className="flex justify-between items-center mb-3">

                  <span className="text-[10px] uppercase font-bold text-gray-600">
                    {authorityDashboardData.velocityPeriod}
                  </span>

                  <span className="text-xs font-semibold">
                    Current Composite: {authorityDashboardData.resolvedVelocity}
                  </span>

                </div>

                <div className="relative h-32 overflow-hidden">

                  <div className="absolute inset-x-0 bottom-5 border-b border-gray-200" />

                  <svg
                    viewBox="0 0 800 180"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id="chartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#ff6422"
                          stopOpacity="0.28"
                        />

                        <stop
                          offset="100%"
                          stopColor="#ff6422"
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>

                    <path
                      d={authorityDashboardData.velocityChart.areaPath}
                      fill="url(#chartFill)"
                    />

                    <path
                      d={authorityDashboardData.velocityChart.linePath}
                      fill="none"
                      stroke="#c84b12"
                      strokeWidth="4"
                    />

                    <circle
                      cx={authorityDashboardData.velocityChart.peak.cx}
                      cy={authorityDashboardData.velocityChart.peak.cy}
                      r="6"
                      fill="#c84b12"
                    />

                    <circle
                      cx={authorityDashboardData.velocityChart.current.cx}
                      cy={authorityDashboardData.velocityChart.current.cy}
                      r="6"
                      fill="#071d35"
                    />
                  </svg>

                </div>

                <div className="flex justify-between text-[10px] text-gray-500 font-semibold">
                  {authorityDashboardData.velocityLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

              </div>

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
                      Geographic Ward Heatmap
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                      Geospatial complaint distribution across central municipal sectors
                    </p>

                  </div>

                </div>

                <span className="bg-emerald-300 text-emerald-950 px-2 py-1 rounded text-[9px] font-bold uppercase">
                  Live Telemetry
                </span>

              </div>


              <div className="relative mt-4 h-[250px] rounded-xl overflow-hidden bg-[#9ac8d8]">

                {/* Simulated map */}
                <div className="absolute inset-0 opacity-70">

                  <div className="absolute w-[140%] h-[2px] bg-white/80 rotate-[20deg] top-[35%] -left-20" />

                  <div className="absolute w-[130%] h-[2px] bg-white/80 rotate-[-25deg] top-[65%] -left-10" />

                  <div className="absolute w-[2px] h-[140%] bg-white/70 rotate-[25deg] left-[45%] -top-10" />

                  <div className="absolute w-[2px] h-[140%] bg-white/70 rotate-[-18deg] left-[70%] -top-10" />

                  <div className="absolute w-48 h-48 rounded-full border-[25px] border-purple-300/50 left-[20%] top-[15%]" />

                  <div className="absolute w-32 h-32 rounded-full border-[20px] border-blue-400/50 right-[15%] bottom-[5%]" />

                </div>


                {/* Header */}
                <div className="absolute top-3 left-3 right-3 bg-white/90 rounded-lg px-3 py-2 flex items-center gap-2">

                  <span className="w-2 h-2 rounded-full bg-red-500" />

                  <span className="text-[10px] font-bold uppercase">
                    {authorityDashboardData.heatmapCluster}
                  </span>

                </div>


                {/* Pins */}

                {authorityDashboardData.mapPins.map((pin, index) => (
                  <MapPin
                    key={index}
                    className={pin.className}
                    color={pin.color}
                  />
                ))}


                {/* Bottom information */}

                <div className="absolute bottom-3 left-3 right-3 bg-[#071d35]/95 text-white rounded-lg p-3 flex items-center justify-between">

                  <div>

                    <p className="text-[9px] uppercase text-gray-300">
                      Active Density
                    </p>

                    <p className="font-bold text-sm">
                      {authorityDashboardData.hotspotSummary}
                    </p>

                  </div>

                  <button className="bg-white text-[#071d35] rounded px-3 py-1.5 text-[10px] font-bold">
                    Enlarge Grid
                  </button>

                </div>

              </div>


              {/* Zone breakdown */}

              <div className="mt-5">

                <p className="text-[10px] font-bold uppercase text-gray-500 mb-3">
                  Zone Breakdown
                </p>

                <div className="space-y-2">

                  {authorityDashboardData.zones.map((zone) => (
                    <ZoneRow key={zone.name} {...zone} />
                  ))}

                </div>

              </div>

            </section>


            {/* EMAIL APPROVALS */}

            <section id="pending-approvals" className="scroll-mt-20 bg-white rounded-xl border border-gray-100 shadow-sm p-5">

              <div className="flex items-center justify-between mb-4">

                <div className="flex items-center gap-3">

                  <FiMail
                    size={20}
                    className="text-[#071d35]"
                  />

                  <h3 className="font-bold text-lg">
                    Pending Email Approvals
                  </h3>

                </div>

                <span className="bg-gray-100 rounded-full px-3 py-1 text-[9px] font-bold uppercase">
                  {authorityDashboardData.approvalSummary}
                </span>

              </div>

              <p className="text-xs text-gray-500 mb-4">
                Junior field inspectors awaiting authoritative credential provisioning
              </p>


              <div className="space-y-3">

                {approvals.map((person) => (
                  <ApprovalCard
                    key={person.name}
                    person={person}
                  />
                ))}

              </div>


              <div className="mt-4 bg-gray-100 rounded-lg p-3 flex gap-2 text-[10px] text-gray-600">

                <FiLock
                  size={14}
                  className="shrink-0"
                />

                Approval sends an encrypted, time-bounded TOTP activation token directly to their NIC municipal email inbox.

              </div>

            </section>

          </div>

        </div>

      </main>


      <AuthorityFooter />
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

  const isResolved = item.priority === "FIELD RESOLVED";

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">

      <div className="flex flex-col md:flex-row gap-3">

        {/* Image */}

        <img
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
            <button className="flex-1 bg-[#ff6422] hover:bg-[#e95315] text-white rounded-lg px-3 py-2 text-[10px] font-bold flex items-center justify-center gap-1 transition">
              <FiUserPlus size={13} />
              Assign Field Officer
            </button>
          )}

          {isResolved && (
            <button className="flex-1 bg-emerald-800 text-white rounded-lg px-3 py-2 text-[10px] font-bold flex items-center justify-center gap-1">
              <FiCheck size={13} />
              Approve Resolution
            </button>
          )}

          <button className="flex-1 bg-gray-200 hover:bg-gray-300 rounded-lg px-3 py-2 text-[10px] font-semibold flex items-center justify-center gap-1 transition">
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


const MapPin = ({ className, color }) => {
  return (
    <div
      className={`absolute ${className} w-7 h-7 rounded-full border-4 border-white shadow-lg ${color} flex items-center justify-center`}
    >
      <span className="w-2 h-2 bg-white rounded-full" />
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


const ApprovalCard = ({ person }) => {
  return (
    <div className="bg-gray-50 rounded-xl p-3">

      <div className="flex items-center gap-3">

        <div
          className={`w-9 h-9 rounded-full ${person.color} text-white flex items-center justify-center text-[10px] font-bold`}
        >
          {person.initials}
        </div>

        <div className="flex-1 min-w-0">

          <div className="flex items-center justify-between gap-2">

            <p className="font-bold text-xs truncate">
              {person.name}
            </p>

            <span className="bg-white border border-gray-200 px-2 py-1 rounded text-[8px] font-semibold">
              {person.role}
            </span>

          </div>

          <p className="text-[9px] text-gray-500 truncate mt-1">
            {person.email}
          </p>

        </div>

      </div>


      <div className="flex items-center justify-between gap-2 mt-3">

        <span className="text-[9px] text-gray-500">
          Badge:{" "}
          <strong className="text-gray-700">
            {person.badge}
          </strong>
        </span>

        <button className="bg-[#071d35] hover:bg-[#0b2949] text-white rounded-lg px-3 py-2 text-[9px] font-bold flex items-center gap-1 transition">
          <FiArrowUpRight size={12} />
          Approve via Official Email
        </button>

      </div>

    </div>
  );
};

export default AuthorityDashboard;