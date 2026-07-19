const http = require('http');
const req = http.request('http://localhost:3001/api/claude', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});
req.on('error', e => console.log('ERROR:', e.message));
req.write(JSON.stringify({ prompt: 'hello' }));
req.end();
