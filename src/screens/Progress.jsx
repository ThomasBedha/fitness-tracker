import { useState, useMemo } from "preact/hooks";
import { Card, Button, Empty, Stat, ProgressBar } from "../components/ui.jsx";
import { LineChart } from "../components/charts/LineChart.jsx";
import { Sparkline } from "../components/charts/Sparkline.jsx";
import { WeightSheet, MeasurementSheet } from "../components/forms.jsx";
import { IconTrophy, IconCamera, IconPlus } from "../components/icons.jsx";
import { weights, measurements, prs, goals, photos, logs } from "../lib/store.js";
import { trendSeries, filterRange, bestRepsByExercise } from "../lib/calc.js";
import { fmtNumber, fmtDate, todayStr } from "../lib/format.js";
import { Goals } from "./Goals.jsx";
import { Photos } from "./Photos.jsx";

const RANGES = [["7d", "7D"], ["30d", "30D"], ["3m", "3M"], ["6m", "6M"], ["1y", "1Y"], ["all", "ALL"]];
const MEAS_FIELDS = [["perut", "Perut"], ["dada", "Dada"], ["lengan", "Lengan"], ["paha", "Paha"], ["pinggul", "Pinggul"]];

export function Progress() {
  const [range, setRange] = useState("30d");
  const [measField, setMeasField] = useState("perut");
  const [weightSheet, setWeightSheet] = useState(false);
  const [measSheet, setMeasSheet] = useState(false);
  const [tab, setTab] = useState("weight");

  const wSorted = useMemo(() => [...weights.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((w) => ({ t: w.tanggal, v: w.berat })), [weights.value]);
  const wFiltered = useMemo(() => filterRange(wSorted, range), [wSorted, range]);
  const wTrend = useMemo(() => trendSeries(wFiltered, 7), [wFiltered]);

  const mSorted = useMemo(() => [...measurements.value].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .filter((m) => m[measField] != null).map((m) => ({ t: m.tanggal, v: m[measField] })), [measurements.value, measField]);
  const mFiltered = useMemo(() => filterRange(mSorted, range), [mSorted, range]);

  const lw = wSorted.length ? wSorted[wSorted.length - 1].v : null;
  const fw = wSorted.length ? wSorted[0].v : null;

  const prList = useMemo(() => {
    const names = [...new Set(logs.value.map((l) => l.exercise_nama).filter(Boolean))];
    return names.map((n) => ({ nama: n, ...bestRepsByExercise(logs.value, n) })).filter((p) => p.best > 0)
      .sort((a, b) => b.best - a.best);
  }, [logs.value]);

  return (
    <div class="screen">
      <h1>Progress</h1>

      <div class="seg mb" style={{ width: "100%", justifyContent: "space-between" }}>
        {[["weight", "Berat"], ["body", "Ukuran"], ["goal", "Target"], ["pr", "PR"], ["photo", "Foto"]].map(([id, label]) => (
          <button key={id} class={`seg-btn ${tab === id ? "active" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === "weight" && (
        <>
          <div class="grid-2 mb">
            <div class="card tight">
              <div class="card-title" style={{ margin: 0 }}>Berat Sekarang</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 700 }}>{lw != null ? fmtNumber(lw, 1) : "-"} <span class="small muted">kg</span></div>
              {lw != null && fw != null && <Sparkline values={wSorted.map((w) => w.v)} />}
            </div>
            <div class="card tight">
              <div class="card-title" style={{ margin: 0 }}>Perubahan</div>
              <div style={{ fontSize: "1.7rem", fontWeight: 700, color: lw - fw <= 0 ? "var(--green)" : "var(--red)" }}>
                {fw != null && lw != null ? `${lw - fw > 0 ? "+" : ""}${fmtNumber(lw - fw, 1)}` : "-"} <span class="small muted">kg</span>
              </div>
              <div class="small muted">dari awal {fw != null ? fmtNumber(fw, 1) : "-"} kg</div>
            </div>
          </div>

          <div class="row between mb">
            <div class="seg">
              {RANGES.map(([id, label]) => <button key={id} class={`seg-btn ${range === id ? "active" : ""}`} onClick={() => setRange(id)}>{label}</button>)}
            </div>
          </div>

          <Card>
            {wFiltered.length ? (
              <LineChart unit="kg" series={[{ data: wFiltered, color: "var(--accent)" }]} trend={wTrend} fmt={(v) => fmtNumber(v, 1)} />
            ) : (
              <Empty title="Belum ada data berat" sub="Catat berat untuk melihat grafik." />
            )}
          </Card>

          <Card>
            <div class="row between">
              <span class="small muted">Catatan berat</span>
              <Button sm icon={<IconPlus style={{ width: 16, height: 16 }} />} onClick={() => setWeightSheet(true)}>Tambah</Button>
            </div>
            <div class="mt">
              {[...weights.value].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 12).map((w) => (
                <div key={w.id} class="list-row">
                  <span class="small muted" style={{ width: "5.5rem" }}>{fmtDate(w.tanggal)}</span>
                  <div class="list-main"><b>{fmtNumber(w.berat, 1)}</b> kg</div>
                  {w.catatan && <span class="small muted">{w.catatan}</span>}
                </div>
              ))}
              {weights.value.length === 0 && <Empty title="Belum ada catatan" action={<Button sm onClick={() => setWeightSheet(true)}>+ Catat Berat Pertama</Button>} />}
            </div>
          </Card>
        </>
      )}

      {tab === "body" && (
        <>
          <div class="row wrap mb" style={{ gap: ".4rem" }}>
            {MEAS_FIELDS.map(([id, label]) => (
              <button key={id} class={`chip ${measField === id ? "active" : ""}`} onClick={() => setMeasField(id)}>{label}</button>
            ))}
          </div>
          <div class="seg mb" style={{ width: "100%" }}>
            {RANGES.map(([id, label]) => <button key={id} class={`seg-btn ${range === id ? "active" : ""}`} onClick={() => setRange(id)}>{label}</button>)}
          </div>
          <Card>
            {mFiltered.length ? (
              <LineChart unit="cm" series={[{ data: mFiltered, color: "var(--blue)" }]} trend={trendSeries(mFiltered, 7)} fmt={(v) => fmtNumber(v, 1)} />
            ) : (
              <Empty title="Belum ada data ukuran" sub="Catat lingkar tubuh untuk melihat grafik." />
            )}
          </Card>
          <Card>
            <div class="row between">
              <span class="small muted">Catat ukuran tubuh</span>
              <Button sm icon={<IconPlus style={{ width: 16, height: 16 }} />} onClick={() => setMeasSheet(true)}>Tambah</Button>
            </div>
            <div class="mt">
              {[...measurements.value].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 10).map((m) => (
                <div key={m.id} class="list-row">
                  <span class="small muted" style={{ width: "5.5rem" }}>{fmtDate(m.tanggal)}</span>
                  <div class="list-main small">
                    {MEAS_FIELDS.filter(([f]) => m[f] != null).map(([f, label]) => `${label} ${fmtNumber(m[f], 1)}`).join(" · ")}
                  </div>
                </div>
              ))}
              {measurements.value.length === 0 && <Empty title="Belum ada ukuran" action={<Button sm onClick={() => setMeasSheet(true)}>+ Catat Ukuran</Button>} />}
            </div>
          </Card>
        </>
      )}

      {tab === "goal" && <Goals />}

      {tab === "pr" && (
        <Card title="Personal Records">
          {prList.length === 0 ? (
            <Empty title="Belum ada PR" sub="Selesaikan latihan untuk mencatat rekor." />
          ) : (
            prList.map((p) => (
              <div key={p.nama} class="list-row">
                <IconTrophy style={{ width: 20, height: 20, color: "var(--accent)" }} />
                <div class="list-main"><div>{p.nama}</div><div class="small muted">{fmtDate(p.tanggal)}</div></div>
                <span style={{ fontWeight: 700 }}>{p.best} <span class="small muted">reps</span></span>
              </div>
            ))
          )}
        </Card>
      )}

      {tab === "photo" && <Photos />}

      <WeightSheet open={weightSheet} onClose={() => setWeightSheet(false)} onSaved={() => {}} />
      <MeasurementSheet open={measSheet} onClose={() => setMeasSheet(false)} onSaved={() => {}} />
    </div>
  );
}
