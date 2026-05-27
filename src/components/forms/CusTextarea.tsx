import * as React from "react";

interface CusTextareaProps extends React.ComponentProps<"textarea"> {
  error?: string;
  label?: string;
  mHeight?: string;
}

function CusTextarea({
  label,
  mHeight = "100px",
  className,
  required,
  error,
  ...props
}: CusTextareaProps) {
  return (
    <div>
      {label && (
        <label
          className={`block text-xs font-medium mb-1 ${error ? "text-red-500" : "text-gray-700"}`}
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        data-slot="textarea"
        className={`flex w-full rounded-md border bg-white px-3 py-2 text-xs text-[#202939] outline-none transition-colors placeholder:text-gray-400 focus:border-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50 ${error ? "border-red-500" : "border-[#D6DCEA]"} ${className ?? ""}`}
        aria-invalid={error ? "true" : "false"}
        style={{ resize: "none", maxHeight: mHeight }}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export { CusTextarea };
