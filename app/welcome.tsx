import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 justify-between pt-6 pb-4">
        <View className="gap-8">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Text className="text-xl font-bold text-primary">HS</Text>
          </View>

          <View className="gap-4">
            <Text className="text-[34px] font-bold leading-10 text-foreground">
              Η νέα ροή προμηθειών για κάθε επιχείρηση εστίασης.
            </Text>
            <Text className="text-base leading-7 text-muted">
              Σύγκρινε προμηθευτές, βρες τιμές, επανάλαβε παραγγελίες και διαχειρίσου τη συνεργασία σου από το κινητό με λιγότερα βήματα.
            </Text>
          </View>

          <View className="gap-3 rounded-[28px] border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Τι κερδίζεις</Text>
            <Text className="text-base leading-7 text-foreground">
              Κεντρική εικόνα για προμηθευτές, γρήγορες επαναληπτικές παραγγελίες, καλύτερο έλεγχο του daily ordering flow και πρόσβαση σε verified συνεργάτες.
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <TouchableOpacity onPress={() => router.push("/sign-up")} className="rounded-full bg-primary px-4 py-4">
            <Text className="text-center text-base font-semibold text-background">Ξεκίνα τώρα</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/sign-in")} className="rounded-full border border-border bg-surface px-4 py-4">
            <Text className="text-center text-base font-semibold text-foreground">Έχω ήδη λογαριασμό</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace("/(tabs)")}>
            <Text className="text-center text-sm font-semibold text-muted">Προβολή demo εμπειρίας</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenContainer>
  );
}
