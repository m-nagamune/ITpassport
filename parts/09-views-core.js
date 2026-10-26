/* =========================================================================
   ビュー：ホーム / 問題演習 / 出題 / 結果
   ========================================================================= */
const CHOICE_MARKS = ["ア","イ","ウ","エ"];

/* ---------------- 学習ロードマップの計画生成 ---------------- */
function buildPlan(){
  const exam = parseDay(ST.settings.examDate);
  const t = today();
  if(!exam) return {exam:null, days:[], studyDates:[], total:0, n:0, weights:{}};
  const total = Math.max(0, diffDays(t, exam));
  const wd = (ST.settings.weekdays && ST.settings.weekdays.length) ? ST.settings.weekdays : [2,4,6,0];
  const acc = accuracyByField();
  const target = ST.settings.targetRate || 70;
  const weights = {};
  FIELD_KEYS.forEach(f=>{
    const r = acc[f].rate;
    weights[f] = r===null ? 1.7 : 1 + Math.max(0, target-r)/35;
  });
  const studyDates = [];
  for(let i=0;i<total;i++){ const d=addDays(t,i); if(wd.includes(d.getDay())) studyDates.push(d); }
  const n = studyDates.length;
  // 最大剰余法で「苦手分野ほど多く」なるよう配分を決める
  const counts = {strategy:0,management:0,technology:0};
  const totalW = FIELD_KEYS.reduce((s,f)=>s+weights[f],0);
  const quotas = FIELD_KEYS.map(f=>({f, q: totalW>0 ? weights[f]/totalW*n : n/FIELD_KEYS.length}));
  let assigned = 0;
  quotas.forEach(o=>{ counts[o.f] = Math.floor(o.q); assigned += counts[o.f]; });
  const remainders = quotas.slice().sort((a,b)=>(b.q-Math.floor(b.q))-(a.q-Math.floor(a.q)));
  for(let i=0; assigned<n && i<remainders.length*2; i++){
    const o = remainders[i % remainders.length];
    counts[o.f]++; assigned++;
  }
  // 同じ分野が連続しないよう、残数の多い分野から順に並べる
  const left = Object.assign({}, counts);
  const seq = [];
  let prev = null;
  for(let i=0;i<n;i++){
    const cands = FIELD_KEYS.filter(f=>left[f]>0);
    if(!cands.length) break;
    cands.sort((a,b)=> (left[b]-left[a]) || (a===prev?1:-1) - (b===prev?1:-1));
    let pick = cands.find(f=>f!==prev) || cands[0];
    seq.push(pick); left[pick]--; prev = pick;
  }
  while(seq.length<n) seq.push(FIELD_KEYS[0]);
  const mockIdx = new Set();
  if(n>=6){ mockIdx.add(Math.round(n*0.4)); mockIdx.add(Math.round(n*0.75)); }
  const weakN = weakQuestions().length;
  const minutes = ST.settings.minutesPerDay || 60;
  const days = studyDates.map((d,i)=>{
    let type="drill", field=seq[i];
    if(i===n-1){ type="final"; field=null; }
    else if(i===n-2){ type="term"; field=null; }
    else if(mockIdx.has(i)){ type="mock"; field=null; }
    else if(i%3===2 && weakN>=8){ type="review"; field=null; }
    let title="", detail="", mins=minutes;
    if(type==="drill"){
      title = `${FIELDS[field].short}系 10問演習`;
      detail = `問題演習で「${FIELDS[field].name}」を10問。間違えた問題は解説をその場で読み、用語カードを5枚。`;
    } else if(type==="review"){
      title = "弱点復習（誤答ノート）";
      detail = `間違えた問題だけを復習モードで解き直す。今の誤答は${weakN}問。`;
    } else if(type==="mock"){
      title = "模擬試験 60問（時間を計る）";
      detail = "本番と同じ4択・60問を制限時間60分で。結果画面で分野別の弱点を確認する。";
      mins = 60;
    } else if(type==="term"){
      title = "用語カード総復習";
      detail = "用語カードを全分野から20枚。説明できない用語に「苦手」を付けて、直前にもう一度見る。";
    } else {
      title = "総仕上げ：誤答を全問やり直す";
      detail = "復習モードで誤答ノートを空にする。正答率80%以上なら本番は十分戦える。";
    }
    return {date:d, key:dayKey(d), type, field, title, detail, mins, done: !!ST.roadmap[dayKey(d)]};
  });
  return {exam, days, studyDates, total, n, weights, counts};
}

