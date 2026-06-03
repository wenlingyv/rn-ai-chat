const pool = require('./database');

// 搜索包含"小钰"的用户
pool.query("SELECT id, username, nickname FROM users WHERE username LIKE '%小钰%' OR nickname LIKE '%小钰%'")
  .then(r => {
    console.log('搜索"小钰"结果:', JSON.stringify(r.rows, null, 2));
    return pool.query("SELECT id, username, nickname FROM users WHERE id = 36");
  })
  .then(r => {
    console.log('用户36详情:', JSON.stringify(r.rows, null, 2));
    pool.end();
  })
  .catch(e => { console.error(e); pool.end(); });