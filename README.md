# Fitness Tracker

Tracker olahraga + progress pribadi. Data disimpan di Supabase (Postgres), sinkron otomatis di HP & laptop.

## Fitur
- **Plan** — jadwal Sesi A/B/C/D, rotasi mingguan, bonus gym, nutrition
- **Log** — catat berat, lingkar perut, sesi, mood, catatan per hari
- **Todo Harian** — checklist otomatis dari jadwal + habit, streak
- **Progress** — kartu delta, sparkline, grafik tren SVG, bar konsistensi, riwayat (edit/hapus)

## Stack
- Vanilla HTML/CSS/JS, tanpa build step
- Grafik SVG manual (nol library chart)
- Supabase: Auth (email) + Postgres + Row Level Security
- Vercel (static hosting)

## Setup
1. Clone repo
2. Isi `config.js`:
   ```js
   export const SUPABASE_URL = "https://xxxx.supabase.co";
   export const SUPABASE_KEY = "sb_publishable_...";
   ```
3. Jalankan tabel Supabase (lihat `supabase-schema.sql`)
4. Jalankan lokal: `npx serve` → buka `http://localhost:3000`

## Deploy
```sh
vercel --prod
```

## Struktur DB
- `entries` — id, user_id, tanggal, berat, lingkar_perut, sesi, catatan, mood, created_at
- `todos` — id, user_id, tanggal, judul, jenis, selesai, created_at

RLS aktif: tiap user hanya bisa akses datanya sendiri.
