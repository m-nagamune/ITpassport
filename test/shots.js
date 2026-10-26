const { chromium } = require('/opt/npm-cache/_npx/bbb8a2c4738e2b0c/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const base = 'http://localhost:3000/index.html';
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));

  // seed a realistic history so charts have data
  await page.goto(base + '#/home');
  await page.waitForTimeout(800);
  if (await page.locator('#modal-back.show').count()) await page.click('[data-act="close-modal"]');

  const modes = [['strategy', 7], ['technology', 6], ['management', 5], ['all', 8], ['technology', 7], ['strategy', 8]];
  for (const [f, n] of modes) {
    await page.evaluate(async ({ f, n }) => {
      startSession({ mode: 'practice', field: f, count: 10 });
      for (let i = 0; i < 10; i++) {
        const s = ST.session;
        const q = qById(s.qids[s.idx]);
        // deliberately miss more in strategy to show weak weighting
        const bias = q.field === 'strategy' ? 0.45 : 0.8;
        const pick = Math.random() < bias ? q.a : (q.a + 1) % 4;
        applyChoice(pick);
        if (s.idx < 9) { ST.session.idx++; save(true); render(); }
      }
      finishSession(false);
      await new Promise(r => setTimeout(r, 40));
    }, { f, n });
    await page.waitForTimeout(250);
  }

  await page.goto(base + '#/home'); await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/v2-home.png' });
  await page.goto(base + '#/analysis'); await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/v2-analysis.png', fullPage: true });
  await page.goto(base + '#/roadmap'); await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/v2-roadmap.png' });
  await page.goto(base + '#/result/' + (await page.evaluate(() => ST.history[ST.history.length - 1].id)));
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/v2-result.png' });
  await page.goto(base + '#/cards'); await page.waitForTimeout(700);
  await page.screenshot({ path: '/tmp/v2-cards.png' });

  // mobile
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mob.goto(base + '#/home'); await mob.waitForTimeout(900);
  if (await mob.locator('#modal-back.show').count()) await mob.click('[data-act="close-modal"]');
  await mob.waitForTimeout(300);
  await mob.screenshot({ path: '/tmp/v2-mob-home.png' });
  await mob.goto(base + '#/analysis'); await mob.waitForTimeout(800);
  const ov = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('mobile analysis overflow:', ov);
  await mob.screenshot({ path: '/tmp/v2-mob-analysis.png' });
  await mob.goto(base + '#/roadmap'); await mob.waitForTimeout(800);
  await mob.screenshot({ path: '/tmp/v2-mob-roadmap.png' });
  const ov2 = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('mobile roadmap overflow:', ov2);
  await mob.goto(base + '#/cards'); await mob.waitForTimeout(700);
  await mob.screenshot({ path: '/tmp/v2-mob-cards.png' });

  const plan = await page.evaluate(() => { const p = buildPlan(); return { n: p.n, counts: p.counts, weights: p.weights, types: p.days.map(d=>d.type) }; });
  console.log('plan:', JSON.stringify(plan));
  const stats = await page.evaluate(() => ({ acc: accuracyByField(), overall: overallStats(), weak: weakQuestions().length }));
  console.log('stats:', JSON.stringify(stats));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
