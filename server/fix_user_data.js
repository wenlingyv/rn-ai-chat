const pool = require('./database');

async function fixUserData() {
  const client = await pool.connect();
  try {
    await client.query("SET CLIENT_ENCODING TO 'UTF8'");
    
    // 需要修复的用户映射（乱码 -> 正确中文）
    const fixes = [
      { id: 60, current: '灏忛挵', fixed: '小钰' },
      { id: 16, current: '閽伴挵', fixed: '雨雨2' }, // 用户16的用户名改为雨雨2，避免重复
      { id: 23, current: '閽伴挵', fixed: '雨雨3' },
      { id: 27, current: '澶уぇ', fixed: '大大' },
      { id: 36, current: '灏忓畫娲?', fixed: '小画家' },
      { id: 29, current: '灏忔磥', fixed: '小磊' },
      { id: 15, current: '灏忓皬', fixed: '小小' },
    ];
    
    for (const { id, fixed } of fixes) {
      try {
        await client.query("UPDATE users SET username = $1 WHERE id = $2", [fixed, id]);
        console.log(`修复用户${id}: -> "${fixed}"`);
      } catch (e) {
        console.log(`跳过用户${id}: ${e.message}`);
      }
    }
    
    console.log('\n测试搜索：');
    
    // 测试搜索
    const result = await client.query("SELECT id, username, nickname FROM users WHERE username ILIKE $1", ['%小钰%']);
    console.log('搜索"小钰"结果:', JSON.stringify(result.rows, null, 2));
    
  } catch (e) {
    console.error('修复失败:', e);
  } finally {
    client.release();
    pool.end();
  }
}

fixUserData();