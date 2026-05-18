"use client";

import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  FileText,
  Hourglass,
  MapPin,
  RefreshCw,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { BaseDrawer } from "./ui/BaseDrawer";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import {
  actionDrawerChrome,
  actionDrawerFirstRecruiterCardId,
  actionDrawerFooter,
  actionDrawerFormDefaults,
  actionDrawerInterview,
  actionDrawerJobDescription,
  actionDrawerJobSummary,
  actionDrawerRecruiterInterest,
  actionDrawerSalary,
  actionDrawerTimeline,
  actionDrawerTitleMatchers,
  type ActionDrawerTab,
} from "./actionDrawer/actionDrawerContent";
import {
  coalesceInterviewDocumentId,
  getAvailableInterviewSlots,
  getInterviewsByProfile,
  pickInterviewIdForSlotSubmit,
  resolveInterviewIdBySlotOwnership,
  resolveInterviewIdForJob,
  type InterviewSlotOptionApi,
} from "@/services/jobs/interviewsApi";
import {
  getRrGeneratedContent,
  type RrGeneratedContentApi,
} from "@/services/jobs/rrGeneratedContent";
import { getRrDetails, type RrDetailsApi } from "@/services/jobs/rrDetails";
import { getProposalData, type ProposalDataApi } from "@/services/jobs/getProposalData";
import { getAvailableDateSalary } from "@/services/jobs/actionCenter";
import { getProfileName } from "@/lib/authSession";

export interface ActionDrawerActionCard {
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
  interviewSlots?: (InterviewSlotOptionApi & { slot_timezone?: string; slot_status?: string })[];
  sourcingAcceptedAt?: string;
  receivedAt?: string;
  applicationStage?: string;
  applicationAppliedDate?: string;
  matchPercentage?: number;
  /** Hiring organization (API `customer`); shown until RR details load. */
  customer?: string;
  skills?: string[];
}

interface ActionDrawerProps {
  open: boolean;
  onClose: () => void;
  action: ActionDrawerActionCard | null;
  /** Optional success text to surface in the Job Action panel (e.g., "Already marked as interested"). */
  successMessage?: string | null;
  /**
   * Profile document id for `profile_id` on interview APIs.
   * When omitted, the drawer falls back to `getProfileName()` from session (same as actionables).
   */
  profileId?: string | null;
  onPrimaryAction?: (
    action: ActionDrawerActionCard,
    extras?: {
      interviewId?: string;
      interviewSlotId?: string;
      availabilityDate?: string;
      expectedSalary?: string;
      acceptTerms?: boolean;
    }
  ) => void | Promise<boolean>;
  onRequestClarification?: (
    action: ActionDrawerActionCard,
    remarks: string
  ) => void | Promise<boolean>;
  /**
   * When true, the browse-and-apply (recommended job) flow treats the role as already applied:
   * primary CTA shows "Applied" and does not submit again.
   */
  jobAlreadyApplied?: boolean;
}

const metaIcons = {
  calendar: Calendar,
  hourglass: Hourglass,
  refresh: RefreshCw,
  clock: Clock,
  users: Users,
} as const;

function getTodayIsoDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getMaxAvailableDateIso(daysFromToday: number): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000 + daysFromToday * 24 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/** Stable key so interview-slot `useEffect` does not re-run when the parent passes a new array with the same slots. */
function interviewSlotsDependencySignature(
  slots: ActionDrawerActionCard["interviewSlots"] | undefined
): string {
  if (!slots?.length) return "";
  return JSON.stringify(
    slots.map((s) => ({
      id: s.slot_id,
      d: s.slot_date,
      t: s.slot_time,
      st: s.slot_status,
    }))
  );
}

function pickInterviewSlotOrFirst(slots: InterviewSlotOptionApi[], prev: string): string {
  const trimmed = prev.trim();
  if (trimmed && slots.some((s) => s.slot_id === trimmed)) return trimmed;
  return slots[0]?.slot_id ?? "";
}

