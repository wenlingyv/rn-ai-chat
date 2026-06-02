import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, StatusBar, Platform, Animated } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';

// 粒子数量
const PARTICLE_COUNT = 1200;
// 爱心缩放系数
const HEART_SCALE = 0.05;
// 动画总时长（毫秒）
const ANIMATION_DURATION = 6000;

// 爱心曲线参数方程
// 参数 t 从 0 到 2π 生成爱心形状
function heartX(t) {
  return 16 * Math.pow(Math.sin(t), 3);
}

function heartY(t) {
  return -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
}

/**
 * 创建粒子数据
 * 生成粒子的初始位置、目标位置（爱心形状）、颜色等数据
 */
function createParticles() {
  // 粒子位置数组
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  // 粒子颜色数组
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  // 粒子目标位置（爱心形状）
  const targets = new Float32Array(PARTICLE_COUNT * 3);
  // 粒子初始位置
  const startPositions = new Float32Array(PARTICLE_COUNT * 3);
  
  // 粉紫色调色板，适合社交类应用的浪漫风格
  const colorPalette = [
    [1.0, 0.28, 0.52],   // 亮粉色
    [0.92, 0.18, 0.62],  // 玫红色
    [0.85, 0.25, 0.70],  // 紫粉色
    [0.75, 0.20, 0.88],  // 紫罗兰
    [0.65, 0.18, 0.95],  // 深紫色
    [1.0, 0.35, 0.60],   // 浅粉色
    [0.98, 0.45, 0.75],  // 桃粉色
    [0.88, 0.30, 0.85],  // 粉紫色
  ];

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // 根据粒子索引计算爱心曲线上的位置
    const t = (i / PARTICLE_COUNT) * Math.PI * 2;
    let hx = heartX(t) * HEART_SCALE;
    let hy = heartY(t) * HEART_SCALE;
    
    // 70% 的粒子填充到爱心内部，使爱心形状更饱满
    const fillRatio = Math.random();
    if (fillRatio < 0.7) {
      const r = Math.pow(Math.random(), 0.55);
      hx *= r;
      hy *= r;
    }

    // 设置粒子目标位置（爱心形状）
    targets[i * 3] = hx;
    targets[i * 3 + 1] = hy;
    targets[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

    // 设置粒子初始位置（随机分布在屏幕周围）
    const sx = (Math.random() - 0.5) * 3;
    const sy = (Math.random() - 0.5) * 3;
    const sz = (Math.random() - 0.5) * 2;
    positions[i * 3] = sx;
    positions[i * 3 + 1] = sy;
    positions[i * 3 + 2] = sz;
    startPositions[i * 3] = sx;
    startPositions[i * 3 + 1] = sy;
    startPositions[i * 3 + 2] = sz;

    // 随机选择颜色
    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i * 3] = color[0];
    colors[i * 3 + 1] = color[1];
    colors[i * 3 + 2] = color[2];
  }

  return { positions, colors, targets, startPositions };
}

/**
 * 登录过渡动画组件
 * 使用 Three.js + expo-gl 实现 3D 爱心粒子动画效果
 * 动画流程：粒子从四周汇聚成爱心 → 爱心保持并轻微呼吸 → 粒子散开消失
 * 动画结束后自动跳转到主页
 */
