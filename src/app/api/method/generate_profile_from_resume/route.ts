import { NextResponse } from "next/server";
import { parseApiErrorMessage } from "@/services/signup/parseApiError";

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

async function loadExistingProfileByEmail(
  backendBase: string,
  headers: HeadersInit,
  email: string
) {
  const lookupUrl = `${backendBase}/api/method/get_profile_by_email?email=${encodeURIComponent(email)}`;
  const lookupResponse = await fetch(lookupUrl, {
    method: "GET",
    headers,
  });
  const lookupData = await parseJsonResponse(lookupResponse);

  if (
    !lookupResponse.ok ||
    isFailedEnvelope(lookupData) ||
    (typeof lookupData.status === "string" && lookupData.status.toLowerCase() === "error")
  ) {
    throw new Error(parseApiErrorMessage(lookupData));
  }

  const lookupRoot =
    lookupData.data && typeof lookupData.data === "object"
      ? (lookupData.data as JsonRecord)
      : lookupData.message && typeof lookupData.message === "object"
        ? (lookupData.message as JsonRecord)
        : lookupData;

  const profile =
    lookupRoot.profile && typeof lookupRoot.profile === "object"
      ? (lookupRoot.profile as JsonRecord)
      : {};
  const profileName = pickString(profile, "name");

  if (!profileName) {
    throw new Error("Profile name was not returned by get_profile_by_email.");
  }

  const getDataUrl = `${backendBase}/api/method/get_data?doctype=Profile&name=${encodeURIComponent(profileName)}`;
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
    throw new Error(parseApiErrorMessage(profileData));
  }

  return {
    ...mapBackendProfile(profileData),
    profileDataUrl: getDataUrl,
    lookupUrl,
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
  const email = incomingEmail || getCookieValue(cookieHeader, "user_id");
  const fullName =
    incomingFullName ||
    [incomingFirstName, incomingLastName].filter(Boolean).join(" ").trim() ||
    getCookieValue(cookieHeader, "full_name");
  const phoneNumber = getFormValue(incoming, "phone_number");
  const currentLocation = getFormValue(incoming, "current_location");

  if (!email || !fullName) {
    return NextResponse.json(
      { error: "Unable to resolve email/full_name for pre-profile creation." },
      { status: 400 }
    );
  }

  const headers: HeadersInit = {};
  const auth = process.env.BACKEND_AUTHORIZATION;
  if (auth) headers.Authorization = auth;
  if (cookieHeader) headers.Cookie = cookieHeader;

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
    hasPhoneNumber: Boolean(phoneNumber),
    hasCurrentLocation: Boolean(currentLocation),
  });

  try {
    const existingProfile = await loadExistingProfileByEmail(backendBase, headers, email);
    const existingProfileResponse = NextResponse.json({
      ...existingProfile.profile,
      keySkills: existingProfile.profile.keySkills,
      education: existingProfile.profile.education,
      profileName: existingProfile.profileName,
      profileVersionName: existingProfile.profileVersionName,
    });
    existingProfileResponse.headers.set("x-upstream-get-profile-by-email", existingProfile.lookupUrl);
    existingProfileResponse.headers.set("x-upstream-get-data", existingProfile.profileDataUrl);
    existingProfileResponse.headers.set("x-profile-source", "existing-profile");
    return existingProfileResponse;
  } catch (existingProfileError) {
    console.info("No existing profile found before create_pre_profile", {
      email,
      message: existingProfileError instanceof Error ? existingProfileError.message : "lookup failed",
    });
  }

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
    try {
      const existingProfile = await loadExistingProfileByEmail(backendBase, headers, email);
      const fallbackResponse = NextResponse.json({
        ...existingProfile.profile,
        keySkills: existingProfile.profile.keySkills,
        education: existingProfile.profile.education,
        profileName: existingProfile.profileName,
        profileVersionName: existingProfile.profileVersionName,
      });
      fallbackResponse.headers.set("x-upstream-create-pre-profile", createUrl);
      fallbackResponse.headers.set("x-upstream-get-profile-by-email", existingProfile.lookupUrl);
      fallbackResponse.headers.set("x-upstream-get-data", existingProfile.profileDataUrl);
      fallbackResponse.headers.set("x-profile-source", "fallback-existing-profile");
      return fallbackResponse;
    } catch (fallbackError) {
      return NextResponse.json(
        {
          error: parseApiErrorMessage(createData),
          detail: createData,
          fallback_error: fallbackError instanceof Error ? fallbackError.message : "Unable to load existing profile.",
        },
        { status: createResponse.ok ? 502 : createResponse.status }
      );
    }
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

  const getDataUrl = `${backendBase}/api/method/get_data?doctype=Profile&name=${encodeURIComponent(profileName)}`;
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
