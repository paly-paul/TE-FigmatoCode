"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
    Chart,
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip
} from "chart.js";

import {
    Home,
    ChevronDown,
    ChevronRight,
    ThumbsUp,
    X,
    Plus,
    TrendingUp,
    ExternalLink,
    Lightbulb,
    Flame,
    BookOpen,
    Newspaper
} from "lucide-react";
import AppNavbar from "../profile/AppNavbar";
import CandidateAppShell from "../mobile/CandidateAppShell";
import ProfileVisibilityInfoDrawer from "./ProfileVisibilityInfoDrawer";
import RewardPointsInfoDrawer from "./RewardPointsInfoDrawer";
import { useIsMobile } from "@/lib/useResponsive";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface CourseCard {
    id: number;
    title: string;
    provider: string;
    category: string;
    image: string;
    pointsRequired: number;
}

interface NewsItem {
    id: number;
    title: string;
    description: string;
    image: string;
    timestamp: string;
    source?: string;
}

interface ProfileRank {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
}

export default function VisibilityScore() {
    const isMobile = useIsMobile();
    const [visibilityInfoOpen, setVisibilityInfoOpen] = useState(false);
    const [rewardPointsInfoOpen, setRewardPointsInfoOpen] = useState(false);
    const [mobileActiveTab, setMobileActiveTab] = useState<"overview" | "insights">("overview");
    const [mobileSkillGapsOpen, setMobileSkillGapsOpen] = useState(true);
    const [mobileLearningsOpen, setMobileLearningsOpen] = useState(true);
    const [mobileCatchupOpen, setMobileCatchupOpen] = useState(true);
    const desktopActivityChartRef = useRef<HTMLCanvasElement>(null);
    const mobileActivityChartRef = useRef<HTMLCanvasElement>(null);

    const visibilityScore = 80;
    const rewardPoints = 280;

    const courses: CourseCard[] = [
        {
            id: 1,
            title: "Learn SCADA from Scratch - Design, Program and Interface",
            provider: "Udemy",
            category: "SCADA System",
            image: "/images/dashboard/recommended-1.png",
            pointsRequired: 50
        },
        {
            id: 2,
            title: "Learn SCADA from Scratch - Design, Program and Interface",
            provider: "Udemy",
            category: "SCADA System",
            image: "/images/dashboard/recommended-2.png",
            pointsRequired: 48
        },
        {
            id: 3,
            title: "Learn SCADA from Scratch - Design, Program and Interface",
            provider: "Udemy",
            category: "SCADA System",
            image: "/images/dashboard/recommended-3.png",
            pointsRequired: 40
        }
    ];

    const newsItems: NewsItem[] = [
        {
            id: 1,
            title: "EU proposes to broaden sanctions on Russian crude in sweeping new package",
            description: "",
            image: "/images/dashboard/catchup-1.png",
            timestamp: "1 hr ago"
        },
        {
            id: 2,
            title: "Chinese solar stocks rally on reports Musk's Space X, Tesla staff visited...",
            description: "",
            image: "/images/dashboard/catchup-2.png",
            timestamp: "1 hr ago"
        },
        {
            id: 3,
            title: "Oil slides in volatile trading as upcoming U.S.-Iran talks revive de-escalation...",
            description: "",
            image: "/images/dashboard/catchup-3.png",
            timestamp: "3 hr ago"
        }
    ];

    const profileRanks: ProfileRank[] = [
        {
            id: "specialist",
            title: "Skill Specialist",
            description: "Top 10% skills",
            icon: <Image
                src="/icons/skill-specialist.svg"
                width={30}
                height={30}
                alt=""
            />,
            color: "text-green-700",
            bgColor: "bg-green-50"
        },
        {
            id: "seeker",
            title: "Active Seeker",
            description: "Weekly activity streak",
            icon: <Image
                src="/icons/rocket.svg"
                width={30}
                height={30}
                alt=""
            />,
            color: "text-purple-700",
            bgColor: "bg-purple-50"
        },
        {
            id: "magnet",
            title: "Recruiter Magnet",
            description: "High recruiter interest",
            icon: <Image
                src="/icons/magnet.svg"
                width={30}
                height={30}
                alt=""
            />,
            color: "text-blue-700",
            bgColor: "bg-blue-50"
        }
    ];

    const missingSkills = [
        "Microgrid design",
        "Energy data analytics",
        "Energy Efficiency Optimization"
    ];

    const trendingSkills = [
        "Rig Maintenance",
        "HVAC Systems",
        "Hydraulic Systems"
    ];

    const activityData = [
        { month: "Jan", days: 14 },
        { month: "Feb", days: 16 },
        { month: "Mar", days: 20 },
        { month: "Apr", days: 21 },
        { month: "May", days: 18 },
        { month: "Jun", days: 10 }
    ];

    useEffect(() => {
        const activeCanvas = isMobile
            ? mobileActiveTab === "insights"
                ? mobileActivityChartRef.current
                : null
            : desktopActivityChartRef.current;

        if (!activeCanvas) return;

        const chart = new Chart(activeCanvas, {
            type: "bar",
            data: {
                labels: activityData.map(d => d.month),
                datasets: [
                    {
                        data: activityData.map(d => d.days),
                        backgroundColor: "#2563EB",
                        borderRadius: { topLeft: 5, topRight: 5 } as any,
                        borderSkipped: "bottom",
                        barPercentage: 0.55,
                        categoryPercentage: 0.75
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.parsed.y} days`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            color: "#6b7280",
                            font: { size: 11 }
                        }
                    },
                    y: {
                        min: 0,
                        max: 25,
                        border: { display: false },
                        grid: { color: "#f3f4f6" },
                        ticks: {
                            stepSize: 5,
                            color: "#9ca3af",
                            font: { size: 10 }
                        }
                    }
                }
            }
        });

        return () => chart.destroy();
    }, [isMobile, mobileActiveTab]);

    const visibilityInner = (
        <>
            {/* BREADCRUMB — desktop */}
            <div className="hidden lg:block max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Home size={16} className="text-blue-600" />
                    <span className="text-blue-600 text-sm">Dashboard</span>
                    <ChevronRight size={16} />
                    <span className="text-gray-900 font-medium text-sm">Visibility Score</span>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
                    {/* LEFT COLUMN - Main Content */}
                    <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                        {/* PROFILE VISIBILITY SCORE HERO */}
                        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 rounded-xl p-6 sm:p-8 overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 h-48 sm:w-64 sm:h-64 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
                            <div className="absolute bottom-0 right-20 sm:right-32 w-32 h-32 sm:w-48 sm:h-48 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>

                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="flex-1">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
                                        Profile Visibility Score
                                    </h1>
                                    <p className="text-blue-100 text-base sm:text-base mb-6 max-w-md">
                                        Improve your visibility to appear in more recruiter searches.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setVisibilityInfoOpen(true)}
                                        className="bg-white text-blue-700 px-6 py-2.5 rounded-lg font-medium hover:bg-blue-50 transition-colors text-base sm:text-base"
                                    >
                                        Know More
                                    </button>
                                </div>

                                <div className="bg-white rounded-full w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center shadow-xl">
                                    <div className="text-center">
                                        <div className="text-4xl sm:text-5xl font-bold text-green-600">
                                            {visibilityScore}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SKILL GAPS */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
                            <div className="mb-4">
                                <h2 className="text-xl sm:text-xl font-semibold mb-1">Skill Gaps</h2>
                                <p className="text-sm text-gray-600">Based on jobs you are targeting</p>
                            </div>

                            <div className="bg-[#FFF3D8] border border-[#FFB923] rounded-lg p-4 sm:p-4 mb-6 flex items-start sm:items-center gap-3">
                                <Image
                                    width={22}
                                    height={22}
                                    src="/icons/tip.svg"
                                    alt=""
                                    className="flex-shrink-0"
                                />
                                <p className="text-sm sm:text-sm">
                                    You're missing 3 of the top 10 in-demand skills for your target roles.
                                </p>
                            </div>

                            {/* Missing Skills */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-5 h-5 rounded-full border-2 border-red-500 flex items-center justify-center flex-shrink-0">
                                        <X size={12} className="text-red-500" />
                                    </div>
                                    <h3 className="font-semibold text-gray-900 text-base sm:text-base">Missing Skills</h3>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {missingSkills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm sm:text-sm border border-gray-200"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                                <button className="flex items-center gap-2 text-sm sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2.5 hover:bg-gray-50">
                                    <span className="text-lg leading-none">+</span>
                                    Add to Profile
                                </button>
                            </div>

                            {/* Trending Skills */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <TrendingUp size={20} className="text-yellow-600 flex-shrink-0" />
                                    <h3 className="font-semibold text-gray-900 text-base sm:text-base">Trending Skills</h3>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {trendingSkills.map((skill, index) => (
                                        <span
                                            key={index}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm sm:text-sm border border-gray-200"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                                <button className="flex items-center gap-2 text-sm sm:text-sm font-medium text-gray-700 border border-gray-300 rounded-lg px-4 py-2.5 hover:bg-gray-50">
                                    <span className="text-lg leading-none">+</span>
                                    Add to Profile
                                </button>
                            </div>
                        </div>

                        {/* RECOMMENDED LEARNINGS */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
                            <div className="mb-6">
                                <h2 className="text-xl sm:text-xl font-semibold mb-1">Recommended Learnings</h2>
                                <p className="text-sm text-gray-600">
                                    Boost your chances of faster redeployment with new certifications
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {courses.map((course) => (
                                    <div
                                        key={course.id}
                                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                                    >
                                        <div className="relative h-40 sm:h-40 bg-gray-200">
                                            <img
                                                src={course.image}
                                                alt={course.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="p-4 flex flex-col">
                                            <span className="text-xs text-purple-600 font-medium px-3 py-2 bg-[#F0EEFE] rounded-full self-start">
                                                {course.category}
                                            </span>
                                            <div className="flex items-center gap-1 text-sm text-gray-600 mt-2.5 mb-3">
                                                <span>{course.provider}</span>
                                                <ExternalLink size={15} />
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-900 mb-4 line-clamp-2">
                                                {course.title}
                                            </h3>
                                            <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-lg py-2.5 text-sm">
                                                <Image
                                                    width={16}
                                                    height={16}
                                                    src="/icons/square-unlock.svg"
                                                    alt=""
                                                />
                                                <span className="text-gray-700">Unlock with {course.pointsRequired} pts</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* WEEKLY CATCHUP */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
                            <div className="mb-6">
                                <h2 className="text-xl sm:text-xl font-semibold mb-1">Weekly Catchup</h2>
                                <p className="text-sm text-gray-600">Latest happenings relevant to you</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-4">
                                {newsItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <h3 className="text-sm font-medium text-gray-900 line-clamp-2">
                                                    {item.title}
                                                </h3>
                                                <ExternalLink size={14} className="text-gray-400 flex-shrink-0 mt-1" />
                                            </div>
                                            <p className="text-xs text-gray-500">{item.timestamp}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN - Sidebar */}
                    <div className="space-y-4 lg:space-y-6">
                        {/* REWARD POINTS */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-5">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Image
                                        src="/icons/reward-points.svg"
                                        width={44}
                                        height={44}
                                        alt=""
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 mb-1 text-base sm:text-base">Reward Points</h3>
                                    <p className="text-sm text-gray-600">
                                        Redeem your reward points to access courses.
                                    </p>
                                </div>
                                <div className="flex items-center gap-x-1 text-right bg-[#F3F8FE] text-[#033CE5] px-3 py-3 rounded-full flex-shrink-0">
                                    <div className="text-xl font-bold">{rewardPoints}</div>
                                    <div className="text-xs">pts</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRewardPointsInfoOpen(true)}
                                className="border border-gray-300 rounded-lg p-3.5 text-sm font-medium hover:bg-gray-50"
                            >
                                Know More
                            </button>
                        </div>

                        {/* SIXFE VERIFIED PROFILE */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-5">
                            <div className="flex items-start gap-3">
                                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Image
                                        width={44}
                                        height={44}
                                        src="/icons/verified.svg"
                                        alt=""
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1 text-base sm:text-base">SIXFE Verified Profile</h3>
                                    <p className="text-sm text-gray-600">
                                        You earned +10 visibility points.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* PROFILE RANK */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-900 mb-1 text-base sm:text-base">Profile Rank</h3>
                                <p className="text-sm text-gray-600">
                                    Your profile rank across skills, activity, and recruiter interest.
                                </p>
                            </div>

                            <div className="space-y-3">
                                {profileRanks.map((rank) => (
                                    <div
                                        key={rank.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0"
                                    >
                                        <div className={`flex items-center gap-2 sm:gap-3 ${rank.bgColor} p-2 rounded-full w-fit`}>
                                            <div className={rank.color}>
                                                {rank.icon}
                                            </div>
                                            <span className={`text-sm font-medium ${rank.color} pr-2`}>
                                                {rank.title}
                                            </span>
                                        </div>
                                        <span className="text-sm text-gray-600 pl-2 sm:pl-0">
                                            {rank.description}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACTIVITY CHART */}
                        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-5">
                            <div className="mb-4">
                                <h3 className="font-semibold text-gray-900 mb-1 text-base sm:text-base">Activity</h3>
                                <p className="text-sm text-gray-600">Days Active - Monthly</p>
                            </div>

                            {/* Chart.js Bar Chart */}
                            <div className="mb-4" style={{ position: "relative", width: "100%", height: "180px" }}>
                                <canvas ref={desktopActivityChartRef}></canvas>
                            </div>

                            {/* Activity Message */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                                <ThumbsUp size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-black">
                                    Your days active is above Average when compared to users with similar skill set.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <ProfileVisibilityInfoDrawer
                open={visibilityInfoOpen}
                onClose={() => setVisibilityInfoOpen(false)}
            />

            <RewardPointsInfoDrawer
                open={rewardPointsInfoOpen}
                onClose={() => setRewardPointsInfoOpen(false)}
            />
        </>
    );

    const mobileInsightsContent = (
        <>
            <section className="border border-[#DCE4F0] bg-white px-4 py-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4DB]">
                        <Image src="/icons/reward-points.svg" width={26} height={26} alt="" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-[16px] font-semibold text-[#202939]">Reward Points</h3>
                                <p className="mt-1 max-w-[150px] text-[14px] leading-6 text-[#5E7397]">
                                    Redeem your reward points to access courses.
                                </p>
                            </div>
                            <div className="rounded-full bg-[#F3F7FF] px-4 py-2 text-[14px] font-medium text-[#1447E6]">
                                {rewardPoints} pts
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setRewardPointsInfoOpen(true)}
                            className="mt-4 border border-[#D6DCEA] bg-white px-4 py-2.5 text-[14px] font-medium text-[#202939]"
                        >
                            Know More
                        </button>
                    </div>
                </div>
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white px-4 py-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAFBF0]">
                        <Image width={26} height={26} src="/icons/verified.svg" alt="" />
                    </div>
                    <div>
                        <h3 className="text-[16px] font-semibold text-[#202939]">SIXFE Verified Profile</h3>
                        <p className="mt-1 text-[14px] text-[#5E7397]">You earned +10 visibility points.</p>
                    </div>
                </div>
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                <div className="border-b border-[#E6ECF6] px-4 py-4">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#202939]">Profile Rank</h3>
                    <p className="mt-1 text-[14px] leading-6 text-[#5E7397]">
                        Your profile rank across skills, activity, and recruiter interest.
                    </p>
                </div>
                <div className="px-4">
                    {profileRanks.map((rank, index) => (
                        <div
                            key={rank.id}
                            className={`flex items-center justify-between gap-3 py-4 ${
                                index !== profileRanks.length - 1 ? "border-b border-[#E6ECF6]" : ""
                            }`}
                        >
                            <div className={`flex items-center gap-2 rounded-full px-3 py-2 ${rank.bgColor}`}>
                                <div className={rank.color}>{rank.icon}</div>
                                <span className={`text-[14px] font-medium ${rank.color}`}>{rank.title}</span>
                            </div>
                            <span className="text-[14px] text-[#5E7397]">{rank.description}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-4 border border-[#DCE4F0] bg-white">
                <div className="border-b border-[#E6ECF6] px-4 py-4">
                    <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#202939]">Activity</h3>
                    <p className="mt-1 text-[14px] text-[#5E7397]">Days Active - Monthly</p>
                </div>
                <div className="px-4 py-4">
                    <div className="mb-4" style={{ position: "relative", width: "100%", height: "180px" }}>
                        <canvas ref={mobileActivityChartRef}></canvas>
                    </div>
                    <div className="flex items-start gap-2 border border-[#CBEFD5] bg-[#ECFFF1] px-3 py-3">
                        <ThumbsUp size={16} className="mt-0.5 shrink-0 text-[#16A34A]" />
                        <p className="text-[14px] leading-6 text-[#202939]">
                            Your days active is above Average when compared to users with similar skill set.
                        </p>
                    </div>
                </div>
            </section>
        </>
    );

    const mobileVisibilityInner = (
        <div className="min-h-full bg-[#EEF0F3] pb-[5.5rem]">
            <main className="px-3.5 py-4">
                <div className="mb-4">
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#202939]">
                        Visibility Score
                    </h1>
                </div>

                {mobileActiveTab === "overview" ? (
                    <>
                <section className="relative overflow-hidden rounded-[2px] bg-[#1843DE] px-5 py-7 text-white">
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute -right-10 -top-6 h-36 w-36 rounded-full border border-white/25" />
                        <div className="absolute right-8 top-10 h-28 w-28 rounded-full border border-white/20" />
                        <div className="absolute left-24 top-4 h-24 w-24 rounded-full border border-white/15" />
                        <div className="absolute bottom-[-30px] left-1/2 h-40 w-40 -translate-x-1/2 rounded-full border border-white/15" />
                    </div>

                    <div className="relative z-10">
                        <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-[#E9FBEA]">
                            <span className="text-[26px] font-semibold text-[#12A150]">{visibilityScore}</span>
                        </div>

                        <h2 className="max-w-[240px] text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]">
                            Profile Visibility Score
                        </h2>
                        <p className="mt-3 max-w-[260px] text-[16px] leading-6 text-white/90">
                            Improve your visibility to appear in more recruiter searches.
                        </p>
                        <button
                            type="button"
                            onClick={() => setVisibilityInfoOpen(true)}
                            className="mt-5 border border-white/60 px-5 py-2.5 text-[14px] font-medium text-white transition hover:bg-white/10"
                        >
                            Know More
                        </button>
                    </div>
                </section>

                <section className="mt-4 border border-[#DCE4F0] bg-white">
                    <button
                        type="button"
                        onClick={() => setMobileSkillGapsOpen((current) => !current)}
                        className="flex w-full items-start justify-between px-4 py-4 text-left"
                    >
                        <div>
                            <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#202939]">Skill Gaps</h3>
                            <p className="text-[14px] leading-5 text-[#5E7397]">Based on jobs you are targeting</p>
                        </div>
                        <ChevronDown
                            className={`mt-1 h-5 w-5 text-[#202939] transition-transform ${
                                mobileSkillGapsOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {mobileSkillGapsOpen ? (
                        <div className="border-t border-[#E6ECF6] px-3.5 py-4">
                            <div className="mb-4 flex items-start gap-3 border border-[#FFB923] bg-[#FFF9ED] px-3.5 py-3">
                                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#FFB200]" />
                                <p className="text-[14px] leading-6 text-[#202939]">
                                    You&apos;re missing 3 of the top 10 in-demand skills for your target roles.
                                </p>
                            </div>

                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-[#FF4D4F]">
                                        <X className="h-3 w-3 text-[#FF4D4F]" />
                                    </div>
                                    <h4 className="text-[16px] font-medium text-[#202939]">Missing Skills</h4>
                                </div>
                                <div className="mb-4 flex flex-wrap gap-2.5">
                                    {missingSkills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-full border border-[#D5E0F1] bg-[#F3F8FF] px-4 py-2 text-[14px] text-[#202939]"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 border border-[#D6DCEA] bg-white px-4 py-2.5 text-[14px] font-medium text-[#202939]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add to Profile
                                </button>
                            </div>

                            <div className="my-4 border-t border-[#E6ECF6]" />

                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <Flame className="h-4 w-4 text-[#FF9F0A]" />
                                    <h4 className="text-[16px] font-medium text-[#202939]">Trending Skills</h4>
                                </div>
                                <div className="mb-4 flex flex-wrap gap-2.5">
                                    {trendingSkills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="rounded-full border border-[#D5E0F1] bg-[#F3F8FF] px-4 py-2 text-[14px] text-[#202939]"
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 border border-[#D6DCEA] bg-white px-4 py-2.5 text-[14px] font-medium text-[#202939]"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add to Profile
                                </button>
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className="mt-4 border border-[#DCE4F0] bg-white">
                    <button
                        type="button"
                        onClick={() => setMobileLearningsOpen((current) => !current)}
                        className="flex w-full items-start justify-between px-4 py-4 text-left"
                    >
                        <div>
                            <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#202939]">Recommended Learnings</h3>
                            <p className="max-w-[260px] text-[14px] leading-5 text-[#5E7397]">
                                Boost your chances of faster redeployment with new certifications
                            </p>
                        </div>
                        <ChevronDown
                            className={`mt-1 h-5 w-5 text-[#202939] transition-transform ${
                                mobileLearningsOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {mobileLearningsOpen ? (
                        <div className="border-t border-[#E6ECF6] px-3.5 py-4">
                            <div className="space-y-4">
                                {courses.map((course) => (
                                    <article key={course.id} className="border border-[#DCE4F0] bg-white p-3">
                                        <div className="relative mb-3 h-[135px] overflow-hidden bg-gray-200">
                                            <img
                                                src={course.image}
                                                alt={course.title}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <span className="inline-flex rounded-full bg-[#F0EEFE] px-3 py-1 text-[12px] text-[#7E59F8]">
                                            {course.category}
                                        </span>
                                        <div className="mt-3 flex items-center gap-1 text-[14px] text-[#202939]">
                                            <span>{course.provider}</span>
                                            <ExternalLink className="h-4 w-4 text-[#5E7397]" />
                                        </div>
                                        <h4 className="mt-1 text-[16px] font-medium leading-8 text-[#202939]">
                                            {course.title}
                                        </h4>
                                        <div className="my-3 border-t border-[#E6ECF6]" />
                                        <button
                                            type="button"
                                            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#F3F7FF] text-[14px] text-[#202939]"
                                        >
                                            <Image width={16} height={16} src="/icons/square-unlock.svg" alt="" />
                                            Unlock with {course.pointsRequired} pts
                                        </button>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </section>

                <section className="mt-4 border border-[#DCE4F0] bg-white">
                    <button
                        type="button"
                        onClick={() => setMobileCatchupOpen((current) => !current)}
                        className="flex w-full items-start justify-between px-4 py-4 text-left"
                    >
                        <div>
                            <h3 className="text-[20px] font-semibold tracking-[-0.02em] text-[#202939]">Weekly Catchup</h3>
                            <p className="text-[14px] leading-5 text-[#5E7397]">Latest happenings relevant to you</p>
                        </div>
                        <ChevronDown
                            className={`mt-1 h-5 w-5 text-[#202939] transition-transform ${
                                mobileCatchupOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {mobileCatchupOpen ? (
                        <div className="border-t border-[#E6ECF6] px-3.5 py-4">
                            <div className="space-y-4">
                                {newsItems.map((item) => (
                                    <article key={item.id} className="flex gap-3 border border-[#DCE4F0] bg-white p-3">
                                        <img
                                            src={item.image}
                                            alt={item.title}
                                            className="h-16 w-16 shrink-0 object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-[16px] leading-8 text-[#202939]">
                                                    {item.title}
                                                </h4>
                                                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-[#5E7397]" />
                                            </div>
                                            <p className="mt-2 text-[14px] text-[#5E7397]">{item.timestamp}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </section>
                    </>
                ) : mobileInsightsContent}
            </main>

            <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E6ECF6] bg-white pb-[env(safe-area-inset-bottom,0px)]">
                <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-2">
                    <button
                        type="button"
                        onClick={() => setMobileActiveTab("overview")}
                        className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
                            mobileActiveTab === "overview" ? "text-[#1447E6]" : "text-[#5E7397]"
                        }`}
                    >
                        <BookOpen
                            className={`h-6 w-6 ${
                                mobileActiveTab === "overview" ? "text-[#1447E6]" : "text-[#5E7397]"
                            }`}
                            strokeWidth={1.75}
                        />
                        <span className={mobileActiveTab === "overview" ? "font-semibold" : ""}>Overview</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileActiveTab("insights")}
                        className={`flex flex-col items-center justify-center gap-1 text-xs font-medium ${
                            mobileActiveTab === "insights" ? "text-[#1447E6]" : "text-[#5E7397]"
                        }`}
                    >
                        <Newspaper
                            className={`h-6 w-6 ${
                                mobileActiveTab === "insights" ? "text-[#1447E6]" : "text-[#5E7397]"
                            }`}
                            strokeWidth={1.75}
                        />
                        <span className={mobileActiveTab === "insights" ? "font-semibold" : ""}>Insights</span>
                    </button>
                </div>
            </nav>

            <ProfileVisibilityInfoDrawer
                open={visibilityInfoOpen}
                onClose={() => setVisibilityInfoOpen(false)}
            />

            <RewardPointsInfoDrawer
                open={rewardPointsInfoOpen}
                onClose={() => setRewardPointsInfoOpen(false)}
            />
        </div>
    );

    if (isMobile) {
        return (
            <CandidateAppShell showBottomNav={false}>
                {mobileVisibilityInner}
            </CandidateAppShell>
        );
    }

    return (
        <div className="min-h-screen bg-[#EEF0F3]">
            <AppNavbar />
            {visibilityInner}
        </div>
    );
}
