const { chromium } = require('/opt/npm-cache/_npx/bbb8a2c4738e2b0c/node_modules/playwright-core');
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:3000/index.html#/home');
  await page.waitForTimeout(900);
  if (await page.locator('#modal-back.show').count()) await page.click('[data-act="close-modal"]');

  // simulate: strategy weak(40%), management good(90%), technology good(80%)
  await page.evaluate(() => {
    ST.history = [];
    const mk = (field, correctRatio, n) => {
      const pool = allQuestions().filter(q => q.field === field).slice(0, 20);
      const answers = [];
      for (let i = 0; i < n; i++) {
        const q = pool[i % pool.length];
        const ok = (i % 10) < Math.round(correctRatio * 10);
        answers.push({ qid: q.id, pick: ok ? q.a : (q.a + 1) % 4, ok, ts: Date.now() });
      }
      return answers;
    };
    ST.history.push({ id: 'h1', ts: Date.now() - 86400000, mode: 'practice', field: 'strategy', count: 30, correct: 12, rate: 40, sec: 600, answers: mk('strategy', 0.4, 30) });
    ST.history.push({ id: 'h2', ts: Date.now() - 43200000, mode: 'practice', field: 'management', count: 20, correct: 18, rate: 90, sec: 500, answers: mk('management', 0.9, 20) });
    ST.history.push({ id: 'h3', ts: Date.now() - 3600000, mode: 'practice', field: 'technology', count: 20, correct: 16, rate: 80, sec: 500, answers: mk('technology', 0.8, 20) });
    save(true);
  });
  await page.goto('http://localhost:3000/index.html#/roadmap');
  await page.reload();
  await page.waitForTimeout(1000);
  const plan = await page.evaluate(() => {
    const p = buildPlan();
    return { n: p.n, counts: p.counts, weights: p.weights, seq: p.days.map(d => d.field || d.type), acc: accuracyByField() };
  });
  console.log('acc:', JSON.stringify({ s: plan.acc.strategy.rate, m: plan.acc.management.rate, t: plan.acc.technology.rate }));
  console.log('counts:', JSON.stringify(plan.counts), 'n=', plan.n);
  console.log('seq:', plan.seq.join(','));
  await page.screenshot({ path: '/tmp/v3-roadmap.png' });
  await page.goto('http://localhost:3000/index.html#/analysis');
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/v3-analysis.png', fullPage: true });

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mob.goto('http://localhost:3000/index.html#/roadmap');
  await mob.waitForTimeout(1000);
  await mob.evaluate(() => window.scrollTo(0, 700));
  await mob.waitForTimeout(400);
  await mob.screenshot({ path: '/tmp/v3-mob-roadmap.png' });
  console.log('mob overflow:', await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
  await mob.goto('http://localhost:3000/index.html#/analysis');
  await mob.waitForTimeout(800);
  await mob.evaluate(() => window.scrollTo(0, 500));
  await mob.waitForTimeout(300);
  await mob.screenshot({ path: '/tmp/v3-mob-analysis.png' });
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
  await browser.close();
})();
