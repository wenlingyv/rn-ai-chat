const pool = require('./database');

// 在连接后执行字符集设置
async function testEncodingFix() {
  const client = await pool.connect();
  try {
    // 设置字符集
    await client.query("SET NAMES 'UTF8'");
    await client.query("SET CLIENT_ENCODING TO 'UTF8'");
    
    // 测试搜索
    const result = await client.query("SELECT id, username, nickname FROM users WHERE username ILIKE $1 OR nickname ILIKE $1", ['%小钰%']);
    console.log('搜索结果:', JSON.stringify(result.rows, null, 2));
    
    // 测试直接查询已知用户
    const user60 = await client.query("SELECT id, username, nickname FROM users WHERE id = 60");
    console.log('用户60:', JSON.stringify(user60.rows[0], null, 2));
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

testEncodingFix();