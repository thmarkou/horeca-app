import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const MSG =
  "\u03a4\u03bf OAuth \u03b4\u03b5\u03bd \u03b5\u03af\u03bd\u03b1\u03b9 \u03b5\u03bd\u03b5\u03c1\u03b3\u03cc \u03c3\u03b5 \u03b1\u03c5\u03c4\u03cc \u03c4\u03bf demo. \u03a7\u03c1\u03b7\u03c3\u03b9\u03bc\u03bf\u03c0\u03bf\u03b9\u03ae\u03c3\u03c4\u03b5 \u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7 \u03bc\u03b5 email \u03ba\u03b1\u03b9 \u03ba\u03c9\u03b4\u03b9\u03ba\u03cc.";
const REDIRECT_HINT =
  "\u039c\u03b5\u03c4\u03b1\u03c6\u03bf\u03c1\u03ac \u03c3\u03c4\u03b7 \u03c3\u03b5\u03bb\u03af\u03b4\u03b1 \u03c3\u03cd\u03bd\u03b4\u03b5\u03c3\u03b7\u03c2\u2026";

/**
 * Deep link target for legacy OAuth flows. This MVP uses local email/password only.
 */
export default function OAuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/sign-in"), 1200);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text className="text-center text-base leading-6 text-foreground">{MSG}</Text>
        <Text className="text-center text-sm text-muted">{REDIRECT_HINT}</Text>
      </View>
    </SafeAreaView>
  );
}
