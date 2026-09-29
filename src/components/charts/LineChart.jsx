export function LineChart({ series = [], trend = null, height = 240, unit = "", fmt = (v) => v }) {
  const W = 360, H = height;
  const padL = 38, padR = 14, padT = 16, padB = 30;
  const colors = ["var(--accent)", "var(--blue)", "var(--green)", "var(--yellow)"];

  const valid = series.filter((s) => s.data && s.data.length);
  if (!valid.length) {
    return (
      <svg class="chart" viewBox={`0 0 ${W} ${H}`}>
        <text x={W / 2} y={H / 2} text-anchor="middle" fill="var(--muted)" font-size="13">Belum ada data</text>
      </svg>
    );
  }

  const allDates = Array.from(new Set(valid.flatMap((s) => s.data.map((d) => d.t)))).sort();
  const xFor = (t) => {
    if (allDates.length === 1) return (padL + (W - padR)) / 2;
    const i = allDates.indexOf(t);
    return padL + (i / (allDates.length - 1)) * (W - padL - padR);
  };

  const allVals = valid.flatMap((s) => s.data.map((d) => d.v));
  if (trend) trend.forEach((d) => allVals.push(d.v));
  let min = Math.min(...allVals), max = Math.max(...allVals);
  if (min === max) { min -= 1; max += 1; }
  const padv = (max - min) * 0.15;
  min -= padv; max += padv;
  const yFor = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const grid = [];
  for (let i = 0; i <= 4; i++) {
    const y = padT + (i / 4) * (H - padT - padB);
    const val = max - (i / 4) * (max - min);
    grid.push(
      <g key={i}>
        <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--border)" stroke-width="1" />
        <text x={padL - 6} y={y + 3} text-anchor="end" fill="var(--muted)" font-size="9">{val.toFixed(0)}</text>
      </g>
    );
  }

  const pathFor = (data) => data.map((d, i) => `${i ? "L" : "M"}${xFor(d.t).toFixed(1)} ${yFor(d.v).toFixed(1)}`).join(" ");

  const ticks = [];
  const step = Math.max(1, Math.ceil(allDates.length / 5));
  for (let i = 0; i < allDates.length; i += step) {
    const [, m, d] = allDates[i].split("-");
    ticks.push(<text key={allDates[i]} x={xFor(allDates[i]).toFixed(1)} y={H - padB + 15} text-anchor="middle" fill="var(--muted)" font-size="9.5">{d}/{m}</text>);
  }

  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {grid}
      {trend && trend.length > 1 && (
        <path d={pathFor(trend)} fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4" opacity=".8" />
      )}
      {valid.map((s, si) => {
        const c = s.color || colors[si % colors.length];
        return (
          <g key={si}>
            <path d={pathFor(s.data)} fill="none" stroke={c} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            {s.data.map((d, i) => (
              <circle key={i} cx={xFor(d.t).toFixed(1)} cy={yFor(d.v).toFixed(1)} r="2.8" fill="var(--surface)" stroke={c} stroke-width="2">
                <title>{`${d.t}: ${fmt(d.v)} ${unit}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {ticks}
    </svg>
  );
}
