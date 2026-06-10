const users = [];
const userSessions = [];
const friendships = [];
const chatHistory = [];
const messages = [];

let userIdCounter = 1;
let sessionIdCounter = 1;
let friendshipIdCounter = 1;
let messageIdCounter = 1;
let chatHistoryIdCounter = 1;

function ilikeMatch(str, pattern) {
  if (!str || !pattern) return false;
  // 将 SQL ILIKE 模式（%keyword%）转为正则
  const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
  return regex.test(str);
}

class MemoryPool {
  query = async (sqlRaw, params) => {
    // 标准化 SQL：trim + lowercase + 合并空白
    const sql = sqlRaw.trim().toLowerCase().replace(/\s+/g, ' ');

    // ---- 调试日志 ----
    if (sql.includes('ilike') || sql.includes('search') || sql.includes('from users')) {
      console.log(`📊 SQL匹配检查: includesFromUsers=${sql.includes('from users')}, includesIlike=${sql.includes('ilike')}, includesFriendships=${sql.includes('friendships')}`);
      console.log(`📊 SQL前80字符: "${sql.slice(0, 80)}"`);
      console.log(`📊 Params:`, params);
    }

    // ---- 事务控制 ----
    if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
      return { rows: [] };
    }

    // ---- 建表忽略 ----
    if (sql.startsWith('create table')) {
      return { rows: [] };
    }

    // ==================== users 表 ====================

