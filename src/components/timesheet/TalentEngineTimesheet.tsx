"use client";

import { ChevronDown, ArrowLeft, ArrowRight, Clock, CalendarDays, Bandage } from "lucide-react";
import { useState } from "react";
import AppNavbar from "../profile/AppNavbar";
import CommentModal from "../ui/CommentModal";

type WeeklyRow = {
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

const WEEKLY_TIMESHEETS: WeeklySheet[] = [
  {
    range: "Feb 01 - Feb 07, 2026",
    weekLabel: "Week 5",
    regular: 32,
    overtime: 8,
    total: 40,
    current: true,
    rows: [
      { date: "February 01, 2026", day: "Sunday", regular: 4, overtime: 4, leave: "Sick Leave", total: 8 },
      { date: "February 02, 2026", day: "Monday", regular: 8, overtime: 0, leave: "Sick Leave", total: 8 },
      { date: "February 03, 2026", day: "Tuesday", regular: 8, overtime: 2, leave: "Sick Leave", total: 10 },
      { date: "February 04, 2026", day: "Wednesday", regular: 8, overtime: 0, leave: "Sick Leave", total: 8 },
      { date: "February 05, 2026", day: "Thursday", regular: 7, overtime: 0, leave: "Sick Leave", total: 7 },
      { date: "February 06, 2026", day: "Friday", regular: 8, overtime: 0, leave: "Sick Leave", total: 8 },
      { date: "February 07, 2026", day: "Saturday", regular: 0, overtime: 8, leave: "Sick Leave", total: 8 },
    ],
  },
  {
    range: "Feb 08 - Feb 15, 2026",
    weekLabel: "Week 6",
    regular: 0,
    overtime: 0,
    total: 0,
    rows: [],
  },
  {
    range: "Feb 16 - Feb 23, 2026",
    weekLabel: "Week 7",
    regular: 0,
    overtime: 0,
    total: 0,
    rows: [],
  },
  {
    range: "Feb 24 - Feb 28, 2026",
    weekLabel: "Week 8",
    regular: 0,
    overtime: 0,
    total: 0,
    rows: [],
  },
];

export default function TalentEngineTimesheet() {
  const [activeWeek, setActiveWeek] = useState<string>(() => WEEKLY_TIMESHEETS.find((week) => week.current)?.range ?? WEEKLY_TIMESHEETS[0].range);
  const [leaveSelections, setLeaveSelections] = useState<Record<string, boolean>>({});

  const [commentModal, setCommentModal] = useState<{ date: string; comment: string; triggerElement: HTMLElement | null } | null>(null);

  const toggleLeave = (date: string) => {
    setLeaveSelections((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const handleCommentSubmit = (comment: string) => {
    console.log('Comment submitted:', {
      date: commentModal?.date,
      comment: comment
    });

    // API call
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppNavbar />
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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

        <section className="grid gap-5 md:grid-cols-3">
          <div className="border border-slate-200 bg-white p-5 shadow-sm">
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
                  <p className="text-2xl font-semibold text-slate-900">320</p>
                </div>
              </div>

              <hr />

              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Overtime Hours</p>
                  <p className="text-2xl font-semibold text-slate-900">24</p>
                </div>
              </div>
            </div>
          </div>


          <div className="border border-slate-200 bg-white p-5 shadow-sm">
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

          <div className="border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-m font-semibold">
              <span>Hours Worked - Monthly</span>
            </div>
            <p className="text-sm text-slate-500">Total Hours Worked: This Month vs Last Month</p>
            <hr className="mt-5" />
            <div className="mt-5 flex flex-col flex-wrap gap-3">
              <div className="flex justify-between py-1">
                <span className="text-sm font-semibold text-emerald-700">This Month:</span>
                <span className="rounded-full bg-emerald-50 px-4 py-1 text-sm text-emerald-700 font-semibold">64 hrs</span>
              </div>
              <hr />
              <div className="flex justify-between py-1">
                <span className="text-sm font-semibold text-purple-700">Last Month:</span>
                <span className="rounded-full bg-purple-50 px-4 py-1 text-sm font-semibold text-purple-700">140 hrs</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-lg font-semibold text-slate-900">Weekly Time-Sheet</p>
              <p className="text-sm text-slate-500">Enter your time in hours for the project</p>
            </div>
            <div className="flex items-center gap-3">
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
            </div>
          </header>

          <div className="space-y-3">
            {WEEKLY_TIMESHEETS.map((week) => {
              const isActive = week.range === activeWeek;

              return (
                <div
                  key={week.range}
                  className={`rounded-2xl border px-5 py-4 transition ${isActive ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50/70"}`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveWeek(week.range)}
                    className="flex w-full items-center justify-between"
                  >
                    <div className="text-left">
                      <p className="text-lg font-semibold text-slate-900">{week.range}</p>
                      <p className="text-sm text-slate-500">{week.weekLabel}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">Regular Hours: {week.regular}</span>
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">Overtime Hours: {week.overtime}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">Total Hours: {week.total}</span>
                      <ChevronDown className={`h-5 w-5 transition ${isActive ? "rotate-180 text-blue-600" : "text-slate-400"}`} />
                    </div>
                  </button>

                  {isActive && week.rows.length > 0 && (
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
                              {week.rows.map((row) => {
                                const leaveActive = !!leaveSelections[row.date];
                                return (
                                  <tr key={row.date} className={`transition-colors ${leaveActive ? "bg-amber-50/70" : "hover:bg-slate-50"}`}>
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
                                              comment: "",
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
                                              comment: "",
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
                                        onClick={() => toggleLeave(row.date)}
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
                        {week.rows.map((row) => {
                          const leaveActive = !!leaveSelections[row.date];
                          return (
                            <div
                              key={row.date}
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
                                          comment: "",
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
                                          comment: "",
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
                                onClick={() => toggleLeave(row.date)}
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

      {/* Comment Modal */}
      {commentModal && (
        <CommentModal
          date={commentModal.date}
          initialComment={commentModal.comment}
          triggerElement={commentModal.triggerElement}
          onClose={() => setCommentModal(null)}
          onSubmit={handleCommentSubmit}
        />
      )}
    </div>
  );
}
