// ============================================================
// English translations
// ============================================================
export default {
  // Bottom Tabs
  tabs: {
    messages: 'Messages',
    circles: 'Circles',
    aiChat: 'AI Chat',
    settings: 'Me',
  },

  // Common
  common: {
    back: '← Back',
    cancel: 'Cancel',
    confirm: 'Confirm',
    send: 'Send',
    clear: 'Clear',
    publish: 'Post',
    justNow: 'Just now',
    networkError: 'Network error: ',
  },

  // Messages page
  messages: {
    title: 'Messages',
    createGroup: 'New Group',
    inputPlaceholder: 'Type a message...',
    likes: 'Likes',
    comments: 'Comments',
    mentions: '@Mentions',
    followers: 'Followers',
    group: 'Group',
    autoReplies: ['Got it!', 'Okay~', 'Haha', 'Understood!', 'No problem!', 'Sure'],
  },

  // Messages mock chat data
  chats: {
    xiaoming: { name: 'Alex', lastMsg: 'Want to play basketball this weekend?' },
    xiaohong: { name: 'Emma', lastMsg: 'Sent you the photos' },
    workGroup: { name: 'Work Chat', lastMsg: 'Jake: Document updated' },
    ajie: { name: 'Jake', lastMsg: 'Haha that\'s hilarious' },
    xiaomei: { name: 'Mia', lastMsg: 'Great, see you tomorrow!' },
    weekendGroup: { name: 'Weekend Squad', lastMsg: 'Lulu: Set for Sat 9am' },
    dawei: { name: 'David', lastMsg: 'Document updated' },
    lulu: { name: 'Lulu', lastMsg: 'Happy birthday!' },
    ahao: { name: 'Hunter', lastMsg: 'How\'s the project going?' },
    jingjing: { name: 'Jing', lastMsg: 'Shared a song with you' },
  },

  // Messages mock chat records
  messages_data: {
    chat1: [
      { from: '1', text: 'Hey, what are you up to?', time: '10:10' },
      { from: 'me', text: 'Just finished, what\'s up?', time: '10:12' },
      { from: '1', text: 'Want to play basketball this weekend?', time: '10:23' },
    ],
    chat2: [
      { from: '2', text: 'I took the photos you wanted', time: '09:00' },
      { from: 'me', text: 'Great, let me see!', time: '09:10' },
      { from: '2', text: 'Sent you the photos', time: '09:15' },
    ],
    chat3: [
      { from: 'me', text: 'Have you seen this video?', time: 'Yesterday' },
      { from: '3', text: 'Yeah I watched it', time: 'Yesterday' },
      { from: '3', text: 'Haha that\'s hilarious', time: 'Yesterday' },
    ],
    chat4: [
      { from: 'me', text: 'How about 3pm tomorrow?', time: 'Yesterday' },
      { from: '4', text: 'Great, see you tomorrow!', time: 'Yesterday' },
    ],
  },

  // Circles page
  circles: {
    title: 'Circles',
    nearby: 'Nearby',
    friends: 'Friends',
    moreActions: 'More Options',
    reportOptions: 'Report / Not interested / Block',
    publishTitle: 'New Post',
    placeholder: 'Share what\'s on your mind...',
    charCount: '/1000',
    addImage: 'Add Photo',
    visibility: 'Visibility',
    visibilityVal: 'Public',
    location: 'Location',
    locationVal: 'Hidden',
    sendTime: 'Schedule',
    sendTimeVal: 'Post now',
  },

  // Circles mock data
  circles_data: {
    post1: { author: 'Alex', content: 'Beautiful weather today! Perfect for a walk outside. The sunshine feels so warm and lovely~', time: '10 min ago', likes: 12, comments: 3, shares: 1 },
    post2: { author: 'Emma', content: 'Just learned to cook braised pork ribs! Turned out pretty good, will make it again   ', time: '30 min ago', likes: 8, comments: 2, shares: 0 },
    post3: { author: 'Jake', content: 'Went to the beach this weekend, the sea breeze was absolutely amazing! Highly recommend for anyone who needs to relax!', time: '1h ago', likes: 25, comments: 7, shares: 4 },
    post4: { author: 'Mia', content: 'Worked late tonight but the project finally launched! So proud of the team! Teamwork makes the dream work~', time: '3h ago', likes: 18, comments: 5, shares: 2 },
    post5: { author: 'David', content: 'Highly recommend "Sapiens" by Yuval Noah Harari! Mind-blowing read that changes how you see the world!', time: '5h ago', likes: 32, comments: 9, shares: 6 },
    post6: { author: 'Lulu', content: 'Happy birthday to me! Thank you all for the wishes, today was absolutely amazing! So many gifts and flowers~', time: 'Yesterday', likes: 56, comments: 15, shares: 3 },
    post7: { author: 'Hunter', content: 'New gym opened today, first day was incredible! Definitely coming back every day! Let\'s go!', time: 'Yesterday', likes: 14, comments: 4, shares: 1 },
    post8: { author: 'Jing', content: 'Sharing an amazing song 🎵, been on repeat all day! You guys have to check it out~', time: '2 days ago', likes: 21, comments: 6, shares: 8 },
  },

  // AI Chat page
  ai: {
    title: 'AI Assistant',
    normalAssistant: 'General',
    knowledgeExpert: 'Expert',
    angryAssistant: 'Strict',
    funnyAssistant: 'Funny',
    deepThink: 'Deep Think',
    webSearch: 'Web Search',
    inputPlaceholder: 'Type your message...',
    imagePlaceholder: 'Add description (optional)',
    describeImage: 'Describe this image',
    thinkingTitle: '🤔 Thinking Process',
    searchTitle: '🔍 Web Search',
    answerTitle: '💡 Answer',
  },

  // Settings page
  settings: {
    title: 'Me',
    nickname: 'Happy Youth',
    bio: 'Living life to the fullest',
    friends: 'Friends',
    posts: 'Posts',
    likes: 'Likes',
    profile: 'Profile',
    profileDesc: 'Edit avatar, nickname, bio',
    privacy: 'Privacy',
    privacyDesc: 'Manage privacy and security',
    notifications: 'Notifications',
    notificationsDesc: 'Message alerts and push settings',
    theme: 'Appearance',
    themeDesc: 'Toggle light/dark mode and colors',
    chatHistory: 'Chat History',
    chatHistoryDesc: 'Backup and restore chat data',
    help: 'Help & Feedback',
    helpDesc: 'FAQ and feedback',
    about: 'About',
    aboutDesc: 'Version info and team',
    language: 'Language',
    languageDesc: 'Switch 中文 / English',
    logout: 'Log Out',
    logoutConfirm: 'Are you sure you want to log out?',
    version: 'AI Chat v1.0.0',
  },

  // Theme settings page
  theme: {
    title: 'Appearance',
    mode: 'Mode',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    palette: 'Theme Color',
    preview: 'Preview',
    tabPreview: 'Tab Bar Preview',
    previewTitle: 'Sample Page Title',
    previewName: 'Nickname',
    previewSub: 'This is a secondary text preview',
    previewBtn: 'Theme Button',
    previewBtnOutline: 'Outline Button',
    palettes: {
      teal: 'Teal',
      purple: 'Purple',
      pink: 'Pink',
      blue: 'Blue',
      orange: 'Orange',
      green: 'Green',
    },
  },

  // Language switch
  language: {
    title: 'Language',
    chinese: '中文',
    english: 'English',
    current: 'Current language',
  },
};
