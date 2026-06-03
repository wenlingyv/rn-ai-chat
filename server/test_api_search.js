const http = require('http');

// 先登录获取token
function login(username, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ username, password });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 用token搜索
function search(token, keyword) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: `/api/friend/search?keyword=${encodeURIComponent(keyword)}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`搜索"${keyword}" HTTP状态: ${res.statusCode}`);
        console.log(`搜索"${keyword}" 响应: ${body}`);
        try { resolve(JSON.parse(body)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function test() {
  try {
    // 用testuser登录
    const loginResult = await login('testuser', '123456');
    console.log('登录结果:', loginResult.success ? '成功' : '失败', loginResult.message || '');
    
    if (loginResult.success) {
      const token = loginResult.data.accessToken;
      console.log('Token前20字符:', token.substring(0, 20));
      
      // 搜索中文
      await search(token, '小钰');
      await search(token, '小');
      await search(token, 'test');
    }
  } catch (e) {
    console.error('测试失败:', e);
  }
}

test();