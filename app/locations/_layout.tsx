import { Stack } from "expo-router";

export default function LocationsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "Πίσω",
      }}
    >
      {/* Η πρώτη οθόνη ανοίγει με push από tabs· το nested stack δεν παίρνει προεπιλεγμένο `<` μέσω parent. */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: "Νέο κατάστημα" }} />
      <Stack.Screen name="[id]" options={{ title: "Κατάστημα" }} />
    </Stack>
  );
}
