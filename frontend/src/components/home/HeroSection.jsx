export default function HeroSection() {
  return (
    <section className="bg-[#f7f9fa] px-5 py-10 lg:px-8 lg:py-14">
      <div className="mx-auto grid max-w-[1380px] items-center gap-10 lg:grid-cols-[1fr_420px]">
        <div>
          <h1 className="max-w-[650px] text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-[52px]">
            Report Civic Issues.
            <br />
            <span className="text-orange-500">Track Real Change.</span>
          </h1>

          <p className="mt-5 max-w-[590px] text-sm leading-6 text-slate-600">
            AI-assisted civic grievance tracking with transparent follow-up and citizen verification.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href="/report-issue" className="rounded-lg bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600">
              Report Issue →
            </a>
            <a href="/track-complaint" className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800">
              Track Complaint
            </a>
          </div>

          <p className="mt-8 max-w-[590px] text-[10px] leading-5 text-slate-500">
            Report → AI-assisted triage &amp; routing → Track &amp; escalate → Verify resolution / reopen
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="rounded-xl bg-[#0c2239] p-5 text-white">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-orange-300">
              One report, one timeline
            </p>
            <h2 className="mt-2 text-xl font-bold">From report to verification</h2>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Keep updates, evidence, and follow-up together so citizens can track progress clearly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 py-3">
            {['Report', 'AI-assisted triage & routing', 'Track & escalate', 'Verify resolution / reopen'].map((step, index) => (
              <div key={step} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[9px] font-bold text-orange-700">
                  {index + 1}
                </span>
                <span className="text-[9px] font-semibold text-slate-700">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}