// API 配置 — 同源部署，直接使用相对路径
export const API_BASE = '/api';

// 根据页面协议自动选择 ws/wss，兼容 HTTPS 部署
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const WS_URL = `${WS_PROTOCOL}//${window.location.host}`;
