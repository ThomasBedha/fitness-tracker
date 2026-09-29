import {
  signUp, signIn, signOut, getUser, onAuthChange,
  fetchEntries, upsertEntry, deleteEntry,
  fetchTodos, fetchAllTodos, insertTodos, updateTodo, deleteTodo,
} from "./supabase.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

window.addEventListener("error", (e) => {
  console.error("Runtime error:", e.error || e.message);
  try { toast("Error: " + (e.error?.message || e.message), "err"); } catch {}
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled rejection:", e.reason);
  try { toast("Error: " + (e.reason?.message || e.reason), "err"); } catch {}
});

const ROTATION = {
  0: { sesi: "Rest", label: "Minggu - Rest" },
  1: { sesi: "A", label: "Senin - Sesi A (Push)" },
  2: { sesi: "D", label: "Selasa - Kardio" },
  3: { sesi: "C", label: "Rabu - Sesi C (Pull+Core)" },
  4: { sesi: "Rest", label: "Kamis - Rest" },
  5: { sesi: "B", label: "Jumat - Sesi B (Legs)" },
  6: { sesi: "D", label: "Sabtu - Sesi D (Kardio+Circuit)" },
};

const CHECKLISTS = {
  A: [
    { judul: "Push-up biasa 3 x 8-15", jenis: "A" },
    { judul: "Pike push-up 3 x 6-12", jenis: "A" },
    { judul: "Dips kursi 3 x 8-12", jenis: "A" },
    { judul: "Push-up lebar 2 x 10-15", jenis: "A" },
    { judul: "Plank 3 x 30-60 dtk", jenis: "A" },
  ],
  B: [
    { judul: "Squat bodyweight 3 x 15-20", jenis: "B" },
    { judul: "Split squat 3 x 10-12", jenis: "B" },
    { judul: "Glute bridge 3 x 15-20", jenis: "B" },
    { judul: "Wall sit 3 x 30-60 dtk", jenis: "B" },
    { judul: "Calf raise 3 x 20", jenis: "B" },
  ],
  C: [
    { judul: "Pull-up / towel row 3 x 10-12", jenis: "C" },
    { judul: "Superman 3 x 12-15", jenis: "C" },
    { judul: "Dead bug 3 x 10/sisi", jenis: "C" },
    { judul: "Hollow hold 3 x 20-40 dtk", jenis: "C" },
  ],
  D: [
    { judul: "Circuit 3 putaran (burpee, jumping jack, mountain climber, squat jump, high knee)", jenis: "D" },
    { judul: "Jalan cepat 30-45 menit", jenis: "D" },
  ],
  Rest: [
    { judul: "Stretching ringan 10 menit", jenis: "Rest" },
  ],
};

const HABITS = [
  { judul: "Minum air 2-3 L", jenis: "Habit" },
  { judul: "Protein 110-130g", jenis: "Habit" },
  { judul: "Tidur 7-8 jam", jenis: "Habit" },
];

const state = {
  user: null,
  entries: [],
  todos: [],
  allTodos: [],
  todoDate: todayStr(),
  range: 30,
  editingEntryId: null,
};

function todayStr() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function formatDate(s) {
  if (!s) return "-";
  const [y, m, d] = s.split("-");
  const bulan = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  return `${d} ${bulan[+m - 1]} ${y}`;
}

function toast(msg, type = "") {
  const el = $("#toast");
  el.textContent = msg;
  el.className = "toast show " + type;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.className = "toast " + type; }, 2600);
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------------- AUTH ---------------- */
let authMode = "signin";

function setAuthMode(mode) {
  authMode = mode;
  const daftar = mode === "signup";
  $("#authBtn").textContent = daftar ? "Daftar" : "Masuk";
  $("#authToggle").textContent = daftar ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar";
  $("#authPassword").autocomplete = daftar ? "new-password" : "current-password";
  $("#authMsg").textContent = "";
}

$("#authToggle").addEventListener("click", () => setAuthMode(authMode === "signup" ? "signin" : "signup"));