    if (sql.startsWith('insert into users')) {
      const user = {
        id: userIdCounter++,
        username: params[0],
        password: params[1],
        nickname: params[2] || null,
        avatar: params[3] || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      users.push(user);
      return { rows: [user] };
    }

    // 搜索用户：ILIKE 模糊匹配 username 或 nickname（必须在 where id 之前匹配）
    if (sql.includes('from users') && sql.includes('ilike') && !sql.includes('friendships')) {
      const keyword = params[0]; // %keyword%
      const currentUserId = params[params.length - 1]; // 最后一个参数是当前用户ID
      const term = keyword.replace(/%/g, '').toLowerCase();
      console.log(`🔍 搜索用户: term="${term}", currentUserId=${currentUserId}, allUsers=${JSON.stringify(users.map(u=>u.username))}`);
      const result = users.filter(u =>
        u.id !== currentUserId &&
        ((u.username && u.username.toLowerCase().includes(term)) ||
         (u.nickname && u.nickname.toLowerCase().includes(term)))
      ).map(u => ({ id: u.id, username: u.username, nickname: u.nickname, avatar: u.avatar }))
       .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
       .slice(0, 20);
      console.log(`🔍 搜索结果: 找到${result.length}个用户`);
      return { rows: result };
    }

    // 按 username 精确查询
    if (sql.includes('from users') && sql.includes('where username') && !sql.includes('ilike')) {
      const user = users.find(u => u.username === params[0]);
      return { rows: user ? [user] : [] };
    }

    // 按 id 查询用户（精确匹配 "where id = $1" 或 "where id = "）
    if (sql.includes('from users') && sql.includes('where id =') && !sql.includes('friendships') && !sql.includes('user_sessions') && !sql.includes('ilike')) {
      const user = users.find(u => u.id === params[0]);
      return { rows: user ? [user] : [] };
    }

    // 更新用户 profile
    if (sql.startsWith('update users set')) {
      const user = users.find(u => u.id === params[params.length - 1]);
      if (user) {
        // 简单处理：按参数更新 nickname/avatar
        const sqlUpper = sql;
        let pIdx = 0;
        if (sqlUpper.includes('nickname')) { user.nickname = params[pIdx++]; }
        if (sqlUpper.includes('avatar')) { user.avatar = params[pIdx++]; }
        user.updated_at = new Date();
        return { rows: [{ id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar }] };
      }
      return { rows: [] };
    }

    // ==================== user_sessions 表 ====================

    if (sql.startsWith('insert into user_sessions')) {
      const session = {
        id: sessionIdCounter++,
        user_id: params[0],
        session_id: params[1],
        refresh_token_hash: params[2],
        refresh_token_salt: params[3],
        access_token_version: params[4],
        expires_at: params[5] || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        is_revoked: false,
        created_at: new Date(),
        last_used_at: new Date()
      };
      userSessions.push(session);
      return { rows: [session] };
    }

    // session + user JOIN 查询（认证中间件使用）
    if (sql.includes('user_sessions') && sql.includes('session_id') && sql.includes('user_id') && sql.includes('join users')) {
      const session = userSessions.find(s =>
        s.session_id === params[0] &&
        s.user_id === params[1] &&
        !s.is_revoked &&
        (!s.expires_at || new Date(s.expires_at) > new Date())
      );
      if (session) {
        const user = users.find(u => u.id === session.user_id);
        if (user) {
          return { rows: [{ ...session, phone: user.phone, username: user.username, nickname: user.nickname }] };
        }
      }
      return { rows: [] };
    }

    // 按 refresh_token_hash 查询 session
    if (sql.includes('user_sessions') && sql.includes('refresh_token_hash') && !sql.includes('session_id')) {
      const session = userSessions.find(s => s.refresh_token_hash === params[0]);
      return { rows: session ? [session] : [] };
    }

    // 按 session_id + user_id 查询 session（refresh token 验证）
    if (sql.includes('user_sessions') && sql.includes('session_id') && sql.includes('user_id') && !sql.includes('join')) {
      const session = userSessions.find(s =>
        s.session_id === params[0] &&
        s.user_id === params[1] &&
        !s.is_revoked &&
        (!s.expires_at || new Date(s.expires_at) > new Date())
      );
      if (session) {
        const user = users.find(u => u.id === session.user_id);
        return { rows: [{ ...session, username: user ? user.username : null, nickname: user ? user.nickname : null }] };
      }
      return { rows: [] };
    }

    // 更新 last_used_at
    if (sql.includes('update user_sessions set last_used_at')) {
      const session = userSessions.find(s => s.id === params[0]);
      if (session) session.last_used_at = new Date();
      return { rowCount: 1 };
    }

    // 更新 is_revoked
    if (sql.includes('update user_sessions set is_revoked')) {
      if (sql.includes('user_id') && sql.includes('session_id')) {
        userSessions.forEach(s => {
          if (s.user_id === params[0] && s.session_id === params[1]) s.is_revoked = true;
        });
      } else if (sql.includes('user_id')) {
        userSessions.forEach(s => {
          if (s.user_id === params[0]) s.is_revoked = true;
        });
      } else if (sql.includes('session_id')) {
        userSessions.forEach(s => {
          if (s.session_id === params[0]) s.is_revoked = true;
        });
      } else {
        const session = userSessions.find(s => s.id === params[0]);
        if (session) session.is_revoked = true;
      }
      return { rowCount: 1 };
    }

    // ==================== friendships 表 ====================

    if (sql.startsWith('insert into friendships')) {
      const friendship = {
        id: friendshipIdCounter++,
        requester_id: params[0],
        addressee_id: params[1],
        status: params[2] || 'pending',
        created_at: new Date(),
        updated_at: new Date()
      };
      friendships.push(friendship);
      return { rows: [friendship] };
    }

    // 查询两个用户之间的好友关系
    if (sql.includes('from friendships') && sql.includes('requester_id') && sql.includes('addressee_id') && !sql.includes('where id')) {
      const rId = params[0];
      const aId = params[1];
      const result = friendships.filter(f =>
        (f.requester_id === rId && f.addressee_id === aId) ||
        (f.requester_id === aId && f.addressee_id === rId)
      );
      return { rows: result };
    }

    // 按 id 查询 friendship
    if (sql.includes('from friendships') && sql.includes('where id') && !sql.includes('join')) {
      const friendship = friendships.find(f => f.id === params[0]);
      return { rows: friendship ? [friendship] : [] };
    }

    // 更新 friendship status
    if (sql.includes('update friendships set status')) {
      const friendship = friendships.find(f => f.id === params[params.length - 1]);
      if (friendship) {
        friendship.status = params[0];
        friendship.updated_at = new Date();
      }
      return { rowCount: 1 };
    }

    // 更新 friendship requester/addressee/status（重新发送被拒绝的申请）
    if (sql.includes('update friendships set requester_id') && sql.includes('addressee_id') && sql.includes('status')) {
      const friendship = friendships.find(f => f.id === params[3]);
      if (friendship) {
        friendship.requester_id = params[0];
        friendship.addressee_id = params[1];
        friendship.status = params[2];
        friendship.updated_at = new Date();
      }
      return { rowCount: 1 };
    }

    // 好友列表：JOIN users 查询已接受的好友
    if (sql.includes('from friendships') && sql.includes('join users') && sql.includes("status = 'accepted'")) {
      const userId = params[0];
      const result = friendships
        .filter(f => f.status === 'accepted' && (f.requester_id === userId || f.addressee_id === userId))
        .map(f => {
          const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
          const user = users.find(u => u.id === friendId);
          if (!user) return null;
          return {
            friendship_id: f.id,
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            avatar: user.avatar
          };
        })
        .filter(Boolean);
      return { rows: result };
    }

    // 待处理好友申请：JOIN users
    if (sql.includes('from friendships') && sql.includes('join users') && sql.includes("status = 'pending'") && sql.includes('addressee_id')) {
      const userId = params[0];
      const result = friendships
        .filter(f => f.status === 'pending' && f.addressee_id === userId)
        .map(f => {
          const requester = users.find(u => u.id === f.requester_id);
          if (!requester) return null;
          return {
            friendship_id: f.id,
            created_at: f.created_at,
            requester_id: requester.id,
            username: requester.username,
            nickname: requester.nickname,
            avatar: requester.avatar
          };
        })
        .filter(Boolean);
      return { rows: result };
    }

    // ==================== chat_history 表 ====================

    if (sql.startsWith('insert into chat_history')) {
      const record = {
        id: chatHistoryIdCounter++,
        user_id: params[0],
        role: params[1],
        content: params[2],
        created_at: new Date()
      };
      chatHistory.push(record);
      return { rows: [record] };
    }

    if (sql.includes('from chat_history') && sql.includes('user_id') && sql.includes('order by')) {
      const userId = params[0];
      const result = chatHistory
        .filter(h => h.user_id === userId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return { rows: result };
    }

    // ==================== messages 表 ====================

    if (sql.startsWith('insert into messages')) {
      const message = {
        id: messageIdCounter++,
        sender_id: params[0],
        receiver_id: params[1],
        content: params[2],
        type: params[3] || 'text',
        status: params[4] || 'sent',
        created_at: new Date()
      };
      messages.push(message);
      return { rows: [message] };
    }

    if (sql.includes('from messages') && sql.includes('sender_id') && sql.includes('receiver_id')) {
      const result = messages.filter(m =>
        (m.sender_id === params[0] && m.receiver_id === params[1]) ||
        (m.sender_id === params[1] && m.receiver_id === params[0])
      ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return { rows: result };
    }

    if (sql.startsWith('update messages set status')) {
      const idx = messages.findIndex(m => m.id === params[0]);
      if (idx > -1) {
        messages[idx].status = params[1];
        messages[idx].updated_at = new Date();
      }
      return { rowCount: 1 };
    }

    // 消息会话列表
    if (sql.includes('from messages') && sql.includes('conversations')) {
      // 简单返回所有消息
      return { rows: messages };
    }

    // ==================== 通用 ====================

    if (sql.startsWith('select count(*) from')) {
      let count = 0;
      if (sql.includes('users')) count = users.length;
      else if (sql.includes('friendships')) count = friendships.length;
      else if (sql.includes('messages')) count = messages.length;
      return { rows: [{ count }] };
    }

    console.log('Unsupported SQL:', sql, params);
    return { rows: [] };
  };

  connect = async () => ({
    query: this.query,
    release: () => {},
    commit: () => {},
    rollback: () => {}
  });

  end = async () => {};
}

const pool = new MemoryPool();

module.exports = pool;
