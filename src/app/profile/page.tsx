 "use client";
 
 import { useEffect } from "react";
 import { useRouter } from "next/navigation";
 import MyProfilePage from "@/components/ui/MyProfilePage";
 import { getProfileName } from "@/lib/authSession";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const profileName = getProfileName();
    if (!profileName) return;
    router.replace(`/profile/${encodeURIComponent(profileName)}`);
  }, [router]);

  return <MyProfilePage />;
}