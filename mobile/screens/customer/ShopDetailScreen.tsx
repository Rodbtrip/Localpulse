import React, { useCallback, useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView, Pressable, Alert, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParams } from '../../App';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Card, Eyebrow, Field, PageTitle, PulseCode, Subtitle } from '../../components/ui';
import {
  castVote,
  categoryLabel,
  claimPromotion,
  formatDiscount,
  getShopWithPromotions,
  getTopSuggestions,
  submitSuggestion,
  Promotion,
  Shop,
  SUGGESTION_MAX_LENGTH,
  TopSuggestion,
} from '../../lib/api';

type Props = NativeStackScreenProps<CustomerStackParams, 'ShopDetail'>;

export default function ShopDetailScreen({ route }: Props) {
  const { shopId } = route.params;
  const [shop, setShop] = useState<Shop | null>(null);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [options, setOptions] = useState<TopSuggestion[]>([]);
  const [claims, setClaims] = useState<Record<string, string>>({});
  const [suggestion, setSuggestion] = useState('');
  const [sent, setSent] = useState(false);
  const [voting, setVoting] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [{ shop: s, promotions }, top] = await Promise.all([
        getShopWithPromotions(shopId),
        getTopSuggestions(shopId),
      ]);
      setShop(s);
      setPromos(promotions);
      setOptions(top);
    } catch {
      setLoadError(true);
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const alreadyVoted = options.some((o) => o.already_voted_this_contest || o.is_my_vote);
  const hasPrize = !!shop?.suggestion_reward?.trim();

  async function handleVote(id: string) {
    if (alreadyVoted || voting) return;
    setVoting(true);
    try {
      await castVote(id);
      setOptions((prev) => prev.map((o) => ({ ...o, is_my_vote: o.id === id, already_voted_this_contest: true })));
    } catch (e: any) {
      Alert.alert('Vote not recorded', e.message ?? 'Try again in a moment.');
    } finally {
      setVoting(false);
    }
  }

  async function handleSuggest() {
    try {
      await submitSuggestion(shopId, suggestion);
      setSuggestion('');
      setSent(true);
    } catch (e: any) {
      Alert.alert('Could not send', e.message ?? 'Try again in a moment.');
    }
  }

  async function handleClaim(promo: Promotion) {
    try {
      const claim = await claimPromotion(promo.id);
      if (claim?.code) setClaims((c) => ({ ...c, [promo.id]: claim.code }));
    } catch (e: any) {
      Alert.alert('Could not claim', e.message ?? 'Try again in a moment.');
    }
  }

  function windowText(p: Promotion) {
    const s = new Date(p.start_time);
    const e = new Date(p.end_time);
    const t = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const sameDay = s.toDateString() === e.toDateString();
    const day = s.toDateString() === new Date().toDateString() ? 'Today' : s.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const range = sameDay ? `${day}, ${t(s)} – ${t(e)}` : `${day} – ${e.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    return `${formatDiscount(p.discount_type, p.discount_value)} · ${range}${p.max_redemptions ? ` · Limit ${p.max_redemptions}` : ''}`;
  }

  const overLimit = suggestion.length > SUGGESTION_MAX_LENGTH;

  return (
    <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      {loadError && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorText}>Couldn't load this business — check your connection.</Text>
          <Button title="Try again" secondary onPress={load} style={{ marginTop: 10 }} />
        </Card>
      )}

      {shop && (
        <>
          <Eyebrow>{categoryLabel(shop.category)}</Eyebrow>
          <PageTitle>{shop.name}</PageTitle>
          <Subtitle>
            {[shop.address, shop.city && shop.state ? `${shop.city}, ${shop.state}` : null].filter(Boolean).join(', ')}
          </Subtitle>
        </>
      )}

      {hasPrize && options.length > 0 && (
        <Card style={styles.prizeCard}>
          <Eyebrow>What you're voting for</Eyebrow>
          <Text style={styles.prizeTitle}>🏆 {shop!.suggestion_reward}</Text>
          <Text style={styles.meta}>Goes to whoever submitted the #1 voted suggestion once the round ends.</Text>
        </Card>
      )}

      {options.length > 0 && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.cardTitle}>Vote on the next deal</Text>
          <Text style={[styles.meta, { marginBottom: 14 }]}>
            Pick the one you'd actually come in for. One vote per contest — once cast, it's locked in. Results stay
            hidden until the round ends.
          </Text>
          {options.map((o) => {
            const isMine = o.is_my_vote;
            return (
              <Pressable
                key={o.id}
                onPress={() => handleVote(o.id)}
                disabled={alreadyVoted}
                style={[styles.pollOption, isMine && styles.pollOptionMine, alreadyVoted && !isMine && { opacity: 0.45 }]}
              >
                <Text style={styles.pollText}>{o.suggestion}</Text>
                {isMine && (
                  <View style={styles.voteBadge}>
                    <Text style={styles.voteBadgeText}>Your vote</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
          {alreadyVoted && (
            <Text style={[styles.meta, { marginTop: 10 }]}>
              You've voted in this contest. Check back once it ends to see if you picked the winner.
            </Text>
          )}
        </Card>
      )}

      {shop && (
        <Card style={{ marginBottom: spacing.lg }}>
          <Text style={styles.cardTitle}>Have an idea for a deal?</Text>
          {hasPrize ? (
            <>
              <Text style={[styles.meta, { marginBottom: 14 }]}>
                Suggest a promotion you'd actually use — the owner sees these directly.
              </Text>
              <Field
                label="Your suggestion"
                value={suggestion}
                onChangeText={(t) => {
                  setSuggestion(t);
                  setSent(false);
                }}
                multiline
                placeholder="e.g. A discount for the first hour you open on weekdays"
              />
              <Text style={[styles.charCount, overLimit && { color: colors.rose }]}>
                {suggestion.length} / {SUGGESTION_MAX_LENGTH}
              </Text>
              <Button title="Send suggestion" secondary onPress={handleSuggest} disabled={overLimit || !suggestion.trim()} />
              {sent && <Text style={styles.sentText}>Thanks — your idea was sent to the business owner.</Text>}
            </>
          ) : (
            <Text style={styles.meta}>
              This business hasn't set up its suggestion contest yet — check back soon.
            </Text>
          )}
        </Card>
      )}

      {promos.map((p) => {
        const started = new Date(p.start_time) <= new Date();
        return (
          <Card key={p.id} style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>{p.title}</Text>
            {p.description ? <Text style={styles.meta}>{p.description}</Text> : null}
            <Text style={[styles.meta, { marginBottom: 12 }]}>{windowText(p)}</Text>
            {claims[p.id] ? (
              <>
                <Text style={styles.meta}>Show this code at the counter:</Text>
                <PulseCode code={claims[p.id]} />
              </>
            ) : started ? (
              <Button title="Claim this offer" onPress={() => handleClaim(p)} />
            ) : (
              <Button
                title={`Starts ${new Date(p.start_time).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`}
                secondary
                disabled
              />
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  prizeCard: { marginBottom: spacing.md, borderColor: 'rgba(242,84,45,0.3)', backgroundColor: colors.coralTint },
  prizeTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginTop: 2 },
  cardTitle: { fontFamily: fonts.display, fontSize: 16, color: colors.ink, marginBottom: 2 },
  meta: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.55)', lineHeight: 18 },
  charCount: { fontFamily: fonts.body, fontSize: 11.5, color: colors.inkFaint, textAlign: 'right', marginTop: -8, marginBottom: 8 },
  pollOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  pollOptionMine: { borderColor: colors.coral, backgroundColor: colors.coralTint },
  pollText: { fontFamily: fonts.body, fontSize: 14, color: colors.ink, flex: 1, paddingRight: 8 },
  voteBadge: { backgroundColor: colors.coral, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 12 },
  voteBadgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.paper },
  sentText: { fontFamily: fonts.bodySemi, fontSize: 13.5, color: colors.pulse, marginTop: 10 },
  errorCard: { borderColor: 'rgba(194,59,75,0.4)', backgroundColor: 'rgba(194,59,75,0.06)', marginBottom: 12 },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.rose, lineHeight: 19 },
});
