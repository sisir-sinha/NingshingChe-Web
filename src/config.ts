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
