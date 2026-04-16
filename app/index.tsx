import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";

import * as Auth from "@/lib/_core/auth";
import { navigateAfterHorecaAuth } from "@/lib/horeca-stored-role";

type BootState = "checking" | "welcome";

// Entry route: στέλνει authenticated χρήστες κατευθείαν στο σωστό root,
// ώστε το onboarding (welcome) να εμφανίζεται μόνο πριν το sign-in.
export default function IndexRoute() {
  const router = useRouter();
  const [state, setState] = useState<BootState>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await Auth.getUserInfo();
      if (cancelled) return;
      if (user) {
        await navigateAfterHorecaAuth(router, user.role);
        return;
      }
      setState("welcome");
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "welcome") {
    return <Redirect href="/welcome" />;
  }

  return null;
}
