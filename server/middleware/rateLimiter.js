const pool = require('../database');

/**
 * 创建简单的内存限流器（生产环境建议使用Redis）
 */
const rateLimitStore = new Map();

/**
 * 验证码发送频率限制
 * - 同一手机号1分钟内只能发送1次
 * - 同一手机号每天最多10次
 */
const rateLimitVerification = async (req, res, next) => {
  const phone = req.body.phone;
  if (!phone) return next();

  const now = Date.now();
  const oneMinute = 60 * 1000;
  const oneDay = 24 * 60 * 60 * 1000;

  // 清理过期记录
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.timestamp > oneDay) {
      rateLimitStore.delete(key);
    }
  }

  const key = `verification:${phone}`;
  const data = rateLimitStore.get(key);

  // 检查1分钟限制
  if (data && now - data.timestamp < oneMinute) {
    return res.status(429).json({
      success: false,
      message: '验证码发送过于频繁，请稍后再试',
      retryAfter: Math.ceil((oneMinute - (now - data.timestamp)) / 1000)
    });
  }

  // 检查日限制
  if (data && data.count >= 10) {
    return res.status(429).json({
      success: false,
      message: '今日验证码发送次数已达上限',
      retryAfter: 86400 - Math.floor((now - data.timestamp) / 1000)
    });
  }

  // 更新计数
  if (!data) {
    rateLimitStore.set(key, { count: 1, timestamp: now });
  } else {
    data.count++;
    data.timestamp = now;
    rateLimitStore.set(key, data);
  }

  next();
};

/**
 * 登录尝试限制
 * - 同一IP每分钟最多5次尝试
 * - 同一手机号每分钟最多3次尝试
 */
const rateLimitLogin = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const phone = req.body.phone;

  const now = Date.now();
  const oneMinute = 60 * 1000;

  // 检查IP限制
  const ipKey = `login:ip:${ip}`;
  const ipData = rateLimitStore.get(ipKey);

  if (ipData && now - ipData.timestamp < oneMinute) {
    if (ipData.count >= 5) {
      return res.status(429).json({
        success: false,
        message: '登录尝试过于频繁，请稍后再试',
        retryAfter: Math.ceil((oneMinute - (now - ipData.timestamp)) / 1000)
      });
    }
  }

  // 检查手机号限制
  if (phone) {
    const phoneKey = `login:phone:${phone}`;
    const phoneData = rateLimitStore.get(phoneKey);

    if (phoneData && now - phoneData.timestamp < oneMinute) {
      if (phoneData.count >= 3) {
        return res.status(429).json({
          success: false,
          message: '登录尝试过于频繁，请稍后再试',
          retryAfter: Math.ceil((oneMinute - (now - phoneData.timestamp)) / 1000)
        });
      }
    }
  }

  next();
};

/**
 * API请求限制
 * - 每分钟最多60次请求
 */
const rateLimitAPI = async (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const oneMinute = 60 * 1000;

  const key = `api:${ip}`;
  const data = rateLimitStore.get(key);

  if (data && now - data.timestamp < oneMinute) {
    if (data.count >= 60) {
      return res.status(429).json({
        success: false,
        message: 'API请求过于频繁，请稍后再试',
        retryAfter: Math.ceil((oneMinute - (now - data.timestamp)) / 1000)
      });
    }
    data.count++;
  } else {
    rateLimitStore.set(key, { count: 1, timestamp: now });
  }

  next();
};

// 清理定时器（每小时清理一次）
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.timestamp > oneHour) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

module.exports = {
  rateLimitVerification,
  rateLimitLogin,
  rateLimitAPI
};