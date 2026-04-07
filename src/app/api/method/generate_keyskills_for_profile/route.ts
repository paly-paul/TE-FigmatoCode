import { NextResponse } from "next/server";

function splitSkillText(value: string) {
  return value
    .split(/,|\/|;|\||â€¢|\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pickString(obj: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function collectSkillStrings(value: unknown): string[] {
  if (typeof value === "string") return splitSkillText(value);

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSkillStrings(item));
  }

  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;

  const direct = pickString(
    record,
    "key_skills",
    "key_skill",
    "keySkill",
    "skill",
    "name",
    "label",
    "value"
  );

  return [
    ...(direct ? splitSkillText(direct) : []),
    ...[
      record.data,
      record.items,
      record.rows,
      record.results,
      record.message,
      record.skills,
      record.skill_set,
      record.key_skills,
      record.profile,
      record.profile_version,
      record.skills_table,
    ].flatMap((nested) => collectSkillStrings(nested)),
  ].filter((skill) => skill.length >= 2 && skill.length <= 50);
}

function dedupeSkills(skills: string[]) {
  return Array.from(new Set(skills.map((skill) => skill.trim()).filter(Boolean)));
}

function isNoNewKeySkillsResponse(data: Record<string, unknown>) {
  const message =
    data.message && typeof data.message === "object"
      ? (data.message as Record<string, unknown>)
      : null;
  const status =
    typeof message?.status === "string"
      ? message.status.toLowerCase()
      : typeof data.status === "string"
        ? data.status.toLowerCase()
        : "";
  const text =
    typeof message?.message === "string"
      ? message.message
      : typeof data.message === "string"
        ? data.message
        : "";

  return status === "failed" && /no new key skills/i.test(text);
}

async function fetchJson(url: string, headers: HeadersInit) {
  const response = await fetch(url, { method: "GET", headers });
  const text = await response.text();
  try {
    return {
      response,
      data: JSON.parse(text) as Record<string, unknown>,
    };
  } catch {
    return {
      response,
      data: { raw: text } as Record<string, unknown>,
    };
  }
}

export async function GET(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot fetch key skills." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const profileName = searchParams.get("profile_name")?.trim();
  if (!profileName) {
    return NextResponse.json({ error: "profile_name is required." }, { status: 400 });
  }


  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  const cookie = request.headers.get("cookie");
  if (cookie) headers.Cookie = cookie;

  const url = `${backendBase}/api/method/generate_keyskills_for_profile?profile_name=${encodeURIComponent(profileName)}`;
  const profileUrl = `${backendBase}/api/method/get_data?doctype=${encodeURIComponent("Profile")}&name=${encodeURIComponent(profileName)}`;
  const [{ response: upstream, data }, { response: profileResponse, data: profileData }] = await Promise.all([
    fetchJson(url, headers),
    fetchJson(profileUrl, headers),
  ]);

  const generatedSkills = isNoNewKeySkillsResponse(data) ? [] : dedupeSkills(collectSkillStrings(data));
  const existingSkills = profileResponse.ok ? dedupeSkills(collectSkillStrings(profileData)) : [];
  const mergedSkills = dedupeSkills([...generatedSkills, ...existingSkills]);

  const normalizedData =
    upstream.ok || isNoNewKeySkillsResponse(data)
      ? {
          message: {
            status: "Success",
            message: generatedSkills.length
              ? "Fetched existing and newly generated key skills."
              : existingSkills.length
                ? "Fetched existing key skills from backend profile."
                : "No key skills found.",
            data: mergedSkills,
            generated_count: generatedSkills.length,
            existing_count: existingSkills.length,
          },
          data: mergedSkills,
        }
      : data;
  const normalizedStatus = upstream.ok || isNoNewKeySkillsResponse(data) ? 200 : upstream.status;

  const res = NextResponse.json(normalizedData, { status: normalizedStatus });
  res.headers.set("x-upstream-url", url);
  res.headers.set("x-profile-upstream-url", profileUrl);
  return res;
}
