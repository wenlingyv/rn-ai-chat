import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, ActivityIndicator,
  Modal, Alert
} from 'react-native';
import { useAuth } from '../AuthContext';
import { useWebSocket } from '../WebSocketContext';
import { useTheme } from '../ThemeContext';
import { API_BASE as API_URL } from '../config';

const formatTime = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  if (msgDate.getTime() === today.getTime()) return `${hh}:${mm}`;
  if (msgDate.getTime() === yesterday.getTime()) return `昨天 ${hh}:${mm}`;
  const M = String(date.getMonth() + 1).padStart(2, '0');
  const D = String(date.getDate()).padStart(2, '0');
  return `${M}/${D} ${hh}:${mm}`;
};

function normalizeMessage(msg) {
  return {
    id: msg.id,
    sender_id: msg.sender_id ?? msg.senderId,
    receiver_id: msg.receiver_id ?? msg.receiverId,
    content: msg.content,
    is_read: msg.is_read ?? false,
    created_at: msg.created_at ?? msg.createdAt,
  };
}

export default function ChatDetailScreen({ route, navigation }) {
  const { friendId, friendName, friendAvatar, friendshipId } = route.params;
  const { user, authFetch } = useAuth();
  const { addListener, removeListener, sendMessage: wsSend, isConnected } = useWebSocket();
  const { colors, theme } = useTheme();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const flatListRef = useRef(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch(`${API_URL}/message/history/${friendId}?limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setMessages(data.data.map(normalizeMessage));
        }
      }
    } catch (e) {
      console.error('Load history error:', e);
    } finally {
      setLoading(false);
    }
  }, [friendId, authFetch]);

  const markAsRead = useCallback(async () => {
    try {
      await authFetch(`${API_URL}/message/read/${friendId}`, { method: 'PUT' });
    } catch (e) {
      console.error('Mark read error:', e);
    }
  }, [friendId, authFetch]);

  useEffect(() => {
    loadHistory();
    markAsRead();
  }, [loadHistory, markAsRead]);

  useEffect(() => {
    const handler = (msg) => {
      const normalized = normalizeMessage(msg);
      if (
        (normalized.sender_id == friendId && normalized.receiver_id == user.id) ||
        (normalized.sender_id == user.id && normalized.receiver_id == friendId)
      ) {
        setMessages(prev => {
          if (prev.some(m => m.id === normalized.id)) return prev;
          return [...prev, normalized];
        });
        if (normalized.sender_id == friendId) {
          markAsRead();
        }
      }
    };
    addListener('chat', handler);
    return () => removeListener('chat', handler);
  }, [friendId, user?.id, addListener, removeListener, markAsRead]);

  useEffect(() => {
    const handler = (msg) => {
      const normalized = normalizeMessage(msg);
      if (normalized.receiver_id == friendId && normalized.sender_id == user.id) {
        setMessages(prev => {
          const tempIdx = prev.findIndex(m => m.id && String(m.id).startsWith('temp_'));
          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = normalized;
            return updated;
          }
          if (prev.some(m => m.id === normalized.id)) return prev;
          return [...prev, normalized];
        });
      }
    };
    addListener('chat_sent', handler);
    return () => removeListener('chat_sent', handler);
  }, [friendId, user?.id, addListener, removeListener]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleDeleteFriend = async () => {
    try {
      setDeleting(true);
      let fId = friendshipId;
      if (!fId) {
        const listRes = await authFetch(`${API_URL}/friend/list`);
        const listData = await listRes.json();
        if (listData.success && Array.isArray(listData.data)) {
          const friend = listData.data.find(f => String(f.id) === String(friendId));
          if (friend) {
            fId = friend.friendship_id;
          }
        }
      }
      if (!fId) {
        Alert.alert('错误', '未找到好友关系');
        setDeleting(false);
        return;
      }
      const res = await authFetch(`${API_URL}/friend/${fId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDeleteConfirmVisible(false);
        setMenuVisible(false);
        Alert.alert('提示', '已删除好友', [
          { text: '确定', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('错误', data.message || '删除失败');
      }
    } catch (e) {
      Alert.alert('错误', '删除好友失败：' + e.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const tempId = `temp_${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tempId,
      sender_id: user.id,
      receiver_id: friendId,
      content: text,
      is_read: false,
      created_at: new Date().toISOString(),
    }]);

    wsSend({
      type: 'chat',
      senderId: user.id,
      receiverId: friendId,
      content: text,
    });

    setInput('');
  };

  const renderItem = ({ item, index }) => {
    const isMe = String(item.sender_id) === String(user.id);
    const showTime = index === 0 || (() => {
      const prev = messages[index - 1];
      const prevTime = new Date(prev.created_at).getTime();
      const currTime = new Date(item.created_at).getTime();
      return currTime - prevTime > 300000;
    })();

    return (
      <View>
        {showTime && (
          <View style={s.timeWrap}>
            <Text style={[s.timeText, { color: theme.textMuted }]}>{formatTime(item.created_at)}</Text>
          </View>
        )}
        <View style={[s.bubbleRow, isMe && s.bubbleRowMe]}>
          {!isMe && (
            <View style={[s.avatar, { backgroundColor: '#6C5CE7' }]}>
              <Text style={s.avatarText}>{friendAvatar || friendName?.[0] || '?'}</Text>
            </View>
          )}
          <View style={[
            s.bubble,
            isMe ? [s.bubbleMe, { backgroundColor: '#6C5CE7' }] : [s.bubbleOther, { backgroundColor: theme.card }]
          ]}>
            <Text style={[s.bubbleText, isMe ? s.bubbleTextMe : { color: theme.text }]}>{item.content}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#6C5CE7" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{friendName}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={s.menuBtn}>
          <Text style={s.menuBtnText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={s.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[s.menuDropdown, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => { setMenuVisible(false); setDeleteConfirmVisible(true); }}
              activeOpacity={0.7}
            >
              <Text style={[s.menuItemText, { color: '#FF4D6A' }]}>删除好友</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={deleteConfirmVisible} animationType="fade" transparent>
        <View style={s.confirmOverlay}>
          <View style={[s.confirmBox, { backgroundColor: theme.card }]}>
            <Text style={[s.confirmTitle, { color: theme.text }]}>删除好友</Text>
            <Text style={[s.confirmMsg, { color: theme.textSecondary }]}>
              确定要删除与「{friendName}」的好友关系吗？删除后将无法发送消息。
            </Text>
            <View style={s.confirmBtns}>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: theme.border }]}
                onPress={() => setDeleteConfirmVisible(false)}
                activeOpacity={0.7}
                disabled={deleting}
              >
                <Text style={[s.confirmBtnText, { color: theme.text }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: '#FF4D6A' }]}
                onPress={handleDeleteFriend}
                activeOpacity={0.7}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={[s.confirmBtnText, { color: '#fff' }]}>删除</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color="#6C5CE7" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={80}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item, i) => item.id?.toString() || i.toString()}
            contentContainerStyle={s.chatList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />

          <View style={[s.inputBar, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text }]}
              placeholder="输入消息..."
              placeholderTextColor={theme.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: input.trim() ? '#6C5CE7' : theme.textMuted }]}
              onPress={handleSend}
              disabled={!input.trim()}
              activeOpacity={0.7}
            >
              <Text style={s.sendBtnText}>发送</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#6C5CE7',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatList: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingBottom: 20,
  },
  timeWrap: {
    alignItems: 'center',
    marginVertical: 10,
  },
  timeText: {
    fontSize: 12,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  bubbleRowMe: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '70%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMe: {
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextMe: {
    color: '#fff',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    marginLeft: 10,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  menuBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuBtnText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  menuDropdown: {
    position: 'absolute',
    top: 60,
    right: 12,
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  menuItem: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBox: {
    width: '80%',
    maxWidth: 340,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMsg: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmBtns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmBtn: {
    flex: 1,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
