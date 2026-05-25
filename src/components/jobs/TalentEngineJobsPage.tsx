"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  MapPin,
  Search,
  Share2,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { JobSuccessPopup } from "@/components/ui/JobSuccessPopup";
import ActionDrawer from "../ActionDrawer";
import AppNavbar from "../profile/AppNavbar";
import CandidateAppShell from "../mobile/CandidateAppShell";
import ReferFriendModal from "../ReferFriendModal";
import {
  DEFAULT_FILTERS,
  EMPLOYMENT_TYPES,
  FilterDrawer,
  FilterState,
  SENIORITY_LEVELS,
} from "../ui/FilterDrawer";
import {
  getDropdownDetailsOptions,
  prefetchDropdownDetailsAfterLogin,
} from "@/services/jobs/dropdownDetails";
import { getAllLocationOptions } from "@/services/jobs/locationOptions";
import {
  LocationDrawer,
  type LocationOption,
} from "../ui/LocationDrawer";
import { useIsBelowLg } from "@/lib/useResponsive";
import { getCandidateId, getProfileName } from "@/lib/authSession";
import {
  readRecommendedJobsCache,
  writeRecommendedJobsCache,
} from "@/lib/recommendedJobsCache";
import {
  createFavourite,
  getCandidateInterests,
  getFavouriteJobs,
  getJobApplications,
  getRecommendedJobs,
  getRecommendedJobsWithSkills,
  markInterestedInJob,
} from "@/services/jobs/actionCenter";
import { mapRecommendedToJobsPageCard } from "@/services/jobs/mapApiJobsToUi";
import { mergeResolvedCustomerFromPrevious } from "@/services/jobs/mergeResolvedCustomer";
import { getRrDetails } from "@/services/jobs/rrDetails";

interface JobCard {
  id: number;
  title: string;
  /** Hiring organization (API `customer`). */
  company: string;
  status: "Strong Match" | "Closing Soon" | "Early Applicants" | "New";
  postedTime: string;
  location: string;
  locationId: string;
  locationFull: string;
  compensation: string;
  compensationValue: number;
  startDate: string;
  matchPercentage: number;
  skills: string[];
  employmentType: string;
  seniorityLevel: string;
  jobDocumentId?: string;
}

interface ActionCard {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
  jobDocumentId?: string;
  matchPercentage?: number;
  /** API `customer`; shown in drawer until RR details load. */
  customer?: string;
  skills?: string[];
}

function recencyScoreFromPostedTime(postedTime: string): number {
  const text = postedTime.trim().toLowerCase();
  if (!text) return Number.MAX_SAFE_INTEGER;
  if (text.includes("just now")) return 0;

  const relativeMatch = text.match(/(\d+)\s*(second|minute|hour|day|week|month|year)/);
  if (relativeMatch) {
    const value = Number.parseInt(relativeMatch[1], 10);
    const unit = relativeMatch[2];
    const multiplier =
      unit === "second"
        ? 1
        : unit === "minute"
          ? 60
          : unit === "hour"
            ? 60 * 60
            : unit === "day"
              ? 60 * 60 * 24
              : unit === "week"
                ? 60 * 60 * 24 * 7
                : unit === "month"
                  ? 60 * 60 * 24 * 30
                  : 60 * 60 * 24 * 365;
    return value * multiplier;
  }

  const absoluteDate = new Date(postedTime);
  if (!Number.isNaN(absoluteDate.getTime())) {
    return Math.max(0, Math.floor((Date.now() - absoluteDate.getTime()) / 1000));
  }

  return Number.MAX_SAFE_INTEGER;
}

function normalizeRotationForJobFilter(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "true" || normalized === "1") return "yes";
  if (
    normalized === "no" ||
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no rotation" ||
    normalized.includes("0 weeks on / 0 weeks off")
  ) {
    return "no";
  }
  if (normalized.includes("rotation") && /\bno\b/.test(normalized)) return "no";
  if (normalized.includes("rotation") && /\byes\b/.test(normalized)) return "yes";
  if (normalized.includes("on:") || normalized.includes("weeks on")) {
    return "yes";
  }
  return normalized;
}

function rotationBucketFromJobCard(job: JobCard): string {
  const fromStartDate = normalizeRotationForJobFilter(job.startDate);
  if (fromStartDate === "yes" || fromStartDate === "no") return fromStartDate;
  return normalizeRotationForJobFilter(job.seniorityLevel);
}

