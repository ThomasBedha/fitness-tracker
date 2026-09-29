import { useState } from "preact/hooks";
import { signIn, signUp } from "../lib/supabase.js";
import { Field, Input, Button } from "../components/ui.jsx";

export function Auth({ onDone }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg("");
    try {
      const fn = mode === "signup" ? signUp : signIn;
      const { data, error } = await fn(email.trim(), password);
      if (error) throw error;
      if (data.session) { onDone?.(data.session.user); }
      else if (mode === "signup") setMsg("Akun dibuat. Cek email verifikasi.");
      else setMsg("Login berhasil tapi sesi kosong.");
    } catch (err) {
      setMsg(err.message || err.error_description || "Gagal. Coba lagi.");
    } finally { setBusy(false); }
  }

  return (
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="brand">
          <svg viewBox="0 0 64 64"><path d="M14 40 L26 40 L30 22 L36 48 L41 32 L50 32" /></svg>
          <span>Fitness Tracker</span>
        </div>
        <p class="muted small" style={{ margin: ".6rem 0 1.2rem" }}>Masuk untuk sinkron data di semua device.</p>
        <form onSubmit={submit}>
          <Field label="Email"><Input type="email" value={email} onInput={setEmail} autocomplete="email" placeholder="nama@email.com" required /></Field>
          <Field label="Password"><Input type="password" value={password} onInput={setPassword} autocomplete={mode === "signup" ? "new-password" : "current-password"} minlength="6" placeholder="min. 6 karakter" required /></Field>
          <Button block disabled={busy} type="submit">{busy ? "Memuat..." : mode === "signup" ? "Daftar" : "Masuk"}</Button>
        </form>
        {msg && <p class="small mt" style={{ color: "var(--red)" }}>{msg}</p>}
        <button class="btn btn-ghost btn-block mt" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(""); }}>
          {mode === "signup" ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar"}
        </button>
      </div>
    </div>
  );
}
