"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Search,
  MapPin,
  Bookmark,
  Clock3,
  Repeat,
  Share2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  EllipsisVertical,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";

import AppNavbar from "../profile/AppNavbar";
import CandidateAppShell from "../mobile/CandidateAppShell";
import ActionDrawer from "../ActionDrawer";
import PauseJobSearchModal from "../PauseJobSearchModal";
import ReferFriendModal from "../ReferFriendModal";
import VisibilityScoreCard from "./VisibilityScoreCard";
import WelcomeBackModal from "./WelcomeBackModal";
import { DASHBOARD_WELCOME_PENDING_KEY } from "@/lib/dashboardWelcome";
import { getResolvedNavDisplayName } from "@/lib/userDisplayName";
import { DEFAULT_LOCATIONS, LocationDrawer } from "../ui/LocationDrawer";
import {
  DEFAULT_FILTERS,
  FilterDrawer,
  FilterState,
} from "../ui/FilterDrawer";
import Image from "next/image";
import { useIsMobile } from "@/lib/useResponsive";

interface ActionCard {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
}

interface JobListing {
  id: number;
  title: string;
  location: string;
  locationId: string;
  locationFull: string;
  company: string;
  salary: string;
  hourlyRate: number;
  startDate: string;
  matchPercentage: number;
  status: "Strong Match" | "Closing Soon" | "Early Applicants" | "New";
  stage: "Received" | "Shortlisted" | "Interview" | "Rejected";
  postedTime: string;
  skills: string[];
  employmentType: string;
  seniorityLevel: string;
}

const LOCATION_LABELS = DEFAULT_LOCATIONS.reduce<Record<string, string>>(
  (accumulator, location) => {
    accumulator[location.id] = location.label;
    return accumulator;
  },
  {}
);

const ACTION_CARDS: ActionCard[] = [
  {
    id: 1,
    type: "Job",
    title: "Recruiter interest received",
    subtitle: "Senior Engineer - Atlanta",
    timestamp: "1 hr ago",
  },
  {
    id: 2,
    type: "Job",
    title: "Interview Scheduled",
    subtitle: "Senior Engineer - Atlanta",
    timestamp: "4 hrs ago",
  },
  {
    id: 3,
    type: "Job",
    title: "Recruiter interest received",
    subtitle: "System Grid Engineer - Georgia",
    timestamp: "1 day ago",
  },
  {
    id: 4,
    type: "Job",
    title: "Salary Negotiation",
    subtitle: "Senior Engineer - Atlanta",
    timestamp: "2 days ago",
  },
  {
    id: 5,
    type: "Profile",
    title: "Update Profile",
    subtitle: "Keep your details up to date to improve visibility",
    timestamp: "2 days ago",
  },
  {
    id: 6,
    type: "General",
    title: "New Matching Roles Added",
    subtitle: "Matching opportunities are available based on your profile",
    timestamp: "1 week ago",
  },
  {
    id: 7,
    type: "Job",
    title: "Application viewed",
    subtitle: "Pipeline Engineer - Houston",
    timestamp: "3 days ago",
  },
  {
    id: 8,
    type: "Job",
    title: "New job match",
    subtitle: "Renewables Analyst - Remote",
    timestamp: "5 days ago",
  },
];

/** Max Action Center cards shown before "See All" (per tab). */
const ACTION_CENTER_PAGE_SIZE = 4;

