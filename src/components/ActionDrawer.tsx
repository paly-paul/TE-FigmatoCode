"use client";

import { Calendar, MapPin, Clock, Users, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { BaseDrawer } from "./ui/BaseDrawer";

interface ActionCard {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
}

interface ActionDrawerProps {
  open: boolean;
  onClose: () => void;
  action: ActionCard | null;
}

export default function ActionDrawer({
  open,
  onClose,
  action,
}: ActionDrawerProps) {
  const [activeTab, setActiveTab] = useState<"Job Action" | "Timeline" | "Job Description">("Job Action");

  useEffect(() => {
    if (open) {
      setActiveTab("Job Action");
    }
  }, [open]);

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Job Details"
      widthClassName="sm:w-[90%] md:w-[700px] lg:w-[900px]"
      bodyClassName="px-4 sm:px-6 md:px-10 py-4 sm:py-6"
      contentClassName="max-w-4xl mx-auto space-y-4 sm:space-y-6"
      footer={
        <div className="flex justify-end">
          <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm font-medium">
            Submit
          </button>
        </div>
      }
      headerActions={
        <div className="text-right">
          <p className="text-xs sm:text-sm text-gray-500">#RR-26-00023</p>
        </div>
      }
    >
      <div className="border rounded-lg p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
          <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full w-fit">
            Strong Match
          </span>
          <span className="text-xs text-gray-500">6 days ago</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h3 className="font-semibold text-base sm:text-lg text-gray-900">
              Senior Engineer
            </h3>
            <p className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin size={14} className="flex-shrink-0" />
              <span>Atlanta | United States</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Match</span>
            <div className="flex gap-0.5">
              <div className="w-1.5 h-4 bg-blue-600 rounded-sm"></div>
              <div className="w-1.5 h-4 bg-blue-600 rounded-sm"></div>
              <div className="w-1.5 h-4 bg-blue-600 rounded-sm"></div>
              <div className="w-1.5 h-4 bg-blue-600 rounded-sm"></div>
              <div className="w-1.5 h-4 bg-gray-300 rounded-sm"></div>
            </div>
            <span className="text-sm font-semibold text-gray-900">80%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4 text-sm">
          <div className="flex gap-2 items-start">
            <Calendar size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Project Est. Start Date</p>
              <p className="font-medium text-gray-900">March 11, 2026</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <Calendar size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Project Est. End Date</p>
              <p className="font-medium text-gray-900">August 31, 2026</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <Users size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Minimum Contract Duration</p>
              <p className="font-medium text-gray-900">5 months, 20 days</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <RefreshCw size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Rotation Cycle</p>
              <p className="font-medium text-gray-900">0 Weeks On / 0 Weeks Off</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <Clock size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Working Hours / Day</p>
              <p className="font-medium text-gray-900">8 hours</p>
            </div>
          </div>
          <div className="flex gap-2 items-start">
            <Calendar size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Working Days / Week</p>
              <p className="font-medium text-gray-900">5 days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto border-b text-sm gap-4 sm:gap-6 scrollbar-hide">
        {["Job Action", "Timeline", "Job Description"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`pb-2 font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Job Action" ? (
        <div className="bg-gray-50 border rounded-md p-4 sm:p-5 space-y-4">
          <h3 className="font-semibold text-sm sm:text-base text-gray-900">
            Accept Recruiter Invitation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                Available Date
              </label>
              <input
                type="date"
                defaultValue="2026-03-10"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">
                Expected Salary
              </label>
              <input
                placeholder="$ 0 / hourly"
                className="w-full border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-gray-600">
            <input type="checkbox" defaultChecked className="mt-1 flex-shrink-0" />
            <span>
              I agree to the terms and agree to share my profile with Six Force
              Talent Engine.
            </span>
          </label>
        </div>
      ) : null}

      {activeTab === "Timeline" ? (
        <div className="bg-gray-50 border rounded-md p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full ring-4 ring-blue-600"></div>
              <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
            </div>
            <div className="flex-1 pb-6">
              <h4 className="font-semibold text-sm sm:text-base text-gray-900">
                Recruiter Interest Accepted
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Jan 26, 2026</p>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "Job Description" ? (
        <div className="bg-gray-50 border rounded-md p-4 sm:p-5 space-y-4">
          <div>
            <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-3">
              Job Overview
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              We are seeking a Senior Engineer to join our team in Atlanta.
              This is an exciting opportunity to work on cutting-edge projects
              in a collaborative environment.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-2">
              Key Responsibilities
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>Lead technical architecture and design decisions</li>
              <li>Mentor junior engineers and conduct code reviews</li>
              <li>Collaborate with cross-functional teams</li>
              <li>Ensure high-quality code and best practices</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm sm:text-base text-gray-900 mb-2">
              Required Qualifications
            </h4>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>5+ years of software engineering experience</li>
              <li>Strong knowledge of modern web technologies</li>
              <li>Experience with cloud platforms (AWS, Azure, or GCP)</li>
              <li>Excellent communication and leadership skills</li>
            </ul>
          </div>
        </div>
      ) : null}

      {activeTab === "Job Action" && action?.title === "Interview Scheduled" ? (
        <div className="bg-gray-50 border rounded-md p-4 sm:p-5 space-y-4">
          <h3 className="font-semibold text-sm sm:text-base text-gray-900">
            Interview Details
          </h3>

          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-white border rounded-md text-xs font-medium">
              Round 1
            </span>
            <span className="px-3 py-1 bg-white border rounded-md text-xs font-medium">
              Technical
            </span>
            <span className="px-3 py-1 bg-white border rounded-md text-xs font-medium">
              Virtual Meeting
            </span>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-full bg-white border rounded-md">
              <div className="hidden sm:grid sm:grid-cols-4 gap-4 px-4 py-3 bg-gray-50 border-b text-xs sm:text-sm font-medium text-gray-600">
                <span>Select</span>
                <span>#Slot</span>
                <span>Date</span>
                <span>Time</span>
              </div>

              <div className="sm:grid sm:grid-cols-4 sm:gap-4 sm:items-center px-4 py-3 sm:py-4">
                <div className="sm:hidden space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="interview-slot"
                      defaultChecked
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="font-medium text-sm">Slot 1</span>
                  </div>
                  <div className="pl-7 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date:</span>
                      <span className="font-medium">Feb 03, 2026</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time:</span>
                      <span className="font-medium">11:00 IST (UTC +5.30)</span>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block">
                  <input
                    type="radio"
                    name="interview-slot"
                    defaultChecked
                    className="w-4 h-4 text-blue-600"
                  />
                </div>
                <div className="hidden sm:block text-sm">Slot 1</div>
                <div className="hidden sm:block text-sm">Feb 03, 2026</div>
                <div className="hidden sm:block text-sm">11:00 IST (UTC +5.30)</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </BaseDrawer>
  );
}
