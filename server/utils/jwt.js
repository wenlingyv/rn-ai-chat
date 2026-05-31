const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT配置
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'your_access_token_secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret';
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.REFRESH_TOKEN_EXPIRES || '7d';

/**
 * 生成Access Token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES
  });
};

/**
 * 生成Refresh Token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES
  });
};

/**
 * 验证Access Token
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

/**
 * 验证Refresh Token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * 生成安全的refresh token hash
 */
const generateRefreshTokenHash = (token) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .createHmac('sha256', salt)
    .update(token)
    .digest('hex');
  return { salt, hash };
};

/**
 * 验证refresh token hash
 */
const verifyRefreshTokenHash = (token, storedHash, storedSalt) => {
  const hash = crypto
    .createHmac('sha256', storedSalt)
    .update(token)
    .digest('hex');
  return hash === storedHash;
};

/**
 * 从token中提取payload
 */
const decodeToken = (token) => {
  return jwt.decode(token, { complete: true });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateRefreshTokenHash,
  verifyRefreshTokenHash,
  decodeToken
};