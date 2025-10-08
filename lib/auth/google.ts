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

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/analytics.edit', // Required for Admin API
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

export function getGoogleAuthUrl(state: string): string {
  return googleOAuthClient.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_SCOPES,
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
