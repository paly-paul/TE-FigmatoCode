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
import SubmitConfirmModal from "./SubmitConfirmModal";
import SubmitSuccessModal from "./SubmitSuccessModal";

type WeeklyRow = {
  isoDate?: string;
  date: string;
  day: string;
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
  const [submitConfirm, setSubmitConfirm] = useState<{
    action: "submit" | "re_submit";
    label: string;
    weekRange: string;
  } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<{
    label: string;
    weekRange: string;
  } | null>(null);
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

  const navigateWeek = (direction: -1 | 1) => {
    if (sortedWeeksForNav.length === 0) return;
    const nextIndex =
      currentNavIndex === -1
        ? direction === 1
          ? 0
          : sortedWeeksForNav.length - 1
        : currentNavIndex + direction;
    if (nextIndex < 0 || nextIndex >= sortedWeeksForNav.length) return;
    const { weekNumber } = getWeekAndYear(sortedWeeksForNav[nextIndex]);
    if (weekNumber > 0) {
      setActiveWeekNumber(weekNumber);
      setSubmissionStatus("");
    }
  };

  const toggleLeave = (weekNumber: number, rowKey: string) => {
    setHasUnsavedChanges(true);
    setLeaveSelections((prev) => {
      const turningOn = !prev[rowKey];
      if (turningOn) {
        // Zero out the hour input immediately when leave is activated
        setWeekRowsByNumber((rows) => {
          const current = rows[weekNumber] ?? [];
          const next = current.map((r) =>
            (r.isoDate ?? r.date) === rowKey ? { ...r, total: 0 } : r
          );
          return { ...rows, [weekNumber]: next };
        });
        setHourInputDrafts((drafts) => {
          const next = { ...drafts };
          delete next[getHourInputKey(weekNumber, rowKey)];
          return next;
        });
      }
      return { ...prev, [rowKey]: !prev[rowKey] };
    });
  };

  const handleCommentSubmit = (comment: string) => {
    const remarkKey = commentModal?.remarkKey;
    if (!remarkKey) return;
    setHasUnsavedChanges(true);
    setDayRemarks((prev) => ({ ...prev, [remarkKey]: comment.trim() }));
  };

  const updateRowHours = (weekNumber: number, rowKey: string, value: string) => {
    const numeric = Number.parseFloat(value);
    const safeValue = Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
    setHasUnsavedChanges(true);
    setWeekRowsByNumber((prev) => {
      const currentRows = prev[weekNumber] ?? [];
      const nextRows = currentRows.map((row) => {
        const key = row.isoDate ?? row.date;
        if (key !== rowKey) return row;
        return { ...row, total: safeValue };
      });
      return { ...prev, [weekNumber]: nextRows };
    });
  };

  const getHourInputKey = (weekNumber: number, rowKey: string) =>
    `${weekNumber}:${rowKey}:total`;

  const getHourInputValue = (weekNumber: number, rowKey: string, fallback: number | undefined) => {
    const key = getHourInputKey(weekNumber, rowKey);
    if (Object.prototype.hasOwnProperty.call(hourInputDrafts, key)) {
      return hourInputDrafts[key];
    }
    return String(fallback ?? 0);
  };

  const handleHourInputFocus = (weekNumber: number, rowKey: string, current: number | undefined) => {
    if ((current ?? 0) !== 0) return;
    const key = getHourInputKey(weekNumber, rowKey);
    setHourInputDrafts((prev) => ({ ...prev, [key]: "" }));
  };

  const handleHourInputChange = (weekNumber: number, rowKey: string, rawValue: string) => {
    const key = getHourInputKey(weekNumber, rowKey);
    setHourInputDrafts((prev) => ({ ...prev, [key]: rawValue }));
    updateRowHours(weekNumber, rowKey, rawValue.trim() === "" ? "0" : rawValue);
  };

  const handleHourInputBlur = (weekNumber: number, rowKey: string) => {
    const key = getHourInputKey(weekNumber, rowKey);
    const rawValue = hourInputDrafts[key];
    if (typeof rawValue === "string" && rawValue.trim() === "") {
      updateRowHours(weekNumber, rowKey, "0");
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

  const sortedWeeksForNav = useMemo(
    () =>
      [...weeksForUi].sort((a, b) => {
        const aTime = a.weekStartIso ? new Date(`${a.weekStartIso}T00:00:00`).getTime() : 0;
        const bTime = b.weekStartIso ? new Date(`${b.weekStartIso}T00:00:00`).getTime() : 0;
        return aTime - bTime;
      }),
    [weeksForUi]
  );

  const currentNavIndex = sortedWeeksForNav.findIndex(
    (w) => getWeekAndYear(w).weekNumber === activeWeekNumber
  );
  const isFirstWeek = currentNavIndex === 0;
  const isLastWeek = currentNavIndex === sortedWeeksForNav.length - 1;

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

  function buildRowsFromWeekData(weekData: WeekTimesheetDay[]): WeeklyRow[] {
    return weekData
      .filter((d) => typeof d.week_date === "string" && d.week_date.trim().length > 0)
      .map((day) => {
        const isoDate = day.week_date;
        const parsed = parseIsoDate(isoDate);
        const weekday = Number.isNaN(parsed.getTime())
          ? ""
          : parsed.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
        const total = Number.isFinite(day.total_working_hours) ? day.total_working_hours : 0;
        return {
          isoDate,
          date: formatIsoDateForDisplay(isoDate),
          day: weekday,
          total,
        };
      });
  }

  function hydrateWeekRowsFromData(weekNumber: number, weekData: WeekTimesheetDay[]) {
    setWeekRowsByNumber((prev) => {
      const base = prev[weekNumber] ?? [];
      if (base.length === 0) return prev;
      const next = base.map((row) => {
        const iso = row.isoDate ?? "";
        const match = weekData.find((d) => d.week_date === iso);
        if (!match) return row;
        const total = toFiniteNonNegative(match.total_working_hours);
        return { ...row, total };
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
      setWeekRowsByNumber((prev) => {
        const currentRows = prev[weekNumber];
        if (Array.isArray(currentRows) && currentRows.length > 0) return prev;
        const rows = buildRowsFromWeekData(existingWeekData);
        if (rows.length === 0) return prev;
        return { ...prev, [weekNumber]: rows };
      });
      hydrateWeekRowsFromData(weekNumber, existingWeekData);
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
        setWeekDataByNumber((prev) => ({ ...prev, [weekNumber]: response.week_data }));
        setWeekRowsByNumber((prev) => {
          const currentRows = prev[weekNumber];
          if (Array.isArray(currentRows) && currentRows.length > 0) return prev;
          const rows = buildRowsFromWeekData(response.week_data);
          if (rows.length === 0) return prev;
          return { ...prev, [weekNumber]: rows };
        });
        hydrateWeekRowsFromData(weekNumber, response.week_data);
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
      const total = Number(row.total ?? 0);
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
            <div className="mt-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Actual Hours</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {workorderWeeks.reduce((acc, w) => acc + (w.total || 0), 0)}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-400">Regular &amp; overtime breakdown is calculated by the backend based on your work order settings.</p>
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
                    onClick={() => navigateWeek(-1)}
                    disabled={isFirstWeek}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous week"
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
                    onClick={() => navigateWeek(1)}
                    disabled={isLastWeek}
                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next week"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigateWeek(-1)}
                    disabled={isFirstWeek}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous Week
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateWeek(1)}
                    disabled={isLastWeek}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next Week
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
                              onClick={() =>
                                setSubmitConfirm({
                                  action: submitActionStatus,
                                  label: submitActionLabel,
                                  weekRange: week.range,
                                })
                              }
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
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                          Actual Hours: {rows.length > 0 ? computedTotal : week.total}
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
                                <th className="px-6 py-3 text-left">Day</th>
                                <th className="px-6 py-3 text-left">Actual Hours</th>
                                <th className="px-6 py-3 text-left">Remarks</th>
                                <th className="px-6 py-3 text-left">Leave</th>
                                <th className="px-6 py-3 text-left">Status</th>
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
                                      <input
                                        type="number"
                                        min={0}
                                        step="0.5"
                                        value={getHourInputValue(weekNumber, rowKey, row.total)}
                                        disabled={!weekEditable || leaveActive}
                                        onFocus={() => handleHourInputFocus(weekNumber, rowKey, row.total)}
                                        onChange={(event) => handleHourInputChange(weekNumber, rowKey, event.target.value)}
                                        onBlur={() => handleHourInputBlur(weekNumber, rowKey)}
                                        className="h-11 w-20 rounded-xl border border-slate-200 bg-slate-50 px-2 text-center text-base font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <textarea
                                        rows={2}
                                        value={dayRemarks[rowKey] ?? ""}
                                        disabled={!weekEditable}
                                        onChange={(e) => {
                                          setHasUnsavedChanges(true);
                                          setDayRemarks((prev) => ({ ...prev, [rowKey]: e.target.value }));
                                        }}
                                        placeholder="Add a remark…"
                                        className="w-full min-w-[180px] resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
                                      />
                                    </td>
                                    <td className="px-6 py-4">
                                      <button
                                        type="button"
                                        onClick={() => toggleLeave(weekNumber, rowKey)}
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
                                        {leaveActive ? (
                                          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                            Leave Recorded
                                          </span>
                                        ) : (
                                          <span className="text-sm text-slate-500">
                                            {(row.total ?? 0) > 0 ? `${row.total} hrs logged` : "—"}
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
                              <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actual Hours</p>
                                <input
                                  type="number"
                                  min={0}
                                  step="0.5"
                                  value={getHourInputValue(weekNumber, rowKey, row.total)}
                                  disabled={!weekEditable || leaveActive}
                                  onFocus={() => handleHourInputFocus(weekNumber, rowKey, row.total)}
                                  onChange={(event) => handleHourInputChange(weekNumber, rowKey, event.target.value)}
                                  onBlur={() => handleHourInputBlur(weekNumber, rowKey)}
                                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-2 text-center text-base font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                                />
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
                                <textarea
                                  rows={2}
                                  value={dayRemarks[rowKey] ?? ""}
                                  disabled={!weekEditable}
                                  onChange={(e) => {
                                    setHasUnsavedChanges(true);
                                    setDayRemarks((prev) => ({ ...prev, [rowKey]: e.target.value }));
                                  }}
                                  placeholder="Add a remark…"
                                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-70"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleLeave(weekNumber, rowKey)}
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

  const submitSuccessModal = (
    <SubmitSuccessModal
      open={!!submitSuccess}
      actionLabel={submitSuccess?.label ?? "Submitted"}
      weekRange={submitSuccess?.weekRange ?? ""}
      onClose={() => setSubmitSuccess(null)}
    />
  );

  const submitConfirmModal = (
    <SubmitConfirmModal
      open={!!submitConfirm}
      submitBusy={submitBusy}
      actionLabel={submitConfirm?.label ?? "Submit"}
      weekRange={submitConfirm?.weekRange ?? ""}
      onConfirm={() => {
        if (!submitConfirm) return;
        const { action, label, weekRange } = submitConfirm;
        void saveTimesheet(action).then((ok) => {
          setSubmitConfirm(null);
          if (ok) setSubmitSuccess({ label, weekRange });
        });
      }}
      onCancel={() => setSubmitConfirm(null)}
    />
  );

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
        {submitConfirmModal}
        {submitSuccessModal}
        {unsavedChangesModal}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppNavbar />
      {timesheetMain}
      {timesheetModal}
      {submitConfirmModal}
      {unsavedChangesModal}
    </div>
  );
}
