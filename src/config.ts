/**
 * Site-wide settings that differ per deployment.
 *
 * GOOGLE_CLIENT_ID — the OAuth 2.0 "Web application" client ID from
 * https://console.cloud.google.com/apis/credentials. Add every address the
 * site is served from under "Authorised JavaScript origins"
 * (e.g. https://sisir-sinha.github.io and https://ningshingche.com).
 * Either paste the ID below or set VITE_GOOGLE_CLIENT_ID when building.
 * While it is empty the Google button is shown but explains that it is not set up.
 */
export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