/* ---------------- ホーム ---------------- */
VIEWS.home = function(){
  const st = overallStats();
  const acc = accuracyByField();
  const plan = buildPlan();
  const weak = weakQuestions();
  const session = ST.session;
  const daysLeft = plan.exam ? diffDays(today(), plan.exam) : null;
  const doneDays = plan.days.filter(d=>d.done).length;
  const todayPlan = plan.days.find(d=>d.key===dayKey(today()));
  const nextPlan = plan.days.find(d=>d.date > today()) || null;
  const stk = streakInfo();

  const resume = (session && session.idx < session.qids.length) ? `
    <div class="card tight" style="border-color:#bcd3ce;background:linear-gradient(#f4fbfa,#eef7f5)">
      <div class="between">
        <div>
          <div style="font-weight:700;font-size:13.5px">途中の演習があります</div>
          <div class="small muted">${session.mode==="exam"?"模擬試験":"問題演習"} ・ ${session.idx+1} / ${session.qids.length} 問目まで</div>
        </div>
        <div class="flex">
          <a class="btn btn-primary btn-sm" href="#/quiz">続きから再開</a>
          <button class="btn btn-sm" data-act="discard-session">破棄</button>
        </div>
      </div>
    </div>` : "";

  const todayTask = todayPlan ? `
    <li class="${todayPlan.done?"done":""}">
      <span class="ck"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span>
      <span class="tx">${esc(todayPlan.title)}<span class="meta">${todayPlan.mins}分 ・ ${esc(todayPlan.detail)}</span></span>
      <button class="btn btn-sm" data-act="go-plan" data-type="${todayPlan.type}" data-field="${todayPlan.field||""}">開始</button>
    </li>` : `
    <li>
      <span class="ck" style="border-style:dashed"></span>
      <span class="tx">今日は休養日です<span class="meta">${nextPlan?`次の学習日は ${jpDate(nextPlan.date)}：${esc(nextPlan.title)}`:"計画づくりから始めましょう"}</span></span>
      <button class="btn btn-sm" data-act="start-quick" data-field="all" data-count="10">軽く10問</button>
    </li>`;

  const fieldBars = FIELD_KEYS.map(f=>{
    const r = acc[f];
    return `<div class="field-row">
      <span class="fname"><i class="dot ${f}"></i>${FIELDS[f].short}</span>
      ${barHTML(r.rate, f)}
      <span class="fval">${r.rate===null?'<b>—</b>':`<b>${r.rate}%</b> <span class="small">${r.c}/${r.t}</span>`}</span>
    </div>`;
  }).join("");

  return {html:`
    <div class="page-head">
      <div>
        <div class="eyebrow">Dashboard</div>
        <h1>学習ノート</h1>
      </div>
      <div class="spacer"></div>
      <a class="btn btn-sm" href="#/manage">設定・問題管理</a>
    </div>

    ${resume}

    <section class="hero" style="margin-top:${resume?"14px":"0"}">
      <div class="eyebrow">Countdown</div>
      <h2>${plan.exam? `ITパスポート試験まで` : "受験日を設定しましょう"}</h2>
      ${plan.exam? `
        <div class="countdown">
          <span class="num">${daysLeft>=0?daysLeft:0}</span><span class="unit">日</span>
          <span class="rest">${plan.exam.getFullYear()}/${plan.exam.getMonth()+1}/${plan.exam.getDate()}(${WD[plan.exam.getDay()]}) ・ 学習日 ${doneDays}/${plan.n}日完了</span>
        </div>
        ${barHTML(plan.n? Math.round(doneDays/plan.n*100):0)}
        <div class="small muted" style="margin-top:6px">
          残りの学習日は <b>${Math.max(0, plan.n-doneDays)}日</b>。${stk>0?`連続学習 ${stk}日。`:""}
          1日 ${ST.settings.minutesPerDay}分 × 週${(ST.settings.weekdays||[]).length}日ペース。
        </div>` : `
        <p class="lead">受験日を入力すると、そこから逆算した学習計画を自動で作成します。</p>
        <a class="btn btn-primary" href="#/manage">受験日を設定する</a>`}
      <div class="quick-grid">
        <button class="quick" data-act="start-quick" data-field="all" data-count="10">
          <span class="q-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6"/></svg></span>
          <span class="q-t">10問だけ演習</span><span class="q-d">ランダム4択。まずは1セット</span>
        </button>
        <button class="quick tone-v" data-act="go-review">
          <span class="q-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></span>
          <span class="q-t">間違いだけ復習</span><span class="q-d">${weak.length? `${weak.length}問が復習待ち`:"誤答はありません"}</span>
        </button>
        <button class="quick tone-s" data-act="start-mock">
          <span class="q-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg></span>
          <span class="q-t">模擬試験 60問</span><span class="q-d">制限時間60分・本番形式</span>
        </button>
        <button class="quick tone-m" data-act="go-terms">
          <span class="q-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h7l2 3H3z"/><path d="M3 13h18v6H3z"/></svg></span>
          <span class="q-t">用語カード</span><span class="q-d">${(window.TERMS||[]).length}枚で暗記</span>
        </button>
      </div>
    </section>

    <div class="grid-2" style="margin-top:16px">
      <section class="card">
        <div class="card-title">今日のタスク<span class="ct-sub">${jpDate(today())}</span></div>
        <ul class="today-list">${todayTask}</ul>
        <hr class="hr-dash">
        <div class="between">
          <div class="small muted">全体 ${st.total}問 ・ 正答率 ${st.rate===null?"—":st.rate+"%"}</div>
          <a class="btn btn-sm" href="#/roadmap">計画を見る</a>
        </div>
      </section>
      <section class="card">
        <div class="card-title">分野別の正答率<span class="ct-sub">全期間</span></div>
        <div class="field-rows">${fieldBars}</div>
        ${weak.length? `<div class="note-box mt16" style="margin-bottom:0">
          <b>弱点メモ：</b>${weak.length}問が未回復です。<a href="#/practice">復習モード</a>で解き直しましょう。
        </div>`:`<div class="small muted mt16">まだ誤答はありません。この調子で演習を続けましょう。</div>`}
      </section>
    </div>

    <section class="card" style="margin-top:16px">
      <div class="card-title">記録のあらまし</div>
      <div class="stat-row">
        <div class="stat"><span class="lbl">総解答数</span><span class="val">${st.total}<small>問</small></span><span class="note">セッション ${st.sessions}回</span></div>
        <div class="stat"><span class="lbl">全体正答率</span><span class="val">${st.rate===null?"—":st.rate}<small>${st.rate===null?"":"%"}</small></span><span class="note">目標 ${ST.settings.targetRate}%</span></div>
        <div class="stat"><span class="lbl">学習した日</span><span class="val">${st.studyDays}<small>日</small></span><span class="note">連続 ${stk}日</span></div>
      </div>
    </section>
  `, after(){}};
};

