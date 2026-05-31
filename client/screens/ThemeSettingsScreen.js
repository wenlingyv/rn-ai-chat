// ============================================================
// 【重写】主题外观设置页 — 亮/暗模式切换 + 6种主题色 + i18n
// ============================================================
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, ScrollView
} from 'react-native';
import { useTheme } from '../ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ThemeSettingsScreen({ navigation }) {
  const { paletteKey, setPaletteKey, mode, setMode, colors, theme, palettes, paletteKeys } = useTheme();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={[ss.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={colors.primary} />
      {/* 顶部导航栏 */}
      <View style={[ss.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={ss.backBtn}>
          <Text style={ss.backTxt}>{t('common.back')}</Text>
        </TouchableOpacity>
        <Text style={ss.headerTitle}>{t('theme.title')}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={ss.body}>
        {/* 亮色 / 暗色 切换 */}
        <Text style={[ss.sectionTitle, { color: theme.text }]}>{t('theme.mode')}</Text>
        <View style={ss.modeRow}>
          <TouchableOpacity
            style={[
              ss.modeBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
              mode === 'light' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setMode('light')}
            activeOpacity={0.8}
          >
            <Text style={ss.modeEmoji}>{mode === 'light' ? '☀️' : ' '}</Text>
            <Text style={[ss.modeTxt, { color: mode === 'light' ? '#fff' : theme.textSecondary }]}>{t('theme.lightMode')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              ss.modeBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
              mode === 'dark' && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setMode('dark')}
            activeOpacity={0.8}
          >
            <Text style={ss.modeEmoji}>{mode === 'dark' ? ' ' : ' '}</Text>
            <Text style={[ss.modeTxt, { color: mode === 'dark' ? '#fff' : theme.textSecondary }]}>{t('theme.darkMode')}</Text>
          </TouchableOpacity>
        </View>

        {/* 主题色选择 */}
        <Text style={[ss.sectionTitle, { color: theme.text, marginTop: 28 }]}>{t('theme.palette')}</Text>
        <View style={ss.colorGrid}>
          {paletteKeys.map(key => {
            const p = palettes[key];
            const active = key === paletteKey;
            return (
              <TouchableOpacity
                key={key}
                style={ss.colorItem}
                onPress={() => setPaletteKey(key)}
                activeOpacity={0.8}
              >
                <View style={[ss.colorCircle, { backgroundColor: p.primary }, active && ss.colorActive]}>
                  {active && <Text style={ss.colorCheck}>✓</Text>}
                </View>
                <Text style={[ss.colorLabel, { color: active ? p.primary : theme.textSecondary }]}>{t(`theme.palettes.${key}`)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 预览区 */}
        <Text style={[ss.sectionTitle, { color: theme.text, marginTop: 28 }]}>{t('theme.preview')}</Text>
        <View style={[ss.previewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[ss.previewHeader, { backgroundColor: colors.primary }]}>
            <Text style={ss.previewHeaderTxt}>{t('theme.previewTitle')}</Text>
          </View>
          <View style={ss.previewBody}>
            <View style={[ss.previewAvatar, { backgroundColor: colors.primary }]}>
              <Text style={ss.previewAvatarTxt}>{t('tabs.settings').charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[ss.previewTitle, { color: theme.text }]}>{t('theme.previewName')}</Text>
              <Text style={[ss.previewSub, { color: theme.textSecondary }]}>{t('theme.previewSub')}</Text>
            </View>
          </View>
          <View style={ss.previewBtns}>
            <View style={[ss.previewBtn, { backgroundColor: colors.primary }]}>
              <Text style={ss.previewBtnTxt}>{t('theme.previewBtn')}</Text>
            </View>
            <View style={[ss.previewBtnOutline, { borderColor: colors.primary }]}>
              <Text style={[ss.previewBtnOutlineTxt, { color: colors.primary }]}>{t('theme.previewBtnOutline')}</Text>
            </View>
          </View>
        </View>

        {/* Tab 栏预览 */}
        <Text style={[ss.sectionTitle, { color: theme.text, marginTop: 28 }]}>{t('theme.tabPreview')}</Text>
        <View style={[ss.tabPreview, { backgroundColor: theme.tabBarBg }]}>
          {[
            { icon: ' ', label: t('tabs.messages'), color: '#6C5CCE' },
            { icon: '✨', label: t('tabs.circles'), color: '#FF4757' },
            { icon: ' ', label: t('tabs.aiChat'), color: '#0984E3' },
            { icon: ' ', label: t('tabs.settings'), color: colors.primary },
          ].map((tab, i) => (
            <View key={i} style={ss.tabItem}>
              <Text style={ss.tabIcon}>{tab.icon}</Text>
              <Text style={[ss.tabLabel, { color: i === 3 ? colors.primary : theme.textMuted }]}>{tab.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ss = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  backTxt: { color: '#fff', fontSize: 16, fontWeight: '500' },
  headerTitle: { fontSize: 19, fontWeight: '700', color: '#fff' },
  body: { padding: 20, paddingBottom: 40 },

  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 14, marginLeft: 4 },

  modeRow: { flexDirection: 'row', gap: 14 },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 20, borderRadius: 16,
    borderWidth: 2,
  },
  modeEmoji: { fontSize: 30, marginBottom: 8 },
  modeTxt: { fontSize: 14, fontWeight: '600' },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorItem: { width: '30%', alignItems: 'center', marginBottom: 16 },
  colorCircle: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4,
  },
  colorActive: { shadowColor: '#000', borderWidth: 3, borderColor: '#fff' },
  colorCheck: { color: '#fff', fontSize: 22, fontWeight: '800' },
  colorLabel: { fontSize: 12, fontWeight: '600', marginTop: 6 },

  previewCard: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  previewHeader: { paddingVertical: 14, paddingHorizontal: 16 },
  previewHeaderTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  previewBody: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  previewAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  previewAvatarTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
  previewTitle: { fontSize: 16, fontWeight: '600' },
  previewSub: { fontSize: 13, marginTop: 2 },
  previewBtns: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  previewBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  previewBtnTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },
  previewBtnOutline: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  previewBtnOutlineTxt: { fontSize: 14, fontWeight: '600' },

  tabPreview: {
    flexDirection: 'row', borderRadius: 16, paddingVertical: 12,
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 6,
  },
  tabItem: { flex: 1, alignItems: 'center' },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 10, fontWeight: '700' },
});
