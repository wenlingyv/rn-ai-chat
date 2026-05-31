import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n';

const LanguageContext = createContext();

const LANG_KEY = '@app_language';

export function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState('zh');
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化语言
  useEffect(() => {
    initLanguage();
  }, []);

  const initLanguage = async () => {
    try {
      console.log('Initializing language...');
      const saved = await AsyncStorage.getItem(LANG_KEY);
      const lang = saved || 'zh';
      console.log('Setting initial language:', lang);
      setCurrentLanguage(lang);
      i18n.changeLanguage(lang);
      setIsLoaded(true);
    } catch (error) {
      console.error('Error initializing language:', error);
    }
  };

  const changeLanguage = async (lang) => {
    console.log('Changing language to:', lang);
    try {
      // 立即更新UI
      setCurrentLanguage(lang);

      // 保存到存储
      await AsyncStorage.setItem(LANG_KEY, lang);

      // 更新i18n
      i18n.changeLanguage(lang);
      console.log('Language changed successfully');
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  const currentLanguageText = currentLanguage === 'zh' ? '中文' : 'English';

  return {
    currentLanguage,
    changeLanguage,
    currentLanguageText,
    isLoaded,
  };
}

export function LanguageProvider({ children }) {
  return (
    <LanguageContext.Provider value={useLanguage()}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageContext;