import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, RefreshControl,
  Modal, ActivityIndicator, Alert
} from 'react-native';
import { useAuth } from '../AuthContext';
import { useWebSocket } from '../WebSocketContext';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://192.168.43.231:5000/api';

export default function MessagesScreen({ navigation }) {
  const { user, authFetch } = useAuth();
  const { addListener, removeListener } = useWebSocket();
  const { colors, theme } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('chat');
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/message/conversations`, { timeout: 8000 });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setConversations(data.data);
      }
    } catch (e) {
      console.error('loadConversations error:', e);
    }
  }, [authFetch]);

  const loadFriends = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/friend/list`, { timeout: 8000 });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setFriends(data.data);
      }
    } catch (e) {
      console.error('loadFriends error:', e);
    }
  }, [authFetch]);

  const loadPending = useCallback(async () => {
    try {
      const res = await authFetch(`${API_BASE}/friend/pending`, { timeout: 8000 });
      if (res.ok) {
        const data = await res.json();
        if (data.success) setPendingRequests(data.data);
      }
    } catch (e) {
      console.error('loadPending error:', e);
    }
  }, [authFetch]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadConversations(), loadFriends(), loadPending()]);
  }, [loadConversations, loadFriends, loadPending]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const onChat = (msg) => {
      loadConversations();
    };
    const onChatSent = (msg) => {
      loadConversations();
    };
    const onFriendRequest = (msg) => {
      loadPending();
    };
    const onFriendAccepted = (msg) => {
      loadFriends();
      loadPending();
      loadConversations();
    };
    addListener('chat', onChat);
    addListener('chat_sent', onChatSent);
    addListener('friend_request', onFriendRequest);
    addListener('friend_accepted', onFriendAccepted);
    return () => {
      removeListener('chat', onChat);
      removeListener('chat_sent', onChatSent);
      removeListener('friend_request', onFriendRequest);
      removeListener('friend_accepted', onFriendAccepted);
    };
  }, [addListener, removeListener, loadConversations, loadFriends, loadPending]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const handleAccept = async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/friend/accept/${id}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        loadPending();
        loadFriends();
      } else {
        Alert.alert(t('common.error'), data.message || '操作失败');
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('common.networkError') + e.message);
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await authFetch(`${API_BASE}/friend/reject/${id}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        loadPending();
      } else {
        Alert.alert(t('common.error'), data.message || '操作失败');
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('common.networkError') + e.message);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const url = `${API_BASE}/friend/search?keyword=${encodeURIComponent(searchKeyword.trim())}`;
      console.log('搜索开始, URL:', url);
      const res = await authFetch(url, { timeout: 10000 });
      console.log('搜索响应状态:', res.status);
      if (res.status === 401) {
        Alert.alert('提示', '登录已过期，请重新登录');
        return;
      }
      if (!res.ok) {
        Alert.alert('搜索失败', `服务器错误 (${res.status})`);
        return;
      }
      const data = await res.json();
      console.log('搜索响应数据:', JSON.stringify(data).substring(0, 200));
      if (data.success) {
        setSearchResults(data.data || []);
        if (!data.data || data.data.length === 0) {
          Alert.alert('提示', '未找到匹配的用户');
        }
      } else {
        Alert.alert('搜索失败', data.message || '搜索出错');
      }
    } catch (e) {
      console.error('search error:', e);
      if (e.message && e.message.includes('超时')) {
        Alert.alert('请求超时', '搜索请求超时，请检查网络后重试');
      } else {
        Alert.alert('网络错误', '无法连接到服务器，请检查网络');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (addresseeId) => {
    try {
      const res = await authFetch(`${API_BASE}/friend/request`, {
        method: 'POST',
        body: JSON.stringify({ addresseeId }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('提示', '好友申请已发送');
      } else {
        Alert.alert(t('common.error'), data.message || '发送失败');
      }
    } catch (e) {
      Alert.alert(t('common.error'), t('common.networkError') + e.message);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now - date;
    const oneDay = 86400000;
    if (diff < oneDay && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < oneDay * 2) return '昨天';
    if (diff < oneDay * 7) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[date.getDay()];
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const tabs = [
    { key: 'chat', label: '聊天' },
    { key: 'friend', label: '好友' },
    { key: 'request', label: '申请' },
  ];

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={[s.chatItem, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('ChatDetail', {
        friendId: item.friend_id,
        friendName: item.username || item.nickname,
        friendAvatar: item.avatar,
        friendshipId: item.friendship_id,
      })}
      activeOpacity={0.7}
    >
      <View style={s.avatarWrap}>
        <Text style={s.avatarEmoji}>{item.avatar || '👤'}</Text>
      </View>
      <View style={s.chatInfo}>
        <View style={s.chatRow}>
          <Text style={[s.chatName, { color: theme.text }]} numberOfLines={1}>
            {item.username || item.nickname}
          </Text>
          <Text style={[s.chatTime, { color: theme.textMuted }]}>
            {formatTime(item.last_message?.created_at)}
          </Text>
        </View>
        <View style={s.chatRow}>
          <Text style={[s.chatLastMsg, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.last_message?.content || ''}
          </Text>
          {item.unread_count > 0 && (
            <View style={s.unreadDot}>
              <Text style={s.unreadTxt}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFriend = ({ item }) => (
    <TouchableOpacity
      style={[s.friendItem, { backgroundColor: theme.card }]}
      onPress={() => navigation.navigate('ChatDetail', {
        friendId: item.id,
        friendName: item.username || item.nickname,
        friendAvatar: item.avatar,
        friendshipId: item.friendship_id,
      })}
      activeOpacity={0.7}
    >
      <View style={s.avatarWrap}>
        <Text style={s.avatarEmoji}>{item.avatar || '👤'}</Text>
      </View>
      <Text style={[s.friendName, { color: theme.text }]} numberOfLines={1}>
        {item.username || item.nickname}
      </Text>
    </TouchableOpacity>
  );

  const renderPending = ({ item }) => (
    <View style={[s.pendingItem, { backgroundColor: theme.card }]}>
      <View style={s.avatarWrap}>
        <Text style={s.avatarEmoji}>{item.avatar || '👤'}</Text>
      </View>
      <Text style={[s.friendName, { color: theme.text, flex: 1 }]} numberOfLines={1}>
        {item.username || item.nickname}
      </Text>
      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: '#6C5CE7' }]}
        onPress={() => handleAccept(item.friendship_id)}
        activeOpacity={0.7}
      >
        <Text style={s.actionBtnTxt}>同意</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: theme.border, marginLeft: 8 }]}
        onPress={() => handleReject(item.friendship_id)}
        activeOpacity={0.7}
      >
        <Text style={[s.actionBtnTxt, { color: theme.textSecondary }]}>拒绝</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchResult = ({ item }) => (
    <View style={[s.searchResultItem, { backgroundColor: theme.cardAlt }]}>
      <View style={s.avatarWrapSmall}>
        <Text style={s.avatarEmojiSmall}>{item.avatar || '👤'}</Text>
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[{ color: theme.text, fontWeight: '600', fontSize: 15 }]}>
          {item.username || item.nickname}
        </Text>
        <Text style={[{ color: theme.textMuted, fontSize: 13, marginTop: 2 }]}>
          @{item.username}
        </Text>
      </View>
      <TouchableOpacity
        style={[s.addFriendBtn, { backgroundColor: '#6C5CE7' }]}
        onPress={() => handleSendRequest(item.id)}
        activeOpacity={0.7}
      >
        <Text style={s.addFriendBtnTxt}>加好友</Text>
      </TouchableOpacity>
    </View>
  );

  const pendingCount = pendingRequests.length;

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#6C5CE7" />
      <View style={s.header}>
        <Text style={s.headerTitle}>{t('messages.title')}</Text>
        {activeTab === 'friend' && (
          <TouchableOpacity
            style={s.searchBtn}
            onPress={() => setSearchVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={s.searchBtnIcon}>🔍</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.tabBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={s.tabItem}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[
              s.tabLabel,
              { color: activeTab === tab.key ? '#6C5CE7' : theme.textMuted }
            ]}>
              {tab.label}
              {tab.key === 'request' && pendingCount > 0 && (
                <View style={s.tabBadge}>
                  <Text style={s.tabBadgeTxt}>{pendingCount > 99 ? '99+' : pendingCount}</Text>
                </View>
              )}
            </Text>
            {activeTab === tab.key && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'chat' && (
        <FlatList
          data={conversations}
          keyExtractor={(item) => String(item.friend_id)}
          renderItem={renderConversation}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 40 }}>💬</Text>
              <Text style={[s.emptyText, { color: theme.textMuted }]}>暂无会话</Text>
            </View>
          }
        />
      )}

      {activeTab === 'friend' && (
        <FlatList
          data={friends}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderFriend}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 40 }}>👥</Text>
              <Text style={[s.emptyText, { color: theme.textMuted }]}>暂无好友</Text>
            </View>
          }
        />
      )}

      {activeTab === 'request' && (
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPending}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />
          }
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Text style={{ fontSize: 40 }}>📋</Text>
              <Text style={[s.emptyText, { color: theme.textMuted }]}>暂无好友申请</Text>
            </View>
          }
        />
      )}

      <Modal visible={searchVisible} animationType="slide" transparent>
        <View style={[s.modalOverlay, { backgroundColor: theme.overlay }]}>
          <View style={[s.modalContent, { backgroundColor: theme.bg }]}>
            <View style={[s.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[s.modalTitle, { color: theme.text }]}>搜索用户</Text>
              <TouchableOpacity onPress={() => { setSearchVisible(false); setSearchKeyword(''); setSearchResults([]); }}>
                <Text style={{ color: '#6C5CE7', fontSize: 16 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
            <View style={[s.searchInputRow, { backgroundColor: theme.inputBg }]}>
              <TextInput
                style={[s.searchInput, { color: theme.text }]}
                value={searchKeyword}
                onChangeText={setSearchKeyword}
                placeholder="输入用户名搜索..."
                placeholderTextColor={theme.textMuted}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                autoFocus
              />
              <TouchableOpacity style={s.searchSubmitBtn} onPress={handleSearch} activeOpacity={0.7}>
                {searching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>搜索</Text>
                )}
              </TouchableOpacity>
            </View>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderSearchResult}
              contentContainerStyle={{ paddingBottom: 20 }}
              ListEmptyComponent={
                searchKeyword && !searching ? (
                  <View style={s.emptyWrap}>
                    <Text style={[s.emptyText, { color: theme.textMuted }]}>未找到用户</Text>
                  </View>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#6C5CE7',
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  searchBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  searchBtnIcon: { fontSize: 18 },

  tabBar: {
    flexDirection: 'row', borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 14, position: 'relative',
  },
  tabLabel: {
    fontSize: 16, fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute', bottom: 0, width: 30, height: 3,
    borderRadius: 2, backgroundColor: '#6C5CE7',
  },
  tabBadge: {
    position: 'absolute', top: -6, right: -20,
    minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: '#FF4D6A', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },

  chatItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    marginHorizontal: 10, marginBottom: 1, borderRadius: 14, marginTop: 3,
  },
  avatarWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#F0EDFF', justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarEmoji: { fontSize: 28 },
  chatInfo: { flex: 1 },
  chatRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3,
  },
  chatName: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  chatTime: { fontSize: 12 },
  chatLastMsg: { fontSize: 14, flex: 1, marginRight: 8 },
  unreadDot: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF4D6A', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadTxt: { color: '#fff', fontSize: 11, fontWeight: '700' },

  friendItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    marginHorizontal: 10, marginBottom: 1, borderRadius: 14, marginTop: 3,
  },
  friendName: { fontSize: 16, fontWeight: '600', marginLeft: 14 },

  pendingItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    marginHorizontal: 10, marginBottom: 1, borderRadius: 14, marginTop: 3,
  },
  actionBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16,
  },
  actionBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, marginTop: 12, fontWeight: '500' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  searchInputRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 12,
    borderRadius: 14, paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1, height: 46, fontSize: 15,
  },
  searchSubmitBtn: {
    backgroundColor: '#6C5CE7', paddingHorizontal: 18,
    height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    marginHorizontal: 12, borderRadius: 12, marginTop: 4,
  },
  avatarWrapSmall: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F0EDFF', justifyContent: 'center', alignItems: 'center',
  },
  avatarEmojiSmall: { fontSize: 22 },
  addFriendBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14,
  },
  addFriendBtnTxt: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
