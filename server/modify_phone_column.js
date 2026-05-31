const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function modifyPhoneColumn() {
  try {
    console.log('Modifying phone column to allow null values...');
    
    // 修改 phone 字段允许为空
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN phone DROP NOT NULL
    `);
    
    console.log('✅ Column modified successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error modifying column:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

modifyPhoneColumn();
