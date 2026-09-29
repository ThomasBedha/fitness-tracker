import { supabase } from "./supabase.js";
import { BUFFER } from "../config.js";

async function fileToBitmap(file) {
  if (typeof createImageBitmap === "function") return createImageBitmap(file);
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

export async function compressImage(file, maxDim = 1600, quality = 0.82) {
  const bmp = await fileToBitmap(file);
  const w0 = bmp.width, h0 = bmp.height;
  const scale = Math.min(1, maxDim / Math.max(w0, h0));
  const w = Math.round(w0 * scale), h = Math.round(h0 * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality));
  if (bmp.close) bmp.close();
  return blob || file;
}

export async function uploadPhoto(uid, tanggal, angle, file) {
  const blob = await compressImage(file);
  const path = `${uid}/${tanggal}-${angle}-${Date.now()}.webp`;
  const { error } = await supabase.storage.from(BUFFER).upload(path, blob, {
    contentType: "image/webp",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signedUrl(path, expires = 3600) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUFFER).createSignedUrl(path, expires);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deletePhoto(path) {
  if (!path) return;
  await supabase.storage.from(BUFFER).remove([path]);
}
