const pool = require('../database');

const sendMessage = async (senderId, receiverId, content) => {
  try {
    const friendship = await pool.query(
      `SELECT id FROM friendships
       WHERE ((requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1))
       AND status = 'accepted'`,
      [senderId, receiverId]
    );

    if (friendship.rows.length === 0) {
      return { success: false, message: '只能给好友发送消息' };
    }

    const result = await pool.query(
      `INSERT INTO private_messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, receiver_id, content, is_read, created_at`,
      [senderId, receiverId, content]
    );

    return { success: true, data: result.rows[0] };
  } catch (error) {
    return { success: false, message: '发送消息失败：' + error.message };
  }
};

const getChatHistory = async (userId1, userId2, limit = 50, offset = 0) => {
  try {
    const result = await pool.query(
      `SELECT id, sender_id, receiver_id, content, is_read, created_at
       FROM private_messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId1, userId2, limit, offset]
    );

    return { success: true, data: result.rows.reverse() };
  } catch (error) {
    return { success: false, message: '获取聊天记录失败：' + error.message };
  }
};

const getConversations = async (userId) => {
  try {
    const friends = await pool.query(
      `SELECT
         f.id AS friendship_id,
         u.id AS friend_id, u.username, u.nickname, u.avatar
       FROM friendships f
       JOIN users u ON (
         (f.requester_id = $1 AND f.addressee_id = u.id) OR
         (f.addressee_id = $1 AND f.requester_id = u.id)
       )
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'`,
      [userId]
    );

    const conversations = [];

    for (const friend of friends.rows) {
      const lastMsg = await pool.query(
        `SELECT id, sender_id, receiver_id, content, is_read, created_at
         FROM private_messages
         WHERE (sender_id = $1 AND receiver_id = $2)
            OR (sender_id = $2 AND receiver_id = $1)
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, friend.friend_id]
      );

      const unreadResult = await pool.query(
        `SELECT COUNT(*) AS unread_count
         FROM private_messages
         WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
        [friend.friend_id, userId]
      );

      conversations.push({
        friendship_id: friend.friendship_id,
        friend_id: friend.friend_id,
        username: friend.username,
        nickname: friend.nickname,
        avatar: friend.avatar,
        last_message: lastMsg.rows.length > 0 ? lastMsg.rows[0] : null,
        unread_count: parseInt(unreadResult.rows[0].unread_count, 10)
      });
    }

    conversations.sort((a, b) => {
      const timeA = a.last_message ? new Date(a.last_message.created_at).getTime() : 0;
      const timeB = b.last_message ? new Date(b.last_message.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return { success: true, data: conversations };
  } catch (error) {
    return { success: false, message: '获取会话列表失败：' + error.message };
  }
};

const markAsRead = async (userId, friendId) => {
  try {
    await pool.query(
      `UPDATE private_messages
       SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [friendId, userId]
    );

    return { success: true, message: '已标记为已读' };
  } catch (error) {
    return { success: false, message: '标记已读失败：' + error.message };
  }
};

const getUnreadCount = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM private_messages
       WHERE receiver_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return { success: true, data: { unread_count: parseInt(result.rows[0].unread_count, 10) } };
  } catch (error) {
    return { success: false, message: '获取未读消息数失败：' + error.message };
  }
};

module.exports = {
  sendMessage,
  getChatHistory,
  getConversations,
  markAsRead,
  getUnreadCount
};
