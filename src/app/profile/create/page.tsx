"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppNavbar from "@/components/profile/AppNavbar";
import { ProfileStepper } from "@/components/profile/ProfileStepper";
import { ProfileProgressCard } from "@/components/profile/ProfileProgressCard";
import { ResumeUploadArea } from "@/components/profile/ResumeUploadArea";
import { Button } from "@/components/ui/Button";
import { LightbulbIcon, UploadBoxIcon, SmallUploadIcon } from "@/components/icons";
import { clearProfileName, getUserDisplayName, setCandidateId, setProfileName } from "@/lib/authSession";
import { upsertResumeProfile, clearResumeProfile } from "@/lib/profileSession";
import { getSessionLoginEmail } from "@/lib/profileOnboarding";
import { MOBILE_MQ } from "@/lib/mobileViewport";
import {
  createPreProfile,
  generateProfileFromPreProfile,
  getCandidateProfileData,
  saveProfile,
  uploadProfileFile,
} from "@/services/profile";
import { ResumeProfileData } from "@/types/profile";

interface UploadedFile {
  name: string;
  uploadDate: string;
  updated_resume?: string;
}

function extractPreProfileNameFromCreateEditProfileResponse(
  payload: Record<string, unknown> | null
): string {
  if (!payload) return "";
  const roots: Array<Record<string, unknown>> = [
    payload,
    payload.message && typeof payload.message === "object"
      ? (payload.message as Record<string, unknown>)
      : {},
    payload.data && typeof payload.data === "object"
      ? (payload.data as Record<string, unknown>)
      : {},
  ];
  for (const root of roots) {
    const candidate =
      typeof root.pre_profile_name === "string"
        ? root.pre_profile_name
        : typeof root.pre_profile === "string"
          ? root.pre_profile
          : typeof root.preProfileName === "string"
            ? root.preProfileName
            : "";
    if (candidate.trim()) return candidate.trim();
  }
  return "";
}