const JOBS: JobCard[] = [
  {
    id: 1,
    title: "Fuel Operation Engineer",
    company: "SolarWave Initiative",
    status: "Strong Match",
    postedTime: "6 days ago",
    location: "Bangor",
    locationId: "bangor-us",
    locationFull: "United States",
    compensation: "USD 500 / hourly",
    compensationValue: 500,
    startDate: "Starts March 11, 2026",
    matchPercentage: 80,
    skills: ["Microgrid System"],
    employmentType: "Hourly",
    seniorityLevel: "No",
  },
  {
    id: 2,
    title: "Mechanical Technician",
    company: "WindHarvest Co",
    status: "Closing Soon",
    postedTime: "20 days ago",
    location: "Little Flock",
    locationId: "brooklyn-us",
    locationFull: "United States",
    compensation: "$ 8,000 / monthly",
    compensationValue: 8000,
    startDate: "Starts March 01, 2026",
    matchPercentage: 60,
    skills: ["Energy data analytics"],
    employmentType: "Monthly",
    seniorityLevel: "Yes",
  },
  {
    id: 3,
    title: "Pump Maintenance Engineer",
    company: "HydroFlow Solutions",
    status: "Early Applicants",
    postedTime: "1 day ago",
    location: "Bangalov",
    locationId: "atlanta-us",
    locationFull: "Australia",
    compensation: "$ 7,000 / monthly",
    compensationValue: 7000,
    startDate: "Starts February 09, 2026",
    matchPercentage: 62,
    skills: ["Utility Operations"],
    employmentType: "Monthly",
    seniorityLevel: "No",
  },
  {
    id: 4,
    title: "Pump Operator",
    company: "GreenFuel Innovations",
    status: "New",
    postedTime: "1 day ago",
    location: "Bangor",
    locationId: "bangor-us",
    locationFull: "United States",
    compensation: "USD 500 / hourly",
    compensationValue: 500,
    startDate: "Starts March 11, 2026",
    matchPercentage: 30,
    skills: ["Microgrid System"],
    employmentType: "Hourly",
    seniorityLevel: "Yes",
  },
  {
    id: 5,
    title: "Fuel Operation Engineer",
    company: "SolarWave Initiative",
    status: "Strong Match",
    postedTime: "6 days ago",
    location: "Bangor",
    locationId: "bangor-us",
    locationFull: "United States",
    compensation: "USD 500 / hourly",
    compensationValue: 500,
    startDate: "Starts March 11, 2026",
    matchPercentage: 80,
    skills: ["Microgrid System"],
    employmentType: "Hourly",
    seniorityLevel: "No",
  },
  {
    id: 6,
    title: "Mechanical Technician",
    company: "WindHarvest Co",
    status: "Closing Soon",
    postedTime: "20 days ago",
    location: "Little Flock",
    locationId: "brooklyn-us",
    locationFull: "United States",
    compensation: "$ 8,000 / monthly",
    compensationValue: 8000,
    startDate: "Starts March 01, 2026",
    matchPercentage: 60,
    skills: ["Energy data analytics"],
    employmentType: "Monthly",
    seniorityLevel: "Yes",
  },
];

const SORT_OPTIONS = ["Newest", "Highest Match"];
const SKILLS_PREVIEW_LIMIT = 8;
const JOBS_FILTER_DEFAULTS: FilterState = {
  ...DEFAULT_FILTERS,
  salaryMax: 10000,
};

