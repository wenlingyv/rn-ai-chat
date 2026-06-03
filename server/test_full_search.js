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
        console.log(`搜索"${keyword}" 状态=${res.statusCode} 结果=${body}`);
        resolve(body);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  // 用小钰登录(id=60)
  const loginResult = await login('小钰', '123456');
  console.log('登录小钰:', loginResult.success ? '成功 userId=' + loginResult.data?.user?.id : '失败 ' + loginResult.message);
  
  if (loginResult.success) {
    const token = loginResult.data.accessToken;
    await search(token, '小钰');
    await search(token, 'test');
    await search(token, '小');
  }
  
  // 用testuser登录(id=14)
  const loginResult2 = await login('testuser', '123456');
  console.log('\n登录testuser:', loginResult2.success ? '成功 userId=' + loginResult2.data?.user?.id : '失败 ' + loginResult2.message);
  
  if (loginResult2.success) {
    const token = loginResult2.data.accessToken;
    await search(token, '小钰');
    await search(token, 'test');
    await search(token, '小');
  }
}

test();