/* ---------------- 問題演習（設定） ---------------- */
let practiceDraft = {mode:"field", field:"all", count:10, pastOnly:false};

VIEWS.practice = function(){
  const d = practiceDraft;
  const weak = weakQuestions();
  const counts = {strategy:0,management:0,technology:0};
  const past = {strategy:0,management:0,technology:0};
  allQuestions().forEach(q=>{ counts[fieldOf(q)]++; if(q.p) past[fieldOf(q)]++; });
  const totalQ = allQuestions().length;
  const acc = accuracyByField();

  return {html:`
    <div class="page-head">
      <div><div class="eyebrow">Practice</div><h1>問題演習</h1></div>
      <div class="spacer"></div>
      <span class="pill">収録 ${totalQ}問</span>
    </div>

    <section class="card">
      <div class="card-title">出題範囲</div>
      <div class="chip-row" id="field-chips">
        <button class="chip ${d.field==="all"?"on":""}" data-act="pick-field" data-field="all">ランダム（全分野）<span class="small muted">${totalQ}</span></button>
        ${FIELD_KEYS.map(f=>`<button class="chip ${d.field===f?"on "+f[0]+"-on":""}" data-act="pick-field" data-field="${f}">
          ${FIELDS[f].short}<span class="small muted">${counts[f]}</span></button>`).join("")}
      </div>
      <div class="small muted mt8">分野別の正答率：${FIELD_KEYS.map(f=>`${FIELDS[f].short} ${acc[f].rate===null?"—":acc[f].rate+"%"}`).join(" ／ ")}</div>
      <hr class="hr-dash">
      <div class="between">
        <label class="chk-line"><input type="checkbox" id="past-only" ${d.pastOnly?"checked":""} data-act="toggle-past"> 過去問ベースの問題だけを出題する</label>
        <span class="small muted">※ 実際の過去問を再構成した問題に「過去問」ラベルを付けています</span>
      </div>
    </section>

    <section class="card">
      <div class="card-title">出題数</div>
      <div class="seg wide" id="count-seg">
        ${[10,20,30].map(n=>`<button class="${d.count===n?"on":""}" data-act="pick-count" data-count="${n}">${n}問</button>`).join("")}
      </div>
      <div class="small muted mt8">1セッションの目安：10問＝約10分／20問＝約20分／30問＝約30分</div>
    </section>

    <section class="card">
      <div class="card-title">モード</div>
      <div class="grid-3">
        <button class="quick" data-act="start-quick" data-field="${d.field}" data-count="${d.count}" data-past="${d.pastOnly?1:0}">
          <span class="q-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 4h14v16H5z"/><path d="M9 9h6M9 13h6"/></svg></span>
          <span class="q-t">通常演習</span><span class="q-d">1問ごとに正誤と解説を表示</span>
        </button>
        <button class="quick tone-v" data-act="go-review">
          <span class="q-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg></span>
          <span class="q-t">復習モード</span><span class="q-d">${weak.length? `間違えた${weak.length}問だけ`:"誤答はありません"}</span>
        </button>
        <button class="quick tone-s" data-act="start-mock">
          <span class="q-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg></span>
          <span class="q-t">模擬試験</span><span class="q-d">60問・制限時間60分</span>
        </button>
      </div>
    </section>

    <div class="note-box">
      <b>使い方：</b>まず10問解いてみて、結果画面で分野別の弱点を確認。誤答は自動的に「復習モード」にたまります。
      解説を読んだら、関連する用語カードをめくると定着しやすくなります。
    </div>
  `, after(){}};
};

