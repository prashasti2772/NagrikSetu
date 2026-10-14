import LocationPicker from "../common/LocationPicker";
export default function ComplaintMap({ map }) { return <section className="rounded-xl border bg-white p-4"><h2 className="mb-3 text-lg font-semibold">Incident location</h2><LocationPicker readOnly /><p className="mt-3 text-xs text-slate-600">Sample address: {map?.address}. No verified incident coordinates loaded.</p></section>; }
