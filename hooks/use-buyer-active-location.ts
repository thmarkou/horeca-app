import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import * as Auth from "@/lib/_core/auth";
import {
  getActiveBuyerLocationId,
  setActiveBuyerLocationId,
} from "@/lib/active-buyer-location";
import { useBuyerLocationsQuery } from "@/lib/horeca-queries";

/**
 * Φάση 3.1· συγχρονίζει server locations + τοπικό «ενεργό κατάστημα» για πρόβλεψη
 * παραγγελιών / checkout χωρίς να κάνουμε διπλές κλήσεις σε κάθε screen.
 */
export function useBuyerActiveLocationPicker(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const queryClient = useQueryClient();

  const [userNumericId, setUserNumericId] = useState<number | null>(null);
  useEffect(() => {
    Auth.getUserInfo().then((u) => setUserNumericId(typeof u?.id === "number" ? u.id : null));
  }, []);

  const { data: locations = [], isLoading } = useBuyerLocationsQuery({
    enabled: enabled && userNumericId != null,
  });

  const [storedId, setStoredIdState] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (userNumericId == null) return;
    void getActiveBuyerLocationId(userNumericId).then((v) => {
      if (!cancelled) setStoredIdState(v);
    });
    return () => {
      cancelled = true;
    };
  }, [userNumericId]);

  useEffect(() => {
    if (userNumericId == null || isLoading || locations.length === 0) return;
    const ids = new Set(locations.map((l) => l.id));
    if (storedId && ids.has(storedId)) return;
    const first = locations[0]!.id;
    let cancelled = false;
    void (async () => {
      await setActiveBuyerLocationId(userNumericId, first);
      if (!cancelled) setStoredIdState(first);
      await queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "horeca" && q.queryKey[1] === "recentOrders",
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userNumericId, isLoading, locations, storedId, queryClient]);

  const activeLocationId = useMemo(() => {
    if (!locations.length) return null;
    if (storedId && locations.some((l) => l.id === storedId)) return storedId;
    return locations[0]!.id;
  }, [locations, storedId]);

  const activeLocationNumericId = useMemo(() => {
    if (!activeLocationId) return undefined;
    const n = Number(activeLocationId);
    return Number.isFinite(n) && n >= 1 ? n : undefined;
  }, [activeLocationId]);

  const setActiveLocationId = useCallback(
    async (locationId: string) => {
      if (userNumericId == null) return;
      await setActiveBuyerLocationId(userNumericId, locationId);
      setStoredIdState(locationId);
      await queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "horeca" && q.queryKey[1] === "recentOrders",
      });
    },
    [queryClient, userNumericId],
  );

  const showPicker = locations.length > 1;

  return {
    locations,
    isLoading,
    activeLocationId,
    activeLocationNumericId,
    showPicker,
    setActiveLocationId,
  };
}
