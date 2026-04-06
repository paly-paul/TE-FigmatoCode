'use client';

import { ReactNode } from "react";
import { useIsMobile, useIsTablet, useIsDesktop, useMediaQuery, useDeviceType } from "./useResponsive";

interface ResponsiveProps {
    children: ReactNode;
}

// Shows children only on mobile devices:
export function MobileOnly({ children }: ResponsiveProps) {
    const isMobile = useIsMobile();
    return isMobile ? <>{children}</> : null;
}

// Show children only on tablet devices:
export function TabletOnly({ children }: ResponsiveProps) {
    const isTablet = useIsTablet();
    return isTablet ? <>{children}</> : null;
}

// Show children only on desktop devices:
export function DesktopOnly({ children }: ResponsiveProps) {
    const isDesktop = useIsDesktop();
    return isDesktop ? <>{children}</> : null;
}

// Shows children only on mobile and tablet:
export function MobileAndTablet({ children }: ResponsiveProps) {
    const isDesktop = useIsDesktop();
    return !isDesktop ? <>{children}</> : null;
}


// Advanced component that renders different children based on device type:
interface ResponsiveViewProps {
    mobile?: ReactNode;
    tablet?: ReactNode;
    desktop?: ReactNode;
    fallback?: ReactNode;
}


export function ResponsiveView({ mobile, tablet, desktop, fallback }: ResponsiveViewProps) {
    const deviceType = useDeviceType();

    switch (deviceType) {
        case 'mobile':
            return <>{mobile ?? fallback ?? null}</>

        case 'tablet':
            return <>{tablet ?? fallback ?? null}</>

        case 'laptop':
        case 'desktop':
        case 'wide':
            return <>{desktop ?? fallback ?? null}</>
        default:
            return <>{fallback ?? null}</>
    }
}

// Custom responsive component with own breakpoint:
interface MediaQueryProps extends ResponsiveProps {
    query: string;
}

export function MediaQuery({query, children}: MediaQueryProps) {
    const matches = useMediaQuery(query);
    return matches ? <>{children}</> : null;
}

// Component that conditionally renders based on multiple device types:
interface ShowOnProps extends ResponsiveProps {
    devices: Array<'mobile' | 'tablet' | 'laptop' | 'desktop' | 'wide'>;
}

export function ShowOn({devices, children}: ShowOnProps) {
    const deviceType = useDeviceType();
    return devices.includes(deviceType) ? <>{children}</> : null;
}

// Component that hides content on specific devices:
interface HideOnProps extends ResponsiveProps {
    devices: Array<'mobile' | 'tablet' | 'laptop' | 'desktop' | 'wide'>;
}

export function HideOn({devices, children}: HideOnProps) {
    const deviceType = useDeviceType();
    return !devices.includes(deviceType) ? <>{children}</> : null;
}