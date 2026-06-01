"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
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
  Wallet,
  TrendingUp,
  User,
} from "lucide-react";

import AppNavbar from "../profile/AppNavbar";
import CandidateAppShell from "../mobile/CandidateAppShell";
import ActionDrawer from "../ActionDrawer";
import PauseJobSearchModal from "../PauseJobSearchModal";
import ReferFriendModal from "../ReferFriendModal";
import VisibilityScoreCard from "./VisibilityScoreCard";
import {
  InterviewActionCardsSection,
  type UpcomingInterviewDisplay,
} from "./InterviewActionCardsSection";
import WelcomeBackModal from "./WelcomeBackModal";
import { DASHBOARD_WELCOME_PENDING_KEY } from "@/lib/dashboardWelcome";
import { getDraftProfilePending, clearDraftProfilePending } from "@/lib/draftProfilePending";
import LogoutConfirmModal from "@/components/ui/LogoutConfirmModal";
import { DraftProfilePopup } from "@/components/ui/DraftProfilePopup";
import { getResolvedNavDisplayName } from "@/lib/userDisplayName";
import {
  clearAllRecommendedJobsCache,
  readRecommendedJobsCache,
  writeRecommendedJobsCache,
} from "@/lib/recommendedJobsCache";
import { LocationDrawer, type LocationOption } from "../ui/LocationDrawer";
import {
  DEFAULT_FILTERS,
  FilterDrawer,
  FilterState,
} from "../ui/FilterDrawer";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/lib/useResponsive";
import { clearAuthSession, getCandidateId, getProfileName } from "@/lib/authSession";
import { clearSessionLoginEmail, getSessionLoginEmail } from "@/lib/profileOnboarding";
import { clearResumeWizardSession } from "@/lib/profileSession";
import { getCandidateActionables } from "@/services/jobs/getCandidateActionables";
import {
  createFavourite,
  getCandidateInterests,
  getFavouriteJobs,
  getJobApplications,
  getRecommendedJobs,
  getRecommendedJobsWithSkills,
  markInterestedInJob,
  postCandidateSourcingAcceptance,
  postProposalCandidateAcceptance,
  postProposalCandidateNegotiation,
} from "@/services/jobs/actionCenter";
import { activateJobSearch, postJobPause } from "@/services/jobs/jobSearchStatus";
import { getInterviewDetails, getProfileInterviewsDetailed, isLikelyJobOpeningDocName, postInterviewSelectSlot } from "@/services/jobs/interviewsApi";
import type { CandidateActionableApi, CandidateActionableSlotApi, RecommendedJobApi } from "@/services/jobs/types";
import {
  mapApplicationToDashboardJob,
  mapCandidateInterestToDashboardJob,
  mapRecommendedToDashboardJob,
} from "@/services/jobs/mapApiJobsToUi";
import { mergeResolvedCustomerFromPrevious } from "@/services/jobs/mergeResolvedCustomer";
import { prefetchDropdownDetailsAfterLogin } from "@/services/jobs/dropdownDetails";
import { getAllLocationOptions } from "@/services/jobs/locationOptions";
import { getStageStatusMapping } from "@/services/jobs/stageStatusMapping";
import { getRrDetails } from "@/services/jobs/rrDetails";
import { StatusPopup } from "../ui/StatusPopup";
import { JobSuccessPopup } from "../ui/JobSuccessPopup";

interface ActionCard {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
  jobDocumentId?: string;
  rrCandidateName?: string;
  isSourcingAccepted?: boolean;
  proposalName?: string;
  interviewId?: string;
  interviewRound?: number;
  interviewType?: string;
  interviewMode?: string;
  interviewSlots?: {
    slot_id: string;
    slot_date: string;
    slot_time: string;
    label: string;
    slot_timezone?: string;
    slot_status?: string;
  }[];
  sourcingAcceptedAt?: string;
  receivedAt?: string;
  applicationStage?: string;
  applicationAppliedDate?: string;
  applicationSalary?: number;
  matchPercentage?: number;
  /** API `customer`; shown in job drawer. */
  customer?: string;
  skills?: string[];
  /** Raw `status` from the actionables API (e.g. "Onboarded"). */
  candidateStatus?: string;
  expectedJoiningDate?: string;
  actualJoiningDate?: string;
}

function mapActionableInterviewSlots(
  slots: CandidateActionableSlotApi[] | undefined
): ActionCard["interviewSlots"] {
  if (!slots || slots.length === 0) return undefined;
  return slots.map((slot, index) => {
    const slot_date = slot.slot_date?.trim() || "";
    const slot_time = slot.slot_time?.trim() || "";
    const slot_timezone = slot.slot_timezone?.trim() || undefined;
    const slot_status = slot.slot_status?.trim() || undefined;
    const derivedId =
      slot.slot_id?.trim() ||
      [slot_date, slot_time, slot_timezone, String(index + 1)].filter(Boolean).join("|");
    const label = `Slot ${index + 1}`;
    return {
      slot_id: derivedId,
      slot_date,
      slot_time,
      label,
      slot_timezone,
      slot_status,
    };
  });
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
  stage: string;
  postedTime: string;
  skills: string[];
  employmentType: string;
  seniorityLevel: string;
  jobDocumentId?: string;
  appliedDate?: string;
  applicationSalary?: number;
  rrCandidateId?: string;
}

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
const DASHBOARD_RECOMMENDED_JOBS_LIMIT = 6;

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
    employmentType: "Monthly",
    seniorityLevel: "Yes",
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
    employmentType: "Hourly",
    seniorityLevel: "No",
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
    employmentType: "Monthly",
    seniorityLevel: "No",
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
    employmentType: "Hourly",
    seniorityLevel: "Yes",
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
    employmentType: "Hourly",
    seniorityLevel: "Yes",
  },
];

function formatActionSubtitleForMobile(subtitle: string) {
  return subtitle.replace(/\s*-\s*/g, " | ");
}

function splitActionSubtitle(subtitle: string): { role: string; secondary: string } {
  const normalized = subtitle.replace(/\s+—\s+/g, " - ").trim();
  if (!normalized) return { role: "", secondary: "" };
  const [role, ...rest] = normalized.split(" - ");
  return {
    role: (role || "").trim(),
    secondary: rest.join(" - ").trim(),
  };
}

function looksLikeJobReference(value: string): boolean {
  const token = value.trim();
  if (!token) return false;
  return /^(?:[A-Z]{2,8}-\d+|[A-Z0-9-]{8,})$/i.test(token);
}

type ActionableDisplayKind = "recruiter-interest" | "interview" | "salary-negotiation";

function isScheduledInterview(actionable: Pick<CandidateActionableApi, "stage" | "status">): boolean {
  return (
    actionable.stage.toLowerCase() === "interview" &&
    actionable.status.toLowerCase() === "scheduled"
  );
}

function pickDisplayInterviewSlot(
  slots: CandidateActionableSlotApi[] | undefined
): CandidateActionableSlotApi | undefined {
  const list = slots ?? [];
  return (
    list.find((s) => s.slot_status?.toLowerCase() === "scheduled") ??
    list.find((s) => s.slot_status?.toLowerCase() === "proposed") ??
    list[0]
  );
}

/** Backend marks interview slot / acceptance rows with `action: "interview"`. */
function isInterviewActionFromApi(item: Pick<CandidateActionableApi, "action">): boolean {
  return item.action?.trim().toLowerCase() === "interview";
}

function getActionableDisplayKind(actionable: Pick<CandidateActionableApi, "stage" | "status">): ActionableDisplayKind {
  const stageText = actionable.stage.toLowerCase();
  const statusText = actionable.status.toLowerCase();
  const text = `${stageText} ${statusText}`;
  // Some environments may send selection information via `status` instead of `stage`.
  // Treat "selection" as salary-negotiation when it exists in either field.
  if (text.includes("selection") || text.includes("negotiation") || text.includes("proposal")) {
    return "salary-negotiation";
  }
  if (text.includes("interview")) return "interview";
  return "recruiter-interest";
}

function toActionTitle(actionable: CandidateActionableApi) {
  if (actionable.status?.toLowerCase() === "onboarded") return "Onboarded";
  const kind = getActionableDisplayKind(actionable);
  if (kind === "salary-negotiation") return "Salary Negotiation";
  if (kind === "interview") return "Interview Scheduled";
  return "Recruiter interest received";
}

function actionableStageRank(actionable: CandidateActionableApi): number {
  const kind = getActionableDisplayKind(actionable);
  if (kind === "salary-negotiation") return 3;
  if (kind === "interview") return 2;
  return 1;
}

function actionCardStageRank(card: Pick<ActionCard, "title">): number {
  const text = card.title.toLowerCase();
  if (text.includes("negotiation") || text.includes("proposal")) return 3;
  if (text.includes("interview")) return 2;
  return 1;
}

function stableNumericId(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function actionCardSignature(card: ActionCard): string {
  return [
    card.type,
    card.jobDocumentId?.trim() || String(card.id),
    card.title,
    card.subtitle,
    card.timestamp,
    card.rrCandidateName || "",
    card.isSourcingAccepted ? "1" : "0",
    card.proposalName || "",
    card.interviewId || "",
    card.sourcingAcceptedAt || "",
    card.receivedAt || "",
  ].join("|");
}

function jobListingSignature(job: JobListing): string {
  return [
    job.jobDocumentId || String(job.id),
    job.title,
    job.status,
    job.stage,
    job.postedTime,
    String(job.matchPercentage),
  ].join("|");
}


function formatJobLocation(location: string, locationFull: string): string {
  const city = (location || "").trim().replace(/^—$/, "");
  const full = (locationFull || "").trim().replace(/^—$/, "");
  if (!city) return full || "Unknown location";
  if (!full) return city;
  const normalizedCity = city.toLowerCase();
  const normalizedFull = full.toLowerCase();
  if (normalizedCity === normalizedFull || normalizedCity.includes(normalizedFull)) return city;
  return `${city} | ${full}`;
}

function normalizeLocationId(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function normalizeRotationForDashboardFilter(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "true" || normalized === "1") return "yes";
  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no rotation" ||
    normalized.includes("0 weeks on / 0 weeks off")
  ) {
    return "no";
  }
  if (normalized.includes("rotation") && /\bno\b/.test(normalized)) return "no";
  if (normalized.includes("rotation") && /\byes\b/.test(normalized)) return "yes";
  if (normalized.includes("on:") || normalized.includes("weeks on")) {
    return "yes";
  }
  return normalized;
}

function rotationBucketFromJobListing(job: JobListing): string {
  const fromStartDate = normalizeRotationForDashboardFilter(job.startDate);
  if (fromStartDate === "yes" || fromStartDate === "no") return fromStartDate;
  return normalizeRotationForDashboardFilter(job.seniorityLevel);
}

function DashboardRecommendedJobCustomerLine({ company }: { company: string }) {
  const raw = company.trim();
  const hasCustomer = Boolean(raw && raw !== "—");
  const display = hasCustomer ? raw : "—";
  return (
    <p
      className="mt-1 flex min-w-0 items-center gap-2 text-sm"
      title="Customer (hiring organization)"
    >
      <Building2
        size={16}
        className={`h-4 w-4 shrink-0 ${hasCustomer ? "text-slate-500" : "text-gray-400"}`}
        aria-hidden
      />
      <span className={`min-w-0 truncate ${hasCustomer ? "text-gray-700" : "text-gray-400"}`}>
        {display}
      </span>
    </p>
  );
}

