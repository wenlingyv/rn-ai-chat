const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const messageService = require('../services/messageService');

const router = express.Router();

router.use(authenticateToken);

router.post('/send', async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) {
      return res.status(400).json({ success: false, message: 'receiverId and content are required' });
    }
    const result = await messageService.sendMessage(req.user.id, receiverId, content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/history/:friendId', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const result = await messageService.getChatHistory(req.user.id, req.params.friendId, parseInt(limit) || 50, parseInt(offset) || 0);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const result = await messageService.getConversations(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/read/:friendId', async (req, res) => {
  try {
    const result = await messageService.markAsRead(req.user.id, req.params.friendId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const result = await messageService.getUnreadCount(req.user.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
