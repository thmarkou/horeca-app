import { File, Paths } from "expo-file-system";
import { Platform, Share } from "react-native";

const UTF8_BOM = "\uFEFF";

function safeFileStem(raw: string): string {
  const s = raw.replace(/[^\w\-.]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 48);
  return s.length > 0 ? s : "export";
}

/**
 * Γράφει CSV με BOM (Excel UTF-8) και ανοίγει το share sheet.
 *
 * Δεν χρησιμοποιούμε `expo-sharing`: απαιτεί επανακατασκευή native binaries· αν λείψει από το
 * build ρίχνει `Cannot find native module 'ExpoSharing'` κατά το πρώτο require. Το RN `Share` μεταφέρει
 * file URI σε iOS· σε Android τα περισσότερα builds στέλνουν διαδρομή/κείμενο (όχι πάντα συνημμένο MIME).
 */
export async function exportAndShareUtf8Csv(options: {
  body: string;
  fileNameStem: string;
}): Promise<void> {
  const stem = safeFileStem(options.fileNameStem);
  const isoSafe = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const fileName = `${stem}_${isoSafe}.csv`;
  const payload = `${UTF8_BOM}${options.body}\n`;

  if (Platform.OS === "web") {
    try {
      if (typeof document !== "undefined" && typeof Blob !== "undefined") {
        const blob = new Blob([payload], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body?.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
      }
    } catch {
      /* RN Share από κάτω */
    }
    await Share.share({
      title: fileName,
      message: payload.length > 80_000 ? `${payload.slice(0, 80_000)}… (truncated)` : payload,
    });
    return;
  }

  const outfile = new File(Paths.cache, fileName);
  outfile.create({ overwrite: true });
  outfile.write(payload, { encoding: "utf8" });

  /** iOS: κοινοποίηση αρχείου. Android: ανά build — συχνότερα διαδρομή + τίτλος. */
  try {
    if (Platform.OS === "ios") {
      await Share.share({ url: outfile.uri });
      return;
    }
    await Share.share({
      title: fileName,
      message: `CSV αποθηκεύτηκε: ${outfile.uri}`,
    });
  } catch {
    await Share.share({
      title: fileName,
      message: payload.length > 95_000 ? `${payload.slice(0, 95_000)}… (truncated)` : payload,
    });
  }
}
