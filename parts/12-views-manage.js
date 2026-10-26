/* =========================================================================
   ビュー：設定 / 問題管理
   ========================================================================= */
let manageTab = "settings";
let qFilter = {field:"all", q:"", tab:"all"};

VIEWS.manage = function(){
  const s = ST.settings;
  const base = baseQuestions();
  const custom = ST.custom||[];
  const hiddenN = (ST.hidden||[]).length;
  const editedN = Object.keys(ST.edits||{}).length;

  const tabs = `
    <div class="tabs">
      <button class="${manageTab==="settings"?"on":""}" data-act="manage-tab" data-tab="settings">学習の設定</button>
      <button class="${manageTab==="questions"?"on":""}" data-act="manage-tab" data-tab="questions">問題管理</button>
      <button class="${manageTab==="data"?"on":""}" data-act="manage-tab" data-tab="data">データ</button>
    </div>`;

  if(manageTab==="settings"){
    return {html:`
      <div class="page-head"><div><div class="eyebrow">Settings</div><h1>設定・問題管理</h1></div></div>
      ${tabs}
      <section class="card">
        <div class="card-title">受験日と学習ペース</div>
        <div class="inline-fields">
          <div class="field"><label for="set-exam">受験予定日</label>
            <input class="inp" type="date" id="set-exam" value="${s.examDate||""}" data-act="set-exam"></div>
          <div class="field"><label for="set-min">1日の学習時間（分）</label>
            <input class="inp" type="number" id="set-min" min="10" max="240" step="5" value="${s.minutesPerDay}" data-act="set-min"></div>
          <div class="field"><label for="set-target">目標正答率（%）</label>
            <input class="inp" type="number" id="set-target" min="50" max="100" step="5" value="${s.targetRate}" data-act="set-target"></div>
        </div>
        <div class="field" style="margin-bottom:4px">
          <label>学習する曜日</label>
          <div class="chip-row">
            ${WD.map((w,i)=>`<button class="chip ${(s.weekdays||[]).includes(i)?"on":""}" data-act="toggle-weekday" data-wd="${i}">${w}</button>`).join("")}
          </div>
        </div>
        <div class="small muted mt8">いまの設定：週${(s.weekdays||[]).length}日 ／ 1日 ${s.minutesPerDay}分 ／ 受験日 ${s.examDate||"未設定"}</div>
        <div class="note-box mt16">
          <b>この設定から計画を作ります。</b>受験日までの残り日数と学習曜日から学習日を数え、分野別の正答率に応じて苦手分野の比重を上げて日々のタスクを組み直します。
          設定を変えるとロードマップは自動で更新されます（完了チェックは日付ごとに保持されます）。
        </div>
      </section>
      <section class="card">
        <div class="card-title">ペースのめやす</div>
        <div class="stat-row">
          <div class="stat"><span class="lbl">週の学習時間</span><span class="val">${(s.weekdays||[]).length * s.minutesPerDay / 60}<small>h</small></span></div>
          <div class="stat"><span class="lbl">残り学習日</span><span class="val">${buildPlan().n}<small>日</small></span></div>
          <div class="stat"><span class="lbl">総学習時間（見込）</span><span class="val">${Math.round(buildPlan().n * s.minutesPerDay / 60)}<small>h</small></span></div>
        </div>
        <div class="small muted mt16">ITパスポートは「1日1時間・週4日」でおよそ1か月が一つの目安です。残り日数が少ない場合は、1日の時間を増やすか学習曜日を増やしてください。</div>
      </section>`};
  }

  if(manageTab==="questions"){
    let list = allQuestions();
    if(qFilter.field!=="all") list = list.filter(q=>fieldOf(q)===qFilter.field);
    if(qFilter.tab==="custom") list = list.filter(q=>String(q.id).startsWith("U"));
    if(qFilter.tab==="past") list = list.filter(q=>q.p);
    if(qFilter.q){
      const kw=qFilter.q.toLowerCase();
      list = list.filter(q=> (q.q+" "+q.e+" "+q.mid+" "+q.sub+" "+q.c.join(" ")).toLowerCase().includes(kw));
    }
    return {html:`
      <div class="page-head"><div><div class="eyebrow">Questions</div><h1>設定・問題管理</h1></div></div>
      ${tabs}
      <section class="card tight">
        <div class="between">
          <div class="chip-row">
            <button class="chip ${qFilter.tab==="all"?"on":""}" data-act="q-tab" data-tab="all">すべて ${allQuestions().length}</button>
            <button class="chip ${qFilter.tab==="past"?"on":""}" data-act="q-tab" data-tab="past">過去問ベース ${allQuestions().filter(q=>q.p).length}</button>
            <button class="chip ${qFilter.tab==="custom"?"on":""}" data-act="q-tab" data-tab="custom">自作 ${custom.length}</button>
          </div>
          <button class="btn btn-primary btn-sm" data-act="new-question">＋ 問題を追加</button>
        </div>
        <div class="flex mt8" style="gap:8px">
          <input class="inp" style="flex:1;min-width:140px" placeholder="キーワードで絞り込む" value="${esc(qFilter.q)}" data-act="q-search" id="q-search">
          <select class="inp" style="width:auto" data-act="q-field">
            <option value="all"${qFilter.field==="all"?" selected":""}>全分野</option>
            ${FIELD_KEYS.map(f=>`<option value="${f}"${qFilter.field===f?" selected":""}>${FIELDS[f].short}</option>`).join("")}
          </select>
        </div>
      </section>
      <div class="small muted mt16 mb8">${list.length}問を表示 ／ 自作${custom.length}問・編集${editedN}問・非表示${hiddenN}問</div>
      ${list.length? list.map(q=>`
        <div class="qbank-item">
          <div class="qb-q" style="font-size:13px;line-height:1.7">${esc(q.q)}</div>
          <div class="between mt8" style="gap:8px">
            <div class="qb-meta" style="margin-top:0">
              ${pillField(fieldOf(q))}
              <span class="pill">${esc(q.mid||"")}</span>
              <span class="pill">${esc(q.sub||"")}</span>
              ${q.p?`<span class="pill past">過去問</span>`:""}
              ${q._edited?`<span class="pill ok">編集済</span>`:""}
              ${String(q.id).startsWith("U")?`<span class="pill">自作</span>`:""}
            </div>
            <div class="flex" style="gap:6px">
              <button class="btn btn-sm" data-act="edit-question" data-id="${q.id}">編集</button>
              <button class="btn btn-sm btn-ghost" style="color:var(--vermilion)" data-act="ask-hide-question" data-id="${q.id}">非表示</button>
            </div>
          </div>
        </div>`).join("")
      : `<div class="empty"><span class="em-ico">🔍</span>該当する問題がありません</div>`}
      ${hiddenN? `<div class="note-box mt16">非表示にした問題が ${hiddenN}問あります。<button class="btn btn-sm mt8" data-act="restore-hidden">すべて元に戻す</button></div>`:""}
    `};
  }

  // data
  return {html:`
    <div class="page-head"><div><div class="eyebrow">Data</div><h1>設定・問題管理</h1></div></div>
    ${tabs}
    <section class="card">
      <div class="card-title">記録の持ち出し・取り込み</div>
      <p class="small muted">学習記録・ロードマップ・自作問題は、この端末のブラウザ（localStorage）に保存されています。機種変更やバックアップには書き出しをご利用ください。</p>
      <div class="btn-row">
        <button class="btn" data-act="export-data">JSONで書き出す</button>
        <button class="btn" data-act="import-data">JSONを読み込む</button>
        <input type="file" id="import-file" accept=".json,application/json" style="display:none" data-act="import-file">
      </div>
      <hr class="hr-dash">
      <div class="card-title" style="font-size:14px">保存されている内容</div>
      <div class="stat-row">
        <div class="stat"><span class="lbl">セッション</span><span class="val">${(ST.history||[]).length}<small>件</small></span></div>
        <div class="stat"><span class="lbl">自作問題</span><span class="val">${custom.length}<small>問</small></span></div>
        <div class="stat"><span class="lbl">ロードマップ</span><span class="val">${Object.keys(ST.roadmap||{}).filter(k=>ST.roadmap[k]).length}<small>日</small></span></div>
      </div>
    </section>

    <section class="card">
      <div class="card-title">問題データの初期化</div>
      <div class="flex">
        <button class="btn btn-sm" data-act="reset-edits">組み込み問題の編集を元に戻す</button>
        <button class="btn btn-sm" data-act="ask-clear-custom">自作問題をすべて削除</button>
      </div>
      <hr class="hr-dash">
      <div class="card-title" style="font-size:14px;color:var(--vermilion)">すべてのデータを削除</div>
      <p class="small muted">学習履歴・設定・自作問題・用語カードの苦手登録を含め、この端末の記録をすべて消します。</p>
      <button class="btn btn-vermilion btn-sm" data-act="ask-reset-all">すべてのデータを削除する</button>
    </section>

    <section class="card">
      <div class="card-title">このアプリについて</div>
      <p class="small" style="line-height:1.9">
        ITパスポート学習ノート — 1つのHTMLファイルで完結するオフライン学習アプリです。<br>
        収録問題は、ITパスポート試験の出題範囲（ストラテジ系／マネジメント系／テクノロジ系）に沿って作成したサンプルです。
        「過去問ベース」のラベルが付いた問題は、公表されている過去問の論点を参考に再構成したもので、実際の出題文そのものではありません。
        受験前には必ず公式の過去問題集やIPAの公開問題で最終確認してください。
      </p>
    </section>`};
};

