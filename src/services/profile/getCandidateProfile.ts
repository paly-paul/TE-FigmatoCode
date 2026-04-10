import type { ResumeProfileData } from "@/types/profile";
import { parseApiErrorMessage } from "@/services/signup/parseApiError";

type UnknownRecord = Record<string, unknown>;

function pickString(obj: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    // Backend often returns numbers for years/salary; normalize to string.
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function extractDataRoot(payload: UnknownRecord): UnknownRecord {
  const topLevelData = payload.data;
  if (topLevelData && typeof topLevelData === "object") {
    return topLevelData as UnknownRecord;
  }

  const msg = payload.message;
  if (msg && typeof msg === "object") {
    const asRecord = msg as UnknownRecord;
    const nestedData = asRecord.data;
    if (nestedData && typeof nestedData === "object") {
      return nestedData as UnknownRecord;
    }
    return asRecord;
  }
  return payload;
}

function splitFullName(fullName: string | undefined) {
  if (!fullName) return { firstName: undefined, lastName: undefined };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: undefined, lastName: undefined };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ") || undefined,
  };
}

function mapKeySkills(value: unknown): ResumeProfileData["keySkills"] {
  const flattened = collectSkillStrings(value);
  return flattened.length ? Array.from(new Set(flattened)) : undefined;
}

function mapSkillsTable(value: unknown): string[] | undefined {
  const flattened = collectSkillStrings(value);
  return flattened.length ? Array.from(new Set(flattened)) : undefined;
}

function splitSkillText(value: string) {
  return value
    .split(/,|\/|;|\||•|\n/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function collectSkillStrings(value: unknown): string[] {
  if (typeof value === "string") return splitSkillText(value);

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => collectSkillStrings(item))
      .filter((skill) => skill.length >= 2 && skill.length <= 50);
  }

  if (!value || typeof value !== "object") return [];
  const record = value as UnknownRecord;

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
  const fromDirect = direct ? splitSkillText(direct) : [];

  const nestedArrays = [
    record.data,
    record.items,
    record.rows,
    record.results,
    record.message,
    record.skills,
    record.skill_set,
    record.key_skills,
  ];

  const fromNested = nestedArrays.flatMap((nested) => collectSkillStrings(nested));
  return [...fromDirect, ...fromNested];
}

function mapEducationDetails(value: unknown): ResumeProfileData["education"] {
  if (!Array.isArray(value)) return undefined;

  const education = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        title: pickString(record, "degree", "title"),
        institute: pickString(record, "institution", "institute", "school"),
        graduationYear: pickString(record, "year", "graduationYear"),
      };
    })
    // Keep entries that look meaningful, but avoid strict type-predicate issues.
    .filter((entry) => Boolean(entry && (entry.title || entry.institute))) as Array<
    NonNullable<ResumeProfileData["education"]>[number]
  >);

  return education.length ? education : undefined;
}

function mapEducationQualifications(value: unknown): ResumeProfileData["education"] {
  if (!Array.isArray(value)) return undefined;
  const education = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        title: pickString(record, "title", "degree"),
        institute: pickString(record, "institution", "institute", "school"),
        specialization: pickString(record, "specialization"),
        graduationYear: pickString(record, "year_of_passing", "graduation_year", "year", "graduationYear"),
        score: pickString(record, "score"),
      };
    })
    .filter((entry) => Boolean(entry && (entry.title || entry.institute))) as Array<
    NonNullable<ResumeProfileData["education"]>[number]
  >);
  return education.length ? education : undefined;
}

function mapCertifications(value: unknown): ResumeProfileData["certifications"] {
  if (!Array.isArray(value)) return undefined;
  const out = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        name: pickString(record, "name", "certification", "title"),
        issuing: pickString(record, "issuing", "issuer", "issued_by", "organization"),
        certificateNumber: pickString(record, "certificate_number", "certificateNumber", "number", "id"),
        issueDate: pickString(record, "issue_date", "issueDate", "issued_on"),
        expirationDate: pickString(record, "expiration_date", "expirationDate", "expires_on"),
        url: pickString(record, "url", "link"),
      };
    })
    .filter((entry) => Boolean(entry && (entry.name || entry.issuing || entry.url))) as Array<
    NonNullable<ResumeProfileData["certifications"]>[number]
  >);
  return out.length ? out : undefined;
}

