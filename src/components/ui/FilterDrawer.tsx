"use client";

import { RefObject, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { BaseDrawer } from "./BaseDrawer";

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
}

export const SKILLS = [
  "Microgrid System",
  "Energy data analytics",
  "Utility Operations",
];

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
}: FilterDrawerProps) {
  const [skillSearch, setSkillSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  useEffect(() => {
    if (!open) return;

    setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
    setSkillSearch("");
  }, [open, initialFilters]);

  const filteredSkills = SKILLS.filter((skill) =>
    skill.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const setValue = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Filter"
      triggerRef={triggerRef}
      footer={
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Reset
          </button>

          <button
            type="button"
            onClick={() => {
              onApply(filters);
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors focus:outline-none"
          >
            Apply
          </button>
        </div>
      }
    >
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Skills</p>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={skillSearch}
            onChange={(event) => setSkillSearch(event.target.value)}
            className="w-full pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <p className="text-sm font-medium text-gray-700 mb-3">Popular Skills</p>
        <CheckboxGroup
          options={filteredSkills}
          selected={filters.skills}
          onChange={(value) => setValue("skills", value)}
        />
      </div>

      <div className="border-t border-gray-100" />

      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Type of Employment</p>
        <CheckboxGroup
          options={EMPLOYMENT_TYPES}
          selected={filters.employmentTypes}
          onChange={(value) => setValue("employmentTypes", value)}
        />
      </div>

      <div className="border-t border-gray-100" />

      <div>
        <p className="text-sm font-semibold text-gray-900 mb-3">Seniority Level</p>
        <CheckboxGroup
          options={SENIORITY_LEVELS}
          selected={filters.seniorityLevels}
          onChange={(value) => setValue("seniorityLevels", value)}
        />
      </div>

      <div className="border-t border-gray-100" />

      <div>
        <p className="text-sm font-semibold text-gray-900 mb-4">Salary Range</p>
        <SalaryRange
          min={filters.salaryMin}
          max={filters.salaryMax}
          onMinChange={(value) => setValue("salaryMin", value)}
          onMaxChange={(value) => setValue("salaryMax", value)}
        />
      </div>
    </BaseDrawer>
  );
}
