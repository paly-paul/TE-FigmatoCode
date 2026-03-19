"use client";

import React, { useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  Search,
  MapPin,
  Bookmark,
  Repeat,
  Share2,
  SlidersHorizontal,
  ChevronDown,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  Menu,
  X
} from "lucide-react";

import ActionDrawer from "../ActionDrawer";
import PauseJobSearchModal from "../PauseJobSearchModal";
import ReferFriendModal from "../ReferFriendModal";

interface ActionCard {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
}

interface JobListing {
  id: number;
  title: string;
  location: string;
  locationFull: string;
  company: string;
  salary: string;
  startDate: string;
  matchPercentage: number;
  status: "Strong Match" | "Closing Soon" | "Early Applicants" | "New";
  stage: "Received" | "Shortlisted" | "Interview" | "Rejected"
  postedTime: string;
}

export default function TalentEngineDashboard() {
  const [isLookingForJob, setIsLookingForJob] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "Recommended" | "Your Applications"
  >("Recommended");

  const [activeActionTab, setActiveActionTab] = useState<
    "Job" | "Profile" | "General"
  >("Job");

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionCard | null>(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(() => new Set());

  const [showReferModal, setShowReferModal] = useState(false);

  const handleJobApplyClick = (job: JobListing) => {
    const nextAction: ActionCard = {
      id: job.id,
      type: "Job",
      title: job.title,
      subtitle: `${job.location} · ${job.locationFull}`,
      timestamp: job.postedTime,
    };

    const isSameJobAlreadyOpen =
      isDrawerOpen &&
      selectedAction?.type === "Job" &&
      selectedAction?.id === job.id;

    if (isSameJobAlreadyOpen) {
      setIsDrawerOpen(false);
      return;
    }

    setSelectedAction(nextAction);
    setIsDrawerOpen(true);
  };

  const handleToggleSavedJob = (jobId: number) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const actionCards: ActionCard[] = [
    {
      id: 1,
      type: "Job",
      title: "Recruiter interest received",
      subtitle: "Senior Engineer · Atlanta",
      timestamp: "1 hr ago",
    },
    {
      id: 2,
      type: "Job",
      title: "Interview Scheduled",
      subtitle: "Senior Engineer · Atlanta",
      timestamp: "4 hrs ago",
    },
    {
      id: 3,
      type: "Job",
      title: "Recruiter interest received",
      subtitle: "System Grid Engineer · Georgia",
      timestamp: "1 days ago",
    },
    {
      id: 4,
      type: "Job",
      title: "Salary Negotiation",
      subtitle: "Senior Engineer · Atlanta",
      timestamp: "2 days ago",
    },
    {
      id: 5,
      type: "Profile",
      title: "Update Profile",
      subtitle: "Keep your details up to date to improve visibility",
      timestamp: "2 days ago"
    },
    {
      id: 6,
      type: "General",
      title: "New Matching Roles Added",
      subtitle: "Matching oppurtunities are available based on your profile",
      timestamp: "1 week ago"
    }
  ];

  const jobListings: JobListing[] = [
    {
      id: 1,
      title: "Fuel Operation Engineer",
      location: "Little Flock",
      locationFull: "United States",
      company: "SolarWave Initiative",
      salary: "USD 500 / hourly",
      startDate: "Starts March 11, 2026",
      matchPercentage: 70,
      status: "Strong Match",
      stage: "Received",
      postedTime: "6 days ago",
    },
    {
      id: 2,
      title: "Pipeline Maintenance Engineer",
      location: "Little Flock",
      locationFull: "United States",
      company: "WindHarvest Co",
      salary: "USD 650 / hourly",
      startDate: "Starts March 01, 2026",
      matchPercentage: 74,
      status: "Closing Soon",
      stage: "Shortlisted",
      postedTime: "20 days ago",
    },
    {
      id: 3,
      title: "Pump Maintenance Engineer",
      location: "Little Flock",
      locationFull: "United States",
      company: "HydroFlow Solutions",
      salary: "USD 600 / hourly",
      startDate: "Starts February 09, 2026",
      matchPercentage: 65,
      status: "Early Applicants",
      stage: "Interview",
      postedTime: "1 day ago",
    },
    {
      id: 4,
      title: "Mechanical Technician",
      location: "Little Flock",
      locationFull: "United States",
      company: "SmartGrid Expansion",
      salary: "USD 500 / hourly",
      startDate: "Starts March 11, 2026",
      matchPercentage: 90,
      status: "New",
      stage: "Received",
      postedTime: "1 day ago",
    },
    {
      id: 5,
      title: "Operation Engineer",
      location: "Little Flock",
      locationFull: "United States",
      company: "GreenFuel Innovations",
      salary: "USD 500 / hourly",
      startDate: "Starts March 11, 2026",
      matchPercentage: 30,
      status: "New",
      stage: "Rejected",
      postedTime: "1 day ago",
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Strong Match":
        return "bg-green-50 text-green-700";
      case "Closing Soon":
        return "bg-yellow-50 text-yellow-700";
      case "Early Applicants":
        return "bg-blue-50 text-blue-700";
      case "New":
        return "bg-emerald-50 text-emerald-700";
      default:
        return "bg-gray-50 text-gray-700";
    }
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 70) return "bg-blue-600";
    if (percentage >= 40) return "bg-blue-500";
    return "bg-yellow-500";
  };

  const filteredActions = actionCards.filter(
    (card) => card.type === activeActionTab
  );

  const getActionBadge = (type: string) => {
    switch (type) {
      case "Job":
        return {
          label: "Job",
          icon: <BriefcaseBusiness size={13} />,
          className: "bg-green-50 text-green-700"
        };
      case "Profile":
        return {
          label: "Profile",
          icon: <User size={13} />,
          className: "bg-purple-50 text-purple-700"
        };
      default:
        return {
          label: "General",
          icon: <Repeat size={13} />,
          className: "bg-purple-50 text-purple-700"
        }
    }
  }

  const getStageStyle = (stage: string) => {
    switch (stage) {
      case "Received":
        return "bg-blue-50 text-blue-600 border-blue-200"
      case "Shortlisted":
        return "bg-green-50 text-green-600 border-green-200";
      case "Interview":
        return "bg-purple-50 text-purple-600 border-purple-200";
      case "Rejected":
        return "bg-red-50 text-red-600 border-red-200"
      default:
        return "bg-gray-50 text-gray-600"
    }
  }

  const MatchCircle = ({ score }: { score: number }) => {
    const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef44444";

    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const progress = circumference - (score / 100) * circumference;

    return (
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90">
          <circle
            cx="24"
            cy="24"
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
          {score}
        </div>
      </div>
    )
  }

  const visibilityScore = 80;

  const radius = 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (visibilityScore / 100) * circumference;

  const handlePauseSave = (duration: string) => {
    console.log("Paused for:", duration, "months");
    setIsLookingForJob(false);
    setShowPauseModal(false)
  }

  return (
    <div className="min-h-screen bg-[#EEF0F3]">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">TE</span>
              </div>
              <span className="text-base sm:text-lg font-semibold text-gray-900">
                Talent Engine
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-4">
              <button className="px-4 py-2 rounded-md bg-gray-100 text-gray-900 font-medium">
                Dashboard
              </button>
              <button className="px-4 py-2 rounded-md text-gray-500 hover:bg-gray-100">
                Jobs
              </button>
              <button className="px-4 py-2 rounded-md text-gray-500 hover:bg-gray-100">
                Timesheet
              </button>
            </nav>

            {/* Right Side */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Adam"
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full"
                  alt="Profile"
                />
                <span className="text-sm font-medium text-gray-900 hidden md:block">
                  Adam Smith
                </span>
              </div>

              {/* Mobile Menu Button */}
              <button 
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 border-t">
              <nav className="flex flex-col gap-2">
                <button className="px-4 py-2 rounded-md bg-gray-100 text-gray-900 font-medium text-left">
                  Dashboard
                </button>
                <button className="px-4 py-2 rounded-md text-gray-500 hover:bg-gray-100 text-left">
                  Jobs
                </button>
                <button className="px-4 py-2 rounded-md text-gray-500 hover:bg-gray-100 text-left">
                  Timesheet
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* ACTION CENTER */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">Action Center</h2>

            <button
              type="button"
              onClick={() => {
                if (isLookingForJob) {
                  setShowPauseModal(true);
                } else {
                  setIsLookingForJob(false)
                }
              }}
              className="flex items-center gap-3 group"
              aria-pressed={isLookingForJob}
            >
              <span
                className={`text-xs sm:text-sm font-medium transition-colors ${
                  isLookingForJob ? "text-gray-900" : "text-gray-500"
                }`}
              >
                {isLookingForJob ? "Looking for a Job" : "Not looking right now"}
              </span>

              <span
                className={`w-11 h-6 rounded-full relative transition-colors ${
                  isLookingForJob ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute w-5 h-5 bg-white rounded-full top-0.5 left-0.5 transition-transform duration-200 flex items-center justify-center ${
                    isLookingForJob ? "translate-x-5" : "translate-x-0"
                  }`}
                >
                  {isLookingForJob && (
                    <svg 
                      className="w-3 h-3 text-green-500" 
                      viewBox="0 0 12 12" 
                      fill="none" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        d="M10 3L4.5 8.5L2 6" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
              </span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {["Job", "Profile", "General"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveActionTab(tab as any)}
                  className={`px-3 sm:px-4 py-2 rounded-md border text-xs sm:text-sm whitespace-nowrap ${
                    activeActionTab === tab
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button className="flex items-center justify-center sm:justify-start text-blue-600 text-sm font-medium gap-1">
              See All
              <ChevronDown size={16} />
            </button>
          </div>

          {/* ACTION CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredActions.map((card) => {
              const badge = getActionBadge(card.type);

              return (
                <div
                  key={card.id}
                  className="bg-[#95bcff0c] border border-gray-200 rounded-md p-4 hover:shadow-sm min-h-[180px] sm:min-h-[210px] flex flex-col"
                >
                  <div className="flex justify-between mb-3">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </div>
                    <span className="text-xs text-gray-500">{card.timestamp}</span>
                  </div>

                  <h3 className="text-sm font-semibold mb-1">{card.title}</h3>
                  <p className="text-xs text-gray-600 mb-4">{card.subtitle}</p>

                  <button
                    onClick={() => {
                      setSelectedAction(card);
                      setIsDrawerOpen(true);
                    }}
                    className="w-fit border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50 mt-auto"
                  >
                    Take Action
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* JOBS + INSIGHTS */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* JOBS */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold">Jobs</h2>
              </div>

              {/* TABS & FILTERS */}
              <div className="flex flex-col gap-4 mb-6">
                {/* Tabs Row */}
                <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                  {["Recommended", "Your Applications"].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      className={`px-3 sm:px-4 py-2 rounded-md border text-xs sm:text-sm whitespace-nowrap ${
                        activeTab === tab
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-white text-gray-600 border-gray-200"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Filter Controls Row */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      placeholder="Search jobs..."
                      className="pl-10 pr-4 h-10 border rounded-lg text-sm w-full"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button className="flex items-center gap-2 border rounded-lg px-4 h-10 text-sm whitespace-nowrap flex-1 sm:flex-initial justify-center sm:justify-start">
                      <MapPin size={16} className="flex-shrink-0" />
                      <span className="truncate">Bangor, United States</span>
                      <span className="text-blue-600 flex-shrink-0">+2</span>
                    </button>

                    <button className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bookmark size={16} />
                    </button>

                    <button className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0">
                      <SlidersHorizontal size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* JOB CONTENT */}
              {activeTab === "Recommended" ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                  {jobListings.map((job) => (
                    <div
                      key={job.id}
                      className="group bg-white border border-gray-200 border-b-4 border-b-blue-600 rounded-lg p-4 sm:p-6 hover:shadow-md hover:border-blue-600 hover:border-b-blue-600 min-h-[240px] flex flex-col justify-between transition-all"
                    >
                      <div className="flex justify-between mb-4">
                        <span
                          className={`text-xs px-2 sm:px-3 py-1 rounded-full ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {job.status}
                        </span>
                        <span className="text-xs text-gray-500">{job.postedTime}</span>
                      </div>

                      <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">{job.title}</h3>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="flex-shrink-0" />
                          <span className="truncate">{job.location} · {job.locationFull}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} className="flex-shrink-0" />
                          {job.salary}
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="flex-shrink-0" />
                          {job.startDate}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Match</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((bar) => (
                              <div
                                key={bar}
                                className={`w-2.5 h-2.5 rounded-[2px] ${
                                  bar <= Math.ceil(job.matchPercentage / 20)
                                    ? getMatchColor(job.matchPercentage)
                                    : "bg-gray-200"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold">{job.matchPercentage}%</span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button 
                            onClick={() => setShowReferModal(true)}
                            className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0">
                            <Share2 size={16} />
                          </button>
                          <button
                            type="button"
                            aria-label={savedJobIds.has(job.id) ? "Unsave job" : "Save job"}
                            aria-pressed={savedJobIds.has(job.id)}
                            onClick={() => handleToggleSavedJob(job.id)}
                            className={`w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                              savedJobIds.has(job.id)
                                ? "border-blue-600 bg-transparent text-blue-600"
                                : "border-gray-200 text-gray-700 hover:bg-gray-50"
                            }`}
                          >
                            <Bookmark size={16} />
                          </button>
                          <button
                            onClick={() => handleJobApplyClick(job)}
                            className="relative border border-gray-300 rounded-lg px-6 sm:px-8 py-2 text-sm text-gray-800 bg-white transition-all flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 hover:bg-blue-600 hover:border-blue-600 flex-1 sm:flex-initial"
                          >
                            <span className="transition-all group-hover:text-white group-hover:-translate-x-1">
                              Apply
                            </span>
                            <span className="absolute right-4 opacity-0 translate-x-1 text-white transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
                              →
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Application Table - Mobile: Card view, Desktop: Table view
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    {/* Table Header */}
                    <div className="grid grid-cols-5 gap-4 px-6 py-3 text-sm font-medium text-gray-600 border-b">
                      <span>Job/Title / Location</span>
                      <span>Company</span>
                      <span className="text-center">Match Score %</span>
                      <span>Stage</span>
                      <span></span>
                    </div>

                    {/* Rows */}
                    {jobListings.map((job) => (
                      <div
                        key={job.id}
                        className="grid grid-cols-5 gap-4 items-center px-6 py-4 border-b last:border-none hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{job.title}</p>
                          <p className="text-xs text-gray-500">
                            {job.location} | {job.locationFull}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700">{job.company}</p>
                        <p className="flex justify-center">
                          <MatchCircle score={job.matchPercentage} />
                        </p>
                        <span className={`text-xs border px-3 py-1 rounded-md w-fit ${getStageStyle(job.stage)}`}>
                          {job.stage}
                        </span>
                        <div className="flex gap-3 justify-end text-gray-500">
                          <Share2 size={16} />
                          <Bookmark size={16} />
                          <ChevronDown size={16} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y">
                    {jobListings.map((job) => (
                      <div key={job.id} className="p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">{job.title}</h3>
                            <p className="text-sm text-gray-600">{job.company}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {job.location} | {job.locationFull}
                            </p>
                          </div>
                          <MatchCircle score={job.matchPercentage} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs border px-3 py-1 rounded-md ${getStageStyle(job.stage)}`}>
                            {job.stage}
                          </span>
                          <div className="flex gap-3 text-gray-500">
                            <Share2 size={16} />
                            <Bookmark size={16} />
                            <ChevronDown size={16} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* INSIGHTS */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Insights</h2>

            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-4 sm:mb-6">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="text-blue-600 w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Matching roles found!</h3>
                  <p className="text-xs text-gray-600">
                    Your profile matches 4 active energy roles
                  </p>
                </div>
              </div>
            </div>

            {/* VISIBILITY SCORE */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
              <h3 className="font-semibold mb-2">Visibility Score</h3>
              <p className="text-sm text-gray-600 mb-6">
                You're well-positioned for relevant opportunities
              </p>

              <div className="relative w-full flex items-center justify-center h-40 sm:h-52">
                <svg viewBox="0 0 230 140" className="w-full max-w-[260px] h-full">
                  {/* Background arc */}
                  <path
                    d="M20 110 A80 80 0 0 1 210 110"
                    stroke="#e5e7eb"
                    strokeWidth="18"
                    fill="none"
                    strokeLinecap="butt"
                  />
                  {/* Progress arc */}
                  <path
                    d="M20 110 A80 80 0 0 1 210 110"
                    stroke="#16a34a"
                    strokeWidth="18"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                  />
                </svg>
                <div className="absolute inset-x-0 bottom-8 sm:bottom-10 flex justify-center text-2xl sm:text-3xl font-bold text-gray-900">
                  {visibilityScore}
                </div>
              </div>

              <button className="w-full border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">
                Improve Score
              </button>
            </div>
          </div>
        </div>
      </main>

      <ActionDrawer 
        open={isDrawerOpen}
        action={selectedAction}
        onClose={() => setIsDrawerOpen(false)}
      />

      <PauseJobSearchModal 
        open={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        onSave={handlePauseSave}
      />

      <ReferFriendModal 
        open={showReferModal}
        onClose={() => setShowReferModal(false)}
      />
    </div>
  );
}