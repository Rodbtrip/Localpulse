import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, fonts, radius, spacing } from '../lib/theme';

// Animated pulse dot — the brand signature, kept subtle.
export function PulseDot({ size = 8 }: { size?: number }) {
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ring, { toValue: 1, duration: 1800, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [ring]);
  const scale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const opacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  return (
    <View style={{ width: size, height: size, marginRight: 8 }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: colors.pulse,
          transform: [{ scale }],
          opacity,
        }}
      />
      <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: colors.pulse }} />
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{String(children).toUpperCase()}</Text>;
}

export function PageTitle({ children, dot }: { children: React.ReactNode; dot?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {dot && <PulseDot />}
      <Text style={styles.pageTitle}>{children}</Text>
    </View>
  );
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function StatCard({ label, value, coral }: { label: string; value: string | number; coral?: boolean }) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, coral && { color: colors.coral }]}>{value}</Text>
    </Card>
  );
}

export function Button({
  title,
  onPress,
  secondary,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  secondary?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        secondary && styles.btnSecondary,
        disabled && { opacity: 0.5 },
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      <Text style={[styles.btnText, secondary && { color: colors.ink }]}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        placeholderTextColor={colors.inkFaint}
        {...props}
        style={[styles.input, props.multiline && { minHeight: 84, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

export function Pill({ text, tone }: { text: string; tone: 'active' | 'paused' | 'won' }) {
  const map = {
    active: { bg: 'rgba(34,197,94,0.15)', fg: colors.pulse },
    paused: { bg: 'rgba(23,27,26,0.08)', fg: colors.inkFaint },
    won: { bg: 'rgba(34,197,94,0.15)', fg: colors.pulse },
  } as const;
  return (
    <View style={[styles.pill, { backgroundColor: map[tone].bg }]}>
      <Text style={[styles.pillText, { color: map[tone].fg }]}>{text}</Text>
    </View>
  );
}

export function RowCard({
  title,
  meta,
  right,
  onPress,
  highlight,
}: {
  title: string;
  meta?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  highlight?: 'coral' | 'pulse';
}) {
  const hl =
    highlight === 'coral'
      ? { borderColor: colors.coralBorder, backgroundColor: colors.coralTint }
      : highlight === 'pulse'
      ? { borderColor: colors.pulseBorder, backgroundColor: colors.pulseTint }
      : null;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.rowCard, hl]}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function PulseCode({ code }: { code: string }) {
  return (
    <View style={styles.pulseCode}>
      <PulseDot />
      <Text style={styles.pulseCodeText}>{code}</Text>
    </View>
  );
}

export function CategoryPill({
  text,
  active,
  onPress,
}: {
  text: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.catPill, active && styles.catPillActive]}>
      <Text style={[styles.catPillText, active && { color: colors.paper }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1,
    color: colors.coral,
    marginBottom: 4,
  },
  pageTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  subtitle: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 4, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: spacing.md + 4,
  },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 10.5, letterSpacing: 0.6, color: colors.inkFaint, marginBottom: 6 },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  btn: {
    backgroundColor: colors.coral,
    borderRadius: radius.btn,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(23,27,26,0.2)',
  },
  btnText: { fontFamily: fonts.bodySemi, fontSize: 14.5, color: colors.paper },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: 'rgba(23,27,26,0.8)', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: radius.btn,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.ink,
  },
  pill: { paddingVertical: 5, paddingHorizontal: 14, borderRadius: radius.pill },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: spacing.sm,
  },
  rowTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  rowMeta: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.55)', marginTop: 2 },
  pulseCode: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.pulse,
    borderRadius: radius.btn,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: spacing.md,
  },
  pulseCodeText: { fontFamily: fonts.mono, fontSize: 18, letterSpacing: 2, color: colors.ink },
  catPill: {
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(23,27,26,0.15)',
    marginRight: 8,
  },
  catPillActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  catPillText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(23,27,26,0.7)' },
});
