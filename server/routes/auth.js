const express = require('express');
const router = express.Router();
const pool = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { rateLimitVerification, rateLimitLogin } = require('../middleware/rateLimiter');
const { registerUser, loginUser, refreshAccessToken, logoutUser, getUserProfile, updateUserProfile } = require('../services/authService');
const { sendVerificationCode } = require('../services/smsService');

/**
 * 发送验证码
 */
router.post('/send-code', rateLimitVerification, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: '手机号不能为空'
      });
    }

    // 发送验证码
    const result = await sendVerificationCode(phone, pool);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Send code error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 用户注册
 */
router.post('/register', rateLimitLogin, async (req, res) => {
  try {
    const { username, password, nickname } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const result = await registerUser(username, password, nickname);

    res.json(result);
  } catch (error) {
    console.error('Register error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 用户登录
 */
router.post('/login', rateLimitLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: '用户名和密码不能为空'
      });
    }

    const result = await loginUser(username, password);

    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 刷新Access Token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const result = await refreshAccessToken(refreshToken);

    res.json(result);
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).json({
      success: false,
      message: 'Invalid or expired refresh token'
    });
  }
});

/**
 * 用户登出
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.user.sessionId;

    const result = await logoutUser(userId, sessionId);

    res.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      success: true
    });
  }
});

/**
 * 获取用户信息
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const result = await getUserProfile(req.user.id);

    res.json(result);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 更新用户信息
 */
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { nickname, avatar } = req.body;
    const userId = req.user.id;

    const result = await updateUserProfile(userId, { nickname, avatar });

    res.json(result);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;