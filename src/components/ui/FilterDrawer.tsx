"use client";

import { type ReactNode, RefObject, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { BaseDrawer } from "./BaseDrawer";
import { useIsBelowLg } from "@/lib/useResponsive";
import { getDropdownDetailsOptions } from "@/services/jobs/dropdownDetails";

export interface FilterState {
  skills: string[];
  employmentTypes: string[];
  seniorityLevels: string[];
  salaryMin: number;
  salaryMax: number;
}

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  triggerRef?: RefObject<HTMLElement>;
  initialFilters?: Partial<FilterState>;
  dropdownConfig?: {
    doctype?: string;
    skillsFieldName?: string;
    limit?: number;
  };
  skillsOptions?: string[];
  employmentTypeOptions?: string[];
  seniorityLevelOptions?: string[];
}

export const EMPLOYMENT_TYPES = [
  "Full Time",
  "Part Time",
  "Internship",
  "Training Jobs",
];

export const SENIORITY_LEVELS = [
  "Entry Level",
  "Mid Level",
  "Senior Level",
];

export const DEFAULT_FILTERS: FilterState = {
  skills: [],
  employmentTypes: [],
  seniorityLevels: [],
  salaryMin: 0,
  salaryMax: 50000,
};

const DEFAULT_DROPDOWN_CONFIG = {
  doctype: "Resource Requirement",
  skillsFieldName: "key_skills",
  limit: 1000,
} as const;
const SKILLS_PREVIEW_LIMIT = 8;

function CollapsibleFilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" aria-hidden />
        )}
      </button>
      {open ? <div className="pb-4">{children}</div> : null}
    </div>
  );
}

function CheckboxGroup({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
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
        <label key={option} className="flex items-center gap-2.5 cursor-pointer group">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => toggle(option)}
            className="w-4 h-4 rounded border-gray-300 accent-blue-600"
          />
          <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
            {option}
          </span>
        </label>
      ))}
    </div>
  );
}