/* ---------------- セッション開始 ---------------- */
function pickQuestions(opts){
  const {mode="practice", field="all", count=10, pastOnly=false} = opts||{};
  let pool;
  if(mode==="review"){
    const ids = weakQuestions();
    pool = ids.map(id=>qById(id)).filter(Boolean);
    if(!pool.length) return null;
    return shuffle(pool).slice(0, Math.min(count||pool.length, pool.length));
  }
  pool = allQuestions();
  if(field!=="all") pool = pool.filter(q=>fieldOf(q)===field);
  if(pastOnly) pool = pool.filter(q=>q.p);
  if(!pool.length) return null;
  if(mode==="exam"){
    // 分野のバランスを取って60問
    const per = Math.ceil(count/3);
    let picked=[];
    FIELD_KEYS.forEach(f=>{
      const fp = shuffle(allQuestions().filter(q=>fieldOf(q)===f));
      picked = picked.concat(fp.slice(0,per));
    });
    if(picked.length<count){
      const rest = shuffle(allQuestions().filter(q=>!picked.includes(q)));
      picked = picked.concat(rest.slice(0, count-picked.length));
    }
    return shuffle(picked).slice(0,count);
  }
  const n = Math.min(count, pool.length);
  return shuffle(pool).slice(0,n);
}

function startSession(opts){
  const qs = pickQuestions(opts);
  if(!qs || !qs.length){ toast("条件に合う問題がありません"); return; }
  ST.session = {
    id: uid("s"),
    mode: opts.mode||"practice",
    field: opts.field||"all",
    count: qs.length,
    qids: qs.map(q=>q.id),
    idx: 0,
    answers: new Array(qs.length).fill(null),
    startTs: Date.now(),
    limitSec: opts.mode==="exam" ? (opts.limitSec||3600) : null,
    endsAt: opts.mode==="exam" ? Date.now()+(opts.limitSec||3600)*1000 : null
  };
  save(true);
  navigate("quiz");
}

