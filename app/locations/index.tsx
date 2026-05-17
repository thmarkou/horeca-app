import { useRouter } from "expo-router";
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useBuyerActiveLocationPicker } from "@/hooks/use-buyer-active-location";
import {
  useAcceptInvitationMutation,
  useBuyerLocationsQuery,
  useDeclineInvitationMutation,
  useIncomingInvitationsQuery,
} from "@/lib/horeca-queries";
import { useFeatures } from "@/lib/subscription";

export default function LocationsListScreen() {
  const router = useRouter();
  const colors = useColors();
  const features = useFeatures();

  const { data: rows = [], isLoading } = useBuyerLocationsQuery();
  const invitations = useIncomingInvitationsQuery();
  const accept = useAcceptInvitationMutation();
  const decline = useDeclineInvitationMutation();

  const { activeLocationId, setActiveLocationId, showPicker } = useBuyerActiveLocationPicker({
    enabled: true,
  });

  return (
    <ScreenContainer className="flex-1 bg-background px-5">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="pt-2 pb-6 gap-4">
          <Text className="text-[13px] text-muted leading-5">
            Free: μέχρι {features.maxLocations} κατάστημα και {features.maxTeamSeats}{" "}
            χρηστές/κατάστημα με το τρέχον πλάνο. Pro ξεκλειδώνει τα όρια.
          </Text>

          {invitations.data && invitations.data.length > 0 ? (
            <View className="rounded-[20px] border border-warning/35 bg-warning/10 p-4 gap-3">
              <Text className="text-sm font-bold text-foreground">Προσκλήσεις ομάδας</Text>
              {invitations.data.map((inv) => (
                <View key={inv.token} className="gap-2 rounded-2xl border border-border bg-surface px-4 py-3">
                  <Text className="text-sm font-semibold text-foreground">{inv.locationName}</Text>
                  <Text className="text-xs text-muted">Πρόσκληση για: {inv.email}</Text>
                  <View className="flex-row flex-wrap gap-2 pt-2">
                    <TouchableOpacity
                      className="rounded-full bg-success px-4 py-2"
                      onPress={() =>
                        Alert.alert(
                          "Αποδοχή;",
                          `Να προστεθείς στο κατάστημα «${inv.locationName}»;`,
                          [
                            { text: "Άκυρο", style: "cancel" },
                            {
                              text: "Αποδοχή",
                              onPress: () => accept.mutate(inv.token),
                            },
                          ],
                        )
                      }
                    >
                      <Text className="text-xs font-semibold text-background">Αποδοχή</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="rounded-full border border-border bg-surface px-4 py-2"
                      onPress={() =>
                        Alert.alert("Απόρριψη;", "Το προσχέδιο πρόσκλησης θα σημειωθεί ως απορρίφθηκε.", [
                          { text: "Όχι", style: "cancel" },
                          {
                            text: "Απόρριψη",
                            style: "destructive",
                            onPress: () => decline.mutate(inv.token),
                          },
                        ])
                      }
                    >
                      <Text className="text-xs font-semibold text-foreground">Απόρριψη</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {showPicker ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Ενεργό κατάστημα (αραχτή διεπαφή)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {rows.map((loc) => {
                    const active = loc.id === activeLocationId;
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        onPress={() => setActiveLocationId(loc.id)}
                        className={`rounded-full border px-3 py-2 ${
                          active ? "border-primary bg-primary/10" : "border-border bg-surface"
                        }`}
                      >
                        <Text
                          numberOfLines={1}
                          className={`max-w-[200px] text-xs font-semibold ${active ? "text-primary" : "text-foreground"}`}
                        >
                          {loc.name}
                          {loc.role === "staff" ? " · ομάδα" : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <TouchableOpacity
            accessible
            accessibilityRole="button"
            onPress={() => router.push("/locations/new")}
            className="rounded-full bg-primary px-4 py-3"
          >
            <Text className="text-center text-sm font-semibold text-background">
              Προσθήκη καταστήματος
            </Text>
          </TouchableOpacity>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : rows.length === 0 ? (
            <Text className="text-sm text-muted">
              Καμία θέση — το API θα δημιουργήσει προεπιλογή μόλις επανέλθεις online.
            </Text>
          ) : (
            <View className="gap-2">
              <Text className="text-xs font-semibold uppercase text-muted">Λίστα</Text>
              {rows.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => router.push(`/locations/${r.id}`)}
                  className="rounded-[20px] border border-border bg-surface px-4 py-4 gap-2"
                >
                  <Text className="text-base font-bold text-foreground">{r.name}</Text>
                  {r.address ? <Text className="text-xs text-muted">{r.address}</Text> : null}
                  <Text className="text-xs text-muted">
                    Ρόλος: {r.role === "owner" ? "Ιδιοκτήτης" : "Ομάδα"}
                    {!r.isOwner ? " · ξένος λογαριασμός" : ""}
                  </Text>
                  <Text className="text-[11px] text-muted">
                    Μέλη: {r.memberCount}
                    {r.pendingInviteCount > 0 ? ` · πρόσκληση: ${r.pendingInviteCount}` : ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
