/**
 * Static copy and mock data for the Action Drawer (Job Details).
 * Edit this file to change labels, placeholders, and content without touching layout.
 */

export const ACTION_DRAWER_TABS = ["Job Action", "Timeline", "Job Description"] as const;
export type ActionDrawerTab = (typeof ACTION_DRAWER_TABS)[number];

export const actionDrawerChrome = {
  drawerTitle: "Job Details",
  referenceId: "#RR-26-00023",
  tabs: ACTION_DRAWER_TABS,
} as const;

/** Initial form / UI state when the drawer opens */
export const actionDrawerFormDefaults = {
  availableDate: "2026-03-10",
  expectedSalary: "0",
  selectedInterviewSlotId: "slot-1",
} as const;

export const actionDrawerJobSummary = {
  matchBadge: "Strong Match",
  postedAgo: "6 days ago",
  locationCountrySuffix: "United States",
  matchLabel: "Match",
  matchPercentLabel: "80%",
  /** Number of filled segments in the match bar (out of 5) */
  matchBarFilledCount: 4,
  matchBarTotalSegments: 5,
  metaFields: [
    { label: "Project Est. Start Date", value: "March 11, 2026", icon: "calendar" as const },
    { label: "Project Est. End Date", value: "August 31, 2026", icon: "calendar" as const },
    { label: "Minimum Contract Duration", value: "5 months, 20 days", icon: "hourglass" as const },
    { label: "Rotation Cycle", value: "0 Weeks On / 0 Weeks Off", icon: "refresh" as const },
    { label: "Working Hours / Day", value: "8 hours", icon: "clock" as const },
    { label: "Working Days / Week", value: "5 days", icon: "users" as const },
  ],
} as const;

export const actionDrawerRecruiterInterest = {
  sectionTitle: "Accept Recruiter Invitation",
  availableDateLabel: "Available Date",
  expectedSalaryLabel: "Expected Salary",
  currencySymbol: "$",
  salaryRateSuffix: "/ hourly",
  termsAgreement:
    "I agree to the terms and agree to share my profile with SixFE.",
} as const;

export const actionDrawerInterview = {
  sectionTitle: "Interview Details",
  tags: ["Round 1", "Technical", "Virtual Meeting"] as const,
  tableHeaders: {
    select: "Select",
    slot: "#Slot",
    date: "Date",
    time: "Time",
  },
  mobileDatePrefix: "Date:",
  mobileTimePrefix: "Time:",
  slots: [
    {
      id: "slot-1",
      label: "Slot 1",
      date: "Feb 03, 2026",
      time: "11:00 IST (UTC +5.30)",
    },
  ],
} as const;

export const actionDrawerSalary = {
  proposalTitle: "Proposal (V.1)",
  rateDisplay: "$ 500",
  rateSuffix: "/ hourly",
  proposedJoiningPrefix: "Proposed Joining Date:",
  proposedJoiningDate: "March 11, 2026",
  termsHeading: "Terms",
  byCustomer: "By Customer",
  customerTerms: ["PPE", "GatePass", "Severance Pay", "Safety Training"] as const,
  byCandidate: "By Candidate",
  byCandidatePlaceholder: "NA",
  notApplicableTitle: "Not Applicable",
  notApplicableBody: "No additional negotiation terms shared.",
} as const;

export const actionDrawerFooter = {
  submit: "Submit",
  requestClarification: "Request Clarification",
} as const;

export const actionDrawerTimeline = {
  emptyStateMessage: "Timeline not available yet",
  emptyStateIconSrc: "/icons/check-list.svg",
  milestoneDate: "Jan 26, 2026",
  milestoneTitles: {
    interview: "Interview slot shared",
    salary: "Salary proposal received",
    default: "Recruiter interest accepted",
  },
} as const;

export const actionDrawerJobDescription = {
  overview: {
    title: "Overview",
    body:
      "The Mechanical Completion (MC) Inspector plays a critical role in ensuring the successful execution of CO2 compression and pipeline projects. This position is based in Houston, United States, and involves conducting thorough inspections to guarantee compliance with project specifications and industry standards.",
  },
  responsibilities: {
    title: "Key Responsibilities",
    items: [
      "Conduct mechanical completion inspections to ensure adherence to project specifications.",
      "Review and validate inspection reports, documenting findings and recommendations.",
      "Coordinate with project teams to facilitate timely completion of project milestones.",
      "Monitor safety compliance during inspections and assist in resolving non-conformance issues.",
      "Provide technical support to project stakeholders and participate in project meetings and updates.",
      "Assist in final project handover documentation to ensure all aspects meet quality standards.",
    ],
  },
  requirements: {
    title: "Requirements",
  },
  qualifications: {
    title: "Qualifications",
    items: [
      "Mandatory certification as a Certified Welding Inspector (CWI).",
      "Preferred certifications include NACE - Corrosion Technician and API 570 - Piping Inspector.",
      "Strong knowledge of international codes, standards, and regulations related to mechanical completion and pipeline systems.",
    ],
  },
  skillsAndExperience: {
    title: "Skills and Experience",
    items: [
      "5-10 years of experience in Mechanical Inspection Techniques (Mandatory).",
      "3-7 years of experience in Quality Assurance Procedures (Mandatory).",
      "3-5 years of experience in Project Coordination (Preferred).",
      "3-5 years of experience in Safety Compliance Standards (Mandatory).",
      "3-5 years of experience in Documentation and Reporting (Preferred).",
    ],
  },
  technicalSkills: {
    title: "Technical Skills",
    items: [
      "Proficient in AutoCAD (Mandatory).",
      "Familiarity with SmartPlant, SAP PM, and MS Project (Preferred).",
      "Experience with NDT Equipment (Mandatory).",
    ],
  },
  languageRequirements: {
    title: "Language Requirements",
    items: [
      "Fluent in English, with good reading, speaking, and writing skills (Mandatory).",
    ],
  },
  keySkills: {
    title: "Key Skills",
    items: [
      "Proficient in SAP PM, Mechanical Completion, Safety Compliance, Welding inspection, Quality Management Systems, Commissioning documentation, Pipeline Operations, NDT, and Pipeline commissioning management.",
    ],
  },
} as const;

/** Title matchers (lowercase) — keep in sync with Action Center card titles */
export const actionDrawerTitleMatchers = {
  recruiterInterest: "recruiter interest received",
  interviewScheduled: "interview scheduled",
  salaryNegotiation: "salary negotiation",
} as const;

export const actionDrawerFirstRecruiterCardId = 1;
