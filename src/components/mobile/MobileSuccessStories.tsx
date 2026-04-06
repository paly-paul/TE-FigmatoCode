"use client";

import {
  DEFAULT_SUCCESS_STORIES,
  SuccessStoriesCarousel,
  type SuccessStoryItem,
} from "@/components/auth/successStories";

interface MobileSuccessStoriesSectionProps {
  heading?: string;
  stories?: SuccessStoryItem[];
}

export function MobileSuccessStoriesSection({
  heading,
  stories = DEFAULT_SUCCESS_STORIES,
}: MobileSuccessStoriesSectionProps) {
  return (
    <section
      className="relative overflow-hidden bg-[#F3F4F6] px-3 pb-6 pt-2"
      aria-label="Success stories"
    >
      <div
        className="pointer-events-none absolute -left-12 top-8 h-36 w-36 rounded-full bg-primary-200/35"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-24 h-28 w-28 rounded-full bg-primary-100/50"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto max-w-lg pt-4">
        {heading ? (
          <p className="mb-4 text-center text-lg font-bold text-gray-900">
            {heading}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-b-3xl rounded-t-2xl bg-[#FAFAFA] px-5 pb-2 pt-8 shadow-sm">
          <SuccessStoriesCarousel variant="mobile" stories={stories} />
        </div>
      </div>
    </section>
  );
}
