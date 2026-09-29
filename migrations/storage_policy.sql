-- Storage policy untuk bucket progress-photos (private)
-- Jalankan di Supabase SQL Editor SETELAH membuat bucket 'progress-photos' (private).
-- Path file format: {user_id}/{nama}.webp  → user hanya akses folder miliknya.

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "pp_select" on storage.objects;
drop policy if exists "pp_insert" on storage.objects;
drop policy if exists "pp_update" on storage.objects;
drop policy if exists "pp_delete" on storage.objects;

create policy "pp_select" on storage.objects for select
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pp_insert" on storage.objects for insert
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pp_update" on storage.objects for update
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pp_delete" on storage.objects for delete
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
