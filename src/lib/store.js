import { signal, computed } from "@preact/signals";
import { list, currentUserId, supabase } from "./supabase.js";

export const user = signal(null);
export const ready = signal(false);
export const loading = signal(false);

export const profile = signal(null);
export const weights = signal([]);        // weight_logs
export const measurements = signal([]);   // body_measurements
export const templates = signal([]);      // workout_templates (with exercises)
export const sessions = signal([]);       // workout_sessions
export const logs = signal([]);           // exercise_logs
export const foods = signal([]);
export const nutrition = signal([]);
export const goals = signal([]);
export const prs = signal([]);
export const photos = signal([]);
export const activities = signal([]);     // activity_logs
export const exercises = signal([]);      // master
export const templateExercises = signal([]); // template_exercises rows

export const theme = signal(localStorage.getItem("ft-theme") || "system");

export function applyTheme() {
  const t = theme.value;
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  localStorage.setItem("ft-theme", t);
}

export function setTheme(t) {
  theme.value = t;
  applyTheme();
}

export function clearData() {
  profile.value = null;
  weights.value = [];
  measurements.value = [];
  templates.value = [];
  sessions.value = [];
  logs.value = [];
  foods.value = [];
  nutrition.value = [];
  goals.value = [];
  prs.value = [];
  photos.value = [];
  activities.value = [];
  exercises.value = [];
  templateExercises.value = [];
}

/* ---------- computed ---------- */
export const latestWeight = computed(() => {
  const w = [...weights.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return w.length ? w[w.length - 1] : null;
});
export const firstWeight = computed(() => {
  const w = [...weights.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return w.length ? w[0] : null;
});
export const latestMeasurement = computed(() => {
  const m = [...measurements.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return m.length ? m[m.length - 1] : null;
});

export const templatesWithItems = computed(() => {
  const exById = Object.fromEntries(exercises.value.map((e) => [e.id, e]));
  return templates.value.map((t) => ({
    ...t,
    items: templateExercises.value
      .filter((te) => te.template_id === t.id)
      .map((te) => ({ ...te, nama: exById[te.exercise_id]?.nama || "Exercise", kategori: exById[te.exercise_id]?.kategori }))
      .sort((a, b) => (a.urutan || 0) - (b.urutan || 0)),
  }));
});

/* ---------- loaders ---------- */
async function safe(fn, fallback) {
  try { return await fn(); } catch (e) { console.error(e); return fallback; }
}

export async function loadProfile() {
  const uid = await currentUserId();
  if (!uid) return;
  const rows = await safe(() => list("profiles"), []);
  let p = rows.find((r) => r.id === uid);
  if (!p) {
    p = await safe(async () => {
      const { data, error } = await supabase.from("profiles").insert({ id: uid }).select().single();
      if (error) throw error;
      return data;
    }, null);
  }
  profile.value = p;
}

export async function loadAll() {
  loading.value = true;
  try {
    await loadProfile();
    const [w, m, ses, lg, ex, tp, tx, f, nl, g, pr, ph, act] = await Promise.all([
      safe(() => list("weight_logs", { by: "tanggal" }), []),
      safe(() => list("body_measurements", { by: "tanggal" }), []),
      safe(() => list("workout_sessions", { by: "created_at" }), []),
      safe(() => list("exercise_logs", { by: "tanggal" }), []),
      safe(() => list("exercises"), []),
      safe(() => list("workout_templates", { by: "urutan", asc: true }), []),
      safe(() => list("template_exercises", { by: "urutan", asc: true }), []),
      safe(() => list("foods"), []),
      safe(() => list("nutrition_logs", { by: "tanggal" }), []),
      safe(() => list("goals"), []),
      safe(() => list("personal_records", { by: "tanggal" }), []),
      safe(() => list("progress_photos", { by: "tanggal" }), []),
      safe(() => list("activity_logs", { by: "tanggal" }), []),
    ]);
    weights.value = w;
    measurements.value = m;
    sessions.value = ses;
    logs.value = lg;
    exercises.value = ex;
    templates.value = tp;
    templateExercises.value = tx;
    foods.value = f;
    nutrition.value = nl;
    goals.value = g;
    prs.value = pr;
    photos.value = ph;
    activities.value = act;
  } finally {
    loading.value = false;
  }
}
