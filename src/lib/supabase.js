import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_KEY } from "../config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/* ---------- auth ---------- */
export const signUp = (email, password) => supabase.auth.signUp({ email, password });
export const signIn = (email, password) => supabase.auth.signInWithPassword({ email, password });
export const signOut = () => supabase.auth.signOut();
export const getUser = async () => (await supabase.auth.getUser()).data?.user ?? null;
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_e, s) => cb(s?.user ?? null));

/* ---------- generic helpers ---------- */
export async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export async function list(table, order = null) {
  let q = supabase.from(table).select("*");
  if (order) q = q.order(order.by, { ascending: order.asc ?? false });
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function insert(table, rows) {
  const { data, error } = await supabase.from(table).insert(rows).select();
  if (error) throw error;
  return data ?? [];
}

export async function update(table, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function upsert(table, row, onConflict) {
  const { data, error } = await supabase.from(table).upsert(row, { onConflict }).select();
  if (error) throw error;
  return data ?? [];
}