act("pick-field", el=>{ practiceDraft.field = el.dataset.field; render(); });
act("pick-count", el=>{ practiceDraft.count = +el.dataset.count; render(); });
act("toggle-past", el=>{ practiceDraft.pastOnly = !!el.checked; });
act("start-quick", el=>{
  startSession({mode:"practice", field: el.dataset.field||"all", count:+el.dataset.count||10, pastOnly: el.dataset.past==="1" || practiceDraft.pastOnly});
});
act("start-mock", ()=>{ startSession({mode:"exam", field:"all", count:60, limitSec:3600}); });
act("go-review", ()=>{
  const w = weakQuestions();
  if(!w.length){ toast("復習する誤答がありません。まず演習をしましょう"); navigate("practice"); return; }
  startSession({mode:"review", field:"all", count: Math.min(30, w.length)});
});
act("go-terms", ()=>{ navigate("cards"); });
act("discard-session", ()=>{
  openModal(`<h3 id="modal-title">途中の演習を破棄しますか？</h3>
    <p class="m-sub">このセッションの解答は記録に残りません。</p>
    <div class="modal-foot"><button class="btn" data-act="close-modal">やめる</button>
    <button class="btn btn-vermilion" data-act="confirm-discard">破棄する</button></div>`);
});
act("confirm-discard", ()=>{ ST.session=null; save(true); closeModal(); toast("演習を破棄しました"); render(); });

act("go-plan", el=>{
  const type = el.dataset.type, field = el.dataset.field;
  if(type==="mock"){ startSession({mode:"exam", count:60, limitSec:3600}); }
  else if(type==="review"||type==="final"){
    const w=weakQuestions();
    if(!w.length){ toast("誤答がありません。通常演習に進みます"); startSession({mode:"practice", field:"all", count:10}); return; }
    startSession({mode:"review", count: Math.min(30, w.length)});
  }
  else if(type==="term"){ navigate("cards"); }
  else { startSession({mode:"practice", field: field||"all", count:10}); }
});

/* ---------------- 出題 ---------------- */
let timerHandle = null;
VIEWS.quiz = function(){
  const s = ST.session;
  if(!s){ navigate("practice"); return {html:""}; }
  const qi = Math.min(s.idx, s.qids.length-1);
  const q = qById(s.qids[qi]);
  if(!q){ ST.session=null; save(true); navigate("practice"); return {html:""}; }
  const ans = s.answers[qi];
  const isExam = s.mode==="exam";
  const answered = !!ans && (ans.locked || isExam===false);
  const locked = !!(ans && ans.locked);
  const total = s.qids.length;

  const track = s.qids.map((_,i)=>{
    const a = s.answers[i];
    let cls = "";
    if(a && (a.locked || (a.ok!==undefined && !isExam))) cls = a.ok? "ok":"ng";
    else if(i===qi) cls="now";
    return `<i class="${cls}"></i>`;
  }).join("");

  const choices = q.c.map((txt,i)=>{
    let cls="";
    if(ans && ans.pick===i) cls+=" sel";
    if(locked){ if(i===q.a) cls=" correct"; else if(ans.pick===i) cls=" wrong"; }
    const mk = locked ? (i===q.a? '<span class="mk">正解</span>' : (ans.pick===i? '<span class="mk">あなたの解答</span>':"")) : "";
    return `<li><button class="choice${cls}" data-act="choose" data-i="${i}" ${locked||(isExam&&false)?"disabled":""}>
      <span class="k">${CHOICE_MARKS[i]}</span><span>${esc(txt)}</span>${mk}</button></li>`;
  }).join("");

  const explain = locked ? `
    <div class="explain">
      <div class="ex-head">
        <span class="res ${ans.ok?"":"wrong"}" style="color:${ans.ok?"#2f6b3a":"#9c4526"}">${ans.ok? "○ 正解":"× 不正解"}</span>
        <span class="muted small">正解は「${CHOICE_MARKS[q.a]}」</span>
      </div>
      <p>${esc(q.e||"")}</p>
      ${q.pt?`<div class="point"><b>暗記：</b>${esc(q.pt)}</div>`:""}
    </div>` : "";

  const isLast = qi===total-1;
  const footer = locked ? `
      <div class="quiz-foot">
        <span class="kbd-hint">キー操作：A〜D で解答 ／ Enter で次へ</span>
        <span class="spacer"></span>
        ${qi>0? `<button class="btn" data-act="prev-q">← 前の問題</button>`:""}
        <button class="btn btn-primary" data-act="next-q">${isLast? "結果を見る":"次の問題 →"}</button>
      </div>` : (isExam ? `
      <div class="quiz-foot">
        <span class="kbd-hint">解答を選んで「次へ」。あとで戻って変更できます。</span>
        <span class="spacer"></span>
        ${qi>0? `<button class="btn" data-act="prev-q">← 前へ</button>`:""}
        ${isLast? `<button class="btn btn-vermilion" data-act="finish-exam">採点する</button>`
                 : `<button class="btn btn-primary" data-act="next-q">次へ →</button>`}
      </div>` : `<div class="quiz-foot"><span class="kbd-hint">選択肢をタップすると解答します</span></div>`);

  const timerHTML = isExam ? `<span class="timer" id="quiz-timer">--:--</span>` : "";

  return {html:`
    <div class="quiz-top">
      <span class="pill">${isExam?"模擬試験":(s.mode==="review"?"復習モード":"通常演習")}</span>
      <div class="progress-track">${track}</div>
      <span class="quiz-meta"><b>${qi+1}</b> / ${total}</span>
      ${timerHTML}
    </div>
    <article class="q-card">
      <div class="q-head">
        ${pillField(fieldOf(q))}
        <span class="pill">${esc(q.mid||"")}</span>
        <span class="pill">${esc(q.sub||"")}</span>
        ${q.p?`<span class="pill past">過去問ベース${q.y?` ${q.y}年度`:""}</span>`:""}
      </div>
      <p class="q-text">${esc(q.q)}</p>
      <ul class="choices">${choices}</ul>
      ${explain}
      ${footer}
    </article>
    <div class="flex" style="justify-content:space-between;margin-top:14px">
      <button class="btn btn-sm btn-ghost" data-act="pause-quiz">中断して保存</button>
      <span class="small muted">${s.mode==="review"?"誤答ノートから出題中":""}</span>
    </div>
  `, after(){
    if(isExam) startTimer();
  }};
};

