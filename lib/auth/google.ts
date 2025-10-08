// Google OAuth Configuration
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

export const googleOAuthClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
);

// Scopes for Google Analytics 4
export const GA4_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit', // Required for Admin API
];

// Scopes for Google Search Console
export const GSC_SCOPES = [
  'https://www.googleapis.com/auth/webmasters.readonly', // Read-only access to Search Console
];

// Common scopes for user info
const COMMON_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Combined scopes for all services (used when connecting both)
export const ALL_GOOGLE_SCOPES = [...GA4_SCOPES, ...GSC_SCOPES, ...COMMON_SCOPES];

// Legacy export for backward compatibility
export const GOOGLE_SCOPES = ALL_GOOGLE_SCOPES;

export function getGoogleAuthUrl(state: string, service?: 'ga4' | 'gsc' | 'all'): string {
  let scopes = ALL_GOOGLE_SCOPES;
  
  // Allow requesting specific scopes based on service
  if (service === 'ga4') {
    scopes = [...GA4_SCOPES, ...COMMON_SCOPES];
  } else if (service === 'gsc') {
    scopes = [...GSC_SCOPES, ...COMMON_SCOPES];
  }
  
  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state,
    prompt: 'consent'
  });
}

export async function getGoogleTokens(code: string) {
  const { tokens } = await googleOAuthClient.getToken(code);
  return tokens;
}

export async function refreshGoogleToken(refreshToken: string) {
  googleOAuthClient.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await googleOAuthClient.refreshAccessToken();
  return credentials;
}
