-- ============================================================
-- Fitness Tracker V2 schema (ADDITIVE, non-destructive)
-- entries & todos TIDAK diubah / TIDAK dihapus.
-- Semua tabel: user_id default auth.uid() + RLS per user.
-- Idempoten: aman dijalankan berulang (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- ============================================================

-- helper trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  nama text,
  tinggi numeric,
  unit text default 'metric',
  theme text default 'system',
  target_kalori numeric default 2100,
  target_protein numeric default 120,
  target_karbo numeric default 230,
  target_lemak numeric default 70,
  reminder_enabled boolean default false,
  reminder_time text default '19:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists profiles_all on public.profiles;
create policy profiles_all on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------
-- exercises (master)
-- ------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nama text not null,
  kategori text,
  satuan text default 'reps',
  created_at timestamptz not null default now(),
  unique (user_id, nama)
);
alter table public.exercises enable row level security;
drop policy if exists exercises_all on public.exercises;
create policy exercises_all on public.exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- workout_templates
-- ------------------------------------------------------------
create table if not exists public.workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nama text not null,
  kode text,
  urutan integer default 0,
  created_at timestamptz not null default now(),
  unique (user_id, kode)
);
alter table public.workout_templates enable row level security;
drop policy if exists workout_templates_all on public.workout_templates;
create policy workout_templates_all on public.workout_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- template_exercises
-- ------------------------------------------------------------
create table if not exists public.template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  template_id uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  urutan integer default 0,
  target_sets integer default 3,
  target_reps_min integer,
  target_reps_max integer,
  beban numeric,
  catatan text,
  created_at timestamptz not null default now()
);
alter table public.template_exercises enable row level security;
drop policy if exists template_exercises_all on public.template_exercises;
create policy template_exercises_all on public.template_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- workout_sessions
-- ------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null default current_date,
  template_id uuid references public.workout_templates(id) on delete set null,
  kode text,
  status text default 'in_progress',
  durasi_detik integer,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ws_user_tanggal on public.workout_sessions(user_id, tanggal desc);
alter table public.workout_sessions enable row level security;
drop policy if exists workout_sessions_all on public.workout_sessions;
create policy workout_sessions_all on public.workout_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists trg_ws_updated on public.workout_sessions;
create trigger trg_ws_updated before update on public.workout_sessions for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- exercise_logs
-- ------------------------------------------------------------
create table if not exists public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  exercise_nama text,
  set_no integer not null default 1,
  reps integer,
  beban numeric,
  tanggal date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_el_user_ex_tanggal on public.exercise_logs(user_id, exercise_nama, tanggal desc);
create index if not exists idx_el_session on public.exercise_logs(session_id);
alter table public.exercise_logs enable row level security;
drop policy if exists exercise_logs_all on public.exercise_logs;
create policy exercise_logs_all on public.exercise_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- weight_logs
-- ------------------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null default current_date,
  berat numeric not null,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_wl_user_tanggal on public.weight_logs(user_id, tanggal desc);
alter table public.weight_logs enable row level security;
drop policy if exists weight_logs_all on public.weight_logs;
create policy weight_logs_all on public.weight_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- body_measurements
-- ------------------------------------------------------------
create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null default current_date,
  perut numeric,
  dada numeric,
  lengan numeric,
  paha numeric,
  pinggul numeric,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_bm_user_tanggal on public.body_measurements(user_id, tanggal desc);
alter table public.body_measurements enable row level security;
drop policy if exists body_measurements_all on public.body_measurements;
create policy body_measurements_all on public.body_measurements for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- foods (favorit)
-- ------------------------------------------------------------
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nama text not null,
  kalori numeric default 0,
  protein numeric default 0,
  karbo numeric default 0,
  lemak numeric default 0,
  porsi text,
  favorit boolean default true,
  created_at timestamptz not null default now()
);
alter table public.foods enable row level security;
drop policy if exists foods_all on public.foods;
create policy foods_all on public.foods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- nutrition_logs
-- ------------------------------------------------------------
create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null default current_date,
  food_id uuid references public.foods(id) on delete set null,
  nama text,
  porsi numeric default 1,
  meal text default 'Lainnya',
  kalori numeric default 0,
  protein numeric default 0,
  karbo numeric default 0,
  lemak numeric default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_nl_user_tanggal on public.nutrition_logs(user_id, tanggal desc);
alter table public.nutrition_logs enable row level security;
drop policy if exists nutrition_logs_all on public.nutrition_logs;
create policy nutrition_logs_all on public.nutrition_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- goals
-- ------------------------------------------------------------
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipe text not null,
  label text,
  target numeric not null,
  start numeric,
  satuan text,
  exercise_nama text,
  deadline date,
  status text default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.goals enable row level security;
drop policy if exists goals_all on public.goals;
create policy goals_all on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists trg_goals_updated on public.goals;
create trigger trg_goals_updated before update on public.goals for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- personal_records
-- ------------------------------------------------------------
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id uuid references public.exercises(id) on delete cascade,
  exercise_nama text not null,
  nilai numeric not null,
  satuan text,
  tanggal date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_pr_user_ex on public.personal_records(user_id, exercise_nama, nilai desc);
alter table public.personal_records enable row level security;
drop policy if exists personal_records_all on public.personal_records;
create policy personal_records_all on public.personal_records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- progress_photos
-- ------------------------------------------------------------
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null default current_date,
  angle text not null default 'front',
  storage_path text,
  thumb_path text,
  catatan text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pp_user_tanggal on public.progress_photos(user_id, tanggal desc);
alter table public.progress_photos enable row level security;
drop policy if exists progress_photos_all on public.progress_photos;
create policy progress_photos_all on public.progress_photos for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- activity_logs
-- ------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tanggal date not null default current_date,
  tipe text not null,
  ref_id uuid,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_al_user_tanggal on public.activity_logs(user_id, tanggal desc);
alter table public.activity_logs enable row level security;
drop policy if exists activity_logs_all on public.activity_logs;
create policy activity_logs_all on public.activity_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
