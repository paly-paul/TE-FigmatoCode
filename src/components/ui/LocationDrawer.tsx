"use client";

import { RefObject, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { BaseDrawer } from "./BaseDrawer";

export interface LocationOption {
  id: string;
  label: string;
}

interface PreferredLocationDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: (selected: string[]) => void;
  triggerRef?: RefObject<HTMLElement>;
  initialSelected?: string[];
  options?: LocationOption[];
}

export const DEFAULT_LOCATIONS: LocationOption[] = [
  { id: "bangor-us", label: "Bangor, United States" },
  { id: "atlanta-us", label: "Atlanta, United States" },
  { id: "brooklyn-us", label: "Brooklyn, United States" },
];

export function LocationDrawer({
  open,
  onClose,
  onApply,
  triggerRef,
  initialSelected = ["bangor-us"],
  options = DEFAULT_LOCATIONS,
}: PreferredLocationDrawerProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(initialSelected);

  useEffect(() => {
    if (!open) return;

    setSelected(initialSelected);
    setSearch("");
  }, [open, initialSelected]);

  const toggleLocation = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const filtered = options.filter((location) =>
    location.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BaseDrawer
      open={open}
      onClose={onClose}
      title="Preferred Location"
      triggerRef={triggerRef}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              onApply(selected);
              onClose();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2 rounded-md transition-colors focus:outline-none"
          >
            Apply
          </button>
        </div>
      }
      contentClassName="space-y-5"
    >
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Location</p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-8 pr-4 py-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <p className="text-sm font-semibold text-gray-700 mb-3">
          Previously Selected Locations
        </p>

        <div className="space-y-3">
          {filtered.map((location) => (
            <label
              key={location.id}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selected.includes(location.id)}
                onChange={() => toggleLocation(location.id)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                {location.label}
              </span>
            </label>
          ))}

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 py-2">No locations found</p>
          ) : null}
        </div>
      </div>
    </BaseDrawer>
  );
}
