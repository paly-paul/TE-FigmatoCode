"use client";

import { ChevronDown, ArrowLeft, ArrowRight, Clock, Bandage } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AppNavbar from "../profile/AppNavbar";
import CandidateAppShell, { type TimesheetBottomTab } from "../mobile/CandidateAppShell";
import { useIs768AndBelow } from "@/lib/useResponsive";
import CommentModal from "../ui/CommentModal";
import { getCandidateId, getProfileName, setCandidateId } from "@/lib/authSession";
import { createEditCandidateTimesheet } from "@/services/timesheet/candidateTimesheet";
import { getProjectsForProfile, type ProfileProject } from "@/services/timesheet/profileProjects";
import { getTimesheetForProject } from "@/services/timesheet/projectTimesheet";
import { getDaysOfWeek } from "@/services/timesheet/weekCalendar";
import { getTimesheetByWeek, type WeekTimesheetDay } from "@/services/timesheet/weekTimesheet";
import { getTimesheetForWorkorder } from "@/services/timesheet/workorderTimesheet";
import { useRouter } from "next/navigation";
import UnsavedChangesModal from "./UnsavedChangesModal";

type WeeklyRow = {
  isoDate?: string;
  date: string;
  day: string;
  regular?: number;
  overtime?: number;
  leave?: string;
  total?: number;
};

type WeeklySheet = {
  range: string;
  weekLabel: string;
  regular: number;
  overtime: number;
  total: number;
  current?: boolean;
  rows: WeeklyRow[];
  weekStartIso?: string;
  weekEndIso?: string;
};

type HourSplit = { regular: number; overtime: number };

const FALLBACK_WEEKS: WeeklySheet[] = [
  { range: "—", weekLabel: "Week —", regular: 0, overtime: 0, total: 0, current: true, rows: [] },
];

