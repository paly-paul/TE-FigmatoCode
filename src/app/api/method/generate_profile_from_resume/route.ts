import { NextResponse } from "next/server";
import { parseApiErrorMessage } from "@/services/signup/parseApiError";
import { parseResumeFile } from "@/lib/resumeParsing";

type JsonRecord = Record<string, unknown>;

function getCookieValue(cookieHeader: string | null, key: string) {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${key}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]).trim() : "";
}

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  let data: JsonRecord = {};
  try {
    data = JSON.parse(text) as JsonRecord;
  } catch {
    data = { raw: text };
  }
  return data;
}

async function tryResolveBackendProfileName(backendBase: string, headers: HeadersInit, email: string) {
  const lookupUrl = `${backendBase}/api/method/get_profile_by_email?email=${encodeURIComponent(email)}`;
  try {
    const res = await fetch(lookupUrl, { method: "GET", headers });
    const data = await parseJsonResponse(res);
    if (!res.ok) return { profileName: undefined as string | undefined, detail: { status: res.status, data } };
    const root =
      data.data && typeof data.data === "object"
        ? (data.data as JsonRecord)
        : data.message && typeof data.message === "object"
          ? (data.message as JsonRecord)
          : data;
    const profile =
      root.profile && typeof root.profile === "object" ? (root.profile as JsonRecord) : {};
    const name = profile.name;
    if (typeof name === "string" && name.trim()) return { profileName: name.trim(), detail: { status: res.status, data } };
    return { profileName: undefined as string | undefined, detail: { status: res.status, data } };
  } catch (error) {
    return { profileName: undefined as string | undefined, detail: { error: String(error) } };
  }
}

function extractFailedMessage(data: JsonRecord) {
  const message = data.message;
  if (typeof message === "string") return message;
  if (message && typeof message === "object") {
    const nested = message as JsonRecord;
    const inner = nested.message;
    if (typeof inner === "string") return inner;
  }
  return undefined;
}

async function tryCreateBackendProfileName(backendBase: string, headers: HeadersInit, email: string, fullName: string) {
  const url = `${backendBase}/api/method/create_edit_profile`;
  const payload: JsonRecord = {
    profile: { email, full_name: fullName },
    profile_version: { mode: "new" },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonResponse(res);

    const message = data.message;
    const nested = message && typeof message === "object" ? (message as JsonRecord) : {};
    const maybeProfile =
      typeof nested.profile === "string"
        ? nested.profile
        : typeof (data as JsonRecord).profile_name === "string"
          ? ((data as JsonRecord).profile_name as string)
          : undefined;

    return {
      createdProfileName: typeof maybeProfile === "string" && maybeProfile.trim() ? maybeProfile.trim() : undefined,
      detail: { status: res.status, ok: res.ok, data },
    };
  } catch (error) {
    return { createdProfileName: undefined as string | undefined, detail: { error: String(error) } };
  }
}

async function tryResolveBackendCandidateName(backendBase: string, headers: HeadersInit, email: string) {
  const doctype = "Candidate";
  const candidateFields = ["email", "email_id", "emailId", "user_id", "user", "owner"];
  let last: { status: number; ok: boolean; url: string; data: JsonRecord } | undefined;

  for (const field of candidateFields) {
    const filters = JSON.stringify([[field, "=", email]]);
    const url = `${backendBase}/api/resource/${doctype}?fields=${encodeURIComponent(JSON.stringify(["name"]))}&filters=${encodeURIComponent(filters)}&limit_page_length=1`;
    try {
      const res = await fetch(url, { method: "GET", headers });
      const data = await parseJsonResponse(res);
      last = { status: res.status, ok: res.ok, url, data };
      if (!res.ok) continue;
      const rows = data.data;
      if (Array.isArray(rows) && rows[0] && typeof rows[0] === "object") {
        const name = (rows[0] as JsonRecord).name;
        if (typeof name === "string" && name.trim()) {
          return { candidateName: name.trim(), detail: last };
        }
      }
    } catch {
      // continue
    }
  }

  return { candidateName: undefined as string | undefined, detail: last ?? { note: "No candidate match" } };
}

function isFailedEnvelope(data: JsonRecord) {
  if (typeof data.status === "string" && data.status.toLowerCase() === "failed") return true;
  if (data.message && typeof data.message === "object") {
    const nestedStatus = (data.message as JsonRecord).status;
    if (typeof nestedStatus === "string" && nestedStatus.toLowerCase() === "failed") return true;
  }
  return false;
}