function mapCertificationTable(value: unknown): ResumeProfileData["certifications"] {
  if (!Array.isArray(value)) return undefined;
  const out = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        name: pickString(record, "certification_name", "name", "certification", "title"),
        issuing: pickString(record, "issuing", "issuer", "issued_by", "organization"),
        certificateNumber: pickString(record, "certificate_number", "certificateNumber", "number", "id"),
        issueDate: pickString(record, "issue_date", "issueDate", "issued_on", "year"),
        expirationDate: pickString(record, "expiration_date", "expirationDate", "expires_on"),
        url: pickString(record, "url", "link"),
      };
    })
    .filter((entry) => Boolean(entry && (entry.name || entry.issuing || entry.url))) as Array<
    NonNullable<ResumeProfileData["certifications"]>[number]
  >);
  return out.length ? out : undefined;
}

function mapExternalLinks(value: unknown): ResumeProfileData["externalLinks"] {
  if (!Array.isArray(value)) return undefined;
  const out = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        label: pickString(record, "label", "name", "title", "type"),
        url: pickString(record, "url", "link", "value"),
      };
    })
    .filter((entry) => Boolean(entry && entry.url)) as Array<NonNullable<ResumeProfileData["externalLinks"]>[number]>);
  return out.length ? out : undefined;
}

function mapExternalProfileLinks(value: unknown): ResumeProfileData["externalLinks"] {
  if (!Array.isArray(value)) return undefined;
  const out = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        label: pickString(record, "platform", "label", "name", "title", "type"),
        url: pickString(record, "url", "link", "value"),
      };
    })
    .filter((entry) => Boolean(entry && entry.url)) as Array<NonNullable<ResumeProfileData["externalLinks"]>[number]>);
  return out.length ? out : undefined;
}

function mapLanguages(value: unknown): ResumeProfileData["languages"] {
  if (!Array.isArray(value)) return undefined;
  const out = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      return {
        language: pickString(record, "language", "name"),
        read: pickString(record, "read", "reading"),
        write: pickString(record, "write", "writing"),
        speak: pickString(record, "speak", "speaking"),
      };
    })
    .filter((entry) => Boolean(entry && entry.language)) as Array<NonNullable<ResumeProfileData["languages"]>[number]>);
  return out.length ? out : undefined;
}

function mapWorkExperience(value: unknown): ResumeProfileData["workExperience"] {
  if (!Array.isArray(value)) return undefined;
  const out = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;
      const responsibilitiesRaw = (record.responsibilities ?? record.responsibility) as unknown;
      const responsibilities =
        Array.isArray(responsibilitiesRaw)
          ? responsibilitiesRaw.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean)
          : typeof responsibilitiesRaw === "string"
            ? responsibilitiesRaw
                .split(/\n|•|- /g)
                .map((s) => s.trim())
                .filter(Boolean)
            : undefined;
      return {
        jobTitle: pickString(record, "role", "job_title", "jobTitle", "designation", "title"),
        company: pickString(record, "company", "company_name", "employer", "organization", "org"),
        duration:
          pickString(record, "duration") ??
          (() => {
            const from = pickString(record, "from_date", "start_date", "fromDate", "startDate");
            const to = pickString(record, "to_date", "end_date", "toDate", "endDate");
            return from || to ? [from, to].filter(Boolean).join(" - ") : undefined;
          })(),
        responsibilities,
      };
    })
    .filter((entry) => Boolean(entry && (entry.jobTitle || entry.company || entry.duration))) as Array<
    NonNullable<ResumeProfileData["workExperience"]>[number]
  >);
  return out.length ? out : undefined;
}

