// ============================================================
// 消息页面 - 支持用户间聊天（集成认证）
// ============================================================
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { userAPI, chatAPI } from '../api';

const MessagesScreenNew = () => {
  const { t } = useTranslation();
  const { user, authFetch } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  const flatListRef = useRef(null);

  // 加载用户列表
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await authFetch('/api/auth/profile');
        if (response.ok) {
          const userData = await response.json();
          // 这里应该获取其他用户列表，暂时模拟
          setUsers([
            { id: 1, phone: '13800138000', nickname: '用户1' },
            { id: 2, phone: '13800138001', nickname: '用户2' },
            { id: 3, phone: '13800138002', nickname: '用户3' },
          ]);
        }
      } catch (error) {
        console.error('Load users error:', error);
        Alert.alert('错误', '加载用户列表失败');
      } finally {
        setIsLoadingUsers(false);
      }
    };

    loadUsers();
  }, [user]);

  // 加载聊天记录
  const loadMessages = async () => {
    if (!selectedUser) return;

    setLoading(true);
    try {
      // 这里应该加载与选定用户的聊天记录
      // 暂时使用模拟数据
      const response = await chatAPI.sendMessage('加载历史记录', { userId: selectedUser.id });
      if (response.data.success) {
        // 实际应用中应该解析返回的消息历史
        setMessages([
          { id: 1, sender_id: user.id, receiver_id: selectedUser.id, content: '你好！', role: 'user', created_at: new Date() },
          { id: 2, sender_id: selectedUser.id, receiver_id: user.id, content: '你好，很高兴认识你！', role: 'user', created_at: new Date() },
        ]);
      }
    } catch (error) {
      console.error('Load messages error:', error);
      // 使用默认消息
      setMessages([
        { id: 1, sender_id: user.id, receiver_id: selectedUser.id, content: '你好！', role: 'user', created_at: new Date() },
        { id: 2, sender_id: selectedUser.id, receiver_id: user.id, content: '你好，很高兴认识你！', role: 'user', created_at: new Date() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      loadMessages();
    }
  }, [selectedUser]);

  // 发送消息
  const sendMessage = async () => {
    if (!input.trim() || !selectedUser || loading) return;

    setLoading(true);
    try {
      const newMessage = {
        id: Date.now(),
        sender_id: user.id,
        receiver_id: selectedUser.id,
        content: input.trim(),
        role: 'user',
        created_at: new Date(),
      };

      // 添加到本地消息列表
      setMessages(prev => [...prev, newMessage]);

      // 发送到服务器
      const response = await chatAPI.sendMessage(input.trim(), {
        receiverId: selectedUser.id,
      });

      if (response.data.success) {
        setInput('');
        // 可以在这里添加服务器返回的消息
      }

    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('错误', '发送消息失败');
    } finally {
      setLoading(false);
    }
  };

  // 格式化时间
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.sender_id === user.id;

    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownText : styles.otherText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownTime : styles.otherTime
          ]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 用户选择器 */}
      <View style={styles.userSelector}>
        <Text style={styles.selectorTitle}>选择聊天对象：</Text>
        {isLoadingUsers ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={users}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.userItem,
                  selectedUser?.id === item.id && styles.selectedUser
                ]}
                onPress={() => setSelectedUser(item)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {item.nickname?.[0] || 'U'}
                  </Text>
                </View>
                <Text style={styles.userNickname}>
                  {item.nickname || item.phone}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* 聊天区域 */}
      {selectedUser ? (
        <>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            style={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.inputContainer}
          >
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="输入消息..."
                value={input}
                onChangeText={setInput}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!input.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.sendButtonText}>发送</Text>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </>
      ) : (
        <View style={styles.noUserSelected}>
          <Text style={styles.noUserText}>请选择一个聊天对象</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userSelector: {
    backgroundColor: '#fff',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  loading: {
    marginVertical: 10,
  },
  userItem: {
    marginRight: 15,
    alignItems: 'center',
  },
  selectedUser: {
    transform: [{ scale: 1.1 }],
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userNickname: {
    fontSize: 14,
    color: '#333',
  },
  messagesList: {
    flex: 1,
    padding: 10,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#e0e0e0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 5,
  },
  ownText: {
    color: '#fff',
  },
  otherText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  ownTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTime: {
    color: 'rgba(0, 0, 0, 0.5)',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noUserSelected: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noUserText: {
    fontSize: 18,
    color: '#666',
  },
});

export default MessagesScreenNew;