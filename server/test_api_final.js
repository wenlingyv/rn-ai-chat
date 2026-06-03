const http = require('http');

function login(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    const req = http.request({
      hostname: '127.0.0.1', port: 5000,
      path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function search(token, keyword) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 5000,
      path: `/api/friend/search?keyword=${encodeURIComponent(keyword)}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          console.log(`搜索"${keyword}": success=${parsed.success}, data.length=${parsed.data?.length}`);
          if (parsed.data && parsed.data.length > 0) {
            // 检查数据格式
            const first = parsed.data[0];
            console.log(`  第一条: id=${first.id}, username类型=${typeof first.username}, username长度=${first.username?.length}`);
            console.log(`  username字节: ${Buffer.from(first.username || '', 'utf8').toString('hex')}`);
          }
          resolve(parsed);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  const loginResult = await login('testuser', '123456');
  if (!loginResult.success) {
    console.log('登录失败:', loginResult.message);
    return;
  }
  console.log('登录成功, userId:', loginResult.data.user.id);
  const token = loginResult.data.accessToken;
  
  await search(token, '小钰');
  await search(token, '小');
}

test();