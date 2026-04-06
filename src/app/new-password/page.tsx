import dynamic from "next/dynamic";

const NewPasswordPageClient = dynamic(() => import("./NewPasswordPageClient"), {
  ssr: false,
});

export default function NewPasswordPage() {
  return <NewPasswordPageClient />;
}
