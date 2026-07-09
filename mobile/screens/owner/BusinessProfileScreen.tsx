import React, { useCallback, useState } from 'react';
import { Text, StyleSheet, ScrollView, Alert, View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Eyebrow, Field, Subtitle } from '../../components/ui';
import { CATEGORIES, getMyShop, upsertShop, Shop } from '../../lib/api';
import { parseLocalDateTime, DATE_HINT } from '../../lib/dates';

export default function BusinessProfileScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('coffee');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [reward, setReward] = useState('');
  const [contestEnds, setContestEnds] = useState('');
  const [busy, setBusy] = useState(false);
  const [showCats, setShowCats] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyShop()
        .then((s) => {
          setShop(s);
          if (s) {
            setName(s.name ?? '');
            setCategory(s.category ?? 'coffee');
            setDescription(s.description ?? '');
            setPhone(s.phone ?? '');
            setAddress(s.address ?? '');
            setCity(s.city ?? '');
            setState(s.state ?? '');
            setZip(s.zip ?? '');
            setLatitude(s.latitude != null ? String(s.latitude) : '');
            setLongitude(s.longitude != null ? String(s.longitude) : '');
            setReward(s.suggestion_reward ?? '');
            setContestEnds(s.suggestion_contest_ends_at ? s.suggestion_contest_ends_at.slice(0, 16) : '');
          }
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    }, [])
  );

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Your business name is required.');
      return;
    }
    let contestIso: string | null = null;
    if (contestEnds.trim()) {
      const parsed = parseLocalDateTime(contestEnds);
      if (!parsed) {
        Alert.alert('Check the voting deadline', DATE_HINT);
        return;
      }
      contestIso = parsed.toISOString();
    }
    const lat = latitude.trim() ? Number(latitude) : null;
    const lng = longitude.trim() ? Number(longitude) : null;
    if ((latitude.trim() && Number.isNaN(lat)) || (longitude.trim() && Number.isNaN(lng))) {
      Alert.alert('Check coordinates', 'Latitude and longitude must be numbers, e.g. 39.4143 and -77.4105.');
      return;
    }

    setBusy(true);
    try {
      await upsertShop(shop?.id ?? null, {
        name: name.trim(),
        category,
        description,
        phone,
        address,
        city,
        state,
        zip,
        latitude: lat,
        longitude: lng,
        suggestion_reward: reward.trim() || null,
        suggestion_contest_ends_at: contestIso,
      });
      const wasNew = !shop;
      const fresh = await getMyShop();
      setShop(fresh);
      Alert.alert(
        wasNew ? 'Your business is set up' : 'Saved',
        wasNew
          ? 'Your profile is created. Activate your subscription in More → Billing to go live to customers.'
          : 'Your business profile is up to date.'
      );
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  const catLabel = CATEGORIES.find((c) => c.value === category)?.label ?? category;
  const isNew = loaded && !shop;

  return (
    <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      {isNew && (
        <View style={styles.setupCard}>
          <Eyebrow>One-time setup</Eyebrow>
          <Text style={styles.setupTitle}>Welcome! Let's set up your business.</Text>
          <Text style={styles.setupBody}>
            Fill this in once and save — then you can publish promotions, run suggestion contests, and appear to
            customers nearby.
          </Text>
        </View>
      )}
      <Subtitle>This information appears to customers browsing nearby offers.</Subtitle>
      <Field label="Business name" value={name} onChangeText={setName} />

      <Text style={styles.label}>Category</Text>
      <Pressable style={styles.selector} onPress={() => setShowCats((v) => !v)}>
        <Text style={styles.selectorText}>{catLabel}</Text>
        <Text style={styles.selectorChevron}>{showCats ? '▴' : '▾'}</Text>
      </Pressable>
      {showCats && (
        <View style={styles.catList}>
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => {
                setCategory(c.value);
                setShowCats(false);
              }}
              style={[styles.catItem, c.value === category && { backgroundColor: colors.coralTint }]}
            >
              <Text style={[styles.catItemText, c.value === category && { fontFamily: fonts.bodySemi, color: colors.coral }]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      <Field label="Description" value={description} onChangeText={setDescription} multiline />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="Street address" value={address} onChangeText={setAddress} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 2 }}>
          <Field label="City" value={city} onChangeText={setCity} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="State" value={state} onChangeText={setState} autoCapitalize="characters" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="ZIP" value={zip} onChangeText={setZip} keyboardType="number-pad" />
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Latitude (optional)" value={latitude} onChangeText={setLatitude} keyboardType="numbers-and-punctuation" placeholder="39.4143" />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Longitude (optional)" value={longitude} onChangeText={setLongitude} keyboardType="numbers-and-punctuation" placeholder="-77.4105" />
        </View>
      </View>
      <Text style={styles.hint}>
        Coordinates let customers find you by distance in the nearby feed. You can copy them from Google Maps
        (press and hold your storefront on the map).
      </Text>

      <Field
        label="Suggestion contest prize"
        value={reward}
        onChangeText={setReward}
        placeholder="e.g. Free 12oz drink of your choice"
      />
      <Text style={styles.hint}>
        Required before customers can submit suggestions — shown so they know what they're playing for. Whoever
        submits the #1 voted suggestion gets this automatically once the round ends.
      </Text>
      <Field
        label="Voting round ends (optional)"
        value={contestEnds}
        onChangeText={setContestEnds}
        placeholder="YYYY-MM-DDTHH:MM"
        autoCapitalize="none"
      />
      <Text style={styles.hint}>
        Required before you can feature suggestions for voting. When this time passes, the #1 voted featured
        suggestion is automatically awarded, published as a real promotion, and the round resets — the only way
        contests resolve.
      </Text>
      <Button
        title={busy ? 'Saving…' : isNew ? 'Create my business profile' : 'Save business profile'}
        onPress={handleSave}
        disabled={busy || !loaded}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  setupCard: {
    borderWidth: 1,
    borderColor: 'rgba(242,84,45,0.35)',
    backgroundColor: colors.coralTint,
    borderRadius: 4,
    padding: 18,
    marginBottom: spacing.md,
  },
  setupTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink, marginTop: 2 },
  setupBody: { fontFamily: fonts.body, fontSize: 13, color: 'rgba(23,27,26,0.65)', lineHeight: 19, marginTop: 6 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, marginTop: -8, marginBottom: spacing.md, lineHeight: 17 },
  label: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: 'rgba(23,27,26,0.8)', marginBottom: 6 },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 3,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
  },
  selectorText: { fontFamily: fonts.body, fontSize: 14.5, color: colors.ink },
  selectorChevron: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint },
  catList: { borderWidth: 1, borderColor: colors.line, borderRadius: 3, backgroundColor: colors.white, marginTop: -10, marginBottom: spacing.md, maxHeight: 320 },
  catItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  catItemText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink },
});
