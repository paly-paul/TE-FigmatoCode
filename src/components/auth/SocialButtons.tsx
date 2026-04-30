import { GoogleIcon, LinkedInIcon } from "@/components/icons";

export function SocialLoginDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-sm text-gray-500 whitespace-nowrap">
        Or log in with
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export function SocialLoginButtons() {
  async function handleGoogleClick() {
    try {
      const res = await fetch("/api/auth/google/start", { method: "GET" });
      const data = (await res.json()) as { url?: string; error?: string };
      console.log("[google-login] /api/auth/google/start response", {
        ok: res.ok,
        status: res.status,
        data,
      });
      if (!res.ok || !data.url) {
        alert(`Google login start failed. status=${res.status} error=${data.error ?? "unknown"}`);
        return;
      }
      console.log("[google-login] redirecting to", data.url);
      window.location.href = data.url;
    } catch (err) {
      console.error("[google-login] unexpected error", err);
      alert("Google login start failed due to unexpected error. Check console logs.");
    }
  }

  return (
    // <div className="grid grid-cols-2 gap-3 ">
    <div className="flex justify-center">
      <button
        type="button"
        className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 px-8 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
        onClick={handleGoogleClick}
      >
        <GoogleIcon />
        Google
      </button>
      {/* <button
        type="button"
        className="flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 px-4 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        <LinkedInIcon />
        LinkedIn
      </button> */}
    </div>
  );
}
