const { chromium } = require('/opt/npm-cache/_npx/bbb8a2c4738e2b0c/node_modules/playwright-core');

(async () => {
  const errors = [];
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('CONSOLE: ' + m.text()); });

  const base = 'http://localhost:3000/index.html';
  await page.goto(base + '#/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // close welcome modal if present
  const modalShown = await page.locator('#modal-back.show').count();
  if (modalShown) { await page.click('[data-act="close-modal"]'); await page.waitForTimeout(300); }
  console.log('1. home rendered:', await page.locator('#view .hero').count(), 'welcome modal:', modalShown);

  // start 10-question quiz
  await page.click('[data-act="start-quick"][data-field="all"]');
  await page.waitForTimeout(500);
  console.log('2. quiz route:', page.url().split('#')[1], 'q-card:', await page.locator('.q-card').count());

  // answer all 10
  for (let i = 0; i < 10; i++) {
    const n = await page.locator('.choice').count();
    if (!n) break;
    await page.locator('.choice').nth(i % 4).click();
    await page.waitForTimeout(180);
    const explain = await page.locator('.explain').count();
    if (i === 0) console.log('3. explain shown after answer:', explain);
    await page.click('[data-act="next-q"]');
    await page.waitForTimeout(220);
  }
  await page.waitForTimeout(700);
  console.log('4. result route:', page.url().split('#')[1], 'ring:', await page.locator('.ring').count(),
              'subcat cards:', await page.locator('.subcat').count());

  // analysis page
  await page.goto(base + '#/analysis', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const svgPath = await page.locator('.chart-box svg path').count();
  const midRows = await page.locator('table.tbl tbody tr').count();
  console.log('5. analysis svg paths:', svgPath, 'table rows:', midRows);

  // roadmap
  await page.goto(base + '#/roadmap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const days = await page.locator('.rm-day').count();
  console.log('6. roadmap days:', days, 'weeks:', await page.locator('.rm-week').count());
  const firstChk = page.locator('.rm-chk').first();
  await firstChk.click();
  await page.waitForTimeout(500);
  console.log('7. after check, done classes:', await page.locator('.rm-chk.on').count());

  // cards
  await page.goto(base + '#/cards', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  console.log('8. card term:', (await page.locator('.fc-term').textContent() || '').trim());
  await page.click('.fc');
  await page.waitForTimeout(600);
  console.log('9. flipped:', await page.locator('.fc.flip').count(), (await page.locator('.fc-def').textContent() || '').slice(0, 30));
  await page.click('[data-act="card-mark"]');
  await page.waitForTimeout(400);

  // history
  await page.goto(base + '#/history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  console.log('10. history rows:', await page.locator('table.tbl tbody tr').count());

  // manage: add question
  await page.goto(base + '#/manage', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.click('[data-act="manage-tab"][data-tab="questions"]');
  await page.waitForTimeout(500);
  console.log('11. question list items:', await page.locator('.qbank-item').count());
  await page.click('[data-act="new-question"]');
  await page.waitForTimeout(400);
  await page.selectOption('#f-field', 'management');
  await page.fill('#f-mid', 'テスト中分類');
  await page.fill('#f-sub', 'テスト小分類');
  await page.fill('#f-q', 'これはテスト用に追加した問題です。正しいものはどれか。');
  for (let i = 0; i < 4; i++) await page.fill('#f-c' + i, '選択肢' + i);
  await page.check('input[name="f-ans"][value="0"]');
  await page.fill('#f-e', 'テスト解説です。');
  await page.click('[data-act="save-question"]');
  await page.waitForTimeout(700);
  const total = await page.locator('#spine-qcount').textContent();
  console.log('12. after add, total questions:', total, 'items:', await page.locator('.qbank-item').count());

  // filter search
  await page.fill('#q-search', 'テスト用に追加');
  await page.waitForTimeout(900);
  console.log('13. search results:', await page.locator('.qbank-item').count());

  // exam mode start & timer
  await page.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.click('[data-act="start-mock"]');
  await page.waitForTimeout(800);
  console.log('14. exam questions:', (await page.locator('.quiz-meta b').textContent()), 'timer:', await page.locator('#quiz-timer').textContent());
  await page.locator('.choice').nth(0).click();
  await page.waitForTimeout(300);
  const explainInExam = await page.locator('.explain').count();
  console.log('15. exam hides answer feedback:', explainInExam === 0);

  // mobile viewport check
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mob.goto(base + '#/home', { waitUntil: 'networkidle' });
  await mob.waitForTimeout(900);
  if (await mob.locator('#modal-back.show').count()) await mob.click('[data-act="close-modal"]');
  await mob.waitForTimeout(300);
  const hScroll = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('16. mobile horizontal overflow px:', hScroll, 'tabbar visible:', await mob.locator('.tabbar').isVisible());
  await mob.screenshot({ path: '/tmp/shot-mobile-home.png', fullPage: false });

  await page.goto(base + '#/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/shot-pc-home.png' });
  await page.goto(base + '#/analysis', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/shot-pc-analysis.png' });
  await page.goto(base + '#/roadmap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/tmp/shot-pc-roadmap.png' });
  await page.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.click('[data-act="pick-field"][data-field="strategy"]');
  await page.waitForTimeout(400);
  await page.click('[data-act="start-quick"]');
  await page.waitForTimeout(700);
  await page.locator('.choice').nth(1).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/shot-pc-quiz.png' });
  await mob.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await mob.waitForTimeout(500);
  await mob.click('[data-act="pick-field"][data-field="strategy"]');
  await mob.waitForTimeout(300);
  await mob.click('[data-act="start-quick"]');
  await mob.waitForTimeout(500);
  await mob.locator('.choice').nth(1).click();
  await mob.waitForTimeout(600);
  await mob.screenshot({ path: '/tmp/shot-mobile-quiz.png' });

  console.log('\n--- ERRORS ---');
  console.log(errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
