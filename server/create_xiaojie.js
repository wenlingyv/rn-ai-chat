const pool = require('./database');
const bcrypt = require('bcryptjs');

async function createUser() {
  const client = await pool.connect();
  try {
    // 创建"小洁"用户
    const hashedPassword = await bcrypt.hash('123456', 10);
    const result = await client.query(
      "INSERT INTO users (username, password, nickname, avatar) VALUES ($1, $2, $3, $4) RETURNING id, username, nickname",
      ['小洁', hashedPassword, '小洁', '🌸']
    );
    console.log('创建用户成功:', result.rows[0]);
    
    // 再创建几个测试用户
    const testUsers = [
      { username: '小明', nickname: '小明', avatar: '😊' },
      { username: '小红', nickname: '小红', avatar: '🌹' },
      { username: '阿杰', nickname: '阿杰', avatar: '💪' },
    ];
    
    for (const u of testUsers) {
      const hp = await bcrypt.hash('123456', 10);
      const r = await client.query(
        "INSERT INTO users (username, password, nickname, avatar) VALUES ($1, $2, $3, $4) RETURNING id, username, nickname",
        [u.username, hp, u.nickname, u.avatar]
      );
      console.log('创建用户成功:', r.rows[0]);
    }
    
    // 验证搜索
    const search = await client.query("SELECT id, username, nickname FROM users WHERE username ILIKE '%小洁%'");
    console.log('\n验证搜索"小洁":', search.rows.length, '条');
  } catch (e) {
    console.error('创建失败:', e.message);
  } finally {
    client.release();
    pool.end();
  }
}

createUser();