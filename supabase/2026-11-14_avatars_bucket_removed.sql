-- Applied to the Ningshing Che Supabase project on 2026-11-14.
-- Profile pictures are hosted on ImgBB, so the short-lived "avatars" storage bucket is closed:
-- its upload rules are removed and nothing can be written to it any more.
-- The empty bucket itself can be deleted in Supabase -> Storage (SQL is not allowed to delete storage files).
begin;
drop policy if exists avatars_own_insert on storage.objects;
drop policy if exists avatars_own_update on storage.objects;
drop policy if exists avatars_own_delete on storage.objects;
commit;
