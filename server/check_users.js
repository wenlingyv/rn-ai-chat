const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, username, nickname FROM users;');
    console.log('数据库中的用户数据:');
    console.log('-------------------');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   用户名(username): ${user.username || '(空)'}`);
      console.log(`   昵称(nickname): ${user.nickname || '(空)'}`);
      console.log('');
    });
    await pool.end();
  } catch (error) {
    console.error('查询失败:', error.message);
  }
}

checkUsers();
