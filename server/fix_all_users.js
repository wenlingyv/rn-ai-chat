const pool = require('./database');

async function fixAllUsers() {
  const client = await pool.connect();
  try {
    await client.query("SET CLIENT_ENCODING TO 'UTF8'");
    
    // 查看所有用户
    const result = await client.query("SELECT id, username, nickname, avatar FROM users ORDER BY id");
    
    // 用字节判断哪些用户名是乱码
    for (const row of result.rows) {
      const usernameBytes = Buffer.from(row.username || '', 'utf8');
      const hex = usernameBytes.toString('hex');
      console.log(`用户${row.id}: username_hex=${hex} nickname_hex=${Buffer.from(row.nickname || '', 'utf8').toString('hex')}`);
    }
    
    // 直接用SQL更新所有乱码用户名为正确的中文
    const fixes = {
      14: { username: 'testuser', nickname: '测试用户' },
      15: { username: '小小', nickname: '用户15' },
      16: { username: '雨雨', nickname: '用户16' },
      23: { username: '雨雨23', nickname: '用户23' },
      27: { username: '大大', nickname: '用户27' },
      29: { username: '小磊', nickname: '用户29' },
      36: { username: '小画家', nickname: '用户36' },
      60: { username: '小钰', nickname: '用户60' },
    };
    
    for (const [id, fix] of Object.entries(fixes)) {
      await client.query("UPDATE users SET username = $1, nickname = $2 WHERE id = $3", [fix.username, fix.nickname, parseInt(id)]);
      console.log(`更新用户${id}: username=${fix.username}, nickname=${fix.nickname}`);
    }
    
    // 验证
    const verify = await client.query("SELECT id, username, nickname FROM users WHERE id = 60");
    const v = verify.rows[0];
    console.log(`\n验证用户60: username_hex=${Buffer.from(v.username, 'utf8').toString('hex')} (期望: e5b08fe992b0)`);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

fixAllUsers();