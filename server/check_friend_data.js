const pool = require('./database');

async function checkData() {
  try {
    console.log('--- Checking users table ---');
    const users = await pool.query('SELECT id, username, nickname, avatar FROM users');
    users.rows.forEach(u => {
      console.log(`User ${u.id}: ${u.username} / ${u.nickname} / ${u.avatar}`);
    });

    console.log('\n--- Checking friendships table ---');
    const friendships = await pool.query('SELECT * FROM friendships');
    friendships.rows.forEach(f => {
      console.log(`Friendship ${f.id}: ${f.requester_id} -> ${f.addressee_id}, status=${f.status}`);
    });

    await pool.end();
  } catch (e) {
    console.error('Error:', e);
  }
}

checkData();