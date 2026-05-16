import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { EmptyState } from "@/components/ui/empty-state";
import { useColors } from "@/hooks/use-colors";
import {
  useSupplierCategoriesQuery,
  useSupplierProfileQuery,
  useUpdateSupplierProfileMutation,
  type UpdateSupplierProfileInput,
} from "@/lib/horeca-queries";

/**
 * Όλα τα editable πεδία ως κανονικοποιημένη form state. Όταν στέλνουμε στο
 * server, στέλνουμε **μόνο** όσα έχουν αλλάξει σε σχέση με το original — έτσι
 * δεν επανα-ορίζουμε unchanged fields άσκοπα και η Zod refine() του server
 * («at least one field») δεν αποτυγχάνει αν ο user πατήσει «Αποθήκευση» χωρίς
 * αλλαγές (αντίθετα δείχνουμε hint και δεν στέλνουμε καθόλου request).
 */
type FormState = {
  name: string;
  category: string;
  location: string;
  deliveryTime: string;
  minimumOrder: string;
  highlight: string;
};

const FIELD_LIMITS = {
  name: 120,
  category: 40,
  location: 120,
  deliveryTime: 60,
  minimumOrder: 60,
  highlight: 160,
} as const;

export default function SupplierProfileEditScreen() {
  const router = useRouter();
  const colors = useColors();

  const profileQuery = useSupplierProfileQuery();
  const categoriesQuery = useSupplierCategoriesQuery();
  const updateProfile = useUpdateSupplierProfileMutation();

  const profile = profileQuery.data ?? null;

  const initialState = useMemo<FormState | null>(() => {
    if (!profile) return null;
    return {
      name: profile.name,
      category: profile.category,
      location: profile.location,
      deliveryTime: profile.deliveryTime,
      minimumOrder: profile.minimumOrder,
      highlight: profile.highlight,
    };
  }, [profile]);

  const [form, setForm] = useState<FormState | null>(initialState);

  // Όταν φορτώσει το profile (ή ξανα-φορτωθεί μετά από invalidation) αρχικοποίησε
  // τη form — αλλά μόνο αν δεν έχει ήδη γίνει local edit, για να μη χάνονται οι
  // αλλαγές του user σε background refetch.
  useEffect(() => {
    if (form === null && initialState !== null) {
      setForm(initialState);
    }
  }, [initialState, form]);

  if (profileQuery.isLoading || !form || !initialState) {
    return (
      <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
        <View className="flex-1 items-center justify-center">
          {profileQuery.isLoading ? (
            <ActivityIndicator color={String(colors.primary)} />
          ) : (
            <EmptyState
              icon={{ name: "person.crop.circle.fill", color: String(colors.primary) }}
              title="Δεν βρέθηκε προφίλ καταστήματος"
              body="Συνδέσου ως προμηθευτής για να επεξεργαστείς το προφίλ."
              cta={{ label: "Πίσω", onPress: () => router.back() }}
            />
          )}
        </View>
      </ScreenContainer>
    );
  }

  const setField = (key: keyof FormState) => (value: string) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  /** Επιστρέφει μόνο τα trimmed fields που διαφέρουν από το original. */
  const buildPatch = (): UpdateSupplierProfileInput => {
    const patch: UpdateSupplierProfileInput = {};
    (Object.keys(initialState) as (keyof FormState)[]).forEach((key) => {
      const next = form[key].trim();
      if (next.length > 0 && next !== initialState[key]) {
        patch[key] = next;
      }
    });
    return patch;
  };

  const handleSave = () => {
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      Alert.alert("Καμία αλλαγή", "Δεν υπάρχουν αλλαγές προς αποθήκευση.");
      return;
    }
    // Client-side guard για empty trimmed required fields — αλλιώς ο user
    // μπορεί να καθαρίσει ένα required field και να σταλεί stale value.
    const blankRequired = (Object.keys(initialState) as (keyof FormState)[]).find(
      (key) => form[key].trim().length === 0,
    );
    if (blankRequired) {
      Alert.alert(
        "Συμπλήρωσε όλα τα πεδία",
        "Κανένα πεδίο δεν μπορεί να είναι κενό. Συμπλήρωσέ τα ή πάτα «Πίσω».",
      );
      return;
    }
    updateProfile.mutate(patch, {
      onSuccess: () => {
        Alert.alert("Αποθηκεύτηκε", "Το προφίλ ενημερώθηκε.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      },
      onError: (e) => {
        const msg = e instanceof Error ? e.message : "Σφάλμα αποθήκευσης.";
        Alert.alert("Σφάλμα", msg);
      },
    });
  };

  const isBusy = updateProfile.isPending;
  const hasChanges = Object.keys(buildPatch()).length > 0;

  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 gap-4 pt-2">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={() => router.back()} accessibilityRole="button">
              <Text className="text-sm font-semibold text-primary">Πίσω</Text>
            </TouchableOpacity>
            {hasChanges ? (
              <Text className="text-xs font-semibold uppercase tracking-wide text-warning">
                Μη αποθηκευμένες αλλαγές
              </Text>
            ) : null}
          </View>

          <View className="gap-1">
            <Text className="text-[28px] font-bold leading-8 text-foreground">
              Επεξεργασία προφίλ
            </Text>
            <Text className="text-base leading-6 text-muted">
              Οι αλλαγές εμφανίζονται άμεσα στους αγοραστές που σε ανακαλύπτουν.
            </Text>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
          >
            <FieldGroup label="Επωνυμία">
              <FormInput
                value={form.name}
                onChangeText={setField("name")}
                placeholder="π.χ. Aegean Coffee Trade"
                maxLength={FIELD_LIMITS.name}
              />
            </FieldGroup>

            <FieldGroup label="Κατηγορία">
              <CategoryPicker
                value={form.category}
                onChange={setField("category")}
                categories={categoriesQuery.data ?? []}
                isLoading={categoriesQuery.isLoading}
              />
            </FieldGroup>

            <FieldGroup label="Έδρα / Περιοχή">
              <FormInput
                value={form.location}
                onChangeText={setField("location")}
                placeholder="π.χ. Πειραιάς, Αττική"
                maxLength={FIELD_LIMITS.location}
              />
            </FieldGroup>

            <FieldGroup label="Χρόνος παράδοσης">
              <FormInput
                value={form.deliveryTime}
                onChangeText={setField("deliveryTime")}
                placeholder="π.χ. Επόμενη εργάσιμη"
                maxLength={FIELD_LIMITS.deliveryTime}
              />
            </FieldGroup>

            <FieldGroup label="Ελάχιστη παραγγελία">
              <FormInput
                value={form.minimumOrder}
                onChangeText={setField("minimumOrder")}
                placeholder="π.χ. 80€ ή Χωρίς ελάχιστο"
                maxLength={FIELD_LIMITS.minimumOrder}
              />
            </FieldGroup>

            <FieldGroup label="Tagline / Highlight">
              <FormInput
                value={form.highlight}
                onChangeText={setField("highlight")}
                placeholder="Σύντομη περιγραφή της επιχείρησης"
                maxLength={FIELD_LIMITS.highlight}
                multiline
                numberOfLines={2}
              />
            </FieldGroup>
          </ScrollView>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isBusy || !hasChanges}
            accessibilityRole="button"
            accessibilityState={{ disabled: isBusy || !hasChanges }}
            className={`flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-4 ${
              isBusy || !hasChanges ? "opacity-50" : ""
            }`}
          >
            {isBusy ? <ActivityIndicator color={String(colors.background)} /> : null}
            <Text className="text-center text-base font-semibold text-background">
              {isBusy ? "Αποθήκευση…" : "Αποθήκευση"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</Text>
      {children}
    </View>
  );
}

