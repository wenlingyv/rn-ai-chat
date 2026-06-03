// 测试ffmpeg转换后的WAV是否能被智谱识别
const WebSocket = require('ws');
const fs = require('fs');
const { execFile } = require('child_process');
const path = require('path');
const os = require('os');

// 先创建一个测试WAV文件（1秒静音，24kHz，单声道，16-bit）
const sampleRate = 24000;
const numSamples = sampleRate * 1; // 1秒
const dataSize = numSamples * 2; // 16-bit = 2 bytes per sample
const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + dataSize, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // 单声道
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28); // byte rate
header.writeUInt16LE(2, 32); // block align
header.writeUInt16LE(16, 34); // bits per sample
header.write('data', 36);
header.writeUInt32LE(dataSize, 40);

const pcmData = Buffer.alloc(dataSize, 0); // 静音
const wavBuffer = Buffer.concat([header, pcmData]);
const testWavPath = path.join(os.tmpdir(), 'test_silence.wav');
fs.writeFileSync(testWavPath, wavBuffer);
console.log('测试WAV文件大小:', wavBuffer.length, '字节');

const wavBase64 = wavBuffer.toString('base64');
console.log('base64长度:', wavBase64.length);

// 连接智谱并发送WAV音频
const ws = new WebSocket('ws://127.0.0.1:5000/api/realtime/ws');

ws.on('open', () => {
  console.log('CONNECTED');
});

ws.on('message', (data, isBinary) => {
  if (isBinary) return;
  const text = data.toString();
  try {
    const msg = JSON.parse(text);
    
    if (msg.type === 'session.created') {
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          input_audio_format: 'wav',
          output_audio_format: 'pcm',
          turn_detection: null,
          modalities: ['text', 'audio'],
          voice: 'male-qn-jingying',
          instructions: '你是AI助手，请说"测试成功"',
          beta_fields: { chat_mode: 'audio', tts_source: 'e2e' }
        }
      }));
    }
    
    if (msg.type === 'session.updated') {
      console.log('SESSION UPDATED - 发送WAV音频...');
      
      // 发送WAV音频
      const chunkSize = 4096;
      for (let i = 0; i < wavBase64.length; i += chunkSize) {
        const chunk = wavBase64.slice(i, i + chunkSize);
        ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: chunk,
        }));
      }
      ws.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
      console.log('WAV音频已发送');
      
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'response.create', response: { modalities: ['text', 'audio'] } }));
        console.log('response.create 已发送');
      }, 500);
    }
    
    if (msg.type === 'response.audio.delta') {
      process.stdout.write('A');
    }
    if (msg.type === 'response.audio.wav') {
      console.log('\n🎵 收到WAV! base64长度:', msg.audio.length);
    }
    if (msg.type === 'response.text.delta') {
      process.stdout.write('T');
    }
    if (msg.type === 'response.audio_transcript.delta') {
      process.stdout.write('t');
    }
    if (msg.type === 'response.text.done') {
      console.log('\nTEXT_DONE: "' + (msg.text || '') + '"');
    }
    if (msg.type === 'response.audio_transcript.done') {
      console.log('\nTRANSCRIPT_DONE: "' + (msg.transcript || '') + '"');
    }
    if (msg.type === 'response.done') {
      console.log('\nRESPONSE_DONE');
      setTimeout(() => process.exit(0), 1000);
    }
    if (msg.type === 'error') {
      console.log('\nERROR:', JSON.stringify(msg.error));
    }
    if (msg.type === 'input_audio_buffer.committed') {
      console.log('AUDIO_COMMITTED');
    }
    if (msg.type === 'conversation.item.input_audio_transcription.completed') {
      console.log('\nINPUT_TRANSCRIPTION:', JSON.stringify(msg.transcript));
    }
  } catch (e) {}
});

ws.on('close', (code) => {
  console.log('\nCLOSED code=' + code);
});

setTimeout(() => process.exit(0), 30000);
