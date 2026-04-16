import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import {
  navigateAfterHorecaAuth,
  setStoredHorecaProfile,
  type HorecaAccountRole,
} from "@/lib/horeca-stored-role";

function mapRegisterError(message: string): string {
  if (message.includes("An account with this email already exists")) {
    return "\u03a5\u03c0\u03ac\u03c1\u03c7\u03b5\u03b9 \u03ae\u03b4\u03b7 \u03bb\u03bf\u03b3\u03b1\u03c1\u03b9\u03b1\u03c3\u03bc\u03cc\u03c2 \u03bc\u03b5 \u03b1\u03c5\u03c4\u03cc \u03c4\u03bf email.";
  }
  if (message.includes("Company name is required")) {
    return "\u03a3\u03c5\u03bc\u03c0\u03bb\u03b7\u03c1\u03ce\u03c3\u03c4\u03b5 \u03c4\u03b7\u03bd \u03b5\u03c0\u03c9\u03bd\u03c5\u03bc\u03af\u03b1 \u03c4\u03b7\u03c2 \u03b5\u03c0\u03b9\u03c7\u03b5\u03af\u03c1\u03b7\u03c3\u03b7\u03c2.";
  }
  if (message.includes("Valid business email")) {
    return "\u03a3\u03c5\u03bc\u03c0\u03bb\u03b7\u03c1\u03ce\u03c3\u03c4\u03b5 \u03ad\u03b3\u03ba\u03c5\u03c1\u03bf email \u03b5\u03c0\u03b9\u03c7\u03b5\u03af\u03c1\u03b7\u03c3\u03b7\u03c2.";
  }
  if (message.includes("at least 8 characters")) {
    return "\u039f \u03ba\u03c9\u03b4\u03b9\u03ba\u03cc\u03c2 \u03c0\u03c1\u03ad\u03c0\u03b5\u03b9 \u03bd\u03b1 \u03ad\u03c7\u03b5\u03b9 \u03c4\u03bf\u03c5\u03bb\u03ac\u03c7\u03b9\u03c3\u03c4\u03bf\u03bd 8 \u03c7\u03b1\u03c1\u03b1\u03ba\u03c4\u03ae\u03c1\u03b5\u03c2.";
  }
  if (message.includes("Database is not available")) {
    return "\u0397 \u03c5\u03c0\u03b7\u03c1\u03b5\u03c3\u03af\u03b1 \u03b4\u03b5\u03bd \u03b5\u03af\u03bd\u03b1\u03b9 \u03b4\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03b7 \u03b1\u03c5\u03c4\u03ae \u03c4\u03b7 \u03c3\u03c4\u03b9\u03b3\u03bc\u03ae. \u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03b1\u03c1\u03b3\u03cc\u03c4\u03b5\u03c1\u03b1.";
  }
  if (message.includes("Network request failed") || message.includes("Failed to fetch")) {
    return "\u0394\u03b5\u03bd \u03c6\u03c4\u03ac\u03bd\u03b5\u03b9 \u03c3\u03c4\u03bf API. \u0391\u03bd\u03bf\u03af\u03be\u03c4\u03b5 \u03c4\u03b5\u03c1\u03bc\u03b1\u03c4\u03b9\u03ba\u03cc \u03bc\u03b5 pnpm dev (\u03c0\u03bb\u03b1\u03c4\u03c6\u03cc\u03c1\u03bc\u03b1 + Metro).";
  }
  return (
    message ||
    "\u0397 \u03b4\u03b7\u03bc\u03b9\u03bf\u03c5\u03c1\u03b3\u03af\u03b1 \u03bb\u03bf\u03b3\u03b1\u03c1\u03b9\u03b1\u03c3\u03bc\u03bf\u03cd \u03b4\u03b5\u03bd \u03bf\u03bb\u03bf\u03ba\u03bb\u03b7\u03c1\u03ce\u03b8\u03b7\u03ba\u03b5. \u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03be\u03b1\u03bd\u03ac."
  );
}

