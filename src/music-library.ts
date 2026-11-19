import { sb, deviceId } from './supabase';
import { md5 } from 'js-md5';

export interface MusicPlaylist { id: string; title: string; tracks: Set<string> }
/** Same deterministic identity used by Supabase's toggle_music_love RPC for guests. */
function guestIdentity(): string {
  const hash = md5('ningshingche:' + deviceId());
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
}
export async function loadLoves(userId?: string): Promise<Set<string>> {
  const { data, error } = await sb.from('music_loves').select('track_id').eq('user_id', userId || guestIdentity());
  if (error) throw error;
  return new Set((data ?? []).map((r) => String(r.track_id)));
}
export async function setLove(id: string, loved: boolean): Promise<number> {
  const { data, error } = await sb.rpc('toggle_music_love', { p_track_id: id, p_device_id: deviceId(), p_loved: loved });
  if (error) throw error;
  return Number(data) || 0;
}
export async function loadPlaylists(userId: string): Promise<MusicPlaylist[]> {
  const { data, error } = await sb.from('music_playlists').select('id,title,music_playlist_tracks(track_id)').eq('user_id', userId).eq('kind', 'custom').order('created_at');
  if (error) throw error;
  return (data ?? []).map((p) => ({ id: String(p.id), title: String(p.title), tracks: new Set(((p.music_playlist_tracks ?? []) as {track_id: string}[]).map((t) => String(t.track_id))) }));
}
export async function createPlaylist(userId: string, title: string): Promise<void> {
  const { error } = await sb.from('music_playlists').insert({ user_id: userId, title, kind: 'custom' });
  if (error) throw error;
}
export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await sb.from('music_playlists').delete().eq('id', id);
  if (error) throw error;
}
export async function changePlaylistTrack(playlistId: string, trackId: string, add: boolean): Promise<void> {
  const { error } = add
    ? await sb.from('music_playlist_tracks').upsert({ playlist_id: playlistId, track_id: trackId }, { onConflict: 'playlist_id,track_id', ignoreDuplicates: true })
    : await sb.from('music_playlist_tracks').delete().eq('playlist_id', playlistId).eq('track_id', trackId);
  if (error) throw error;
}
