/**
 * Site-wide settings that differ per deployment.
 *
 * The site reads and writes everything through Supabase. Both values below are
 * meant to be public: the publishable key only allows what the database's
 * row-level security policies allow. Never put a secret/service-role key or the
 * database password in this project.
 */
export const SUPABASE_URL: string = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://slcpvmpsynkqdozvlsii.supabase.co';
export const SUPABASE_KEY: string =
  (import.meta.env.VITE_SUPABASE_KEY as string | undefined) ?? 'sb_publishable_jqJACnQHmCMcGjt0kG6Sug_ddknIbAA';

/**
 * Images uploaded from the site (profile pictures) are hosted on ImgBB, like the app's.
 * This key is visible to anyone who opens the site; it can only upload to the ImgBB account.
 */
export const IMGBB_KEY: string = (import.meta.env.VITE_IMGBB_KEY as string | undefined) ?? '576f654932a2b7398e765cf27d8c73d4';
