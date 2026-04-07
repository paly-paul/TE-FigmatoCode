"use client";

import { useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/pagination";

export type SuccessStoryItem = {
  quote: string;
  name: string;
  role: string;
  company: string;
  avatarInitials: string;
};

export const DEFAULT_SUCCESS_STORIES: SuccessStoryItem[] = [
  {
    quote:
      "Simple to use with relevant job listings. I got interview calls quickly.",
    name: "John Doe",
    role: "Senior Engineer",
    company: "GreenSpark Energy",
    avatarInitials: "JD",
  },
  {
    quote:
      "The dashboard made tracking applications effortless. Highly recommend Talent Engine.",
    name: "Sarah Chen",
    role: "Product Designer",
    company: "Northwind Labs",
    avatarInitials: "SC",
  },
  {
    quote:
      "Found roles that matched my skills within days. The SSO login was seamless.",
    name: "Marcus Webb",
    role: "DevOps Lead",
    company: "Skyline Tech",
    avatarInitials: "MW",
  },
];

interface SuccessStoriesCarouselProps {
  variant?: "mobile" | "desktop";
  stories?: SuccessStoryItem[];
  className?: string;
}

/** Shared Swiper carousel (badge + slides). Used in mobile section and desktop right panel. */
export function SuccessStoriesCarousel({
  variant = "mobile",
  stories = DEFAULT_SUCCESS_STORIES,
  className = "",
}: SuccessStoriesCarouselProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);

  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper || stories.length <= 1) return;

    const interval = window.setInterval(() => {
      const activeIndex = swiper.realIndex;
      const lastIndex = stories.length - 1;
      const nextIndex = activeIndex >= lastIndex ? 0 : activeIndex + 1;
      swiper.slideTo(nextIndex);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [stories.length]);

  const quoteClass =
    variant === "desktop"
      ? "relative z-[1] text-2xl font-bold leading-snug text-gray-900"
      : "relative z-[1] text-lg font-bold leading-snug text-gray-900";

  const quoteBlockMinH = variant === "desktop" ? "min-h-[5.5rem]" : "min-h-[4.5rem]";

  return (
    <div className={className}>
      <div className="mb-6 flex justify-center">
        <span
          className={
            variant === "desktop"
              ? "inline-flex items-center rounded-full border border-primary-100 bg-primary-50 px-4 py-1.5 text-xs font-medium text-primary-700"
              : "rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700"
          }
        >
          Success Stories
        </span>
      </div>

      <Swiper
        modules={[Pagination]}
        pagination={{ clickable: true }}
        slidesPerView={1}
        spaceBetween={variant === "desktop" ? 32 : 24}
        allowTouchMove
        simulateTouch
        grabCursor
        touchStartPreventDefault={false}
        watchOverflow
        observer
        observeParents
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        className="mobile-success-stories-swiper w-full !pb-10"
      >
        {stories.map((story, index) => (
          <SwiperSlide key={`${story.name}-${index}`}>
            <div className="flex flex-col items-center px-1 pb-2 text-center">
              <div className={`relative z-[1] w-full px-1 pb-2 ${quoteBlockMinH}`}>
                <span
                  className="pointer-events-none absolute -left-1 -top-2 font-serif text-6xl leading-none text-primary-100 lg:text-7xl"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <p className={quoteClass}>{story.quote}</p>
                <span
                  className="pointer-events-none absolute -bottom-2 right-0 font-serif text-6xl leading-none text-primary-100 lg:text-7xl"
                  aria-hidden
                >
                  &rdquo;
                </span>
              </div>

              <div className="relative z-[1] mt-10 flex flex-col items-center gap-2">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-primary-100 to-primary-200 text-lg font-bold text-primary-800 shadow-sm ring-1 ring-gray-100"
                  aria-hidden
                >
                  {story.avatarInitials}
                </div>
                <p className="text-base font-bold text-gray-900">{story.name}</p>
                <p className="text-sm text-slate-600">{story.role}</p>
                <p className="text-sm text-slate-600">{story.company}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
