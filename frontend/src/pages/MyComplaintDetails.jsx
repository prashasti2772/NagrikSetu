import React from "react";

import {
  ArrowLeft,
  Printer,
  Share2,
  Plus,
  FileText,
  MapPin,
  AlertTriangle,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  Users,
  Building2,
  Phone,
  MessageCircle,
  HelpCircle,
  Search,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import {
  getComplaintById,
} from "../data/myComplaintsData";


function MyComplaintDetails() {

  const { complaintId } = useParams();

  const navigate = useNavigate();

  const complaint =
    getComplaintById(complaintId);


  // ==========================================================
  // INVALID COMPLAINT
  // ==========================================================

  if (!complaint) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f7fa] px-5 text-center">

        <Search
          size={45}
          className="text-gray-400"
        />

        <h1 className="mt-4 text-xl font-bold text-gray-900">
          Complaint Not Found
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          The complaint you are looking for does not exist.
        </p>

        <button
          onClick={() =>
            navigate("/my-complaints")
          }
          className="mt-5 rounded-lg bg-[#102943] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to My Complaints
        </button>

      </div>
    );
  }


  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#111827]">

      {/* ====================================================
          TOP ACTION BAR
      ==================================================== */}

      <div className="px-4 pt-5 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

          <button
            onClick={() =>
              navigate("/my-complaints")
            }
            className="flex w-fit items-center gap-2 text-xs font-medium text-gray-800 hover:text-[#b83205]"
          >
            <ArrowLeft size={16} />
            Back to My Complaints
          </button>


          <div className="flex gap-2">

            <button
              onClick={() =>
                window.print()
              }
              className="flex h-9 items-center gap-2 rounded-lg bg-[#e7e9eb] px-3 text-[10px] font-semibold text-gray-700"
            >
              <Printer size={14} />
              Print Summary
            </button>

            <button className="flex h-9 items-center gap-2 rounded-lg bg-[#e7e9eb] px-3 text-[10px] font-semibold text-gray-700">
              <Share2 size={14} />
              Share
            </button>

          </div>

        </div>

      </div>


      {/* ====================================================
          HEADER
      ==================================================== */}

      <section className="relative mx-4 mt-5 overflow-hidden rounded-xl border border-gray-100 bg-white px-6 py-6 shadow-sm sm:mx-6 lg:mx-8">

        <div className="relative z-10 pr-0 lg:pr-52">

          {/* Badges */}

          <div className="mb-2 flex flex-wrap items-center gap-2">

            <span className="rounded-full bg-[#edf0f2] px-3 py-1.5 text-[9px] font-medium text-gray-700">
              COMPLAINT #{complaint.id}
            </span>

            <StatusBadge
              status={complaint.status}
              type={complaint.statusType}
            />

          </div>


          {/* Title */}

          <h1 className="text-xl font-bold leading-tight text-[#0d1f35] sm:text-2xl lg:text-3xl">
            {complaint.title}
          </h1>


          {/* Meta */}

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-gray-600">

            <span className="flex items-center gap-1.5">
              <CalendarDays
                size={13}
                className="text-[#b83205]"
              />

              Submitted on{" "}
              {complaint.submissionDate},{" "}
              {complaint.submittedTime}
            </span>


            {complaint.citizenVerification && (
              <span className="flex items-center gap-1.5">
                <ShieldCheck
                  size={13}
                  className="text-emerald-500"
                />

                Citizen Verification Token Active
              </span>
            )}

          </div>

        </div>


        {/* Evidence Button */}

        <button className="mt-5 flex h-10 items-center gap-2 rounded-lg bg-[#b83205] px-4 text-[11px] font-semibold text-white hover:bg-[#982c04] lg:absolute lg:right-6 lg:top-1/2 lg:mt-0 lg:-translate-y-1/2">

          <Plus size={16} />

          Add More Evidence

        </button>


        {/* Decorative */}

        <div className="absolute -right-8 -top-10 hidden h-44 w-44 rounded-full border-[12px] border-gray-100 lg:block" />

      </section>


      {/* ====================================================
          MAIN GRID
      ==================================================== */}

      <main className="grid grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1.4fr_1fr] lg:px-8">


        {/* ==================================================
            LEFT COLUMN
        ================================================== */}

        <div className="space-y-6">


          {/* =================================================
              CITIZEN REPORT CARD
          ================================================= */}

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center justify-between gap-3">

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-[#102943]">
                  <FileText size={17} />
                </div>

                <h2 className="text-base font-semibold">
                  Citizen Report Card
                </h2>

              </div>


              <span className="hidden rounded-md bg-[#f0f2f4] px-3 py-1.5 text-[9px] font-semibold text-gray-600 sm:block">
                Filed by {complaint.filedBy}
              </span>

            </div>


            {/* Category / Impact */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <InfoBox
                label="CATEGORY"
                value={complaint.category}
                icon={<Building2 size={14} />}
              />

              <InfoBox
                label="IMPACT LEVEL"
                value={complaint.impactLevel}
                icon={<AlertTriangle size={14} />}
              />

            </div>


            {/* Location */}

            <div className="mt-3">

              <InfoBox
                label="INCIDENT LOCATION"
                value={complaint.location}
                secondary={complaint.landmark}
                icon={<MapPin size={14} />}
              />

            </div>


            {/* Description */}

            <div className="mt-5">

              <h3 className="mb-3 text-[9px] font-bold tracking-wide text-gray-700">
                DESCRIPTION
              </h3>

              <p className="text-xs leading-6 text-gray-700">
                {complaint.description}
              </p>

            </div>


            {/* Photographic Evidence */}

            {complaint.photos?.length > 0 && (

              <div className="mt-6">

                <div className="mb-3 flex items-center justify-between">

                  <h3 className="text-[9px] font-bold tracking-wide text-gray-700">
                    CITIZEN PHOTOGRAPHIC EVIDENCE (
                    {complaint.photos.length}
                    )
                  </h3>

                  <span className="text-[9px] text-gray-500">
                    Geotagged • Verified
                  </span>

                </div>


                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                  {complaint.photos.map((photo) => (

                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-xl border border-gray-100"
                    >

                      <div className="h-40 bg-gray-100">

                        <img
                          src={photo.src}
                          alt={photo.title}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display =
                              "none";
                          }}
                        />

                      </div>


                      <div className="flex items-center justify-between px-3 py-2.5">

                        <div>

                          <p className="text-[10px] font-semibold text-gray-800">
                            {photo.title}
                          </p>

                          <p className="mt-0.5 text-[9px] text-gray-500">
                            {photo.uploaded}
                          </p>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )}

          </section>


          {/* =================================================
              AUTHORITY PROGRESS
          ================================================= */}

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center justify-between">

              <div className="flex items-center gap-2">

                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ffe0d5] text-[#b83205]">
                  <Users size={17} />
                </div>

                <h2 className="text-base font-semibold">
                  Authority Progress & Resolution
                </h2>

              </div>

              <span className="hidden rounded-full bg-[#edf0f2] px-3 py-1.5 text-[9px] font-semibold text-gray-600 sm:block">
                Field Unit Engaged
              </span>

            </div>


            {/* Department / Officer */}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

              <InfoBox
                label="ASSIGNED DEPARTMENT"
                value={complaint.department}
                secondary={complaint.departmentFull}
                icon={<Building2 size={14} />}
              />

              <InfoBox
                label="ASSIGNED OFFICER"
                value={complaint.officer}
                secondary={complaint.officerDesignation}
                icon={<Users size={14} />}
              />

            </div>


            {/* Progress Note */}

            <div className="mt-3 rounded-xl bg-[#f1f3f5] p-4">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <FileText
                    size={14}
                    className="text-[#b83205]"
                  />

                  <h3 className="text-xs font-semibold">
                    Progress Notes from Officer
                  </h3>

                </div>

                <span className="text-[9px] text-gray-500">
                  Logged at 02:00 PM
                </span>

              </div>


              <p className="mt-3 rounded-lg bg-white p-3 text-[11px] italic leading-5 text-gray-700">
                "{complaint.progressNote}"
              </p>


              <div className="mt-3 flex flex-col gap-2 text-[10px] sm:flex-row sm:items-center sm:justify-between">

                <span className="flex items-center gap-1.5">

                  <Clock3
                    size={13}
                    className="text-emerald-500"
                  />

                  Estimated Completion:
                  <strong>
                    {complaint.estimatedCompletion}
                  </strong>

                </span>


                <span className="flex items-center gap-1.5">

                  <span className="h-2 w-2 rounded-full bg-[#ff5b27]" />

                  {complaint.crewMembers} Crew Members Active On Site

                </span>

              </div>

            </div>


            {/* Progress */}

            <div className="mt-5">

              <div className="mb-2 flex items-center justify-between">

                <span className="text-[9px] font-bold tracking-wide text-gray-700">
                  CURRENT RESOLUTION STAGE
                </span>

                <span className="text-[10px] font-semibold text-[#b83205]">
                  {complaint.progress}% Progress
                </span>

              </div>


              <div className="h-2 overflow-hidden rounded-full bg-[#e4e7e9]">

                <div
                  className="h-full rounded-full bg-[#b83205]"
                  style={{
                    width: `${complaint.progress}%`,
                  }}
                />

              </div>

            </div>

          </section>

        </div>


        {/* ==================================================
            RIGHT COLUMN
        ================================================== */}

        <div className="space-y-6">


          {/* =================================================
              LIFECYCLE
          ================================================= */}

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="mb-5 flex items-center gap-2">

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#102943] text-white">
                <ShieldCheck size={17} />
              </div>

              <h2 className="text-base font-semibold">
                Complaint Lifecycle Tracker
              </h2>

            </div>


            <div className="relative">

              {/* Vertical Line */}

              <div className="absolute bottom-4 left-[10px] top-3 w-px bg-gray-300" />


              <div className="space-y-5">

                {complaint.lifecycle.map(
                  (item, index) => (

                    <div
                      key={index}
                      className="relative flex gap-3"
                    >

                      {/* Circle */}

                      <div
                        className={`relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          item.active
                            ? "bg-[#ff6a32] text-white"
                            : item.completed
                            ? "bg-emerald-400 text-[#064e3b]"
                            : "border border-gray-300 bg-white text-gray-400"
                        }`}
                      >

                        {item.active ? (
                          <Clock3 size={11} />
                        ) : item.completed ? (
                          <CheckCircle2 size={11} />
                        ) : (
                          <Clock3 size={10} />
                        )}

                      </div>


                      {/* Content */}

                      <div
                        className={`min-w-0 flex-1 ${
                          item.active
                            ? "rounded-lg bg-[#f0f2f4] p-2.5"
                            : ""
                        }`}
                      >

                        <div className="flex flex-wrap items-center gap-2">

                          <h3
                            className={`text-xs font-medium ${
                              item.active
                                ? "text-[#b83205]"
                                : item.upcoming
                                ? "text-gray-500"
                                : "text-gray-800"
                            }`}
                          >
                            {item.title}
                          </h3>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${
                              item.active
                                ? "bg-[#ffdcd1] text-[#b83205]"
                                : item.upcoming
                                ? "bg-gray-100 text-gray-500"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {item.step}
                          </span>

                        </div>


                        <p className="mt-1 text-[9px] leading-4 text-gray-500">
                          {item.description}
                        </p>


                        {item.date && (
                          <p
                            className={`mt-1 text-[9px] ${
                              item.active
                                ? "font-semibold text-[#b83205]"
                                : "text-gray-700"
                            }`}
                          >
                            {item.date}
                          </p>
                        )}

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          </section>


          {/* =================================================
              HELP CARD
          ================================================= */}

          <section className="rounded-xl bg-[#102943] p-5 text-white shadow-md">

            <div className="flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <HelpCircle size={19} />
              </div>

              <div>

                <h2 className="text-base font-semibold">
                  Need Assistance?
                </h2>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  We are here to support your grievance process
                </p>

              </div>

            </div>


            <p className="mt-4 text-[11px] leading-5 text-slate-400">
              Have an update or query regarding this complaint?
              Connect with our digital assistant or speak directly
              to a citizen support representative.
            </p>


            <button className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white text-[11px] font-semibold text-gray-900">
              <MessageCircle size={15} />
              Open Help & Support Chatbot
            </button>


            <button className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#304761] text-[11px] font-semibold text-white">
              <Phone size={15} />
              Call Citizen Support (1916)
            </button>


            <p className="mt-5 text-center text-[9px] font-semibold tracking-wide text-slate-400">
              TOLL-FREE PUBLIC HELPLINE • AVAILABLE 24×7
            </p>

          </section>


          {/* =================================================
              CITIZEN RIGHTS NOTICE
          ================================================= */}

          <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-2">

              <ShieldCheck
                size={14}
                className="text-emerald-500"
              />

              <span className="text-[9px] font-bold tracking-wide text-gray-600">
                CITIZEN RIGHTS NOTICE
              </span>

            </div>


            <p className="mt-3 text-[10px] leading-5 text-gray-600">
              Once the field officer marks this grievance
              resolved, you will receive an SMS and push
              notification to physically inspect the work and
              confirm satisfaction before official closure.
            </p>

          </section>

        </div>

      </main>

    </div>
  );
}


// ============================================================
// INFO BOX
// ============================================================

function InfoBox({
  label,
  value,
  secondary,
  icon,
}) {
  return (
    <div className="rounded-lg bg-[#f0f2f4] px-3 py-2.5">

      <p className="text-[9px] font-bold tracking-wide text-gray-700">
        {label}
      </p>

      <div className="mt-1 flex items-start gap-2">

        <span className="mt-0.5 text-[#b83205]">
          {icon}
        </span>

        <div>

          <p className="text-[11px] font-medium text-gray-900">
            {value}
          </p>

          {secondary && (
            <p className="mt-0.5 text-[9px] text-gray-500">
              {secondary}
            </p>
          )}

        </div>

      </div>

    </div>
  );
}


// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({
  status,
  type,
}) {

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
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-semibold ${styles[type]}`}
    >

      {type === "progress" && (
        <Clock3 size={11} />
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


export default MyComplaintDetails;