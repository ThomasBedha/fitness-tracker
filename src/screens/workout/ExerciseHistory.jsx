import { Sheet } from "../../components/Sheet.jsx";
import { Card, Empty } from "../../components/ui.jsx";
import { logs } from "../../lib/store.js";
import { exerciseHistory, bestRepsByExercise, overloadSuggestion } from "../../lib/calc.js";
import { fmtDate } from "../../lib/format.js";

export function ExerciseHistory({ nama, onClose }) {
  if (!nama) return null;
  const hist = exerciseHistory(logs.value, nama, 12).reverse();
  const best = bestRepsByExercise(logs.value, nama);
  const sug = overloadSuggestion(logs.value, nama);

  return (
    <Sheet open={!!nama} onClose={onClose} title={nama}>
      {hist.length === 0 ? (
        <Empty title="Belum ada riwayat" sub="Selesaikan set exercise ini untuk melihat perkembangan." />
      ) : (
        <>
          <Card>
            <div class="row between">
              <span class="small muted">Personal Record</span>
              <span><b>{best.best}</b> reps <span class="small muted">• {fmtDate(best.tanggal)}</span></span>
            </div>
          </Card>

          {sug && (
            <Card title="Progressive Overload">
              <div class="small muted">Last workout: <b class="muted">{sug.last.join(" / ")}</b></div>
              <div class="small muted">Best: <b class="muted">{sug.best.join(" / ")}</b></div>
              <div class="mt">
                {sug.bumpWeight
                  ? <span class="badge badge-a">Performance meningkat — naikkan beban</span>
                  : <>Target berikutnya: <b>{sug.target.join(" / ")}</b></>}
              </div>
            </Card>
          )}

          <Card title="Riwayat per Sesi">
            {hist.map((h) => (
              <div key={h.tanggal} class="list-row">
                <span class="small muted" style={{ width: "5.5rem" }}>{fmtDate(h.tanggal)}</span>
                <div class="list-main"><b>{h.reps.join(" / ")}</b></div>
                {h.beban != null && <span class="small muted">{h.beban} kg</span>}
              </div>
            ))}
          </Card>
        </>
      )}
    </Sheet>
  );
}
