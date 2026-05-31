const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function addColumns() {
  try {
    console.log('Adding username and password columns to users table...');
    
    // 添加 username 字段（如果不存在）
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS username VARCHAR(50)
    `);
    
    // 添加 password 字段（如果不存在）
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS password VARCHAR(255)
    `);
    
    // 添加唯一索引
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username 
      ON users(username)
    `);
    
    console.log('✅ Columns added successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addColumns();
