import {
  MapPin,
  Navigation,
} from "lucide-react";

const ComplaintMap = ({ map }) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">
            Spatial Validation
          </p>

          <h2 className="text-lg font-medium text-slate-900">
            Incident Geo-Perimeter
          </h2>
        </div>

        <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-500">
          <Navigation className="h-3 w-3" />
          {map.radius}
        </span>
      </div>

      <div className="relative h-48 overflow-hidden rounded-lg bg-slate-200">
        <img
          src="https://images.unsplash.com/photo-1524666041070-9d87656c25bb?auto=format&fit=crop&w=1000&q=80"
          alt="Incident location map"
          className="h-full w-full object-cover opacity-80"
        />

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-orange-200 bg-orange-500 shadow-lg">
            <MapPin className="h-5 w-5 text-white" />
          </div>

          <span className="absolute left-1/2 top-12 -translate-x-1/2 whitespace-nowrap rounded-full bg-orange-600 px-3 py-1 text-[9px] font-bold text-white shadow">
            Pillar 142 Junction
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-[10px] text-slate-600">
        <p>
          <span className="font-semibold text-slate-900">
            Location Address:
          </span>{" "}
          {map.address}
        </p>

        <p className="mt-2">
          <span className="font-semibold text-slate-900">
            Traffic Impact:
          </span>{" "}
          {map.trafficImpact}
        </p>
      </div>
    </section>
  );
};

export default ComplaintMap;