function pickString(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function splitFullName(fullName: string | undefined) {
  if (!fullName) return { firstName: undefined, lastName: undefined };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

function toKeySkills(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((skill) => (typeof skill === "string" ? skill.trim() : ""))
    .filter(Boolean)
    .slice(0, 20)
    .map((key_skill) => ({ key_skill }));
  return out.length ? out : undefined;
}

function toEducationDetails(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const out = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const rec = entry as JsonRecord;
      const degree =
        (typeof rec.title === "string" && rec.title.trim() ? rec.title.trim() : undefined) ??
        (typeof rec.degree === "string" && rec.degree.trim() ? rec.degree.trim() : undefined);
      const institution =
        (typeof rec.institute === "string" && rec.institute.trim() ? rec.institute.trim() : undefined) ??
        (typeof rec.institution === "string" && rec.institution.trim() ? rec.institution.trim() : undefined);
      const year =
        (typeof rec.graduationYear === "string" && rec.graduationYear.trim() ? rec.graduationYear.trim() : undefined) ??
        (typeof rec.year === "string" && rec.year.trim() ? rec.year.trim() : undefined);
      if (!degree && !institution && !year) return null;
      return { degree, institution, year };
    })
    .filter(Boolean)
    .slice(0, 5) as Array<{ degree?: string; institution?: string; year?: string }>;
  return out.length ? out : undefined;
}

async function fallbackSaveProfileFromResume(params: {
  backendBase: string;
  headers: HeadersInit;
  file: File;
  email: string;
  fullName: string;
  profileName?: string;
  currentLocation?: string;
  phoneNumber?: string;
}) {
  const parsed = await parseResumeFile(params.file);

  const url = `${params.backendBase}/api/method/create_edit_profile${
    params.profileName ? `?profile_name=${encodeURIComponent(params.profileName)}` : ""
  }`;

  const payload: JsonRecord = {
    full_name: params.fullName,
    email: params.email,
    professional_title:
      (typeof parsed.professionalTitle === "string" && parsed.professionalTitle.trim()
        ? parsed.professionalTitle.trim()
        : undefined) ?? undefined,
    current_location:
      params.currentLocation?.trim() ||
      (typeof parsed.currentLocation === "string" ? parsed.currentLocation.trim() : "") ||
      undefined,
    key_skills: toKeySkills(parsed.keySkills),
    education_details: toEducationDetails(parsed.education),
    action: "save",
  };

  // Avoid sending explicit undefined values in JSON.
  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) delete payload[key];
  });

  const upstream = await fetch(url, {
    method: "POST",
    headers: { ...params.headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(upstream);

  return { upstream, data, url, parsed, payload };
}

function mapBackendProfile(data: JsonRecord) {
  const root =
    data.data && typeof data.data === "object" ? (data.data as JsonRecord) : data;
  const profile =
    root.profile && typeof root.profile === "object" ? (root.profile as JsonRecord) : {};
  const version =
    root.profile_version && typeof root.profile_version === "object"
      ? (root.profile_version as JsonRecord)
      : {};
  const fullName = pickString(profile, "full_name", "name");
  const nameParts = splitFullName(fullName);

  const keySkills = Array.isArray(version.key_skills)
    ? Array.from(
        new Set(
          version.key_skills
            .map((item) => {
              if (typeof item === "string") return item.trim();
              if (item && typeof item === "object") {
                return pickString(item as JsonRecord, "key_skill", "keySkill", "skill", "name");
              }
              return undefined;
            })
            .filter((skill): skill is string => Boolean(skill))
        )
      )
    : [];

  const education = Array.isArray(version.education_details)
    ? version.education_details
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as JsonRecord;
          return {
            title: pickString(record, "degree", "title"),
            institute: pickString(record, "institution", "institute", "school"),
            graduationYear: pickString(record, "year", "graduationYear"),
          };
        })
        .filter(
          (entry): entry is { title: string | undefined; institute: string | undefined; graduationYear: string | undefined } =>
            Boolean(entry)
        )
    : [];

  return {
    profileName: pickString(profile, "name"),
    profileVersionName: pickString(version, "name"),
    profile: {
      firstName: pickString(profile, "first_name", "firstName") ?? nameParts.firstName,
      lastName: pickString(profile, "last_name", "lastName") ?? nameParts.lastName,
      email: pickString(profile, "email"),
      phone: pickString(profile, "phone", "phone_number", "mobile_no", "contact"),
      currentLocation: pickString(profile, "current_location", "currentLocation"),
      professionalTitle: pickString(version, "professional_title", "professionalTitle"),
      experienceYears:
        pickString(version, "experience_years", "experienceYears") ??
        pickString(version, "total_experience"),
      preferredLocation: pickString(version, "preferred_location", "preferredLocation"),
      nationality: pickString(version, "nationality", "country"),
      keySkills,
      education,
    },
  };
}

