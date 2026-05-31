// ============================================================
// 【新增】朋友圈页 — 动态列表 + 发布弹窗 + 点赞评论UI
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  SafeAreaView, StatusBar, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';

// 模拟动态数据
const MOCK_POSTS = [
  { id: '1', author: '小明', color: '#FF6B6B', content: '今天的天气真好，适合出去走走！心情美美的~', time: '10分钟前', likes: 12, comments: 3 },
  { id: '2', author: '小红', color: '#FFA940', content: '新学会了一道菜，味道还不错，以后可以经常做了！', time: '30分钟前', likes: 8, comments: 2 },
  { id: '3', author: '阿杰', color: '#52C41A', content: '周末去了海边，海风真的太舒服了，强烈推荐大家去放松一下！', time: '1小时前', likes: 25, comments: 7 },
  { id: '4', author: '小美', color: '#7C5CFC', content: '今天加班到很晚，但是项目终于上线了！成就感满满！', time: '3小时前', likes: 18, comments: 5 },
  { id: '5', author: '大伟', color: '#13C2C2', content: '分享一本好书《人类简史》，强烈推荐！读完感觉世界观都被刷新了。', time: '5小时前', likes: 32, comments: 9 },
  { id: '6', author: '露露', color: '#EB2F96', content: '生日快乐！谢谢大家的祝福，今天真的超级开心！', time: '昨天', likes: 56, comments: 15 },
  { id: '7', author: '阿豪', color: '#FA8C16', content: '新的健身房开业了，第一天体验感拉满，以后要天天来！', time: '昨天', likes: 14, comments: 4 },
  { id: '8', author: '静静', color: '#2F54EB', content: '分享一首超好听的歌，循环播放了一整天停不下来！', time: '2天前', likes: 21, comments: 6 },
];

function getInitial(name) {
  return name.charAt(0);
}

function MomentsScreen() {
  const [posts, setPosts] = useState(MOCK_POSTS);
  const [showModal, setShowModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [likedPosts, setLikedPosts] = useState({});

  const publishPost = () => {
    if (!newContent.trim()) return;
    const newPost = {
      id: 'p' + Date.now(),
      author: '我',
      color: '#FF4D6A',
      content: newContent.trim(),
      time: '刚刚',
      likes: 0,
      comments: 0,
    };
    setPosts(prev => [newPost, ...prev]);
    setNewContent('');
    setShowModal(false);
  };

  const toggleLike = (postId) => {
    setLikedPosts(prev => {
      const isLiked = prev[postId];
      return { ...prev, [postId]: !isLiked };
    });
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, likes: likedPosts[postId] ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const renderPost = ({ item }) => {
    const isLiked = likedPosts[item.id];
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: item.color }]}>
            <Text style={styles.avatarText}>{getInitial(item.author)}</Text>
          </View>
          <View style={styles.postAuthorInfo}>
            <Text style={styles.postAuthor}>{item.author}</Text>
            <Text style={styles.postTime}>{item.time}</Text>
          </View>
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => toggleLike(item.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionIcon, isLiked && styles.actionIconLiked]}>
              {isLiked ? '❤️' : ' '}
            </Text>
            <Text style={[styles.actionText, isLiked && styles.actionTextLiked]}>
              {item.likes}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.actionIcon}> </Text>
            <Text style={styles.actionText}>{item.comments}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
            <Text style={styles.actionIcon}>↗️</Text>
            <Text style={styles.actionText}>分享</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF4D6A" translucent={false} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>朋友圈</Text>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.publishBtnText}>+ 发布</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* 发布弹窗 */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Text style={styles.modalCancel}>取消</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>发布动态</Text>
              <TouchableOpacity onPress={publishPost}>
                <Text style={styles.modalPublish}>发布</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="这一刻的想法..."
              placeholderTextColor="#bbb"
              multiline
              value={newContent}
              onChangeText={setNewContent}
              autoFocus
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: '#FF4D6A',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  publishBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  publishBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { padding: 12, paddingBottom: 20 },

  // 动态卡片
  postCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12,
    shadowColor: '#FF4D6A', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 46, height: 46, borderRadius: 23,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  postAuthorInfo: { flex: 1 },
  postAuthor: { fontSize: 16, fontWeight: '600', color: '#222' },
  postTime: { fontSize: 12, color: '#aaa', marginTop: 2 },
  postContent: {
    fontSize: 15, color: '#444', lineHeight: 22,
    marginBottom: 14, paddingLeft: 58,
  },
  postActions: {
    flexDirection: 'row', justifyContent: 'space-around',
    borderTopWidth: 1, borderTopColor: '#F5F5F5',
    paddingTop: 12, paddingLeft: 58,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center' },
  actionIcon: { fontSize: 18, marginRight: 4 },
  actionIconLiked: {},
  actionText: { fontSize: 13, color: '#888' },
  actionTextLiked: { color: '#FF4D6A' },

  // 发布弹窗
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, minHeight: 300,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  modalCancel: { fontSize: 16, color: '#888' },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#333' },
  modalPublish: { fontSize: 16, color: '#FF4D6A', fontWeight: '700' },
  modalInput: {
    paddingHorizontal: 20, paddingTop: 16, fontSize: 16,
    textAlignVertical: 'top', minHeight: 200, color: '#333',
  },
});

export default MomentsScreen;
