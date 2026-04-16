import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  useCreateSupplierProductMutation,
  useDeleteSupplierProductMutation,
  useSupplierOwnProductsQuery,
  useUpdateSupplierProductMutation,
  type SupplierOwnProduct,
  type SupplierProductInput,
} from "@/lib/horeca-queries";

// Decimal μόνο με μέχρι 2 δεκαδικά. Ταιριάζει με το backend regex ώστε το
// client να αποτρέπει invalid submissions πριν φύγουν καν στο network.
const PRICE_REGEX = /^\d+(\.\d{1,2})?$/;

type FormState = {
  name: string;
  category: string;
  unit: string;
  price: string;
  description: string;
  availability: "immediate" | "limited";
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const EMPTY_FORM: FormState = {
  name: "",
  category: "",
  unit: "",
  price: "",
  description: "",
  availability: "immediate",
};

/**
 * Μετατρέπει ένα υπάρχον product από το cache σε form state. Η τιμή έρχεται
 * ήδη ως decimal string (`priceEur`) οπότε την χρησιμοποιούμε ως έχει.
 */
function toFormState(p: SupplierOwnProduct): FormState {
  return {
    name: p.name,
    category: p.category,
    unit: p.unit,
    price: p.priceEur,
    description: p.description ?? "",
    availability: p.availabilityStatus,
  };
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "Γράψε το όνομα του προϊόντος.";
  else if (form.name.trim().length > 120) errors.name = "Μέχρι 120 χαρακτήρες.";

  if (!form.category.trim()) errors.category = "Πρόσθεσε κατηγορία.";
  else if (form.category.trim().length > 40) errors.category = "Μέχρι 40 χαρακτήρες.";

  if (!form.unit.trim()) errors.unit = "Πρόσθεσε μονάδα (π.χ. 1 κιλό).";
  else if (form.unit.trim().length > 40) errors.unit = "Μέχρι 40 χαρακτήρες.";

  // Υποστήριξη ελληνικού κόμματος: ο χρήστης γράφει «19,90», το στέλνουμε ως «19.90».
  const normalizedPrice = form.price.trim().replace(",", ".");
  if (!normalizedPrice) errors.price = "Πρόσθεσε τιμή σε € (π.χ. 19.90).";
  else if (!PRICE_REGEX.test(normalizedPrice)) errors.price = "Μη έγκυρη τιμή. Παράδειγμα: 19.90";

  if (form.description.length > 500) errors.description = "Μέχρι 500 χαρακτήρες.";

  return errors;
}

export default function SupplierProductFormScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = id ?? null;
  const isEdit = productId !== null;

  // Το edit mode διαβάζει από το ίδιο cached list που βλέπει ο supplier στον
  // κατάλογο — δεν χρειαζόμαστε ξεχωριστό endpoint/fetch.
  const { data } = useSupplierOwnProductsQuery();
  const existingProduct = useMemo(
    () => (productId ? data?.products.find((p) => p.id === productId) ?? null : null),
    [data, productId],
  );

  const [form, setForm] = useState<FormState>(() =>
    existingProduct ? toFormState(existingProduct) : EMPTY_FORM,
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const createMutation = useCreateSupplierProductMutation();
  const updateMutation = useUpdateSupplierProductMutation();
  const deleteMutation = useDeleteSupplierProductMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
    if (submitError) setSubmitError(null);
  };

  const buildPayload = (): SupplierProductInput => ({
    name: form.name.trim(),
    category: form.category.trim(),
    unit: form.unit.trim(),
    priceEur: form.price.trim().replace(",", "."),
    description: form.description.trim() ? form.description.trim() : null,
    availability: form.availability,
  });

  const handleSubmit = () => {
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = buildPayload();
    const onSuccess = () => router.back();
    const onError = (err: unknown) => {
      const message = err instanceof Error ? err.message : "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
      setSubmitError(message);
    };

    if (isEdit && productId) {
      updateMutation.mutate({ productId, changes: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate(payload, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!isEdit || !productId) return;
    Alert.alert(
      "Διαγραφή προϊόντος",
      `Είσαι σίγουρος/η ότι θέλεις να διαγράψεις «${form.name || existingProduct?.name}»; Η ενέργεια δεν μπορεί να αναιρεθεί.`,
      [
        { text: "Άκυρο", style: "cancel" },
        {
          text: "Διαγραφή",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(
              { productId },
              {
                onSuccess: () => router.back(),
                onError: (err) => {
                  const message =
                    err instanceof Error ? err.message : "Δεν μπόρεσε να διαγραφεί.";
                  setSubmitError(message);
                },
              },
            );
          },
        },
      ],
    );
  };

  // Edit mode χωρίς cached product (π.χ. deep link) — δείχνουμε friendly state.
  if (isEdit && !existingProduct) {
    return (
      <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
        <TouchableOpacity onPress={() => router.back()} className="self-start">
          <Text className="text-sm font-semibold text-primary">Πίσω</Text>
        </TouchableOpacity>
        <View className="flex-1 items-center justify-center gap-2">
          <IconSymbol name="shippingbox.fill" size={48} color={colors.warning} />
          <Text className="text-base font-semibold text-foreground">Το προϊόν δεν βρέθηκε</Text>
          <Text className="text-center text-sm text-muted">
            Πιθανώς διαγράφηκε ή δεν ανήκει στον κατάλογό σου. Γύρνα πίσω στον κατάλογο.
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        >
          <View className="gap-5 pt-2">
            <TouchableOpacity onPress={() => router.back()} className="self-start">
              <Text className="text-sm font-semibold text-primary">Πίσω</Text>
            </TouchableOpacity>

            <View className="gap-2">
              <Text className="text-[28px] font-bold leading-8 text-foreground">
                {isEdit ? "Επεξεργασία προϊόντος" : "Νέο προϊόν"}
              </Text>
              <Text className="text-base leading-6 text-muted">
                {isEdit
                  ? "Ενημέρωσε τα στοιχεία του προϊόντος. Οι αλλαγές εμφανίζονται άμεσα στους αγοραστές."
                  : "Συμπλήρωσε τα βασικά — μπορείς πάντα να επεξεργαστείς αργότερα."}
              </Text>
            </View>

            <Field
              label="Όνομα"
              value={form.name}
              onChangeText={(v) => setField("name", v)}
              placeholder="π.χ. Brazil Santos Espresso Blend"
              error={errors.name}
              autoFocus={!isEdit}
            />

            <Field
              label="Κατηγορία"
              value={form.category}
              onChangeText={(v) => setField("category", v)}
              placeholder="π.χ. Καφές"
              error={errors.category}
            />

            <Field
              label="Μονάδα"
              value={form.unit}
              onChangeText={(v) => setField("unit", v)}
              placeholder="π.χ. 1 κιλό, 250 γρ., κιβώτιο 12 τεμ."
              error={errors.unit}
            />

            <Field
              label="Τιμή (€)"
              value={form.price}
              onChangeText={(v) => setField("price", v)}
              placeholder="π.χ. 19.90"
              error={errors.price}
              keyboardType="decimal-pad"
            />

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Διαθεσιμότητα</Text>
              <View className="flex-row gap-2">
                <SegmentedOption
                  label="Άμεσα διαθέσιμο"
                  selected={form.availability === "immediate"}
                  onPress={() => setField("availability", "immediate")}
                />
                <SegmentedOption
                  label="Περιορισμένο"
                  selected={form.availability === "limited"}
                  onPress={() => setField("availability", "limited")}
                />
              </View>
            </View>

            <Field
              label="Περιγραφή (προαιρετικό)"
              value={form.description}
              onChangeText={(v) => setField("description", v)}
              placeholder="Σύντομη περιγραφή για τον αγοραστή"
              error={errors.description}
              multiline
              numberOfLines={3}
            />

            {submitError ? (
              <View className="rounded-[16px] border border-error/40 bg-error/10 px-4 py-3">
                <Text className="text-sm text-error">{submitError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || isDeleting}
              accessibilityRole="button"
              accessibilityState={{ busy: isSubmitting, disabled: isSubmitting || isDeleting }}
              className={
                isSubmitting || isDeleting
                  ? "flex-row items-center justify-center gap-2 rounded-full bg-primary/60 px-4 py-4"
                  : "flex-row items-center justify-center gap-2 rounded-full bg-primary px-4 py-4"
              }
            >
              {isSubmitting ? <ActivityIndicator color={colors.background} /> : null}
              <Text className="text-base font-semibold text-background">
                {isEdit ? "Αποθήκευση" : "Προσθήκη προϊόντος"}
              </Text>
            </TouchableOpacity>

            {isEdit ? (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isSubmitting || isDeleting}
                accessibilityRole="button"
                accessibilityLabel="Διαγραφή προϊόντος"
                accessibilityState={{ busy: isDeleting }}
                className="flex-row items-center justify-center gap-2 rounded-full border border-error/40 bg-error/10 px-4 py-4"
              >
                {isDeleting ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <IconSymbol name="trash.fill" size={16} color={colors.error} />
                )}
                <Text className="text-base font-semibold text-error">Διαγραφή προϊόντος</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function Field({
  label,
  error,
  multiline,
  ...inputProps
}: {
  label: string;
  error?: string;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const colors = useColors();
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      <TextInput
        placeholderTextColor={String(colors.muted)}
        multiline={multiline}
        {...inputProps}
        className={
          error
            ? `rounded-[16px] border border-error/60 bg-surface px-4 py-3 text-base text-foreground ${multiline ? "min-h-[80px]" : ""}`
            : `rounded-[16px] border border-border bg-surface px-4 py-3 text-base text-foreground ${multiline ? "min-h-[80px]" : ""}`
        }
        style={multiline ? { textAlignVertical: "top" } : undefined}
      />
      {error ? <Text className="text-xs text-error">{error}</Text> : null}
    </View>
  );
}

function SegmentedOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={
        selected
          ? "flex-1 items-center rounded-full bg-primary px-4 py-3"
          : "flex-1 items-center rounded-full border border-border bg-surface px-4 py-3"
      }
    >
      <Text
        className={
          selected ? "text-sm font-semibold text-background" : "text-sm font-semibold text-foreground"
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
