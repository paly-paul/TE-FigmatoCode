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
    ChevronRight,
    Star,
    CheckCircle,
    X,
    ThumbsUp,
    Target,
    TrendingUp,
    Lock,
    ExternalLink,
    BarChart3
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
    const activityChartRef = useRef<HTMLCanvasElement>(null);

    const visibilityScore = 80;
    const rewardPoints = 280;

    const radius = 80;
    const circumference = Math.PI * radius;
    const offset = circumference - (visibilityScore / 100) * circumference;

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
        if (!activityChartRef.current) return;

        const chart = new Chart(activityChartRef.current, {
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
    }, []);

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
                                <canvas ref={activityChartRef}></canvas>
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

    if (isMobile) {
        return (
            <CandidateAppShell activeBottomTab="insights">
                {visibilityInner}
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