function startTimer(){
  stopTimer();
  updateTimer();
  timerHandle = setInterval(updateTimer, 1000);
}
function stopTimer(){ if(timerHandle){ clearInterval(timerHandle); timerHandle=null; } }
function updateTimer(){
  const s=ST.session;
  if(!s||!s.endsAt){ stopTimer(); return; }
  const left = Math.max(0, Math.round((s.endsAt - Date.now())/1000));
  const el = $("#quiz-timer");
  if(el){ el.textContent = fmtTime(left); el.classList.toggle("warn", left<=300); }
  if(left<=0){ stopTimer(); toast("制限時間になりました。採点します"); finishSession(true); }
}

function applyChoice(pick){
  const s=ST.session; if(!s) return;
  const q=qById(s.qids[s.idx]); if(!q) return;
  const cur = s.answers[s.idx];
  if(cur && cur.locked) return;
  const ok = pick===q.a;
  s.answers[s.idx] = {qid:q.id, pick, ok, ts:Date.now()};
  if(s.mode!=="exam") s.answers[s.idx].locked = true;
  save();
  render();
  if(s.mode!=="exam"){ setTimeout(()=>{ const b=$(".q-card .explain"); if(b) b.scrollIntoView({block:"nearest",behavior:"smooth"}); },60); }
}

act("choose", (el)=>{ applyChoice(+el.dataset.i); });

act("next-q", ()=>{
  const s=ST.session; if(!s) return;
  if(s.answers[s.idx]===null){ toast("選択肢を選んでください"); return; }
  if(s.idx < s.qids.length-1){ s.idx++; save(true); render(); }
  else if(s.mode==="exam"){ confirmFinish(); }
  else { finishSession(false); }
});
act("prev-q", ()=>{ const s=ST.session; if(!s||s.idx===0) return; s.idx--; save(true); render(); });
act("finish-exam", ()=>confirmFinish());
function confirmFinish(){
  const s=ST.session; if(!s) return;
  const un = s.answers.filter(a=>!a).length;
  openModal(`<h3 id="modal-title">採点しますか？</h3>
    <p class="m-sub">${un? `未解答が ${un}問あります。`:"すべて解答済みです。"}採点するとこのセッションは終了します。</p>
    <div class="modal-foot"><button class="btn" data-act="close-modal">戻る</button>
    <button class="btn btn-vermilion" data-act="do-finish">採点する</button></div>`);
}
act("do-finish", ()=>{ closeModal(); finishSession(false); });
act("pause-quiz", ()=>{ save(true); stopTimer(); toast("保存しました。ホームから再開できます"); navigate("home"); });

