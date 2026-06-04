// API 配置 — 自动检测运行环境
// Web 版：使用当前域名（同源部署）
// Expo Go / 原生：使用环境变量或回退到本地地址

// 用 try-catch + globalThis 确保运行时求值，避免 Metro bundler 静态分析
function getBaseUrl() {
  try {
    if (globalThis.location && globalThis.location.origin) {
      return globalThis.location.origin;
    }
  } catch (e) { /* native 环境没有 location */ }
  return 'http://192.168.43.231:5000';
}

function getWsUrl() {
  try {
    if (globalThis.location && globalThis.location.origin) {
      const proto = globalThis.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${globalThis.location.host}`;
    }
  } catch (e) { /* native 环境 */ }
  return 'ws://192.168.43.231:5000';
}

export const API_BASE = `${getBaseUrl()}/api`;
export const WS_URL = getWsUrl();
