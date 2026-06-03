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
});

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

// 执行SQL文件 - 智能分割，支持 $$ 函数体
const executeSQLFile = async (filePath) => {
  const sql = await readSQLFile(filePath);

  // 逐字符解析，正确处理 $$ 块
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  for (let i = 0; i < sql.length; i++) {
    current += sql[i];

    // 检测 $$ 标记
    if (sql[i] === '$' && i + 1 < sql.length && sql[i + 1] === '$') {
      current += sql[i + 1];
      i++; // 跳过第二个 $
      inDollarQuote = !inDollarQuote;
      continue;
    }

    // 只在非 $$ 块内按分号分割
    if (!inDollarQuote && sql[i] === ';') {
      statements.push(current.trim());
      current = '';
    }
  }

  // 处理剩余内容
  if (current.trim()) {
    statements.push(current.trim());
  }

  for (const statement of statements) {
    if (statement) {
      await executeSQL(statement);
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

module.exports = { migrate, executeSQL };