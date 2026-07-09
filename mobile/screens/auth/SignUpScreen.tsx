import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParams } from '../../App';
import { colors, fonts } from '../../lib/theme';
import { Button, Field, PageTitle, Subtitle } from '../../components/ui';
import { LogoWordmark } from '../../components/Logo';
import { signUp } from '../../lib/api';

type Props = NativeStackScreenProps<AuthStackParams, 'SignUp'>;

export default function SignUpScreen({ navigation, route }: Props) {
  const { role } = route.params;
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      Alert.alert('Almost there', 'Fill in your name, email, and a password with at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const result = await signUp({
        email: email.trim(),
        password,
        role,
        fullName: fullName.trim(),
        referralCode: role === 'owner' ? referralCode : undefined,
      });
      // With email confirmation ON there's no session yet — tell the user
      // and send them to sign-in. With it OFF a session already exists and
      // the auth listener in App.tsx navigates into the app on its own.
      if (!result.session) {
        Alert.alert('Check your email', 'Confirm your address to finish creating your account, then sign in.');
        navigation.navigate('SignIn', { role });
      }
    } catch (e: any) {
      Alert.alert('Could not create account', e.message ?? 'Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.shell}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.box} keyboardShouldPersistTaps="handled">
          <LogoWordmark width={190} />
          <PageTitle dot>{role === 'owner' ? 'Create your business account' : 'Create your account'}</PageTitle>
          <Subtitle>
            {role === 'owner'
              ? 'Set up your business, publish promotions, and run suggestion contests.'
              : 'Discover offers nearby, vote on deals, and claim them in seconds.'}
          </Subtitle>
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" />
          {role === 'owner' && (
            <Field
              label="Referral code (optional)"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              placeholder="From a business that referred you"
            />
          )}
          <Text style={styles.agree}>
            By creating an account you agree to the{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>
              Terms of Service
            </Text>{' '}
            and{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>
              Privacy Policy
            </Text>
            .
          </Text>
          <Button title={busy ? 'Creating account…' : 'Create account'} onPress={handleSignUp} disabled={busy} />
          <Text style={styles.footer}>
            Already have an account?{' '}
            <Text style={styles.link} onPress={() => navigation.navigate('SignIn', { role })}>
              Sign in
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  box: { paddingHorizontal: 28, flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  footer: { fontFamily: fonts.body, fontSize: 13.5, color: colors.inkSoft, marginTop: 20 },
  agree: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, lineHeight: 18, marginBottom: 12 },
  link: { fontFamily: fonts.bodySemi, color: colors.coral },
});
