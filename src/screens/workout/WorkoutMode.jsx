import { useState, useEffect, useRef, useMemo } from "preact/hooks";
import { Button } from "../../components/ui.jsx";
import { IconBack, IconCheck, IconClose } from "../../components/icons.jsx";
import { toast } from "../../components/Toast.jsx";
import { templatesWithItems, profile, logs, prs, sessions } from "../../lib/store.js";
import { insert, update, currentUserId } from "../../lib/supabase.js";
import { overloadSuggestion, bestRepsByExercise } from "../../lib/calc.js";
import { todayStr, fmtDuration, fmtDate } from "../../lib/format.js";
import { loadAll } from "../../lib/store.js";

export function WorkoutMode({ kode, onExit }) {
  const template = templatesWithItems.value.find((t) => t.kode === kode);

  const [exIndex, setExIndex] = useState(0);
  const [sets, setSets] = useState([]);          // per current exercise: [{reps, done}]
  const [allDone, setAllDone] = useState({});    // exerciseId -> [reps...]
  const [resting, setResting] = useState(false);
  const [rest, setRest] = useState(90);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

  const items = template?.items || [];
  const ex = items[exIndex];

  // init sets when exercise changes
  useEffect(() => {
    if (!ex) return;
    const n = ex.target_sets || 3;
    setSets(Array.from({ length: n }, () => ({ reps: "", done: false })));
  }, [exIndex, ex?.id]);

  // rest countdown
  useEffect(() => {
    if (!resting) return;
    timerRef.current = setInterval(() => {
      setRest((r) => {
        if (r <= 1) { clearInterval(timerRef.current); setResting(false); return 90; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [resting]);

  const suggestion = useMemo(() => {
    if (!ex) return null;
    return overloadSuggestion(logs.value, ex.nama, ex.target_sets || 3, ex.target_reps_max || 15);
  }, [ex?.id, logs.value]);

  if (!template || !ex) {
    return (
      <div class="overlay">
        <div class="sheet">
          <p>Sesi tidak ditemukan.</p>
          <Button block onClick={onExit}>Kembali</Button>
        </div>
      </div>
    );
  }

  function setReps(i, v) {
    const copy = [...sets];
    copy[i] = { ...copy[i], reps: v };
    setSets(copy);
  }

  function completeSet(i) {
    if (!sets[i].reps) { toast("Isi jumlah reps dulu", "err"); return; }
    const copy = [...sets];
    copy[i] = { ...copy[i], done: true };
    setSets(copy);
    // save rep
    const repsArr = copy.filter((s) => s.done).map((s) => Number(s.reps));
    setAllDone((prev) => ({ ...prev, [ex.id]: repsArr }));
    // start rest kalau masih ada set
    if (copy.some((s) => !s.done)) { setRest(90); setResting(true); }
  }

  async function finishMarks() {
    return Promise.all(
      items.map((it) => {
        const arr = allDone[it.id];
        return { it, arr };
      })
    );
  }

  async function finish() {
    // pastikan minimal satu set tercatat
    const any = Object.values(allDone).some((a) => a && a.length);
    if (!any) { toast("Belum ada set selesai", "err"); return; }
    try {
      const durasi = Math.round((Date.now() - startRef.current) / 1000);
      const [session] = await insert("workout_sessions", [{
        tanggal: todayStr(), template_id: template.id, kode: template.kode,
        status: "completed", durasi_detik: durasi,
      }]);
      const rows = [];
      for (const it of items) {
        const arr = allDone[it.id];
        if (!arr) continue;
        arr.forEach((reps, idx) => rows.push({
          session_id: session.id, exercise_id: it.exercise_id,
          exercise_nama: it.nama, set_no: idx + 1, reps, beban: it.beban ?? null, tanggal: todayStr(),
        }));
      }
      if (rows.length) await insert("exercise_logs", rows);

      // cek PR baru
      const newPrs = [];
      for (const it of items) {
        const arr = allDone[it.id]; if (!arr) continue;
        const maxReps = Math.max(...arr);
        const prev = bestRepsByExercise(logs.value, it.nama).best;
        if (maxReps > prev) {
          newPrs.push({ exercise_nama: it.nama, nilai: maxReps, satuan: "reps", tanggal: todayStr(), exercise_id: it.exercise_id });
        }
      }
      if (newPrs.length) await insert("personal_records", newPrs);

      // activity log
      await insert("activity_logs", [{ tanggal: todayStr(), tipe: "workout", meta: { kode: template.kode } }]);

      await loadAll();
      setFinished(newPrs.length ? { prs: newPrs } : {});
      if (newPrs.length) toast(`PR baru: ${newPrs.map((p) => p.exercise_nama).join(", ")}`, "ok");
      else toast("Latihan selesai! 💪", "ok");
    } catch (e) {
      toast(e.message || "Gagal simpan latihan", "err");
    }
  }

  if (finished) {
    return (
      <div class="overlay">
        <div class="sheet center">
          <div class="sheet-handle" />
          <div style={{ fontSize: "2.5rem" }}>💪</div>
          <h2>Latihan Selesai</h2>
          <p class="muted small">Sesi {template.kode} • {fmtDuration(Math.round((Date.now() - startRef.current) / 1000))}</p>
          {finished.prs?.length > 0 && (
            <div class="card pr-flash" style={{ textAlign: "left" }}>
              <div class="card-title">🏆 New Personal Record</div>
              {finished.prs.map((p) => (
                <div key={p.exercise_nama} class="row between" style={{ padding: ".3rem 0" }}>
                  <span>{p.exercise_nama}</span><b>{p.nilai} reps</b>
                </div>
              ))}
            </div>
          )}
          <Button block onClick={onExit}>Selesai</Button>
        </div>
      </div>
    );
  }

  if (resting) {
    return (
      <div class="overlay">
        <div class="sheet center">
          <div class="sheet-handle" />
          <div class="card-title">Rest Timer</div>
          <div class="timer-num">{fmtDuration(rest)}</div>
          <div class="row" style={{ gap: ".5rem", marginTop: "1rem" }}>
            <Button variant="ghost" onClick={() => setRest((r) => r + 30)}>+30 sec</Button>
            <Button onClick={() => setResting(false)}>Skip Rest</Button>
          </div>
        </div>
      </div>
    );
  }

  const doneSets = sets.filter((s) => s.done).length;

  return (
    <div class="overlay">
      <div class="sheet">
        <div class="sheet-handle" />
        <div class="row between mb">
          <button class="btn btn-ghost btn-icon" onClick={onExit} aria-label="Keluar"><IconClose style={{ width: 18, height: 18 }} /></button>
          <span class="small muted">Exercise {exIndex + 1} / {items.length}</span>
          <span class="badge badge-muted">{template.kode}</span>
        </div>

        <h2 style={{ fontSize: "1.3rem" }}>{ex.nama}</h2>
        <p class="muted small">Target: {ex.target_sets} × {ex.target_reps_min}{ex.target_reps_max && ex.target_reps_max !== ex.target_reps_min ? `–${ex.target_reps_max}` : ""}</p>

        {suggestion && (
          <div class="card tight" style={{ background: "var(--surface-2)", boxShadow: "none" }}>
            <div class="small muted">Last: {suggestion.last.join(" / ")} • Best: {suggestion.best.join(" / ")}</div>
            <div class="small mt">
              {suggestion.bumpWeight
                ? "Semua set sudah di batas atas — coba naikkan beban."
                : `Target berikutnya: ${suggestion.target.join(" / ")}`}
            </div>
          </div>
        )}

        <div class="mt mb">
          {sets.map((s, i) => (
            <div key={i} class="set-row">
              <span class={`set-badge ${s.done ? "done" : ""}`}>{i + 1}</span>
              <input class="input" type="number" inputmode="numeric" placeholder="reps"
                value={s.reps} disabled={s.done} onInput={(e) => setReps(i, e.target.value)} />
              <button class="btn btn-primary btn-icon" disabled={s.done} onClick={() => completeSet(i)} aria-label="Selesai set">
                <IconCheck style={{ width: 18, height: 18 }} />
              </button>
            </div>
          ))}
        </div>
        <p class="small muted center">{doneSets} / {sets.length} set selesai</p>

        <div class="row mt" style={{ gap: ".5rem" }}>
          <Button variant="ghost" onClick={() => setExIndex((i) => Math.max(0, i - 1))} disabled={exIndex === 0}>
            <IconBack style={{ width: 16, height: 16 }} /> Sebelumnya
          </Button>
          <div class="spacer" />
          {exIndex < items.length - 1 ? (
            <Button onClick={() => setExIndex((i) => i + 1)}>Berikutnya</Button>
          ) : (
            <Button onClick={finish}>Selesaikan Latihan</Button>
          )}
        </div>
      </div>
    </div>
  );
}
