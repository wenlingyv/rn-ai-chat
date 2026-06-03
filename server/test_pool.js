const pool = require('./database');
async function test() {
  try {
    const result = await pool.query("SELECT id, username FROM users WHERE username ILIKE '%小钰%' AND id != 104 LIMIT 20");
    console.log('搜索结果:', result.rows.length, '条');
    result.rows.forEach(r => console.log('  id=' + r.id, 'username=' + r.username));
    console.log('连接池状态: total=' + pool.totalCount + ', idle=' + pool.idleCount + ', waiting=' + pool.waitingCount);
    pool.end();
  } catch (e) {
    console.error('查询失败:', e.message);
    pool.end();
  }
}
test();