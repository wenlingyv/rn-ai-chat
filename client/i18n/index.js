// ============================================================
// i18next 配置 — 中/英双语，AsyncStorage 持久化
// ============================================================
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './zh';
import en from './en';

// 简单的i18n初始化，不再使用languageDetector
i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    fallbackLng: 'zh',
    lng: 'zh', // 默认语言
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
