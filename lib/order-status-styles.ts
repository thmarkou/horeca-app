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
    default:
      return "bg-surface text-muted";
  }
}
