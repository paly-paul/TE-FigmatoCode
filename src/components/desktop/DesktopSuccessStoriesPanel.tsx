"use client";

import {
  DEFAULT_SUCCESS_STORIES,
  SuccessStoriesCarousel,
} from "@/components/auth/successStories";

/**
 * Right column for auth desktop: light gray + grid, Success Stories Swiper.
 */
export function DesktopSuccessStoriesPanel() {
  return (
    <div className="relative hidden flex-1 flex-col overflow-hidden bg-[#EEF1F8] lg:flex">
      <div className="absolute inset-0 bg-grid-pattern" />

      <div className="relative flex h-full flex-col items-center justify-center px-12 py-12 xl:px-16">
        <div className="w-full max-w-md">
          <SuccessStoriesCarousel variant="desktop" stories={DEFAULT_SUCCESS_STORIES} />
        </div>
      </div>
    </div>
  );
}