act("manage-tab", el=>{ manageTab=el.dataset.tab; render(); });
act("toggle-weekday", el=>{
  const wd=+el.dataset.wd;
  let arr=(ST.settings.weekdays||[]).slice();
  if(arr.includes(wd)) arr=arr.filter(x=>x!==wd); else arr.push(wd);
  arr.sort((a,b)=>a-b);
  if(!arr.length){ toast("1日以上選んでください"); return; }
  ST.settings.weekdays=arr; save(true); render();
});
act("q-tab", el=>{ qFilter.tab=el.dataset.tab; render(); });
act("q-field", el=>{ qFilter.field=el.value; render(); });

document.addEventListener("input", e=>{
  const t=e.target;
  if(t.dataset && t.dataset.act==="set-exam"){ ST.settings.examDate=t.value; save(); paintChrome(); }
  if(t.dataset && t.dataset.act==="set-min"){ ST.settings.minutesPerDay=clamp(+t.value||60,10,240); save(); }
  if(t.dataset && t.dataset.act==="set-target"){ ST.settings.targetRate=clamp(+t.value||70,50,100); save(); }
  if(t.dataset && t.dataset.act==="q-search"){ qFilter.q=t.value; debounceSearch(); }
  if(t.id==="import-file"){ /* handled by change */ }
});
let searchTimer=null;
function debounceSearch(){ if(searchTimer) clearTimeout(searchTimer); searchTimer=setTimeout(()=>{ const v=qFilter.q; render(); const el=$("#q-search"); if(el){ el.focus(); el.setSelectionRange(v.length,v.length);} },320); }

