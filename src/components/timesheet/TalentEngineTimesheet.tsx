"use client";

import { ChevronDown, ArrowLeft, ArrowRight, Clock, Bandage } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AppNavbar from "../profile/AppNavbar";
import CandidateAppShell, { type TimesheetBottomTab } from "../mobile/CandidateAppShell";
import { useIs768AndBelow } from "@/lib/useResponsive";
import CommentModal from "../ui/CommentModal";
import { getCandidateId, setCandidateId } from "@/lib/authSession";
import { createEditCandidateTimesheet } from "@/services/timesheet/candidateTimesheet";
import { getProjectsForProfile } from "@/services/timesheet/profileProjects";
import { getTimesheetForProject } from "@/services/timesheet/projectTimesheet";
import { getDaysOfWeek } from "@/services/timesheet/weekCalendar";
import { getTimesheetByWeek } from "@/services/timesheet/weekTimesheet";
import { getTimesheetForWorkorder } from "@/services/timesheet/workorderTimesheet";

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
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
}

export default function TalentEngineTimesheet() {
  const [workorderWeeks, setWorkorderWeeks] = useState<WeeklySheet[]>([]);
  const [activeWeekNumber, setActiveWeekNumber] = useState<number>(0);
  const [leaveSelections, setLeaveSelections] = useState<Record<string, boolean>>({});
  const [dayRemarks, setDayRemarks] = useState<Record<string, string>>({});
  const [weekRowsByNumber, setWeekRowsByNumber] = useState<Record<number, WeeklyRow[]>>({});
  const [weekLoadStatus, setWeekLoadStatus] = useState<string>("");
  const [profileId, setProfileId] = useState("");
  const [weekStatusByNumber, setWeekStatusByNumber] = useState<Record<number, string>>({});
  const [candidateId, setCandidateIdState] = useState("");
  const [rrName, setRrName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState<string>("");
  const [submitBusy, setSubmitBusy] = useState(false);

  const [commentModal, setCommentModal] = useState<{
    date: string;
    remarkKey: string;
    comment: string;
    triggerElement: HTMLElement | null;
  } | null>(null);
  const [mobileTimesheetTab, setMobileTimesheetTab] = useState<TimesheetBottomTab>("overview");

  const toggleLeave = (date: string) => {
    setLeaveSelections((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleCommentSubmit = (comment: string) => {
    const remarkKey = commentModal?.remarkKey;
    if (!remarkKey) return;
    setDayRemarks((prev) => ({ ...prev, [remarkKey]: comment.trim() }));
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rrFromQuery = params.get("rr_name")?.trim() || "";
    const projectFromQuery = params.get("project")?.trim() || "";
    const candidateFromQuery = params.get("candidate_id")?.trim() || "";
    if (rrFromQuery) setRrName(rrFromQuery);
    if (projectFromQuery) setProjectName(projectFromQuery);
    if (candidateFromQuery) {
      if (/^PR-/i.test(candidateFromQuery)) {
        setProfileId(candidateFromQuery);
      } else {
        setCandidateIdState(candidateFromQuery);
      }
      setCandidateId(candidateFromQuery);
      return;
    }

    const fromSession = getCandidateId()?.trim() || "";
    if (fromSession) {
      if (/^PR-/i.test(fromSession)) {
        setProfileId(fromSession);
      } else {
        setCandidateIdState(fromSession);
      }
    }
  }, []);

  const weeksForUi = useMemo(
    () => (workorderWeeks.length > 0 ? workorderWeeks : FALLBACK_WEEKS),
    [workorderWeeks]
  );

  const activeWeekData = useMemo(() => {
    if (!activeWeekNumber) return weeksForUi[0];
    return weeksForUi.find((w) => w.weekLabel === `Week ${activeWeekNumber}`) ?? weeksForUi[0];
  }, [activeWeekNumber, weeksForUi]);

  const activeWeekRows = useMemo(() => {
    const weekNumber = activeWeekNumber || getWeekAndYear(activeWeekData).weekNumber;
    return weekRowsByNumber[weekNumber] ?? activeWeekData.rows;
  }, [activeWeekData, activeWeekNumber, weekRowsByNumber]);

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
    const weekNumber = Number.parseInt(weekMatch?.[0] || "0", 10);
    const yearMatch = week.range.match(/\b(\d{4})\b/);
    const year = Number.parseInt(yearMatch?.[1] || "0", 10);
    return { weekNumber, year };
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

  useEffect(() => {
    const rrCandidate = candidateId.trim();
    const { year } = getWeekAndYear(activeWeekData);
    if (!rrCandidate || /^PR-/i.test(rrCandidate) || !year) return;

    let cancelled = false;
    void getTimesheetForWorkorder(rrCandidate, year)
      .then((response) => {
        if (cancelled) return;
        const nextWeeks: WeeklySheet[] = response.timesheets.map((ts) => ({
          range: formatRangeFromIso(ts.week_start_date, ts.week_end_date),
          weekLabel: `Week ${ts.week_number}`,
          regular: ts.total_work_hours,
          overtime: 0,
          total: ts.total_work_hours,
          current: false,
          rows: [],
        }));
        setWorkorderWeeks(nextWeeks);
        if (!activeWeekNumber && nextWeeks[0]) {
          const n = Number.parseInt(nextWeeks[0].weekLabel.replace(/\D+/g, ""), 10);
          if (Number.isFinite(n) && n > 0) setActiveWeekNumber(n);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setWorkorderWeeks([]);
      });

    return () => {
      cancelled = true;
    };
  }, [activeWeekData, activeWeekNumber, candidateId]);

  useEffect(() => {
    const { weekNumber, year } = getWeekAndYear(activeWeekData);
    if (!weekNumber || !year || weekRowsByNumber[weekNumber]) return;

    let cancelled = false;
    setWeekLoadStatus("");

    void getDaysOfWeek(weekNumber, year)
      .then((response) => {
        if (cancelled) return;
        const rows: WeeklyRow[] = response.days.map((isoDate) => {
          const parsed = new Date(`${isoDate}T00:00:00`);
          const day = Number.isNaN(parsed.getTime())
            ? ""
            : parsed.toLocaleDateString("en-US", { weekday: "long" });
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
  }, [activeWeekData, weekRowsByNumber]);

  useEffect(() => {
    if (!profileId.trim()) return;
    let cancelled = false;

    void getProjectsForProfile(profileId)
      .then((response) => {
        if (cancelled) return;
        const first = response.projects[0];
        if (!first) return;
        if (!projectName.trim()) setProjectName(first.project);
        if (!rrName.trim()) setRrName(first.rr);
        if (!candidateId.trim() || /^PR-/i.test(candidateId)) {
          setCandidateIdState(first.rr_candidate);
        }
      })
      .catch(() => {
        // Leave manual entry as fallback.
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId, profileId, projectName, rrName]);

  useEffect(() => {
    const rrCandidate = candidateId.trim();
    const { year } = getWeekAndYear(activeWeekData);
    if (!rrCandidate || /^PR-/i.test(rrCandidate) || !year) return;

    let cancelled = false;
    void getTimesheetForWorkorder(rrCandidate, year)
      .then((response) => {
        if (cancelled) return;
        const map: Record<number, string> = {};
        for (const item of response.timesheets) {
          map[item.week_number] = item.consolidation_status;
        }
        setWeekStatusByNumber(map);
      })
      .catch(() => {
        if (cancelled) return;
        setWeekStatusByNumber({});
      });

    return () => {
      cancelled = true;
    };
  }, [activeWeekData, candidateId]);

  useEffect(() => {
    const rrCandidate = candidateId.trim();
    const { weekNumber, year } = getWeekAndYear(activeWeekData);
    if (!rrCandidate || /^PR-/i.test(rrCandidate) || !weekNumber || !year) return;
    if (activeWeekRows.length === 0) return;

    let cancelled = false;
    void getTimesheetByWeek({
      rr_candidate_id: rrCandidate,
      week: weekNumber,
      year,
    })
      .then((response) => {
        if (cancelled) return;
        setWeekRowsByNumber((prev) => {
          const base = prev[weekNumber] ?? activeWeekRows;
          const next = base.map((row) => {
            const iso = row.isoDate ?? "";
            const match = response.week_data.find((d) => d.week_date === iso);
            if (!match) return row;
            return {
              ...row,
              total: match.total_working_hours,
              regular: match.total_working_hours,
              overtime: 0,
            };
          });
          return { ...prev, [weekNumber]: next };
        });
        const remarkPatch: Record<string, string> = {};
        for (const day of response.week_data) {
          if (!day.week_date || !day.remarks?.trim()) continue;
          remarkPatch[day.week_date] = day.remarks;
        }
        if (Object.keys(remarkPatch).length > 0) {
          setDayRemarks((prev) => ({ ...remarkPatch, ...prev }));
        }
      })
      .catch(() => {
        // Leave remarks user-entered/manual when no existing week data.
      });

    return () => {
      cancelled = true;
    };
  }, [activeWeekData, activeWeekRows, candidateId]);

  async function saveTimesheet(status: "open" | "submit" | "re_submit") {
    const candidate = candidateId.trim();
    const rr = rrName.trim();
    const project = projectName.trim();
    if (!candidate || !rr || !project) {
      setSubmissionStatus("Candidate ID, RR Name and Project are required.");
      return;
    }

    const { weekNumber, year } = getWeekAndYear(activeWeekData);
    if (!weekNumber || !year) {
      setSubmissionStatus("Unable to determine week number/year from selected week.");
      return;
    }

    const weekStatus = (weekStatusByNumber[weekNumber] || "").toLowerCase();
    if (weekStatus.includes("approved")) {
      setSubmissionStatus("Cannot edit. Status is Approved.");
      return;
    }
    if (status === "re_submit" && weekStatus && !weekStatus.includes("reject")) {
      setSubmissionStatus("Re-submit is allowed only after rejection.");
      return;
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
      return;
    }

    setSubmitBusy(true);
    setSubmissionStatus("");
    try {
      const response = await createEditCandidateTimesheet({
        candidate_id: candidate,
        rr_name: rr,
        project,
        week_number: weekNumber,
        year,
        status,
        timesheet_data: timesheetData,
      });
      setSubmissionStatus(
        `Saved successfully. Created: ${response.created ?? 0}, Updated: ${response.updated ?? 0}`
      );
    } catch (error) {
      setSubmissionStatus(error instanceof Error ? error.message : "Failed to save timesheet.");
    } finally {
      setSubmitBusy(false);
    }
  }

  const isCompact = useIs768AndBelow();
  const compactTimesheetView = isCompact && mobileTimesheetTab === "timesheet";

  const activeWeekRange =
    activeWeekData.range;
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
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">6/28 days</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: "65%" }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Last Month</span>
                  <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-600">26/31 days</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: "85%" }} />
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
                  {workorderWeeks.reduce((acc, w) => acc + (w.total || 0), 0)} hrs
                </span>
              </div>
              <hr />
              <div className="flex justify-between py-1">
                <span className="text-sm font-semibold text-purple-700">Last Month:</span>
                <span className="rounded-full bg-purple-50 px-4 py-1 text-sm font-semibold text-purple-700">140 hrs</span>
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
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous Month
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
                  >
                    Next Month
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 md:grid-cols-3">
            <input
              type="text"
              value={candidateId}
              onChange={(event) => setCandidateIdState(event.target.value)}
              placeholder="RR Candidate ID (example: RRC-00001)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={rrName}
              onChange={(event) => setRrName(event.target.value)}
              placeholder="RR Name (e.g. RR-25-00125)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="text"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              placeholder="Project (e.g. PRJ-Ashok Leyland-000005)"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="md:col-span-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={submitBusy}
                onClick={() => void saveTimesheet("open")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={submitBusy}
                onClick={() => void saveTimesheet("submit")}
                className="rounded-xl bg-[#033CE5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit
              </button>
              <button
                type="button"
                disabled={submitBusy}
                onClick={() => void saveTimesheet("re_submit")}
                className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Re-submit
              </button>
              {submissionStatus ? (
                <p className="self-center text-sm text-slate-600">{submissionStatus}</p>
              ) : null}
              {weekLoadStatus ? (
                <p className="self-center text-sm text-amber-700">{weekLoadStatus}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            {weeksForUi.map((week) => {
              const { weekNumber } = getWeekAndYear(week);
              const activeWeekNo = activeWeekNumber || getWeekAndYear(activeWeekData).weekNumber;
              const isActive = weekNumber === activeWeekNo;
              const rows = isActive ? activeWeekRows : week.rows;
              const consolidationStatus = weekStatusByNumber[weekNumber];

              return (
                <div
                  key={week.range}
                  className={`rounded-2xl border px-5 py-4 transition ${isActive ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50/70"}`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveWeekNumber(weekNumber)}
                    className={`flex w-full items-center justify-between ${isCompact ? "gap-2" : ""}`}
                  >
                    <div className="min-w-0 text-left">
                      <p
                        className={`font-semibold text-slate-900 ${isCompact ? "text-sm leading-snug" : "text-lg"}`}
                      >
                        {week.range}
                      </p>
                      <p className={`text-slate-500 ${isCompact ? "text-xs" : "text-sm"}`}>
                        {week.weekLabel}
                      </p>
                      {consolidationStatus ? (
                        <p className={`mt-1 text-xs font-semibold ${isCompact ? "" : "text-sm"} text-blue-700`}>
                          Status: {consolidationStatus}
                        </p>
                      ) : null}
                    </div>
                    <div
                      className={`flex flex-wrap items-center gap-2 ${isCompact ? "ml-auto max-w-[62%] justify-end text-right" : ""}`}
                    >
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-700">
                        Regular Hours: {week.regular}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-700">
                        Overtime Hours: {week.overtime}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-semibold text-slate-800">
                        Total Hours: {week.total}
                      </span>
                      <ChevronDown className={`h-5 w-5 transition ${isActive ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
                    </div>
                  </button>

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
                                        <span className="inline-flex h-11 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-base font-semibold text-slate-900">
                                          {row.regular ?? "-"}
                                        </span>
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
                                        <span className="inline-flex h-11 w-20 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-base font-semibold text-slate-900">
                                          {row.overtime ?? "-"}
                                        </span>
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
                                    <span className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-900">
                                      {row.regular ?? "-"}
                                    </span>
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
                                    <span className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-base font-semibold text-slate-900">
                                      {row.overtime ?? "-"}
                                    </span>
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
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppNavbar />
      {timesheetMain}
      {timesheetModal}
    </div>
  );
}
