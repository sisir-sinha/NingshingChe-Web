-- Applied to the Ningshing Che Supabase project on 2026-11-14.
-- Only signed-in readers can comment, and only under their own account.
-- Comments still arrive as "Unpublish" and wait for approval. The dashboard's own policies are untouched.
begin;

drop policy if exists comments_public_insert on public.comments;
drop policy if exists comments_registered_insert on public.comments;
create policy comments_registered_insert on public.comments for insert to authenticated
  with check (status = 'Unpublish' and user_id = auth.uid());

commit;

-- To allow guest comments again:
--   drop policy comments_registered_insert on public.comments;
--   create policy comments_public_insert on public.comments for insert to anon, authenticated
--     with check (status = 'Unpublish');
