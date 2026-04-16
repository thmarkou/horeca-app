import { Text, View } from "react-native";

import type { OrderStatus } from "@/lib/mocks/horeca";
import { getOrderStatusClasses } from "@/lib/order-status-styles";

type StatusPillProps = {
  status: OrderStatus;
  /** Extra utility classes appended to the outer pill view (e.g. spacing/alignment). */
  className?: string;
};

/**
 * Rounded pill that displays an order status with colors driven by
 * `getOrderStatusClasses`. Keep this as the single source of truth for the
 * pill markup so status styling stays consistent across buyer, supplier and
 * detail screens.
 */
export function StatusPill({ status, className }: StatusPillProps) {
  const baseClassName = "rounded-full px-3 py-2";
  const statusClasses = getOrderStatusClasses(status);
  const composed = className ? `${baseClassName} ${className} ${statusClasses}` : `${baseClassName} ${statusClasses}`;

  return (
    <View className={composed}>
      <Text className="text-xs font-semibold">{status}</Text>
    </View>
  );
}
