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
    // 先查看当前数据
    const current = await pool.query('SELECT id, username, nickname, avatar FROM users');
    console.log('Current data:', current.rows);

    // 使用参数化查询来避免编码问题
    await pool.query(
      `UPDATE users SET username = $1, nickname = $2, avatar = $3 WHERE id = $4`,
      ['xiaoxiao', '小小', '😊', 15]
    );

    await pool.query(
      `UPDATE users SET username = $1, nickname = $2, avatar = $3 WHERE id = $4`,
      ['yuyu', '钰钰', '💛', 16]
    );

    console.log('\n修复完成！');
    const after = await pool.query('SELECT id, username, nickname, avatar FROM users');
    console.log(after.rows);

    await pool.end();
  } catch (e) {
    console.error('Error:', e);
  }
}

fixData();