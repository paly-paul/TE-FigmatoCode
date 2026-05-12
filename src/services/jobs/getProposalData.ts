import { parseApiErrorMessage } from "@/services/signup/parseApiError";

export type ProposalTotals = {
  regular_hourly?: number;
  base_daily_salary?: number;
  overtime_hourly_weekdays?: number;
  overtime_hourly_weekends?: number;
  overtime_hourly_national_holidays?: number;
  stand_by?: number;
  total_te_daily_cost?: number;
  billing_currency?: string;
};

export type ProposalDataApi = {
  proposal_name?: string;
  proposal_version?: string;
  proposed_rate?: number;
  billing_currency?: string;
  billing_frequency?: string;
  proposed_joining_date?: string;
  start_date?: string;
  end_date?: string;
  country?: string;
  hours_per_day?: number;
  days_per_week?: number;
  rr_min_bill_rate?: number;
  rr_max_bill_rate?: number;
  rr_billing_currency?: string;
  rr_billing_frequency?: string;
  candidate_expected_salary?: number;
  rr_candidate_status?: string;
  customer_remarks?: string;
  candidate_remarks?: string | null;
  totals?: ProposalTotals;
  by_customer_terms?: string[];
  by_candidate_terms?: string[];
  not_applicable_terms?: string[];
  raw: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return isRecord(v) ? v : undefined;
}

