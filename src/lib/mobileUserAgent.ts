/**
 * Detects phone-sized clients from the User-Agent for Edge middleware.
 * Tablet and desktop UAs are treated as non-mobile so they keep the existing auth layout.
 */
export function isMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;

  if (/iPad|Tablet|PlayBook|Silk/i.test(userAgent)) return false;

  return /Mobi|Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|webOS/i.test(
    userAgent
  );
}
