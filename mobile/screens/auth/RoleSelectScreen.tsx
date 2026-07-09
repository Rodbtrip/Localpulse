import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParams } from '../../App';
import { colors } from '../../lib/theme';
import { Button, PageTitle, Subtitle } from '../../components/ui';
import { LogoWordmark } from '../../components/Logo';

type Props = NativeStackScreenProps<AuthStackParams, 'RoleSelect'>;

export default function RoleSelectScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.box}>
        <LogoWordmark width={210} />
        <PageTitle dot>Who's joining today?</PageTitle>
        <Subtitle>Pick the side that fits you — owners publish deals, members discover and vote on them.</Subtitle>
        <Button
          title="I'm a Business Owner"
          onPress={() => navigation.navigate('SignIn', { role: 'owner' })}
          style={{ marginBottom: 14 }}
        />
        <Button
          title="I'm a Local Member"
          secondary
          onPress={() => navigation.navigate('SignIn', { role: 'customer' })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper, justifyContent: 'center' },
  box: { paddingHorizontal: 28 },
});
