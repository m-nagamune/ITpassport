/* =========================================================================
   起動処理 / グローバルイベント
   ========================================================================= */
let lastRenderAt = 0;
function render(){
  const name = ROUTES[currentRoute] ? currentRoute : "home";
  const v = VIEWS[name];
  paintChrome();
  const host = $("#view");
  if(!v){ host.innerHTML = `<div class="empty">ページが見つかりません</div>`; return; }
  const out = v(routeParam) || {html:""};
  host.innerHTML = out.html;
  if(typeof out.after === "function"){
    try{ out.after(); }catch(e){ console.warn(e); }
  }
  lastRenderAt = Date.now();
  // フォーカスを本文へ（スクリーンリーダー向け）
  if(name!=="quiz"){ host.focus({preventScroll:true}); }
}

/* キーボード操作（出題中） */
document.addEventListener("keydown", e=>{
  if(currentRoute!=="quiz") return;
  if(e.target.tagName==="INPUT" || e.target.tagName==="TEXTAREA" || e.target.tagName==="SELECT") return;
  const s = ST.session; if(!s) return;
  const q = qById(s.qids[s.idx]); if(!q) return;
  const ans = s.answers[s.idx];
  const locked = !!(ans && ans.locked);
  const key = e.key.toLowerCase();
  if(!locked && s.mode!=="exam"){
    const map = {a:0,b:1,c:2,d:3,"1":0,"2":1,"3":2,"4":3};
    if(key in map){ e.preventDefault(); applyChoice(map[key]); return; }
  }
  if(e.key==="Enter" || e.key==="ArrowRight"){
    if(locked){ e.preventDefault(); ACT["next-q"](); }
    else if(s.mode==="exam" && ans){ e.preventDefault(); ACT["next-q"](); }
  }
  if(e.key==="ArrowLeft" && s.idx>0){ e.preventDefault(); ACT["prev-q"](); }
});

/* 画面復帰時にカウントダウンや制限時間を再確認 */
document.addEventListener("visibilitychange", ()=>{
  if(document.visibilityState==="visible" && currentRoute==="quiz" && ST.session && ST.session.mode==="exam"){
    updateTimer();
  }
});

/* ハッシュルーティング */
window.addEventListener("hashchange", onHashChange);
window.addEventListener("beforeunload", ()=>{ save(true); });

/* 初期化 */
(function boot(){
  loadState();
  if(!location.hash) location.replace("#/home");
  onHashChange();
  save(true);

  // 初回のみ軽い案内
  if(!ST.history.length && !sessionStorage.getItem("itp_welcomed")){
    sessionStorage.setItem("itp_welcomed","1");
    setTimeout(()=>{
      openModal(`<h3 id="modal-title">ようこそ、学習ノートへ</h3>
        <p class="m-sub">はじめに、受験日と学習ペースを確認しましょう。</p>
        <div class="note-box mb16">いまは <b>2026年11月12日</b> を受験予定日、<b>1日60分 × 週4日（火・木・土・日）</b> として計画を作っています。違う場合は設定から変更できます。</div>
        <ol class="small" style="padding-left:1.2em;line-height:2;margin:0">
          <li>まず「10問だけ演習」で現在地を確認</li>
          <li>結果画面で分野別・小分類別の弱点を見る</li>
          <li>ロードマップの今日のタスクをこなす</li>
          <li>誤答は「復習モード」で潰す</li>
        </ol>
        <div class="modal-foot">
          <button class="btn" data-act="close-modal">閉じる</button>
          <button class="btn btn-primary" data-act="welcome-start">10問はじめる</button>
        </div>`, {after(m){
          const b=m.querySelector('[data-act="welcome-start"]');
          if(b) b.addEventListener("click", ()=>{ closeModal(); startSession({mode:"practice",count:10}); });
        }});
    }, 450);
  }
})();