function formatAppliedDate(appliedDate?: string): string {
  const raw = appliedDate?.trim();
  if (!raw) return "—";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function recencyScoreFromPostedTime(postedTime: string): number {
  const text = postedTime.trim().toLowerCase();
  if (!text) return Number.MAX_SAFE_INTEGER;
  if (text.includes("just now")) return 0;
  const match = text.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const value = Number.parseInt(match[1], 10);
  const unit = match[2];
  const multiplier =
    unit === "second"
      ? 1
      : unit === "minute"
        ? 60
        : unit === "hour"
          ? 60 * 60
          : unit === "day"
            ? 60 * 60 * 24
            : unit === "week"
              ? 60 * 60 * 24 * 7
              : unit === "month"
                ? 60 * 60 * 24 * 30
                : 60 * 60 * 24 * 365;
  return value * multiplier;
}

function addMonthsIso(start: Date, months: number): string {
  const next = new Date(start);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

function toIsoDateYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const AUTO_REFRESH_INTERVAL_SECS = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_AUTO_REFRESH_INTERVAL_SECONDS) || 5
);

export default function TalentEngineDashboard() {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [mobileBottomTab, setMobileBottomTab] = useState<"action" | "jobs" | "insights">("action");
  const [isLookingForJob, setIsLookingForJob] = useState(true);
  const [activeTab, setActiveTab] = useState<"Recommended" | "Your Applications">("Recommended");
  const [applicationSubTab, setApplicationSubTab] = useState<"Shortlisted" | "Applied Jobs">("Shortlisted");
  const [showRejectedJobs, setShowRejectedJobs] = useState(false);
  const [showOnboardedCards, setShowOnboardedCards] = useState(false);
  const [stageOptions, setStageOptions] = useState<string[]>([]);
  const [activeActionTab, setActiveActionTab] = useState<
    "Job" | "Interviews" | "Profile" | "General"
  >("Job");
  const [actionCenterSeeAll, setActionCenterSeeAll] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionCard | null>(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(() => new Set());
  const [showReferModal, setShowReferModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [allLocationOptions, setAllLocationOptions] = useState<LocationOption[]>([]);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [recommendedFilters, setRecommendedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  // Derived — always reflects the current tab's filters (used for chips, count, drawer init).
  const activeFilters = activeTab === "Recommended" ? recommendedFilters : appliedFilters;
  const [welcomeModalOpen, setWelcomeModalOpen] = useState(false);
  const [welcomeUserName, setWelcomeUserName] = useState("");
  const [draftPopupOpen, setDraftPopupOpen] = useState(false);
  const [draftQueuedAfterWelcome, setDraftQueuedAfterWelcome] = useState(false);
  const [showBackLogoutModal, setShowBackLogoutModal] = useState(false);
  const [isBackLoggingOut, setIsBackLoggingOut] = useState(false);
  const [jobSearchStatusPopup, setJobSearchStatusPopup] = useState<{
    open: boolean;
    variant: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, variant: "error", title: "" });
  const [actionSuccessPopup, setActionSuccessPopup] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  const showActionSuccess = (title: string, message: string) =>
    setActionSuccessPopup({ open: true, title, message });
  const closeActionSuccess = () =>
    setActionSuccessPopup((prev) => ({ ...prev, open: false }));

  useEffect(() => {
    // Warm dropdown options before the filter drawer opens.
    prefetchDropdownDetailsAfterLogin();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getAllLocationOptions()
      .then((options) => { if (!cancelled) setAllLocationOptions(options); })
      .catch(() => { if (!cancelled) setAllLocationOptions([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getStageStatusMapping()
      .then((stages) => { if (!cancelled && stages.length > 0) setStageOptions(stages); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const [apiActionCards, setApiActionCards] = useState<ActionCard[]>([]);
  const [apiGeneralCards, setApiGeneralCards] = useState<ActionCard[]>([]);
  const [apiProfileCards, setApiProfileCards] = useState<ActionCard[]>([]);
  const [apiScheduledInterviews, setApiScheduledInterviews] = useState<UpcomingInterviewDisplay[]>([]);
  const [hasAttemptedActionablesLoad, setHasAttemptedActionablesLoad] = useState(false);
  const [hasAttemptedJobsLoad, setHasAttemptedJobsLoad] = useState(false);
  const [apiRecommendedJobs, setApiRecommendedJobs] = useState<JobListing[]>([]);
  const [baseSkills, setBaseSkills] = useState<string[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_INTERVAL_SECS);
  const countdownResetRef = useRef<() => void>(() => {});
  const [apiApplicationJobs, setApiApplicationJobs] = useState<JobListing[]>([]);
  const [apiInterestJobs, setApiInterestJobs] = useState<JobListing[]>([]);
  const [appliedJobDocumentIds, setAppliedJobDocumentIds] = useState<Set<string>>(() => new Set());
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const profile = profileId?.trim();
    if (!profile) return;
    let cancelled = false;
    void (async () => {
      try {
        const ids = await getFavouriteJobs(profile);
        if (!cancelled) setSavedJobIds(ids);
      } catch {
        // ignore — saved state simply stays empty
      }
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const refreshInFlightRef = useRef(false);
  const latestDashboardIdsRef = useRef<{ candidateId: string | null; profileName: string | null }>({
    candidateId: null,
    profileName: null,
  });
  const actionCardsSignatureRef = useRef("");
  const generalCardsSignatureRef = useRef("");
  const profileCardsSignatureRef = useRef("");
  const recommendedJobsSignatureRef = useRef("");
  /** Action Center → Interviews: `usesSlotWorkflowDrawer` rows open ActionDrawer from this map. */
  const interviewTabSlotCardsRef = useRef<Map<string, ActionCard>>(new Map());

  const resolveJobSearchProfileId = () => {
    const fromProfile = profileId?.trim();
    if (fromProfile) return fromProfile;
    const fromCandidate = candidateId?.trim();
    if (fromCandidate) return fromCandidate;
    const fromEmail = getSessionLoginEmail()?.trim();
    if (fromEmail) return fromEmail;
    return "";
  };

  const sendActiveJobSearchStatus = async () => {
    const profile_id = resolveJobSearchProfileId();
    if (!profile_id) return;
    await activateJobSearch({
      profile_id,
    });
  };

  const showJobSearchError = (error: unknown, title = "Unable to update job search") => {
    const message = error instanceof Error && error.message.trim()
      ? error.message
      : "Please try again after some time.";
    setJobSearchStatusPopup({
      open: true,
      variant: "error",
      title,
      message,
    });
  };

  const sendPausedJobSearchStatus = async (durationMonths: number) => {
    const profile_id = resolveJobSearchProfileId();
    if (!profile_id) return;
    const now = new Date();
    await postJobPause({
      profile_id,
      job_search_status: "Paused",
      is_open_to_opportunities: 0,
      pause_duration: String(durationMonths),
      resume_date: addMonthsIso(now, durationMonths),
      updated_at: toIsoDateYmd(now),
    });
  };

  const refreshDashboardData = async (input: {
    candidateId: string | null;
    profileName: string | null;
  }) => {
    const currentCandidateId = input.candidateId?.trim() || "";
    // `profileName` is the backend `profile_id` used for actionables.
    // In some session-missing flows we may have only `candidateId` populated.
    // Prefer `profileName`, but fallback to `candidateId` to avoid hiding actionables.
    const profileName = input.profileName?.trim() || "";
    const profileIdForActionables = profileName || currentCandidateId;

    // Avoid overlapping refreshes (interval + focus events).
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setIsLoadingSkills(true);
    try {
      const recommendedJobsEarlyPromise: Promise<{ jobs: RecommendedJobApi[]; skills: string[] }> | null =
        profileIdForActionables ? getRecommendedJobsWithSkills(profileIdForActionables) : null;

      if (currentCandidateId) {
        try {
          const applicationsRes = await getJobApplications(currentCandidateId);
          const mapped = applicationsRes.map((row) => mapApplicationToDashboardJob(row));
          setApiApplicationJobs(mapped);
          const mappedIds = mapped
            .map((j) => j.jobDocumentId)
            .filter((v): v is string => Boolean(v?.trim()));
          setAppliedJobDocumentIds((prev) => new Set([...Array.from(prev), ...mappedIds]));
        } catch {
          setApiApplicationJobs([]);
        } finally {
          setHasAttemptedJobsLoad(true);
        }

        try {
          const interestsRes = await getCandidateInterests(currentCandidateId);
          setApiInterestJobs(interestsRes.map((item) => mapCandidateInterestToDashboardJob(item)));
          const interestIds = interestsRes
            .map((row) => row.rr?.trim())
            .filter((v): v is string => Boolean(v));
          if (interestIds.length > 0) {
            setAppliedJobDocumentIds((prev) => new Set([...Array.from(prev), ...interestIds]));
          }
        } catch {
          setApiInterestJobs([]);
        }
      } else {
        setApiApplicationJobs([]);
        setApiInterestJobs([]);
        setAppliedJobDocumentIds(new Set());
        setHasAttemptedJobsLoad(true);
      }

      if (!profileIdForActionables) {
        setApiActionCards([]);
        setApiGeneralCards([]);
        setApiRecommendedJobs([]);
        setHasAttemptedActionablesLoad(true);
        setHasAttemptedJobsLoad(true);
        return;
      }

      try {
        const cachedRecommended = readRecommendedJobsCache(profileIdForActionables);
        const hasCachedJobs = Boolean(cachedRecommended?.jobs?.length);
        if (hasCachedJobs) {
          const cachedRecommendedJobs = cachedRecommended!.jobs
            .map((job) => mapRecommendedToDashboardJob(job))
            .filter((job) => !(job.jobDocumentId && appliedJobDocumentIds.has(job.jobDocumentId)));
          setApiRecommendedJobs((prev) =>
            mergeResolvedCustomerFromPrevious(cachedRecommendedJobs, prev)
          );
        }
        const safeRecommendedPromise = (
          recommendedJobsEarlyPromise ?? Promise.resolve({ jobs: [] as RecommendedJobApi[], skills: [] as string[] })
        ).catch(() => ({ jobs: [] as RecommendedJobApi[], skills: [] as string[] }));
        const [actionablesResInitial, recommendedJobsRes] = await Promise.all([
          getCandidateActionables(profileIdForActionables),
          safeRecommendedPromise,
        ]);
        let actionablesRes = actionablesResInitial;
        // Don't overwrite a valid cache with an empty response — the backend may temporarily
        // return no jobs while a profile is in draft-edit state.
        if (recommendedJobsRes.jobs.length > 0 || !hasCachedJobs) {
          writeRecommendedJobsCache(profileIdForActionables, recommendedJobsRes.jobs);
        }

        // If the backend can't find actionables for `profile_id`, retry using the other
        // session identifier (`candidateId`).
        const retryProfileId =
          profileName && currentCandidateId && profileName !== currentCandidateId
            ? currentCandidateId
            : "";
        if (
          retryProfileId &&
          actionablesRes.actions.length === 0 &&
          actionablesRes.backendStatus === "Failed" &&
          typeof actionablesRes.backendErrorMessage === "string" &&
          actionablesRes.backendErrorMessage.toLowerCase().includes("unable to fetch any actionables")
        ) {
          actionablesRes = await getCandidateActionables(retryProfileId);
        }

        const bestActionableByJob = new Map<string, CandidateActionableApi>();
        for (const item of actionablesRes.actions) {
          const key = item.job_id?.trim();
          if (!key) continue;
          const existing = bestActionableByJob.get(key);
          if (!existing || actionableStageRank(item) >= actionableStageRank(existing)) {
            bestActionableByJob.set(key, item);
          }
        }

        const nextActions: ActionCard[] = [];
        const nextGeneral: ActionCard[] = [];
        const nextProfile: ActionCard[] = [];
        const scheduledInterviewItems: UpcomingInterviewDisplay[] = [];
        const interviewTabSlotCardsById = new Map<string, ActionCard>();

        const buildJobActionCardFromActionable = (item: CandidateActionableApi): ActionCard => {
          const isInterviewActionable = getActionableDisplayKind(item) === "interview";
          const stableIdSeed =
            item.name?.trim() || `${item.job_id}|${item.job_title}|${item.stage}|${item.status}`;
          return {
            id:
              Number.parseInt(item.name.replace(/\D/g, "").slice(0, 9), 10) ||
              stableNumericId(stableIdSeed),
            type: "Job",
            title: toActionTitle(item),
            subtitle: item.customer
              ? `${item.job_title} - ${item.customer}`
              : `${item.job_title} - ${item.job_id}`,
            timestamp: item.stage || item.status || "Now",
            jobDocumentId: item.job_id,
            customer: item.customer?.trim() || undefined,
            rrCandidateName: item.rr_candidate,
            isSourcingAccepted: false,
            proposalName: item.name,
            interviewId: isInterviewActionable
              ? item.name?.trim() || item.info?.interview_id
              : item.info?.interview_id,
            interviewRound: item.info?.interview_round,
            interviewType: item.info?.interview_type,
            interviewMode: item.info?.interview_mode,
            interviewSlots: mapActionableInterviewSlots(item.info?.interview_slots),
            sourcingAcceptedAt: item.accepted_at,
            receivedAt: item.received_at || item.accepted_at,
            matchPercentage: item.score != null ? Math.max(0, Math.min(100, Math.round(item.score))) : undefined,
            candidateStatus: item.status || undefined,
            expectedJoiningDate: item.info?.expected_joining_date || undefined,
            actualJoiningDate: item.info?.actual_joining_date || undefined,
          };
        };

        for (const item of Array.from(bestActionableByJob.values())) {
          const slotList = item.info?.interview_slots ?? [];
          const slot = pickDisplayInterviewSlot(item.info?.interview_slots);
          
          // Check action type to route to appropriate tab
          const actionType = item.action?.trim() || "";
          if (actionType === "general") {
            // General tab: display actionables with action: "general"
            nextGeneral.push(buildJobActionCardFromActionable(item));
          } else if (actionType === "profile") {
            // Profile tab: display actionables with action: "profile"
            const profileActionCard: ActionCard = {
              ...buildJobActionCardFromActionable(item),
              type: "Profile",
            };
            nextProfile.push(profileActionCard);
          } else if (isScheduledInterview(item)) {
            scheduledInterviewItems.push({
              id: item.name?.trim() || `${item.job_id}|interview-scheduled`,
              jobTitle: item.job_title || item.job_id || "Interview",
              candidateId: item.rr_candidate?.trim() || profileIdForActionables || undefined,
              jobId: item.job_id?.trim() || undefined,
              interviewRound: item.info?.interview_round,
              interviewType: item.info?.interview_type,
              interviewMode: item.info?.interview_mode,
              slotDate: slot?.slot_date,
              slotTime: slot?.slot_time,
              slotTimezone: slot?.slot_timezone,
            });
          } else if (isInterviewActionFromApi(item) && slotList.length > 0) {
            const displayId = item.name?.trim() || `${item.job_id}|interview-action`;
            scheduledInterviewItems.push({
              id: displayId,
              jobTitle: item.job_title || item.job_id || "Interview",
              candidateId: item.rr_candidate?.trim() || profileIdForActionables || undefined,
              jobId: item.job_id?.trim() || undefined,
              interviewRound: item.info?.interview_round,
              interviewType: item.info?.interview_type,
              interviewMode: item.info?.interview_mode,
              slotDate: slot?.slot_date,
              slotTime: slot?.slot_time,
              slotTimezone: slot?.slot_timezone,
              usesSlotWorkflowDrawer: true,
            });
            interviewTabSlotCardsById.set(displayId, buildJobActionCardFromActionable(item));
          } else {
            nextActions.push(buildJobActionCardFromActionable(item));
          }
        }

        const mergedByJob = new Map<string, ActionCard>();
        for (const card of nextActions) {
          const key = card.jobDocumentId?.trim();
          if (!key) continue;
          const existing = mergedByJob.get(key);
          const nextRank = actionCardStageRank(card);
          const existingRank = existing ? actionCardStageRank(existing) : -1;
          if (!existing || nextRank > existingRank) {
            mergedByJob.set(key, card);
          }
        }

        const nextRecommendedJobs: JobListing[] = recommendedJobsRes.jobs.map((job) =>
          mapRecommendedToDashboardJob(job)
        );
        const filteredRecommendedJobs = nextRecommendedJobs.filter(
          (job) => !(job.jobDocumentId && appliedJobDocumentIds.has(job.jobDocumentId))
        );

        // Keep source ordering for UI (backend/local insertion order -> newest first),
        // but build signatures from a stable key sort to avoid unnecessary re-renders.
        const orderedActions = Array.from(mergedByJob.values());
        const actionSignature = [...orderedActions]
          .sort((a, b) =>
            (a.jobDocumentId || String(a.id)).localeCompare(b.jobDocumentId || String(b.id))
          )
          .map(actionCardSignature)
          .join("::");
        if (actionCardsSignatureRef.current !== actionSignature) {
          actionCardsSignatureRef.current = actionSignature;
          setApiActionCards(orderedActions);
        }

        const orderedGeneral = [...nextGeneral];
        const generalSignature = [...orderedGeneral]
          .sort((a, b) =>
            (a.jobDocumentId || String(a.id)).localeCompare(b.jobDocumentId || String(b.id))
          )
          .map(actionCardSignature)
          .join("::");
        if (generalCardsSignatureRef.current !== generalSignature) {
          generalCardsSignatureRef.current = generalSignature;
          setApiGeneralCards(orderedGeneral);
        }

        const orderedProfile = [...nextProfile];
        const profileSignature = [...orderedProfile]
          .sort((a, b) =>
            (a.jobDocumentId || String(a.id)).localeCompare(b.jobDocumentId || String(b.id))
          )
          .map(actionCardSignature)
          .join("::");
        if (profileCardsSignatureRef.current !== profileSignature) {
          profileCardsSignatureRef.current = profileSignature;
          setApiProfileCards(orderedProfile);
        }

        // If the fresh fetch returned empty but we already had cached jobs, skip the state
        // update — the cached jobs are already displayed and should remain visible until
        // the profile is fully re-submitted and the backend returns actual results.
        if (filteredRecommendedJobs.length > 0 || !hasCachedJobs) {
          const orderedRecommended = [...filteredRecommendedJobs];
          const recommendedSignature = [...orderedRecommended]
            .sort((a, b) =>
              (a.jobDocumentId || String(a.id)).localeCompare(b.jobDocumentId || String(b.id))
            )
            .map(jobListingSignature)
            .join("::");
          if (recommendedJobsSignatureRef.current !== recommendedSignature) {
            recommendedJobsSignatureRef.current = recommendedSignature;
            setApiRecommendedJobs((prev) =>
              mergeResolvedCustomerFromPrevious(orderedRecommended, prev)
            );
          }
        }

        // Update skills from API response
        if (recommendedJobsRes.skills && recommendedJobsRes.skills.length > 0) {
          setBaseSkills(recommendedJobsRes.skills);
        }

        // Fallback: get_interviews_by_profile already returns full row data per round.
        // Use it to surface any scheduled rounds missing from actionables (e.g. Round 2+).
        // Run after recommended jobs are shown so the jobs list is not blocked on this call.
        try {
          const profileRows = await getProfileInterviewsDetailed(profileIdForActionables);
          for (const row of profileRows) {
            if (row.rr_candidate_status?.toLowerCase() !== "scheduled") continue;
            const jobId = row.rr?.trim();
            if (!jobId) continue;
            const alreadyShown = scheduledInterviewItems.some(
              (i) => i.jobId === jobId && i.interviewRound === row.round
            );
            if (alreadyShown) continue;
            scheduledInterviewItems.push({
              id: `${jobId}|round-${row.round}`,
              jobTitle: jobId,
              candidateId: row.rr_candidate?.trim() || profileIdForActionables,
              jobId,
              interviewRound: row.round,
              interviewType: row.interview_type,
              interviewMode: row.interview_mode,
              slotDate: row.agreed_interview_date,
              slotTime: row.agreed_interview_time,
              slotTimezone: row.agreed_interview_timezone,
            });
          }
        } catch {
          // Non-fatal: actionables-sourced items are shown as-is
        }

        interviewTabSlotCardsRef.current = interviewTabSlotCardsById;
        setApiScheduledInterviews(scheduledInterviewItems);

        setHasAttemptedActionablesLoad(true);
        setHasAttemptedJobsLoad(true);
      } catch {
        // Keep previously rendered cards on transient refresh failures.
        // This avoids an empty Action Center when one API intermittently fails.
        setHasAttemptedActionablesLoad(true);
        setHasAttemptedJobsLoad(true);
      }
    } finally {
      refreshInFlightRef.current = false;
      setIsLoadingSkills(false);
    }
  };

  const triggerDashboardRefresh = async () => {
    const { candidateId: latestCandidateId, profileName: latestProfileName } = latestDashboardIdsRef.current;
    if (!latestCandidateId && !latestProfileName) return;
    await refreshDashboardData({
      candidateId: latestCandidateId,
      profileName: latestProfileName,
    });
  };

  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    countdownResetRef.current();
    setIsManualRefreshing(true);
    try {
      await triggerDashboardRefresh();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasDraftPending = getDraftProfilePending();
    let hasWelcomePending = false;
    try {
      hasWelcomePending = window.sessionStorage.getItem(DASHBOARD_WELCOME_PENDING_KEY) === "1";
      if (hasWelcomePending) {
        window.sessionStorage.removeItem(DASHBOARD_WELCOME_PENDING_KEY);
      }
    } catch {
      // ignore
    }

    if (hasWelcomePending) {
      setWelcomeUserName(getResolvedNavDisplayName());
      setWelcomeModalOpen(true);
      if (hasDraftPending) {
        clearDraftProfilePending();
        setDraftQueuedAfterWelcome(true);
      }
      return;
    }

    if (hasDraftPending) {
      clearDraftProfilePending();
      setDraftPopupOpen(true);
    }
  }, []);

  // Intercept browser back / iOS swipe-back on the dashboard.
  // Pushes a sentinel history entry so popstate fires before the browser
  // navigates away, then shows a logout confirmation instead.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sentinel = { teDashboardTrap: true };
    window.history.pushState(sentinel, document.title, window.location.href);
    const onPopState = () => {
      // Re-push the sentinel so the next back press is caught too.
      window.history.pushState(sentinel, document.title, window.location.href);
      setShowBackLogoutModal(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleBackButtonLogout = async () => {
    if (isBackLoggingOut) return;
    setIsBackLoggingOut(true);
    try {
      await fetch("/api/method/logout", { method: "POST" });
    } catch {
      // continue with local sign-out even if the server call fails
    } finally {
      clearAuthSession();
      clearSessionLoginEmail();
      clearResumeWizardSession();
      clearAllRecommendedJobsCache();
      router.replace("/login");
      router.refresh();
    }
  };

  useEffect(() => {
    const currentCandidateId = getCandidateId();
    const profileName = getProfileName();
    setCandidateId(currentCandidateId);
    setProfileId(profileName);
    latestDashboardIdsRef.current = {
      candidateId: currentCandidateId,
      profileName,
    };
    void refreshDashboardData({ candidateId: currentCandidateId, profileName });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const profileKey = profileId?.trim() || candidateId?.trim() || "";
    if (!profileKey) return;
    const cached = readRecommendedJobsCache(profileKey);
    if (!cached?.jobs?.length) return;
    setApiRecommendedJobs((prev) =>
      mergeResolvedCustomerFromPrevious(
        cached.jobs
          .map((job) => mapRecommendedToDashboardJob(job))
          .filter((job) => !(job.jobDocumentId && appliedJobDocumentIds.has(job.jobDocumentId))),
        prev
      )
    );
    // Intentionally omit appliedJobDocumentIds: including it re-applies stale cache after a
    // successful refresh and can shrink the list. `refreshDashboardData` re-filters on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once per profile key
  }, [profileId, candidateId]);

  useEffect(() => {
    latestDashboardIdsRef.current = {
      candidateId,
      profileName: profileId,
    };
    if (!candidateId && !profileId) return;
    void refreshDashboardData({ candidateId, profileName: profileId });
  }, [candidateId, profileId]);

  /** Check if two action cards have the same meaningful data (ignoring object reference). */
  const actionCardsHaveSameData = useCallback(
    (a: ActionCard | null, b: ActionCard | null): boolean => {
      if (!a || !b) return a === b;
      return (
        a.id === b.id &&
        a.type === b.type &&
        a.title === b.title &&
        a.subtitle === b.subtitle &&
        a.jobDocumentId === b.jobDocumentId &&
        a.rrCandidateName === b.rrCandidateName &&
        a.proposalName === b.proposalName &&
        a.interviewId === b.interviewId &&
        a.interviewRound === b.interviewRound &&
        a.interviewType === b.interviewType &&
        a.interviewMode === b.interviewMode &&
        a.isSourcingAccepted === b.isSourcingAccepted &&
        a.customer === b.customer
        // Note: intentionally omitting interviewSlots from comparison to preserve user selection
        // when slots are refreshed with the same data
      );
    },
    []
  );

  /** Keep drawer `action` aligned with the latest refresh row so embedded interview slots stay stable. */
  useEffect(() => {
    // Don't sync while drawer is open - preserve the action the user is interacting with
    // The dashboard refresh won't change the action data anyway, syncing just causes form resets
    if (isDrawerOpen) return;
    
    if (!selectedAction) return;
    const jobId = selectedAction.jobDocumentId?.trim();
    if (!jobId) return;
    const proposal = selectedAction.proposalName?.trim() ?? "";
    const fresh = apiActionCards.find(
      (c) =>
        c.id === selectedAction.id &&
        c.jobDocumentId?.trim() === jobId &&
        (c.proposalName?.trim() ?? "") === proposal
    );
    // Only update if the data meaningfully changed, not just the object reference
    if (fresh && !actionCardsHaveSameData(fresh, selectedAction)) {
      setSelectedAction(fresh);
    }
  }, [selectedAction, apiActionCards]);

  /** Recommended list often omits `customer`; align cards with the job drawer via RR details. */
  useEffect(() => {
    if (!hasAttemptedJobsLoad || apiRecommendedJobs.length === 0) return;
    const targets = apiRecommendedJobs.filter(
      (j) => j.jobDocumentId?.trim() && (!j.company.trim() || j.company === "—")
    );
    if (targets.length === 0) return;

    let cancelled = false;
    const concurrency = 4;

    void (async () => {
      const updates = new Map<number, string>();
      for (let i = 0; i < targets.length; i += concurrency) {
        if (cancelled) return;
        const batch = targets.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (j) => {
            const rrName = j.jobDocumentId!.trim();
            try {
              const details = await getRrDetails(rrName);
              const customer = details.customer?.trim();
              if (customer) updates.set(j.id, customer);
            } catch {
              // best-effort
            }
          })
        );
      }
      if (cancelled || updates.size === 0) return;
      setApiRecommendedJobs((prev) =>
        prev.map((job) => {
          const nextCompany = updates.get(job.id);
          return nextCompany ? { ...job, company: nextCompany } : job;
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [apiRecommendedJobs, hasAttemptedJobsLoad]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let countdown = AUTO_REFRESH_INTERVAL_SECS;

    const resetCountdown = () => {
      countdown = AUTO_REFRESH_INTERVAL_SECS;
      setRefreshCountdown(AUTO_REFRESH_INTERVAL_SECS);
    };
    countdownResetRef.current = resetCountdown;

    const handleFocus = () => {
      resetCountdown();
      // Skip refresh if drawer is open to prevent interrupting user interactions
      if (!isDrawerOpen) {
        void triggerDashboardRefresh();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resetCountdown();
        // Skip refresh if drawer is open to prevent interrupting user interactions
        if (!isDrawerOpen) {
          void triggerDashboardRefresh();
        }
      }
    };

    // 1-second tick: drives the countdown display and fires the auto-refresh.
    const tickId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      countdown -= 1;
      if (countdown <= 0) {
        countdown = AUTO_REFRESH_INTERVAL_SECS;
        setRefreshCountdown(AUTO_REFRESH_INTERVAL_SECS);
        // Skip refresh if drawer is open to prevent interrupting user interactions
        if (!isDrawerOpen) {
          void triggerDashboardRefresh();
        }
      } else {
        setRefreshCountdown(countdown);
      }
    }, 1000);

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(tickId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isDrawerOpen]);


  /** Same job set as the list uses for filtering, but ignoring location — avoids orphan locations when search/skills hide all jobs in a place. */
  const jobsForLocationFacets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filters = activeTab === "Recommended" ? recommendedFilters : appliedFilters;
    const selectedRotations = new Set(
      filters.seniorityLevels.map(normalizeRotationForDashboardFilter)
    );

    const filterExceptLocation = (sourceJobs: JobListing[]) =>
      sourceJobs.filter((job) => {
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

        const matchesSkills =
          filters.skills.length === 0 ||
          filters.skills.some((skill) => job.skills.includes(skill));

        const matchesEmployment =
          filters.employmentTypes.length === 0 ||
          filters.employmentTypes.includes(job.employmentType);

        const matchesSeniority =
          filters.seniorityLevels.length === 0 ||
          selectedRotations.has(rotationBucketFromJobListing(job));

        const matchesSalary =
          job.hourlyRate >= filters.salaryMin &&
          job.hourlyRate <= filters.salaryMax;

        const matchesSaved = !showSavedOnly || savedJobIds.has(job.jobDocumentId ?? "");

        return (
          matchesSearch &&
          matchesSkills &&
          matchesEmployment &&
          matchesSeniority &&
          matchesSalary &&
          matchesSaved
        );
      });

    if (activeTab === "Recommended") return filterExceptLocation(apiRecommendedJobs);
    return filterExceptLocation([...apiApplicationJobs, ...apiInterestJobs]);
  }, [
    activeTab,
    recommendedFilters,
    appliedFilters,
    apiApplicationJobs,
    apiInterestJobs,
    apiRecommendedJobs,
    savedJobIds,
    searchQuery,
    showSavedOnly,
  ]);

  const availableLocations = useMemo<LocationOption[]>(() => {
    const catalogByNormalizedId = new Map<string, string>();
    for (const location of allLocationOptions) {
      const id = normalizeLocationId(location.id);
      const label = location.label?.trim() ?? "";
      if (!id || !label) continue;
      catalogByNormalizedId.set(id, label);
    }

    const byId = new Map<string, string>();
    for (const job of jobsForLocationFacets) {
      const id = normalizeLocationId(job.locationId);
      if (!id || id === "—") continue;
      if (byId.has(id)) continue;
      const fromCatalog = catalogByNormalizedId.get(id);
      const fromJob = formatJobLocation(job.location, job.locationFull).trim();
      const label = fromCatalog || fromJob || id;
      if (label === "Unknown location") continue;
      byId.set(id, label);
    }

    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allLocationOptions, jobsForLocationFacets]);

  const locationLabelMap = useMemo<Record<string, string>>(
    () =>
      availableLocations.reduce<Record<string, string>>((acc, location) => {
        acc[location.id] = location.label;
        return acc;
      }, {}),
    [availableLocations]
  );

  const primaryLocation = selectedLocations[0]
    ? locationLabelMap[normalizeLocationId(selectedLocations[0])] || "All locations"
    : "All locations";
  const extraCount = Math.max(selectedLocations.length - 1, 0);

  useEffect(() => {
    const validIds = new Set(availableLocations.map((location) => location.id));
    setSelectedLocations((previous) =>
      previous.filter((id) => validIds.has(normalizeLocationId(id)))
    );
  }, [availableLocations]);

  const activeFilterCount = [
    activeFilters.skills.length > 0,
    activeFilters.employmentTypes.length > 0,
    activeFilters.seniorityLevels.length > 0,
    activeFilters.salaryMin !== DEFAULT_FILTERS.salaryMin ||
    activeFilters.salaryMax !== DEFAULT_FILTERS.salaryMax,
  ].filter(Boolean).length;

  const resolvedActionCards = useMemo(() => {
    if (!hasAttemptedActionablesLoad) return [];
    return [...apiActionCards, ...apiGeneralCards, ...apiProfileCards];
  }, [apiActionCards, apiGeneralCards, apiProfileCards, hasAttemptedActionablesLoad]);

  const filteredActions = resolvedActionCards.filter(
    (card) =>
      card.type === activeActionTab &&
      card.candidateStatus?.toLowerCase() !== "onboarded"
  );

  const onboardedActionCards = resolvedActionCards.filter(
    (card) => card.candidateStatus?.toLowerCase() === "onboarded"
  );

  const hasMoreActions =
    activeActionTab !== "Interviews" && filteredActions.length > ACTION_CENTER_PAGE_SIZE;
  const displayedActions = showOnboardedCards
    ? []
    : actionCenterSeeAll
      ? filteredActions
      : filteredActions.slice(0, ACTION_CENTER_PAGE_SIZE);

  const upcomingInterviews = apiScheduledInterviews;

  const interviewTabSlotWorkflow = useMemo(
    () => upcomingInterviews.filter((i) => i.usesSlotWorkflowDrawer),
    [upcomingInterviews]
  );
  const interviewTabCalendarOnly = useMemo(
    () => upcomingInterviews.filter((i) => !i.usesSlotWorkflowDrawer),
    [upcomingInterviews]
  );

  const actionTabCounts = useMemo(() => {
    const nonOnboarded = resolvedActionCards.filter(
      (c) => c.candidateStatus?.toLowerCase() !== "onboarded"
    );
    return {
      Job: nonOnboarded.filter((c) => c.type === "Job").length,
      Interviews: apiScheduledInterviews.length,
      Profile: nonOnboarded.filter((c) => c.type === "Profile").length,
      General: nonOnboarded.filter((c) => c.type === "General").length,
    };
  }, [resolvedActionCards, apiScheduledInterviews.length]);

  const orderedActionTabs = useMemo((): ("Job" | "Interviews" | "Profile" | "General")[] => {
    const all = ["Job", "Interviews", "Profile", "General"] as const;
    /** When counts tie, preserve Job → Interviews → Profile → General. */
    const canonicalOrder: Record<(typeof all)[number], number> = {
      Job: 0,
      Interviews: 1,
      Profile: 2,
      General: 3,
    };
    return [...all].sort((a, b) => {
      const ca = actionTabCounts[a];
      const cb = actionTabCounts[b];
      const aHas = ca > 0;
      const bHas = cb > 0;
      if (aHas !== bHas) return (bHas ? 1 : 0) - (aHas ? 1 : 0);
      if (aHas && bHas && ca !== cb) return cb - ca;
      return canonicalOrder[a] - canonicalOrder[b];
    });
  }, [actionTabCounts]);

  const recommendedSourceJobs = apiRecommendedJobs;
  const applicationSourceJobs = apiApplicationJobs;
  const rejectedJobsCount = applicationSourceJobs.filter((j) => j.stage === "Rejected").length;

  const { visibleRecommendedJobs, visibleApplicationJobs, visibleAppliedInterestJobs } = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedSelectedLocations = selectedLocations
      .map((id) => normalizeLocationId(id))
      .filter(Boolean);

    const makeFilterFn = (filters: FilterState) => {
      const selectedRotations = new Set(
        filters.seniorityLevels.map(normalizeRotationForDashboardFilter)
      );
      return (job: JobListing) => {
        const matchesSearch =
          normalizedQuery.length === 0 ||
          [job.title, job.company, job.location, job.locationFull, ...job.skills]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

        const matchesLocation =
          normalizedSelectedLocations.length === 0 ||
          normalizedSelectedLocations.includes(normalizeLocationId(job.locationId));

        const matchesSkills =
          filters.skills.length === 0 ||
          filters.skills.some((skill) => job.skills.includes(skill));

        const matchesEmployment =
          filters.employmentTypes.length === 0 ||
          filters.employmentTypes.includes(job.employmentType);

        const matchesSeniority =
          filters.seniorityLevels.length === 0 ||
          selectedRotations.has(rotationBucketFromJobListing(job));

        const matchesSalary =
          job.hourlyRate >= filters.salaryMin &&
          job.hourlyRate <= filters.salaryMax;

        const matchesSaved = !showSavedOnly || savedJobIds.has(job.jobDocumentId ?? "");

        return (
          matchesSearch &&
          matchesLocation &&
          matchesSkills &&
          matchesEmployment &&
          matchesSeniority &&
          matchesSalary &&
          matchesSaved
        );
      };
    };

    const filterRecommended = makeFilterFn(recommendedFilters);
    const filterApplied = makeFilterFn(appliedFilters);

    const recommendedFiltered = recommendedSourceJobs
      .filter(filterRecommended)
      .filter((job) => !(job.jobDocumentId && appliedJobDocumentIds.has(job.jobDocumentId)))
      .sort((a, b) => recencyScoreFromPostedTime(a.postedTime) - recencyScoreFromPostedTime(b.postedTime))
      .slice(0, DASHBOARD_RECOMMENDED_JOBS_LIMIT);

    return {
      visibleRecommendedJobs: recommendedFiltered,
      visibleApplicationJobs: applicationSourceJobs
        .filter(filterApplied)
        .filter((job) => showRejectedJobs ? job.stage === "Rejected" : job.stage !== "Rejected")
        .filter((job) => appliedFilters.stages.length === 0 || appliedFilters.stages.includes(job.stage)),
      visibleAppliedInterestJobs: apiInterestJobs.filter(filterApplied),
    };
  }, [
    recommendedFilters,
    appliedFilters,
    appliedJobDocumentIds,
    savedJobIds,
    searchQuery,
    selectedLocations,
    showSavedOnly,
    showRejectedJobs,
    recommendedSourceJobs,
    applicationSourceJobs,
    apiInterestJobs,
  ]);

  const handleJobApplyClick = (job: JobListing) => {
    const nextAction: ActionCard = {
      id: job.id,
      type: "Job",
      title: job.title,
      subtitle: `${job.location} - ${job.locationFull}`,
      timestamp: job.postedTime,
      jobDocumentId: job.jobDocumentId,
      matchPercentage: job.matchPercentage,
      customer: job.company.trim() && job.company !== "—" ? job.company.trim() : undefined,
      skills: job.skills.length ? job.skills : undefined,
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

  const handleApplicationCardClick = (job: JobListing) => {
    const nextAction: ActionCard = {
      id: job.id,
      type: "Job",
      title: job.title,
      subtitle: `${job.location} - ${job.locationFull}`,
      timestamp: job.appliedDate || job.postedTime,
      jobDocumentId: job.jobDocumentId,
      rrCandidateName: job.rrCandidateId,
      applicationStage: job.stage,
      applicationAppliedDate: job.appliedDate,
      applicationSalary: job.applicationSalary,
      matchPercentage: job.matchPercentage,
      customer: job.company.trim() && job.company !== "—" ? job.company.trim() : undefined,
      skills: job.skills.length ? job.skills : undefined,
    };
    setSelectedAction(nextAction);
    setIsDrawerOpen(true);
  };

  const handleToggleSavedJob = async (jobDocId: string) => {
    const profileName = getProfileName()?.trim();
    if (!jobDocId) return;

    const isCurrentlySaved = savedJobIds.has(jobDocId);
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobDocId)) {
        next.delete(jobDocId);
      } else {
        next.add(jobDocId);
      }
      return next;
    });

    if (profileName && !isCurrentlySaved) {
      try {
        await createFavourite(profileName, jobDocId);
      } catch (error) {
        console.error("Failed to create favourite:", error);
      }
    }
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
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 40) return "bg-yellow-400";
    return "bg-red-400";
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

  const getEmptyActionMessage = (tab: string) => {
    switch (tab) {
      case "Job":
        return {
          title: "No job updates right now",
          description: "We'll show you new job opportunities and application updates here.",
        };
      case "Interviews":
        return {
          title: "No interview slots right now",
          description: "Available interview slots will appear here for your scheduled interviews.",
        };
      case "Profile":
        return {
          title: "No profile updates right now",
          description: "We'll suggest profile improvements to help you stand out to employers.",
        };
      case "General":
        return {
          title: "No general updates right now",
          description: "General recommendations and tips will appear here.",
        };
      default:
        return {
          title: "No actionables right now",
          description: "We will show interview, proposal, and job updates here.",
        };
    }
  };

  const getStageStyle = (stage: string) => {
    const normalized = stage.trim().toLowerCase();
    if (!normalized) return "bg-gray-50 text-gray-600 border-gray-200";

    // Initial/submitted pipeline states.
    if (
      normalized.includes("receive") ||
      normalized.includes("source") ||
      normalized.includes("appl") ||
      normalized.includes("await")
    ) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    // Positive progression states.
    if (
      normalized.includes("shortlist") ||
      normalized.includes("select") ||
      normalized.includes("accept") ||
      normalized.includes("offer") ||
      normalized.includes("onboard")
    ) {
      return "bg-green-50 text-green-700 border-green-200";
    }

    // In-progress interaction states.
    if (
      normalized.includes("interview") ||
      normalized.includes("screen") ||
      normalized.includes("assess") ||
      normalized.includes("review")
    ) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }

    // Negative/closed states.
    if (
      normalized.includes("reject") ||
      normalized.includes("declin") ||
      normalized.includes("withdraw") ||
      normalized.includes("cancel")
    ) {
      return "bg-red-50 text-red-700 border-red-200";
    }

    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const actionCompanyByJobId = useMemo(() => {
    const byId = new Map<string, string>();
    const write = (job?: JobListing) => {
      const jobId = job?.jobDocumentId?.trim();
      const company = job?.company?.trim();
      if (!jobId || !company || company === "—") return;
      if (!byId.has(jobId)) byId.set(jobId, company);
    };
    apiApplicationJobs.forEach(write);
    apiInterestJobs.forEach(write);
    apiRecommendedJobs.forEach(write);
    return byId;
  }, [apiApplicationJobs, apiInterestJobs, apiRecommendedJobs]);

  const getActionRole = (card: ActionCard) => {
    const parsed = splitActionSubtitle(card.subtitle);
    return parsed.role || card.title;
  };

  const getActionCompany = (card: ActionCard) => {
    const jobId = card.jobDocumentId?.trim() || "";
    const fromJobLookup = jobId ? actionCompanyByJobId.get(jobId) : "";
    if (fromJobLookup) return fromJobLookup;
    const parsed = splitActionSubtitle(card.subtitle);
    if (parsed.secondary && !looksLikeJobReference(parsed.secondary)) return parsed.secondary;
    return "—";
  };

  const getActionStatusLabel = (card: ActionCard) => {
    const status = card.title.trim();
    return status || "Update available";
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

  const refreshAppliedJobs = async (currentCandidateId: string) => {
    try {
      const interestsRes = await getCandidateInterests(currentCandidateId);
      setApiInterestJobs(interestsRes.map((item) => mapCandidateInterestToDashboardJob(item)));
      const interestIds = interestsRes
        .map((row) => row.rr?.trim())
        .filter((v): v is string => Boolean(v));
      if (interestIds.length > 0) {
        setAppliedJobDocumentIds((prev) => new Set([...Array.from(prev), ...interestIds]));
      }
    } catch {
      // Keep existing UI state if refresh fails.
    }
  };

  const refreshJobApplications = async (currentCandidateId: string) => {
    const applicationsRes = await getJobApplications(currentCandidateId);
    const mapped = applicationsRes.map((row) => mapApplicationToDashboardJob(row));
    setApiApplicationJobs(mapped);
    const mappedIds = mapped
      .map((j) => j.jobDocumentId)
      .filter((v): v is string => Boolean(v?.trim()));
    setAppliedJobDocumentIds((prev) => new Set([...Array.from(prev), ...mappedIds]));
  };

  useEffect(() => {
    if (!candidateId || activeTab !== "Your Applications") return;
    void (async () => {
      try {
        await refreshJobApplications(candidateId);
      } catch {
        // Keep existing UI state if refresh fails.
      }
      await refreshAppliedJobs(candidateId);
    })();
  }, [activeTab, candidateId]);

  const handleDrawerPrimaryAction = (
    action: ActionCard,
    extras?: {
      interviewId?: string;
      interviewSlotId?: string;
      availabilityDate?: string;
      expectedSalary?: string;
      acceptTerms?: boolean;
    }
  ): Promise<boolean> => {
    const jobDocumentId = action.jobDocumentId;
    const lowerTitle = action.title.toLowerCase();
    const isProposal = lowerTitle.includes("salary") || lowerTitle.includes("negotiation");
    const isInterview =
      lowerTitle.includes("interview") || action.title === "Interview Scheduled";
    const removeSubmittedActionCard = () => {
      const targetJobId = action.jobDocumentId?.trim() || "";
      const targetProposalName = action.proposalName?.trim() || "";
      const targetRrCandidate = action.rrCandidateName?.trim() || "";
      const targetId = action.id;

      setApiActionCards((prev) =>
        prev.filter((card) => {
          const sameJob = targetJobId && card.jobDocumentId?.trim() === targetJobId;
          const sameProposal = targetProposalName && card.proposalName?.trim() === targetProposalName;
          const sameCandidate = targetRrCandidate && card.rrCandidateName?.trim() === targetRrCandidate;
          const sameId = card.id === targetId;
          return !(sameJob || sameProposal || sameCandidate || sameId);
        })
      );
    };

    return (async () => {
      try {
        if (
          isInterview &&
          extras?.interviewId?.trim() &&
          extras?.interviewSlotId?.trim()
        ) {
          const iid = extras.interviewId.trim();
          if (isLikelyJobOpeningDocName(iid)) {
            console.warn("Refusing to post Job Opening id as interview_id:", iid);
            return false;
          }
          await postInterviewSelectSlot(iid, extras.interviewSlotId.trim());
          removeSubmittedActionCard();
          // Remove the submitted interview from the display list
          setApiScheduledInterviews((prev) =>
            prev.filter((interview) => interview.id !== action.interviewId)
          );
          countdownResetRef.current();
          showActionSuccess(
            "Interview Confirmed!",
            "Your interview slot has been booked. You'll receive a confirmation with further details."
          );
        } else if (isInterview) {
          return false;
        } else if (isProposal && action.proposalName) {
          await postProposalCandidateAcceptance(action.proposalName, "");
          removeSubmittedActionCard();
          countdownResetRef.current();
          showActionSuccess(
            "Proposal Accepted!",
            "Your salary proposal has been accepted. The recruiter will be in touch with next steps."
          );
        } else if (action.rrCandidateName?.trim()) {
          const availabilityDate = extras?.availabilityDate?.trim() || undefined;
          const parsedSalary = Number.parseFloat(extras?.expectedSalary?.trim() || "");
          const isValidDate =
            typeof availabilityDate === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(availabilityDate) &&
            !Number.isNaN(new Date(`${availabilityDate}T00:00:00`).getTime());
          const hasValidSalary = Number.isFinite(parsedSalary) && parsedSalary > 0;
          const hasAcceptedTerms = extras?.acceptTerms === true;
          if (!isValidDate || !hasValidSalary || !hasAcceptedTerms) {
            return false;
          }
          await postCandidateSourcingAcceptance({
            rrcandidate_name: action.rrCandidateName.trim(),
            expected_salary: parsedSalary,
            billing_frequency: "Hourly",
            billing_currency: "USD",
            availability_date: availabilityDate,
            accept_terms: true,
          });
          if (action.jobDocumentId?.trim()) {
            const jobId = action.jobDocumentId.trim();
            setApiActionCards((prev) => {
              return prev.filter((c) => c.jobDocumentId?.trim() !== jobId);
            });
          }
          removeSubmittedActionCard();
          countdownResetRef.current();
          void triggerDashboardRefresh();
          showActionSuccess(
            "Great Choice!",
            "You've successfully accepted the job invitation. Stay tuned for updates from the recruiter."
          );
        } else {
          if (!jobDocumentId) return false;
          if (candidateId) {
            const parsedSalary = Number.parseFloat(extras?.expectedSalary?.trim() || "");
            await markInterestedInJob(candidateId, jobDocumentId, {
              score: action.matchPercentage,
              availableDate: extras?.availabilityDate?.trim() || undefined,
              expectedSalary: Number.isFinite(parsedSalary) && parsedSalary > 0 ? parsedSalary : undefined,
            });
            setAppliedJobDocumentIds((prev) => {
              const next = new Set(prev);
              next.add(jobDocumentId);
              return next;
            });
            setApiRecommendedJobs((prev) => prev.filter((j) => j.jobDocumentId !== jobDocumentId));
            await refreshAppliedJobs(candidateId);
            countdownResetRef.current();
            setActiveTab("Your Applications");
            setApplicationSubTab("Applied Jobs");
            showActionSuccess(
              "Application Submitted!",
              "Your interest has been shared with the recruiter. We'll notify you."
            );
          }
        }
        setIsDrawerOpen(false);
        return true;
      } catch {
        // Keep drawer open so user can retry.
        return false;
      }
    })();
  };

  const handleDrawerClarification = async (
    action: ActionCard,
    remarks: string
  ): Promise<boolean> => {
    if (!action.proposalName) return false;
    try {
      await postProposalCandidateNegotiation(action.proposalName, remarks);
      const targetJobId = action.jobDocumentId?.trim() || "";
      const targetProposalName = action.proposalName?.trim() || "";
      const targetId = action.id;

      setApiActionCards((prev) =>
        prev.filter((card) => {
          const sameJob = targetJobId && card.jobDocumentId?.trim() === targetJobId;
          const sameProposal = targetProposalName && card.proposalName?.trim() === targetProposalName;
          const sameId = card.id === targetId;
          return !(sameJob || sameProposal || sameId);
        })
      );
      void triggerDashboardRefresh();
      return true;
    } catch {
      return false;
    }
  };

  const handlePauseSave = async (duration: string): Promise<boolean> => {
    const durationMonths = Number.parseInt(duration, 10);
    if (!Number.isFinite(durationMonths) || durationMonths <= 0) return false;
    try {
      await sendPausedJobSearchStatus(durationMonths);
      setIsLookingForJob(false);
      return true;
    } catch {
      return false;
    }
  };

  const renderEmptyJobs = (message: string) => (
    <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-900 mb-1">
        {showSavedOnly ? "No saved jobs" : "No jobs match the current filters"}
      </p>
      <p className="text-sm text-gray-500">
        {showSavedOnly ? "Save jobs to view them here." : message}
      </p>
    </div>
  );

  const renderEmptyApplications = () => (
    <div className="border border-dashed border-gray-300 rounded-xl bg-gray-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-gray-900 mb-1">
        {showRejectedJobs ? "No rejected jobs" : "No applications yet"}
      </p>
      <p className="text-sm text-gray-500">
        {showRejectedJobs
          ? "You have no rejected applications at the moment."
          : "Once an application record is created for you, it will appear here."}
      </p>
    </div>
  );

  const jobSearchToggle = (
    <button
      type="button"
      onClick={() => {
        if (isLookingForJob) {
          setShowPauseModal(true);
        } else {
          void (async () => {
            try {
              await sendActiveJobSearchStatus();
              setIsLookingForJob(true);
            } catch (error) {
              showJobSearchError(error, "Unable to activate job search");
            }
          })();
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
    <div className="flex flex-col gap-2">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {orderedActionTabs.map((tab) => (
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
      {/* Checkbox (left) + controls (right) */}
      <div className="flex items-center justify-between gap-3">
        <label className="flex w-fit cursor-pointer items-center gap-1.5 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={showOnboardedCards}
            onChange={(e) => setShowOnboardedCards(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1447E6]"
          />
          Show Onboarded
          {onboardedActionCards.length > 0 && (
            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-semibold text-white">
              {onboardedActionCards.length}
            </span>
          )}
        </label>
        <div className="flex items-center gap-3">
          {!isManualRefreshing && (
            <span className="hidden min-[480px]:inline text-xs text-gray-400">Refreshing in {refreshCountdown}s</span>
          )}
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={isManualRefreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Repeat size={14} className={isManualRefreshing ? "animate-spin" : ""} />
            {isManualRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          {hasMoreActions ? (
            <button
              type="button"
              onClick={() => setActionCenterSeeAll((prev) => !prev)}
              className="flex shrink-0 items-center justify-center gap-1 text-sm font-medium text-blue-600"
            >
              {actionCenterSeeAll ? "Show less" : "See All"}
              {actionCenterSeeAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const getActionCardKey = (card: ActionCard) =>
    `${card.type}:${card.jobDocumentId?.trim() || card.id}`;

  const openActionDrawerForCard = (card: ActionCard) => {
    setSelectedAction(card);
    setIsDrawerOpen(true);
  };

  const renderInterviewTabSlotAcceptanceCardDesktop = (card: ActionCard) => {
    const badge = getActionBadge(card.type);
    return (
      <div
        key={`await-slot:${getActionCardKey(card)}`}
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

        <div className="mb-4 space-y-2">
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-600">Role: </span>
            <span className="font-semibold text-gray-900">{getActionRole(card)}</span>
          </p>
          <p className="text-sm text-slate-700">
            <span className="font-semibold text-slate-600">{card.type === "General" ? "Location: " : "Company: "}</span>
            <span className="font-medium text-gray-900">{getActionCompany(card)}</span>
          </p>
          {card.type !== "General" && (
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStageStyle(getActionStatusLabel(card))}`}
            >
              Status: {getActionStatusLabel(card)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => openActionDrawerForCard(card)}
          className="w-fit border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50 mt-auto"
        >
          Take Action
        </button>
      </div>
    );
  };

  const renderInterviewTabSlotAcceptanceCardMobile = (card: ActionCard) => {
    const badge = getActionBadge(card.type);
    return (
      <div
        key={`await-slot:${getActionCardKey(card)}`}
        className="w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm"
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
        <div className="mb-4 space-y-2.5">
          <p className="text-base text-slate-700">
            <span className="font-semibold text-slate-600">Role: </span>
            <span className="font-semibold text-gray-900">{getActionRole(card)}</span>
          </p>
          <p className="text-base text-slate-700">
            <span className="font-semibold text-slate-600">{card.type === "General" ? "Location: " : "Company: "}</span>
            <span className="font-medium text-gray-900">{getActionCompany(card)}</span>
          </p>
          {card.type !== "General" && (
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${getStageStyle(getActionStatusLabel(card))}`}
            >
              Status: {getActionStatusLabel(card)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => openActionDrawerForCard(card)}
          className="w-fit border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
        >
          Take Action
        </button>
      </div>
    );
  };

  const dashboardModals = (
    <>
      <ActionDrawer
        open={isDrawerOpen}
        action={selectedAction}
        profileId={profileId}
        onClose={() => setIsDrawerOpen(false)}
        onPrimaryAction={handleDrawerPrimaryAction}
        onRequestClarification={handleDrawerClarification}
        jobAlreadyApplied={Boolean(
          selectedAction?.jobDocumentId?.trim() &&
            appliedJobDocumentIds.has(selectedAction.jobDocumentId.trim())
        )}
      />
      <JobSuccessPopup
        open={actionSuccessPopup.open}
        title={actionSuccessPopup.title}
        message={actionSuccessPopup.message}
        onClose={closeActionSuccess}
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
        onApply={(locations) =>
          setSelectedLocations(Array.from(new Set(locations.map((id) => normalizeLocationId(id)).filter(Boolean))))
        }
        triggerRef={locationButtonRef}
        initialSelected={selectedLocations}
        options={availableLocations}
      />
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={(filters) => activeTab === "Recommended" ? setRecommendedFilters(filters) : setAppliedFilters(filters)}
        triggerRef={filterButtonRef}
        initialFilters={activeFilters}
        skillsOptions={baseSkills}
        skipDropdownSkillsLoad={true}
        isLoadingSkills={isLoadingSkills}
        stageOptions={activeTab !== "Recommended" && applicationSubTab === "Shortlisted" && stageOptions.length > 0 ? stageOptions : undefined}
      />
      <LogoutConfirmModal
        open={showBackLogoutModal}
        busy={isBackLoggingOut}
        onConfirm={() => void handleBackButtonLogout()}
        onCancel={() => setShowBackLogoutModal(false)}
      />
      <DraftProfilePopup
        open={draftPopupOpen}
        onContinueEditing={() => {
          setDraftPopupOpen(false);
          setDraftQueuedAfterWelcome(false);
          router.push("/profile/create/basic-details");
        }}
        onDoItLater={() => {
          setDraftPopupOpen(false);
        }}
      />
      <WelcomeBackModal
        open={welcomeModalOpen}
        userName={welcomeUserName}
        onClose={() => {
          setWelcomeModalOpen(false);
          if (draftQueuedAfterWelcome) {
            setDraftQueuedAfterWelcome(false);
            setDraftPopupOpen(true);
          }
        }}
        onYesOpenToOpportunities={() => {
          void (async () => {
            try {
              await sendActiveJobSearchStatus();
              setIsLookingForJob(true);
            } catch (error) {
              showJobSearchError(error, "Unable to activate job search");
            }
          })();
        }}
        onNotRightNow={() => setShowPauseModal(true)}
      />
      <StatusPopup
        open={jobSearchStatusPopup.open}
        variant={jobSearchStatusPopup.variant}
        title={jobSearchStatusPopup.title}
        message={jobSearchStatusPopup.message}
        onClose={() => setJobSearchStatusPopup((prev) => ({ ...prev, open: false }))}
      />
    </>
  );

  if (isMobile) {
    const mobileActionCenter = (
      <main className="px-4 pt-4">
        <div className="mb-5 flex items-center gap-3">
          <Image
            src="/icons/ac-gif.gif"
            alt="Action Center"
            width={44}
            height={44}
            className="h-11 w-11 shrink-0 rounded-full object-cover shadow-sm ring-2 ring-amber-200/60"
            unoptimized
          />
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Action Center</h1>
        </div>

        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          {jobSearchToggle}
        </div>

        <div className="mb-4">{actionTabsRow}</div>

        <div className="flex flex-col gap-3">
          {activeActionTab === "Interviews" && !showOnboardedCards ? (
            <>
              {interviewTabSlotWorkflow.map((interview) => {
                const card = interviewTabSlotCardsRef.current.get(interview.id);
                if (!card) return null;
                return renderInterviewTabSlotAcceptanceCardMobile(card);
              })}
              {interviewTabCalendarOnly.length > 0 ? (
                <InterviewActionCardsSection items={interviewTabCalendarOnly} />
              ) : interviewTabSlotWorkflow.length === 0 ? (
                <InterviewActionCardsSection items={[]} />
              ) : null}
            </>
          ) : displayedActions.length === 0 && (!showOnboardedCards || onboardedActionCards.length === 0) ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-900">
                {showOnboardedCards && onboardedActionCards.length === 0
                  ? "No onboarded jobs"
                  : getEmptyActionMessage(activeActionTab).title}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {showOnboardedCards && onboardedActionCards.length === 0
                  ? "You have no onboarded jobs at the moment."
                  : getEmptyActionMessage(activeActionTab).description}
              </p>
            </div>
          ) : (
            <>
              {displayedActions.map((card) => {
                const badge = getActionBadge(card.type);
                return (
                  <button
                    key={getActionCardKey(card)}
                    type="button"
                    onClick={() => openActionDrawerForCard(card)}
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
                    <div className="space-y-2.5">
                      <p className="text-base text-slate-700">
                        <span className="font-semibold text-slate-600">Role: </span>
                        <span className="font-semibold text-gray-900">{getActionRole(card)}</span>
                      </p>
                      <p className="text-base text-slate-700">
                        <span className="font-semibold text-slate-600">{card.type === "General" ? "Location: " : "Company: "}</span>
                        <span className="font-medium text-gray-900">{getActionCompany(card)}</span>
                      </p>
                      {card.type !== "General" && (
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${getStageStyle(getActionStatusLabel(card))}`}
                        >
                          Status: {getActionStatusLabel(card)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {showOnboardedCards && onboardedActionCards.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-green-200" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                      Onboarded Jobs
                    </span>
                    <div className="h-px flex-1 bg-green-200" />
                  </div>
                  {onboardedActionCards.map((card) => {
                    const badge = getActionBadge(card.type);
                    return (
                      <button
                        key={getActionCardKey(card)}
                        type="button"
                        onClick={() => openActionDrawerForCard(card)}
                        className="w-full rounded-xl border border-green-200 bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 text-left shadow-sm transition-shadow active:scale-[0.99]"
                      >
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </div>
                          <span className="shrink-0 rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            Onboarded
                          </span>
                        </div>
                        <p className="mb-2.5 text-center text-base font-bold text-green-700">
                          You are onboarded!
                        </p>
                        <div className="space-y-1.5">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold text-slate-600">Company: </span>
                            <span className="font-medium text-gray-900">{getActionCompany(card)}</span>
                          </p>
                          {card.expectedJoiningDate && (
                            <p className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-600">Expected Joining: </span>
                              <span className="font-medium text-gray-900">{formatAppliedDate(card.expectedJoiningDate)}</span>
                            </p>
                          )}
                          {card.actualJoiningDate && (
                            <p className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-600">Actual Joining: </span>
                              <span className="font-medium text-gray-900">{formatAppliedDate(card.actualJoiningDate)}</span>
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      </main>
    );

    const mobileJobs = (
      <main className="px-4 pt-4 pb-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Jobs For You</h1>
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
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-4 pr-14 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

            {showSavedOnly && (
              <h2 className="mb-3 text-base font-semibold text-gray-900">Saved Jobs</h2>
            )}

            {!hasAttemptedJobsLoad ? (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="mb-1 text-sm font-semibold text-gray-900">Loading jobs for you...</p>
                <p className="text-sm text-gray-500">We are finding the best matches based on your profile.</p>
              </div>
            ) : visibleRecommendedJobs.length > 0 ? (
              <div className="flex flex-col gap-4">
                {visibleRecommendedJobs.map((job) => (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleJobApplyClick(job)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleJobApplyClick(job);
                      }
                    }}
                    className="group flex min-h-[240px] cursor-pointer flex-col justify-between rounded-xl border border-gray-200 border-b-4 border-b-blue-600 bg-white p-4 shadow-sm transition-all"
                  >
                    <div className="mb-3 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                          {job.jobDocumentId && (
                            <p className="text-xs text-gray-500 mt-1">{job.jobDocumentId}</p>
                          )}
                        </div>
                        {job.postedTime && job.postedTime !== "—" && (
                          <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">{job.postedTime}</span>
                        )}
                      </div>
                      <DashboardRecommendedJobCustomerLine company={job.company} />
                    </div>

                    <div className="mb-4 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="h-4 w-4 shrink-0 text-blue-600" />
                        <span className="truncate">{formatJobLocation(job.location, job.locationFull)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="h-4 w-4 shrink-0 text-slate-500" />
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
                          onClick={(event) => {
                            event.stopPropagation();
                            setShowReferModal(true);
                          }}
                          className="h-10 w-10 shrink-0 rounded-lg border border-gray-200"
                        >
                          <Share2 size={16} className="mx-auto" />
                        </button>
                        <button
                          type="button"
                          aria-label={savedJobIds.has(job.jobDocumentId ?? "") ? "Unsave job" : "Save job"}
                          aria-pressed={savedJobIds.has(job.jobDocumentId ?? "")}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleSavedJob(job.jobDocumentId ?? "");
                          }}
                          className={`h-10 w-10 shrink-0 rounded-lg border transition-colors ${savedJobIds.has(job.jobDocumentId ?? "")
                              ? "border-blue-600 bg-transparent text-blue-600"
                              : "border-gray-200 text-gray-700"
                            }`}
                        >
                          <Bookmark size={16} className="mx-auto" />
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
            <div className="mb-4 border-b border-[#D8E2F1]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex">
                  {(["Shortlisted", "Applied Jobs"] as const).map((subTab) => (
                    <button
                      key={subTab}
                      type="button"
                      onClick={() => setApplicationSubTab(subTab)}
                      className={`border-b-4 px-3 pb-3 pt-1 text-sm font-medium whitespace-nowrap ${
                        applicationSubTab === subTab
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-[#60708F]"
                      }`}
                    >
                      {subTab}
                    </button>
                  ))}
                </div>
                <div className="pb-2 flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleManualRefresh()}
                    disabled={isManualRefreshing}
                    className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Repeat size={11} className={isManualRefreshing ? "animate-spin" : ""} />
                    {isManualRefreshing ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
              </div>
            </div>

            <div className="relative mb-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                type="search"
                placeholder="Search by job name..."
                autoComplete="off"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-4 pr-14 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded border border-gray-200 bg-gray-50">
                <Search className="h-4 w-4 text-gray-500" aria-hidden />
              </div>
            </div>

            <div className="mb-5 flex justify-between gap-2">
              <label className="mb-4 flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={showRejectedJobs}
                  onChange={(e) => setShowRejectedJobs(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1447E6]"
                />
                Show Rejected
                {rejectedJobsCount > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {rejectedJobsCount}
                  </span>
                )}
              </label>

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

            {!hasAttemptedJobsLoad ? (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="mb-1 text-sm font-semibold text-gray-900">Loading your applications…</p>
                <p className="text-sm text-gray-500">Fetching your shortlisted and applied jobs.</p>
              </div>
            ) : applicationSubTab === "Shortlisted" ? (
              visibleApplicationJobs.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {visibleApplicationJobs.map((job) => (
                      <div
                        key={job.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleApplicationCardClick(job)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleApplicationCardClick(job);
                          }
                        }}
                        className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                      >
                        <div className="mb-4">
                          <span className={`inline-flex rounded px-2.5 py-1 text-xs font-medium ${getStageStyle(job.stage)}`}>
                            {job.stage}
                          </span>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                          {job.jobDocumentId && (
                            <p className="text-xs text-gray-500 mt-1">{job.jobDocumentId}</p>
                          )}
                          <p className="mt-1 text-sm text-gray-700">{job.company}</p>
                          <p className="mt-1 text-sm text-[#60708F]">
                            {formatJobLocation(job.location, job.locationFull)}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Applied on {formatAppliedDate(job.appliedDate)}
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
                      </div>
                    ))}
                </div>
              ) : (
                renderEmptyApplications()
              )
            ) : (
              visibleAppliedInterestJobs.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {visibleAppliedInterestJobs.map((job) => (
                    <div
                      key={job.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleApplicationCardClick(job)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleApplicationCardClick(job);
                        }
                      }}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="mb-2">
                        <span className="inline-flex rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          Applied
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                        {job.jobDocumentId && (
                          <p className="text-xs text-gray-400 mt-0.5">{job.jobDocumentId}</p>
                        )}
                        <p className="mt-1 text-sm text-gray-700">{job.company}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-gray-500">Match Score</span>
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {job.matchPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                renderEmptyApplications()
              )
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
                Your profile matches {visibleRecommendedJobs.length} active {visibleRecommendedJobs.length === 1 ? "role" : "roles"}
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
            <div className="flex items-center gap-2">
              <Image
                src="/icons/ac-gif.gif"
                alt="Action Center"
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
                unoptimized
              />
              <h2 className="text-lg sm:text-xl font-semibold">Action Center</h2>
            </div>
            <div className="sm:[&_span]:text-sm">{jobSearchToggle}</div>
          </div>

          <div className="mb-6 [&_button]:rounded-md">{actionTabsRow}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeActionTab === "Interviews" && !showOnboardedCards ? (
              <>
                {interviewTabSlotWorkflow.map((interview) => {
                  const card = interviewTabSlotCardsRef.current.get(interview.id);
                  if (!card) return null;
                  return renderInterviewTabSlotAcceptanceCardDesktop(card);
                })}
                {interviewTabCalendarOnly.length > 0 ? (
                  <div className="col-span-full w-full">
                    <InterviewActionCardsSection items={interviewTabCalendarOnly} />
                  </div>
                ) : interviewTabSlotWorkflow.length === 0 ? (
                  <div className="col-span-full w-full">
                    <InterviewActionCardsSection items={[]} />
                  </div>
                ) : null}
              </>
            ) : displayedActions.length === 0 && (!showOnboardedCards || onboardedActionCards.length === 0) ? (
              <div className="col-span-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center">
                <p className="text-sm font-medium text-gray-900">
                  {showOnboardedCards && onboardedActionCards.length === 0
                    ? "No onboarded jobs"
                    : getEmptyActionMessage(activeActionTab).title}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {showOnboardedCards && onboardedActionCards.length === 0
                    ? "You have no onboarded jobs at the moment."
                    : getEmptyActionMessage(activeActionTab).description}
                </p>
              </div>
            ) : (
              <>
                {displayedActions.map((card) => {
                  const badge = getActionBadge(card.type);

                  return (
                    <div
                      key={getActionCardKey(card)}
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

                      <div className="mb-4 space-y-2">
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold text-slate-600">Role: </span>
                          <span className="font-semibold text-gray-900">{getActionRole(card)}</span>
                        </p>
                        <p className="text-sm text-slate-700">
                          <span className="font-semibold text-slate-600">{card.type === "General" ? "Location: " : "Company: "}</span>
                          <span className="font-medium text-gray-900">{getActionCompany(card)}</span>
                        </p>
                        {card.type !== "General" && (
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${getStageStyle(getActionStatusLabel(card))}`}
                          >
                            Status: {getActionStatusLabel(card)}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => openActionDrawerForCard(card)}
                        className="w-fit border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50 mt-auto"
                      >
                        Take Action
                      </button>
                    </div>
                  );
                })}

                {showOnboardedCards && onboardedActionCards.length > 0 && (
                  <>
                    <div className="col-span-full flex items-center gap-3 pt-2">
                      <div className="h-px flex-1 bg-green-200" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        Onboarded Jobs
                      </span>
                      <div className="h-px flex-1 bg-green-200" />
                    </div>
                    {onboardedActionCards.map((card) => {
                      const badge = getActionBadge(card.type);
                      return (
                        <div
                          key={getActionCardKey(card)}
                          className="border border-green-200 bg-gradient-to-br from-green-50 via-white to-emerald-50 rounded-xl p-4 hover:shadow-sm min-h-[180px] sm:min-h-[210px] flex flex-col"
                        >
                          <div className="flex justify-between mb-3">
                            <div
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
                            >
                              {badge.icon}
                              {badge.label}
                            </div>
                            <span className="rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                              Onboarded
                            </span>
                          </div>
                          <p className="mb-3 text-center text-base font-bold text-green-700">
                            You are onboarded!
                          </p>
                          <div className="mb-4 space-y-1.5">
                            <p className="text-sm text-slate-700">
                              <span className="font-semibold text-slate-600">Company: </span>
                              <span className="font-medium text-gray-900">{getActionCompany(card)}</span>
                            </p>
                            {card.expectedJoiningDate && (
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-600">Expected Joining: </span>
                                <span className="font-medium text-gray-900">{formatAppliedDate(card.expectedJoiningDate)}</span>
                              </p>
                            )}
                            {card.actualJoiningDate && (
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-600">Actual Joining: </span>
                                <span className="font-medium text-gray-900">{formatAppliedDate(card.actualJoiningDate)}</span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => openActionDrawerForCard(card)}
                            className="w-fit border border-green-300 rounded-md px-4 py-2 text-sm hover:bg-green-100 mt-auto text-green-800"
                          >
                            View Details
                          </button>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold">Jobs</h2>
              {/* <p className="text-sm text-gray-500">
                Showing {visibleRecommendedJobs.length} of {JOB_LISTINGS.length} jobs
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

            {showSavedOnly && (
              <h2 className="mb-3 text-base font-semibold text-gray-900">Saved Jobs</h2>
            )}

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
                <>
                  {!hasAttemptedJobsLoad ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                      <p className="mb-1 text-sm font-semibold text-gray-900">Loading jobs for you...</p>
                      <p className="text-sm text-gray-500">We are finding the best matches based on your profile.</p>
                    </div>
                  ) : visibleRecommendedJobs.length > 0 ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                      {visibleRecommendedJobs.map((job) => (
                      <div
                        key={job.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleJobApplyClick(job)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleJobApplyClick(job);
                          }
                        }}
                        className="group flex min-h-[240px] cursor-pointer flex-col justify-between rounded-lg border border-gray-200 border-b-4 border-b-blue-600 bg-white p-4 transition-all hover:border-blue-600 hover:border-b-blue-600 hover:shadow-md sm:p-6"
                      >
                        <div className="mb-4 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="mb-2 font-semibold text-base sm:mb-3 sm:text-lg">{job.title}</h3>
                              {job.jobDocumentId && (
                                <p className="text-xs text-gray-500">{job.jobDocumentId}</p>
                              )}
                            </div>
                            {job.postedTime && job.postedTime !== "—" && (
                              <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">{job.postedTime}</span>
                            )}
                          </div>
                          <DashboardRecommendedJobCustomerLine company={job.company} />
                          <div className="mb-3 mt-2 flex flex-wrap gap-2">
                            {job.skills.slice(0, 6).map((skill) => (
                              <span
                                key={skill}
                                className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-700"
                              >
                                {skill}
                              </span>
                            ))}
                            {job.skills.length > 6 && (
                              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-500">
                                +{job.skills.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin size={16} className="flex-shrink-0" />
                            <span className="truncate">{formatJobLocation(job.location, job.locationFull)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Wallet size={16} className="flex-shrink-0" />
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
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setShowReferModal(true);
                              }}
                              className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0"
                            >
                              <Share2 size={16} />
                            </button>
                            <button
                              type="button"
                              aria-label={savedJobIds.has(job.jobDocumentId ?? "") ? "Unsave job" : "Save job"}
                              aria-pressed={savedJobIds.has(job.jobDocumentId ?? "")}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleToggleSavedJob(job.jobDocumentId ?? "");
                              }}
                              className={`w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${savedJobIds.has(job.jobDocumentId ?? "")
                                ? "border-blue-600 bg-transparent text-blue-600"
                                : "border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                            >
                              <Bookmark size={16} />
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
                  <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200">
                    <div className="flex gap-2">
                    {(["Shortlisted", "Applied Jobs"] as const).map((subTab) => (
                      <button
                        key={subTab}
                        type="button"
                        onClick={() => setApplicationSubTab(subTab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                          applicationSubTab === subTab
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {subTab}
                      </button>
                    ))}
                    </div>
                    <div className="mb-2 flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={showRejectedJobs}
                          onChange={(e) => setShowRejectedJobs(e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 accent-[#1447E6]"
                        />
                        Show Rejected
                      </label>
                      {!isManualRefreshing && (
                        <span className="text-xs text-gray-400">Refreshing in {refreshCountdown}s</span>
                      )}
                      <button
                        type="button"
                        onClick={() => void handleManualRefresh()}
                        disabled={isManualRefreshing}
                        className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Repeat size={12} className={isManualRefreshing ? "animate-spin" : ""} />
                        {isManualRefreshing ? "Refreshing..." : "Refresh"}
                      </button>
                    </div>
                  </div>

                  {!hasAttemptedJobsLoad ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                      <p className="mb-1 text-sm font-semibold text-gray-900">Loading your applications…</p>
                      <p className="text-sm text-gray-500">Fetching your shortlisted and applied jobs.</p>
                    </div>
                  ) : applicationSubTab === "Shortlisted" ? (
                    visibleApplicationJobs.length > 0 ? (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="hidden md:block">
                          <div className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-6 px-6 py-3 text-sm font-medium text-gray-600 border-b">
                            <span>Job/Title</span>
                            <span>Company</span>
                            <span className="text-center">Match Score %</span>
                            <span>Stage</span>
                            <span>Applied On</span>
                          </div>

                          {visibleApplicationJobs.map((job) => (
                            <div
                              key={job.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleApplicationCardClick(job)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleApplicationCardClick(job);
                                }
                              }}
                              className="grid grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1.2fr)] gap-6 items-center px-6 py-4 border-b last:border-none hover:bg-gray-50"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{job.title}</p>
                                {job.jobDocumentId && (
                                  <p className="text-xs text-gray-400 mt-0.5">{job.jobDocumentId}</p>
                                )}
                              </div>
                              <p className="text-sm text-gray-700">{job.company}</p>
                              <p className="flex justify-center">
                                <MatchCircle score={job.matchPercentage} />
                              </p>
                              <span className={`text-xs border px-3 py-1 rounded-md w-fit ${getStageStyle(job.stage)}`}>
                                {job.stage}
                              </span>
                              <span className="text-sm text-gray-600">{formatAppliedDate(job.appliedDate)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="md:hidden divide-y">
                          {visibleApplicationJobs.map((job) => (
                            <div
                              key={job.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleApplicationCardClick(job)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleApplicationCardClick(job);
                                }
                              }}
                              className="p-4 hover:bg-gray-50"
                            >
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <h3 className="font-medium text-gray-900 mb-1">{job.title}</h3>
                                  {job.jobDocumentId && (
                                    <p className="text-xs text-gray-400 mb-1">{job.jobDocumentId}</p>
                                  )}
                                  <p className="text-sm text-gray-600">{job.company}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatJobLocation(job.location, job.locationFull)}
                                  </p>
                                </div>
                                <MatchCircle score={job.matchPercentage} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`text-xs border px-3 py-1 rounded-md ${getStageStyle(job.stage)}`}>
                                  {job.stage}
                                </span>
                                <span className="text-xs text-gray-500">
                                  Applied on {formatAppliedDate(job.appliedDate)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      renderEmptyApplications()
                    )
                  ) : (
                    visibleAppliedInterestJobs.length > 0 ? (
                      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                        <div className="hidden md:block">
                          <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)] gap-6 px-6 py-3 text-sm font-medium text-gray-600 border-b">
                            <span>Job/Title</span>
                            <span>Company</span>
                            <span className="text-center">Match Score %</span>
                          </div>

                          {visibleAppliedInterestJobs.map((job) => (
                            <div
                              key={job.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleApplicationCardClick(job)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleApplicationCardClick(job);
                                }
                              }}
                              className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)] gap-6 items-center px-6 py-4 border-b last:border-none hover:bg-gray-50 cursor-pointer"
                            >
                              <div>
                                <p className="font-medium text-gray-900">{job.title}</p>
                                {job.jobDocumentId && (
                                  <p className="text-xs text-gray-400 mt-0.5">{job.jobDocumentId}</p>
                                )}
                              </div>
                              <p className="text-sm text-gray-700">{job.company}</p>
                              <p className="flex justify-center">
                                <MatchCircle score={job.matchPercentage} />
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="md:hidden divide-y">
                          {visibleAppliedInterestJobs.map((job) => (
                            <div
                              key={job.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => handleApplicationCardClick(job)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleApplicationCardClick(job);
                                }
                              }}
                              className="p-4 hover:bg-gray-50"
                            >
                              <h3 className="font-medium text-gray-900">{job.title}</h3>
                              {job.jobDocumentId && (
                                <p className="text-xs text-gray-400 mt-0.5 mb-1">{job.jobDocumentId}</p>
                              )}
                              <p className="text-sm text-gray-600">{job.company}</p>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-xs text-gray-500">Match Score</span>
                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                  {job.matchPercentage}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      renderEmptyApplications()
                    )
                  )}
                </>
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
                    {visibleRecommendedJobs.length} active role{visibleRecommendedJobs.length === 1 ? "" : "s"} match the current criteria
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
