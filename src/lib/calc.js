import { parseDate, addDays, todayStr, weekMonday, daysBetween } from "./format.js";

/* ---------- trend (moving average) ---------- */
export function trendSeries(series, window = 7) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const lo = Math.max(0, i - window + 1);
    const slice = series.slice(lo, i + 1);
    const avg = slice.reduce((s, p) => s + p.v, 0) / slice.length;
    out.push({ t: series[i].t, v: Math.round(avg * 100) / 100 });
  }
  return out;
}

/* ---------- filter range ---------- */
export function filterRange(series, range) {
  if (range === "all") return series;
  const days = { "7d": 7, "30d": 30, "3m": 90, "6m": 182, "1y": 365 }[range] ?? 30;
  const cutoff = addDays(todayStr(), -days);
  return series.filter((d) => d.t >= cutoff);
}

/* ---------- weekly activity ---------- */
export function weekActivity(activities, sessions, refDate = todayStr()) {
  const monday = weekMonday(refDate);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i);
    const hasWorkout = sessions.some((s) => s.tanggal === d && s.status === "completed")
      || activities.some((a) => a.tanggal === d && a.tipe === "workout");
    const hasAny = activities.some((a) => a.tanggal === d) || hasWorkout;
    days.push({ date: d, workout: hasWorkout, any: hasAny, isFuture: d > refDate });
  }
  return days;
}

