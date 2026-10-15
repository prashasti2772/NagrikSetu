export const resolutionSteps = [
  {
    phase: "PHASE 01",
    number: "1.",
    title: "Report",
    description: "Submit one report with the issue details and supporting information.",
    footer: "Keep one report reference",
  },
  {
    phase: "PHASE 02",
    number: "2.",
    title: "AI Triage",
    description: "AI-assisted triage can help categorize a report for review.",
    footer: "Review before routing",
  },
  {
    phase: "PHASE 03",
    number: "3.",
    title: "Route",
    description: "Route the report to the relevant team for follow-up.",
    footer: "One report, ongoing follow-up",
  },
  {
    phase: "PHASE 04",
    number: "4.",
    title: "Track",
    description: "Follow updates and the status of the same report.",
    footer: "Use the report reference",
  },
  {
    phase: "PHASE 05",
    number: "5.",
    title: "Escalate",
    description: "Escalate the report if the issue remains unresolved.",
    footer: "Continue the existing report",
  },
  {
    phase: "PHASE 06",
    number: "6.",
    title: "Resolution Evidence",
    description: "Review evidence submitted to support a proposed resolution.",
    footer: "Evidence for citizen review",
  },
  {
    phase: "PHASE 07",
    number: "7.",
    title: "Verify or Reopen",
    description: "Verify the resolution or reopen the report if the issue persists.",
    footer: "Citizen-verified resolution",
  },
];

export const civicCategories = [
  {
    id: "roads",
    title: "Potholes & Road Hazards",
    description:
      "Craters, collapsed asphalt, open manholes, missing dividers, and hazardous street debris.",
    action: "Report Road Issue",
  },
  {
    id: "waste",
    title: "Waste & Illegal Dumping",
    description:
      "Overflowing community bins, construction rubble, uncollected residential garbage, plastic burn.",
    action: "Report Waste Issue",
  },
  {
    id: "water",
    title: "Water Pipeline Leaks",
    description:
      "Main conduit bursts, contaminated municipal supply, low pressure blocks, and valve failures.",
    action: "Report Water Issue",
  },
  {
    id: "streetlight",
    title: "Streetlight Outages",
    description:
      "Non-functional public illumination, exposed wiring hazards, damaged lamp posts, dark alleys.",
    action: "Report Lighting Issue",
  },
  {
    id: "drainage",
    title: "Drainage & Sewage",
    description:
      "Monsoon waterlogging, choked storm sewers, overflowing blackwater lines, foul odor spills.",
    action: "Report Sewage Issue",
  },
  {
    id: "parks",
    title: "Parks & Public Spaces",
    description:
      "Broken playground equipment, neglected public gardens, illegal encroachment, fallen trees.",
    action: "Report Parks Issue",
  },
];