function mapProjectsTable(value: unknown): ResumeProfileData["projects"] {
  if (!Array.isArray(value)) return undefined;

  const extractCompanyFromText = (text: unknown) => {
    const raw = typeof text === "string" ? text.trim() : "";
    if (!raw) return undefined;
    // Heuristics: "at <Company>", "with <Company>", "for <Company>"
    const m =
      raw.match(/\b(?:at|with|for)\s+([A-Z][A-Za-z0-9&.,' -]{2,60})(?:\b|,|\.)/) ??
      raw.match(/\b(?:client|customer)\s*[:\-]\s*([A-Z][A-Za-z0-9&.,' -]{2,60})(?:\b|,|\.)/i);
    const candidate = m?.[1]?.trim() || "";
    return candidate && candidate.length <= 80 ? candidate : undefined;
  };

  const out = (value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as UnknownRecord;

      const title = pickString(record, "title", "project_title", "projectTitle", "name");
      const projectName = pickString(record, "project_name");
      const customerCompany =
        pickString(record, "customer_company", "customerCompany", "company", "client") ??
        extractCompanyFromText(record.roles_responsibilities) ??
        extractCompanyFromText(record.description);
      const start = pickString(record, "start_date", "startDate", "from_date", "fromDate");
      const end = pickString(record, "end_date", "endDate", "to_date", "toDate");
      const inProgress = !end;

      const description = pickString(record, "description", "project_description", "projectDescription");
      const responsibilities =
        pickString(record, "roles_responsibilities", "rolesResponsibilities", "responsibilities") ?? undefined;

      const resolvedTitle = projectName || title;
      if (!resolvedTitle && !customerCompany && !start) return null;

      return {
        projectTitle: resolvedTitle || undefined,
        customerCompany: customerCompany || undefined,
        projectStartDate: start || "01/2000",
        projectEndDate: end || undefined,
        inProgress,
        projectDescription: description || undefined,
        responsibilities: responsibilities || undefined,
      };
    })
    .filter((p) => Boolean(p && (p.projectTitle || p.customerCompany))) as Array<
    NonNullable<ResumeProfileData["projects"]>[number]
  >);
  return out.length ? out : undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toResponsibilitiesText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() ? value.trim() : undefined;
  if (Array.isArray(value)) {
    const parts = value.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean);
    if (parts.length === 0) return undefined;
    return parts.join("; ");
  }
  return undefined;
}

function mapWorkExperienceToProjects(value: unknown): ResumeProfileData["projects"] {
  const workExp = value;
  if (!Array.isArray(workExp)) return undefined;

  type MappedProject = NonNullable<ResumeProfileData["projects"]>[number] & { projectStartDate: string };

  const projects = workExp
    .map((item): MappedProject | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;

      const projectTitle =
        pickString(record, "role", "job_title", "jobTitle", "projectTitle", "title") ||
        pickString(record, "position");
      const customerCompany =
        pickString(record, "company", "company_name", "customerCompany", "employer", "organization", "org");

      const projectStartDate =
        pickString(record, "from_date", "fromDate", "start_date", "startDate") ??
        pickString(record, "from", "start") ??
        pickString(record, "start");

      const toDate =
        pickString(record, "to_date", "toDate", "end_date", "endDate") ??
        pickString(record, "to", "end") ??
        pickString(record, "end");

      // When no end date is present, treat it as "in progress" for the wizard validation.
      const inProgress = !toDate;
      const projectEndDate = inProgress ? undefined : toDate;

      const responsibilitiesText =
        toResponsibilitiesText(
          record.responsibilities ?? record.responsibility ?? record.bullets ?? record.achievements
        ) ?? asNonEmptyString(record.responsibilities_text ?? record.responsibilitiesText);

      const description =
        pickString(record, "description", "project_description", "projectDescription", "summary") ??
        asNonEmptyString(record.project_description_text ?? record.description_text);

      // Fallbacks ensure the wizard "required" validation doesn’t block finishing when backend
      // doesn’t provide description/responsibilities fields.
      const fallbackDescription =
        projectTitle && customerCompany
          ? `Delivered measurable outcomes as ${projectTitle} at ${customerCompany}.`
          : projectTitle
            ? `Delivered measurable outcomes as ${projectTitle}.`
            : customerCompany
              ? `Delivered measurable outcomes at ${customerCompany}.`
              : undefined;

      const fallbackResponsibilities =
        projectTitle && customerCompany
          ? `Owned key responsibilities as ${projectTitle} at ${customerCompany}, including planning, execution, and continuous improvement.`
          : projectTitle
            ? `Owned key responsibilities as ${projectTitle}, including planning, execution, and continuous improvement.`
            : customerCompany
              ? `Owned key responsibilities at ${customerCompany}, including planning, execution, and continuous improvement.`
              : undefined;

      const projectDescription = description || fallbackDescription;
      const responsibilities = responsibilitiesText || fallbackResponsibilities;

      // Keep partially filled entries out only when they have no identity.
      if (!projectTitle && !customerCompany && !projectStartDate) return null;

      const safeProjectStartDate = projectStartDate || "01/2000";

      return {
        projectTitle: projectTitle || undefined,
        customerCompany: customerCompany || undefined,
        projectStartDate: safeProjectStartDate,
        projectEndDate: projectEndDate || undefined,
        inProgress,
        projectDescription: projectDescription || undefined,
        responsibilities: responsibilities || undefined,
      };
    })
    .filter((p): p is MappedProject => Boolean(p) && Boolean(p?.projectTitle || p?.customerCompany));

  return projects.length ? (projects as NonNullable<ResumeProfileData["projects"]>) : undefined;
}

function mapToResumeProfileData(root: UnknownRecord): ResumeProfileData {
  const profileRecord =
    root.profile && typeof root.profile === "object" ? (root.profile as UnknownRecord) : root;
  const profileVersion =
    root.profile_version && typeof root.profile_version === "object"
      ? (root.profile_version as UnknownRecord)
      : root;
  const fullName = pickString(profileRecord, "full_name", "fullName", "name");
  const splitName = splitFullName(fullName);
  const keySkillsFromArray = mapKeySkills(profileVersion.key_skills);
  const keySkillsFromTable = mapSkillsTable(profileVersion.skills_table);
  const keySkillsFromRoot = mapKeySkills(
    profileVersion.keySkills ??
      profileRecord.key_skills ??
      profileRecord.keySkills ??
      root.key_skills
  );
  const tools =
    mapSkillsTable(
      profileVersion.tools ??
        profileVersion.tools_table ??
        profileVersion.skills_table ??
        profileRecord.tools ??
        root.tools
    ) ?? undefined;
  const educationFromDetails = mapEducationDetails(profileVersion.education_details);
  const educationFromQualifications = mapEducationQualifications(profileVersion.education_qualifications);

  const workExperience =
    profileVersion.work_experience ??
    profileVersion.workExperience ??
    profileVersion.work_experiences ??
    profileVersion.employment_history ??
    root.work_experience ??
    root.workExperience;
  const mappedProjects = mapWorkExperienceToProjects(workExperience);
  const mappedWorkExperience = mapWorkExperience(workExperience);

  const certifications =
    mapCertifications(profileVersion.certifications ?? profileVersion.certification_details ?? profileVersion.certification_details_table) ??
    mapCertificationTable(profileVersion.certification_table) ??
    mapCertifications(profileRecord.certifications);

  const externalLinks =
    mapExternalLinks(profileVersion.external_links ?? profileVersion.externalLinks ?? profileRecord.external_links ?? profileRecord.externalLinks) ??
    mapExternalProfileLinks(profileVersion.external_profile_links ?? profileRecord.external_profile_links);

  const languages =
    mapLanguages(profileVersion.languages ?? profileVersion.language_details ?? profileRecord.languages);

  return {
    professionalTitle: pickString(profileVersion, "professional_title", "professionalTitle", "designation"),
    experienceYears:
      pickString(profileVersion, "experience_years", "experienceYears") ??
      pickString(profileVersion, "total_experience_years", "totalExperienceYears") ??
      pickString(profileVersion, "total_experience"),
    experienceMonths: pickString(profileVersion, "experience_months", "experienceMonths"),
    summary: pickString(profileVersion, "professional_summary", "summary", "about_me"),
    salaryPerMonth: pickString(
      profileVersion,
      "current_salary",
      "salary_per_month",
      "salaryPerMonth",
      "salary"
    ),
    salaryCurrency: pickString(
      profileVersion,
      "current_salary_currency",
      "salary_currency",
      "salaryCurrency"
    ),
    firstName: pickString(profileRecord, "first_name", "firstName") ?? splitName.firstName,
    lastName: pickString(profileRecord, "last_name", "lastName") ?? splitName.lastName,
    dob: pickString(profileRecord, "dob", "date_of_birth"),
    gender: pickString(profileRecord, "gender"),
    countryCode: pickString(profileRecord, "country_code", "countryCode"),
    phone: pickString(profileRecord, "contact_no", "phone", "mobile_no", "contact", "phone_number"),
    email: pickString(profileRecord, "email", "user", "candidate_id"),
    altEmail: pickString(profileRecord, "alternative_email", "alt_email", "alternate_email"),
    nationality:
      pickString(profileVersion, "nationality", "country") ??
      pickString(profileRecord, "nationality", "country"),
    currentLocation:
      pickString(profileRecord, "current_location", "currentLocation") ??
      pickString(profileVersion, "current_location", "currentLocation", "location"),
    preferredLocation:
      pickString(profileVersion, "preferred_location", "preferredLocation") ??
      pickString(profileRecord, "preferred_location", "preferredLocation"),
    keySkills: keySkillsFromArray ?? keySkillsFromTable ?? keySkillsFromRoot,
    tools,
    education: educationFromDetails ?? educationFromQualifications,
    certifications,
    externalLinks,
    languages,
    workExperience: mappedWorkExperience,
    projects: mappedProjects ?? mapProjectsTable(profileVersion.projects_table),
  };
}

export async function getCandidateProfileData(candidateId: string): Promise<ResumeProfileData> {
  const url = new URL("/api/method/get_data", window.location.origin);
  url.searchParams.set("doctype", "Profile");
  url.searchParams.set("name", candidateId.trim());
  const res = await fetch(url.toString(), {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  let data: UnknownRecord = {};
  try {
    data = (await res.json()) as UnknownRecord;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(parseApiErrorMessage(data) || `Request failed (${res.status})`);
  }

  if (data.status === "error" || data.code === "UNAUTHORIZED") {
    throw new Error(parseApiErrorMessage(data) || "Unable to load profile data.");
  }

  if (typeof data.exc === "string" && data.exc) {
    throw new Error(parseApiErrorMessage(data));
  }

  return mapToResumeProfileData(extractDataRoot(data));
}

