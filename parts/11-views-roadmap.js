/* =========================================================================
   ビュー：学習ロードマップ / 用語カード
   ========================================================================= */

/* ---------------- ロードマップ ---------------- */
VIEWS.roadmap = function(){
  const plan = buildPlan();
  const acc = accuracyByField();
  const target = ST.settings.targetRate;
  const doneN = plan.days.filter(d=>d.done).length;
  const todayK = dayKey(today());

  if(!plan.exam){
    return {html:`
      <div class="page-head"><div><div class="eyebrow">Roadmap</div><h1>学習ロードマップ</h1></div></div>
      <div class="card">
        <div class="empty" style="border:none;background:none">
          <span class="em-ico">🗓️</span>
          受験日が設定されていません。
          <div class="mt16"><button class="btn btn-primary" data-act="open-settings">受験日を設定する</button></div>
        </div>
      </div>`};
  }

  // 週ごとにまとめる
  const weeks = [];
  plan.days.forEach((d,i)=>{
    const wi = Math.floor(diffDays(today(), d.date)/7);
    let w = weeks.find(x=>x.i===wi);
    if(!w){ w={i:wi, days:[]}; weeks.push(w); }
    w.days.push(d);
  });

  const weightRows = FIELD_KEYS.map(f=>{
    const r = acc[f].rate;
    const w = plan.weights[f];
    const cnt = plan.counts[f];
    return `<div class="field-row">
      <span class="fname"><i class="dot ${f}"></i>${FIELDS[f].short}</span>
      ${barHTML(r, f)}
      <span class="fval">${r===null?'<b>—</b>':`<b>${r}%</b>`} <span class="small">配分${cnt}回</span></span>
    </div>`;
  }).join("");

  return {html:`
    <div class="page-head">
      <div><div class="eyebrow">Roadmap</div><h1>学習ロードマップ</h1></div>
      <div class="spacer"></div>
      <button class="btn btn-sm" data-act="open-settings">条件を変更</button>
    </div>

    <section class="card">
      <div class="between">
        <div>
          <div class="small muted">受験日</div>
          <div style="font-family:var(--serif);font-size:20px">${plan.exam.getFullYear()}/${plan.exam.getMonth()+1}/${plan.exam.getDate()}（${WD[plan.exam.getDay()]}）</div>
        </div>
        <div class="right">
          <div class="small muted">残り</div>
          <div style="font-family:var(--serif);font-size:20px;color:var(--vermilion)">${Math.max(0,diffDays(today(),plan.exam))}日</div>
        </div>
        <div class="right">
          <div class="small muted">学習日</div>
          <div style="font-family:var(--serif);font-size:20px">${doneN} / ${plan.n}日</div>
        </div>
      </div>
      <div class="mt16">${barHTML(plan.n? Math.round(doneN/plan.n*100):0)}</div>
      <div class="small muted mt8">1日 ${ST.settings.minutesPerDay}分 × 週${(ST.settings.weekdays||[]).length}日（${(ST.settings.weekdays||[]).map(w=>WD[w]).join("・")}）。チェックすると進捗に反映されます。</div>
    </section>

    <section class="card">
      <div class="card-title">分野の配分<span class="ct-sub">正答率が低い分野ほど多く出題</span></div>
      <div class="field-rows">${weightRows}</div>
      <div class="note-box mt16" style="margin-bottom:0">
        <b>計画の考え方：</b>正答率が目標（${target}%）に届いていない分野ほど配分を増やし、演習の進み具合に合わせて毎回組み直しています。
        苦手分野が伸びてくると、自然に他分野へ配分が移ります。
      </div>
    </section>

    <div class="mt24">
      ${weeks.map(w=>`
        <div class="rm-week">
          <div class="rm-week-head">
            <span class="wk-tag">${w.i===0?"今週":`第${w.i+1}週`}</span>
            <h4>${jpDate(w.days[0].date)} 〜 ${jpDate(w.days[w.days.length-1].date)}</h4>
            <span class="wk-line"></span>
            <span class="small muted">${w.days.filter(d=>d.done).length}/${w.days.length}日</span>
          </div>
          <div class="rm-days">
            ${w.days.map(d=>{
              const isToday = d.key===todayK;
              const missed = !d.done && d.date < today();
              return `<div class="rm-day ${isToday?"is-today":""} ${missed?"past-miss":""}">
                <div class="rm-date">
                  <span class="d">${d.date.getDate()}</span>
                  <span class="m">${d.date.getMonth()+1}月</span>
                  <span class="w">${WD[d.date.getDay()]}${isToday?"・今日":""}</span>
                </div>
                <div class="rm-body">
                  <div class="t">${esc(d.title)}
                    ${d.field?pillField(d.field):""}
                    ${missed?`<span class="pill ng">未完了</span>`:""}</div>
                  <div class="d2">${esc(d.detail)} ・ ${d.mins}分</div>
                </div>
                <div class="flex" style="gap:6px">
                  <button class="btn btn-sm" data-act="go-plan" data-type="${d.type}" data-field="${d.field||""}">開始</button>
                  <button class="rm-chk ${d.done?"on":""}" data-act="toggle-plan" data-key="${d.key}" aria-label="完了にする">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                  </button>
                </div>
              </div>`;
            }).join("")}
          </div>
        </div>`).join("")}
      ${plan.n===0? `<div class="empty"><span class="em-ico">🗓️</span>学習日がありません。受験日や学習曜日を見直してください。</div>`:""}
    </div>

    <div class="btn-row mt24">
      <button class="btn" data-act="reset-plan">チェックをすべて外す</button>
    </div>
  `, after(){}};
};

