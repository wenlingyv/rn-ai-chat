const crypto = require('crypto');

/**
 * 验证码服务
 * 目前使用模拟实现，生产环境需要接入真实的短信服务
 */

// 配置
const CODE_EXPIRE_MINUTES = 5;
const MAX_DAILY_ATTEMPTS = 10;

/**
 * 生成6位数字验证码
 */
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 验证手机号格式
 */
const validatePhone = (phone) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 检查是否可以发送验证码
 */
const canSendCode = async (phone, pool) => {
  // 检查今日发送次数
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM verification_codes
     WHERE phone = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'`,
    [phone]
  );

  const todayCount = parseInt(result.rows[0].count);
  if (todayCount >= MAX_DAILY_ATTEMPTS) {
    throw new Error(`今日验证码发送次数已达上限（${MAX_DAILY_ATTEMPTS}次）`);
  }

  // 检查60秒内是否已发送
  const recentResult = await pool.query(
    `SELECT COUNT(*) as count FROM verification_codes
     WHERE phone = $1 AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute'`,
    [phone]
  );

  const recentCount = parseInt(recentResult.rows[0].count);
  if (recentCount > 0) {
    throw new Error('验证码发送过于频繁，请稍后再试');
  }

  return true;
};

/**
 * 保存验证码到数据库
 */
const saveCode = async (phone, code, pool) => {
  await pool.query(
    `INSERT INTO verification_codes (phone, code, expires_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '${CODE_EXPIRE_MINUTES} minutes')`,
    [phone, code]
  );
};

/**
 * 验证验证码
 */
const verifyCode = async (phone, code, pool) => {
  const result = await pool.query(
    `SELECT * FROM verification_codes
     WHERE phone = $1 AND code = $2 AND expires_at > CURRENT_TIMESTAMP
     ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
    [phone, code]
  );

  if (result.rows.length === 0) {
    throw new Error('验证码错误或已过期');
  }

  // 增加尝试次数
  await pool.query(
    `UPDATE verification_codes SET attempts = attempts + 1 WHERE id = $1`,
    [result.rows[0].id]
  );

  return result.rows[0];
};

/**
 * 模拟发送验证码（实际项目中接入真实短信服务）
 * 推荐的短信服务：
 * - 阿里云短信服务
 * - 腾讯云短信服务
 * - Twilio（国际）
 * - SendGrid
 */
const sendVerificationCode = async (phone, pool) => {
  try {
    // 验证手机号格式
    if (!validatePhone(phone)) {
      throw new Error('手机号格式不正确');
    }

    // 检查发送频率
    await canSendCode(phone, pool);

    // 生成验证码
    const code = generateCode();

    // 保存验证码
    await saveCode(phone, code, pool);

    // 模拟发送短信（实际项目中替换为真实的API调用）
    console.log(`📱 向 ${phone} 发送验证码: ${code}`);

    // 这里可以接入真实的短信服务，例如：
    // const smsResult = await axios.post('https://sms.aliyuncs.com/', {
    //   Phone: phone,
    //   Code: code
    // }, {
    //   headers: {
    //     'Authorization': `Bearer ${process.env.SMS_API_KEY}`
    //   }
    // });

    return {
      success: true,
      message: '验证码已发送',
      code: code // 仅用于调试，生产环境应移除
    };
  } catch (error) {
    console.error('发送验证码失败:', error.message);
    throw error;
  }
};

/**
 * 清理过期验证码
 */
const cleanupExpiredCodes = async (pool) => {
  await pool.query(
    'DELETE FROM verification_codes WHERE expires_at < CURRENT_TIMESTAMP'
  );
};

module.exports = {
  generateCode,
  validatePhone,
  sendVerificationCode,
  verifyCode,
  cleanupExpiredCodes
};