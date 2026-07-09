import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Card, Eyebrow, PulseDot, Subtitle } from '../../components/ui';
import { deleteMyAccount, getMyShop, getMySubscription, setBusinessActive, Shop } from '../../lib/api';

// Subscription management stays on the web (Stripe) to comply with app
// store billing rules for physical-world services.
const BILLING_URL = 'https://localpulse.app/billing';

export default function BillingScreen() {
  const navigation = useNavigation<any>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyShop().then((s) => {
        setShop(s);
        if (s) getMySubscription(s.id).then((sub) => setStatus(sub?.status ?? null));
      });
    }, [])
  );

  const active = status === 'active' || status === 'trialing';

  async function toggleBusinessActive() {
    if (!shop) return;
    const goingOffline = shop.is_active;
    const doIt = async () => {
      setBusy(true);
      try {
        await setBusinessActive(shop.id, !goingOffline);
        const fresh = await getMyShop();
        setShop(fresh);
      } catch (e: any) {
        Alert.alert('Could not update', e.message ?? 'Try again in a moment.');
      } finally {
        setBusy(false);
      }
    };
    if (goingOffline) {
      Alert.alert(
        'Take your business offline?',
        'Your listings and promotions disappear from customer feeds immediately. Your data is kept and you can come back online here any time. This does not cancel your subscription.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Take offline', style: 'destructive', onPress: doIt },
        ]
      );
    } else {
      doIt();
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account permanently?',
      'This cannot be undone. Your login and personal data are removed and your business goes offline. Important: deleting your account does NOT cancel your Stripe subscription — cancel it first under Manage subscription.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Are you absolutely sure?', 'Last chance — this is permanent.', [
              { text: 'Keep my account', style: 'cancel' },
              {
                text: 'Delete permanently',
                style: 'destructive',
                onPress: async () => {
                  setBusy(true);
                  try {
                    await deleteMyAccount(); // signs out; App.tsx routes to auth
                  } catch (e: any) {
                    Alert.alert('Could not delete', e.message);
                  } finally {
                    setBusy(false);
                  }
                },
              },
            ]),
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Subtitle>Your LocalPulse subscription — required to appear live to customers.</Subtitle>
      <Card>
        <Text style={styles.plan}>LocalPulse Business</Text>
        <Text style={styles.price}>
          $49<Text style={styles.per}>/mo</Text>
        </Text>
        <View style={{ marginBottom: spacing.md }}>
          {[
            'Unlimited promotions',
            'Customer suggestion box with prize contests',
            'Market explore view',
            'Referral rewards: earn a free month per referred business',
          ].map((f) => (
            <Text key={f} style={styles.feature}>— {f}</Text>
          ))}
        </View>
        {active && (
          <View style={styles.activeBox}>
            <PulseDot />
            <Text style={styles.activeText}>Active subscription</Text>
          </View>
        )}
        <Button
          title="Manage subscription"
          secondary={active}
          style={active ? { marginTop: 12 } : undefined}
          onPress={() => WebBrowser.openBrowserAsync(BILLING_URL)}
        />
      </Card>

      <View style={{ height: spacing.lg }} />
      <Eyebrow>Account</Eyebrow>
      <Card>
        <Text style={styles.acctTitle}>{shop?.is_active ? 'Deactivate my business' : 'Reactivate my business'}</Text>
        <Text style={styles.acctBody}>
          {shop?.is_active
            ? 'Take your listings offline whenever you like — a break, a renovation, a season. Everything is kept, and you can come back with one tap.'
            : 'Your business is currently offline. Reactivate to appear to customers again.'}
        </Text>
        <Button
          title={busy ? 'Working…' : shop?.is_active ? 'Take my business offline' : 'Bring my business back online'}
          secondary
          onPress={toggleBusinessActive}
          disabled={busy || !shop}
        />
      </Card>
      <Card style={styles.dangerCard}>
        <Text style={styles.acctTitle}>Delete my account</Text>
        <Text style={styles.acctBody}>
          Permanently removes your login and personal data. This cannot be undone. Cancel your Stripe subscription first.
        </Text>
        <Button title="Delete my account…" secondary onPress={confirmDelete} disabled={busy} />
      </Card>

      <Text style={styles.legalRow}>
        <Text style={styles.link} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>Terms of Service</Text>
        {'   ·   '}
        <Text style={styles.link} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>Privacy Policy</Text>
        {'   ·   '}
        <Text style={styles.link} onPress={() => navigation.navigate('Legal', { doc: 'contest' })}>Contest Rules</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  plan: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  price: { fontFamily: fonts.display, fontSize: 30, color: colors.ink, marginVertical: 8 },
  per: { fontFamily: fonts.body, fontSize: 14, color: colors.inkFaint },
  feature: { fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(23,27,26,0.7)', lineHeight: 24 },
  activeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.1)',
    borderRadius: 3,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.pulse },
  acctTitle: { fontFamily: fonts.display, fontSize: 15.5, color: colors.ink, marginBottom: 4 },
  acctBody: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.62)', lineHeight: 18, marginBottom: 12 },
  dangerCard: { borderColor: 'rgba(194,59,75,0.35)', backgroundColor: 'rgba(194,59,75,0.04)' },
  legalRow: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, textAlign: 'center', marginTop: spacing.lg },
  link: { fontFamily: fonts.bodySemi, color: colors.coral },
});
