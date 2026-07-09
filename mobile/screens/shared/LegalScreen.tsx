import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../../lib/theme';
import { LEGAL_DOCS, LEGAL_TITLES, LegalDocKey } from '../../lib/legal';

export default function LegalScreen({ route }: { route: { params: { doc: LegalDocKey } } }) {
  const { doc } = route.params;
  return (
    <ScrollView style={styles.shell} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      <Text style={styles.body}>{LEGAL_DOCS[doc]}</Text>
    </ScrollView>
  );
}

export function legalTitle(doc: LegalDocKey) {
  return LEGAL_TITLES[doc];
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.paper },
  body: { fontFamily: fonts.body, fontSize: 13, lineHeight: 21, color: 'rgba(23,27,26,0.82)' },
});
