import {useLanguage} from "../../language";
import {api} from "../../services/api";
import {resolveCategory} from "../../services/categoryDirectory";
import {Link} from "react-router-dom";
import { useLocation } from "react-router-dom";
import LocationPicker from "../common/LocationPicker";
import { useEffect, useState } from "react";
import {
  FiCamera,
  FiCheckCircle,
  FiChevronDown,
  FiMapPin,
  FiShield,
  FiArrowRight,
  FiInfo,
  FiFileText,
} from "react-icons/fi";

import {
  issueCategories,
  severityLevels,
} from "../../data/reportIssueData";

export default function ReportForm() {
 const {t}=useLanguage();
  const { state } = useLocation();
  const [location, setLocation] = useState(state?.draft?.location || null);
  const [busy,setBusy]=useState(false);
  const [created,setCreated]=useState(null);
  const [pendingPhotos,setPendingPhotos]=useState([]);
  const [departments,setDepartments]=useState([]);
  const [departmentsLoading,setDepartmentsLoading]=useState(true);
  const [departmentError,setDepartmentError]=useState("");

  const [review, setReview] = useState(false);
  const [notice, setNotice] = useState("");

  const [category, setCategory] = useState(new URLSearchParams(window.location.search).get("category") || issueCategories[0]);
  const loadDepartments=()=>{setDepartmentsLoading(true);setDepartmentError("");api("/departments").then(rows=>{if(!Array.isArray(rows))throw new Error("The backend returned invalid categories. Please try again.");setDepartments(rows);setCategory(current=>resolveCategory(current,rows));if(!rows.length)setDepartmentError("No issue categories are available. Please contact support.");}).catch(e=>setDepartmentError(e.message)).finally(()=>setDepartmentsLoading(false));};
  useEffect(()=>{Promise.resolve().then(loadDepartments);},[]);
  const [severity, setSeverity] = useState("high");
  const [description, setDescription] = useState(state?.draft?.text || "");
  const [headline, setHeadline] = useState(
    ""
  );
  const [identityMasked, setIdentityMasked] = useState(false);
  const [photos, setPhotos] = useState(state?.draft?.file ? [state.draft.file] : []);

  const [photoPreview, setPhotoPreview] = useState("");
  useEffect(() => {
    if (!photos[0]) { setPhotoPreview(""); return; }
    const url = URL.createObjectURL(photos[0]); setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photos]);

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files || []);

    if (files.some(file => !["image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024)) { setNotice("Choose images up to 10 MB each."); event.target.value = ""; return; }
    setPhotos(files.slice(0, 3));
  };

  const uploadPhotos=async(id,files)=>{
    const remaining=[];for(const file of files){try{const body=new FormData();body.set("file",file);body.set("evidence_type","report");await api(`/complaints/${id}/evidence/upload`,{method:"POST",body});}catch(e){remaining.push(file);setNotice(`Complaint #${id} was created. Image upload failed: ${e.message}. Retry below or on complaint details.`);}}
    setPendingPhotos(remaining);return remaining;
  };
  const confirmReport=async()=>{
    if(busy || created)return;setBusy(true);setNotice("");
    try{const c=await api("/complaints",{method:"POST",body:{title:headline.trim(),description:description.trim(),category,severity,latitude:location?.latitude ?? null,longitude:location?.longitude ?? null,address:location?.address || null}});setCreated(c);setReview(false);const failed=await uploadPhotos(c.id,photos);if(!failed.length)setNotice(`Complaint #${c.id} submitted successfully.`);}
    catch(e){setNotice(e.message);}finally{setBusy(false);}
  };
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!headline.trim() || !description.trim()) { setNotice("Add a headline and description before reviewing."); return; }
    setNotice(""); setReview(true);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:p-7"
    >

      {/* Category */}
      <div className="mb-5">

        <div className="mb-2 flex items-center justify-between">

          <label htmlFor="issue-category" className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <FiFileText className="text-orange-600" size={15} />
            {t("Issue Category")}
            <span className="text-red-500">*</span>
          </label>

          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-600">
            <FiCheckCircle size={12} />
            {t("Manual category selection")}
          </span>

        </div>

        <div className="relative">

          <select
            id="issue-category" required value={category} disabled={departmentsLoading || !departments.length}
            onChange={(event) => setCategory(event.target.value)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="">{departmentsLoading ? t("Loading categories...") : !departments.length ? t("Categories unavailable") : t("Choose a category")}</option>
            {departments.map(d=>d.name).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <FiChevronDown
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-600"
            size={16}
          />

        </div>

        {departmentError && <p role="alert" className="mt-2 text-xs text-amber-900">{departmentError}<button type="button" disabled={departmentsLoading} onClick={loadDepartments} className="ml-2 underline">{t("Retry categories")}</button></p>}
        <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
          <FiInfo size={12} />
          {t("Choose the category and severity. ML suggestions are pending.")}
        </p>

      </div>

      {/* Headline */}
      <div className="mb-5">

        <label htmlFor="issue-headline" className="mb-2 block text-sm font-semibold text-slate-900">
          {t("Grievance Headline / Summary")}
          <span className="ml-1 text-red-500">*</span>
        </label>

        <input
          id="issue-headline" required maxLength={200} value={headline}
          onChange={(event) => setHeadline(event.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />

      </div>

      {/* Description */}
      <div className="mb-6">

        <div className="mb-2 flex justify-between">

          <label htmlFor="issue-description" className="text-sm font-semibold text-slate-900">
            {t("Detailed Description & Ground Impact")}
            <span className="ml-1 text-red-500">*</span>
          </label>

          <span className="text-[10px] text-slate-500">
            {description.length} / 600
          </span>

        </div>

        <textarea id="issue-description"
          required maxLength={600} value={description}
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
              Choose optional civic evidence with{" "}
              <span className="text-orange-500">
                Browse
              </span>
            </span>

            <span className="mt-2 text-[9px] text-slate-500">
              Up to 3 images, 10 MB each. No automatic metadata extraction.
            </span>

            <span className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
              <FiMapPin size={11} />
              SELECT INCIDENT LOCATION BELOW
            </span>

          </label>

          <div className="relative min-h-[120px] overflow-hidden rounded-xl bg-slate-200">

            {photos.length > 0 ? (
              <img
                src={photoPreview}
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
            Jurisdiction pending review
          </span>

        </div>

        <LocationPicker value={location} onChange={setLocation} />
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
          disabled checked={identityMasked}
          onChange={(event) => setIdentityMasked(event.target.checked)}
          className="mt-1 h-4 w-4 accent-orange-500"
        />

        <span>
          <span className="block text-xs font-semibold text-slate-800">
            Identity masking unavailable; complaints are scoped to your account and authorized staff
          </span>

          <span className="mt-1 block text-[9px] leading-4 text-slate-500">
            Privacy preference for future submission. Avoid including personal details in public evidence.
          </span>
        </span>

      </label>

      <p className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Possible same incident? Check existing reports before submitting. Duplicate detection awaits API integration; follow or escalate the same report when possible.</p>
      {notice && <p role="status" className="mb-4 text-sm text-amber-800">{notice}</p>}
      {review && <section aria-label="Confirm report draft" className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-4"><h2 className="font-bold">Confirm report draft</h2><p className="mt-2 break-words text-sm">{headline}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{description}</p><p className="mt-2 text-xs">{category} ? {severity} ? {photos.length} image(s) ? {location?.address || (location?.latitude!=null ? `${location.latitude}, ${location.longitude}` : "No location supplied")} ? {identityMasked ? "Identity masking requested" : "Identity masking not requested"}</p><p className="my-3 text-xs">Confirm to submit this report. Images upload after creation; a failed image upload does not discard your report. Identity masking is unavailable.</p><button type="button" onClick={() => setReview(false)} className="rounded border px-3 py-2 text-xs">Edit draft</button><button type="button" disabled={busy || !!created} onClick={confirmReport} className="ml-2 rounded bg-orange-600 px-3 py-2 text-xs text-white">{busy?"Submitting...":"Submit complaint"}</button></section>}
      {created && <section className="mb-4 rounded bg-emerald-50 p-4"><Link className="text-orange-700 underline" to={`/my-complaints/${created.id}`}>View complaint #{created.id}</Link>{pendingPhotos.length>0 && <button type="button" disabled={busy} onClick={async()=>{setBusy(true);const remaining=await uploadPhotos(created.id,pendingPhotos);if(!remaining.length)setNotice("All evidence uploaded.");setBusy(false);}} className="ml-4 underline">Retry failed images</button>}</section>}
      {/* Submit */}
      <div className="flex flex-col items-center justify-between gap-5 border-t border-slate-100 pt-5 sm:flex-row">

        <span className="flex items-center gap-2 text-[10px] text-slate-500">
          <FiShield className="text-orange-500" size={14} />
          AI-assisted civic grievance tracking and citizen-verified resolution
        </span>

        <button
          type="submit" disabled={busy || !!created || departmentsLoading || !departments.length}
          className="flex items-center gap-3 rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600"
        >
          Review report draft
          <FiArrowRight size={16} />
        </button>

      </div>

    </form>
  );
}
