"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Calendar,
  ChevronDown,
  ChevronUp,
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
} from "../ui/FilterDrawer";
import {
  getDropdownDetailsOptions,
  prefetchDropdownDetailsAfterLogin,
} from "@/services/jobs/dropdownDetails";
import {
  LocationDrawer,
  type LocationOption,
} from "../ui/LocationDrawer";
import { useIsBelowLg } from "@/lib/useResponsive";
import { getCandidateId, getProfileName, setProfileName } from "@/lib/authSession";
import {
  readRecommendedJobsCache,
  writeRecommendedJobsCache,
} from "@/lib/recommendedJobsCache";
import {
  getRecommendedJobs,
  markInterestedInJob,
} from "@/services/jobs/actionCenter";
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
  jobDocumentId?: string;
}

interface ActionCard {
  id: number;
  type: "Job" | "Profile" | "General";
  title: string;
  subtitle: string;
  timestamp: string;
  jobDocumentId?: string;
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
    employmentType: "Hourly",
    seniorityLevel: "No",
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
    employmentType: "Monthly",
    seniorityLevel: "Yes",
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
    employmentType: "Monthly",
    seniorityLevel: "No",
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
    employmentType: "Hourly",
    seniorityLevel: "Yes",
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
    employmentType: "Hourly",
    seniorityLevel: "No",
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
    employmentType: "Monthly",
    seniorityLevel: "Yes",
  },
];

const SORT_OPTIONS = ["Newest", "Highest Match"];
const SKILLS_PREVIEW_LIMIT = 8;
const SKILL_SEARCH_MIN_LENGTH = 3;
const SAVED_JOBS_STORAGE_PREFIX = "te.jobs.saved";
const JOBS_FILTER_DEFAULTS: FilterState = {
  ...DEFAULT_FILTERS,
  salaryMax: 10000,
};

function getSavedJobsStorageKey(candidateId: string | null): string | null {
  const id = candidateId?.trim();
  if (!id) return null;
  return `${SAVED_JOBS_STORAGE_PREFIX}:${id}`;
}

