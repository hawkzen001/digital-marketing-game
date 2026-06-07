const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Set mock user in localStorage so it skips login
  await page.goto('http://localhost:8080/index.html');
  await page.evaluate(() => {
      localStorage.setItem('dm_mock_user', JSON.stringify({ email: 'test@example.com', role: 'student' }));
  });
  
  await page.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle0', timeout: 5000 });
  
  await browser.close();
})();
