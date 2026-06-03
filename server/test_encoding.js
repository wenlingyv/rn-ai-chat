const pool = require('./database');

// 检查数据库字符集
pool.query("SHOW server_encoding")
  .then(r => console.log('Server encoding:', r.rows[0]))
  .then(() => pool.query("SHOW client_encoding"))
  .then(r => console.log('Client encoding:', r.rows[0]))
  .then(() => pool.query("SELECT pg_encoding_to_char(encoding) as encoding FROM pg_database WHERE datname = 'ai_chat'"))
  .then(r => console.log('Database encoding:', r.rows[0]))
  .then(() => pool.query("SELECT table_name, pg_encoding_to_char(encoding) as encoding FROM pg_tables t JOIN pg_class c ON t.tablename = c.relname WHERE t.schemaname = 'public' AND t.tablename = 'users'"))
  .then(r => console.log('Users table encoding:', r.rows[0]))
  .then(() => pool.end())
  .catch(e => { console.error(e); pool.end(); });