import { addDays, todayStr, parseDate } from "../../lib/format.js";

export function Heatmap({ activities, sessions, days = 91 }) {
  const start = addDays(todayStr(), -(days - 1));
  const counts = {};
  activities.forEach((a) => { counts[a.tanggal] = (counts[a.tanggal] || 0) + 1; });
  sessions.filter((s) => s.status === "completed").forEach((s) => { counts[s.tanggal] = (counts[s.tanggal] || 0) + 2; });

  const cells = [];
  let d = start;
  // align first cell to Monday column start
  const startDow = (parseDate(start).getDay() + 6) % 7;
  for (let i = 0; i < startDow; i++) cells.push(<div key={"pad" + i} class="hm-cell" style={{ visibility: "hidden" }} />);

  while (d <= todayStr()) {
    const c = counts[d] || 0;
    const lvl = c === 0 ? 0 : c <= 1 ? 1 : c <= 3 ? 2 : c <= 5 ? 3 : 4;
    cells.push(<div key={d} class={`hm-cell hm-${lvl}`} title={`${d}: ${c} aktivitas`} />);
    d = addDays(d, 1);
  }

  return (
    <div>
      <div class="heatmap">{cells}</div>
      <div class="row between small muted mt" style={{ fontSize: ".7rem" }}>
        <span>{start}</span>
        <span class="row" style={{ gap: ".25rem" }}>
          kurang
          <i class="hm-cell hm-0" /> <i class="hm-cell hm-1" /> <i class="hm-cell hm-2" /> <i class="hm-cell hm-3" /> <i class="hm-cell hm-4" />
          banyak
        </span>
        <span>{todayStr()}</span>
      </div>
    </div>
  );
}
