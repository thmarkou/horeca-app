import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ApiError } from "@/lib/api/http";
import {
  useBuyerLocationsQuery,
  useBuyerLocationMembersQuery,
  useDeleteBuyerLocationMutation,
  useInviteToLocationMutation,
  usePatchBuyerLocationMutation,
  useRemoveTeamMemberMutation,
} from "@/lib/horeca-queries";

export default function BuyerLocationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lid = typeof id === "string" ? id : "";

  const { data: metaRows = [], isLoading: locLoading } = useBuyerLocationsQuery({ enabled: Boolean(lid) });
  const meta = metaRows.find((l) => l.id === lid);
  const members = useBuyerLocationMembersQuery({ locationId: lid || undefined, enabled: Boolean(lid) });
  const patch = usePatchBuyerLocationMutation();
  const del = useDeleteBuyerLocationMutation();
  const invite = useInviteToLocationMutation();
  const removeMember = useRemoveTeamMemberMutation();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (!meta) return;
    setName(meta.name);
    setAddress(meta.address ?? "");
  }, [meta?.id, meta?.name, meta?.address]);
  async function handleSaveBasics() {
    const trimmedName = name.trim();
    const trimmedAddr = address.trim();
    if (!lid) return;
    if (!trimmedName) {
      Alert.alert("Σφάλμα", "Όνομα απαραίτητο.");
      return;
    }
    try {
      await patch.mutateAsync({
        locationId: lid,
        name: trimmedName,
        ...(trimmedAddr ? { address: trimmedAddr } : {}),
      });
      Alert.alert("Αποθηκεύτηκε");
    } catch (e) {
      Alert.alert("Σφάλμα", e instanceof Error ? e.message : "");
    }
  }

  async function handleDelete() {
    if (!lid) return;
    Alert.alert("Διαγραφή;", "Οι συσχετισμένες παραγγελίες θα σπάσουν δεσμό location (πιθανά null). Συνέχεια;", [
      { text: "Άκυρο", style: "cancel" },
      {
        text: "Διαγραφή",
        style: "destructive",
        onPress: async () => {
          try {
            await del.mutateAsync(lid);
            router.back();
          } catch (e) {
            const last =
              e instanceof ApiError && (e.message.includes("only_location") || e.message.includes("last_location"));
            Alert.alert(last ? "Δεν διαγράφεται" : "Σφάλμα", last ? "Κράτα τουλάχιστον ένα δικό σου κατάστημα." : (e instanceof Error ? e.message : ""));
          }
        },
      },
    ]);
  }

  async function handleInvite() {
    if (!lid) return;
    const email = inviteEmail.trim();
    if (!email) {
      Alert.alert("Σφάλμα", "Email πρόσκλησης.");
      return;
    }
    try {
      await invite.mutateAsync({ locationId: lid, email });
      setInviteEmail("");
      Alert.alert("Πρόσκληση δημιουργήθηκε", "Ο προσκεκλημένος πρέπει να την αποδεχτεί μέσω Λογαριασμός → Καταστήματα.");
    } catch (e) {
      const paywall =
        e instanceof ApiError && e.status === 402 && e.message.includes("seats_limit");
      Alert.alert(
        paywall ? "Όριο ομάδας" : "Σφάλμα",
        paywall ? "Οι δωρεάν θέσεις τελείωσαν· αναβάθμιση σε Pro ή αφαιρείς μέλη." : e instanceof Error ? e.message : "",
      );
    }
  }

  if (!lid) {
    return (
      <ScreenContainer className="flex-1 px-5">
        <Text className="pt-10 text-muted">Δεν υπάρχει το κατάστημα.</Text>
      </ScreenContainer>
    );
  }

  if (locLoading) {
    return (
      <ScreenContainer className="flex-1 px-5">
        <Text className="pt-10 text-muted">Φόρτωση…</Text>
      </ScreenContainer>
    );
  }

  if (!meta) {
    return (
      <ScreenContainer className="flex-1 px-5">
        <Text className="pt-10 text-muted">Το κατάστημα δεν βρέθηκε.</Text>
      </ScreenContainer>
    );
  }

  const isOwner = meta.isOwner;
  return (
    <>
      <Stack.Screen options={{ title: name ? name : "Κατάστημα" }} />
      <ScreenContainer className="flex-1 bg-background px-5">
        <View className="gap-6 pt-4 pb-24">
          {isOwner ? (
            <>
              <View className="gap-3">
                <Text className="text-sm font-semibold text-foreground">Στοιχεία</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Όνομα"
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-foreground"
                />
                <TextInput
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Διεύθυνση"
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-foreground"
                />
                <TouchableOpacity
                  onPress={handleSaveBasics}
                  disabled={patch.isPending}
                  className={`rounded-full bg-primary px-4 py-3 ${patch.isPending ? "opacity-70" : ""}`}
                >
                  <Text className="text-center text-sm font-semibold text-background">Αποθήκευση</Text>
                </TouchableOpacity>
              </View>

              <View className="gap-3">
                <Text className="text-sm font-semibold text-foreground">Πρόσκληση (email buyer)</Text>
                <TextInput
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="συνεργάτης@example.com"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  className="rounded-2xl border border-border bg-surface px-4 py-3 text-foreground"
                />
                <TouchableOpacity
                  onPress={handleInvite}
                  disabled={invite.isPending}
                  className={`rounded-full border border-primary px-4 py-3 ${invite.isPending ? "opacity-60" : ""}`}
                >
                  <Text className="text-center text-sm font-semibold text-primary">Αποστολή πρόσκλησης</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View className="gap-2 rounded-[20px] border border-border bg-surface px-4 py-4">
              <Text className="text-xs font-semibold text-muted uppercase">Προβολή (μέλος ομάδας)</Text>
              <Text className="text-xl font-bold text-foreground">{meta.name}</Text>
              {meta.address ? <Text className="text-sm text-muted">{meta.address}</Text> : null}
            </View>
          )}

          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Ομάδα</Text>
            {(members.data ?? []).map((m) => (
              <View
                key={m.userId}
                className="flex-row items-start justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3"
              >
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-bold text-foreground">{m.name}</Text>
                  <Text className="text-xs text-muted">{m.email}</Text>
                  <Text className="text-[11px] text-muted">Ρόλος: {m.role}</Text>
                </View>
                {isOwner && m.role === "staff" ? (
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("Αφαίρεση", `Να αφαιρεθεί ο ${m.name};`, [
                        { text: "Όχι", style: "cancel" },
                        {
                          text: "Ναι",
                          style: "destructive",
                          onPress: () => removeMember.mutate({ locationId: lid, memberUserId: m.userId }),
                        },
                      ])
                    }
                  >
                    <Text className="text-xs font-semibold text-error">Αφαίρεση</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>

          {isOwner ? (
            <TouchableOpacity onPress={handleDelete} disabled={del.isPending} className="rounded-full border border-error/45 px-4 py-3">
              <Text className="text-center text-sm font-semibold text-error">Διαγραφή καταστήματος</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScreenContainer>
    </>
  );
}
