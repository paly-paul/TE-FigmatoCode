"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Award,
    BriefcaseBusiness,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    CircleCheck,
    Copy,
    Download,
    ExternalLink,
    Folder,
    GraduationCap,
    Home,
    IdCard,
    Languages,
    MapPin,
    Phone,
    Settings2,
    UserCircle2,
    Wrench,
} from "lucide-react";

import VisibilityScoreCard from "../dashboard/VisibilityScoreCard";
import { PROFILE as PROFILE_FALLBACK } from "../profile-page/mockData";
import type { ProfileData } from "../profile-page/types";
import {
    CircleProgress,
    DetailTile,
    LabelValue,
    MiniInfo,
    Pill,
    SectionCard,
} from "../profile-page/ProfilePrimitives";
import AppNavbar from "../profile/AppNavbar";
import Image from "next/image";
import CandidateAppShell from "../mobile/CandidateAppShell";
import { useIsMobile } from "@/lib/useResponsive";
import { getCandidateProfileData } from "@/services/profile/getCandidateProfile";
import { downloadProfileResume } from "@/services/profile/downloadProfileResume";
import { setProfileStatus } from "@/services/profile/setProfileStatus";
import { getProfileName, setProfileName } from "@/lib/authSession";
import { readResumeProfile } from "@/lib/profileSession";
import type { ResumeProfileData } from "@/types/profile";

function CopySuccessBadge({ show }: { show: boolean }) {
    return (
        <span
            className={`inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700 transition-all duration-200 ${
                show ? "translate-y-0 scale-100 opacity-100" : "-translate-y-1 scale-95 opacity-0"
            }`}
            aria-live="polite"
        >
            Copied!
        </span>
    );
}

const EMPTY_PROFILE: ProfileData = {
    ...PROFILE_FALLBACK,
    name: "",
    profileImageUrl: "",
    title: "",
    location: "",
    countryCode: "",
    phone: "",
    github: "",
    linkedin: "",
    website: "",
    externalLinks: [],
    summary: "",
    experience: "",
    salary: "",
    persona: "",
    personalInfo: {
        dob: "",
        gender: "",
        emails: [],
        nationality: "",
        currentLocation: "",
        preferredLocation: "",
    },
    education: [
        {
            degree: "",
            school: "",
            specialization: "",
            graduationYear: "",
            score: "",
        },
    ],
    languages: [],
    skills: [],
    certifications: [],
    experienceItems: [],
    tools: [],
    projects: [],
};

