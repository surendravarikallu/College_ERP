fetch('http://localhost:8091/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-type': 'application/json' },
  body: JSON.stringify({ email: 'admin', password: 'admin123' })
}).then(async r => {
  console.log(r.status);
  console.log(await r.text());
}).catch(e => console.error(e));
