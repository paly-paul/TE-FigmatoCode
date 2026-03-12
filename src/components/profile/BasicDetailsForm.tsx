"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SparklesIcon } from "@/components/icons";

const MAX_SUMMARY = 600;

const EXP_YEARS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i),
  label: String(i),
}));

const EXP_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: String(i),
}));

const CURRENCIES = [
  { value: "USD", label: "🇺🇸 USD" },
  { value: "EUR", label: "🇪🇺 EUR" },
  { value: "GBP", label: "🇬🇧 GBP" },
  { value: "AED", label: "🇦🇪 AED" },
  { value: "INR", label: "🇮🇳 INR" },
  { value: "CAD", label: "🇨🇦 CAD" },
  { value: "AUD", label: "🇦🇺 AUD" },
];

// Parsed CV data pre-populated
const PARSED_DATA = {
  professionalTitle: "Senior Engineer",
  expYears: "5",
  expMonths: "8",
  salaryMonth: "2,000",
  salaryCurrency: "USD",
  summary:
    "Experienced energy professional with over 6 years of expertise in designing efficient energy systems and optimizing operational performance across power and renewable projects using modern engineering tools and technologies. Proven track record of managing scalable energy solutions and integrating advanced monitoring systems to enhance reliability and efficiency. Skilled in developing data-driven strategies for energy optimization, analytics, and sustainability initiatives, with a strong focus on delivering high-impact solutions that meet organizational and regulatory goals. Eager to leverage expertise in energy management, renewable integration.",
};

interface BasicDetailsFormProps {
  onChange?: (data: typeof PARSED_DATA) => void;
}

export function BasicDetailsForm({ onChange }: BasicDetailsFormProps) {
  const [form, setForm] = useState(PARSED_DATA);

  function update<K extends keyof typeof PARSED_DATA>(
    key: K,
    value: (typeof PARSED_DATA)[K]
  ) {
    const next = { ...form, [key]: value };
    setForm(next);
    onChange?.(next);
  }

  function handleGenerate() {
    // TODO: call AI API to regenerate summary
    console.log("Generating summary…");
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* ── Basic Details ── */}
      <div className="p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">
          Basic Details
        </h2>

        {/* Row 1: Professional Title | Exp Years | Exp Months */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="col-span-2">
            <Input
              label="Professional Title"
              type="text"
              value={form.professionalTitle}
              onChange={(e) => update("professionalTitle", e.target.value)}
              placeholder="e.g. Senior Engineer"
            />
          </div>
          <Select
            label="Exp. Years"
            options={EXP_YEARS}
            value={form.expYears}
            onChange={(v) => update("expYears", v)}
          />
          <Select
            label="Exp. Months"
            options={EXP_MONTHS}
            value={form.expMonths}
            onChange={(v) => update("expMonths", v)}
          />
        </div>

        {/* Row 2: Salary / Month | Salary Currency */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Salary / Month"
            type="text"
            value={form.salaryMonth}
            onChange={(e) => update("salaryMonth", e.target.value)}
            placeholder="e.g. 5,000"
          />
          <Select
            label="Salary Currency"
            options={CURRENCIES}
            value={form.salaryCurrency}
            onChange={(v) => update("salaryCurrency", v)}
          />
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* ── Summary ── */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            <SparklesIcon />
            Generate
          </button>
        </div>

        <textarea
          value={form.summary}
          onChange={(e) =>
            update("summary", e.target.value.slice(0, MAX_SUMMARY))
          }
          rows={9}
          placeholder="Write a short professional summary…"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent leading-relaxed"
        />
        <p className="text-xs text-gray-400 text-right mt-1">
          {form.summary.length} / {MAX_SUMMARY}
        </p>
      </div>
    </div>
  );
}