function FilterCheckboxGroup({
  options,
  selected,
  onChange,
  singleSelect = false,
  radio = false,
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  singleSelect?: boolean;
  radio?: boolean;
}) {
  const toggle = (option: string) => {
    if (singleSelect || radio) {
      onChange(selected.includes(option) ? [] : [option]);
      return;
    }
    onChange(selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option]);
  };

  if (radio) {
    const groupName = options.join("-");
    return (
      <div className="space-y-3">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
            <input
              type="radio"
              name={groupName}
              checked={selected.includes(option)}
              onChange={() => {}}
              onClick={() => toggle(option)}
              className="w-4 h-4 accent-blue-600"
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label key={option} className="flex items-center gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => toggle(option)}
            className="w-4 h-4 rounded border-gray-300 accent-blue-600"
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function JobsFilterPanel({
  searchSkills,
  onSearchSkillsChange,
  filters,
  onFiltersChange,
  skillsOptions,
  employmentTypeOptions,
  seniorityLevelOptions,
  isLoadingSkills = false,
}: {
  searchSkills: string;
  onSearchSkillsChange: (value: string) => void;
  filters: FilterState;
  onFiltersChange: (value: FilterState) => void;
  skillsOptions: string[];
  employmentTypeOptions: string[];
  seniorityLevelOptions: string[];
  isLoadingSkills?: boolean;
}) {
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [openSections, setOpenSections] = useState({
    skills: true,
    employment: true,
    seniority: true,
    salary: true,
  });
  const trimmedSkillsSearch = searchSkills.trim();
  const normalizedSkillsSearch = trimmedSkillsSearch.toLowerCase();
  const filteredSkills = skillsOptions
    .filter((skill) => skill.toLowerCase().includes(normalizedSkillsSearch))
    .sort((a, b) => {
      if (!normalizedSkillsSearch) return a.localeCompare(b);
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aStarts = aLower.startsWith(normalizedSkillsSearch) ? 1 : 0;
      const bStarts = bLower.startsWith(normalizedSkillsSearch) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;

      const aIndex = aLower.indexOf(normalizedSkillsSearch);
      const bIndex = bLower.indexOf(normalizedSkillsSearch);
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.localeCompare(b);
    });
  const visibleSkills =
    showAllSkills || trimmedSkillsSearch.length > 0
      ? filteredSkills
      : filteredSkills.slice(0, SKILLS_PREVIEW_LIMIT);
  const canToggleSkillsView = trimmedSkillsSearch.length === 0 && filteredSkills.length > SKILLS_PREVIEW_LIMIT;

  const [draftFilters, setDraftFilters] = useState<FilterState>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  useEffect(() => {
    setShowAllSkills(false);
  }, [searchSkills]);

  const setValue = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setDraftFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <aside className="bg-white border border-gray-200 rounded-sm p-4 space-y-5">
      <div>
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, skills: !prev.skills }))
          }
          className="w-full flex items-center justify-between mb-3 text-left"
        >
          <h2 className="text-sm font-semibold text-gray-900">Skills</h2>
          {openSections.skills ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>

        {openSections.skills ? (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={searchSkills}
                onChange={(event) => onSearchSkillsChange(event.target.value)}
                placeholder="Search by name..."
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-sm text-base focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <p className="text-xs font-medium text-gray-700 mb-3">Popular Skills</p>
            {isLoadingSkills && visibleSkills.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                Loading skills...
              </div>
            ) : (
              <div
                className={`overflow-y-auto pr-1 transition-[max-height] duration-300 ease-in-out ${
                  showAllSkills || trimmedSkillsSearch.length > 0 ? "max-h-96" : "max-h-72"
                }`}
              >
                <FilterCheckboxGroup
                  options={visibleSkills}
                  selected={draftFilters.skills}
                  onChange={(value) => setValue("skills", value)}
                />
              </div>
            )}
            {canToggleSkillsView ? (
              <button
                type="button"
                onClick={() => setShowAllSkills((prev) => !prev)}
                className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {showAllSkills ? "Show less" : `See all (${filteredSkills.length})`}
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, employment: !prev.employment }))
          }
          className="w-full flex items-center justify-between mb-3 text-left"
        >
          <h2 className="text-sm font-semibold text-gray-900">Billing Frequency</h2>
          {openSections.employment ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
        {openSections.employment ? (
          <FilterCheckboxGroup
            options={employmentTypeOptions}
            selected={draftFilters.employmentTypes}
            onChange={(value) => setValue("employmentTypes", value)}
            radio
          />
        ) : null}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, seniority: !prev.seniority }))
          }
          className="w-full flex items-center justify-between mb-3 text-left"
        >
          <h2 className="text-sm font-semibold text-gray-900">Rotation</h2>
          {openSections.seniority ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
        {openSections.seniority ? (
          <FilterCheckboxGroup
            options={seniorityLevelOptions}
            selected={draftFilters.seniorityLevels}
            onChange={(value) => setValue("seniorityLevels", value)}
            radio
          />
        ) : null}
      </div>

      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() =>
            setOpenSections((prev) => ({ ...prev, salary: !prev.salary }))
          }
          className="w-full flex items-center justify-between mb-4 text-left"
        >
          <h2 className="text-sm font-semibold text-gray-900">Salary Range</h2>
          {openSections.salary ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>

        {openSections.salary ? (
          <>
            {(() => {
              const sliderMax = JOBS_FILTER_DEFAULTS.salaryMax;
              const minPct = (draftFilters.salaryMin / sliderMax) * 100;
              const maxPct = (draftFilters.salaryMax / sliderMax) * 100;
              return (
                <div className="relative h-5 mx-1 mb-5">
                  <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-gray-200" />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-blue-600"
                    style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-blue-600 bg-white shadow-sm pointer-events-none"
                    style={{ left: `${minPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-blue-600 bg-white shadow-sm pointer-events-none"
                    style={{ left: `${maxPct}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={100}
                    value={draftFilters.salaryMin}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val < draftFilters.salaryMax) setValue("salaryMin", val);
                    }}
                    className="dual-range-input absolute inset-0 w-full h-full"
                  />
                  <input
                    type="range"
                    min={0}
                    max={sliderMax}
                    step={100}
                    value={draftFilters.salaryMax}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val > draftFilters.salaryMin) setValue("salaryMax", val);
                    }}
                    className="dual-range-input absolute inset-0 w-full h-full"
                  />
                </div>
              );
            })()}
        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-5">
          <div>
            <p className="mb-1">Min</p>
            <div className="flex items-center gap-2">
              <span>$</span>
              <input
                type="number"
                value={draftFilters.salaryMin === 0 ? "" : draftFilters.salaryMin}
                min={0}
                max={JOBS_FILTER_DEFAULTS.salaryMax}
                placeholder="0"
                onChange={(event) => {
                  if (event.target.value === "") { setValue("salaryMin", 0); return; }
                  const next = Math.min(Number(event.target.value), JOBS_FILTER_DEFAULTS.salaryMax);
                  if (next >= 0 && next < draftFilters.salaryMax) setValue("salaryMin", next);
                }}
                className="w-full border border-gray-200 rounded-sm px-2 py-1.5 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <p className="mb-1">Max</p>
            <div className="flex items-center gap-2">
              <span>$</span>
              <input
                type="number"
                value={draftFilters.salaryMax === 0 ? "" : draftFilters.salaryMax}
                min={0}
                max={JOBS_FILTER_DEFAULTS.salaryMax}
                placeholder="Any"
                onChange={(event) => {
                  if (event.target.value === "") { setValue("salaryMax", 0); return; }
                  const next = Math.min(Number(event.target.value), JOBS_FILTER_DEFAULTS.salaryMax);
                  if (next > draftFilters.salaryMin) setValue("salaryMax", next);
                }}
                className="w-full border border-gray-200 rounded-sm px-2 py-1.5 focus:outline-none"
              />
            </div>
          </div>
        </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraftFilters(JOBS_FILTER_DEFAULTS);
                  onFiltersChange(JOBS_FILTER_DEFAULTS);
                }}
                className="h-9 text-sm text-gray-700 border border-gray-200 rounded-sm hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => onFiltersChange(draftFilters)}
                className="h-9 text-sm text-white bg-blue-600 rounded-sm hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </>
        ) : null}
      </div>
    </aside>
  );
}

function formatJobCardLocation(location: string, locationFull: string, compact: boolean): string {
  const city = (location || "").trim().replace(/^—$/, "");
  const country = (locationFull || "").trim().replace(/^—$/, "");
  if (!city && !country) return "Unknown location";
  if (!country || city.toLowerCase() === country.toLowerCase()) return city || country;
  if (!city) return country;
  return compact ? `${city} | ${country}` : `${city} - ${country}`;
}

