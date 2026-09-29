import { signal } from "@preact/signals";

export const toastState = signal(null);

let timer = null;
export function toast(msg, type = "") {
  toastState.value = { msg, type, id: Date.now() };
  clearTimeout(timer);
  timer = setTimeout(() => { toastState.value = null; }, 2800);
}

export function Toast() {
  const t = toastState.value;
  if (!t) return <div class="toast" />;
  return <div class={`toast show ${t.type}`}>{t.msg}</div>;
}
