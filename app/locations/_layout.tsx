import { Stack } from "expo-router";

export default function LocationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Πίσω",
      }}
    >
      <Stack.Screen name="index" options={{ title: "Καταστήματα" }} />
      <Stack.Screen name="new" options={{ title: "Νέο κατάστημα" }} />
      <Stack.Screen name="[id]" options={{ title: "Κατάστημα" }} />
    </Stack>
  );
}
