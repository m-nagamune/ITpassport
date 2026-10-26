/* =========================================================================
   ITパスポート 学習ノート — アプリコア
   ========================================================================= */
"use strict";

const KEY = "itp_notebook_v1";
const FIELDS = {
  strategy:   {name:"ストラテジ系", short:"ストラテジ", cls:"strategy",   desc:"経営・法務・システム戦略"},
  management: {name:"マネジメント系", short:"マネジメント", cls:"management", desc:"開発・プロジェクト・監査"},
  technology: {name:"テクノロジ系", short:"テクノロジ", cls:"technology", desc:"基礎理論・NW・セキュリティ"}
};
const FIELD_KEYS = ["strategy","management","technology"];
const WD = ["日","月","火","水","木","金","土"];

const DEFAULT_STATE = {
  v:1,
  settings:{
    examDate:"2026-11-12",
    weekdays:[2,4,6,0],      // 火・木・土・日
    minutesPerDay:60,
    targetRate:70,
    preferPast:true
  },
  history:[],
  roadmap:{},
  custom:[],
  edits:{},
  hidden:[],
  cardWeak:{},
  session:null,
  streak:{last:null, days:0},
  createdAt:null
};

/* ---------------- ユーティリティ ---------------- */
const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
const esc = s => String(s==null?"":s).replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const pad2 = n=>String(n).padStart(2,"0");
const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const startOfDay = d => new Date(d.getFullYear(),d.getMonth(),d.getDate());
const parseDay = s => { if(!s) return null; const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s); if(!m) return null; const d=new Date(+m[1],+m[2]-1,+m[3]); return isNaN(d)?null:d; };
const addDays = (d,n)=>{ const x=new Date(d.getTime()); x.setDate(x.getDate()+n); return startOfDay(x); };
const today = ()=>startOfDay(new Date());
const diffDays = (a,b)=>Math.round((startOfDay(b)-startOfDay(a))/86400000);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const pct = (a,b)=> b>0 ? Math.round(a/b*100) : 0;
const fmtTime = sec => `${pad2(Math.floor(sec/60))}:${pad2(Math.floor(sec%60))}`;
const shuffle = arr => { const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
const uid = p => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
const jpDate = d => `${d.getMonth()+1}/${d.getDate()}(${WD[d.getDay()]})`;

/* ---------------- 状態 ---------------- */
let ST = null;

function deepFill(def, src){
  if(Array.isArray(def)) return Array.isArray(src)?src:def.slice();
  if(def && typeof def==="object"){
    const o={};
    Object.keys(def).forEach(k=>{ o[k] = (src && typeof src==="object" && k in src) ? deepFill(def[k], src[k]) : (Array.isArray(def[k])?def[k].slice():(def[k]&&typeof def[k]==="object"?deepFill(def[k],{}):def[k])); });
    if(src && typeof src==="object") Object.keys(src).forEach(k=>{ if(!(k in o)) o[k]=src[k]; });
    return o;
  }
  return src===undefined?def:src;
}
function loadState(){
  let raw=null;
  try{ raw = localStorage.getItem(KEY); }catch(e){ console.warn("localStorage利用不可",e); }
  if(!raw){ ST = deepFill(DEFAULT_STATE,{}); ST.createdAt = Date.now(); return; }
  try{
    const p = JSON.parse(raw);
    ST = deepFill(DEFAULT_STATE, p);
  }catch(e){ console.warn("保存データが壊れていたため初期化します", e); ST = deepFill(DEFAULT_STATE,{}); }
  if(!ST.createdAt) ST.createdAt = Date.now();
}
let saveTimer=null;
function save(now){
  if(saveTimer){ clearTimeout(saveTimer); saveTimer=null; }
  const doSave=()=>{ try{ localStorage.setItem(KEY, JSON.stringify(ST)); }catch(e){ console.warn("保存に失敗",e); toast("保存に失敗しました（容量不足の可能性）"); } };
  if(now) doSave(); else saveTimer=setTimeout(doSave,250);
}

/* ---------------- 問題バンク ---------------- */
function baseQuestions(){
  return [].concat(window.Q_STRATEGY||[], window.Q_MANAGEMENT||[], window.Q_TECHNOLOGY||[]);
}
function allQuestions(){
  const hidden = new Set(ST.hidden||[]);
  const out = [];
  baseQuestions().forEach(q=>{
    if(hidden.has(q.id)) return;
    const ed = ST.edits[q.id];
    out.push(ed ? Object.assign({}, q, ed, {id:q.id, field:ed.field||q.field, mid:ed.mid||q.mid, sub:ed.sub||q.sub, _edited:true}) : q);
  });
  (ST.custom||[]).forEach(q=>{ if(!hidden.has(q.id)) out.push(q); });
  return out;
}
function qById(id){ return allQuestions().find(q=>q.id===id) || baseQuestions().find(q=>q.id===id) || null; }
function fieldOf(q){ return FIELDS[q.field]?q.field:"technology"; }
function labelOf(q){ return `${FIELDS[fieldOf(q)].short} / ${q.mid||"-"} / ${q.sub||"-"}`; }

/* ---------------- 集計 ---------------- */
function allAttempts(){
  const arr=[];
  (ST.history||[]).forEach(h=>{ (h.answers||[]).forEach(a=>{ arr.push(Object.assign({ts:h.ts, mode:h.mode}, a)); }); });
  return arr;
}
function accuracyByField(){
  const res={};
  FIELD_KEYS.forEach(f=>res[f]={t:0,c:0,rate:null});
  allAttempts().forEach(a=>{
    const q=qById(a.qid); if(!q) return;
    const f=fieldOf(q); res[f].t++; if(a.ok) res[f].c++;
  });
  FIELD_KEYS.forEach(f=>{ res[f].rate = res[f].t>0 ? Math.round(res[f].c/res[f].t*100) : null; });
  return res;
}
function accuracyByGroup(level){ // level: "mid" | "sub"
  const map={};
  allAttempts().forEach(a=>{
    const q=qById(a.qid); if(!q) return;
    const f=fieldOf(q);
    const key = (level==="sub") ? `${f}|${q.mid||"その他"}|${q.sub||"その他"}` : `${f}|${q.mid||"その他"}`;
    if(!map[key]) map[key]={field:f, mid:q.mid||"その他", sub:q.sub||"", t:0,c:0};
    map[key].t++; if(a.ok) map[key].c++;
  });
  return Object.values(map).map(o=>Object.assign(o,{rate: o.t?Math.round(o.c/o.t*100):0})).sort((a,b)=>a.rate-b.rate||b.t-a.t);
}
function weakQuestions(){
  const last={};
  allAttempts().sort((a,b)=>a.ts-b.ts).forEach(a=>{ last[a.qid]={ok:a.ok, ts:a.ts}; });
  return Object.keys(last).filter(k=>!last[k].ok).sort((a,b)=>last[b].ts-last[a].ts);
}
/* 未解答=「わからない」で記録した解答か（pick が null のものも未解答扱い） */
function isUnsure(a){ return !!(a && (a.unsure || (a.pick==null && !a.ok))); }
function overallStats(){
  const at=allAttempts();
  const c=at.filter(a=>a.ok).length;
  const unk=at.filter(a=>isUnsure(a)).length;
  return { total:at.length, correct:c, unsure:unk,
           rate: at.length?Math.round(c/at.length*100):null,
           sessions:(ST.history||[]).length,
           studyDays: new Set((ST.history||[]).map(h=>dayKey(new Date(h.ts)))).size };
}
function streakInfo(){
  const days = new Set((ST.history||[]).map(h=>dayKey(new Date(h.ts))));
  let n=0, cur=today();
  if(!days.has(dayKey(cur))) cur=addDays(cur,-1);
  while(days.has(dayKey(cur))){ n++; cur=addDays(cur,-1); }
  return n;
}

/* ---------------- ルーティング ---------------- */
const ROUTES = {
  home:{title:"ホーム", icon:'<path d="M3 10.5 12 3l9 7.5V21H3z"/>'},
  practice:{title:"問題演習", icon:'<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>'},
  quiz:{title:"出題中", icon:'<path d="M12 3v18M3 12h18"/>', hidden:true},
  result:{title:"結果", icon:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', hidden:true},
  analysis:{title:"学習分析", icon:'<path d="M4 19V5M4 19h16"/><path d="M8 15l4-5 3 3 4-6"/>'},
  history:{title:"学習履歴", icon:'<path d="M4 6h16M4 12h16M4 18h10"/>'},
  roadmap:{title:"学習ロードマップ", icon:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/>'},
  cards:{title:"用語カード", icon:'<path d="M3 6h7l2 3H3z"/><path d="M3 13h18v6H3z"/>'},
  manage:{title:"問題管理", icon:'<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>'}
};
const NAV_ORDER = ["home","practice","analysis","history","roadmap","cards","manage"];
const TAB_ORDER = ["home","practice","analysis","roadmap"];

let currentRoute = "home";
let routeParam = null;

function parseHash(){
  const h = location.hash.replace(/^#\/?/,"");
  const [r, ...rest] = h.split("/");
  const name = ROUTES[r]?r:"home";
  return {name, param: rest.join("/")||null};
}
function navigate(path){ location.hash = "#/"+path.replace(/^#\/?/,""); }
function onHashChange(){
  const {name,param}=parseHash();
  if(name==="quiz" && !ST.session){ navigate("practice"); return; }
  currentRoute=name; routeParam=param;
  render();
  window.scrollTo({top:0,behavior:"instant"});
}

/* ---------------- ナビ描画 ---------------- */
function navHTML(){
  const weak = weakQuestions().length;
  const groups = [
    {label:"学習", items:["home","practice"]},
    {label:"ふりかえり", items:["analysis","history","roadmap"]},
    {label:"その他", items:["cards","manage"]}
  ];
  return groups.map(g=>`
    <div class="nav-group-label">${g.label}</div>
    ${g.items.map(k=>`
      <a class="nav-item${currentRoute===k||(currentRoute==="quiz"&&k==="practice")||(currentRoute==="result"&&k==="practice")?" active":""}" href="#/${k}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ROUTES[k].icon}</svg>
        <span>${ROUTES[k].title}</span>
        ${k==="practice"&&weak?`<span class="nav-badge">${weak}</span>`:""}
      </a>`).join("")}
  `).join("");
}
function tabbarHTML(){
  const iconMore = '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>';
  return TAB_ORDER.map(k=>`
    <button data-act="tab" data-route="${k}" class="${currentRoute===k||(currentRoute==="quiz"&&k==="practice")?"active":""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ROUTES[k].icon}</svg>
      <span>${ROUTES[k].title.replace("学習","")}</span>
    </button>`).join("") + `
    <button data-act="open-menu"><svg viewBox="0 0 24 24" fill="currentColor">${iconMore}</svg><span>メニュー</span></button>`;
}
function paintChrome(){
  $("#sidebar-nav").innerHTML = navHTML();
  $("#tabbar").innerHTML = tabbarHTML();
  const t = ROUTES[currentRoute]?ROUTES[currentRoute].title:"ホーム";
  $("#tb-title").textContent = t;
  const ex = parseDay(ST.settings.examDate);
  const d = ex? diffDays(today(), ex):null;
  $("#tb-days").textContent = d===null? "—" : (d>=0? `あと${d}日` : "受験日超過");
  $("#spine-qcount").textContent = allQuestions().length;
  const s = streakInfo();
  $("#spine-streak").innerHTML = s>0? `<span style="font-size:11px">🔥 ${s}日連続で学習中</span>`:"";
}

/* ---------------- トースト / モーダル ---------------- */
let toastTimer=null;
function toast(msg){
  const el=$("#toast");
  $("#toast-in").textContent=msg;
  el.classList.add("show");
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>el.classList.remove("show"),2200);
}
function openModal(html, opts={}){
  const back=$("#modal-back");
  $("#modal").innerHTML=html;
  back.classList.add("show");
  document.body.style.overflow="hidden";
  if(opts.after) setTimeout(()=>opts.after($("#modal")),0);
}
function closeModal(){
  $("#modal-back").classList.remove("show");
  $("#modal").innerHTML="";
  document.body.style.overflow="";
}

/* ---------------- 共通パーツ ---------------- */
function pillField(f){ const F=FIELDS[f]; return `<span class="pill ${F.cls}"><i class="dot ${F.cls}"></i>${F.short}</span>`; }
function ringSVG(rate, size=132){
  const r=(size-18)/2, c=2*Math.PI*r;
  const val = rate==null?0:clamp(rate,0,100);
  const col = val>=70? "#2f6b3a" : val>=50? "#a9682b" : "#b5532f";
  return `<div class="ring" style="width:${size}px;height:${size}px;flex-basis:${size}px">
    <svg viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e7dfcc" stroke-width="10"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${c-(c*val/100)}" style="transition:stroke-dashoffset .8s cubic-bezier(.3,.9,.3,1)"/>
    </svg>
    <div class="ring-val"><b>${rate==null?"—":val+"<small style='font-size:15px'>%</small>"}</b><span>正答率</span></div>
  </div>`;
}
function barHTML(rate, cls="", small=false){
  const v = rate==null?0:clamp(rate,0,100);
  return `<div class="bar ${cls} ${small?"sm":""}"><i style="width:${v}%"></i></div>`;
}

/* ---------------- ビュー登録 / アクション基盤 ---------------- */
const VIEWS = {};
const ACT = {};
function act(name, fn){ ACT[name]=fn; }
document.addEventListener("click", e=>{
  const el = e.target.closest("[data-act]");
  if(!el) return;
  const fn = ACT[el.dataset.act];
  if(!fn) return;
  e.preventDefault();
  fn(el, e, el.dataset);
});
document.addEventListener("click", e=>{
  if(e.target.id==="scrim" || e.target.id==="modal-back"){ closeModal(); $("#spine").classList.remove("open"); $("#scrim").classList.remove("show"); }
});
document.addEventListener("keydown", e=>{
  if(e.key==="Escape"){ closeModal(); $("#spine").classList.remove("open"); $("#scrim").classList.remove("show"); }
});

act("tab", el=>navigate(el.dataset.route));
act("open-menu", ()=>{ $("#spine").classList.add("open"); $("#scrim").classList.add("show"); });
act("close-modal", ()=>closeModal());
