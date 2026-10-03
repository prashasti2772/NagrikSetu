export default function HeroSection() {
  return (
    <section className="bg-[#f7f9fa] px-5 py-10 lg:px-8 lg:py-14">

      <div className="mx-auto grid max-w-[1380px] items-center gap-10 lg:grid-cols-[1fr_420px]">

        {/* Left */}
        <div>

          <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
            ● Civic Intelligence Platform 3.0
          </span>

          <h1 className="mt-6 max-w-[650px] text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[52px]">

            Report Civic Issues.
            <br />

            <span className="text-orange-500">
              Track Real Change.
            </span>

          </h1>

          <p className="mt-5 max-w-[590px] text-sm leading-6 text-slate-600">
            AI-Powered Civic Issue Resolution & Community Verification
            Platform. Bridging citizens and municipal governance for
            transparent, verified urban progress.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">

            <a
              href="/report-issue"
              className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Report Issue →
            </a>

            <a
              href="/track-complaint"
              className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800"
            >
              ◉ Track Complaint
            </a>

          </div>

          <div className="mt-8 flex items-center gap-3 text-[10px] text-slate-500">
            <div className="flex -space-x-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-[7px] text-white">
                WB
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[7px] text-white">
                ND
              </span>
              <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-500 text-[7px] text-white">
                MH
              </span>
            </div>

            <span>
              Verified by 280+ Ward Nodal Officers & tamper-proof
              cryptographic audit trails.
            </span>
          </div>
        </div>

        {/* Right dashboard preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">

          <div className="relative h-[205px] overflow-hidden rounded-xl bg-gradient-to-br from-sky-200 to-slate-300">

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl">🏛️</div>
                <p className="mt-2 text-sm font-bold text-slate-800">
                  CENTRAL MUNICIPAL HUB
                </p>
              </div>
            </div>

            <div className="absolute bottom-3 left-3">
              <span className="text-[9px] text-white">
                ◉ WARD OPERATIONS CENTER
              </span>

              <p className="text-lg font-bold text-white">
                Central Municipal Hub
              </p>
            </div>

            <div className="absolute bottom-3 right-3 text-right text-[9px] text-white">
              <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
              Network Status
              <br />
              Operational
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 py-3">

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[8px] uppercase text-slate-500">
                Today's Inflow
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                1,428
              </p>

              <p className="text-[8px] text-green-500">
                ↑ 18% routed via AI
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-[8px] uppercase text-slate-500">
                Dispatched Crews
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                384
              </p>

              <p className="text-[8px] text-slate-500">
                Across 48 Zonal Sectors
              </p>
            </div>

          </div>

          <div className="flex items-center justify-between rounded-lg bg-[#071b2f] px-3 py-2 text-white">

            <div>
              <p className="text-[9px] font-semibold">
                Pothole fixed at MG Road Crossing
              </p>

              <p className="text-[8px] text-slate-300">
                Resolved in 42m • Ward 14
              </p>
            </div>

            <span className="rounded-full bg-green-400 px-2 py-1 text-[7px] font-bold text-slate-900">
              VERIFIED
            </span>

          </div>
        </div>

      </div>
    </section>
  );
}