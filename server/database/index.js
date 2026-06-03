const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库配置（支持环境变量，Docker 部署兼容）
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'ai_chat',
  password: process.env.DB_PASSWORD || '123456',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  client_encoding: 'UTF8',
  max: 20,
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => console.error('PostgreSQL 连接异常：', err.message));
pool.on('connect', () => {}); // 连接池事件
pool.on('remove', () => {});  // 连接释放事件

// 读取SQL文件
const readSQLFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
};

// 执行SQL
const executeSQL = async (sql) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(sql);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 执行SQL文件
const executeSQLFile = async (filePath) => {
  const sql = await readSQLFile(filePath);
  const statements = sql.split(';').filter(s => s.trim());

  for (const statement of statements) {
    if (statement.trim()) {
      await executeSQL(statement + ';');
    }
  }
};

// 执行迁移
const migrate = async () => {
  try {
    console.log('开始数据库迁移...');

    // 读取并执行初始化脚本
    const initSQLPath = path.join(__dirname, 'init.sql');
    await executeSQLFile(initSQLPath);

    console.log('✅ 数据库迁移完成');
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// 如果直接运行此文件
if (require.main === module) {
  migrate();
}

module.exports = pool;