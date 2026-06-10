import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Modal, StatusBar
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import TransitionScreen from './TransitionScreen';
import { API_BASE } from '../config';

const API_URL = API_BASE;

const LoginScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { login: authLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [pendingAuthData, setPendingAuthData] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [msgModalVisible, setMsgModalVisible] = useState(false);
  const [msgTitle, setMsgTitle] = useState('');
  const [msgContent, setMsgContent] = useState('');

  // 用 ref 保持最新值，避免 onDone 闭包过期
  const pendingAuthDataRef = useRef(pendingAuthData);
  pendingAuthDataRef.current = pendingAuthData;
  const authLoginRef = useRef(authLogin);
  authLoginRef.current = authLogin;

  useEffect(() => {
    if (route.params?.isLogin !== undefined) {
      setIsLogin(route.params.isLogin);
    }
  }, [route.params]);

  const showMessage = (title, content) => {
    setMsgTitle(title);
    setMsgContent(content);
    setMsgModalVisible(true);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      showMessage('提示', '请填写用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (data.success) {
        setPendingAuthData(data.data);
        setShowTransition(true);
      } else {
        showMessage('登录失败', data.message || '用户名或密码错误');
      }
    } catch (error) {
      console.error(error);
      showMessage('网络错误', '无法连接到服务器，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      showMessage('提示', '请填写用户名和密码');
      return;
    }

    if (password.length < 6) {
      showMessage('提示', '密码长度至少6位');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (data.success) {
        showMessage('注册成功', '您的账号已创建，请登录');
        setIsLogin(true);
        setPassword('');
      } else {
        showMessage('注册失败', data.message || '注册失败，请重试');
      }
    } catch (error) {
      console.error(error);
      showMessage('网络错误', '无法连接到服务器，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setPassword('');
  };

  if (showTransition) {
    return (
      <TransitionScreen onDone={async () => {
        const authData = pendingAuthDataRef.current;
        if (authData) {
          try {
            await authLoginRef.current(authData);
            setPendingAuthData(null);
          } catch (e) {
            console.error('Auth login error:', e);
            setPendingAuthData(null);
            setShowTransition(false);
          }
        } else {
          setShowTransition(false);
        }
      }} />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isLogin ? (
          <View style={styles.loginContainer}>
            <View style={styles.loginHeader}>
              <View style={styles.loginBgDecoration}>
                <View style={[styles.circle, styles.circle1]} />
                <View style={[styles.circle, styles.circle2]} />
                <View style={[styles.circle, styles.circle3]} />
              </View>
              <View style={styles.loginLogo}>
                <Text style={styles.logoIcon}>💬</Text>
                <Text style={styles.logoIcon}>💕</Text>
                <Text style={styles.logoTitle}>MeetU</Text>
                <Text style={styles.logoSubtitle}>瞬间相遇，记录社交瞬间</Text>
              </View>
            </View>

            <View style={styles.loginCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>欢迎回来</Text>
                <Text style={styles.cardSubtitle}>登录您的账号，继续精彩社交</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="用户名"
                    value={username}
                    onChangeText={setUsername}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="密码"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={true}
                    placeholderTextColor="#999"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.buttonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>登录</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={styles.forgotPasswordText}>忘记密码？</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.loginFooter}>
              <Text style={styles.footerText}>还没有账号？</Text>
              <TouchableOpacity onPress={handleToggleMode} activeOpacity={0.7}>
                <Text style={styles.footerLink}>立即注册</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.registerContainer}>
            <View style={styles.registerHeader}>
              <View style={styles.registerBgDecoration}>
                <View style={[styles.wave, styles.wave1]} />
                <View style={[styles.wave, styles.wave2]} />
                <View style={[styles.wave, styles.wave3]} />
              </View>
              <View style={styles.registerLogo}>
                <Text style={styles.registerLogoIcon}>✨</Text>
                <Text style={styles.registerLogoTitle}>加入 MeetU</Text>
                <Text style={styles.registerLogoIcon}>💕</Text>
                <Text style={styles.registerLogoTitle}>MeetU</Text>
                <Text style={styles.registerLogoSubtitle}>瞬间相遇，记录社交瞬间</Text>
              </View>
            </View>

            <View style={styles.registerCard}>
              <View style={styles.registerCardHeader}>
                <View style={styles.rainbowDivider}>
                  <View style={[styles.dividerColor, { backgroundColor: '#FF6B6B' }]} />
                  <View style={[styles.dividerColor, { backgroundColor: '#FFE66D' }]} />
                  <View style={[styles.dividerColor, { backgroundColor: '#4ECDC4' }]} />
                  <View style={[styles.dividerColor, { backgroundColor: '#45B7D1' }]} />
                  <View style={[styles.dividerColor, { backgroundColor: '#96CEB4' }]} />
                </View>
              </View>

              <View style={styles.registerForm}>
                <View style={styles.registerInputWrapper}>
                  <Text style={styles.registerInputLabel}>用户名</Text>
                  <View style={styles.registerInputBox}>
                    <TextInput
                      style={styles.registerInput}
                      placeholder="请输入用户名"
                      value={username}
                      onChangeText={setUsername}
                      placeholderTextColor="#bbb"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.registerInputWrapper}>
                  <Text style={styles.registerInputLabel}>密码</Text>
                  <View style={styles.registerInputBox}>
                    <TextInput
                      style={styles.registerInput}
                      placeholder="请输入密码（至少6位）"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={true}
                      placeholderTextColor="#bbb"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.registerButton, loading && styles.buttonDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.registerButtonText}>注册账号</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.registerFooter}>
              <Text style={styles.registerFooterText}>已有账号？</Text>
              <TouchableOpacity onPress={handleToggleMode} activeOpacity={0.7}>
                <Text style={styles.registerFooterLink}>立即登录</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={msgModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setMsgModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{msgTitle}</Text>
            <Text style={styles.modalText}>{msgContent}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setMsgModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalButtonText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { flexGrow: 1 },

  loginContainer: { padding: 20, backgroundColor: '#f8fafc' },
  loginHeader: { position: 'relative', alignItems: 'center', marginBottom: 30 },
  loginBgDecoration: { position: 'absolute', width: '100%', height: 200, overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 100 },
  circle1: { width: 150, height: 150, backgroundColor: 'rgba(139, 92, 246, 0.1)', top: -50, right: -50 },
  circle2: { width: 100, height: 100, backgroundColor: 'rgba(59, 130, 246, 0.15)', top: 50, left: -30 },
  circle3: { width: 80, height: 80, backgroundColor: 'rgba(16, 185, 129, 0.1)', top: 100, right: 20 },
  loginLogo: { position: 'relative', zIndex: 1, alignItems: 'center', marginTop: 80 },
  logoIcon: { fontSize: 60, marginBottom: 15 },
  logoTitle: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  logoSubtitle: { fontSize: 14, color: '#64748b' },

  loginCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 8 },
  cardHeader: { marginBottom: 30 },
  cardTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  cardSubtitle: { fontSize: 14, color: '#64748b' },

  form: { gap: 15 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, height: 50 },
  inputIcon: { fontSize: 20, marginRight: 12, color: '#94a3b8' },
  textInput: { flex: 1, fontSize: 16, color: '#1e293b' },

  loginButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    elevation: 5,
    shadowColor: 'rgba(102, 126, 234, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  forgotPassword: { alignItems: 'center', marginTop: 15 },
  forgotPasswordText: { color: '#667eea', fontSize: 14 },

  loginFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 5 },
  footerText: { color: '#64748b', fontSize: 14 },
  footerLink: { color: '#667eea', fontSize: 14, fontWeight: '600' },

  registerContainer: { padding: 20, backgroundColor: '#fff' },
  registerHeader: { position: 'relative', alignItems: 'center', marginBottom: 30 },
  registerBgDecoration: { position: 'absolute', width: '100%', height: 250, overflow: 'hidden' },
  wave: { position: 'absolute', borderRadius: 1000 },
  wave1: { width: 300, height: 150, backgroundColor: '#FFE5E5', top: -30, left: -50 },
  wave2: { width: 250, height: 120, backgroundColor: '#E5F5FF', top: 50, right: -30 },
  wave3: { width: 200, height: 100, backgroundColor: '#E5FFE5', top: 120, left: 20 },
  registerLogo: { position: 'relative', zIndex: 1, alignItems: 'center', marginTop: 100 },
  registerLogoIcon: { fontSize: 70, marginBottom: 15 },
  registerLogoTitle: { fontSize: 26, fontWeight: 'bold', color: '#1e293b', marginBottom: 5 },
  registerLogoSubtitle: { fontSize: 14, color: '#64748b' },

  registerCard: { backgroundColor: '#fff', borderRadius: 20, padding: 30, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
  registerCardHeader: { marginBottom: 25 },
  rainbowDivider: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  dividerColor: { flex: 1 },

  registerForm: { gap: 20 },
  registerInputWrapper: {},
  registerInputLabel: { fontSize: 14, color: '#475569', fontWeight: '500', marginBottom: 8 },
  registerInputBox: { backgroundColor: '#fafafa', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4 },
  registerInput: { fontSize: 16, color: '#1e293b', height: 40 },

  registerButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    elevation: 5,
    shadowColor: 'rgba(78, 205, 196, 0.4)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  registerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  registerFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30, gap: 5 },
  registerFooterText: { color: '#64748b', fontSize: 14 },
  registerFooterLink: { color: '#4ECDC4', fontSize: 14, fontWeight: '600' },

  buttonDisabled: { opacity: 0.6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },
  modalText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  modalButton: { backgroundColor: '#667eea', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40, alignItems: 'center' },
  modalButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default LoginScreen;
