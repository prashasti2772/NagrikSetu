import {
  Wrench,
  Trash2,
  Droplets,
  Waves,
  Lightbulb,
  Trees,
} from "lucide-react";

export const categories = [
  {
    id: 1,
    department: "ROADS DEPARTMENT",
    title: "Potholes & Road Repairs",
    description:
      "Cratered roads, broken road shoulders, illegal speed-breakers, and missing asphalt paving.",
    reports: [
      "Pothole on main road",
      "Damaged footpath",
      "Broken curb",
    ],
    icon: Wrench,
    iconStyle: "bg-gray-100 text-[#b83205]",
    filter: "Roadways",
  },

  {
    id: 2,
    department: "SANITATION DEPARTMENT",
    title: "Garbage & Waste Management",
    description:
      "Overflowing community bins, open dumping on roadsides, and delayed residential door-to-door pickup.",
    reports: [
      "Uncollected garbage",
      "Community bin overflow",
      "Street litter",
    ],
    icon: Trash2,
    iconStyle: "bg-emerald-50 text-emerald-400",
    filter: "Sanitation",
  },

  {
    id: 3,
    department: "WATER SUPPLY DEPARTMENT",
    title: "Water Leakage & Supply",
    description:
      "Burst pipeline, water contamination, low pipeline pressure, and broken public taps.",
    reports: [
      "Main line burst",
      "Contaminated tap water",
      "Low pressure",
    ],
    icon: Droplets,
    iconStyle: "bg-slate-100 text-[#31587e]",
    filter: "Utilities",
  },

  {
    id: 4,
    department: "DRAINAGE & SEWERAGE DEPARTMENT",
    title: "Drainage & Sewerage",
    description:
      "Open storm drain overflows, unsealed manholes, stagnant road water, and blocked sewer conduits.",
    reports: [
      "Clogged drain",
      "Uncovered manhole",
      "Waterlogging",
    ],
    icon: Waves,
    iconStyle: "bg-slate-100 text-[#172c40]",
    filter: "Sanitation",
  },

  {
    id: 5,
    department: "ELECTRICAL DEPARTMENT",
    title: "Streetlights & Electrical",
    description:
      "Flickering or non-operational streetlights, hanging exposed wiring, and dark pedestrian crossings.",
    reports: [
      "Dark road stretch",
      "Broken streetlight",
      "Loose electrical wire",
    ],
    icon: Lightbulb,
    iconStyle: "bg-red-50 text-red-600",
    filter: "Utilities",
  },

  {
    id: 6,
    department: "PARKS & AMENITIES DEPARTMENT",
    title: "Public Parks & Amenities",
    description:
      "Vandalized park equipment, broken boundary railing, fallen tree branches, and overgrown weeds.",
    reports: [
      "Broken children swings",
      "Open park gate",
      "Fallen branch blocking lane",
    ],
    icon: Trees,
    iconStyle: "bg-emerald-50 text-emerald-400",
    filter: "Parks",
  },
];

export const categoryFilters = [
  "All Issues",
  "Roadways",
  "Sanitation",
  "Utilities",
  "Parks",
];