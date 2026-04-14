import type { ProfileData } from "./types";

export const PROFILE: ProfileData = {
  name: "Adam Smith",
  verified: true,
  title: "Senior Engineer",
  location: "Brooklyn Heights, United States",
  phone: "(832) 555-1209",
  github: "#",
  linkedin: "#",
  website: "#",
  summary:
    "Experienced energy professional with over 6 years of expertise in designing efficient energy systems and optimizing operational performance across power and renewable projects using modern engineering tools and technologies. Proven track record of managing scalable energy solutions and integrating advanced monitoring systems to enhance reliability and efficiency. Skilled in developing data-driven strategies for energy optimization, analytics, and sustainability initiatives, with a strong focus on delivering high-impact solutions that meet organizational and regulatory goals. Eager to leverage expertise in energy management, renewable integration.",
  experience: "6 years, 2 months",
  salary: "USD 2,000",
  profileStrength: 90,
  visibilityScore: 80,
  persona: "Senior Engineer",
  personalInfo: {
    dob: "Jan 24, 1992",
    gender: "Male",
    emails: ["adamsmith@gmail.com", "adam_smith!@hotmail.com"],
    nationality: "United States",
    currentLocation: "Brooklyn Heights, United States",
    preferredLocation: "Atlanta, United States",
  },
  education: [
    {
      degree: "Master of Computer Applications",
      school: "Harvard University",
      specialization: "Computers",
      graduationYear: "2016",
      score: "9.8",
    },
  ],
  languages: [
    { id: "l1", name: "English", read: "Good", write: "Excellent", speak: "Good" },
    { id: "l2", name: "French", read: "Medium", write: "Excellent", speak: "Good" },
  ],
  skills: [
    "Microgrid design",
    "Energy data analytics",
    "Energy Efficiency Optimization",
    "Utility Operations",
    "Grid Compliance",
    "Tariff & Billing Analysis",
    "SCADA Systems",
  ],
  certifications: [
    {
      id: "c1",
      name: "Certified Energy Manager (CEM)",
      issuer: "AEE",
      issued: "March 2025",
      expiry: null,
    },
    {
      id: "c2",
      name: "Certified Measurement & Verification Professional (CMVP)",
      issuer: "AEE",
      issued: "April 2025",
      expiry: null,
    },
  ],
  experienceItems: [
    { id: "e1", title: "Decarbonization strategies", years: 5 },
    { id: "e2", title: "Maintained turbine systems", years: 3 },
    { id: "e3", title: "Refining processes", years: 3 },
  ],
  tools: [
    { id: "t1", name: "PVsyst", years: 5 },
    { id: "t2", name: "TRACE 700", years: 3 },
  ],
  projects: [
    {
      id: "p1",
      title: "Substation Upgrade",
      company: "Greenpac Co",
      startDate: "March 01, 2023",
      endDate: "July 31, 2025",
      description:
        "Contributed to a transmission substation upgrade project in the power sector, supporting detailed engineering, site execution, and commissioning activities. Key responsibilities included protection scheme validation, coordination with contractors, and ensuring compliance with IEC standards, resulting in improved system reliability.",
      responsibilities: [
        "Planned and executed project activities as per scope and timelines",
        "Coordinated with cross-functional teams and vendors",
        "Ensured compliance with safety and regulatory standards",
        "Monitored project progress, risks, and dependencies",
      ],
    },
    {
      id: "p2",
      title: "Substation Upgrade",
      company: "Greenpac Co",
      startDate: "January 01, 2020",
      endDate: "January 31, 2023",
      description:
        "Contributed to a transmission substation upgrade project in the power sector, supporting detailed engineering, site execution, and commissioning activities. Key responsibilities included protection scheme validation, coordination with contractors, and ensuring compliance with IEC standards, resulting in improved system reliability.",
      responsibilities: [
        "Planned and executed project activities as per scope and timelines",
        "Coordinated with cross-functional teams and vendors",
        "Ensured compliance with safety and regulatory standards",
        "Monitored project progress, risks, and dependencies",
      ],
    },
  ],
};