function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, "")}`;
}

function isIsoDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime());
}

/** Map API `available_date` to `<input type="date" />` value (YYYY-MM-DD), clamping to min when needed. */
function normalizeAvailableDateFromApi(raw: string | undefined, minIsoDate: string): string | null {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    if (!isIsoDateString(trimmed)) return null;
    return trimmed < minIsoDate ? minIsoDate : trimmed;
  }
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3].length === 2 ? `19${dmy[3]}` : dmy[3];
    const iso = `${year}-${month}-${day}`;
    if (!isIsoDateString(iso)) return null;
    return iso < minIsoDate ? minIsoDate : iso;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
    const iso = local.toISOString().slice(0, 10);
    return iso < minIsoDate ? minIsoDate : iso;
  }
  return null;
}

function formatTimelineDate(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    // Keep raw only for date-like strings; ignore status labels such as "Submitted".
    const looksDateLike =
      /\d/.test(raw) && (raw.includes("-") || raw.includes("/") || raw.includes(","));
    return looksDateLike ? raw : undefined;
  }
  return parsed.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

/** `isSourcingAccepted` only means "submit already done" for recruiter-interest cards — not interview/salary stages. */
function shouldPrefillSubmittedFromSourcing(action: ActionDrawerActionCard | null): boolean {
  if (!action?.isSourcingAccepted) return false;
  const t = action.title.toLowerCase();
  if (t.includes("interview")) return false;
  if (t.includes("negotiation") || t.includes("proposal") || t.includes("salary")) return false;
  return true;
}

function shouldUseFirstTimeJobTabs(action: ActionDrawerActionCard | null): boolean {
  if (!action) return false;
  return isDirectJobApplyCard(action);
}

function isDirectJobApplyCard(action: ActionDrawerActionCard | null): boolean {
  if (!action) return false;
  // General tab cards represent recommended jobs and should follow
  // the same first-time apply flow as Jobs section cards.
  if (action.type === "General") return true;
  if (action.type !== "Job") return false;
  const title = action.title.toLowerCase();
  const isActionableStage =
    title === actionDrawerTitleMatchers.recruiterInterest ||
    title === actionDrawerTitleMatchers.interviewScheduled ||
    title === actionDrawerTitleMatchers.salaryNegotiation ||
    title.includes("interest") ||
    title.includes("interview") ||
    title.includes("negotiation") ||
    title.includes("proposal") ||
    title.includes("salary");
  return !isActionableStage;
}

function isApplicationTimelineCard(action: ActionDrawerActionCard | null): boolean {
  if (!action) return false;
  return Boolean(action.applicationStage?.trim() || action.applicationAppliedDate?.trim());
}

function isSalaryNegotiationCard(action: ActionDrawerActionCard | null): boolean {
  const title = action?.title.toLowerCase() ?? "";
  return (
    title === actionDrawerTitleMatchers.salaryNegotiation ||
    title.includes("negotiation") ||
    title.includes("proposal") ||
    title.includes("salary")
  );
}

function isActionableStageCard(action: ActionDrawerActionCard | null): boolean {
  if (!action) return false;
  if (action.type !== "Job") return false;
  if (isApplicationTimelineCard(action)) return false;
  return !isDirectJobApplyCard(action);
}

function isRecruiterInterestCard(action: ActionDrawerActionCard | null): boolean {
  const title = action?.title.toLowerCase() ?? "";
  return title === actionDrawerTitleMatchers.recruiterInterest || title.includes("interest");
}

export default function ActionDrawer({
  open,
  onClose,
  action,
  successMessage,
  profileId,
  onPrimaryAction,
  onRequestClarification,
  jobAlreadyApplied = false,
}: ActionDrawerProps) {
  const minAvailableDate = getTodayIsoDate();
  const maxAvailableDate = getMaxAvailableDateIso(90);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionDrawerTab>("Job Action");
  const [availableDate, setAvailableDate] = useState<string>(minAvailableDate);
  const [expectedSalary, setExpectedSalary] = useState<string>(actionDrawerFormDefaults.expectedSalary);
  const [selectedInterviewSlot, setSelectedInterviewSlot] = useState<string>(
    actionDrawerFormDefaults.selectedInterviewSlotId
  );
  const [isProposalExpanded, setIsProposalExpanded] = useState(true);
  const [isProjectInfoExpanded, setIsProjectInfoExpanded] = useState(true);
  const [isSalaryNegotiationExpanded, setIsSalaryNegotiationExpanded] = useState(true);
  const [showClarificationBox, setShowClarificationBox] = useState(false);
  const [clarificationRemark, setClarificationRemark] = useState("");
  const [isClarificationSubmitting, setIsClarificationSubmitting] = useState(false);
  const [showAcceptConfirmation, setShowAcceptConfirmation] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlotOptionApi[]>([]);
  const [interviewSlotsLoading, setInterviewSlotsLoading] = useState(false);
  const [interviewSlotsError, setInterviewSlotsError] = useState<string | null>(null);
  const [resolvedInterviewId, setResolvedInterviewId] = useState<string | null>(null);
  const [jobDescriptionContent, setJobDescriptionContent] = useState<RrGeneratedContentApi | null>(null);
  const [jobDescriptionLoading, setJobDescriptionLoading] = useState(false);
  const [jobDescriptionError, setJobDescriptionError] = useState<string | null>(null);
  const [rrDetails, setRrDetails] = useState<RrDetailsApi | null>(null);
  const [proposalData, setProposalData] = useState<ProposalDataApi | null>(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [apiExpectedSalary, setApiExpectedSalary] = useState<number | null>(null);
  const [showSalaryPopup, setShowSalaryPopup] = useState(false);
  const [salaryPopupVisible, setSalaryPopupVisible] = useState(false);
  const [showSlotConfirmPopup, setShowSlotConfirmPopup] = useState(false);
  const [slotConfirmPopupVisible, setSlotConfirmPopupVisible] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupVisible, setSuccessPopupVisible] = useState(false);
  const [successType, setSuccessType] = useState<"accept" | "clarification">("accept");
  const submitInFlightRef = useRef(false);
  const salaryPopupConfirmedRef = useRef(false);
  const slotConfirmPopupConfirmedRef = useRef(false);
  const availableDateFieldRef = useRef<HTMLDivElement | null>(null);
  const expectedSalaryFieldRef = useRef<HTMLDivElement | null>(null);
  const termsFieldRef = useRef<HTMLLabelElement | null>(null);
  const interviewSlotsSectionRef = useRef<HTMLDivElement | null>(null);
  const clarificationBoxRef = useRef<HTMLDivElement | null>(null);
  /** Avoid wiping interview slot selection on parent re-renders / dashboard refresh when the same actionable is open. */
  const drawerFormResetSessionRef = useRef<string>("");

  const drawerFormResetKey = useMemo(() => {
    if (!open || !action) return "";
    return [
      action.id,
      action.jobDocumentId ?? "",
      action.proposalName ?? "",
      action.title,
      String(action.isSourcingAccepted ?? ""),
    ].join("\u0001");
  }, [open, action?.id, action?.jobDocumentId, action?.proposalName, action?.title, action?.isSourcingAccepted]);

  const scrollToMissingField = (target: HTMLElement | null) => {
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    if (!showAcceptConfirmation) {
      setConfirmVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setConfirmVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [showAcceptConfirmation]);

  useEffect(() => {
    if (!showSalaryPopup) {
      setSalaryPopupVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setSalaryPopupVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [showSalaryPopup]);

  useEffect(() => {
    if (!showSlotConfirmPopup) {
      setSlotConfirmPopupVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setSlotConfirmPopupVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [showSlotConfirmPopup]);

  useEffect(() => {
    if (!showSuccessPopup) {
      setSuccessPopupVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setSuccessPopupVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [showSuccessPopup]);

  useEffect(() => {
    if (!open) {
      drawerFormResetSessionRef.current = "";
      return;
    }
    if (!action || !drawerFormResetKey) return;
    if (drawerFormResetSessionRef.current === drawerFormResetKey) return;
    drawerFormResetSessionRef.current = drawerFormResetKey;

    setActiveTab(
      isApplicationTimelineCard(action)
        ? "Job Description"
        : isRecruiterInterestCard(action)
          ? "Job Description"
        : isActionableStageCard(action)
          ? "Job Action"
        : shouldUseFirstTimeJobTabs(action)
          ? "Job Description"
          : "Job Action"
    );
    setAvailableDate(minAvailableDate);
    setExpectedSalary(actionDrawerFormDefaults.expectedSalary);
    setSelectedInterviewSlot(actionDrawerFormDefaults.selectedInterviewSlotId);
    const startWithSalaryNegotiationOpen = isSalaryNegotiationCard(action);
    setIsProposalExpanded(true);
    setIsProjectInfoExpanded(!startWithSalaryNegotiationOpen);
    setIsSalaryNegotiationExpanded(startWithSalaryNegotiationOpen);
    setShowClarificationBox(false);
    setClarificationRemark("");
    setIsClarificationSubmitting(false);
    setShowAcceptConfirmation(false);
    setHasAcceptedTerms(false);
    setInterviewSlots([]);
    setInterviewSlotsLoading(false);
    setInterviewSlotsError(null);
    setResolvedInterviewId(null);
    setJobDescriptionContent(null);
    setJobDescriptionLoading(false);
    setJobDescriptionError(null);
    setRrDetails(null);
    setProposalData(null);
    setProposalLoading(false);
    setProposalError(null);
    setValidationMessage(null);
    setIsSubmitting(false);
    submitInFlightRef.current = false;
    setHasSubmitted(shouldPrefillSubmittedFromSourcing(action));
    setApiExpectedSalary(null);
    setShowSalaryPopup(false);
    salaryPopupConfirmedRef.current = false;
    setShowSlotConfirmPopup(false);
    slotConfirmPopupConfirmedRef.current = false;
    setShowSuccessPopup(false);
  }, [open, drawerFormResetKey, minAvailableDate, action]);

  const orderedTabs: ActionDrawerTab[] = isApplicationTimelineCard(action)
    ? ["Job Description", "Timeline"]
    : isRecruiterInterestCard(action)
      ? ["Job Description", "Job Action", "Timeline"]
    : isActionableStageCard(action)
      ? [...actionDrawerChrome.tabs]
    : shouldUseFirstTimeJobTabs(action)
      ? ["Job Description", "Job Action", "Timeline"]
      : [...actionDrawerChrome.tabs];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const normalizedTitle = action?.title.toLowerCase() ?? "";
  const isRecruiterInterestReceived = isRecruiterInterestCard(action);
  const isFirstRecruiterInterestCard =
    isRecruiterInterestReceived && action?.id === actionDrawerFirstRecruiterCardId;
  const isInterviewScheduled =
    normalizedTitle === actionDrawerTitleMatchers.interviewScheduled ||
    normalizedTitle.includes("interview");
  const isSalaryNegotiation =
    normalizedTitle === actionDrawerTitleMatchers.salaryNegotiation ||
    normalizedTitle.includes("negotiation") ||
    normalizedTitle.includes("proposal");
  const isDirectApply = isDirectJobApplyCard(action);
  const roleTitle =
    (isRecruiterInterestReceived || isInterviewScheduled || isSalaryNegotiation
      ? action?.subtitle.split(" - ")[0]
      : action?.title) ?? "Senior Engineer";
  const locationLabel =
    rrDetails?.location ||
    (!(isRecruiterInterestReceived || isInterviewScheduled || isSalaryNegotiation)
      ? (action?.subtitle.split(" - ")[1] ?? "")
      : "");

  const resolvedLocationDisplay = (() => {
    const city = locationLabel.trim().replace(/^—$/, "");
    const suffix = (rrDetails?.location_full || actionDrawerJobSummary.locationCountrySuffix).trim().replace(/^—$/, "");
    if (!city && !suffix) return "Unknown location";
    if (!city) return suffix;
    if (!suffix) return city;
    if (city.toLowerCase() === suffix.toLowerCase()) return city;
    return `${city} | ${suffix}`;
  })();

  const resolvedCustomer =
    rrDetails?.customer?.trim() || action?.customer?.trim() || "";

  const resolveInterviewTags = (): string[] => {
    if (!action) return [...actionDrawerInterview.tags];
    const round =
      typeof action.interviewRound === "number" ? `Round ${action.interviewRound}` : null;
    const type = action.interviewType?.trim() || null;
    const mode = action.interviewMode?.trim() || null;
    const tags = [round, type, mode].filter((v): v is string => Boolean(v));
    return tags.length > 0 ? tags : [...actionDrawerInterview.tags];
  };

  const getInterviewTagClassName = (tag: string): string => {
    const normalized = tag.trim().toLowerCase();
    if (normalized.startsWith("round")) {
      return "border border-[#D1D5DB] bg-[#E5E7EB] text-[#374151]";
    }
    if (normalized.includes("technical")) {
      return "border border-[#CDEAF9] bg-[#E0F2FE] text-[#0369A1]";
    }
    if (normalized.includes("virtual")) {
      return "border border-[#D9D6FE] bg-[#EDE9FE] text-[#4C1D95]";
    }
    return "border border-[#D6DCEA] bg-white text-[#5E7397]";
  };

  const formatSlotDate = (raw: string | undefined): string => {
    const value = raw?.trim();
    if (!value) return "—";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
  };

  const formatSlotTime = (
    slot: InterviewSlotOptionApi & { slot_timezone?: string }
  ): string => {
    const time = slot.slot_time?.trim() || "—";
    const tz = slot.slot_timezone?.trim() || "";
    if (tz === "Asia/Kolkata") return `${time} IST (UTC +5.30)`;
    return tz ? `${time} ${tz}` : time;
  };

  const actionInterviewSlotsSig = interviewSlotsDependencySignature(action?.interviewSlots);

  useEffect(() => {
    if (!open || !isInterviewScheduled || !action) return;

    let cancelled = false;
    const effectiveProfileId = profileId?.trim() || getProfileName()?.trim() || "";

    // Actionables often return interview_slots without info.interview_id. Resolve the real Interview
    // name via slot ownership probe + actionable record name (handles "Proposed" slots omitted from listing).
    if (action.interviewSlots && action.interviewSlots.length > 0) {
      const embeddedSlots = action.interviewSlots;
      setInterviewSlots(embeddedSlots);
      setInterviewSlotsError(null);
      setInterviewSlotsLoading(true);
      
      // Preserve user's selection once they've made one
      setSelectedInterviewSlot((prev) => {
        const trimmed = prev.trim();
        if (trimmed) {
          // User has already selected a slot, preserve it
          return trimmed;
        }
        // No previous selection, pick the first slot
        return embeddedSlots[0]?.slot_id ?? "";
      });

      void (async () => {
        try {
          let resolved: string | null = null;
          if (effectiveProfileId && action.jobDocumentId?.trim()) {
            resolved = await resolveInterviewIdBySlotOwnership({
              profileId: effectiveProfileId,
              jobId: action.jobDocumentId.trim(),
              slotId: embeddedSlots[0].slot_id,
              explicitInterviewId: action.interviewId,
              actionableRecordName: action.proposalName,
            });
          }
          if (cancelled) return;
          const finalId =
            resolved ??
            coalesceInterviewDocumentId({
              explicitInterviewId: action.interviewId,
              resolvedFromProfile: null,
              actionableRecordName: action.proposalName,
            });
          setResolvedInterviewId(finalId);
          if (!finalId) {
            setInterviewSlotsError(
              "Could not resolve the interview for this slot. Load your profile on the dashboard and try again."
            );
          }
        } catch (e) {
          if (!cancelled) {
            const fallbackOnly = coalesceInterviewDocumentId({
              explicitInterviewId: action.interviewId,
              resolvedFromProfile: null,
              actionableRecordName: action.proposalName,
            });
            setResolvedInterviewId(fallbackOnly);
            if (!fallbackOnly) {
              setInterviewSlotsError(
                e instanceof Error ? e.message : "Could not resolve interview for this job."
              );
            }
          }
        } finally {
          if (!cancelled) setInterviewSlotsLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      setInterviewSlotsLoading(true);
      setInterviewSlotsError(null);
      try {
        let fromProfile: string | null = null;
        if (effectiveProfileId && action.jobDocumentId?.trim()) {
          const list = await getInterviewsByProfile(effectiveProfileId);
          if (cancelled) return;
          fromProfile = resolveInterviewIdForJob(list, action.jobDocumentId.trim());
        }
        if (cancelled) return;
        const interviewId = coalesceInterviewDocumentId({
          explicitInterviewId: action.interviewId,
          resolvedFromProfile: fromProfile,
          actionableRecordName: action.proposalName,
        });
        setResolvedInterviewId(interviewId);
        if (!interviewId) {
          setInterviewSlots([]);
          setSelectedInterviewSlot("");
          setInterviewSlotsError("No interview was found for this job. Try again later.");
          return;
        }
        const slots = await getAvailableInterviewSlots(interviewId);
        if (cancelled) return;
        setInterviewSlots(slots);
        
        // Preserve user's selection once they've made one
        setSelectedInterviewSlot((prev) => {
          const trimmed = prev.trim();
          if (trimmed) {
            // User has already selected a slot, preserve it
            return trimmed;
          }
          // No previous selection, pick the first slot
          return slots[0]?.slot_id ?? "";
        });
      } catch (e) {
        if (cancelled) return;
        setInterviewSlots([]);
        setSelectedInterviewSlot("");
        setInterviewSlotsError(e instanceof Error ? e.message : "Could not load interview slots.");
      } finally {
        if (!cancelled) setInterviewSlotsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    isInterviewScheduled,
    action?.id,
    action?.interviewId,
    actionInterviewSlotsSig,
    action?.jobDocumentId,
    action?.proposalName,
    profileId,
  ]);

  useEffect(() => {
    const rrName = action?.jobDocumentId?.trim();
    if (!open || !rrName) return;
    let cancelled = false;
    void (async () => {
      setJobDescriptionLoading(true);
      setJobDescriptionError(null);
      try {
        const content = await getRrGeneratedContent(rrName);
        if (cancelled) return;
        setJobDescriptionContent(content);
      } catch (e) {
        if (cancelled) return;
        setJobDescriptionContent(null);
        setJobDescriptionError(
          e instanceof Error ? e.message : "Could not load job description."
        );
      } finally {
        if (!cancelled) setJobDescriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, action?.jobDocumentId]);

  useEffect(() => {
    const rrCandidate = action?.rrCandidateName?.trim();
    const proposalName = action?.proposalName?.trim();
    if (!open || !isSalaryNegotiation || (!rrCandidate && !proposalName)) return;
    let cancelled = false;
    void (async () => {
      setProposalLoading(true);
      setProposalError(null);
      try {
        const data = await getProposalData({
          rrCandidateId: rrCandidate,
          proposalName,
        });
        if (cancelled) return;
        setProposalData(data);
      } catch (e) {
        if (cancelled) return;
        setProposalData(null);
        setProposalError(e instanceof Error ? e.message : "Could not load proposal details.");
      } finally {
        if (!cancelled) setProposalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isSalaryNegotiation, action?.rrCandidateName, action?.proposalName]);

  useEffect(() => {
    const rrName = action?.jobDocumentId?.trim();
    if (!open || !rrName) return;
    let cancelled = false;
    void (async () => {
      try {
        const details = await getRrDetails(rrName);
        if (cancelled) return;
        setRrDetails(details);
      } catch {
        if (cancelled) return;
        setRrDetails(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, action?.jobDocumentId]);

  useEffect(() => {
    if (!open) return;
    if (!isDirectJobApplyCard(action) && !isRecruiterInterestCard(action)) return;
    const effectiveProfileId = profileId?.trim() || getProfileName()?.trim() || "";
    if (!effectiveProfileId) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await getAvailableDateSalary(effectiveProfileId);
        if (cancelled) return;
        if (result.expected_salary > 0) {
          setApiExpectedSalary(result.expected_salary);
          setExpectedSalary(sanitizeDecimalInput(String(result.expected_salary)));
        }
        const normalizedAvailable = normalizeAvailableDateFromApi(result.available_date, minAvailableDate);
        if (normalizedAvailable) {
          setAvailableDate(normalizedAvailable);
        }
      } catch {
        // silently ignore — just don't pre-fill
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, action?.title, action?.type, profileId, minAvailableDate]);

  const interviewSubmitDisabled =
    isInterviewScheduled &&
    (interviewSlotsLoading ||
      !resolvedInterviewId ||
      interviewSlots.length === 0 ||
      !selectedInterviewSlot);
  const parsedExpectedSalary = Number.parseFloat(expectedSalary);
  const recruiterDateInvalid = !availableDate || availableDate < minAvailableDate || availableDate > maxAvailableDate;
  const recruiterSalaryInvalid = !Number.isFinite(parsedExpectedSalary) || parsedExpectedSalary <= 0;
  const directApplyDateInvalid = isDirectApply && (!availableDate || availableDate < minAvailableDate || availableDate > maxAvailableDate);
  const directApplySalaryInvalid =
    isDirectApply && (!Number.isFinite(parsedExpectedSalary) || parsedExpectedSalary <= 0);
  const directApplyTermsInvalid = isDirectApply && !hasAcceptedTerms;
  const recruiterSubmitDisabled =
    isRecruiterInterestReceived && (recruiterDateInvalid || recruiterSalaryInvalid || !hasAcceptedTerms);
  const primarySubmitDisabled = Boolean(
    isSubmitting ||
      hasSubmitted ||
      (isDirectApply && jobAlreadyApplied && activeTab === "Job Action")
  );
  const resolvedMatchPercent =
    rrDetails?.match_score != null
      ? `${Math.round(rrDetails.match_score)}%`
      : action?.matchPercentage != null
        ? `${action.matchPercentage}%`
        : actionDrawerJobSummary.matchPercentLabel;
  const resolvedPostedAgo = rrDetails?.posted_time || action?.timestamp || actionDrawerJobSummary.postedAgo;
  const resolvedReferenceId = action?.jobDocumentId?.trim() || action?.proposalName?.trim() || "—";
  const resolvedRotationCycle =
    rrDetails?.rotation_cycle?.trim() === "0"
      ? "No Rotation"
      : rrDetails?.rotation_cycle || actionDrawerJobSummary.metaFields[3].value;
  const recruiterAcceptedDateLabel = formatTimelineDate(action?.sourcingAcceptedAt);
  const stageReceivedDateLabel =
    formatTimelineDate(action?.receivedAt) || formatTimelineDate(action?.timestamp);
  const proposalJoiningDateLabel = formatTimelineDate(proposalData?.proposed_joining_date);
  const resolvedMetaFields = [
    {
      label: "Position Est. Start Date",
      value: rrDetails?.position_start_date || "0",
      icon: "calendar" as const,
    },
    {
      label: "Position Est. End Date",
      value: rrDetails?.position_est_end_date || "0",
      icon: "calendar" as const,
    },
    {
      label: "Minimum Contract Duration",
      value: rrDetails?.contract_duration || actionDrawerJobSummary.metaFields[2].value,
      icon: "hourglass" as const,
    },
    {
      label: "Rotation Cycle",
      value: resolvedRotationCycle,
      icon: "refresh" as const,
    },
    {
      label: "Working Hours / Day",
      value: rrDetails?.hours_per_day || actionDrawerJobSummary.metaFields[4].value,
      icon: "clock" as const,
    },
    {
      label: "Working Days / Week",
      value: rrDetails?.days_per_week || actionDrawerJobSummary.metaFields[5].value,
      icon: "users" as const,
    },
  ];

  const renderRecruiterInterestAction = (
    sectionTitle: string = actionDrawerRecruiterInterest.sectionTitle
  ) => (
    <div className="rounded-md border border-[#D8E3F8] bg-[#F5F8FF] p-3.5 sm:p-4">
      <h3 className="text-base font-semibold text-[#202939] sm:text-lg">
        {sectionTitle}
      </h3>

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
        <div ref={availableDateFieldRef}>
          <label className="mb-1.5 block text-xs font-medium text-[#202939] sm:text-sm">
            {actionDrawerRecruiterInterest.availableDateLabel}
          </label>
          <div className="relative">
            <input
              type="date"
              value={availableDate}
              min={minAvailableDate}
              max={maxAvailableDate}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) { setAvailableDate(next); return; }
                if (next < minAvailableDate) { setAvailableDate(minAvailableDate); return; }
                if (next > maxAvailableDate) { setAvailableDate(maxAvailableDate); return; }
                setAvailableDate(next);
              }}
              className="te-date-input h-10 w-full appearance-none rounded border border-[#D6DCEA] bg-white px-3 pr-10 text-xs text-[#202939] outline-none transition focus:border-[#1D4ED8] sm:h-11 sm:px-3.5 sm:text-sm"
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E7397] sm:right-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>

        <div ref={expectedSalaryFieldRef}>
          <label className="mb-1.5 block text-xs font-medium text-[#202939] sm:text-sm">
            {actionDrawerRecruiterInterest.expectedSalaryLabel}
          </label>
          <div className="flex h-10 overflow-hidden rounded border border-[#D6DCEA] bg-white sm:h-11">
            <div className="flex w-9 items-center justify-center border-r border-[#D6DCEA] text-base text-[#202939] sm:w-10 sm:text-lg">
              {actionDrawerRecruiterInterest.currencySymbol}
            </div>
            <input
              value={expectedSalary}
              onChange={(event) => setExpectedSalary(sanitizeDecimalInput(event.target.value))}
              className="min-w-0 flex-1 px-3 text-xs text-[#202939] outline-none sm:px-3.5 sm:text-sm"
              inputMode="decimal"
            />
            <div className="flex items-center pr-3 text-xs text-[#202939] sm:pr-3.5 sm:text-sm">
              {actionDrawerRecruiterInterest.salaryRateSuffix}
            </div>
          </div>
        </div>
      </div>

      <label
        ref={termsFieldRef}
        className="mt-3 flex items-start gap-2.5 text-xs text-[#202939] sm:text-sm"
      >
        <input
          type="checkbox"
          checked={hasAcceptedTerms}
          onChange={(event) => setHasAcceptedTerms(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#1D4ED8] text-[#1D4ED8]"
        />
        <span>{actionDrawerRecruiterInterest.termsAgreement}</span>
      </label>
      {validationMessage ? (
        <p className="mt-2 text-xs text-red-600">
          {validationMessage}
        </p>
      ) : null}
      {!validationMessage && successMessage ? (
        <p className="mt-2 text-xs text-green-700">{successMessage}</p>
      ) : null}
    </div>
  );

  const renderInterviewScheduledAction = () => (
    <div ref={interviewSlotsSectionRef} className="rounded-md border border-[#D8E3F8] bg-[#F5F8FF] p-3.5 sm:p-4">
      <h3 className="text-base font-semibold text-[#202939] sm:text-lg">
        {actionDrawerInterview.sectionTitle}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {resolveInterviewTags().map((tag) => (
          <span
            key={tag}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium sm:px-3 sm:py-1.5 sm:text-xs ${getInterviewTagClassName(tag)}`}
          >
            {tag}
          </span>
        ))}
      </div>

      {interviewSlotsLoading ? (
        <div className="mt-4 flex flex-col items-center justify-center py-6 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-semibold text-[#202939]">Loading available slots…</p>
          <p className="text-sm text-[#5E7397]">Fetching your interview time options.</p>
        </div>
      ) : interviewSlotsError ? (
        <p className="mt-4 text-sm text-red-600">{interviewSlotsError}</p>
      ) : interviewSlots.length === 0 ? (
        <p className="mt-4 text-sm text-[#5E7397]">No open slots right now.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded border border-[#E6ECF6] bg-white">
          <div className="hidden border-b border-[#E6ECF6] lg:block">
            <div className="grid grid-cols-[minmax(72px,100px)_1fr_1fr_minmax(160px,1.35fr)] items-center gap-2 px-4 py-2 text-xs font-medium text-[#202939] sm:text-sm">
              <span className="text-center">{actionDrawerInterview.tableHeaders.select}</span>
              <span>{actionDrawerInterview.tableHeaders.slot}</span>
              <span>{actionDrawerInterview.tableHeaders.date}</span>
              <span>{actionDrawerInterview.tableHeaders.time}</span>
            </div>
            {interviewSlots.map((slot) => (
              <label
                key={slot.slot_id}
                className={`grid cursor-pointer grid-cols-[minmax(72px,100px)_1fr_1fr_minmax(160px,1.35fr)] items-center gap-2 border-t border-[#E6ECF6] px-4 py-3 transition-colors ${
                  selectedInterviewSlot === slot.slot_id
                    ? "bg-[#EFF6FF] border-t border-[#1D4ED8]"
                    : "hover:bg-[#F9FAFB]"
                }`}
              >
                <div className="flex items-center justify-center">
                  <input
                    type="radio"
                    name="interview-slot-desktop"
                    checked={selectedInterviewSlot === slot.slot_id}
                    onChange={() => {}}
                    onClick={() => setSelectedInterviewSlot(slot.slot_id)}
                    className="h-4 w-4 cursor-pointer accent-[#1D4ED8]"
                  />
                </div>
                <span className="text-xs text-[#202939] sm:text-sm">{slot.label}</span>
                <span className="text-xs text-[#202939] sm:text-sm">
                  {formatSlotDate(slot.slot_date)}
                </span>
                <span className="text-xs leading-snug text-[#202939] sm:text-sm">
                  {formatSlotTime(slot)}
                </span>
              </label>
            ))}
          </div>

          <div className="divide-y divide-[#E6ECF6] lg:hidden">
            {interviewSlots.map((slot) => (
              <div
                key={slot.slot_id}
                className={`px-4 py-3 transition-colors ${
                  selectedInterviewSlot === slot.slot_id ? "bg-[#EFF6FF]" : "hover:bg-[#F9FAFB]"
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="interview-slot-mobile"
                    checked={selectedInterviewSlot === slot.slot_id}
                    onChange={() => {}}
                    onClick={() => setSelectedInterviewSlot(slot.slot_id)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#1D4ED8]"
                  />
                  <div className="min-w-0 flex-1 space-y-1.5 text-xs text-[#202939] sm:text-sm">
                    <p className="font-semibold text-[#202939]">{slot.label}</p>
                    <p>
                      <span className="text-[#5E7397]">{actionDrawerInterview.mobileDatePrefix} </span>
                      <span className="font-medium">{formatSlotDate(slot.slot_date)}</span>
                    </p>
                    <p>
                      <span className="text-[#5E7397]">{actionDrawerInterview.mobileTimePrefix} </span>
                      <span className="font-medium">{formatSlotTime(slot)}</span>
                    </p>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSalaryNegotiationAction = () => {
    const cur = proposalData?.billing_currency || "USD";
    const freq = proposalData?.billing_frequency || "Hourly";
    const fmtMoney = (n?: number, currency = cur) =>
      n != null ? `${currency} ${n.toLocaleString()}` : null;
    const fmtDate = (d?: string) => {
      if (!d) return null;
      const p = new Date(`${d}T00:00:00`);
      return Number.isNaN(p.getTime())
        ? d
        : p.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    };

    const rateRows = proposalData?.totals
      ? [
          { label: "Regular Hourly Rate", value: fmtMoney(proposalData.totals.regular_hourly), highlight: true },
          { label: "Daily Salary", value: fmtMoney(proposalData.totals.base_daily_salary), highlight: false },
          { label: "Overtime — Weekdays", value: fmtMoney(proposalData.totals.overtime_hourly_weekdays), highlight: false },
          { label: "Overtime — Weekends", value: fmtMoney(proposalData.totals.overtime_hourly_weekends), highlight: false },
          { label: "Overtime — Public Holidays", value: fmtMoney(proposalData.totals.overtime_hourly_national_holidays), highlight: false },
          { label: "Standby Rate", value: fmtMoney(proposalData.totals.stand_by), highlight: false },
        ].filter((r) => r.value !== null)
      : [];

    const clientRateStr = proposalData?.rr_min_bill_rate != null
      ? `${proposalData.rr_billing_currency || cur} ${proposalData.rr_min_bill_rate.toLocaleString()}${
          proposalData.rr_max_bill_rate && proposalData.rr_max_bill_rate !== proposalData.rr_min_bill_rate
            ? ` – ${proposalData.rr_max_bill_rate.toLocaleString()}`
            : ""
        } / ${proposalData.rr_billing_frequency || "mo"}`
      : null;

    return (
    <div className="space-y-3.5">
      {/* ── Proposal ── */}
      <div className="overflow-hidden rounded-xl border border-[#D8E3F8] bg-white shadow-sm">
        <button
          type="button"
          onClick={() =>
            setIsProposalExpanded((current) => {
              const next = !current;
              if (next) setIsSalaryNegotiationExpanded(false);
              return next;
            })
          }
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <FileText className="h-4 w-4 text-[#1D4ED8]" />
            </div>
            <h3 className="text-base font-semibold text-[#202939]">Proposal Details</h3>
          </div>
          {isProposalExpanded
            ? <ChevronUp className="h-5 w-5 text-[#5E7397]" />
            : <ChevronDown className="h-5 w-5 text-[#5E7397]" />}
        </button>

        {isProposalExpanded && (
          <div className="border-t border-[#E6ECF6] divide-y divide-[#F0F4FA]">

            {/* Loading / error */}
            {proposalLoading && (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-semibold text-[#202939]">Loading proposal details…</p>
                <p className="text-sm text-[#5E7397]">Fetching your salary proposal.</p>
              </div>
            )}
            {proposalError && !proposalLoading && (
              <p className="px-4 py-3 text-xs text-red-500">{proposalError}</p>
            )}

            {/* ── Status banner ── */}
            {proposalData && (
              <div className="px-4 py-3 bg-emerald-50 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {proposalData.rr_candidate_status || "Awaiting Candidate Acceptance"}
                </span>
                {proposalData.proposal_name && (
                  <span className="text-xs text-emerald-700 font-medium">{proposalData.proposal_name}</span>
                )}
                {proposalData.proposal_version && (
                  <span className="rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    Version {proposalData.proposal_version}
                  </span>
                )}
              </div>
            )}

            {/* ── Your Compensation ── */}
            {proposalData && (
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Banknote className="h-4 w-4 text-[#1D4ED8]" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#1D4ED8]">Your Compensation</p>
                </div>

                {/* Hero salary */}
                <div className="rounded-xl bg-gradient-to-br from-[#1D4ED8] to-[#3B82F6] px-4 py-4 text-white">
                  <p className="text-xs font-medium text-blue-200 uppercase tracking-wide mb-1">Base Salary</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold">
                      {proposalData.candidate_expected_salary != null
                        ? `${cur} ${proposalData.candidate_expected_salary.toLocaleString()}`
                        : "—"}
                    </span>
                    <span className="text-base font-medium text-blue-200">/ {freq}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-blue-200">All values are rounded off</p>
                </div>

                {/* Rate breakdown table */}
                {rateRows.length > 0 && (
                  <div className="rounded-xl border border-[#E6ECF6] overflow-hidden">
                    <div className="bg-[#F8FAFF] px-3 py-2 flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-[#5E7397]" />
                      <p className="text-xs font-semibold text-[#5E7397] uppercase tracking-wide">Rate Breakdown</p>
                    </div>
                    {rateRows.map((row, i) => (
                      <div
                        key={row.label}
                        className={`flex items-center justify-between px-3 py-2.5 ${i < rateRows.length - 1 ? "border-b border-[#F0F4FA]" : ""} ${row.highlight ? "bg-blue-50/50" : ""}`}
                      >
                        <span className={`text-sm ${row.highlight ? "font-semibold text-[#202939]" : "text-[#5E7397]"}`}>
                          {row.label}
                        </span>
                        <span className={`text-sm font-bold ${row.highlight ? "text-[#1D4ED8]" : "text-[#202939]"}`}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Assignment Details ── */}
            {proposalData && (
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-[#5E7397]" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5E7397]">Assignment Details</p>
                </div>

                <div className="rounded-xl border border-[#E6ECF6] overflow-hidden">
                  {[
                    {
                      icon: <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />,
                      label: "Joining Date",
                      value: fmtDate(proposalData.proposed_joining_date),
                      emphasis: true,
                    },
                    {
                      icon: <ChevronRight className="h-4 w-4 text-[#5E7397] shrink-0" />,
                      label: "Contract Period",
                      value:
                        fmtDate(proposalData.start_date) && fmtDate(proposalData.end_date)
                          ? `${fmtDate(proposalData.start_date)} → ${fmtDate(proposalData.end_date)}`
                          : fmtDate(proposalData.start_date),
                      emphasis: false,
                    },
                    {
                      icon: <MapPin className="h-4 w-4 text-[#5E7397] shrink-0" />,
                      label: "Country",
                      value: proposalData.country,
                      emphasis: false,
                    },
                    {
                      icon: <Clock className="h-4 w-4 text-[#5E7397] shrink-0" />,
                      label: "Working Hours",
                      value:
                        proposalData.hours_per_day != null && proposalData.days_per_week != null
                          ? `${proposalData.hours_per_day} hrs/day · ${proposalData.days_per_week} days/week`
                          : null,
                      emphasis: false,
                    },
                    {
                      icon: <Building2 className="h-4 w-4 text-[#5E7397] shrink-0" />,
                      label: "Client Bill Rate",
                      value: clientRateStr,
                      emphasis: false,
                    },
                  ]
                    .filter((r) => r.value)
                    .map((row, i, arr) => (
                      <div
                        key={row.label}
                        className={`flex items-start gap-3 px-3 py-2.5 ${i < arr.length - 1 ? "border-b border-[#F0F4FA]" : ""}`}
                      >
                        <div className="mt-0.5">{row.icon}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-[#5E7397]">{row.label}</p>
                          <p className={`text-sm mt-0.5 ${row.emphasis ? "font-bold text-[#1D4ED8]" : "font-semibold text-[#202939]"}`}>
                            {row.value}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* ── Customer Remarks ── */}
            {proposalData?.customer_remarks && (
              <div className="px-4 py-4">
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1.5">Remarks from Client</p>
                  <p className="text-sm text-amber-900 leading-relaxed">{proposalData.customer_remarks}</p>
                </div>
              </div>
            )}

            {/* ── Terms & Responsibilities ── */}
            {(proposalData?.by_customer_terms?.length || proposalData?.by_candidate_terms?.length) && (
              <div className="px-4 py-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-[#5E7397]" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#5E7397]">
                    What&apos;s Covered
                  </p>
                </div>
                <p className="text-xs text-[#5E7397] -mt-2">
                  Benefits and costs handled on your behalf
                </p>

                {proposalData?.by_customer_terms?.length ? (
                  <div className="rounded-xl border border-[#E6ECF6] px-4 py-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-2.5 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Covered by Client / TE
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {proposalData.by_customer_terms.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {proposalData?.by_candidate_terms?.length ? (
                  <div className="rounded-xl border border-[#E6ECF6] px-4 py-3">
                    <p className="text-xs font-semibold text-orange-700 mb-2.5">Your Responsibility</p>
                    <div className="flex flex-wrap gap-1.5">
                      {proposalData.by_candidate_terms.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-orange-50 border border-orange-200 px-2.5 py-0.5 text-xs font-medium text-orange-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Salary Negotiation ── */}
      <div className="overflow-hidden rounded-xl border border-[#D8E3F8] bg-white shadow-sm">
        <button
          type="button"
          onClick={() =>
            setIsSalaryNegotiationExpanded((current) => {
              const next = !current;
              if (next) {
                setIsProjectInfoExpanded(false);
                setIsProposalExpanded(false);
              }
              return next;
            })
          }
          className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <Banknote className="h-4 w-4 text-violet-600" />
            </div>
            <h3 className="text-base font-semibold text-[#202939]">Salary Negotiation</h3>
          </div>
          {isSalaryNegotiationExpanded
            ? <ChevronUp className="h-5 w-5 text-[#5E7397]" />
            : <ChevronDown className="h-5 w-5 text-[#5E7397]" />}
        </button>

        {isSalaryNegotiationExpanded && (
          <div className="border-t border-[#E6ECF6] px-4 py-4">
            {showClarificationBox ? (
              <div ref={clarificationBoxRef}>
                <h4 className="mb-1.5 text-sm font-semibold text-[#202939]">Your Remarks</h4>
                <p className="mb-2.5 text-xs text-[#5E7397]">Share your counter-offer or ask for clarification on any terms.</p>
                <textarea
                  value={clarificationRemark}
                  onChange={(event) => setClarificationRemark(event.target.value)}
                  placeholder="E.g. I'd like to discuss the base rate or the joining date..."
                  className="min-h-[130px] w-full resize-y rounded-xl border border-[#D6DCEA] p-3 text-sm text-[#202939] outline-none transition focus:border-[#1D4ED8] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            ) : (
              <div className="rounded-xl bg-[#F8FAFF] border border-[#E6ECF6] px-4 py-3">
                <p className="text-sm font-medium text-[#202939] mb-0.5">Want to negotiate?</p>
                <p className="text-xs text-[#5E7397]">
                  Tap &quot;Request Clarification&quot; below to share your counter-offer or questions about this proposal.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    );
  };

  const renderJobActionContent = () => {
    if (isDirectApply) {
      return renderRecruiterInterestAction("Send Interest to Recruiter");
    }

    if (isInterviewScheduled) {
      return renderInterviewScheduledAction();
    }

    if (isSalaryNegotiation) {
      return renderSalaryNegotiationAction();
    }

    return renderRecruiterInterestAction();
  };

  const renderTimelineContent = () => {
    const milestones: { title: string; date: string }[] = [];

    if (isInterviewScheduled) {
      if (recruiterAcceptedDateLabel) {
        milestones.push({
          title: "Recruiter Interest Accepted",
          date: recruiterAcceptedDateLabel,
        });
      }
      if (stageReceivedDateLabel && stageReceivedDateLabel !== recruiterAcceptedDateLabel) {
        milestones.push({
          title: "Interview Accepted",
          date: stageReceivedDateLabel,
        });
      }
    } else if (isSalaryNegotiation) {
      if (recruiterAcceptedDateLabel) {
        milestones.push({
          title: "Recruiter Interest Accepted",
          date: recruiterAcceptedDateLabel,
        });
      }
      if (stageReceivedDateLabel) {
        milestones.push({
          title: "Interview Accepted",
          date: stageReceivedDateLabel,
        });
      }
      if (proposalJoiningDateLabel) {
        milestones.push({
          title: "Salary Proposal Received",
          date: proposalJoiningDateLabel,
        });
      }
    } else if (isDirectApply) {
      const applicationDate = formatTimelineDate(action?.applicationAppliedDate) || stageReceivedDateLabel;
      const stageLabel = action?.applicationStage?.trim() || "Received";
      if (applicationDate) {
        milestones.push({
          title: "Application Submitted",
          date: applicationDate,
        });
        milestones.push({
          title: `Current Stage: ${stageLabel}`,
          date: applicationDate,
        });
      }
    } else if (recruiterAcceptedDateLabel) {
      milestones.push({
        title: actionDrawerTimeline.milestoneTitles.default,
        date: recruiterAcceptedDateLabel,
      });
    }

    const hasMilestones = milestones.length > 0;
    return (
      <div className="rounded-md border border-[#E6ECF6] bg-[#F8FAFD] p-4 sm:p-5">
        {hasMilestones ? (
          <div className="space-y-4">
            {milestones.map((milestone) => (
              <div key={`${milestone.title}|${milestone.date}`} className="flex items-center gap-3 sm:gap-4">
                <div className="flex shrink-0 items-center justify-center" aria-hidden>
                  <div className="box-content h-2.5 w-2.5 shrink-0 rounded-full border-[3px] border-[#1447E6] bg-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold leading-snug text-[#202939] sm:text-base">
                    {milestone.title}
                  </h4>
                  <p className="mt-0.5 text-xs leading-snug text-[#5E7397] sm:text-sm">
                    {milestone.date}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-[#E6ECF6] bg-white px-6 py-10 sm:min-h-[220px] sm:py-12">
            <Image
              width={40}
              height={40}
              src={actionDrawerTimeline.emptyStateIconSrc}
              alt=""
            />
            <p className="mt-4 max-w-[280px] text-center text-lg font-medium leading-relaxed text-black sm:text-base">
              {actionDrawerTimeline.emptyStateMessage}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderJobDescriptionContent = (isMobile = false) => (
    <div
      className={`rounded-md border border-[#E6ECF6] bg-[#F8FAFD] ${
        isMobile ? "space-y-5 p-4" : "space-y-4 p-4 sm:p-5"
      }`}
    >
      {action?.skills && action.skills.length > 0 ? (
        <section>
          <h4 className={`font-semibold text-[#202939] ${isMobile ? "mb-3 text-[15px]" : "mb-2 text-sm sm:text-base"}`}>
            Key Skills
          </h4>
          <div className="flex flex-wrap gap-2">
            {action.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-[#D6DCEA] bg-white px-2.5 py-1 text-xs font-medium text-[#374151]"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      {jobDescriptionLoading ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <p className="mb-1 text-sm font-semibold text-[#202939]">Loading job description…</p>
          <p className="text-sm text-[#5E7397]">Fetching the full details for this role.</p>
        </div>
      ) : null}
      {!jobDescriptionLoading && jobDescriptionContent ? (
        <div className="space-y-4">
          {jobDescriptionContent.job_description_header ? (
            <div
              className="text-sm text-[#202939] [&_h3]:text-base [&_h3]:font-semibold [&_div]:text-xs [&_div]:text-[#5E7397] [&_div]:sm:text-sm"
              dangerouslySetInnerHTML={{ __html: jobDescriptionContent.job_description_header }}
            />
          ) : null}
          {jobDescriptionContent.job_description ? (
            <div
              className="text-xs leading-relaxed text-[#5E7397] sm:text-sm [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: jobDescriptionContent.job_description }}
            />
          ) : null}
          {jobDescriptionContent.advertised_position_header ? (
            <div
              className="text-sm text-[#202939] [&_h3]:text-base [&_h3]:font-semibold [&_div]:text-xs [&_div]:text-[#5E7397] [&_div]:sm:text-sm"
              dangerouslySetInnerHTML={{ __html: jobDescriptionContent.advertised_position_header }}
            />
          ) : null}
          {jobDescriptionContent.advertised_position ? (
            <div
              className="text-xs leading-relaxed text-[#5E7397] sm:text-sm [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
              dangerouslySetInnerHTML={{ __html: jobDescriptionContent.advertised_position }}
            />
          ) : null}
        </div>
      ) : null}
      {!jobDescriptionLoading && !jobDescriptionContent && jobDescriptionError ? (
        <p className="text-sm text-red-600">{jobDescriptionError}</p>
      ) : null}
      {!jobDescriptionLoading && !jobDescriptionContent ? (
      <>
      <section>
        <h3 className={`font-semibold text-[#202939] ${isMobile ? "mb-4 text-[15px]" : "mb-2 sm:mb-3 text-sm sm:text-base"}`}>
          {actionDrawerJobDescription.overview.title}
        </h3>
        <p className={isMobile ? "text-sm leading-7 text-[#5E7397]" : "text-xs leading-relaxed text-[#5E7397] sm:text-sm"}>
          {actionDrawerJobDescription.overview.body}
        </p>
      </section>

      <section>
        <h4 className={`font-semibold text-[#202939] ${isMobile ? "mb-3 text-[15px]" : "mb-2 text-base"}`}>
          {actionDrawerJobDescription.responsibilities.title}
        </h4>
        <ul className={isMobile ? "list-disc space-y-1 pl-5 text-sm leading-7 text-[#5E7397]" : "list-inside list-disc space-y-1 text-sm text-[#5E7397]"}>
          {actionDrawerJobDescription.responsibilities.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className={`font-semibold text-[#202939] ${isMobile ? "mb-3 text-[15px]" : "mb-1.5 sm:mb-2 text-sm sm:text-base"}`}>
          {actionDrawerJobDescription.qualifications.title}
        </h4>
        <ul className={isMobile ? "list-disc space-y-1 pl-5 text-sm leading-7 text-[#5E7397]" : "list-inside list-disc space-y-0.5 text-xs text-[#5E7397] sm:space-y-1 sm:text-sm"}>
          {actionDrawerJobDescription.qualifications.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      </>
      ) : null}
    </div>
  );

  const renderTabNavigation = (mobile = false) => (
    <div
      className={`flex gap-3 overflow-x-auto border-b border-[#E6ECF6] text-xs scrollbar-hide sm:gap-4 sm:text-sm ${
        mobile ? "-mx-4 px-4" : ""
      }`}
    >
      {orderedTabs.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(tab)}
          className={`pb-1.5 font-medium whitespace-nowrap transition-colors sm:pb-2 ${
            activeTab === tab
              ? "border-b-[3px] border-[#1447E6] text-[#1447E6]"
              : "text-[#5E7397] hover:text-[#202939]"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  const runPrimaryAction = () => {
    if (!action) return;
    if (submitInFlightRef.current || isSubmitting || hasSubmitted) return;
    if (isDirectApply && jobAlreadyApplied && activeTab === "Job Action") return;
    if (isRecruiterInterestReceived && activeTab !== "Job Action") {
      setValidationMessage(null);
      setActiveTab("Job Action");
      return;
    }
    if (isDirectApply && activeTab !== "Job Action") {
      setValidationMessage(null);
      setActiveTab("Job Action");
      return;
    }
    if (isRecruiterInterestReceived && activeTab !== "Job Action") {
      setValidationMessage(null);
      setActiveTab("Job Action");
      return;
    }
    if (isInterviewScheduled && interviewSubmitDisabled) {
      setValidationMessage("Please select an available interview slot to continue.");
      scrollToMissingField(interviewSlotsSectionRef.current);
      return;
    }
    if (isDirectApply && (directApplyDateInvalid || directApplySalaryInvalid || directApplyTermsInvalid)) {
      if (directApplyDateInvalid) {
        setValidationMessage("Please enter a valid available date to continue.");
        scrollToMissingField(availableDateFieldRef.current);
      } else if (directApplySalaryInvalid) {
        setValidationMessage("Expected salary must be greater than 0.");
        scrollToMissingField(expectedSalaryFieldRef.current);
      } else if (directApplyTermsInvalid) {
        setValidationMessage("Please accept the terms to continue.");
        scrollToMissingField(termsFieldRef.current);
      }
      return;
    }
    setValidationMessage(null);
    if (isRecruiterInterestReceived && recruiterSubmitDisabled) {
      if (recruiterDateInvalid) {
        setValidationMessage("Please enter a valid available date to continue.");
        scrollToMissingField(availableDateFieldRef.current);
      } else if (recruiterSalaryInvalid) {
        setValidationMessage("Expected salary must be greater than 0.");
        scrollToMissingField(expectedSalaryFieldRef.current);
      } else if (!hasAcceptedTerms) {
        setValidationMessage("Please accept the terms to continue.");
        scrollToMissingField(termsFieldRef.current);
      }
      return;
    }
    if (isRecruiterInterestReceived) {
      const parsedAvailableDate = availableDate.trim();
      if (!isIsoDateString(parsedAvailableDate) || parsedAvailableDate < minAvailableDate || parsedAvailableDate > maxAvailableDate) {
        setValidationMessage("Please enter a valid available date to continue.");
        scrollToMissingField(availableDateFieldRef.current);
        return;
      }
      if (!Number.isFinite(parsedExpectedSalary) || parsedExpectedSalary <= 0) {
        setValidationMessage("Expected salary must be greater than 0.");
        scrollToMissingField(expectedSalaryFieldRef.current);
        return;
      }
      if (!hasAcceptedTerms) {
        setValidationMessage("Please accept the terms to continue.");
        scrollToMissingField(termsFieldRef.current);
        return;
      }
    }
    if (
      apiExpectedSalary !== null &&
      !salaryPopupConfirmedRef.current &&
      (isRecruiterInterestReceived || isDirectApply)
    ) {
      setShowSalaryPopup(true);
      return;
    }
    if (isInterviewScheduled && !slotConfirmPopupConfirmedRef.current) {
      setShowSlotConfirmPopup(true);
      return;
    }
    void (async () => {
      submitInFlightRef.current = true;
      setIsSubmitting(true);
      try {
        let ok = true;
        if (isInterviewScheduled) {
          const interviewId = pickInterviewIdForSlotSubmit({
            resolvedInterviewId,
            explicitCardInterviewId: action.interviewId,
            actionableRecordName: action.proposalName,
          });
          const result = await Promise.resolve(
            onPrimaryAction?.(action, {
              interviewId,
              interviewSlotId: selectedInterviewSlot,
            })
          );
          ok = result !== false;
        } else if (isRecruiterInterestReceived) {
          const result = await Promise.resolve(
            onPrimaryAction?.(action, {
              availabilityDate: availableDate,
              expectedSalary,
              acceptTerms: hasAcceptedTerms,
            })
          );
          ok = result !== false;
        } else if (isDirectApply) {
          const result = await Promise.resolve(
            onPrimaryAction?.(action, {
              availabilityDate: availableDate,
              expectedSalary,
              acceptTerms: hasAcceptedTerms,
            })
          );
          ok = result !== false;
        } else {
          const result = await Promise.resolve(onPrimaryAction?.(action));
          ok = result !== false;
        }
        if (ok) {
          setHasSubmitted(true);
        } else {
          setValidationMessage((prev) => prev || "Could not submit your response. Please try again.");
        }
      } catch (e) {
        setValidationMessage(
          e instanceof Error ? e.message : "Could not submit your response. Please try again."
        );
      } finally {
        setIsSubmitting(false);
        submitInFlightRef.current = false;
      }
    })();
  };

  const guardedOnClose = useCallback(() => {
    if (showAcceptConfirmation || showSalaryPopup || showSlotConfirmPopup || showSuccessPopup) return;
    onClose();
  }, [showAcceptConfirmation, showSalaryPopup, showSlotConfirmPopup, showSuccessPopup, onClose]);

  const footerContent = isApplicationTimelineCard(action)
    ? undefined
    : isSalaryNegotiation ? (
    showClarificationBox ? (
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => {
            setShowClarificationBox(false);
            setClarificationRemark("");
          }}
          className="rounded-md border border-[#D6DCEA] px-5 py-2.5 text-sm font-medium text-[#202939] transition hover:bg-gray-50 sm:px-6"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (!action || isClarificationSubmitting) return;
            if (!clarificationRemark.trim()) {
              scrollToMissingField(clarificationBoxRef.current);
              return;
            }
            void (async () => {
              setIsClarificationSubmitting(true);
              const ok = onRequestClarification
                ? await Promise.resolve(onRequestClarification(action, clarificationRemark.trim()))
                : false;
              if (ok !== false) {
                setShowClarificationBox(false);
                setClarificationRemark("");
                setSuccessType("clarification");
                setShowSuccessPopup(true);
              }
              setIsClarificationSubmitting(false);
            })();
          }}
          className="rounded-md bg-[#1447E6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#103CC1] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
        >
          Submit
        </button>
      </div>
    ) : (
      <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
        {onRequestClarification ? (
          <button
            type="button"
            onClick={() => {
              setShowClarificationBox(true);
              setIsSalaryNegotiationExpanded(true);
              setIsProposalExpanded(false);
            }}
            className="rounded-md border border-[#D6DCEA] px-4 py-2.5 text-sm font-medium text-[#202939] transition hover:bg-gray-50 sm:px-5 sm:py-2.5"
          >
            {actionDrawerFooter.requestClarification}
          </button>
        ) : null}
        <button
          type="button"
          disabled={primarySubmitDisabled}
          onClick={() => setShowAcceptConfirmation(true)}
          className="rounded-md bg-[#1447E6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#103CC1] disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:py-2.5"
        >
          Accept
        </button>
      </div>
    )
  ) : (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={primarySubmitDisabled}
        onClick={runPrimaryAction}
        className={`rounded-md bg-[#1447E6] text-sm font-medium text-white transition hover:bg-[#103CC1] disabled:cursor-not-allowed disabled:opacity-50 ${
          isMobileViewport ? "w-full px-5 py-3" : "px-5 py-2.5 sm:px-6"
        }`}
      >
        {isRecruiterInterestReceived
          ? (hasSubmitted ? "Interest sent by recruiter" : activeTab === "Job Action" ? "Accept" : "Next")
          : isDirectApply
            ? (activeTab === "Job Action" ? (hasSubmitted || jobAlreadyApplied ? "Applied" : "Apply") : "Next")
            : actionDrawerFooter.submit}
      </button>
    </div>
  );

  const mobileDrawerContent = (
    <>
      <p className="-mt-1 text-sm text-[#5E7397]">
        {rrDetails?.rr_name ? `#${rrDetails.rr_name}` : jobDescriptionLoading ? "…" : "—"}
      </p>

      <div className="rounded-sm border border-[#D8E3F8] bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="rounded-full bg-[#E9FAEE] px-3 py-1 text-xs font-semibold text-[#16A34A]">
            {actionDrawerJobSummary.matchBadge}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5E7397]">{resolvedPostedAgo}</span>
            <ChevronDown className="h-4 w-4 text-[#202939]" />
          </div>
        </div>

        <h3 className="text-base font-semibold text-[#202939]">{roleTitle}</h3>
        {resolvedCustomer ? (
          <p className="mt-1.5 flex items-center gap-2 text-sm text-[#5E7397]">
            <Building2 size={16} className="shrink-0" />
            <span className="text-[#374151]">{resolvedCustomer}</span>
          </p>
        ) : null}
        <p className="mt-2 flex items-center gap-2 text-sm text-[#5E7397]">
          <MapPin size={16} className="shrink-0" />
          <span>
            {resolvedLocationDisplay}
          </span>
        </p>
      </div>

      {renderTabNavigation(true)}

      {activeTab === "Job Action" ? renderJobActionContent() : null}
      {activeTab === "Timeline" ? renderTimelineContent() : null}
      {activeTab === "Job Description" ? renderJobDescriptionContent(true) : null}
    </>
  );

  const confirmTargetJobLabel = action?.subtitle.split(" - ")[0]?.trim() || roleTitle;
  const confirmTargetProposalLabel = action?.proposalName?.trim() || resolvedReferenceId;
  const salaryVsRef: "above" | "below" | "match" | null =
    apiExpectedSalary !== null
      ? parsedExpectedSalary > apiExpectedSalary
        ? "above"
        : parsedExpectedSalary < apiExpectedSalary
          ? "below"
          : "match"
      : null;

  return (
    <>
      <BaseDrawer
        open={open}
        onClose={guardedOnClose}
        title={actionDrawerChrome.drawerTitle}
        placement={isMobileViewport ? "bottom" : "right"}
        panelClassName={isMobileViewport ? "h-[80svh] max-h-[80svh]" : ""}
        widthClassName="w-full sm:w-[94%] lg:w-[90%] xl:w-[1120px]"
        bodyClassName={isMobileViewport ? "px-4 py-3" : "px-4 py-3.5 sm:px-5 sm:py-4 md:px-6 md:py-5"}
        contentClassName={isMobileViewport ? "space-y-4" : "mx-auto max-w-[1040px] space-y-3.5 sm:space-y-4"}
        footer={footerContent}
        headerActions={isMobileViewport ? undefined : (
          <div className="text-right">
            <p className="text-xs text-[#5E7397] sm:text-sm">
              {rrDetails?.rr_name ? `#${rrDetails.rr_name}` : jobDescriptionLoading ? "…" : "—"}
            </p>
          </div>
        )}
      >
        {isMobileViewport ? mobileDrawerContent : (
          <>
        <div className="rounded-sm border border-[#D8E3F8] p-3.5 sm:p-4">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <span className="w-fit rounded-full bg-[#E9FAEE] px-3 py-1 text-xs font-semibold text-[#16A34A] sm:px-3.5 sm:py-1.5 sm:text-sm">
              {actionDrawerJobSummary.matchBadge}
            </span>
            <span className="text-xs text-[#5E7397] sm:text-sm">{resolvedPostedAgo}</span>
          </div>

          <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <h3 className="text-base font-semibold text-[#202939] sm:text-lg lg:text-xl">{roleTitle}</h3>
                <p className="flex items-center gap-1.5 text-xs text-[#5E7397] sm:gap-2 sm:text-sm">
                  <MapPin size={14} className="flex-shrink-0 sm:h-4 sm:w-4" />
                  <span>
                    {resolvedLocationDisplay}
                  </span>
                </p>
              </div>
              {resolvedCustomer ? (
                <p className="flex items-center gap-1.5 text-xs text-[#5E7397] sm:text-sm">
                  <Building2 size={14} className="shrink-0 sm:h-4 sm:w-4" />
                  <span className="text-[#374151]">{resolvedCustomer}</span>
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start xl:self-center sm:gap-2.5">
              <span className="text-sm font-medium text-[#5E7397] sm:text-base">
                {actionDrawerJobSummary.matchLabel}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: actionDrawerJobSummary.matchBarTotalSegments }, (_, i) => (
                  <div
                    key={i}
                    className={`h-3.5 w-2.5 rounded-[1px] ${
                      i < actionDrawerJobSummary.matchBarFilledCount ? "bg-[#1447E6]" : "bg-[#E1E7F0]"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-[#202939] sm:text-base">
                {resolvedMatchPercent}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-3 text-xs md:grid-cols-2 xl:grid-cols-3 sm:gap-y-3.5 sm:text-sm">
            {resolvedMetaFields.map((field) => {
              const Icon = metaIcons[field.icon];
              return (
                <div key={field.label} className="flex items-start gap-2.5 sm:gap-3">
                  <Icon
                    size={16}
                    className="mt-0.5 flex-shrink-0 text-[#5E7397] sm:mt-1 sm:h-[18px] sm:w-[18px]"
                  />
                  <div>
                    <p className="text-xs text-[#5E7397] sm:text-sm">{field.label}</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#202939] sm:text-base">{field.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {renderTabNavigation()}

        {activeTab === "Job Action" ? renderJobActionContent() : null}

        {activeTab === "Timeline" ? renderTimelineContent() : null}

        {activeTab === "Job Description" ? renderJobDescriptionContent() : null}
          </>
        )}
      </BaseDrawer>
      {showAcceptConfirmation ? (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center px-4 transition-all duration-300 ${
            confirmVisible ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0"
          }`}
        >
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 shadow-2xl transition-all duration-500 ${
              confirmVisible
                ? "opacity-100 [transform:translateY(0)_scale(1)_rotateX(0deg)]"
                : "opacity-0 [transform:translateY(28px)_scale(0.9)_rotateX(10deg)]"
            }`}
          >
            {/* Decorative dots */}
            <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-blue-300 animate-ping" />
            <span className="absolute right-12 top-16 h-2 w-2 rounded-full bg-emerald-300 animate-ping [animation-delay:200ms]" />
            <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full bg-indigo-300 animate-ping [animation-delay:400ms]" />
            <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping [animation-delay:150ms]" />
            <span className="absolute h-24 w-24 rounded-full border-2 border-blue-200/70 animate-pulse" />
            <span className="absolute h-32 w-32 rounded-full border border-emerald-200/60 animate-pulse [animation-delay:300ms]" />

            <div className="relative z-10">
              {/* Icon + heading */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 shadow-sm">
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900 animate-in slide-in-from-bottom-1 duration-300">
                    Confirm Package
                  </p>
                  <p className="text-xs text-slate-500">Review and confirm before submitting</p>
                </div>
              </div>

              {/* Package details card */}
              <div className="mb-5 rounded-xl border border-blue-100 bg-white/80 p-4 shadow-sm animate-in slide-in-from-bottom-1 duration-400">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Package Summary
                </p>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Job</span>
                    <span className="text-right font-medium text-slate-800">{confirmTargetJobLabel}</span>
                  </div>

                  {proposalData?.proposed_rate != null && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">Package</span>
                      <span className="text-right font-bold text-blue-700 text-base">
                        ${proposalData.proposed_rate}
                        <span className="ml-0.5 text-sm font-semibold text-blue-500">
                          /{proposalData.billing_frequency || "Hourly"}
                        </span>
                      </span>
                    </div>
                  )}

                  {proposalData?.proposed_joining_date && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-500">Joining Date</span>
                      <span className="text-right font-medium text-slate-800">
                        {proposalData.proposed_joining_date}
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2.5">
                    <span className="text-slate-500">Proposal</span>
                    <span className="text-right font-medium text-slate-600 text-xs">
                      {confirmTargetProposalLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-1 duration-500">
                <button
                  type="button"
                  disabled={primarySubmitDisabled}
                  onClick={() => {
                    setShowAcceptConfirmation(false);
                    runPrimaryAction();
                  }}
                  className="rounded-xl bg-[#033CE5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAcceptConfirmation(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showSalaryPopup ? (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center px-4 transition-all duration-300 ${
            salaryPopupVisible ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0"
          }`}
        >
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-2xl transition-all duration-500 ${
              salaryVsRef === "above"
                ? "bg-gradient-to-br from-amber-50 via-white to-orange-50"
                : salaryVsRef === "below"
                  ? "bg-gradient-to-br from-blue-50 via-white to-indigo-50"
                  : "bg-gradient-to-br from-green-50 via-white to-emerald-50"
            } ${
              salaryPopupVisible
                ? "opacity-100 [transform:translateY(0)_scale(1)_rotateX(0deg)]"
                : "opacity-0 [transform:translateY(28px)_scale(0.9)_rotateX(10deg)]"
            }`}
          >
            <span className={`absolute left-10 top-10 h-2.5 w-2.5 rounded-full animate-ping ${salaryVsRef === "above" ? "bg-amber-300" : "bg-blue-300"}`} />
            <span className={`absolute right-12 top-16 h-2 w-2 rounded-full animate-ping [animation-delay:200ms] ${salaryVsRef === "above" ? "bg-orange-300" : "bg-indigo-300"}`} />
            <span className={`absolute bottom-14 left-14 h-2 w-2 rounded-full animate-ping [animation-delay:400ms] ${salaryVsRef === "above" ? "bg-yellow-300" : "bg-blue-200"}`} />
            <span className={`absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full animate-ping [animation-delay:150ms] ${salaryVsRef === "above" ? "bg-amber-200" : "bg-cyan-300"}`} />
            <span className={`absolute h-24 w-24 rounded-full border-2 animate-pulse ${salaryVsRef === "above" ? "border-amber-200/70" : "border-blue-200/70"}`} />
            <span className={`absolute h-32 w-32 rounded-full border animate-pulse [animation-delay:300ms] ${salaryVsRef === "above" ? "border-orange-200/60" : "border-indigo-200/60"}`} />

            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm ${
                  salaryVsRef === "above" ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                }`}>
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <p className="animate-in slide-in-from-bottom-1 text-base font-semibold text-slate-900 duration-300">
                    Confirm Salary
                  </p>
                  <p className="text-xs text-slate-500">Review your expected salary before submitting</p>
                </div>
              </div>

              <div className="animate-in slide-in-from-bottom-1 mb-5 rounded-xl border border-slate-100 bg-white/80 p-4 shadow-sm duration-400">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Salary Summary
                </p>
                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Your Expected</span>
                    <span className="text-right text-base font-bold text-blue-700">
                      ${parsedExpectedSalary.toLocaleString()}
                      <span className="ml-0.5 text-sm font-semibold text-blue-500">
                        {" "}{actionDrawerRecruiterInterest.salaryRateSuffix}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-500">Reference Rate</span>
                    <span className="text-right font-medium text-slate-800">
                      ${apiExpectedSalary?.toLocaleString()}
                      <span className="ml-0.5 text-sm text-slate-500">
                        {" "}{actionDrawerRecruiterInterest.salaryRateSuffix}
                      </span>
                    </span>
                  </div>
                  <div className={`mt-2.5 rounded-lg border px-3 py-2 text-xs font-medium ${
                    salaryVsRef === "above"
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : salaryVsRef === "below"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}>
                    {salaryVsRef === "above"
                      ? "Your expected salary is above the reference rate for this role."
                      : salaryVsRef === "below"
                        ? "Your expected salary is below the reference rate for this role."
                        : "Your expected salary matches the reference rate for this role."}
                  </div>
                </div>
              </div>

              <div className="animate-in slide-in-from-bottom-1 flex flex-col gap-2 duration-500">
                <button
                  type="button"
                  disabled={primarySubmitDisabled}
                  onClick={() => {
                    salaryPopupConfirmedRef.current = true;
                    setShowSalaryPopup(false);
                    runPrimaryAction();
                  }}
                  className="rounded-xl bg-[#033CE5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSalaryPopup(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showSlotConfirmPopup ? (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center px-4 transition-all duration-300 ${
            slotConfirmPopupVisible ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0"
          }`}
        >
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-2xl transition-all duration-500 bg-gradient-to-br from-blue-50 via-white to-indigo-50 ${
              slotConfirmPopupVisible
                ? "opacity-100 [transform:translateY(0)_scale(1)_rotateX(0deg)]"
                : "opacity-0 [transform:translateY(28px)_scale(0.9)_rotateX(10deg)]"
            }`}
          >
            <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full animate-ping bg-blue-300" />
            <span className="absolute right-12 top-16 h-2 w-2 rounded-full animate-ping bg-indigo-300 [animation-delay:200ms]" />
            <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full animate-ping bg-blue-200 [animation-delay:400ms]" />
            <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full animate-ping bg-cyan-300 [animation-delay:150ms]" />
            <span className="absolute h-24 w-24 rounded-full border-2 animate-pulse border-blue-200/70" />
            <span className="absolute h-32 w-32 rounded-full border animate-pulse border-indigo-200/60 [animation-delay:300ms]" />

            <div className="relative z-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm bg-blue-100 text-blue-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="animate-in slide-in-from-bottom-1 text-base font-semibold text-slate-900 duration-300">
                    Confirm Interview Slot
                  </p>
                  <p className="text-xs text-slate-500">Review your selected time slot before submitting</p>
                </div>
              </div>

              <div className="animate-in slide-in-from-bottom-1 mb-5 rounded-xl border border-slate-100 bg-white/80 p-4 shadow-sm duration-400">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Selected Slot Details
                </p>
                <div className="space-y-2.5 text-sm">
                  {selectedInterviewSlot &&
                    interviewSlots.find((s) => s.slot_id === selectedInterviewSlot) && (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Slot</span>
                          <span className="text-right text-base font-bold text-blue-700">
                            {interviewSlots.find((s) => s.slot_id === selectedInterviewSlot)?.label}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Date</span>
                          <span className="text-right font-medium text-slate-800">
                            {formatSlotDate(interviewSlots.find((s) => s.slot_id === selectedInterviewSlot)?.slot_date)}
                          </span>
                        </div>
                        <div className="flex items-start justify-between gap-3">
                          <span className="text-slate-500">Time</span>
                          <span className="text-right font-medium text-slate-800">
                            {formatSlotTime(interviewSlots.find((s) => s.slot_id === selectedInterviewSlot)!)}
                          </span>
                        </div>
                      </>
                    )}
                </div>
              </div>

              <div className="animate-in slide-in-from-bottom-1 flex flex-col gap-2 duration-500">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    slotConfirmPopupConfirmedRef.current = true;
                    setShowSlotConfirmPopup(false);
                    runPrimaryAction();
                  }}
                  className="rounded-xl bg-[#033CE5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Submitting..." : "Confirm & Submit"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSlotConfirmPopup(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {showSuccessPopup ? (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center px-4 transition-all duration-300 ${
            successPopupVisible ? "bg-black/45 opacity-100" : "bg-black/0 opacity-0"
          }`}
        >
          <div
            className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-green-50 p-6 shadow-2xl transition-all duration-500 ${
              successPopupVisible
                ? "opacity-100 [transform:translateY(0)_scale(1)_rotateX(0deg)]"
                : "opacity-0 [transform:translateY(28px)_scale(0.9)_rotateX(10deg)]"
            }`}
          >
            <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-emerald-300 animate-ping" />
            <span className="absolute right-12 top-16 h-2 w-2 rounded-full bg-green-300 animate-ping [animation-delay:200ms]" />
            <span className="absolute bottom-14 left-14 h-2 w-2 rounded-full bg-teal-300 animate-ping [animation-delay:400ms]" />
            <span className="absolute bottom-10 right-10 h-2.5 w-2.5 rounded-full bg-emerald-200 animate-ping [animation-delay:150ms]" />
            <span className="absolute h-24 w-24 rounded-full border-2 border-emerald-200/70 animate-pulse" />
            <span className="absolute h-32 w-32 rounded-full border border-green-200/60 animate-pulse [animation-delay:300ms]" />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <p className="mb-1 text-lg font-bold text-slate-900">
                {successType === "accept" ? "Proposal Accepted!" : "Remarks Submitted!"}
              </p>
              <p className="mb-6 text-sm text-slate-500">
                {successType === "accept"
                  ? "You've successfully accepted the salary proposal. Our team will be in touch shortly."
                  : "Your remarks have been submitted. Our team will review and get back to you."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessPopup(false);
                  onClose();
                }}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
