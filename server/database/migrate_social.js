const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'ai_chat',
  password: '123456',
  port: 5432,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS friendships (
        id SERIAL PRIMARY KEY,
        requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        addressee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(requester_id, addressee_id),
        CHECK(requester_id != addressee_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS private_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_private_messages_receiver ON private_messages(receiver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON private_messages(created_at);`);

    console.log('社交表迁移完成：friendships、private_messages 及相关索引已创建');
  } catch (err) {
    console.error('迁移失败：', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
