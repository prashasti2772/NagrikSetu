import {
  FiClock,
  FiHelpCircle,
  FiPhone,
} from "react-icons/fi";

export default function EscalationCard() {
  return (
    <div className="rounded-xl bg-[#0c2239] p-5 text-white shadow-sm">

      <h2 className="flex items-center gap-2 text-base font-semibold">
        <FiHelpCircle className="text-orange-400" />
        Escalation Helpline
      </h2>

      <p className="mt-4 text-[10px] leading-5 text-slate-300">
        Need immediate clarification regarding an unaddressed docket past
        the 48-hour SLA deadline?
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs font-bold">
        <FiPhone className="text-orange-400" />
        1800-11-CIVIC (Ext 4)
      </div>

      <div className="mt-3 flex items-center gap-2 text-[9px] text-slate-300">
        <FiClock />
        Mon - Sat: 08:00 AM - 08:00 PM IST
      </div>

    </div>
  );
}