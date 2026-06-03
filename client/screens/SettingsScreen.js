import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView, Modal, Dimensions, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../LanguageContext';
import { useAuth } from '../AuthContext';

const { width } = Dimensions.get('window');

const AVATAR_OPTIONS = [
  '👤', '👩', '👨', '👧', '👦', '👵', '👴',
  '🧑', '👱', '👸', '🤴', '🧔', '👲', '🧕',
  '👨‍💼', '👩‍💼', '👨‍🎓', '👩‍🎓', '👨‍⚕️', '👩‍⚕️',
];

export default function SettingsScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, currentLanguageText, isLoaded } = useLanguage();
  const { logout, user, updateUserData, authFetch } = useAuth();

  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [customAvatar, setCustomAvatar] = useState('👤');
  const [bio, setBio] = useState('热爱生活，积极向上');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (user) {
      setCustomAvatar(user.avatar || '👤');
    }
  }, [user]);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = () => {
    setLogoutModalVisible(false);
    logout().catch(error => {
      console.error('Logout error:', error);
    });
  };

  const handleAvatarPress = () => {
    setAvatarModalVisible(true);
  };

  const selectAvatar = async (avatar) => {
    setCustomAvatar(avatar);
    setSelectedImage(null);
    setAvatarModalVisible(false);
    
    if (user) {
      try {
        await authFetch(`http://192.168.43.231:5000/api/auth/profile`, {
          method: 'PUT',
          body: JSON.stringify({ avatar }),
        });
        await updateUserData({ avatar });
      } catch (error) {
        console.error('Update avatar error:', error);
      }
    }
  };

  const handleSelectFromAlbum = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert('需要相册权限才能选择图片');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!pickerResult.canceled) {
      const base64Data = `data:image/jpeg;base64,${pickerResult.assets[0].base64}`;
      setSelectedImage(pickerResult.assets[0].uri);
      setCustomAvatar('🖼️');
      
      try {
        await authFetch(`http://192.168.43.231:5000/api/auth/profile`, {
          method: 'PUT',
          body: JSON.stringify({ avatar: base64Data }),
        });
        await updateUserData({ avatar: base64Data });
        setAvatarModalVisible(false);
      } catch (error) {
        console.error('Update avatar error:', error);
      }
    }
  };

  if (!isLoaded) {
    return (
      <SafeAreaView style={[st.container, { backgroundColor: theme.bg }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.text }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.username || user?.nickname || t('settings.nickname');
  const avatarText = customAvatar;

  const MENU_ITEMS = [
    { icon: '👤', label: t('settings.profile'), desc: t('settings.profileDesc') },
    { icon: '🔒', label: t('settings.privacy'), desc: t('settings.privacyDesc') },
    { icon: '🔔', label: t('settings.notifications'), desc: t('settings.notificationsDesc') },
    { icon: '🎨', label: t('settings.theme'), desc: t('settings.themeDesc'), route: 'ThemeSettings' },
    { icon: '💬', label: t('settings.chatHistory'), desc: t('settings.chatHistoryDesc') },
    { icon: '🌐', label: t('settings.language'), desc: t('settings.languageDesc'), action: 'language' },
    { icon: '❓', label: t('settings.help'), desc: t('settings.helpDesc') },
    { icon: 'ℹ️', label: t('settings.about'), desc: t('settings.aboutDesc') },
  ];

  const handleMenuPress = (item) => {
    if (item.action === 'language') {
      setLanguageModalVisible(true);
    } else if (item.route) {
      navigation.navigate(item.route);
    }
  };

  const handleSelectLanguage = (lang) => {
    changeLanguage(lang);
    setLanguageModalVisible(false);
  };

  return (
    <SafeAreaView style={[st.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={colors.primary} />

      <View style={[st.header, { backgroundColor: colors.primary }]}>
        <Text style={st.headerTitle}>{t('settings.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={st.scrollBody}>
        
        <View style={[st.profileCard, { backgroundColor: colors.primary }]}>


          <TouchableOpacity 
            style={st.avatarWrap} 
            onPress={handleAvatarPress}
            activeOpacity={0.8}
          >
            <View style={st.avatar}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={st.avatarImage} />
              ) : (
                <Text style={st.avatarTxt}>{avatarText}</Text>
              )}
            </View>
            <View style={st.avatarEditBadge}>
              <Text style={st.avatarEditIcon}>✏️</Text>
            </View>
          </TouchableOpacity>
          <Text style={st.nickname}>{displayName}</Text>
          <Text style={st.bio}>{bio}</Text>
          <View style={st.statsRow}>
            {[{ n: '128', l: t('settings.friends') }, { n: '56', l: t('settings.posts') }, { n: '2.3k', l: t('settings.likes') }].map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={st.statDiv} />}
                <View style={st.statItem}>
                  <Text style={st.statNum}>{s.n}</Text>
                  <Text style={st.statLabel}>{s.l}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={st.menuList}>
          {MENU_ITEMS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[st.menuItem, { backgroundColor: theme.card }]}
              onPress={() => handleMenuPress(item)}
              activeOpacity={0.7}
            >
              <View style={[st.menuIconWrap, { backgroundColor: colors.primary }]}>
                <Text style={st.menuIcon}>{item.icon}</Text>
              </View>
              <View style={st.menuInfo}>
                <Text style={[st.menuLabel, { color: theme.text }]}>{item.label}</Text>
                <Text style={[st.menuDesc, { color: theme.textMuted }]}>{item.desc}</Text>
              </View>
              <Text style={[st.menuArrow, { color: theme.textMuted }]}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[st.logoutBtn, { backgroundColor: '#FF4D6A' }]}
          activeOpacity={0.8}
          onPress={handleLogout}
        >
          <Text style={st.logoutTxt}>{t('settings.logout')}</Text>
        </TouchableOpacity>

        <Text style={[st.version, { color: theme.textMuted }]}>{t('settings.version')}</Text>
      </ScrollView>

      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[st.modalTitle, { color: theme.text }]}>{t('settings.language')}</Text>

            <TouchableOpacity style={st.langItem} onPress={() => handleSelectLanguage('zh')}>
              <Text style={{ color: currentLanguage === 'zh' ? colors.primary : theme.text, fontSize:16 }}>简体中文</Text>
            </TouchableOpacity>

            <TouchableOpacity style={st.langItem} onPress={() => handleSelectLanguage('en')}>
              <Text style={{ color: currentLanguage === 'en' ? colors.primary : theme.text, fontSize:16 }}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[st.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setLanguageModalVisible(false)}
            >
              <Text style={{ color: '#fff' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={logoutModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[st.modalTitle, { color: theme.text }]}>{t('settings.logout')}</Text>
            <Text style={[st.logoutConfirmText, { color: theme.textMuted }]}>{t('settings.logoutConfirm')}</Text>
            <View style={st.logoutBtnRow}>
              <TouchableOpacity
                style={[st.logoutCancelBtn, { borderColor: theme.textMuted }]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={{ color: theme.text, fontSize: 15 }}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.logoutConfirmBtn}
                onPress={confirmLogout}
              >
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={avatarModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={st.modalOverlay}>
          <View style={[st.avatarModalContent, { backgroundColor: theme.card }]}>
            <Text style={[st.modalTitle, { color: theme.text }]}>选择头像</Text>
            <Text style={[st.avatarModalSubtitle, { color: theme.textMuted }]}>点击选择你喜欢的头像或从相册上传</Text>
            
            <TouchableOpacity
              style={[st.albumBtn, { backgroundColor: colors.primary }]}
              onPress={handleSelectFromAlbum}
              activeOpacity={0.7}
            >
              <Text style={st.albumBtnText}>📷 从相册选择</Text>
            </TouchableOpacity>

            <ScrollView contentContainerStyle={st.avatarGrid}>
              {AVATAR_OPTIONS.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    st.avatarOption,
                    customAvatar === avatar && !selectedImage && {
                      borderColor: colors.primary,
                      borderWidth: 3,
                    }
                  ]}
                  onPress={() => selectAvatar(avatar)}
                  activeOpacity={0.7}
                >
                  <Text style={st.avatarOptionText}>{avatar}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[st.closeBtn, { backgroundColor: colors.primary }]}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={{ color: '#fff' }}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  scrollBody: { paddingBottom: 40 },

  profileCard: {
    paddingTop: 28, paddingBottom: 24, paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    position: 'relative',
  },

  avatarWrap: { position:'relative', marginBottom:12, zIndex:2 },
  avatar: {
    width:80, height:80, borderRadius:40,
    backgroundColor:'rgba(255,255,255,0.3)',
    justifyContent:'center', alignItems:'center',
    borderWidth:3, borderColor:'rgba(255,255,255,0.5)'
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    resizeMode: 'cover',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarEditIcon: { fontSize: 14 },
  avatarTxt: { fontSize:32, fontWeight:'800', color:'#0F172A' },
  nickname: { fontSize:22, fontWeight:'700', color:'#0F172A', marginBottom:4, zIndex:2 },
  bio: { fontSize:14, color:'#0F172A', marginBottom:18, zIndex:2 },
  statsRow: {
    flexDirection:'row', alignItems:'center',
    backgroundColor:'rgba(255,255,255,0.2)',
    borderRadius:16, paddingHorizontal:24, paddingVertical:12, zIndex:2
  },
  statItem: { alignItems:'center', paddingHorizontal:18 },
  statNum: { fontSize:18, fontWeight:'700', color:'#0F172A' },
  statLabel: { fontSize:12, color:'#0F172A', marginTop:2 },
  statDiv: { width:1, height:28, backgroundColor:'rgba(255,255,255,0.3)' },

  menuList: { padding:16, paddingTop:12 },
  menuItem: {
    flexDirection:'row', alignItems:'center',
    borderRadius:14, padding:16, marginBottom:10,
    shadowColor:'#000', shadowOffset:{width:0,height:1},
    shadowOpacity:0.04, shadowRadius:4, elevation:2
  },
  menuIconWrap: {
    width:42, height:42, borderRadius:12,
    justifyContent:'center', alignItems:'center', marginRight:14
  },
  menuIcon: { fontSize:20, color:'#fff' },
  menuInfo: { flex:1 },
  menuLabel: { fontSize:16, fontWeight:'600' },
  menuDesc: { fontSize:12, marginTop:2 },
  menuArrow: { fontSize:22, fontWeight:'300' },

  logoutBtn: {
    marginHorizontal:16, borderRadius:14, paddingVertical:16,
    alignItems:'center', marginTop:6,
    shadowColor:'#FF4D6A', shadowOffset:{width:0,height:4},
    shadowOpacity:0.25, shadowRadius:8, elevation:4
  },
  logoutTxt: { color:'#fff', fontSize:16, fontWeight:'700' },
  version: { textAlign:'center', fontSize:12, marginTop:20 },

  modalOverlay: { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'center', alignItems:'center' },
  modalContent: { width:'80%', borderRadius:16, padding:20, alignItems:'center' },
  avatarModalContent: { width:'90%', maxHeight: '80%', borderRadius:16, padding:20, alignItems:'center' },
  avatarModalSubtitle: { fontSize:14, marginBottom:12 },
  modalTitle: { fontSize:18, fontWeight:'bold', marginBottom:8 },
  langItem: { padding:15, width:'100%', alignItems:'center' },
  closeBtn: { marginTop:10, padding:12, borderRadius:12, width:'100%', alignItems:'center' },

  albumBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  albumBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  logoutConfirmText: { fontSize: 15, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  logoutBtnRow: { flexDirection: 'row', width: '100%', gap: 12 },
  logoutCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  logoutConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#FF4D6A' },

  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
    maxHeight: '55%',
    width: '100%',
  },
  avatarOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarOptionText: { fontSize: 28 },
});