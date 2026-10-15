export const complaints = [
  {
    id: "NS-2025-8831", date: "Today, 08:42 AM", severity: "HIGH SEVERITY", severityType: "high",
    title: "Major Water Pipeline Rupture", description: "12-inch main supply pipe ruptured near residential sector.",
    category: "Public Health Eng", categoryType: "water", photos: "2 Photo Proofs",
    citizen: "Ramesh V. Sharma", email: "r.sharma.wd14@govmail.in", phone: "+91 98450 •••••", verified: true,
    ward: "Sector 14 Arterial", location: "Subhash Chowk Junction", coordinates: "28.4731° N, 77.0182° E",
    unit: "PHE Rapid Team #3", lead: "Lead: Insp. S. Rathore", initials: "W3", sla: "2h 40m left", slaType: "critical", selected: true,
  },
  {
    id: "NS-2025-8829", date: "Today, 07:15 AM", severity: "CRITICAL EMERGENCY", severityType: "critical",
    title: "Deep Road Cave-In Near Metro", description: "Asphalt collapsed into storm drain opening.",
    category: "Civil Roads Div", categoryType: "road", photos: "3 Incident Photos",
    citizen: "Kavita Swaminathan", email: "kavita.s@delhicivic.in", phone: "+91 97112 •••••", verified: true,
    ward: "Ward 11 - Metro Link", location: "Pillar 142, Ring Road", coordinates: "28.4892° N, 77.0321° E",
    unit: "Road Maintenance Grp B", lead: "Lead: Er. Anoop Das", initials: "RD", sla: "1h 10m left", slaType: "critical", selected: true,
  },
  {
    id: "NS-2025-8794", date: "Yesterday, 16:30", severity: "AUDIT PASSED", severityType: "passed",
    title: "Secondary Garbage Dump Overflow", description: "Overflowing municipal container at market entrance.",
    category: "Solid Waste Dept", categoryType: "waste", photos: "2 Field Clearance Logs",
    citizen: "Harpreet Singh Dhillon", email: "dhillon.rwa16@outlook.com", phone: "+91 99880 •••••", verified: true,
    ward: "Sector 16 Market", location: "Behind Community Hall", coordinates: "28.4619° N, 77.0125° E",
    unit: "Sanitation Ward Squad 4", lead: "Officer M. Qureshi", initials: "SW", sla: "Completed in SLA", slaType: "completed", selected: true,
  },
  {
    id: "NS-2025-8772", date: "Yesterday, 11:20 AM", severity: "STANDARD ROUTINE", severityType: "routine",
    title: "8 Pole Dark Spot Near Civil Lines", description: "Phase drop triggered tripping of feeder box.",
    category: "Electrical Grid Unit", categoryType: "electric", photos: "Feeder Box Check",
    citizen: "Sunita Devi", email: "sunita.dpta@nic.in", phone: "+91 94160 •••••", verified: true,
    ward: "Ward 09 - Civil Lines", location: "School Road, Opp Gate #2", coordinates: "28.4550° N, 77.0210° E",
    unit: "DISCOM Line Sub-Team", lead: "Foreman Rajendra", initials: "EL", sla: "14h 15m remaining", slaType: "normal", selected: false,
  },
];

export const complaintWorklistFilters = {
  categories: ["Water & PHE", "All Categories", "Civil Roads", "Sanitation", "Electrical"],
  defaultCategory: "All Categories",
  categoryTypes: {
    "Water & PHE": "water",
    "Civil Roads": "road",
    Sanitation: "waste",
    Electrical: "electric",
  },
  statuses: ["In-Progress", "Resolved", "Pending", "Escalated"],
  wards: ["Ward 14 (Sector 12...)", "Ward 11", "Ward 09", "Ward 16"],
  priorities: ["High Priority", "Critical Only"],
};

export const complaintWorklistSummary = {
  session: "Master Docket Session FY 2025-26",
  criticalSla: "14",
  fieldActive: "87",
  auditedToday: "342",
  totalActiveDockets: 149,
  auditSignature: "SHA256:8831:MINI:SYNC_OK",
  totalPages: 13,
  visiblePages: [1, 2, 3],
};