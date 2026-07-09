import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Card, Eyebrow, PageTitle, PulseDot, StatCard } from '../../components/ui';
import { LogoWordmark } from '../../components/Logo';
import { getMyShop, getMySubscription, getOwnerStats, Shop } from '../../lib/api';
import { PipAssistant, PipFloating } from '../../components/PipAssistant';

export default function OverviewScreen() {
  const navigation = useNavigation<any>();
  const [shop, setShop] = useState<Shop | null>(null);
  const [subActive, setSubActive] = useState(false);
  const [stats, setStats] = useState({ activePromotions: 0, claimed: 0, redeemed: 0, redemptionRate: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const s = await getMyShop();
      setShop(s);
      if (s) {
        const [st, sub] = await Promise.all([getOwnerStats(s.id), getMySubscription(s.id)]);
        setStats(st);
        setSubActive(sub?.status === 'active' || sub?.status === 'trialing');
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const live = subActive && !!shop?.is_active;
  const noShop = !loading && !loadError && !shop;

  return (
    <SafeAreaView style={styles.shell} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.coral} />}
      >
        <LogoWordmark width={148} />

        {loadError && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>Couldn't load your dashboard — check your connection and pull down to retry.</Text>
          </Card>
        )}

        {noShop ? (
          <Card style={styles.setupCard}>
            <Eyebrow>Welcome to LocalPulse</Eyebrow>
            <Text style={styles.setupTitle}>Set up your business to get started</Text>
            <Text style={styles.setupBody}>
              Create your business profile — name, category, location, and your suggestion contest prize. It takes
              about two minutes, and then you can publish your first promotion.
            </Text>
            <Button title="Set up my business" onPress={() => navigation.navigate('Profile')} style={{ marginTop: 14 }} />
          </Card>
        ) : (
          <>
            <PageTitle>{shop?.name ?? ' '}</PageTitle>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: spacing.lg }}>
              {live && <PulseDot />}
              <Text style={styles.liveText}>
                {live
                  ? 'Live and visible to customers'
                  : 'Not yet visible — activate your subscription in More → Billing'}
              </Text>
            </View>

            <View style={styles.grid}>
              <StatCard label="Active promotions" value={stats.activePromotions} />
              <StatCard label="Offers claimed" value={stats.claimed} />
            </View>
            <View style={styles.grid}>
              <StatCard label="Redeemed in-store" value={stats.redeemed} />
              <StatCard label="Redemption rate" value={`${stats.redemptionRate}%`} coral />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: spacing.md }}>
              <Button title="Create a promotion" onPress={() => navigation.navigate('Promotions')} style={{ flex: 1 }} />
              <Button title="Redeem a code" secondary onPress={() => navigation.navigate('Redeem')} style={{ flex: 1 }} />
            </View>
          </>
        )}
      </ScrollView>

      <PipFloating onPress={() => setPipOpen(true)} />
      <PipAssistant mode="owner" visible={pipOpen} onClose={() => setPipOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  liveText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, flexShrink: 1 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  setupCard: { borderColor: 'rgba(242,84,45,0.35)', backgroundColor: colors.coralTint },
  setupTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink, marginTop: 2 },
  setupBody: { fontFamily: fonts.body, fontSize: 13.5, color: 'rgba(23,27,26,0.68)', lineHeight: 20, marginTop: 8 },
  errorCard: { borderColor: 'rgba(194,59,75,0.4)', backgroundColor: 'rgba(194,59,75,0.06)', marginBottom: 12 },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.rose, lineHeight: 19 },
});
