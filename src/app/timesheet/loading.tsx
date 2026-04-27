"use client";

export default function TimesheetLoading() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center justify-center px-4 py-12">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            <p className="text-sm font-semibold text-slate-700">Loading Timesheet…</p>
          </div>
          <div className="mt-6 space-y-3">
            <div className="h-4 w-2/3 rounded bg-slate-100" />
            <div className="h-4 w-1/2 rounded bg-slate-100" />
            <div className="h-24 w-full rounded-xl bg-slate-100" />
          </div>
        </div>
      </main>
    </div>
  );
}

