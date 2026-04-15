/**
 * Loads `.env` then `.env.horecaapp` into `process.env` for Metro / CLI (Expo).
 * Shell-provided variables are never overwritten.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const shellEnvKeys = new Set(Object.keys(process.env));

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const entries = [];
  for (const line of content.split("\n")) {
    if (!line || line.trim().startsWith("#")) continue;
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    entries.push([key, value]);
  }
  return entries;
}

function loadWeak(filePath) {
  for (const [key, value] of parseEnvFile(filePath)) {
    if (shellEnvKeys.has(key)) continue;
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadProjectOverrides(filePath) {
  for (const [key, value] of parseEnvFile(filePath)) {
    if (shellEnvKeys.has(key)) continue;
    process.env[key] = value;
  }
}

const envPath = path.join(projectRoot, ".env");
const horecaPath = path.join(projectRoot, ".env.horecaapp");

loadWeak(envPath);
loadProjectOverrides(horecaPath);

// Platform uses PLATFORM_PORT ?? PORT ?? 3000 (see platform/index.ts). The app must use the same port.
// Expo inlines EXPO_PUBLIC_* into the JS bundle; PORT alone is not visible to the client unless mirrored here.
if (!process.env.EXPO_PUBLIC_API_BASE_URL && !process.env.EXPO_PUBLIC_DEV_API_PORT) {
  const p = process.env.PLATFORM_PORT || process.env.PORT;
  if (p) process.env.EXPO_PUBLIC_DEV_API_PORT = p;
}
