'use client';

import { useState, useEffect } from "react";

// Breakpoint configuration - Customize these to match your design

export const BREAKPOINTS = {
    mobile: 640,
    tablet: 768,
    laptop: 1024,
    desktop: 1280,
    wide: 1536
} as const;

export type DeviceType = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'wide';

// Hook to detect current device type based on screen width
export function useDeviceType(): DeviceType {
    const [deviceType, setDeviceType] = useState<DeviceType>('desktop');

    useEffect(() => {
        const getDeviceType = (width: number): DeviceType => {
            if (width < BREAKPOINTS.mobile) return 'mobile';
            if (width < BREAKPOINTS.tablet) return 'tablet';
            if (width < BREAKPOINTS.laptop) return 'laptop';
            if (width < BREAKPOINTS.desktop) return 'desktop';
            if (width < BREAKPOINTS.wide) return 'wide';
            return 'wide';
        };

        const handleResize = () => {
            setDeviceType(getDeviceType(window.innerWidth));
        };

        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return deviceType;
};


// Hook to check if screen matches a specific media query:
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const media = window.matchMedia(query);

        setMatches(media.matches);

        const listener = (e: MediaQueryListEvent) => setMatches(e.matches);

        // Modern browsers:
        if (media.addEventListener) {
            media.addEventListener('change', listener);
            return () => media.removeEventListener('change', listener);
        } else {
            // Fallback to older browsers:
            media.addListener(listener);
            return () => media.removeListener(listener);
        }
    }, [query]);
    return matches;
}

// For common breakpoints:
export function useIsMobile(): boolean {
    return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet - 1}px)`);
}

/** True when viewport is below Tailwind `lg` (max-width 1023px) — mobile + tablet. */
export function useIsBelowLg(): boolean {
    return useMediaQuery(`(max-width: ${BREAKPOINTS.laptop - 1}px)`);
}

/** True when viewport is at most 768px — e.g. timesheet mobile shell with Overview/Timesheet tabs. */
export function useIs768AndBelow(): boolean {
    return useMediaQuery(`(max-width: ${BREAKPOINTS.tablet}px)`);
}

export function useIsTablet(): boolean {
    return useMediaQuery(
        `(min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.laptop - 1}px)`
    )
}

export function useIsDesktop(): boolean {
    return useMediaQuery(`(min-width: ${BREAKPOINTS.laptop}px)`);
}

// To get current screen dimensions:
export function useScreenSize() {
    const [screenSize, setScreenSize] = useState({
        width: 0,
        height: 0
    });

    useEffect(() => {
        const handleResize = () => {
            setScreenSize({
                width: window.innerWidth,
                height: window.innerHeight
            })
        }

        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
}

// To detect screen orientation:
export function useOrientation(): 'portrait' | 'landscape' {
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

    useEffect(() => {
        const handleOrientationChange = () => {
            setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape')
        };

        handleOrientationChange();

        window.addEventListener('resize', handleOrientationChange);
        return () => window.removeEventListener('resize', handleOrientationChange);
    }, []);

    return orientation;
}
