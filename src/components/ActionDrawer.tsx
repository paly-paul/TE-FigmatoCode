"use client";

import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Hourglass,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
}

interface ActionDrawerProps {
  open: boolean;
  onClose: () => void;
  action: ActionDrawerActionCard | null;
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

function sanitizeDecimalInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) return cleaned;
  return `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, "")}`;
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
  if (isDirectJobApplyCard(action)) return true;
  if (action.isSourcingAccepted) return false;
  const title = action.title.toLowerCase();
  return title.includes("interest");
}

function isDirectJobApplyCard(action: ActionDrawerActionCard | null): boolean {
  if (!action) return false;
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

export default function ActionDrawer({
  open,
  onClose,
  action,
  profileId,
  onPrimaryAction,
  onRequestClarification,
}: ActionDrawerProps) {
  const minAvailableDate = getTodayIsoDate();
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionDrawerTab>("Job Action");
  const [availableDate, setAvailableDate] = useState<string>(minAvailableDate);
  const [expectedSalary, setExpectedSalary] = useState<string>(actionDrawerFormDefaults.expectedSalary);
  const [selectedInterviewSlot, setSelectedInterviewSlot] = useState<string>(
    actionDrawerFormDefaults.selectedInterviewSlotId
  );
  const [isProposalExpanded, setIsProposalExpanded] = useState(true);
  const [isProjectInfoExpanded, setIsProjectInfoExpanded] = useState(true);
  const [showClarificationBox, setShowClarificationBox] = useState(false);
  const [clarificationRemark, setClarificationRemark] = useState("");
  const [isClarificationSubmitting, setIsClarificationSubmitting] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true);
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
  const availableDateFieldRef = useRef<HTMLDivElement | null>(null);
  const expectedSalaryFieldRef = useRef<HTMLDivElement | null>(null);
  const termsFieldRef = useRef<HTMLLabelElement | null>(null);
  const interviewSlotsSectionRef = useRef<HTMLDivElement | null>(null);
  const clarificationBoxRef = useRef<HTMLDivElement | null>(null);

  const scrollToMissingField = (target: HTMLElement | null) => {
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  useEffect(() => {
    if (open) {
      setActiveTab(
        isApplicationTimelineCard(action)
          ? "Job Description"
          : shouldUseFirstTimeJobTabs(action)
            ? "Job Description"
            : "Job Action"
      );
      setAvailableDate(minAvailableDate);
      setExpectedSalary(actionDrawerFormDefaults.expectedSalary);
      setSelectedInterviewSlot(actionDrawerFormDefaults.selectedInterviewSlotId);
      setIsProposalExpanded(true);
      setIsProjectInfoExpanded(true);
      setShowClarificationBox(false);
      setClarificationRemark("");
      setIsClarificationSubmitting(false);
      setHasAcceptedTerms(true);
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
      setHasSubmitted(shouldPrefillSubmittedFromSourcing(action));
    }
  }, [open, action?.isSourcingAccepted, action?.title, minAvailableDate]);

  const orderedTabs: ActionDrawerTab[] = isApplicationTimelineCard(action)
    ? ["Job Description", "Timeline"]
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
  const isRecruiterInterestReceived =
    normalizedTitle === actionDrawerTitleMatchers.recruiterInterest ||
    normalizedTitle.includes("interest");
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
  const locationLabel = action?.subtitle.split(" - ")[1] ?? "Atlanta";

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

  useEffect(() => {
    if (!open || !isInterviewScheduled || !action) return;

    let cancelled = false;
    const effectiveProfileId = profileId?.trim() || getProfileName()?.trim() || "";

    // Actionables often return interview_slots without info.interview_id. Resolve the real Interview
    // name via slot ownership probe + actionable record name (handles "Proposed" slots omitted from listing).
    if (action.interviewSlots && action.interviewSlots.length > 0) {
      setInterviewSlots(action.interviewSlots);
      setInterviewSlotsError(null);
      setInterviewSlotsLoading(true);
      setSelectedInterviewSlot(action.interviewSlots[0].slot_id);

      void (async () => {
        try {
          let resolved: string | null = null;
          if (effectiveProfileId && action.jobDocumentId?.trim()) {
            resolved = await resolveInterviewIdBySlotOwnership({
              profileId: effectiveProfileId,
              jobId: action.jobDocumentId.trim(),
              slotId: action.interviewSlots![0].slot_id,
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
          setInterviewSlotsError("No interview was found for this job. Try again later.");
          return;
        }
        const slots = await getAvailableInterviewSlots(interviewId);
        if (cancelled) return;
        setInterviewSlots(slots);
        if (slots.length > 0) {
          setSelectedInterviewSlot(slots[0].slot_id);
        }
      } catch (e) {
        if (cancelled) return;
        setInterviewSlots([]);
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
    action?.interviewSlots,
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

  const interviewSubmitDisabled =
    isInterviewScheduled &&
    (interviewSlotsLoading ||
      !resolvedInterviewId ||
      interviewSlots.length === 0 ||
      !selectedInterviewSlot);
  const parsedExpectedSalary = Number.parseFloat(expectedSalary);
  const recruiterDateInvalid = !availableDate || availableDate < minAvailableDate;
  const recruiterSalaryInvalid = !Number.isFinite(parsedExpectedSalary) || parsedExpectedSalary <= 0;
  const directApplyDateInvalid = isDirectApply && (!availableDate || availableDate < minAvailableDate);
  const directApplySalaryInvalid =
    isDirectApply && (!Number.isFinite(parsedExpectedSalary) || parsedExpectedSalary <= 0);
  const recruiterSubmitDisabled =
    isRecruiterInterestReceived && (recruiterDateInvalid || recruiterSalaryInvalid || !hasAcceptedTerms);
  const primarySubmitDisabled = Boolean(
    isSubmitting || hasSubmitted
  );
  const resolvedMatchPercent = rrDetails?.match_score != null
    ? `${Math.round(rrDetails.match_score)}%`
    : actionDrawerJobSummary.matchPercentLabel;
  const resolvedPostedAgo = rrDetails?.posted_time || actionDrawerJobSummary.postedAgo;
  const resolvedLocationSuffix = rrDetails?.location_full || actionDrawerJobSummary.locationCountrySuffix;
  const resolvedReferenceId = action?.jobDocumentId?.trim() || action?.proposalName?.trim() || "—";
  const recruiterAcceptedDateLabel = formatTimelineDate(action?.sourcingAcceptedAt);
  const stageReceivedDateLabel =
    formatTimelineDate(action?.receivedAt) || formatTimelineDate(action?.timestamp);
  const proposalJoiningDateLabel = formatTimelineDate(proposalData?.proposed_joining_date);
  const resolvedMetaFields = [
    {
      label: "Project Est. Start Date",
      value: rrDetails?.start_date || actionDrawerJobSummary.metaFields[0].value,
      icon: "calendar" as const,
    },
    {
      label: "Project Est. End Date",
      value: rrDetails?.end_date || actionDrawerJobSummary.metaFields[1].value,
      icon: "calendar" as const,
    },
    {
      label: "Minimum Contract Duration",
      value: rrDetails?.contract_duration || actionDrawerJobSummary.metaFields[2].value,
      icon: "hourglass" as const,
    },
    {
      label: "Rotation Cycle",
      value: rrDetails?.rotation_cycle || actionDrawerJobSummary.metaFields[3].value,
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
              onChange={(event) => {
                const next = event.target.value;
                setAvailableDate(next && next < minAvailableDate ? minAvailableDate : next);
              }}
              className="h-10 w-full appearance-none rounded border border-[#D6DCEA] bg-white px-3 pr-10 text-xs text-[#202939] outline-none transition focus:border-[#1D4ED8] sm:h-11 sm:px-3.5 sm:text-sm"
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
      {isDirectApply && validationMessage ? (
        <p className="mt-2 text-xs text-red-600">
          {validationMessage}
        </p>
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
        <p className="mt-4 text-sm text-[#5E7397]">Loading available slots…</p>
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
              <div
                key={slot.slot_id}
                className="grid grid-cols-[minmax(72px,100px)_1fr_1fr_minmax(160px,1.35fr)] items-center gap-2 border-t border-[#E6ECF6] px-4 py-3"
              >
                <label className="flex cursor-pointer items-center justify-center">
                  <input
                    type="radio"
                    name="interview-slot"
                    checked={selectedInterviewSlot === slot.slot_id}
                    onChange={() => setSelectedInterviewSlot(slot.slot_id)}
                    className="h-4 w-4 text-[#1D4ED8]"
                  />
                </label>
                <span className="text-xs text-[#202939] sm:text-sm">{slot.label}</span>
                <span className="text-xs text-[#202939] sm:text-sm">
                  {formatSlotDate(slot.slot_date)}
                </span>
                <span className="text-xs leading-snug text-[#202939] sm:text-sm">
                  {formatSlotTime(slot)}
                </span>
              </div>
            ))}
          </div>

          <div className="divide-y divide-[#E6ECF6] lg:hidden">
            {interviewSlots.map((slot) => (
              <div key={slot.slot_id} className="px-4 py-3">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="interview-slot"
                    checked={selectedInterviewSlot === slot.slot_id}
                    onChange={() => setSelectedInterviewSlot(slot.slot_id)}
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]"
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

  const renderSalaryNegotiationAction = () => (
    <div className="space-y-3.5">
      <div className="overflow-hidden rounded-md border border-[#D8E3F8] bg-white">
        <button
          type="button"
          onClick={() => setIsProjectInfoExpanded((current) => !current)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <h3 className="text-base font-semibold text-[#202939] sm:text-lg">Project Info</h3>
          {isProjectInfoExpanded ? (
            <ChevronUp className="h-5 w-5 text-[#202939]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#202939]" />
          )}
        </button>
        {isProjectInfoExpanded ? (
          <div className="border-t border-[#E6ECF6] px-4 py-3">
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-xs sm:grid-cols-2 sm:text-sm">
              <div>
                <p className="text-[#5E7397]">Job Posting</p>
                <p className="mt-0.5 font-semibold text-[#202939]">{resolvedReferenceId}</p>
              </div>
              <div>
                <p className="text-[#5E7397]">Location</p>
                <p className="mt-0.5 font-semibold text-[#202939]">
                  {locationLabel} | {resolvedLocationSuffix}
                </p>
              </div>
              {resolvedMetaFields.map((field) => (
                <div key={field.label}>
                  <p className="text-[#5E7397]">{field.label}</p>
                  <p className="mt-0.5 font-semibold text-[#202939]">{field.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-md border border-[#D8E3F8] bg-white">
        <button
          type="button"
          onClick={() => setIsProposalExpanded((current) => !current)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <h3 className="text-base font-semibold text-[#202939] sm:text-lg">Proposal</h3>
          {isProposalExpanded ? (
            <ChevronUp className="h-5 w-5 text-[#202939]" />
          ) : (
            <ChevronDown className="h-5 w-5 text-[#202939]" />
          )}
        </button>

        {isProposalExpanded ? (
          <div className="border-t border-[#E6ECF6] px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#10B981] px-3 py-1 text-xs font-semibold text-white">
                Awaiting Candidate Acceptance
              </span>
              <span className="text-sm font-medium text-[#1D4ED8]">
                {proposalData?.proposal_version || "V1"}
              </span>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#202939]">Base Salary</p>
                <p className="text-xs text-[#5E7397]">All values are rounded off.</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold leading-none text-[#1D4ED8]">
                  {proposalData?.proposed_rate != null ? `$${proposalData.proposed_rate}` : "—"}
                  <span className="ml-1 text-xl font-semibold">
                    /{proposalData?.billing_frequency || "Hourly"}
                  </span>
                </p>
                <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[#5E7397]">
                  Estimated Total
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-[#202939]">
              Proposed Joining Date{" "}
              <span className="font-semibold">— {proposalData?.proposed_joining_date || "—"}</span>
            </p>
            {proposalLoading ? (
              <p className="mt-2 text-xs text-[#5E7397]">Loading proposal…</p>
            ) : proposalError ? (
              <p className="mt-2 text-xs text-red-600">{proposalError}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {showClarificationBox ? (
        <div ref={clarificationBoxRef} className="overflow-hidden rounded-md border border-[#D8E3F8] bg-white">
          <div className="border-b border-[#E6ECF6] px-4 py-3">
            <h3 className="text-base font-semibold text-[#202939] sm:text-lg">Candidate Remarks</h3>
          </div>
          <div className="px-4 py-3">
            <textarea
              value={clarificationRemark}
              onChange={(event) => setClarificationRemark(event.target.value)}
              placeholder="Enter your remark here..."
              className="min-h-[130px] w-full resize-y rounded-md border border-[#D6DCEA] p-3 text-sm text-[#202939] outline-none transition focus:border-[#1D4ED8]"
            />
          </div>
        </div>
      ) : null}
    </div>
  );

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
      {jobDescriptionLoading ? (
        <p className="text-sm text-[#5E7397]">Loading job description…</p>
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
    if (isSubmitting || hasSubmitted) return;
    if (isDirectApply && activeTab !== "Job Action") {
      setValidationMessage(null);
      setActiveTab("Job Action");
      return;
    }
    if (isInterviewScheduled && interviewSubmitDisabled) {
      setValidationMessage(null);
      scrollToMissingField(interviewSlotsSectionRef.current);
      return;
    }
    if (isDirectApply && (directApplyDateInvalid || directApplySalaryInvalid)) {
      setValidationMessage("Please enter a valid available date and expected salary to continue.");
      if (directApplyDateInvalid) {
        scrollToMissingField(availableDateFieldRef.current);
        return;
      }
      if (directApplySalaryInvalid) {
        scrollToMissingField(expectedSalaryFieldRef.current);
        return;
      }
    }
    setValidationMessage(null);
    if (isRecruiterInterestReceived && recruiterSubmitDisabled) {
      if (recruiterDateInvalid) {
        scrollToMissingField(availableDateFieldRef.current);
        return;
      }
      if (recruiterSalaryInvalid) {
        scrollToMissingField(expectedSalaryFieldRef.current);
        return;
      }
      if (!hasAcceptedTerms) {
        scrollToMissingField(termsFieldRef.current);
        return;
      }
    }
    void (async () => {
      setIsSubmitting(true);
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
          })
        );
        ok = result !== false;
      } else {
        const result = await Promise.resolve(onPrimaryAction?.(action));
        ok = result !== false;
      }
      if (ok) setHasSubmitted(true);
      setIsSubmitting(false);
    })();
  };

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
              const ok = await Promise.resolve(
                onRequestClarification?.(action, clarificationRemark.trim())
              );
              if (ok !== false) {
                setShowClarificationBox(false);
                setClarificationRemark("");
                onClose();
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
        <button
          type="button"
          onClick={() => setShowClarificationBox(true)}
          className="rounded-md border border-[#D6DCEA] px-4 py-2.5 text-sm font-medium text-[#202939] transition hover:bg-gray-50 sm:px-5 sm:py-2.5"
        >
          {actionDrawerFooter.requestClarification}
        </button>
        <button
          type="button"
          onClick={runPrimaryAction}
          className="rounded-md bg-[#1447E6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#103CC1] sm:px-6 sm:py-2.5"
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
        {isDirectApply ? (activeTab === "Job Action" ? "Apply" : "Next") : actionDrawerFooter.submit}
      </button>
    </div>
  );

  const mobileDrawerContent = (
    <>
      <p className="-mt-1 text-sm text-[#5E7397]">{actionDrawerChrome.referenceId}</p>

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
        <p className="mt-2 flex items-center gap-2 text-sm text-[#5E7397]">
          <MapPin size={16} className="shrink-0" />
          <span>
            {locationLabel} | {resolvedLocationSuffix}
          </span>
        </p>
      </div>

      {renderTabNavigation(true)}

      {activeTab === "Job Action" ? renderJobActionContent() : null}
      {activeTab === "Timeline" ? renderTimelineContent() : null}
      {activeTab === "Job Description" ? renderJobDescriptionContent(true) : null}
    </>
  );

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title={actionDrawerChrome.drawerTitle}
      placement={isMobileViewport ? "bottom" : "right"}
      panelClassName={isMobileViewport ? "h-[80svh] max-h-[80svh]" : ""}
      widthClassName="w-full sm:w-[94%] lg:w-[90%] xl:w-[1120px]"
      bodyClassName={isMobileViewport ? "px-4 py-3" : "px-4 py-3.5 sm:px-5 sm:py-4 md:px-6 md:py-5"}
      contentClassName={isMobileViewport ? "space-y-4" : "mx-auto max-w-[1040px] space-y-3.5 sm:space-y-4"}
      footer={footerContent}
      headerActions={isMobileViewport ? undefined : (
        <div className="text-right">
          <p className="text-xs text-[#5E7397] sm:text-sm">{actionDrawerChrome.referenceId}</p>
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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <h3 className="text-base font-semibold text-[#202939] sm:text-lg lg:text-xl">{roleTitle}</h3>
            <p className="flex items-center gap-1.5 text-xs text-[#5E7397] sm:gap-2 sm:text-sm">
              <MapPin size={14} className="flex-shrink-0 sm:h-4 sm:w-4" />
              <span>
                {locationLabel} | {resolvedLocationSuffix}
              </span>
            </p>
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
  );
}
