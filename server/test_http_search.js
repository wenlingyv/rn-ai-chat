const http = require('http');

// 测试通过HTTP API搜索中文
const keyword = encodeURIComponent('小钰');
const options = {
  hostname: '127.0.0.1',
  port: 5000,
  path: `/api/friend/search?keyword=${keyword}`,
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('HTTP Response:', data);
  });
});

req.on('error', (e) => {
  console.error('HTTP Error:', e);
});

req.end();