function getStatusColor(status: JobCard["status"]) {
  switch (status) {
    case "Strong Match":
      return "bg-green-100 text-green-700";
    case "Closing Soon":
      return "bg-yellow-100 text-yellow-700";
    case "Early Applicants":
      return "bg-blue-100 text-blue-700";
    case "New":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getMatchColor(percentage: number) {
  if (percentage >= 70) return "bg-green-500";
  if (percentage >= 40) return "bg-yellow-400";
  return "bg-red-400";
}

function JobsCard({
  job,
  saved,
  onToggleSaved,
  onShare,
  onApply,
  compact = false,
}: {
  job: JobCard;
  saved: boolean;
  onToggleSaved: (job: JobCard) => void;
  onShare: () => void;
  onApply: () => void;
  /** Mobile layout: no skill chips, pipe in location, wallet icon, tighter spacing */
  compact?: boolean;
}) {
  const PayIcon = Wallet;
  const iconClass = compact ? "h-4 w-4 shrink-0 text-slate-500" : "flex-shrink-0";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onApply}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onApply();
        }
      }}
      className={`group flex min-h-[240px] flex-col justify-between rounded-xl border border-gray-200 bg-white transition-all ${
        compact
          ? "border-b-4 border-b-blue-600 p-4 shadow-sm"
          : "cursor-pointer rounded-lg border-b-4 border-b-blue-600 p-4 hover:border-blue-600 hover:border-b-blue-600 hover:shadow-md sm:p-6"
      }`}
    >
      <div className="mb-3 flex flex-col gap-2 sm:mb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3
              className={`font-semibold text-gray-900 ${compact ? "text-base" : "text-base sm:text-lg"}`}
            >
              {job.title}
            </h3>
            {job.jobDocumentId && (
              <p className="text-xs text-gray-500 mt-1">{job.jobDocumentId}</p>
            )}
          </div>
          {job.postedTime && job.postedTime !== "—" && (
            <span className="shrink-0 text-xs text-gray-500 whitespace-nowrap">{job.postedTime}</span>
          )}
        </div>
        {(() => {
          const raw = job.company.trim();
          const hasCustomer = Boolean(raw && raw !== "—");
          const display = hasCustomer ? raw : "—";
          return (
            <p
              className={`flex min-w-0 items-center gap-2 ${compact ? "text-xs" : "text-sm"} ${
                hasCustomer ? "text-gray-700" : "text-gray-400"
              }`}
              title="Customer (hiring organization)"
            >
              <Building2
                size={compact ? 14 : 16}
                className={`shrink-0 ${hasCustomer ? "text-slate-500" : "text-gray-400"}`}
              />
              <span className="truncate">{display}</span>
            </p>
          );
        })()}
        {!compact ? (
          <div className="flex flex-wrap gap-2">
            {job.skills.slice(0, 7).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 7 && (
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500">
                +{job.skills.length - 7} more
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className={`mb-4 space-y-2 text-sm ${compact ? "text-gray-600" : "text-gray-600"}`}>
        <div className="flex items-center gap-2">
          <MapPin size={16} className={compact ? "h-4 w-4 shrink-0 text-blue-600" : iconClass} />
          <span className="truncate">
            {formatJobCardLocation(job.location, job.locationFull, compact)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <PayIcon size={16} className={iconClass} />
          <span>{job.compensation}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className={iconClass} />
          <span>{job.startDate}</span>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Match</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((bar) => (
              <div
                key={bar}
                className={`h-2.5 w-2.5 rounded-[2px] ${
                  bar <= Math.ceil(job.matchPercentage / 20)
                    ? getMatchColor(job.matchPercentage)
                    : "bg-gray-200"
                }`}
              />
            ))}
          </div>
          <span className="text-sm font-semibold text-gray-900">{job.matchPercentage}%</span>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShare();
            }}
            className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0"
          >
            <Share2 size={16} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSaved(job);
            }}
            aria-label={saved ? "Unsave job" : "Save job"}
            aria-pressed={saved}
            className={`w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              saved
                ? "border-blue-600 bg-transparent text-blue-600"
                : "border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Bookmark size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}

export default function TalentEngineJobsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<ActionCard | null>(null);
  const [candidateId, setCandidateIdState] = useState<string | null>(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [allLocationOptions, setAllLocationOptions] = useState<LocationOption[]>([]);
  const [sortBy, setSortBy] = useState("Newest");
  const [skillSearch, setSkillSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(JOBS_FILTER_DEFAULTS);
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(() => new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [apiRecommendedJobs, setApiRecommendedJobs] = useState<JobCard[]>([]);
  const [hasAttemptedJobsLoad, setHasAttemptedJobsLoad] = useState(false);
  const [drawerSuccessMessage, setDrawerSuccessMessage] = useState<string | null>(null);
  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false);
  const [baseSkills, setBaseSkills] = useState<string[]>([]);
  const [dynamicSkills, setDynamicSkills] = useState<string[]>([]);
  const [dynamicEmploymentTypes, setDynamicEmploymentTypes] = useState<string[]>(EMPLOYMENT_TYPES);
  const [dynamicSeniorityLevels, setDynamicSeniorityLevels] = useState<string[]>(SENIORITY_LEVELS);
  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [appliedJobDocumentIds, setAppliedJobDocumentIds] = useState<Set<string>>(() => new Set());
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Candidate id is stored in sessionStorage on login.
    setCandidateIdState(getCandidateId());
  }, []);

  useEffect(() => {
    const cid = candidateId?.trim() || "";
    if (!cid) {
      setAppliedJobDocumentIds(new Set());
      return;
    }
    let cancelled = false;
    void (async () => {
      const next = new Set<string>();
      try {
        const apps = await getJobApplications(cid);
        for (const row of apps) {
          const id = row.job_id?.trim();
          if (id) next.add(id);
        }
      } catch {
        // ignore
      }
      try {
        const interests = await getCandidateInterests(cid);
        for (const row of interests) {
          const id = row.rr?.trim();
          if (id) next.add(id);
        }
      } catch {
        // ignore
      }
      if (!cancelled) setAppliedJobDocumentIds(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  useEffect(() => {
    const profileName = getProfileName()?.trim();
    if (!profileName) return;
    let cancelled = false;
    void (async () => {
      try {
        const ids = await getFavouriteJobs(profileName);
        if (!cancelled) setSavedJobIds(ids);
      } catch {
        // ignore — saved state simply stays empty
      }
    })();
    return () => { cancelled = true; };
  }, [candidateId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      let profileName = getProfileName()?.trim() || "";

      if (!profileName) {
        if (!active) return;
        setApiRecommendedJobs([]);
        setHasAttemptedJobsLoad(true);
        setBaseSkills([]);
        setIsLoadingSkills(false);
        return;
      }

      try {
        setIsLoadingSkills(true);
        const cachedRecommended = readRecommendedJobsCache(profileName);
        const hasCachedJobs = Boolean(cachedRecommended?.jobs?.length);
        if (!active) return;
        if (hasCachedJobs) {
          setApiRecommendedJobs((prev) =>
            mergeResolvedCustomerFromPrevious(
              cachedRecommended!.jobs.map((job) => mapRecommendedToJobsPageCard(job)),
              prev
            )
          );
        }
        const result = await getRecommendedJobsWithSkills(profileName);
        // Don't overwrite a valid cache with an empty response — the backend may temporarily
        // return no jobs while a profile is in draft-edit state.
        if (result.jobs.length > 0 || !hasCachedJobs) {
          writeRecommendedJobsCache(profileName, result.jobs);
        }
        if (!active) return;
        // Only update state when we have results, or when there was nothing cached to show.
        if (result.jobs.length > 0 || !hasCachedJobs) {
          setApiRecommendedJobs((prev) =>
            mergeResolvedCustomerFromPrevious(
              result.jobs.map((job) => mapRecommendedToJobsPageCard(job)),
              prev
            )
          );
        }
        // Update skills from API
        if (result.skills.length > 0) {
          setBaseSkills(result.skills);
        }
        setIsLoadingSkills(false);
      } catch {
        if (!active) return;
        const cachedRecommended = readRecommendedJobsCache(profileName);
        setApiRecommendedJobs((prev) =>
          mergeResolvedCustomerFromPrevious(
            (cachedRecommended?.jobs ?? []).map((job) => mapRecommendedToJobsPageCard(job)),
            prev
          )
        );
        setIsLoadingSkills(false);
      } finally {
        if (active) setHasAttemptedJobsLoad(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  /** Match dashboard: roles you already applied to drop off the recommended list. */
  const jobsSource = useMemo(
    () =>
      apiRecommendedJobs.filter(
        (job) => !(job.jobDocumentId?.trim() && appliedJobDocumentIds.has(job.jobDocumentId.trim()))
      ),
    [apiRecommendedJobs, appliedJobDocumentIds]
  );
  const isInitialJobsLoading = !hasAttemptedJobsLoad;

  useEffect(() => {
    const source = hasAttemptedJobsLoad ? apiRecommendedJobs : [];

    const employmentFromSource = Array.from(
      new Set(source.map((job) => job.employmentType.trim()).filter((v) => v && v !== "—"))
    );
    const seniorityFromSource = Array.from(
      new Set(source.map((job) => job.seniorityLevel.trim()).filter((v) => v && v !== "—"))
    );

    if (employmentFromSource.length > 0) {
      setDynamicEmploymentTypes((prev) => Array.from(new Set([...prev, ...employmentFromSource])));
    }

    if (seniorityFromSource.length > 0) {
      setDynamicSeniorityLevels((prev) => Array.from(new Set([...prev, ...seniorityFromSource])));
    }

    // Update dynamic skills from API-provided baseSkills
    setDynamicSkills(baseSkills);
  }, [apiRecommendedJobs, hasAttemptedJobsLoad, baseSkills]);

  /** Recommended list often omits `customer`; match the drawer by filling from RR details. */
  useEffect(() => {
    if (!hasAttemptedJobsLoad || apiRecommendedJobs.length === 0) return;
    const targets = apiRecommendedJobs.filter(
      (j) => j.jobDocumentId?.trim() && (!j.company.trim() || j.company === "—")
    );
    if (targets.length === 0) return;

    let cancelled = false;
    const concurrency = 4;

    void (async () => {
      const updates = new Map<number, string>();
      for (let i = 0; i < targets.length; i += concurrency) {
        if (cancelled) return;
        const batch = targets.slice(i, i + concurrency);
        await Promise.all(
          batch.map(async (j) => {
            const rrName = j.jobDocumentId!.trim();
            try {
              const details = await getRrDetails(rrName);
              const customer = details.customer?.trim();
              if (customer) updates.set(j.id, customer);
            } catch {
              // RR fetch is best-effort; card still shows "—".
            }
          })
        );
      }
      if (cancelled || updates.size === 0) return;
      setApiRecommendedJobs((prev) =>
        prev.map((job) => {
          const nextCompany = updates.get(job.id);
          return nextCompany ? { ...job, company: nextCompany } : job;
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [apiRecommendedJobs, hasAttemptedJobsLoad]);

  useEffect(() => {
    prefetchDropdownDetailsAfterLogin();
  }, []);

  useEffect(() => {
    // Billing Frequency filter is fixed to Monthly/Hourly.
    setDynamicEmploymentTypes(EMPLOYMENT_TYPES);
    // Rotation filter is a strict Yes/No toggle (backed by is_rotation),
    // so we intentionally keep the options fixed to avoid mismatches.
    setDynamicSeniorityLevels(SENIORITY_LEVELS);
    // Skills are now loaded exclusively from the recommended jobs API to avoid flickering
    // with stale dropdown data. Skip dropdown skill loading to prevent temporary mismatches.
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getAllLocationOptions()
      .then((options) => { if (!cancelled) setAllLocationOptions(options); })
      .catch(() => { if (!cancelled) setAllLocationOptions([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const query = skillSearch.trim();
    const normalizedQuery = query.toLowerCase();
    const localMatches = query
      ? baseSkills.filter((skill) => skill.toLowerCase().includes(normalizedQuery))
      : baseSkills;

    if (query.length === 0) {
      setDynamicSkills(baseSkills);
      return;
    }
    // Keep skill suggestions responsive even if remote search is strict.
    setDynamicSkills(localMatches);

    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const skillsRes = await getDropdownDetailsOptions({
          doctype: "Profile Version",
          fieldName: "key_skills",
          search: query,
          page: 1,
          limit: 50,
        }).catch(() => null);

        if (!active) return;
        if (Array.isArray(skillsRes)) {
          const mergedMatches = Array.from(new Set([...localMatches, ...skillsRes])).filter((skill) =>
            skill.toLowerCase().includes(normalizedQuery)
          );
          setDynamicSkills(mergedMatches);
        }
      })();
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [skillSearch, baseSkills]);

  /** Jobs that match search/skills/salary/etc. but not location — used so the drawer only lists locations that can appear in the list. */
  const jobsMatchingNonLocationFilters = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const selectedRotations = new Set(filters.seniorityLevels.map(normalizeRotationForJobFilter));
    return jobsSource.filter((job) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [job.title, job.company, job.location, job.locationFull, ...job.skills]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesSkills =
        filters.skills.length === 0 || filters.skills.some((skill) => job.skills.includes(skill));
      const matchesEmployment =
        filters.employmentTypes.length === 0 ||
        filters.employmentTypes.includes(job.employmentType);
      const matchesSeniority =
        filters.seniorityLevels.length === 0 ||
        selectedRotations.has(rotationBucketFromJobCard(job));
      const matchesSalary =
        job.compensationValue >= filters.salaryMin &&
        job.compensationValue <= filters.salaryMax;
      const matchesSaved = !showSavedOnly || savedJobIds.has(job.jobDocumentId ?? "");

      return (
        matchesSearch &&
        matchesSkills &&
        matchesEmployment &&
        matchesSeniority &&
        matchesSalary &&
        matchesSaved
      );
    });
  }, [filters, jobsSource, searchQuery, showSavedOnly, savedJobIds]);

  const availableLocations = useMemo<LocationOption[]>(() => {
    const catalogById = new Map<string, string>();
    for (const location of allLocationOptions) {
      const id = location.id?.trim();
      const label = location.label?.trim();
      if (!id || !label) continue;
      catalogById.set(id, label);
    }

    const byId = new Map<string, string>();
    for (const job of jobsMatchingNonLocationFilters) {
      const id = job.locationId?.trim();
      if (!id || id === "—" || id.toLowerCase() === "unknown-location") continue;
      const fromCatalog = catalogById.get(id);
      const parts = [job.location, job.locationFull].filter((v) => v && v !== "—");
      const fromJob = [...new Set(parts)].join(", ");
      const label = fromCatalog || fromJob || id;
      if (label.toLowerCase().replace(/\s/g, "-") === "unknown-location") continue;
      if (!byId.has(id)) byId.set(id, label);
    }

    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allLocationOptions, jobsMatchingNonLocationFilters]);

  const locationLabelMap = useMemo<Record<string, string>>(
    () =>
      availableLocations.reduce<Record<string, string>>((accumulator, location) => {
        accumulator[location.id] = location.label;
        return accumulator;
      }, {}),
    [availableLocations]
  );

  const primaryLocation = selectedLocations[0]
    ? locationLabelMap[selectedLocations[0]] || selectedLocations[0]
    : "All locations";
  const extraCount = Math.max(selectedLocations.length - 1, 0);

  useEffect(() => {
    const validIds = new Set(availableLocations.map((location) => location.id));
    setSelectedLocations((previous) => previous.filter((id) => validIds.has(id)));
  }, [availableLocations]);

  const activeFilterCount = [
    filters.skills.length > 0,
    filters.employmentTypes.length > 0,
    filters.seniorityLevels.length > 0,
    filters.salaryMin !== JOBS_FILTER_DEFAULTS.salaryMin ||
      filters.salaryMax !== JOBS_FILTER_DEFAULTS.salaryMax,
  ].filter(Boolean).length;

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const selectedRotations = new Set(filters.seniorityLevels.map(normalizeRotationForJobFilter));

    const results = jobsSource.filter((job) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [job.title, job.company, job.location, job.locationFull, ...job.skills]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesLocation =
        selectedLocations.length === 0 ||
        selectedLocations.includes(job.locationId);
      const matchesSkills =
        filters.skills.length === 0 ||
        filters.skills.some((skill) => job.skills.includes(skill));
      const matchesEmployment =
        filters.employmentTypes.length === 0 ||
        filters.employmentTypes.includes(job.employmentType);
      const matchesSeniority =
        filters.seniorityLevels.length === 0 ||
        selectedRotations.has(rotationBucketFromJobCard(job));
      const matchesSalary =
        job.compensationValue >= filters.salaryMin &&
        job.compensationValue <= filters.salaryMax;

      const matchesSaved = !showSavedOnly || savedJobIds.has(job.jobDocumentId ?? "");

      return (
        matchesSearch &&
        matchesLocation &&
        matchesSkills &&
        matchesEmployment &&
        matchesSeniority &&
        matchesSalary &&
        matchesSaved
      );
    });

    if (sortBy === "Newest") {
      return [...results].sort(
        (a, b) =>
          recencyScoreFromPostedTime(a.postedTime) - recencyScoreFromPostedTime(b.postedTime)
      );
    }

    if (sortBy === "Highest Match") {
      return [...results].sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    if (sortBy === "Rotation") {
      const rotationRank = (value: string) => {
        const normalized = value.trim().toLowerCase();
        if (normalized === "yes") return 0;
        if (normalized === "no") return 1;
        return 2;
      };
      return [...results].sort((a, b) => {
        const diff = rotationRank(a.seniorityLevel) - rotationRank(b.seniorityLevel);
        if (diff !== 0) return diff;
        return b.matchPercentage - a.matchPercentage;
      });
    }

    return [...results].sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [
    filters,
    hasAttemptedJobsLoad,
    jobsSource,
    searchQuery,
    selectedLocations,
    sortBy,
    showSavedOnly,
    savedJobIds,
  ]);

  const toggleSavedJob = async (job: JobCard) => {
    const profileName = getProfileName()?.trim();
    const jobDocId = job.jobDocumentId?.trim();
    if (!jobDocId) return;

    const isCurrentlySaved = savedJobIds.has(jobDocId);
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobDocId)) {
        next.delete(jobDocId);
      } else {
        next.add(jobDocId);
      }
      return next;
    });

    if (profileName && !isCurrentlySaved) {
      try {
        await createFavourite(profileName, jobDocId);
      } catch (error) {
        console.error("Failed to create favourite:", error);
      }
    }
  };

  const handleJobApplyClick = (job: JobCard) => {
    const nextAction: ActionCard = {
      id: job.id,
      type: "Job",
      title: job.title,
      subtitle: `${job.location} - ${job.locationFull}`,
      timestamp: job.postedTime,
      jobDocumentId: job.jobDocumentId,
      matchPercentage: job.matchPercentage,
      customer: job.company.trim() && job.company !== "—" ? job.company.trim() : undefined,
      skills: job.skills.length ? job.skills : undefined,
    };

    setDrawerSuccessMessage(null);
    const isSameJobAlreadyOpen =
      isDrawerOpen &&
      selectedAction?.type === "Job" &&
      selectedAction.id === job.id;

    if (isSameJobAlreadyOpen) {
      setIsDrawerOpen(false);
      return;
    }

    setSelectedAction(nextAction);
    setIsDrawerOpen(true);
  };

  const refreshAppliedJobs = async (currentCandidateId: string) => {
    if (!currentCandidateId.trim()) return;
    try {
      const next = new Set<string>();
      try {
        const apps = await getJobApplications(currentCandidateId);
        for (const row of apps) {
          const id = row.job_id?.trim();
          if (id) next.add(id);
        }
      } catch {
        // ignore
      }
      try {
        const interests = await getCandidateInterests(currentCandidateId);
        for (const row of interests) {
          const id = row.rr?.trim();
          if (id) next.add(id);
        }
      } catch {
        // ignore
      }
      setAppliedJobDocumentIds(next);
    } catch {
      // ignore
    }
  };

  const handleDrawerPrimaryAction = async (
    action: ActionCard,
    extras?: {
      availabilityDate?: string;
      expectedSalary?: string;
      acceptTerms?: boolean;
    }
  ): Promise<boolean> => {
    const jobDocumentId = action.jobDocumentId?.trim() || "";
    const cid = candidateId?.trim() || "";
    if (!cid) {
      throw new Error("Missing candidate session. Please log in again and retry.");
    }
    if (!jobDocumentId) {
      throw new Error("This job is missing an id, so it can’t be applied to yet.");
    }
    const parsedSalary = Number.parseFloat(extras?.expectedSalary?.trim() || "");
    const res = await markInterestedInJob(cid, jobDocumentId, {
      score: action.matchPercentage,
      availableDate: extras?.availabilityDate?.trim() || undefined,
      expectedSalary: Number.isFinite(parsedSalary) && parsedSalary > 0 ? parsedSalary : undefined,
    });
    const msg = res?.message?.message?.trim();
    setDrawerSuccessMessage(msg || "Applied successfully.");
    setAppliedJobDocumentIds((prev) => {
      const n = new Set(prev);
      n.add(jobDocumentId);
      return n;
    });
    setApiRecommendedJobs((prev) =>
      prev.filter((j) => j.jobDocumentId?.trim() !== jobDocumentId)
    );
    await refreshAppliedJobs(cid);
    setIsDrawerOpen(false);
    return true;
  };

  useEffect(() => {
    if (!drawerSuccessMessage) return;
    setShowApplicationSuccess(true);
  }, [drawerSuccessMessage]);

  const isCompactJobsLayout = useIsBelowLg();

  const jobsMainMobile = (
    <main className="px-4 pt-4 pb-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Jobs For You</h1>

      <div className="relative mb-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          type="search"
          placeholder="Search by job name..."
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-4 pr-14 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded border border-gray-200 bg-gray-50">
          <Search className="h-4 w-4 text-gray-500" aria-hidden />
        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          ref={locationButtonRef}
          type="button"
          onClick={() => setLocationDrawerOpen(true)}
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-900"
        >
          <MapPin className="h-4 w-4 shrink-0 text-blue-600" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{primaryLocation}</span>
          {extraCount > 0 ? (
            <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
              +{extraCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          aria-label={showSavedOnly ? "Show all jobs" : "Show saved jobs only"}
          aria-pressed={showSavedOnly}
          onClick={() => setShowSavedOnly((v) => !v)}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white ${
            showSavedOnly ? "border-blue-600 text-blue-600" : "border-gray-200 text-gray-700"
          }`}
        >
          <Bookmark className="h-4 w-4" />
        </button>
        <button
          ref={filterButtonRef}
          type="button"
          onClick={() => setFilterDrawerOpen(true)}
          aria-label="Filters"
          className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-white ${
            activeFilterCount > 0 ? "border-blue-600 text-blue-600" : "border-gray-200 text-gray-700"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className="relative mb-5">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-11 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-4 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {/* Sort by: {option} */}
              {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      {showSavedOnly && !isInitialJobsLoading && (
        <h2 className="mb-3 text-base font-semibold text-gray-900">Saved Jobs</h2>
      )}

      {isInitialJobsLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          <p className="mb-1 text-sm font-semibold text-gray-900">Loading jobs for you...</p>
          <p className="text-sm text-gray-500">We are finding the best matches based on your profile.</p>
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredJobs.map((job) => (
            <JobsCard
              key={job.id}
              job={job}
              saved={savedJobIds.has(job.jobDocumentId ?? "")}
              onToggleSaved={toggleSavedJob}
              onShare={() => setShowReferModal(true)}
              onApply={() => handleJobApplyClick(job)}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="mb-1 text-sm font-medium text-gray-900">
            {showSavedOnly ? "No saved jobs" : "No jobs found"}
          </p>
          <p className="text-sm text-gray-500">
            {showSavedOnly
              ? "Save jobs to view them here."
              : "Try broadening the selected filters or changing the location."}
          </p>
        </div>
      )}
    </main>
  );

  const jobsMainDesktop = (
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Jobs For You</h1>

        <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4 items-start">
          <JobsFilterPanel
            searchSkills={skillSearch}
            onSearchSkillsChange={setSkillSearch}
            filters={filters}
            onFiltersChange={setFilters}
            skillsOptions={dynamicSkills}
            employmentTypeOptions={dynamicEmploymentTypes}
            seniorityLevelOptions={dynamicSeniorityLevels}
          />

          <section className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px_110px_170px] gap-2">
              <div className="flex flex-col sm:flex-row gap-2 lg:col-span-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search jobs, company, skill..."
                    className="pl-10 pr-4 h-10 border rounded-lg text-sm w-full bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    ref={locationButtonRef}
                    type="button"
                    onClick={() => setLocationDrawerOpen(true)}
                    className="flex items-center gap-2 border rounded-lg px-4 h-10 text-sm whitespace-nowrap flex-1 sm:flex-initial justify-center sm:justify-start bg-white"
                  >
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{primaryLocation}</span>
                    {extraCount > 0 ? (
                      <span className="text-blue-600 flex-shrink-0">+{extraCount}</span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    aria-label={showSavedOnly ? "Show all jobs" : "Show saved jobs only"}
                    aria-pressed={showSavedOnly}
                    onClick={() => setShowSavedOnly((v) => !v)}
                    className={`w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      showSavedOnly
                        ? "border-blue-600 text-blue-600 bg-white"
                        : "border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <Bookmark size={16} />
                  </button>

                  <div className="relative min-w-[180px]">
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                      className="w-full h-10 border rounded-lg bg-white text-sm text-gray-700 pl-4 pr-10 appearance-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {SORT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {/* Sort by: {option} */}
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-700">
                  {selectedLocations.length > 0
                    ? `${selectedLocations.length} location${selectedLocations.length > 1 ? "s" : ""}`
                    : "All locations"}
                </span>
                {selectedLocations.slice(1).map((locationId) => (
                  <span
                    key={locationId}
                    className="px-3 py-1 rounded-full bg-blue-50 text-xs text-blue-700"
                  >
                    {locationLabelMap[locationId] || locationId}
                  </span>
                ))}
              </div>
              <div className="shrink-0 text-xs text-gray-500">
                Total jobs: <span className="font-semibold text-gray-700">{filteredJobs.length}</span>
              </div>
            </div>

            {showSavedOnly && !isInitialJobsLoading && (
              <h2 className="mb-3 text-base font-semibold text-gray-900">Saved Jobs</h2>
            )}

            {isInitialJobsLoading ? (
              <div className="bg-white border border-gray-200 rounded-sm px-6 py-12 text-center">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-semibold text-gray-900 mb-1">Loading jobs for you...</p>
                <p className="text-sm text-gray-500">
                  We are finding the best matches based on your profile.
                </p>
              </div>
            ) : filteredJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map((job) => (
                  <JobsCard
                    key={job.id}
                    job={job}
                    saved={savedJobIds.has(job.jobDocumentId ?? "")}
                    onToggleSaved={toggleSavedJob}
                    onShare={() => setShowReferModal(true)}
                    onApply={() => handleJobApplyClick(job)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-gray-300 rounded-sm px-6 py-12 text-center">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {showSavedOnly ? "No saved jobs" : "No jobs found"}
                </p>
                <p className="text-sm text-gray-500">
                  {showSavedOnly
                    ? "Save jobs to view them here."
                    : "Try broadening the selected filters or changing the location."}
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
  );

  const jobsDrawers = (
    <>
      <LocationDrawer
        open={locationDrawerOpen}
        onClose={() => setLocationDrawerOpen(false)}
        onApply={(locations) => setSelectedLocations(locations)}
        triggerRef={locationButtonRef}
        initialSelected={selectedLocations}
        options={availableLocations}
      />
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={(next) => setFilters(next)}
        triggerRef={filterButtonRef}
        initialFilters={filters}
        skillsOptions={dynamicSkills}
        employmentTypeOptions={dynamicEmploymentTypes}
        seniorityLevelOptions={dynamicSeniorityLevels}
        skipDropdownSkillsLoad={true}
        isLoadingSkills={isLoadingSkills}
      />
      <ActionDrawer
        open={isDrawerOpen}
        action={selectedAction}
        profileId={getProfileName()}
        onClose={() => setIsDrawerOpen(false)}
        onPrimaryAction={handleDrawerPrimaryAction}
        successMessage={drawerSuccessMessage}
        jobAlreadyApplied={Boolean(
          selectedAction?.jobDocumentId?.trim() &&
            appliedJobDocumentIds.has(selectedAction.jobDocumentId.trim())
        )}
      />
      <ReferFriendModal open={showReferModal} onClose={() => setShowReferModal(false)} />
      <JobSuccessPopup
        open={showApplicationSuccess}
        title="Application Submitted Successfully"
        message="Your interest has been shared with the recruiter. We'll notify you."
        onClose={() => {
          setShowApplicationSuccess(false);
          setDrawerSuccessMessage(null);
        }}
      />
    </>
  );

  if (isCompactJobsLayout) {
    return (
      <>
        <CandidateAppShell showBottomNav={false}>{jobsMainMobile}</CandidateAppShell>
        {jobsDrawers}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF0F3]">
      <AppNavbar />
      {jobsMainDesktop}
      {jobsDrawers}
    </div>
  );
}
