// ============================================================
// GLM-Realtime 语音对话页面
// 使用 WebSocket 连接智谱 GLM-Realtime API
// 实现实时语音对话功能
// ============================================================
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, FlatList,
  StyleSheet, SafeAreaView, StatusBar, Platform,
  ActivityIndicator, PermissionsAndroid, Alert,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../ThemeContext';
import { WS_URL } from '../config';

const PROXY_WS_URL = `${WS_URL}/api/realtime/ws`;

export default function VoiceChatScreen({ navigation }) {
  const { colors, theme } = useTheme();

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [statusText, setStatusText] = useState('点击连接开始语音对话');
  const [textInput, setTextInput] = useState('');

  const wsRef = useRef(null);
  const recordingRef = useRef(null);
  const soundRef = useRef(null);
  const flatListRef = useRef(null);
  const sessionReadyRef = useRef(false);

  useEffect(() => {
    requestPermission().then((granted) => {
      if (!granted) {
        Alert.alert('需要权限', '语音对话需要麦克风权限，请在系统设置中允许');
      }
    });
    return () => {
      disconnect();
    };
  }, []);

  const requestPermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (e) {
      return false;
    }
  };

  const connect = async () => {
    setConnecting(true);
    setSessionReady(false);
    setStatusText('正在连接语音服务...');

    try {
      const ws = new WebSocket(PROXY_WS_URL);

      ws.onopen = () => {
        setConnected(true);
        setConnecting(false);
        setSessionReady(false);
        sessionReadyRef.current = false;
        addSystemMessage('已连接到语音服务');
        setStatusText('正在建立会话...');
      };

      ws.onmessage = (event) => {
        try {
          if (event.data instanceof ArrayBuffer) {
            return;
          }
          if (typeof event.data === 'string') {
            try {
              const data = JSON.parse(event.data);
              handleServerEvent(data);
            } catch (parseErr) {}
            return;
          }
        } catch (e) {}
      };

      ws.onerror = (e) => {
        setConnecting(false);
        setStatusText('连接失败');
        addSystemMessage('连接失败');
      };

      ws.onclose = (e) => {
        setConnected(false);
        setConnecting(false);
        setRecording(false);
        setSessionReady(false);
        sessionReadyRef.current = false;
        setStatusText('连接已断开');
        addSystemMessage('连接已断开 (code: ' + e.code + ')');
        wsRef.current = null;
      };

      wsRef.current = ws;
    } catch (e) {
      setConnecting(false);
      setStatusText('连接异常');
    }
  };

  const disconnect = () => {
    if (recordingRef.current) {
      try { recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
    setRecording(false);
    setAiSpeaking(false);
    setSessionReady(false);
    sessionReadyRef.current = false;
    setStatusText('点击连接开始语音对话');
  };

  const handleServerEvent = (data) => {
    switch (data.type) {
      case 'session.created':
        setSessionReady(false);
        setStatusText('会话已创建，正在配置...');
        addSystemMessage('会话已创建，正在配置...');
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'session.update',
            session: {
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              turn_detection: { type: 'server_vad', create_response: true, interrupt_response: true },
              modalities: ['text', 'audio'],
              voice: 'male-qn-jingying',
              instructions: '你是 MeetU 社交 App 的 AI 语音助手，性格温柔友善，擅长社交话题，回答简洁有趣。单轮回复控制在100字以内。',
              beta_fields: {
                chat_mode: 'audio',
                tts_source: 'e2e',
                greeting_config: {
                  enable: true,
                  content: '你好，我是 MeetU 的 AI 语音助手，有什么可以帮你的吗？',
                },
              },
            },
          }));
          addSystemMessage('已发送会话配置');
        }
        break;

      case 'session.updated':
        setSessionReady(true);
        sessionReadyRef.current = true;
        setStatusText('会话就绪，按住说话');
        addSystemMessage('会话配置完成，可以开始对话');
        break;

      case 'response.created':
        setAiSpeaking(true);
        setStatusText('AI 正在回复...');
        break;

      case 'response.text.delta':
        if (data.delta) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && !last.complete) {
              return prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, content: m.content + data.delta }
                  : m
              );
            }
            return [...prev, { role: 'assistant', content: data.delta, complete: false }];
          });
        }
        break;

      case 'response.text.done':
        if (data.text) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && !last.complete) {
              return prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, content: last.content || data.text, complete: true }
                  : m
              );
            }
            return [...prev, { role: 'assistant', content: data.text, complete: true }];
          });
        } else {
          setMessages(prev =>
            prev.map((m, i) =>
              i === prev.length - 1 && m.role === 'assistant'
                ? { ...m, complete: true }
                : m
            )
          );
        }
        break;

      case 'response.audio.delta':
        // 不再处理，由后端合并为response.audio.wav
        break;

      case 'response.audio.wav':
        // 后端发送完整WAV base64数据，直接写入文件播放
        if (data.audio) {
          playWavBase64(data.audio);
        }
        break;

      case 'response.audio.url':
        // 旧方式，不再使用
        break;

      case 'response.audio_transcript.delta':
        if (data.delta) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant' && !last.complete) {
              return prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, content: m.content + data.delta }
                  : m
              );
            }
            return [...prev, { role: 'assistant', content: data.delta, complete: false }];
          });
        }
        break;

      case 'response.audio_transcript.done':
        if (data.transcript) {
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
              return prev.map((m, i) =>
                i === prev.length - 1
                  ? { ...m, content: data.transcript, complete: true }
                  : m
              );
            }
            return [...prev, { role: 'assistant', content: data.transcript, complete: true }];
          });
        }
        break;

      case 'response.audio.done':
        // 不再处理，由后端合并为response.audio.wav
        break;

      case 'response.done':
        setAiSpeaking(false);
        setStatusText('按住说话');
        break;

      case 'input_audio_buffer.speech_started':
        setStatusText('检测到语音...');
        break;

      case 'input_audio_buffer.speech_stopped':
        setStatusText('处理中...');
        break;

      case 'input_audio_buffer.committed':
        setStatusText('音频已提交，等待 AI 回复...');
        // server_vad 的 create_response:true 会自动触发回复
        // 5秒后如果没有收到AI回复，手动发送response.create作为兜底
        const committedTime = Date.now();
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionReadyRef.current) {
            // 检查是否已经收到AI回复（aiSpeaking为true说明已收到）
            if (!aiSpeaking) {
              wsRef.current.send(JSON.stringify({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio'],
                },
              }));
              addSystemMessage('自动触发回复...');
            }
          }
        }, 5000);
        break;

      case 'error':
        console.log('Realtime 错误:', JSON.stringify(data.error));
        const errMsg = data.error?.message || '未知错误';
        const errCode = data.error?.code || '';
        
        let displayMsg = errMsg;
        if (errCode === 'model_query_error') {
          displayMsg = '服务暂时不稳定，正在自动重试...';
          // 自动重试：3秒后重新发送response.create
          setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionReadyRef.current) {
              wsRef.current.send(JSON.stringify({
                type: 'response.create',
                response: { modalities: ['text', 'audio'] },
              }));
              addSystemMessage('正在重试...');
            }
          }, 3000);
        } else if (errMsg.includes('context canceled')) {
          displayMsg = '网络超时，正在自动重试...';
          setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && sessionReadyRef.current) {
              wsRef.current.send(JSON.stringify({
                type: 'response.create',
                response: { modalities: ['text', 'audio'] },
              }));
              addSystemMessage('正在重试...');
            }
          }, 3000);
        }
        
        addSystemMessage('错误' + (errCode ? '(' + errCode + ')' : '') + ': ' + displayMsg);
        setAiSpeaking(false);
        
        if (errCode === '1113') {
          setStatusText('账户欠费，请充值');
          Alert.alert('账户欠费', '智谱API账户已欠费，请充值后重试');
        } else if (errCode === 'model_query_error') {
          setStatusText('服务暂时不稳定');
        } else {
          setStatusText('发生错误，请重试');
        }
        break;

      default:
        break;
    }
  };

  const playWavBase64 = async (wavBase64) => {
    try {
      if (!wavBase64) {
        addSystemMessage('音频数据为空');
        return;
      }

      addSystemMessage('收到AI语音，准备播放...');

      // 直接将base64 WAV数据写入本地文件
      const wavPath = `${FileSystem.cacheDirectory}ai_response_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(wavPath, wavBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 验证文件
      const fileInfo = await FileSystem.getInfoAsync(wavPath);
      if (!fileInfo.exists || fileInfo.size < 100) {
        addSystemMessage('音频文件写入失败 (size=' + (fileInfo.size || 0) + ')');
        return;
      }

      addSystemMessage('音频文件已写入 (' + fileInfo.size + '字节)，开始播放...');

      // 设置音频模式 - 确保扬声器播放
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // 卸载之前的音频
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch (e) {}
        soundRef.current = null;
      }

      // 使用 createAsync 一次性加载并播放
      const { sound } = await Audio.Sound.createAsync(
        { uri: wavPath },
        { shouldPlay: true, volume: 1.0, progressUpdateIntervalMillis: 200 },
        (status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              addSystemMessage('语音播放完毕');
              sound.unloadAsync();
              soundRef.current = null;
              FileSystem.deleteAsync(wavPath).catch(() => {});
            }
          } else if (status.error) {
            addSystemMessage('播放状态错误: ' + status.error);
          }
        }
      );
      soundRef.current = sound;

      addSystemMessage('正在播放AI语音...');
    } catch (e) {
      addSystemMessage('语音播放失败: ' + (e.message || String(e)));
      console.log('播放错误详情:', e);
    }
  };

  const startRecording = async () => {
    if (!connected || aiSpeaking || recording || isStartingRecording) return;

    setIsStartingRecording(true);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('权限不足', '需要麦克风权限才能录音');
        return;
      }

      if (recordingRef.current) {
        try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
        recordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecording(true);
      setStatusText('正在录音，松开发送');
    } catch (e) {
      console.log('录音启动失败:', e);
      recordingRef.current = null;
      setStatusText('录音启动失败');
      addSystemMessage('录音启动失败: ' + (e.message || String(e)));
    } finally {
      setIsStartingRecording(false);
    }
  };

  const stopRecording = async () => {
    const rec = recordingRef.current;

    if (!rec) {
      if (isStartingRecording) {
        setStatusText('录音正在启动中...');
        return;
      }
      return;
    }

    if (!sessionReady) {
      try { await rec.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
      setRecording(false);
      Alert.alert('等待', '会话尚未准备好，请稍候');
      return;
    }

    try {
      setRecording(false);
      setStatusText('处理中...');
      recordingRef.current = null;

      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();

      if (!uri) {
        setStatusText('录音失败：文件为空');
        return;
      }

      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setStatusText('连接已断开');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const base64Audio = await FileSystem.readAsStringAsync(
        uri,
        { encoding: FileSystem.EncodingType.Base64 }
      );

      if (!base64Audio || base64Audio.length === 0) {
        setStatusText('录音失败：数据为空');
        return;
      }

      console.log('📤 录音文件大小:', base64Audio.length);

      setMessages(prev => [...prev, { role: 'user', content: '🎤 语音消息' }]);

      const chunkSize = 4096;
      const ts = Date.now();
      for (let i = 0; i < base64Audio.length; i += chunkSize) {
        const chunk = base64Audio.slice(i, i + chunkSize);
        wsRef.current.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: chunk,
          client_timestamp: ts,
        }));
      }

      wsRef.current.send(JSON.stringify({
        type: 'input_audio_buffer.commit',
        client_timestamp: Date.now(),
      }));

      setStatusText('音频已提交，等待 AI 回复...');
    } catch (e) {
      console.log('录音处理失败:', e);
      recordingRef.current = null;
      setRecording(false);
      setStatusText('录音处理失败');
      addSystemMessage('录音处理失败: ' + (e.message || String(e)));
    }
  };

  const sendTextMessage = () => {
    if (!connected || !wsRef.current || !textInput.trim()) return;
    if (!sessionReady) {
      addSystemMessage('会话尚未准备好');
      return;
    }

    const text = textInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setTextInput('');

    wsRef.current.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text: text }],
      },
    }));

    setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'response.create',
          response: {
            modalities: ['text', 'audio'],
          },
        }));
      }
    }, 200);

    setStatusText('等待 AI 回复...');
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, { role: 'system', content: text }]);
  };

  const renderItem = ({ item }) => {
    if (item.role === 'system') {
      return (
        <View style={s.systemMsg}>
          <Text style={s.systemMsgText}>{item.content}</Text>
        </View>
      );
    }
    if (item.role === 'user') {
      return (
        <View style={[s.userBubble, { backgroundColor: colors.primary }]}>
          <Text style={s.userText}>{item.content}</Text>
        </View>
      );
    }
    return (
      <View style={[s.aiBubble, { backgroundColor: theme.card }]}>
        <Text style={[s.aiText, { color: theme.text }]}>{item.content || '...'}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#6C5CE7" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>语音对话</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={[s.statusBar, { backgroundColor: connected ? '#52C41A20' : '#FF475720' }]}>
        <View style={[s.statusDot, { backgroundColor: connected ? '#52C41A' : '#FF4757' }]} />
        <Text style={[s.statusText, { color: connected ? '#52C41A' : '#FF4757' }]}>
          {statusText}
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {aiSpeaking && (
        <View style={s.speakingIndicator}>
          <ActivityIndicator size="small" color="#6C5CE7" />
          <Text style={s.speakingText}>AI 正在回复...</Text>
        </View>
      )}

      {connected && (
        <View style={[s.textInputArea, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
          <TextInput
            style={[s.textInput, { backgroundColor: theme.inputBg, color: theme.text }]}
            placeholder="输入文字消息（仅语音模式有效）"
            placeholderTextColor={theme.textMuted}
            value={textInput}
            onChangeText={setTextInput}
            onSubmitEditing={sendTextMessage}
            editable={!aiSpeaking}
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: '#6C5CE7' }]}
            onPress={sendTextMessage}
            disabled={!textInput.trim() || aiSpeaking}
            activeOpacity={0.8}
          >
            <Text style={s.sendBtnText}>发送</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[s.controlArea, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {!connected ? (
          <TouchableOpacity
            style={[s.connectBtn, { backgroundColor: '#6C5CE7' }]}
            onPress={connect}
            disabled={connecting}
            activeOpacity={0.8}
          >
            {connecting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.connectBtnText}>连接语音对话</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={s.controlRow}>
            <TouchableOpacity
              style={[s.textBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              onPress={sendTextMessage}
              activeOpacity={0.7}
            >
              <Text style={[s.textBtnIcon, { color: theme.text }]}>💬</Text>
              <Text style={[s.textBtnLabel, { color: theme.textMuted }]}>发文字</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.recordBtn,
                recording && s.recordBtnActive,
                { backgroundColor: recording ? '#FF4757' : '#6C5CE7' },
              ]}
              onPressIn={startRecording}
              onPressOut={stopRecording}
              disabled={aiSpeaking}
              activeOpacity={0.8}
            >
              <Text style={s.recordBtnIcon}>{recording ? '⏹' : '🎤'}</Text>
              <Text style={s.recordBtnText}>
                {recording ? '松开发送' : '按住说话'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.disconnectBtn, { backgroundColor: '#FF475720' }]}
              onPress={disconnect}
              activeOpacity={0.7}
            >
              <Text style={s.disconnectBtnIcon}>📵</Text>
              <Text style={[s.disconnectBtnLabel, { color: '#FF4757' }]}>断开</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#6C5CE7',
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },

  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '500' },

  messageList: { paddingHorizontal: 16, paddingVertical: 12, flexGrow: 1 },

  systemMsg: {
    alignSelf: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16, paddingVertical: 6,
    borderRadius: 12, marginVertical: 6,
  },
  systemMsgText: { fontSize: 12, color: '#999' },

  userBubble: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 18, borderBottomRightRadius: 6,
    marginVertical: 4, maxWidth: '80%',
  },
  userText: { color: '#fff', fontSize: 15, lineHeight: 20 },

  aiBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 18, borderBottomLeftRadius: 6,
    marginVertical: 4, maxWidth: '80%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  aiText: { fontSize: 15, lineHeight: 22 },

  speakingIndicator: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8,
  },
  speakingText: { fontSize: 13, color: '#6C5CE7', marginLeft: 8 },

  controlArea: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderTopWidth: 1,
  },
  connectBtn: {
    height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
  },
  connectBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  controlRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  textBtn: {
    width: 70, height: 70, borderRadius: 35,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  textBtnIcon: { fontSize: 22 },
  textBtnLabel: { fontSize: 11, marginTop: 2 },

  recordBtn: {
    width: 90, height: 90, borderRadius: 45,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  recordBtnActive: {
    transform: [{ scale: 1.1 }],
  },
  recordBtnIcon: { fontSize: 30, color: '#fff' },
  recordBtnText: { fontSize: 12, color: '#fff', fontWeight: '600', marginTop: 2 },

  disconnectBtn: {
    width: 70, height: 70, borderRadius: 35,
    justifyContent: 'center', alignItems: 'center',
  },
  disconnectBtnIcon: { fontSize: 22 },
  disconnectBtnLabel: { fontSize: 11, marginTop: 2 },

  textInputArea: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    marginRight: 12,
  },
  sendBtn: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