/* ---------- streak ---------- */
export function workoutStreak(sessions, activities, refDate = todayStr()) {
  const done = new Set();
  sessions.forEach((s) => { if (s.status === "completed") done.add(s.tanggal); });
  activities.forEach((a) => { if (a.tipe === "workout") done.add(a.tanggal); });
  let streak = 0;
  let d = refDate;
  const set = new Set(done);
  // kalau hari ini belum workout, mulai dari kemarin
  if (!set.has(d)) d = addDays(d, -1);
  while (set.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

/* ---------- personal record dari logs ---------- */
export function bestRepsByExercise(logs, exerciseNama) {
  const rows = logs.filter((l) => l.exercise_nama === exerciseNama && l.reps != null);
  let best = 0, tanggal = null;
  rows.forEach((r) => {
    if (r.reps > best) { best = r.reps; tanggal = r.tanggal; }
  });
  return { best, tanggal };
}

export function exerciseHistory(logs, exerciseNama, limit = 8) {
  const bySession = {};
  logs.filter((l) => l.exercise_nama === exerciseNama).forEach((l) => {
    const key = l.session_id || l.tanggal;
    bySession[key] = bySession[key] || { tanggal: l.tanggal, sets: [] };
    bySession[key].sets.push(l);
  });
  const list = Object.values(bySession)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .slice(-limit);
  return list.map((s) => ({
    tanggal: s.tanggal,
    reps: s.sets.sort((a, b) => (a.set_no || 0) - (b.set_no || 0)).map((x) => x.reps),
    beban: s.sets[0]?.beban ?? null,
  }));
}

/* ---------- progressive overload recommendation ---------- */
export function overloadSuggestion(logs, exerciseNama, targetSets = 3, rmax = 15) {
  const hist = exerciseHistory(logs, exerciseNama, 10);
  if (!hist.length) return null;
  const last = hist[hist.length - 1];
  const bestAll = hist.reduce((best, h) => {
    const arr = h.reps || [];
    if (arr.reduce((a, b) => a + b, 0) > best.reduce((a, b) => a + b, 0)) return arr;
    return best;
  }, last.reps);
  // target: tiap set naik 1 rep, cap di rmax; kalau sudah cap semua -> naik beban
  const target = Array.from({ length: targetSets }, (_, i) => {
    const base = last.reps[i] ?? Math.min(...(last.reps.length ? last.reps : [rmax]));
    return Math.min(rmax, base + 1);
  });
  const allAtMax = last.reps.length >= targetSets && last.reps.slice(0, targetSets).every((r) => r >= rmax);
  return { last: last.reps, best: bestAll, target, bumpWeight: allAtMax };
}

/* ---------- analytics aggregate ---------- */
export function analyticsRange(logs, sessions, weights, measurements, days) {
  const cutoff = addDays(todayStr(), -days);
  const w = weights.filter((x) => x.tanggal >= cutoff).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const m = measurements.filter((x) => x.tanggal >= cutoff).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const s = sessions.filter((x) => x.tanggal >= cutoff);
  const done = s.filter((x) => x.status === "completed").length;
  return {
    weight: w.length ? { from: w[0].berat, to: w[w.length - 1].berat, delta: w[w.length - 1].berat - w[0].berat } : null,
    waist: m.length ? { from: m[0].perut, to: m[m.length - 1].perut, delta: (m[m.length - 1].perut ?? 0) - (m[0].perut ?? 0) } : null,
    workouts: { done, total: s.length },
  };
}

/* ---------- smart insight (rule-based) ---------- */
export function smartInsights(state) {
  const out = [];
  const { weights, sessions, logs, nutrition } = state;
  const w = [...weights].sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  // berat stabil / turun / naik
  if (w.length >= 4) {
    const recent = w.slice(-5);
    const delta = recent[recent.length - 1].berat - recent[0].berat;
    if (Math.abs(delta) < 0.4) out.push("Pada data yang tercatat, berat relatif stabil beberapa waktu terakhir.");
    else if (delta < 0) out.push(`Berat turun ${Math.abs(delta).toFixed(1)} kg dibanding beberapa catatan sebelumnya.`);
    else out.push(`Berat naik ${delta.toFixed(1)} kg dibanding beberapa catatan sebelumnya.`);
  }

  // konsistensi workout
  const now = todayStr();
  const last30 = sessions.filter((s) => s.tanggal >= addDays(now, -30) && s.status === "completed").length;
  const prev30 = sessions.filter((s) => s.tanggal >= addDays(now, -60) && s.tanggal < addDays(now, -30) && s.status === "completed").length;
  if (last30 > prev30 && last30 > 0) out.push("Konsistensi latihan meningkat dibanding periode sebelumnya.");
  else if (last30 < prev30 && prev30 > 0) out.push("Konsistensi latihan menurun dibanding periode sebelumnya.");

  // performa exercise
  const byEx = {};
  logs.forEach((l) => {
    if (l.reps == null || !l.exercise_nama) return;
    byEx[l.exercise_nama] = byEx[l.exercise_nama] || [];
    byEx[l.exercise_nama].push(l);
  });
  for (const [nama, rows] of Object.entries(byEx)) {
    rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const first = rows[0].reps, last = rows[rows.length - 1].reps;
    if (last > first) { out.push(`Performa ${nama} meningkat dibanding catatan awal.`); break; }
  }

  // nutrisi protein
  const prot30 = nutrition.filter((n) => n.tanggal >= addDays(now, -30)).reduce((s, n) => s + (n.protein || 0), 0);
  const target = state.profile?.target_protein || 120;
  if (nutrition.length >= 5) {
    const avg = prot30 / Math.max(1, new Set(nutrition.filter((n) => n.tanggal >= addDays(now, -30)).map((n) => n.tanggal)).size);
    if (avg < target * 0.8) out.push(`Asupan protein rata-rata ${avg.toFixed(0)} g/hari, di bawah target ${target} g.`);
  }

  return out.slice(0, 6);
}

/* ---------- correlation (descriptive, non-causal) ---------- */
export function consistencyVsProgress(sessions, weights) {
  const w = [...weights].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  if (w.length < 4 || sessions.length < 4) return null;
  const completedWeeks = {};
  sessions.filter((s) => s.status === "completed").forEach((s) => {
    const wk = weekMonday(s.tanggal);
    completedWeeks[wk] = (completedWeeks[wk] || 0) + 1;
  });
  const wkKeys = Object.keys(completedWeeks).sort();
  const corr = [];
  wkKeys.forEach((wk) => {
    const after = w.find((x) => x.tanggal >= wk);
    if (after) corr.push({ wk, sesi: completedWeeks[wk], berat: after.berat });
  });
  if (corr.length < 3) return null;
  const hi = corr.filter((c) => c.sesi >= 3);
  const lo = corr.filter((c) => c.sesi < 3);
  const avg = (arr) => arr.length ? arr.reduce((s, c) => s + c.berat, 0) / arr.length : null;
  const aHi = avg(hi), aLo = avg(lo);
  if (aHi == null || aLo == null) return null;
  return { weeks: corr.length, avgHi: aHi, avgLo: aLo, diff: aLo - aHi };
}

/* ---------- timeline ---------- */
export function buildTimeline(state) {
  const ev = [];
  state.weights.forEach((w) => ev.push({ t: w.tanggal, icon: "weight", text: `${w.berat} kg`, type: "Berat" }));
  state.measurements.forEach((m) => {
    if (m.perut != null) ev.push({ t: m.tanggal, icon: "measure", text: `Lingkar perut ${m.perut} cm`, type: "Ukuran" });
  });
  state.sessions.filter((s) => s.status === "completed").forEach((s) =>
    ev.push({ t: s.tanggal, icon: "workout", text: `Latihan ${s.kode || ""} selesai`, type: "Latihan" }));
  state.prs.forEach((p) => ev.push({ t: p.tanggal, icon: "pr", text: `PR ${p.exercise_nama} — ${p.nilai} ${p.satuan || "reps"}`, type: "PR" }));
  state.photos.forEach((p) => ev.push({ t: p.tanggal, icon: "photo", text: `Progress photo (${p.angle})`, type: "Foto" }));
  return ev.sort((a, b) => b.t.localeCompare(a.t));
}

/* ---------- weekly report ---------- */
export function weeklyReport(state, refDate = todayStr()) {
  const monday = weekMonday(refDate);
  const sunday = addDays(monday, 6);
  const inWeek = (d) => d >= monday && d <= sunday;
  const wSessions = state.sessions.filter((s) => inWeek(s.tanggal));
  const completed = wSessions.filter((s) => s.status === "completed").length;
  const wWeights = state.weights.filter((w) => inWeek(w.tanggal)).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const wMeas = state.measurements.filter((m) => inWeek(m.tanggal)).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const wPrs = state.prs.filter((p) => inWeek(p.tanggal));
  const wNut = state.nutrition.filter((n) => inWeek(n.tanggal));
  const avgProt = wNut.length ? wNut.reduce((s, n) => s + (n.protein || 0), 0) / new Set(wNut.map((n) => n.tanggal)).size : 0;
  return {
    from: monday, to: sunday,
    workouts: { done: completed, total: wSessions.length },
    weight: wWeights.length >= 2 ? { from: wWeights[0].berat, to: wWeights[wWeights.length - 1].berat } : null,
    waist: wMeas.length >= 2 ? { from: wMeas[0].perut, to: wMeas[wMeas.length - 1].perut } : null,
    newPrs: wPrs,
    avgProtein: avgProt,
  };
}
