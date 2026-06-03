const pool = require('./database');

async function check() {
  const client = await pool.connect();
  try {
    // 检查用户60的username字节
    const result = await client.query("SELECT id, username FROM users WHERE id = 60");
    const row = result.rows[0];
    const bytes = Buffer.from(row.username, 'utf8');
    console.log('用户60 username hex:', bytes.toString('hex'));
    console.log('期望 "小钰" hex:        e5b08fe992b0');
    console.log('匹配:', bytes.toString('hex') === 'e5b08fe992b0');
    
    // 测试搜索
    const searchResult = await client.query("SELECT id, username FROM users WHERE username = '小钰'");
    console.log('精确搜索"小钰"结果数:', searchResult.rows.length);
    
    // 搜索"小"
    const searchResult2 = await client.query("SELECT id, username FROM users WHERE username ILIKE '%小%'");
    console.log('模糊搜索"小"结果数:', searchResult2.rows.length);
    
  } catch (e) {
    console.error('Error:', e);
  } finally {
    client.release();
    pool.end();
  }
}

check();