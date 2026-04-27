"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLikelyDocId, setCandidateId, setProfileGenerated, setProfileName, setUserDisplayName } from "@/lib/authSession";

export default function GoogleCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const exchangeToken = async () => {
      const token = new URLSearchParams(window.location.search).get(
        "login_token"
      );

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

        const result = await res.json();

        if (res.ok && result.success) {
          const candidateId = typeof result.user?.candidate_id === "string" ? result.user.candidate_id.trim() : "";
          const fullName = typeof result.user?.full_name === "string" ? result.user.full_name.trim() : "";
          if (candidateId) {
            if (isLikelyDocId(candidateId)) setCandidateId(candidateId);
            setProfileName(candidateId);
            setProfileGenerated(true);
          }
          if (fullName) setUserDisplayName(fullName);
          router.push("/");
        } else {
          const msg = result.error || "Google sign-in failed. Please try again.";
          setErrorMessage(msg);
          setStatus("error");
        }
      } catch {
        const msg = "Something went wrong. Please try again.";
        setErrorMessage(msg);
        setStatus("error");
      }
    };

    exchangeToken();
  }, [router]);

  if (status === "error") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-(--background)">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-medium">{errorMessage}</p>
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-blue-600 underline"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-(--background)">
      <div className="text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
        <p className="text-sm text-gray-500">Completing sign-in...</p>
      </div>
    </div>
  );
}
