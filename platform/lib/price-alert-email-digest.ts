import { eq, inArray, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { priceAlertHits, users } from "../db/schema";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Cron-friendly: στέλνει **ένα** grouped email ανά user για hits που δεν έχουν συμπεριληφθεί ακόμα
 * σε digest. Χρησιμοποιεί Resend REST API (δεν προσθέτουμε dependency nodemailer).
 *
 * Απαιτεί `HORECA_RESEND_API_KEY`. Προαιρετικό `HORECA_EMAIL_FROM` (αλλιώς Resend dev sender).
 */
export async function runPriceAlertEmailDigest(): Promise<number> {
  const key = process.env.HORECA_RESEND_API_KEY?.trim();
  if (!key) return 0;

  const from =
    process.env.HORECA_EMAIL_FROM?.trim() ?? "Horeca Source <onboarding@resend.dev>";

  const pending = await db
    .select()
    .from(priceAlertHits)
    .where(isNull(priceAlertHits.emailDigestSentAt));

  if (pending.length === 0) return 0;

  const byUser = new Map<number, typeof pending>();
  for (const row of pending) {
    const list = byUser.get(row.userId) ?? [];
    list.push(row);
    byUser.set(row.userId, list);
  }

  let emailsSent = 0;

  for (const [userId, hits] of byUser) {
    const [u] = await db
      .select({ email: users.email, digest: users.priceAlertEmailDigest })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!u?.email || !u.digest) continue;

    const lines = [...hits]
      .sort((a, b) => {
        const bt = b.hitAt instanceof Date ? b.hitAt.getTime() : Number(b.hitAt);
        const at = a.hitAt instanceof Date ? a.hitAt.getTime() : Number(a.hitAt);
        return bt - at;
      })
      .map((h) => {
        const t = h.hitAt instanceof Date ? h.hitAt.getTime() : Number(h.hitAt);
        const when = new Date(t).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" });
      return `<li><strong>${escapeHtml(h.productName)}</strong> · ${escapeHtml(h.supplierName)}<br/>
      Κατάλογος ${escapeHtml(h.priceAtHit)} € · όριο ${escapeHtml(h.threshold)} € <em>(${escapeHtml(when)})</em></li>`;
    });

    const html = `<p>Καλησπέρα,</p>
<p>Έχεις <strong>${hits.length}</strong> ειδοποίηση/ειδοποιήσεις τιμής (Pro):</p>
<ul>${lines.join("\n")}</ul>
<p style="color:#64748b;font-size:13px">Αυτό είναι συγκεντρωτικό email. Λάβες ή θα λάβεις και push στην
συσκευή αν έχεις ενεργοποιήσει ειδοποιήσεις.</p>
<p>— Horeca Source</p>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [u.email],
        subject: `Horeca Source · ${hits.length} ειδοποίηση/ειδοποιήσεις τιμής`,
        html,
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      console.error("[price-alert-digest] Resend error", res.status, t);
      continue;
    }

    await db
      .update(priceAlertHits)
      .set({ emailDigestSentAt: new Date() })
      .where(
        inArray(
          priceAlertHits.id,
          hits.map((h) => h.id),
        ),
      );
    emailsSent += 1;
  }

  return emailsSent;
}
