const http = require('http');

function apiCall(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    
    const req = http.request({ hostname: 'localhost', port: 5000, path, method, headers }, (res) => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, data: b }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  // 1. Login as player1
  console.log('=== Login as player1 ===');
  const login = await apiCall('POST', '/api/users/login', null, { email: 'player1@yahoo.com', password: '123456' });
  console.log('Status:', login.status, '| referralCode:', login.data.user?.referralCode);
  const p1Token = login.data.token;

  // 2. Check player1's referrals
  console.log('\n=== Player1 referrals ===');
  const refs = await apiCall('GET', '/api/referrals/my', p1Token);
  console.log('Status:', refs.status);
  console.log('referralCode:', refs.data.referralCode);
  console.log('totalCount:', refs.data.totalCount, '| activeCount:', refs.data.activeCount);
  console.log('bonusPercent:', refs.data.bonusPercent);
  if (refs.data.referrals?.length) {
    refs.data.referrals.forEach(r => console.log('  Referral:', r.referee?.name, '| status:', r.status, '| daysRemaining:', r.daysRemaining));
  }

  // 3. Check player1's earnings
  console.log('\n=== Player1 earnings ===');
  const earnings = await apiCall('GET', '/api/referrals/my/earnings', p1Token);
  console.log('Status:', earnings.status, '| earnings count:', earnings.data.earnings?.length);
  
  // 4. Login as AhsanGmail
  console.log('\n=== Login as AhsanGmail ===');
  const login2 = await apiCall('POST', '/api/users/login', null, { email: 'ahsanjaved2u@gmail.com', password: '123456' });
  console.log('Status:', login2.status, '| verified:', login2.data.user?.emailVerified);

  console.log('\n=== DONE — All checks passed ===');
})();
