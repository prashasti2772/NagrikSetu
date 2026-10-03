import { useState } from "react";
import {
  FiCamera,
  FiCheckCircle,
  FiChevronDown,
  FiMapPin,
  FiUploadCloud,
  FiShield,
  FiArrowRight,
  FiInfo,
  FiFileText,
  FiNavigation,
} from "react-icons/fi";

import {
  issueCategories,
  severityLevels,
  reportLocation,
} from "../../data/reportIssueData";

export default function ReportForm() {
  const [category, setCategory] = useState(issueCategories[0]);
  const [severity, setSeverity] = useState("high");
  const [description, setDescription] = useState("");
  const [headline, setHeadline] = useState(
    "Deep Cave-In Near Metro Pillar 142 on Arterial Road"
  );
  const [identityMasked, setIdentityMasked] = useState(false);
  const [photos, setPhotos] = useState([]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files || []);

    setPhotos(files.slice(0, 3));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    console.log({
      category,
      headline,
      description,
      severity,
      identityMasked,
      photos,
      location: reportLocation,
    });

    alert("Demo grievance submitted successfully.");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7"
    >

      {/* Category */}
      <div className="mb-5">

        <div className="mb-2 flex items-center justify-between">

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiFileText className="text-orange-600" size={15} />
            Issue Category
            <span className="text-red-500">*</span>
          </label>

          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">
            <FiCheckCircle size={12} />
            AI Auto-Detect Active
          </span>

        </div>

        <div className="relative">

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            {issueCategories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <FiChevronDown
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600"
            size={16}
          />

        </div>

        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
          <FiInfo size={12} />
          AI suggests category and priority based on description, but you can
          edit freely.
        </p>

      </div>

      {/* Headline */}
      <div className="mb-5">

        <label className="mb-2 block text-sm font-semibold text-slate-900">
          Grievance Headline / Summary
          <span className="ml-1 text-red-500">*</span>
        </label>

        <input
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />

      </div>

      {/* Description */}
      <div className="mb-6">

        <div className="mb-2 flex justify-between">

          <label className="text-sm font-semibold text-slate-900">
            Detailed Description & Ground Impact
            <span className="ml-1 text-red-500">*</span>
          </label>

          <span className="text-[10px] text-slate-500">
            {description.length} / 600
          </span>

        </div>

        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value.slice(0, 600))}
          rows={5}
          placeholder="Describe the civic issue, its impact, and any immediate safety concerns."
          className="w-full resize-none rounded-lg border border-slate-200 px-3 py-3 text-sm leading-6 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />

        <p className="mt-2 text-[10px] text-slate-500">
          Include specifics like road stretch, water pressure, or hazardous
          exposure to assist jurisdictional ward teams.
        </p>

      </div>

      {/* Photo upload */}
      <div className="mb-6">

        <div className="mb-2 flex items-center justify-between">

          <label className="flex items-center gap-2 text-sm font-semibold">
            <FiCamera className="text-orange-600" size={16} />
            Photographic Proof & Geotagged Evidence
          </label>

          <span className="text-[10px] text-slate-500">
            Up to 3 photos (Max 10MB each)
          </span>

        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_180px]">

          <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl bg-slate-100 p-5 text-center transition hover:bg-slate-200">

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />

            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-orange-500 shadow-sm">
              <FiCamera size={20} />
            </span>

            <span className="text-sm font-semibold text-slate-700">
              Drag & Drop civic evidence or{" "}
              <span className="text-orange-500">
                Browse
              </span>
            </span>

            <span className="mt-2 text-[9px] text-slate-500">
              EXIF timestamp & GPS auto-extracted on upload
            </span>

            <span className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
              <FiMapPin size={11} />
              GEOTAG VERIFICATION ENABLED
            </span>

          </label>

          <div className="relative min-h-[120px] overflow-hidden rounded-xl bg-slate-200">

            {photos.length > 0 ? (
              <img
                src={URL.createObjectURL(photos[0])}
                alt="Uploaded civic evidence"
                className="h-full min-h-[120px] w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-xs text-slate-400">
                Uploaded evidence
                <br />
                preview
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Location */}
      <div className="mb-6">

        <div className="mb-2 flex items-center justify-between">

          <label className="flex items-center gap-2 text-sm font-semibold">
            <FiMapPin className="text-orange-600" size={16} />
            Jurisdiction & Incident Pinpoint
          </label>

          <span className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-medium text-orange-600">
            Ward 11 - DLF / Metro Link Corridor
          </span>

        </div>

        {/* Map placeholder */}
        <div className="relative h-[150px] overflow-hidden rounded-xl border border-slate-200 bg-[#e8eee5]">

          <div className="absolute inset-0 opacity-60">
            <div className="absolute left-[10%] top-[35%] h-[2px] w-[90%] rotate-[8deg] bg-white" />
            <div className="absolute left-[15%] top-[65%] h-[2px] w-[75%] rotate-[-14deg] bg-white" />
            <div className="absolute left-[35%] top-0 h-full w-[2px] rotate-[18deg] bg-white" />
            <div className="absolute left-[70%] top-0 h-full w-[2px] rotate-[-12deg] bg-white" />

            <div className="absolute left-[25%] top-[15%] h-8 w-8 rounded-full bg-red-400/30" />
            <div className="absolute left-[70%] top-[30%] h-10 w-10 rounded-full bg-blue-400/30" />
          </div>

          <div className="absolute left-[46%] top-[40%] flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg">
            <FiMapPin size={20} />
          </div>

          <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-white px-4 py-2 shadow-lg">

            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-500">
              <FiNavigation size={16} />
            </span>

            <div>
              <p className="text-[10px] font-bold text-slate-800">
                Pinpoint: {reportLocation.latitude}, {reportLocation.longitude}
              </p>

              <p className="text-[9px] text-slate-500">
                Assigned to: {reportLocation.zone}
              </p>
            </div>

            <button
              type="button"
              className="text-[10px] font-semibold text-orange-500"
            >
              Recalibrate
            </button>

          </div>

        </div>

        <label className="mb-2 mt-4 block text-[11px] font-medium text-slate-700">
          Specific Landmark / Access Directions
        </label>

        <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
          <FiNavigation size={15} className="text-slate-500" />
          {reportLocation.landmark}
        </div>

      </div>

      {/* Severity */}
      <div className="mb-6">

        <label className="mb-3 block text-sm font-semibold text-slate-900">
          Severity Level & Public Safety Urgency
          <span className="ml-1 text-red-500">*</span>
        </label>

        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">

          {severityLevels.map((level) => {
            const selected = severity === level.id;

            return (
              <button
                type="button"
                key={level.id}
                onClick={() => setSeverity(level.id)}
                className={`
                  rounded-xl border p-3 text-left transition
                  ${
                    selected
                      ? "border-orange-300 bg-slate-100 ring-1 ring-orange-200"
                      : "border-transparent bg-slate-100 hover:border-slate-300"
                  }
                `}
              >

                <span
                  className={`
                    mb-2 block h-3 w-3 rounded-full
                    ${
                      level.id === "critical"
                        ? "bg-red-600"
                        : level.id === "high"
                        ? "bg-orange-600"
                        : level.id === "medium"
                        ? "bg-slate-400"
                        : "bg-slate-300"
                    }
                  `}
                />

                <span className="block text-xs font-semibold text-slate-900">
                  {level.title}
                </span>

                <span className="mt-1 block text-[9px] text-slate-500">
                  {level.description}
                </span>

              </button>
            );
          })}

        </div>

      </div>

      {/* Privacy */}
      <label className="mb-7 flex cursor-pointer gap-3 rounded-xl bg-slate-100 p-4">

        <input
          type="checkbox"
          checked={identityMasked}
          onChange={(event) => setIdentityMasked(event.target.checked)}
          className="mt-1 h-4 w-4 accent-orange-500"
        />

        <span>
          <span className="block text-xs font-semibold text-slate-800">
            Keep my identity masked on the Public Ward Redressal Feed
          </span>

          <span className="mt-1 block text-[9px] leading-4 text-slate-500">
            Your registered contact number remains accessible only to the
            attending Municipal Ward Inspector for verification purposes.
          </span>
        </span>

      </label>

      {/* Submit */}
      <div className="flex flex-col items-center justify-between gap-5 border-t border-slate-100 pt-5 sm:flex-row">

        <span className="flex items-center gap-2 text-[10px] text-slate-500">
          <FiShield className="text-orange-500" size={14} />
          Backed by Right to Public Service Guarantee
        </span>

        <button
          type="submit"
          className="flex items-center gap-3 rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
        >
          Submit Grievance to Municipal Docket
          <FiArrowRight size={16} />
        </button>

      </div>

    </form>
  );
}