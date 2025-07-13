/**
 * Utility functions for delivery tracking
 */

export function generateTrackingUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/delivery-portal/${token}`;
}

export function extractTokenFromUrl(pathname: string): string | null {
  // Handle different URL patterns:
  // /delivery-portal/track_abc123
  // /track/track_abc123
  const patterns = [
    /\/delivery-portal\/(.+)/,
    /\/track\/(.+)/
  ];
  
  for (const pattern of patterns) {
    const match = pathname.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

export function validateTrackingToken(token: string): boolean {
  // Basic validation - tracking tokens should start with 'track_'
  return typeof token === 'string' && token.startsWith('track_') && token.length > 10;
}

export function formatTrackingToken(token: string): string {
  // Format token for display (e.g., truncate for UI)
  if (!token) return '';
  
  if (token.length > 20) {
    return `${token.substring(0, 15)}...`;
  }
  
  return token;
}