import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { formatEur } from "@/lib/format";
import {
  type BuyerPriceAlertWire,
  useDeletePriceAlertMutation,
  usePriceAlertsQuery,
  useUpdatePriceAlertMutation,
} from "@/lib/horeca-queries";

const hitFormatter = new Intl.DateTimeFormat("el-GR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function PriceAlertsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { data = [], refetch, isPending, isRefetching } = usePriceAlertsQuery();
  const updateAlert = useUpdatePriceAlertMutation();
  const deleteAlert = useDeletePriceAlertMutation();

  const sortedAlerts = useMemo(
    () => [...data].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [data],
  );

  const handleToggle = (row: BuyerPriceAlertWire, next: boolean) => {
    if (next === row.active) return;
    void updateAlert.mutateAsync({ id: row.id, active: next }).catch(() => {
      Alert.alert("Σφάλμα", "Δεν ήταν δυνατή η ενημέρωση. Δοκίμασε ξανά.");
    });
  };

  const handleDelete = (row: BuyerPriceAlertWire) => {
    Alert.alert("Διαγραφή ειδοποίησης", `${row.productName}`, [
      { text: "Ακύρωση", style: "cancel" },
      {
        text: "Διαγραφή",
        style: "destructive",
        onPress: () => void deleteAlert.mutateAsync({ id: row.id }),
      },
    ]);
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <TouchableOpacity accessibilityRole="button" onPress={() => router.back()} className="pt-3 pb-2">
        <Text className="text-sm font-semibold text-primary">Πίσω</Text>
      </TouchableOpacity>
      <Text className="text-[26px] font-bold text-foreground">Ειδοποιήσεις τιμής</Text>
      <Text className="mt-2 text-base leading-6 text-muted">
        Ο server ελέγχει τις ενεργές ειδοποιήσεις περιοδικά όσο τρέχει η πλατφόρμα («χτύπημα»: η τιμή καταλόγου είναι ≤ στο όριό σας). Τα συμβάντα και το ιστορικό ενημερώσεων τα βλέπεις εδώ. Ταυτόχρονη
        πρόσβαση push (Expo) προσπαθεί αν έχεις εγγράψει συσκευή στον λογαριασμό· προαιρετικό email digest ρυθμίζεται απ’ το tab
        Λογαριασμός.
      </Text>

      {isPending && !data?.length ? (
        <ActivityIndicator color={colors.muted} className="mt-8" />
      ) : sortedAlerts.length === 0 ? (
        <View className="mt-8 rounded-[24px] border border-border bg-surface p-5">
          <Text className="text-base leading-7 text-muted">
            Δεν έχεις αποθηκευμένο κανένα price alert ακόμα. Πρόσθεσε ένα από τη σελίδα προϊόντος με το κουμπί «Ειδοποίησέ
            με».
          </Text>
        </View>
      ) : (
        <ScrollView
          className="mt-6 flex-1"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} />}
          contentContainerStyle={{ paddingBottom: 32, gap: 12 }}
          showsVerticalScrollIndicator={false}
        >
          {sortedAlerts.map((row) => {
            const thr = Number(row.threshold);
            const under = Number.isFinite(row.currentPriceEur) && Number.isFinite(thr) && row.currentPriceEur <= thr;
            const hitMs = typeof row.triggeredAt === "number" ? row.triggeredAt : null;
            return (
              <View key={row.id} className="rounded-[22px] border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">{row.productName}</Text>
                    <Text className="mt-1 text-xs text-muted">{row.supplierName}</Text>
                    <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
                      <Text className="text-sm text-muted">
                        Κατάλογος:{" "}
                        <Text className="font-semibold text-foreground">
                          {Number.isFinite(row.currentPriceEur) ? formatEur(row.currentPriceEur) : "—"}
                        </Text>
                      </Text>
                      <Text className="text-sm text-muted">
                        Όριο:{" "}
                        <Text className="font-semibold text-foreground">
                          {Number.isFinite(thr) ? formatEur(thr) : `${row.threshold} €`}
                        </Text>
                      </Text>
                    </View>
                    {hitMs != null ? (
                      <Text className="mt-3 text-xs text-warning">
                        Χτύπημα:{" "}
                        {Number.isFinite(hitMs) ? hitFormatter.format(new Date(hitMs)) : "—"}
                        {under ? " · τρέχουσα τιμή ακόμα κάτω/ίση με το όριο" : ""}
                      </Text>
                    ) : null}
                  </View>
                  <Switch
                    value={row.active}
                    onValueChange={(v) => handleToggle(row, v)}
                    disabled={updateAlert.isPending}
                    accessibilityLabel={`Ενεργή ειδοποίηση για ${row.productName}`}
                  />
                </View>

                <View className="mt-4 flex-row items-center justify-end gap-5 border-t border-border/60 pt-3">
                  <TouchableOpacity accessibilityRole="button" onPress={() => handleDelete(row)}>
                    <View className="flex-row items-center gap-2">
                      <IconSymbol name="trash.fill" size={14} color={colors.muted} />
                      <Text className="text-sm font-semibold text-muted">Διαγραφή</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
