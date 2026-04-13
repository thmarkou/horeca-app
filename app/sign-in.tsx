import { useRouter } from "expo-router";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function SignInScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 justify-between">
        <View className="gap-6 pt-6">
          <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-sm font-semibold text-primary">Κλείσιμο</Text>
          </TouchableOpacity>

          <View className="gap-2">
            <Text className="text-[30px] font-bold leading-9 text-foreground">Σύνδεση επιχείρησης</Text>
            <Text className="text-base leading-6 text-muted">
              Συνδέσου για να δεις προμηθευτές, τιμοκαταλόγους και τις πρόσφατες παραγγελίες της ομάδας σου.
            </Text>
          </View>

          <View className="gap-4 rounded-[28px] border border-border bg-surface p-5">
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Email</Text>
              <TextInput
                placeholder="name@business.gr"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                className="rounded-2xl border border-border bg-background px-4 py-4 text-base text-foreground"
                returnKeyType="next"
              />
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Κωδικός</Text>
              <TextInput
                placeholder="••••••••"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                className="rounded-2xl border border-border bg-background px-4 py-4 text-base text-foreground"
                returnKeyType="done"
              />
            </View>
            <TouchableOpacity className="rounded-full bg-primary px-4 py-4">
              <Text className="text-center text-base font-semibold text-background">Είσοδος</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-row items-center justify-center gap-1 pb-4">
          <Text className="text-center text-sm text-muted">Δεν έχεις λογαριασμό;</Text>
          <TouchableOpacity onPress={() => router.push("/sign-up")}>
            <Text className="text-sm font-semibold text-primary">Δημιούργησε τώρα</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
