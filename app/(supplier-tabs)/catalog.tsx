import { Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

/** Placeholder: Phase C — supplier product / pricing management via API. */
const TITLE = "\u039a\u03b1\u03c4\u03ac\u03bb\u03bf\u03b3\u03bf\u03c2";
const BODY =
  "\u0395\u03b4\u03ce \u03b8\u03b1 \u03b4\u03b9\u03b1\u03c7\u03b5\u03b9\u03c1\u03af\u03b6\u03b5\u03c3\u03c4\u03b5 \u03c0\u03c1\u03bf\u03ca\u03cc\u03bd\u03c4\u03b1 \u03ba\u03b1\u03b9 \u03c4\u03b9\u03bc\u03ad\u03c2 \u03b3\u03b9\u03b1 \u03c4\u03b7\u03bd \u03b5\u03c0\u03b9\u03c7\u03b5\u03af\u03c1\u03b7\u03c3\u03ae \u03c3\u03b1\u03c2 \u03c3\u03c4\u03b7\u03bd \u03c0\u03bb\u03b1\u03c4\u03c6\u03cc\u03c1\u03bc\u03b1. \u0397 \u03bb\u03b5\u03b9\u03c4\u03bf\u03c5\u03c1\u03b3\u03af\u03b1 \u03ad\u03c1\u03c7\u03b5\u03c4\u03b1\u03b9 \u03c3\u03b5 \u03b5\u03c0\u03cc\u03bc\u03b5\u03bd\u03bf sprint.";

export default function SupplierCatalogPlaceholderScreen() {
  return (
    <ScreenContainer className="px-5 py-4" edges={["top", "bottom", "left", "right"]}>
      <View className="flex-1 justify-center gap-4 pt-4">
        <Text className="text-[28px] font-bold leading-8 text-foreground">{TITLE}</Text>
        <Text className="text-base leading-6 text-muted">{BODY}</Text>
      </View>
    </ScreenContainer>
  );
}
