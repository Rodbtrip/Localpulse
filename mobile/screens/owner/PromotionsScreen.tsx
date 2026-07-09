import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, Modal, RefreshControl, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Field, Pill, RowCard } from '../../components/ui';
import {
  createPromotion,
  DISCOUNT_TYPES,
  formatDiscount,
  getMyShop,
  listPromotions,
  setPromotionActive,
  Promotion,
  Shop,
} from '../../lib/api';
import { parseLocalDateTime, DATE_HINT } from '../../lib/dates';

export default function PromotionsScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<(typeof DISCOUNT_TYPES)[number]['value']>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [starts, setStarts] = useState('');
  const [ends, setEnds] = useState('');
  const [limit, setLimit] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const s = await getMyShop();
      setShop(s);
      if (s) setPromos(await listPromotions(s.id));
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

  const needsValue = DISCOUNT_TYPES.find((t) => t.value === discountType)?.needsValue ?? true;

  async function handleCreate() {
    if (!shop) {
      Alert.alert('Set up your business first', 'Create your business profile in the Profile tab before publishing promotions.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Missing title', 'Give your promotion a title.');
      return;
    }
    const startDate = parseLocalDateTime(starts);
    const endDate = parseLocalDateTime(ends);
    if (!startDate || !endDate) {
      Alert.alert('Check the dates', DATE_HINT);
      return;
    }
    if (endDate <= startDate) {
      Alert.alert('Check the dates', 'End time must be after the start time.');
      return;
    }
    if (needsValue && (!discountValue.trim() || Number.isNaN(Number(discountValue)) || Number(discountValue) <= 0)) {
      Alert.alert('Missing value', discountType === 'percent' ? 'Enter the percent off, e.g. 50.' : 'Enter the dollar amount off, e.g. 5.');
      return;
    }
    setBusy(true);
    try {
      await createPromotion({
        shop_id: shop.id,
        title: title.trim(),
        description,
        discount_type: discountType,
        discount_value: needsValue ? Number(discountValue) : null,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        max_redemptions: limit.trim() ? parseInt(limit, 10) : null,
      });
      setShowCreate(false);
      setTitle(''); setDescription(''); setDiscountValue(''); setStarts(''); setEnds(''); setLimit('');
      load();
    } catch (e: any) {
      Alert.alert('Could not create promotion', e.message ?? 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePause(p: Promotion) {
    try {
      await setPromotionActive(p.id, !p.is_active);
      load();
    } catch (e: any) {
      Alert.alert('Could not update', e.message ?? 'Try again in a moment.');
    }
  }

  function meta(p: Promotion) {
    const s = new Date(p.start_time);
    const e = new Date(p.end_time);
    const t = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const day = s.toDateString() === new Date().toDateString() ? 'Today' : s.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const range = s.toDateString() === e.toDateString()
      ? `${day}, ${t(s)} – ${t(e)}`
      : `${day} – ${e.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    return `${formatDiscount(p.discount_type, p.discount_value)} · ${range}${p.max_redemptions ? ` · Limit ${p.max_redemptions}` : ''}`;
  }

  return (
    <View style={styles.shell}>
      <FlatList
        data={promos}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.coral} />}
        ListHeaderComponent={
          <>
            {loadError && (
              <Text style={styles.errorText}>Couldn't load promotions — pull down to retry.</Text>
            )}
            <Button title="Create a promotion" onPress={() => setShowCreate(true)} style={{ marginBottom: spacing.md }} />
          </>
        }
        ListEmptyComponent={
          !loading && !loadError ? (
            <Text style={styles.empty}>
              {shop
                ? 'No promotions yet — create your first one to appear in the customer feed.'
                : 'Set up your business profile in the Profile tab, then come back to publish your first promotion.'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <RowCard
            title={item.title}
            meta={meta(item)}
            right={<Pill tone={item.is_active ? 'active' : 'paused'} text={item.is_active ? 'Active' : 'Paused'} />}
            onPress={() =>
              Alert.alert(item.title, undefined, [
                { text: item.is_active ? 'Pause' : 'Resume', onPress: () => togglePause(item) },
                { text: 'Close', style: 'cancel' },
              ])
            }
          />
        )}
      />

      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>New promotion</Text>
              <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Half-off afternoon lattes" />
              <Field label="Description (optional)" value={description} onChangeText={setDescription} multiline />
              <Text style={styles.label}>Discount type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
                {DISCOUNT_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    onPress={() => setDiscountType(t.value)}
                    style={[styles.typePill, discountType === t.value && styles.typePillActive]}
                  >
                    <Text style={[styles.typePillText, discountType === t.value && { color: colors.paper }]}>
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {needsValue && (
                <Field
                  label={discountType === 'percent' ? 'Percent off' : 'Amount off ($)'}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="decimal-pad"
                  placeholder={discountType === 'percent' ? 'e.g. 50' : 'e.g. 5'}
                />
              )}
              <Field label="Starts" value={starts} onChangeText={setStarts} placeholder="YYYY-MM-DDTHH:MM" autoCapitalize="none" />
              <Field label="Ends" value={ends} onChangeText={setEnds} placeholder="YYYY-MM-DDTHH:MM" autoCapitalize="none" />
              <Text style={styles.hint}>{DATE_HINT} Times are in your local timezone.</Text>
              <Field label="Redemption limit (optional)" value={limit} onChangeText={setLimit} keyboardType="number-pad" placeholder="e.g. 50" />
              <Button title={busy ? 'Publishing…' : 'Publish promotion'} onPress={handleCreate} disabled={busy} style={{ marginBottom: 10 }} />
              <Button title="Cancel" secondary onPress={() => setShowCreate(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, lineHeight: 21 },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: colors.rose, marginBottom: 12, lineHeight: 19 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(21,26,29,0.45)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '88%', borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: colors.paper, padding: 24, paddingBottom: 40 },
  modalTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, marginBottom: spacing.md },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: 'rgba(23,27,26,0.8)', marginBottom: 6 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: -8, marginBottom: spacing.md, lineHeight: 17 },
  typePill: { borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(23,27,26,0.2)' },
  typePillActive: { backgroundColor: colors.coral, borderColor: colors.coral },
  typePillText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(23,27,26,0.7)' },
});
