const { chromium } = require('/opt/npm-cache/_npx/bbb8a2c4738e2b0c/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await page.goto('http://localhost:3000/index.html#/analysis');
  await page.waitForTimeout(1200);
  const cards = page.locator('#view section.card');
  await cards.nth(3).screenshot({ path: '/tmp/v2-subcat.png' });
  await cards.nth(2).screenshot({ path: '/tmp/v2-midcat.png' });
  await page.goto('http://localhost:3000/index.html#/result/' + await page.evaluate(() => ST.history[ST.history.length-1].id));
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/v2-result2.png' });
  await page.goto('http://localhost:3000/index.html#/cards');
  await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/v2-cards2.png' });
  await browser.close();
})();
