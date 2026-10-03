import { FiPhone } from "react-icons/fi";

export default function AuthorityFooter() {
  return (
    <footer className="mt-10 bg-[#071d35] text-white">
      <div className="mx-auto max-w-[1500px] px-5 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="text-2xl">🏛️</div>
              <span className="text-lg font-bold">NagrikSetu</span>
            </div>

            <span className="mb-3 inline-block rounded bg-orange-500 px-2 py-1 text-[9px] font-bold uppercase text-white">
              Official Statutory System
            </span>

            <p className="text-xs leading-5 text-gray-300">
              Official Municipal Governance &amp; Civic Administration Command Infrastructure.
              Authorized for jurisdictional ward officers, municipal inspectors,
              and departmental directors.
            </p>

            <p className="mt-4 text-xs text-gray-500">
              Powered by Free &amp; Open Civic Infrastructure
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wide">
              Security &amp; Protocols
            </h4>
            <div className="space-y-3 text-xs text-gray-400">
              <p>Audited Statutory Compliance</p>
              <p>2FA Access Protocol</p>
              <p>Municipal Ward Hierarchy</p>
              <p>Confidentiality Charters</p>
            </div>
          </div>

          <div className="xl:col-span-2">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wide">
              Civic Emergency Helpdesk
            </h4>
            <div className="max-w-[350px] rounded-xl bg-[#020f20] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] uppercase text-gray-400">
                    Toll-Free Authority Desk
                  </p>
                  <p className="mt-1 text-xl font-bold">1916</p>
                </div>
                <FiPhone size={24} className="text-orange-500" />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Active 24/7 for critical civic failures, pipeline breaches,
              and urgent ward safety.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-5 text-[10px] text-gray-500 md:flex-row">
          <p>
            © 2025 Municipal &amp; Civic Governance Authority.
            All statutory rights reserved.
          </p>
          <div className="flex flex-wrap gap-5">
            <span>Privacy Statement</span>
            <span>Citizen Charter</span>
            <span>Dispute Resolution</span>
          </div>
        </div>
      </div>
    </footer>
  );
}