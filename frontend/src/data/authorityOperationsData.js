export const dispatchCases = [
  { id: "NS-2025-1049", priority: "Critical Priority", category: "Streetlights & Electrical", time: "Reported 45 mins ago", title: "Exposed live electrical cable dangling from pole #42", description: "Cable snapped during morning wind, sparking near vegetable stalls. Children play nearby. Immediate disconnection urgently needed.", location: "Sector 7 Market Crossing (Near Pole #42)", photos: 2, area: "Ward 14" },
  { id: "NS-2025-1048", priority: "High Priority", category: "Roads & Bridges", time: "2 hours ago", title: "Substandard road patch crater causing severe axle damage", description: "Monsoon trench work sinking into asphalt lane right past the flyover desc ramp.", location: "Ring Road Junction, Pillar 108", photos: 1, area: "Ward 12" },
  { id: "NS-2025-1045", priority: "Medium Priority", category: "Sanitation & Waste", time: "3 hours ago", title: "Garbage collection bin overflowing continuously for 3 days", description: "Waste spilling into pedestrian pathway and blocking school turnaround perimeter.", location: "Govt. Girls School Lane, Ward 14", photos: 3, area: "Ward 14" },
  { id: "NS-2025-1041", priority: "Low Priority", category: "Water Supply & Drainage", time: "5 hours ago", title: "Low water pressure reported in residential block C", description: "Supply timer functioning but water head insufficient to reach top two residential tiers.", location: "Ashoka Apartments, Sector 4", photos: 1, area: "Sector 4" },
];

export const dispatchOfficers = [
  { name: "Er. Manpreet Singh", role: "Lead Distribution Eng. · Ward 14 West", status: "Available", activeCases: 3, initials: "MS" },
  { name: "Er. Priya Nair", role: "Safety Inspection Lead · Ward 14 Core", status: "Busy (High Load)", activeCases: 5, initials: "PN" },
  { name: "Er. Vikram Deshmukh", role: "Field Transformer Unit · Sector 7", status: "Available", activeCases: 2, initials: "VD" },
];

export const assignmentHistory = [
  { id: "NS-2025-1044", issue: "Burst water mainline flood", area: "Sector 3 Main Market", department: "Water Supply & Drainage", officer: "Er. Suresh Verma", priority: "Critical (2h)", time: "14 mins ago" },
  { id: "NS-2025-1040", issue: "Streetlight cluster non-functional", area: "Ring Road Flyover Lane 2", department: "DISCOM Electrical", officer: "Er. Vikram Deshmukh", priority: "High (24h)", time: "1h 12m ago" },
  { id: "NS-2025-1037", issue: "Illegal debris dumping on sidewalk", area: "Civil Hospital Perimeter", department: "Solid Waste Dept", officer: "Er. Ananya Joshi", priority: "Medium (48h)", time: "2h 45m ago" },
  { id: "NS-2025-1032", issue: "Pothole repair patch failed", area: "Outer Bypass Road KM 4", department: "PWD Roads", officer: "Er. Deepa Sundaram", priority: "Low (72h)", time: "4h 10m ago" },
];

export const verificationCase = {
  id: "NS-2025-1018",
  priority: "Priority Review Case",
  area: "Ward 14 • Station Feeder Road",
  department: "Public Works (Roads)",
  title: "Deep pothole on Carriage Way",
  complaint: "Station Feeder Road, near Metro Gate 2",
  citizenNote: "Pothole was only partially filled with loose gravel and washed away with evening rain.",
  technicalRemarks: "Send crew with hot asphalt mix. Complete roller compaction required. Quality audit mandatory prior to second closure.",
};

export const citizenFeedback = [
  { id: "NS-2025-1018", issue: "Deep Pothole on Carriage Way", detail: "Station Feeder Road, near Metro Gate 2", department: "PWD (Roads)", date: "23 Oct 2025", action: "Reopened", rating: "1.0 ★", status: "Reopened" },
  { id: "NS-2025-1014", issue: "Broken Water Mains Pipeline", detail: "Cross Lane 4, Shanti Nagar", department: "Water & Sewerage", date: "22 Oct 2025", action: "Verified Satisfactory", rating: "5.0 ★", status: "Verified" },
  { id: "NS-2025-1009", issue: "Non-Functional High-Mast Light", detail: "Community Park Junction, Sector B", department: "Electrical Dept", date: "23 Oct 2025", action: "Awaiting Citizen", rating: "—", status: "Pending" },
  { id: "NS-2025-0994", issue: "Overflowing Solid Waste Compactor", detail: "Municipal Market Gate 3", department: "Sanitation & SWM", date: "21 Oct 2025", action: "Verified Satisfactory", rating: "4.0 ★", status: "Verified" },
];

export const analyticsData = {
  received: [82, 94, 86, 96],
  resolved: [64, 78, 77, 70],
  weeks: ["Week 1", "Week 2", "Week 3", "Week 4"],
  categories: [
    { name: "Roads & Bridges", count: 124, percent: 36, color: "bg-slate-800" },
    { name: "Water Supply & Drainage", count: 92, percent: 26, color: "bg-slate-600" },
    { name: "Sanitation & Waste", count: 78, percent: 22, color: "bg-emerald-600" },
    { name: "Streetlights & Electrical", count: 54, percent: 16, color: "bg-orange-600" },
  ],
  departments: [
    { name: "PWD Roads & Bridges", subtitle: "Public Works Directorate", complaints: 124, reopened: 18, resolved: 98, citizenRating: "4.4" },
    { name: "PHE Jal Board (Water & Drainage)", subtitle: "Public Health Engineering Division", complaints: 92, reopened: 14, resolved: 74, citizenRating: "4.6" },
    { name: "Municipal Sanitation", subtitle: "Solid Waste & Cleansing Action", complaints: 78, reopened: 9, resolved: 67, citizenRating: "4.7" },
    { name: "DISCOM Electrical", subtitle: "Grid Maintenance & Public Illumination", complaints: 54, reopened: 7, resolved: 45, citizenRating: "4.8" },
  ],
};

