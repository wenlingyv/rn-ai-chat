const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function migrateDualToken() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE user_sessions
      ADD COLUMN IF NOT EXISTS session_id VARCHAR(100) UNIQUE;
    `);

    await client.query(`
      ALTER TABLE user_sessions
      ADD COLUMN IF NOT EXISTS refresh_token_salt VARCHAR(100);
    `);

    await client.query(`
      UPDATE user_sessions SET session_id = 'session_' || id || '_' || EXTRACT(EPOCH FROM created_at)::text
      WHERE session_id IS NULL;
    `);

    await client.query(`
      ALTER TABLE user_sessions ALTER COLUMN session_id SET NOT NULL;
    `);

    await client.query(`
      ALTER TABLE user_sessions ALTER COLUMN refresh_token_salt SET DEFAULT '';
    `);

    await client.query(`
      UPDATE user_sessions SET refresh_token_salt = '' WHERE refresh_token_salt IS NULL;
    `);

    await client.query(`
      ALTER TABLE user_sessions ALTER COLUMN refresh_token_salt SET NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ 双token迁移完成：user_sessions表已添加session_id和refresh_token_salt字段');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 迁移失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrateDualToken();
