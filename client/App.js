import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet, Platform } from 'react-native';

import './i18n';
import { useTranslation } from 'react-i18next';

import { LanguageProvider } from './LanguageContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import { WebSocketProvider } from './WebSocketContext';

import MessagesScreen from './screens/MessagesScreen';
import CirclesScreen from './screens/CirclesScreen';
import AIChatScreen from './screens/AIChatScreen';
import SettingsScreen from './screens/SettingsScreen';
import ThemeSettingsScreen from './screens/ThemeSettingsScreen';
import LoginScreen from './screens/LoginScreen';
import ChatDetailScreen from './screens/ChatDetailScreen';
import VoiceChatScreen from './screens/VoiceChatScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({ label, emoji, focused, activeColor, inactiveColor }) {
  return (
    <View style={[styles.tabIconWrap, focused && { backgroundColor: activeColor + '18' }]}>
      <Text style={[styles.tabEmoji, focused && { transform: [{ scale: 1.1 }] }]}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color: focused ? activeColor : inactiveColor }]}>{label}</Text>
    </View>
  );
}

function MainTabs() {
  const { colors, theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          backgroundColor: theme.tabBarBg,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen name="Messages" component={MessagesScreen} options={{
        tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.messages')} emoji="💬" focused={focused} activeColor="#6C5CE7" inactiveColor={theme.textMuted} />,
      }} />

      <Tab.Screen name="Circles" component={CirclesScreen} options={{
        tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.circles')} emoji="✨" focused={focused} activeColor="#FF4757" inactiveColor={theme.textMuted} />,
      }} />

      <Tab.Screen name="AIChat" component={AIChatScreen} options={{
        tabBarIcon: ({ focused }) => <TabIcon label="智能对话" emoji="🤖" focused={focused} activeColor="#0984E3" inactiveColor={theme.textMuted} />,
      }} />

      <Tab.Screen name="Settings" component={SettingsScreen} options={{
        tabBarIcon: ({ focused }) => <TabIcon label={t('tabs.settings')} emoji="👤" focused={focused} activeColor={colors.primary} inactiveColor={theme.textMuted} />,
      }} />
    </Tab.Navigator>
  );
}

function AuthRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
          <Stack.Screen name="ChatDetail" component={ChatDetailScreen} />
          <Stack.Screen name="VoiceChat" component={VoiceChatScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <WebSocketProvider>
              <NavigationContainer>
                <AuthRouter />
              </NavigationContainer>
            </WebSocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    gap: 4,
  },
  tabEmoji: {
    fontSize: 18,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
