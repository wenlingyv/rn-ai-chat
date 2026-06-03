const http = require('http');

// 用testuser登录获取token
function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username: 'testuser', password: '123456' });
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
          console.log(`搜索"${keyword}": success=${parsed.success}, data长度=${parsed.data?.length}, data类型=${Array.isArray(parsed.data) ? 'array' : typeof parsed.data}`);
          if (parsed.data && parsed.data.length > 0) {
            console.log('  第一条:', JSON.stringify(parsed.data[0]));
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
  const loginResult = await login();
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