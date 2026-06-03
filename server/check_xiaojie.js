const pool = require('./database');
async function check() {
  const client = await pool.connect();
  try {
    // 搜索"小洁"
    const r1 = await client.query("SELECT id, username, nickname FROM users WHERE username ILIKE '%小洁%' OR nickname ILIKE '%小洁%'");
    console.log('搜索"小洁":', r1.rows.length, '条');
    r1.rows.forEach(r => console.log('  id=' + r.id, 'username=' + r.username, 'nickname=' + r.nickname));
    
    // 列出所有用户
    const r2 = await client.query("SELECT id, username, nickname FROM users ORDER BY id");
    console.log('\n所有用户:');
    r2.rows.forEach(r => console.log('  id=' + r.id, 'username=' + r.username, 'nickname=' + r.nickname));
  } catch (e) { console.error(e); }
  finally { client.release(); pool.end(); }
}
check();