// 测试GBK到UTF-8的转换
const testString = '灏忛挵'; // 乱码
const buffer = Buffer.from(testString, 'utf8');
console.log('乱码字符串:', testString);
console.log('字节:', buffer);
console.log('字节十六进制:', buffer.toString('hex'));

try {
  const fixed = buffer.toString('gbk');
  console.log('GBK解码:', fixed);
} catch (e) {
  console.error('GBK解码失败:', e);
}

// 测试：正确的中文转换
const correct = '小钰';
const correctBuffer = Buffer.from(correct, 'utf8');
console.log('\n正确字符串:', correct);
console.log('字节:', correctBuffer);
console.log('字节十六进制:', correctBuffer.toString('hex'));