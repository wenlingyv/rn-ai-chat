const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function fixData() {
  try {
    // 修复用户 15（小小）
    await pool.query(
      "UPDATE users SET username = '小小', nickname = '小小', avatar = '😊' WHERE id = $1",
      [15]
    );
    // 修复用户 16（钰钰）
    await pool.query(
      "UPDATE users SET username = '钰钰', nickname = '钰钰', avatar = '💛' WHERE id = $1",
      [16]
    );

    console.log('修复完成！');
    const users = await pool.query('SELECT id, username, nickname, avatar FROM users');
    console.log(users.rows);

    await pool.end();
  } catch (e) {
    console.error('Error:', e);
  }
}

fixData();