import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated, Dimensions, SafeAreaView, StatusBar, Linking, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

import { API_BASE } from '../config';
const API_URL = `${API_BASE}/chat`;
const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = SCREEN_WIDTH * 0.75;

export default function AIChatScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [model, setModel] = useState("deepseek-chat");
  const [role, setRole] = useState("normal");
  const [webSearch, setWebSearch] = useState(false);

  const flatListRef = useRef(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [collapsedSections, setCollapsedSections] = useState({});

  const [selectedImage, setSelectedImage] = useState(null);

  const clearChat = async () => {
    try {
      await fetch(`${API_BASE}/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "default" }),
      });
      setMessages([]);
      setCollapsedSections({});
      await AsyncStorage.removeItem("chat");
    } catch (e) {
      console.log("清空失败");
    }
  };

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem('chat');
      if (data) setMessages(JSON.parse(data));
    };
    load();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('chat', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    Animated.timing(drawerAnim, {
      toValue: drawerOpen ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true
    }).start();
  }, [drawerOpen]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeSelectedImage = () => setSelectedImage(null);

  const toggleCollapse = (key) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedImage) || loading) return;

    const userMsg = {
      role: 'user',
      content: input,
      imageUri: selectedImage || null,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setLoading(true);

    const assistantMsg = { role: 'assistant', content: '', thinking: '', searchSources: [] };
    setMessages(prev => [...prev, assistantMsg]);

    try {
      const body = { message: input || t('ai.describeImage'), model, role, webSearch };

      if (imageToSend) {
        let base64;
        if (imageToSend.startsWith('data:')) {
          base64 = imageToSend.split(',')[1];
        } else {
          base64 = await FileSystem.readAsStringAsync(
            Platform.OS === 'ios' ? imageToSend.replace('file://', '') : imageToSend,
            { encoding: FileSystem.EncodingType.Base64 }
          );
        }
        body.image = base64;
        body.imageType = 'image/jpeg';
      }

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      const fullText = data.reply || '';
      const thinkingText = data.thinking || '';
      const searchSources = data.searchSources || [];
      let currentText = '';

      setMessages(prev =>
        prev.map((msg, idx) =>
          idx === prev.length - 1
            ? { ...msg, thinking: thinkingText, searchSources }
            : msg
        )
      );

      for (let i = 0; i < fullText.length; i++) {
        currentText += fullText[i];
        setMessages(prev =>
          prev.map((msg, idx) =>
            idx === prev.length - 1 ? { ...msg, content: currentText } : msg
          )
        );
        await new Promise(resolve => setTimeout(resolve, 15));
      }
    } catch (e) {
      console.log('API错误详情:', e.message, e);
      setMessages(prev =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 ? { ...msg, content: t('common.networkError') + e.message } : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const renderTextWithLinks = (content) => {
    const regex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(regex);
    return parts.map((part, i) =>
      part.match(regex) ? (
        <Text key={i} style={[styles.link, { color: colors.primary }]} onPress={() => Linking.openURL(part)}>
          {part}
        </Text>
      ) : (
        <Text key={i}>{part}</Text>
      )
    );
  };

  const renderItem = ({ item, index }) => {
    if (item.role === 'user') {
      return (
        <View style={[styles.msgBubble, styles.userBubble, { backgroundColor: colors.primary }]}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.chatImage} resizeMode="cover" />
          ) : null}
          {item.content ? <Text style={styles.userText}>{item.content}</Text> : null}
        </View>
      );
    }

    const hasThinking = !!item.thinking;
    const hasSources = item.searchSources && item.searchSources.length > 0;
    const thinkKey = `think_${index}`;
    const sourceKey = `source_${index}`;
    const thinkCollapsed = collapsedSections[thinkKey];
    const sourceCollapsed = collapsedSections[sourceKey];

    return (
      <View style={[styles.msgBubble, styles.aiBubble, { backgroundColor: theme.card }]}>
        {hasThinking ? (
          <View style={[styles.processCard, { backgroundColor: theme.cardAlt, borderColor: '#E8E0FF' }]}>
            <TouchableOpacity
              style={styles.processHeader}
              onPress={() => toggleCollapse(thinkKey)}
              activeOpacity={0.7}
            >
              <Text style={styles.processIcon}>🤔</Text>
              <Text style={[styles.processTitle, { color: '#6C5CE7' }]}>{t('ai.thinkingTitle')}</Text>
              <Text style={styles.collapseIcon}>{thinkCollapsed ? '▸' : '▾'}</Text>
            </TouchableOpacity>
            {!thinkCollapsed && (
              <Text style={[styles.processText, { color: theme.textSecondary }]}>{item.thinking}</Text>
            )}
          </View>
        ) : null}

        {hasSources ? (
          <View style={[styles.processCard, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
            <TouchableOpacity
              style={styles.processHeader}
              onPress={() => toggleCollapse(sourceKey)}
              activeOpacity={0.7}
            >
              <Text style={styles.processIcon}>🔍</Text>
              <Text style={[styles.processTitle, { color: '#0284C7' }]}>{t('ai.searchTitle')}</Text>
              <Text style={styles.collapseIcon}>{sourceCollapsed ? '▸' : '▾'}</Text>
            </TouchableOpacity>
            {!sourceCollapsed && (
              <View style={styles.sourceList}>
                {item.searchSources.map((src, si) => (
                  <View key={si} style={[styles.sourceItem, { borderColor: '#E0F2FE' }]}>
                    <Text style={styles.sourceIndex}>{si + 1}</Text>
                    <View style={styles.sourceContent}>
                      <TouchableOpacity onPress={() => Linking.openURL(src.url)}>
                        <Text style={[styles.sourceName, { color: '#0284C7' }]} numberOfLines={2}>
                          {src.name}
                        </Text>
                      </TouchableOpacity>
                      {src.snippet ? (
                        <Text style={[styles.sourceSnippet, { color: theme.textSecondary }]} numberOfLines={2}>
                          {src.snippet}
                        </Text>
                      ) : null}
                      <Text style={[styles.sourceUrl, { color: theme.textMuted }]} numberOfLines={1}>
                        {src.url}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {(hasThinking || hasSources) && (
          <Text style={[styles.answerTitle, { color: theme.text }]}>{t('ai.answerTitle')}</Text>
        )}
        <Text style={{ color: theme.text, fontSize: 16, lineHeight: 22 }}>
          {renderTextWithLinks(item.content)}
        </Text>
      </View>
    );
  };

  const selectRole = (newRole) => {
    setRole(newRole);
    setDrawerOpen(false);
  };

  return (
    <>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} translucent={false} />

      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={80}
        >
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
              <Text style={[styles.menuBtnText, { color: theme.text }]}>☰</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>{t('ai.title')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => navigation.navigate('VoiceChat')} style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 22 }}>🎤</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearChat}>
                <Text style={styles.clearText}>{t('common.clear')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {drawerOpen && <TouchableOpacity style={styles.overlay} onPress={() => setDrawerOpen(false)} />}

          <Animated.View style={[styles.drawer, { backgroundColor: theme.card, transform: [{ translateX: drawerAnim }] }]}>
            <View style={styles.drawerContent}>
              {[
                { key: 'normal', icon: '💬', label: t('ai.normalAssistant') },
                { key: 'knowledge', icon: '📚', label: t('ai.knowledgeExpert') },
                { key: 'angry', icon: '😤', label: t('ai.angryAssistant') },
                { key: 'funny', icon: '😂', label: t('ai.funnyAssistant') },
              ].map(r => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.roleItem, role === r.key && { backgroundColor: colors.accent }]}
                  onPress={() => selectRole(r.key)}
                >
                  <Text style={styles.roleIcon}>{r.icon}</Text>
                  <Text style={[styles.roleText, { color: theme.text }]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            </View>
          </Animated.View>

          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(_, i) => i.toString()}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            contentContainerStyle={styles.chatList}
          />

          <View style={[styles.topButtonBar, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[styles.topButton, { backgroundColor: theme.inputBg, borderColor: theme.border }, model === "deepseek-reasoner" && { backgroundColor: colors.accent, borderColor: colors.primary }]}
              onPress={() => setModel(model === "deepseek-reasoner" ? "deepseek-chat" : "deepseek-reasoner")}
            >
              <Text style={styles.topButtonIcon}>🧠</Text>
              <Text style={[styles.topButtonText, { color: theme.text }]}>{t('ai.deepThink')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.topButton, { backgroundColor: theme.inputBg, borderColor: theme.border }, webSearch && { backgroundColor: colors.accent, borderColor: colors.primary }]}
              onPress={() => setWebSearch(!webSearch)}
            >
              <Text style={styles.topButtonIcon}>🌐</Text>
              <Text style={[styles.topButtonText, { color: theme.text }]}>{t('ai.webSearch')}</Text>
            </TouchableOpacity>
          </View>

          {selectedImage ? (
            <View style={[styles.previewBar, { backgroundColor: colors.accent, borderTopColor: theme.border }]}>
              <View style={styles.previewThumbWrap}>
                <Image source={{ uri: selectedImage }} style={styles.previewThumb} />
                <TouchableOpacity style={styles.previewClose} onPress={removeSelectedImage}>
                  <Text style={styles.previewCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={[styles.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TouchableOpacity style={[styles.imageBtn, { backgroundColor: colors.accent, borderColor: colors.primary + '60' }]} onPress={pickImage} activeOpacity={0.7}>
              <Text style={styles.imageBtnIcon}>+</Text>
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text }]}
              value={input}
              onChangeText={setInput}
              placeholder={selectedImage ? t('ai.imagePlaceholder') : t('ai.inputPlaceholder')}
              placeholderTextColor={theme.textMuted}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" size={18} /> : <Text style={styles.sendText}>{t('common.send')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1 },
  menuBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  menuBtnText: { fontSize: 24 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  clearText: { color: '#FF3B30', fontSize: 15, fontWeight: '500' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 10 },
  drawer: { position: 'absolute', top: 0, left: 0, bottom: 0, width: DRAWER_WIDTH, zIndex: 20, elevation: 5 },
  drawerContent: { paddingTop: 20, paddingHorizontal: 15 },
  roleItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, marginBottom: 8 },
  roleIcon: { fontSize: 20, marginRight: 12 },
  roleText: { fontSize: 16 },
  divider: { height: 1, marginVertical: 15 },
  chatList: { paddingHorizontal: 15, paddingVertical: 10 },
  msgBubble: { marginVertical: 6, padding: 14, borderRadius: 20, maxWidth: '85%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 6 },
  userText: { color: '#fff', fontSize: 16, lineHeight: 22 },

  processCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  processHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  processTitle: {
    fontWeight: '700',
    fontSize: 14,
    flex: 1,
  },
  collapseIcon: {
    fontSize: 14,
    color: '#999',
    marginLeft: 4,
  },
  processText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },

  sourceList: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  sourceItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  sourceIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#0284C7',
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
    marginRight: 10,
    marginTop: 2,
    overflow: 'hidden',
  },
  sourceContent: {
    flex: 1,
  },
  sourceName: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  sourceSnippet: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  sourceUrl: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },

  answerTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 15,
  },
  link: { textDecorationLine: 'underline' },

  topButtonBar: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 8, gap: 12 },
  topButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  topButtonIcon: { fontSize: 16, marginRight: 6 },
  topButtonText: { fontSize: 14 },

  imageBtn: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 8, borderWidth: 1.5,
  },
  imageBtnIcon: { fontSize: 22 },

  previewBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 15, paddingVertical: 8,
    borderTopWidth: 1,
  },
  previewThumbWrap: { position: 'relative' },
  previewThumb: {
    width: 64, height: 64, borderRadius: 12,
    borderWidth: 2, borderColor: '#FFD591',
  },
  previewClose: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#FF4D6A', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  previewCloseText: { color: '#fff', fontSize: 11, fontWeight: '700', lineHeight: 13 },

  chatImage: {
    width: 200, height: 200, borderRadius: 12,
    marginBottom: 6,
  },

  inputBar: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, height: 48, borderRadius: 24, paddingHorizontal: 18, fontSize: 16 },
  sendBtn: { marginLeft: 10, width: 60, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
