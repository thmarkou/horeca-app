import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { ApiError } from "@/lib/api/http";
import { useCreateBuyerLocationMutation } from "@/lib/horeca-queries";

export default function NewLocationScreen() {
  const router = useRouter();
  const create = useCreateBuyerLocationMutation();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Σφάλμα", "Συμπλήρωσε όνομα.");
      return;
    }
    try {
      await create.mutateAsync({ name: trimmed, address: address.trim() || undefined });
      router.back();
    } catch (e) {
      const seats =
        e instanceof ApiError &&
        e.status === 402 &&
        (e.message.includes("locations_limit") || e.message.includes("seats_limit"));
      Alert.alert(
        seats ? "Όριο πλάνου" : "Σφάλμα",
        seats
          ? "Πρόσθεσε περισσότερα καταστήματα ή θέσεις ομάδας με την αναβάθμιση σε Pro από το προφίλ."
          : e instanceof Error
            ? e.message
            : "Δεν δημιουργήθηκε.",
      );
    }
  }

  return (
    <ScreenContainer className="flex-1 bg-background px-5">
      <View className="gap-4 pt-4">
        <Text className="text-sm text-muted">Όνομα</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="π.χ. Κεντρικό καφέ"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-foreground"
        />
        <Text className="text-sm text-muted">Διεύθυνση (προαιρετικό)</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Οδός, πόλη"
          className="rounded-2xl border border-border bg-surface px-4 py-3 text-foreground"
        />
        <TouchableOpacity
          onPress={submit}
          disabled={create.isPending}
          className={`rounded-full bg-primary px-4 py-3 ${create.isPending ? "opacity-60" : ""}`}
        >
          <Text className="text-center text-sm font-semibold text-background">
            {create.isPending ? "Αποθήκευση…" : "Αποθήκευση"}
          </Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}
