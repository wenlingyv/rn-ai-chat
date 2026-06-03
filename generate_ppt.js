"use strict";
const pptxgen = require("pptxgenjs");

// ─── Color Palette ───────────────────────────────────────────────────────────
const C = {
  bgDark:   "0F172A",  // 深蓝黑 — 封面/结尾
  bgMid:    "1E293B",  // 中深蓝 — 章节页
  bgLight:  "F8FAFC",  // 极浅灰 — 内容页
  bgCard:   "FFFFFF",  // 纯白   — 卡片
  accent:   "06B6D4",  // 青色   — 主强调
  accent2:  "8B5CF6",  // 紫色   — 副强调
  accent3:  "10B981",  // 绿色   — 成功/代码
  warn:     "F59E0B",  // 金色   — 高亮
  text:     "1E293B",  // 深色文字
  textMid:  "475569",  // 中灰文字
  textLight:"94A3B8",  // 浅灰文字
  white:    "FFFFFF",
  border:   "E2E8F0",  // 浅边框
};

// ─── Helper: shadow factory ───────────────────────────────────────────────────
const mkShadow = () => ({ type: "outer", color: "000000", blur: 8, offset: 3, angle: 135, opacity: 0.12 });
const mkShadowSm = () => ({ type: "outer", color: "000000", blur: 4, offset: 2, angle: 135, opacity: 0.08 });

// ─── Helper: draw slide header bar ───────────────────────────────────────────
function addHeader(slide, title, subtitle) {
  // top accent bar
  slide.addShape("rect", { x: 0, y: 0, w: 10, h: 0.08, fill: { color: C.accent }, line: { color: C.accent } });
  // title
  slide.addText(title, {
    x: 0.5, y: 0.15, w: 9, h: 0.6, margin: 0,
    fontSize: 26, bold: true, color: C.text, fontFace: "Calibri"
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.75, w: 9, h: 0.35, margin: 0,
      fontSize: 13, color: C.textMid, fontFace: "Calibri"
    });
  }
  // divider
  slide.addShape("line", { x: 0.5, y: 1.1, w: 9, h: 0, line: { color: C.border, width: 1 } });
}

// ─── Helper: code block ───────────────────────────────────────────────────────
function addCodeBlock(slide, code, x, y, w, h) {
  slide.addShape("rect", { x, y, w, h, fill: { color: "0F172A" }, line: { color: "334155", width: 1 }, shadow: mkShadow() });
  // top bar
  slide.addShape("rect", { x, y, w, h: 0.22, fill: { color: "1E293B" }, line: { color: "1E293B" } });
  // traffic lights
  ["FF5F57", "FEBC2E", "28C840"].forEach((c, i) => {
    slide.addShape("oval", { x: x + 0.12 + i * 0.2, y: y + 0.06, w: 0.1, h: 0.1, fill: { color: c }, line: { color: c } });
  });
  slide.addText(code, {
    x: x + 0.18, y: y + 0.28, w: w - 0.28, h: h - 0.35,
    margin: 0, fontSize: 9, fontFace: "Consolas", color: "CBD5E1",
    valign: "top", wrap: true
  });
}

// ─── Helper: tag chip ────────────────────────────────────────────────────────
function addTag(slide, text, x, y, bgColor) {
  const w = text.length * 0.1 + 0.3;
  slide.addShape("rect", { x, y, w, h: 0.28, fill: { color: bgColor }, line: { color: bgColor }, rectRadius: 0.04 });
  slide.addText(text, { x, y, w, h: 0.28, margin: 0, fontSize: 9, color: C.white, bold: true, align: "center", fontFace: "Calibri" });
  return w + 0.12;
}

// ─── Helper: section divider slide ───────────────────────────────────────────
function addSectionSlide(pres, num, title, desc) {
  const sl = pres.addSlide();
  sl.background = { color: C.bgMid };
  // decorative circle
  sl.addShape("oval", { x: 7.5, y: -0.8, w: 4, h: 4, fill: { color: C.accent, transparency: 88 }, line: { color: C.accent, transparency: 88 } });
  sl.addShape("oval", { x: -1, y: 3, w: 3, h: 3, fill: { color: C.accent2, transparency: 88 }, line: { color: C.accent2, transparency: 88 } });
  // num
  sl.addText(`0${num}`, { x: 0.7, y: 1.2, w: 2, h: 1.2, margin: 0, fontSize: 72, bold: true, color: C.accent, fontFace: "Arial Black", transparency: 60 });
  sl.addShape("line", { x: 0.7, y: 2.5, w: 1.5, h: 0, line: { color: C.accent, width: 3 } });
  sl.addText(title, { x: 0.7, y: 2.7, w: 8.5, h: 1, margin: 0, fontSize: 36, bold: true, color: C.white, fontFace: "Calibri" });
  sl.addText(desc, { x: 0.7, y: 3.75, w: 7, h: 0.7, margin: 0, fontSize: 16, color: "94A3B8", fontFace: "Calibri" });
  return sl;
}

// ─── Helper: icon circle ─────────────────────────────────────────────────────
function addIconCircle(slide, emoji, x, y, bg) {
  slide.addShape("oval", { x, y, w: 0.5, h: 0.5, fill: { color: bg }, line: { color: bg } });
  slide.addText(emoji, { x, y, w: 0.5, h: 0.5, margin: 0, fontSize: 18, align: "center", valign: "middle" });
}

// ─── Helper: stat card ───────────────────────────────────────────────────────
function addStatCard(slide, num, label, icon, x, y) {
  slide.addShape("rect", { x, y, w: 2.1, h: 1.1, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadowSm() });
  slide.addText(icon, { x, y: y + 0.08, w: 2.1, h: 0.4, margin: 0, fontSize: 20, align: "center" });
  slide.addText(num, { x, y: y + 0.4, w: 2.1, h: 0.38, margin: 0, fontSize: 22, bold: true, color: C.accent, align: "center", fontFace: "Arial Black" });
  slide.addText(label, { x, y: y + 0.78, w: 2.1, h: 0.25, margin: 0, fontSize: 9, color: C.textMid, align: "center", fontFace: "Calibri" });
}

