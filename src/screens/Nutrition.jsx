import { useState, useMemo } from "preact/hooks";
import { Card, Button, Empty, ProgressBar, Field, Input } from "../components/ui.jsx";
import { IconPlus, IconClose } from "../components/icons.jsx";
import { nutrition, foods, profile } from "../lib/store.js";
import { insert, remove } from "../lib/supabase.js";
import { toast } from "../components/Toast.jsx";
import { fmtNumber, fmtDate, todayStr } from "../lib/format.js";
import { loadAll } from "../lib/store.js";

const MEALS = ["Sarapan", "Makan Siang", "Makan Malam", "Snack", "Lainnya"];
const FAV_DEFAULT = [
  { nama: "Nasi putih", kalori: 180, protein: 3, karbo: 40, lemak: 0, porsi: "100 g" },
  { nama: "Ayam dada", kalori: 165, protein: 31, karbo: 0, lemak: 3.6, porsi: "100 g" },
  { nama: "Telur", kalori: 78, protein: 6, karbo: 0.6, lemak: 5, porsi: "1 butir" },
  { nama: "Tempe", kalori: 193, protein: 19, karbo: 9, lemak: 11, porsi: "100 g" },
  { nama: "Susu", kalori: 120, protein: 8, karbo: 12, lemak: 5, porsi: "250 ml" },
];

