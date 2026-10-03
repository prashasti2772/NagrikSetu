import { resolutionSteps } from "../../data/homeData";

export default function ResolutionProcess() {
  return (
    <section className="bg-[#f7f9fa] px-5 py-14 lg:px-8">

      <div className="mx-auto max-w-[1380px]">

        <div className="mb-8 flex items-end justify-between">

          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-orange-500">
              Transparent Lifecycle
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              How NagrikSetu Resolves
              <br />
              Grievances
            </h2>

            <p className="mt-3 max-w-xl text-xs leading-5 text-slate-500">
              From civic complaint logging to public validation, every step
              is recorded on a transparent digital ledger.
            </p>
          </div>

          <a
            href="/sla"
            className="hidden text-xs font-medium text-orange-500 sm:block"
          >
            Read Citizen Charter SLAs →
          </a>

        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {resolutionSteps.map((step, index) => (
            <div
              key={step.title}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >

              <div
                className={`mb-7 flex h-8 w-8 items-center justify-center rounded-lg ${
                  index === 0
                    ? "bg-orange-50 text-orange-500"
                    : index === 1
                    ? "bg-blue-50 text-blue-600"
                    : index === 2
                    ? "bg-slate-100 text-slate-700"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {index === 0
                  ? "▣"
                  : index === 1
                  ? "⌁"
                  : index === 2
                  ? "◷"
                  : "✓"}
              </div>

              <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-400">
                {step.phase}
              </p>

              <h3 className="mt-2 text-sm font-semibold text-slate-900">
                {step.number} {step.title}
              </h3>

              <p className="mt-2 text-[10px] leading-5 text-slate-500">
                {step.description}
              </p>

              <p className="mt-5 text-[9px] text-slate-500">
                ◉ {step.footer}
              </p>

            </div>
          ))}

        </div>

      </div>
    </section>
  );
}