$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const msg = $("#authMsg");
  const btn = $("#authBtn");
  btn.disabled = true;
  const prev = btn.textContent;
  btn.textContent = "Memuat...";
  try {
    const fn = authMode === "signup" ? signUp : signIn;
    const { data, error } = await fn(email, password);
    if (error) throw error;
    if (data.session) {
      msg.textContent = "Berhasil. Memuat...";
      msg.className = "auth-msg ok";
      showApp(data.session.user);
    } else if (authMode === "signup") {
      msg.textContent = "Akun dibuat. Cek email verifikasi untuk aktifkan akun.";
      msg.className = "auth-msg ok";
    } else {
      msg.textContent = "Login berhasil tapi sesi kosong. Coba lagi.";
      msg.className = "auth-msg";
    }
  } catch (err) {
    msg.textContent = err.message || err.error_description || "Gagal. Coba lagi.";
    msg.className = "auth-msg";
  } finally {
    btn.disabled = false;
    btn.textContent = prev;
  }
});

async function handleLogout() {
  await signOut();
  state.user = null;
  state.entries = [];
  state.todos = [];
  state.allTodos = [];
}

$("#logoutBtn").addEventListener("click", handleLogout);
$("#infoLogout").addEventListener("click", handleLogout);

function showApp(user) {
  state.user = user;
  $("#authScreen").hidden = true;
  $("#app").hidden = false;
  loadAll();
}

function showAuth() {
  $("#authScreen").hidden = false;
  $("#app").hidden = true;
}

/* ---------------- TABS ---------------- */
$$(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    $$(".tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
    const tab = btn.dataset.tab;
    $$(".tab-panel").forEach((p) => { p.hidden = p.id !== "tab-" + tab; });
    if (tab === "progress") await loadAll();
    if (tab === "todo") await loadTodos();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

/* ---------------- ENTRIES ---------------- */
async function loadAll() {
  try {
    state.entries = await fetchEntries();
  } catch (e) {
    console.error("fetchEntries:", e);
    toast(e.message || "Gagal muat data. Cek tabel Supabase / RLS.", "err");
    state.entries = state.entries || [];
  }
  renderSummary();
  renderTrend();
  renderConsistency();
  renderHistory();
}

$("#logForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const entry = {
    tanggal: $("#logTanggal").value,
    sesi: $("#logSesi").value || null,
    berat: $("#logBerat").value ? Number($("#logBerat").value) : null,
    lingkar_perut: $("#logLingkar").value ? Number($("#logLingkar").value) : null,
    mood: $("#logMood").value || null,
    catatan: $("#logCatatan").value.trim() || null,
  };
  if (!entry.tanggal) return toast("Tanggal wajib", "err");
  if (state.editingEntryId) entry.id = state.editingEntryId;
  try {
    await upsertEntry(entry);
    toast(state.editingEntryId ? "Diperbarui" : "Tersimpan", "ok");
    resetLogForm();
    await loadAll();
    switchTab("progress");
  } catch (e2) {
    toast(e2.message || "Gagal simpan", "err");
  }
});

$("#logCancel").addEventListener("click", resetLogForm);

function resetLogForm() {
  state.editingEntryId = null;
  $("#logForm").reset();
  $("#logTanggal").value = todayStr();
  $("#logCancel").hidden = true;
}

function editEntry(id) {
  const e = state.entries.find((x) => x.id === id);
  if (!e) return;
  state.editingEntryId = id;
  $("#logTanggal").value = e.tanggal || "";
  $("#logSesi").value = e.sesi || "";
  $("#logBerat").value = e.berat ?? "";
  $("#logLingkar").value = e.lingkar_perut ?? "";
  $("#logMood").value = e.mood || "";
  $("#logCatatan").value = e.catatan || "";
  $("#logCancel").hidden = false;
  switchTab("log");
}

