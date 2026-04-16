import { parseApiErrorMessage } from "@/services/signup/parseApiError";

export type ProposalDataApi = {
  /** Proposal document id/name, if provided by backend. */
  proposal_name?: string;
  /** Version label (e.g. "V.1"), if provided. */
  proposal_version?: string;
  /** Proposed pay rate, if provided. */
  proposed_rate?: number;
  billing_currency?: string;
  billing_frequency?: string;
  proposed_joining_date?: string;
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

function normalizeProposal(payload: Record<string, unknown>): ProposalDataApi {
  const root = unwrapRoot(payload);
  const node = isRecord(root.data) ? root.data : root;
  const context = asRecord(node.context);
  const proposal = asRecord(context?.proposal);
  const termsPreview = asRecord(node.terms_preview);
  const proposalPreview = asRecord(node.proposal_preview);
  const totals = asRecord(proposalPreview?.totals);
  const normalizedTerms = collectTermsByResponsibility(termsPreview);

  const proposed_joining_date = firstString(context ?? node, [
    "proposed_joining_date",
    "joining_date",
    "proposed_start_date",
    "start_date",
  ]);

  const billing_currency =
    firstString(context ?? node, ["billing_currency", "currency"]) ||
    firstString(totals ?? {}, ["billing_currency", "currency"]);
  const billing_frequency = firstString(context ?? node, ["billing_frequency", "frequency"]);
  const proposed_rate =
    firstNumber(totals ?? {}, [
      "regular_hourly",
      "base_daily_salary",
      "total_te_daily_cost",
    ]) ??
    firstNumber(context ?? node, [
      "candidate_expected_salary",
      "base_salary",
      "rr_min_bill_rate",
      "rr_max_bill_rate",
    ]) ??
    firstNumber(node, [
    "proposed_rate",
    "rate",
    "bill_rate",
    "billing_rate",
    "amount",
  ]);

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

export async function getProposalData(rrCandidateId: string): Promise<ProposalDataApi> {
  const url = new URL("/api/method/get_proposal_data", window.location.origin);
  url.searchParams.set("rrcandidate", rrCandidateId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }
  return normalizeProposal(data);
}

