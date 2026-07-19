const http = require('http');

console.log("Starting test req...");
const payload = JSON.stringify({ prompt: "hello, reply in valid json format with keys 'response' and 'confidence'", maxTokens: 1000 });

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/claude',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, res => {
  let body = '';
  res.on('data', c => { body += c; });
  res.on('end', () => console.log('RESPONSE:', res.statusCode, body));
});

req.on('error', e => console.error('ERROR:', e.message));
req.write(payload);
req.end();
console.log("Request sent...");
