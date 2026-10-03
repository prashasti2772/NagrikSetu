export const trackComplaintData = {
  complaint: {
    id: "NS-2025-8829",
    title: "Deep cave-in and broken drainage cover on arterial lane obstructing morning school traffic.",
    category: "CIVIL ROADS & DRAINAGE",
    priority: "CRITICAL EMERGENCY",

    jurisdictionWard: "Ward 11",
    location: "Metro Link Corridor • Zone 3",

    lodgedTimestamp: "Today, 07:22 AM",
    submittedVia: "Via Resident Mobile App",

    assignedUnit: "Road Maintenance Group B",
    assignedOfficer: "Er. Anoop Das, Lead Officer",

    sla: {
      remaining: "1h 10m Remaining",
      target: "Official Target: 4.0 Hrs",
      deadline: "11:22 AM",
    },

    stage: 4,
    totalStages: 6,
  },

  recentQueries: [
    "NS-2025-8829 (Ward 11)",
    "NS-2025-8790 (Streetlight Fault)",
    "+91 98765 43210 (Mobile OTP Track)",
  ],

  timeline: [
    {
      number: 1,
      title: "Submitted",
      time: "07:22 AM",
      status: "completed",
      note: "Automated Ack",
    },
    {
      number: 2,
      title: "Under Review",
      time: "07:30 AM",
      status: "completed",
      note: "Control Cell",
    },
    {
      number: 3,
      title: "Assigned",
      time: "07:45 AM",
      status: "completed",
      note: "Crew Dispatched",
    },
    {
      number: 4,
      title: "In Progress",
      time: "ETA 1h 10m",
      status: "active",
      note: "On-Site Work",
    },
    {
      number: 5,
      title: "Resolved",
      time: "Pending",
      status: "pending",
      note: "Field Sign-Off",
    },
    {
      number: 6,
      title: "Citizen Confirm",
      time: "Pending",
      status: "pending",
      note: "Quality Audit",
    },
  ],

  activities: [
    {
      type: "inspector",
      title: "Inspector Field Status Update",
      time: "08:30 AM",
      description:
        "“Asphalt cold patch deployed; sub-base compaction in progress. Temporary traffic cones placed to secure vehicle clearance along Pillar 142 lane.”",
      meta: "Inspector Rajiv Mehta (ID #CIV-8012)",
      extra: "Compact #MC-09 active",
    },
    {
      type: "crew",
      title: "Field Crew Arrived on Site",
      time: "08:12 AM",
      description:
        "Emergency rapid repair unit logged arrival at Metro Pillar 142 junction. Vehicle #DL-01-EA-4910 checked in via telemetry.",
    },
    {
      type: "route",
      title: "Auto-Routed & Assigned",
      time: "07:45 AM",
      description:
        "Assigned by Central Control dispatch algorithm to Ward 11 Rapid Response Cell based on high vehicle vulnerability index.",
    },
    {
      type: "citizen",
      title: "Grievance Lodged by Citizen",
      time: "07:22 AM",
      description:
        "Submitted by Kavita Swaminathan (Verified Citizen ID #KA-9912). Geo-coordinate signature validated via GPS lock.",
    },
  ],

  map: {
    radius: "15m Radius",
    pinLabel: "Pillar 142 Junction",
    address:
      "Facing Pillar 142, Northbound Lane, Outer Ring Access Road, Ward 11.",
    trafficImpact: "Moderate diversion in effect via Sub-Lane 2B.",
  },

  proof: {
    initial: {
      label: "INITIAL COMPLAINT PROOF",
      time: "07:21 AM • Citizen Upload",
      image:
        "https://images.unsplash.com/photo-1516972810927-80185027ca84?auto=format&fit=crop&w=800&q=80",
      severity: "Structural Asphalt Void",
      details:
        "Lat. 28.6139° N, Long. 77.2090° E • Approx. 45cm diameter deep cavity.",
    },

    active: {
      label: "ACTIVE FIELD RECTIFICATION",
      time: "08:30 AM • Inspector Rajiv Mehta",
      image:
        "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
      severity: "Cold-Mix Base Compaction",
      details:
        "Telemetry Tag: Vehicle DL-01-EA-4910 • Ready for final seal layer.",
    },
  },

  authority: {
    officer: "Er. Anoop Das",
    designation: "Ward Nodal Executive Engineer",
    desk: "24/7 Ward Control Desk",
    status: "24x7 Ready",
    phone: "Toll-Free Helpline: 1916 (Ext. 11)",
  },
};