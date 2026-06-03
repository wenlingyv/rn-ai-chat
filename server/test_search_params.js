const pool = require('./database');

// 模拟搜索，测试 currentUserId 参数
async function test() {
  const client = await pool.connect();
  try {
    // 搜索test，排除用户14（testuser自己）
    const result1 = await client.query(
      "SELECT id, username FROM users WHERE (username ILIKE $1 OR nickname ILIKE $1) AND id != $2 LIMIT 20",
      ['%test%', 14]
    );
    console.log('搜索test(排除14):', result1.rows);
    
    // 搜索test，不排除
    const result2 = await client.query(
      "SELECT id, username FROM users WHERE username ILIKE $1 OR nickname ILIKE $1 LIMIT 20",
      ['%test%']
    );
    console.log('搜索test(不排除):', result2.rows);
    
    // 搜索小钰，排除用户14
    const result3 = await client.query(
      "SELECT id, username FROM users WHERE (username ILIKE $1 OR nickname ILIKE $1) AND id != $2 LIMIT 20",
      ['%小钰%', 14]
    );
    console.log('搜索小钰(排除14):', result3.rows);
    
    // 搜索小钰，不排除
    const result4 = await client.query(
      "SELECT id, username FROM users WHERE username ILIKE $1 OR nickname ILIKE $1 LIMIT 20",
      ['%小钰%']
    );
    console.log('搜索小钰(不排除):', result4.rows);
    
    // 检查id的类型
    const idCheck = await client.query("SELECT id, pg_typeof(id) as type FROM users WHERE id = 14");
    console.log('ID类型:', idCheck.rows[0]);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

test();