const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function checkDatabase() {
  try {
    console.log('=== 检查数据库连接 ===');
    
    const connResult = await pool.query('SELECT current_database(), current_user, inet_server_port()');
    console.log('数据库:', connResult.rows[0].current_database);
    console.log('用户:', connResult.rows[0].current_user);
    console.log('端口:', connResult.rows[0].inet_server_port);
    
    console.log('\n=== 检查 users 表 ===');
    const tableCheck = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')");
    console.log('users 表是否存在:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      const columns = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
      console.log('\nusers 表结构:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      const users = await pool.query('SELECT id, username, phone, nickname, created_at FROM users');
      console.log('\nusers 表数据 (' + users.rows.length + ' 条):');
      users.rows.forEach(user => {
        console.log(`  id=${user.id}, username=${user.username}, phone=${user.phone}, nickname=${user.nickname}, created_at=${user.created_at}`);
      });
    }
    
    console.log('\n=== 检查 user_sessions 表 ===');
    const sessionCheck = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_sessions')");
    console.log('user_sessions 表是否存在:', sessionCheck.rows[0].exists);
    
    if (sessionCheck.rows[0].exists) {
      const sessions = await pool.query('SELECT id, user_id, is_revoked, created_at FROM user_sessions');
      console.log('user_sessions 表数据 (' + sessions.rows.length + ' 条):');
      sessions.rows.forEach(s => {
        console.log(`  id=${s.id}, user_id=${s.user_id}, is_revoked=${s.is_revoked}, created_at=${s.created_at}`);
      });
    }
    
  } catch (error) {
    console.error('数据库查询失败:', error.message);
  } finally {
    pool.end();
  }
}

checkDatabase();
