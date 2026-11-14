/** The one Supabase client used by the whole site. */
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'nc-auth' },
});

/**
 * A random id kept in this browser. The database uses it to count one visitor's
 * views and reactions once, without knowing who the visitor is.
 */
export function deviceId(): string {
  try {
    let id = localStorage.getItem('nc-device');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('nc-device', id);
    }
    return id;
  } catch {
    return 'web-anonymous';
  }
}

/** Counts a view of an article, song or forum thread. Never interrupts the page if it fails. */
export function recordView(type: 'blog' | 'music' | 'forum', id: string, seconds?: number): void {
  void sb
    .rpc('content_view_record', { p_type: type, p_id: id, p_device_id: deviceId(), p_seconds: seconds ?? null })
    .then(undefined, () => undefined);
}
