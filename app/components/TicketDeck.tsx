import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, radius } from "../constants/theme";
import { relativeTime } from "../lib/format";
import type { Ticket } from "../types";
import { StatusBadge } from "./ui";

const SWIPE_THRESHOLD = 72;
const DECK_HEIGHT = 318;
const SWIPE_CONFIG = { duration: 240, easing: Easing.out(Easing.cubic) };
const SPRING_CONFIG = { damping: 20, stiffness: 280, mass: 0.7 };

type TicketDeckProps = {
  tickets: Ticket[];
  deckIndex: number;
  onDeckIndexChange: Dispatch<SetStateAction<number>>;
};

function DeckCard({
  ticket,
  onPress,
}: {
  ticket: Ticket;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.accent} />
      <View style={styles.main}>
        <View style={styles.top}>
          <Text style={styles.key}>{ticket.ticket_key}</Text>
          <StatusBadge status={ticket.status} />
        </View>
        <Text style={styles.title} numberOfLines={2}>{ticket.title}</Text>
        <Text style={styles.project} numberOfLines={1}>{ticket.project_name}</Text>
        <View style={styles.lastSession}>
          <Ionicons name="time-outline" size={15} color={colors.muted} />
          <Text style={styles.lastSessionText} numberOfLines={1}>
            Last worked {relativeTime(ticket.updated_at)}
          </Text>
        </View>
        <View style={styles.nextAction}>
          <Text style={styles.nextLabel}>NEXT</Text>
          <Text style={styles.nextValue} numberOfLines={2}>
            {ticket.next_action || "No next action yet"}
          </Text>
        </View>
        <View style={styles.continue}>
          <Ionicons name="play" size={14} color="#fff" />
          <Text style={styles.continueText}>Continue working</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function TicketDeck({
  tickets,
  deckIndex,
  onDeckIndexChange,
}: TicketDeckProps) {
  const router = useRouter();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const animatingRef = useRef(false);

  const countRef = useRef(tickets.length);
  const onDeckIndexChangeRef = useRef(onDeckIndexChange);
  countRef.current = tickets.length;
  onDeckIndexChangeRef.current = onDeckIndexChange;

  const count = tickets.length;
  const ticket = tickets[deckIndex % count];
  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-320, 0, 320],
      [-5, 0, 5],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });
  const advanceDeck = useCallback((direction: number) => {
    const ticketCount = countRef.current;
    if (ticketCount < 2) return;
    onDeckIndexChangeRef.current(
      (prev) => (prev + direction + ticketCount) % ticketCount,
    );
  }, []);
  const finishSwipe = useCallback(() => {
    animatingRef.current = false;
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !animatingRef.current &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          !animatingRef.current &&
          Math.abs(gesture.dx) > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          translateX.value = gesture.dx;
          translateY.value = gesture.dy * 0.25;
        },
        onPanResponderRelease: (_, gesture) => {
          const ticketCount = countRef.current;
          const shouldSwipe =
            ticketCount >= 2 &&
            (Math.abs(gesture.dx) > SWIPE_THRESHOLD ||
              Math.abs(gesture.vx) > 0.7);

          if (!shouldSwipe) {
            translateX.value = withSpring(0, SPRING_CONFIG);
            translateY.value = withSpring(0, SPRING_CONFIG);
            return;
          }

          const direction = gesture.dx < 0 || gesture.vx < 0 ? 1 : -1;

          animatingRef.current = true;
          translateX.value = withTiming(direction * 460, SWIPE_CONFIG, (finished) => {
            if (finished) {
              translateX.value = 0;
              translateY.value = 0;
              runOnJS(advanceDeck)(direction);
            }
            runOnJS(finishSwipe)();
          });
          translateY.value = withTiming(translateY.value * 0.5, SWIPE_CONFIG);
        },
        onPanResponderTerminate: () => {
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
          animatingRef.current = false;
        },
      }),
    [advanceDeck, finishSwipe, translateX, translateY],
  );

  return (
    <View style={styles.deckWrapper}>
      {ticket ? (
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.card, animatedStyle]}
        >
          <DeckCard
            ticket={ticket}
            onPress={() => router.push(`/ticket/${ticket.id}`)}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  deckWrapper: {
    height: DECK_HEIGHT,
    marginBottom: 28,
    position: "relative",
  },
  card: {
    position: "absolute",
    left: 0,
    right: 0,
    height: DECK_HEIGHT,
    backgroundColor: colors.charcoal,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  accent: { height: 4, backgroundColor: colors.green },
  main: { padding: 18 },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  key: {
    color: "#9BE3C6",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    lineHeight: 24,
    height: 48,
    fontWeight: "800",
    marginTop: 11,
  },
  project: { color: "#AAB9BE", fontSize: 13, height: 18, marginTop: 4 },
  lastSession: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 18,
    marginTop: 17,
  },
  lastSessionText: { color: "#AAB9BE", fontSize: 12 },
  nextAction: {
    borderTopColor: "#405059",
    borderTopWidth: 1,
    marginTop: 17,
    paddingTop: 13,
    height: 69,
  },
  nextLabel: {
    color: "#88D9B8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  nextValue: { color: "#fff", fontSize: 13, lineHeight: 18, height: 36, fontWeight: "600", marginTop: 5 },
  continue: {
    backgroundColor: colors.green,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
    marginTop: 18,
  },
  continueText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