export default function SignUpScreen() {
  const router = useRouter();
  const [role, setRole] = useState<HorecaAccountRole>("buyer");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAccount = async () => {
    const trimmedCompanyName = companyName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedCompanyName) {
      setErrorMessage("Συμπληρώστε την επωνυμία της επιχείρησης.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage("Συμπληρώστε έγκυρο email επιχείρησης.");
      return;
    }

    if (password.trim().length < 8) {
      setErrorMessage("Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await Api.registerWithEmailPassword(
        trimmedEmail,
        password,
        trimmedCompanyName,
        role,
      );
      await Api.applyAuthApiResult(result);
      await setStoredHorecaProfile(result.user.role, trimmedCompanyName);
      await navigateAfterHorecaAuth(router);
    } catch (error) {
      console.error("[SignUp] Register failed", error);
      const msg = error instanceof Error ? error.message : String(error);
      setErrorMessage(mapRegisterError(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-between gap-6 pt-6 pb-4">
          <View className="gap-6">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-sm font-semibold text-primary">Κλείσιμο</Text>
            </TouchableOpacity>

            <View className="gap-2">
              <Text className="text-[30px] font-bold leading-9 text-foreground">Δημιουργία λογαριασμού</Text>
              <Text className="text-base leading-6 text-muted">
                Φτιάξε λογαριασμό για το κατάστημα ή την εταιρεία σου και ξεκίνα να συγκρίνεις προμηθευτές σε ένα σημείο.
              </Text>
            </View>

            <View className="gap-4 rounded-[28px] border border-border bg-surface p-5">
              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Επωνυμία επιχείρησης</Text>
                <TextInput
                  value={companyName}
                  onChangeText={(value) => {
                    setCompanyName(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="Παράδειγμα: Daily Grind Coffee"
                  placeholderTextColor="#94A3B8"
                  className="rounded-2xl border border-border bg-background px-4 py-4 text-base text-foreground"
                  returnKeyType="next"
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Ρόλος</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setRole("buyer")}
                    className={role === "buyer" ? "flex-1 rounded-2xl bg-primary px-4 py-4" : "flex-1 rounded-2xl border border-border bg-background px-4 py-4"}
                  >
                    <Text className={role === "buyer" ? "text-center text-sm font-semibold text-background" : "text-center text-sm font-semibold text-foreground"}>
                      Αγοραστής
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setRole("supplier")}
                    className={role === "supplier" ? "flex-1 rounded-2xl bg-primary px-4 py-4" : "flex-1 rounded-2xl border border-border bg-background px-4 py-4"}
                  >
                    <Text className={role === "supplier" ? "text-center text-sm font-semibold text-background" : "text-center text-sm font-semibold text-foreground"}>
                      Προμηθευτής
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-sm leading-6 text-muted">
                  {role === "buyer"
                    ? "Για καταστήματα εστίασης που αναζητούν και συγκρίνουν προμηθευτές."
                    : "Για εταιρείες που θέλουν να προβάλλουν κατάλογο, διαθεσιμότητα και εμπορικούς όρους."}
                </Text>
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Email</Text>
                <TextInput
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="name@business.gr"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="rounded-2xl border border-border bg-background px-4 py-4 text-base text-foreground"
                  returnKeyType="next"
                />
              </View>

              <View className="gap-2">
                <Text className="text-sm font-semibold text-foreground">Κωδικός</Text>
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (errorMessage) {
                      setErrorMessage(null);
                    }
                  }}
                  placeholder="Τουλάχιστον 8 χαρακτήρες"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry
                  className="rounded-2xl border border-border bg-background px-4 py-4 text-base text-foreground"
                  returnKeyType="done"
                  onSubmitEditing={handleCreateAccount}
                />
              </View>

              {errorMessage ? <Text className="text-sm leading-5 text-error">{errorMessage}</Text> : null}

              <TouchableOpacity
                onPress={handleCreateAccount}
                disabled={isSubmitting}
                className={isSubmitting ? "rounded-full bg-primary px-4 py-4 opacity-70" : "rounded-full bg-primary px-4 py-4"}
              >
                <View className="flex-row items-center justify-center gap-2">
                  {isSubmitting ? <ActivityIndicator color="#F8FAFC" /> : null}
                  <Text className="text-center text-base font-semibold text-background">
                    {isSubmitting
                      ? "Γίνεται δημιουργία λογαριασμού..."
                      : `Συνέχεια ως ${role === "buyer" ? "Αγοραστής" : "Προμηθευτής"}`}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-center text-sm text-muted">Έχεις ήδη λογαριασμό;</Text>
            <TouchableOpacity onPress={() => router.push("/sign-in")}>
              <Text className="text-sm font-semibold text-primary">Σύνδεση</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
