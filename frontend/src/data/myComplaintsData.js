// ============================================================
// MY COMPLAINTS RAW DATA
// ============================================================

export const complaintStats = [
  {
    id: "total",
    title: "TOTAL COMPLAINTS",
    value: 4,
    subtitle: "registered",
    type: "total",
    progress: 100,
  },
  {
    id: "progress",
    title: "IN PROGRESS",
    value: 1,
    subtitle: "crews active",
    type: "progress",
    progress: 25,
  },
  {
    id: "verification",
    title: "VERIFICATION PENDING",
    value: 1,
    subtitle: "requires citizen sign-off",
    type: "verification",
    progress: 25,
  },
  {
    id: "resolved",
    title: "RESOLVED",
    value: 2,
    subtitle: "closed smoothly",
    type: "resolved",
    progress: 50,
  },
];


// ============================================================
// FILTER DATA
// ============================================================

export const complaintFilters = {
  statuses: [
    "All",
    "In Progress",
    "Verification Pending",
    "Resolved",
  ],

  categories: [
    "All",
    "Water Leakage",
    "Potholes",
    "Garbage",
    "Streetlights",
  ],
};


// ============================================================
// COMPLAINT DATA
// ============================================================

export const complaints = [
  {
    id: "NS-2025-1042",

    title:
      "Broken drinking water pipeline causing road waterlogging",
       icon: "water",

    category: "Water Leakage",

    department: "Water Supply",

    departmentFull:
      "Public Utilities & Reticulation Directorate",

    officer: "Suresh Patel",

    officerDesignation:
      "Junior Officer (Field Ops Team #2)",

    location:
      "Near Community Centre, Sector 4, Main Market Road",

    landmark:
      "Opposite City Chemist & Grocery Plaza gate",

    submissionDate: "24 Oct 2025",

    submittedTime: "09:30 AM",

    status: "In Progress",

    statusType: "progress",

    impactLevel:
      "Road Inundation & Supply Halt",

    filedBy: "Rajesh Verma",

    citizenVerification: true,

    description:
      "The main underground supply pipeline has ruptured near the shopping complex entrance. Water has been overflowing since early morning, eroding road surface and causing waterlogging. Vehicle movement has been slowed down and several ground floor shops face risk of seepage.",

    progress: 65,

    estimatedCompletion:
      "Today, 05:00 PM",

    crewMembers: 4,

    progressNote:
      "Water pipeline repair team dispatched. Valve 4 isolated. Excavation completed and 150mm cast iron sleeve replacement underway. Testing pressure line before backfilling.",

    photos: [
      {
        id: 1,
        title: "Pipeline Rupture Point",
        uploaded: "Uploaded 09:30 AM",
        src: "/images/complaints/pipeline-rupture.jpg",
      },
      {
        id: 2,
        title: "Downstream Road Inundation",
        uploaded: "Uploaded 09:30 AM",
        src: "/images/complaints/road-inundation.jpg",
      },
    ],

    lifecycle: [
      {
        title: "Submitted",
        step: "Step 1",
        description:
          "Complaint registered via portal",
        date: "24 Oct, 09:30 AM",
        completed: true,
      },

      {
        title: "Under Review",
        step: "Step 2",
        description:
          "Initial verification & categorization completed",
        date: "24 Oct, 10:15 AM",
        completed: true,
      },

      {
        title: "Assigned",
        step: "Step 3",
        description:
          "Allocated to Water Supply department & Suresh Patel",
        date: "24 Oct, 11:00 AM",
        completed: true,
      },

      {
        title: "In Progress",
        step: "Active",
        description:
          "Field crew repairing cast iron sleeve & testing line",
        date: "24 Oct, 02:00 PM",
        active: true,
      },

      {
        title: "Verification Pending",
        step: "Upcoming",
        description:
          "Awaiting authority resolution proof",
        upcoming: true,
      },

      {
        title: "Resolved / Reopened",
        step: "Upcoming",
        description:
          "Awaiting verification to close or escalate",
        upcoming: true,
      },
    ],
  },


  // ==========================================================
  // COMPLAINT 2
  // ==========================================================

  {
    id: "NS-2025-1018",

    title:
      "Deep dangerous pothole on Station Feeder Road",
       icon: "road",

    category: "Potholes",

    department: "Roads Department",

    departmentFull:
      "Roads & Public Infrastructure Directorate",

    officer: "Amit Sharma",

    officerDesignation:
      "Road Maintenance Officer",

    location:
      "Station Feeder Road",

    landmark:
      "Near Station Main Gate",

    submissionDate: "20 Oct 2025",

    submittedTime: "11:20 AM",

    status: "Verification Pending",

    statusType: "verification",

    impactLevel:
      "Road Safety Hazard",

    filedBy: "Rajesh Verma",

    citizenVerification: true,

    description:
      "A deep pothole was reported on Station Feeder Road creating a serious risk for two-wheelers and pedestrians.",

    progress: 85,

    estimatedCompletion:
      "Awaiting citizen verification",

    crewMembers: 3,

    progressNote:
      "Municipal road maintenance crew repaired and resurfaced the affected portion. Citizen verification is now requested.",

    photos: [
      {
        id: 1,
        title: "Damaged Road Surface",
        uploaded: "Uploaded 11:20 AM",
        src: "/images/complaints/pothole.jpg",
      },
    ],

    lifecycle: [
      {
        title: "Submitted",
        step: "Step 1",
        description:
          "Complaint registered via portal",
        date: "20 Oct, 11:20 AM",
        completed: true,
      },

      {
        title: "Under Review",
        step: "Step 2",
        description:
          "Road condition verified",
        date: "20 Oct, 01:00 PM",
        completed: true,
      },

      {
        title: "Assigned",
        step: "Step 3",
        description:
          "Assigned to Roads Department",
        date: "20 Oct, 02:30 PM",
        completed: true,
      },

      {
        title: "Repair Completed",
        step: "Active",
        description:
          "Pothole filled and road surface repaired",
        date: "21 Oct, 04:00 PM",
        active: true,
      },

      {
        title: "Verification Pending",
        step: "Upcoming",
        description:
          "Awaiting citizen confirmation",
        upcoming: true,
      },

      {
        title: "Resolved",
        step: "Upcoming",
        description:
          "Complaint will close after verification",
        upcoming: true,
      },
    ],
  },


  // ==========================================================
  // COMPLAINT 3
  // ==========================================================

  {
    id: "NS-2025-1014",

    title:
      "Overflowing community garbage bin",
       icon: "garbage",

    category: "Garbage",

    department: "Sanitation Department",

    departmentFull:
      "Municipal Sanitation Directorate",

    officer: "Priya Singh",

    officerDesignation:
      "Sanitation Field Officer",

    location:
      "Sector 7 Market",

    landmark:
      "Near Community Market Gate",

    submissionDate: "15 Oct 2025",

    submittedTime: "08:45 AM",

    status: "Resolved",

    statusType: "resolved",

    impactLevel:
      "Public Hygiene",

    filedBy: "Rajesh Verma",

    citizenVerification: true,

    description:
      "The community garbage bin was overflowing and waste had accumulated around the collection point.",

    progress: 100,

    estimatedCompletion:
      "Completed on 17 Oct 2025",

    crewMembers: 2,

    progressNote:
      "Garbage was cleared and the collection area was disinfected.",

    photos: [
      {
        id: 1,
        title: "Community Garbage Bin",
        uploaded: "Uploaded 08:45 AM",
        src: "/images/complaints/garbage.jpg",
      },
    ],

    lifecycle: [
      {
        title: "Submitted",
        step: "Step 1",
        description:
          "Complaint registered via portal",
        date: "15 Oct, 08:45 AM",
        completed: true,
      },

      {
        title: "Under Review",
        step: "Step 2",
        description:
          "Sanitation issue verified",
        date: "15 Oct, 10:00 AM",
        completed: true,
      },

      {
        title: "Assigned",
        step: "Step 3",
        description:
          "Assigned to Sanitation Department",
        date: "15 Oct, 11:00 AM",
        completed: true,
      },

      {
        title: "Resolved",
        step: "Completed",
        description:
          "Garbage cleared and area disinfected",
        date: "17 Oct, 03:00 PM",
        completed: true,
      },
    ],
  },


  // ==========================================================
  // COMPLAINT 4
  // ==========================================================

  {
    id: "NS-2025-0988",

    title:
      "Non-functional streetlights at cross junction",
       icon: "streetlight",

    category: "Streetlights",

    department: "Electrical Department",

    departmentFull:
      "Municipal Electrical Services",

    officer: "Vikash Kumar",

    officerDesignation:
      "Electrical Maintenance Officer",

    location:
      "Main Ring Road Crossing",

    landmark:
      "Near Main Ring Road Junction",

    submissionDate: "08 Oct 2025",

    submittedTime: "07:30 PM",

    status: "Resolved",

    statusType: "resolved",

    impactLevel:
      "Public Safety",

    filedBy: "Rajesh Verma",

    citizenVerification: true,

    description:
      "Multiple streetlights at the main road crossing were not functioning, resulting in poor visibility during evening hours.",

    progress: 100,

    estimatedCompletion:
      "Completed on 10 Oct 2025",

    crewMembers: 2,

    progressNote:
      "Faulty bulbs and relay cable were replaced and the streetlights were tested.",

    photos: [
      {
        id: 1,
        title: "Non-functional Streetlight",
        uploaded: "Uploaded 07:30 PM",
        src: "/images/complaints/streetlight.jpg",
      },
    ],

    lifecycle: [
      {
        title: "Submitted",
        step: "Step 1",
        description:
          "Complaint registered via portal",
        date: "08 Oct, 07:30 PM",
        completed: true,
      },

      {
        title: "Under Review",
        step: "Step 2",
        description:
          "Electrical fault verified",
        date: "09 Oct, 09:00 AM",
        completed: true,
      },

      {
        title: "Assigned",
        step: "Step 3",
        description:
          "Assigned to Electrical Department",
        date: "09 Oct, 10:00 AM",
        completed: true,
      },

      {
        title: "Resolved",
        step: "Completed",
        description:
          "Bulb and relay cable replaced",
        date: "10 Oct, 06:00 PM",
        completed: true,
      },
    ],
  },
];


// ============================================================
// PAGE CONTENT
// ============================================================

export const pageContent = {
  badge: "PUBLIC SERVICE REGISTRY",

  title: "My Complaints",

  description:
    "Track and manage your submitted civic complaints, verify resolved fixes, and monitor municipal action.",

  assistanceTitle:
    "Need assistance or have an urgent query?",

  assistanceDescription:
    "Call the citizen assistance desk anytime or browse through answered community inquiries.",
};


// ============================================================
// FIND COMPLAINT BY ID
// ============================================================

export const getComplaintById = (id) => {
  return complaints.find(
    (complaint) => complaint.id === id
  );
};