function FormInput(props: React.ComponentProps<typeof TextInput>) {
  const colors = useColors();
  return (
    <TextInput
      placeholderTextColor={String(colors.muted)}
      className="rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground"
      {...props}
    />
  );
}

/**
 * Picker κατηγορίας — δείχνει τις υπάρχουσες κατηγορίες ως chips ώστε ο
 * supplier να βλέπει αμέσως πού «κάθονται» οι ομοειδείς προμηθευτές. Επιπλέον
 * παρέχουμε free-text input αν θέλει νέα κατηγορία (το backend δεν είναι
 * κλειδωμένο σε enum).
 */
function CategoryPicker({
  value,
  onChange,
  categories,
  isLoading,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: string[];
  isLoading: boolean;
}) {
  const colors = useColors();

  // Συμπεριλαμβάνουμε το τρέχον value στις chips ώστε αν είναι «νέα» κατηγορία
  // που μόλις πληκτρολογήθηκε, να εμφανίζεται highlighted.
  const allChips = useMemo(() => {
    const set = new Set(categories);
    if (value.trim()) set.add(value.trim());
    return Array.from(set);
  }, [categories, value]);

  return (
    <View className="gap-2">
      <FormInput
        value={value}
        onChangeText={onChange}
        placeholder="Επίλεξε ή πληκτρολόγησε κατηγορία"
        maxLength={FIELD_LIMITS.category}
      />
      {isLoading ? (
        <ActivityIndicator color={String(colors.primary)} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {allChips.map((cat) => {
            const isActive = cat === value;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => onChange(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                className={`rounded-full px-4 py-2 ${
                  isActive ? "bg-primary" : "border border-border bg-surface"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isActive ? "text-background" : "text-foreground"
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