export default function TransitionScreen({ onDone }) {
  // GLView 引用
  const glViewRef = useRef(null);
  // 动画帧引用
  const animationRef = useRef(null);
  // 文字淡入动画
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.5)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  // 淡出动画
  const fadeOutOpacity = useRef(new Animated.Value(1)).current;

  /**
   * 动画时间控制
   * 1.5秒时文字淡入，4.5秒时开始淡出，6秒时完成并跳转
   */
  useEffect(() => {
    // 1.5秒后显示文字
    const textTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(textScale, {
          toValue: 1,
          duration: 800,
          easing: (t) => t * t * (3 - 2 * t), // easeOutCubic
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 主标题显示后，延迟0.4秒显示副标题
        Animated.timing(subtitleOpacity, {
          toValue: 0.7,
          duration: 600,
          useNativeDriver: true,
        }).start();
      });
    }, 1500);

    // 4.5秒后开始淡出
    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeOutOpacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 4500);

    // 6秒后完成动画，跳转到主页
    const doneTimer = setTimeout(() => {
      if (onDone) onDone();
    }, ANIMATION_DURATION);

    // 清理定时器
    return () => {
      clearTimeout(textTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone, textOpacity, textScale, subtitleOpacity, fadeOutOpacity]);

  /**
   * 清理动画帧
   */
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  /**
   * GLContext 创建回调
   * 初始化 Three.js 场景、相机、渲染器和粒子系统
   */
  const onContextCreate = async (gl) => {
    // 创建粒子数据
    const { positions, colors, targets, startPositions } = createParticles();

    // 创建 Three.js 场景
    const scene = new THREE.Scene();
    // 设置深色背景，突出粒子效果
    scene.background = new THREE.Color(0x0a0612);

    // 创建透视相机
    const camera = new THREE.PerspectiveCamera(
      60,                              // 视角
      gl.drawingBufferWidth / gl.drawingBufferHeight, // 宽高比
      0.1,                             // 近裁剪面
      100                              // 远裁剪面
    );
    camera.position.z = 5; // 设置相机位置

    // 创建 WebGL 渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      alpha: true,           // 启用透明
      antialias: Platform.OS === 'ios', // iOS 启用抗锯齿，Android 关闭以提升性能
    });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    // 根据平台设置像素比，避免性能问题
    renderer.setPixelRatio(Math.min(Platform.OS === 'ios' ? 2 : 1.5, 2));

    // 创建粒子几何体
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // 创建粒子材质
    const material = new THREE.PointsMaterial({
      size: 0.028,           // 粒子大小
      vertexColors: true,     // 使用顶点颜色
      transparent: true,      // 启用透明
      opacity: 1,            // 初始透明度
      blending: THREE.AdditiveBlending, // 叠加混合模式，产生发光效果
      depthWrite: false,     // 关闭深度写入，优化透明度效果
      sizeAttenuation: true, // 开启透视衰减
    });

    // 创建粒子系统
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // 记录动画开始时间
    const startTime = Date.now();
    
    // 动画阶段划分
    const PHASE1 = 2000;  // 汇聚阶段：2秒
    const PHASE2 = 2500;  // 保持阶段：2.5秒
    const PHASE3 = 1500;  // 散开阶段：1.5秒
    const TOTAL = ANIMATION_DURATION;

    /**
     * 动画循环函数
     * 实现三阶段动画：汇聚 → 保持 → 散开
     */
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const posArray = geometry.attributes.position.array;

      // 阶段1：粒子从四周汇聚成爱心形状
      if (elapsed < PHASE1) {
        // 使用 easeOutCubic 缓动函数，使汇聚更自然
        const progress = 1 - Math.pow(1 - elapsed / PHASE1, 3);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          posArray[i * 3] = startPositions[i * 3] + (targets[i * 3] - startPositions[i * 3]) * progress;
          posArray[i * 3 + 1] = startPositions[i * 3 + 1] + (targets[i * 3 + 1] - startPositions[i * 3 + 1]) * progress;
          posArray[i * 3 + 2] = startPositions[i * 3 + 2] + (targets[i * 3 + 2] - startPositions[i * 3 + 2]) * progress;
        }
        // 粒子渐入效果
        material.opacity = Math.min(1, elapsed / 500);
      }
      // 阶段2：爱心保持并轻微呼吸抖动
      else if (elapsed < PHASE1 + PHASE2) {
        const holdTime = (elapsed - PHASE1) / PHASE2;
        // 呼吸效果：轻微缩放
        const breatheScale = 1 + Math.sin(holdTime * Math.PI * 4) * 0.03;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          // 每个粒子有微小的独立抖动
          const angle = i * 0.01 + holdTime * Math.PI * 2;
          posArray[i * 3] = targets[i * 3] * breatheScale + Math.sin(angle) * 0.02;
          posArray[i * 3 + 1] = targets[i * 3 + 1] * breatheScale + Math.cos(angle * 1.2) * 0.02;
          posArray[i * 3 + 2] = targets[i * 3 + 2] + Math.sin(angle * 0.8) * 0.015;
        }
        material.opacity = 1;
      }
      // 阶段3：粒子向四周散开并消失
      else if (elapsed < TOTAL) {
        // 使用 easeInOutCubic 缓动函数
        const disperseTime = Math.pow((elapsed - PHASE1 - PHASE2) / PHASE3, 1.5);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
          const distance = disperseTime * 3;
          posArray[i * 3] = targets[i * 3] + Math.cos(angle) * distance;
          posArray[i * 3 + 1] = targets[i * 3 + 1] + Math.sin(angle) * distance;
          posArray[i * 3 + 2] = targets[i * 3 + 2] + (Math.random() - 0.5) * disperseTime;
        }
        // 粒子淡出效果
        material.opacity = 1 - disperseTime;
      }
      // 动画结束
      else {
        material.opacity = 0;
        gl.endFrameEXP();
        return;
      }

      // 标记位置属性需要更新
      geometry.attributes.position.needsUpdate = true;
      // 爱心缓慢旋转
      points.rotation.z += 0.001;

      // 渲染场景
      renderer.render(scene, camera);
      gl.endFrameEXP();

      // 请求下一帧
      animationRef.current = requestAnimationFrame(animate);
    };

    // 启动动画
    animate();
  };

  return (
    <View style={styles.container}>
      {/* 状态栏 */}
      <StatusBar barStyle="light-content" backgroundColor="#0a0612" />
      
      {/* Three.js 3D 渲染视图 */}
      <GLView
        ref={glViewRef}
        onContextCreate={onContextCreate}
        style={styles.glView}
      />

      {/* 文字覆盖层 */}
      <Animated.View 
        style={[styles.overlay, { opacity: fadeOutOpacity }]}
      >
        {/* 主标题：MeetU */}
        <Animated.Text
          style={[
            styles.title,
            {
              opacity: textOpacity,
              transform: [{ scale: textScale }],
            },
          ]}
        >
          MeetU
        </Animated.Text>
        {/* 副标题 */}
        <Animated.Text
          style={[
            styles.subtitle,
            {
              opacity: subtitleOpacity,
              transform: [{ translateY: subtitleOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              })}],
            },
          ]}
        >
          瞬间相遇，记录社交瞬间
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

/**
 * 样式定义
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0612',
    position: 'relative',
    overflow: 'hidden',
  },
  glView: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    fontSize: 58,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 12,
    textShadowColor: 'rgba(255, 80, 120, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 5,
    marginTop: 20,
  },
});
