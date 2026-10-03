import React from "react";
import {
  Search,
  Printer,
  Bell,
  CheckCircle2,
  Clock3,
  MapPin,
  Phone,
  ShieldCheck,
  Camera,
  UserRound,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { trackComplaintData } from "../data/trackComplaintData";

const TrackComplaint = () => {
  const { complaint, recentQueries, timeline, activities, map, proof, authority } = trackComplaintData;
  const activityIcons = {
    inspector: <UserRound size={15} />,
    crew: <MapPin size={15} />,
    route: <ChevronRight size={15} />,
    citizen: <FlagIcon />,
  };

  return (
    <div className="min-h-screen bg-[#f5f7f9] text-[#07182d]">

      {/* Tracking Header */}
      <main className="px-7 md:px-12 lg:px-16 py-12">

        {/* Search Section */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold">
                Real-Time Municipal Redressal Engine
              </p>

              <h1 className="text-2xl md:text-3xl font-semibold mt-1">
                Track Grievance Status & SLA Progression
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2 text-sm w-fit">
              <span className="text-green-600">●</span>
              Direct Ward Command Link
            </div>
          </div>

          <div className="mt-5 flex flex-col md:flex-row gap-2">
            <div className="flex items-center gap-3 bg-[#f5f7f9] rounded-lg px-4 py-3 flex-1">
              <Search size={18} className="text-gray-500" />

              <input
                type="text"
                placeholder={`#${complaint.id}`}
                className="bg-transparent outline-none w-full text-sm"
              />
            </div>

            <button className="bg-[#ff6422] hover:bg-[#e95417] text-white font-semibold rounded-lg px-7 py-3 transition flex items-center justify-center gap-2">
              <Search size={16} />
              Track Docket
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">
              Recent Queries:
            </span>

            {recentQueries.map((query, index) => (
              <React.Fragment key={query}>
                {index > 0 && <span className="mx-3">•</span>}
                <span className={index === 0 ? "ml-4" : undefined}>{query}</span>
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Complaint Main Card */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Complaint Header */}
          <div className="bg-[#f0f2f4] px-6 py-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl md:text-2xl font-semibold">
                    Docket #{complaint.id}
                  </h2>

                  <span className="bg-white rounded-full px-3 py-1 text-[10px] uppercase font-semibold">
                    {complaint.category}
                  </span>

                  <span className="bg-red-100 text-red-600 rounded-full px-3 py-1 text-[10px] uppercase font-semibold">
                    ⚠ {complaint.priority}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mt-2">
                  {complaint.title}
                </p>
              </div>

              <div className="flex gap-2">
                <button className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                  <Printer size={15} />
                  Print Docket
                </button>

                <button className="bg-[#07182d] text-white rounded-lg px-4 py-2 text-sm flex items-center gap-2">
                  <Bell size={15} />
                  SMS Alerts Active
                </button>
              </div>
            </div>
          </div>

          {/* Complaint Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 px-6 py-6 border-b">

            <InfoItem
              title="JURISDICTION WARD"
              value={complaint.jurisdictionWard}
              sub={complaint.location}
            />

            <InfoItem
              title="LODGED TIMESTAMP"
              value={complaint.lodgedTimestamp}
              sub={complaint.submittedVia}
            />

            <InfoItem
              title="ASSIGNED FIELD UNIT"
              value={complaint.assignedUnit}
              sub={complaint.assignedOfficer}
            />

            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                GUARANTEED SLA WINDOW
              </p>

              <p className="text-lg text-green-600 font-medium mt-1">
                {complaint.sla.remaining}
              </p>

              <p className="text-xs text-gray-500">
                {complaint.sla.target}
              </p>
            </div>

          </div>

          {/* Progress */}
          <div className="px-6 py-6 bg-[#fafbfc]">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h3 className="font-medium flex items-center gap-2">
                <Clock3 size={18} className="text-orange-500" />
                Statutory Lifecycle Progression
              </h3>

              <span className="bg-orange-100 text-orange-600 rounded-full px-3 py-1 text-[10px] font-semibold uppercase">
                Stage {complaint.stage} of {complaint.totalStages} Active
              </span>
            </div>

            <div className="mt-7 grid grid-cols-2 md:grid-cols-6 gap-5">

              {timeline.map((step) => (
                <ProgressStep
                  key={step.number}
                  number={step.status === "completed" ? <CheckCircle2 size={20} /> : step.status === "active" ? <Clock3 size={20} /> : step.number}
                  title={step.title}
                  time={step.time}
                  status={step.note}
                  completed={step.status === "completed"}
                  active={step.status === "active"}
                />
              ))}

            </div>
          </div>
        </section>

        {/* Lower Content */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-6">

          {/* Activity */}
          <section className="lg:col-span-3 bg-white rounded-xl border border-gray-100 shadow-sm p-6">

            <div className="flex justify-between items-center mb-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500">
                  Auditable Activity Log
                </p>

                <h2 className="text-xl font-medium">
                  Field Operations & Action Stream
                </h2>
              </div>

              <span className="bg-gray-100 rounded-full px-3 py-1 text-xs">
                Geo-Synced
              </span>
            </div>

            {activities.map((activity) => (
              <ActivityItem
                key={activity.type}
                icon={activityIcons[activity.type]}
                title={activity.title}
                time={activity.time}
                description={activity.description}
              />
            ))}

          </section>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Map */}
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

              <div className="flex justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">
                    Spatial Validation
                  </p>

                  <h2 className="text-lg font-medium">
                    Incident Geo-Perimeter
                  </h2>
                </div>

                  <span className="text-xs text-orange-500">
                    ⌖ {map.radius}
                </span>
              </div>

              <div className="mt-4 h-44 rounded-lg bg-[#dcebdc] relative overflow-hidden">

                <div className="absolute inset-0 opacity-50">
                  <div className="absolute left-10 top-8 w-40 h-20 border-2 border-green-400 rounded-full" />
                  <div className="absolute right-10 bottom-8 w-32 h-16 border-2 border-blue-400 rounded-full" />
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-[#ff6422] text-white text-xs font-semibold px-4 py-2 rounded-full shadow">
                    {map.pinLabel}
                  </div>
                </div>

              </div>

              <div className="mt-3 bg-gray-100 rounded-lg p-3 text-xs text-gray-600">
                <p className="flex gap-2">
                  <MapPin size={14} />
                  Location Address: {map.address}
                </p>

                <p className="mt-2">
                  Traffic Impact: {map.trafficImpact}
                </p>
              </div>

            </section>

            {/* Authority */}
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">

              <p className="text-[10px] uppercase tracking-widest text-gray-500">
                Administrative Oversight
              </p>

              <div className="flex justify-between items-center mt-1">
                <h2 className="text-lg font-medium">
                  Nodal Officers & Escalation
                </h2>

                <span className="bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs">
                  Level 1 Active
                </span>
              </div>

              <div className="mt-4 bg-gray-100 rounded-lg p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#07182d] text-white flex items-center justify-center text-xs">
                  {authority.officer.split(" ").slice(-2).map((part) => part[0]).join("")}
                </div>

                <div className="flex-1">
                  <p className="font-medium text-sm">{authority.officer}</p>
                  <p className="text-xs text-gray-500">
                    Ward Nodal Executive Engineer
                  </p>
                </div>

                <Phone size={17} />
              </div>

              <div className="mt-2 bg-gray-100 rounded-lg p-3 flex justify-between items-center text-sm">
                <span>{authority.desk}</span>
                <span className="text-green-600 text-xs font-semibold">
                  {authority.status}
                </span>
              </div>

              <div className="mt-2 bg-gray-100 rounded-lg p-3 text-sm">
                <p className="font-medium">
                  ↗ Auto-Escalation SLA Trigger
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  If uncompleted by {complaint.sla.deadline}, this complaint automatically
                  escalates to the Zonal Additional Municipal Commissioner.
                </p>
              </div>

            </section>

            {/* Rights */}
            <section className="bg-[#07182d] text-white rounded-xl p-6">

              <p className="text-xs text-orange-300 uppercase font-semibold">
                Citizen Sovereign Rights
              </p>

              <h2 className="text-lg font-semibold mt-2">
                Complaints Never Close Without Your Final Sign-Off
              </h2>

              <p className="text-xs text-gray-300 mt-3 leading-5">
                Once marked resolved by the municipal field authority, you
                will receive an SMS and Email notification with a unique
                verification code. Complaints are formally registered as
                closed only after community confirmation of quality.
              </p>

              <div className="mt-4 flex items-center gap-2 text-green-400 text-sm font-medium">
                <ShieldCheck size={17} />
                Empowering Citizens Since 2025
              </div>

            </section>

          </div>
        </div>

        {/* Evidence */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-6">

          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500">
                Photographic Audit Trail
              </p>

              <h2 className="text-xl font-medium">
                Incident Proof vs Active Rectification
              </h2>
            </div>

            <span className="text-green-600 text-xs flex items-center gap-1">
              <ShieldCheck size={15} />
              Encrypted Municipal Metadata
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-5">

            <EvidenceCard
              title={proof.initial.label}
              time={proof.initial.time}
              description={`${proof.initial.severity}. ${proof.initial.details}`}
            />

            <EvidenceCard
              title={proof.active.label}
              time={proof.active.time}
              description={`${proof.active.severity}. ${proof.active.details}`}
            />

          </div>

          <div className="mt-4 bg-gray-100 rounded-lg px-4 py-3 text-sm flex items-center gap-2">
            <Camera size={16} />
            Final "After Resolution" photograph will be posted once the
            asphalt cures.
          </div>

        </section>

      </main>
    </div>
  );
};


/* ---------------- Components ---------------- */

const InfoItem = ({ title, value, sub }) => (
  <div>
    <p className="text-[10px] text-gray-500 uppercase tracking-wide">
      {title}
    </p>

    <p className="text-base font-medium mt-1">
      {value}
    </p>

    <p className="text-xs text-gray-500">
      {sub}
    </p>
  </div>
);


const ProgressStep = ({
  number,
  title,
  time,
  status,
  completed,
  active,
}) => (
  <div className="text-center">

    <div
      className={`mx-auto w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium
      ${
        completed
          ? "bg-emerald-600 text-white"
          : active
          ? "bg-orange-500 text-white"
          : "bg-gray-200 text-gray-500"
      }`}
    >
      {number}
    </div>

    <p className="text-xs font-medium mt-2">
      {title}
    </p>

    <p className="text-[10px] text-gray-500">
      {time}
    </p>

    <p
      className={`text-[10px] mt-1 font-semibold ${
        completed
          ? "text-emerald-600"
          : active
          ? "text-orange-500"
          : "text-gray-400"
      }`}
    >
      {status}
    </p>

  </div>
);


const ActivityItem = ({ icon, title, time, description }) => (
  <div className="relative pl-8 pb-4">

    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
      {icon}
    </div>

    <div className="bg-gray-100 rounded-lg p-4">

      <div className="flex justify-between gap-3">
        <p className="font-medium text-sm">
          {title}
        </p>

        <span className="text-[10px] text-orange-500 whitespace-nowrap">
          {time}
        </span>
      </div>

      <p className="text-xs text-gray-600 mt-2 leading-5">
        {description}
      </p>

    </div>

  </div>
);


const EvidenceCard = ({ title, time, description }) => (
  <div className="border rounded-lg overflow-hidden">

    <div className="h-48 bg-gradient-to-br from-gray-500 via-gray-300 to-gray-600 relative">

      <div className="absolute top-3 left-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
        {title}
      </div>

      <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
        {time}
      </div>

    </div>

    <div className="p-3">
      <p className="text-xs font-medium">
        {description}
      </p>

      <p className="text-xs text-gray-500 mt-1">
        Telemetry and field verification metadata attached.
      </p>
    </div>

  </div>
);


const FlagIcon = () => (
  <span className="text-xs font-bold">F</span>
);

export default TrackComplaint;