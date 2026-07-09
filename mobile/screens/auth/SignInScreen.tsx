import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParams } from '../../App';
import { colors, fonts } from '../../lib/theme';
import { Button, Field, PageTitle } from '../../components/ui';
import { LogoWordmark } from '../../components/Logo';
import { signIn } from '../../lib/api';

type Props = NativeStackScreenProps<AuthStackParams, 'SignIn'>;

export default function SignInScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setBusy(true);
    try {
      await signIn(email.trim(), password);
      // Session listener in App.tsx routes to the correct experience.
    } catch (e: any) {
      Alert.alert('Sign in failed', e.message ?? 'Check your email and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.shell}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center' }}>
        <View style={styles.box}>
          <LogoWordmark width={190} />
          <PageTitle dot>{role === 'owner' ? 'Welcome back, owner' : 'Welcome back'}</PageTitle>
          <View style={{ height: 24 }} />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" />
          <Button title={busy ? 'Signing in…' : 'Sign in'} onPress={handleSignIn} disabled={busy} style={{ marginTop: 4 }} />
          <Text style={styles.footer}>
            New here?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('SignUp', { role })}>
              Create an account
            </Text>
          </Text>
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  box: { paddingHorizontal: 28 },
  footer: { fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, marginTop: 20 },
  link: { fontFamily: fonts.bodySemi, color: colors.coral },
  back: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(23,27,26,0.4)', marginTop: 12 },
});
