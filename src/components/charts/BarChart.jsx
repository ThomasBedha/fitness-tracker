export function BarChart({ data = [], height = 160, unit = "" }) {
  const W = 360, H = height;
  const padL = 26, padR = 10, padT = 16, padB = 26;
  if (!data.length) {
    return (
      <svg class="chart" viewBox={`0 0 ${W} ${H}`}>
        <text x={W / 2} y={H / 2} text-anchor="middle" fill="var(--muted)" font-size="13">Belum ada data</text>
      </svg>
    );
  }
  const maxV = Math.max(1, ...data.map((d) => d.v));
  const n = data.length;
  const gap = (W - padL - padR) / n;
  const bw = gap * 0.6;
  return (
    <svg class="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border)" />
      {data.map((d, i) => {
        const bh = (d.v / maxV) * (H - padT - padB);
        const x = padL + i * gap + (gap - bw) / 2;
        const y = H - padB - bh;
        return (
          <g key={i}>
            <rect x={x.toFixed(1)} y={y.toFixed(1)} width={bw.toFixed(1)} height={bh.toFixed(1)} rx="4" fill="var(--accent)" opacity=".88">
              <title>{`${d.label}: ${d.v} ${unit}`}</title>
            </rect>
            <text x={(x + bw / 2).toFixed(1)} y={(y - 4).toFixed(1)} text-anchor="middle" fill="var(--text)" font-size="10" font-weight="600">{d.v}</text>
            <text x={(x + bw / 2).toFixed(1)} y={H - padB + 14} text-anchor="middle" fill="var(--muted)" font-size="9">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