function finishSession(timeup){
  const s=ST.session; if(!s) return;
  stopTimer();
  const answers = s.qids.map((qid,i)=>{
    const a = s.answers[i] || {qid, pick:null, ok:false, ts:Date.now()};
    return {qid, pick:a.pick, ok:!!a.ok, ts:a.ts||Date.now()};
  });
  const correct = answers.filter(a=>a.ok).length;
  const rec = {
    id: s.id, ts: Date.now(), mode: s.mode, field: s.field,
    count: answers.length, correct,
    rate: Math.round(correct/answers.length*100),
    sec: Math.round((Date.now()-s.startTs)/1000),
    timeup: !!timeup,
    answers
  };
  ST.history = ST.history || [];
  ST.history.push(rec);
  if(ST.history.length>300) ST.history = ST.history.slice(-300);
  // ストリーク更新
  const todayK = dayKey(today());
  if(ST.streak.last !== todayK){
    const y = dayKey(addDays(today(),-1));
    ST.streak.days = (ST.streak.last===y)? (ST.streak.days||0)+1 : 1;
    ST.streak.last = todayK;
  }
  ST.session = null;
  save(true);
  navigate("result/"+rec.id);
}

/* ---------------- 結果 ---------------- */
VIEWS.result = function(param){
  const rec = (ST.history||[]).slice().reverse().find(h=>h.id===param) || (ST.history||[]).slice(-1)[0];
  if(!rec) return {html:`<div class="empty"><span class="em-ico">📄</span>結果がありません</div>`};
  const byField = {};
  FIELD_KEYS.forEach(f=>byField[f]={t:0,c:0});
  const bySub = {};
  rec.answers.forEach(a=>{
    const q=qById(a.qid); if(!q) return;
    const f=fieldOf(q);
    byField[f].t++; if(a.ok) byField[f].c++;
    const k=`${f}|${q.mid||"その他"}|${q.sub||"その他"}`;
    if(!bySub[k]) bySub[k]={field:f,mid:q.mid,sub:q.sub,t:0,c:0};
    bySub[k].t++; if(a.ok) bySub[k].c++;
  });
  const subs = Object.values(bySub).map(o=>Object.assign(o,{rate:Math.round(o.c/o.t*100)})).sort((a,b)=>a.rate-b.rate||b.t-a.t);
  const weakSubs = subs.filter(o=>o.rate<70);
  const pass = rec.rate>=70;
  const wrongIds = rec.answers.filter(a=>!a.ok).map(a=>a.qid);
  const modeName = rec.mode==="exam"?"模擬試験":(rec.mode==="review"?"復習モード":"通常演習");
  const verdict = rec.mode==="exam"
      ? (rec.rate>=70? "合格ライン到達（目安）" : rec.rate>=60? "あと一歩。弱点を補強しましょう":"基礎の積み直しが必要です")
      : (rec.rate>=80? "よくできました" : rec.rate>=60? "あと少しで定着します":"解説を読んで復習しましょう");

  return {html:`
    <div class="page-head">
      <div><div class="eyebrow">Result</div><h1>結果</h1></div>
      <div class="spacer"></div>
      <span class="pill">${new Date(rec.ts).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
    </div>

    <section class="card">
      <div class="score-panel">
        ${ringSVG(rec.rate)}
        <div style="flex:1;min-width:200px">
          <div class="result-verdict ${pass?"pass":(rec.rate>=60?"near":"fail")}">${verdict}</div>
          <div class="small muted mb8">${modeName} ・ ${rec.count}問 ・ 正解 ${rec.correct}問 ・ 所要 ${fmtTime(rec.sec)}${rec.timeup?"（時間切れ）":""}</div>
          <div class="flex">
            ${wrongIds.length? `<button class="btn btn-primary btn-sm" data-act="retry-wrong" data-ids="${wrongIds.join(",")}">間違えた${wrongIds.length}問を解き直す</button>`:""}
            <button class="btn btn-sm" data-act="start-quick" data-field="all" data-count="10">もう一度10問</button>
            <a class="btn btn-sm" href="#/analysis">分析を見る</a>
          </div>
        </div>
      </div>
    </section>

    <div class="grid-2" style="margin-top:16px">
      <section class="card">
        <div class="card-title">分野別</div>
        <div class="field-rows">
          ${FIELD_KEYS.map(f=>{
            const b=byField[f]; if(!b.t) return `<div class="field-row"><span class="fname"><i class="dot ${f}"></i>${FIELDS[f].short}</span>${barHTML(null,f)}<span class="fval muted">—</span></div>`;
            const r=Math.round(b.c/b.t*100);
            return `<div class="field-row"><span class="fname"><i class="dot ${f}"></i>${FIELDS[f].short}</span>${barHTML(r,f)}<span class="fval"><b>${r}%</b> <span class="small">${b.c}/${b.t}</span></span></div>`;
          }).join("")}
        </div>
      </section>
      <section class="card">
        <div class="card-title">弱点の小分類<span class="ct-sub">正答率70%未満</span></div>
        ${weakSubs.length? `<div class="subcat-list">
          ${weakSubs.map(o=>`<div class="subcat">
            <span class="sc-name"><i class="dot ${o.field}"></i><span>${esc(o.sub||o.mid)}</span></span>
            <span class="sc-num">${o.c}/${o.t} ・ ${o.rate}%</span>
            ${barHTML(o.rate,o.field,true)}
          </div>`).join("")}
        </div>`: `<div class="empty" style="padding:22px"><span class="em-ico">◎</span>このセッションに弱点はありません</div>`}
      </section>
    </div>

    <section class="card" style="margin-top:16px">
      <div class="card-title">解答一覧<span class="ct-sub">タップで解説を開く</span></div>
      <div id="result-list">
        ${rec.answers.map((a,i)=>{
          const q=qById(a.qid); if(!q) return "";
          return `<div class="qbank-item" style="border-left:3px solid ${a.ok?"#7fae86":"#d9a08a"}">
            <div class="between" style="gap:8px">
              <div class="qb-q" style="font-size:12.5px;${a.ok?"":"color:#7d4a33"}">${i+1}. ${esc(q.q)}</div>
              <button class="btn btn-sm" data-act="show-answer" data-qid="${q.id}" data-pick="${a.pick==null?"":a.pick}">解説</button>
            </div>
            <div class="qb-meta">${pillField(fieldOf(q))}<span class="pill">${esc(q.sub||"")}</span>
              <span class="pill ${a.ok?"ok":"ng"}">${a.ok?"正解":`誤答（正解 ${CHOICE_MARKS[q.a]}）`}</span></div>
          </div>`;
        }).join("")}
      </div>
    </section>

    <div class="btn-row mt16">
      <a class="btn" href="#/history">履歴一覧</a>
      <a class="btn" href="#/roadmap">ロードマップ</a>
      <a class="btn btn-primary" href="#/practice">次の演習へ</a>
    </div>
  `, after(){}};
};

