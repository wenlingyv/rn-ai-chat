const pool = require('./database');

async function verify() {
  const client = await pool.connect();
  try {
    await client.query("SET CLIENT_ENCODING TO 'UTF8'");
    
    // 查询用户60
    const result = await client.query("SELECT id, username, nickname FROM users WHERE id = 60");
    const user = result.rows[0];
    
    // 检查字节值
    const usernameBytes = Buffer.from(user.username, 'utf8');
    console.log('用户60 username字节:', usernameBytes);
    console.log('字节十六进制:', usernameBytes.toString('hex'));
    
    // "小钰"的正确UTF-8字节应该是: e5 b0 8f e9 92 b0
    const expectedBytes = Buffer.from('小钰', 'utf8');
    console.log('"小钰"期望字节:', expectedBytes);
    console.log('期望字节十六进制:', expectedBytes.toString('hex'));
    
    // 比较
    console.log('匹配:', usernameBytes.toString('hex') === expectedBytes.toString('hex'));
    
    // 测试搜索
    const searchResult = await client.query("SELECT id, username FROM users WHERE username = $1", ['小钰']);
    console.log('精确搜索"小钰"结果:', searchResult.rows.length > 0 ? '找到!' : '未找到');
    
  } catch (e) {
    console.error('错误:', e);
  } finally {
    client.release();
    pool.end();
  }
}

verify();