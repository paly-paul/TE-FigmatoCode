"use client";

import React, { useEffect, useState, useRef } from "react";
import { Bell, Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { NotificationDrawer } from "../ui/NotificationDrawer";
import { getResolvedNavDisplayName } from "@/lib/userDisplayName";
import { clearAuthSession, getProfileName } from "@/lib/authSession";
import { clearSessionLoginEmail, getSessionLoginEmail } from "@/lib/profileOnboarding";
import { useUserNotifications } from "@/services/notifications";
import { clearResumeWizardSession, readResumeProfile } from "@/lib/profileSession";
import { clearAllRecommendedJobsCache } from "@/lib/recommendedJobsCache";
import Image from "next/image";
import { getCandidateProfileData } from "@/services/profile";

export default function AppNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const bellRef = useRef<HTMLButtonElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  // Keep the initial render deterministic (server + first client render must match).
  const [navDisplayName, setNavDisplayName] = useState("User");
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");

  const {
    notifications,
    unreadCount,
    loading: notifLoading,
    error: notifError,
    refresh: refreshNotifications,
    markAllRead,
    markOneRead,
    markingAll,
    markingItemId,
  } = useUserNotifications(sessionEmail);

  const getProfileHref = () => {
    const profileName = getProfileName();
    if (!profileName) return "/profile";
    return `/profile/${encodeURIComponent(profileName)}`;
  };

  useEffect(() => {
    setNavDisplayName(getResolvedNavDisplayName());
  }, [pathname]);

  useEffect(() => {
    setSessionEmail(getSessionLoginEmail());
  }, [pathname]);

  useEffect(() => {
    const fromSession = readResumeProfile()?.profileImageUrl?.trim() || "";
    if (fromSession) {
      setProfileImageUrl(fromSession);
    }

    const profileName = getProfileName()?.trim();
    if (!profileName) return;

    let cancelled = false;
    void (async () => {
      try {
        const profile = await getCandidateProfileData(profileName);
        if (cancelled) return;
        const fromApi = profile.profileImageUrl?.trim() || "";
        if (fromApi) setProfileImageUrl(fromApi);
      } catch {
        // Keep session/local fallback avatar if API read fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (notifOpen && sessionEmail) void refreshNotifications();
  }, [notifOpen, sessionEmail, refreshNotifications]);

  const navigateTo = (href: string) => {
    if (!href || href === pathname) return;
    setMobileMenuOpen(false);
    setProfileOpen(false);
    router.push(href);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await fetch("/api/method/logout", {
        method: "POST",
      });
    } catch {
      // Fall back to local sign-out even if the backend request fails.
    } finally {
      clearAuthSession();
      clearSessionLoginEmail();
      clearResumeWizardSession();
      clearAllRecommendedJobsCache();
      setMobileMenuOpen(false);
      setProfileOpen(false);
      router.push("/login");
      router.refresh();
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Jobs", href: "/jobs" },
    { label: "Timesheet", href: "/timesheet" },
  ];
  const hideNavLinks = pathname.startsWith("/profile/create");

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 sm:gap-3"
          >
            {/* <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-tl-xl rounded-br-xl flex items-center justify-center">
              <span className="text-white font-bold text-xs sm:text-sm">TE</span>
            </div> */}
            <Image
              src="/icons/logo.jpeg"
              width={35}
              height={35}
              alt="SixFE Logo"
            />
            
            <span className="text-base sm:text-lg font-semibold text-gray-900">
              SixFE
            </span>
          </Link>

          {/* Desktop Navigation */}
          {!hideNavLinks ? (
            <nav className="hidden lg:flex items-center gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    isActive(item.href)
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}

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
              {sessionEmail && unreadCount > 0 ? (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" aria-hidden />
              ) : null}
            </button>

            {/* Profile Section — hover dropdown */}
            <div
              ref={profileRef}
              className="relative hidden sm:flex items-center gap-2 cursor-pointer select-none group"
              onMouseEnter={() => setProfileOpen(true)}
              onMouseLeave={() => setProfileOpen(false)}
            >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full"
                  alt=""
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
              )}
              <span className="text-sm font-medium text-gray-900 hidden md:block">
                {navDisplayName}
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
                    type="button"
                    onClick={() => navigateTo(getProfileHref())}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-gray-500" />
                    Profile
                  </button>

                  <div className="mx-3 border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    disabled={isLoggingOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              type="button"
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
              {!hideNavLinks
                ? navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                    }}
                    className={`px-4 py-2 rounded-md font-medium text-left transition-colors ${
                      isActive(item.href)
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))
                : null}

              {/* Mobile Profile Links */}
              <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => navigateTo(getProfileHref())}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 text-left text-sm"
                >
                  <User className="w-4 h-4 text-gray-500" />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-red-600 hover:bg-red-50 text-left text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  {isLoggingOut ? "Logging out..." : "Logout"}
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
        notifications={notifications}
        loading={notifLoading}
        error={notifError}
        onMarkAllRead={sessionEmail ? markAllRead : undefined}
        onMarkItemRead={sessionEmail ? markOneRead : undefined}
        markingAll={markingAll}
        markingItemId={markingItemId}
      />
    </header>
  );
}
