import { getJsonOrEmpty, isRecord, throwHttpIfNeeded, unwrapMessage } from "./common";

export type ProfileProject = {
  project: string;
  rr: string;
  rr_candidate: string;
};

export type GetProjectsForProfileResponse = {
  profile: string;
  projects: ProfileProject[];
  count: number;
};

function normalizeProjects(raw: unknown): ProfileProject[] {
  if (!Array.isArray(raw)) return [];
  const out: ProfileProject[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    out.push({
      project: typeof item.project === "string" ? item.project : "",
      rr: typeof item.rr === "string" ? item.rr : "",
      rr_candidate: typeof item.rr_candidate === "string" ? item.rr_candidate : "",
    });
  }
  return out;
}

export async function getProjectsForProfile(
  profileId: string
): Promise<GetProjectsForProfileResponse> {
  const url = new URL("/api/method/get_projects_for_profile", window.location.origin);
  url.searchParams.set("profile", profileId.trim());

  const res = await fetch(url.toString(), { credentials: "same-origin" });
  const data = await getJsonOrEmpty(res);
  throwHttpIfNeeded(res, data);

  const root = unwrapMessage(data);
  const projects = normalizeProjects(root.projects);
  return {
    profile: typeof root.profile === "string" ? root.profile : profileId.trim(),
    projects,
    count: typeof root.count === "number" ? root.count : projects.length,
  };
}
