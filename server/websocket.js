const WebSocket = require('ws');
const url = require('url');
const { verifyAccessToken } = require('./utils/jwt');
const pool = require('./database');

const onlineUsers = new Map();

let realtimeHandler = null;

function setRealtimeHandler(handler) {
  realtimeHandler = handler;
}

function initWebSocket(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    
    if (pathname === '/api/realtime/ws') {
      if (realtimeHandler) {
        realtimeHandler(request, socket, head);
      } else {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
      }
      return;
    }

    const params = new URL(request.url, `http://${request.headers.host}`).searchParams;
    const token = params.get('token');

    if (!token) {
      console.log('❌ WebSocket 连接被拒绝：没有 token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
      console.log('✅ WebSocket token 验证成功：', decoded);
    } catch (e) {
      console.log('❌ WebSocket token 验证失败：', e.message);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const userId = String(decoded.userId);

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.userId = userId;
      wss.emit('connection', ws, request);
    });
  });

  wss.on('connection', (ws) => {
    const userId = ws.userId;

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(ws);

    console.log(`🔌 用户 ${userId} 已连接，当前在线: ${Array.from(onlineUsers.keys())}`);

    ws.on('message', async (raw) => {
      try {
        const data = JSON.parse(raw);
        console.log(`📨 收到用户 ${userId} 的 WebSocket 消息:`, data);

        switch (data.type) {
          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }

          case 'chat': {
            const { senderId, receiverId, content } = data;

            if (!senderId || !receiverId || !content) {
              ws.send(JSON.stringify({ type: 'error', message: '缺少必要字段' }));
              return;
            }

            if (String(senderId) !== userId) {
              ws.send(JSON.stringify({ type: 'error', message: '发送者身份不匹配' }));
              return;
            }

            const result = await pool.query(
              `INSERT INTO private_messages (sender_id, receiver_id, content)
               VALUES ($1, $2, $3)
               RETURNING id, created_at`,
              [senderId, receiverId, content]
            );

            const messageId = result.rows[0].id;
            const createdAt = result.rows[0].created_at;

            const chatMessage = {
              type: 'chat',
              id: messageId,
              senderId,
              receiverId,
              content,
              createdAt
            };

            console.log(`📤 发送消息给用户 ${receiverId} (在线: ${onlineUsers.has(String(receiverId))})`);
            const sent = sendToUser(receiverId, chatMessage);
            console.log(`📤 消息推送结果: ${sent ? '成功' : '失败（用户不在线）'}`);

            ws.send(JSON.stringify({
              type: 'chat_sent',
              id: messageId,
              createdAt,
              receiverId,
              senderId,
              content
            }));

            break;
          }

          case 'read': {
            const { friendId } = data;

            if (!friendId) {
              ws.send(JSON.stringify({ type: 'error', message: '缺少 friendId' }));
              return;
            }

            await pool.query(
              `UPDATE private_messages
               SET is_read = true
               WHERE sender_id = $1 AND receiver_id = $2 AND is_read = false`,
              [friendId, userId]
            );

            sendToUser(friendId, {
              type: 'read',
              readBy: userId,
              friendId
            });

            break;
          }

          case 'friend_request': {
            const { toUserId } = data;

            if (!toUserId) {
              ws.send(JSON.stringify({ type: 'error', message: '缺少 toUserId' }));
              return;
            }

            sendToUser(toUserId, {
              type: 'friend_request',
              fromUserId: userId
            });

            break;
          }

          case 'friend_accepted': {
            const { toUserId } = data;

            if (!toUserId) {
              ws.send(JSON.stringify({ type: 'error', message: '缺少 toUserId' }));
              return;
            }

            sendToUser(toUserId, {
              type: 'friend_accepted',
              fromUserId: userId
            });

            break;
          }

          default:
            ws.send(JSON.stringify({ type: 'error', message: `未知消息类型: ${data.type}` }));
        }
      } catch (e) {
        console.error('❌ WebSocket 消息处理错误:', e.message);
        ws.send(JSON.stringify({ type: 'error', message: '消息处理失败' }));
      }
    });

    ws.on('close', () => {
      const connections = onlineUsers.get(userId);
      if (connections) {
        connections.delete(ws);
        if (connections.size === 0) {
          onlineUsers.delete(userId);
        }
      }
      console.log(`🔌 用户 ${userId} 已断开，当前在线: ${Array.from(onlineUsers.keys())}`);
    });

    ws.on('error', (err) => {
      console.error(`❌ 用户 ${userId} WebSocket 错误:`, err.message);
    });
  });

  console.log('✅ WebSocket 服务已初始化');
}

function getOnlineUsers() {
  return new Set(onlineUsers.keys());
}

function sendToUser(userId, data) {
  const strUserId = String(userId);
  const connections = onlineUsers.get(strUserId);
  if (!connections) return false;

  const message = JSON.stringify(data);
  let sent = false;

  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
      sent = true;
    }
  }

  return sent;
}

module.exports = {
  initWebSocket,
  getOnlineUsers,
  sendToUser,
  setRealtimeHandler
};
