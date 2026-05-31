const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function fixPhoneColumn() {
  const client = await pool.connect();
  try {
    console.log('正在修改 users 表的 phone 字段...');
    
    // 修改 phone 字段允许为空
    await client.query('ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;');
    
    console.log('修改成功！');
  } catch (error) {
    console.error('修改失败:', error.message);
  } finally {
    client.release();
    pool.end();
  }
}

fixPhoneColumn();