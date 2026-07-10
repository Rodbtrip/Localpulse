import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts } from '../lib/theme';
import { askPip, PipDealHit, PipMode, PIP_CHIPS, PIP_GREETING } from '../lib/pip';

// The floating mascot bobs gently; tapping opens the assistant sheet.
export function PipFloating({ onPress }: { onPress: () => void }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -7, duration: 1600, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [bob]);

  return (
    <Animated.View style={[styles.floating, { transform: [{ translateY: bob }] }]}>
      <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="Ask Pip, your LocalPulse assistant">
        <View style={styles.floatingBubble}>
          <Text style={styles.floatingText}>Ask Pip</Text>
        </View>
        <Image source={require('../assets/pip.png')} style={styles.floatingPip} resizeMode="contain" />
      </Pressable>
    </Animated.View>
  );
}

interface Message {
  id: string;
  from: 'pip' | 'user';
  text: string;
  hits?: PipDealHit[];
  suggestions?: string[];
}

export function PipAssistant({
  mode,
  visible,
  onClose,
  onOpenShop,
}: {
  mode: PipMode;
  visible: boolean;
  onClose: () => void;
  onOpenShop?: (shopId: string, shopName: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && messages.length === 0) {
      setMessages([{ id: 'greet', from: 'pip', text: PIP_GREETING[mode] }]);
    }
  }, [visible, mode, messages.length]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setInput('');
    setMessages((m) => [...m, { id: `u${Date.now()}`, from: 'user', text: q }]);
    setThinking(true);
    try {
      const reply = await askPip(q, mode);
      setMessages((m) => [
        ...m,
        { id: `p${Date.now()}`, from: 'pip', text: reply.text, hits: reply.hits, suggestions: reply.suggestions },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: `p${Date.now()}`, from: 'pip', text: 'Something went wrong on my end — try that once more.' },
      ]);
    } finally {
      setThinking(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  function openShop(hit: PipDealHit) {
    onClose();
    onOpenShop?.(hit.shopId, hit.shopName);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Image source={require('../assets/pip.png')} style={styles.headerPip} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>Pip</Text>
                <Text style={styles.headerSub}>
                  {mode === 'member' ? 'Deal finder & guide' : 'Your business assistant'}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Text style={styles.closeX}>✕</Text>
              </Pressable>
            </View>

            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              style={styles.list}
              contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              renderItem={({ item }) => (
                <View style={[styles.msgRow, item.from === 'user' && { justifyContent: 'flex-end' }]}>
                  <View style={[styles.msg, item.from === 'user' ? styles.msgUser : styles.msgPip]}>
                    <Text style={[styles.msgText, item.from === 'user' && { color: colors.paper }]}>{item.text}</Text>
                    {item.hits?.map((h) => (
                      <Pressable key={h.shopId + h.promoTitle} style={styles.hitCard} onPress={() => openShop(h)}>
                        <Text style={styles.hitTitle}>{h.promoTitle}</Text>
                        <Text style={styles.hitDetail}>{h.detail}</Text>
                        <Text style={styles.hitOpen}>View shop ›</Text>
                      </Pressable>
                    ))}
                    {/* When Pip redirects an off-topic question, it offers a way back in. */}
                    {item.suggestions && (
                      <View style={styles.inlineChips}>
                        {item.suggestions.map((s) => (
                          <Pressable key={s} style={styles.chip} onPress={() => send(s)}>
                            <Text style={styles.chipText}>{s}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}
              ListFooterComponent={thinking ? <Text style={styles.thinking}>Pip is looking…</Text> : null}
            />

            <View style={styles.chipsRow}>
              {PIP_CHIPS[mode].map((c) => (
                <Pressable key={c} style={styles.chip} onPress={() => send(c)}>
                  <Text style={styles.chipText}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={mode === 'member' ? 'Try "tacos" or "haircut"…' : 'Ask about your business…'}
                placeholderTextColor={colors.inkFaint}
                onSubmitEditing={() => send(input)}
                returnKeyType="send"
              />
              <Pressable style={styles.sendBtn} onPress={() => send(input)} disabled={thinking}>
                <Text style={styles.sendText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', right: 16, bottom: 20, zIndex: 40, alignItems: 'flex-end' },
  floatingBubble: {
    backgroundColor: colors.navy,
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 11,
    marginBottom: 4,
    marginRight: 6,
  },
  floatingText: { fontFamily: fonts.bodySemi, fontSize: 11, color: colors.paper },
  floatingPip: { width: 58, height: 68 },
  backdrop: { flex: 1, backgroundColor: 'rgba(14,18,20,0.5)' },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '82%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerPip: { width: 38, height: 46 },
  headerTitle: { fontFamily: fonts.display, fontSize: 17, color: colors.ink },
  headerSub: { fontFamily: fonts.body, fontSize: 11.5, color: colors.inkFaint },
  closeX: { fontFamily: fonts.body, fontSize: 16, color: 'rgba(23,27,26,0.45)', padding: 4 },
  list: { minHeight: 220, maxHeight: 380 },
  msgRow: { flexDirection: 'row', marginBottom: 10 },
  msg: { maxWidth: '86%', borderRadius: 12, padding: 12 },
  msgPip: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  msgUser: { backgroundColor: colors.coral },
  msgText: { fontFamily: fonts.body, fontSize: 13.5, color: colors.ink, lineHeight: 19 },
  hitCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.pulse,
    borderRadius: 4,
    backgroundColor: colors.paper,
    padding: 10,
  },
  hitTitle: { fontFamily: fonts.display, fontSize: 13.5, color: colors.ink },
  hitDetail: { fontFamily: fonts.body, fontSize: 11.5, color: 'rgba(23,27,26,0.6)', marginTop: 2 },
  hitOpen: { fontFamily: fonts.bodySemi, fontSize: 11.5, color: colors.coral, marginTop: 6 },
  thinking: { fontFamily: fonts.body, fontSize: 12, color: colors.inkFaint, paddingLeft: 20, paddingBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, paddingHorizontal: 16, paddingTop: 8 },
  inlineChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(23,27,26,0.18)',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
  },
  chipText: { fontFamily: fonts.bodyMedium, fontSize: 11.5, color: 'rgba(23,27,26,0.72)' },
  inputRow: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 3,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontFamily: fonts.body,
    fontSize: 13.5,
    color: colors.ink,
  },
  sendBtn: {
    backgroundColor: colors.coral,
    borderRadius: 3,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  sendText: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.paper },
});
