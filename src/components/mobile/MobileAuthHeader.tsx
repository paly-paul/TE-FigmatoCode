import Image from "next/image";

export function MobileAuthHeader() {
  return (
    <header className="shrink-0 border-b border-gray-200 bg-white px-4 pt-6 pb-4">
      <div className="flex items-center gap-2.5">
        <Image src="/icons/logo.jpeg" width={36} height={36} alt="SixFE Logo" />
        <span className="text-base font-semibold text-gray-800">SixFE</span>
      </div>
    </header>
  );
}
