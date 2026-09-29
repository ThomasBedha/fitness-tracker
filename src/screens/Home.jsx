import { useMemo } from "preact/hooks";
import { Card, Button, Stat, Delta, Empty, ProgressBar } from "../components/ui.jsx";
import { Sparkline } from "../components/charts/Sparkline.jsx";
import { IconFlame, IconDumbbell } from "../components/icons.jsx";
import {
  weights, measurements, sessions, activities, templatesWithItems, goals, profile, logs,
  latestWeight, firstWeight, latestMeasurement,
} from "../lib/store.js";
import {
  workoutStreak, weekActivity, bestRepsByExercise,
} from "../lib/calc.js";
import { todayStr, fmtGreeting, fmtTanggalPanjang, fmtNumber, dayIndex, weekMonday, addDays, fmtDate } from "../lib/format.js";

const ROTATION = { 0: "Rest", 1: "A", 2: "D", 3: "C", 4: "Rest", 5: "B", 6: "D" };

export function Home({ onStartWorkout, onNav }) {
  const today = todayStr();
  const dow = dayIndex(today);
  const kode = ROTATION[dow];
  const template = templatesWithItems.value.find((t) => t.kode === kode);

  const streak = useMemo(() => workoutStreak(sessions.value, activities.value), [sessions.value, activities.value]);
  const week = useMemo(() => weekActivity(activities.value, sessions.value), [activities.value, sessions.value]);
  const weekSessions = useMemo(() => {
    const mon = weekMonday(today);
    return sessions.value.filter((s) => s.tanggal >= mon && s.tanggal <= today && s.status === "completed");
  }, [sessions.value]);

  const lw = latestWeight.value;
  const fw = firstWeight.value;
  const lm = latestMeasurement.value;
  const prevM = useMemo(() => {
    const m = [...measurements.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    return m.length >= 2 ? m[m.length - 2] : null;
  }, [measurements.value]);

  const weightGoal = goals.value.find((g) => g.tipe === "berat" && g.status === "active");
  const target = weightGoal?.target ?? 68;
  const start = weightGoal?.start ?? fw?.berat;
  const current = lw?.berat;
  const goalPct = (current != null && start != null && start !== target)
    ? Math.min(100, Math.max(0, ((start - current) / (start - target)) * 100)) : 0;

  const wSeries = useMemo(() => [...weights.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((w) => w.berat), [weights.value]);

  const measFields = [
    { key: "perut", label: "Perut" }, { key: "dada", label: "Dada" },
    { key: "lengan", label: "Lengan" }, { key: "paha", label: "Paha" },
  ];

  const prs = useMemo(() => {
    const names = [...new Set(logs.value.map((l) => l.exercise_nama).filter(Boolean))].slice(0, 4);
    return names.map((n) => ({ nama: n, ...bestRepsByExercise(logs.value, n) })).filter((p) => p.best > 0);
  }, [logs.value]);

  return (
    <div class="screen">
      <div class="mb">
        <div class="muted small">{fmtTanggalPanjang(today)}</div>
        <h1>{fmtGreeting()}</h1>
      </div>

      {/* Today's workout */}
      <Card>
        <div class="row between">
          <div class="card-title" style={{ margin: 0 }}>Latihan Hari Ini</div>
          {kode !== "Rest" && <span class={`badge badge-${kode.toLowerCase()}`}>Sesi {kode}</span>}
        </div>
        {kode === "Rest" ? (
          <div style={{ marginTop: ".5rem" }}>
            <h2>Rest Day</h2>
            <p class="muted small">Pemulihan. Fokus stretching ringan, hidrasi, dan tidur cukup.</p>
            <Button variant="ghost" block onClick={() => onNav("workout")}>Lihat Semua Sesi</Button>
          </div>
        ) : (
          <div style={{ marginTop: ".5rem" }}>
            <h2>{template?.nama || `Sesi ${kode}`}</h2>
            <ul class="small muted" style={{ margin: ".3rem 0 .8rem", paddingLeft: "1.1rem" }}>
              {(template?.items || []).slice(0, 5).map((e) => (
                <li key={e.id}>{e.nama} — {e.target_sets}×{e.target_reps_min}-{e.target_reps_max}</li>
              ))}
            </ul>
            <Button block icon={<IconDumbbell style={{ width: 18, height: 18 }} />} onClick={() => onStartWorkout?.(kode)}>
              Mulai Latihan
            </Button>
          </div>
        )}
      </Card>

      {/* Body overview */}
      <Card title="Ringkasan Tubuh">
        {lw ? (
          <>
            <div class="row" style={{ alignItems: "baseline", gap: ".5rem" }}>
              <span style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-.03em" }}>{fmtNumber(lw.berat, 1)}</span>
              <span class="muted">kg</span>
            </div>
            <div class="row wrap small muted" style={{ gap: ".9rem", marginTop: ".3rem" }}>
              {fw && <span>Awal: {fmtNumber(fw.berat, 1)} kg</span>}
              <span>Target: {target} kg</span>
              <Delta value={current - start} unit=" kg" />
            </div>
            {wSeries.length > 1 && <div style={{ marginTop: ".6rem" }}><Sparkline values={wSeries} /></div>}
            <div style={{ marginTop: ".8rem" }}>
              <ProgressBar value={goalPct} max={100} variant="green" label={<><span>Menuju target</span><span>{goalPct.toFixed(0)}%</span></>} />
            </div>
          </>
        ) : (
          <Empty title="Belum ada data berat" sub="Mulai catat untuk melihat progress." action={<Button sm onClick={() => onNav("progress")}>+ Catat Berat</Button>} />
        )}
      </Card>

      {/* Measurements quick */}
      <Card title="Ukuran Tubuh">
        {lm ? (
          <div class="grid-2">
            {measFields.map(({ key, label }) => {
              const now = lm[key];
              if (now == null) return null;
              const prev = prevM?.[key];
              const delta = prev != null ? now - prev : null;
              return (
                <div key={key} class="stat">
                  <span class="stat-label">{label}</span>
                  <span class="stat-num">{fmtNumber(now, 1)} <span class="small muted">cm</span></span>
                  {delta != null && <div class="small"><Delta value={delta} unit=" cm" /></div>}
                </div>
              );
            })}
          </div>
        ) : (
          <Empty title="Belum ada ukuran" action={<Button sm onClick={() => onNav("progress")}>+ Catat Ukuran</Button>} />
        )}
      </Card>

      {/* Weekly activity */}
      <Card title="Aktivitas Minggu Ini">
        <div class="row" style={{ justifyContent: "space-between", margin: ".4rem 0 .7rem" }}>
          {week.map((d) => (
            <div key={d.date} class="center" style={{ flex: 1 }}>
              <div class="small muted">{["S","S","R","K","J","S","M"][dayIndex(d.date)] || "?"}</div>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", margin: "4px auto 0",
                display: "grid", placeItems: "center", fontSize: ".75rem",
                background: d.isFuture ? "transparent" : d.workout ? "var(--accent)" : d.any ? "var(--accent-soft)" : "var(--surface-2)",
                color: d.workout ? "#fff" : "var(--muted)",
                border: d.isFuture ? "1px dashed var(--border)" : "none",
              }}>
                {d.workout ? "✓" : d.any ? "•" : ""}
              </div>
            </div>
          ))}
        </div>
        <div class="row between">
          <span class="small muted">Workout minggu ini</span>
          <span class="small"><b>{weekSessions.length}</b> / 5 selesai</span>
        </div>
      </Card>

      {/* Streak */}
      <Card>
        <div class="row" style={{ gap: ".8rem" }}>
          <IconFlame style={{ width: 32, height: 32, color: "var(--accent)" }} />
          <div>
            <div class="card-title" style={{ margin: 0 }}>Workout Streak</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{streak} hari aktif</div>
          </div>
        </div>
      </Card>

      {/* Personal records preview */}
      {prs.length > 0 && (
        <Card title="Personal Records">
          <div class="grid-2">
            {prs.map((p) => (
              <div key={p.nama} class="stat">
                <span class="stat-label">{p.nama}</span>
                <span class="stat-num">{p.best} <span class="small muted">reps</span></span>
                <span class="small muted">{fmtDate(p.tanggal)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
