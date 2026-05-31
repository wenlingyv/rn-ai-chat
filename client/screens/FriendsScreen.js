// ============================================================
// 【新增】好友消息页 — 好友聊天列表 + 一对一聊天界面
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';

// 模拟好友数据
const MOCK_FRIENDS = [
  { id: '1', name: '小明', avatar: '', lastMsg: '周末一起去打球吗？', time: '10:23', unread: 2, color: '#FF6B6B' },
  { id: '2', name: '小红', avatar: '', lastMsg: '照片已经发你了', time: '09:15', unread: 0, color: '#FFA940' },
  { id: '3', name: '阿杰', avatar: '', lastMsg: '哈哈这也太搞笑了', time: '昨天', unread: 5, color: '#52C41A' },
  { id: '4', name: '小美', avatar: '', lastMsg: '好的，那明天见！', time: '昨天', unread: 0, color: '#7C5CFC' },
  { id: '5', name: '大伟', avatar: '', lastMsg: '文档我已经更新了', time: '周一', unread: 0, color: '#13C2C2' },
  { id: '6', name: '露露', avatar: '', lastMsg: '生日快乐！', time: '周日', unread: 1, color: '#EB2F96' },
  { id: '7', name: '阿豪', avatar: '', lastMsg: '项目进度怎么样了', time: '周六', unread: 0, color: '#FA8C16' },
  { id: '8', name: '静静', avatar: '', lastMsg: '分享了一首歌给你', time: '周五', unread: 3, color: '#2F54EB' },
];

// 模拟聊天记录
const MOCK_CHATS = {
  '1': [
    { id: 'm1', from: '1', text: '嗨，在干嘛呢？', time: '10:10' },
    { id: 'm2', from: 'me', text: '刚忙完，怎么了？', time: '10:12' },
    { id: 'm3', from: '1', text: '周末一起去打球吗？', time: '10:23' },
  ],
  '2': [
    { id: 'm1', from: '2', text: '你要的照片我拍好了', time: '09:00' },
    { id: 'm2', from: 'me', text: '太好了，发我看看', time: '09:10' },
    { id: 'm3', from: '2', text: '照片已经发你了', time: '09:15' },
  ],
  '3': [
    { id: 'm1', from: 'me', text: '你看这个视频了吗', time: '昨天' },
    { id: 'm2', from: '3', text: '看了看了', time: '昨天' },
    { id: 'm3', from: '3', text: '哈哈这也太搞笑了', time: '昨天' },
  ],
  '4': [
    { id: 'm1', from: 'me', text: '明天下午3点怎么样？', time: '昨天' },
    { id: 'm2', from: '4', text: '好的，那明天见！', time: '昨天' },
  ],
  '5': [
    { id: 'm1', from: '5', text: '文档我已经更新了', time: '周一' },
  ],
  '6': [
    { id: 'm1', from: '6', text: '生日快乐！', time: '周日' },
  ],
  '7': [
    { id: 'm1', from: '7', text: '项目进度怎么样了', time: '周六' },
  ],
  '8': [
    { id: 'm1', from: '8', text: '分享了一首歌给你', time: '周五' },
  ],
};

function getInitial(name) {
  return name.charAt(0);
}

