const http = require('http');

// 先直接查询数据库看看
const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function checkDB() {
  console.log('--- Users table ---');
  const users = await pool.query('SELECT id, username, nickname, avatar FROM users');
  console.log(users.rows);

  console.log('\n--- Friendships table ---');
  const friendships = await pool.query('SELECT * FROM friendships');
  console.log(friendships.rows);

  console.log('\n--- Testing getPendingRequests with user 2 (假设你是用户 2) ---');
  const pending = await pool.query(
    `SELECT
       f.id AS friendship_id,
       f.created_at,
       u.id AS requester_id, u.username, u.nickname, u.avatar
     FROM friendships f
     JOIN users u ON f.requester_id = u.id
     WHERE f.addressee_id = $1 AND f.status = 'pending'`,
    [2]
  );
  console.log(pending.rows);

  await pool.end();
}

checkDB();