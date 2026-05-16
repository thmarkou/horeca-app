/** Tailwind class bundles for order status pills (Greek labels from API). */
export function getOrderStatusClasses(status: string) {
  switch (status) {
    case "Ολοκληρώθηκε":
      return "bg-success/10 text-success";
    case "\u039A\u03B1\u03B8' \u03BF\u03B4\u03CC\u03BD":
      return "bg-primary/10 text-primary";
    case "Σε επεξεργασία":
      return "bg-warning/10 text-warning";
    case "\u039D\u03AD\u03B1":
      return "bg-surface text-muted border border-border";
    // Terminal-error state — διακριτοποιείται από «Νέα» με destructive tone
    // ώστε ο supplier να βλέπει αμέσως στη λίστα ποιες παραγγελίες δεν θα
    // εκτελεστούν.
    case "\u0391\u03BA\u03C5\u03C1\u03CE\u03B8\u03B7\u03BA\u03B5":
      return "bg-error/10 text-error";
    default:
      return "bg-surface text-muted";
  }
}
