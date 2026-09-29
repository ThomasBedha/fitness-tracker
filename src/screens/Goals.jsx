import { useState } from "preact/hooks";
import { Card, Button, Empty, ProgressBar, Field, Input } from "../components/ui.jsx";
import { IconPlus, IconClose } from "../components/icons.jsx";
import { goals, weights, measurements, logs, profile, loadAll } from "../lib/store.js";
import { insert, update, remove } from "../lib/supabase.js";
import { toast } from "../components/Toast.jsx";
import { bestRepsByExercise } from "../lib/calc.js";
import { fmtNumber, fmtDate } from "../lib/format.js";

const TIPE = [["berat", "Berat badan", "kg"], ["perut", "Lingkar perut", "cm"], ["pr", "Personal record", "reps"], ["consistency", "Konsistensi", "sesi/minggu"]];

export function Goals() {
  const [open, setOpen] = useState(false);

  async function del(id) {
    if (!confirm("Hapus target ini?")) return;
    try { await remove("goals", id); await loadGoals(); toast("Target dihapus", "ok"); }
    catch (e) { toast(e.message, "err"); }
  }

  async function loadGoals() {
    await loadAll();
  }

  const currentValue = (g) => {
    if (g.tipe === "berat") return weights.value.length ? [...weights.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).pop().berat : null;
    if (g.tipe === "perut") {
      const m = measurements.value.filter((x) => x.perut != null).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      return m.length ? m.pop().perut : null;
    }
    if (g.tipe === "pr") return bestRepsByExercise(logs.value, g.exercise_nama).best || null;
    return null;
  };

  return (
    <div>
      <div class="row between mb">
        <span class="small muted">Target fitness kamu</span>
        <Button sm icon={<IconPlus style={{ width: 16, height: 16 }} />} onClick={() => setOpen(true)}>Target</Button>
      </div>

      {goals.value.length === 0 ? (
        <Card><Empty title="Belum ada target" sub="Buat target untuk melacak progress." action={<Button sm onClick={() => setOpen(true)}>+ Buat Target</Button>} /></Card>
      ) : (
        goals.value.map((g) => {
          const cur = currentValue(g);
          const t = TIPE.find((x) => x[0] === g.tipe);
          const unit = g.satuan || t?.[2] || "";
          let pct = 0;
          if (cur != null && g.start != null && g.target != null && g.start !== g.target) {
            pct = g.tipe === "berat" || g.tipe === "perut"
              ? ((g.start - cur) / (g.start - g.target)) * 100
              : (cur / g.target) * 100;
            pct = Math.min(100, Math.max(0, pct));
          }
          return (
            <Card key={g.id}>
              <div class="row between">
                <div>
                  <strong>{g.label || t?.[1]}</strong>
                  {g.exercise_nama && <span class="small muted"> • {g.exercise_nama}</span>}
                </div>
                <button class="btn btn-ghost btn-icon" onClick={() => del(g.id)}><IconClose style={{ width: 14, height: 14 }} /></button>
              </div>
              <div class="row between small muted mt">
                <span>Current: {cur != null ? fmtNumber(cur, 1) : "-"} {unit}</span>
                <span>Target: {fmtNumber(g.target, 1)} {unit}</span>
              </div>
              <div style={{ marginTop: ".6rem" }}>
                <ProgressBar value={pct} max={100} variant="green" label={<><span>Progress</span><span>{pct.toFixed(0)}%</span></>} />
              </div>
            </Card>
          );
        })
      )}

      {open && <GoalSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

function GoalSheet({ onClose }) {
  const [tipe, setTipe] = useState("berat");
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState("");
  const [start, setStart] = useState("");
  const [exerciseNama, setExerciseNama] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!target) return toast("Isi target", "err");
    setBusy(true);
    try {
      const t = TIPE.find((x) => x[0] === tipe);
      await insert("goals", [{
        tipe, label: label || t[1], target: Number(target),
        start: start ? Number(start) : null, satuan: t[2],
        exercise_nama: tipe === "pr" ? exerciseNama : null,
      }]);
      toast("Target dibuat", "ok");
      await loadAll();
      onClose();
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet">
        <div class="sheet-handle" />
        <h2>Buat Target</h2>
        <Field label="Tipe">
          <select class="input" value={tipe} onChange={(e) => setTipe(e.target.value)}>
            {TIPE.map(([id, lbl]) => <option key={id} value={id}>{lbl}</option>)}
          </select>
        </Field>
        <Field label="Label (opsional)"><Input value={label} onInput={setLabel} placeholder="mis. Turun ke 68 kg" /></Field>
        {tipe === "pr" && <Field label="Nama exercise"><Input value={exerciseNama} onInput={setExerciseNama} placeholder="Push-up biasa" /></Field>}
        <div class="grid-2">
          <Field label="Nilai awal"><Input type="number" step="0.1" value={start} onInput={setStart} /></Field>
          <Field label="Target"><Input type="number" step="0.1" value={target} onInput={setTarget} /></Field>
        </div>
        <Button block disabled={busy} onClick={save}>{busy ? "Menyimpan..." : "Simpan Target"}</Button>
      </div>
    </div>
  );
}
