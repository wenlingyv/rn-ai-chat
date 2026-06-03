const pool = require('./database');

// 测试中文搜索
pool.query("SELECT id, username, nickname FROM users WHERE username LIKE '%小钰%' OR nickname LIKE '%小钰%'")
  .then(r => {
    console.log('搜索"小钰"结果:', JSON.stringify(r.rows, null, 2));
    return pool.query("SELECT id, username, nickname FROM users WHERE username ILIKE '%小钰%' OR nickname ILIKE '%小钰%'");
  })
  .then(r => {
    console.log('ILIKE搜索"小钰"结果:', JSON.stringify(r.rows, null, 2));
    pool.end();
  })
  .catch(e => { console.error(e); pool.end(); });