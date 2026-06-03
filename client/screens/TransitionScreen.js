// ============================================================
// 登录过渡动画页面 — 纯 React Native Animated 实现
// 不依赖 three.js / expo-gl（Expo Go 兼容）
// 粒子爱心效果改为多圆圈缩放 + 彩色粒子 Animated 动画
// ============================================================
import React, { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, StatusBar, Animated, Dimensions,
} from 'react-native';

const { width: SW, height: SH } = Dimensions.get('window');
const PARTICLE_COUNT = 36; // 圆形排列粒子数
const ANIMATION_DURATION = 3200; // 总时长(ms)

// 爱心曲线参数方程（用于计算粒子目标位置）
function heartPoint(t, scale = 1) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x: x * scale, y: y * scale };
}

const COLOR_PALETTE = [
  '#FF477C', '#E82D9E', '#D940B3', '#C433E0', '#A62DF2',
  '#FF5997', '#FB72BF', '#E04DD9', '#7C5CFC', '#FF3366',
];

function generateParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const t = (i / PARTICLE_COUNT) * Math.PI * 2;
    const { x, y } = heartPoint(t, 7.5);
    // 随机起始位置（屏幕外散开）
    const angle = Math.random() * Math.PI * 2;
    const dist = SW * 0.6 + Math.random() * SW * 0.3;
    return {
      id: i,
      startX: Math.cos(angle) * dist,
      startY: Math.sin(angle) * dist,
      targetX: x,
      targetY: y,
      color: COLOR_PALETTE[i % COLOR_PALETTE.length],
      size: 5 + Math.random() * 4,
      delay: Math.random() * 400,
    };
  });
}

function Particle({ p, phase }) {
  // phase: 0=汇聚 1=保持呼吸 2=散开
  const anim = useRef(new Animated.Value(0)).current; // 0→1 汇聚进度
  const breathe = useRef(new Animated.Value(1)).current;
  const disperse = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 汇聚
    Animated.sequence([
      Animated.delay(p.delay),
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    // 呼吸
    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.06, duration: 600, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0.94, duration: 600, useNativeDriver: true }),
      ])
    );
    const breatheTimer = setTimeout(() => breatheLoop.start(), p.delay + 950);

    // 散开 + 消失
    const disperseTimer = setTimeout(() => {
      breatheLoop.stop();
      Animated.parallel([
        Animated.timing(disperse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]).start();
    }, ANIMATION_DURATION - 800);

    return () => {
      clearTimeout(breatheTimer);
      clearTimeout(disperseTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateX = Animated.add(
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [p.startX, p.targetX],
    }),
    disperse.interpolate({
      inputRange: [0, 1],
      outputRange: [0, p.startX * 0.8],
    })
  );

  const translateY = Animated.add(
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [p.startY, p.targetY],
    }),
    disperse.interpolate({
      inputRange: [0, 1],
      outputRange: [0, p.startY * 0.8],
    })
  );

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale: breathe },
          ],
        },
      ]}
    />
  );
}

export default function TransitionScreen({ onDone }) {
  const particles = useMemo(() => generateParticles(), []);

  // 文字动画
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.5)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1s 后显示标题
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(titleScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]).start(() => {
        Animated.timing(subtitleOpacity, { toValue: 0.75, duration: 500, useNativeDriver: true }).start();
      });
    }, 1000);

    // 淡出
    setTimeout(() => {
      Animated.timing(screenOpacity, { toValue: 0, duration: 600, useNativeDriver: true }).start();
    }, ANIMATION_DURATION - 650);

    // 完成
    const doneTimer = setTimeout(() => {
      if (onDone) onDone();
    }, ANIMATION_DURATION);

    return () => clearTimeout(doneTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0612" />

      {/* 粒子层 */}
      <View style={styles.particleWrap} pointerEvents="none">
        {particles.map(p => (
          <Particle key={p.id} p={p} />
        ))}
      </View>

      {/* 文字层 */}
      <View style={styles.textWrap} pointerEvents="none">
        <Animated.Text
          style={[styles.title, { opacity: titleOpacity, transform: [{ scale: titleScale }] }]}
        >
          MeetU
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          瞬间相遇，记录社交瞬间
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    width: SW,
    height: SH,
    backgroundColor: '#0a0612',
    zIndex: 999,
  },
  particleWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
    shadowColor: '#FF477C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 58,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 12,
    textShadowColor: 'rgba(255, 80, 120, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 28,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 5,
    marginTop: 20,
  },
});