export async function POST(request: Request) {
  const backendBase = process.env.BACKEND_URL?.replace(/\/$/, "");
  if (!backendBase) {
    return NextResponse.json(
      { error: "BACKEND_URL is not set. Cannot generate profile from resume." },
      { status: 503 }
    );
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const cookieHeader = request.headers.get("cookie");
  const incomingEmail = getFormValue(incoming, "email");
  const incomingFullName = getFormValue(incoming, "full_name");
  const incomingFirstName = getFormValue(incoming, "first_name");
  const incomingLastName = getFormValue(incoming, "last_name");
  const candidateId = getFormValue(incoming, "candidate_id");
  const email = incomingEmail || getCookieValue(cookieHeader, "user_id");
  const fullName =
    incomingFullName ||
    [incomingFirstName, incomingLastName].filter(Boolean).join(" ").trim() ||
    getCookieValue(cookieHeader, "full_name");
  const phoneNumber = getFormValue(incoming, "phone_number");
  const currentLocation = getFormValue(incoming, "current_location");

  if (!email || !fullName) {
    return NextResponse.json({
      skipped: true,
      reason: "missing_identity",
      error: "Unable to resolve email/full_name for pre-profile creation.",
    });
  }

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  if (cookieHeader) headers.Cookie = cookieHeader;

  // If backend expects a Profile document ID, prefer resolving it from email.
  // Otherwise fall back to email to preserve existing behavior.
  const resolved = await tryResolveBackendProfileName(backendBase, headers, email);
  const resolvedCandidate = await tryResolveBackendCandidateName(backendBase, headers, email);
  let created:
    | { createdProfileName: string | undefined; detail: unknown }
    | undefined;
  const resolvedFailureMsg = resolved.profileName ? undefined : extractFailedMessage((resolved.detail as any)?.data ?? {});
  if (!candidateId && !resolved.profileName && resolvedFailureMsg?.toLowerCase().includes("no profile found")) {
    created = await tryCreateBackendProfileName(backendBase, headers, email, fullName);
  }
  const effectiveCandidateId =
    candidateId ||
    resolvedCandidate.candidateName ||
    created?.createdProfileName ||
    resolved.profileName;

  console.info("generate_profile_from_resume identity resolution", {
    fileName: file.name,
    incomingEmail,
    cookieEmail: getCookieValue(cookieHeader, "user_id"),
    effectiveEmail: email,
    incomingFullName,
    incomingFirstName,
    incomingLastName,
    cookieFullName: getCookieValue(cookieHeader, "full_name"),
    effectiveFullName: fullName,
    candidateId: effectiveCandidateId,
    resolvedProfileName: resolved.profileName,
    resolvedCandidateName: resolvedCandidate.candidateName,
    createdProfileName: created?.createdProfileName,
    hasPhoneNumber: Boolean(phoneNumber),
    hasCurrentLocation: Boolean(currentLocation),
  });

  const preProfileBody = new FormData();
  preProfileBody.append("email", email);
  preProfileBody.append("full_name", fullName);
  preProfileBody.append("file", file, file.name);
  if (phoneNumber) preProfileBody.append("phone_number", phoneNumber);
  if (currentLocation) preProfileBody.append("current_location", currentLocation);

  const createUrl = `${backendBase}/api/method/create_pre_profile`;
  const createResponse = await fetch(createUrl, {
    method: "POST",
    headers,
    body: preProfileBody,
  });
  const createData = await parseJsonResponse(createResponse);
  console.info("create_pre_profile response", {
    ok: createResponse.ok,
    status: createResponse.status,
    email,
    fullName,
    body: createData,
  });
  if (!createResponse.ok || isFailedEnvelope(createData)) {
    // Backend create_pre_profile is failing in some environments even with correct inputs.
    // Fallback: parse resume locally and persist via create_edit_profile.
    try {
      const profileNameForFallback = created?.createdProfileName || resolved.profileName;
      const fallback = await fallbackSaveProfileFromResume({
        backendBase,
        headers,
        file,
        email,
        fullName,
        profileName: profileNameForFallback,
        currentLocation,
        phoneNumber,
      });

      if (fallback.upstream.ok && !isFailedEnvelope(fallback.data)) {
        const returnedProfileName =
          pickString(fallback.data, "profile_name") ??
          (fallback.data.message && typeof fallback.data.message === "object"
            ? pickString(fallback.data.message as JsonRecord, "profile", "profile_name")
            : undefined) ??
          profileNameForFallback;

        const res = NextResponse.json({
          fallback: true,
          fallbackReason: "create_pre_profile_failed",
          profileName: returnedProfileName ?? null,
          parsed: fallback.parsed,
          saved: fallback.data,
        });
        res.headers.set("x-upstream-create-edit-profile", fallback.url);
        res.headers.set("x-upstream-create-pre-profile", createUrl);
        return res;
      }
    } catch (error) {
      console.error("generate_profile_from_resume fallback failed", error);
    }

    const res = NextResponse.json(
      {
        error: parseApiErrorMessage(createData),
        sent: {
          email,
          full_name: fullName,
          phone_number: phoneNumber || null,
          current_location: currentLocation || null,
        },
        resolution: {
          attemptedProfileLookup: true,
          resolvedProfileName: resolved.profileName ?? null,
          detail: resolved.detail,
        },
        candidateResolution: {
          attempted: true,
          resolvedCandidateName: resolvedCandidate.candidateName ?? null,
          detail: resolvedCandidate.detail,
        },
        creationAttempt: created
          ? {
              attempted: true,
              createdProfileName: created.createdProfileName ?? null,
              detail: created.detail,
            }
          : { attempted: false },
        detail: createData,
      },
      { status: createResponse.ok ? 502 : createResponse.status }
    );
    res.headers.set("x-upstream-create-pre-profile", createUrl);
    res.headers.set("x-upstream-create-pre-profile-status", String(createResponse.status));
    res.headers.set("x-backend-base", backendBase);
    return res;
  }

  const preProfileName =
    pickString(createData, "pre_profile_name") ??
    pickString(createData, "name") ??
    (createData.message && typeof createData.message === "object"
      ? pickString(createData.message as JsonRecord, "pre_profile_name", "name")
      : undefined);

  if (!preProfileName) {
    return NextResponse.json(
      { error: "pre_profile_name was not returned by create_pre_profile.", detail: createData },
      { status: 502 }
    );
  }

  const generateUrl = `${backendBase}/api/method/generate_profile_from_pre_profile_api`;
  const generateResponse = await fetch(generateUrl, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pre_profile_name: preProfileName }),
  });
  const generateData = await parseJsonResponse(generateResponse);
  if (!generateResponse.ok || isFailedEnvelope(generateData)) {
    return NextResponse.json(
      { error: parseApiErrorMessage(generateData), detail: generateData },
      { status: generateResponse.ok ? 502 : generateResponse.status }
    );
  }

  const profileName =
    pickString(generateData, "profile_name") ??
    (generateData.message && typeof generateData.message === "object"
      ? pickString(generateData.message as JsonRecord, "profile_name")
      : undefined);

  if (!profileName) {
    return NextResponse.json(
      { error: "profile_name was not returned by generate_profile_from_pre_profile_api.", detail: generateData },
      { status: 502 }
    );
  }

  const profileLookupName = candidateId || profileName;
  const getDataUrl = `${backendBase}/api/method/get_data?doctype=Profile&name=${encodeURIComponent(profileLookupName)}`;
  const profileResponse = await fetch(getDataUrl, {
    method: "GET",
    headers,
  });
  const profileData = await parseJsonResponse(profileResponse);
  if (
    !profileResponse.ok ||
    profileData.status === "error" ||
    profileData.code === "UNAUTHORIZED" ||
    isFailedEnvelope(profileData)
  ) {
    if (candidateId && candidateId !== profileName) {
      const fallbackGetDataUrl = `${backendBase}/api/method/get_data?doctype=Profile&name=${encodeURIComponent(profileName)}`;
      const fallbackProfileResponse = await fetch(fallbackGetDataUrl, {
        method: "GET",
        headers,
      });
      const fallbackProfileData = await parseJsonResponse(fallbackProfileResponse);

      if (
        fallbackProfileResponse.ok &&
        fallbackProfileData.status !== "error" &&
        fallbackProfileData.code !== "UNAUTHORIZED" &&
        !isFailedEnvelope(fallbackProfileData)
      ) {
        const mapped = mapBackendProfile(fallbackProfileData);
        const res = NextResponse.json({
          ...mapped.profile,
          keySkills: mapped.profile.keySkills,
          education: mapped.profile.education,
          profileName: mapped.profileName,
          profileVersionName: mapped.profileVersionName,
          preProfileName,
        });
        res.headers.set("x-upstream-create-pre-profile", createUrl);
        res.headers.set("x-upstream-generate-profile", generateUrl);
        res.headers.set("x-upstream-get-data", fallbackGetDataUrl);
        res.headers.set("x-upstream-get-data-primary-name", profileLookupName);
        res.headers.set("x-upstream-get-data-fallback-name", profileName);
        return res;
      }
    }

    return NextResponse.json(
      { error: parseApiErrorMessage(profileData), detail: profileData },
      { status: profileResponse.ok ? 502 : profileResponse.status }
    );
  }

  const mapped = mapBackendProfile(profileData);
  const res = NextResponse.json({
    ...mapped.profile,
    keySkills: mapped.profile.keySkills,
    education: mapped.profile.education,
    profileName: mapped.profileName,
    profileVersionName: mapped.profileVersionName,
    preProfileName,
  });
  res.headers.set("x-upstream-create-pre-profile", createUrl);
  res.headers.set("x-upstream-generate-profile", generateUrl);
  res.headers.set("x-upstream-get-data", getDataUrl);
  return res;
}
