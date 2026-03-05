import Link from "next/link";
import { BellIcon } from "@/components/icons";

const navLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Jobs", href: "/jobs" },
  { label: "Timesheet", href: "/timesheet" },
];

interface AppNavbarProps {
  userName?: string;
  userInitials?: string;
}

export function AppNavbar({
  userName = "Adam Smith",
  userInitials = "AS",
}: AppNavbarProps) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 shrink-0 z-10">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 mr-10">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-xs tracking-wide">TE</span>
        </div>
        <span className="font-semibold text-gray-800 text-sm">
          Talent Engine
        </span>
      </Link>

      {/* Centre nav */}
      <nav className="flex items-center gap-8 flex-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Right: Bell + User */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative text-gray-500 hover:text-gray-700 focus:outline-none"
          aria-label="Notifications"
        >
          <BellIcon />
        </button>

        <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5">
          {/* Avatar */}
          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">{userInitials}</span>
          </div>
          <span className="text-sm font-medium text-gray-700">{userName}</span>
        </div>
      </div>
    </header>
  );
}
