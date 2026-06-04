// API 配置 — 自动检测运行环境
// Web 版：使用当前域名（同源部署）
// Expo Go / 原生：使用环境变量或回退到本地地址
import { Platform } from 'react-native';

function getBaseUrl() {
  // Web 环境：API 和前端同域名，直接用相对路径
  if (Platform.OS === 'web') {
    return window.location.origin;
  }
  // 原生环境：使用环境变量，回退到本地开发地址
  return 'http://192.168.43.231:5000';
}

function getWsUrl() {
  // Web 环境：自动根据协议选择 ws/wss
  if (Platform.OS === 'web') {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}`;
  }
  // 原生环境
  return 'ws://192.168.43.231:5000';
}

export const API_BASE = `${getBaseUrl()}/api`;
export const WS_URL = getWsUrl();
