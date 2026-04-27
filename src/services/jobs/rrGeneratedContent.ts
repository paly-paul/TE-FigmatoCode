import { parseApiErrorMessage } from "@/services/signup/parseApiError";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type RrGeneratedContentApi = {
  rr_name: string;
  job_description_header: string;
  job_description: string;
  advertised_position_header: string;
  advertised_position: string;
};

type SalaryBlock = {
  currency?: unknown;
  amount?: unknown;
  frequency?: unknown;
};

type WorkScheduleBlock = {
  days_per_week?: unknown;
  hours_per_day?: unknown;
};

type DurationBlock = {
  days?: unknown;
  start_date?: unknown;
  end_date?: unknown;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function asCleanString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function formatSalary(salary: SalaryBlock | null | undefined): string {
  if (!salary || typeof salary !== "object") return "";
  const currency = asCleanString(salary.currency);
  const amount = asFiniteNumber(salary.amount);
  const frequency = asCleanString(salary.frequency);
  const amountText = amount != null ? amount.toLocaleString() : "";
  return [currency, amountText, frequency].filter(Boolean).join(" ").trim();
}

function formatWorkSchedule(schedule: WorkScheduleBlock | null | undefined): string {
  if (!schedule || typeof schedule !== "object") return "";
  const days = asFiniteNumber(schedule.days_per_week);
  const hours = asFiniteNumber(schedule.hours_per_day);
  const daysText = days != null ? `${days} days/week` : "";
  const hoursText = hours != null ? `${hours} hours/day` : "";
  return [daysText, hoursText].filter(Boolean).join(", ");
}

function formatDuration(duration: DurationBlock | null | undefined): string {
  if (!duration || typeof duration !== "object") return "";
  const days = asFiniteNumber(duration.days);
  const startDate = asCleanString(duration.start_date);
  const endDate = asCleanString(duration.end_date);
  const dayText = days != null ? `${days} day${days === 1 ? "" : "s"}` : "";
  const dateText =
    startDate && endDate ? `${startDate} - ${endDate}` : startDate || endDate || "";
  return [dayText, dateText].filter(Boolean).join(" | ");
}

function paragraph(text: string): string {
  return text ? `<p>${escapeHtml(text)}</p>` : "";
}

function heading(level: 1 | 2 | 3, text: string): string {
  return text ? `<h${level}>${escapeHtml(text)}</h${level}>` : "";
}

function bulletList(items: string[]): string {
  if (items.length === 0) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function specLine(label: string, value: string): string {
  if (!value) return "";
  return `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`;
}

function parseNestedGeneratedContent(root: Record<string, unknown>): RrGeneratedContentApi | null {
  const jobDescription = isRecord(root.job_description) ? root.job_description : null;
  const advertisedPosition = isRecord(root.advertised_position) ? root.advertised_position : null;
  if (!jobDescription && !advertisedPosition) return null;

  const jobHeader = isRecord(jobDescription?.header) ? jobDescription?.header : null;
  const jobContent = isRecord(jobDescription?.content) ? jobDescription?.content : null;
  const advertisedHeader = isRecord(advertisedPosition?.header) ? advertisedPosition?.header : null;
  const advertisedContent = isRecord(advertisedPosition?.content) ? advertisedPosition?.content : null;

  const jobTitle = asCleanString(jobHeader?.job_title);
  const jobLocation = asCleanString(jobHeader?.location);
  const jobSalary = formatSalary(jobHeader?.salary as SalaryBlock | undefined);
  const jobSchedule = formatWorkSchedule(jobHeader?.work_schedule as WorkScheduleBlock | undefined);
  const jobDuration = formatDuration(jobHeader?.duration as DurationBlock | undefined);

  const jobOverview = asCleanString(jobContent?.overview);
  const responsibilities =
    Array.isArray(jobContent?.key_responsibilities)
      ? jobContent.key_responsibilities
          .map((item) => asCleanString(item))
          .filter(Boolean)
      : [];

  const requirements = isRecord(jobContent?.requirements) ? jobContent.requirements : null;
  const qualification = asCleanString(requirements?.qualification);
  const languageRequirement = isRecord(requirements?.language_requirement)
    ? requirements.language_requirement
    : null;
  const language = asCleanString(languageRequirement?.language);
  const proficiency = asCleanString(languageRequirement?.proficiency);

  const skillEntries = Array.isArray(requirements?.skills_experience)
    ? requirements.skills_experience.filter(isRecord)
    : [];
  const toolEntries = Array.isArray(requirements?.tools_familiarity)
    ? requirements.tools_familiarity.filter(isRecord)
    : [];

  const compensation = isRecord(jobContent?.compensation_benefits)
    ? jobContent.compensation_benefits
    : null;
  const compensationSalary = formatSalary({
    currency: compensation?.currency,
    amount: compensation?.billing_rate,
    frequency: compensation?.frequency,
  });
  const compensationSchedule = asCleanString(compensation?.schedule);

  const advertisedTitle = asCleanString(advertisedHeader?.title);
  const advertisedLocation = asCleanString(advertisedHeader?.location);
  const advertisedSalary = formatSalary(advertisedHeader?.salary as SalaryBlock | undefined);
  const advertisedHeadline = asCleanString(advertisedContent?.headline);
  const advertisedResponsibilities = Array.isArray(advertisedContent?.responsibilities)
    ? advertisedContent.responsibilities.map((item) => asCleanString(item)).filter(Boolean)
    : [];
  const advertisedRequirements = Array.isArray(advertisedContent?.requirements)
    ? advertisedContent.requirements.map((item) => asCleanString(item)).filter(Boolean)
    : [];

  const jobDescriptionHeader = [
    heading(3, jobTitle),
    specLine("Location", jobLocation),
    specLine("Salary", jobSalary),
    specLine("Schedule", jobSchedule),
    specLine("Duration", jobDuration),
  ]
    .filter(Boolean)
    .join("");

  const jobDescriptionBody = [
    heading(2, "Overview"),
    paragraph(jobOverview),
    heading(2, "Key Responsibilities"),
    bulletList(responsibilities),
    heading(2, "Requirements"),
    specLine("Qualification", qualification),
    language
      ? specLine(
          "Language Requirement",
          [language, proficiency ? `(${proficiency})` : ""].filter(Boolean).join(" ")
        )
      : "",
    skillEntries.length > 0
      ? bulletList(
          skillEntries
            .map((row) => {
              const skill = asCleanString(row.skill);
              const experience = asCleanString(row.experience);
              const type = asCleanString(row.type);
              if (!skill) return "";
              return [skill, experience ? `(${experience})` : "", type ? `- ${type}` : ""]
                .filter(Boolean)
                .join(" ");
            })
            .filter(Boolean)
        )
      : "",
    toolEntries.length > 0
      ? [
          heading(3, "Tools Familiarity"),
          bulletList(
            toolEntries
              .map((row) => {
                const tool = asCleanString(row.tool);
                const experience = asCleanString(row.experience);
                const type = asCleanString(row.type);
                if (!tool) return "";
                return [tool, experience ? `(${experience})` : "", type ? `- ${type}` : ""]
                  .filter(Boolean)
                  .join(" ");
              })
              .filter(Boolean)
          ),
        ].join("")
      : "",
    compensationSalary || compensationSchedule
      ? [
          heading(2, "Compensation & Benefits"),
          specLine("Billing Rate", compensationSalary),
          specLine("Schedule", compensationSchedule),
        ].join("")
      : "",
  ]
    .filter(Boolean)
    .join("");

  const advertisedHeaderHtml = [
    heading(3, advertisedTitle),
    specLine("Location", advertisedLocation),
    specLine("Salary", advertisedSalary),
  ]
    .filter(Boolean)
    .join("");

  const advertisedBodyHtml = [
    heading(2, advertisedHeadline),
    heading(3, "Responsibilities"),
    bulletList(advertisedResponsibilities),
    heading(3, "Requirements"),
    bulletList(advertisedRequirements),
  ]
    .filter(Boolean)
    .join("");

  return {
    rr_name: asCleanString(root.rr_name),
    job_description_header: jobDescriptionHeader,
    job_description: jobDescriptionBody,
    advertised_position_header: advertisedHeaderHtml,
    advertised_position: advertisedBodyHtml,
  };
}

function parseRrGeneratedContent(payload: Record<string, unknown>): RrGeneratedContentApi {
  const root = isRecord(payload.message) ? payload.message : payload;
  const nested = parseNestedGeneratedContent(root);
  if (nested) return nested;

  return {
    rr_name: typeof root.rr_name === "string" ? root.rr_name : "",
    job_description_header:
      typeof root.job_description_header === "string" ? root.job_description_header : "",
    job_description: typeof root.job_description === "string" ? root.job_description : "",
    advertised_position_header:
      typeof root.advertised_position_header === "string"
        ? root.advertised_position_header
        : "",
    advertised_position:
      typeof root.advertised_position === "string" ? root.advertised_position : "",
  };
}

export async function getRrGeneratedContent(
  rrName: string
): Promise<RrGeneratedContentApi> {
  const url = new URL("/api/method/get_rr_generated_content", window.location.origin);
  const res = await fetch(url.toString(), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rr_name: rrName.trim() }),
  });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  const root = isRecord(data.message) ? data.message : data;
  if (
    typeof root.status === "string" &&
    root.status.toLowerCase() === "error"
  ) {
    throw new Error(
      (typeof root.message === "string" && root.message) || "Could not load job description."
    );
  }
  return parseRrGeneratedContent(data);
}
