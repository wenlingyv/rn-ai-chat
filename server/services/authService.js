const bcrypt = require('bcryptjs');
const {
  generateAccessToken,
  generateRefreshToken,
  generateRefreshTokenHash,
  verifyRefreshTokenHash,
  verifyRefreshToken
} = require('../utils/jwt');
const pool = require('../database');

const registerUser = async (username, password, nickname = null) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const usernameCheck = await client.query(
      'SELECT id FROM users WHERE username = $1 FOR UPDATE',
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      throw new Error('该用户名已被注册');
    }

    if (!nickname) {
      nickname = `用户${Date.now().toString().slice(-4)}`;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (username, password, nickname)
       VALUES ($1, $2, $3)
       RETURNING id, username, nickname`,
      [username, hashedPassword, nickname]
    );

    const user = userResult.rows[0];

    const sessionId = `session_${user.id}_${Date.now()}`;
    const accessToken = generateAccessToken({
      userId: user.id,
      sessionId: sessionId,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: sessionId,
    });

    const { salt, hash } = generateRefreshTokenHash(refreshToken);

    await client.query(
      `INSERT INTO user_sessions (user_id, session_id, refresh_token_hash, refresh_token_salt, access_token_version, expires_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [user.id, sessionId, hash, salt, 1]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname
        }
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const loginUser = async (username, password) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT id, username, nickname, password FROM users WHERE username = $1',
      [username]
    );

    if (userResult.rows.length === 0) {
      throw new Error('用户不存在，请先注册');
    }

    const user = userResult.rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('密码错误');
    }

    await client.query(
      'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1 AND is_revoked = false',
      [user.id]
    );

    const sessionId = `session_${user.id}_${Date.now()}`;
    const accessToken = generateAccessToken({
      userId: user.id,
      sessionId: sessionId,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      sessionId: sessionId,
    });

    const { salt, hash } = generateRefreshTokenHash(refreshToken);

    await client.query(
      `INSERT INTO user_sessions (user_id, session_id, refresh_token_hash, refresh_token_salt, access_token_version, expires_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [user.id, sessionId, hash, salt, 1]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname
        }
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const refreshAccessToken = async (oldRefreshToken) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let decoded;
    try {
      decoded = verifyRefreshToken(oldRefreshToken);
    } catch (e) {
      throw new Error('Refresh token已过期，请重新登录');
    }

    const sessionResult = await client.query(
      `SELECT s.*, u.username, u.nickname FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_id = $1 AND s.user_id = $2 AND s.is_revoked = false
       AND s.expires_at > CURRENT_TIMESTAMP`,
      [decoded.sessionId, decoded.userId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session已失效，请重新登录');
    }

    const session = sessionResult.rows[0];

    const isValid = verifyRefreshTokenHash(
      oldRefreshToken,
      session.refresh_token_hash,
      session.refresh_token_salt
    );
    if (!isValid) {
      await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE id = $1',
        [session.id]
      );
      await client.query('COMMIT');
      throw new Error('Refresh token无效，请重新登录');
    }

    await client.query(
      'UPDATE user_sessions SET is_revoked = true WHERE id = $1',
      [session.id]
    );

    const newSessionId = `session_${decoded.userId}_${Date.now()}`;
    const newAccessToken = generateAccessToken({
      userId: decoded.userId,
      sessionId: newSessionId,
    });
    const newRefreshToken = generateRefreshToken({
      userId: decoded.userId,
      sessionId: newSessionId,
    });

    const { salt, hash } = generateRefreshTokenHash(newRefreshToken);

    await client.query(
      `INSERT INTO user_sessions (user_id, session_id, refresh_token_hash, refresh_token_salt, access_token_version, expires_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [decoded.userId, newSessionId, hash, salt, 1]
    );

    await client.query('COMMIT');

    return {
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: decoded.userId,
          username: session.username,
          nickname: session.nickname
        }
      }
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const logoutUser = async (userId, sessionId) => {
  const client = await pool.connect();

  try {
    if (sessionId) {
      await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1 AND session_id = $2',
        [userId, sessionId]
      );
    } else {
      await client.query(
        'UPDATE user_sessions SET is_revoked = true WHERE user_id = $1',
        [userId]
      );
    }

    return {
      success: true
    };
  } catch (error) {
    return {
      success: true
    };
  } finally {
    client.release();
  }
};

const getUserProfile = async (userId) => {
  const result = await pool.query(
    'SELECT id, username, nickname, avatar, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return {
    success: true,
    data: result.rows[0]
  };
};

const updateUserProfile = async (userId, updates) => {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
  }

  if (fields.length === 0) {
    throw new Error('No updates provided');
  }

  values.push(userId);

  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex} RETURNING id, username, nickname, avatar`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return {
    success: true,
    data: result.rows[0]
  };
};

module.exports = {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  getUserProfile,
  updateUserProfile
};