const JOB_LISTINGS: JobListing[] = [
  {
    id: 1,
    title: "Fuel Operation Engineer",
    location: "Bangor",
    locationId: "bangor-us",
    locationFull: "United States",
    company: "SolarWave Initiative",
    salary: "USD 1,200 / hourly",
    hourlyRate: 1200,
    startDate: "Starts March 11, 2026",
    matchPercentage: 70,
    status: "Strong Match",
    stage: "Received",
    postedTime: "6 days ago",
    skills: ["Utility Operations", "Microgrid System"],
    employmentType: "Full Time",
    seniorityLevel: "Mid Level",
  },
  {
    id: 2,
    title: "Pipeline Maintenance Engineer",
    location: "Atlanta",
    locationId: "atlanta-us",
    locationFull: "United States",
    company: "WindHarvest Co",
    salary: "USD 650 / hourly",
    hourlyRate: 650,
    startDate: "Starts March 01, 2026",
    matchPercentage: 74,
    status: "Closing Soon",
    stage: "Shortlisted",
    postedTime: "20 days ago",
    skills: ["Utility Operations"],
    employmentType: "Part Time",
    seniorityLevel: "Entry Level",
  },
  {
    id: 3,
    title: "Pump Maintenance Engineer",
    location: "Brooklyn",
    locationId: "brooklyn-us",
    locationFull: "United States",
    company: "HydroFlow Solutions",
    salary: "USD 600 / hourly",
    hourlyRate: 600,
    startDate: "Starts February 09, 2026",
    matchPercentage: 65,
    status: "Early Applicants",
    stage: "Interview",
    postedTime: "1 day ago",
    skills: ["Energy data analytics"],
    employmentType: "Internship",
    seniorityLevel: "Entry Level",
  },
  {
    id: 4,
    title: "Mechanical Technician",
    location: "Atlanta",
    locationId: "atlanta-us",
    locationFull: "United States",
    company: "SmartGrid Expansion",
    salary: "USD 1,500 / hourly",
    hourlyRate: 1500,
    startDate: "Starts March 11, 2026",
    matchPercentage: 90,
    status: "New",
    stage: "Received",
    postedTime: "1 day ago",
    skills: ["Microgrid System", "Energy data analytics"],
    employmentType: "Training Jobs",
    seniorityLevel: "Senior Level",
  },
  {
    id: 5,
    title: "Operation Engineer",
    location: "Bangor",
    locationId: "bangor-us",
    locationFull: "United States",
    company: "GreenFuel Innovations",
    salary: "USD 500 / hourly",
    hourlyRate: 500,
    startDate: "Starts March 11, 2026",
    matchPercentage: 30,
    status: "New",
    stage: "Rejected",
    postedTime: "1 day ago",
    skills: ["Utility Operations"],
    employmentType: "Part Time",
    seniorityLevel: "Mid Level",
  },
];

function formatActionSubtitleForMobile(subtitle: string) {
  return subtitle.replace(/\s*-\s*/g, " | ");
}

