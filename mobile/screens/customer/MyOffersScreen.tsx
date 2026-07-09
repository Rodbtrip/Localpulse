import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Card, Eyebrow, PageTitle, Pill, PulseCode, Subtitle } from '../../components/ui';
import {
  deleteMyAccount,
  getMyClaimedOffers,
  getMySuggestionPrizes,
  getUnreadNotifications,
  markNotificationsRead,
  signOut,
} from '../../lib/api';
import { PipAssistant, PipFloating } from '../../components/PipAssistant';
import { useNavigation } from '@react-navigation/native';

export default function MyOffersScreen() {
  const navigation = useNavigation<any>();
  const [pipOpen, setPipOpen] = useState(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [prizes, setPrizes] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Each section loads independently so one failure never blanks the screen.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    const [c, p, n] = await Promise.allSettled([
      getMyClaimedOffers(),
      getMySuggestionPrizes(),
      getUnreadNotifications(),
    ]);
    if (c.status === 'fulfilled') setClaims(c.value);
    if (p.status === 'fulfilled') setPrizes(p.value);
    if (n.status === 'fulfilled') setNotes(n.value);
    if (c.status === 'rejected' && p.status === 'rejected') setLoadError(true);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Notifications are only marked read when the user dismisses them —
  // a glance at the tab no longer swallows a win announcement.
  function dismissNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    markNotificationsRead([id]).catch(() => {});
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account permanently?',
      'This cannot be undone. Your login and personal data are removed, and any unredeemed codes or prizes may be voided.',
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
                onPress: () => deleteMyAccount().catch((e: any) => Alert.alert('Could not delete', e.message)),
              },
            ]),
        },
      ]
    );
  }

  function confirmSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <SafeAreaView style={styles.shell} edges={['top']}>
      <FlatList
        data={claims}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.coral} />}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <PageTitle dot>My offers</PageTitle>
              <Pressable onPress={confirmSignOut}>
                <Text style={styles.signout}>Sign out</Text>
              </Pressable>
            </View>
            <Subtitle>Your claimed offers and contest prizes, ready to show at the counter.</Subtitle>

            {loadError && (
              <Text style={styles.errorText}>Couldn't load your offers — pull down to retry.</Text>
            )}

            {notes.map((n) => (
              <Card key={n.id} style={styles.noteCard}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Text style={[styles.noteText, { flex: 1 }]}>{n.message}</Text>
                  <Pressable onPress={() => dismissNote(n.id)} hitSlop={10}>
                    <Text style={styles.noteDismiss}>✕</Text>
                  </Pressable>
                </View>
              </Card>
            ))}

            {prizes.length > 0 && (
              <>
                <Eyebrow>Suggestion prizes</Eyebrow>
                {prizes.map((p) => (
                  <Card key={p.id} style={styles.prizeCard}>
                    <Text style={styles.cardTitle}>🏆 {p.prize_description}</Text>
                    <Text style={styles.meta}>
                      {p.shops?.name} · Earned from having the #1 voted suggestion. Redeemable only at this business.
                    </Text>
                    {p.status !== 'redeemed' ? <PulseCode code={p.code} /> : <Pill tone="paused" text="Redeemed" />}
                  </Card>
                ))}
                <View style={{ height: spacing.md }} />
              </>
            )}
            {claims.length > 0 && <Eyebrow>Claimed offers</Eyebrow>}
          </>
        }
        ListEmptyComponent={
          !loading && !loadError ? (
            <Text style={styles.empty}>Nothing claimed yet — find an offer nearby and it will show up here with its code.</Text>
          ) : null
        }
        ListFooterComponent={
          <View style={{ marginTop: 28 }}>
            <Text style={styles.footerHead}>ACCOUNT</Text>
            <Pressable onPress={confirmDelete}>
              <Text style={styles.deleteLink}>Delete my account…</Text>
            </Pressable>
            <Text style={styles.legalRow}>
              <Text
                style={styles.legalLink}
                onPress={() => navigation.navigate('Nearby', { screen: 'Legal', params: { doc: 'terms' } })}
              >
                Terms of Service
              </Text>
              {'   ·   '}
              <Text
                style={styles.legalLink}
                onPress={() => navigation.navigate('Nearby', { screen: 'Legal', params: { doc: 'privacy' } })}
              >
                Privacy Policy
              </Text>
              {'   ·   '}
              <Text
                style={styles.legalLink}
                onPress={() => navigation.navigate('Nearby', { screen: 'Legal', params: { doc: 'contest' } })}
              >
                Contest Rules
              </Text>
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const redeemed = !!item.redeemed_at;
          return (
            <Card style={{ marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.cardTitle}>{item.promotions?.title}</Text>
                  <Text style={styles.meta}>
                    {item.shops?.name}
                    {item.shops?.city ? ` · ${item.shops.city}` : ''}
                  </Text>
                </View>
                <Pill tone={redeemed ? 'paused' : 'active'} text={redeemed ? 'Redeemed' : 'Ready'} />
              </View>
              {!redeemed && <PulseCode code={item.code} />}
            </Card>
          );
        }}
      />

      <PipFloating onPress={() => setPipOpen(true)} />
      <PipAssistant
        mode="member"
        visible={pipOpen}
        onClose={() => setPipOpen(false)}
        onOpenShop={(shopId, shopName) =>
          navigation.navigate('Nearby', { screen: 'ShopDetail', params: { shopId, shopName } })
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  signout: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.4)', paddingTop: 10 },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.rose, marginBottom: 12, lineHeight: 19 },
  noteCard: { borderColor: colors.pulseBorder, backgroundColor: colors.pulseTint, marginBottom: spacing.sm },
  noteText: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  noteDismiss: { fontFamily: fonts.body, fontSize: 14, color: 'rgba(23,27,26,0.45)', paddingLeft: 10 },
  prizeCard: { borderColor: 'rgba(242,84,45,0.3)', backgroundColor: colors.coralTint, marginBottom: spacing.sm },
  cardTitle: { fontFamily: fonts.display, fontSize: 15.5, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.55)', marginTop: 2, lineHeight: 18 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 21 },
  footerHead: { fontFamily: fonts.bodyBold, fontSize: 10.5, letterSpacing: 0.6, color: colors.inkFaint, marginBottom: 8 },
  deleteLink: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: colors.rose, marginBottom: 14 },
  legalRow: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  legalLink: { fontFamily: fonts.bodySemi, color: colors.coral },
});
