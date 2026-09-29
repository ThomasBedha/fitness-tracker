import { useState, useEffect } from "preact/hooks";
import { Card, Button, Empty, Field, Input } from "../components/ui.jsx";
import { IconCamera } from "../components/icons.jsx";
import { photos } from "../lib/store.js";
import { currentUserId, insert, remove } from "../lib/supabase.js";
import { uploadPhoto, signedUrl, deletePhoto } from "../lib/photos.js";
import { toast } from "../components/Toast.jsx";
import { fmtDate, todayStr } from "../lib/format.js";
import { loadAll } from "../lib/store.js";

const ANGLES = [["front", "Depan"], ["side", "Samping"], ["back", "Belakang"]];

export function Photos() {
  const [adding, setAdding] = useState(false);
  const [urls, setUrls] = useState({});
  const [beforeAfter, setBeforeAfter] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const map = {};
      for (const p of photos.value) {
        const u = await signedUrl(p.thumb_path || p.storage_path);
        if (u) map[p.id] = u;
      }
      if (!cancel) setUrls(map);
    })();
    return () => { cancel = true; };
  }, [photos.value]);

  const grouped = {};
  photos.value.forEach((p) => {
    (grouped[p.tanggal] = grouped[p.tanggal] || {})[p.angle] = p;
  });
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  async function del(p) {
    if (!confirm("Hapus foto ini?")) return;
    try {
      await deletePhoto(p.storage_path);
      await remove("progress_photos", p.id);
      await loadAll();
      toast("Foto dihapus", "ok");
    } catch (e) { toast(e.message, "err"); }
  }

  return (
    <div>
      <div class="row between mb">
        <span class="small muted">Progress photo privat</span>
        <div class="row" style={{ gap: ".4rem" }}>
          {dates.length >= 2 && <Button sm variant="ghost" onClick={() => setBeforeAfter((v) => !v)}>{beforeAfter ? "Galeri" : "Before/After"}</Button>}
          <Button sm icon={<IconCamera style={{ width: 16, height: 16 }} />} onClick={() => setAdding(true)}>Foto</Button>
        </div>
      </div>

      {dates.length === 0 ? (
        <Card><Empty title="Belum ada progress photo" sub="Upload foto depan/samping/belakang untuk membandingkan perubahan." action={<Button sm onClick={() => setAdding(true)}>+ Upload Foto</Button>} /></Card>
      ) : beforeAfter ? (
        <BeforeAfter grouped={grouped} dates={dates} urls={urls} />
      ) : (
        dates.map((d) => (
          <Card key={d} title={fmtDate(d, { long: true })}>
            <div class="grid-3">
              {ANGLES.map(([angle, label]) => {
                const p = grouped[d][angle];
                if (!p) return <div key={angle} class="empty small" style={{ padding: ".5rem" }}>{label}<br /><span class="muted">kosong</span></div>;
                return (
                  <div key={angle} class="center">
                    {urls[p.id]
                      ? <img src={urls[p.id]} alt={label} loading="lazy" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--border)" }} onClick={() => del(p)} />
                      : <div class="skeleton" style={{ width: "100%", aspectRatio: "3/4" }} />}
                    <div class="small muted mt">{label}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))
      )}

      {adding && <AddPhotoSheet onClose={() => setAdding(false)} />}
    </div>
  );
}

function BeforeAfter({ grouped, dates, urls }) {
  const [a, setA] = useState(dates[dates.length - 1]);
  const [b, setB] = useState(dates[0]);
  const [angle, setAngle] = useState("front");
  const pa = grouped[a]?.[angle], pb = grouped[b]?.[angle];

  return (
    <Card>
      <div class="grid-2 mb">
        <Field label="Sebelum"><select class="input" value={a} onChange={(e) => setA(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}</select></Field>
        <Field label="Sesudah"><select class="input" value={b} onChange={(e) => setB(e.target.value)}>{dates.map((d) => <option key={d} value={d}>{fmtDate(d)}</option>)}</select></Field>
      </div>
      <div class="seg mb">
        {ANGLES.map(([id, label]) => <button key={id} class={`seg-btn ${angle === id ? "active" : ""}`} onClick={() => setAngle(id)}>{label}</button>)}
      </div>
      <div class="grid-2">
        <div class="center">
          {pa && urls[pa.id] ? <img src={urls[pa.id]} alt="before" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--border)" }} /> : <div class="empty small">Kosong</div>}
          <div class="small muted mt">Sebelum · {fmtDate(a)}</div>
        </div>
        <div class="center">
          {pb && urls[pb.id] ? <img src={urls[pb.id]} alt="after" style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--border)" }} /> : <div class="empty small">Kosong</div>}
          <div class="small muted mt">Sesudah · {fmtDate(b)}</div>
        </div>
      </div>
    </Card>
  );
}

function AddPhotoSheet({ onClose }) {
  const [tanggal, setTanggal] = useState(todayStr());
  const [angle, setAngle] = useState("front");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!file) return toast("Pilih foto dulu", "err");
    setBusy(true);
    try {
      const uid = await currentUserId();
      const path = await uploadPhoto(uid, tanggal, angle, file);
      await insert("progress_photos", [{ tanggal, angle, storage_path: path, thumb_path: path }]);
      await insert("activity_logs", [{ tanggal, tipe: "photo", meta: { angle } }]);
      await loadAll();
      toast("Foto tersimpan", "ok");
      onClose();
    } catch (e) { toast(e.message || "Upload gagal", "err"); }
    finally { setBusy(false); }
  }

  return (
    <div class="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="sheet">
        <div class="sheet-handle" />
        <h2>Upload Progress Photo</h2>
        <Field label="Tanggal"><Input type="date" value={tanggal} onInput={setTanggal} /></Field>
        <Field label="Pose">
          <select class="input" value={angle} onChange={(e) => setAngle(e.target.value)}>
            {ANGLES.map(([id, lbl]) => <option key={id} value={id}>{lbl}</option>)}
          </select>
        </Field>
        <Field label="Foto">
          <input class="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </Field>
        <Button block disabled={busy} onClick={save}>{busy ? "Mengunggah..." : "Simpan Foto"}</Button>
      </div>
    </div>
  );
}
