export const issueCategories = [
  "Potholes / Road Damage",
  "Waste & Illegal Dumping",
  "Water Pipeline Leaks",
  "Streetlight Outages",
  "Drainage & Sewage",
  "Parks & Public Spaces",
];

export const severityLevels = [
  {
    id: "low",
    title: "Low",
    description: "Cosmetic, no hazard",
  },
  {
    id: "medium",
    title: "Medium",
    description: "Moderate disruption",
  },
  {
    id: "high",
    title: "High",
    description: "Accident prone area",
  },
  {
    id: "critical",
    title: "Critical",
    description: "Immediate collapse",
  },
];

export const resolutionTips = [
  "Clear daytime photo capturing road context from 2–3 different angles.",
  "Exact nearest landmark or electrical pole/pillar number for rapid field crew dispatch.",
  "Safety hazard indicator highlighted if live wires, water main rupture, or school zones are impacted.",
  "Avoid duplicate reports for the same issue; keep updates, escalation, and reopening on the original report.",
];

export const reportLocation = {
  latitude: "28.4892° N",
  longitude: "77.0321° E",
  zone: "Zone 3 Engineering Division",
  landmark: "Opposite Community Park Gate #2, Under Metro Pillar 142",
};

export const reportStatus = {
  wardMessage: "One report, ongoing follow-up",
  serviceSla: "Escalate if the issue remains unresolved",
  registryForm: "Track updates and resolution evidence on the same report",
};