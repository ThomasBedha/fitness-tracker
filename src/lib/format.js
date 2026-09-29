const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

export function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function parseDate(s) {
  return new Date(s + "T00:00:00");
}

export function fmtDate(s, opts = {}) {
  if (!s) return "-";
  const [y, m, d] = s.split("-");
  if (opts.long) return `${+d} ${BULAN[+m - 1]} ${y}`;
  return `${d}/${m}/${y}`;
}

export function fmtDayName(s) {
  if (!s) return "";
  return HARI[parseDate(s).getDay()];
}

export function fmtNumber(n, dec = 0) {
  if (n == null || n === "") return "-";
  return Number(n).toLocaleString("id-ID", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtDuration(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function dayIndex(s) {
  return parseDate(s).getDay();
}

export function addDays(s, n) {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function weekMonday(s) {
  const d = parseDate(s);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}

export function fmtGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

export function fmtTanggalPanjang(s) {
  const d = s ? parseDate(s) : new Date();
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export { BULAN, HARI };
