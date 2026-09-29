-- Fitness Tracker schema
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null,
  berat numeric,
  lingkar_perut numeric,
  sesi text,
  catatan text,
  mood text,
  created_at timestamptz not null default now()
);

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null,
  judul text not null,
  jenis text,
  selesai boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;
alter table public.todos enable row level security;

create policy "entries_select" on public.entries for select using (auth.uid() = user_id);
create policy "entries_insert" on public.entries for insert with check (auth.uid() = user_id);
create policy "entries_update" on public.entries for update using (auth.uid() = user_id);
create policy "entries_delete" on public.entries for delete using (auth.uid() = user_id);

create policy "todos_select" on public.todos for select using (auth.uid() = user_id);
create policy "todos_insert" on public.todos for insert with check (auth.uid() = user_id);
create policy "todos_update" on public.todos for update using (auth.uid() = user_id);
create policy "todos_delete" on public.todos for delete using (auth.uid() = user_id);