export function Nutrition() {
  const [date, setDate] = useState(todayStr());
  const [sheet, setSheet] = useState(null); // {prefill?}
  const [favSheet, setFavSheet] = useState(false);

  const t = profile.value || { target_kalori: 2100, target_protein: 120, target_karbo: 230, target_lemak: 70 };
  const dayLogs = useMemo(() => nutrition.value.filter((n) => n.tanggal === date), [nutrition.value, date]);
  const sum = useMemo(() => dayLogs.reduce((a, n) => ({
    kalori: a.kalori + (n.kalori || 0), protein: a.protein + (n.protein || 0),
    karbo: a.karbo + (n.karbo || 0), lemak: a.lemak + (n.lemak || 0),
  }), { kalori: 0, protein: 0, karbo: 0, lemak: 0 }), [dayLogs]);

  async function del(id) {
    try { await remove("nutrition_logs", id); await loadAll(); }
    catch (e) { toast(e.message, "err"); }
  }

  async function seedFavorites() {
    try {
      await insert("foods", FAV_DEFAULT.map((f) => ({ ...f, favorit: true })));
      await loadAll(); toast("Makanan favorit ditambahkan", "ok"); setFavSheet(false);
    } catch (e) { toast(e.message, "err"); }
  }

  const bars = [
    ["kalori", "Kalori", "kcal"], ["protein", "Protein", "g"], ["karbo", "Karbo", "g"], ["lemak", "Lemak", "g"],
  ];

  return (
    <div class="screen">
      <h1>Nutrisi</h1>
      <div class="row between mb">
        <input class="input" type="date" value={date} onInput={(e) => setDate(e.target.value)} style={{ width: "auto" }} />
        <Button sm icon={<IconPlus style={{ width: 16, height: 16 }} />} onClick={() => setSheet({})}>Makanan</Button>
      </div>

      <Card title="Ringkasan Hari Ini">
        {bars.map(([key, label, unit]) => {
          const target = t[`target_${key}`];
          const val = sum[key];
          const pct = target ? (val / target) * 100 : 0;
          return (
            <div key={key} class="mb">
              <div class="row between small">
                <span>{label}</span>
                <span class={val > target ? "delta-up" : "muted"}>{fmtNumber(val, 0)} / {target} {unit}</span>
              </div>
              <div class="bar"><div class={`bar-fill ${val > target ? "" : key === "protein" ? "green" : key === "karbo" ? "blue" : ""}`} style={{ width: Math.min(100, pct) + "%" }} /></div>
            </div>
          );
        })}
      </Card>

      <Card>
        <div class="row between">
          <span class="card-title" style={{ margin: 0 }}>Makanan Favorit</span>
          <Button sm variant="ghost" onClick={() => setFavSheet(true)}>Kelola</Button>
        </div>
        {foods.value.length === 0 ? (
          <div class="small muted mt">Belum ada makanan favorit. <button class="link" style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", minHeight: 0 }} onClick={seedFavorites}>Tambah default</button></div>
        ) : (
          <div class="row wrap mt" style={{ gap: ".4rem" }}>
            {foods.value.map((f) => (
              <button key={f.id} class="chip" onClick={() => setSheet({ prefill: f })}>
                + {f.nama} <span class="muted">({f.kalori} kcal)</span>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Card title="Log Makanan">
        {dayLogs.length === 0 ? (
          <Empty title="Belum ada makanan hari ini" action={<Button sm onClick={() => setSheet({})}>+ Catat Makanan</Button>} />
        ) : (
          dayLogs.map((n) => (
            <div key={n.id} class="list-row">
              <div class="list-main">
                <div>{n.nama} <span class="badge badge-muted">{n.meal}</span></div>
                <div class="small muted">{fmtNumber(n.kalori, 0)} kcal · P {fmtNumber(n.protein, 0)} · K {fmtNumber(n.karbo, 0)} · L {fmtNumber(n.lemak, 0)}</div>
              </div>
              <button class="btn btn-ghost btn-icon" onClick={() => del(n.id)}><IconClose style={{ width: 14, height: 14 }} /></button>
            </div>
          ))
        )}
      </Card>

      {sheet && <FoodSheet date={date} prefill={sheet.prefill} onClose={() => setSheet(null)} />}
      {favSheet && <FavoriteSheet onClose={() => setFavSheet(false)} />}
    </div>
  );
}

function FoodSheet({ date, prefill, onClose }) {
  const [nama, setNama] = useState(prefill?.nama || "");
  const [porsi, setPorsi] = useState(prefill?.porsi || "1 porsi");
  const [meal, setMeal] = useState("Lainnya");
  const [kalori, setKalori] = useState(prefill?.kalori ?? "");
  const [protein, setProtein] = useState(prefill?.protein ?? "");
  const [karbo, setKarbo] = useState(prefill?.karbo ?? "");
  const [lemak, setLemak] = useState(prefill?.lemak ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!nama) return toast("Isi nama makanan", "err");
    setBusy(true);
    try {
      await insert("nutrition_logs", [{
        tanggal: date, food_id: prefill?.id || null, nama, porsi, meal,
        kalori: Number(kalori) || 0, protein: Number(protein) || 0, karbo: Number(karbo) || 0, lemak: Number(lemak) || 0,
      }]);
      await insert("activity_logs", [{ tanggal: date, tipe: "nutrition", meta: { nama } }]);
      await loadAll();
      toast("Makanan tersimpan", "ok");
      onClose();
    } catch (e) { toast(e.message, "err"); }
    finally { setBusy(false); }
  }

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet">
        <div class="sheet-handle" />
        <h2>Catat Makanan</h2>
        <Field label="Nama"><Input value={nama} onInput={setNama} placeholder="Nasi + ayam" /></Field>
        <div class="grid-2">
          <Field label="Porsi"><Input value={porsi} onInput={setPorsi} placeholder="1 porsi" /></Field>
          <Field label="Waktu">
            <select class="input" value={meal} onChange={(e) => setMeal(e.target.value)}>
              {MEALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <div class="grid-2">
          <Field label="Kalori (kcal)"><Input type="number" value={kalori} onInput={setKalori} /></Field>
          <Field label="Protein (g)"><Input type="number" value={protein} onInput={setProtein} /></Field>
          <Field label="Karbo (g)"><Input type="number" value={karbo} onInput={setKarbo} /></Field>
          <Field label="Lemak (g)"><Input type="number" value={lemak} onInput={setLemak} /></Field>
        </div>
        <Button block disabled={busy} onClick={save}>{busy ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </div>
  );
}

function FavoriteSheet({ onClose }) {
  const [nama, setNama] = useState("");
  const [kalori, setKalori] = useState("");
  const [protein, setProtein] = useState("");
  const [porsi, setPorsi] = useState("");

  async function add() {
    if (!nama) return toast("Isi nama", "err");
    try {
      await insert("foods", [{ nama, kalori: Number(kalori) || 0, protein: Number(protein) || 0, porsi, favorit: true }]);
      await loadAll(); setNama(""); setKalori(""); setProtein(""); setPorsi("");
      toast("Favorit ditambah", "ok");
    } catch (e) { toast(e.message, "err"); }
  }

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet">
        <div class="sheet-handle" />
        <h2>Makanan Favorit</h2>
        {foods.value.map((f) => (
          <div key={f.id} class="list-row">
            <div class="list-main"><div>{f.nama}</div><div class="small muted">{f.kalori} kcal · P{f.protein} · {f.porsi}</div></div>
            <button class="btn btn-ghost btn-icon" onClick={async () => { await remove("foods", f.id); await loadAll(); }}><IconClose style={{ width: 14, height: 14 }} /></button>
          </div>
        ))}
        <div class="mt"><Field label="Nama"><Input value={nama} onInput={setNama} /></Field></div>
        <div class="grid-2">
          <Field label="Kalori"><Input type="number" value={kalori} onInput={setKalori} /></Field>
          <Field label="Protein"><Input type="number" value={protein} onInput={setProtein} /></Field>
        </div>
        <Field label="Porsi"><Input value={porsi} onInput={setPorsi} placeholder="100 g" /></Field>
        <Button block onClick={add}>Tambah Favorit</Button>
      </div>
    </div>
  );
}
