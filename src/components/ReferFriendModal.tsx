"use client";

import { CheckCircle2, ChevronDown, Search, X } from "lucide-react";
import React, { useMemo, useState } from "react";
import { normalizeCountryCode } from "@/services/profile/phone";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ReferFriendModal({ open, onClose }: Props) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const countryCodeOptions = useMemo(() => {
    const isoCountryCodes = [
      "US", "IN", "GB", "CA", "AU", "AE", "SA", "SG", "DE", "FR", "IT", "ES", "NL", "SE",
      "CH", "NO", "DK", "IE", "JP", "KR", "CN", "HK", "TH", "MY", "PH", "VN", "ID", "PK",
      "BD", "LK", "NP", "ZA", "NG", "KE", "EG", "TR", "QA", "OM", "KW", "BH", "NZ", "PL",
      "PT", "GR", "AT", "BE", "CZ", "HU", "RO", "UA", "BR", "MX", "AR", "CL",
    ];
    return isoCountryCodes
      .map((iso) => {
        const dialCode = normalizeCountryCode(iso);
        return dialCode ? `${iso} (${dialCode})` : null;
      })
      .filter((option): option is string => Boolean(option));
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "US (+1)",
  });
  const [openCountryCodeDropdown, setOpenCountryCodeDropdown] = useState(false);
  const [countryCodeSearch, setCountryCodeSearch] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [emailError, setEmailError] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = formData.email.trim();
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError("");
    console.log("Referral submitted:", formData);
    setShowSuccess(true);
    window.setTimeout(() => {
      setShowSuccess(false);
      onClose();
    }, 3200);
  };

  const filteredCountryCodes = countryCodeOptions.filter((code) => {
    const query = countryCodeSearch.trim().toLowerCase();
    if (!query) return true;
    return code.toLowerCase().includes(query);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white w-full max-w-[450px] rounded-lg shadow-2xl relative animate-in fade-in zoom-in-95">
        {showSuccess ? (
          <div className="absolute inset-0 z-20 rounded-lg bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="relative flex h-full flex-col items-center justify-center text-center overflow-hidden">
              <span className="absolute left-12 top-16 h-2.5 w-2.5 rounded-full bg-blue-300 animate-ping" />
              <span className="absolute right-14 top-20 h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
              <span className="absolute bottom-20 left-16 h-2 w-2 rounded-full bg-indigo-300 animate-ping" />
              <span className="absolute bottom-16 right-12 h-2.5 w-2.5 rounded-full bg-cyan-300 animate-ping" />
              <span className="absolute h-24 w-24 rounded-full border-2 border-blue-200/70 animate-pulse" />
              <span className="absolute h-32 w-32 rounded-full border border-emerald-200/60 animate-pulse [animation-delay:300ms]" />
              <div className="mb-4 rounded-full bg-emerald-100 p-3 text-emerald-600 shadow-sm animate-bounce">
                <CheckCircle2 className="h-8 w-8 animate-in zoom-in-75 duration-300" />
              </div>
              <p className="text-xl font-semibold text-gray-900 animate-in slide-in-from-bottom-1 duration-300">
                Referral Sent!
              </p>
              <p className="mt-2 text-sm text-gray-600 animate-in slide-in-from-bottom-1 duration-500">
                Your friend will receive the details shortly.
              </p>
              <div className="mt-4 h-1.5 w-44 overflow-hidden rounded-full bg-blue-100">
                <span className="block h-full w-full rounded-full bg-blue-500 animate-pulse" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSuccess(false);
                  onClose();
                }}
                className="mt-5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        {/* Header */}
        <div className="flex justify-between items-start p-6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Refer a Friend</h2>
            <p className="text-sm text-gray-500 mt-1">
              Share this job with someone who might be a great fit
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6">
          <div className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Alternative Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (emailError) setEmailError("");
                }}
                className={`rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  emailError ? "border border-red-500" : "border border-gray-300"
                }`}
                required
              />
              {emailError ? <p className="mt-1 text-xs text-red-600">{emailError}</p> : null}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1.5">
                Contact
              </label>
              <div className="flex gap-2">
                <div
                  className="relative min-w-[122px]"
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setOpenCountryCodeDropdown(false);
                      setCountryCodeSearch("");
                    }
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenCountryCodeDropdown((prev) => !prev)}
                    className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-left text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <span className="pr-6">{formData.countryCode}</span>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  </button>

                  {openCountryCodeDropdown ? (
                    <div className="absolute bottom-full z-30 mb-1 w-56 rounded-md border border-gray-200 bg-white shadow-lg">
                      <div className="border-b border-gray-100 p-2">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={countryCodeSearch}
                            onChange={(e) => setCountryCodeSearch(e.target.value)}
                            placeholder="Search country code"
                            className="w-full rounded-md border border-gray-200 py-2 pl-8 pr-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-auto py-1">
                        {filteredCountryCodes.length ? (
                          filteredCountryCodes.map((code) => (
                            <button
                              key={`refer-country-${code}`}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, countryCode: code }));
                                setOpenCountryCodeDropdown(false);
                                setCountryCodeSearch("");
                              }}
                              className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                                formData.countryCode === code
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-gray-700"
                              }`}
                            >
                              {code}
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-sm text-gray-500">No country codes found</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Footer Button */}
          <div className="flex justify-end mt-6">
            <button 
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={showSuccess}
            >
              Send Referral
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}