export default function TalentEngineDashboard() {
  const isMobile = useIsMobile();
  const [mobileBottomTab, setMobileBottomTab] = useState<"action" | "jobs" | "insights">("action");
  const [isLookingForJob, setIsLookingForJob] = useState(true);
  const [activeTab, setActiveTab] = useState<"Recommended" | "Your Applications">("Recommended");
  const [mobileApplicationSource, setMobileApplicationSource] = useState<"Applied By You" | "Recruiter Added">("Applied By You");
  const [mobileApplicationStage, setMobileApplicationStage] = useState("Stage");
  const [activeActionTab, setActiveActionTab] = useState<"Job" | "Profile" | "General">("Job");
  const [actionCenterSeeAll, setActionCenterSeeAll] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionCard | null>(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(() => new Set());
  const [showReferModal, setShowReferModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(["bangor-us"]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState("");
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(DASHBOARD_WELCOME_PENDING_KEY) === "1") {
        window.sessionStorage.removeItem(DASHBOARD_WELCOME_PENDING_KEY);
        setWelcomeUserName(getResolvedNavDisplayName());
        setWelcomeModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const primaryLocation = selectedLocations[0]
    ? LOCATION_LABELS[selectedLocations[0]]
    : "All locations";
  const extraCount = Math.max(selectedLocations.length - 1, 0);

  const activeFilterCount = [
    activeFilters.skills.length > 0,
    activeFilters.employmentTypes.length > 0,
    activeFilters.seniorityLevels.length > 0,
    activeFilters.salaryMin !== DEFAULT_FILTERS.salaryMin ||
    activeFilters.salaryMax !== DEFAULT_FILTERS.salaryMax,
  ].filter(Boolean).length;

  const filteredActions = ACTION_CARDS.filter(
    (card) => card.type === activeActionTab
  );

  const hasMoreActions = filteredActions.length > ACTION_CENTER_PAGE_SIZE;
  const displayedActions = actionCenterSeeAll
    ? filteredActions
    : filteredActions.slice(0, ACTION_CENTER_PAGE_SIZE);

  const actionTabCounts = useMemo(() => {
    return {
      Job: ACTION_CARDS.filter((c) => c.type === "Job").length,
      Profile: ACTION_CARDS.filter((c) => c.type === "Profile").length,
      General: ACTION_CARDS.filter((c) => c.type === "General").length,
    };
  }, []);

  const visibleJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return JOB_LISTINGS.filter((job) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [
          job.title,
          job.company,
          job.location,
          job.locationFull,
          ...job.skills,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesLocation =
        selectedLocations.length === 0 ||
        selectedLocations.includes(job.locationId);

      const matchesSkills =
        activeFilters.skills.length === 0 ||
        activeFilters.skills.some((skill) => job.skills.includes(skill));

      const matchesEmployment =
        activeFilters.employmentTypes.length === 0 ||
        activeFilters.employmentTypes.includes(job.employmentType);

      const matchesSeniority =
        activeFilters.seniorityLevels.length === 0 ||
        activeFilters.seniorityLevels.includes(job.seniorityLevel);

      const matchesSalary =
        job.hourlyRate >= activeFilters.salaryMin &&
        job.hourlyRate <= activeFilters.salaryMax;

      const matchesSaved = !showSavedOnly || savedJobIds.has(job.id);

      return (
        matchesSearch &&
        matchesLocation &&
        matchesSkills &&
        matchesEmployment &&
        matchesSeniority &&
        matchesSalary &&
        matchesSaved
      );
    });
  }, [activeFilters, savedJobIds, searchQuery, selectedLocations, showSavedOnly]);

  const recommendedJobs = visibleJobs;
  const applicationJobs = visibleJobs;

  const handleJobApplyClick = (job: JobListing) => {
    const nextAction: ActionCard = {
      id: job.id,
      type: "Job",
      title: job.title,
      subtitle: `${job.location} - ${job.locationFull}`,
      timestamp: job.postedTime,
    };

    const isSameJobAlreadyOpen =
      isDrawerOpen &&
      selectedAction?.type === "Job" &&
      selectedAction?.id === job.id;

    if (isSameJobAlreadyOpen) {
      setIsDrawerOpen(false);
      return;
    }

    setSelectedAction(nextAction);
    setIsDrawerOpen(true);
  };

  const handleToggleSavedJob = (jobId: number) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Strong Match":
        return "bg-green-50 text-green-700";
      case "Closing Soon":
        return "bg-yellow-50 text-yellow-700";
      case "Early Applicants":
        return "bg-blue-50 text-blue-700";
      case "New":
        return "bg-emerald-50 text-emerald-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 70) return "bg-blue-600";
    if (percentage >= 40) return "bg-blue-500";
    return "bg-yellow-500";
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case "Job":
        return {
          label: "Job",
          icon: <BriefcaseBusiness size={13} />,
          className: "bg-green-50 text-green-700",
        };
      case "Profile":
        return {
          label: "Profile",
          icon: <User size={13} />,
          className: "bg-purple-50 text-purple-700",
        };
      default:
        return {
          label: "General",
          icon: <Repeat size={13} />,
          className: "bg-purple-50 text-purple-700",
        };
    }
  };

  const getStageStyle = (stage: string) => {
    switch (stage) {
      case "Received":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "Shortlisted":
        return "bg-green-50 text-green-600 border-green-200";
      case "Interview":
        return "bg-purple-50 text-purple-600 border-purple-200";
      case "Rejected":
        return "bg-red-50 text-red-600 border-red-200";
      default:
        return "bg-gray-50 text-gray-600";
    }
  };

  const MatchCircle = ({ score }: { score: number }) => {
    const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const progress = circumference - (score / 100) * circumference;

    return (
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90">
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
          {score}
        </div>
      </div>
    );
  };

  const handlePauseSave = (duration: string) => {
    console.log("Paused for:", duration, "months");
    setIsLookingForJob(false);
    setShowPauseModal(false);
  };

  const renderEmptyJobs = (message: string) => (
    <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-900 mb-1">No jobs match the current filters</p>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );

  const jobSearchToggle = (
    <button
      type="button"
      onClick={() => {
        if (isLookingForJob) {
          setShowPauseModal(true);
        } else {
          setIsLookingForJob(false);
        }
      }}
      className="flex items-center gap-3 group"
      aria-pressed={isLookingForJob}
    >
      <span
        className={`text-sm font-medium transition-colors ${isLookingForJob ? "text-gray-900" : "text-gray-500"
          }`}
      >
        {isLookingForJob ? "Looking for a Job" : "Not looking right now"}
      </span>
      <span
        className={`relative h-7 w-12 rounded-full transition-colors ${isLookingForJob ? "bg-green-500" : "bg-gray-300"
          }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white transition-transform duration-200 ${isLookingForJob ? "translate-x-5" : "translate-x-0"
            }`}
        >
          {isLookingForJob ? (
            <svg
              className="h-3 w-3 text-green-500"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 3L4.5 8.5L2 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </span>
    </button>
  );

  const actionTabsRow = (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {(["Job", "Profile", "General"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveActionTab(tab);
              setActionCenterSeeAll(false);
            }}
            className={`shrink-0 border px-4 py-2 text-sm font-medium transition-colors ${isMobile ? "rounded-full" : "rounded-md"
              } ${activeActionTab === tab
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-800"
              }`}
          >
            {tab} ({actionTabCounts[tab]})
          </button>
        ))}
      </div>
      {hasMoreActions ? (
        <button
          type="button"
          onClick={() => setActionCenterSeeAll((prev) => !prev)}
          className="flex shrink-0 items-center justify-center gap-1 text-sm font-medium text-blue-600 sm:justify-start"
        >
          {actionCenterSeeAll ? "Show less" : "See All"}
          {actionCenterSeeAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      ) : (
        <span className="hidden sm:block sm:w-[88px]" aria-hidden />
      )}
    </div>
  );

  const dashboardModals = (
    <>
      <ActionDrawer
        open={isDrawerOpen}
        action={selectedAction}
        onClose={() => setIsDrawerOpen(false)}
      />
      <PauseJobSearchModal
        open={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onSave={handlePauseSave}
      />
      <ReferFriendModal open={showReferModal} onClose={() => setShowReferModal(false)} />
      <LocationDrawer
        open={locationDrawerOpen}
        onClose={() => setLocationDrawerOpen(false)}
        onApply={(locations) => setSelectedLocations(locations)}
        triggerRef={locationButtonRef}
        initialSelected={selectedLocations}
      />
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={(filters) => setActiveFilters(filters)}
        triggerRef={filterButtonRef}
        initialFilters={activeFilters}
      />
      <WelcomeBackModal
        open={welcomeModalOpen}
        userName={welcomeUserName}
        onClose={() => setWelcomeModalOpen(false)}
        onYesOpenToOpportunities={() => setIsLookingForJob(true)}
        onNotRightNow={() => setIsLookingForJob(false)}
      />
    </>
  );

  if (isMobile) {
    const mobileActionCenter = (
      <main className="px-4 pt-4">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 shadow-sm ring-2 ring-amber-200/60">
            <Zap className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Action Center</h1>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          {jobSearchToggle}
        </div>

        <div className="mb-4">{actionTabsRow}</div>

        <div className="flex flex-col gap-3">
          {displayedActions.map((card) => {
            const badge = getActionBadge(card.type);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSelectedAction(card);
                  setIsDrawerOpen(true);
                }}
                className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-shadow active:scale-[0.99]"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">{card.timestamp}</span>
                </div>
                <h3 className="mb-1 text-base font-semibold text-gray-900">{card.title}</h3>
                <p className="text-sm text-slate-500">
                  {formatActionSubtitleForMobile(card.subtitle)}
                </p>
              </button>
            );
          })}
        </div>
      </main>
    );

    const mobileJobs = (
      <main className="px-4 pt-4 pb-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>
          {jobSearchToggle}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["Recommended", "Your Applications"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`min-h-[40px] shrink-0 rounded-full border px-5 text-sm font-medium transition-colors ${activeTab === tab
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Recommended" ? (
          <>
            <div className="relative mb-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="search"
                placeholder="Search by job name..."
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-4 pr-14 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded border border-gray-200 bg-gray-50">
                <Search className="h-4 w-4 text-gray-500" aria-hidden />
              </div>
            </div>

            <div className="mb-5 flex gap-2">
              <button
                ref={locationButtonRef}
                type="button"
                onClick={() => setLocationDrawerOpen(true)}
                className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-900"
              >
                <MapPin className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{primaryLocation}</span>
                {extraCount > 0 ? (
                  <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    +{extraCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                aria-label={showSavedOnly ? "Show all jobs" : "Show saved jobs only"}
                aria-pressed={showSavedOnly}
                onClick={() => setShowSavedOnly((prev) => !prev)}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white ${showSavedOnly ? "border-blue-600 text-blue-600" : "border-gray-200 text-gray-700"
                  }`}
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setFilterDrawerOpen(true)}
                aria-label="Filters"
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white ${activeFilterCount > 0 ? "border-blue-600 text-blue-600" : "border-gray-200 text-gray-700"
                  }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            {recommendedJobs.length > 0 ? (
              <div className="flex flex-col gap-4">
                {recommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    className="group flex min-h-[240px] flex-col justify-between rounded-xl border border-gray-200 border-b-4 border-b-blue-600 bg-white p-4 shadow-sm transition-all"
                  >
                    <div className="mb-3 flex justify-between">
                      <span className={`rounded-full px-3 py-1 text-xs ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      <span className="text-xs text-gray-500">{job.postedTime}</span>
                    </div>

                    <div className="mb-3">
                      <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                    </div>

                    <div className="mb-4 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="truncate">{job.location} | {job.locationFull}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="h-4 w-4 shrink-0 text-slate-500" />
                        <span>{job.salary}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="h-4 w-4 shrink-0 text-slate-500" />
                        <span>{job.startDate}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Match</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((bar) => (
                            <div
                              key={bar}
                              className={`h-2.5 w-2.5 rounded-[2px] ${bar <= Math.ceil(job.matchPercentage / 20)
                                  ? getMatchColor(job.matchPercentage)
                                  : "bg-gray-200"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{job.matchPercentage}%</span>
                      </div>

                      <div className="flex w-full items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowReferModal(true)}
                          className="h-10 w-10 shrink-0 rounded-lg border border-gray-200"
                        >
                          <Share2 size={16} className="mx-auto" />
                        </button>
                        <button
                          type="button"
                          aria-label={savedJobIds.has(job.id) ? "Unsave job" : "Save job"}
                          aria-pressed={savedJobIds.has(job.id)}
                          onClick={() => handleToggleSavedJob(job.id)}
                          className={`h-10 w-10 shrink-0 rounded-lg border transition-colors ${savedJobIds.has(job.id)
                              ? "border-blue-600 bg-transparent text-blue-600"
                              : "border-gray-200 text-gray-700"
                            }`}
                        >
                          <Bookmark size={16} className="mx-auto" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleJobApplyClick(job)}
                          className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-2 text-sm text-gray-800 transition-all hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              renderEmptyJobs("Try broadening your search, location, or salary range.")
            )}
          </>
        ) : (
          <>
            <div className="mb-4 flex border-b border-[#D8E2F1]">
              {(["Applied By You", "Recruiter Added"] as const).map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setMobileApplicationSource(source)}
                  className={`flex items-center gap-2 border-b-4 px-2 pb-3 pt-1 text-sm font-medium ${mobileApplicationSource === source
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-[#60708F]"
                    }`}
                >
                  <Clock3 className="h-4 w-4" />
                  {source}
                </button>
              ))}
            </div>

            <div className="relative mb-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="search"
                placeholder="Search by job name..."
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-4 pr-14 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded border border-gray-200 bg-gray-50">
                <Search className="h-4 w-4 text-gray-500" aria-hidden />
              </div>
            </div>

            <div className="mb-5 flex justify-between gap-2">
              <div className="relative mb-4 w-full">
                <select
                  value={mobileApplicationStage}
                  onChange={(event) => setMobileApplicationStage(event.target.value)}
                  className="h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {["Stage", "Received", "Shortlisted", "Interview", "Rejected"].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>

              <button
                ref={filterButtonRef}
                type="button"
                onClick={() => setFilterDrawerOpen(true)}
                aria-label="Filters"
                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white ${activeFilterCount > 0 ? "border-blue-600 text-blue-600" : "border-gray-200 text-gray-700"
                  }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            {applicationJobs.length > 0 ? (
              <div className="flex flex-col gap-4">
                {applicationJobs
                  .filter((job) => mobileApplicationStage === "Stage" || job.stage === mobileApplicationStage)
                  .map((job) => (
                    <div
                      key={job.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-4">
                        <span className={`inline-flex rounded px-2.5 py-1 text-xs font-medium ${getStageStyle(job.stage)}`}>
                          {job.stage}
                        </span>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                        <p className="mt-1 text-sm text-gray-700">{job.company}</p>
                        <p className="mt-1 text-sm text-[#60708F]">
                          {job.location} | {job.locationFull}
                        </p>
                      </div>

                      <div className="mb-5 flex items-center gap-2">
                        <span className="text-sm text-gray-600">Match</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((bar) => (
                            <div
                              key={bar}
                              className={`h-2.5 w-2.5 rounded-[2px] ${bar <= Math.ceil(job.matchPercentage / 20)
                                  ? getMatchColor(job.matchPercentage)
                                  : "bg-gray-200"
                                }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{job.matchPercentage}%</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          className="flex h-10 items-center justify-center rounded border border-gray-200 bg-white text-gray-700"
                        >
                          <Clock3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleJobApplyClick(job)}
                          className="flex h-10 items-center justify-center rounded border border-gray-200 bg-white text-gray-700"
                        >
                          <Repeat className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="flex h-10 items-center justify-center rounded border border-gray-200 bg-white text-gray-700"
                        >
                          <EllipsisVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              renderEmptyJobs("No applications match the current filter combination.")
            )}
          </>
        )}
      </main>
    );

    const mobileInsights = (
      <main className="px-4 pt-4 pb-6">
        <h1 className="mb-5 text-2xl font-bold tracking-tight text-gray-900">Insights</h1>

        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-[#EDF2FA] text-blue-600">
              <TrendingUp className="h-7 w-7" strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Matching roles found!</h3>
              <p className="mt-1 text-sm leading-6 text-[#60708F]">
                Your profile matches {visibleJobs.length} active {visibleJobs.length === 1 ? "role" : "roles"}
              </p>
            </div>
          </div>
        </div>

        <VisibilityScoreCard value={80} className="shadow-sm" />
      </main>
    );

    return (
      <>
        <CandidateAppShell
          activeBottomTab={mobileBottomTab}
          onActionCenterClick={() => setMobileBottomTab("action")}
          onJobsClick={() => setMobileBottomTab("jobs")}
          onInsightsClick={() => setMobileBottomTab("insights")}
        >
          {mobileBottomTab === "jobs"
            ? mobileJobs
            : mobileBottomTab === "insights"
              ? mobileInsights
              : mobileActionCenter}
        </CandidateAppShell>
        {dashboardModals}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0F3]">
      <AppNavbar />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">Action Center</h2>
            <div className="sm:[&_span]:text-sm sm:[&_span]:text-xs">{jobSearchToggle}</div>
          </div>

          <div className="mb-6 [&_button]:rounded-md">{actionTabsRow}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedActions.map((card) => {
              const badge = getActionBadge(card.type);

              return (
                <div
                  key={card.id}
                  className="bg-[#95bcff0c] border border-gray-200 rounded-md p-4 hover:shadow-sm min-h-[180px] sm:min-h-[210px] flex flex-col"
                >
                  <div className="flex justify-between mb-3">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </div>
                    <span className="text-xs text-gray-500">{card.timestamp}</span>
                  </div>

                  <h3 className="text-sm font-semibold mb-1">{card.title}</h3>
                  <p className="text-xs text-gray-600 mb-4">{card.subtitle}</p>

                  <button
                    onClick={() => {
                      setSelectedAction(card);
                      setIsDrawerOpen(true);
                    }}
                    className="w-fit border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50 mt-auto"
                  >
                    Take Action
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold">Jobs</h2>
              {/* <p className="text-sm text-gray-500">
                Showing {visibleJobs.length} of {JOB_LISTINGS.length} jobs
              </p> */}
            </div>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                {["Recommended", "Your Applications"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as typeof activeTab)}
                    className={`px-3 sm:px-4 py-2 rounded-md border text-xs sm:text-sm whitespace-nowrap ${activeTab === tab
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-white text-gray-600 border-gray-200"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search jobs, company, skill..."
                    className="pl-10 pr-4 h-10 border rounded-lg text-sm w-full"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    ref={locationButtonRef}
                    onClick={() => setLocationDrawerOpen(true)}
                    className="flex items-center gap-2 border rounded-lg bg-white px-4 h-10 text-sm whitespace-nowrap flex-1 sm:flex-initial justify-center sm:justify-start"
                  >
                    <MapPin size={16} className="flex-shrink-0" />
                    <span className="truncate">{primaryLocation}</span>
                    {extraCount > 0 ? (
                      <span className="text-blue-600 flex-shrink-0">+{extraCount}</span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    aria-label={showSavedOnly ? "Show all jobs" : "Show saved jobs only"}
                    aria-pressed={showSavedOnly}
                    onClick={() => setShowSavedOnly((prev) => !prev)}
                    className={`w-10 h-10 border rounded-lg bg-white flex items-center justify-center flex-shrink-0 transition-colors ${showSavedOnly
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-gray-200 text-gray-700"
                      }`}
                  >
                    <Bookmark size={16} />
                  </button>

                  <button
                    ref={filterButtonRef}
                    onClick={() => setFilterDrawerOpen(true)}
                    className={`relative w-10 h-10 border rounded-lg bg-white flex items-center justify-center flex-shrink-0 ${activeFilterCount > 0
                      ? "border-blue-600 text-blue-600 bg-blue-50"
                      : "border-gray-200 text-gray-700"
                      }`}
                  >
                    <SlidersHorizontal size={16} />
                    {activeFilterCount > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-white text-xs text-gray-700">
                  {selectedLocations.length > 0
                    ? `${selectedLocations.length} location${selectedLocations.length > 1 ? "s" : ""}`
                    : "All locations"}
                </span>
                {showSavedOnly ? (
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700">
                    Saved only
                  </span>
                ) : null}
                {activeFilters.skills.map((skill) => (
                  <span key={skill} className="px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700">
                    {skill}
                  </span>
                ))}
                {activeFilters.employmentTypes.map((type) => (
                  <span key={type} className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                    {type}
                  </span>
                ))}
                {activeFilters.seniorityLevels.map((level) => (
                  <span key={level} className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                    {level}
                  </span>
                ))}
                {activeFilters.salaryMin !== DEFAULT_FILTERS.salaryMin ||
                  activeFilters.salaryMax !== DEFAULT_FILTERS.salaryMax ? (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                    ${activeFilters.salaryMin} - ${activeFilters.salaryMax}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              {/* <div className="flex flex-col gap-4 mb-6">
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                  {["Recommended", "Your Applications"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                      className={`px-3 sm:px-4 py-2 rounded-md border text-xs sm:text-sm whitespace-nowrap ${activeTab === tab
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-white text-gray-600 border-gray-200"
                        }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search jobs, company, skill..."
                      className="pl-10 pr-4 h-10 border rounded-lg text-sm w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      ref={locationButtonRef}
                      onClick={() => setLocationDrawerOpen(true)}
                      className="flex items-center gap-2 border rounded-lg px-4 h-10 text-sm whitespace-nowrap flex-1 sm:flex-initial justify-center sm:justify-start"
                    >
                      <MapPin size={16} className="flex-shrink-0" />
                      <span className="truncate">{primaryLocation}</span>
                      {extraCount > 0 ? (
                        <span className="text-blue-600 flex-shrink-0">+{extraCount}</span>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      aria-label={showSavedOnly ? "Show all jobs" : "Show saved jobs only"}
                      aria-pressed={showSavedOnly}
                      onClick={() => setShowSavedOnly((prev) => !prev)}
                      className={`w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${showSavedOnly
                          ? "border-blue-600 text-blue-600 bg-blue-50"
                          : "border-gray-200 text-gray-700"
                        }`}
                    >
                      <Bookmark size={16} />
                    </button>

                    <button
                      ref={filterButtonRef}
                      onClick={() => setFilterDrawerOpen(true)}
                      className={`relative w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 ${activeFilterCount > 0
                          ? "border-blue-600 text-blue-600 bg-blue-50"
                          : "border-gray-200 text-gray-700"
                        }`}
                    >
                      <SlidersHorizontal size={16} />
                      {activeFilterCount > 0 ? (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                    {selectedLocations.length > 0
                      ? `${selectedLocations.length} location${selectedLocations.length > 1 ? "s" : ""}`
                      : "All locations"}
                  </span>
                  {showSavedOnly ? (
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700">
                      Saved only
                    </span>
                  ) : null}
                  {activeFilters.skills.map((skill) => (
                    <span key={skill} className="px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700">
                      {skill}
                    </span>
                  ))}
                  {activeFilters.employmentTypes.map((type) => (
                    <span key={type} className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                      {type}
                    </span>
                  ))}
                  {activeFilters.seniorityLevels.map((level) => (
                    <span key={level} className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                      {level}
                    </span>
                  ))}
                  {activeFilters.salaryMin !== DEFAULT_FILTERS.salaryMin ||
                    activeFilters.salaryMax !== DEFAULT_FILTERS.salaryMax ? (
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                      ${activeFilters.salaryMin} - ${activeFilters.salaryMax}
                    </span>
                  ) : null}
                </div>
              </div> */}

              {activeTab === "Recommended" ? (
                recommendedJobs.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                    {recommendedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="group bg-white border border-gray-200 border-b-4 border-b-blue-600 rounded-lg p-4 sm:p-6 hover:shadow-md hover:border-blue-600 hover:border-b-blue-600 min-h-[240px] flex flex-col justify-between transition-all"
                      >
                        <div className="flex justify-between mb-4">
                          <span className={`text-xs px-2 sm:px-3 py-1 rounded-full ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                          <span className="text-xs text-gray-500">{job.postedTime}</span>
                        </div>

                        <div className="mb-4">
                          <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">{job.title}</h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {job.skills.map((skill) => (
                              <span
                                key={skill}
                                className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="flex-shrink-0" />
                            <span className="truncate">{job.location} - {job.locationFull}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign size={16} className="flex-shrink-0" />
                            {job.salary}
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="flex-shrink-0" />
                            {job.startDate}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">Match</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((bar) => (
                                <div
                                  key={bar}
                                  className={`w-2.5 h-2.5 rounded-[2px] ${bar <= Math.ceil(job.matchPercentage / 20)
                                    ? getMatchColor(job.matchPercentage)
                                    : "bg-gray-200"
                                    }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-semibold">{job.matchPercentage}%</span>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              onClick={() => setShowReferModal(true)}
                              className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={savedJobIds.has(job.id) ? "Unsave job" : "Save job"}
                              aria-pressed={savedJobIds.has(job.id)}
                              onClick={() => handleToggleSavedJob(job.id)}
                              className={`w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${savedJobIds.has(job.id)
                                ? "border-blue-600 bg-transparent text-blue-600"
                                : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                              <Bookmark size={16} />
                            </button>
                            <button
                              onClick={() => handleJobApplyClick(job)}
                              className="relative border border-gray-300 rounded-lg px-6 sm:px-8 py-2 text-sm text-gray-800 bg-white transition-all flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 hover:bg-blue-600 hover:border-blue-600 flex-1 sm:flex-initial"
                            >
                              <span className="transition-all group-hover:text-white group-hover:-translate-x-1">
                                Apply
                              </span>
                              <span className="absolute right-4 opacity-0 translate-x-1 text-white transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 14 14"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M2.91675 7H11.0834"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M7.58325 3.5L11.0833 7L7.58325 10.5"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  renderEmptyJobs("Try broadening your search, location, or salary range.")
                )
              ) : applicationJobs.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="hidden md:block">
                    <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-medium text-gray-600 border-b">
                      <span>Job/Title / Location</span>
                      <span>Company</span>
                      <span className="text-center">Match Score %</span>
                      <span>Stage</span>
                      <span></span>
                    </div>

                    {applicationJobs.map((job) => (
                      <div
                        key={job.id}
                        className="grid grid-cols-5 gap-4 items-center px-6 py-4 border-b last:border-none hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{job.title}</p>
                          <p className="text-xs text-gray-500">
                            {job.location} | {job.locationFull}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700">{job.company}</p>
                        <p className="flex justify-center">
                          <MatchCircle score={job.matchPercentage} />
                        </p>
                        <span className={`text-xs border px-3 py-1 rounded-md w-fit ${getStageStyle(job.stage)}`}>
                          {job.stage}
                        </span>
                        <div className="flex gap-3 justify-end text-gray-500">
                          <Share2 size={16} />
                          <Bookmark size={16} />
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="md:hidden divide-y">
                    {applicationJobs.map((job) => (
                      <div key={job.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">{job.title}</h3>
                            <p className="text-sm text-gray-600">{job.company}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {job.location} | {job.locationFull}
                            </p>
                          </div>
                          <MatchCircle score={job.matchPercentage} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs border px-3 py-1 rounded-md ${getStageStyle(job.stage)}`}>
                            {job.stage}
                          </span>
                          <div className="flex gap-3 text-gray-500">
                            <Share2 size={16} />
                            <Bookmark size={16} />
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                renderEmptyJobs("No applications match the current filter combination.")
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Insights</h2>

            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  {/* <TrendingUp className="text-blue-600 w-5 h-5" /> */}
                  <Image
                    width={30}
                    height={30}
                    src="/icons/chart-increase.svg"
                    alt=""
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Matching roles found!</h3>
                  <p className="text-xs text-gray-600">
                    {visibleJobs.length} active role{visibleJobs.length === 1 ? "" : "s"} match the current criteria
                  </p>
                </div>
              </div>
            </div>

            <VisibilityScoreCard value={80} ctaLabel="Improve Score" />
          </div>
        </div>
      </main>
      {dashboardModals}
    </div>
  );
}
