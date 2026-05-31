// ============================================================
// 【重写】圈子页 — 双标签切换 + 动态列表 + 发布动态（全局主题 + i18n）
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput, KeyboardAvoidingView,
  Platform, Image, ScrollView, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

function getInitial(name) { return name.charAt(0); }

export default function CirclesScreen() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [likedPosts, setLikedPosts] = useState({});
  const [showPublish, setShowPublish] = useState(false);
  const [newText, setNewText] = useState('');
  const [newImages, setNewImages] = useState([]);

  const MOCK_POSTS = useMemo(() => {
    const d = t('circles_data', { returnObjects: true });
    const colors = ['#FF6B6B', '#FFA940', '#52C41A', '#7C5CFC', '#13C2C2', '#EB2F96', '#FA8C16', '#2F54EB'];
    const keys = ['post1', 'post2', 'post3', 'post4', 'post5', 'post6', 'post7', 'post8'];
    return keys.map((k, i) => ({
      id: String(i + 1),
      author: d[k].author,
      color: colors[i],
      content: d[k].content,
      time: d[k].time,
      likes: d[k].likes,
      comments: d[k].comments,
      shares: d[k].shares,
      images: [],
    }));
  }, [t]);

  const [posts, setPosts] = useState([]);

  const publishPost = () => {
    if (!newText.trim() && newImages.length === 0) return;
    const post = {
      id: 'p' + Date.now(),
      author: '我',
      color: colors.primary,
      content: newText.trim(),
      time: t('common.justNow'),
      likes: 0, comments: 0, shares: 0,
      images: [...newImages],
    };
    setPosts(prev => [post, ...prev]);
    setNewText('');
    setNewImages([]);
    setShowPublish(false);
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setNewImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (idx) => {
    setNewImages(prev => prev.filter((_, i) => i !== idx));
  };

  const toggleLike = (id) => {
    setLikedPosts(p => ({ ...p, [id]: !p[id] }));
    setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: likedPosts[id] ? p.likes - 1 : p.likes + 1 } : p));
  };

  const displayPosts = useMemo(() => {
    if (posts.length === 0) return MOCK_POSTS;
    return posts;
  }, [posts, MOCK_POSTS]);

  const renderPost = ({ item }) => {
    const isLiked = likedPosts[item.id];
    return (
      <View style={[s.postCard, { backgroundColor: theme.card }]}>
        <View style={s.postHeader}>
          <View style={[s.avatar, { backgroundColor: item.color }]}><Text style={s.avatarTxt}>{getInitial(item.author)}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={[s.postAuthor, { color: theme.text }]}>{item.author}</Text>
            <Text style={[s.postTime, { color: theme.textMuted }]}>{item.time}</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert(t('circles.moreActions'), t('circles.reportOptions'))}>
            <Text style={{ fontSize: 18, color: theme.textMuted }}>···</Text>
          </TouchableOpacity>
        </View>
        <Text style={[s.postContent, { color: theme.textSecondary }]}>{item.content}</Text>
        {item.images && item.images.length > 0 && (
          <View style={s.postImages}>
            {item.images.map((uri, idx) => (
              <Image key={idx} source={{ uri }} style={s.postImage} />
            ))}
          </View>
        )}
        <View style={[s.postActions, { borderTopColor: theme.separator }]}>
          <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(item.id)} activeOpacity={0.7}>
            <Text style={s.actionIcon}>{isLiked ? '❤️' : ' '}</Text>
            <Text style={[s.actionTxt, { color: isLiked ? '#FF4D6A' : theme.textMuted }]}>{item.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Text style={s.actionIcon}> </Text>
            <Text style={[s.actionTxt, { color: theme.textMuted }]}>{item.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} activeOpacity={0.7}>
            <Text style={s.actionIcon}>↗️</Text>
            <Text style={[s.actionTxt, { color: theme.textMuted }]}>{item.shares}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#FF4757" />
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('circles.title')}</Text>
        <TouchableOpacity style={s.publishBtn} onPress={() => setShowPublish(true)} activeOpacity={0.8}>
          <Text style={s.publishBtnTxt}>＋</Text>
        </TouchableOpacity>
      </View>

      <View style={s.tabRow}>
        {[t('circles.nearby'), t('circles.friends')].map((label, idx) => (
          <TouchableOpacity key={idx} style={[s.tabItem, activeTab === idx && s.tabItemActive]} onPress={() => setActiveTab(idx)} activeOpacity={0.8}>
            <Text style={[s.tabTxt, activeTab === idx && s.tabTxtActive]}>{label}</Text>
            {activeTab === idx && <View style={s.tabDot} />}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={displayPosts}
        keyExtractor={i => i.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* 发布弹窗 */}
      <Modal visible={showPublish} animationType="slide" transparent={false} onRequestClose={() => setShowPublish(false)}>
        <SafeAreaView style={[s.pubWrap, { backgroundColor: theme.bg }]}>
          <StatusBar barStyle={theme.statusBar} backgroundColor={colors.primary} />
          <View style={[s.pubHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => { setShowPublish(false); setNewText(''); setNewImages([]); }}>
              <Text style={[s.pubCancel, { color: theme.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={[s.pubTitle, { color: theme.text }]}>{t('circles.publishTitle')}</Text>
            <TouchableOpacity onPress={publishPost}>
              <Text style={[s.pubSend, { color: colors.primary }]}>{t('common.publish')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <TextInput
              style={[s.pubInput, { color: theme.text }]}
              placeholder={t('circles.placeholder')}
              placeholderTextColor={theme.textMuted}
              multiline
              maxLength={1000}
              value={newText}
              onChangeText={setNewText}
              autoFocus
            />
            <Text style={[s.pubCount, { color: theme.textMuted }]}>{newText.length}{t('circles.charCount')}</Text>

            <View style={s.pubImages}>
              {newImages.map((uri, idx) => (
                <View key={idx} style={s.pubImgWrap}>
                  <Image source={{ uri }} style={s.pubImg} />
                  <TouchableOpacity style={s.pubImgDel} onPress={() => removeImage(idx)}>
                    <Text style={s.pubImgDelTxt}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {newImages.length < 9 && (
                <TouchableOpacity style={[s.pubAddImg, { borderColor: theme.border, backgroundColor: theme.cardAlt }]} onPress={pickImages} activeOpacity={0.7}>
                  <Text style={s.pubAddImgIcon}> </Text>
                  <Text style={[s.pubAddImgTxt, { color: theme.textMuted }]}>{t('circles.addImage')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[s.pubOptions, { borderTopColor: theme.border }]}>
              {[
                { icon: ' ', txt: t('circles.visibility'), val: t('circles.visibilityVal') },
                { icon: ' ', txt: t('circles.location'), val: t('circles.locationVal') },
                { icon: '⏰', txt: t('circles.sendTime'), val: t('circles.sendTimeVal') },
              ].map((opt, i) => (
                <TouchableOpacity key={i} style={[s.pubOptItem, { borderBottomColor: theme.separator }]} activeOpacity={0.7}>
                  <Text style={s.pubOptIcon}>{opt.icon}</Text>
                  <Text style={[s.pubOptTxt, { color: theme.text }]}>{opt.txt}</Text>
                  <Text style={[s.pubOptVal, { color: theme.textMuted }]}>{opt.val}</Text>
                  <Text style={[s.pubOptArrow, { color: theme.textMuted }]}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FF4757',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  publishBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  publishBtnTxt: { fontSize: 22, color: '#fff', fontWeight: '600', lineHeight: 24 },

  tabRow: {
    flexDirection: 'row', backgroundColor: '#FF4757',
    paddingBottom: 12, paddingHorizontal: 20,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative' },
  tabItemActive: {},
  tabTxt: { fontSize: 15, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  tabTxtActive: { color: '#fff', fontWeight: '700', fontSize: 16 },
  tabDot: { width: 24, height: 3, borderRadius: 2, backgroundColor: '#fff', marginTop: 6 },

  postCard: {
    borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
  postAuthor: { fontSize: 16, fontWeight: '700' },
  postTime: { fontSize: 12, marginTop: 1 },
  postContent: { fontSize: 15, lineHeight: 22, marginBottom: 10 },
  postImages: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10, gap: 6 },
  postImage: { width: 100, height: 100, borderRadius: 10 },
  postActions: {
    flexDirection: 'row', justifyContent: 'space-around',
    borderTopWidth: 1, paddingTop: 12,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { fontSize: 17, marginRight: 4 },
  actionTxt: { fontSize: 13 },

  pubWrap: { flex: 1 },
  pubHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1,
  },
  pubCancel: { fontSize: 16 },
  pubTitle: { fontSize: 18, fontWeight: '700' },
  pubSend: { fontSize: 16, fontWeight: '700' },
  pubInput: { fontSize: 16, textAlignVertical: 'top', minHeight: 150, lineHeight: 24 },
  pubCount: { textAlign: 'right', fontSize: 12, marginTop: 4 },

  pubImages: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, gap: 10 },
  pubImgWrap: { position: 'relative' },
  pubImg: { width: 100, height: 100, borderRadius: 12 },
  pubImgDel: {
    position: 'absolute', top: -6, right: -6,
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4D6A',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff',
  },
  pubImgDelTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  pubAddImg: {
    width: 100, height: 100, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  pubAddImgIcon: { fontSize: 28, marginBottom: 4 },
  pubAddImgTxt: { fontSize: 12 },

  pubOptions: { marginTop: 24, borderTopWidth: 1, paddingTop: 8 },
  pubOptItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1,
  },
  pubOptIcon: { fontSize: 20, marginRight: 12 },
  pubOptTxt: { fontSize: 15, flex: 1 },
  pubOptVal: { fontSize: 14, marginRight: 8 },
  pubOptArrow: { fontSize: 20 },
});