/* ---- 問題の追加・編集 ---- */
function questionForm(q){
  const isNew = !q;
  const d = q || {id:"", field:"strategy", mid:"", sub:"", q:"", c:["","","",""], a:0, e:"", pt:"", p:false, y:""};
  const midList = Array.from(new Set(allQuestions().filter(x=>x.mid).map(x=>x.mid)));
  return `<h3 id="modal-title">${isNew?"問題を追加":"問題を編集"}</h3>
    <div class="m-sub">${isNew?"自作の問題が演習・模擬試験に加わります。":"編集内容はこの端末にのみ保存されます。"}</div>
    <div class="inline-fields">
      <div class="field"><label>分野</label>
        <select class="inp" id="f-field">
          ${FIELD_KEYS.map(f=>`<option value="${f}"${d.field===f?" selected":""}>${FIELDS[f].name}</option>`).join("")}
        </select></div>
      <div class="field"><label>中分類（例：システム監査）</label>
        <input class="inp" id="f-mid" list="mid-list" value="${esc(d.mid||"")}" placeholder="企業活動 / システム監査 など">
        <datalist id="mid-list">${midList.map(m=>`<option value="${esc(m)}"></option>`).join("")}</datalist></div>
      <div class="field"><label>小分類（例：システム監査）</label>
        <input class="inp" id="f-sub" value="${esc(d.sub||"")}" placeholder="分析に使う細かい科目名"></div>
    </div>
    <div class="field"><label>問題文</label>
      <textarea class="inp" id="f-q" rows="3" placeholder="〜として、最も適切なものはどれか。">${esc(d.q)}</textarea></div>
    <div class="field"><label>選択肢（正解を選んでください）</label>
      ${CHOICE_MARKS.map((m,i)=>`
        <div class="flex" style="margin-bottom:6px;gap:8px;flex-wrap:nowrap">
          <label class="chk-line" style="gap:5px"><input type="radio" name="f-ans" value="${i}" ${d.a===i?"checked":""}><span>${m}</span></label>
          <input class="inp" id="f-c${i}" value="${esc(d.c[i]||"")}" placeholder="選択肢${m}">
        </div>`).join("")}
    </div>
    <div class="field"><label>解説</label>
      <textarea class="inp" id="f-e" rows="3" placeholder="なぜその選択肢が正解なのか、他の選択肢が誤りである理由も書くと復習に効きます。">${esc(d.e||"")}</textarea></div>
    <div class="inline-fields">
      <div class="field"><label>暗記ポイント（任意）</label>
        <input class="inp" id="f-pt" value="${esc(d.pt||"")}" placeholder="例：損益分岐点＝固定費÷限界利益率"></div>
      <div class="field"><label>出題年度（任意）</label>
        <input class="inp" id="f-y" value="${esc(d.y||"")}" placeholder="2024"></div>
    </div>
    <label class="chk-line"><input type="checkbox" id="f-past" ${d.p?"checked":""}> 過去問をベースにした問題（一覧にラベルが付きます）</label>
    <div class="modal-foot">
      <button class="btn" data-act="close-modal">キャンセル</button>
      <button class="btn btn-primary" data-act="save-question" data-id="${d.id||""}">保存する</button>
    </div>`;
}
act("new-question", ()=>openModal(questionForm(null), {after(m){ m.querySelector("#f-q").focus(); }}));
act("edit-question", el=>{
  const q = allQuestions().find(x=>x.id===el.dataset.id) || qById(el.dataset.id);
  if(!q) return;
  openModal(questionForm(q), {after(m){ m.querySelector("#f-q").focus(); }});
});
act("save-question", el=>{
  const id = el.dataset.id;
  const field = $("#f-field").value;
  const mid = $("#f-mid").value.trim();
  const sub = $("#f-sub").value.trim();
  const qt = $("#f-q").value.trim();
  const cs = [0,1,2,3].map(i=>$("#f-c"+i).value.trim());
  const ansEl = document.querySelector('input[name="f-ans"]:checked');
  const a = ansEl? +ansEl.value : 0;
  const e = $("#f-e").value.trim();
  const pt = $("#f-pt").value.trim();
  const y = $("#f-y").value.trim();
  const p = $("#f-past").checked;
  if(!qt){ toast("問題文を入力してください"); return; }
  if(cs.some(c=>!c)){ toast("選択肢を4つすべて入力してください"); return; }
  if(!mid){ toast("中分類を入力してください（分析に使います）"); return; }
  if(id && String(id).startsWith("U")){
    const i = ST.custom.findIndex(x=>x.id===id);
    if(i>=0) ST.custom[i] = Object.assign({}, ST.custom[i], {field,mid,sub:sub||mid,q:qt,c:cs,a,e,pt,y:p?y:""});
  } else if(id){
    ST.edits[id] = {field,mid,sub:sub||mid,q:qt,c:cs,a,e,pt,p,y:p?y:undefined};
    // 元の問題に p フラグが無い場合に備える
    if(p) ST.edits[id].p = true;
  } else {
    const nq = {id:uid("U"), field, mid, sub:sub||mid, q:qt, c:cs, a, e, pt:pt||"", p:!!p, y:p?y:""};
    ST.custom = (ST.custom||[]).concat([nq]);
  }
  save(true); closeModal(); toast("保存しました"); render();
});
act("ask-hide-question", el=>{
  const id=el.dataset.id;
  openModal(`<h3 id="modal-title">この問題を非表示にしますか？</h3>
    <p class="m-sub">出題されなくなります。あとから元に戻せます。</p>
    <div class="modal-foot"><button class="btn" data-act="close-modal">やめる</button>
    <button class="btn btn-vermilion" data-act="hide-question" data-id="${id}">非表示にする</button></div>`);
});
act("hide-question", el=>{
  ST.hidden = (ST.hidden||[]).concat([el.dataset.id]);
  save(true); closeModal(); toast("非表示にしました"); render();
});
act("restore-hidden", ()=>{ ST.hidden=[]; save(true); toast("すべて元に戻しました"); render(); });
act("reset-edits", ()=>{ ST.edits={}; save(true); toast("組み込み問題を元に戻しました"); render(); });
act("ask-clear-custom", ()=>{
  openModal(`<h3 id="modal-title">自作問題をすべて削除しますか？</h3>
    <p class="m-sub">${(ST.custom||[]).length}問を削除します。この操作は取り消せません。</p>
    <div class="modal-foot"><button class="btn" data-act="close-modal">やめる</button>
    <button class="btn btn-vermilion" data-act="clear-custom">削除する</button></div>`);
});
act("clear-custom", ()=>{ ST.custom=[]; save(true); closeModal(); toast("自作問題を削除しました"); render(); });
act("ask-reset-all", ()=>{
  openModal(`<h3 id="modal-title">すべてのデータを削除しますか？</h3>
    <p class="m-sub">学習履歴・設定・自作問題・苦手登録がすべて消えます。元に戻せません。</p>
    <div class="modal-foot"><button class="btn" data-act="close-modal">やめる</button>
    <button class="btn btn-vermilion" data-act="reset-all">すべて削除</button></div>`);
});
act("reset-all", ()=>{
  try{ localStorage.removeItem(KEY); }catch(e){}
  loadState(); save(true); closeModal(); toast("初期状態に戻しました"); navigate("home");
});

/* ---- エクスポート / インポート ---- */
act("export-data", ()=>{
  const data = JSON.stringify({app:"itp-notebook", exportedAt:new Date().toISOString(), state:ST}, null, 2);
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=url; a.download=`itp-notebook-${dayKey(today())}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 3000);
  toast("書き出しました");
});
act("import-data", ()=>{ const f=$("#import-file"); if(f) f.click(); });
document.addEventListener("change", e=>{
  if(e.target.id!=="import-file") return;
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  const rd = new FileReader();
  rd.onload = ()=>{
    try{
      const obj = JSON.parse(rd.result);
      const st = obj.state || obj;
      if(!st || typeof st!=="object") throw new Error("形式が違います");
      ST = deepFill(DEFAULT_STATE, st);
      ST.session = null;
      save(true); render(); toast("読み込みました");
      navigate("home");
    }catch(err){ toast("読み込みに失敗しました"); }
    e.target.value="";
  };
  rd.readAsText(file);
});
act("open-settings", ()=>{ manageTab="settings"; navigate("manage"); });
