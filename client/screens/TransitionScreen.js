// ============================================================
// 登录过渡动画页面 — Three.js 3D 立体爱心效果
// Web平台：使用 iframe 加载动画页面
// 原生平台：通过 WebView 加载（Expo Go 兼容）
// ============================================================
import React, { useRef, useEffect } from 'react';
import { StyleSheet, Animated, Dimensions, Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

const { width: SW, height: SH } = Dimensions.get('window');

export default function TransitionScreen({ onDone }) {
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const doneRef = useRef(false);
  const iframeRef = useRef(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const handleDone = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      if (onDoneRef.current) onDoneRef.current();
    });
  };

  useEffect(() => {
    const fallback = setTimeout(handleDone, 5000);
    return () => clearTimeout(fallback);
  }, []);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data === 'transition-done') {
        handleDone();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const onMessage = (e) => {
    if (e.nativeEvent.data === 'done') handleDone();
  };

  const THREE_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0}
body{background:#0a0612;overflow:hidden;touch-action:none}
canvas{display:block;position:absolute;top:0;left:0}
#overlay{
  position:absolute;top:0;left:0;right:0;bottom:0;
  display:flex;flex-direction:column;justify-content:center;align-items:center;
  pointer-events:none;z-index:10;padding-bottom:35%
}
#title{
  font-size:52px;font-weight:800;color:#fff;letter-spacing:10px;
  text-shadow:0 0 30px rgba(255,80,120,0.7),0 0 60px rgba(255,80,120,0.3);
  opacity:0;transform:scale(0.5);
  transition:opacity .8s cubic-bezier(.34,1.56,.64,1),transform .8s cubic-bezier(.34,1.56,.64,1)
}
#title.show{opacity:1;transform:scale(1)}
#subtitle{
  font-size:12px;color:rgba(255,255,255,.65);letter-spacing:4px;margin-top:16px;
  opacity:0;transition:opacity .6s ease .1s
}
#subtitle.show{opacity:1}
</style>
</head>
<body>
<div id="overlay">
  <div id="title">MeetU</div>
  <div id="subtitle">瞬间相遇，记录社交瞬间</div>
</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js"></script>
<script>if(typeof THREE==='undefined'){document.write('<script src="https://unpkg.com/three@0.128.0/build/three.min.js"><\\/script>')}</script>
<script>
(function(){
  var W=window.innerWidth, H=window.innerHeight;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, W/H, 0.1, 500);
  camera.position.set(0, 1, 28);
  camera.lookAt(0, 1, 0);
  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x0a0612, 1);
  document.body.insertBefore(renderer.domElement, document.body.firstChild);

  var hs = new THREE.Shape();
  hs.moveTo(5, 5);
  hs.bezierCurveTo(5, 5, 4, 0, 0, 0);
  hs.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  hs.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  hs.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  hs.bezierCurveTo(16, 7, 16, 0, 10, 0);
  hs.bezierCurveTo(7, 0, 5, 5, 5, 5);

  var extConf = { depth: 4, bevelEnabled: true, bevelSegments: 8, steps: 2, bevelSize: 1.2, bevelThickness: 1.2 };
  var heartGeo = new THREE.ExtrudeGeometry(hs, extConf);
  heartGeo.center();

  var heartMat = new THREE.MeshPhongMaterial({ color: 0xFF477C, emissive: 0xFF1744, emissiveIntensity: 0.15, shininess: 100, specular: 0xFFFFFF, side: THREE.DoubleSide });
  var heart = new THREE.Mesh(heartGeo, heartMat);
  heart.scale.set(0.001, 0.001, 0.001);
  heart.rotation.z = Math.PI;
  scene.add(heart);

  var glowMat = new THREE.MeshBasicMaterial({ color: 0xFF477C, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
  var glowHeart = new THREE.Mesh(heartGeo, glowMat);
  glowHeart.scale.set(0.001, 0.001, 0.001);
  glowHeart.rotation.z = Math.PI;
  scene.add(glowHeart);

  var wireMat = new THREE.MeshBasicMaterial({ color: 0xFF6B9D, wireframe: true, transparent: true, opacity: 0.05 });
  var wireHeart = new THREE.Mesh(heartGeo, wireMat);
  wireHeart.scale.set(0.001, 0.001, 0.001);
  wireHeart.rotation.z = Math.PI;
  scene.add(wireHeart);

  scene.add(new THREE.AmbientLight(0x404040, 0.6));
  var l1 = new THREE.PointLight(0xFF477C, 2.5, 60); l1.position.set(12, 12, 12); scene.add(l1);
  var l2 = new THREE.PointLight(0x7C5CFC, 1.8, 60); l2.position.set(-12, -6, 12); scene.add(l2);
  var l3 = new THREE.PointLight(0xFF6B9D, 1.2, 60); l3.position.set(0, 12, -12); scene.add(l3);

  var pCount = 2000;
  var pGeo = new THREE.BufferGeometry();
  var pPos = new Float32Array(pCount * 3);
  var pCol = new Float32Array(pCount * 3);
  for (var i = 0; i < pCount; i++) {
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    var r = 7 + Math.random() * 15;
    pPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    pPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) + 1;
    pPos[i*3+2] = r * Math.cos(phi);
    var mix = Math.random();
    pCol[i*3] = 1.0; pCol[i*3+1] = 0.28 + mix * 0.25; pCol[i*3+2] = 0.49 + mix * 0.5;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));

  var pMat = new THREE.PointsMaterial({ size: 0.1, transparent: true, opacity: 0.65, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  var particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  var startTime = Date.now();
  var growDur = 1400;
  var totalDur = 3500;
  var targetScale = 0.5;

  function easeOutElastic(t) {
    return t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  }

  function animate() {
    requestAnimationFrame(animate);
    var elapsed = Date.now() - startTime;
    var t = elapsed * 0.001;
    var s = elapsed < growDur ? easeOutElastic(elapsed / growDur) * targetScale : targetScale + Math.sin(t * 2.5) * 0.015;
    s = Math.max(0.001, s);

    heart.scale.set(s, s, s);
    heart.rotation.y += 0.006;

    var gs = s * 1.15;
    glowHeart.scale.set(gs, gs, gs);
    glowHeart.rotation.y = heart.rotation.y;

    wireHeart.scale.set(s * 1.01, s * 1.01, s * 1.01);
    wireHeart.rotation.y = heart.rotation.y;

    particles.rotation.y -= 0.002;
    particles.rotation.x += 0.0005;

    renderer.render(scene, camera);

    if (elapsed >= totalDur) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage('done');
      } else if (window.parent && window.parent.postMessage) {
        window.parent.postMessage('transition-done', '*');
      }
    }
  }

  animate();
  setTimeout(function(){ document.getElementById('title').classList.add('show'); }, 1000);
  setTimeout(function(){ document.getElementById('subtitle').classList.add('show'); }, 1700);
  window.addEventListener('resize', function(){ W = window.innerWidth; H = window.innerHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H); });
})();
</script>
</body>
</html>
`;

  if (Platform.OS === 'web') {
    return (
      <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
        <iframe
          srcDoc={THREE_HTML}
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-scripts allow-same-origin"
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <WebView
        source={{ html: THREE_HTML }}
        style={styles.webview}
        onMessage={onMessage}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
      />
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
  webview: {
    flex: 1,
    backgroundColor: '#0a0612',
  },
});
