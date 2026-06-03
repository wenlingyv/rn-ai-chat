// 修复数据库中的乱码数据
const pool = require('./database');

async function fixEncoding() {
  const client = await pool.connect();
  try {
    await client.query("SET CLIENT_ENCODING TO 'UTF8'");
    
    // 查询所有用户
    const result = await client.query("SELECT id, username, nickname FROM users");
    
    for (const row of result.rows) {
      let { id, username, nickname } = row;
      
      // 尝试修复乱码：GBK编码的字节被当作UTF-8解析，需要反向转换
      if (username) {
        // 将乱码字符串转换回原始字节，再用正确编码解析
        const buffer = Buffer.from(username, 'utf8');
        try {
          const fixedUsername = buffer.toString('gbk');
          // 如果修复后看起来像中文，就更新
          if (/[\u4e00-\u9fa5]/.test(fixedUsername) && fixedUsername !== username) {
            console.log(`修复用户${id}: username "${username}" -> "${fixedUsername}"`);
            await client.query("UPDATE users SET username = $1 WHERE id = $2", [fixedUsername, id]);
          }
        } catch (e) {
          // 转换失败，跳过
        }
      }
      
      if (nickname) {
        const buffer = Buffer.from(nickname, 'utf8');
        try {
          const fixedNickname = buffer.toString('gbk');
          if (/[\u4e00-\u9fa5]/.test(fixedNickname) && fixedNickname !== nickname) {
            console.log(`修复用户${id}: nickname "${nickname}" -> "${fixedNickname}"`);
            await client.query("UPDATE users SET nickname = $1 WHERE id = $2", [fixedNickname, id]);
          }
        } catch (e) {
          // 转换失败，跳过
        }
      }
    }
    
    console.log('修复完成');
    
  } catch (e) {
    console.error('修复失败:', e);
  } finally {
    client.release();
    pool.end();
  }
}

fixEncoding();