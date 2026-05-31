const pool = require('../database');

const sendFriendRequest = async (requesterId, addresseeId) => {
  try {
    if (requesterId === addresseeId) {
      return { success: false, message: '不能添加自己为好友' };
    }

    const existing = await pool.query(
      `SELECT id, requester_id, addressee_id, status FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [requesterId, addresseeId]
    );

    if (existing.rows.length > 0) {
      const friendship = existing.rows[0];

      if (friendship.status === 'accepted') {
        return { success: false, message: '你们已经是好友了' };
      }

      if (friendship.status === 'pending' && friendship.requester_id === requesterId) {
        return { success: false, message: '已经发送过好友申请，请等待对方确认' };
      }

      if (friendship.status === 'pending' && friendship.addressee_id === requesterId) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(
            `UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [friendship.id]
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
        return { success: true, message: '对方已向你发送过申请，已自动通过', data: { friendshipId: friendship.id } };
      }

      if (friendship.status === 'rejected') {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          await client.query(
            `UPDATE friendships SET requester_id = $1, addressee_id = $2, status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
            [requesterId, addresseeId, friendship.id]
          );
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
        return { success: true, message: '好友申请已发送', data: { friendshipId: friendship.id } };
      }
    }

    const result = await pool.query(
      `INSERT INTO friendships (requester_id, addressee_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id`,
      [requesterId, addresseeId]
    );

    return { success: true, message: '好友申请已发送', data: { friendshipId: result.rows[0].id } };
  } catch (error) {
    return { success: false, message: '发送好友申请失败：' + error.message };
  }
};

const acceptFriendRequest = async (friendshipId, userId) => {
  try {
    const result = await pool.query(
      `SELECT id, addressee_id, status FROM friendships WHERE id = $1`,
      [friendshipId]
    );

    if (result.rows.length === 0) {
      return { success: false, message: '好友申请不存在' };
    }

    const friendship = result.rows[0];

    if (friendship.addressee_id !== userId) {
      return { success: false, message: '无权操作此好友申请' };
    }

    if (friendship.status !== 'pending') {
      return { success: false, message: '该好友申请已处理' };
    }

    await pool.query(
      `UPDATE friendships SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [friendshipId]
    );

    return { success: true, message: '已同意好友申请' };
  } catch (error) {
    return { success: false, message: '同意好友申请失败：' + error.message };
  }
};

const rejectFriendRequest = async (friendshipId, userId) => {
  try {
    const result = await pool.query(
      `SELECT id, addressee_id, status FROM friendships WHERE id = $1`,
      [friendshipId]
    );

    if (result.rows.length === 0) {
      return { success: false, message: '好友申请不存在' };
    }

    const friendship = result.rows[0];

    if (friendship.addressee_id !== userId) {
      return { success: false, message: '无权操作此好友申请' };
    }

    if (friendship.status !== 'pending') {
      return { success: false, message: '该好友申请已处理' };
    }

    await pool.query(
      `UPDATE friendships SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [friendshipId]
    );

    return { success: true, message: '已拒绝好友申请' };
  } catch (error) {
    return { success: false, message: '拒绝好友申请失败：' + error.message };
  }
};

const getFriendList = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT
         f.id AS friendship_id,
         u.id, u.username, u.nickname, u.avatar
       FROM friendships f
       JOIN users u ON (
         (f.requester_id = $1 AND f.addressee_id = u.id) OR
         (f.addressee_id = $1 AND f.requester_id = u.id)
       )
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'
       ORDER BY u.nickname, u.username`,
      [userId]
    );

    return { success: true, data: result.rows };
  } catch (error) {
    return { success: false, message: '获取好友列表失败：' + error.message };
  }
};

const getPendingRequests = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT
         f.id AS friendship_id,
         f.created_at,
         u.id AS requester_id, u.username, u.nickname, u.avatar
       FROM friendships f
       JOIN users u ON f.requester_id = u.id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       ORDER BY f.created_at DESC`,
      [userId]
    );

    return { success: true, data: result.rows };
  } catch (error) {
    return { success: false, message: '获取待处理申请失败：' + error.message };
  }
};

const searchUsers = async (keyword, currentUserId) => {
  try {
    const result = await pool.query(
      `SELECT id, username, nickname, avatar
       FROM users
       WHERE (username ILIKE $1 OR nickname ILIKE $1)
         AND id != $2
       ORDER BY username
       LIMIT 20`,
      [`%${keyword}%`, currentUserId]
    );

    return { success: true, data: result.rows };
  } catch (error) {
    return { success: false, message: '搜索用户失败：' + error.message };
  }
};

const deleteFriend = async (friendshipId, userId) => {
  try {
    const result = await pool.query(
      `SELECT id, requester_id, addressee_id, status FROM friendships WHERE id = $1`,
      [friendshipId]
    );

    if (result.rows.length === 0) {
      return { success: false, message: '好友关系不存在' };
    }

    const friendship = result.rows[0];

    if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
      return { success: false, message: '无权操作此好友关系' };
    }

    if (friendship.status !== 'accepted') {
      return { success: false, message: '两人不是好友关系' };
    }

    await pool.query(
      `UPDATE friendships SET status = 'rejected', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [friendshipId]
    );

    return { success: true, message: '已删除好友' };
  } catch (error) {
    return { success: false, message: '删除好友失败：' + error.message };
  }
};

module.exports = {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendList,
  getPendingRequests,
  searchUsers,
  deleteFriend
};
