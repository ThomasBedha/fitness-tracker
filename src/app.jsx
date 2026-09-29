import { useState, useEffect } from "preact/hooks";
import { Auth } from "./screens/Auth.jsx";
import { Home } from "./screens/Home.jsx";
import { Workout } from "./screens/workout/Workout.jsx";
import { WorkoutMode } from "./screens/workout/WorkoutMode.jsx";
import { ExerciseHistory } from "./screens/workout/ExerciseHistory.jsx";
import { Progress } from "./screens/Progress.jsx";
import { Nutrition } from "./screens/Nutrition.jsx";
import { Analytics } from "./screens/Analytics.jsx";
import { Profile } from "./screens/Profile.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { QuickAdd } from "./components/QuickAdd.jsx";
import { Toast, toast } from "./components/Toast.jsx";
import { WeightSheet, MeasurementSheet } from "./components/forms.jsx";
import { IconBack, IconSpark } from "./components/icons.jsx";
import { user, ready, loadAll, clearData, applyTheme } from "./lib/store.js";
import { getUser, onAuthChange, signOut } from "./lib/supabase.js";
import { todayStr, addDays } from "./lib/format.js";
import { profile, activities, sessions, weights } from "./lib/store.js";

const TITLES = { home: "", workout: "Workout", progress: "Progress", nutrition: "Nutrisi", profile: "Profil" };

export function App() {
  const [booting, setBooting] = useState(true);
  const [tab, setTab] = useState("home");
  const [analytics, setAnalytics] = useState(false);
  const [mode, setMode] = useState(null);            // workout mode kode
  const [exercise, setExercise] = useState(null);    // exercise history nama
  const [quick, setQuick] = useState(null);          // weight|measure|food|photo

  useEffect(() => {
    applyTheme();
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme();
    mq.addEventListener("change", handler);

    onAuthChange((u) => {
      if (u && !user.value) { user.value = u; loadAll(); }
      else if (!u && user.value) { user.value = null; clearData(); }
    });

    (async () => {
      try {
        const u = await getUser();
        if (u) { user.value = u; await loadAll(); }
      } catch (e) { console.error(e); }
      finally { ready.value = true; setBooting(false); }
    })();

    return () => mq.removeEventListener("change", handler);
  }, []);

  // reminder lokal saat app dibuka
  useEffect(() => {
    if (!user.value || !profile.value) return;
    const p = profile.value;
    if (!p.reminder_enabled) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const today = todayStr();
    const last = localStorage.getItem("ft-last-reminder");
    const hasWorkoutToday = sessions.value.some((s) => s.tanggal === today && s.status === "completed")
      || activities.value.some((a) => a.tanggal === today && a.tipe === "workout");
    const lastWeight = [...weights.value].sort((a, b) => b.tanggal.localeCompare(a.tanggal))[0];
    const staleWeight = !lastWeight || lastWeight.tanggal < addDays(today, -7);
    if (last === today) return;
    if (!hasWorkoutToday) { new Notification("Fitness Tracker", { body: "Hari ini waktunya workout. Semangat!" }); localStorage.setItem("ft-last-reminder", today); }
    else if (staleWeight) { new Notification("Fitness Tracker", { body: "Sudah 7 hari sejak pengukuran terakhir." }); localStorage.setItem("ft-last-reminder", today); }
  }, [user.value, profile.value]);

  async function logout() {
    await signOut();
    clearData();
    user.value = null;
    setTab("home");
  }

  if (booting) {
    return (
      <div class="auth-wrap">
        <div class="center">
          <div class="brand" style={{ justifyContent: "center", marginBottom: "1rem" }}>
            <svg viewBox="0 0 64 64"><path d="M14 40 L26 40 L30 22 L36 48 L41 32 L50 32" /></svg>
            <span>Fitness Tracker</span>
          </div>
          <p class="muted small">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user.value) return (<><Auth /><Toast /></>);

  const screen = analytics ? (
    <>
      <div class="topbar">
        <button class="btn btn-ghost btn-icon" onClick={() => setAnalytics(false)}><IconBack style={{ width: 18, height: 18 }} /></button>
        <h1>Analytics</h1>
      </div>
      <div class="content"><Analytics /></div>
    </>
  ) : (
    <>
      {tab !== "home" && (
        <div class="topbar">
          <h1>{TITLES[tab]}</h1>
          <div class="spacer" />
          {tab === "progress" && (
            <button class="btn btn-ghost btn-sm" onClick={() => setAnalytics(true)}><IconSpark style={{ width: 16, height: 16 }} /> Analytics</button>
          )}
        </div>
      )}
      <div class="content">
        {tab === "home" && <Home onStartWorkout={setMode} onNav={(t) => { setAnalytics(false); setTab(t); }} />}
        {tab === "workout" && <Workout onStartWorkout={setMode} onOpenExercise={setExercise} />}
        {tab === "progress" && <Progress />}
        {tab === "nutrition" && <Nutrition />}
        {tab === "profile" && <Profile onLogout={logout} />}
      </div>
    </>
  );

  return (
    <div class="app">
      {screen}
      {!analytics && <BottomNav active={tab} onNav={setTab} />}

      <QuickAdd
        onAddWeight={() => setQuick("weight")}
        onAddMeasurement={() => setQuick("measure")}
        onAddFood={() => { setTab("nutrition"); }}
        onStartWorkout={() => setTab("workout")}
        onAddPhoto={() => { setTab("progress"); }}
      />

      {mode && <WorkoutMode kode={mode} onExit={() => setMode(null)} />}
      {exercise && <ExerciseHistory nama={exercise} onClose={() => setExercise(null)} />}
      <WeightSheet open={quick === "weight"} onClose={() => setQuick(null)} onSaved={() => {}} />
      <MeasurementSheet open={quick === "measure"} onClose={() => setQuick(null)} onSaved={() => {}} />
      <Toast />
    </div>
  );
}
