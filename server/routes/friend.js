const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const friendService = require('../services/friendService');
const { sendToUser } = require('../websocket');
const pool = require('../database');

const router = express.Router();

router.use(authenticateToken);

router.post('/request', async (req, res) => {
  try {
    const { addresseeId } = req.body;
    if (!addresseeId) {
      return res.status(400).json({ success: false, message: 'addresseeId is required' });
    }
    const result = await friendService.sendFriendRequest(req.user.id, addresseeId);
    if (result.success) {
      sendToUser(String(addresseeId), {
        type: 'friend_request',
        fromUserId: req.user.id,
        fromUsername: req.user.username
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/accept/:id', async (req, res) => {
  try {
    const friendshipId = parseInt(req.params.id);
    const result = await friendService.acceptFriendRequest(friendshipId, req.user.id);
    if (result.success) {
      // 通知申请者好友请求已被接受
      const friendshipResult = await pool.query(
        `SELECT requester_id, addressee_id FROM friendships WHERE id = $1`,
        [friendshipId]
      );
      if (friendshipResult.rows.length > 0) {
        const friendship = friendshipResult.rows[0];
        const requesterId = String(friendship.requester_id);
        sendToUser(requesterId, {
          type: 'friend_accepted',
          fromUserId: req.user.id
        });
      }
      // 通知接受者刷新列表
      sendToUser(String(req.user.id), {
        type: 'friend_accepted'
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/reject/:id', async (req, res) => {
  try {
    const friendshipId = parseInt(req.params.id);
    const result = await friendService.rejectFriendRequest(friendshipId, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/list', async (req, res) => {
  try {
    const result = await friendService.getFriendList(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/pending', async (req, res) => {
  try {
    const result = await friendService.getPendingRequests(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    console.log(`🔍 搜索用户: keyword="${keyword}", userId=${req.user.id}`);
    if (!keyword) {
      return res.status(400).json({ success: false, message: 'keyword is required' });
    }
    const result = await friendService.searchUsers(keyword, req.user.id);
    console.log(`🔍 搜索结果: 找到${result.data ? result.data.length : 0}个用户`);
    res.json(result);
  } catch (err) {
    console.error('🔍 搜索错误:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const friendshipId = parseInt(req.params.id);
    const result = await friendService.deleteFriend(friendshipId, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
