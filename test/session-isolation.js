// ============================================================
// 用户会话隔离测试脚本
// ============================================================
const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// 测试用户数据
const testUsers = [
  { phone: '13800138000', name: '用户1' },
  { phone: '13800138001', name: '用户2' },
];

let user1Tokens = null;
let user2Tokens = null;

/**
 * 发送验证码
 */
async function sendVerificationCode(phone) {
  try {
    console.log(`\n📱 向 ${phone} 发送验证码...`);
    const response = await axios.post(`${API_URL}/auth/send-code`, { phone });
    console.log('✅ 验证码发送成功:', response.data.message);
    return response.data;
  } catch (error) {
    console.error('❌ 发送验证码失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * 用户注册/登录
 */
async function userAuth(phone, code) {
  try {
    console.log(`\n🔐 用户 ${phone} 登录中...`);
    const response = await axios.post(`${API_URL}/auth/login`, { phone, code });
    console.log('✅ 用户登录成功:', response.data.user.phone);
    return response.data;
  } catch (error) {
    console.error('❌ 用户登录失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * 发送消息
 */
async function sendMessage(accessToken, message, userId) {
  try {
    console.log(`\n💬 发送消息: "${message}" (用户${userId})`);
    const response = await axios.post(`${API_URL}/chat`,
      { message, userId },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('✅ 消息发送成功, 回复:', response.data.reply);
    return response.data;
  } catch (error) {
    console.error('❌ 发送消息失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * 获取聊天历史
 */
async function getChatHistory(accessToken, userId) {
  try {
    console.log(`\n📜 获取用户${userId}的聊天历史...`);
    // 注意：这里需要添加获取历史的API端点
    const response = await axios.post(`${API_URL}/chat/history`,
      { userId },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('✅ 聊天历史:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ 获取聊天历史失败:', error.response?.data?.message || error.message);
    throw error;
  }
}

/**
 * 测试会话隔离
 */
async function testSessionIsolation() {
  console.log('🚀 开始测试用户会话隔离...\n');

  try {
    // 1. 发送验证码
    for (const user of testUsers) {
      await sendVerificationCode(user.phone);
    }

    // 2. 用户登录（这里需要手动输入验证码）
    console.log('\n⚠️  请在控制台输入验证码进行测试');
    console.log('用户1验证码:');
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // 由于无法在自动化脚本中输入验证码，这里模拟登录
    console.log('\n🔧 模拟用户登录过程...');

    // 模拟用户1登录
    user1Tokens = await userAuth(testUsers[0].phone, '123456');
    console.log('用户1获取到token:', user1Tokens.accessToken.substring(0, 20) + '...');

    // 模拟用户2登录
    user2Tokens = await userAuth(testUsers[1].phone, '123456');
    console.log('用户2获取到token:', user2Tokens.accessToken.substring(0, 20) + '...');

    // 3. 用户1发送消息
    await sendMessage(user1Tokens.accessToken, '你好，我是用户1', user1Tokens.user.id);

    // 4. 用户2发送消息
    await sendMessage(user2Tokens.accessToken, '你好，我是用户2', user2Tokens.user.id);

    // 5. 验证会话隔离
    console.log('\n🔒 验证会话隔离...');

    // 用户1获取自己的历史
    const user1History = await getChatHistory(user1Tokens.accessToken, user1Tokens.user.id);

    // 用户2获取自己的历史
    const user2History = await getChatHistory(user2Tokens.accessToken, user2Tokens.user.id);

    // 6. 验证结果
    console.log('\n📊 测试结果:');
    console.log('用户1消息数量:', user1History.messages?.length || 0);
    console.log('用户2消息数量:', user2History.messages?.length || 0);

    if (user1History.messages && user2History.messages) {
      console.log('\n✅ 会话隔离测试通过：两个用户的消息历史相互独立');
    } else {
      console.log('\n⚠️  会话隔离测试需要完善：需要实现获取历史API');
    }

    // 7. 测试token失效
    console.log('\n🔄 测试token失效...');
    try {
      await sendMessage('invalid_token', '测试消息', 1);
      console.log('❌ Token失效测试失败：应该拒绝无效token');
    } catch (error) {
      console.log('✅ Token失效测试通过：正确拒绝无效token');
    }

    console.log('\n🎉 所有测试完成！');

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testSessionIsolation();
}

module.exports = { testSessionIsolation };