function SalaryRange({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: number;
  max: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  const rangeMin = 0;
  const rangeMax = 50000;

  const minPct = ((min - rangeMin) / (rangeMax - rangeMin)) * 100;
  const maxPct = ((max - rangeMin) / (rangeMax - rangeMin)) * 100;

  return (
    <div className="space-y-4">
      <div className="relative h-1.5 bg-gray-200 rounded-full mx-1">
        <div
          className="absolute h-1.5 bg-blue-600 rounded-full"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
        />

        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          step={500}
          value={min}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (value < max) onMinChange(value);
          }}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 3 }}
        />

        <input
          type="range"
          min={rangeMin}
          max={rangeMax}
          step={500}
          value={max}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (value > min) onMaxChange(value);
          }}
          className="absolute w-full h-full opacity-0 cursor-pointer"
          style={{ zIndex: 4 }}
        />

        <div
          className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow -translate-y-1/2 top-1/2 -translate-x-1/2"
          style={{ left: `${minPct}%`, zIndex: 2, pointerEvents: "none" }}
        />
        <div
          className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow -translate-y-1/2 top-1/2 -translate-x-1/2"
          style={{ left: `${maxPct}%`, zIndex: 2, pointerEvents: "none" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Min</p>
          <div className="flex items-center border border-gray-200 rounded-md px-3 py-2 gap-1">
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number"
              value={min}
              min={rangeMin}
              max={max - 500}
              step={500}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value < max) onMinChange(value);
              }}
              className="w-full text-sm text-gray-900 focus:outline-none bg-transparent"
            />
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">Max</p>
          <div className="flex items-center border border-blue-500 rounded-md px-3 py-2 gap-1 ring-1 ring-blue-500">
            <span className="text-sm text-gray-400">$</span>
            <input
              type="number"
              value={max}
              min={min + 500}
              max={rangeMax}
              step={500}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (value > min) onMaxChange(value);
              }}
              className="w-full text-sm text-gray-900 focus:outline-none bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FilterDrawer({
  open,
  onClose,
  onApply,
  triggerRef,
  initialFilters = {},
  dropdownConfig,
  skillsOptions,
  employmentTypeOptions,
  seniorityLevelOptions,
}: FilterDrawerProps) {
  const isCompactFilterUi = useIsBelowLg();
  const [resolvedPlacement, setResolvedPlacement] = useState<"bottom" | "right">(
    isCompactFilterUi ? "bottom" : "right"
  );
  const [skillSearch, setSkillSearch] = useState("");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [dynamicSkills, setDynamicSkills] = useState<string[]>(skillsOptions?.length ? skillsOptions : []);
  const [dynamicEmploymentTypes, setDynamicEmploymentTypes] = useState<string[]>(
    employmentTypeOptions?.length ? employmentTypeOptions : EMPLOYMENT_TYPES
  );
  const [dynamicSeniorityLevels, setDynamicSeniorityLevels] = useState<string[]>(
    seniorityLevelOptions?.length ? seniorityLevelOptions : SENIORITY_LEVELS
  );
  const [hasLoadedDynamicOptions, setHasLoadedDynamicOptions] = useState(false);

  const resolvedDropdownConfig = {
    ...DEFAULT_DROPDOWN_CONFIG,
    ...dropdownConfig,
  };

  useEffect(() => {
    if (open) return;
    setResolvedPlacement(isCompactFilterUi ? "bottom" : "right");
  }, [isCompactFilterUi, open]);

  useEffect(() => {
    if (!open) return;

    setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
    setSkillSearch("");
    setShowAllSkills(false);
    setResolvedPlacement(isCompactFilterUi ? "bottom" : "right");
  }, [open, initialFilters]);

  useEffect(() => {
    setShowAllSkills(false);
  }, [skillSearch]);

  useEffect(() => {
    if (skillsOptions?.length) {
      setDynamicSkills(skillsOptions);
    }
  }, [skillsOptions]);

  useEffect(() => {
    if (employmentTypeOptions?.length) {
      setDynamicEmploymentTypes(employmentTypeOptions);
    }
  }, [employmentTypeOptions]);

  useEffect(() => {
    if (seniorityLevelOptions?.length) {
      setDynamicSeniorityLevels(seniorityLevelOptions);
    }
  }, [seniorityLevelOptions]);

  useEffect(() => {
    if (!open || hasLoadedDynamicOptions) return;
    if (skillsOptions?.length) {
      setHasLoadedDynamicOptions(true);
      return;
    }

    let active = true;
    void (async () => {
      const skillsRes = await getDropdownDetailsOptions({
        doctype: resolvedDropdownConfig.doctype,
        fieldName: resolvedDropdownConfig.skillsFieldName,
        limit: resolvedDropdownConfig.limit,
      }).catch(() => null);

      if (!active) return;

    if (Array.isArray(skillsRes)) {
        setDynamicSkills(skillsRes);
      }

      setHasLoadedDynamicOptions(true);
    })();

    return () => {
      active = false;
    };
  }, [open, hasLoadedDynamicOptions, resolvedDropdownConfig, skillsOptions]);

  const filteredSkills = dynamicSkills.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  );
  const visibleSkills =
    showAllSkills || skillSearch.trim().length > 0
      ? filteredSkills
      : filteredSkills.slice(0, SKILLS_PREVIEW_LIMIT);
  const canToggleSkillsView = skillSearch.trim().length === 0 && filteredSkills.length > SKILLS_PREVIEW_LIMIT;

  const setValue = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const skillsSearchInput = (
    <div className="relative mb-4">
      {isCompactFilterUi ? (
        <>
          <input
            type="text"
            placeholder="Search by name..."
            value={skillSearch}
            onChange={(event) => setSkillSearch(event.target.value)}
            className="w-full rounded-lg border border-gray-200 py-2.5 pl-3 pr-14 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <div className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded border border-gray-200 bg-gray-50">
            <Search className="h-3.5 w-3.5 text-gray-500" aria-hidden />
          </div>
        </>
      ) : (
        <>
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={skillSearch}
            onChange={(event) => setSkillSearch(event.target.value)}
            className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </>
      )}
    </div>
  );

  const skillsBody = (
    <>
      {!isCompactFilterUi ? <p className="mb-3 text-sm font-semibold text-gray-900">Skills</p> : null}
      {skillsSearchInput}
      <p className="mb-3 text-sm font-medium text-gray-700">Popular Skills</p>
      <CheckboxGroup
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
  );

  const employmentBody = (
    <CheckboxGroup
      options={dynamicEmploymentTypes}
      selected={filters.employmentTypes}
      onChange={(value) => setValue("employmentTypes", value)}
    />
  );

  const seniorityBody = (
    <CheckboxGroup
      options={dynamicSeniorityLevels}
      selected={filters.seniorityLevels}
      onChange={(value) => setValue("seniorityLevels", value)}
    />
  );

  const salaryBody = (
    <SalaryRange
      min={filters.salaryMin}
      max={filters.salaryMax}
      onMinChange={(value) => setValue("salaryMin", value)}
      onMaxChange={(value) => setValue("salaryMax", value)}
    />
  );

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Filter"
      triggerRef={triggerRef}
      placement={resolvedPlacement}
      headerActions={
        resolvedPlacement === "bottom" ? (
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Reset
          </button>
        ) : undefined
      }
      bodyClassName={resolvedPlacement === "bottom" ? "px-4 pb-2 pt-0" : "px-5 py-5"}
      contentClassName={resolvedPlacement === "bottom" ? "space-y-0" : "space-y-6"}
      footer={
        resolvedPlacement === "bottom" ? (
          <button
            type="button"
            onClick={() => {
              onApply(filters);
              onClose();
            }}
            className="w-full rounded-lg bg-blue-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Apply
          </button>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() => {
                onApply(filters);
                onClose();
              }}
              className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none"
            >
              Apply
            </button>
          </div>
        )
      }
    >
      {resolvedPlacement === "bottom" ? (
        <div>
          <CollapsibleFilterSection title="Skills">
            {skillsBody}
          </CollapsibleFilterSection>
          <CollapsibleFilterSection title="Type of Employment">
            {employmentBody}
          </CollapsibleFilterSection>
          <CollapsibleFilterSection title="Seniority Level">
            {seniorityBody}
          </CollapsibleFilterSection>
          <CollapsibleFilterSection title="Salary Range">
            <div className="pt-1">{salaryBody}</div>
          </CollapsibleFilterSection>
        </div>
      ) : (
        <>
          <div>
            {skillsBody}
          </div>

          <div className="border-t border-gray-100" />

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900">Type of Employment</p>
            {employmentBody}
          </div>

          <div className="border-t border-gray-100" />

          <div>
            <p className="mb-3 text-sm font-semibold text-gray-900">Seniority Level</p>
            {seniorityBody}
          </div>

          <div className="border-t border-gray-100" />

          <div>
            <p className="mb-4 text-sm font-semibold text-gray-900">Salary Range</p>
            {salaryBody}
          </div>
        </>
      )}
    </BaseDrawer>
  );
}
