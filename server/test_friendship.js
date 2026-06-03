const pool = require('./database');

async function test() {
  try {
    // 检查小洁(104)和小钰(60)的好友关系
    const friendship = await pool.query(
      `SELECT id, requester_id, addressee_id, status FROM friendships
       WHERE (requester_id = 104 AND addressee_id = 60)
          OR (requester_id = 60 AND addressee_id = 104)`,
    );
    console.log('好友关系:', friendship.rows.length > 0 ? JSON.stringify(friendship.rows) : '无');

    // 检查所有好友关系
    const all = await pool.query(
      `SELECT f.id, f.requester_id, f.addressee_id, f.status,
              u1.username as requester, u2.username as addressee
       FROM friendships f
       JOIN users u1 ON f.requester_id = u1.id
       JOIN users u2 ON f.addressee_id = u2.id`
    );
    console.log('\n所有好友关系:');
    all.rows.forEach(r => console.log(`  ${r.requester} <-> ${r.addressee}: ${r.status}`));

    pool.end();
  } catch (e) {
    console.error(e.message);
    pool.end();
  }
}

test();