act("retry-wrong", (el)=>{
  const ids = (el.dataset.ids||"").split(",").filter(Boolean);
  if(!ids.length) return;
  ST.session = {id:uid("s"), mode:"review", field:"all", count:ids.length, qids:ids, idx:0,
    answers:new Array(ids.length).fill(null), startTs:Date.now(), limitSec:null, endsAt:null};
  save(true); navigate("quiz");
});
act("show-answer", (el)=>{
  const q=qById(el.dataset.qid); if(!q) return;
  const pick = el.dataset.pick===""? null : +el.dataset.pick;
  openModal(`<h3 id="modal-title">解説</h3>
    <div class="m-sub">${esc(labelOf(q))}${q.p?` ・ 過去問ベース`:""}</div>
    <p style="font-family:var(--serif);line-height:1.85;font-size:14.5px">${esc(q.q)}</p>
    <ul class="choices" style="margin-top:10px">
      ${q.c.map((t,i)=>`<li><div class="choice ${i===q.a?"correct":(i===pick?"wrong":"")}" style="cursor:default">
        <span class="k">${CHOICE_MARKS[i]}</span><span>${esc(t)}</span>
        ${i===q.a?'<span class="mk">正解</span>':(i===pick?'<span class="mk">あなた</span>':"")}</div></li>`).join("")}
    </ul>
    <p class="small" style="margin-top:14px;line-height:1.9">${esc(q.e||"")}</p>
    ${q.pt?`<div class="point"><b>暗記：</b>${esc(q.pt)}</div>`:""}
    <div class="modal-foot"><button class="btn btn-primary" data-act="close-modal">閉じる</button></div>`);
});
