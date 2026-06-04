// API 配置
// Web 版部署时 EXPO_PUBLIC_API_URL 留空即可（使用相对路径，同源部署）
// 原生开发时设置 EXPO_PUBLIC_API_URL=http://192.168.43.231:5000

const _API_URL = process.env.EXPO_PUBLIC_API_URL;
const _WS_URL = process.env.EXPO_PUBLIC_WS_URL;

export const API_BASE = _API_URL ? `${_API_URL}/api` : '/api';
export const WS_URL = _WS_URL || (typeof window !== 'undefined'
  ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
  : 'ws://192.168.43.231:5000');