function extractUpdatedResumeRef(uploadResponse: Record<string, unknown> | null): string {
  if (!uploadResponse) return "";
  const roots: Array<Record<string, unknown>> = [
    uploadResponse,
    uploadResponse.message && typeof uploadResponse.message === "object"
      ? (uploadResponse.message as Record<string, unknown>)
      : {},
    uploadResponse.data && typeof uploadResponse.data === "object"
      ? (uploadResponse.data as Record<string, unknown>)
      : {},
  ];
  const candidateKeys = ["file_url", "fileUrl", "url", "name", "file_name", "fileName"];
  for (const root of roots) {
    for (const key of candidateKeys) {
      const value = root[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return "";
}

function extractLinkedProfileId(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const record = raw as Record<string, unknown>;

  const message = record.message;
  if (message && typeof message === "object") {
    const m = message as Record<string, unknown>;
    const profileId = typeof m.profile_id === "string" ? m.profile_id.trim() : "";
    if (profileId) return profileId;
  }

  const serverMessagesRaw = typeof record._server_messages === "string" ? record._server_messages : "";
  if (serverMessagesRaw.trim()) {
    try {
      const arr = JSON.parse(serverMessagesRaw) as unknown;
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          if (typeof entry !== "string") continue;
          try {
            const decoded = JSON.parse(entry) as { message?: unknown };
            const text = typeof decoded.message === "string" ? decoded.message : entry;
            const match = text.match(/\bprofile\s+((?:PR|PROF)-[A-Za-z0-9-]+)\b/i);
            if (match?.[1]) return match[1];
          } catch {
            const match = entry.match(/\bprofile\s+((?:PR|PROF)-[A-Za-z0-9-]+)\b/i);
            if (match?.[1]) return match[1];
          }
        }
      }
    } catch {
      // ignore parse errors
    }
  }

  return "";
}

async function tryResolveProfileNameByEmail(email: string): Promise<string> {
  if (typeof window === "undefined") return "";
  const normalized = email.trim();
  if (!normalized) return "";
  try {
    const resolverUrl = new URL("/api/method/resolve_profile_name/", window.location.origin);
    resolverUrl.searchParams.set("email", normalized);
    const resolverRes = await fetch(resolverUrl.toString(), { method: "GET" });
    if (!resolverRes.ok) return "";
    const resolverData = (await resolverRes.json()) as { profile_name?: string };
    return resolverData.profile_name?.trim() || "";
  } catch {
    return "";
  }
}


export default function CreateProfilePage() {
  const router = useRouter();
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isProcessingResume, setIsProcessingResume] = useState(false);
  const [isGeneratingProfile, setIsGeneratingProfile] = useState(false);
  // Keep initial render identical to server HTML to avoid hydration mismatch.
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  // Re-hydrate uploaded resume info when the user navigates back
  // to this page within the same session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem("uploadedResumeMeta");
      if (!raw) return;
      const parsed = JSON.parse(raw) as UploadedFile;
      if (parsed?.name && parsed?.uploadDate) {
        setUploadedFile(parsed);
      }
    } catch {
      // ignore invalid JSON
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function formatDate(date: Date) {
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }

  async function handleUpload(file: File) {
    setIsProcessingResume(true);
    // Prevent stale AI profile data if this upload's AI generation fails.
    clearProfileName();
    clearResumeProfile();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("resumeSkills");
      } catch {
        // ignore
      }
    }
    try {
      const meta: UploadedFile = {
        name: file.name,
        uploadDate: formatDate(new Date()),
      };
      const baseData = deriveFallbackResumeData(file.name);
      let updatedResumeRef = "";

      try {
        const uploadedFileData = await uploadProfileFile(file);
        console.log("Uploaded resume file:", uploadedFileData);
        updatedResumeRef = extractUpdatedResumeRef(uploadedFileData);
      } catch (err) {
        console.log("Upload profile file error:", err);
      }

      // Prefill identity from the user session (instead of parsing the resume client-side).
      const sessionEmail = getSessionLoginEmail()?.trim() || "";
      const displayName = getUserDisplayName()?.trim() || "";
      const derivedFullNameFromDisplayOrEmail =
        displayName ||
        (sessionEmail
          ? sessionEmail
              .split("@")[0]
              .replace(/[._-]+/g, " ")
              .split(/\s+/)
              .filter(Boolean)
              .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
              .join(" ")
          : "");
      const derivedFullNameFromFileName = [baseData.firstName, baseData.lastName].filter(Boolean).join(" ").trim();
      const derivedFullName = derivedFullNameFromDisplayOrEmail || derivedFullNameFromFileName;

      const nameParts = derivedFullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ");

      const identityData: ResumeProfileData = {
        ...baseData,
        ...(sessionEmail ? { email: sessionEmail } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      };

      // Store immediately so downstream steps have basic identity, even if AI generation fails.
      upsertResumeProfile(identityData);

      const storedMeta: UploadedFile = updatedResumeRef ? { ...meta, updated_resume: updatedResumeRef } : meta;
      setUploadedFile(storedMeta);

      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem("uploadedResumeMeta", JSON.stringify(storedMeta));
        } catch {
          // ignore storage errors
        }
      }
    } finally {
      setIsProcessingResume(false);
    }
  }

  function handleDelete() {
    setUploadedFile(null);
    clearProfileName();
    clearResumeProfile();
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem("uploadedResumeMeta");
        window.sessionStorage.removeItem("resumeSkills");
        window.sessionStorage.removeItem("resumeProfilePic");
      } catch {
        // ignore storage errors
      }
    }
  }

  async function handleNext() {
    if (!uploadedFile) {
      alert("Please upload your resume before continuing.");
      return;
    }

    await handleGenerateAndContinue({
      resumeFileName: uploadedFile.name,
      updatedResumeRef: uploadedFile.updated_resume || "",
    });
  }

  async function handleContinueWithoutResume() {
    await handleGenerateAndContinue({
      resumeFileName: "",
      updatedResumeRef: "",
    });
  }

  async function handleGenerateAndContinue(input: {
    resumeFileName: string;
    updatedResumeRef: string;
  }) {

    if (isGeneratingProfile) return;
    setIsGeneratingProfile(true);
    try {
      const sessionEmail = getSessionLoginEmail()?.trim() || "";
      const displayName = getUserDisplayName()?.trim() || "";

      if (!sessionEmail) {
        alert("Session email is missing. Please login again.");
        return;
      }

      const baseData = deriveFallbackResumeData(input.resumeFileName);
      const derivedFullNameFromDisplayOrEmail =
        displayName ||
        sessionEmail
          .split("@")[0]
          .replace(/[._-]+/g, " ")
          .split(/\s+/)
          .filter(Boolean)
          .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
          .join(" ");
      const derivedFullNameFromFileName = [baseData.firstName, baseData.lastName].filter(Boolean).join(" ").trim();
      const derivedFullName = derivedFullNameFromDisplayOrEmail || derivedFullNameFromFileName;

      if (!derivedFullName) {
        alert("Unable to determine your full name. Please complete Basic Details first.");
        return;
      }

      const nameParts = derivedFullName.split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ");

      const updatedResumeRef = input.updatedResumeRef || "";

      const identityData: ResumeProfileData = {
        ...baseData,
        ...(sessionEmail ? { email: sessionEmail } : {}),
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
      };
      upsertResumeProfile(identityData);

      let effectiveProfileId = "";
      try {
        if (updatedResumeRef) {
          const createPreProfilePayload = new FormData();
          createPreProfilePayload.append("email", sessionEmail);
          createPreProfilePayload.append("full_name", derivedFullName);
          if (firstName) createPreProfilePayload.append("first_name", firstName);
          if (lastName) createPreProfilePayload.append("last_name", lastName);
          createPreProfilePayload.append("updated_resume", updatedResumeRef);

          const { preProfileName } = await createPreProfile(createPreProfilePayload);
          const { profileName: generatedProfileName } = await generateProfileFromPreProfile(preProfileName);

          if (generatedProfileName) {
            effectiveProfileId = generatedProfileName;
            setProfileName(generatedProfileName);
            setCandidateId(generatedProfileName);
          }
        } else {
          const createEditResponse = await saveProfile({
            full_name: derivedFullName,
            email: sessionEmail,
            action: "save",
          });

          const inferredProfileId =
            (typeof createEditResponse.profile_name === "string" && createEditResponse.profile_name.trim()) ||
            (typeof createEditResponse.profile === "string" && createEditResponse.profile.trim()) ||
            "";
          if (inferredProfileId) {
            effectiveProfileId = inferredProfileId;
            setProfileName(inferredProfileId);
            setCandidateId(inferredProfileId);
          }

          const preProfileName = extractPreProfileNameFromCreateEditProfileResponse(createEditResponse);
          if (preProfileName) {
            const { profileName: generatedProfileName } = await generateProfileFromPreProfile(preProfileName);
            if (generatedProfileName) {
              effectiveProfileId = generatedProfileName;
              setProfileName(generatedProfileName);
              setCandidateId(generatedProfileName);
            }
          }
        }
      } catch (error) {
        const raw = (
          error as Error & {
            raw?: Record<string, unknown>;
          }
        ).raw;
        const detail = raw?.detail && typeof raw.detail === "object" ? (raw.detail as Record<string, unknown>) : null;
        const messageRoot =
          detail?.message && typeof detail.message === "object" ? (detail.message as Record<string, unknown>) : null;

        const existingProfileId =
          messageRoot && typeof messageRoot.profile_id === "string" ? messageRoot.profile_id.trim() : "";
        const failedMessage =
          messageRoot && typeof messageRoot.message === "string" ? messageRoot.message.toLowerCase() : "";
        const duplicateEmail = failedMessage.includes("already exists");

        if (duplicateEmail && existingProfileId) {
          effectiveProfileId = existingProfileId;
          setProfileName(existingProfileId);
          setCandidateId(existingProfileId);
        }

        // Some backends roll back generation when a Candidate User is already linked to a Profile.
        // In that case, extract the linked Profile id (PR-..) from server messages and continue by loading it.
        if (!effectiveProfileId) {
          const linked = extractLinkedProfileId(raw) || extractLinkedProfileId(detail) || extractLinkedProfileId(messageRoot);
          if (linked) {
            effectiveProfileId = linked;
            setProfileName(linked);
            setCandidateId(linked);
          }
        }

        // Final fallback: resolve by email (if backend supports it).
        if (!effectiveProfileId) {
          const resolved = await tryResolveProfileNameByEmail(sessionEmail);
          if (resolved) {
            effectiveProfileId = resolved;
            setProfileName(resolved);
            setCandidateId(resolved);
          }
        }
      }

      if (!effectiveProfileId) {
        alert("Unable to create/update profile. Please try again.");
        return;
      }

      if (updatedResumeRef) {
        try {
          await saveProfile({
            profile: effectiveProfileId,
            full_name: derivedFullName,
            email: sessionEmail,
            action: "save",
          });
        } catch {
          // Continue to basic details even if the best-effort save call fails.
        }
      }

      // Prefill from backend profile, but never crash the wizard if backend generation rolled back.
      // Some backends may reference a profile id in messages that doesn't actually exist.
      let backendProfile: ResumeProfileData | null = null;
      try {
        backendProfile = await getCandidateProfileData(effectiveProfileId);
      } catch {
        const resolved = await tryResolveProfileNameByEmail(sessionEmail);
        if (resolved && resolved !== effectiveProfileId) {
          effectiveProfileId = resolved;
          setProfileName(resolved);
          setCandidateId(resolved);
          try {
            backendProfile = await getCandidateProfileData(resolved);
          } catch {
            backendProfile = null;
          }
        }
      }

      if (backendProfile) {
        upsertResumeProfile(backendProfile);
      }

      if (typeof window !== "undefined") {
        if (backendProfile) {
          const firstProject = backendProfile.projects?.[0];
          window.sessionStorage.setItem(
            "resumeSkills",
            JSON.stringify({
              skills: backendProfile.keySkills ?? [],
              // Backend stores skills; we don't reliably separate "tools" vs "skills" here.
              tools: [],
              projects: backendProfile.projects ?? [],
              projectDescription: firstProject?.projectDescription ?? "",
              responsibilities: firstProject?.responsibilities ?? "",
            })
          );
        }
      }

      router.push("/profile/create/basic-details");
    } finally {
      setIsGeneratingProfile(false);
    }
  }

  function deriveFallbackResumeData(fileName: string): ResumeProfileData {
    const baseData: ResumeProfileData = {};
    const ignoredTokens = new Set(["resume", "cv", "profile", "updated", "final", "draft", "new"]);
    const nameFromFile = fileName.replace(/\.[^/.]+$/, "");
    const parts = nameFromFile
      .split(/[\s_-]+/)
      .filter(Boolean)
      .filter((token) => /^[A-Za-z.'-]+$/.test(token))
      .filter((token) => !ignoredTokens.has(token.toLowerCase()));

    if (parts.length >= 2) {
      baseData.firstName = parts[0];
      baseData.lastName = parts.slice(1).join(" ");
    }

    return baseData;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F3F4F6]">
      <AppNavbar />

      {isGeneratingProfile ? (
        <div className="fixed inset-0 z-50 bg-white/70 backdrop-blur-[1px] flex items-center justify-center px-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <style jsx>{`
                @keyframes shape1-morph {
                  0%, 100% { transform: translate(0px, -14px) rotate(45deg); border-radius: 2px; }
                  25% { transform: translate(14px, 0px) rotate(90deg); border-radius: 50%; }
                  50% { transform: translate(0px, 14px) rotate(135deg); border-radius: 2px; }
                  75% { transform: translate(-14px, 0px) rotate(180deg); border-radius: 50%; }
                }
                @keyframes shape2-morph {
                  0%, 100% { transform: translate(-14px, 0px) rotate(45deg); border-radius: 2px; }
                  25% { transform: translate(0px, -14px) rotate(90deg); border-radius: 50%; }
                  50% { transform: translate(14px, 0px) rotate(135deg); border-radius: 2px; }
                  75% { transform: translate(0px, 14px) rotate(180deg); border-radius: 50%; }
                }
                @keyframes shape3-morph {
                  0%, 100% { transform: translate(0px, 14px) rotate(45deg); border-radius: 2px; }
                  25% { transform: translate(-14px, 0px) rotate(90deg); border-radius: 50%; }
                  50% { transform: translate(0px, -14px) rotate(135deg); border-radius: 2px; }
                  75% { transform: translate(14px, 0px) rotate(180deg); border-radius: 50%; }
                }
                @keyframes shape4-morph {
                  0%, 100% { transform: translate(14px, 0px) rotate(45deg); border-radius: 2px; }
                  25% { transform: translate(0px, 14px) rotate(90deg); border-radius: 50%; }
                  50% { transform: translate(-14px, 0px) rotate(135deg); border-radius: 2px; }
                  75% { transform: translate(0px, -14px) rotate(180deg); border-radius: 50%; }
                }
                .loader-shape {
                  position: absolute;
                  width: 12px;
                  height: 12px;
                  background-color: #2563eb;
                  will-change: transform, border-radius;
                }
                .shape-1 { animation: shape1-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
                .shape-2 { animation: shape2-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
                .shape-3 { animation: shape3-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
                .shape-4 { animation: shape4-morph 2.4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite; }
              `}</style>
              <div className="loader-shape shape-1" />
              <div className="loader-shape shape-2" />
              <div className="loader-shape shape-3" />
              <div className="loader-shape shape-4" />
            </div>
            <p className="text-sm font-medium text-gray-700 text-center">
              Generating your profile…
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col flex-1 overflow-hidden">
        {isMobileViewport ? (
          <div className="flex flex-col flex-1 px-4 pb-28 pt-4 overflow-y-auto gap-4">
            <MobileUploadStepper />
            <ProfileProgressCard percent={uploadedFile ? 10 : 0} className="w-full" />

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-900 leading-none">Upload Resume</h2>
              </div>
              <div className="p-3">
                <MobileResumeUploadCard
                  uploadedFile={uploadedFile}
                  onUpload={handleUpload}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 bg-[#F0F6FF] border border-blue-100 rounded px-4 py-3">
              <span className="shrink-0 mt-0.5">
                <LightbulbIcon />
              </span>
              <p className="text-sm text-gray-700 leading-snug">
                Upload your resume to auto-fill skills and projects. You can edit
                them in the next steps.
              </p>
            </div>

            {!uploadedFile ? (
              <div className="bg-white border border-gray-200 rounded px-4 py-4">
                <h3 className="text-base font-semibold text-gray-900">No Resume? No Problem</h3>
                <p className="mt-1 text-sm text-gray-600">
                  You can still explore opportunities by creating your profile step-by-step.
                </p>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={handleContinueWithoutResume}
                  disabled={isProcessingResume || isGeneratingProfile}
                >
                  {isGeneratingProfile ? "Generating..." : "Continue Without Resume"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 lg:px-8 py-4">
              <h1 className="text-lg font-bold text-gray-900">Create Profile</h1>
            </div>

            <div className="flex flex-col xl:flex-row flex-1 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 pb-28 overflow-y-auto">
              <ProfileStepper currentStep={1} />

            <div className="order-3 xl:order-2 flex flex-col flex-1 gap-4 min-w-0">
                <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-4">Upload Resume</h2>
                  <ResumeUploadArea
                    uploadedFile={uploadedFile}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                  />
                </div>

                {!uploadedFile && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <span className="shrink-0 mt-0.5">
                        <LightbulbIcon />
                      </span>
                      <p className="text-sm text-gray-600">
                        Upload your resume to auto-fill skills and projects. You can edit
                        them in the next steps.
                      </p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
                      <h3 className="text-base font-semibold text-gray-900">No Resume? No Problem</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        You can still explore opportunities by creating your profile step-by-step.
                      </p>
                      <Button
                        type="button"
                        fullWidth={false}
                        className="mt-3"
                        onClick={handleContinueWithoutResume}
                        disabled={isProcessingResume || isGeneratingProfile}
                      >
                        {isGeneratingProfile ? "Generating..." : "Continue Without Resume"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <ProfileProgressCard percent={uploadedFile ? 10 : 0} className="order-2 xl:order-3" />
            </div>
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex justify-end gap-3">
        <Button
          fullWidth={false}
          onClick={handleNext}
          className="px-6 sm:px-8"
          disabled={!uploadedFile || isProcessingResume || isGeneratingProfile}
        >
          {isProcessingResume ? "Processing..." : isGeneratingProfile ? "Generating..." : "Next"}
        </Button>
      </div>
    </div>
  );
}

function MobileUploadStepper() {
  const steps = [1, 2, 3];
  return (
    <div className="flex items-center gap-3">
      {steps.map((step, idx) => (
        <div key={step} className="flex items-center gap-3">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold ${step === 1
              ? "bg-primary-600 text-white"
              : "bg-transparent border border-[#A7B2C8] text-[#6B7A99]"
              }`}
          >
            {step}
          </div>
          {step === 1 ? (
            <span className="text-xl font-semibold text-gray-900">Upload Resume</span>
          ) : null}
          {idx < steps.length - 1 ? <span className="text-gray-400">|</span> : null}
        </div>
      ))}
    </div>
  );
}

function MobileResumeUploadCard({
  uploadedFile,
  onUpload,
}: {
  uploadedFile: UploadedFile | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (!allowed.includes(file.type)) {
      alert("Only PDF or DOCX files are supported.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5 MB.");
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch {
      alert("We couldn't upload that resume. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="rounded border border-[#CFD7E7] bg-[#EFF3FA] p-6 flex flex-col items-center text-center gap-3 min-h-[220px] justify-center">
      <UploadBoxIcon />
      <p className="text-lg font-medium text-gray-900 leading-none">
        {uploadedFile ? uploadedFile.name : "No file selected"}
      </p>
      <p className="text-sm text-[#60708F]">Supports PDF, Docx files upto 5 MB</p>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="mt-1 flex items-center gap-2 border border-[#CFD7E7] rounded px-6 py-2 text-xl leading-none font-medium text-gray-900 bg-[#F5F7FB] hover:bg-white disabled:opacity-60"
      >
        <SmallUploadIcon />
        {isUploading ? "Uploading..." : "Upload"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}
