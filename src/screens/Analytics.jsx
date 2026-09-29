import { useState, useMemo } from "preact/hooks";
import { Card, Button, Empty, Stat, Delta } from "../components/ui.jsx";
import { Heatmap } from "../components/charts/Heatmap.jsx";
import { IconSpark, IconClock, IconWeight, IconDumbbell, IconTrophy, IconCamera } from "../components/icons.jsx";
import { weights, measurements, sessions, logs, nutrition, activities, prs, photos, goals, profile } from "../lib/store.js";
import { analyticsRange, smartInsights, buildTimeline, weeklyReport, consistencyVsProgress } from "../lib/calc.js";
import { fmtNumber, fmtDate, todayStr, addDays } from "../lib/format.js";

const RANGES = [["7", "7 Hari"], ["30", "30 Hari"], ["90", "90 Hari"]];

export function Analytics() {
  const [range, setRange] = useState("30");
  const [hm, setHm] = useState(91);

  const state = {
    weights: weights.value, measurements: measurements.value, sessions: sessions.value,
    logs: logs.value, nutrition: nutrition.value, activities: activities.value,
    prs: prs.value, photos: photos.value, goals: goals.value, profile: profile.value,
  };

  const agg = useMemo(() => analyticsRange(logs.value, sessions.value, weights.value, measurements.value, Number(range)), [range, weights.value, measurements.value, sessions.value, logs.value]);
  const insights = useMemo(() => smartInsights(state), [weights.value, sessions.value, logs.value, nutrition.value, profile.value]);
  const timeline = useMemo(() => buildTimeline(state).slice(0, 30), [weights.value, measurements.value, sessions.value, prs.value, photos.value]);
  const report = useMemo(() => weeklyReport(state), [weights.value, measurements.value, sessions.value, prs.value, nutrition.value]);
  const corr = useMemo(() => consistencyVsProgress(sessions.value, weights.value), [sessions.value, weights.value]);

  return (
    <div class="screen">
      <h1>Analytics</h1>

      <div class="seg mb">
        {RANGES.map(([id, label]) => <button key={id} class={`seg-btn ${range === id ? "active" : ""}`} onClick={() => setRange(id)}>{label}</button>)}
      </div>

      <div class="grid-2 mb">
        <Card tight>
          <div class="card-title">Berat Badan</div>
          {agg.weight ? (
            <>
              <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{fmtNumber(agg.weight.from, 1)} → {fmtNumber(agg.weight.to, 1)} kg</div>
              <Delta value={agg.weight.delta} unit=" kg" />
            </>
          ) : <span class="small muted">Belum cukup data</span>}
        </Card>
        <Card tight>
          <div class="card-title">Lingkar Perut</div>
          {agg.waist && agg.waist.from != null ? (
            <>
              <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{fmtNumber(agg.waist.from, 1)} → {fmtNumber(agg.waist.to, 1)} cm</div>
              <Delta value={agg.waist.delta} unit=" cm" />
            </>
          ) : <span class="small muted">Belum cukup data</span>}
        </Card>
        <Card tight>
          <div class="card-title">Workout</div>
          <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{agg.workouts.done} / {agg.workouts.total}</div>
          <span class="small muted">{agg.workouts.total ? Math.round((agg.workouts.done / agg.workouts.total) * 100) : 0}% selesai</span>
        </Card>
        <Card tight>
          <div class="card-title">PR Terbaru</div>
          {prs.value.length ? (
            <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>{prs.value.sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0].exercise_nama}</div>
          ) : <span class="small muted">-</span>}
        </Card>
      </div>

      <Card title="Weekly Report">
        <div class="small muted mb">{fmtDate(report.from)} – {fmtDate(report.to)}</div>
        <div class="list-row"><span class="small muted" style={{ width: "9rem" }}>Workout</span><b>{report.workouts.done} / {report.workouts.total} selesai</b></div>
        {report.weight && <div class="list-row"><span class="small muted" style={{ width: "9rem" }}>Berat</span><b>{fmtNumber(report.weight.from, 1)} → {fmtNumber(report.weight.to, 1)} kg</b></div>}
        {report.waist && report.waist.from != null && <div class="list-row"><span class="small muted" style={{ width: "9rem" }}>Perut</span><b>{fmtNumber(report.waist.from, 1)} → {fmtNumber(report.waist.to, 1)} cm</b></div>}
        {report.newPrs.length > 0 && <div class="list-row"><span class="small muted" style={{ width: "9rem" }}>New PR</span><b>{report.newPrs.map((p) => `${p.exercise_nama} ${p.nilai}`).join(", ")}</b></div>}
        {report.avgProtein > 0 && <div class="list-row"><span class="small muted" style={{ width: "9rem" }}>Avg Protein</span><b>{fmtNumber(report.avgProtein, 0)} g/hari</b></div>}
      </Card>

      <Card title="Smart Insight">
        {insights.length === 0 ? (
          <Empty title="Belum ada insight" sub="Terus catat data untuk melihat analisis." />
        ) : (
          insights.map((txt, i) => (
            <div key={i} class="list-row"><IconSpark style={{ width: 18, height: 18, color: "var(--accent)", flexShrink: 0 }} /><span class="small">{txt}</span></div>
          ))
        )}
      </Card>

      {corr && (
        <Card title="Korelasi (deskriptif)">
          <p class="small muted">Pada data yang tercatat, minggu dengan ≥3 sesi punya rata-rata berat {fmtNumber(corr.avgHi, 1)} kg, minggu dengan &lt;3 sesi {fmtNumber(corr.avgLo, 1)} kg. Ini korelasi, bukan sebab-akibat.</p>
        </Card>
      )}

      <Card title="Consistency Heatmap">
        <div class="seg mb">
          {[[91, "3 Bln"], [182, "6 Bln"], [365, "1 Thn"]].map(([d, l]) => (
            <button key={d} class={`seg-btn ${hm === d ? "active" : ""}`} onClick={() => setHm(d)}>{l}</button>
          ))}
        </div>
        <Heatmap activities={activities.value} sessions={sessions.value} days={hm} />
      </Card>

      <Card title="My Journey">
        {timeline.length === 0 ? (
          <Empty title="Journey masih kosong" sub="Data akan otomatis membentuk timeline." />
        ) : (
          timeline.map((e, i) => (
            <div key={i} class="list-row">
              <TimelineIcon icon={e.icon} />
              <div class="list-main"><div class="small">{e.text}</div><div class="small muted">{fmtDate(e.t, { long: true })}</div></div>
            </div>
          ))
        )}
      </Card>

      <HistorySection />
    </div>
  );
}