export const officers = [
  { name: "Er. Anil Salve", id: "#PWD-RD-4412", department: "PWD Roads", phone: "+91 96194-55100", email: "anil.salve@pwd.gov.in", activeCases: 6, resolved: 89, status: "Busy", zone: "Ward 14" },
  { name: "Er. Ananya Joshi", id: "#SWM-SAN-3109", department: "Sanitation", phone: "+91 7651-22904", email: "ananya.joshi@swm.gov.in", activeCases: 1, resolved: 54, status: "Available", zone: "Ward 12" },
  { name: "Er. Vikram Deshmukh", id: "#DIS-EL-2056", department: "Electrical", phone: "+91 98201-44129", email: "vikram.d@discom.gov.in", activeCases: 2, resolved: 67, status: "Available", zone: "Sector 7" },
  { name: "Er. Suresh Verma", id: "#PHE-WS-1084", department: "Water Supply", phone: "+91 98111-83022", email: "suresh.verma@phe.gov.in", activeCases: 4, resolved: 72, status: "On Shift", zone: "Sector 4" },
  { name: "Er. Priya Nair", id: "#SAN-INS-2910", department: "Sanitation", phone: "+91 98711-22100", email: "priya.nair@swm.gov.in", activeCases: 5, resolved: 61, status: "Busy", zone: "Ward 14" },
  { name: "Er. Deepa Sundaram", id: "#PWD-RD-1482", department: "PWD Roads", phone: "+91 99871-45011", email: "deepa.s@pwd.gov.in", activeCases: 2, resolved: 76, status: "Available", zone: "Outer Bypass" },
];

export const departments = [
  { name: "PWD Roads & Bridges", department: "Road Infrastructure Division", icon: "road", status: "Normal Operation", complaints: 18, total: 98, staffing: "7 Field Eng.", lead: "Er. Ramesh Verma", priorityScope: "Potholes, road cave-ins, footpaths, divider repairs" },
  { name: "PHE Jal Board", department: "Water Supply & Drainage", icon: "water", status: "High Volume", complaints: 14, total: 74, staffing: "6 Field Eng.", lead: "Er. Sunita Kulkarni", priorityScope: "Pipe bursts, low pressure, contaminated water, open drains" },
  { name: "Municipal Sanitation", department: "Solid Waste Management", icon: "sanitation", status: "Normal Operation", complaints: 9, total: 67, staffing: "5 Supervisors", lead: "Sh. Rajesh Verma", priorityScope: "Overflowing bins, illegal dumping, street sweeping" },
  { name: "DISCOM Electrical", department: "Grid & Street Lighting Division", icon: "electric", status: "Normal Operation", complaints: 7, total: 45, staffing: "6 Line Techs", lead: "Er. Deepak Sharma", priorityScope: "Exposed wires, non-functional streetlights, transformer faults" },
];

export const routingRules = [
  { department: "PWD Roads", categories: "Potholes · Road cave-in · Footpath blockage", contact: "+91 020 2550 1481", authority: "SE Ramesh Chandra", escalation: "Tier 2" },
  { department: "PHE Jal Board", categories: "Main line burst · Low pressure · Drainage overflow", contact: "+91 020 2550 8200", authority: "SE Sunita Kulkarni", escalation: "Tier 2" },
  { department: "Municipal Sanitation", categories: "Garbage dumps · Bin clearance · Animal removal", contact: "+91 020 2550 3311", authority: "CSI Rajesh Verma", escalation: "Tier 1" },
  { department: "DISCOM Electrical", categories: "Hanging wires · Dark streetlights · Transformer faults", contact: "+91 020 2550 6700", authority: "EE Deepak Sharma", escalation: "Tier 2" },
];

export const authorityNotifications = [
  { id: "NT-01", type: "citizen", title: "Citizen flagged resolution on complaint #NS-2025-1018", detail: "Pothole was only partially filled with loose gravel and washed away with evening rain.", complaint: "NS-2025-1018", time: "25 mins ago", area: "Ward 14 · Road PWD", action: "Review Verification Dossier", urgent: true },
  { id: "NT-02", type: "triage", title: "New high-priority complaint #NS-2025-1049", detail: "Exposed live electrical cable dangling from pole #42 near Sector 7 Market Crossing.", complaint: "NS-2025-1049", time: "1 hour ago", area: "Sector 7 · DISCOM", action: "Assign Officer", urgent: true },
  { id: "NT-03", type: "progress", title: "Officer submitted completion evidence for #NS-2025-1042", detail: "Er. Suresh Patel uploaded geotagged before/after photographs and marked the water pipeline repair as completed.", complaint: "NS-2025-1042", time: "2 hours ago", area: "PHE Division", action: "Audit Evidence", urgent: false },
  { id: "NT-04", type: "resolved", title: "Citizen confirmed satisfactory resolution #NS-2025-1014", detail: "The main water line replacement was verified and the case metrics were updated.", complaint: "NS-2025-1014", time: "4 hours ago", area: "Closed", action: "View Archive", urgent: false },
  { id: "NT-05", type: "assignment", title: "Officer reassignment requested", detail: "Er. Priya Nair requested transfer of complaint #NS-2025-1033 due to overlapping field schedules.", complaint: "NS-2025-1033", time: "5 hours ago", area: "Sanitation Ops", action: "Manage Assignment", urgent: false },
];