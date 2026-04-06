import dynamic from "next/dynamic";

const SignupPageClient = dynamic(() => import("./SignupPageClient"), {
  ssr: false,
});

export default function SignupPage() {
  return <SignupPageClient />;
}
