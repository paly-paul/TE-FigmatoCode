import { CloseQuoteIcon, OpenQuoteIcon } from "@/components/icons";

const testimonial = {
  badge: "Success Stories",
  quote: "Simple to use with relevant job listings.\nI got interview calls quickly.",
  author: {
    name: "John Doe",
    role: "Senior Engineer",
    company: "GreenSpark Energy",
    initials: "JD",
  },
  totalSlides: 3,
  activeSlide: 1,
};

export function RightPanel() {
  return (
    <div className="hidden lg:flex flex-col flex-1 relative bg-[#EEF1F8] overflow-hidden">
      {/* Grid background pattern */}
      <div className="absolute inset-0 bg-grid-pattern" />

      {/* Content centered vertically */}
      <div className="relative flex flex-col items-center justify-center h-full px-16 py-12">
        {/* Testimonial card area */}
        <div className="relative max-w-md w-full">
          {/* Opening quote - top left */}
          <div className="absolute -top-8 -left-6">
            <OpenQuoteIcon />
          </div>

          {/* Success Stories badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
              {testimonial.badge}
            </span>
          </div>

          {/* Quote text */}
          <blockquote className="text-2xl font-bold text-gray-900 text-center leading-snug whitespace-pre-line">
            {testimonial.quote}
          </blockquote>

          {/* Closing quote - bottom right */}
          <div className="absolute -bottom-8 -right-6">
            <CloseQuoteIcon />
          </div>
        </div>

        {/* Author info */}
        <div className="mt-16 flex flex-col items-center gap-2">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold text-lg overflow-hidden ring-2 ring-white ring-offset-2">
            <AvatarPlaceholder initials={testimonial.author.initials} />
          </div>

          <p className="mt-1 font-semibold text-gray-900 text-base">
            {testimonial.author.name}
          </p>
          <p className="text-sm text-gray-500">{testimonial.author.role}</p>
          <p className="text-sm text-gray-500">{testimonial.author.company}</p>

          {/* Pagination dots */}
          <div className="flex items-center gap-2 mt-3">
            {Array.from({ length: testimonial.totalSlides }).map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all ${
                  i === testimonial.activeSlide
                    ? "w-2.5 h-2.5 bg-primary-600"
                    : "w-2 h-2 bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AvatarPlaceholder({ initials }: { initials: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <rect width="64" height="64" fill="#D1D5DB" />
      {/* Simple person silhouette */}
      <circle cx="32" cy="22" r="10" fill="#9CA3AF" />
      <path
        d="M8 56C8 42 18 36 32 36C46 36 56 42 56 56"
        fill="#9CA3AF"
      />
    </svg>
  );
}