act("toggle-plan", (el)=>{
  const k = el.dataset.key;
  ST.roadmap[k] = !ST.roadmap[k];
  save(true);
  render();
  if(ST.roadmap[k]) toast("完了にしました");
});
act("reset-plan", ()=>{
  openModal(`<h3 id="modal-title">チェックをすべて外しますか？</h3>
    <p class="m-sub">ロードマップの完了チェックだけをリセットします。学習履歴は残ります。</p>
    <div class="modal-foot"><button class="btn" data-act="close-modal">やめる</button>
      <button class="btn btn-vermilion" data-act="do-reset-plan">リセット</button></div>`);
});
act("do-reset-plan", ()=>{ ST.roadmap={}; save(true); closeModal(); toast("リセットしました"); render(); });

/* ---------------- 用語カード ---------------- */
let cardState = {field:"all", idx:0, flipped:false, order:null, weakOnly:false};

function cardList(){
  let list = (window.TERMS||[]).slice();
  if(cardState.field!=="all") list = list.filter(t=>t.field===cardState.field);
  if(cardState.weakOnly) list = list.filter(t=>ST.cardWeak[t.id]);
  if(!cardState.order || cardState.order.length!==list.length){
    cardState.order = list.map(t=>t.id);
  }
  return cardState.order.map(id=>list.find(t=>t.id===id)).filter(Boolean);
}

VIEWS.cards = function(){
  const list = cardList();
  const total = (window.TERMS||[]).length;
  const weakN = Object.keys(ST.cardWeak||{}).length;
  const idx = clamp(cardState.idx, 0, Math.max(0,list.length-1));
  cardState.idx = idx;
  const c = list[idx];
  const weak = c && ST.cardWeak[c.id];

  return {html:`
    <div class="page-head">
      <div><div class="eyebrow">Flashcards</div><h1>用語カード</h1></div>
      <div class="spacer"></div>
      <span class="pill">${total}枚</span>
    </div>

    <section class="card tight">
      <div class="between">
        <div class="chip-row">
          <button class="chip ${cardState.field==="all"?"on":""}" data-act="card-field" data-field="all">全分野</button>
          ${FIELD_KEYS.map(f=>`<button class="chip ${cardState.field===f?"on "+f[0]+"-on":""}" data-act="card-field" data-field="${f}">${FIELDS[f].short}</button>`).join("")}
        </div>
        <div class="flex">
          <button class="chip ${cardState.weakOnly?"on":""}" data-act="card-weak-only">苦手のみ ${weakN?`(${weakN})`:""}</button>
          <button class="btn btn-sm" data-act="card-shuffle">シャッフル</button>
        </div>
      </div>
    </section>

    ${c? `
    <div class="mt16 fc-stage">
      <div class="fc ${cardState.flipped?"flip":""}" data-act="card-flip" role="button" tabindex="0" aria-label="カードをめくる">
        <div class="fc-face">
          <span class="fc-tag">${FIELDS[c.field].short} ／ ${esc(c.sub||"")}</span>
          <div class="fc-term">${esc(c.term)}</div>
          <div class="fc-hint">タップして答えを見る</div>
        </div>
        <div class="fc-face back">
          <span class="fc-tag">${esc(c.term)}</span>
          <div class="fc-def">${esc(c.def)}</div>
          ${c.key? `<div class="fc-key"><b>ひと言：</b>${esc(c.key)}</div>`:""}
          <div class="fc-hint">タップして用語に戻る</div>
        </div>
      </div>
      <div class="fc-nav">
        <button class="btn" data-act="card-prev" aria-label="前のカード">←</button>
        <span class="fc-count">${idx+1} / ${list.length}</span>
        <button class="btn" data-act="card-next" aria-label="次のカード">→</button>
      </div>
      <div class="fc-actions">
        <button class="btn btn-sm ${weak?"btn-vermilion":""}" data-act="card-mark">${weak?"苦手から外す":"苦手に登録"}</button>
        <button class="btn btn-sm btn-ghost" data-act="card-again">最初から</button>
      </div>
      <div class="small muted center mt16">${weakN? `苦手登録 ${weakN}枚。受験前日に「苦手のみ」で見直すのがおすすめです。`:"気になる用語は「苦手に登録」しておくと、直前にまとめて見返せます。"}</div>
    </div>`
    : `<div class="empty mt16"><span class="em-ico">🗂️</span>条件に合うカードがありません</div>`}
  `, after(){}};
};

act("card-field", el=>{ cardState.field=el.dataset.field; cardState.idx=0; cardState.flipped=false; cardState.order=null; cardState.weakOnly=false; render(); });
act("card-flip", ()=>{ cardState.flipped=!cardState.flipped; render(); });
act("card-next", ()=>{ const l=cardList(); cardState.idx=(cardState.idx+1)%Math.max(1,l.length); cardState.flipped=false; render(); });
act("card-prev", ()=>{ const l=cardList(); cardState.idx=(cardState.idx-1+Math.max(1,l.length))%Math.max(1,l.length); cardState.flipped=false; render(); });
act("card-mark", ()=>{
  const l=cardList(); const c=l[cardState.idx]; if(!c) return;
  if(ST.cardWeak[c.id]) delete ST.cardWeak[c.id];
  else ST.cardWeak[c.id]=1;
  save(true); render();
});
act("card-weak-only", ()=>{ cardState.weakOnly=!cardState.weakOnly; cardState.idx=0; cardState.flipped=false; cardState.order=null; render(); });
act("card-shuffle", ()=>{
  const l=cardList(); cardState.order=shuffle(l.map(t=>t.id)); cardState.idx=0; cardState.flipped=false; render(); toast("シャッフルしました");
});
act("card-again", ()=>{ cardState.idx=0; cardState.flipped=false; render(); });
