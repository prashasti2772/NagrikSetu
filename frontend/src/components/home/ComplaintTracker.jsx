import {useLanguage} from "../../language";
import { useNavigate } from "react-router-dom";

export default function ComplaintTracker() {
 const {t}=useLanguage();
  const navigate = useNavigate();
  return (
    <section className="bg-[#f7f9fa] px-5 py-12 lg:px-8">
      <div className="mx-auto max-w-[1380px]">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#031323] px-7 py-8 shadow-xl lg:flex lg:items-center lg:justify-between lg:px-10">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-orange-400">
              Complaint status
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white lg:text-3xl">
              {t("Have a Complaint ID?")}
            </h2>
            <p className="mt-2 max-w-xl text-[10px] leading-5 text-slate-300">
              Enter your reference number to review the latest update and check whether it is awaiting verification or needs follow-up.
            </p>
          </div>

          <div className="mt-6 w-full max-w-[390px] lg:mt-0">
            <form onSubmit={event => { event.preventDefault(); const id = new FormData(event.currentTarget).get("complaintId"); navigate(`/track-complaint?id=${encodeURIComponent(id)}`); }} className="flex overflow-hidden rounded-lg border-2 border-slate-500 bg-white">
              <input required name="complaintId" type="text" inputMode="numeric" pattern="[1-9][0-9]*" maxLength={20} aria-label={t("Complaint ID")} placeholder={t("Enter complaint ID")} className="min-w-0 flex-1 px-4 py-3 text-xs text-slate-800 outline-none" />
              <button className="bg-orange-500 px-5 text-xs font-bold text-white hover:bg-orange-600">
                {t("Track Now")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
