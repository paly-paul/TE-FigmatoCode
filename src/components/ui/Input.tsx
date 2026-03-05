"use client";

import { InputHTMLAttributes, ReactNode, useState } from "react";
import { EyeIcon, EyeOffIcon, InfoIcon } from "@/components/icons";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  showInfoIcon?: boolean;
  isPassword?: boolean;
  labelSuffix?: ReactNode;
  error?: string;
}

export function Input({
  label,
  showInfoIcon = false,
  isPassword = false,
  labelSuffix,
  error,
  className = "",
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPassword ? (showPassword ? "text" : "password") : props.type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-gray-800">{label}</label>
          {showInfoIcon && (
            <button
              type="button"
              tabIndex={-1}
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              aria-label="Password requirements"
            >
              <InfoIcon />
            </button>
          )}
          {labelSuffix}
        </div>
      )}

      <div className="relative">
        <input
          {...props}
          type={inputType}
          className={`w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow ${isPassword ? "pr-11" : ""} ${error ? "border-red-400 focus:ring-red-400" : ""} ${className}`}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