async function removeEntry(id) {
  if (!confirm("Hapus entri ini?")) return;
  try {
    await deleteEntry(id);
    toast("Terhapus", "ok");
    await loadAll();
  } catch (e) {
    toast(e.message || "Gagal hapus", "err");
  }
}

function switchTab(tab) {
  const btn = document.querySelector(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.click();
}

/* ---------------- TODO ---------------- */
$("#todoDate").value = state.todoDate;
$("#todoDate").addEventListener("change", async (e) => {
  state.todoDate = e.target.value || todayStr();
  await loadTodos();
});

async function loadTodos() {
  try {
    state.todos = await fetchTodos(state.todoDate);
    state.allTodos = await fetchAllTodos();
    renderTodos();
  } catch (e) {
    toast(e.message || "Gagal muat todo", "err");
  }
}

function renderTodos() {
  const list = $("#todoList");
  const items = state.todos;
  const done = items.filter((t) => t.selesai).length;
  const total = items.length;
  $("#todoCount").textContent = `${done}/${total}`;
  $("#todoBarFill").style.width = total ? `${(done / total) * 100}%` : "0%";

  const streak = computeStreak();
  $("#todoStreak").textContent = streak > 0 ? `Streak: ${streak} hari (semua todo kelar)` : "Belum ada streak. Selesaikan semua todo hari ini.";

  if (!items.length) {
    list.innerHTML = `<div class="todo-empty">Belum ada todo. Klik "Generate checklist dari jadwal hari ini" atau tambah custom.</div>`;
    return;
  }

  list.innerHTML = items.map((t) => `
    <li class="todo-item ${t.selesai ? "done" : ""}">
      <input type="checkbox" class="todo-check" data-id="${t.id}" ${t.selesai ? "checked" : ""}>
      <span class="todo-text">${escapeHtml(t.judul)}</span>
      ${t.jenis ? `<span class="todo-jenis">${escapeHtml(t.jenis)}</span>` : ""}
      <button class="todo-del" data-del="${t.id}" title="Hapus">&times;</button>
    </li>`).join("");

  list.querySelectorAll(".todo-check").forEach((c) =>
    c.addEventListener("change", async () => {
      const id = c.dataset.id;
      try {
        const updated = await updateTodo(id, { selesai: c.checked });
        const i = state.todos.findIndex((t) => t.id === id);
        if (i >= 0) state.todos[i] = updated;
        renderTodos();
      } catch (e) {
        toast(e.message || "Gagal update", "err");
        c.checked = !c.checked;
      }
    }));

  list.querySelectorAll(".todo-del").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await deleteTodo(b.dataset.del);
        state.todos = state.todos.filter((t) => t.id !== b.dataset.del);
        renderTodos();
      } catch (e) {
        toast(e.message || "Gagal hapus", "err");
      }
    }));
}

