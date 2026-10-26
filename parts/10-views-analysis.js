/* =========================================================================
   ビュー：学習分析 / 学習履歴
   ========================================================================= */

/* ---- SVGチャート ---- */
function lineChart(points, opts={}){
  const W=620, H=250, pl=42, pr=14, pt=16, pb=34;
  const iw=W-pl-pr, ih=H-pt-pb;
  if(!points.length) return `<div class="empty"><span class="em-ico">📈</span>データがまだありません</div>`;
  const n=points.length;
  const x = i => n===1? pl+iw/2 : pl + iw*(i/(n-1));
  const y = v => pt + ih*(1-clamp(v,0,100)/100);
  const grid = [0,25,50,75,100].map(v=>`
    <line x1="${pl}" y1="${y(v)}" x2="${W-pr}" y2="${y(v)}" stroke="#e6dfcd" stroke-width="1" ${v===0?"":'stroke-dasharray="3 4"'}/>
    <text x="${pl-8}" y="${y(v)+4}" text-anchor="end" font-size="10" fill="#9c9384">${v}</text>`).join("");
  const target = opts.target? `<line x1="${pl}" y1="${y(opts.target)}" x2="${W-pr}" y2="${y(opts.target)}" stroke="#c9a227" stroke-width="1.5" stroke-dasharray="6 4"/>
    <text x="${W-pr-2}" y="${y(opts.target)-5}" text-anchor="end" font-size="10" fill="#a8871f">目標 ${opts.target}%</text>`:"";
  const path = points.map((p,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${path} L${x(n-1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const dots = points.map((p,i)=>{
    const col = p.v>=70? "#2f6b3a" : p.v>=50? "#a9682b":"#b5532f";
    return `<circle cx="${x(i)}" cy="${y(p.v)}" r="4" fill="#fff" stroke="${col}" stroke-width="2.4"><title>${esc(p.lab)}：${p.v}%</title></circle>`;
  }).join("");
  const step = Math.max(1, Math.ceil(n/7));
  const labels = points.map((p,i)=> (i%step===0||i===n-1)? `<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="9.5" fill="#9c9384">${esc(p.short||p.lab)}</text>`:"").join("");
  return `<div class="chart-box"><svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="正答率の推移">
    <defs><linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2f6f6b" stop-opacity=".22"/><stop offset="100%" stop-color="#2f6f6b" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}${target}
    <path d="${area}" fill="url(#lg1)"/>
    <path d="${path}" fill="none" stroke="#2f6f6b" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}${labels}
  </svg></div>`;
}
function hbarChart(rows){
  if(!rows.length) return `<div class="empty"><span class="em-ico">📊</span>データがまだありません</div>`;
  const max = Math.max.apply(null, rows.map(r=>r.v).concat([1]));
  return `<div style="display:flex;flex-direction:column;gap:7px">${rows.map(r=>`
    <div style="display:grid;grid-template-columns:120px 1fr 52px;gap:8px;align-items:center;font-size:11.5px">
      <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--ink-soft)" title="${esc(r.k)}">${esc(r.k)}</span>
      <span style="height:11px;background:var(--paper-3);border-radius:6px;overflow:hidden;display:block">
        <i style="display:block;height:100%;width:${(r.v/max*100).toFixed(1)}%;background:${r.col||"var(--accent)"};border-radius:6px;transition:width .6s"></i>
      </span>
      <span style="text-align:right;font-variant-numeric:tabular-nums">${r.v}%${r.n?`<span class="muted" style="font-size:9.5px"> ${r.n}</span>`:""}</span>
    </div>`).join("")}</div>`;
}

/* ---- 分析 ---- */
VIEWS.analysis = function(){
  const st = overallStats();
  const acc = accuracyByField();
  const mids = accuracyByGroup("mid");
  const subs = accuracyByGroup("sub");
  const hist = (ST.history||[]);
  const pts = hist.slice(-20).map((h,i)=>({
    lab: `${new Date(h.ts).getMonth()+1}/${new Date(h.ts).getDate()} ${h.rate}%`,
    short: `${new Date(h.ts).getMonth()+1}/${new Date(h.ts).getDate()}`,
    v: h.rate
  }));
  const bySubField = {};
  FIELD_KEYS.forEach(f=>{ bySubField[f]=subs.filter(s=>s.field===f); });
  const weakTop = subs.filter(s=>s.rate<70 && s.t>=2).slice(0,6);
  const totalT = st.total;
  const mockHist = hist.filter(h=>h.mode==="exam");

  return {html:`
    <div class="page-head">
      <div><div class="eyebrow">Analysis</div><h1>学習分析</h1></div>
      <div class="spacer"></div>
      <span class="pill">解答 ${totalT}問</span>
    </div>

    <div class="stat-row">
      <div class="stat"><span class="lbl">全体正答率</span><span class="val">${st.rate===null?"—":st.rate}<small>${st.rate===null?"":"%"}</small></span><span class="note">目標 ${ST.settings.targetRate}%</span></div>
      <div class="stat"><span class="lbl">セッション数</span><span class="val">${st.sessions}<small>回</small></span><span class="note">模擬試験 ${mockHist.length}回</span></div>
      <div class="stat"><span class="lbl">復習待ちの誤答</span><span class="val">${weakQuestions().length}<small>問</small></span><span class="note"><a href="#/practice">復習する</a></span></div>
    </div>

    <section class="card" style="margin-top:16px">
      <div class="card-title">分野別の正答率<span class="ct-sub">3分野</span></div>
      <div class="field-rows">
        ${FIELD_KEYS.map(f=>{
          const r=acc[f];
          return `<div class="field-row"><span class="fname"><i class="dot ${f}"></i>${FIELDS[f].name}</span>
            ${barHTML(r.rate,f)}
            <span class="fval">${r.rate===null?'<b>—</b>':`<b>${r.rate}%</b> <span class="small">${r.c}/${r.t}</span>`}</span></div>`;
        }).join("")}
      </div>
      <div class="legend">
        <span><i style="background:var(--c-strategy)"></i>ストラテジ</span>
        <span><i style="background:var(--c-management)"></i>マネジメント</span>
        <span><i style="background:var(--c-technology)"></i>テクノロジ</span>
      </div>
    </section>

    <section class="card" style="margin-top:16px">
      <div class="card-title">正答率の推移<span class="ct-sub">直近${pts.length}セッション</span></div>
      ${lineChart(pts, {target: ST.settings.targetRate})}
      ${pts.length? `<div class="small muted">点にカーソルを合わせると数値が出ます。直近の水準が目標線より上なら安定しています。</div>`:""}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="card-title">中分類ごとの正答率<span class="ct-sub">解答数の多い順</span></div>
      ${mids.length? `<div class="table-wrap"><table class="tbl" style="min-width:520px">
        <thead><tr><th>分野</th><th>中分類</th><th>正答率</th><th>解答</th><th style="width:34%">　</th></tr></thead>
        <tbody>${mids.slice().sort((a,b)=>b.t-a.t).map(m=>`
          <tr><td><i class="dot ${m.field}"></i> ${FIELDS[m.field].short}</td>
          <td>${esc(m.mid)}</td>
          <td class="num"><b style="color:${m.rate>=70?"#2f6b3a":m.rate>=50?"#a9682b":"#9c4526"}">${m.rate}%</b></td>
          <td class="num">${m.c}/${m.t}</td>
          <td>${barHTML(m.rate,m.field,true)}</td></tr>`).join("")}
        </tbody></table></div>`: `<div class="empty"><span class="em-ico">📊</span>演習をすると中分類ごとに集計されます</div>`}
    </section>

    <section class="card" style="margin-top:16px">
      <div class="card-title">小分類ごとの正答率<span class="ct-sub">システム監査などを細かく分析</span></div>
      ${FIELD_KEYS.map(f=>{
        const rows = bySubField[f].filter(s=>s.t>0).sort((a,b)=>a.rate-b.rate);
        if(!rows.length) return "";
        return `<div style="margin-bottom:16px">
          <div class="small" style="font-weight:700;margin-bottom:8px;display:flex;align-items:center;gap:6px">
            <i class="dot ${f}"></i>${FIELDS[f].name}
          </div>
          <div class="table-wrap"><table class="tbl" style="min-width:500px">
            <tbody>${rows.map(s=>`<tr>
              <td style="width:34%"><span class="small">${esc(s.mid)}</span><br><b style="font-size:12.5px">${esc(s.sub)}</b></td>
              <td class="num" style="width:74px"><b style="color:${s.rate>=70?"#2f6b3a":s.rate>=50?"#a9682b":"#9c4526"}">${s.rate}%</b>
                <span class="muted small">${s.c}/${s.t}</span></td>
              <td>${barHTML(s.rate,f,true)}</td></tr>`).join("")}
            </tbody></table></div>
        </div>`;
      }).join("") || `<div class="empty"><span class="em-ico">📊</span>演習をすると小分類ごとに集計されます</div>`}
    </section>

    <div class="grid-2" style="margin-top:16px">
      <section class="card">
        <div class="card-title">優先して復習すべき単元</div>
        ${weakTop.length? `<div class="subcat-list">
          ${weakTop.map(s=>`<div class="subcat">
            <span class="sc-name"><i class="dot ${s.field}"></i><span>${esc(s.sub)}</span></span>
            <span class="sc-num">${s.rate}% ・ ${s.c}/${s.t}</span>
            ${barHTML(s.rate,s.field,true)}</div>`).join("")}
        </div>
        <button class="btn btn-primary btn-sm mt16" data-act="go-review">この弱点を復習する</button>`
        : `<div class="empty" style="padding:22px"><span class="em-ico">◎</span>目立った弱点はありません</div>`}
      </section>
      <section class="card">
        <div class="card-title">モード別の成績</div>
        ${["practice","review","exam"].map(m=>{
          const hs = hist.filter(h=>h.mode===m);
          if(!hs.length) return `<div class="between" style="padding:7px 0;border-bottom:1px dashed var(--border)"><span class="small">${m==="practice"?"通常演習":m==="review"?"復習モード":"模擬試験"}</span><span class="small muted">未実施</span></div>`;
          const avg = Math.round(hs.reduce((s,h)=>s+h.rate,0)/hs.length);
          return `<div class="between" style="padding:7px 0;border-bottom:1px dashed var(--border)">
            <span class="small">${m==="practice"?"通常演習":m==="review"?"復習モード":"模擬試験"}<span class="muted"> ${hs.length}回</span></span>
            <span><b style="font-size:14px">${avg}%</b> <span class="muted small">平均</span></span></div>`;
        }).join("")}
        <div class="small muted mt16">模擬試験は本番と同じ60問。70%前後を安定して取れれば合格圏の目安です。</div>
      </section>
    </div>
  `, after(){}};
};

/* ---- 履歴 ---- */
VIEWS.history = function(){
  const hist = (ST.history||[]).slice().reverse();
  const st = overallStats();
  const modeName = m => m==="exam"?"模擬試験":m==="review"?"復習":"通常";
  return {html:`
    <div class="page-head">
      <div><div class="eyebrow">History</div><h1>学習履歴</h1></div>
      <div class="spacer"></div>
      <span class="pill">${hist.length}セッション</span>
    </div>

    <div class="stat-row">
      <div class="stat"><span class="lbl">総解答数</span><span class="val">${st.total}<small>問</small></span></div>
      <div class="stat"><span class="lbl">平均正答率</span><span class="val">${st.rate===null?"—":st.rate}<small>${st.rate===null?"":"%"}</small></span></div>
      <div class="stat"><span class="lbl">学習日数</span><span class="val">${st.studyDays}<small>日</small></span></div>
    </div>

    <section class="card" style="margin-top:16px">
      <div class="card-title">セッション一覧<span class="ct-sub">新しい順</span></div>
      ${hist.length? `<div class="table-wrap"><table class="tbl">
        <thead><tr><th>日時</th><th>モード</th><th>範囲</th><th>問題数</th><th>正答率</th><th>所要</th><th>　</th></tr></thead>
        <tbody>${hist.map(h=>{
          const dt=new Date(h.ts);
          return `<tr>
            <td class="num">${dt.getMonth()+1}/${dt.getDate()} ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}</td>
            <td><span class="pill ${h.mode==="exam"?"past":""}">${modeName(h.mode)}</span></td>
            <td class="small">${h.field==="all"?"全分野":FIELDS[h.field]?FIELDS[h.field].short:"—"}</td>
            <td class="num">${h.correct}/${h.count}</td>
            <td class="num"><b style="color:${h.rate>=70?"#2f6b3a":h.rate>=50?"#a9682b":"#9c4526"}">${h.rate}%</b></td>
            <td class="num small">${fmtTime(h.sec||0)}</td>
            <td><a class="btn btn-sm" href="#/result/${h.id}">見る</a></td>
          </tr>`;
        }).join("")}</tbody></table></div>`
        : `<div class="empty"><span class="em-ico">📄</span>まだ記録がありません<br><a class="btn btn-primary btn-sm mt16" href="#/practice">10問演習をはじめる</a></div>`}
    </section>

    ${hist.length? `<div class="flex mt16" style="justify-content:flex-end">
      <button class="btn btn-sm" data-act="export-data">記録を書き出す</button>
      <button class="btn btn-sm btn-ghost" style="color:var(--vermilion)" data-act="ask-clear-history">履歴をすべて削除</button>
    </div>`:""}
  `, after(){}};
};

act("ask-clear-history", ()=>{
  openModal(`<h3 id="modal-title">学習履歴を削除しますか？</h3>
    <p class="m-sub">セッションの記録・分析データが消えます。ロードマップのチェックと問題の編集内容は残ります。この操作は取り消せません。</p>
    <div class="modal-foot"><button class="btn" data-act="close-modal">やめる</button>
      <button class="btn btn-vermilion" data-act="clear-history-now">削除する</button></div>`);
});
act("clear-history-now", ()=>{
  ST.history=[]; ST.session=null; save(true); closeModal(); toast("履歴を削除しました"); render();
});
