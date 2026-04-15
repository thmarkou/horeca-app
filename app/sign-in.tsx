import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import * as Api from "@/lib/_core/api";
import { getHorecaApiTimeoutMessageGr } from "@/lib/api/http";
import { navigateAfterHorecaAuth } from "@/lib/horeca-stored-role";

function mapLoginError(message: string): string {
  if (message.includes("Invalid email or password")) {
    return "\u039b\u03ac\u03b8\u03bf\u03c2 email \u03ae \u03ba\u03c9\u03b4\u03b9\u03ba\u03cc\u03c2.";
  }
  if (message.includes("Database is not available")) {
    return "\u0397 \u03c5\u03c0\u03b7\u03c1\u03b5\u03c3\u03af\u03b1 \u03b4\u03b5\u03bd \u03b5\u03af\u03bd\u03b1\u03b9 \u03b4\u03b9\u03b1\u03b8\u03ad\u03c3\u03b9\u03bc\u03b7 \u03b1\u03c5\u03c4\u03ae \u03c4\u03b7 \u03c3\u03c4\u03b9\u03b3\u03bc\u03ae. \u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03b1\u03c1\u03b3\u03cc\u03c4\u03b5\u03c1\u03b1.";
  }
  if (message.includes("Valid email")) {
    return "\u03a3\u03c5\u03bc\u03c0\u03bb\u03b7\u03c1\u03ce\u03c3\u03c4\u03b5 \u03ad\u03b3\u03ba\u03c5\u03c1\u03bf email \u03b5\u03c0\u03b9\u03c7\u03b5\u03af\u03c1\u03b7\u03c3\u03b7\u03c2.";
  }
  if (message.includes("Password is required")) {
    return "\u03a3\u03c5\u03bc\u03c0\u03bb\u03b7\u03c1\u03ce\u03c3\u03c4\u03b5 \u03c4\u03bf\u03bd \u03ba\u03c9\u03b4\u03b9\u03ba\u03cc.";
  }
  if (message.includes("Network request failed") || message.includes("Failed to fetch")) {
    return "\u0394\u03b5\u03bd \u03c6\u03c4\u03ac\u03bd\u03b5\u03b9 \u03c3\u03c4\u03bf API. \u0391\u03bd\u03bf\u03af\u03be\u03c4\u03b5 \u03c4\u03b5\u03c1\u03bc\u03b1\u03c4\u03b9\u03ba\u03cc \u03bc\u03b5 pnpm dev (\u03c0\u03bb\u03b1\u03c4\u03c6\u03cc\u03c1\u03bc\u03b1 + Metro).";
  }
  const lower = message.toLowerCase();
  if (
    lower.includes("network request timed out") ||
    lower.includes("request timed out") ||
    (lower.includes("timed out") && lower.includes("network"))
  ) {
    return getHorecaApiTimeoutMessageGr();
  }
  if (message.includes("API") && message.includes("pnpm dev")) {
    return message;
  }
  return (
    message ||
    "\u0397 \u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7 \u03b4\u03b5\u03bd \u03bf\u03bb\u03bf\u03ba\u03bb\u03b7\u03c1\u03ce\u03b8\u03b7\u03ba\u03b5. \u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03be\u03b1\u03bd\u03ac."
  );
}

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  /** Προεπιλογή ορατό κείμενο· το κουμπί δεξιά εναλλάσσει σε τελείες. */
  const [passwordVisible, setPasswordVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Latest values from inputs — avoids rare race if «Είσοδος» fires before React state flushes. */
  const emailLatestRef = useRef("");
  const passwordLatestRef = useRef("");

  const handleSignIn = async () => {
    const trimmedEmail = (emailLatestRef.current || email).trim().toLowerCase();
    const passwordToSend = passwordLatestRef.current || password;
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrorMessage("\u03a3\u03c5\u03bc\u03c0\u03bb\u03b7\u03c1\u03ce\u03c3\u03c4\u03b5 \u03ad\u03b3\u03ba\u03c5\u03c1\u03bf email \u03b5\u03c0\u03b9\u03c7\u03b5\u03af\u03c1\u03b7\u03c3\u03b7\u03c2.");
      return;
    }
    if (!passwordToSend) {
      setErrorMessage("\u03a3\u03c5\u03bc\u03c0\u03bb\u03b7\u03c1\u03ce\u03c3\u03c4\u03b5 \u03c4\u03bf\u03bd \u03ba\u03c9\u03b4\u03b9\u03ba\u03cc.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const result = await Api.loginWithEmailPassword(trimmedEmail, passwordToSend);
      await Api.applyAuthApiResult(result);
      await navigateAfterHorecaAuth(router);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(mapLoginError(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

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
                value={email}
                onChangeText={(v) => {
                  emailLatestRef.current = v;
                  setEmail(v);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="name@business.gr"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                autoComplete="email"
                className="rounded-2xl border border-border bg-background px-4 py-4 text-base text-foreground"
                returnKeyType="next"
              />
            </View>
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Κωδικός</Text>
              <View className="relative justify-center">
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    passwordLatestRef.current = v;
                    setPassword(v);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!passwordVisible}
                  textContentType="password"
                  autoComplete="password"
                  autoCapitalize="none"
                  autoCorrect={false}
                  passwordRules=""
                  className="rounded-2xl border border-border bg-background py-4 pl-4 pr-14 text-base text-foreground"
                  returnKeyType="done"
                  onSubmitEditing={handleSignIn}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={
                    passwordVisible ? "Απόκρυψη κωδικού (εμφάνιση ως τελείες)" : "Εμφάνιση κωδικού"
                  }
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  onPress={() => setPasswordVisible((v) => !v)}
                  className="absolute right-3 top-0 bottom-0 justify-center"
                >
                  <MaterialIcons
                    name={passwordVisible ? "visibility-off" : "visibility"}
                    size={24}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
            </View>
            {errorMessage ? <Text className="text-sm leading-5 text-error">{errorMessage}</Text> : null}
            <TouchableOpacity
              onPress={handleSignIn}
              disabled={isSubmitting}
              className={
                isSubmitting ? "rounded-full bg-primary px-4 py-4 opacity-70" : "rounded-full bg-primary px-4 py-4"
              }
            >
              <View className="flex-row items-center justify-center gap-2">
                {isSubmitting ? <ActivityIndicator color="#F8FAFC" /> : null}
                <Text className="text-center text-base font-semibold text-background">
                  {isSubmitting ? "Γίνεται σύνδεση..." : "Είσοδος"}
                </Text>
              </View>
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
