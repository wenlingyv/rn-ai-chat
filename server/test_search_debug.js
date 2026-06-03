const pool = require('./database');

async function testSearch() {
  const client = await pool.connect();
  try {
    // 1. 查看所有用户
    const all = await client.query("SELECT id, username, nickname FROM users ORDER BY id");
    console.log('所有用户:');
    all.rows.forEach(r => {
      const ub = Buffer.from(r.username || '', 'utf8');
      console.log(`  id=${r.id} username=${r.username} (hex=${ub.toString('hex')}) nickname=${r.nickname}`);
    });
    
    // 2. 测试ILIKE搜索
    const keywords = ['小钰', '小', 'test', 'a'];
    for (const kw of keywords) {
      const result = await client.query(
        "SELECT id, username FROM users WHERE username ILIKE $1 OR nickname ILIKE $1 LIMIT 5",
        [`%${kw}%`]
      );
      console.log(`\n搜索"${kw}": 找到${result.rows.length}条`);
      result.rows.forEach(r => console.log(`  id=${r.id} username=${r.username}`));
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

testSearch();