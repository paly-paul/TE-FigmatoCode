"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setDashboardWelcomePending } from "@/lib/dashboardWelcome";
import { setSessionLoginEmail } from "@/lib/profileOnboarding";
import { clearResumeWizardSession } from "@/lib/profileSession";
import { isLikelyDocId, setCandidateId, setProfileGenerated, setProfileName, setUserDisplayName } from "@/lib/authSession";
import { getPostLoginDestination } from "@/services/login/postLoginRouting";
import { prefetchDropdownDetailsAfterLogin } from "@/services/jobs/dropdownDetails";
import { prefetchDynamicKeySkills } from "@/services/profile/keySkills";

type ExchangeResult =
  | { success: true; user?: { candidate_id?: string; full_name?: string; email?: string } }
  | { success?: false; error?: string };

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const run = async () => {
      const token = new URLSearchParams(window.location.search).get("login_token")?.trim() ?? "";
      if (!token) {
        setErrorMessage("Missing login token. Please try signing in again.");
        setStatus("error");
        return;
      }

      try {
        const res = await fetch("/api/auth/google-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ login_token: token }),
        });
        const result = (await res.json()) as ExchangeResult;

        if (!res.ok || !("success" in result) || result.success !== true) {
          const msg =
            (result && typeof result === "object" && "error" in result && typeof result.error === "string"
              ? result.error
              : null) ?? "Google sign-in failed. Please try again.";
          setErrorMessage(msg);
          setStatus("error");
          return;
        }

        const candidateId = result.user?.candidate_id?.trim() ?? "";
        const fullName = result.user?.full_name?.trim() ?? "";
        const email = result.user?.email?.trim().toLowerCase() ?? "";

        clearResumeWizardSession();
        if (candidateId && isLikelyDocId(candidateId)) {
          setCandidateId(candidateId);
          setProfileName(candidateId);
          setProfileGenerated(true);
          prefetchDynamicKeySkills(candidateId);
        } else if (candidateId) {
          setProfileName(candidateId);
          setProfileGenerated(true);
          prefetchDynamicKeySkills(candidateId);
        }
        if (fullName) setUserDisplayName(fullName);
        if (email) setSessionLoginEmail(email);

        prefetchDropdownDetailsAfterLogin();

        const destination = email ? await getPostLoginDestination(email) : "/profile/create";
        const skipWizard = destination === "/dashboard";
        if (skipWizard) {
          setDashboardWelcomePending();
        }
        router.replace(destination);
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      }
    };

    run();
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-(--background)">
        <div className="text-center space-y-4">
          <p className="text-red-600 font-medium">{errorMessage}</p>
          <button onClick={() => router.replace("/login")} className="text-sm text-primary-600 underline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-(--background)">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-sm text-gray-500">Completing sign-in...</p>
      </div>
    </div>
  );
}

