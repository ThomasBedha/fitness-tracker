import { createClient } from "./vendor/supabase.js";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export async function signUp(email, password) {
  return supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export function onAuthChange(cb) {
  return supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
}

export async function fetchEntries() {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function upsertEntry(entry) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  if (!user_id) throw new Error("Belum login");

  if (entry.id) {
    const { data, error } = await supabase
      .from("entries")
      .update(entry)
      .eq("id", entry.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from("entries")
    .insert({ ...entry, user_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEntry(id) {
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchTodos(tanggal) {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("tanggal", tanggal)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllTodos() {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .order("tanggal", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function insertTodos(rows) {
  const { data: userData } = await supabase.auth.getUser();
  const user_id = userData?.user?.id;
  if (!user_id) throw new Error("Belum login");
  const payload = rows.map((r) => ({ ...r, user_id }));
  const { data, error } = await supabase.from("todos").insert(payload).select();
  if (error) throw error;
  return data ?? [];
}

export async function updateTodo(id, patch) {
  const { data, error } = await supabase
    .from("todos")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTodo(id) {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) throw error;
}
