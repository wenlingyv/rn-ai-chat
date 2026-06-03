// ============================================================
// 圈子页 — 双标签切换 + 高德地图 + 动态列表 + 发布动态
// ============================================================
import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput,
  Platform, Image, ScrollView, Alert, ActivityIndicator
} from 'react-native';
let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (e) {
  // WebView not available in Expo Go — render fallback
}
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

// ============================================================
// 高德地图 Key 配置
// 免费申请: https://lbs.amap.com/
// 步骤: 注册账号 → 控制台 → 我的应用 → 创建新应用 → 添加 Key → 平台选"Web端(JS API)"
// 将申请到的 Key 和安全密钥填入下方即可
// ============================================================
const AMAP_KEY = 'b1ae8f02fa690ef9316115f6d1a70d18';
const AMAP_SECRET = '2f6a062e7a092d821911e9297c834aa7';

// 判断 Key 是否已配置
const isKeyConfigured = AMAP_KEY !== 'YOUR_AMAP_KEY' && AMAP_KEY.length > 0;

// WebView 不可用时的降级组件
function WebViewFallback() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 36, marginBottom: 8 }}>🗺️</Text>
      <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>
        地图功能需要开发环境{'\n'}Expo Go 不支持 WebView
      </Text>
    </View>
  );
}

// 生成高德地图 HTML
function generateMapHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    html, body, #container { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    .amap-logo, .amap-copyright { display: none !important; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script>
    window._AMapSecurityConfig = { securityJsCode: '${AMAP_SECRET}' };
  </script>
  <script src="https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}"></script>
  <script>
    var map = new AMap.Map('container', {
      zoom: 14,
      center: [116.397428, 39.90923],
      mapStyle: 'amap://styles/macaron',
      resizeEnable: true,
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(pos) {
        map.setCenter([pos.coords.longitude, pos.coords.latitude]);
        new AMap.Marker({
          position: [pos.coords.longitude, pos.coords.latitude],
          map: map,
          content: '<div style="background:#FF4757;color:#fff;padding:4px 10px;border-radius:12px;font-size:12px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-weight:bold;">📍 我</div>',
          offset: new AMap.Pixel(-25, -15),
        });
      }, function() {});
    }
  </script>
</body>
</html>
`;
}

function getInitial(name) { return name.charAt(0); }

export default function CirclesScreen() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [likedPosts, setLikedPosts] = useState({});
  const [showPublish, setShowPublish] = useState(false);
  const [newText, setNewText] = useState('');
  const [newImages, setNewImages] = useState([]);
  const [mapFullScreen, setMapFullScreen] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);

  const MOCK_POSTS = useMemo(() => {
    const d = t('circles_data', { returnObjects: true });
    const colorsArr = ['#FF6B6B', '#FFA940', '#52C41A', '#7C5CFC', '#13C2C2', '#EB2F96', '#FA8C16', '#2F54EB'];
    const keys = ['post1', 'post2', 'post3', 'post4', 'post5', 'post6', 'post7', 'post8'];
    return keys.map((k, i) => ({
      id: String(i + 1),
      author: d[k].author,
      color: colorsArr[i],
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

  // 地图预览区域
  const renderMapPreview = () => {
    if (activeTab !== 0) return null;

    if (!isKeyConfigured) {
      return (
        <View style={s.mapSection}>
          <View style={s.mapKeyHint}>
            <Text style={s.mapKeyHintIcon}>🗺️</Text>
            <Text style={s.mapKeyHintTitle}>高德地图</Text>
            <Text style={s.mapKeyHintText}>
              请先配置高德地图 Key{'\n'}
              免费申请: https://lbs.amap.com{'\n'}
              在 CirclesScreen.js 顶部填入 AMAP_KEY 和 AMAP_SECRET
            </Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={s.mapSection}
        onPress={() => setMapFullScreen(true)}
        activeOpacity={0.9}
      >
        {mapLoading && (
          <View style={s.mapLoading}>
            <ActivityIndicator size="small" color="#FF4757" />
            <Text style={s.mapLoadingText}>地图加载中...</Text>
          </View>
        )}
        {WebView ? (
          <WebView
            source={{ html: generateMapHTML() }}
            style={s.mapPreview}
            scrollEnabled={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onLoadEnd={() => setMapLoading(false)}
            mixedContentMode="always"
            originWhitelist={['*']}
            cacheEnabled={true}
            startInLoadingState={false}
          />
        ) : (
          <WebViewFallback />
        )}
        <View style={s.mapHint} pointerEvents="none">
          <Text style={s.mapHintText}>📍 点击查看附近的人</Text>
        </View>
      </TouchableOpacity>
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

      {/* 地图预览 - 仅在"附近圈子"标签显示 */}
      {renderMapPreview()}

      <FlatList
        data={displayPosts}
        keyExtractor={i => i.id}
        renderItem={renderPost}
        contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />

      {/* 全屏地图弹窗 */}
      <Modal visible={mapFullScreen} animationType="slide" onRequestClose={() => setMapFullScreen(false)}>
        <SafeAreaView style={s.mapFullWrap}>
          <View style={s.mapHeader}>
            <TouchableOpacity onPress={() => setMapFullScreen(false)} style={s.mapCloseBtn}>
              <Text style={s.mapCloseText}>← 返回</Text>
            </TouchableOpacity>
            <Text style={s.mapHeaderTitle}>附近的人</Text>
            <View style={{ width: 60 }} />
          </View>
          {WebView ? (
            <WebView
              source={{ html: generateMapHTML() }}
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mixedContentMode="always"
              originWhitelist={['*']}
              cacheEnabled={true}
            />
          ) : (
            <WebViewFallback />
          )}
        </SafeAreaView>
      </Modal>

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

  // 地图相关样式
  mapSection: {
    height: 180,
    position: 'relative',
    backgroundColor: '#f0f0f0',
  },
  mapPreview: {
    flex: 1,
    borderRadius: 0,
  },
  mapLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#f5f5f5',
    zIndex: 5,
  },
  mapLoadingText: {
    fontSize: 13, color: '#999', marginTop: 8,
  },
  mapHint: {
    position: 'absolute', bottom: 10, left: 0, right: 0,
    alignItems: 'center',
    zIndex: 5,
  },
  mapHintText: {
    fontSize: 12, color: '#FF4757', fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 12, overflow: 'hidden',
  },
  mapKeyHint: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 20,
  },
  mapKeyHintIcon: { fontSize: 36, marginBottom: 8 },
  mapKeyHintTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 6 },
  mapKeyHintText: { fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 },

  // 全屏地图
  mapFullWrap: { flex: 1, backgroundColor: '#FF4757' },
  mapHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FF4757',
  },
  mapCloseBtn: { padding: 4 },
  mapCloseText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  mapHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

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
