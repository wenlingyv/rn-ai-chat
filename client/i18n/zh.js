// ============================================================
// 中文文案
// ============================================================
export default {
  // 底部 Tab
  tabs: {
    messages: '消息',
    circles: '圈子',
    aiChat: 'AI助手',
    settings: '我的',
  },

  // 通用
  common: {
    back: '← 返回',
    cancel: '取消',
    confirm: '确定',
    send: '发送',
    clear: '清空',
    publish: '发布',
    justNow: '刚刚',
    networkError: '网络错误: ',
    error: '错误',
  },

  // 消息页
  messages: {
    title: '消息',
    createGroup: '创建群聊',
    inputPlaceholder: '输入消息...',
    likes: '点赞',
    comments: '评论',
    mentions: '@我的',
    followers: '粉丝',
    group: '群聊',
    autoReplies: ['好的！', '收到～', '哈哈', '了解了解', '没问题！', '嗯嗯'],
  },

  // 消息页 mock 聊天数据
  chats: {
    xiaoming: { name: '小明', lastMsg: '周末一起去打球吗？' },
    xiaohong: { name: '小红', lastMsg: '照片已经发你了' },
    workGroup: { name: '工作交流群', lastMsg: '阿杰: 文档已经更新了' },
    ajie: { name: '阿杰', lastMsg: '哈哈这也太搞笑了' },
    xiaomei: { name: '小美', lastMsg: '好的，那明天见！' },
    weekendGroup: { name: '周末出行小分队', lastMsg: '露露: 定了周六早上9点' },
    dawei: { name: '大伟', lastMsg: '文档我已经更新了' },
    lulu: { name: '露露', lastMsg: '生日快乐！' },
    ahao: { name: '阿豪', lastMsg: '项目进度怎么样了' },
    jingjing: { name: '静静', lastMsg: '分享了一首歌给你' },
  },

  // 消息页 mock 聊天记录
  messages_data: {
    chat1: [
      { from: '1', text: '嗨，在干嘛呢？', time: '10:10' },
      { from: 'me', text: '刚忙完，怎么了？', time: '10:12' },
      { from: '1', text: '周末一起去打球吗？', time: '10:23' },
    ],
    chat2: [
      { from: '2', text: '你要的照片我拍好了', time: '09:00' },
      { from: 'me', text: '太好了，发我看看', time: '09:10' },
      { from: '2', text: '照片已经发你了', time: '09:15' },
    ],
    chat3: [
      { from: 'me', text: '你看这个视频了吗', time: '昨天' },
      { from: '3', text: '看了看了', time: '昨天' },
      { from: '3', text: '哈哈这也太搞笑了', time: '昨天' },
    ],
    chat4: [
      { from: 'me', text: '明天下午3点怎么样？', time: '昨天' },
      { from: '4', text: '好的，那明天见！', time: '昨天' },
    ],
  },

  // 圈子页
  circles: {
    title: '圈子',
    nearby: '附近圈子',
    friends: '好友圈子',
    moreActions: '更多操作',
    reportOptions: '举报 / 不感兴趣 / 屏蔽',
    publishTitle: '发送动态',
    placeholder: '分享你的新鲜事...',
    charCount: '/1000',
    addImage: '添加图片',
    visibility: '谁可以看',
    visibilityVal: '公开',
    location: '所在位置',
    locationVal: '不显示',
    sendTime: '发送时间',
    sendTimeVal: '立即发送',
  },

  // 圈子页 mock 数据
  circles_data: {
    post1: { author: '小明', content: '今天的天气真好，适合出去走走！阳光洒在身上暖暖的，心情美美的~', time: '10分钟前', likes: 12, comments: 3, shares: 1 },
    post2: { author: '小红', content: '新学会了一道菜！红烧排骨，味道还不错，以后可以经常做了  ', time: '30分钟前', likes: 8, comments: 2, shares: 0 },
    post3: { author: '阿杰', content: '周末去了海边，海风真的太舒服了，强烈推荐大家去放松一下！碧海蓝天，绝了！', time: '1小时前', likes: 25, comments: 7, shares: 4 },
    post4: { author: '小美', content: '今天加班到很晚，但是项目终于上线了！成就感满满！团队合作太重要了~', time: '3小时前', likes: 18, comments: 5, shares: 2 },
    post5: { author: '大伟', content: '分享一本好书《人类简史》，强烈推荐！读完感觉世界观都被刷新了，认知升级！', time: '5小时前', likes: 32, comments: 9, shares: 6 },
    post6: { author: '露露', content: '生日快乐！谢谢大家的祝福，今天真的超级开心！收到了好多好多礼物和花花~', time: '昨天', likes: 56, comments: 15, shares: 3 },
    post7: { author: '阿豪', content: '新的健身房开业了，第一天体验感拉满，以后要天天来！冲冲冲！', time: '昨天', likes: 14, comments: 4, shares: 1 },
    post8: { author: '静静', content: '分享一首超好听的歌🎵，循环播放了一整天停不下来！强烈安利给大家~', time: '2天前', likes: 21, comments: 6, shares: 8 },
  },

  // AI 聊天页
  ai: {
    title: 'AI 聊天助手',
    normalAssistant: '正常助手',
    knowledgeExpert: '知识专家',
    angryAssistant: '暴躁助手',
    funnyAssistant: '搞笑助手',
    deepThink: '深度思考',
    webSearch: '联网搜索',
    inputPlaceholder: '请输入内容',
    imagePlaceholder: '添加文字描述（可选）',
    describeImage: '请描述这张图片',
    thinkingTitle: '🤔 深度思考过程',
    searchTitle: '🔍 联网搜索过程',
    answerTitle: '💡 最终回答',
  },

  // 我的页
  settings: {
    title: '我的',
    nickname: '快乐小青年',
    bio: '热爱生活，积极向上',
    friends: '好友',
    posts: '动态',
    likes: '获赞',
    profile: '个人资料',
    profileDesc: '编辑头像、昵称、签名',
    privacy: '隐私设置',
    privacyDesc: '管理隐私和安全选项',
    notifications: '通知管理',
    notificationsDesc: '消息提醒和推送设置',
    theme: '主题外观',
    themeDesc: '切换亮暗模式、主题颜色',
    chatHistory: '聊天记录',
    chatHistoryDesc: '备份和恢复聊天数据',
    help: '帮助与反馈',
    helpDesc: '常见问题和意见反馈',
    about: '关于我们',
    aboutDesc: '版本信息和团队介绍',
    language: '语言',
    languageDesc: '切换中文 / English',
    logout: '退出登录',
    logoutConfirm: '确定要退出登录吗？',
    logoutError: '退出登录失败，请重试',
    version: 'AI Chat v1.0.0',
  },

  // 主题外观页
  theme: {
    title: '主题外观',
    mode: '模式',
    lightMode: '亮色模式',
    darkMode: '暗色模式',
    palette: '主题色',
    preview: '预览',
    tabPreview: 'Tab 栏预览',
    previewTitle: '示例页面标题',
    previewName: '昵称示例',
    previewSub: '这是一段次要文字预览',
    previewBtn: '主题色按钮',
    previewBtnOutline: '描边按钮',
    palettes: {
      teal: '青绿',
      purple: '梦幻紫',
      pink: '活力粉',
      blue: '天空蓝',
      orange: '阳光橙',
      green: '清新绿',
    },
  },

  // 语言切换
  language: {
    title: '语言设置',
    chinese: '中文',
    english: 'English',
    current: '当前语言',
  },
};
