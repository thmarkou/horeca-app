/**
 * CommonJS copy of load-env.mjs — required when @expo/config evaluates app.config.ts via require()
 * (Xcode EXConstants "Generate app.config" phase). ESM-only load-env.mjs causes ERR_REQUIRE_ESM there.
 * Metro and platform keep using load-env.mjs.
 */
const fs = require("fs");
const path = require("path");

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

if (!process.env.EXPO_PUBLIC_API_BASE_URL && !process.env.EXPO_PUBLIC_DEV_API_PORT) {
  const p = process.env.PLATFORM_PORT || process.env.PORT;
  if (p) process.env.EXPO_PUBLIC_DEV_API_PORT = p;
}
