import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Share } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Card, Eyebrow, Subtitle } from '../../components/ui';
import { getMyShop, shopScanUrl, Shop } from '../../lib/api';

export default function QRCodeScreen() {
  const [shop, setShop] = useState<Shop | null>(null);
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyShop().then(setShop).catch(() => {});
    }, [])
  );

  if (!shop) {
    return (
      <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24 }}>
        <Subtitle>Set up your business profile first — your QR code is created with your shop.</Subtitle>
      </ScrollView>
    );
  }

  const url = shopScanUrl(shop.id);

  async function copyLink() {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function shareLink() {
    try {
      await Share.share({
        message: `Find our latest offers on LocalPulse: ${url}`,
      });
    } catch (e: any) {
      Alert.alert('Could not share', e.message ?? 'Try again in a moment.');
    }
  }

  return (
    <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
      <Subtitle>
        Print this and put it by the register. Customers who scan it land on your LocalPulse page — your live offers,
        your contest, one tap from claiming.
      </Subtitle>

      <Card style={styles.qrCard}>
        <Eyebrow>Scan for offers</Eyebrow>
        <Text style={styles.shopName}>{shop.name}</Text>
        <View style={styles.qrBox}>
          {/* Rendered as SVG so it stays razor-sharp at any print size. */}
          <QRCode
            value={url}
            size={208}
            color={colors.ink}
            backgroundColor={colors.white}
            ecl="M"
          />
        </View>
        <Text style={styles.caption}>Powered by LocalPulse</Text>
      </Card>

      <Text style={styles.linkLabel}>The link behind the code</Text>
      <Text style={styles.link}>{url}</Text>

      <Button title={copied ? 'Copied!' : 'Copy link'} secondary onPress={copyLink} style={{ marginBottom: 10 }} />
      <Button title="Share QR link" onPress={shareLink} />

      <Text style={styles.tip}>
        Tip: this same code is in your welcome email, ready to print. Screenshot this screen for a quick counter sign,
        or forward the email to your printer for a full-page version.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  qrCard: { alignItems: 'center', borderColor: 'rgba(242,84,45,0.3)', backgroundColor: colors.coralTint, marginBottom: spacing.lg },
  shopName: { fontFamily: fonts.display, fontSize: 18, color: colors.ink, marginBottom: spacing.md, textAlign: 'center' },
  qrBox: { backgroundColor: colors.white, padding: 16, borderRadius: 4, borderWidth: 1, borderColor: colors.line },
  caption: { fontFamily: fonts.mono, fontSize: 10.5, letterSpacing: 1, color: colors.inkFaint, marginTop: spacing.md },
  linkLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: 'rgba(23,27,26,0.8)', marginBottom: 4 },
  link: { fontFamily: fonts.mono, fontSize: 12.5, color: colors.ink, marginBottom: spacing.md },
  tip: { fontFamily: fonts.body, fontSize: 12.5, color: colors.inkFaint, lineHeight: 19, marginTop: spacing.lg },
});
