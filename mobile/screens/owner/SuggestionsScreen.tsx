import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, RefreshControl, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Pill, Subtitle } from '../../components/ui';
import {
  DealSuggestion,
  getMyShop,
  listSuggestions,
  setSuggestionStatus,
  Shop,
  toggleFeatured,
  OWNER_STATUSES,
  WON_STATUS,
} from '../../lib/api';

const STATUS_LABELS: Record<string, string> = { new: 'New', reviewed: 'Reviewed', declined: 'Declined' };

export default function SuggestionsScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [items, setItems] = useState<DealSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const s = await getMyShop();
      setShop(s);
      if (s) setItems(await listSuggestions(s.id));
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

  const featuredCount = items.filter((i) => i.featured).length;

  async function handleFeature(sug: DealSuggestion) {
    if (!shop) return;
    if (!sug.featured && !shop.suggestion_contest_ends_at) {
      Alert.alert(
        'Set a voting deadline first',
        'Add a voting round end time in your business profile before featuring suggestions.'
      );
      return;
    }
    try {
      await toggleFeatured(shop.id, sug.id, !sug.featured);
      load();
    } catch (e: any) {
      Alert.alert('Cannot feature', e.message);
    }
  }

  // Explicit choice instead of silent cycling — no accidental status changes.
  function chooseStatus(sug: DealSuggestion) {
    Alert.alert(
      'Set status',
      sug.suggestion.length > 80 ? sug.suggestion.slice(0, 80) + '…' : sug.suggestion,
      [
        ...OWNER_STATUSES.map((status) => ({
          text: STATUS_LABELS[status] + (sug.status === status ? ' ✓' : ''),
          onPress: () => {
            if (sug.status === status) return;
            setSuggestionStatus(sug.id, status)
              .then(load)
              .catch((e: any) => Alert.alert('Could not update', e.message));
          },
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  }

  function ago(iso: string) {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;
  }

  return (
    <View style={styles.shell}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.coral} />}
        ListHeaderComponent={
          <>
            {loadError && <Text style={styles.errorText}>Couldn't load suggestions — pull down to retry.</Text>}
            <Subtitle>
              Every idea customers submit shows up here. Pick up to 3 to put up for a public vote — everything else
              stays visible, just not votable yet. Contests resolve automatically when your voting deadline passes.
            </Subtitle>
            <Text style={styles.counter}>{featuredCount} / 3 FEATURED FOR PUBLIC VOTING</Text>
          </>
        }
        ListEmptyComponent={
          !loading && !loadError ? (
            <Text style={styles.empty}>
              {shop
                ? "No suggestions yet. They'll appear here as customers send ideas from your shop page."
                : 'Set up your business profile in the Profile tab first — suggestions arrive once customers can find you.'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const won = item.status === WON_STATUS;
          return (
            <View style={[styles.card, item.featured && !won && styles.cardFeatured, won && styles.cardWon]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.title}>{item.suggestion}</Text>
                <Text style={styles.meta}>
                  {item.profiles?.full_name ?? 'Customer'} · {ago(item.created_at)}
                  {item.featured && !won ? (
                    <Text style={{ color: colors.coral, fontFamily: fonts.bodyBold }}> · Votes hidden until contest ends</Text>
                  ) : null}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                {won ? (
                  <Pill tone="won" text="🎉 Won" />
                ) : (
                  <>
                    <Pressable onPress={() => handleFeature(item)} style={[styles.featureBtn, item.featured && styles.featureBtnOn]}>
                      <Text style={[styles.featureText, item.featured && { color: colors.paper }]}>
                        {item.featured ? '★ Featured' : 'Feature this'}
                      </Text>
                    </Pressable>
                    <Pressable onPress={() => chooseStatus(item)} style={styles.statusBtn}>
                      <Text style={styles.statusText}>Status: {STATUS_LABELS[item.status] ?? item.status} ▾</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  counter: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.6, color: colors.inkFaint, marginBottom: spacing.md },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 21 },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.rose, marginBottom: 12, lineHeight: 19 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    padding: 16,
    marginBottom: spacing.sm,
  },
  cardFeatured: { borderColor: colors.coralBorder, backgroundColor: colors.coralTint },
  cardWon: { borderColor: colors.pulseBorder, backgroundColor: colors.pulseTint },
  title: { fontFamily: fonts.display, fontSize: 15.5, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(23,27,26,0.55)', marginTop: 2 },
  featureBtn: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(23,27,26,0.2)' },
  featureBtnOn: { backgroundColor: colors.coral, borderColor: colors.coral },
  featureText: { fontFamily: fonts.bodyBold, fontSize: 11.5, color: 'rgba(23,27,26,0.7)' },
  statusBtn: { borderRadius: 20, paddingVertical: 5, paddingHorizontal: 10, backgroundColor: 'rgba(23,27,26,0.06)' },
  statusText: { fontFamily: fonts.bodyMedium, fontSize: 11, color: 'rgba(23,27,26,0.6)' },
});