function FriendsScreen({ navigation }) {
  const [friends] = useState(MOCK_FRIENDS);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatMessages, setChatMessages] = useState({});
  const [inputText, setInputText] = useState('');
  const chatListRef = useRef(null);

  useEffect(() => {
    setChatMessages(MOCK_CHATS);
  }, []);

  const enterChat = (friend) => {
    setSelectedFriend(friend);
    // 清除未读
    friend.unread = 0;
  };

  const goBack = () => {
    setSelectedFriend(null);
  };

  const sendMessage = () => {
    if (!inputText.trim() || !selectedFriend) return;
    const newMsg = {
      id: 'm' + Date.now(),
      from: 'me',
      text: inputText.trim(),
      time: '刚刚',
    };
    setChatMessages(prev => ({
      ...prev,
      [selectedFriend.id]: [...(prev[selectedFriend.id] || []), newMsg],
    }));
    setInputText('');

    // 模拟对方自动回复
    setTimeout(() => {
      const replyTexts = ['好的！', '收到～', '哈哈', '了解了解', '没问题！', '好的好的', '嗯嗯', '666'];
      const reply = {
        id: 'm' + (Date.now() + 1),
        from: selectedFriend.id,
        text: replyTexts[Math.floor(Math.random() * replyTexts.length)],
        time: '刚刚',
      };
      setChatMessages(prev => ({
        ...prev,
        [selectedFriend.id]: [...(prev[selectedFriend.id] || []), reply],
      }));
    }, 1200);
  };

  // 渲染聊天界面
  if (selectedFriend) {
    const msgs = chatMessages[selectedFriend.id] || [];
    return (
      <SafeAreaView style={styles.chatContainer}>
        <StatusBar barStyle="light-content" backgroundColor={selectedFriend.color} translucent={false} />
        <View style={[styles.chatHeader, { backgroundColor: selectedFriend.color }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle}>{selectedFriend.name}</Text>
          <View style={{ width: 60 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={80}
        >
          <FlatList
            ref={chatListRef}
            data={msgs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatMessages}
            onContentSizeChange={() => chatListRef.current?.scrollToEnd()}
            renderItem={({ item }) => {
              const isMe = item.from === 'me';
              return (
                <View style={[styles.chatBubbleRow, isMe && styles.chatBubbleRowMe]}>
                  {!isMe && (
                    <View style={[styles.chatAvatarSmall, { backgroundColor: selectedFriend.color }]}>
                      <Text style={styles.chatAvatarSmallText}>{getInitial(selectedFriend.name)}</Text>
                    </View>
                  )}
                  <View style={[styles.chatBubble, isMe ? styles.chatBubbleMe : styles.chatBubbleOther]}>
                    <Text style={[styles.chatBubbleText, isMe && styles.chatBubbleTextMe]}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
          />

          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="输入消息..."
              placeholderTextColor="#aaa"
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={[styles.chatSendBtn, { backgroundColor: selectedFriend.color }]} onPress={sendMessage}>
              <Text style={styles.chatSendBtnText}>发送</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // 渲染好友列表
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#7C5CFC" translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>好友消息</Text>
        <TouchableOpacity style={styles.headerAddBtn}>
          <Text style={styles.headerAddBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}> </Text>
        <Text style={styles.searchPlaceholder}>搜索好友...</Text>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.friendItem} onPress={() => enterChat(item)} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: item.color }]}>
              <Text style={styles.avatarText}>{getInitial(item.name)}</Text>
            </View>
            <View style={styles.friendInfo}>
              <View style={styles.friendRow}>
                <Text style={styles.friendName}>{item.name}</Text>
                <Text style={styles.friendTime}>{item.time}</Text>
              </View>
              <View style={styles.friendRow}>
                <Text style={styles.friendLastMsg} numberOfLines={1}>{item.lastMsg}</Text>
                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread > 99 ? '99+' : item.unread}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#7C5CFC',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerAddBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerAddBtnText: { fontSize: 22, color: '#fff', fontWeight: '600', lineHeight: 24 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchPlaceholder: { color: '#999', fontSize: 15 },
  list: { paddingHorizontal: 0 },
  friendItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', marginHorizontal: 12, marginBottom: 2,
    borderRadius: 12, marginTop: 4,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  friendInfo: { flex: 1 },
  friendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#222' },
  friendTime: { fontSize: 12, color: '#aaa' },
  friendLastMsg: { fontSize: 14, color: '#888', flex: 1, marginRight: 10 },
  unreadBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF4D6A', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // 聊天界面
  chatContainer: { flex: 1, backgroundColor: '#F0EFF5' },
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  chatHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  chatMessages: { paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 20 },
  chatBubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  chatBubbleRowMe: { flexDirection: 'row-reverse' },
  chatAvatarSmall: {
    width: 36, height: 36, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  chatAvatarSmallText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  chatBubble: {
    maxWidth: '70%', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 18,
  },
  chatBubbleMe: {
    backgroundColor: '#7C5CFC', borderBottomRightRadius: 4,
  },
  chatBubbleOther: {
    backgroundColor: '#fff', borderBottomLeftRadius: 4,
  },
  chatBubbleText: { fontSize: 15, lineHeight: 21, color: '#333' },
  chatBubbleTextMe: { color: '#fff' },
  chatInputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee',
  },
  chatInput: {
    flex: 1, height: 44, backgroundColor: '#F5F3FF',
    borderRadius: 22, paddingHorizontal: 16, fontSize: 15,
  },
  chatSendBtn: {
    marginLeft: 10, paddingHorizontal: 18, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  chatSendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default FriendsScreen;
