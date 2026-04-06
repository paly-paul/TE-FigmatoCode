"use client";

import { useState } from "react";
import Link from "next/link";
import {
    BriefcaseBusiness,
    ChevronDown,
    ChevronRight,
    CircleCheck,
    Copy,
    Download,
    ExternalLink,
    Folder,
    Globe,
    GraduationCap,
    Home,
    Languages,
    Linkedin,
    MapPin,
    Phone,
    Settings2,
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

export default function MyProfilePage() {
    const [activeProfile, setActiveProfile] = useState(true);

    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

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
