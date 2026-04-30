import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type TimesheetStatus = "open" | "submit" | "re_submit";

type TimesheetEntryInput = {
  date: string;
  total_working_hours: number;
  remarks: string;
};

export type CreateEditCandidateTimesheetInput = {
  candidate_id: string;
  rr_candidate_id?: string;
  rr_name: string;
  project: string;
  week_number: number;
  year: number;
  status: TimesheetStatus;
  timesheet_data: TimesheetEntryInput[];
};

export type CreateEditCandidateTimesheetResponse = {
  status?: string;
  created?: number;
  updated?: number;
  message?: string;
};

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function createEditCandidateTimesheet(
  input: CreateEditCandidateTimesheetInput
): Promise<CreateEditCandidateTimesheetResponse> {
  const url = new URL("/api/method/create_edit_candidate_timesheet", window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  // Frappe business errors can still come with HTTP 200 under `message`.
  const wrapped = data.message;
  if (wrapped && typeof wrapped === "object") {
    const inner = wrapped as Record<string, unknown>;
    if (inner.status === "error") {
      const msg =
        typeof inner.message === "string" && inner.message.trim()
          ? inner.message
          : parseApiErrorMessage(data);
      throw new Error(msg || "Timesheet save failed.");
    }
    return inner as CreateEditCandidateTimesheetResponse;
  }

  return data as CreateEditCandidateTimesheetResponse;
}
