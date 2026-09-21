import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle as SvgCircle } from "react-native-svg";
import { colors, radius } from "../constants/theme";

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

type Segment = {
  label: string;
  count: number;
  color: string;
};

export function WorkloadGraph({
  active,
  paused,
  done,
}: {
  active: number;
  paused: number;
  done: number;
}) {
  const total = active + paused + done;
  const segments: Segment[] = [
    { label: "Active", count: active, color: colors.green },
    { label: "Paused", count: paused, color: colors.orange },
    { label: "Done", count: done, color: colors.blue },
  ];

  return (
    <View style={styles.graph}>
      <View style={styles.graphHeader}>
        <View>
          <Text style={styles.graphTitle}>Workload overview</Text>
          <Text style={styles.graphSubtitle}>{total} tickets in workspace</Text>
        </View>
        <Ionicons name="pie-chart-outline" size={20} color={colors.muted} />
      </View>
      <View style={styles.circularGraph}>
        <CircularChart segments={segments} total={total} />
        <View style={styles.legend}>
          {segments.map((segment) => (
            <View style={styles.legendRow} key={segment.label}>
              <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
              <Text style={styles.legendLabel}>{segment.label}</Text>
              <Text style={styles.legendCount}>{segment.count}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function CircularChart({
  segments,
  total,
}: {
  segments: Segment[];
  total: number;
}) {
  const chartRadius = 47;
  const circumference = 2 * Math.PI * chartRadius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, total]);

  return (
    <View style={styles.donutWrap}>
      <Svg width={118} height={118} viewBox="0 0 118 118">
        <SvgCircle
          cx="59"
          cy="59"
          r={chartRadius}
          stroke={colors.canvas}
          strokeWidth="13"
          fill="none"
        />
        {segments.map((segment, index) => {
          const offset = segments
            .slice(0, index)
            .reduce((sum, item) => sum + (total ? item.count / total : 0), 0);
          const length = circumference * (total ? segment.count / total : 0);
          return (
            <AnimatedSegment
              key={segment.label}
              color={segment.color}
              circumference={circumference}
              length={length}
              offset={circumference * offset}
              progress={progress}
              radius={chartRadius}
            />
          );
        })}
      </Svg>
      <View style={styles.donutCenter}>
        <Text style={styles.totalValue}>{total}</Text>
        <Text style={styles.totalLabel}>total</Text>
      </View>
    </View>
  );
}

function AnimatedSegment({
  color,
  circumference,
  length,
  offset,
  progress,
  radius,
}: {
  color: string;
  circumference: number;
  length: number;
  offset: number;
  progress: ReturnType<typeof useSharedValue<number>>;
  radius: number;
}) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - progress.value * circumference + offset,
  }));

  return (
    <AnimatedCircle
      cx="59"
      cy="59"
      r={radius}
      stroke={color}
      strokeWidth="13"
      strokeDasharray={`${length} ${circumference - length}`}
      animatedProps={animatedProps}
      strokeLinecap="butt"
      fill="none"
      rotation="-90"
      origin="59, 59"
    />
  );
}

const styles = StyleSheet.create({
  graph: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 15,
    marginBottom: 25,
  },
  graphHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  graphTitle: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  graphSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 },
  circularGraph: {
    minHeight: 142,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 10,
  },
  donutWrap: {
    width: 118,
    height: 118,
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenter: { position: "absolute", alignItems: "center" },
  totalValue: { color: colors.ink, fontSize: 25, fontWeight: "800" },
  totalLabel: { color: colors.muted, fontSize: 11, marginTop: -2 },
  legend: { gap: 12, minWidth: 105 },
  legendRow: { flexDirection: "row", alignItems: "center" },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  legendLabel: { color: colors.muted, fontSize: 12, flex: 1 },
  legendCount: { color: colors.ink, fontSize: 13, fontWeight: "800" },
});
