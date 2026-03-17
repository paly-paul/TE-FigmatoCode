"use client";
import { Calendar, MapPin, Clock, Users, RefreshCw, X } from "lucide-react";
import { useEffect } from "react";

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
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <>
      {/* BACKDROP */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/20 z-40 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      {/* DRAWER */}
      <div
        className={`fixed top-0 right-0 h-full w-full md:w-[640px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* HEADER */}
          <div className="flex items-start justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Job Details
              </h2>
              <p className="text-sm text-gray-500">#RR-26-00023</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* JOB CARD */}
            <div className="border rounded-lg p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-3 py-1 rounded-full">
                    Strong Match
                  </span>
                  <div className="flex items-center gap-2">
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
                <span className="text-xs text-gray-500">6 days ago</span>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-gray-900">
                  Senior Engineer
                </h3>
                <p className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} />
                  Atlanta | United States
                </p>
              </div>

              {/* JOB INFO GRID - 3 COLUMNS */}
              <div className="grid grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div className="flex gap-2 items-start">
                  <Calendar size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">
                      Project Est. Start Date
                    </p>
                    <p className="font-medium text-gray-900">
                      March 11, 2026
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <Calendar size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">
                      Project Est. End Date
                    </p>
                    <p className="font-medium text-gray-900">
                      August 31, 2026
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <Users size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">
                      Minimum Contract Duration
                    </p>
                    <p className="font-medium text-gray-900">
                      5 months, 20 days
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <RefreshCw size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">Rotation Cycle</p>
                    <p className="font-medium text-gray-900">
                      0 Weeks On / 0 Weeks Off
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <Clock size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">
                      Working Hours / Day
                    </p>
                    <p className="font-medium text-gray-900">8 hours</p>
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <Calendar size={16} className="text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-gray-500 text-xs">
                      Working Days / Week
                    </p>
                    <p className="font-medium text-gray-900">5 days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* TABS */}
            <div className="flex border-b text-sm gap-6">
              <button className="text-blue-600 border-b-2 border-blue-600 pb-2 font-medium">
                Job Action
              </button>
              <button className="text-gray-500 pb-2">Timeline</button>
              <button className="text-gray-500 pb-2">Job Description</button>
            </div>

            {/* RECRUITER INVITE */}
            <div className="bg-gray-50 border rounded-md p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">
                Accept Recruiter Invitation
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">
                    Available Date
                  </label>
                  <input
                    type="date"
                    defaultValue="2026-03-10"
                    className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    Expected Salary
                  </label>
                  <input
                    placeholder="$ 0 / hourly"
                    className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                  />
                </div>
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-600">
                <input type="checkbox" defaultChecked className="mt-1" />
                I agree to the terms and agree to share my profile with Six
                Force Talent Engine.
              </label>
            </div>
          </div>

          {/* FOOTER */}
          <div className="border-t px-6 py-4 flex justify-end">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
              Submit
            </button>
          </div>
        </div>
      </div>
    </>
  );
}