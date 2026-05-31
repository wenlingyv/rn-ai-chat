// ============================================================
// 【新增】全局主题上下文 — 管理亮/暗模式 + 6种主题色
// 使用 React Context + AsyncStorage 持久化
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// 6种主题色方案
const PALETTES = {
  teal:    { name: '青绿', primary: '#13C2C2', gradient: ['#13C2C2', '#0FADAD'], accent: '#E6FFFB' },
  purple:  { name: '梦幻紫', primary: '#7C5CFC', gradient: ['#7C5CFC', '#6B4CFA'], accent: '#F3F0FF' },
  pink:    { name: '活力粉', primary: '#FF4D6A', gradient: ['#FF4D6A', '#E8425C'], accent: '#FFF0F3' },
  blue:    { name: '天空蓝', primary: '#0984E3', gradient: ['#0984E3', '#0876CC'], accent: '#EAF6FF' },
  orange:  { name: '阳光橙', primary: '#FFA940', gradient: ['#FFA940', '#E89836'], accent: '#FFF8F0' },
  green:   { name: '清新绿', primary: '#52C41A', gradient: ['#52C41A', '#49AE17'], accent: '#F6FFED' },
};

// 亮色 / 暗色模式定义
const MODES = {
  light: {
    bg:           '#F5F3FF',
    card:         '#FFFFFF',
    cardAlt:      '#FAFAFA',
    text:         '#222222',
    textSecondary:'#888888',
    textMuted:    '#AAAAAA',
    border:       '#F0F0F0',
    separator:    '#F5F5F5',
    overlay:      'rgba(0,0,0,0.4)',
    statusBar:    'dark-content',
    tabBarBg:     '#FFFFFF',
    tabBarShadow: 'rgba(0,0,0,0.06)',
    inputBg:      '#F5F3FF',
  },
  dark: {
    bg:           '#111111',
    card:         '#1E1E1E',
    cardAlt:      '#252525',
    text:         '#EEEEEE',
    textSecondary:'#999999',
    textMuted:    '#666666',
    border:       '#2A2A2A',
    separator:    '#222222',
    overlay:      'rgba(0,0,0,0.6)',
    statusBar:    'light-content',
    tabBarBg:     '#1A1A1A',
    tabBarShadow: 'rgba(0,0,0,0.3)',
    inputBg:      '#2A2A2A',
  },
};

const STORAGE_KEY = '@theme_settings';
const PALETTE_KEYS = Object.keys(PALETTES);

export function ThemeProvider({ children }) {
  const [paletteKey, setPaletteKey] = useState('teal');
  const [mode, setMode] = useState('light');

  // 启动时从本地读取主题配置
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(json => {
      if (json) {
        try {
          const saved = JSON.parse(json);
          if (saved.palette && PALETTES[saved.palette]) setPaletteKey(saved.palette);
          if (saved.mode && MODES[saved.mode]) setMode(saved.mode);
        } catch {}
      }
    });
  }, []);

  // 主题变更时写入本地
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ palette: paletteKey, mode }));
  }, [paletteKey, mode]);

  const value = {
    paletteKey,
    setPaletteKey,
    mode,
    setMode,
    colors: PALETTES[paletteKey],
    theme: MODES[mode],
    palettes: PALETTES,
    paletteKeys: PALETTE_KEYS,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
