import fs from "node:fs/promises";
import path from "node:path";
import { ENV } from "./_core/env";

function normalizeKey(relKey: string) {
  const key = relKey.replace(/^\/+/, "");
  if (!key || key.includes("..")) throw new Error("Invalid storage key");
  return key;
}

function storagePath(key: string) {
  return path.resolve(ENV.storageDir, key);
}

export async function storagePut(relKey: string, data: Buffer | Uint8Array | string, _contentType = "application/octet-stream") {
  const key = normalizeKey(relKey);
  const target = storagePath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, data);
  return { key, url: `/storage/${encodeURIComponent(key).replace(/%2F/g, "/")}` };
}

export async function storageGet(relKey: string) {
  const key = normalizeKey(relKey);
  return { key, url: `/storage/${encodeURIComponent(key).replace(/%2F/g, "/")}` };
}

export async function storageGetSignedUrl(relKey: string) {
  return (await storageGet(relKey)).url;
}
