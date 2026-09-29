# Fitness Tracker V2 — Personal Fitness Command Center

Aplikasi fitness pribadi: workout, progress tubuh, berat, lingkar, PR, target, nutrisi, progress photo, analytics. Mobile-first, PWA. Data privat per user (Supabase RLS).

## Stack
- **Vite + Preact** (ringan, ~88KB gzip total)
- **Supabase**: Postgres + Auth (email) + Storage (progress photos) + RLS
- **Vercel** static hosting
- Grafik SVG manual (tanpa library chart)

## Fitur
- **Home** — latihan hari ini, ringkasan tubuh + progress target, ukuran, aktivitas mingguan, streak, PR
- **Workout** — sesi A/B/C/D, Workout Mode (set per exercise, rest timer), riwayat exercise, PR, progressive overload
- **Progress** — berat, ukuran tubuh, grafik tren (7D/30D/3M/6M/1Y/ALL), target, PR, progress photo + before/after
- **Nutrisi** — log makanan, makanan favorit, ringkasan kalori/protein/karbo/lemak harian
- **Analytics** — analisis 7/30/90 hari, weekly report, smart insight, korelasi, heatmap, timeline, search history
- **Profil** — tema (system/light/dark), target nutrisi, reminder, export/import JSON + CSV

## Setup
1. `npm install`
2. Isi `src/config.js` (Supabase URL + publishable key)
3. Jalankan migration: `migrations/002_v2_schema.sql` lalu `003_backfill.sql` di Supabase SQL Editor
4. Buat bucket Storage `progress-photos` (private) + policy (lihat `migrations/storage_policy.sql`)
5. `npm run dev`

## Migration
- `002_v2_schema.sql` — 14 tabel baru + RLS (additif, tak menghapus tabel lama)
- `003_backfill.sql` — pindah data `entries`/`todos` ke tabel baru + seed sesi A/B/C/D

## Deploy
```sh
npm run build
vercel --prod
```

## Database
profiles, exercises, workout_templates, template_exercises, workout_sessions, exercise_logs, weight_logs, body_measurements, foods, nutrition_logs, goals, personal_records, progress_photos, activity_logs.

RLS aktif: tiap user hanya akses datanya sendiri. Tabel lama `entries` & `todos` dipertahankan (data lama aman).