function parseMaybeDate(value: string | undefined): string {
    if (!value?.trim()) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return value;
    return dt.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

function parseYearsFromDuration(duration: string | undefined, fallbackYears: number): number {
    const raw = (duration || "").trim();
    if (!raw) return fallbackYears;
    const match = raw.match(/(\d+(?:\.\d+)?)/);
    if (!match?.[1]) return fallbackYears;
    const parsed = Number.parseFloat(match[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallbackYears;
    return parsed;
}

function normalizeExternalUrl(url: string | undefined): string {
    if (!url) return "";
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}

function detectPlatformFromUrl(url: string): "github" | "linkedin" | "website" {
    try {
        const hostname = new URL(url).hostname.toLowerCase();
        if (hostname === "github.com" || hostname.endsWith(".github.com")) return "github";
        if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) return "linkedin";
        return "website";
    } catch {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.includes("github.com")) return "github";
        if (lowerUrl.includes("linkedin.com")) return "linkedin";
        return "website";
    }
}

function platformLabel(platform: "github" | "linkedin" | "website"): string {
    if (platform === "github") return "Github";
    if (platform === "linkedin") return "LinkedIn";
    return "Website";
}

function platformIcon(platform: "github" | "linkedin" | "website"): string {
    if (platform === "github") return "/icons/github-logo.svg";
    if (platform === "linkedin") return "/icons/linkedin-logo.svg";
    return "/icons/web-logo.svg";
}

function normalizeExternalLinksList(links: Array<{ label?: string; url?: string }>) {
    const seen = new Set<string>();
    const out: Array<{ label: string; url: string; platform: "github" | "linkedin" | "website" }> = [];

    for (const link of links) {
        const url = normalizeExternalUrl(link.url);
        if (!url) continue;
        const key = url.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const platform = detectPlatformFromUrl(url);
        const label = (link.label || "").trim() || platformLabel(platform);
        out.push({ label, url, platform });
    }
    return out;
}

function inferExternalLinks(links: Array<{ label?: string; url?: string }>) {
    let github = "";
    let linkedin = "";
    let website = "";

    for (const link of links) {
        const url = normalizeExternalUrl(link.url);
        if (!url) continue;
        const label = (link.label || "").toLowerCase();
        const platformFromUrl = detectPlatformFromUrl(url);

        if (!github && platformFromUrl === "github") {
            github = url;
            continue;
        }
        if (!linkedin && platformFromUrl === "linkedin") {
            linkedin = url;
            continue;
        }
        if (!website && platformFromUrl === "website") {
            website = url;
            continue;
        }
        if (!github && label.includes("github")) {
            github = url;
            continue;
        }
        if (!linkedin && label.includes("linkedin")) {
            linkedin = url;
            continue;
        }
        if (!website && (label.includes("website") || label.includes("portfolio") || label.includes("web"))) {
            website = url;
            continue;
        }
        if (!website) {
            website = url;
        }
    }

    return { github, linkedin, website };
}

function splitFromRight(value: string, chunkSize: number): string[] {
    const parts: string[] = [];
    let cursor = value.length;
    while (cursor > 0) {
        const start = Math.max(0, cursor - chunkSize);
        parts.unshift(value.slice(start, cursor));
        cursor = start;
    }
    return parts;
}

function formatNationalNumber(digits: string, countryCode: string): string {
    if (!digits) return "";
    if (digits.length === 10) {
        return `${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    if (countryCode === "44" && (digits.length === 10 || digits.length === 11)) {
        const head = digits.slice(0, 4);
        const mid = digits.slice(4, 7);
        const tail = digits.slice(7);
        return [head, mid, tail].filter(Boolean).join(" ");
    }
    return splitFromRight(digits, 3).join(" ");
}

function formatContactNumber(phone: string | undefined, countryCode: string | undefined): string {
    const rawPhone = (phone || "").trim();
    if (!rawPhone) return "";

    let ccDigits = (countryCode || "").replace(/\D/g, "");
    const phoneDigits = rawPhone.replace(/\D/g, "");
    if (!phoneDigits) return rawPhone;

    // Fallback when country code is missing but embedded in phone input.
    if (!ccDigits) {
        if (phoneDigits.length === 12 && phoneDigits.startsWith("91")) {
            ccDigits = "91";
        } else if (phoneDigits.length === 11 && phoneDigits.startsWith("1")) {
            ccDigits = "1";
        } else if (
            (phoneDigits.length === 12 || phoneDigits.length === 13) &&
            phoneDigits.startsWith("44")
        ) {
            ccDigits = "44";
        }
    }

    let nationalDigits = phoneDigits;
    if (ccDigits && phoneDigits.startsWith(ccDigits) && phoneDigits.length > ccDigits.length + 5) {
        nationalDigits = phoneDigits.slice(ccDigits.length);
    }

    const formattedNational = formatNationalNumber(nationalDigits, ccDigits);
    if (!ccDigits) return formattedNational || rawPhone;
    return `+${ccDigits} ${formattedNational}`.trim();
}

function toProfileData(resume: ResumeProfileData, fallback: ProfileData): ProfileData {
    const fullName = [resume.firstName, resume.lastName].filter(Boolean).join(" ").trim();
    const experienceParts = [resume.experienceYears && `${resume.experienceYears} years`, resume.experienceMonths && `${resume.experienceMonths} months`]
        .filter(Boolean)
        .join(", ");
    const salaryText = [resume.salaryCurrency, resume.salaryPerMonth].filter(Boolean).join(" ").trim();
    const links = resume.externalLinks ?? [];
    const normalizedExternalLinks = normalizeExternalLinksList(links);
    const inferredLinks = inferExternalLinks(links);
    const experienceYears = Number.parseInt(resume.experienceYears || "0", 10) || 0;
    const fallbackExperienceYears = experienceYears || 1;
    const experienceItems =
        resume.workExperience?.length
            ? resume.workExperience.map((item, idx) => ({
                id: `exp-${idx + 1}`,
                title: item.jobTitle || item.company || `Experience ${idx + 1}`,
                years: parseYearsFromDuration(item.duration, fallbackExperienceYears),
            }))
            : resume.projects?.length
                ? resume.projects.map((project, idx) => ({
                    id: `exp-project-${idx + 1}`,
                    title: project.customerCompany || `Experience ${idx + 1}`,
                    years: fallbackExperienceYears,
                }))
                : fallback.experienceItems;

    return {
        ...fallback,
        name: fullName || fallback.name,
        profileImageUrl: resume.profileImageUrl || fallback.profileImageUrl || "",
        title: resume.professionalTitle || fallback.title,
        location: resume.currentLocation || resume.preferredLocation || fallback.location,
        countryCode: resume.countryCode || fallback.countryCode,
        phone: resume.phone || fallback.phone,
        github: inferredLinks.github,
        linkedin: inferredLinks.linkedin,
        website: inferredLinks.website,
        externalLinks: normalizedExternalLinks,
        summary: resume.summary || fallback.summary,
        experience: experienceParts || fallback.experience,
        salary: salaryText || fallback.salary,
        profileStrength:
            typeof resume.profileStrength === "number" && Number.isFinite(resume.profileStrength)
                ? Math.max(0, Math.min(100, Math.round(resume.profileStrength)))
                : fallback.profileStrength,
        visibilityScore:
            typeof resume.visibilityScore === "number" && Number.isFinite(resume.visibilityScore)
                ? Math.max(0, Math.min(100, Math.round(resume.visibilityScore)))
                : fallback.visibilityScore,
        persona: resume.professionalTitle || fallback.persona,
        personalInfo: {
            dob: parseMaybeDate(resume.dob) || fallback.personalInfo.dob,
            gender: resume.gender || fallback.personalInfo.gender,
            emails: [resume.email, resume.altEmail].filter((v): v is string => Boolean(v?.trim())),
            nationality: resume.nationality || fallback.personalInfo.nationality,
            currentLocation: resume.currentLocation || fallback.personalInfo.currentLocation,
            preferredLocation: resume.preferredLocation || fallback.personalInfo.preferredLocation,
        },
        education:
            resume.education?.length
                ? resume.education.map((entry, idx) => ({
                    degree: entry.title || fallback.education[idx]?.degree || fallback.education[0]?.degree || "",
                    school: entry.institute || fallback.education[idx]?.school || fallback.education[0]?.school || "",
                    specialization:
                        entry.specialization ||
                        fallback.education[idx]?.specialization ||
                        fallback.education[0]?.specialization ||
                        "",
                    graduationYear:
                        entry.graduationYear ||
                        fallback.education[idx]?.graduationYear ||
                        fallback.education[0]?.graduationYear ||
                        "",
                    score: entry.score || fallback.education[idx]?.score || fallback.education[0]?.score || "",
                }))
                : fallback.education,
        languages:
            resume.languages?.map((lang, idx) => ({
                id: `lang-${idx + 1}`,
                name: lang.language || `Language ${idx + 1}`,
                read: lang.read || "Good",
                write: lang.write || "Good",
                speak: lang.speak || "Good",
            })) || fallback.languages,
        skills: resume.keySkills?.length ? resume.keySkills : fallback.skills,
        certifications:
            resume.certifications?.map((cert, idx) => ({
                id: `cert-${idx + 1}`,
                name: cert.name || "Certification",
                issuer: cert.issuing || "Issuer",
                issued: parseMaybeDate(cert.issueDate) || "Issued",
                expiry: cert.expirationDate ? parseMaybeDate(cert.expirationDate) : null,
            })) || fallback.certifications,
        experienceItems,
        tools: [],
        projects:
            resume.projects?.map((project, idx) => ({
                id: `project-${idx + 1}`,
                title: project.projectTitle || `Project ${idx + 1}`,
                company: project.customerCompany || "—",
                startDate: parseMaybeDate(project.projectStartDate) || "—",
                endDate: project.inProgress ? "Present" : parseMaybeDate(project.projectEndDate) || "—",
                description: project.projectDescription || "—",
                responsibilities: project.responsibilities
                    ? project.responsibilities.split(/\n|;|•/g).map((s) => s.trim()).filter(Boolean)
                    : ["—"],
            })) || fallback.projects,
    };
}

export default function MyProfilePage() {
    const router = useRouter();
    const isMobile = useIsMobile();
    const [profileData, setProfileData] = useState<ProfileData>(EMPTY_PROFILE);
    const [activeProfile, setActiveProfile] = useState(true);
    const [isUpdatingProfileStatus, setIsUpdatingProfileStatus] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [isDownloadingResume, setIsDownloadingResume] = useState(false);
    const [copiedKey, setCopiedKey] = useState("");
    const [mobileTab, setMobileTab] = useState<"about" | "professional" | "personal">("about");
    const [openSections, setOpenSections] = useState({
        skills: true,
        certifications: false,
        experience: false,
        tools: true,
        projects: true,
        personal: true,
        education: true,
        languages: false,
    });
    const PROFILE = profileData;
    const profileImageSrc = PROFILE.profileImageUrl?.trim() || "";
    const formattedPhone = formatContactNumber(PROFILE.phone, PROFILE.countryCode);

    const copyText = async (value: string, key: string) => {
        const text = value.trim();
        if (!text) return;
        try {
            if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else if (typeof document !== "undefined") {
                const temp = document.createElement("textarea");
                temp.value = text;
                temp.style.position = "fixed";
                temp.style.opacity = "0";
                document.body.appendChild(temp);
                temp.focus();
                temp.select();
                document.execCommand("copy");
                document.body.removeChild(temp);
            }
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey((prev) => (prev === key ? "" : prev)), 1200);
        } catch {
            // no-op
        }
    };

    useEffect(() => {
        const sessionProfile = readResumeProfile();
        if (sessionProfile?.profileImageUrl?.trim()) {
            setProfileData((prev) => ({
                ...prev,
                profileImageUrl: sessionProfile.profileImageUrl?.trim(),
            }));
        }

        const profileId = getProfileName();
        if (!profileId) return;
        void (async () => {
            try {
                const data = await getCandidateProfileData(profileId);
                setProfileData(toProfileData(data, EMPTY_PROFILE));
                if (typeof data.profileStatus === "string") {
                    setActiveProfile(data.profileStatus.trim().toLowerCase() === "active");
                }
            } catch {
                // Keep empty profile if API fails.
            }
        })();
    }, []);

  const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const navigateToEditProfile = (section?: string) => {
        const profileName = getProfileName();
        const params = new URLSearchParams();
        if (profileName?.trim()) {
            params.set("profile_name", profileName.trim());
        }
        if (section) {
            params.set("section", section);
        }
        const query = params.toString();
        router.push(query ? `/profile/create/basic-details?${query}` : "/profile/create/basic-details");
    };

    const handleEditProfile = () => {
        navigateToEditProfile();
    };

    const resolveProfileIdForActions = async (): Promise<string | null> => {
        const fromSession = getProfileName()?.trim();
        if (fromSession) return fromSession;

        try {
            const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
            const resolverRes = await fetch(resolverUrl.toString(), {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
            });
            if (!resolverRes.ok) return null;
            const resolverData = (await resolverRes.json()) as { profile_name?: unknown };
            if (typeof resolverData.profile_name === "string" && resolverData.profile_name.trim()) {
                const resolved = resolverData.profile_name.trim();
                setProfileName(resolved);
                return resolved;
            }
            return null;
        } catch {
            return null;
        }
    };

    const handleToggleActiveProfile = async () => {
        const profileName = await resolveProfileIdForActions();
        if (!profileName || isUpdatingProfileStatus) return;

        const previous = activeProfile;
        const nextValue = !previous;
        setActiveProfile(nextValue);
        try {
            setIsUpdatingProfileStatus(true);
            const updatedStatus = await setProfileStatus(profileName, nextValue);
            setActiveProfile(updatedStatus.trim().toLowerCase() === "active");
        } catch (error) {
            setActiveProfile(previous);
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : "Unable to update profile status right now.";
            if (typeof window !== "undefined") {
                window.alert(message);
            }
        } finally {
            setIsUpdatingProfileStatus(false);
        }
    };

    const handleDownloadProfile = async () => {
        const profileName = await resolveProfileIdForActions();
        if (!profileName || isDownloadingResume) return;

        try {
            setIsDownloadingResume(true);
            setShowDownloadMenu(false);
            const response = await downloadProfileResume(profileName);
            window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
        } catch (error) {
            const message = error instanceof Error && error.message.trim()
                ? error.message
                : "Unable to download profile right now.";
            if (typeof window !== "undefined") {
                window.alert(message);
            }
        } finally {
            setIsDownloadingResume(false);
        }
    };

    const renderAccordionHeader = (
        title: string,
        key: keyof typeof openSections,
    ) => (
        <button
            type="button"
            onClick={() => toggleSection(key)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-left"
        >
            <h2 className="text-[16px] font-semibold text-[#202939]">{title}</h2>
            {openSections[key] ? (
                <ChevronUp className="h-5 w-5 text-[#202939]" />
            ) : (
                <ChevronDown className="h-5 w-5 text-[#202939]" />
            )}
        </button>
    );

    const mobileAboutContent = (
        <>
            <section className="border border-[#DCE4F0] bg-white">
                <div className="h-24 bg-[linear-gradient(90deg,#DCE3FF_0%,#F3F6FF_45%,#DCF2FF_100%)]" />
                <div className="px-4 pb-4">
                    <div className="-mt-10 flex items-end justify-between gap-3">
                        <div className="h-[90px] w-[90px] overflow-hidden border-[3px] border-white bg-[#d9dee7] shadow-sm">
                            {profileImageSrc ? (
                                <img
                                    src={profileImageSrc}
                                    alt={PROFILE.name}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-[#d9dee7] text-[#5E7397]">
                                    <UserCircle2 className="h-9 w-9" />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleDownloadProfile}
                                className="flex h-10 w-10 items-center justify-center border border-[#D6DCEA] bg-white text-[#202939]"
                                aria-label="Download profile"
                                disabled={isDownloadingResume}
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={handleEditProfile}
                                className="bg-[#174EE7] px-5 py-2.5 text-[14px] font-medium text-white"
                            >
                                Edit Profile
                            </button>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#202939]">
                                {PROFILE.name}
                            </h1>
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#D6DCEA] bg-[#F8FAFD] px-2.5 py-1 text-[12px] text-[#202939]">
                                <CircleCheck className="h-4 w-4 fill-[#19c37d] text-white" />
                                Verified by SIXFE
                            </span>
                        </div>
                        <p className="mt-1 text-[16px] text-[#5E7397]">{PROFILE.title}</p>
                    </div>

                    <div className="mt-4 space-y-2.5 text-[14px] text-[#5E7397]">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{PROFILE.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{formattedPhone || PROFILE.phone}</span>
                            <button
                                type="button"
                                onClick={() => copyText(formattedPhone || PROFILE.phone, "phone-mobile")}
                                className="text-[#5E7397] transition-transform hover:scale-110 active:scale-95"
                                aria-label="Copy phone number"
                                title={copiedKey === "phone-mobile" ? "Copied" : "Copy"}
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                            <CopySuccessBadge show={copiedKey === "phone-mobile"} />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        {PROFILE.externalLinks.map((link) => (
                            <a
                                key={`${link.platform}:${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 border border-[#D6DCEA] px-4 py-2 text-[14px] text-[#202939]"
                            >
                                <Image width={18} height={18} src={platformIcon(link.platform)} alt="" />
                                {platformLabel(link.platform)}
                            </a>
                        ))}
                    </div>

                    <div className="mt-4 border-t border-[#E6ECF6] pt-4">
                        <p className="text-[13px] font-medium text-[#5E7397]">Summary</p>
                        <p className="mt-2 text-[14px] leading-8 text-[#202939]">{PROFILE.summary}</p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-[#E6ECF6] pt-4">
                        <div>
                            <p className="text-[13px] text-[#5E7397]">Experience</p>
                            <p className="mt-1 text-[16px] text-[#202939]">{PROFILE.experience}</p>
                        </div>
                        <div>
                            <p className="text-[13px] text-[#5E7397]">Salary / month</p>
                            <p className="mt-1 text-[16px] text-[#202939]">{PROFILE.salary}</p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );

    const mobileProfessionalContent = (
        <>
            <section className="border border-[#DCE4F0] bg-white">
                {renderAccordionHeader("Key Skills", "skills")}
                {openSections.skills ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="flex flex-wrap gap-2.5">
                            {PROFILE.skills.map((skill) => (
                                <Pill key={skill}>{skill}</Pill>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                {renderAccordionHeader("Certifications", "certifications")}
                {openSections.certifications ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="mb-4 border border-[#DCE8FF] bg-[#F5F8FF] px-3 py-3">
                            <div className="flex items-start gap-2">
                                <Settings2 className="mt-0.5 h-4 w-4 text-[#174EE7]" />
                                <div>
                                    <p className="text-[14px] leading-6 text-[#202939]">
                                        Add certifications recruiters expect before your next deployment.
                                    </p>
                                    <button type="button" className="mt-2 inline-flex items-center gap-1 text-[14px] font-semibold text-[#174EE7]">
                                        Recommended Learning
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {PROFILE.certifications.length ? (
                                PROFILE.certifications.map((certification) => (
                                    <div key={certification.id} className="border border-[#DCE4F0] px-4 py-4">
                                        <div className="flex items-start gap-3">
                                            <Award className="mt-0.5 h-5 w-5 text-[#66758A]" />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="text-[16px] font-medium leading-6 text-[#202939]">{certification.name}</p>
                                                    <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[#66758A]" />
                                                </div>
                                                <p className="mt-2 text-[14px] text-[#5E7397]">{certification.issuer}</p>
                                                <p className="mt-1 text-[14px] text-[#5E7397]">
                                                    Issued {certification.issued} - {certification.expiry ?? "No Expiration Date"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="border border-dashed border-[#DCE4F0] px-4 py-4 text-[14px] text-[#5E7397]">
                                    <p>No certifications added yet.</p>
                                    <button
                                        type="button"
                                        onClick={() => navigateToEditProfile("certifications")}
                                        className="mt-3 font-semibold text-[#174EE7]"
                                    >
                                        Add your certifications
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                {renderAccordionHeader("Experience", "experience")}
                {openSections.experience ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="space-y-3">
                            {PROFILE.experienceItems.map((item) => (
                                <div key={item.id} className="border border-[#DCE4F0] px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <CircleCheck className="mt-0.5 h-5 w-5 text-[#66758A]" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[16px] font-medium text-[#202939]">{item.title}</p>
                                                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[#66758A]" />
                                            </div>
                                            <p className="mt-2 text-[14px] text-[#5E7397]">{item.years} years experience</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                {renderAccordionHeader("Projects", "projects")}
                {openSections.projects ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="space-y-4">
                            {PROFILE.projects.map((project) => (
                                <article key={project.id} className="border border-[#DCE4F0] px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <Folder className="mt-0.5 h-5 w-5 text-[#66758A]" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[16px] font-medium text-[#202939]">{project.title}</p>
                                            <p className="mt-1 text-[14px] text-[#5E7397]">{project.company}</p>
                                            <p className="mt-2 text-[14px] text-[#5E7397]">
                                                {project.startDate} - {project.endDate}
                                            </p>

                                            <div className="mt-3 border-t border-[#E6ECF6] pt-3">
                                                <p className="text-[13px] font-medium text-[#5E7397]">Description</p>
                                                <p className="mt-2 text-[14px] leading-8 text-[#202939]">
                                                    {project.description}
                                                </p>
                                            </div>

                                            <div className="mt-3 border-t border-[#E6ECF6] pt-3">
                                                <p className="text-[13px] font-medium text-[#5E7397]">Responsibilities</p>
                                                <ul className="mt-2 list-disc pl-5 text-[14px] leading-8 text-[#202939]">
                                                    {project.responsibilities.map((responsibility) => (
                                                        <li key={responsibility}>{responsibility}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>
        </>
    );

    const mobilePersonalContent = (
        <>
            <section className="border border-[#DCE4F0] bg-white px-4 py-4">
                <div className="flex items-center gap-4">
                    <CircleProgress value={PROFILE.profileStrength} />
                    <div>
                        <p className="text-[16px] font-semibold text-[#202939]">Keep Profile Updated!</p>
                        <p className="mt-1 text-[14px] leading-6 text-[#5E7397]">
                            Higher profile strength improves recruiter visibility
                        </p>
                    </div>
                </div>
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                {renderAccordionHeader("Personal Information", "personal")}
                {openSections.personal ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <LabelValue label="DOB" value={PROFILE.personalInfo.dob} />
                            <LabelValue label="Gender" value={PROFILE.personalInfo.gender} />
                        </div>

                        <div className="mt-4">
                            <p className="text-[13px] font-medium text-[#5E7397]">Email(s)</p>
                            <div className="mt-2 space-y-2">
                                {PROFILE.personalInfo.emails.map((email) => (
                                    <div key={email} className="flex items-start gap-2">
                                        <p className="break-all text-[14px] text-[#202939]">{email}</p>
                                        <button
                                            type="button"
                                            onClick={() => copyText(email, `email-mobile-${email}`)}
                                            className="mt-0.5 shrink-0 text-[#5E7397] transition-transform hover:scale-110 active:scale-95"
                                            aria-label="Copy email"
                                            title={copiedKey === `email-mobile-${email}` ? "Copied" : "Copy"}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <CopySuccessBadge show={copiedKey === `email-mobile-${email}`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4">
                            <LabelValue label="Nationality" value={PROFILE.personalInfo.nationality} />
                        </div>

                        <div className="mt-4">
                            <LabelValue label="Current Location" value={PROFILE.personalInfo.currentLocation} />
                        </div>

                        <div className="mt-4">
                            <LabelValue label="Preferred Location" value={PROFILE.personalInfo.preferredLocation} />
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                {renderAccordionHeader("Education", "education")}
                {openSections.education ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="space-y-3">
                            {PROFILE.education.map((education, idx) => (
                                <div key={`education-mobile-${idx}`} className="border border-[#DCE4F0] px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <GraduationCap className="mt-0.5 h-5 w-5 text-[#66758A]" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[16px] font-medium text-[#202939]">{education.degree}</p>
                                            <p className="mt-2 text-[14px] text-[#5E7397]">{education.school}</p>
                                            <div className="mt-3 border-t border-[#E6ECF6] pt-3">
                                                <LabelValue label="Specialization" value={education.specialization} />
                                                <div className="mt-3">
                                                    <LabelValue label="Graduation Year" value={education.graduationYear} />
                                                </div>
                                                <div className="mt-3">
                                                    <LabelValue label="Score" value={education.score} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                {renderAccordionHeader("Languages", "languages")}
                {openSections.languages ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="space-y-3">
                            {PROFILE.languages.map((language) => (
                                <div key={language.id} className="border border-[#DCE4F0] px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <Languages className="mt-0.5 h-5 w-5 text-[#66758A]" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[16px] font-medium text-[#202939]">{language.name}</p>
                                            <div className="mt-3 grid grid-cols-3 gap-3">
                                                <LabelValue label="Read" value={language.read} />
                                                <LabelValue label="Write" value={language.write} />
                                                <LabelValue label="Speak" value={language.speak} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white px-4 py-4">
                <div>
                    <p className="text-[16px] font-semibold text-[#202939]">Visibility Score</p>
                    <p className="mt-1 text-[14px] leading-6 text-[#5E7397]">
                        You&apos;re well-positioned for relevant opportunities
                    </p>
                </div>
                <div className="mt-4">
                    <VisibilityScoreCard value={PROFILE.visibilityScore} className="rounded-none border-0 p-0 shadow-none" compact />
                </div>
            </section>
        </>
    );

    if (isMobile) {
        return (
            <CandidateAppShell showBottomNav={false}>
                <div className="min-h-full bg-[#EEF0F3] pb-[5.5rem]">
                    <main className="px-3.5 py-4">
                        <h1 className="mb-4 text-[22px] font-semibold tracking-[-0.02em] text-[#202939]">
                            My Profile
                        </h1>

                        {mobileTab === "about" ? (
                            <>
                                <div className="mb-3 border border-[#D6DCEA] bg-white px-3 py-2.5">
                                    <button type="button" className="flex w-full items-center justify-between text-[14px] text-[#202939]">
                                        <span>Persona: {PROFILE.persona}</span>
                                        {/* <ChevronDown className="h-4 w-4 text-[#7b8798]" /> */}
                                    </button>
                                </div>

                                <div className="mb-4 flex items-center justify-between px-1">
                                    <span className="text-[14px] text-[#202939]">Set as Active Profile</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={activeProfile}
                                        onClick={handleToggleActiveProfile}
                                        disabled={isUpdatingProfileStatus}
                                        className={`relative h-6 w-10 rounded-full transition ${activeProfile ? "bg-[#27C168]" : "bg-[#CBD5E1]"}`}
                                    >
                                        <span
                                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                                                activeProfile ? "left-[18px]" : "left-0.5"
                                            }`}
                                        />
                                    </button>
                                </div>
                                {mobileAboutContent}
                            </>
                        ) : null}

                        {mobileTab === "professional" ? mobileProfessionalContent : null}
                        {mobileTab === "personal" ? mobilePersonalContent : null}
                    </main>

                    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E6ECF6] bg-white pb-[env(safe-area-inset-bottom,0px)]">
                        <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-3">
                            <button
                                type="button"
                                onClick={() => setMobileTab("about")}
                                className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
                                    mobileTab === "about" ? "text-[#174EE7]" : "text-[#5E7397]"
                                }`}
                            >
                                <UserCircle2 className="h-6 w-6" strokeWidth={1.75} />
                                <span className={mobileTab === "about" ? "font-semibold" : ""}>About Me</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileTab("professional")}
                                className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
                                    mobileTab === "professional" ? "text-[#174EE7]" : "text-[#5E7397]"
                                }`}
                            >
                                <BriefcaseBusiness className="h-6 w-6" strokeWidth={1.75} />
                                <span className={mobileTab === "professional" ? "font-semibold" : ""}>Professional Info</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setMobileTab("personal")}
                                className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
                                    mobileTab === "personal" ? "text-[#174EE7]" : "text-[#5E7397]"
                                }`}
                            >
                                <IdCard className="h-6 w-6" strokeWidth={1.75} />
                                <span className={mobileTab === "personal" ? "font-semibold" : ""}>Personal Info</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </CandidateAppShell>
        );
    }

    return (
        <div className="min-h-screen bg-[#eef1f5]">
            <AppNavbar />

            <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-5 lg:px-6">
                <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-[#6b7280] sm:text-sm">
                    <Link href="/dashboard" className="flex items-center gap-1 hover:text-[#174ee7]">
                        <Home className="h-3 w-3" />
                        Dashboard
                    </Link>
                    <ChevronRight className="h-3 w-3" />
                    <span className="font-medium text-[#111827]">My Profile</span>
                </div>

                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <button
                        type="button"
                        className="flex w-full items-center justify-between gap-2 border border-[#d7dde7] bg-white px-3 py-2 text-sm text-[#4b5563] sm:w-auto"
                    >
                        <span>Persona: {PROFILE.persona}</span>
                        {/* <ChevronDown className="h-3.5 w-3.5 text-[#7b8798]" /> */}
                    </button>

                    <div className="flex w-full items-center justify-between gap-3 border border-[#d7dde7] bg-white px-3 py-2 text-sm sm:w-auto">
                        <span className="text-[12px] text-[#4b5563]">Set as Active Profile</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={activeProfile}
                            onClick={handleToggleActiveProfile}
                            disabled={isUpdatingProfileStatus}
                            className={`relative h-5 w-9 rounded-full transition ${activeProfile ? "bg-[#27c168]" : "bg-[#cbd5e1]"
                                }`}
                        >
                            <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${activeProfile ? "left-[18px]" : "left-0.5"
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_480px]">
                    <div className="space-y-4 xl:space-y-5">
                        <SectionCard className="overflow-hidden">
                            <div className="h-24 sm:h-28 bg-[linear-gradient(90deg,#d8dcff_0%,#f0f4ff_45%,#dff1ff_100%)]" />

                            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                                <div className="-mt-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                    <div className="flex flex-col items-start gap-4">
                                        <div className="h-[82px] w-[82px] overflow-hidden border-[3px] border-white bg-[#d9dee7] shadow-sm sm:h-[92px] sm:w-[92px]">
                                            {profileImageSrc ? (
                                                <img
                                                    src={profileImageSrc}
                                                    alt={PROFILE.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-[#d9dee7] text-[#5f6b7d]">
                                                    <UserCircle2 className="h-10 w-10" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="pb-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h1 className="text-2xl font-semibold leading-none text-[#111827] sm:text-[30px]">
                                                    {PROFILE.name}
                                                </h1>
                                                {PROFILE.verified ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-[#374151] sm:text-sm">
                                                        <CircleCheck className="h-3.5 w-3.5 fill-[#19c37d] text-white" />
                                                        Verified by SIXFE
                                                    </span>
                                                ) : null}
                                            </div>
                                            <p className="mt-2 text-sm text-[#5f6b7d] sm:text-base">{PROFILE.title}</p>
                                        </div>
                                    </div>

                                    <div className="relative flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowDownloadMenu(prev => !prev)}
                                            className="flex h-9 w-9 items-center justify-center border border-[#d7dde7] bg-white text-[#4b5563] transition hover:bg-[#f8fafc] sm:h-10 sm:w-10"
                                            aria-label="Download profile"
                                            disabled={isDownloadingResume}
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>

                                        {showDownloadMenu && (
                                            <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 shadow-lg z-50">
                                                <button
                                                    onClick={handleDownloadProfile}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                                    disabled={isDownloadingResume}
                                                >
                                                    {isDownloadingResume ? "Preparing..." : "Download PDF"}
                                                </button>

                                                <button
                                                    onClick={() => { setShowDownloadMenu(false) }}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-400"
                                                    disabled
                                                >
                                                    Download Word
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={handleEditProfile}
                                            className="bg-[#174ee7] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#103ec1] sm:px-5"
                                        >
                                            Edit Profile
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#5f6b7d]">
                                    <span className="inline-flex items-center gap-1.8">
                                        <MapPin className="h-5 w-5" />
                                        {PROFILE.location}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <Phone className="h-5 w-5" />
                                        {formattedPhone || PROFILE.phone}
                                        <button
                                            type="button"
                                            onClick={() => copyText(formattedPhone || PROFILE.phone, "phone-desktop")}
                                            className="text-[#5f6b7d] transition-transform hover:scale-110 active:scale-95"
                                            aria-label="Copy phone number"
                                            title={copiedKey === "phone-desktop" ? "Copied" : "Copy"}
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <CopySuccessBadge show={copiedKey === "phone-desktop"} />
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-[#111827] sm:text-[15px]">
                                    {PROFILE.externalLinks.map((link) => (
                                        <a
                                            key={`${link.platform}:${link.url}`}
                                            href={link.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 hover:bg-gray-200 p-2.5 border transition-colors"
                                        >
                                            <Image width={20} height={20} src={platformIcon(link.platform)} alt="" />
                                            {platformLabel(link.platform)}
                                        </a>
                                    ))}
                                </div>

                                <div className="mt-5 border-t border-[#e7ebf1] pt-4">
                                    <p className="text-xs font-medium text-[#7b8798] sm:text-[13px]">Summary</p>
                                    <p className="mt-2 text-sm leading-6 text-[#374151] sm:text-[15px]">{PROFILE.summary}</p>
                                </div>

                                <div className="mt-4 grid gap-4 border-t border-[#e7ebf1] pt-4 sm:grid-cols-2">
                                    <MiniInfo label="Experience" value={PROFILE.experience} />
                                    <MiniInfo label="Salary / Hour" value={PROFILE.salary} />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Key Skills">
                            <div className="flex flex-wrap gap-2 px-4 py-4 sm:px-5 sm:py-5">
                                {PROFILE.skills.map((skill) => (
                                    <Pill key={skill}>{skill}</Pill>
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Certifications">
                            <div className="px-4 py-4 sm:px-5 sm:py-5">
                                <div className="mb-3 flex flex-col gap-2 border border-[#dfe8ff] bg-[#f8fbff] px-3 py-3 text-sm text-[#5f6b7d] sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-2">
                                        <Settings2 className="h-3.5 w-3.5 text-[#174ee7]" />
                                        <span>Add certifications recruiters expect before your next deployment.</span>
                                    </div>
                                    <button type="button" className="text-sm font-semibold text-[#174ee7]">
                                        Recommended Learning
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {PROFILE.certifications.length ? (
                                        PROFILE.certifications.map((certification) => (
                                            <div key={certification.id} className="border border-[#dfe4ec] px-4 py-3.5">
                                                <div className="flex items-start gap-2.5">
                                                    <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-[#66758a]" />
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-sm font-medium text-[#111827] sm:text-[15px]">
                                                                {certification.name}
                                                            </p>
                                                            <ExternalLink className="h-3.5 w-3.5 text-[#66758a]" />
                                                        </div>
                                                        <p className="mt-1 text-sm text-[#66758a]">{certification.issuer}</p>
                                                        <p className="mt-1 text-sm text-[#7790c7]">
                                                            Issued {certification.issued} - {certification.expiry ?? "No Expiration Date"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="border border-dashed border-[#dfe4ec] px-4 py-5 text-sm text-[#5f6b7d]">
                                            <p>No certifications added yet.</p>
                                            <button
                                                type="button"
                                                onClick={() => navigateToEditProfile("certifications")}
                                                className="mt-3 text-sm font-semibold text-[#174ee7]"
                                            >
                                                Add your certifications
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Experience">
                            <div className="grid gap-3 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-2">
                                {PROFILE.experienceItems.map((item) => (
                                    <DetailTile
                                        key={item.id}
                                        icon={<CircleCheck className="h-4 w-4" />}
                                        title={item.title}
                                        subtitle={`${item.years} years experience`}
                                    />
                                ))}
                            </div>
                        </SectionCard>

                        <SectionCard title="Projects">
                            <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
                                {PROFILE.projects.map((project) => (
                                    <article key={project.id} className="border border-[#dfe4ec] px-4 py-4">
                                        <div className="flex items-start gap-2.5">
                                            <Folder className="mt-0.5 h-4 w-4 text-[#66758a]" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[#111827] sm:text-[15px]">{project.title}</p>
                                                <p className="mt-1 text-sm text-[#4f6fae]">{project.company}</p>
                                                <p className="mt-1 text-sm text-[#66758a]">
                                                    {project.startDate} - {project.endDate}
                                                </p>

                                                <div className="mt-3 border-t border-[#e7ebf1] pt-3">
                                                    <p className="text-xs font-medium text-[#7b8798] sm:text-[13px]">Description</p>
                                                    <p className="mt-2 text-sm leading-6 text-[#374151]">
                                                        {project.description}
                                                    </p>
                                                </div>

                                                <div className="mt-3 border-t border-[#e7ebf1] pt-3">
                                                    <p className="text-xs font-medium text-[#7b8798] sm:text-[13px]">Responsibilities</p>
                                                    <ul className="mt-2 list-disc pl-5 text-sm leading-6 text-[#374151]">
                                                        {project.responsibilities.map((responsibility) => (
                                                            <li key={responsibility}>{responsibility}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </SectionCard>
                    </div>

                    <div className="space-y-4">
                        <SectionCard className="px-4 py-3.5 sm:px-5">
                            <div className="flex items-center gap-3">
                                <CircleProgress value={PROFILE.profileStrength} />
                                <div>
                                    <p className="text-sm font-semibold text-[#111827] sm:text-[15px]">Keep Profile Updated!</p>
                                    <p className="mt-1 text-xs leading-5 text-[#7b8798] sm:text-sm">
                                        Higher profile strength improves recruiter visibility
                                    </p>
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Personal Information">
                            <div className="space-y-4 px-4 py-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <LabelValue label="DOB" value={PROFILE.personalInfo.dob} />
                                    <LabelValue label="Gender" value={PROFILE.personalInfo.gender} />
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-[#7b8798] sm:text-[13px]">Email(s)</p>
                                    <div className="mt-1 space-y-1.5">
                                        {PROFILE.personalInfo.emails.map((email) => (
                                            <div key={email} className="flex items-start gap-1.5">
                                                <p className="text-sm font-medium leading-5 text-[#111827] sm:text-[15px] break-all">{email}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => copyText(email, `email-desktop-${email}`)}
                                                    className="mt-0.5 text-[#7b8798] transition-transform hover:scale-110 active:scale-95"
                                                    aria-label="Copy email"
                                                    title={copiedKey === `email-desktop-${email}` ? "Copied" : "Copy"}
                                                >
                                                    <Copy className="h-3.5 w-3.5" />
                                                </button>
                                                <CopySuccessBadge show={copiedKey === `email-desktop-${email}`} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <LabelValue label="Nationality" value={PROFILE.personalInfo.nationality} />

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <LabelValue label="Current Location" value={PROFILE.personalInfo.currentLocation} />
                                    <LabelValue
                                        label="Preferred Location"
                                        value={PROFILE.personalInfo.preferredLocation}
                                    />
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Education">
                            <div className="px-4 py-4 sm:px-5 sm:py-5">
                                <div className="space-y-3">
                                    {PROFILE.education.map((education, idx) => (
                                        <div key={`education-desktop-${idx}`} className="border border-[#dfe4ec] px-4 py-4">
                                            <div className="flex items-start gap-2.5">
                                                <GraduationCap className="mt-0.5 h-4 w-4 text-[#66758a]" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-[#111827] sm:text-[15px]">
                                                        {education.degree}
                                                    </p>
                                                    <p className="mt-1 text-sm text-[#4f6fae]">{education.school}</p>

                                                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                                        <LabelValue
                                                            label="Specialization"
                                                            value={education.specialization}
                                                        />
                                                        <LabelValue
                                                            label="Graduation Year"
                                                            value={education.graduationYear}
                                                        />
                                                    </div>

                                                    <div className="mt-3">
                                                        <LabelValue label="Score" value={education.score} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </SectionCard>

                        <SectionCard title="Languages">
                            <div className="space-y-3 px-4 py-4 sm:px-5 sm:py-5">
                                {PROFILE.languages.map((language) => (
                                    <div key={language.id} className="border border-[#dfe4ec] px-4 py-4">
                                        <div className="flex items-start gap-2.5">
                                            <Languages className="mt-0.5 h-4 w-4 text-[#66758a]" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-[#111827] sm:text-[15px]">{language.name}</p>
                                                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                                    <LabelValue label="Read" value={language.read} />
                                                    <LabelValue label="Write" value={language.write} />
                                                    <LabelValue label="Speak" value={language.speak} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </SectionCard>

                        <VisibilityScoreCard
                            value={PROFILE.visibilityScore}
                            className="rounded-none p-4"
                            compact
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
