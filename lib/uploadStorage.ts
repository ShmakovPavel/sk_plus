import { join } from "node:path";

export function getUploadsDir() {
  return join(process.cwd(), "storage", "uploads");
}

export function getLegacyPublicUploadsDir() {
  return join(process.cwd(), "public", "uploads");
}
