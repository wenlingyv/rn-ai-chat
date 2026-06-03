const pool = require('./database');

async function test() {
  const client = await pool.connect();
  try {
    // 模拟用户29搜索"小钰"
    const result = await client.query(
      "SELECT id, username FROM users WHERE (username ILIKE $1 OR nickname ILIKE $1) AND id != $2 LIMIT 20",
      ['%小钰%', 29]
    );
    console.log('用户29搜索小钰: found=' + result.rows.length);
    
    // 模拟用户60搜索"小"
    const result2 = await client.query(
      "SELECT id, username FROM users WHERE (username ILIKE $1 OR nickname ILIKE $1) AND id != $2 LIMIT 20",
      ['%小%', 60]
    );
    console.log('用户60搜索小: found=' + result2.rows.length);
    
    // 检查所有用户密码是否为123456（测试用）
    const pwCheck = await client.query("SELECT id, username FROM users WHERE id IN (14, 29, 60)");
    console.log('测试用户:', pwCheck.rows.map(r => `id=${r.id} username=${r.username}`).join(', '));
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

test();