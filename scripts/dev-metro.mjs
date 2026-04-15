/**
 * Starts Expo/Metro on a free port without interactive prompts (needed when `pnpm dev`
 * runs Metro via concurrently without a TTY).
 */
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

await import("./load-env.mjs");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
process.chdir(root);

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort, maxAttempts = 30) {
  for (let p = startPort; p < startPort + maxAttempts; p++) {
    if (await isPortAvailable(p)) return p;
  }
  throw new Error(`No free Metro port in range ${startPort}-${startPort + maxAttempts - 1}`);
}

const preferred = parseInt(process.env.EXPO_PORT || "8081", 10);
const port = await findAvailablePort(Number.isFinite(preferred) ? preferred : 8081);

if (port !== preferred) {
  console.log(`[metro] Port ${preferred} is busy, using ${port} instead`);
}

const env = {
  ...process.env,
  EXPO_USE_METRO_WORKSPACE_ROOT: process.env.EXPO_USE_METRO_WORKSPACE_ROOT ?? "1",
  EXPO_PORT: String(port),
};

const useShell = process.platform === "win32";
const child = spawn("npx", ["expo", "start", "--port", String(port)], {
  cwd: root,
  stdio: "inherit",
  shell: useShell,
  env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
