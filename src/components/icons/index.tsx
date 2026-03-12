export function EyeIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1.667 10S4.167 4.167 10 4.167 18.333 10 18.333 10 15.833 15.833 10 15.833 1.667 10 1.667 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="10"
        cy="10"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function EyeOffIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 2.5l15 15M8.818 8.818A2.5 2.5 0 0 0 12.5 12.5M6.667 5.358C4.79 6.4 3.183 8.1 2.5 10c1.25 3.333 4.167 5.833 7.5 5.833a8.06 8.06 0 0 0 3.333-.714M10 4.167c3.333 0 6.25 2.5 7.5 5.833a8.35 8.35 0 0 1-1.652 2.681"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 7v4.5M8 5.25V4.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="3"
        y="8.25"
        width="12"
        height="8.25"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M5.25 8.25V6A3.75 3.75 0 0 1 12.75 6v2.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function CheckCircleIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="20" fill="#DCFCE7" />
      <circle cx="24" cy="24" r="16" fill="#22C55E" opacity="0.2" />
      <path
        d="M16 24l5.5 5.5L32 18"
        stroke="#16A34A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EnvelopeCheckIllustration() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Envelope body */}
      <rect
        x="8"
        y="24"
        width="72"
        height="54"
        rx="4"
        fill="white"
        stroke="#E5E7EB"
        strokeWidth="2"
      />
      {/* Envelope lines (letter content) */}
      <line
        x1="20"
        y1="50"
        x2="48"
        y2="50"
        stroke="#E5E7EB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="58"
        x2="40"
        y2="58"
        stroke="#E5E7EB"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Envelope flap */}
      <path
        d="M8 28 L44 52 L80 28"
        stroke="#E5E7EB"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Green check circle (top-right) */}
      <circle cx="68" cy="28" r="14" fill="#DCFCE7" />
      <circle cx="68" cy="28" r="10" fill="#22C55E" />
      <path
        d="M62 28L66 32L74 22"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ProfileCheckIllustration() {
  return (
    <svg
      width="96"
      height="96"
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Person head */}
      <circle cx="48" cy="30" r="14" fill="#EFF6FF" stroke="#BFDBFE" strokeWidth="2" />
      <circle cx="48" cy="29" r="8" fill="#BFDBFE" />
      {/* Person body outline */}
      <path
        d="M20 72C20 56 32 48 48 48C64 48 76 56 76 72"
        stroke="#BFDBFE"
        strokeWidth="2"
        fill="none"
      />
      {/* Card/badge at bottom */}
      <rect
        x="28"
        y="66"
        width="40"
        height="14"
        rx="3"
        fill="white"
        stroke="#E5E7EB"
        strokeWidth="1.5"
      />
      {/* Green check circle */}
      <circle cx="68" cy="64" r="14" fill="#DCFCE7" />
      <circle cx="68" cy="64" r="10" fill="#22C55E" />
      <path
        d="M62 64L66 68L74 58"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function OpenQuoteIcon() {
  return (
    <svg
      width="64"
      height="56"
      viewBox="0 0 64 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 48C8 30 16 10 28 4"
        stroke="#C7D2FE"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M38 48C38 30 46 10 58 4"
        stroke="#C7D2FE"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function CloseQuoteIcon() {
  return (
    <svg
      width="64"
      height="56"
      viewBox="0 0 64 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M56 8C56 26 48 46 36 52"
        stroke="#C7D2FE"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M26 8C26 26 18 46 6 52"
        stroke="#C7D2FE"
        strokeWidth="12"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function UploadBoxIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Tray / inbox body */}
      <rect x="6" y="28" width="36" height="14" rx="3" stroke="#2563EB" strokeWidth="2.5" fill="none" />
      {/* Up arrow shaft */}
      <line x1="24" y1="6" x2="24" y2="28" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arrow head */}
      <path d="M16 14L24 6L32 14" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Tray bottom dot highlight */}
      <circle cx="24" cy="35" r="2" fill="#2563EB" />
    </svg>
  );
}

export function SmallUploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 11v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 2v8M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4h12M5.333 4V2.667A.667.667 0 0 1 6 2h4a.667.667 0 0 1 .667.667V4M6.667 7.333v4M9.333 7.333v4M3.333 4l.667 9.333A.667.667 0 0 0 4.667 14h6.666a.667.667 0 0 0 .667-.667L12.667 4" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 2a7 7 0 0 0-7 7v3l-1.5 2.5A1 1 0 0 0 3.5 16h15a1 1 0 0 0 .866-1.5L18 12V9a7 7 0 0 0-7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M9 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="17" cy="5" r="3" fill="#EF4444"/>
    </svg>
  );
}

export function LightbulbIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 1a5 5 0 0 1 3.5 8.5L12 11H6l-.5-1.5A5 5 0 0 1 9 1z" stroke="#2563EB" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6.5 11v1a2.5 2.5 0 0 0 5 0v-1" stroke="#2563EB" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="9" y1="3" x2="9" y2="4.5" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function CheckCircleSolidIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#2563EB"/>
      <path d="M12 20l6 6 10-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function SparklesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" fill="none"/>
      <path d="M13 1L13.6 2.4L15 3L13.6 3.6L13 5L12.4 3.6L11 3L12.4 2.4L13 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="3" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1.5 6.5h13M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function PersonIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="11" r="5" stroke="#2563EB" strokeWidth="1.8"/>
      <path d="M4 27C4 21.477 9.373 17 16 17C22.627 17 28 21.477 28 27" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export function ChevronDownIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function StepCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
