import { FiHelpCircle, FiMail } from "react-icons/fi";

export default function EscalationCard() {
  return (
    <div className="rounded-xl bg-[#0c2239] p-5 text-white shadow-sm">

      <h2 className="flex items-center gap-2 text-base font-semibold">
        <FiHelpCircle className="text-orange-400" />
        Escalation &amp; Support
      </h2>

      <p className="mt-4 text-[10px] leading-5 text-slate-300">
        Escalate the same report if the issue remains unresolved. For help using
        NagrikSetu, contact:
      </p>

      <a href="mailto:nagriksetuprashasti@gmail.com" className="mt-4 flex items-center gap-2 break-all text-xs font-bold text-orange-300">
        <FiMail />
        nagriksetuprashasti@gmail.com
      </a>

    </div>
  );
}