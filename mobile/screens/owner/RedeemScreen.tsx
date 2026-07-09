import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fonts, spacing } from '../../lib/theme';
import { Button, Field, PulseCode, Subtitle } from '../../components/ui';
import { redeemCode } from '../../lib/api';

export default function RedeemScreen() {
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [prize, setPrize] = useState<string | null>(null);

  async function handleRedeem() {
    if (!code.trim()) return;
    setState('busy');
    setPrize(null);
    try {
      const result = await redeemCode(code, amount ? Number(amount) : undefined);
      setPrize(result.prizeDescription ?? null);
      setState('success');
      setCode('');
      setAmount('');
    } catch (e: any) {
      setState('error');
      setMessage(e.message ?? 'That code is invalid or already redeemed.');
    }
  }

  return (
    <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24 }}>
      <Subtitle>
        Enter the pulse code from the customer's phone. Codes starting with SP- are suggestion contest prizes —
        redeemable only at your business.
      </Subtitle>
      <Field
        label="Code"
        value={code}
        onChangeText={(t) => {
          setCode(t.toUpperCase());
          setState('idle');
        }}
        autoCapitalize="characters"
        placeholder="e.g. 7F3K9QXZ or SP-A2B4C6"
      />
      <Field
        label="Amount spent (optional)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        placeholder="e.g. 14.50"
      />
      <Button title={state === 'busy' ? 'Checking…' : 'Redeem'} onPress={handleRedeem} disabled={state === 'busy'} />
      {state === 'success' && (
        <View style={styles.result}>
          <Text style={styles.successLabel}>Redeemed successfully</Text>
          {prize && <Text style={styles.prizeText}>Prize: {prize}</Text>}
          <PulseCode code="✓ REDEEMED" />
        </View>
      )}
      {state === 'error' && <Text style={styles.errorText}>{message}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  result: { alignItems: 'center', marginTop: spacing.lg },
  successLabel: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.pulse, marginBottom: 4 },
  prizeText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink, marginBottom: 4 },
  errorText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.rose, marginTop: spacing.md },
});
