"use client";

import React, { useState, useRef } from "react";
import { Bell, Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { NotificationDrawer } from "../ui/NotificationDrawer";

export default function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const bellRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    // Add your logout logic here
    console.log("Logging out...");
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Jobs", href: "/jobs" },
    { label: "Timesheet", href: "/timesheet" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">TE</span>
            </div>
            <span className="text-base sm:text-lg font-semibold text-gray-900">
              Talent Engine
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            {navItems.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => router.push(item.href)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2 sm:gap-4">

            {/* Bell Icon — toggles NotificationDrawer */}
            <button
              ref={bellRef}
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle notifications"
            >
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile Section — hover dropdown */}
            <div
              ref={profileRef}
              className="relative hidden sm:flex items-center gap-2 cursor-pointer select-none group"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Adam"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full"
                alt="Profile"
              />
              <span className="text-sm font-medium text-gray-900 hidden md:block">
                Adam Smith
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 hidden md:block transition-transform duration-200 ${
                  profileOpen ? "rotate-180" : "rotate-0"
                }`}
              />

              {/* Dropdown Menu */}
              <div
                className={`absolute right-0 top-full pt-2 w-44 transition-all duration-150 ${
                  profileOpen
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 -translate-y-1 pointer-events-none"
                }`}
              >
                <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden py-1">
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    Profile
                  </button>

                  <div className="mx-3 border-t border-gray-100" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    router.push(item.href);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-md font-medium text-left transition-colors ${
                    isActive(item.href)
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Mobile Profile Links */}
              <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
                <button
                  onClick={() => router.push("/profile")}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 text-left text-sm"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-red-600 hover:bg-red-50 text-left text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>

      {/* Notification Drawer */}
      <NotificationDrawer
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        triggerRef={bellRef}
      />
    </header>
  );
}
