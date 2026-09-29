import { useState } from "preact/hooks";
import { Sheet } from "./Sheet.jsx";
import { IconPlus, IconWeight, IconChart, IconFood, IconDumbbell, IconCamera } from "./icons.jsx";

export function QuickAdd({ onAddWeight, onAddMeasurement, onAddFood, onStartWorkout, onAddPhoto }) {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "Catat Berat", Icon: IconWeight, fn: onAddWeight },
    { label: "Catat Ukuran Tubuh", Icon: IconChart, fn: onAddMeasurement },
    { label: "Catat Makanan", Icon: IconFood, fn: onAddFood },
    { label: "Mulai Latihan", Icon: IconDumbbell, fn: onStartWorkout },
    { label: "Progress Photo", Icon: IconCamera, fn: onAddPhoto },
  ];
  return (
    <>
      <button class="fab" onClick={() => setOpen(true)} aria-label="Quick add">
        <IconPlus />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Tambah Cepat">
        <div class="list-row" style={{ flexDirection: "column", alignItems: "stretch", gap: ".5rem", border: "none" }}>
          {items.map(({ label, Icon, fn }) => (
            <button key={label} class="btn btn-ghost btn-block" style={{ justifyContent: "flex-start" }}
              onClick={() => { setOpen(false); fn?.(); }}>
              <Icon style={{ width: 20, height: 20 }} /> {label}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
