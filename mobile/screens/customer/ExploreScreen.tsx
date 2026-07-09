import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CustomerStackParams } from '../../App';
import { colors, fonts, spacing } from '../../lib/theme';
import { CategoryPill, Eyebrow, PageTitle, Pill, RowCard } from '../../components/ui';
import { LogoWordmark } from '../../components/Logo';
import { listNearbyShops, NearbyShop } from '../../lib/api';
import { PipAssistant, PipFloating } from '../../components/PipAssistant';

const FILTERS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'bakery', label: 'Bakeries' },
  { value: 'bar', label: 'Bars' },
  { value: 'salon', label: 'Salons' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'retail', label: 'Retail' },
  { value: 'pet_services', label: 'Pet services' },
  { value: 'healthcare_wellness', label: 'Wellness' },
];

const RADII_MILES = [5, 10, 25, 50];
const METERS_PER_MILE = 1609.34;

type Props = NativeStackScreenProps<CustomerStackParams, 'Explore'>;

export default function ExploreScreen({ navigation }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [radiusMi, setRadiusMi] = useState(10);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [usedLocation, setUsedLocation] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        } else {
          setLocationDenied(true);
        }
      } catch {
        setLocationDenied(true);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const result = await listNearbyShops({
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        radiusMeters: Math.round(radiusMi * METERS_PER_MILE),
        category,
      });
      setShops(result.shops);
      setUsedLocation(result.usedLocation);
    } catch {
      setShops([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [coords, radiusMi, category]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.shell} edges={['top']}>
      <View style={styles.header}>
        <LogoWordmark width={148} />
        <Eyebrow>Nearby offers</Eyebrow>
        <PageTitle dot>What's happening around you</PageTitle>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={{ paddingHorizontal: 24 }}>
        {FILTERS.map((f) => (
          <CategoryPill key={f.label} text={f.label} active={category === f.value} onPress={() => setCategory(f.value)} />
        ))}
      </ScrollView>

      {coords ? (
        <View style={styles.radiusRow}>
          {RADII_MILES.map((r) => (
            <Pressable key={r} onPress={() => setRadiusMi(r)} style={[styles.radiusBtn, radiusMi === r && styles.radiusBtnActive]}>
              <Text style={[styles.radiusText, radiusMi === r && { color: colors.ink, fontFamily: fonts.bodySemi }]}>
                {r} mi
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.locBanner}>
          <Text style={styles.locBannerText}>
            {locationDenied
              ? 'Location is off — showing all businesses without distances. Enable location in Settings for nearby results.'
              : 'Finding your location…'}
          </Text>
        </View>
      )}

      <FlatList
        data={shops}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.coral} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {loadError
                ? "Couldn't load businesses — check your connection and pull down to retry."
                : usedLocation
                ? `No offers within ${radiusMi} miles yet. Widen the radius, or check back — new businesses join every week.`
                : 'No businesses to show yet — check back soon.'}
            </Text>
          ) : null
        }
        renderItem={({ item }) => {
          const count = item.active_promotion_count;
          return (
            <RowCard
              title={item.name}
              meta={[
                item.city && item.state ? `${item.city}, ${item.state}` : null,
                item.distance_meters != null && item.distance_meters > 0
                  ? `${(item.distance_meters / METERS_PER_MILE).toFixed(1)} mi`
                  : null,
                count === 0 ? 'No offers right now' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              right={
                count ? (
                  <Pill tone="active" text={`${count} active offer${count === 1 ? '' : 's'}`} />
                ) : undefined
              }
              onPress={() => navigation.navigate('ShopDetail', { shopId: item.id, shopName: item.name })}
            />
          );
        }}
      />

      <PipFloating onPress={() => setPipOpen(true)} />
      <PipAssistant
        mode="member"
        visible={pipOpen}
        onClose={() => setPipOpen(false)}
        onOpenShop={(shopId, shopName) => navigation.navigate('ShopDetail', { shopId, shopName })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 24, paddingTop: spacing.md, paddingBottom: spacing.sm },
  pillRow: { flexGrow: 0, marginBottom: spacing.sm },
  radiusRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginBottom: spacing.md, gap: 8 },
  radiusBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  radiusBtnActive: { borderColor: colors.coral },
  radiusText: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkSoft },
  locBanner: {
    marginHorizontal: 24,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(23,27,26,0.15)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 4,
    padding: 12,
  },
  locBannerText: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.65)', lineHeight: 18 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.inkSoft, marginTop: 24, lineHeight: 21 },
});