function TimelineIcon({ icon }) {
  const map = { weight: IconWeight, workout: IconDumbbell, pr: IconTrophy, photo: IconCamera, measure: IconClock };
  const I = map[icon] || IconClock;
  return <I style={{ width: 18, height: 18, color: "var(--accent)", flexShrink: 0 }} />;
}

function HistorySection() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const rows = useMemo(() => {
    const out = [];
    weights.value.forEach((w) => out.push({ t: w.tanggal, cat: "weight", text: `Berat ${w.berat} kg` }));
    measurements.value.forEach((m) => out.push({ t: m.tanggal, cat: "measure", text: `Perut ${m.perut ?? "-"} cm` }));
    sessions.value.forEach((s) => out.push({ t: s.tanggal, cat: "workout", text: `Latihan ${s.kode} ${s.status}` }));
    prs.value.forEach((p) => out.push({ t: p.tanggal, cat: "pr", text: `PR ${p.exercise_nama} ${p.nilai}` }));
    return out.sort((a, b) => b.t.localeCompare(a.t))
      .filter((r) => cat === "all" || r.cat === cat)
      .filter((r) => !q || r.text.toLowerCase().includes(q.toLowerCase()));
  }, [q, cat, weights.value, measurements.value, sessions.value, prs.value]);

  return (
    <Card title="Search & History">
      <input class="input mb" placeholder="Cari catatan..." value={q} onInput={(e) => setQ(e.target.value)} />
      <div class="seg mb">
        {[["all", "Semua"], ["weight", "Berat"], ["measure", "Ukuran"], ["workout", "Latihan"], ["pr", "PR"]].map(([id, l]) => (
          <button key={id} class={`seg-btn ${cat === id ? "active" : ""}`} onClick={() => setCat(id)}>{l}</button>
        ))}
      </div>
      {rows.length === 0 ? <Empty title="Tidak ada hasil" /> : rows.slice(0, 40).map((r, i) => (
        <div key={i} class="list-row">
          <span class="small muted" style={{ width: "5.5rem" }}>{fmtDate(r.t)}</span>
          <div class="list-main small">{r.text}</div>
          <span class="badge badge-muted">{r.cat}</span>
        </div>
      ))}
    </Card>
  );
}
