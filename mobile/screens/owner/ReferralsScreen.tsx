import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Card, Eyebrow, Pill, RowCard, StatCard, Subtitle } from '../../components/ui';
import { getMyShop, getReferralData } from '../../lib/api';

export default function ReferralsScreen() {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof getReferralData>> | null>(null);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'no-shop' | 'no-code' | 'error'>('loading');

  useEffect(() => {
    getMyShop()
      .then((s) => {
        if (!s) return setState('no-shop');
        if (!s.referral_code) return setState('no-code');
        return getReferralData(s.id, s.referral_code)
          .then((d) => {
            setInfo(d);
            setState('ready');
          })
          .catch(() => setState('error'));
      })
      .catch(() => setState('error'));
  }, []);

  async function copyLink() {
    if (!info) return;
    await Clipboard.setStringAsync(info.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state === 'loading') {
    return (
      <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24 }}>
        <Subtitle>Loading your referral details…</Subtitle>
      </ScrollView>
    );
  }
  if (state !== 'ready') {
    return (
      <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24 }}>
        <Subtitle>
          {state === 'no-shop'
            ? 'Set up your business profile first — your referral link is created with your shop.'
            : state === 'no-code'
            ? "Your referral code isn't ready yet — check back shortly after your shop is created."
            : "Couldn't load referrals — check your connection and reopen this screen."}
        </Subtitle>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Subtitle>
        Refer other businesses to LocalPulse. When they subscribe, you get a free month — automatically applied to your
        next bill.
      </Subtitle>

      <Card style={styles.linkCard}>
        <Eyebrow>Your referral link</Eyebrow>
        <Text style={styles.link}>{info?.link ?? 'Loading…'}</Text>
        <Button title={copied ? 'Copied!' : 'Copy link'} secondary onPress={copyLink} />
        {info?.code && (
          <Text style={styles.codeNote}>
            Or share your code directly: <Text style={styles.mono}>{info.code}</Text>
          </Text>
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.lg }}>
        <StatCard label="Businesses referred" value={info?.referred.length ?? 0} />
        <StatCard label="Free months earned" value={info?.freeMonthsEarned ?? 0} />
      </View>

      <Text style={styles.sectionTitle}>Referred businesses</Text>
      {info?.referred.map((r: any) => (
        <RowCard
          key={r.id}
          title={r.name}
          meta={`Joined ${new Date(r.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
          right={<Pill tone={r.converted ? 'active' : 'paused'} text={r.converted ? 'Subscribed ✓' : 'Pending'} />}
        />
      ))}
      {info && info.referred.length === 0 && (
        <Text style={styles.empty}>No referrals yet — share your link with a business you'd love to see on LocalPulse.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  linkCard: { borderColor: 'rgba(242,84,45,0.3)', backgroundColor: colors.coralTint, marginBottom: spacing.md },
  link: { fontFamily: fonts.mono, fontSize: 13, color: colors.ink, marginVertical: 10 },
  codeNote: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, marginTop: 10 },
  mono: { fontFamily: fonts.mono, color: colors.ink },
  sectionTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 21 },
});
