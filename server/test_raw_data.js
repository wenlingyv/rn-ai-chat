const pool = require('./database');

// 检查数据库中存储的原始数据
pool.query("SELECT id, username, nickname, convert_to(username::bytea, 'UTF8') as username_bytes FROM users WHERE id = 60")
  .then(r => {
    console.log('原始数据:', JSON.stringify(r.rows[0], null, 2));
    const row = r.rows[0];
    console.log('username:', row.username);
    console.log('nickname:', row.nickname);
    console.log('username bytes:', row.username_bytes);
    pool.end();
  })
  .catch(e => { console.error(e); pool.end(); });