-- ============================================================
-- Fitness Tracker V2 backfill + seed
-- Idempoten: aman dijalankan berulang (on conflict do nothing).
-- TIDAK menghapus entries/todos.
-- Jalankan SETELAH 002_v2_schema.sql.
-- Catatan: SQL Editor berjalan tanpa auth.uid(), jadi backfill
-- mengiterasi semua user yang sudah ada di auth.users.
-- ============================================================

-- ------------------------------------------------------------
-- 1. weight_logs  <- entries.berat
-- ------------------------------------------------------------
insert into public.weight_logs (user_id, tanggal, berat, catatan)
select e.user_id, e.tanggal, e.berat, e.catatan
from public.entries e
where e.berat is not null
  and not exists (
    select 1 from public.weight_logs w
    where w.user_id = e.user_id and w.tanggal = e.tanggal
  );

-- ------------------------------------------------------------
-- 2. body_measurements <- entries.lingkar_perut
-- ------------------------------------------------------------
insert into public.body_measurements (user_id, tanggal, perut, catatan)
select e.user_id, e.tanggal, e.lingkar_perut, e.catatan
from public.entries e
where e.lingkar_perut is not null
  and not exists (
    select 1 from public.body_measurements m
    where m.user_id = e.user_id and m.tanggal = e.tanggal
  );

-- ------------------------------------------------------------
-- 3. activity_logs <- entries.sesi (workout)
-- ------------------------------------------------------------
insert into public.activity_logs (user_id, tanggal, tipe, meta)
select e.user_id, e.tanggal, 'workout', jsonb_build_object('kode', e.sesi, 'sumber', 'entries')
from public.entries e
where e.sesi is not null and e.sesi <> 'Rest'
  and not exists (
    select 1 from public.activity_logs a
    where a.user_id = e.user_id and a.tanggal = e.tanggal
      and a.tipe = 'workout' and (a.meta->>'sumber') = 'entries'
  );

-- ------------------------------------------------------------
-- 4. activity_logs <- todos selesai
-- ------------------------------------------------------------
insert into public.activity_logs (user_id, tanggal, tipe, meta)
select t.user_id, t.tanggal, 'todo', jsonb_build_object('judul', t.judul, 'jenis', t.jenis)
from public.todos t
where t.selesai = true
  and not exists (
    select 1 from public.activity_logs a
    where a.user_id = t.user_id and a.tanggal = t.tanggal
      and a.tipe = 'todo' and (a.meta->>'judul') = t.judul
  );

-- ------------------------------------------------------------
-- 5. seed exercises + templates A/B/C/D untuk tiap user
-- ------------------------------------------------------------
do $$
declare
  u record;
  tmpl_id uuid;
  ex_id uuid;
  rec record;
  sesi record;
  templates jsonb := '[
    {"kode":"A","nama":"Sesi A - Push","urutan":1},
    {"kode":"B","nama":"Sesi B - Legs","urutan":2},
    {"kode":"C","nama":"Sesi C - Pull + Core","urutan":3},
    {"kode":"D","nama":"Sesi D - Kardio + Circuit","urutan":4}
  ]'::jsonb;
  data jsonb := '{
    "A":[["Push-up biasa",3,8,15],["Pike push-up",3,6,12],["Dips kursi",3,8,12],["Push-up lebar",2,10,15],["Plank",3,30,60]],
    "B":[["Squat bodyweight",3,15,20],["Split squat",3,10,12],["Glute bridge",3,15,20],["Wall sit",3,30,60],["Calf raise",3,20,20]],
    "C":[["Pull-up",3,5,12],["Superman",3,12,15],["Dead bug",3,10,10],["Hollow hold",3,20,40]],
    "D":[["Circuit kardio",3,1,1],["Jalan cepat",1,30,45]]
  }'::jsonb;
begin
  for u in select id from auth.users loop
    -- templates
    for sesi in select * from jsonb_to_recordset(templates) as x(kode text, nama text, urutan int) loop
      insert into public.workout_templates (user_id, nama, kode, urutan)
      values (u.id, sesi.nama, sesi.kode, sesi.urutan)
      on conflict (user_id, kode) do nothing;

      select id into tmpl_id from public.workout_templates where user_id = u.id and kode = sesi.kode;

      -- exercises for this template
      for rec in
        select value->>0 as nama,
               (value->>1)::int as sets,
               (value->>2)::int as rmin,
               (value->>3)::int as rmax,
               ordinality::int as ord
        from jsonb_array_elements(data->sesi.kode) with ordinality
      loop
        insert into public.exercises (user_id, nama, kategori, satuan)
        values (u.id, rec.nama, sesi.kode, case when rec.nama = 'Plank' or rec.nama = 'Wall sit' or rec.nama = 'Hollow hold' then 'secs' else 'reps' end)
        on conflict (user_id, nama) do nothing;

        select id into ex_id from public.exercises where user_id = u.id and nama = rec.nama;

        if not exists (
          select 1 from public.template_exercises te
          where te.user_id = u.id and te.template_id = tmpl_id and te.exercise_id = ex_id
        ) then
          insert into public.template_exercises
            (user_id, template_id, exercise_id, urutan, target_sets, target_reps_min, target_reps_max)
          values (u.id, tmpl_id, ex_id, rec.ord, rec.sets, rec.rmin, rec.rmax);
        end if;
      end loop;
    end loop;

    -- profile default
    insert into public.profiles (id) values (u.id) on conflict (id) do nothing;
  end loop;
end $$;
