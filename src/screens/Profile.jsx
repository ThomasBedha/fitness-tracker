import { useState } from "preact/hooks";
import { Card, Button, Field, Input } from "../components/ui.jsx";
import { IconTheme, IconUser } from "../components/icons.jsx";
import { profile, theme, setTheme } from "../lib/store.js";
import { update, supabase } from "../lib/supabase.js";
import { toast } from "../components/Toast.jsx";
import { weights, measurements, sessions, logs, nutrition, foods, goals, prs, photos, activities, exercises } from "../lib/store.js";
import { loadAll } from "../lib/store.js";

export function Profile({ onLogout }) {
  const p = profile.value || {};
  const [tinggi, setTinggi] = useState(p.tinggi ?? "");
  const [nama, setNama] = useState(p.nama ?? "");
  const [kalori, setKalori] = useState(p.target_kalori ?? 2100);
  const [protein, setProtein] = useState(p.target_protein ?? 120);
  const [karbo, setKarbo] = useState(p.target_karbo ?? 230);
  const [lemak, setLemak] = useState(p.target_lemak ?? 70);
  const [reminder, setReminder] = useState(p.reminder_enabled ?? false);
  const [reminderTime, setReminderTime] = useState(p.reminder_time ?? "19:00");
  const [busy, setBusy] = useState(false);

  async function saveProfile() {
    setBusy(true);
    try {
      await update("profiles", p.id, {
        nama: nama || null, tinggi: tinggi ? Number(tinggi) : null,
        target_kalori: Number(kalori), target_protein: Number(protein),
        target_karbo: Number(karbo), target_lemak: Number(lemak),
        reminder_enabled: reminder, reminder_time: reminderTime,
      });
      await loadAll();
      toast("Profil tersimpan", "ok");
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  function exportJSON() {
    const data = {
      exported_at: new Date().toISOString(),
      profile: profile.value,
      weight_logs: weights.value, body_measurements: measurements.value,
      workout_sessions: sessions.value, exercise_logs: logs.value,
      exercises: exercises.value, nutrition_logs: nutrition.value, foods: foods.value,
      goals: goals.value, personal_records: prs.value, activity_logs: activities.value,
      progress_photos: photos.value.map(({ storage_path, thumb_path, ...r }) => r),
    };
    download(`fitness-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
    toast("Backup JSON diunduh", "ok");
  }

  function exportCSV() {
    const lines = ["tanggal,berat,catatan"];
    [...weights.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).forEach((w) =>
      lines.push(`${w.tanggal},${w.berat},"${(w.catatan || "").replace(/"/g, '""')}"`));
    download(`fitness-weights-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
    toast("CSV diunduh", "ok");
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const uid = (await supabase.auth.getUser()).data?.user?.id;
      const withUid = (rows) => (rows || []).map(({ id, created_at, updated_at, user_id, ...r }) => ({ ...r, user_id: uid }));
      const map = [
        ["weight_logs", data.weight_logs], ["body_measurements", data.body_measurements],
        ["workout_sessions", data.workout_sessions], ["exercise_logs", data.exercise_logs],
        ["nutrition_logs", data.nutrition_logs], ["foods", data.foods],
        ["goals", data.goals], ["personal_records", data.personal_records],
      ];
      for (const [table, rows] of map) {
        if (rows?.length) { const { error } = await supabase.from(table).insert(withUid(rows)); if (error) throw error; }
      }
      await loadAll();
      toast("Import selesai", "ok");
    } catch (e) { toast(e.message || "Import gagal", "err"); }
  }

  async function askNotif() {
    if (!("Notification" in window)) return toast("Browser tidak mendukung notifikasi", "err");
    const perm = await Notification.requestPermission();
    if (perm === "granted") toast("Notifikasi diaktifkan", "ok");
    else toast("Izin notifikasi ditolak", "err");
  }

  return (
    <div class="screen">
      <h1>Profil & Pengaturan</h1>

      <Card title="Profil">
        <Field label="Nama"><Input value={nama} onInput={setNama} placeholder="Nama kamu" /></Field>
        <Field label="Tinggi (cm)"><Input type="number" value={tinggi} onInput={setTinggi} placeholder="175" /></Field>
      </Card>

      <Card title="Target Nutrisi Harian">
        <div class="grid-2">
          <Field label="Kalori (kcal)"><Input type="number" value={kalori} onInput={setKalori} /></Field>
          <Field label="Protein (g)"><Input type="number" value={protein} onInput={setProtein} /></Field>
          <Field label="Karbo (g)"><Input type="number" value={karbo} onInput={setKarbo} /></Field>
          <Field label="Lemak (g)"><Input type="number" value={lemak} onInput={setLemak} /></Field>
        </div>
      </Card>

      <Card title="Tema">
        <div class="seg" style={{ width: "100%" }}>
          {[["system", "System"], ["light", "Terang"], ["dark", "Gelap"]].map(([id, l]) => (
            <button key={id} class={`seg-btn ${theme.value === id ? "active" : ""}`} style={{ flex: 1 }} onClick={() => setTheme(id)}>{l}</button>
          ))}
        </div>
      </Card>

      <Card title="Reminder">
        <div class="row between">
          <span class="small">Pengingat workout & pengukuran</span>
          <button class={`chip ${reminder ? "active" : ""}`} onClick={() => { setReminder(!reminder); if (!reminder) askNotif(); }}>{reminder ? "Aktif" : "Nonaktif"}</button>
        </div>
        {reminder && <div class="mt"><Field label="Jam pengingat"><Input type="time" value={reminderTime} onInput={setReminderTime} /></Field></div>}
      </Card>

      <Button block disabled={busy} onClick={saveProfile}>{busy ? "Menyimpan..." : "Simpan Pengaturan"}</Button>

      <Card title="Data" class="mt">
        <div class="grid-2">
          <Button variant="ghost" onClick={exportJSON}>Export JSON</Button>
          <Button variant="ghost" onClick={exportCSV}>Export CSV</Button>
        </div>
        <div class="mt">
          <label class="btn btn-ghost btn-block" style={{ cursor: "pointer" }}>
            Import JSON
            <input type="file" accept="application/json" hidden onChange={(e) => importJSON(e.target.files?.[0])} />
          </label>
        </div>
      </Card>

      <Button variant="danger" block class="mt" onClick={onLogout}>Keluar</Button>
      <p class="center small muted mt">Fitness Tracker V2 · Data privat milikmu</p>
    </div>
  );
}

function download(filename, text) {
  const blob = new Blob([text], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
