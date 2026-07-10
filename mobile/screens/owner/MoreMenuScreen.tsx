import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { signOut } from '../../lib/api';

const ITEMS = [
  { label: 'Referrals', meta: 'Share your link, earn free months', screen: 'Referrals', params: undefined },
  { label: 'Billing', meta: 'Subscription, deactivation & account', screen: 'Billing', params: undefined },
  { label: 'QR Code', meta: 'Print it for your counter — customers scan to find you', screen: 'QRCode', params: undefined },
  { label: 'Terms of Service', meta: 'The agreement that governs LocalPulse', screen: 'Legal', params: { doc: 'terms' } },
  { label: 'Privacy Policy', meta: 'What we collect and how it is used', screen: 'Legal', params: { doc: 'privacy' } },
  { label: 'Contest Rules', meta: 'Official Deal Contest rules', screen: 'Legal', params: { doc: 'contest' } },
] as const;

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();

  function confirmSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <View style={styles.shell}>
      {ITEMS.map((item) => (
        <Pressable key={item.label} style={styles.row} onPress={() => navigation.navigate(item.screen as any, item.params as any)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.label}</Text>
            <Text style={styles.rowMeta}>{item.meta}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
      <Pressable style={[styles.row, { marginTop: spacing.lg }]} onPress={confirmSignOut}>
        <Text style={[styles.rowTitle, { color: colors.rose }]}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper, padding: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  rowTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  rowMeta: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.55)', marginTop: 2 },
  chevron: { fontFamily: fonts.body, fontSize: 22, color: colors.inkFaint },
});
