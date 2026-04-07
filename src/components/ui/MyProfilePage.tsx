"use client";

import { useState } from "react";
import Link from "next/link";
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
import { PROFILE } from "../profile-page/mockData";
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

export default function MyProfilePage() {
    const isMobile = useIsMobile();
    const [activeProfile, setActiveProfile] = useState(true);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
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

    const toggleSection = (key: keyof typeof openSections) => {
        setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
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
                            <img
                                src="https://i.pravatar.cc/148?img=12"
                                alt={PROFILE.name}
                                className="h-full w-full object-cover"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="flex h-10 w-10 items-center justify-center border border-[#D6DCEA] bg-white text-[#202939]"
                                aria-label="Download profile"
                            >
                                <Download className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
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
                            <span>{PROFILE.phone}</span>
                            <Copy className="h-4 w-4" />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <a href={PROFILE.github} className="inline-flex items-center gap-2 border border-[#D6DCEA] px-4 py-2 text-[14px] text-[#202939]">
                            <Image width={18} height={18} src="/icons/github-logo.svg" alt="" />
                            Github
                        </a>
                        <a href={PROFILE.linkedin} className="inline-flex items-center gap-2 border border-[#D6DCEA] px-4 py-2 text-[14px] text-[#202939]">
                            <Image width={18} height={18} src="/icons/linkedin-logo.svg" alt="" />
                            LinkedIn
                        </a>
                        <a href={PROFILE.website} className="inline-flex items-center gap-2 border border-[#D6DCEA] px-4 py-2 text-[14px] text-[#202939]">
                            <Image width={18} height={18} src="/icons/web-logo.svg" alt="" />
                            Website
                        </a>
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
                            {PROFILE.certifications.map((certification) => (
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
                            ))}
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
                {renderAccordionHeader("Tools", "tools")}
                {openSections.tools ? (
                    <div className="border-t border-[#E6ECF6] px-4 py-4">
                        <div className="space-y-3">
                            {PROFILE.tools.map((tool) => (
                                <div key={tool.id} className="border border-[#DCE4F0] px-4 py-4">
                                    <div className="flex items-start gap-3">
                                        <Wrench className="mt-0.5 h-5 w-5 text-[#66758A]" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-[16px] font-medium text-[#202939]">{tool.name}</p>
                                                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[#66758A]" />
                                            </div>
                                            <p className="mt-2 text-[14px] text-[#5E7397]">{tool.years} years experience</p>
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
                                        <Copy className="mt-0.5 h-4 w-4 shrink-0 text-[#5E7397]" />
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
                        <div className="border border-[#DCE4F0] px-4 py-4">
                            <div className="flex items-start gap-3">
                                <GraduationCap className="mt-0.5 h-5 w-5 text-[#66758A]" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[16px] font-medium text-[#202939]">{PROFILE.education.degree}</p>
                                    <p className="mt-2 text-[14px] text-[#5E7397]">{PROFILE.education.school}</p>
                                    <div className="mt-3 border-t border-[#E6ECF6] pt-3">
                                        <LabelValue label="Specialization" value={PROFILE.education.specialization} />
                                        <div className="mt-3">
                                            <LabelValue label="Graduation Year" value={PROFILE.education.graduationYear} />
                                        </div>
                                        <div className="mt-3">
                                            <LabelValue label="Score" value={PROFILE.education.score} />
                                        </div>
                                    </div>
                                </div>
                            </div>
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
                                        <ChevronDown className="h-4 w-4 text-[#7b8798]" />
                                    </button>
                                </div>

                                <div className="mb-4 flex items-center justify-between px-1">
                                    <span className="text-[14px] text-[#202939]">Set as Active Profile</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={activeProfile}
                                        onClick={() => setActiveProfile((value) => !value)}
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
                        <ChevronDown className="h-3.5 w-3.5 text-[#7b8798]" />
                    </button>

                    <div className="flex w-full items-center justify-between gap-3 border border-[#d7dde7] bg-white px-3 py-2 text-sm sm:w-auto">
                        <span className="text-[12px] text-[#4b5563]">Set as Active Profile</span>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={activeProfile}
                            onClick={() => setActiveProfile((value) => !value)}
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
                                            <img
                                                src="https://i.pravatar.cc/148?img=12"
                                                alt={PROFILE.name}
                                                className="h-full w-full object-cover"
                                            />
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
                                        >
                                            <Download className="h-4 w-4" />
                                        </button>

                                        {showDownloadMenu && (
                                            <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 shadow-lg z-50">
                                                <button
                                                    onClick={() => { setShowDownloadMenu(false) }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                                >
                                                    Download PDF
                                                </button>

                                                <button
                                                    onClick={() => { setShowDownloadMenu(false) }}
                                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                                >
                                                    Download Word
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            type="button"
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
                                        {PROFILE.phone}
                                        <Copy className="h-4 w-4" />
                                    </span>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 text-sm font-medium text-[#111827] sm:text-[15px]">
                                    <a href={PROFILE.github} className="inline-flex items-center gap-1.5 hover:bg-gray-200 p-2.5 border transition-colors">
                                        {/* <Globe className="h-4 w-4" /> */}
                                        <Image
                                            width={20}
                                            height={20}
                                            src="/icons/github-logo.svg"
                                            alt=""
                                        />
                                        Github
                                    </a>
                                    <a
                                        href={PROFILE.linkedin}
                                        className="inline-flex items-center gap-1.5 hover:bg-gray-200 p-2.5 border transition-colors"
                                    >
                                        {/* <Linkedin className="h-4 w-4 text-[#0a66c2]" /> */}
                                        <Image
                                            width={20}
                                            height={20}
                                            src="/icons/linkedin-logo.svg"
                                            alt=""
                                        />
                                        LinkedIn
                                    </a>
                                    <a href={PROFILE.website} className="inline-flex items-center gap-1.5 hover:bg-gray-200 p-2.5 border transition-colors">
                                        {/* <Globe className="h-4 w-4" /> */}
                                        <Image
                                            width={20}
                                            height={20}
                                            src="/icons/web-logo.svg"
                                            alt=""
                                        />
                                        Website
                                    </a>
                                </div>

                                <div className="mt-5 border-t border-[#e7ebf1] pt-4">
                                    <p className="text-xs font-medium text-[#7b8798] sm:text-[13px]">Summary</p>
                                    <p className="mt-2 text-sm leading-6 text-[#374151] sm:text-[15px]">{PROFILE.summary}</p>
                                </div>

                                <div className="mt-4 grid gap-4 border-t border-[#e7ebf1] pt-4 sm:grid-cols-2">
                                    <MiniInfo label="Experience" value={PROFILE.experience} />
                                    <MiniInfo label="Salary / month" value={PROFILE.salary} />
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
                                    {PROFILE.certifications.map((certification) => (
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
                                    ))}
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

                        <SectionCard title="Tools">
                            <div className="grid gap-3 px-4 py-4 sm:px-5 sm:py-5 md:grid-cols-2">
                                {PROFILE.tools.map((tool) => (
                                    <DetailTile
                                        key={tool.id}
                                        icon={<Settings2 className="h-4 w-4" />}
                                        title={tool.name}
                                        subtitle={`${tool.years} years experience`}
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
                                                <Copy className="mt-0.5 h-3.5 w-3.5 text-[#7b8798]" />
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
                                <div className="border border-[#dfe4ec] px-4 py-4">
                                    <div className="flex items-start gap-2.5">
                                        <GraduationCap className="mt-0.5 h-4 w-4 text-[#66758a]" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-[#111827] sm:text-[15px]">
                                                {PROFILE.education.degree}
                                            </p>
                                            <p className="mt-1 text-sm text-[#4f6fae]">{PROFILE.education.school}</p>

                                            <div className="mt-3 grid gap-4 sm:grid-cols-2">
                                                <LabelValue
                                                    label="Specialization"
                                                    value={PROFILE.education.specialization}
                                                />
                                                <LabelValue
                                                    label="Graduation Year"
                                                    value={PROFILE.education.graduationYear}
                                                />
                                            </div>

                                            <div className="mt-3">
                                                <LabelValue label="Score" value={PROFILE.education.score} />
                                            </div>
                                        </div>
                                    </div>
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
