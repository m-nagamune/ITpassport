const { chromium } = require('/opt/npm-cache/_npx/bbb8a2c4738e2b0c/node_modules/playwright-core');

const base = 'http://localhost:3000/index.html';
let pass = 0, fail = 0;
function check(label, cond, extra = '') {
  if (cond) { pass++; console.log('  OK  ' + label + (extra ? ' — ' + extra : '')); }
  else { fail++; console.log('  NG  ' + label + (extra ? ' — ' + extra : '')); }
}

(async () => {
  const errors = [];
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('CONSOLE: ' + m.text()); });

  await page.goto(base + '#/home', { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(base + '#/home', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  if (await page.locator('#modal-back.show').count()) {
    await page.click('[data-act="close-modal"]');
    await page.waitForTimeout(300);
  }

  /* ---------- 1. わからないボタンが存在する ---------- */
  await page.click('[data-act="start-quick"][data-field="all"][data-count="10"]');
  await page.waitForTimeout(500);
  check('1. 出題画面に「わからない」ボタンがある', await page.locator('[data-act="mark-unsure"]').count() === 1);

  /* ---------- 2. わからないで解答 → 未解答として記録＆解説表示 ---------- */
  await page.click('[data-act="mark-unsure"]');
  await page.waitForTimeout(320);
  const exTxt = (await page.locator('.explain').innerText().catch(() => '')) || '';
  check('2. 「わからない」で解説が開く', exTxt.includes('わからない'), exTxt.split('\n')[0] || '(なし)');
  check('3. 正解は明示される', exTxt.includes('正解は'));
  check('4. 選択肢がロックされる', await page.locator('.choice[disabled]').count() === 4);
  check('5. プログレスに未解答マーク', await page.locator('.progress-track i.unk').count() === 1);

  /* ---------- 3. 残りは通常解答、結果へ ---------- */
  // 1問目はすでにロック済みなので、まず次へ
  await page.click('[data-act="next-q"]');
  await page.waitForTimeout(250);
  for (let i = 1; i < 10; i++) {
    await page.locator('.choice').nth(i % 4).click();
    await page.waitForTimeout(160);
    await page.click('[data-act="next-q"]');
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(800);
  check('6. 結果画面に遷移', page.url().includes('#/result/'), page.url().split('#')[1]);

  const resTxt = await page.locator('#view').innerText();
  check('7. 結果に「わからない 1問」が出る', /わからない\s*1問/.test(resTxt), (resTxt.match(/わからない\s*\d+問/) || [''])[0]);
  check('8. 分母の説明がある', resTxt.includes('正答率の分母'));
  check('9. 解答一覧に「わからない」バッジ', await page.locator('.pill.unk').count() === 1);
  check('10. 「わからない (1)」の解き直しボタン', await page.locator('[data-act="retry-wrong"]').filter({ hasText: 'わからない' }).count() === 1);

  /* ---------- 4. 重み付け：わからないは不正解として集計 ---------- */
  const st = await page.evaluate(() => {
    const h = ST.history[ST.history.length - 1];
    return {
      correct: h.correct, count: h.count, rate: h.rate,
      unsure: h.answers.filter(a => a.unsure).length,
      unsureOk: h.answers.filter(a => a.unsure && a.ok).length,
      unsurePick: h.answers.filter(a => a.unsure).map(a => a.pick)
    };
  });
  check('11. わからないは正解にならない', st.unsureOk === 0, JSON.stringify(st));
  check('12. わからないは pick=null で保存', st.unsurePick.every(p => p === null));
  check('13. 分母に含まれる（count=10）', st.count === 10);
  check('14. 正答率が (正解数)/10 で計算される', st.rate === Math.round(st.correct / st.count * 100), `${st.correct}/${st.count}=${st.rate}%`);

  /* ---------- 5. 復習モードに「わからない」が入る ---------- */
  const weakHas = await page.evaluate(() => {
    const h = ST.history[ST.history.length - 1];
    const uq = h.answers.find(a => a.unsure).qid;
    return weakQuestions().includes(uq);
  });
  check('15. わからない問題が復習対象に入る', weakHas);

  /* ---------- 6. 履歴画面にわからない件数 ---------- */
  await page.goto(base + '#/history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const histTxt = await page.locator('#view').innerText();
  check('16. 履歴に「(わからない1)」表示', /わからない\s*1/.test(histTxt), (histTxt.match(/わからない\s*\d+/) || [''])[0]);

  /* ---------- 7. 模擬試験でも押せる（非ロック） ---------- */
  await page.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.click('[data-act="start-mock"]');
  await page.waitForTimeout(600);
  check('17. 模擬試験に「わからない」ボタン', await page.locator('[data-act="mark-unsure"]').count() === 1);
  await page.click('[data-act="mark-unsure"]');
  await page.waitForTimeout(300);
  check('18. 模擬試験ではロックされない（戻って変更可）', await page.locator('.choice[disabled]').count() === 0);
  check('19. 模擬試験では解説を出さない', await page.locator('.explain').count() === 0);
  await page.click('[data-act="next-q"]');
  await page.waitForTimeout(300);
  check('20. わからないでも次へ進める', (await page.locator('.quiz-meta b').innerText()).trim() === '2');
  await page.click('[data-act="prev-q"]');
  await page.waitForTimeout(300);
  check('21. 前の問題へ戻れる', (await page.locator('.quiz-meta b').innerText()).trim() === '1');
  // 変更できる
  await page.locator('.choice').nth(0).click();
  await page.waitForTimeout(250);
  const examAns = await page.evaluate(() => {
    const s = ST.session;
    return { pick: s.answers[s.idx].pick, unsure: !!s.answers[s.idx].unsure };
  });
  check('22. わからない→選択肢に変更できる', examAns.pick === 0 && examAns.unsure === false, JSON.stringify(examAns));

  /* ---------- 8. キーボード E ---------- */
  await page.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.click('[data-act="start-quick"][data-field="all"][data-count="10"]');
  await page.waitForTimeout(500);
  await page.keyboard.press('e');
  await page.waitForTimeout(350);
  const kbd = await page.evaluate(() => {
    const s = ST.session; const a = s.answers[s.idx];
    return a ? { unsure: !!a.unsure, pick: a.pick, locked: !!a.locked } : null;
  });
  check('23. キーボード E で「わからない」', kbd && kbd.unsure === true && kbd.pick === null && kbd.locked === true, JSON.stringify(kbd));

  /* ---------- 9. 問題の一括追加 ---------- */
  await page.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check('24. 演習画面に「まとめて追加」導線', await page.locator('[data-act="bulk-questions"]').count() >= 1);
  check('25. 演習画面に「1問ずつ追加」導線', await page.locator('[data-act="new-question"]').count() >= 1);

  const before = await page.evaluate(() => allQuestions().length);
  await page.click('[data-act="bulk-questions"]');
  await page.waitForTimeout(350);
  await page.click('[data-act="bulk-sample"]');
  await page.waitForTimeout(350);
  const prev = await page.locator('#bulk-preview').innerText();
  check('26. 記入例で2問と認識される', prev.includes('2問'), prev.replace(/\n/g, ' ').trim());
  await page.click('[data-act="bulk-save"]');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => allQuestions().length);
  check('27. 一括追加で問題数が増える', after === before + 2, `${before} → ${after}`);

  const added = await page.evaluate(() => ST.custom.slice(-2));
  check('28. 分野が正しく解釈される', added[0].field === 'strategy' && added[1].field === 'management', added.map(q => q.field).join(','));
  check('29. 正解番号が正しく解釈される（ア=0 / イ=1 / ウ=2）', added[0].a === 1 && added[1].a === 2, added.map(q => q.a).join(','));
  check('30. 選択肢の記号が除去される', !/^[アイウエ][.．]/.test(added[0].c[0]), added[0].c[0]);
  check('31. 中分類・小分類も入る', added[1].mid === 'システム監査' && added[1].sub === 'システム監査', `${added[1].mid}/${added[1].sub}`);

  /* 追加した問題が演習に出るか（分野フィルタ） */
  await page.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const cntTxt = await page.locator('#view').innerText();
  check('32. 収録数が増えている', new RegExp('収録\\s*' + after + '問').test(cntTxt), (cntTxt.match(/収録\s*\d+問/) || [''])[0]);

  /* ---------- 10. JSON貼り付け ---------- */
  await page.click('[data-act="bulk-questions"]');
  await page.waitForTimeout(350);
  await page.evaluate(() => {
    const t = document.querySelector('#bulk-text');
    t.value = JSON.stringify([{ field: 'technology', mid: 'セキュリティ', sub: '情報セキュリティ', q: 'JSONで追加したテスト問題です。', c: ['A', 'B', 'C', 'D'], a: 2, e: 'テスト解説' }]);
    t.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const jprev = await page.locator('#bulk-preview').innerText();
  check('33. JSONでも1問と認識', jprev.includes('1問'), jprev.replace(/\n/g, ' ').trim());
  await page.click('[data-act="bulk-save"]');
  await page.waitForTimeout(500);
  const after2 = await page.evaluate(() => allQuestions().length);
  check('34. JSON追加で増える', after2 === after + 1, `${after} → ${after2}`);

  /* ---------- 11. 分析画面 ---------- */
  await page.goto(base + '#/analysis', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const anTxt = await page.locator('#view').innerText();
  check('35. 分析に「わからない」の説明がある', anTxt.includes('わからない'));
  check('36. 分析に「わからない」累計集計', /わからない累計\s*\d+問/.test(anTxt), (anTxt.match(/わからない累計\s*\d+問/) || [''])[0]);
  check('37. 分析の推移グラフ（SVG）が描画される', await page.locator('#view svg').count() >= 1);

  /* ---------- 12. モバイル ---------- */
  const mob = await ctx.newPage();
  await mob.setViewportSize({ width: 375, height: 780 });
  await mob.goto(base + '#/practice', { waitUntil: 'networkidle' });
  await mob.waitForTimeout(700);
  if (await mob.locator('#modal-back.show').count()) {
    await mob.click('[data-act="close-modal"]');
    await mob.waitForTimeout(250);
  }
  await mob.click('[data-act="start-quick"][data-field="all"][data-count="10"]');
  await mob.waitForTimeout(600);
  const over = await mob.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check('38. モバイルで横スクロールが出ない', over <= 1, 'overflow=' + over);
  check('39. モバイルでも「わからない」ボタンが見える', await mob.locator('[data-act="mark-unsure"]').isVisible());
  const btnBox = await mob.locator('[data-act="mark-unsure"]').boundingBox();
  check('40. ボタンが画面内に収まる', btnBox && btnBox.width > 80 && (btnBox.x + btnBox.width) <= 376, JSON.stringify(btnBox && { x: Math.round(btnBox.x), w: Math.round(btnBox.width) }));
  await mob.screenshot({ path: '/home/user/webapp/test/shots/ask2-mobile-quiz.png', fullPage: true });

  await browser.close();
  console.log('\n=== RESULT ===');
  console.log(`passed: ${pass} / ${pass + fail}`);
  console.log('--- ERRORS ---');
  console.log(errors.length ? errors.join('\n') : 'none');
  process.exit(fail || errors.length ? 1 : 0);
})();
