export function Card({ title, children, class: cls = "", tight, style }) {
  return (
    <div class={`card ${tight ? "tight" : ""} ${cls}`} style={style}>
      {title && <div class="card-title">{title}</div>}
      {children}
    </div>
  );
}

export function Button({ children, variant = "primary", block, sm, onClick, disabled, type = "button", class: cls = "", icon }) {
  return (
    <button
      type={type}
      class={`btn btn-${variant} ${block ? "btn-block" : ""} ${sm ? "btn-sm" : ""} ${cls}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}{children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <label class="field">
      {label && <span>{label}</span>}
      {children}
    </label>
  );
}

export function Input({ value, onInput, type = "text", ...rest }) {
  return (
    <input
      class="input"
      type={type}
      value={value ?? ""}
      onInput={(e) => onInput?.(e.target.value, e)}
      {...rest}
    />
  );
}

export function ProgressBar({ value, max = 100, variant = "", label }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div>
      {label && <div class="row between small muted mb">{label}</div>}
      <div class="bar">
        <div class={`bar-fill ${variant}`} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

export function Empty({ title, sub, action }) {
  return (
    <div class="empty">
      <div class="empty-icon">◌</div>
      <div class="empty-title">{title}</div>
      {sub && <div class="small">{sub}</div>}
      {action && <div class="mt">{action}</div>}
    </div>
  );
}

export function Stat({ num, label, class: cls = "" }) {
  return (
    <div class="stat">
      <span class={`stat-num ${cls}`}>{num}</span>
      <span class="stat-label">{label}</span>
    </div>
  );
}

export function Delta({ value, unit = "", lowerBetter = true, dec = 1 }) {
  if (value == null || isNaN(value)) return <span class="delta-flat">-</span>;
  const sign = value > 0 ? "+" : "";
  const flat = Math.abs(value) < 0.05;
  const good = flat ? false : ((value < 0) === lowerBetter);
  const cls = flat ? "delta-flat" : good ? "delta-down" : "delta-up";
  const arrow = flat ? "→" : value < 0 ? "↓" : "↑";
  return <span class={cls}>{arrow} {sign}{value.toFixed(dec)}{unit}</span>;
}

export function Spinner() {
  return (
    <div class="empty">
      <div class="skeleton" style={{ width: 120, height: 14, margin: "0 auto 8px" }} />
      <div class="skeleton" style={{ width: 80, height: 12, margin: "0 auto" }} />
    </div>
  );
}