function getMonthYearLabelFromWeekRange(range: string): string {
  const segments = range.split(/\s*-\s*/).map((s) => s.trim());
  if (segments.length < 2) return "";
  const startToken = segments[0];
  const endToken = segments[1];
  const yearMatch = endToken.match(/\b(\d{4})\b/);
  const year = yearMatch?.[1] ?? "";
  if (!year) return "";
  const startForParse = startToken.includes(",") ? startToken : `${startToken}, ${year}`;
  const d = new Date(startForParse);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatIsoDateForDisplay(isoDate: string): string {
  const parsed = parseIsoDate(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function parseIsoDate(value: string): Date {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date(Number.NaN);
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!year || !month || !day) return new Date(Number.NaN);
  return new Date(Date.UTC(year, month - 1, day));
}

function getIsoWeekYear(date: Date): { weekNumber: number; year: number } {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const year = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const weekNumber = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekNumber, year };
}

function getIsoWeekBounds(date: Date): { startIso: string; endIso: string } {
  const working = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = working.getUTCDay() || 7;
  working.setUTCDate(working.getUTCDate() - day + 1);
  const start = new Date(working);
  const end = new Date(working);
  end.setUTCDate(start.getUTCDate() + 6);
  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  return { startIso: toIso(start), endIso: toIso(end) };
}

function getCurrentMonthIsoWeeks(): Array<{ weekNumber: number; year: number; startIso: string; endIso: string }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const seen = new Set<string>();
  const weeks: Array<{ weekNumber: number; year: number; startIso: string; endIso: string }> = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month, day);
    const iso = getIsoWeekYear(date);
    const key = `${iso.year}-${iso.weekNumber}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bounds = getIsoWeekBounds(date);
    weeks.push({
      weekNumber: iso.weekNumber,
      year: iso.year,
      startIso: bounds.startIso,
      endIso: bounds.endIso,
    });
  }

  return weeks.sort((a, b) => a.weekNumber - b.weekNumber);
}

function getDisplayWeekLabel(week: WeeklySheet): string {
  return week.current ? `Current Week - ${week.weekLabel}` : week.weekLabel;
}

function getWeekStatusLabel(status?: string): string {
  const normalized = (status || "").trim();
  return normalized || "Draft";
}

function isWeekEditable(status?: string): boolean {
  const normalized = (status || "").toLowerCase();
  if (!normalized) return true;
  return (
    normalized.includes("draft") ||
    normalized.includes("unapproved") ||
    normalized.includes("reject")
  );
}

function toFiniteNonNegative(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function TalentEngineTimesheet() {
  const router = useRouter();
  const [workorderWeeks, setWorkorderWeeks] = useState<WeeklySheet[]>([]);
  const [activeWeekNumber, setActiveWeekNumber] = useState<number>(0);
  const [leaveSelections, setLeaveSelections] = useState<Record<string, boolean>>({});
  const [dayRemarks, setDayRemarks] = useState<Record<string, string>>({});
  const [weekRowsByNumber, setWeekRowsByNumber] = useState<Record<number, WeeklyRow[]>>({});
  const [weekLoadStatus, setWeekLoadStatus] = useState<string>("");
  const [profileId, setProfileId] = useState("");
  const [weekStatusByNumber, setWeekStatusByNumber] = useState<Record<number, string>>({});
  const [rrCandidateId, setRrCandidateId] = useState("");
  const [rrName, setRrName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [assignedProjects, setAssignedProjects] = useState<ProfileProject[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<string>("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [isCheckingAssignment, setIsCheckingAssignment] = useState(true);
  const [isIdentityResolved, setIsIdentityResolved] = useState(false);
  const [hasProjectAssignment, setHasProjectAssignment] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [weekDataByNumber, setWeekDataByNumber] = useState<Record<number, WeekTimesheetDay[]>>({});
  const [hourInputDrafts, setHourInputDrafts] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);
  const workorderFetchKeyRef = useRef<string>("");
  const autoSelectedWeekRef = useRef(false);
  const inFlightOverviewWeekRef = useRef<Set<string>>(new Set());
  const inFlightActiveWeekRef = useRef<Set<string>>(new Set());
  const fetchedWeekDataRef = useRef<Set<string>>(new Set());

  const [commentModal, setCommentModal] = useState<{
    date: string;
    remarkKey: string;
    comment: string;
    triggerElement: HTMLElement | null;
  } | null>(null);
  const [mobileTimesheetTab, setMobileTimesheetTab] = useState<TimesheetBottomTab>("overview");

  const getSplitStorageKey = (candidate: string, rrCandidate: string, weekNumber: number, year: number) =>
    `te-timesheet-split:${candidate}:${rrCandidate}:${year}:${weekNumber}`;

  const readStoredSplitMap = (
    candidate: string,
    rrCandidate: string,
    weekNumber: number,
    year: number
  ): Record<string, HourSplit> => {
    if (typeof window === "undefined") return {};
    const key = getSplitStorageKey(candidate, rrCandidate, weekNumber, year);
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, { regular?: unknown; overtime?: unknown }>;
      const out: Record<string, HourSplit> = {};
      for (const [date, split] of Object.entries(parsed)) {
        out[date] = {
          regular: toFiniteNonNegative(split?.regular),
          overtime: toFiniteNonNegative(split?.overtime),
        };
      }
      return out;
    } catch {
      return {};
    }
  };

  const writeStoredSplitMap = (
    candidate: string,
    rrCandidate: string,
    weekNumber: number,
    year: number,
    splitMap: Record<string, HourSplit>
  ) => {
    if (typeof window === "undefined") return;
    const key = getSplitStorageKey(candidate, rrCandidate, weekNumber, year);
    try {
      window.localStorage.setItem(key, JSON.stringify(splitMap));
    } catch {
      // Ignore storage quota/access errors and continue with API save.
    }
  };

  const resetWeeklyState = () => {
    setWorkorderWeeks([]);
    setWeekStatusByNumber({});
    setWeekRowsByNumber({});
    setWeekDataByNumber({});
    setLeaveSelections({});
    setDayRemarks({});
    fetchedWeekDataRef.current = new Set();
    inFlightOverviewWeekRef.current = new Set();
    inFlightActiveWeekRef.current = new Set();
    workorderFetchKeyRef.current = "";
    setWeekLoadStatus("");
    setSubmissionStatus("");
    setActiveWeekNumber(0);
    setHasUnsavedChanges(false);
    autoSelectedWeekRef.current = false;
  };

  const toggleWeek = (weekNumber: number) => {
    setActiveWeekNumber((prev) => (prev === weekNumber ? 0 : weekNumber));
  };

  const navigateMonth = (direction: -1 | 1) => {
    if (weeksForUi.length === 0) return;
    const activeWeek = activeWeekData ?? weeksForUi[0];
    const baseIso = activeWeek?.weekStartIso || activeWeek?.weekEndIso;
    const baseDate = baseIso ? new Date(`${baseIso}T00:00:00`) : new Date();
    if (Number.isNaN(baseDate.getTime())) return;

    const target = new Date(baseDate.getFullYear(), baseDate.getMonth() + direction, 1);
    const targetMonth = target.getMonth();
    const targetYear = target.getFullYear();

    const candidateWeeks = weeksForUi.filter((week) => {
      const probe = week.weekStartIso || week.weekEndIso;
      if (!probe) return false;
      const d = new Date(`${probe}T00:00:00`);
      if (Number.isNaN(d.getTime())) return false;
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    if (candidateWeeks.length === 0) {
      setSubmissionStatus("No timesheet weeks available for that month.");
      return;
    }

    const sorted = [...candidateWeeks].sort((a, b) => {
      const aTime = a.weekStartIso ? new Date(`${a.weekStartIso}T00:00:00`).getTime() : 0;
      const bTime = b.weekStartIso ? new Date(`${b.weekStartIso}T00:00:00`).getTime() : 0;
      return aTime - bTime;
    });
    const targetWeek = direction === 1 ? sorted[0] : sorted[sorted.length - 1];
    const { weekNumber } = getWeekAndYear(targetWeek);
    if (weekNumber > 0) {
      setActiveWeekNumber(weekNumber);
      setSubmissionStatus("");
    }
  };

  const toggleLeave = (date: string) => {
    setHasUnsavedChanges(true);
    setLeaveSelections((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleCommentSubmit = (comment: string) => {
    const remarkKey = commentModal?.remarkKey;
    if (!remarkKey) return;
    setHasUnsavedChanges(true);
    setDayRemarks((prev) => ({ ...prev, [remarkKey]: comment.trim() }));
  };

  const updateRowHours = (
    weekNumber: number,
    rowKey: string,
    field: "regular" | "overtime",
    value: string
  ) => {
    const numeric = Number.parseFloat(value);
    const safeValue = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    setHasUnsavedChanges(true);
    setWeekRowsByNumber((prev) => {
      const currentRows = prev[weekNumber] ?? [];
      const nextRows = currentRows.map((row) => {
        const key = row.isoDate ?? row.date;
        if (key !== rowKey) return row;
        const nextRegular = field === "regular" ? safeValue : (row.regular ?? 0);
        const nextOvertime = field === "overtime" ? safeValue : (row.overtime ?? 0);
        return {
          ...row,
          regular: nextRegular,
          overtime: nextOvertime,
          total: nextRegular + nextOvertime,
        };
      });
      return { ...prev, [weekNumber]: nextRows };
    });
  };

  const getHourInputKey = (weekNumber: number, rowKey: string, field: "regular" | "overtime") =>
    `${weekNumber}:${rowKey}:${field}`;

  const getHourInputValue = (
    weekNumber: number,
    rowKey: string,
    field: "regular" | "overtime",
    fallback: number | undefined
  ) => {
    const key = getHourInputKey(weekNumber, rowKey, field);
    if (Object.prototype.hasOwnProperty.call(hourInputDrafts, key)) {
      return hourInputDrafts[key];
    }
    return String(fallback ?? 0);
  };

  const handleHourInputFocus = (
    weekNumber: number,
    rowKey: string,
    field: "regular" | "overtime",
    current: number | undefined
  ) => {
    if ((current ?? 0) !== 0) return;
    const key = getHourInputKey(weekNumber, rowKey, field);
    setHourInputDrafts((prev) => ({ ...prev, [key]: "" }));
  };

  const handleHourInputChange = (
    weekNumber: number,
    rowKey: string,
    field: "regular" | "overtime",
    rawValue: string
  ) => {
    const key = getHourInputKey(weekNumber, rowKey, field);
    setHourInputDrafts((prev) => ({ ...prev, [key]: rawValue }));
    if (rawValue.trim() === "") {
      updateRowHours(weekNumber, rowKey, field, "0");
      return;
    }
    updateRowHours(weekNumber, rowKey, field, rawValue);
  };

  const handleHourInputBlur = (
    weekNumber: number,
    rowKey: string,
    field: "regular" | "overtime"
  ) => {
    const key = getHourInputKey(weekNumber, rowKey, field);
    const rawValue = hourInputDrafts[key];
    if (typeof rawValue === "string" && rawValue.trim() === "") {
      updateRowHours(weekNumber, rowKey, field, "0");
    }
    setHourInputDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    const onNavigationAttempt = (event: Event) => {
      if (!hasUnsavedChanges) return;
      const customEvent = event as CustomEvent<{ url?: string }>;
      const destinationUrl = customEvent.detail?.url?.trim();
      if (!destinationUrl) return;
      const destination = new URL(destinationUrl, window.location.href);
      const current = new URL(window.location.href);
      if (destination.href === current.href) return;
      event.preventDefault();
      setPendingNavigationUrl(destination.href);
      setShowUnsavedModal(true);
    };
    window.addEventListener("te:navigation-attempt", onNavigationAttempt as EventListener);
    return () =>
      window.removeEventListener("te:navigation-attempt", onNavigationAttempt as EventListener);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges) return;
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;
      const destination = new URL(anchor.href, window.location.href);
      const current = new URL(window.location.href);
      if (destination.href === current.href) return;
      event.preventDefault();
      setPendingNavigationUrl(destination.href);
      setShowUnsavedModal(true);
    };
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rrFromQuery = params.get("rr_name")?.trim() || "";
    const projectFromQuery = params.get("project")?.trim() || "";
    const candidateFromQuery = params.get("candidate_id")?.trim() || "";
    const profileFromSession = getProfileName()?.trim() || "";
    if (rrFromQuery) setRrName(rrFromQuery);
    if (projectFromQuery) setProjectName(projectFromQuery);
    if (candidateFromQuery) {
      if (/^PR-/i.test(candidateFromQuery)) {
        setProfileId(candidateFromQuery);
      } else {
        setRrCandidateId(candidateFromQuery);
      }
      setCandidateId(candidateFromQuery);
    }

    if (profileFromSession && !candidateFromQuery) {
      setProfileId(profileFromSession);
    }

    const fromSession = getCandidateId()?.trim() || "";
    if (fromSession && !candidateFromQuery) {
      if (/^PR-/i.test(fromSession)) {
        setProfileId(fromSession);
      } else {
        setRrCandidateId(fromSession);
      }
    }
    setIsIdentityResolved(true);
  }, []);

  const weeksForUi = useMemo(
    () => (workorderWeeks.length > 0 ? workorderWeeks : FALLBACK_WEEKS),
    [workorderWeeks]
  );

  const activeWeekData = useMemo(() => {
    if (!activeWeekNumber) return null;
    return weeksForUi.find((w) => w.weekLabel === `Week ${activeWeekNumber}`) ?? null;
  }, [activeWeekNumber, weeksForUi]);

  const activeWeekRows = useMemo(() => {
    if (!activeWeekNumber) return [];
    return weekRowsByNumber[activeWeekNumber] ?? activeWeekData?.rows ?? [];
  }, [activeWeekData, activeWeekNumber, weekRowsByNumber]);
  const activeWeekInfo = useMemo(
    () => (activeWeekData ? getWeekAndYear(activeWeekData) : { weekNumber: 0, year: 0 }),
    [activeWeekData]
  );

  function toIsoDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getWeekAndYear(week: WeeklySheet): { weekNumber: number; year: number } {
    const weekMatch = week.weekLabel.match(/\d+/);
    const parsedWeekNumber = Number.parseInt(weekMatch?.[0] || "0", 10);
    const startYear = week.weekStartIso
      ? Number.parseInt(week.weekStartIso.slice(0, 4), 10)
      : 0;
    const endYear = week.weekEndIso
      ? Number.parseInt(week.weekEndIso.slice(0, 4), 10)
      : 0;
    const yearMatch = week.range.match(/\b(\d{4})\b/);
    const rangeYear = Number.parseInt(yearMatch?.[1] || "0", 10);
    const year =
      (Number.isFinite(startYear) && startYear > 0 ? startYear : 0) ||
      (Number.isFinite(endYear) && endYear > 0 ? endYear : 0) ||
      (Number.isFinite(rangeYear) && rangeYear > 0 ? rangeYear : 0);
    const fallback = getIsoWeekYear(new Date());
    const weekNumber =
      Number.isFinite(parsedWeekNumber) && parsedWeekNumber > 0
        ? parsedWeekNumber
        : fallback.weekNumber;
    const resolvedYear = Number.isFinite(year) && year > 0 ? year : fallback.year;
    return { weekNumber, year: resolvedYear };
  }

  function formatRangeFromIso(startIso?: string, endIso?: string): string {
    if (!startIso || !endIso) return "—";
    const start = new Date(`${startIso}T00:00:00`);
    const end = new Date(`${endIso}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
    const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    return `${startLabel} - ${endLabel}`;
  }

  function getMonthTotalDays(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function buildRowsFromWeekData(
    weekData: WeekTimesheetDay[],
    splitMap?: Record<string, HourSplit>
  ): WeeklyRow[] {
    return weekData
      .filter((d) => typeof d.week_date === "string" && d.week_date.trim().length > 0)
      .map((day) => {
        const isoDate = day.week_date;
        const parsed = parseIsoDate(isoDate);
        const weekday = Number.isNaN(parsed.getTime())
          ? ""
          : parsed.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
        const total = Number.isFinite(day.total_working_hours) ? day.total_working_hours : 0;
        const split = splitMap?.[isoDate];
        const overtime = split ? toFiniteNonNegative(split.overtime) : 0;
        const regular = split
          ? Math.max(0, total - overtime)
          : total;
        return {
          isoDate,
          date: formatIsoDateForDisplay(isoDate),
          day: weekday,
          regular,
          overtime,
          total,
        };
      });
  }

  function hydrateWeekRowsFromData(
    weekNumber: number,
    weekData: WeekTimesheetDay[],
    splitMap?: Record<string, HourSplit>
  ) {
    setWeekRowsByNumber((prev) => {
      const base = prev[weekNumber] ?? [];
      if (base.length === 0) return prev;
      const next = base.map((row) => {
        const iso = row.isoDate ?? "";
        const match = weekData.find((d) => d.week_date === iso);
        if (!match) return row;
        const total = toFiniteNonNegative(match.total_working_hours);
        const split = splitMap?.[iso];
        const overtime = split ? toFiniteNonNegative(split.overtime) : (row.overtime ?? 0);
        const regular = split ? Math.max(0, total - overtime) : total;
        return {
          ...row,
          total,
          regular,
          overtime: split ? overtime : (row.overtime ?? 0),
        };
      });
      return { ...prev, [weekNumber]: next };
    });

    const remarkPatch: Record<string, string> = {};
    for (const day of weekData) {
      if (!day.week_date || !day.remarks?.trim()) continue;
      remarkPatch[day.week_date] = day.remarks;
    }
    if (Object.keys(remarkPatch).length > 0) {
      setDayRemarks((prev) => ({ ...remarkPatch, ...prev }));
    }
  }

  useEffect(() => {
    const rrCandidate = rrCandidateId.trim();
    if (!rrCandidate || /^PR-/i.test(rrCandidate)) return;

    const { year } = activeWeekInfo;
    const nowYear = new Date().getFullYear();
    const targetYears = year > 0 ? [year] : [nowYear, nowYear - 1];
    const fetchKey = `${rrCandidate}::${targetYears.join(",")}`;
    if (workorderFetchKeyRef.current === fetchKey) return;
    workorderFetchKeyRef.current = fetchKey;

    let cancelled = false;
    void (async () => {
      for (let i = 0; i < targetYears.length; i += 1) {
        const y = targetYears[i];
        const isLastTry = i === targetYears.length - 1;
        try {
          const response = await getTimesheetForWorkorder(rrCandidate, y);
          if (cancelled) return;
          const currentWeek = getIsoWeekYear(new Date());
          const fetchedWeeks: WeeklySheet[] = response.timesheets.map((ts) => ({
            range: formatRangeFromIso(ts.week_start_date, ts.week_end_date),
            weekLabel: `Week ${ts.week_number}`,
            regular: ts.total_work_hours,
            overtime: 0,
            total: ts.total_work_hours,
            current: ts.week_number === currentWeek.weekNumber && ts.year === currentWeek.year,
            rows: [],
            weekStartIso: ts.week_start_date,
            weekEndIso: ts.week_end_date,
          }));
          const currentMonthWeeks = getCurrentMonthIsoWeeks();
          const existingWeekNumbers = new Set(
            fetchedWeeks
              .map((w) => Number.parseInt(w.weekLabel.replace(/\D+/g, ""), 10))
              .filter((n) => Number.isFinite(n) && n > 0)
          );
          const placeholderWeeks: WeeklySheet[] = currentMonthWeeks
            .filter((w) => !existingWeekNumbers.has(w.weekNumber))
            .map((w) => ({
              range: formatRangeFromIso(w.startIso, w.endIso),
              weekLabel: `Week ${w.weekNumber}`,
              regular: 0,
              overtime: 0,
              total: 0,
              current: w.weekNumber === currentWeek.weekNumber && w.year === currentWeek.year,
              rows: [],
              weekStartIso: w.startIso,
              weekEndIso: w.endIso,
            }));
          const nextWeeks = [...fetchedWeeks, ...placeholderWeeks].sort((a, b) => {
            const aDate = a.weekStartIso ? new Date(`${a.weekStartIso}T00:00:00`).getTime() : 0;
            const bDate = b.weekStartIso ? new Date(`${b.weekStartIso}T00:00:00`).getTime() : 0;
            return aDate - bDate;
          });
          if (nextWeeks.length > 0 || isLastTry) {
            setWorkorderWeeks(nextWeeks);
            const statusMap: Record<number, string> = {};
            for (const item of response.timesheets) {
              statusMap[item.week_number] = item.consolidation_status;
            }
            setWeekStatusByNumber(statusMap);
            if (!autoSelectedWeekRef.current && nextWeeks[0]) {
              const n = Number.parseInt(nextWeeks[0].weekLabel.replace(/\D+/g, ""), 10);
              if (Number.isFinite(n) && n > 0) {
                setActiveWeekNumber(n);
                autoSelectedWeekRef.current = true;
              }
            }
            return;
          }
        } catch {
          if (cancelled) return;
          if (isLastTry) {
            setWorkorderWeeks([]);
            setWeekStatusByNumber({});
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeWeekInfo, rrCandidateId]);

  useEffect(() => {
    const { weekNumber, year } = activeWeekInfo;
    const existingRows = weekRowsByNumber[weekNumber];
    if (!weekNumber || !year || (Array.isArray(existingRows) && existingRows.length > 0)) return;

    let cancelled = false;
    setWeekLoadStatus("");

    void getDaysOfWeek(weekNumber, year)
      .then((response) => {
        if (cancelled) return;
        const rows: WeeklyRow[] = response.days.map((isoDate) => {
          const parsed = parseIsoDate(isoDate);
          const day = Number.isNaN(parsed.getTime())
            ? ""
            : parsed.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
          return {
            isoDate,
            date: formatIsoDateForDisplay(isoDate),
            day,
            regular: 0,
            overtime: 0,
            total: 0,
          };
        });
        setWeekRowsByNumber((prev) => ({ ...prev, [weekNumber]: rows }));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setWeekLoadStatus(
          error instanceof Error
            ? error.message
            : "Unable to fetch week calendar days."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activeWeekInfo, weekRowsByNumber]);

  useEffect(() => {
    if (!isIdentityResolved) return;
    const profile = profileId.trim();
    if (!profile) {
      setIsCheckingAssignment(false);
      setHasProjectAssignment(false);
      setAssignmentMessage("Profile information is missing. Complete your profile setup to access timesheet.");
      return;
    }
    let cancelled = false;
    setIsCheckingAssignment(true);
    setAssignmentMessage("");

    void getProjectsForProfile(profile)
      .then((response) => {
        if (cancelled) return;
        const hasAssignments = response.projects.length > 0;
        setAssignedProjects(response.projects);
        setHasProjectAssignment(hasAssignments);
        if (!hasAssignments) {
          setAssignmentMessage("Timesheet will be enabled once you are allotted to a project.");
          setProjectName("");
          setRrName("");
          setRrCandidateId("");
          resetWeeklyState();
          return;
        }
        const preferredProject = projectName.trim();
        const selected =
          response.projects.find((item) => item.project === preferredProject) ?? response.projects[0];
        if (!selected) return;
        setProjectName(selected.project);
        setRrName(selected.rr);
        setRrCandidateId(selected.rr_candidate);
        resetWeeklyState();
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAssignedProjects([]);
        setHasProjectAssignment(false);
        setAssignmentMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify project assignment right now."
        );
      })
      .finally(() => {
        if (cancelled) return;
        setIsCheckingAssignment(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isIdentityResolved, profileId]);

  useEffect(() => {
    const selected = assignedProjects.find((item) => item.project === projectName.trim());
    if (!selected) return;
    if (
      rrName.trim() === selected.rr &&
      rrCandidateId.trim() === selected.rr_candidate
    ) {
      return;
    }
    setRrName(selected.rr);
    setRrCandidateId(selected.rr_candidate);
    resetWeeklyState();
  }, [assignedProjects, projectName, rrCandidateId, rrName]);

  useEffect(() => {
    const rrCandidate = rrCandidateId.trim();
    if (!rrCandidate || /^PR-/i.test(rrCandidate) || workorderWeeks.length === 0) return;

    const now = new Date();
    const lastMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    const lastKey = `${lastMonthRef.getFullYear()}-${lastMonthRef.getMonth()}`;
    const targetWeeks = workorderWeeks.filter((week) => {
      if (!week.weekEndIso) return false;
      const weekEnd = new Date(`${week.weekEndIso}T00:00:00`);
      if (Number.isNaN(weekEnd.getTime())) return false;
      const key = `${weekEnd.getFullYear()}-${weekEnd.getMonth()}`;
      return key === currentKey || key === lastKey;
    });
    if (targetWeeks.length === 0) return;

    let cancelled = false;
    void Promise.all(
      targetWeeks.map(async (week) => {
        const { weekNumber, year } = getWeekAndYear(week);
        if (!weekNumber || !year) return;
        if (weekDataByNumber[weekNumber]) return;
        const key = `${rrCandidate}:${year}:${weekNumber}`;
        if (fetchedWeekDataRef.current.has(key)) return;
        if (inFlightOverviewWeekRef.current.has(key)) return;
        inFlightOverviewWeekRef.current.add(key);
        try {
          const response = await getTimesheetByWeek({
            rr_candidate_id: rrCandidate,
            week: weekNumber,
            year,
          });
          if (cancelled) return;
          setWeekDataByNumber((prev) => ({
            ...prev,
            [weekNumber]: response.week_data,
          }));
          fetchedWeekDataRef.current.add(key);
        } catch {
          // Keep overview resilient even if one week fails.
        } finally {
          inFlightOverviewWeekRef.current.delete(key);
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [rrCandidateId, weekDataByNumber, workorderWeeks]);

  const monthlyOverview = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonthRef = new Date(thisYear, thisMonth - 1, 1);
    const lastMonth = lastMonthRef.getMonth();
    const lastMonthYear = lastMonthRef.getFullYear();

    let thisMonthHours = 0;
    let lastMonthHours = 0;
    let thisMonthLoggedDays = 0;
    let lastMonthLoggedDays = 0;
    const seenThisMonthDays = new Set<string>();
    const seenLastMonthDays = new Set<string>();

    const allWeekData = Object.values(weekDataByNumber).flat();
    if (allWeekData.length > 0) {
      for (const day of allWeekData) {
        const d = new Date(`${day.week_date}T00:00:00`);
        if (Number.isNaN(d.getTime())) continue;
        const m = d.getMonth();
        const y = d.getFullYear();
        if (m === thisMonth && y === thisYear) {
          thisMonthHours += day.total_working_hours || 0;
          if (day.total_working_hours > 0 && !seenThisMonthDays.has(day.week_date)) {
            seenThisMonthDays.add(day.week_date);
            thisMonthLoggedDays += 1;
          }
        } else if (m === lastMonth && y === lastMonthYear) {
          lastMonthHours += day.total_working_hours || 0;
          if (day.total_working_hours > 0 && !seenLastMonthDays.has(day.week_date)) {
            seenLastMonthDays.add(day.week_date);
            lastMonthLoggedDays += 1;
          }
        }
      }
    } else {
      for (const week of workorderWeeks) {
        if (!week.weekEndIso) continue;
        const weekEnd = new Date(`${week.weekEndIso}T00:00:00`);
        if (Number.isNaN(weekEnd.getTime())) continue;
        const m = weekEnd.getMonth();
        const y = weekEnd.getFullYear();
        if (m === thisMonth && y === thisYear) thisMonthHours += week.total || 0;
        if (m === lastMonth && y === lastMonthYear) lastMonthHours += week.total || 0;
      }
    }

    const thisMonthTotalDays = getMonthTotalDays(now);
    const lastMonthTotalDays = getMonthTotalDays(lastMonthRef);

    return {
      thisMonthHours,
      lastMonthHours,
      thisMonthLoggedDays,
      lastMonthLoggedDays,
      thisMonthTotalDays,
      lastMonthTotalDays,
      thisMonthPercent:
        thisMonthTotalDays > 0 ? (thisMonthLoggedDays / thisMonthTotalDays) * 100 : 0,
      lastMonthPercent:
        lastMonthTotalDays > 0 ? (lastMonthLoggedDays / lastMonthTotalDays) * 100 : 0,
    };
  }, [weekDataByNumber, workorderWeeks]);

  useEffect(() => {
    const rrCandidate = rrCandidateId.trim();
    const { weekNumber, year } = activeWeekInfo;
    if (!rrCandidate || /^PR-/i.test(rrCandidate) || !weekNumber || !year) return;
    const key = `${rrCandidate}:${year}:${weekNumber}`;

    const existingWeekData = weekDataByNumber[weekNumber];
    if (existingWeekData) {
      const candidate = profileId.trim();
      const rrCandidate = rrCandidateId.trim();
      const splitMap =
        candidate && rrCandidate
          ? readStoredSplitMap(candidate, rrCandidate, weekNumber, year)
          : {};
      setWeekRowsByNumber((prev) => {
        const currentRows = prev[weekNumber];
        if (Array.isArray(currentRows) && currentRows.length > 0) return prev;
        const rows = buildRowsFromWeekData(existingWeekData, splitMap);
        if (rows.length === 0) return prev;
        return { ...prev, [weekNumber]: rows };
      });
      hydrateWeekRowsFromData(weekNumber, existingWeekData, splitMap);
      fetchedWeekDataRef.current.add(key);
      return;
    }

    if (fetchedWeekDataRef.current.has(key)) return;
    if (inFlightActiveWeekRef.current.has(key)) return;

    let cancelled = false;
    inFlightActiveWeekRef.current.add(key);
    void getTimesheetByWeek({
      rr_candidate_id: rrCandidate,
      week: weekNumber,
      year,
    })
      .then((response) => {
        if (cancelled) return;
        const candidate = profileId.trim();
        const rrCandidate = rrCandidateId.trim();
        const splitMap =
          candidate && rrCandidate
            ? readStoredSplitMap(candidate, rrCandidate, weekNumber, year)
            : {};
        setWeekDataByNumber((prev) => ({ ...prev, [weekNumber]: response.week_data }));
        setWeekRowsByNumber((prev) => {
          const currentRows = prev[weekNumber];
          if (Array.isArray(currentRows) && currentRows.length > 0) return prev;
          const rows = buildRowsFromWeekData(response.week_data, splitMap);
          if (rows.length === 0) return prev;
          return { ...prev, [weekNumber]: rows };
        });
        hydrateWeekRowsFromData(weekNumber, response.week_data, splitMap);
        fetchedWeekDataRef.current.add(key);
      })
      .catch(() => {
        // Leave remarks user-entered/manual when no existing week data.
      })
      .finally(() => {
        inFlightActiveWeekRef.current.delete(key);
      });

    return () => {
      cancelled = true;
    };
  }, [activeWeekInfo, profileId, rrCandidateId, weekDataByNumber]);

  async function saveTimesheet(status: "open" | "submit" | "re_submit"): Promise<boolean> {
    if (!activeWeekData) {
      setSubmissionStatus("Please expand a week before saving.");
      return false;
    }
    const candidate = profileId.trim();
    const rrCandidate = rrCandidateId.trim();
    const rr = rrName.trim();
    const project = projectName.trim();
    if (!candidate || !rr || !rrCandidate) {
      setSubmissionStatus("Unable to resolve assignment details. Please refresh and try again.");
      return false;
    }
    if (!project) {
      setSubmissionStatus("Project name is required.");
      return false;
    }

    const { weekNumber, year } = getWeekAndYear(activeWeekData);
    if (!weekNumber || !year) {
      setSubmissionStatus("Unable to determine week number/year from selected week.");
      return false;
    }

    const weekStatus = (weekStatusByNumber[weekNumber] || "").toLowerCase();
    if (weekStatus.includes("approved")) {
      setSubmissionStatus("Cannot edit. Status is Approved.");
      return false;
    }
    if (status === "re_submit" && weekStatus && !weekStatus.includes("reject")) {
      setSubmissionStatus("Re-submit is allowed only after rejection.");
      return false;
    }

    let weekDates: string[] = [];
    try {
      const weekResponse = await getDaysOfWeek(weekNumber, year);
      weekDates = weekResponse.days;
    } catch {
      weekDates = [];
    }

    const rowsByIsoDate = new Map<
      string,
      { total_working_hours: number; remarks: string }
    >();
    for (const row of activeWeekRows) {
      const date = row.isoDate ?? toIsoDate(row.date);
      if (!date) continue;
      const total = Number(row.total ?? (row.regular ?? 0) + (row.overtime ?? 0));
      rowsByIsoDate.set(date, {
        total_working_hours: Number.isFinite(total) ? total : 0,
        remarks: dayRemarks[row.isoDate ?? row.date] ?? "",
      });
    }

    const projectHoursByDate = new Map<string, number>();
    try {
      const projectTimesheet = await getTimesheetForProject({
        project,
        week: weekNumber,
        year,
      });
      for (const entry of projectTimesheet.entries) {
        if (!entry.date) continue;
        projectHoursByDate.set(entry.date, Number.isFinite(entry.total_work_hours) ? entry.total_work_hours : 0);
      }
    } catch {
      // Fallback to only local rows if this fetch fails.
    }

    const timesheetData = (weekDates.length > 0 ? weekDates : Array.from(rowsByIsoDate.keys()))
      .map((row) => {
        if (!row) return null;
        const fromRows = rowsByIsoDate.get(row);
        return {
          date: row,
          total_working_hours:
            fromRows?.total_working_hours ?? projectHoursByDate.get(row) ?? 0,
          remarks: fromRows?.remarks ?? dayRemarks[row] ?? "",
        };
      })
      .filter((entry): entry is { date: string; total_working_hours: number; remarks: string } => !!entry);

    if (timesheetData.length === 0) {
      setSubmissionStatus("No valid row dates found for the selected week.");
      return false;
    }

    setSubmitBusy(true);
    setSubmissionStatus("");
    try {
      const splitMap: Record<string, HourSplit> = {};
      for (const row of activeWeekRows) {
        const iso = row.isoDate ?? toIsoDate(row.date);
        if (!iso) continue;
        splitMap[iso] = {
          regular: toFiniteNonNegative(row.regular),
          overtime: toFiniteNonNegative(row.overtime),
        };
      }
      if (Object.keys(splitMap).length > 0) {
        writeStoredSplitMap(candidate, rrCandidate, weekNumber, year, splitMap);
      }
      const response = await createEditCandidateTimesheet({
        candidate_id: candidate,
        rr_candidate_id: rrCandidate,
        rr_name: rr,
        project,
        week_number: weekNumber,
        year,
        status,
        timesheet_data: timesheetData,
      });
      const actionLabel =
        status === "open" ? "Draft saved" : status === "re_submit" ? "Re-submitted" : "Submitted";
      setSubmissionStatus(
        `${actionLabel} successfully. Created: ${response.created ?? 0}, Updated: ${response.updated ?? 0}`
      );
      setHasUnsavedChanges(false);
      return true;
    } catch (error) {
      setSubmissionStatus(error instanceof Error ? error.message : "Failed to save timesheet.");
      return false;
    } finally {
      setSubmitBusy(false);
    }
  }

  const handleSaveDraftAndContinueNavigation = async () => {
    const saved = await saveTimesheet("open");
    if (!saved) return;
    const target = pendingNavigationUrl;
    setShowUnsavedModal(false);
    setPendingNavigationUrl(null);
    if (target) {
      window.location.assign(target);
    }
  };

  const handleLeaveWithoutSaving = () => {
    const target = pendingNavigationUrl;
    setHasUnsavedChanges(false);
    setShowUnsavedModal(false);
    setPendingNavigationUrl(null);
    if (target) {
      window.location.assign(target);
    }
  };

  const isCompact = useIs768AndBelow();
  const compactTimesheetView = isCompact && mobileTimesheetTab === "timesheet";

  if (isCheckingAssignment) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        {!isCompact ? <AppNavbar /> : null}
        <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center justify-center px-4 py-12">
          <p className="text-sm font-medium text-slate-600">Checking your project assignment...</p>
        </main>
      </div>
    );
  }

  if (!hasProjectAssignment) {
    const blockedView = (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-2xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Timesheet not available yet</h1>
          <p className="mt-2 text-sm text-slate-600">
            {assignmentMessage || "Timesheet access is available only after project assignment."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/dashboard/")}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#033CE5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </main>
    );

    if (isCompact) {
      return <CandidateAppShell>{blockedView}</CandidateAppShell>;
    }

    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <AppNavbar />
        {blockedView}
      </div>
    );
  }

  const activeWeekRange = activeWeekData?.range ?? "—";
  const monthNavLabel = getMonthYearLabelFromWeekRange(activeWeekRange);

  const overviewCards = (
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-m font-semibold">
              <span>Hours Worked - Total</span>
            </div>
            <div className="mt-5 space-y-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Regular Hours</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {workorderWeeks.reduce((acc, w) => acc + (w.regular || 0), 0)}
                  </p>
                </div>
              </div>

              <hr />

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Overtime Hours</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {workorderWeeks.reduce((acc, w) => acc + (w.overtime || 0), 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-m font-semibold">Timesheet Login Streak</p>
            <p className="text-sm text-slate-500">Days logged-in: This Month vs Last Month</p>
            <div className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>This Month</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                    {monthlyOverview.thisMonthLoggedDays}/{monthlyOverview.thisMonthTotalDays} days
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(100, monthlyOverview.thisMonthPercent)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Last Month</span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">
                    {monthlyOverview.lastMonthLoggedDays}/{monthlyOverview.lastMonthTotalDays} days
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: `${Math.min(100, monthlyOverview.lastMonthPercent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-m font-semibold">
              <span>Hours Worked - Monthly</span>
            </div>
            <p className="text-sm text-slate-500">Total Hours Worked: This Month vs Last Month</p>
            <hr className="mt-5" />
            <div className="mt-5 flex flex-col flex-wrap gap-3">
              <div className="flex justify-between py-1">
                <span className="text-sm font-semibold text-emerald-700">This Month:</span>
                <span className="rounded-full bg-emerald-50 px-4 py-1 text-sm text-emerald-700 font-semibold">
                  {monthlyOverview.thisMonthHours} hrs
                </span>
              </div>
              <hr />
              <div className="flex justify-between py-1">
                <span className="text-sm font-semibold text-purple-700">Last Month:</span>
                <span className="rounded-full bg-purple-50 px-4 py-1 text-sm font-semibold text-purple-700">
                  {monthlyOverview.lastMonthHours} hrs
                </span>
              </div>
            </div>
          </div>
        </section>
  );

  const timesheetMain = (
      <main className="max-w-[1600px] mx-auto space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {!isCompact ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Timesheet</p>
            <h1 className="text-3xl font-semibold text-slate-900">Weekly time tracking</h1>
          </div>
          <button
            type="button"
            className="self-start sm:self-auto inline-flex items-center justify-center gap-2 bg-[#033CE5] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Export
          </button>
        </div>
        ) : null}

        {!isCompact ? overviewCards : null}
        {isCompact && mobileTimesheetTab === "overview" ? (
          <>
            <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
            {overviewCards}
          </>
        ) : null}

        {isCompact && mobileTimesheetTab === "timesheet" ? (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Weekly Timesheet</h1>
              <p className="mt-1 text-sm text-slate-500">Enter your time in hours for the project.</p>
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#033CE5] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Export
              </button>
            </div>
          </div>
        ) : null}

        <section
          className={`space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm ${isCompact && mobileTimesheetTab === "overview" ? "hidden" : ""}`}
        >
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {!compactTimesheetView ? (
            <div>
              <p className="text-lg font-semibold text-slate-900">Weekly Time-Sheet</p>
              <p className="text-sm text-slate-500">Enter your time in hours for the project</p>
            </div>
            ) : null}
            <div
              className={`flex items-center gap-3 ${compactTimesheetView ? "w-full" : ""} ${compactTimesheetView ? "" : "sm:justify-end"}`}
            >
              {compactTimesheetView ? (
                <div className="flex w-full items-stretch justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                    aria-label="Previous month"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex min-w-0 flex-[1.4] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 px-2 py-2.5">
                    <span className="truncate text-center text-sm font-semibold text-slate-900">
                      {monthNavLabel || "—"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                    aria-label="Next month"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigateMonth(-1)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous Month
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateMonth(1)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Next Month
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex flex-col gap-3">
              <select
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:max-w-xl"
              >
                {assignedProjects.length === 0 ? (
                  <option value="">No project assigned</option>
                ) : null}
                {assignedProjects.map((project) => (
                  <option key={`${project.project}-${project.rr_candidate}`} value={project.project}>
                    {project.project}
                  </option>
                ))}
              </select>
            </div>
            {submissionStatus ? (
              <p className="text-sm text-slate-600">{submissionStatus}</p>
            ) : null}
            {weekLoadStatus ? (
              <p className="text-sm text-amber-700">{weekLoadStatus}</p>
            ) : null}
          </div>

          <div className="space-y-3">
            {weeksForUi.map((week) => {
              const { weekNumber } = getWeekAndYear(week);
              const isActive = weekNumber === activeWeekNumber;
              const rows = isActive ? activeWeekRows : week.rows;
              const consolidationStatus = weekStatusByNumber[weekNumber];
              const statusLabel = getWeekStatusLabel(consolidationStatus);
              const weekEditable = isWeekEditable(consolidationStatus);
              const normalizedStatus = (consolidationStatus || "").toLowerCase();
              const submitActionStatus: "submit" | "re_submit" =
                normalizedStatus.includes("reject") ? "re_submit" : "submit";
              const submitActionLabel = submitActionStatus === "re_submit" ? "Re-submit" : "Submit";
              const computedRegular = rows.reduce((acc, row) => acc + (row.regular ?? 0), 0);
              const computedOvertime = rows.reduce((acc, row) => acc + (row.overtime ?? 0), 0);
              const computedTotal = rows.reduce((acc, row) => acc + (row.total ?? 0), 0);

              return (
                <div
                  key={week.range}
                  className={`rounded-2xl border px-5 py-4 transition ${isActive ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50/70"}`}
                >
                  <div className="space-y-2">
                    <div className={`flex w-full items-start justify-between ${isCompact ? "gap-2" : "gap-4"}`}>
                      <button
                        type="button"
                        onClick={() => toggleWeek(weekNumber)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={`font-semibold text-slate-900 ${isCompact ? "text-sm leading-snug" : "text-lg"}`}
                        >
                          {week.range}
                        </p>
                      </button>
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <>
                            <button
                              type="button"
                              disabled={submitBusy || !weekEditable}
                              onClick={() => void saveTimesheet("open")}
                              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Save Draft
                            </button>
                            <button
                              type="button"
                              disabled={submitBusy || !weekEditable}
                              onClick={() => void saveTimesheet(submitActionStatus)}
                              className="rounded-xl bg-[#033CE5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {submitActionLabel}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleWeek(weekNumber)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-slate-300 hover:bg-white"
                          aria-label={isActive ? "Collapse week" : "Expand week"}
                        >
                          <ChevronDown className={`h-5 w-5 transition ${isActive ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
                        </button>
                      </div>
                    </div>

                    <div className={`flex w-full items-start justify-between ${isCompact ? "gap-2" : "gap-4"}`}>
                      <button
                        type="button"
                        onClick={() => toggleWeek(weekNumber)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className={`text-slate-500 ${isCompact ? "text-xs" : "text-sm"}`}>
                          {getDisplayWeekLabel(week)}
                        </p>
                        <p className={`mt-1 text-xs font-semibold ${isCompact ? "" : "text-sm"} text-blue-700`}>
                          Status: {statusLabel}
                        </p>
                      </button>
                      <div
                        className={`flex flex-wrap items-center gap-2 ${isCompact ? "max-w-[62%] justify-end text-right" : "justify-end"}`}
                      >
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-700">
                          Regular Hours: {rows.length > 0 ? computedRegular : week.regular}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700">
                          Overtime Hours: {rows.length > 0 ? computedOvertime : week.overtime}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
                          Total Hours: {rows.length > 0 ? computedTotal : week.total}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isActive && rows.length > 0 && (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="hidden lg:block">
                        <div className="overflow-x-auto">
                          <table className="min-w-full table-fixed text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-6 py-3 text-left">Days</th>
                                <th className="px-6 py-3 text-left">Regular Hours</th>
                                <th className="px-6 py-3 text-left">Overtime Hours</th>
                                <th className="px-6 py-3 text-left">Leave</th>
                                <th className="px-6 py-3 text-left">Total Hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {rows.map((row) => {
                                const rowKey = row.isoDate ?? row.date;
                                const leaveActive = !!leaveSelections[rowKey];
                                return (
                                  <tr key={rowKey} className={`transition-colors ${leaveActive ? "bg-amber-50/70" : "hover:bg-slate-50"}`}>
                                    <td className="px-6 py-4">
                                      <p className="font-semibold text-slate-900">{row.date}</p>
                                      <p className="text-xs text-slate-500">{row.day}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min={0}
                                          step="0.5"
                                          value={getHourInputValue(weekNumber, rowKey, "regular", row.regular)}
                                          disabled={!weekEditable}
                                          onFocus={() => handleHourInputFocus(weekNumber, rowKey, "regular", row.regular)}
                                          onChange={(event) => handleHourInputChange(weekNumber, rowKey, "regular", event.target.value)}
                                          onBlur={() => handleHourInputBlur(weekNumber, rowKey, "regular")}
                                          className="h-11 w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-base font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            setCommentModal({
                                              date: row.date,
                                              remarkKey: rowKey,
                                              comment: dayRemarks[rowKey] ?? "",
                                              triggerElement: e.currentTarget,
                                            })
                                          }
                                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                                            <path d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V10.5C14 11.3284 13.3284 12 12.5 12H9L5 14V12H3.5C2.67157 12 2 11.3284 2 10.5V3.5Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min={0}
                                          step="0.5"
                                          value={getHourInputValue(weekNumber, rowKey, "overtime", row.overtime)}
                                          disabled={!weekEditable}
                                          onFocus={() => handleHourInputFocus(weekNumber, rowKey, "overtime", row.overtime)}
                                          onChange={(event) => handleHourInputChange(weekNumber, rowKey, "overtime", event.target.value)}
                                          onBlur={() => handleHourInputBlur(weekNumber, rowKey, "overtime")}
                                          className="h-11 w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-base font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                                        />
                                        <button
                                          type="button"
                                          onClick={(e) =>
                                            setCommentModal({
                                              date: row.date,
                                              remarkKey: rowKey,
                                              comment: dayRemarks[rowKey] ?? "",
                                              triggerElement: e.currentTarget,
                                            })
                                          }
                                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                                            <path d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V10.5C14 11.3284 13.3284 12 12.5 12H9L5 14V12H3.5C2.67157 12 2 11.3284 2 10.5V3.5Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4">
                                      <button
                                        type="button"
                                        onClick={() => toggleLeave(rowKey)}
                                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                                          leaveActive
                                            ? "border-amber-300 bg-amber-100 text-amber-800"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                                        }`}
                                      >
                                        <Bandage className="h-4 w-4" />
                                        Sick Leave
                                      </button>
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-base font-semibold text-slate-900">
                                          {leaveActive ? "Sick Leave" : `${row.total ?? "-"} hrs`}
                                        </span>
                                        {leaveActive && (
                                          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                            Recorded
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="space-y-4 px-4 py-4 lg:hidden">
                        {rows.map((row) => {
                          const rowKey = row.isoDate ?? row.date;
                          const leaveActive = !!leaveSelections[rowKey];
                          return (
                            <div
                              key={rowKey}
                              className={`space-y-3 rounded-2xl border px-4 py-4 shadow-sm transition ${leaveActive ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-slate-50/80"}`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-900">{row.date}</p>
                                  <p className="text-xs text-slate-500">{row.day}</p>
                                </div>
                                <span className="text-xs font-semibold text-slate-500">
                                  {leaveActive ? "Sick Leave" : `${row.total ?? "-"} hrs total`}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Regular</p>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.5"
                                      value={getHourInputValue(weekNumber, rowKey, "regular", row.regular)}
                                      disabled={!weekEditable}
                                      onFocus={() => handleHourInputFocus(weekNumber, rowKey, "regular", row.regular)}
                                      onChange={(event) => handleHourInputChange(weekNumber, rowKey, "regular", event.target.value)}
                                      onBlur={() => handleHourInputBlur(weekNumber, rowKey, "regular")}
                                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-base font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        setCommentModal({
                                          date: row.date,
                                          remarkKey: rowKey,
                                          comment: dayRemarks[rowKey] ?? "",
                                          triggerElement: e.currentTarget,
                                        })
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                                        <path d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V10.5C14 11.3284 13.3284 12 12.5 12H9L5 14V12H3.5C2.67157 12 2 11.3284 2 10.5V3.5Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overtime</p>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min={0}
                                      step="0.5"
                                      value={getHourInputValue(weekNumber, rowKey, "overtime", row.overtime)}
                                      disabled={!weekEditable}
                                      onFocus={() => handleHourInputFocus(weekNumber, rowKey, "overtime", row.overtime)}
                                      onChange={(event) => handleHourInputChange(weekNumber, rowKey, "overtime", event.target.value)}
                                      onBlur={() => handleHourInputBlur(weekNumber, rowKey, "overtime")}
                                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-base font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) =>
                                        setCommentModal({
                                          date: row.date,
                                          remarkKey: rowKey,
                                          comment: dayRemarks[rowKey] ?? "",
                                          triggerElement: e.currentTarget,
                                        })
                                      }
                                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="stroke-current">
                                        <path d="M2 3.5C2 2.67157 2.67157 2 3.5 2H12.5C13.3284 2 14 2.67157 14 3.5V10.5C14 11.3284 13.3284 12 12.5 12H9L5 14V12H3.5C2.67157 12 2 11.3284 2 10.5V3.5Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleLeave(rowKey)}
                                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                                  leaveActive
                                    ? "border-amber-300 bg-amber-100 text-amber-800"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                                }`}
                              >
                                <Bandage className="h-4 w-4" />
                                {leaveActive ? "Leave recorded" : "Sick Leave"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
  );

  const timesheetModal =
    commentModal ? (
      <CommentModal
        date={commentModal.date}
        initialComment={commentModal.comment}
        triggerElement={commentModal.triggerElement}
        onClose={() => setCommentModal(null)}
        onSubmit={handleCommentSubmit}
      />
    ) : null;

  const unsavedChangesModal = (
    <UnsavedChangesModal
      open={showUnsavedModal}
      submitBusy={submitBusy}
      onSaveDraftAndContinue={() => {
        void handleSaveDraftAndContinueNavigation();
      }}
      onLeaveWithoutSaving={handleLeaveWithoutSaving}
      onStay={() => {
        setShowUnsavedModal(false);
        setPendingNavigationUrl(null);
      }}
    />
  );

  if (isCompact) {
    return (
      <>
        <CandidateAppShell
          timesheetNav={{
            active: mobileTimesheetTab,
            onChange: setMobileTimesheetTab,
          }}
        >
          {timesheetMain}
        </CandidateAppShell>
        {timesheetModal}
        {unsavedChangesModal}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppNavbar />
      {timesheetMain}
      {timesheetModal}
      {unsavedChangesModal}
    </div>
  );
}