// ─── Helper: flow step ───────────────────────────────────────────────────────
function addFlowStep(slide, n, title, desc, x, y, w, accent) {
  slide.addShape("rect", { x, y, w, h: 0.85, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadowSm() });
  slide.addShape("rect", { x, y, w: 0.06, h: 0.85, fill: { color: accent }, line: { color: accent } });
  slide.addShape("oval", { x: x + 0.14, y: y + 0.17, w: 0.42, h: 0.42, fill: { color: accent }, line: { color: accent } });
  slide.addText(String(n), { x: x + 0.14, y: y + 0.17, w: 0.42, h: 0.42, margin: 0, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle" });
  slide.addText(title, { x: x + 0.64, y: y + 0.08, w: w - 0.74, h: 0.32, margin: 0, fontSize: 12, bold: true, color: C.text, fontFace: "Calibri" });
  slide.addText(desc, { x: x + 0.64, y: y + 0.42, w: w - 0.74, h: 0.36, margin: 0, fontSize: 9.5, color: C.textMid, fontFace: "Calibri" });
}

// =============================================================================
//  GENERATE PPT
// =============================================================================
async function main() {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";
  pres.author  = "AI生成";
  pres.title   = "MeetU AI社交应用 · 项目答辩";

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 1 — 封面
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgDark };
    // bg glow circles
    sl.addShape("oval", { x: 6.5, y: -1.5, w: 6, h: 6, fill: { color: C.accent, transparency: 92 }, line: { color: C.accent, transparency: 92 } });
    sl.addShape("oval", { x: -2, y: 2, w: 5, h: 5, fill: { color: C.accent2, transparency: 92 }, line: { color: C.accent2, transparency: 92 } });
    // app icon placeholder
    sl.addShape("rect", { x: 0.7, y: 0.6, w: 0.6, h: 0.6, fill: { color: C.accent }, line: { color: C.accent } });
    sl.addText("M", { x: 0.7, y: 0.6, w: 0.6, h: 0.6, margin: 0, fontSize: 24, bold: true, color: C.white, align: "center", valign: "middle", fontFace: "Arial Black" });
    // title
    sl.addText("MeetU", { x: 1.5, y: 0.6, w: 6, h: 0.7, margin: 0, fontSize: 48, bold: true, color: C.white, fontFace: "Arial Black" });
    sl.addText("AI 智能社交应用", { x: 1.5, y: 1.4, w: 7, h: 0.55, margin: 0, fontSize: 22, color: C.accent, fontFace: "Calibri" });
    // divider
    sl.addShape("line", { x: 0.7, y: 2.1, w: 5, h: 0, line: { color: C.accent, width: 2 } });
    // subtitle
    sl.addText("React Native · Node.js · PostgreSQL · WebSocket · AI多模态", {
      x: 0.7, y: 2.3, w: 8.5, h: 0.45, margin: 0, fontSize: 14, color: "94A3B8", fontFace: "Calibri"
    });
    // tags row
    let tagX = 0.7;
    [["React Native", C.accent], ["Node.js Express", "10B981"], ["JWT认证", C.accent2],
     ["WebSocket", "F59E0B"], ["RAG知识库", "EF4444"], ["GLM Realtime", "06B6D4"]
    ].forEach(([t, bg]) => { tagX += addTag(sl, t, tagX, 2.95, bg); });
    // stats row
    [[">15", "核心功能模块", "⚡"], ["4", "AI能力集成", "🤖"], ["12", "主题配色方案", "🎨"], ["5", "人格角色系统", "👥"]].forEach(([n, l, ic], i) => {
      addStatCard(sl, n, l, ic, 0.7 + i * 2.2, 3.55);
    });
    // footer
    sl.addText("2026  ·  项目答辩", { x: 0, y: 5.25, w: 10, h: 0.375, margin: 0, fontSize: 11, color: "475569", align: "center", fontFace: "Calibri" });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 2 — 目录
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "目录 Contents", "本次答辩共 8 个章节 · 覆盖系统架构 → 核心功能 → 安全体系 → 项目亮点");
    const items = [
      ["01", "系统架构总览", "技术栈全景 · 前后端分层"],
      ["02", "数据库设计",   "ER图 · 表结构 · 触发器"],
      ["03", "认证安全系统", "JWT双Token · 三层限流 · 会话管理"],
      ["04", "AI对话系统",   "多角色 · RAG · 多模态 · 深度思考"],
      ["05", "实时通信系统", "WebSocket · 心跳保活 · 消息路由"],
      ["06", "语音对话系统", "GLM-Realtime · ffmpeg · 双向流"],
      ["07", "前端架构",     "Context嵌套 · 导航守卫 · 主题国际化"],
      ["08", "项目亮点总结", "技术亮点 · 创新点 · 展望"],
    ];
    items.forEach(([num, title, desc], i) => {
      const col = i < 4 ? 0 : 1;
      const row = i % 4;
      const x = col === 0 ? 0.5 : 5.3;
      const y = 1.3 + row * 1.05;
      sl.addShape("rect", { x, y, w: 4.6, h: 0.85, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadowSm() });
      sl.addText(num, { x: x + 0.12, y, w: 0.5, h: 0.85, margin: 0, fontSize: 18, bold: true, color: col === 0 ? C.accent : C.accent2, fontFace: "Arial Black", valign: "middle" });
      sl.addShape("line", { x: x + 0.62, y: y + 0.18, w: 0, h: 0.49, line: { color: C.border, width: 1 } });
      sl.addText(title, { x: x + 0.78, y: y + 0.08, w: 3.6, h: 0.32, margin: 0, fontSize: 13, bold: true, color: C.text, fontFace: "Calibri" });
      sl.addText(desc,  { x: x + 0.78, y: y + 0.44, w: 3.6, h: 0.32, margin: 0, fontSize: 10, color: C.textMid, fontFace: "Calibri" });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 1
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 1, "系统架构总览", "技术栈全景 · 前后端分层架构设计");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 3 — 技术栈全景
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "技术栈全景", "前端 · 后端 · 数据存储 · AI服务");

    // 4 columns: 前端 / 后端 / 数据层 / AI服务
    const cols = [
      { title: "📱 前端 Frontend", color: C.accent, items: ["React Native 0.76", "Expo SDK 52", "React Navigation 6", "WebSocket Client", "i18next 国际化", "AsyncStorage", "Three.js 粒子动画", "expo-av 音频"] },
      { title: "⚙️ 后端 Backend",  color: C.accent2, items: ["Node.js + Express", "WebSocket (ws库)", "JWT双Token认证", "bcrypt密码哈希", "multer 文件上传", "三层速率限流", "RESTful API设计", "中间件鉴权"] },
      { title: "🗄️ 数据存储",      color: "10B981", items: ["PostgreSQL 主库", "连接池 (pg pool)", "触发器自动统计", "向量存储(本地)", "JSONB元数据列", "事务安全操作", "索引优化", "异步持久化"] },
      { title: "🤖 AI服务",        color: "F59E0B", items: ["DeepSeek API", "智谱GLM-Realtime", "LangChain RAG", "文本向量化", "Tavily网络搜索", "多模态Base64", "Stream流式输出", "深度思考模式"] },
    ];
    cols.forEach(({ title, color, items }, ci) => {
      const x = 0.35 + ci * 2.38;
      const y = 1.25;
      sl.addShape("rect", { x, y, w: 2.22, h: 4.05, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadowSm() });
      sl.addShape("rect", { x, y, w: 2.22, h: 0.36, fill: { color }, line: { color } });
      sl.addText(title, { x: x + 0.08, y, w: 2.1, h: 0.36, margin: 0, fontSize: 10.5, bold: true, color: C.white, valign: "middle", fontFace: "Calibri" });
      items.forEach((item, ii) => {
        sl.addShape("rect", { x: x + 0.12, y: y + 0.48 + ii * 0.41, w: 0.06, h: 0.2, fill: { color }, line: { color } });
        sl.addText(item, { x: x + 0.26, y: y + 0.44 + ii * 0.41, w: 1.9, h: 0.36, margin: 0, fontSize: 10, color: C.text, valign: "middle", fontFace: "Calibri" });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 4 — 系统架构图
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "前后端架构图", "分层架构 · 关注点分离 · 模块化设计");

    // ── 前端层 ──
    sl.addShape("rect", { x: 0.4, y: 1.25, w: 2.9, h: 3.9, fill: { color: "EFF6FF" }, line: { color: "BFDBFE", width: 1 } });
    sl.addText("📱 前端层 (React Native)", { x: 0.4, y: 1.25, w: 2.9, h: 0.36, margin: 4, fontSize: 10.5, bold: true, color: "1D4ED8", fontFace: "Calibri" });
    [["LoginScreen", "登录/注册页"], ["AIChatScreen", "AI多角色对话"], ["VoiceChatScreen", "实时语音对话"], ["ChatDetailScreen", "即时通讯"], ["CirclesScreen", "圈子+地图"], ["SettingsScreen", "设置/主题"]].forEach(([name, desc], i) => {
      sl.addShape("rect", { x: 0.55, y: 1.72 + i * 0.54, w: 2.6, h: 0.46, fill: { color: C.bgCard }, line: { color: "BFDBFE", width: 1 }, shadow: mkShadowSm() });
      sl.addText(name, { x: 0.62, y: 1.72 + i * 0.54, w: 2.46, h: 0.24, margin: 0, fontSize: 10, bold: true, color: "1D4ED8", fontFace: "Consolas" });
      sl.addText(desc, { x: 0.62, y: 1.97 + i * 0.54, w: 2.46, h: 0.2, margin: 0, fontSize: 8.5, color: C.textMid, fontFace: "Calibri" });
    });

    // ── 箭头 ──
    sl.addShape("line", { x: 3.3, y: 3.2, w: 0.5, h: 0, line: { color: C.accent, width: 2 } });
    sl.addText("HTTP/WS", { x: 3.22, y: 3.28, w: 0.8, h: 0.22, margin: 0, fontSize: 8, color: C.accent, align: "center", fontFace: "Calibri" });

    // ── 后端层 ──
    sl.addShape("rect", { x: 3.82, y: 1.25, w: 2.9, h: 3.9, fill: { color: "F0FDF4" }, line: { color: "BBF7D0", width: 1 } });
    sl.addText("⚙️ 后端层 (Node.js/Express)", { x: 3.82, y: 1.25, w: 2.9, h: 0.36, margin: 4, fontSize: 10, bold: true, color: "15803D", fontFace: "Calibri" });
    [["Auth Router", "注册/登录/刷新Token"], ["Message Router", "发送/获取消息"], ["Friend Router", "好友管理/申请"], ["WS Server", "实时消息路由"], ["AI Handler", "多模态/RAG/语音"], ["Rate Limiter", "三层请求限流"]].forEach(([name, desc], i) => {
      sl.addShape("rect", { x: 3.97, y: 1.72 + i * 0.54, w: 2.6, h: 0.46, fill: { color: C.bgCard }, line: { color: "BBF7D0", width: 1 }, shadow: mkShadowSm() });
      sl.addText(name, { x: 4.04, y: 1.72 + i * 0.54, w: 2.46, h: 0.24, margin: 0, fontSize: 10, bold: true, color: "15803D", fontFace: "Consolas" });
      sl.addText(desc, { x: 4.04, y: 1.97 + i * 0.54, w: 2.46, h: 0.2, margin: 0, fontSize: 8.5, color: C.textMid, fontFace: "Calibri" });
    });

    // ── 箭头 ──
    sl.addShape("line", { x: 6.72, y: 3.2, w: 0.5, h: 0, line: { color: C.accent, width: 2 } });
    sl.addText("SQL/API", { x: 6.64, y: 3.28, w: 0.8, h: 0.22, margin: 0, fontSize: 8, color: C.accent, align: "center", fontFace: "Calibri" });

    // ── 数据/AI层 ──
    sl.addShape("rect", { x: 7.24, y: 1.25, w: 2.3, h: 3.9, fill: { color: "FFF7ED" }, line: { color: "FED7AA", width: 1 } });
    sl.addText("🗄️ 数据 & AI 层", { x: 7.24, y: 1.25, w: 2.3, h: 0.36, margin: 4, fontSize: 10.5, bold: true, color: "C2410C", fontFace: "Calibri" });
    [["PostgreSQL", "主数据库"], ["向量存储", "RAG知识库"], ["DeepSeek", "AI对话/推理"], ["GLM API", "实时语音"], ["Tavily", "网络搜索"], ["文件存储", "头像/图片"]].forEach(([name, desc], i) => {
      sl.addShape("rect", { x: 7.36, y: 1.72 + i * 0.54, w: 2.06, h: 0.46, fill: { color: C.bgCard }, line: { color: "FED7AA", width: 1 }, shadow: mkShadowSm() });
      sl.addText(name, { x: 7.42, y: 1.72 + i * 0.54, w: 1.94, h: 0.24, margin: 0, fontSize: 10, bold: true, color: "C2410C", fontFace: "Consolas" });
      sl.addText(desc, { x: 7.42, y: 1.97 + i * 0.54, w: 1.94, h: 0.2, margin: 0, fontSize: 8.5, color: C.textMid, fontFace: "Calibri" });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 2
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 2, "数据库设计", "PostgreSQL · ER设计 · 触发器 · 索引优化");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 5 — 数据库设计
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "数据库设计 · ER模型", "4张核心表 · 触发器自动维护统计 · 外键约束");

    // 4 tables shown as cards
    const tables = [
      { name: "users", color: C.accent,  icon: "👤", fields: ["id BIGSERIAL PK", "username VARCHAR(50)", "email VARCHAR(100)", "password_hash VARCHAR", "avatar_url TEXT", "bio TEXT", "status JSONB", "unread_count INT", "created_at TIMESTAMP"] },
      { name: "user_sessions", color: C.accent2, icon: "🔑", fields: ["id BIGSERIAL PK", "user_id FK → users", "refresh_token_hash", "device_info TEXT", "ip_address INET", "expires_at TIMESTAMP", "created_at TIMESTAMP", "is_active BOOLEAN"] },
      { name: "chat_history",  color: "10B981", icon: "💬", fields: ["id BIGSERIAL PK", "sender_id FK → users", "receiver_id FK → users", "content TEXT", "message_type VARCHAR", "is_read BOOLEAN", "media_url TEXT", "created_at TIMESTAMP"] },
      { name: "verification_codes", color: "F59E0B", icon: "📧", fields: ["id BIGSERIAL PK", "email VARCHAR(100)", "code VARCHAR(6)", "purpose VARCHAR(20)", "expires_at TIMESTAMP", "is_used BOOLEAN", "created_at TIMESTAMP"] },
    ];
    tables.forEach(({ name, color, icon, fields }, i) => {
      const x = 0.38 + i * 2.38;
      sl.addShape("rect", { x, y: 1.25, w: 2.2, h: 3.9, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadowSm() });
      sl.addShape("rect", { x, y: 1.25, w: 2.2, h: 0.44, fill: { color }, line: { color } });
      sl.addText(`${icon} ${name}`, { x: x + 0.1, y: 1.25, w: 2.06, h: 0.44, margin: 0, fontSize: 11, bold: true, color: C.white, valign: "middle", fontFace: "Consolas" });
      fields.forEach((f, fi) => {
        const isPK = f.includes("PK");
        const isFK = f.includes("FK");
        sl.addText(f, {
          x: x + 0.1, y: 1.75 + fi * 0.36, w: 2.06, h: 0.34, margin: 0,
          fontSize: 9, color: isPK ? color : isFK ? C.accent2 : C.textMid,
          bold: isPK, fontFace: "Consolas", valign: "middle"
        });
        sl.addShape("line", { x: x + 0.1, y: 1.75 + fi * 0.36 + 0.33, w: 2.0, h: 0, line: { color: C.border, width: 0.5 } });
      });
    });

    // trigger note
    sl.addShape("rect", { x: 0.38, y: 5.2, w: 9.24, h: 0.3, fill: { color: "FEF3C7" }, line: { color: "FDE68A", width: 1 } });
    sl.addText("⚡ 触发器: update_unread_count — 每次新增消息自动更新 users.unread_count，无需应用层手动维护", {
      x: 0.52, y: 5.21, w: 9.0, h: 0.28, margin: 0, fontSize: 9, color: "92400E", fontFace: "Calibri", valign: "middle"
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 3
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 3, "认证安全系统", "JWT双Token · 三层限流 · 会话管理 · 密码哈希");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 6 — JWT双Token认证流程
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "JWT 双Token 认证流程", "Access Token (15min) + Refresh Token (7d) · 自动刷新 · 并发保护");

    // left: flow steps
    const steps = [
      ["1", "用户提交邮箱+密码", "POST /api/auth/login", C.accent],
      ["2", "bcrypt验证密码哈希", "12轮salt, 防彩虹表攻击", C.accent2],
      ["3", "生成双Token", "AT(15min JWT) + RT(7d随机串)", "10B981"],
      ["4", "RT哈希存数据库", "HMAC-SHA256(rt, SECRET)防泄露", "F59E0B"],
      ["5", "AT过期→自动刷新", "POST /api/auth/refresh · 并发锁保护", "EF4444"],
      ["6", "主动登出/强制下线", "DELETE session · 全量登出 all_devices", "8B5CF6"],
    ];
    steps.forEach(([n, t, d, c], i) => {
      addFlowStep(sl, n, t, d, 0.4, 1.3 + i * 0.68, 4.4, c);
    });

    // right: code block
    const code = `// server/utils/jwt.js — 生成双Token
function generateTokens(userId) {
  const accessToken = jwt.sign(
    { userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = crypto
    .randomBytes(32).toString('hex');
  const rtHash = crypto.createHmac(
    'sha256', process.env.HMAC_SECRET)
    .update(refreshToken).digest('hex');
  return { accessToken, refreshToken, rtHash };
}

// client/AuthContext.js — 并发刷新保护
let isRefreshing = false;
let failedQueue = [];

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((res, rej) => {
      failedQueue.push({ resolve: res, reject: rej });
    });
  }
  isRefreshing = true;
  try {
    const { data } = await axios.post('/auth/refresh',
      { refreshToken: storedRT });
    processQueue(null, data.accessToken);
    return data.accessToken;
  } catch(e) {
    processQueue(e, null);
    logout(); // 刷新失败→强制登出
  } finally { isRefreshing = false; }
}`;
    addCodeBlock(sl, code, 4.95, 1.28, 4.65, 3.95);

    // bottom note
    sl.addShape("rect", { x: 0.4, y: 5.22, w: 9.24, h: 0.32, fill: { color: "EFF6FF" }, line: { color: "BFDBFE", width: 1 } });
    sl.addText("🔒 安全要点: RT哈希存储(防数据库泄露) · 并发锁防止重复刷新 · session二次校验防伪造Token", {
      x: 0.55, y: 5.23, w: 9.0, h: 0.28, margin: 0, fontSize: 9, color: "1D4ED8", fontFace: "Calibri", valign: "middle"
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 7 — 三层限流 + 中间件
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "三层速率限流 · 认证中间件", "防暴力破解 · 防接口滥用 · session二次校验");

    // 3 limiter cards
    const limiters = [
      { name: "验证码限流", color: "EF4444", limit: "3次/小时", scope: "同一邮箱", desc: "防止邮件轰炸\n恶意发送验证码" },
      { name: "登录限流",   color: "F59E0B", limit: "5次/15分钟", scope: "同一IP+邮箱", desc: "防暴力破解密码\n账号锁定保护" },
      { name: "API全局限流", color: "10B981", limit: "100次/15分钟", scope: "同一IP", desc: "防DDoS攻击\n资源耗尽保护" },
    ];
    limiters.forEach(({ name, color, limit, scope, desc }, i) => {
      const x = 0.45 + i * 3.08;
      sl.addShape("rect", { x, y: 1.28, w: 2.85, h: 1.9, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadow() });
      sl.addShape("rect", { x, y: 1.28, w: 2.85, h: 0.4, fill: { color }, line: { color } });
      sl.addText(name, { x: x + 0.1, y: 1.28, w: 2.7, h: 0.4, margin: 0, fontSize: 13, bold: true, color: C.white, valign: "middle", fontFace: "Calibri" });
      sl.addText(limit, { x: x + 0.15, y: 1.75, w: 2.6, h: 0.38, margin: 0, fontSize: 20, bold: true, color, fontFace: "Arial Black" });
      sl.addText(`范围: ${scope}`, { x: x + 0.15, y: 2.15, w: 2.6, h: 0.25, margin: 0, fontSize: 10, color: C.textMid, fontFace: "Calibri" });
      sl.addText(desc, { x: x + 0.15, y: 2.44, w: 2.6, h: 0.6, margin: 0, fontSize: 10, color: C.textMid, fontFace: "Calibri" });
    });

    // auth middleware code
    const code = `// server/middleware/auth.js — 强制认证中间件
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未认证' });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // 二次校验: 检查session是否仍有效(防Token泄露后仍可用)
  const session = await pool.query(
    'SELECT * FROM user_sessions WHERE user_id=$1 AND is_active=true',
    [decoded.userId]
  );
  if (!session.rows.length) {
    return res.status(401).json({ error: 'session已失效' });
  }
  req.user = decoded;
  next();
}`;
    addCodeBlock(sl, code, 0.4, 3.25, 9.22, 2.15);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 4
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 4, "AI 对话系统", "多角色人格 · RAG知识库 · 多模态 · 深度思考 · 网络搜索");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 8 — AI系统全貌
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "AI 对话系统全貌", "5种人格 · RAG · 多模态 · DeepSeek深度思考 · Tavily网络搜索");

    // 5 persona cards top row
    const personas = [
      ["😊 Normal",    "normal",    C.accent,  "均衡友好"],
      ["📚 知识型",    "knowledge", "10B981",  "专业严谨"],
      ["😤 愤怒型",    "angry",     "EF4444",  "情绪激昂"],
      ["😂 幽默型",    "funny",     "F59E0B",  "轻松有趣"],
      ["🌸 温柔型",    "gentle",    "EC4899",  "温暖贴心"],
    ];
    personas.forEach(([label, key, color, desc], i) => {
      const x = 0.42 + i * 1.85;
      sl.addShape("rect", { x, y: 1.28, w: 1.72, h: 1.15, fill: { color: C.bgCard }, line: { color }, shadow: mkShadowSm() });
      sl.addShape("rect", { x, y: 1.28, w: 1.72, h: 0.08, fill: { color }, line: { color } });
      sl.addText(label, { x: x + 0.08, y: 1.38, w: 1.6, h: 0.42, margin: 0, fontSize: 13, bold: true, color, fontFace: "Calibri" });
      sl.addText(`key: "${key}"`, { x: x + 0.08, y: 1.82, w: 1.6, h: 0.22, margin: 0, fontSize: 9, color: C.textMid, fontFace: "Consolas" });
      sl.addText(desc, { x: x + 0.08, y: 2.07, w: 1.6, h: 0.28, margin: 0, fontSize: 9, color: C.textMid, fontFace: "Calibri" });
    });

    // AI flow steps bottom
    const aiSteps = [
      ["用户发消息", "支持文字+图片(Base64)\n+角色选择", C.accent],
      ["功能路由判断", "networkSearch/RAG\n/deepThink/image标志", C.accent2],
      ["知识库RAG检索", "LangChain语义检索\n相关上下文注入", "10B981"],
      ["Prompt组装", "系统Prompt+角色Prompt\n+历史+检索结果", "F59E0B"],
      ["DeepSeek API调用", "Stream流式输出\n打字机效果渲染", "EF4444"],
      ["结果存储", "PostgreSQL持久化\n+前端实时显示", "8B5CF6"],
    ];
    aiSteps.forEach(([title, desc, color], i) => {
      const x = 0.42 + i * 1.62;
      sl.addShape("rect", { x, y: 2.72, w: 1.5, h: 1.2, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadowSm() });
      sl.addShape("rect", { x, y: 2.72, w: 1.5, h: 0.06, fill: { color }, line: { color } });
      sl.addText(title, { x: x + 0.08, y: 2.8, w: 1.38, h: 0.38, margin: 0, fontSize: 10, bold: true, color, fontFace: "Calibri" });
      sl.addText(desc, { x: x + 0.08, y: 3.2, w: 1.38, h: 0.65, margin: 0, fontSize: 8.5, color: C.textMid, fontFace: "Calibri" });
      if (i < 5) {
        sl.addShape("line", { x: x + 1.5, y: 3.32, w: 0.12, h: 0, line: { color: C.accent, width: 2 } });
      }
    });

    // code: RAG核心
    const code = `// server/index.js — RAG检索增强生成
async function searchKnowledge(query) {
  const results = await vectorStore.similaritySearch(query, 3);
  return results.map(r => r.pageContent).join('\\n\\n');
}

// 对话主流程 — 功能路由
if (useRAG && knowledgeText) {
  systemPrompt += \`\\n参考知识:\\n\${knowledgeText}\`;
}
if (networkSearch) {
  const webResult = await tavilySearch(message);
  systemPrompt += \`\\n网络资料:\\n\${webResult}\`;
}`;
    addCodeBlock(sl, code, 0.42, 4.05, 9.2, 1.38);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 9 — 多模态 & 深度思考
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "多模态图片理解 · 深度思考模式", "Base64图片传输 · deepseek-reasoner · Stream解析");

    // left: multimodal
    sl.addShape("rect", { x: 0.4, y: 1.28, w: 4.5, h: 4.1, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadow() });
    sl.addShape("rect", { x: 0.4, y: 1.28, w: 4.5, h: 0.38, fill: { color: C.accent }, line: { color: C.accent } });
    sl.addText("🖼️ 多模态图片理解", { x: 0.55, y: 1.28, w: 4.3, h: 0.38, margin: 0, fontSize: 13, bold: true, color: C.white, valign: "middle", fontFace: "Calibri" });

    const mmCode = `// client: 图片选择 + Base64编码
const result = await ImagePicker.launchImageLibraryAsync({
  base64: true, quality: 0.8
});
setSelectedImage('data:image/jpeg;base64,' + result.base64);

// server: 多模态消息构建
const userMsg = {
  role: 'user',
  content: imageBase64 ? [
    { type: 'image_url',
      image_url: { url: imageBase64 } },
    { type: 'text', text: message }
  ] : message
};`;
    addCodeBlock(sl, mmCode, 0.5, 1.72, 4.3, 2.4);

    sl.addText([
      { text: "支持格式: ", options: { bold: true } },
      { text: "JPG / PNG / WEBP 图片\n" },
      { text: "传输方式: ", options: { bold: true } },
      { text: "Base64 内联，无需额外文件服务\n" },
      { text: "模型调用: ", options: { bold: true } },
      { text: "DeepSeek-Vision 视觉理解" },
    ], { x: 0.55, y: 4.2, w: 4.3, h: 1.1, margin: 0, fontSize: 10.5, color: C.text, fontFace: "Calibri" });

    // right: deep think
    sl.addShape("rect", { x: 5.1, y: 1.28, w: 4.5, h: 4.1, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadow() });
    sl.addShape("rect", { x: 5.1, y: 1.28, w: 4.5, h: 0.38, fill: { color: C.accent2 }, line: { color: C.accent2 } });
    sl.addText("🧠 深度思考模式 (Reasoner)", { x: 5.25, y: 1.28, w: 4.3, h: 0.38, margin: 0, fontSize: 13, bold: true, color: C.white, valign: "middle", fontFace: "Calibri" });

    const dtCode = `// server/index.js — deepseek-reasoner
const model = deepThink ?
  'deepseek-reasoner' : 'deepseek-chat';

const stream = await openai.chat.completions.create({
  model, messages, stream: true
});

// 解析reasoning_content思维链
for await (const chunk of stream) {
  const delta = chunk.choices[0].delta;
  if (delta.reasoning_content) {
    // 思维链内容单独展示
    thinkingText += delta.reasoning_content;
  }
  if (delta.content) {
    // 最终回答流式输出
    reply += delta.content;
    res.write('data: ' + JSON.stringify({
      content: delta.content,
      thinking: thinkingText
    }) + '\\n\\n');
  }
}`;
    addCodeBlock(sl, dtCode, 5.2, 1.72, 4.3, 2.8);

    sl.addText([
      { text: "思维链: ", options: { bold: true } },
      { text: "reasoning_content 独立字段展示\n" },
      { text: "流式输出: ", options: { bold: true } },
      { text: "SSE格式，打字机逐字渲染效果" },
    ], { x: 5.25, y: 4.6, w: 4.3, h: 0.7, margin: 0, fontSize: 10.5, color: C.text, fontFace: "Calibri" });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 5
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 5, "实时通信系统", "WebSocket · 心跳保活 · 指数退避重连 · 发布订阅");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 10 — WebSocket
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "WebSocket 实时通信系统", "心跳保活 · 指数退避重连 · 好友通知 · 已读同步");

    // 3 feature cards
    const features = [
      { title: "❤️ 心跳保活", color: "EF4444", items: ["30秒发送ping帧", "服务端pong响应", "超时触发重连", "防止NAT超时断开"] },
      { title: "🔄 指数退避重连", color: "F59E0B", items: ["初始延迟1秒", "每次×2增长", "最大30秒上限", "断线自动恢复"] },
      { title: "📨 消息路由", color: "10B981", items: ["好友申请通知", "新消息推送", "已读状态同步", "在线状态广播"] },
    ];
    features.forEach(({ title, color, items }, i) => {
      const x = 0.4 + i * 3.1;
      sl.addShape("rect", { x, y: 1.28, w: 2.85, h: 1.95, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadow() });
      sl.addShape("rect", { x, y: 1.28, w: 2.85, h: 0.4, fill: { color }, line: { color } });
      sl.addText(title, { x: x + 0.1, y: 1.28, w: 2.7, h: 0.4, margin: 0, fontSize: 13, bold: true, color: C.white, valign: "middle", fontFace: "Calibri" });
      items.forEach((item, ii) => {
        sl.addShape("oval", { x: x + 0.18, y: 1.8 + ii * 0.35, w: 0.1, h: 0.1, fill: { color }, line: { color } });
        sl.addText(item, { x: x + 0.36, y: 1.75 + ii * 0.35, w: 2.36, h: 0.32, margin: 0, fontSize: 10.5, color: C.text, fontFace: "Calibri" });
      });
    });

    // code block
    const code = `// client/WebSocketContext.js — 心跳+重连
const HEARTBEAT_INTERVAL = 30000;
let reconnectDelay = 1000;

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, HEARTBEAT_INTERVAL);
}

function handleReconnect() {
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    connectWebSocket(); // 指数退避重连
  }, reconnectDelay);
}

// server/websocket.js — 消息路由
wss.on('connection', (ws, req) => {
  const userId = authenticateWS(req); // Token鉴权
  clients.set(userId, ws);
  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    switch(msg.type) {
      case 'friend_request': notifyFriend(msg);  break;
      case 'chat_message':   forwardMessage(msg); break;
      case 'read_receipt':   syncReadStatus(msg); break;
    }
  });
});`;
    addCodeBlock(sl, code, 0.4, 3.3, 9.2, 2.1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 6
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 6, "实时语音对话系统", "GLM-Realtime API · ffmpeg转码 · 双向音频流");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 11 — 语音对话
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "GLM-Realtime 语音对话系统", "WebSocket代理 · expo-av录音 · ffmpeg PCM转码 · 双向流");

    // flow timeline
    const voiceSteps = [
      ["expo-av\n录音采集", "客户端麦克风", C.accent],
      ["Base64\nPCM编码", "float32→base64", C.accent2],
      ["WS发送\n到服务端", "二进制音频流", "10B981"],
      ["ffmpeg\nPCM转码", "格式兼容处理", "F59E0B"],
      ["GLM API\nStream调用", "智谱Realtime", "EF4444"],
      ["TTS\n语音合成", "AI回复→音频", "8B5CF6"],
      ["expo-av\n播放回声", "客户端播放", "06B6D4"],
    ];
    voiceSteps.forEach(([title, desc, color], i) => {
      const x = 0.35 + i * 1.35;
      // circle
      sl.addShape("oval", { x: x + 0.28, y: 1.3, w: 0.72, h: 0.72, fill: { color }, line: { color } });
      sl.addText(String(i + 1), { x: x + 0.28, y: 1.3, w: 0.72, h: 0.72, margin: 0, fontSize: 18, bold: true, color: C.white, align: "center", valign: "middle" });
      // arrow
      if (i < 6) {
        sl.addShape("line", { x: x + 1.0, y: 1.66, w: 0.35, h: 0, line: { color: C.textLight, width: 1.5 } });
      }
      sl.addText(title, { x, y: 2.15, w: 1.28, h: 0.5, margin: 0, fontSize: 9.5, bold: true, color, align: "center", fontFace: "Calibri" });
      sl.addText(desc, { x, y: 2.67, w: 1.28, h: 0.3, margin: 0, fontSize: 8.5, color: C.textMid, align: "center", fontFace: "Calibri" });
    });

    // code
    const code = `// server/index.js — GLM-Realtime WS代理
app.ws('/api/voice-chat', async (clientWs, req) => {
  const glmWs = new WebSocket(
    'wss://open.bigmodel.cn/api/paas/v4/realtime',
    { headers: { Authorization: 'Bearer ' + GLM_KEY } }
  );
  // 客户端 → GLM 转发
  clientWs.on('message', async (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'audio_chunk') {
      // ffmpeg PCM格式转换
      const pcm = await convertAudioFormat(msg.audio);
      glmWs.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: pcm.toString('base64')
      }));
    }
  });
  // GLM → 客户端 转发(TTS音频+文字)
  glmWs.on('message', (data) => {
    clientWs.send(data); // 透传Realtime事件流
  });
});`;
    addCodeBlock(sl, code, 0.4, 3.1, 9.2, 2.3);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 7
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 7, "前端架构设计", "Context嵌套 · 导航守卫 · 主题系统 · 国际化");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 12 — 前端架构
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "前端架构 · Context嵌套 + 导航守卫", "Language → Theme → Auth → WebSocket 四层Context嵌套");

    // context nesting visual
    const layers = [
      { name: "LanguageProvider",   color: "06B6D4", desc: "i18next 中/英双语, AsyncStorage持久化" },
      { name: "ThemeProvider",      color: "8B5CF6", desc: "6色×2模式=12主题, AsyncStorage持久化" },
      { name: "AuthProvider",       color: "10B981", desc: "用户状态, Token管理, 401自动刷新" },
      { name: "WebSocketProvider",  color: "F59E0B", desc: "实时连接管理, 心跳, 重连策略" },
      { name: "NavigationContainer", color: "EF4444", desc: "路由守卫: 未登录→Login, 已登录→Main" },
    ];
    layers.forEach(({ name, color, desc }, i) => {
      const indent = i * 0.3;
      const w = 9.2 - indent * 2;
      const y = 1.3 + i * 0.72;
      sl.addShape("rect", { x: 0.4 + indent, y, w, h: 0.64, fill: { color: C.bgCard }, line: { color }, shadow: mkShadowSm() });
      sl.addShape("rect", { x: 0.4 + indent, y, w: 0.06, h: 0.64, fill: { color }, line: { color } });
      sl.addText(name, { x: 0.6 + indent, y: y + 0.06, w: 3.2, h: 0.26, margin: 0, fontSize: 11, bold: true, color, fontFace: "Consolas" });
      sl.addText(desc, { x: 0.6 + indent, y: y + 0.34, w: w - 0.3, h: 0.24, margin: 0, fontSize: 9.5, color: C.textMid, fontFace: "Calibri" });
    });

    // code: App.js navigation guard
    const code = `// client/App.js — 导航守卫
function AppNavigator() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}`;
    addCodeBlock(sl, code, 0.4, 4.72, 5.5, 1.12);

    // theme grid
    sl.addShape("rect", { x: 6.1, y: 4.72, w: 3.52, h: 1.12, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadowSm() });
    sl.addText("🎨 12种主题方案", { x: 6.2, y: 4.78, w: 3.3, h: 0.28, margin: 0, fontSize: 11, bold: true, color: C.text, fontFace: "Calibri" });
    const themeColors = ["0EA5E9", "8B5CF6", "10B981", "F59E0B", "EF4444", "EC4899"];
    themeColors.forEach((c, ci) => {
      ["1E293B", "F8FAFC"].forEach((bg, bi) => {
        const x = 6.2 + ci * 0.52;
        const y = 5.14 + bi * 0.32;
        sl.addShape("oval", { x, y, w: 0.28, h: 0.28, fill: { color: bg }, line: { color: c, width: 2 } });
        sl.addShape("oval", { x: x + 0.08, y: y + 0.08, w: 0.12, h: 0.12, fill: { color: c }, line: { color: c } });
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 13 — 前端页面展示
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "前端核心页面", "8个主要页面 · Three.js粒子过渡 · 高德地图集成");

    const screens = [
      { name: "LoginScreen", icon: "🔐", desc: "登录/注册·邮箱验证·过渡动画", color: C.accent },
      { name: "AIChatScreen", icon: "🤖", desc: "AI对话·多角色·深度思考·图片理解", color: C.accent2 },
      { name: "VoiceChatScreen", icon: "🎙️", desc: "实时语音·录音波形·GLM Realtime", color: "10B981" },
      { name: "MessagesScreen", icon: "💬", desc: "会话列表·好友申请·未读统计", color: "F59E0B" },
      { name: "ChatDetailScreen", icon: "📱", desc: "即时通讯·发送消息·WebSocket实时", color: "EF4444" },
      { name: "CirclesScreen", icon: "🗺️", desc: "圈子动态·高德地图WebView集成", color: "8B5CF6" },
      { name: "SettingsScreen", icon: "⚙️", desc: "头像上传·语言切换·主题选择·登出", color: "EC4899" },
      { name: "TransitionScreen", icon: "✨", desc: "Three.js 1200粒子爱心过渡动画", color: "06B6D4" },
    ];
    screens.forEach(({ name, icon, desc, color }, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = 0.4 + col * 2.35;
      const y = 1.3 + row * 2.0;
      sl.addShape("rect", { x, y, w: 2.15, h: 1.75, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadow() });
      sl.addShape("rect", { x, y, w: 2.15, h: 0.06, fill: { color }, line: { color } });
      // icon circle
      sl.addShape("oval", { x: x + 0.75, y: y + 0.18, w: 0.64, h: 0.64, fill: { color, transparency: 85 }, line: { color, transparency: 85 } });
      sl.addText(icon, { x: x + 0.75, y: y + 0.18, w: 0.64, h: 0.64, margin: 0, fontSize: 22, align: "center", valign: "middle" });
      sl.addText(name, { x: x + 0.1, y: y + 0.9, w: 1.96, h: 0.32, margin: 0, fontSize: 10, bold: true, color: C.text, align: "center", fontFace: "Consolas" });
      sl.addText(desc, { x: x + 0.1, y: y + 1.24, w: 1.96, h: 0.44, margin: 0, fontSize: 8.5, color: C.textMid, align: "center", fontFace: "Calibri" });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECTION 8
  // ─────────────────────────────────────────────────────────────────────────
  addSectionSlide(pres, 8, "项目亮点总结", "技术亮点 · 创新点 · 挑战与解决方案");

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 14 — 项目亮点
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgLight };
    addHeader(sl, "项目技术亮点", "6大核心技术创新 · 工程化设计思路");

    const highlights = [
      { icon: "🔐", title: "JWT双Token + 并发保护", desc: "Access+Refresh双Token机制，RefreshToken HMAC哈希存库，并发刷新队列防止Token竞争，Session二次校验防泄露滥用", color: C.accent },
      { icon: "🤖", title: "AI多能力路由融合", desc: "单对话接口集成RAG知识库/网络搜索/多模态图理解/深度思考四路能力，通过标志位动态路由，Prompt工程统一管理", color: C.accent2 },
      { icon: "🔊", title: "端到端实时语音链路", desc: "expo-av采集→Base64编码→ffmpeg PCM转码→GLM Realtime API→TTS合成→expo-av播放，完整双向音频流", color: "10B981" },
      { icon: "⚡", title: "WebSocket工程化设计", desc: "30s心跳保活+指数退避重连(1s→30s)，消息类型路由分发，好友通知/已读同步，JWT鉴权升级握手", color: "F59E0B" },
      { icon: "🎨", title: "主题×国际化双维度", desc: "6色主题×明暗2模式=12套配色方案，i18next中英双语，均通过AsyncStorage持久化，Context全局响应", color: "EF4444" },
      { icon: "🛡️", title: "三层安全防护体系", desc: "速率限流(验证码3次/h·登录5次/15m·API 100次/15m)+bcrypt密码哈希+三层中间件鉴权，系统性防御设计", color: "8B5CF6" },
    ];
    highlights.forEach(({ icon, title, desc, color }, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.38 + col * 3.1;
      const y = 1.28 + row * 2.12;
      sl.addShape("rect", { x, y, w: 2.9, h: 1.95, fill: { color: C.bgCard }, line: { color: C.border, width: 1 }, shadow: mkShadow() });
      sl.addShape("rect", { x, y, w: 2.9, h: 0.06, fill: { color }, line: { color } });
      sl.addShape("oval", { x: x + 0.15, y: y + 0.18, w: 0.52, h: 0.52, fill: { color, transparency: 80 }, line: { color, transparency: 80 } });
      sl.addText(icon, { x: x + 0.15, y: y + 0.18, w: 0.52, h: 0.52, margin: 0, fontSize: 20, align: "center", valign: "middle" });
      sl.addText(title, { x: x + 0.78, y: y + 0.18, w: 2.0, h: 0.52, margin: 0, fontSize: 11, bold: true, color, fontFace: "Calibri" });
      sl.addText(desc, { x: x + 0.14, y: y + 0.8, w: 2.68, h: 1.08, margin: 0, fontSize: 9.5, color: C.textMid, fontFace: "Calibri" });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SLIDE 15 — 封底 Q&A
  // ─────────────────────────────────────────────────────────────────────────
  {
    const sl = pres.addSlide();
    sl.background = { color: C.bgDark };
    sl.addShape("oval", { x: 6.5, y: -1.5, w: 6, h: 6, fill: { color: C.accent, transparency: 92 }, line: { color: C.accent, transparency: 92 } });
    sl.addShape("oval", { x: -2, y: 2.5, w: 5, h: 5, fill: { color: C.accent2, transparency: 92 }, line: { color: C.accent2, transparency: 92 } });
    sl.addText("Thank You", { x: 0, y: 1.4, w: 10, h: 1.1, margin: 0, fontSize: 54, bold: true, color: C.white, align: "center", fontFace: "Arial Black" });
    sl.addText("Q & A", { x: 0, y: 2.6, w: 10, h: 0.75, margin: 0, fontSize: 36, bold: true, color: C.accent, align: "center", fontFace: "Arial Black" });
    sl.addShape("line", { x: 3, y: 3.45, w: 4, h: 0, line: { color: C.accent, width: 2 } });
    sl.addText("MeetU · AI 智能社交应用 · 项目答辩", { x: 0, y: 3.65, w: 10, h: 0.4, margin: 0, fontSize: 14, color: "94A3B8", align: "center", fontFace: "Calibri" });

    // mini tech summary
    const tags2 = [
      "React Native", "Node.js + Express", "PostgreSQL", "JWT双Token",
      "WebSocket", "GLM-Realtime", "DeepSeek API", "RAG知识库",
      "多模态AI", "Three.js", "i18next", "12主题方案"
    ];
    let tx = 0.6;
    let ty = 4.2;
    tags2.forEach((t, i) => {
      if (i === 6) { tx = 0.6; ty = 4.68; }
      const col = i < 6 ? C.accent : C.accent2;
      tx += addTag(sl, t, tx, ty, col);
    });

    sl.addText("2026  ·  项目答辩", { x: 0, y: 5.25, w: 10, h: 0.375, margin: 0, fontSize: 11, color: "475569", align: "center", fontFace: "Calibri" });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WRITE
  // ─────────────────────────────────────────────────────────────────────────
  const outPath = "d:/RN2/rn-ai-chat/MeetU_答辩PPT.pptx";
  await pres.writeFile({ fileName: outPath });
  console.log("✅ PPT生成完毕:", outPath);
}

main().catch(e => { console.error(e); process.exit(1); });
