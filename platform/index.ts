import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { serve } from "@hono/node-server";

async function main() {
  const root = dirname(fileURLToPath(import.meta.url));
  await import(join(root, "../scripts/load-env.mjs"));

  const { app } = await import("./app");

  const port = Number(process.env.PLATFORM_PORT ?? process.env.PORT ?? 3010);
  //0.0.0.0 so physical phones on the same Wi-Fi can reach this Mac (127.0.0.1 alone is not enough).
  const hostname = process.env.PLATFORM_BIND_HOST ?? "0.0.0.0";

  serve({ fetch: app.fetch, port, hostname }, (info) => {
    if (info && typeof info === "object" && "port" in info) {
      const a = info as { address: string; port: number };
      console.log(
        `[horeca-platform] http://${a.address}:${a.port} — on iPhone use http://<Mac-Wi-Fi-IP>:${a.port}`,
      );
    } else {
      console.log(`[horeca-platform] port ${port} — on iPhone use http://<Mac-Wi-Fi-IP>:${port}`);
    }

    void import("./lib/price-alerts-evaluate")
      .then((m) =>
        m.evaluatePriceAlerts().catch((e) => console.error("[price-alerts] bootstrap eval", e)),
      )
      .catch(() => undefined);

    void import("./lib/price-alert-email-digest")
      .then((m) =>
        m.runPriceAlertEmailDigest().catch((e) => console.error("[price-alerts] bootstrap email digest", e)),
      )
      .catch(() => undefined);

    setInterval(() => {
      void import("./lib/price-alerts-evaluate")
        .then((m) =>
          m.evaluatePriceAlerts().catch((e) => console.error("[price-alerts] periodic", e)),
        )
        .catch(() => undefined);
    }, 120_000);

    setInterval(() => {
      void import("./lib/price-alert-email-digest")
        .then((m) =>
          m.runPriceAlertEmailDigest().catch((e) => console.error("[price-alerts] email digest", e)),
        )
        .catch(() => undefined);
    }, 3_600_000);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
