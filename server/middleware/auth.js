const { verifyAccessToken } = require('../utils/jwt');
const pool = require('../database');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Access token已过期', code: 'TOKEN_EXPIRED' });
    }

    const sessionResult = await pool.query(
      `SELECT s.*, u.phone, u.username, u.nickname FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.session_id = $1 AND s.user_id = $2 AND s.is_revoked = false
       AND s.expires_at > CURRENT_TIMESTAMP`,
      [decoded.sessionId, decoded.userId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Session已失效，请重新登录', code: 'SESSION_INVALID' });
    }

    await pool.query(
      'UPDATE user_sessions SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
      [sessionResult.rows[0].id]
    );

    req.user = {
      id: decoded.userId,
      phone: sessionResult.rows[0].phone,
      username: sessionResult.rows[0].username,
      nickname: sessionResult.rows[0].nickname,
      sessionId: decoded.sessionId
    };

    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = verifyAccessToken(token);

        const sessionResult = await pool.query(
          `SELECT s.*, u.phone, u.username, u.nickname FROM user_sessions s
           JOIN users u ON s.user_id = u.id
           WHERE s.session_id = $1 AND s.user_id = $2 AND s.is_revoked = false
           AND s.expires_at > CURRENT_TIMESTAMP`,
          [decoded.sessionId, decoded.userId]
        );

        if (sessionResult.rows.length > 0) {
          req.user = {
            id: decoded.userId,
            phone: sessionResult.rows[0].phone,
            username: sessionResult.rows[0].username,
            nickname: sessionResult.rows[0].nickname,
            sessionId: decoded.sessionId
          };
        }
      } catch (e) {
      }
    }

    next();
  } catch (error) {
    next();
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole
};
