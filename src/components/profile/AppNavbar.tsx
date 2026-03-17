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
  // userName = "Adam Smith",
  userName = "",
  userInitials = "",
}: AppNavbarProps) {
  return (
    <header className="bg-white border-b border-gray-200 shrink-0 z-10 px-4 sm:px-6 py-2.5">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs tracking-wide">TE</span>
          </div>
          <span className="font-semibold text-gray-800 text-sm sm:text-base">Talent Engine</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 flex-1 justify-center">
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

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            className="relative text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Notifications"
          >
            <BellIcon />
          </button>

          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 sm:px-3 py-1.5">
            <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-semibold">{userInitials}</span>
            </div>
            <span className="hidden sm:inline text-sm font-medium text-gray-700">{userName}</span>
          </div>
        </div>
      </div>

      <nav className="md:hidden mt-2 flex items-center gap-5 overflow-x-auto pb-1">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 whitespace-nowrap"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
