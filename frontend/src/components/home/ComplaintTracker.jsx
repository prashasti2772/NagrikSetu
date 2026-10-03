export default function ComplaintTracker() {
  return (
    <section className="bg-[#f7f9fa] px-5 py-12 lg:px-8">

      <div className="mx-auto max-w-[1380px]">

        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#031323] px-7 py-8 shadow-xl lg:flex lg:items-center lg:justify-between lg:px-10">

          <div>
            <p className="text-[8px] font-bold uppercase tracking-widest text-orange-400">
              Fast-Track Status Search
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white lg:text-3xl">
              Have an Existing Complaint ID?
            </h2>

            <p className="mt-2 max-w-xl text-[10px] leading-5 text-slate-300">
              Check live officer notes, assigned contractors, estimated
              completion date, and stage verification photo updates in one
              click.
            </p>
          </div>

          <div className="mt-6 w-full max-w-[390px] lg:mt-0">

            <div className="flex overflow-hidden rounded-lg border-2 border-slate-500 bg-white">

              <input
                type="text"
                placeholder="e.g. NS-2025-8849"
                className="min-w-0 flex-1 px-4 py-3 text-xs text-slate-800 outline-none"
              />

              <button className="bg-orange-500 px-5 text-xs font-bold text-white hover:bg-orange-600">
                Track Now
              </button>

            </div>

            <p className="mt-2 text-[8px] text-slate-400">
              Looking for ward contact directory?
              <span className="ml-1 text-orange-400 underline">
                Browse Zonal Desks
              </span>
            </p>

          </div>

        </div>

      </div>
    </section>
  );
}