function computeStreak() {
  const byDate = {};
  state.allTodos.forEach((t) => {
    byDate[t.tanggal] = byDate[t.tanggal] || { total: 0, done: 0 };
    byDate[t.tanggal].total++;
    if (t.selesai) byDate[t.tanggal].done++;
  });
  const full = new Set(Object.entries(byDate).filter(([, v]) => v.total > 0 && v.done === v.total).map(([k]) => k));
  let streak = 0;
  const d = new Date(state.todoDate + "T00:00:00");
  if (!full.has(state.todoDate)) return 0;
  while (full.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

$("#todoForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const judul = $("#todoInput").value.trim();
  if (!judul) return;
  try {
    const [created] = await insertTodos([{ tanggal: state.todoDate, judul, jenis: "Custom" }]);
    state.todos.push(created);
    $("#todoInput").value = "";
    renderTodos();
  } catch (e2) {
    toast(e2.message || "Gagal tambah", "err");
  }
});

$("#todoGenBtn").addEventListener("click", async () => {
  const dow = new Date(state.todoDate + "T00:00:00").getDay();
  const sesi = ROTATION[dow].sesi;
  const existing = new Set(state.todos.map((t) => t.judul));
  const rows = [...CHECKLISTS[sesi], ...HABITS]
    .filter((r) => !existing.has(r.judul))
    .map((r) => ({ tanggal: state.todoDate, judul: r.judul, jenis: r.jenis }));
  if (!rows.length) return toast("Checklist sudah ada semua", "");
  try {
    const created = await insertTodos(rows);
    state.todos.push(...created);
    renderTodos();
    toast(`Ditambah ${created.length} todo (${ROTATION[dow].label})`, "ok");
  } catch (e) {
    toast(e.message || "Gagal generate", "err");
  }
});

/* ---------------- CHARTS ---------------- */
let chartUid = 0;

function seriesByDate(key) {
  const map = new Map();
  [...state.entries]
    .filter((e) => e[key] != null)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .forEach((e) => map.set(e.tanggal, Number(e[key])));
  return Array.from(map.entries()).map(([t, v]) => ({ t, v }));
}

function filtered(data) {
  if (state.range === "all") return data;
  const days = Number(state.range);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const c = cutoff.toISOString().slice(0, 10);
  return data.filter((d) => d.t >= c);
}

function renderSummary() {
  const berat = seriesByDate("berat");
  const ling = seriesByDate("lingkar_perut");
  setSummary(berat, "#sumBeratNow", "#sumBeratDelta", "#sparkBerat", "kg");
  setSummary(ling, "#sumLingkarNow", "#sumLingkarDelta", "#sparkLingkar", "cm", true);
}

function setSummary(data, nowSel, deltaSel, sparkSel, unit, lowerBetter = true) {
  if (!data.length) {
    $(nowSel).textContent = "-";
    $(deltaSel).textContent = "belum ada data";
    $(deltaSel).className = "summary-delta";
    $(sparkSel).innerHTML = "";
    return;
  }
  const first = data[0].v;
  const last = data[data.length - 1].v;
  const diff = last - first;
  $(nowSel).textContent = last.toFixed(unit === "cm" ? 1 : 2) + " " + unit;
  const sign = diff > 0 ? "+" : "";
  const cls = diff === 0 ? "" : (diff < 0) === lowerBetter ? "down" : "up";
  $(deltaSel).textContent = `${sign}${diff.toFixed(unit === "cm" ? 1 : 2)} ${unit} (awal ${first.toFixed(unit === "cm" ? 1 : 2)})`;
  $(deltaSel).className = "summary-delta " + cls;
  drawSparkline($(sparkSel), data.map((d) => d.v), diff <= 0);
}

function drawSparkline(svg, values, good) {
  if (values.length < 1) { svg.innerHTML = ""; return; }
  const w = 100, h = 28, pad = 3;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const pts = values.map((v, i) => {
    const x = n === 1 ? w / 2 : pad + (i / (n - 1)) * (w - 2 * pad);
    const y = h - pad - ((v - min) / span) * (h - 2 * pad);
    return [x, y];
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
  const color = good ? "var(--green)" : "var(--accent)";
  const gid = "sg" + (++chartUid);
  svg.innerHTML = `
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".35"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="2.2" fill="${color}"/>`;
}

function renderTrend() {
  const svg = $("#trendChart");
  const W = 360, H = 240;
  const padL = 38, padR = 40, padT = 16, padB = 30;
  const berat = filtered(seriesByDate("berat"));
  const ling = filtered(seriesByDate("lingkar_perut"));

  if (!berat.length && !ling.length) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#9aa2b1" font-size="13">Belum ada data</text>`;
    return;
  }

  const allDates = Array.from(new Set([...berat, ...ling].map((d) => d.t))).sort();
  const xFor = (t) => {
    if (allDates.length === 1) return (padL + (W - padL - padR)) / 2;
    const i = allDates.indexOf(t);
    return padL + (i / (allDates.length - 1)) * (W - padL - padR);
  };

  function scale(data) {
    const vals = data.map((d) => d.v);
    let min = Math.min(...vals), max = Math.max(...vals);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.15;
    min -= pad; max += pad;
    return {
      min, max,
      yFor: (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB),
    };
  }
  const sB = berat.length ? scale(berat) : null;
  const sL = ling.length ? scale(ling) : null;

  const gridLines = 4;
  let g = "";
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (i / gridLines) * (H - padT - padB);
    g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#2a2f3a" stroke-width="1"/>`;
  }

  const xLabels = xTickLabels(allDates, xFor, H, padB);

  const defs = `
    <defs>
      <linearGradient id="gBerat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff6b2c" stop-opacity=".28"/>
        <stop offset="100%" stop-color="#ff6b2c" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="gLing" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4aa8ff" stop-opacity=".22"/>
        <stop offset="100%" stop-color="#4aa8ff" stop-opacity="0"/>
      </linearGradient>
    </defs>`;

  const pathFor = (data, s) => data.map((d, i) => `${i ? "L" : "M"}${xFor(d.t).toFixed(1)} ${s.yFor(d.v).toFixed(1)}`).join(" ");
  const areaFor = (data, s) => {
    if (!data.length) return "";
    const line = pathFor(data, s);
    const y0 = H - padB;
    return `${line} L${xFor(data[data.length - 1].t).toFixed(1)} ${y0} L${xFor(data[0].t).toFixed(1)} ${y0} Z`;
  };

  const axisB = sB ? yAxisLabels(sB, padL, W, H, padB, "#ff6b2c") : "";
  const axisL = sL ? yAxisLabels(sL, padL, W, H, padB, "#4aa8ff", true) : "";

  const dotsB = berat.map((d) => dot(xFor(d.t), sB.yFor(d.v), "#ff6b2c", d, "kg")).join("");
  const dotsL = ling.map((d) => dot(xFor(d.t), sL.yFor(d.v), "#4aa8ff", d, "cm")).join("");

  svg.innerHTML = defs + `
    ${g}
    ${sB ? `<path d="${areaFor(berat, sB)}" fill="url(#gBerat)"/>` : ""}
    ${sL ? `<path d="${areaFor(ling, sL)}" fill="url(#gLing)"/>` : ""}
    ${sL ? `<path class="draw" d="${pathFor(ling, sL)}" fill="none" stroke="#4aa8ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    ${sB ? `<path class="draw" d="${pathFor(berat, sB)}" fill="none" stroke="#ff6b2c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    ${axisB}${axisL}
    ${xLabels}
    ${dotsB}${dotsL}`;

  svg.querySelectorAll(".draw").forEach((p) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.getBoundingClientRect();
    p.style.transition = "stroke-dashoffset .8s ease";
    p.style.strokeDashoffset = 0;
  });
}

function xTickLabels(dates, xFor, H, padB) {
  if (!dates.length) return "";
  const maxTicks = 5;
  const step = Math.max(1, Math.ceil(dates.length / maxTicks));
  let out = "";
  for (let i = 0; i < dates.length; i += step) {
    const t = dates[i];
    const [, m, d] = t.split("-");
    out += `<text x="${xFor(t).toFixed(1)}" y="${H - padB + 16}" text-anchor="middle" fill="#9aa2b1" font-size="10">${d}/${m}</text>`;
  }
  return out;
}

function yAxisLabels(s, padL, W, H, padB, color, right = false) {
  const n = 3;
  let out = "";
  for (let i = 0; i <= n; i++) {
    const v = s.max - (i / n) * (s.max - s.min);
    const y = padT0(H, padB, i, n);
    const x = right ? W - 4 : padL - 6;
    out += `<text x="${x}" y="${y + 3}" text-anchor="${right ? "end" : "end"}" fill="${color}" font-size="9.5" opacity=".85">${v.toFixed(0)}</text>`;
  }
  return out;
}

function padT0(H, padB, i, n) {
  const padT = 16;
  return padT + (i / n) * (H - padT - padB);
}

function dot(x, y, color, d, unit) {
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#171a21" stroke="${color}" stroke-width="2">
    <title>${formatDate(d.t)}: ${d.v} ${unit}</title></circle>`;
}

function renderConsistency() {
  const svg = $("#consistChart");
  const W = 360, H = 160;
  const padL = 30, padR = 10, padT = 14, padB = 26;
  const weeks = {};
  state.entries.forEach((e) => {
    if (!e.sesi || e.sesi === "Rest") return;
    const d = new Date(e.tanggal + "T00:00:00");
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    const key = monday.toISOString().slice(0, 10);
    weeks[key] = (weeks[key] || 0) + 1;
  });
  const keys = Object.keys(weeks).sort().slice(-8);
  if (!keys.length) {
    svg.innerHTML = `<text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="#9aa2b1" font-size="13">Belum ada sesi tercatat</text>`;
    return;
  }
  const maxV = Math.max(4, ...keys.map((k) => weeks[k]));
  const n = keys.length;
  const bw = (W - padL - padR) / n * 0.6;
  const gap = (W - padL - padR) / n;
  let bars = "";
  keys.forEach((k, i) => {
    const v = weeks[k];
    const bh = (v / maxV) * (H - padT - padB);
    const x = padL + i * gap + (gap - bw) / 2;
    const y = H - padB - bh;
    const [, m, d] = k.split("-");
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="4" fill="#ff6b2c" opacity=".9"><title>Minggu ${d}/${m}: ${v} sesi</title></rect>`;
    bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${H - padB + 14}" text-anchor="middle" fill="#9aa2b1" font-size="9">${d}/${m}</text>`;
    bars += `<text x="${(x + bw / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" text-anchor="middle" fill="#e8eaed" font-size="10" font-weight="600">${v}</text>`;
  });
  svg.innerHTML = `
    <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#2a2f3a"/>
    ${bars}`;
}

function renderHistory() {
  const wrap = $("#historyWrap");
  if (!state.entries.length) {
    wrap.innerHTML = `<div class="todo-empty">Belum ada riwayat.</div>`;
    return;
  }
  wrap.innerHTML = state.entries.map((e) => `
    <div class="history-row">
      <span class="history-date">${formatDate(e.tanggal)}</span>
      <div class="history-main">
        ${e.berat != null ? `<span class="history-metric">BB <b>${e.berat}</b> kg</span>` : ""}
        ${e.lingkar_perut != null ? `<span class="history-metric">Perut <b>${e.lingkar_perut}</b> cm</span>` : ""}
        ${e.sesi ? `<span class="history-metric">Sesi <b>${escapeHtml(e.sesi)}</b></span>` : ""}
        ${e.mood ? `<span class="history-metric">${escapeHtml(e.mood)}</span>` : ""}
        ${e.catatan ? `<span class="history-note">${escapeHtml(e.catatan)}</span>` : ""}
      </div>
      <div class="history-actions">
        <button class="icon-btn" data-edit="${e.id}" title="Edit">&#9998;</button>
        <button class="icon-btn del" data-remove="${e.id}" title="Hapus">&times;</button>
      </div>
    </div>`).join("");

  wrap.querySelectorAll("[data-edit]").forEach((b) => b.addEventListener("click", () => editEntry(b.dataset.edit)));
  wrap.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => removeEntry(b.dataset.remove)));
}

$("#rangeSeg").addEventListener("click", (e) => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  state.range = btn.dataset.range === "all" ? "all" : Number(btn.dataset.range);
  $$(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
  renderTrend();
});

/* ---------------- INIT ---------------- */
async function init() {
  setAuthMode("signin");
  $("#logTanggal").value = todayStr();
  $("#todoDate").value = todayStr();

  onAuthChange((u) => {
    if (u) {
      if (!state.user) showApp(u);
    } else {
      if (state.user) showAuth();
    }
  });

  try {
    const user = await getUser();
    if (user) showApp(user);
    else showAuth();
  } catch (e) {
    console.error(e);
    showAuth();
    $("#authMsg").textContent = "Koneksi ke server gagal. Cek internet lalu refresh.";
  }
}

init();
