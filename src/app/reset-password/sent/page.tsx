import dynamic from "next/dynamic";

const ResetPasswordSentPageClient = dynamic(
  () => import("./ResetPasswordSentPageClient"),
  { ssr: false }
);

export default function ResetPasswordSentPage() {
  return <ResetPasswordSentPageClient />;
}
