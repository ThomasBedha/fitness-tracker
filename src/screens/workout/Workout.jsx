import { useMemo, useState } from "preact/hooks";
import { Card, Button, Empty } from "../../components/ui.jsx";
import { IconDumbbell, IconTrophy, IconClock } from "../../components/icons.jsx";
import { templatesWithItems, sessions, logs, prs } from "../../lib/store.js";
import { exerciseHistory, bestRepsByExercise, overloadSuggestion } from "../../lib/calc.js";
import { fmtDate, todayStr, dayIndex } from "../../lib/format.js";

const ROTATION = { 0: "Rest", 1: "A", 2: "D", 3: "C", 4: "Rest", 5: "B", 6: "D" };

export function Workout({ onStartWorkout, onOpenExercise }) {
  const todayKode = ROTATION[dayIndex(todayStr())];
  const templates = templatesWithItems.value;

  const recent = useMemo(() =>
    [...sessions.value].filter((s) => s.status === "completed")
      .sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 5),
    [sessions.value]);

  const exerciseNames = useMemo(() => {
    const set = new Set();
    logs.value.forEach((l) => l.exercise_nama && set.add(l.exercise_nama));
    templates.forEach((t) => t.items.forEach((i) => set.add(i.nama)));
    return [...set];
  }, [logs.value, templates]);

  return (
    <div class="screen">
      <h1>Workout</h1>
      <p class="muted small mb">Pilih sesi untuk mulai, atau lihat riwayat latihanmu.</p>

      {templates.length === 0 ? (
        <Card><Empty title="Belum ada sesi latihan" sub="Jalankan migration 003 di Supabase untuk seed sesi A/B/C/D." /></Card>
      ) : (
        templates.map((t) => (
          <Card key={t.id}>
            <div class="row between">
              <div class="row" style={{ gap: ".6rem" }}>
                <span class={`badge badge-${(t.kode || "").toLowerCase()}`}>Sesi {t.kode}</span>
                <strong>{t.nama}</strong>
              </div>
              {t.kode === todayKode && <span class="badge badge-muted">Hari ini</span>}
            </div>
            <ul class="small muted" style={{ margin: ".6rem 0 .8rem", paddingLeft: "1.1rem" }}>
              {t.items.map((e) => <li key={e.id}>{e.nama} — {e.target_sets}×{e.target_reps_min}-{e.target_reps_max}</li>)}
            </ul>
            <Button block icon={<IconDumbbell style={{ width: 18, height: 18 }} />} onClick={() => onStartWorkout?.(t.kode)}>Mulai</Button>
          </Card>
        ))
      )}

      {recent.length > 0 && (
        <Card title="Riwayat Terakhir">
          {recent.map((s) => (
            <div key={s.id} class="list-row">
              <IconClock style={{ width: 18, height: 18, color: "var(--muted)" }} />
              <div class="list-main">
                <div>Latihan {s.kode} selesai</div>
                <div class="small muted">{fmtDate(s.tanggal)}{s.durasi_detik ? ` • ${Math.round(s.durasi_detik / 60)} mnt` : ""}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card title="Exercise & Performa">
        {exerciseNames.length === 0 ? (
          <Empty title="Belum ada catatan exercise" sub="Selesaikan latihan untuk melihat perkembangan." />
        ) : (
          exerciseNames.map((nama) => {
            const hist = exerciseHistory(logs.value, nama, 6);
            const best = bestRepsByExercise(logs.value, nama);
            return (
              <button key={nama} class="list-row" style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--border)" }}
                onClick={() => onOpenExercise?.(nama)}>
                <div class="list-main">
                  <div>{nama}</div>
                  <div class="small muted">
                    {hist.length ? `Last: ${hist[hist.length - 1].reps.join(" / ")}` : "Belum ada set"}
                  </div>
                </div>
                {best.best > 0 && <span class="badge badge-a">PR {best.best}</span>}
              </button>
            );
          })
        )}
      </Card>
    </div>
  );
}
