"use client";

import {
  Calendar,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock,
  Hourglass,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  getAvailableInterviewSlots,
  getInterviewsByProfile,
  resolveInterviewIdForJob,
  type InterviewSlotOptionApi,
} from "@/services/jobs/interviewsApi";
import {
  getRrGeneratedContent,
  type RrGeneratedContentApi,
} from "@/services/jobs/rrGeneratedContent";
import { getRrDetails, type RrDetailsApi } from "@/services/jobs/rrDetails";

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
}

interface ActionDrawerProps {
  open: boolean;
  onClose: () => void;
  action: ActionDrawerActionCard | null;
  /** Profile document id (same value as `profile_id` for actionables / interviews APIs). */
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
  onRequestClarification?: (action: ActionDrawerActionCard) => void;
}

const metaIcons = {
  calendar: Calendar,
  hourglass: Hourglass,
  refresh: RefreshCw,
  clock: Clock,
  users: Users,
} as const;

export default function ActionDrawer({
  open,
  onClose,
  action,
  profileId,
  onPrimaryAction,
  onRequestClarification,
}: ActionDrawerProps) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [activeTab, setActiveTab] = useState<ActionDrawerTab>("Job Action");
  const [availableDate, setAvailableDate] = useState<string>(actionDrawerFormDefaults.availableDate);
  const [expectedSalary, setExpectedSalary] = useState<string>(actionDrawerFormDefaults.expectedSalary);
  const [selectedInterviewSlot, setSelectedInterviewSlot] = useState<string>(
    actionDrawerFormDefaults.selectedInterviewSlotId
  );
  const [isProposalExpanded, setIsProposalExpanded] = useState(true);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true);
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlotOptionApi[]>([]);
  const [interviewSlotsLoading, setInterviewSlotsLoading] = useState(false);
  const [interviewSlotsError, setInterviewSlotsError] = useState<string | null>(null);
  const [resolvedInterviewId, setResolvedInterviewId] = useState<string | null>(null);
  const [jobDescriptionContent, setJobDescriptionContent] = useState<RrGeneratedContentApi | null>(null);
  const [jobDescriptionLoading, setJobDescriptionLoading] = useState(false);
  const [jobDescriptionError, setJobDescriptionError] = useState<string | null>(null);
  const [rrDetails, setRrDetails] = useState<RrDetailsApi | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setActiveTab("Job Action");
      setAvailableDate(actionDrawerFormDefaults.availableDate);
      setExpectedSalary(actionDrawerFormDefaults.expectedSalary);
      setSelectedInterviewSlot(actionDrawerFormDefaults.selectedInterviewSlotId);
      setIsProposalExpanded(true);
      setHasAcceptedTerms(true);
      setInterviewSlots([]);
      setInterviewSlotsLoading(false);
      setInterviewSlotsError(null);
      setResolvedInterviewId(null);
      setJobDescriptionContent(null);
      setJobDescriptionLoading(false);
      setJobDescriptionError(null);
      setRrDetails(null);
      setIsSubmitting(false);
      setHasSubmitted(Boolean(action?.isSourcingAccepted));
    }
  }, [open, action?.isSourcingAccepted]);

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
  const roleTitle =
    (isRecruiterInterestReceived || isInterviewScheduled || isSalaryNegotiation
      ? action?.subtitle.split(" - ")[0]
      : action?.title) ?? "Senior Engineer";
  const locationLabel = action?.subtitle.split(" - ")[1] ?? "Atlanta";

  useEffect(() => {
    if (!open || !isInterviewScheduled || !action) return;

    let cancelled = false;
    void (async () => {
      setInterviewSlotsLoading(true);
      setInterviewSlotsError(null);
      try {
        let interviewId = action.interviewId?.trim() || null;
        if (!interviewId && profileId?.trim() && action.jobDocumentId?.trim()) {
          const list = await getInterviewsByProfile(profileId.trim());
          if (cancelled) return;
          interviewId = resolveInterviewIdForJob(list, action.jobDocumentId.trim());
        }
        if (cancelled) return;
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
    action?.jobDocumentId,
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
  const resolvedMatchPercent = rrDetails?.match_score != null
    ? `${Math.round(rrDetails.match_score)}%`
    : actionDrawerJobSummary.matchPercentLabel;
  const resolvedPostedAgo = rrDetails?.posted_time || actionDrawerJobSummary.postedAgo;
  const resolvedLocationSuffix = rrDetails?.location_full || actionDrawerJobSummary.locationCountrySuffix;
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

  const renderRecruiterInterestAction = () => (
    <div className="rounded-md border border-[#D8E3F8] bg-[#F5F8FF] p-3.5 sm:p-4">
      <h3 className="text-base font-semibold text-[#202939] sm:text-lg">
        {actionDrawerRecruiterInterest.sectionTitle}
      </h3>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#202939] sm:text-sm">
            {actionDrawerRecruiterInterest.availableDateLabel}
          </label>
          <div className="relative">
            <input
              type="date"
              value={availableDate}
              onChange={(event) => setAvailableDate(event.target.value)}
              className="h-10 w-full rounded border border-[#D6DCEA] bg-white px-3 pr-10 text-xs text-[#202939] outline-none transition focus:border-[#1D4ED8] sm:h-11 sm:px-3.5 sm:text-sm"
            />
            <Calendar className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#5E7397] sm:right-3.5 sm:h-4 sm:w-4" />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#202939] sm:text-sm">
            {actionDrawerRecruiterInterest.expectedSalaryLabel}
          </label>
          <div className="flex h-10 overflow-hidden rounded border border-[#D6DCEA] bg-white sm:h-11">
            <div className="flex w-9 items-center justify-center border-r border-[#D6DCEA] text-base text-[#202939] sm:w-10 sm:text-lg">
              {actionDrawerRecruiterInterest.currencySymbol}
            </div>
            <input
              value={expectedSalary}
              onChange={(event) => setExpectedSalary(event.target.value.replace(/[^\d.]/g, ""))}
              className="min-w-0 flex-1 px-3 text-xs text-[#202939] outline-none sm:px-3.5 sm:text-sm"
              inputMode="decimal"
            />
            <div className="flex items-center pr-3 text-xs text-[#202939] sm:pr-3.5 sm:text-sm">
              {actionDrawerRecruiterInterest.salaryRateSuffix}
            </div>
          </div>
        </div>
      </div>

      <label className="mt-3 flex items-start gap-2.5 text-xs text-[#202939] sm:text-sm">
        <input
          type="checkbox"
          checked={hasAcceptedTerms}
          onChange={(event) => setHasAcceptedTerms(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[#1D4ED8] text-[#1D4ED8]"
        />
        <span>{actionDrawerRecruiterInterest.termsAgreement}</span>
      </label>
    </div>
  );

  const renderInterviewScheduledAction = () => (
    <div className="rounded-md border border-[#D8E3F8] bg-[#F5F8FF] p-3.5 sm:p-4">
      <h3 className="text-base font-semibold text-[#202939] sm:text-lg">
        {actionDrawerInterview.sectionTitle}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {actionDrawerInterview.tags.map((tag) => (
          <span
            key={tag}
            className="rounded border border-[#D6DCEA] bg-white px-2.5 py-1 text-[11px] text-[#5E7397] sm:px-3 sm:py-1.5 sm:text-xs"
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
                  {slot.slot_date || "—"}
                </span>
                <span className="text-xs leading-snug text-[#202939] sm:text-sm">
                  {slot.slot_time || "—"}
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
                      <span className="font-medium">{slot.slot_date || "—"}</span>
                    </p>
                    <p>
                      <span className="text-[#5E7397]">{actionDrawerInterview.mobileTimePrefix} </span>
                      <span className="font-medium">{slot.slot_time || "—"}</span>
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
    <div className="rounded-md border border-[#D8E3F8] bg-[#F5F8FF] p-3.5 sm:p-4">
      <button
        type="button"
        onClick={() => setIsProposalExpanded((current) => !current)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div>
          <h3 className="text-base font-semibold text-[#202939] sm:text-lg">
            {actionDrawerSalary.proposalTitle}
          </h3>
          <p className="mt-2 text-base font-semibold text-[#202939] sm:text-lg">
            {actionDrawerSalary.rateDisplay}{" "}
            <span className="text-sm font-normal text-[#5E7397] sm:text-base">
              {actionDrawerSalary.rateSuffix}
            </span>
          </p>
          <p className="mt-1.5 text-xs text-[#202939] sm:text-sm">
            {actionDrawerSalary.proposedJoiningPrefix}{" "}
            <span className="font-semibold">{actionDrawerSalary.proposedJoiningDate}</span>
          </p>
        </div>
        {isProposalExpanded ? (
          <ChevronUp className="mt-1 h-5 w-5 text-[#202939] sm:h-6 sm:w-6" />
        ) : (
          <ChevronDown className="mt-1 h-5 w-5 text-[#202939] sm:h-6 sm:w-6" />
        )}
      </button>

      {isProposalExpanded ? (
        <div className="mt-4 rounded-md bg-white p-4">
          <h4 className="text-lg leading-none font-semibold text-[#202939] sm:text-xl">
            {actionDrawerSalary.termsHeading}
          </h4>

          <div className="mt-3 grid gap-3 sm:mt-4 sm:gap-4">
            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <div className="border-b border-[#E6ECF6] pb-4 lg:border-b-0 lg:border-r lg:pr-5">
                <p className="text-sm font-semibold text-[#202939] sm:text-base">
                  {actionDrawerSalary.byCustomer}
                </p>
                <div className="mt-2 space-y-2 sm:mt-3 sm:space-y-2.5">
                  {actionDrawerSalary.customerTerms.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2.5 text-xs text-[#5E7397] sm:gap-3 sm:text-sm"
                    >
                      <CircleCheck className="h-4.5 w-4.5 text-[#22C55E]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-[#E6ECF6] pb-4">
                  <p className="text-sm font-semibold text-[#202939] sm:text-base">
                    {actionDrawerSalary.byCandidate}
                  </p>
                  <p className="mt-1.5 text-xs text-[#5E7397] sm:mt-2 sm:text-sm">
                    {actionDrawerSalary.byCandidatePlaceholder}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[#202939] sm:text-base">
                    {actionDrawerSalary.notApplicableTitle}
                  </p>
                  <p className="mt-1.5 text-xs text-[#5E7397] sm:mt-2 sm:text-sm">
                    {actionDrawerSalary.notApplicableBody}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderJobActionContent = () => {
    if (isInterviewScheduled) {
      return renderInterviewScheduledAction();
    }

    if (isSalaryNegotiation) {
      return renderSalaryNegotiationAction();
    }

    return renderRecruiterInterestAction();
  };

  const renderTimelineContent = () => (
    isFirstRecruiterInterestCard ? (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-[#E6ECF6] bg-[#F8FAFD] px-6 py-10 sm:min-h-[220px] sm:py-12">
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
    ) : (
      <div className="rounded-md border border-[#E6ECF6] bg-[#F8FAFD] p-4 sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex shrink-0 items-center justify-center" aria-hidden>
            <div className="box-content h-2.5 w-2.5 shrink-0 rounded-full border-[3px] border-[#1447E6] bg-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold leading-snug text-[#202939] sm:text-base">
              {isInterviewScheduled
                ? actionDrawerTimeline.milestoneTitles.interview
                : isSalaryNegotiation
                  ? actionDrawerTimeline.milestoneTitles.salary
                  : actionDrawerTimeline.milestoneTitles.default}
            </h4>
            <p className="mt-0.5 text-xs leading-snug text-[#5E7397] sm:text-sm">
              {actionDrawerTimeline.milestoneDate}
            </p>
          </div>
        </div>
      </div>
    )
  );

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
      {actionDrawerChrome.tabs.map((tab) => (
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
    void (async () => {
      setIsSubmitting(true);
      let ok = true;
      if (isInterviewScheduled) {
        const interviewId = resolvedInterviewId ?? action.interviewId?.trim() ?? undefined;
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
      } else {
        const result = await Promise.resolve(onPrimaryAction?.(action));
        ok = result !== false;
      }
      if (ok) setHasSubmitted(true);
      setIsSubmitting(false);
    })();
  };

  const footerContent = isSalaryNegotiation ? (
    <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
      <button
        type="button"
        onClick={() => action && onRequestClarification?.(action)}
        className="rounded-md border border-[#D6DCEA] px-4 py-2.5 text-sm font-medium text-[#202939] transition hover:bg-gray-50 sm:px-5 sm:py-2.5"
      >
        {actionDrawerFooter.requestClarification}
      </button>
      <button
        type="button"
        onClick={runPrimaryAction}
        className="rounded-md bg-[#1447E6] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#103CC1] sm:px-6 sm:py-2.5"
      >
        {actionDrawerFooter.submit}
      </button>
    </div>
  ) : (
    <div className="flex justify-end">
      <button
        type="button"
        disabled={Boolean((isInterviewScheduled && interviewSubmitDisabled) || isSubmitting || hasSubmitted)}
        onClick={runPrimaryAction}
        className={`rounded-md bg-[#1447E6] text-sm font-medium text-white transition hover:bg-[#103CC1] disabled:cursor-not-allowed disabled:opacity-50 ${
          isMobileViewport ? "w-full px-5 py-3" : "px-5 py-2.5 sm:px-6"
        }`}
      >
        {actionDrawerFooter.submit}
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
