// ============================================================
// HELP & SUPPORT RAW DATA
// ============================================================

export const helpSupportData = {
  hero: {
    badge: "NAGRIK CITIZEN GUIDANCE",

    title: "Help & Support",

    description:
      "Get instant guidance, track complaints, or learn how to report civic issues with our intelligent municipal assistant.",
  },

  assistant: {
    name: "NagrikSetu Citizen Assistant",
    status: "Online",

    greeting:
      "Hello Rajesh! How can I assist you with your civic grievances today? You can ask me how to file complaints, inspect civic workflows, or query active reference tickets.",

    intro:
      "Hi Rajesh! I can help you report an issue, find the right department, or check your complaint status.",

    quickPrompts: [
      "How do I report an issue?",
      "How do I track my complaint?",
      "Which category should I select?",
      "How do I upload evidence?",
    ],

    messages: [
      {
        id: 1,
        type: "assistant",
        text:
          "Hello Rajesh! How can I assist you with your civic grievances today? You can ask me how to file complaints, inspect civic workflows, or query active reference tickets.",
        time: "Today 10:14 AM",
      },

      {
        id: 2,
        type: "user",
        text: "How do I track my complaint?",
        time: "10:15 AM",
      },

      {
        id: 3,
        type: "assistant",
        text:
          "You can track any complaint in two quick ways:",
        time: "",
        steps: [
          {
            number: 1,
            text:
              "Click Track Complaint in the top navigation and enter your Complaint ID (e.g. #NS-2025-1042).",
          },
          {
            number: 2,
            text:
              "Visit My Complaints in your profile to view your active complaints and lifecycle updates.",
          },
        ],
      },
    ],
  },

  emergency: {
    title: "Emergency Helpline",

    description:
      "Toll-free 24/7 municipal dispatch",

    label: "CENTRAL TOLL-FREE",

    number: "1916",

    emailLabel: "Citizen Support Email:",

    email: "support@nagriksetu.gov.in",
  },

  directTracking: {
    title: "Direct Tracking",

    description:
      "Query status via Reference ID",

    label: "Enter Grievance Reference",

    placeholder: "e.g. NS-2025-1042",
  },

  topics: {
    title: "Top Assistance Topics",

    faq: "FAQS",

    items: [
      {
        id: 1,
        title: "Uploading Photo Evidence",
        description:
          "Direct camera capture & geo-tagging tips for faster review.",
      },

      {
        id: 2,
        title: "Categorizing Civic Issues",
        description:
          "Water supply, roads, sanitation, streetlights, or agriculture.",
      },

      {
        id: 3,
        title: "Reopening Unsatisfactory Work",
        description:
          "How citizen verification holds service departments accountable.",
      },
    ],
  },

  guarantee: {
    title: "Civic Integrity Guarantee",

    description:
      "Every submission is recorded on the public civic ledger. Officers cannot mark an issue resolved without proof photo and citizen sign-off.",
  },

  footer: {
    description:
      "An open, modern digital bridge connecting citizens with responsive civic services, real-time grievance tracking, and transparent resolutions.",

    quickNavigation: [
      "Report New Issue",
      "Track Status",
      "Service Categories",
      "My Past Filings",
    ],

    citizenSupport: [
      "Help Desk & FAQs",
      "Toll-Free Helpline",
      "Accessibility Statement",
      "Community Feedback",
    ],

    civicStandards:
      "Empowering citizens with participatory governance, public transparency, and municipal accountability.",
  },
};