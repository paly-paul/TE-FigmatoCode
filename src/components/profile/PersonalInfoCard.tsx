"use client";

import { useState } from "react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CalendarIcon, SearchIcon, ChevronDownIcon } from "@/components/icons";

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const NATIONALITY_OPTIONS = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "in", label: "India" },
  { value: "de", label: "Germany" },
];

const COUNTRY_CODES = [
  { value: "+1", label: "🇺🇸 +1" },
  { value: "+44", label: "🇬🇧 +44" },
  { value: "+91", label: "🇮🇳 +91" },
  { value: "+61", label: "🇦🇺 +61" },
  { value: "+49", label: "🇩🇪 +49" },
  { value: "+33", label: "🇫🇷 +33" },
];

// Pre-populated with CV-parsed data
const PARSED_PERSONAL = {
  photoUrl: null as string | null,
  firstName: "Adam",
  lastName: "Smith",
  dob: "01/24/1992",
  gender: "male",
  countryCode: "+1",
  phone: "(832) 555-1209",
  email: "adamsmith@gmail.com",
  altEmail: "adam_smith1@hotmail.com",
  nationality: "us",
  currentLocation: "Brooklyn Heights--United States",
  preferredLocation: "Atlanta--United States",
};

export function PersonalInfoCard() {
  const [form, setForm] = useState(PARSED_PERSONAL);

  function update<K extends keyof typeof PARSED_PERSONAL>(
    key: K,
    value: (typeof PARSED_PERSONAL)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Personal Information
        </h2>

        {/* Avatar upload */}
        <AvatarUpload
          photoUrl={form.photoUrl}
          onUpload={(url) => update("photoUrl", url)}
          onDelete={() => update("photoUrl", null)}
        />

        {/* First Name | Last Name */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="First name"
          />
          <Input
            label="Last Name"
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            placeholder="Last name"
          />
        </div>

        {/* DOB | Gender */}
        <div className="grid grid-cols-2 gap-3">
          {/* DOB with calendar icon */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-800">DOB</label>
            <div className="relative">
              <input
                type="text"
                value={form.dob}
                onChange={(e) => update("dob", e.target.value)}
                placeholder="MM/DD/YYYY"
                className="w-full px-3 py-3 pr-9 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <CalendarIcon />
              </span>
            </div>
          </div>

          <Select
            label="Gender"
            options={GENDER_OPTIONS}
            value={form.gender}
            onChange={(v) => update("gender", v)}
          />
        </div>

        {/* Contact: country code + phone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-800">Contact</label>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-transparent">
            {/* Country code mini-select */}
            <div className="relative shrink-0">
              <select
                value={form.countryCode}
                onChange={(e) => update("countryCode", e.target.value)}
                className="appearance-none h-full px-2 pr-6 text-sm text-gray-900 bg-white border-r border-gray-300 focus:outline-none cursor-pointer"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronDownIcon size={12} />
              </span>
            </div>
            {/* Phone number */}
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="Phone number"
              className="flex-1 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none bg-white"
            />
          </div>
        </div>

        {/* Email (readonly – from signup) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-800">Email</label>
          <input
            type="email"
            value={form.email}
            readOnly
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
          />
        </div>

        {/* Alternative Email */}
        <Input
          label="Alternative Email"
          type="email"
          value={form.altEmail}
          onChange={(e) => update("altEmail", e.target.value)}
          placeholder="alt@example.com"
        />

        {/* Nationality */}
        <Select
          label="Nationality"
          options={NATIONALITY_OPTIONS}
          value={form.nationality}
          onChange={(v) => update("nationality", v)}
        />

        {/* Current Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-800">
            Current Location
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.currentLocation}
              onChange={(e) => update("currentLocation", e.target.value)}
              placeholder="City, Country"
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <SearchIcon />
            </span>
          </div>
        </div>

        {/* Preferred Location */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-800">
            Preferred Location
          </label>
          <div className="relative">
            <input
              type="text"
              value={form.preferredLocation}
              onChange={(e) => update("preferredLocation", e.target.value)}
              placeholder="City, Country"
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <SearchIcon />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
