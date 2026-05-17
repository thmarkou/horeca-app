import { useCallback, useState } from "react";
import { type LayoutChangeEvent, Text, View } from "react-native";
import Svg, { Circle, Line, Polygon, Polyline } from "react-native-svg";

import { formatEur } from "@/lib/format";

type Point = { x: number; y: number; value: number; label: string };

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Μίνι line chart για σειρά χρονικά ταξινομημένων τιμών (Φάση 3.3). Χωρίς επιπλέον chart dependency. */
export function SimpleSpendingLineChart(props: {
  series: readonly { label: string; value: number }[];
  strokeColor: string;
  fillColorMask: string;
  gridColor: string;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setWidth(Math.floor(e.nativeEvent.layout.width));
  }, []);

  const { series } = props;
  if (!series.length) return null;

  const height = 148;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 28;
  const innerW = Math.max(20, width - padL - padR);
  const innerH = height - padT - padB;
  const maxV = Math.max(...series.map((s) => s.value), 1e-9);
  const n = series.length;
  /** Ένα μόνο σημείο στο κέντρο· αλλιώς ομοιόμορφη κατανομή στα άκρα του chart. */
  const spanSteps = Math.max(n - 1, 1);

  const points: Point[] = series.map((s, i) => {
    const x = n <= 1 ? padL + innerW / 2 : padL + (i / spanSteps) * innerW;
    const yNorm = clamp(s.value / maxV, 0, 1);
    const y = padT + innerH * (1 - yNorm);
    return { x, y, value: s.value, label: s.label };
  });

  const linePts = points.map((p) => `${p.x},${p.y}`).join(" ");
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const baseY = padT + innerH;
  /** Κλείσιμο υπό τον άξονα — σειρά: αριστερή βάση → κορυφή γραμμής → δεξιά βάση */
  const areaPoints =
    `${first.x},${baseY} ` + points.map((p) => `${p.x},${p.y}`).join(" ") + ` ${last.x},${baseY}`;

  if (width < 48) {
    return (
      <View className="w-full" style={{ height }} onLayout={onLayout}>
        <View />
      </View>
    );
  }

  return (
    <View
      className="w-full gap-2"
      accessible
      accessibilityLabel={`Τάση εξόδων: ${series.length} μήνες. Πρώτη τιμή ${formatEur(first.value)}, τελευταία ${formatEur(last.value)}.`}
    >
      <View onLayout={onLayout}>
        <Svg width={width} height={height}>
          {[0.25, 0.5, 0.75].map((g) => {
            const gy = padT + innerH * (1 - g);
            return (
              <Line key={g} x1={padL} y1={gy} x2={width - padR} y2={gy} stroke={props.gridColor} strokeWidth={1} opacity={0.45} />
            );
          })}
          {n > 1 ? (
            <>
              <Polygon fill={props.fillColorMask} points={areaPoints} opacity={0.35} />
              <Polyline fill="none" points={linePts} stroke={props.strokeColor} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : (
            <Line
              x1={padL}
              y1={points[0]!.y}
              x2={width - padR}
              y2={points[0]!.y}
              stroke={props.strokeColor}
              strokeWidth={1.25}
              strokeDasharray="4 5"
              opacity={0.45}
            />
          )}
          {points.map((p, idx) => (
            <Circle key={series[idx]?.label ?? idx} cx={p.x} cy={p.y} r={3.25} fill={props.strokeColor} />
          ))}
        </Svg>
      </View>
      <View className="flex-row justify-between px-1">
        <Text className="max-w-[45%] text-[11px] font-medium text-muted" numberOfLines={1}>
          {first.label}
        </Text>
        <Text className="max-w-[45%] text-right text-[11px] font-medium text-muted" numberOfLines={1}>
          {last.label}
        </Text>
      </View>
    </View>
  );
}
