import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import * as Auth from "@/lib/_core/auth";

type AccountRole = "buyer" | "supplier";

const DEMO_ROLE_KEY = "horeca-source-demo-role";
const DEMO_COMPANY_KEY = "horeca-source-demo-company";

export default function SignUpScreen() {
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>("buyer");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const persistDemoRole = async (nextRole: AccountRole, nextCompanyName: string) => {
    if (Platform.OS === "web") {
      window.localStorage.setItem(DEMO_ROLE_KEY, nextRole);
      window.localStorage.setItem(DEMO_COMPANY_KEY, nextCompanyName);
      return;
    }

    await AsyncStorage.multiSet([
      [DEMO_ROLE_KEY, nextRole],
      [DEMO_COMPANY_KEY, nextCompanyName],
    ]);
  };

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

      await Auth.setUserInfo({
        id: Date.now(),
        openId: `demo-${role}-${Date.now()}`,
        name: trimmedCompanyName,
        email: trimmedEmail,
        loginMethod: "demo-signup",
        lastSignedIn: new Date(),
      });

      if (Platform.OS !== "web") {
        await Auth.setSessionToken(`demo-session-${Date.now()}`);
      }

      await persistDemoRole(role, trimmedCompanyName);

      if (role === "supplier") {
        router.replace("/supplier-dashboard");
        return;
      }

      router.replace("/(tabs)");
    } catch (error) {
      console.error("[SignUp] Failed to create demo account", error);
      setErrorMessage("Η δημιουργία λογαριασμού δεν ολοκληρώθηκε. Δοκιμάστε ξανά.");
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

              <Text className="text-xs leading-5 text-muted">
                Η τρέχουσα ροή δημιουργεί demo λογαριασμό για έλεγχο του MVP και σας μεταφέρει στην αντίστοιχη εμπειρία χρήσης.
              </Text>
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