function FilterCheckboxGroup({
  options,
  selected,
  onChange,
  singleSelect = false,
}: {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  singleSelect?: boolean;
}) {
  const toggle = (option: string) => {
    if (singleSelect) {
      onChange(selected.includes(option) ? [] : [option]);
      return;
    }
    onChange(selected.includes(option) ? selected.filter((value) => value !== option) : [...selected, option]);
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
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [openSections, setOpenSections] = useState({
    skills: true,
    employment: true,
    seniority: true,
    salary: true,
  });
  const trimmedSkillsSearch = searchSkills.trim();
  const requiresMoreChars =
    trimmedSkillsSearch.length > 0 && trimmedSkillsSearch.length < SKILL_SEARCH_MIN_LENGTH;
  const filteredSkills = skillsOptions.filter((skill) =>
    skill.toLowerCase().includes(searchSkills.toLowerCase())
  );
  const visibleSkills =
    requiresMoreChars
      ? []
      : showAllSkills || trimmedSkillsSearch.length > 0
      ? filteredSkills
      : filteredSkills.slice(0, SKILLS_PREVIEW_LIMIT);
  const canToggleSkillsView = trimmedSkillsSearch.length === 0 && filteredSkills.length > SKILLS_PREVIEW_LIMIT;

  useEffect(() => {
    setShowAllSkills(false);
  }, [searchSkills]);

  const setValue = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onFiltersChange({ ...filters, [key]: value });

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
            {requiresMoreChars ? (
              <p className="mb-3 text-xs text-gray-500">Type at least 3 letters to search skills.</p>
            ) : null}
            <FilterCheckboxGroup
              options={visibleSkills}
              selected={filters.skills}
              onChange={(value) => setValue("skills", value)}
            />
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
            selected={filters.employmentTypes}
            onChange={(value) => setValue("employmentTypes", value)}
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
            selected={filters.seniorityLevels}
            onChange={(value) => setValue("seniorityLevels", value)}
            singleSelect={true}
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
          const minPct = (filters.salaryMin / 10000) * 100;
          const maxPct = (filters.salaryMax / 10000) * 100;
          return (
        <div className="relative h-1.5 bg-gray-200 rounded-full mb-6 mx-1">
          <div
            className="absolute h-1.5 bg-blue-600 rounded-full"
            style={{
              left: `${minPct}%`,
              right: `${100 - maxPct}%`,
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
            className="dual-range-input absolute w-full h-full opacity-0"
            style={{
              zIndex: 10,
            }}
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
            className="dual-range-input absolute w-full h-full opacity-0"
            style={{
              zIndex: 11,
            }}
          />

          <div
            className="absolute w-4 h-4 bg-white border border-gray-300 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-sm pointer-events-none"
            style={{ left: `${minPct}%` }}
          />
          <div
            className="absolute w-4 h-4 bg-white border border-gray-300 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 shadow-sm pointer-events-none"
            style={{ left: `${maxPct}%` }}
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
          </>
        ) : null}
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
              onToggleSaved(job.id);
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
  const [savedJobIds, setSavedJobIds] = useState<Set<number>>(() => new Set());
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [apiRecommendedJobs, setApiRecommendedJobs] = useState<JobCard[]>([]);
  const [hasAttemptedJobsLoad, setHasAttemptedJobsLoad] = useState(false);
  const [dynamicSkills, setDynamicSkills] = useState<string[]>([]);
  const [dynamicEmploymentTypes, setDynamicEmploymentTypes] = useState<string[]>(EMPLOYMENT_TYPES);
  const [dynamicSeniorityLevels, setDynamicSeniorityLevels] = useState<string[]>(SENIORITY_LEVELS);
  const locationButtonRef = useRef<HTMLButtonElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Candidate id is stored in sessionStorage on login.
    setCandidateIdState(getCandidateId());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = getSavedJobsStorageKey(candidateId);
    if (!storageKey) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const ids = parsed
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isFinite(value));
      setSavedJobIds(new Set(ids));
    } catch {
      // ignore storage issues
    }
  }, [candidateId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = getSavedJobsStorageKey(candidateId);
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(Array.from(savedJobIds)));
    } catch {
      // ignore storage issues
    }
  }, [candidateId, savedJobIds]);

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
        if (!active) return;
        if (cachedRecommended?.jobs?.length) {
          setApiRecommendedJobs(cachedRecommended.jobs.map((job) => mapRecommendedToJobsPageCard(job)));
        }
        const recommended = await getRecommendedJobs(profileName);
        writeRecommendedJobsCache(profileName, recommended);
        if (!active) return;
        setApiRecommendedJobs(recommended.map((job) => mapRecommendedToJobsPageCard(job)));
      } catch {
        if (!active) return;
        const cachedRecommended = readRecommendedJobsCache(profileName);
        setApiRecommendedJobs(
          (cachedRecommended?.jobs ?? []).map((job) => mapRecommendedToJobsPageCard(job))
        );
      } finally {
        if (active) setHasAttemptedJobsLoad(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const jobsSource = useMemo(
    () => (hasAttemptedJobsLoad ? apiRecommendedJobs : JOBS),
    [apiRecommendedJobs, hasAttemptedJobsLoad]
  );

  useEffect(() => {
    const source = hasAttemptedJobsLoad ? apiRecommendedJobs : [];

    const skillsFromSource = Array.from(
      new Set(source.flatMap((job) => job.skills.map((skill) => skill.trim()).filter(Boolean)))
    );
    const employmentFromSource = Array.from(
      new Set(source.map((job) => job.employmentType.trim()).filter((v) => v && v !== "—"))
    );
    const seniorityFromSource = Array.from(
      new Set(source.map((job) => job.seniorityLevel.trim()).filter((v) => v && v !== "—"))
    );
    if (skillsFromSource.length > 0) {
      setDynamicSkills((prev) => Array.from(new Set([...prev, ...skillsFromSource])));
    }

    if (employmentFromSource.length > 0) {
      setDynamicEmploymentTypes((prev) => Array.from(new Set([...prev, ...employmentFromSource])));
    }

    if (seniorityFromSource.length > 0) {
      setDynamicSeniorityLevels((prev) => Array.from(new Set([...prev, ...seniorityFromSource])));
    }

  }, [apiRecommendedJobs, hasAttemptedJobsLoad]);

  useEffect(() => {
    prefetchDropdownDetailsAfterLogin();
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const fetchFirstNonEmpty = async (fieldNames: string[]) => {
        for (const fieldName of fieldNames) {
          const options = await getDropdownDetailsOptions({
            doctype: "Resource Requirement",
            fieldName,
            page: 1,
            limit: 1000,
          }).catch(() => null);
          if (Array.isArray(options) && options.length > 0) return options;
        }
        return [];
      };

      const [skillsRes] = await Promise.all([
        fetchFirstNonEmpty(["key_skills"]),
      ]);

      if (!active) return;
      if (skillsRes.length > 0) {
        setDynamicSkills((prev) => Array.from(new Set([...prev, ...skillsRes])));
      }
      // Billing Frequency filter is fixed to Monthly/Hourly.
      setDynamicEmploymentTypes(EMPLOYMENT_TYPES);
      // Rotation filter is a strict Yes/No toggle (backed by is_rotation),
      // so we intentionally keep the options fixed to avoid mismatches.
      setDynamicSeniorityLevels(SENIORITY_LEVELS);
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const byId = new Map<string, string>();
        const maxPages = 20;
        const perPage = 200;

        for (let page = 1; page <= maxPages; page += 1) {
          const url = new URL("/api/method/get_location_details", window.location.origin);
          url.searchParams.set("page", String(page));
          url.searchParams.set("limit", String(perPage));
          const res = await fetch(url.toString(), {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });
          if (!res.ok) break;
          const json = (await res.json()) as { data?: Array<{ id?: string; label?: string }> };
          const rows = Array.isArray(json.data) ? json.data : [];
          if (rows.length === 0) break;

          for (const row of rows) {
            const id = (row.id ?? "").trim();
            const label = (row.label ?? "").trim();
            if (!id || !label) continue;
            byId.set(id, label);
          }

          if (rows.length < perPage) break;
        }

        if (cancelled) return;
        const next = Array.from(byId.entries())
          .map(([id, label]) => ({ id, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setAllLocationOptions(next);
      } catch {
        if (!cancelled) setAllLocationOptions([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = skillSearch.trim();
    if (query.length < SKILL_SEARCH_MIN_LENGTH) return;

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
          setDynamicSkills(skillsRes);
        }
      })();
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [skillSearch]);

  const availableLocations = useMemo<LocationOption[]>(() => {
    const byId = new Map<string, string>();
    for (const location of allLocationOptions) {
      const id = location.id?.trim();
      const label = location.label?.trim();
      if (!id || !label) continue;
      byId.set(id, label);
    }

    const sourceJobs = hasAttemptedJobsLoad && apiRecommendedJobs.length > 0 ? apiRecommendedJobs : JOBS;
    for (const job of sourceJobs) {
      const id = job.locationId?.trim();
      if (!id || id === "—") continue;
      const label = [job.location, job.locationFull].filter((v) => v && v !== "—").join(", ");
      if (!byId.has(id)) byId.set(id, label || id);
    }

    return Array.from(byId.entries()).map(([id, label]) => ({ id, label }));
  }, [allLocationOptions, apiRecommendedJobs, hasAttemptedJobsLoad]);

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
    const normalizeRotation = (value: string) => {
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
      if (
        normalized.includes("on:") ||
        normalized.includes("weeks on")
      ) {
        return "yes";
      }
      return normalized;
    };
    const selectedRotations = new Set(filters.seniorityLevels.map(normalizeRotation));
    const rotationFromJob = (job: JobCard) => {
      const fromStartDate = normalizeRotation(job.startDate);
      if (fromStartDate === "yes" || fromStartDate === "no") return fromStartDate;
      return normalizeRotation(job.seniorityLevel);
    };

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
        selectedRotations.has(rotationFromJob(job));
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
      jobDocumentId: job.jobDocumentId,
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

  const handleDrawerPrimaryAction = async (action: ActionCard): Promise<boolean> => {
    const jobDocumentId = action.jobDocumentId?.trim() || "";
    const cid = candidateId?.trim() || "";
    if (!jobDocumentId || !cid) return false;
    try {
      await markInterestedInJob(cid, jobDocumentId);
      setIsDrawerOpen(false);
      return true;
    } catch {
      return false;
    }
  };

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
      />
      <ActionDrawer
        open={isDrawerOpen}
        action={selectedAction}
        onClose={() => setIsDrawerOpen(false)}
        onPrimaryAction={handleDrawerPrimaryAction}
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
