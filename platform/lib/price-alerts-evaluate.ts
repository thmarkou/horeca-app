import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import { priceAlertHits, priceAlerts, products, suppliers } from "../db/schema";
import { sendPushForPriceAlertHit } from "./price-alert-push-on-hit";

/**
 * Background tick (Φάση 3.2): συγκρίνει τρέχουσα τιμή καταλόγου με alert threshold.
 * Σε «χτύπημα»: ενημερώνει `armed`/`triggeredAt`, γράφει `price_alert_hits`, στέλνει push (Expo)
 * αν ο buyer έχει Pro + εγγεγραμμένο token. Το **email** είναι digest (βλ. `runPriceAlertEmailDigest`).
 */
export async function evaluatePriceAlerts(): Promise<number> {
  const rows = await db
    .select({ a: priceAlerts, p: products, s: suppliers })
    .from(priceAlerts)
    .innerJoin(products, eq(priceAlerts.productId, products.id))
    .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(and(eq(priceAlerts.active, true)));

  let fired = 0;
  for (const { a, p, s } of rows) {
    const price = Number(p.priceEur);
    const thr = Number(a.threshold);
    if (!Number.isFinite(price) || !Number.isFinite(thr)) continue;

    const belowOrAt = price <= thr;
    if (belowOrAt && a.armed) {
      let hitId: number | null = null;
      await db.transaction(async (tx) => {
        await tx
          .update(priceAlerts)
          .set({
            armed: false,
            triggeredAt: new Date(),
          })
          .where(eq(priceAlerts.id, a.id));

        const [hit] = await tx
          .insert(priceAlertHits)
          .values({
            alertId: a.id,
            userId: a.userId,
            productId: a.productId,
            productName: p.name,
            supplierName: s.name,
            threshold: a.threshold,
            priceAtHit: p.priceEur,
            hitAt: new Date(),
          })
          .returning({ id: priceAlertHits.id });

        hitId = hit?.id ?? null;
      });

      fired += 1;
      console.log(
        `[price-alerts] hit id=${a.id} user=${a.userId} product=${a.productId} price=${price} thr=${thr}`,
      );

      if (hitId != null) {
        await sendPushForPriceAlertHit({
          hitId,
          userId: a.userId,
          alertId: a.id,
          productName: p.name,
          supplierName: s.name,
          priceAtHit: p.priceEur,
          threshold: a.threshold,
        });
      }
    } else if (!belowOrAt && !a.armed) {
      await db
        .update(priceAlerts)
        .set({ armed: true })
        .where(eq(priceAlerts.id, a.id));
    }
  }

  return fired;
}