function firstString(node: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = node[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function firstNumber(node: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const v = node[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number.parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return undefined;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean);
  return out.length ? out : undefined;
}

function unwrapRoot(payload: Record<string, unknown>): Record<string, unknown> {
  if (isRecord(payload.message)) return payload.message;
  if (isRecord(payload.data)) return payload.data;
  return payload;
}

function collectTermsByResponsibility(
  termsNode: Record<string, unknown> | undefined
): Pick<ProposalDataApi, "by_customer_terms" | "by_candidate_terms" | "not_applicable_terms"> {
  const byCustomer = new Set<string>();
  const byCandidate = new Set<string>();
  const notApplicable = new Set<string>();
  const groups = Array.isArray(termsNode?.terms) ? termsNode.terms : [];

  for (const group of groups) {
    if (!isRecord(group) || !Array.isArray(group.parameters)) continue;
    for (const param of group.parameters) {
      if (!isRecord(param)) continue;
      const label =
        firstString(param, ["candidate_display_content", "parameter", "component", "category"]) ||
        firstString(group, ["parameter_category", "category"]);
      if (!label) continue;
      const responsibility = firstString(param, ["responsibility", "default_option"])?.toLowerCase();
      if (responsibility === "candidate") {
        byCandidate.add(label);
      } else if (responsibility === "na") {
        notApplicable.add(label);
      } else if (responsibility === "client" || responsibility === "te") {
        byCustomer.add(label);
      }
    }
  }

  return {
    by_customer_terms: byCustomer.size > 0 ? Array.from(byCustomer) : undefined,
    by_candidate_terms: byCandidate.size > 0 ? Array.from(byCandidate) : undefined,
    not_applicable_terms: notApplicable.size > 0 ? Array.from(notApplicable) : undefined,
  };
}

function normalizeTotals(totalsNode: Record<string, unknown> | undefined): ProposalTotals | undefined {
  if (!totalsNode) return undefined;
  return {
    regular_hourly: firstNumber(totalsNode, ["regular_hourly"]),
    base_daily_salary: firstNumber(totalsNode, ["base_daily_salary"]),
    overtime_hourly_weekdays: firstNumber(totalsNode, ["overtime_hourly_weekdays"]),
    overtime_hourly_weekends: firstNumber(totalsNode, ["overtime_hourly_weekends"]),
    overtime_hourly_national_holidays: firstNumber(totalsNode, ["overtime_hourly_national_holidays"]),
    stand_by: firstNumber(totalsNode, ["stand_by"]),
    total_te_daily_cost: firstNumber(totalsNode, ["total_te_daily_cost"]),
    billing_currency: firstString(totalsNode, ["billing_currency", "currency"]),
  };
}

function normalizeProposal(payload: Record<string, unknown>): ProposalDataApi {
  const root = unwrapRoot(payload);
  const node = isRecord(root.data) ? root.data : root;
  const context = asRecord(node.context);
  const proposal = asRecord(context?.proposal);
  const termsPreview = asRecord(node.terms_preview);
  const proposalPreview = asRecord(node.proposal_preview);
  const totalsRaw = asRecord(proposalPreview?.totals);
  const normalizedTerms = collectTermsByResponsibility(termsPreview);
  const totals = normalizeTotals(totalsRaw);

  const proposed_joining_date = firstString(context ?? node, [
    "joining_date",
    "proposed_joining_date",
    "proposed_start_date",
    "start_date",
  ]);

  const billing_currency =
    firstString(context ?? node, ["billing_currency", "currency"]) ||
    firstString(totalsRaw ?? {}, ["billing_currency", "currency"]);
  const billing_frequency = firstString(context ?? node, ["billing_frequency", "frequency"]);

  const proposed_rate =
    firstNumber(totalsRaw ?? {}, ["regular_hourly", "base_daily_salary", "total_te_daily_cost"]) ??
    firstNumber(context ?? node, [
      "candidate_expected_salary",
      "base_salary",
      "rr_min_bill_rate",
      "rr_max_bill_rate",
    ]) ??
    firstNumber(node, ["proposed_rate", "rate", "bill_rate", "billing_rate", "amount"]);

  const proposal_name =
    firstString(proposal ?? {}, ["name", "proposal_name", "id"]) ||
    firstString(node, ["proposal_name", "proposal", "name", "id"]);
  const proposal_version =
    firstString(proposal ?? {}, ["version", "proposal_version", "proposal_ver"]) ||
    firstString(node, ["proposal_version", "version", "proposal_ver"]);

  const by_customer_terms =
    normalizedTerms.by_customer_terms ??
    asStringArray(node.by_customer_terms) ??
    asStringArray(node.customer_terms) ??
    asStringArray(node.by_customer);
  const by_candidate_terms =
    normalizedTerms.by_candidate_terms ??
    asStringArray(node.by_candidate_terms) ??
    asStringArray(node.candidate_terms) ??
    asStringArray(node.by_candidate);
  const not_applicable_terms =
    normalizedTerms.not_applicable_terms ??
    asStringArray(node.not_applicable_terms) ??
    asStringArray(node.not_applicable) ??
    asStringArray(node.na_terms);

  return {
    proposal_name,
    proposal_version,
    proposed_rate,
    billing_currency,
    billing_frequency,
    proposed_joining_date,
    start_date: firstString(context ?? node, ["start_date"]),
    end_date: firstString(context ?? node, ["end_date"]),
    country: firstString(context ?? node, ["country"]),
    hours_per_day: firstNumber(context ?? node, ["hours_per_day"]),
    days_per_week: firstNumber(context ?? node, ["days_per_week"]),
    rr_min_bill_rate: firstNumber(context ?? node, ["rr_min_bill_rate"]),
    rr_max_bill_rate: firstNumber(context ?? node, ["rr_max_bill_rate"]),
    rr_billing_currency: firstString(context ?? node, ["rr_billing_currency"]),
    rr_billing_frequency: firstString(context ?? node, ["rr_billing_frequency"]),
    candidate_expected_salary: firstNumber(context ?? node, ["candidate_expected_salary", "base_salary"]),
    rr_candidate_status: firstString(context ?? node, ["rr_candidate_status"]),
    customer_remarks: firstString(context ?? node, ["customer_remarks"]) ?? "",
    candidate_remarks: (context ?? node)?.candidate_remarks as string | null | undefined,
    totals,
    by_customer_terms,
    by_candidate_terms,
    not_applicable_terms,
    raw: payload,
  };
}

async function getJsonOrEmpty(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

type GetProposalDataParams = {
  rrCandidateId?: string;
  proposalName?: string;
};

export async function getProposalData({
  rrCandidateId,
  proposalName,
}: GetProposalDataParams): Promise<ProposalDataApi> {
  const candidate = rrCandidateId?.trim();
  const proposal = proposalName?.trim();
  if (!candidate && !proposal) {
    throw new Error("Either rrCandidateId or proposalName is required.");
  }

  const url = new URL("/api/method/get_proposal_data", window.location.origin);
  if (candidate) url.searchParams.set("rrcandidate", candidate);
  if (proposal) url.searchParams.set("proposal_name", proposal);

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
  return normalizeProposal(data);
}
