import { useState } from "preact/hooks";
import { Sheet } from "./Sheet.jsx";
import { Field, Input, Button } from "./ui.jsx";
import { todayStr } from "../lib/format.js";
import { insert, update } from "../lib/supabase.js";
import { toast } from "./Toast.jsx";

export function WeightSheet({ open, onClose, onSaved, editing }) {
  const [tanggal, setTanggal] = useState(editing?.tanggal || todayStr());
  const [berat, setBerat] = useState(editing?.berat ?? "");
  const [catatan, setCatatan] = useState(editing?.catatan || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!tanggal || !berat) return toast("Isi tanggal & berat", "err");
    setBusy(true);
    try {
      const row = { tanggal, berat: Number(berat), catatan: catatan || null };
      if (editing) await update("weight_logs", editing.id, row);
      else await insert("weight_logs", [row]);
      toast("Berat tersimpan", "ok");
      onSaved?.(); onClose();
    } catch (e) { toast(e.message || "Gagal simpan", "err"); }
    finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit Berat" : "Catat Berat"}>
      <Field label="Tanggal"><Input type="date" value={tanggal} onInput={setTanggal} /></Field>
      <Field label="Berat (kg)"><Input type="number" step="0.01" value={berat} onInput={setBerat} placeholder="70.5" /></Field>
      <Field label="Catatan (opsional)"><Input value={catatan} onInput={setCatatan} /></Field>
      <Button block disabled={busy} onClick={save}>{busy ? "Menyimpan..." : "Simpan"}</Button>
    </Sheet>
  );
}

export function MeasurementSheet({ open, onClose, onSaved, editing }) {
  const [tanggal, setTanggal] = useState(editing?.tanggal || todayStr());
  const [f, setF] = useState({
    perut: editing?.perut ?? "", dada: editing?.dada ?? "",
    lengan: editing?.lengan ?? "", paha: editing?.paha ?? "", pinggul: editing?.pinggul ?? "",
  });
  const [catatan, setCatatan] = useState(editing?.catatan || "");
  const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });

  async function save() {
    if (!tanggal) return toast("Isi tanggal", "err");
    const nums = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? null : Number(v)]));
    if (Object.values(nums).every((v) => v == null)) return toast("Isi minimal satu ukuran", "err");
    setBusy(true);
    try {
      const row = { tanggal, ...nums, catatan: catatan || null };
      if (editing) await update("body_measurements", editing.id, row);
      else await insert("body_measurements", [row]);
      toast("Ukuran tersimpan", "ok");
      onSaved?.(); onClose();
    } catch (e) { toast(e.message || "Gagal simpan", "err"); }
    finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? "Edit Ukuran" : "Catat Ukuran Tubuh"}>
      <Field label="Tanggal"><Input type="date" value={tanggal} onInput={setTanggal} /></Field>
      <div class="grid-2">
        <Field label="Perut (cm)"><Input type="number" step="0.1" value={f.perut} onInput={set("perut")} /></Field>
        <Field label="Dada (cm)"><Input type="number" step="0.1" value={f.dada} onInput={set("dada")} /></Field>
        <Field label="Lengan (cm)"><Input type="number" step="0.1" value={f.lengan} onInput={set("lengan")} /></Field>
        <Field label="Paha (cm)"><Input type="number" step="0.1" value={f.paha} onInput={set("paha")} /></Field>
        <Field label="Pinggul (cm)"><Input type="number" step="0.1" value={f.pinggul} onInput={set("pinggul")} /></Field>
      </div>
      <Field label="Catatan (opsional)"><Input value={catatan} onInput={setCatatan} /></Field>
      <Button block disabled={busy} onClick={save}>{busy ? "Menyimpan..." : "Simpan"}</Button>
    </Sheet>
  );
}
