"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Calendar,
  ChevronDown,
  DollarSign,
  MapPin,
  Search,
  Share2,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
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
  SKILLS,
} from "../ui/FilterDrawer";
import { getDropdownDetailsOptions } from "@/services/jobs/dropdownDetails";
import {
  DEFAULT_LOCATIONS,
  LocationDrawer,
  type LocationOption,
} from "../ui/LocationDrawer";
import { useIsBelowLg } from "@/lib/useResponsive";
import { getProfileName, setProfileName } from "@/lib/authSession";
import {
  isRecommendedJobsCacheStale,
  readRecommendedJobsCache,
  writeRecommendedJobsCache,
} from "@/lib/recommendedJobsCache";
import { getRecommendedJobs } from "@/services/jobs/actionCenter";
import { mapRecommendedToJobsPageCard } from "@/services/jobs/mapApiJobsToUi";

interface JobCard {
  id: number;
  title: string;
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
}

interface ActionCard {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
}

const JOBS: JobCard[] = [
  {
    id: 1,
    title: "Fuel Operation Engineer",
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
    employmentType: "Part Time",
    seniorityLevel: "Entry Level",
  },
  {
    id: 2,
    title: "Mechanical Technician",
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
    employmentType: "Full Time",
    seniorityLevel: "Mid Level",
  },
  {
    id: 3,
    title: "Pump Maintenance Engineer",
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
    employmentType: "Internship",
    seniorityLevel: "Entry Level",
  },
  {
    id: 4,
    title: "Pump Operator",
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
    employmentType: "Training Jobs",
    seniorityLevel: "Senior Level",
  },
  {
    id: 5,
    title: "Fuel Operation Engineer",
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
    employmentType: "Part Time",
    seniorityLevel: "Entry Level",
  },
  {
    id: 6,
    title: "Mechanical Technician",
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
    employmentType: "Full Time",
    seniorityLevel: "Mid Level",
  },
];

const SORT_OPTIONS = ["Most Relevant", "Newest", "Highest Match"];
const JOBS_FILTER_DEFAULTS: FilterState = {
  ...DEFAULT_FILTERS,
  salaryMax: 10000,
};

function FilterCheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(
      selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option]
    );
  };

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
}: {
  searchSkills: string;
  onSearchSkillsChange: (value: string) => void;
  filters: FilterState;
  onFiltersChange: (value: FilterState) => void;
  skillsOptions: string[];
  employmentTypeOptions: string[];
  seniorityLevelOptions: string[];
}) {
  const filteredSkills = skillsOptions.filter((skill) =>
    skill.toLowerCase().includes(searchSkills.toLowerCase())
  );

  const setValue = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <aside className="bg-white border border-gray-200 rounded-sm p-4 space-y-5">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Skills</h2>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={searchSkills}
            onChange={(event) => onSearchSkillsChange(event.target.value)}
            placeholder="Search by name..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-sm text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <p className="text-xs font-medium text-gray-700 mb-3">Popular Skills</p>
        <FilterCheckboxGroup
          options={filteredSkills}
          selected={filters.skills}
          onChange={(value) => setValue("skills", value)}
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Type of Employment</h2>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <FilterCheckboxGroup
          options={employmentTypeOptions}
          selected={filters.employmentTypes}
          onChange={(value) => setValue("employmentTypes", value)}
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Seniority Level</h2>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>
        <FilterCheckboxGroup
          options={seniorityLevelOptions}
          selected={filters.seniorityLevels}
          onChange={(value) => setValue("seniorityLevels", value)}
        />
      </div>

      <div className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Salary Range</h2>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </div>

        <div className="relative h-1.5 bg-gray-200 rounded-full mb-6 mx-1">
          <div
            className="absolute h-1.5 bg-blue-600 rounded-full"
            style={{
              left: `${(filters.salaryMin / 10000) * 100}%`,
              right: `${100 - (filters.salaryMax / 10000) * 100}%`,
            }}
          />

          <input
            type="range"
            min={0}
            max={10000}
            step={500}
            value={filters.salaryMin}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (next < filters.salaryMax) setValue("salaryMin", next);
            }}
            className="absolute w-full h-full opacity-0 cursor-pointer"
          />
          <input
            type="range"
            min={0}
            max={10000}
            step={500}
            value={filters.salaryMax}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (next > filters.salaryMin) setValue("salaryMax", next);
            }}
            className="absolute w-full h-full opacity-0 cursor-pointer"
          />

          <div
            className="absolute w-4 h-4 bg-white border border-gray-300 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-sm"
            style={{ left: `${(filters.salaryMin / 10000) * 100}%` }}
          />
          <div
            className="absolute w-4 h-4 bg-white border border-gray-300 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-sm"
            style={{ left: `${(filters.salaryMax / 10000) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-5">
          <div>
            <p className="mb-1">Min</p>
            <div className="flex items-center gap-2">
              <span>$</span>
              <input
                type="number"
                value={filters.salaryMin}
                min={0}
                max={filters.salaryMax - 500}
                step={500}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (next < filters.salaryMax) setValue("salaryMin", next);
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
                value={filters.salaryMax}
                min={filters.salaryMin + 500}
                max={10000}
                step={500}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (next > filters.salaryMin) setValue("salaryMax", next);
                }}
                className="w-full border border-gray-200 rounded-sm px-2 py-1.5 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onFiltersChange(JOBS_FILTER_DEFAULTS)}
            className="h-9 text-sm text-gray-700 border border-gray-200 rounded-sm hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="button"
            className="h-9 text-sm text-white bg-blue-600 rounded-sm hover:bg-blue-700"
          >
            Apply
          </button>
        </div>
      </div>
    </aside>
  );
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
  if (percentage >= 70) return "bg-blue-600";
  if (percentage >= 40) return "bg-blue-500";
  return "bg-yellow-400";
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
  onToggleSaved: (jobId: number) => void;
  onShare: () => void;
  onApply: () => void;
  /** Mobile layout: no skill chips, pipe in location, wallet icon, tighter spacing */
  compact?: boolean;
}) {
  const PayIcon = compact ? Wallet : DollarSign;
  const iconClass = compact ? "h-4 w-4 shrink-0 text-slate-500" : "flex-shrink-0";

  return (
    <article
      className={`group flex min-h-[240px] flex-col justify-between rounded-xl border border-gray-200 bg-white transition-all ${
        compact
          ? "border-b-4 border-b-blue-600 p-4 shadow-sm"
          : "rounded-lg border-b-4 border-b-blue-600 p-4 hover:border-blue-600 hover:border-b-blue-600 hover:shadow-md sm:p-6"
      }`}
    >
      <div className="mb-3 flex justify-between sm:mb-4">
        <span
          className={`rounded-full px-2 py-1 text-xs sm:px-3 ${getStatusColor(job.status)}`}
        >
          {job.status}
        </span>
        <span className="text-xs text-gray-500">{job.postedTime}</span>
      </div>

      <div className="mb-3 sm:mb-4">
        <h3
          className={`font-semibold text-gray-900 ${compact ? "text-base" : "mb-3 text-base sm:mb-4 sm:text-lg"}`}
        >
          {job.title}
        </h3>
        {!compact ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
              >
                {skill}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className={`mb-4 space-y-2 text-sm ${compact ? "text-gray-600" : "text-gray-600"}`}>
        <div className="flex items-center gap-2">
          <MapPin size={16} className={compact ? "h-4 w-4 shrink-0 text-blue-600" : iconClass} />
          <span className="truncate">
            {compact
              ? `${job.location} | ${job.locationFull}`
              : `${job.location} - ${job.locationFull}`}
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
            onClick={onShare}
            className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0"
          >
            <Share2 size={16} />
          </button>
          <button
            type="button"
            onClick={() => onToggleSaved(job.id)}
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
          <button
            type="button"
            onClick={onApply}
            className="relative border border-gray-300 rounded-lg px-6 sm:px-8 py-2 text-sm text-gray-800 bg-white transition-all flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 hover:bg-blue-600 hover:border-blue-600 flex-1 sm:flex-initial"
          >
            <span className="transition-all group-hover:text-white group-hover:-translate-x-1">
              Apply
            </span>
            <span className="absolute right-4 opacity-0 translate-x-1 text-white transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M2.91675 7H11.0834"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7.58325 3.5L11.0833 7L7.58325 10.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
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
  const [showReferModal, setShowReferModal] = useState(false);
  const [locationDrawerOpen, setLocationDrawerOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("Most Relevant");
  const [skillSearch, setSkillSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>(JOBS_FILTER_DEFAULTS);
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(() => new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [apiRecommendedJobs, setApiRecommendedJobs] = useState<JobCard[]>([]);
  const [hasAttemptedJobsLoad, setHasAttemptedJobsLoad] = useState(false);
  const [dynamicSkills, setDynamicSkills] = useState<string[]>(SKILLS);
  const [dynamicEmploymentTypes, setDynamicEmploymentTypes] = useState<string[]>(EMPLOYMENT_TYPES);
  const [dynamicSeniorityLevels, setDynamicSeniorityLevels] = useState<string[]>(SENIORITY_LEVELS);
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      let profileName = getProfileName()?.trim() || "";
      if (!profileName) {
        try {
          const resolverUrl = new URL("/api/method/resolve_profile_name", window.location.origin);
          const resolverRes = await fetch(resolverUrl.toString(), {
            method: "GET",
            credentials: "same-origin",
          });
          if (resolverRes.ok) {
            const resolverData = (await resolverRes.json()) as { profile_name?: string };
            if (typeof resolverData.profile_name === "string" && resolverData.profile_name.trim()) {
              profileName = resolverData.profile_name.trim();
              setProfileName(profileName);
            }
          }
        } catch {
          // ignore resolver failures; empty state will be shown.
        }
      }

      if (!profileName) {
        if (!active) return;
        setApiRecommendedJobs([]);
        setHasAttemptedJobsLoad(true);
        return;
      }

      try {
        const cachedRecommended = readRecommendedJobsCache(profileName);
        const shouldRefreshRecommended = isRecommendedJobsCacheStale(profileName);
        const recommended = shouldRefreshRecommended
          ? await getRecommendedJobs(profileName)
          : (cachedRecommended?.jobs ?? []);
        if (shouldRefreshRecommended) {
          writeRecommendedJobsCache(profileName, recommended);
        }
        if (!active) return;
        setApiRecommendedJobs(recommended.map((job) => mapRecommendedToJobsPageCard(job)));
      } catch {
        if (!active) return;
        setApiRecommendedJobs([]);
      } finally {
        if (active) setHasAttemptedJobsLoad(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const skillsRes = await getDropdownDetailsOptions({
        doctype: "Resource Requirement",
        fieldName: "key_skills",
        limit: 1000,
      }).catch(() => null);

      if (!active) return;
      if (Array.isArray(skillsRes) && skillsRes.length > 0) {
        setDynamicSkills(skillsRes);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const availableLocations = useMemo<LocationOption[]>(() => {
    const sourceJobs = hasAttemptedJobsLoad && apiRecommendedJobs.length > 0 ? apiRecommendedJobs : JOBS;
    const byId = new Map<string, string>();
    for (const job of sourceJobs) {
      const id = job.locationId?.trim();
      if (!id || id === "—") continue;
      const label = [job.location, job.locationFull].filter((v) => v && v !== "—").join(", ");
      byId.set(id, label || id);
    }

    if (byId.size === 0) return DEFAULT_LOCATIONS;
    return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
  }, [apiRecommendedJobs, hasAttemptedJobsLoad]);

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

  const activeFilterCount = [
    filters.skills.length > 0,
    filters.employmentTypes.length > 0,
    filters.seniorityLevels.length > 0,
    filters.salaryMin !== JOBS_FILTER_DEFAULTS.salaryMin ||
      filters.salaryMax !== JOBS_FILTER_DEFAULTS.salaryMax,
  ].filter(Boolean).length;

  const filteredJobs = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const jobsSource = hasAttemptedJobsLoad ? apiRecommendedJobs : JOBS;

    const results = jobsSource.filter((job) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        [job.title, job.location, job.locationFull]
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
        filters.seniorityLevels.includes(job.seniorityLevel);
      const matchesSalary =
        job.compensationValue >= filters.salaryMin &&
        job.compensationValue <= filters.salaryMax;

      const matchesSaved = !showSavedOnly || savedJobIds.has(job.id);

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
      return [...results].sort((a, b) => a.postedTime.localeCompare(b.postedTime));
    }

    if (sortBy === "Highest Match") {
      return [...results].sort((a, b) => b.matchPercentage - a.matchPercentage);
    }

    return [...results].sort((a, b) => b.matchPercentage - a.matchPercentage);
  }, [
    apiRecommendedJobs,
    filters,
    hasAttemptedJobsLoad,
    searchQuery,
    selectedLocations,
    sortBy,
    showSavedOnly,
    savedJobIds,
  ]);

  const toggleSavedJob = (jobId: number) => {
    setSavedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const handleJobApplyClick = (job: JobCard) => {
    const nextAction: ActionCard = {
      id: job.id,
      type: "Job",
      title: job.title,
      subtitle: `${job.location} - ${job.locationFull}`,
      timestamp: job.postedTime,
    };

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

  const isCompactJobsLayout = useIsBelowLg();

  const jobsMainMobile = (
    <main className="px-4 pt-4 pb-6">
      <h1 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Jobs</h1>

      <div className="relative mb-3">
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          type="search"
          placeholder="Search by job name..."
          autoComplete="off"
          className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-4 pr-14 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              Sort by: {option}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      {filteredJobs.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredJobs.map((job) => (
            <JobsCard
              key={job.id}
              job={job}
              saved={savedJobIds.has(job.id)}
              onToggleSaved={toggleSavedJob}
              onShare={() => setShowReferModal(true)}
              onApply={() => handleJobApplyClick(job)}
              compact
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
          <p className="mb-1 text-sm font-medium text-gray-900">No jobs found</p>
          <p className="text-sm text-gray-500">
            Try broadening the selected filters or changing the location.
          </p>
        </div>
      )}
    </main>
  );

  const jobsMainDesktop = (
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900 mb-4">Jobs</h1>

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
                    className="w-10 h-10 border rounded-lg flex items-center justify-center flex-shrink-0 bg-white text-gray-700 hover:bg-gray-50"
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
                          Sort by: {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              {filteredJobs.length} results for{" "}
              {selectedLocations.length > 0 ? primaryLocation : "all locations"}
            </div>

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

            {filteredJobs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredJobs.map((job) => (
                  <JobsCard
                    key={job.id}
                    job={job}
                    saved={savedJobIds.has(job.id)}
                    onToggleSaved={toggleSavedJob}
                    onShare={() => setShowReferModal(true)}
                    onApply={() => handleJobApplyClick(job)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-dashed border-gray-300 rounded-sm px-6 py-12 text-center">
                <p className="text-sm font-medium text-gray-900 mb-1">No jobs found</p>
                <p className="text-sm text-gray-500">
                  Try broadening the selected filters or changing the location.
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
      />
      <ActionDrawer
        open={isDrawerOpen}
        action={selectedAction}
        onClose={() => setIsDrawerOpen(false)}
      />
      <ReferFriendModal open={showReferModal} onClose={() => setShowReferModal(false)} />
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
