// ════════════════════════════════════════════════════════════════════════
//  PHASE 3: ACCESSIBILITY & ADVANCED FEATURES (merged 24+25+26+27)
//  Color Blindness Filters · Event Delegation · Team Stats ·
//  Charts · More Features · ARIA Improvements · Google Sheets Import
//  NOTE: These sections are merged because file 24's outer IIFE spans
//        all of them (closing at the end of original file 27).
// ════════════════════════════════════════════════════════════════════════

// ═══ EVENT DELEGATION ═══
// V12-fix: Enhanced event delegation for option button clicks
// Handles clicks on child elements (opt-btn-letter, opt-btn-content, opt-btn-text)
// that may not trigger the button's onclick attribute in some browsers/scenarios
var _lastOptionClickTime=0;
var _lastOptionClickIdx=-1;
document.addEventListener('click',function(e){
  // V12-fix: Allow clicks on hidden-option buttons so handleOptionClick can reveal them
  var optBtn=e.target.closest('#q-options-grid .option-btn:not(.revealed):not(.faded)');
  if(optBtn){
    var origI=parseInt(optBtn.id.replace('opt-btn-',''));
    if(!isNaN(origI)){
      e.stopPropagation();
      // V12-fix: Invoke handleOptionClick only if it wasn't already called for this button
      // in the last 300ms (prevents double-firing from onclick + event delegation)
      var now=Date.now();
      if(typeof handleOptionClick==='function'&&!state.answered
        &&!(origI===_lastOptionClickIdx&&now-_lastOptionClickTime<300)){
        _lastOptionClickTime=now;
        _lastOptionClickIdx=origI;
        handleOptionClick(origI);
      }
    }
  }
});

function initSessionStats(){
  state.sessionStats={};
  state.teamStreaks={};        // ← reset streaks each session
  state.scoreHistory=[];       // ← clear undo history
  state.teams.forEach(t=>{
    state.sessionStats[t.id]={correct:0,wrong:0,skipped:0,totalTime:0,answers:[]};
    state.teamStreaks[t.id]=0;
  });
  updateUndoBtn();             // ← reset undo button state
}

function recordAnswer(teamId,isCorrect,timeUsed){
  if(!teamId)return; // Guard against null teamId
  if(!state.sessionStats[teamId])
    state.sessionStats[teamId]={correct:0,wrong:0,skipped:0,totalTime:0,answers:[]};
  const s=state.sessionStats[teamId];
  if(isCorrect)s.correct++;else s.wrong++;
  s.totalTime+=timeUsed||0;
  s.answers.push({catId:state.currentCatId,qIdx:state.currentQIndex,correct:isCorrect,time:timeUsed||0});
  // Cap answers array to prevent unbounded growth
  if(s.answers.length>500)s.answers=s.answers.slice(-400);
  // Refresh stats if visible
  try{refreshTeamStatsIfVisible();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_199")}catch(_){}}
}

// Unified streak update — call from ALL answer-handling paths
function _updateStreak(teamId,isCorrect){
  if(!teamId)return;
  if(isCorrect){
    state.teamStreaks[teamId]=(state.teamStreaks[teamId]||0)+1;
  }else{
    state.teamStreaks[teamId]=0;
  }
  const team=state.teams.find(t=>t.id===teamId);
  if(team) updateStreakDisplay(team);
}

function showTeamStats(){
  renderTeamStats();
  showView('teamstats');
  // Force scroll to top — multiple attempts for mobile reliability
  const _scrollTeamStats=()=>{
    const v=document.getElementById('view-teamstats');
    if(v){v.scrollTop=0;v.scrollTo(0,0);const w=v.querySelector('.teamstats-wrapper');if(w){w.scrollTop=0;w.scrollTo(0,0);}}
    window.scrollTo({top:0,left:0,behavior:'instant'});
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  };
  _scrollTeamStats();
  requestAnimationFrame(()=>{_scrollTeamStats();});
  setTimeout(_scrollTeamStats,50);
  setTimeout(_scrollTeamStats,200);
  setTimeout(_scrollTeamStats,400);
}

function renderTeamStats(){
  const grid=document.getElementById('teamstats-grid');if(!grid)return;
  if(!state.teams.length){setChildren(grid,h('div.empty-state',h('div.empty-icon','👥'),h('p','لا توجد فرق')));return;}
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  const medals=['🥇','🥈','🥉'];
  grid.innerHTML=sorted.map((t,rank)=>{
    const s=state.sessionStats[t.id]||{correct:0,wrong:0,skipped:0,totalTime:0};
    const total=(s.correct||0)+(s.wrong||0);
    const pct=total>0?Math.round(s.correct/total*100):0;
    const avgTime=total>0?Math.round((s.totalTime||0)/total):0;
    const cats=new Set((s.answers||[]).map(a=>a.catId));
    return `
    <div class="teamstat-card" style="animation-delay:${rank*.1}s;border-color:${t.color}44">
      <div class="teamstat-header" style="background:${t.color}14">
        <div class="teamstat-avatar" style="background:${t.color};overflow:hidden">${t.teamImage?'<img src="'+_safeMediaSrc(t.teamImage)+'" alt="'+_sanitizeUser(t.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':t.name[0]}</div>
        <div>
          <div class="teamstat-name" style="color:${t.color}">${medals[rank]||rank+1} ${_sanitizeUser(t.name)}</div>
          <div class="text-sm text-muted">${(function(n){return n+(n===0?" أعضاء":n===1?" عضو":n===2?" عضوان":n<=10?" أعضاء":" عضواً")})((t.members||[]).filter(m=>m&&(typeof m==="object"?(m.name||"").trim():String(m).trim())).length)}</div>
        </div>
        <div class="teamstat-score" style="color:${t.color}">${t.score||0}<span style="font-size:.7rem;color:var(--text-muted)"> ن</span></div>
      </div>
      <div class="teamstat-body">
        <div class="stat-row">
          <span class="stat-label">✅ إجابات صحيحة</span>
          <span class="stat-value" style="color:var(--success)">${s.correct||0}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">❌ إجابات خاطئة</span>
          <span class="stat-value" style="color:var(--danger)">${s.wrong||0}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">⏱ متوسط وقت الإجابة</span>
          <span class="stat-value">${avgTime} ث</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">📂 أقسام لُعبت</span>
          <span class="stat-value">${cats.size}</span>
        </div>
        <div class="stat-bar-row">
          <div class="stat-bar-label">
            <span>نسبة الإجابات الصحيحة</span>
            <span style="color:${pct>=70?'var(--success)':pct>=40?'var(--accent1)':'var(--danger)'}">${pct}%</span>
          </div>
          <div class="stat-bar-track">
            <div class="stat-bar-fill" style="width:${pct}%;background:${pct>=70?'var(--success)':pct>=40?'var(--accent1)':'var(--danger)'}"></div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Helper: refresh team stats if the teamstats view is currently visible
function refreshTeamStatsIfVisible(){
  const v=document.getElementById('view-teamstats');
  if(v&&!v.classList.contains('hidden')){
    try{renderTeamStats();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_200")}catch(_){}}
  }
}

// ════════════════════════════════════════════════════════
//  PHASE 3 FEATURES — Advanced Stats, Branching, Accessibility,
//  Mobile, Badges, Enhanced Editor
// ════════════════════════════════════════════════════════

(function(){
'use strict';

// ── Phase 3: Inject CSS ──────────────────────────────────
var _phase3CSS=document.createElement('style');
_phase3CSS.textContent='\n/* ── PHASE 3: Advanced Statistics Panel ── */\n#adv-stats-panel{width:100%;max-width:1100px;margin:12px auto 0;padding:0;box-sizing:border-box}\n#adv-stats-panel.hidden{display:none!important}\n.adv-stats-charts{display:grid;grid-template-columns:repeat(2,minmax(280px,1fr));gap:16px;width:100%}\n.adv-chart-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:16px;overflow:hidden;transition:transform .2s,box-shadow .2s}\n.adv-chart-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.3)}\n.adv-chart-title{font-size:.9rem;font-weight:700;color:var(--accent1);margin-bottom:10px;display:flex;align-items:center;gap:8px}\n.adv-chart-canvas{width:100%!important;height:auto!important;max-height:260px;display:block}\n.adv-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;margin-bottom:16px}\n.adv-summary-card{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;transition:border-color .2s}\n.adv-summary-card:hover{border-color:var(--accent1)}\n.adv-summary-value{font-size:1.6rem;font-weight:900;color:var(--accent1)}\n.adv-summary-label{font-size:.7rem;color:var(--text-muted);margin-top:2px}\n#btn-adv-stats{white-space:nowrap;transition:background .2s}\n@media(max-width:768px){.adv-stats-charts{grid-template-columns:1fr;gap:12px}.adv-chart-card{padding:12px}.adv-chart-canvas{max-height:220px}.adv-summary-grid{grid-template-columns:repeat(2,minmax(100px,1fr))}.adv-summary-value{font-size:1.3rem}}\n@media(max-width:480px){.adv-stats-charts{grid-template-columns:1fr;gap:10px}.adv-chart-card{padding:10px;border-radius:12px}.adv-chart-canvas{max-height:180px}.adv-summary-grid{grid-template-columns:repeat(2,minmax(80px,1fr));gap:8px}.adv-summary-card{padding:8px}#btn-adv-stats{font-size:.75rem;padding:4px 10px}}\n@media(min-width:1200px){.adv-chart-canvas{max-height:320px}.adv-stats-charts{gap:20px}.adv-summary-grid{grid-template-columns:repeat(4,minmax(150px,1fr))}}\n\n/* ── PHASE 3: Color Blindness Filters ── */\nbody.cb-protanopia{filter:url(#cb-filter-protanopia)}\nbody.cb-deuteranopia{filter:url(#cb-filter-deuteranopia)}\nbody.cb-tritanopia{filter:url(#cb-filter-tritanopia)}\n\n/* ── PHASE 3: Skip Navigation ── */\n.skip-nav{position:absolute;top:-100%;right:0;z-index:99999;background:var(--accent1);color:#000;padding:8px 16px;font-weight:700;text-decoration:none;border-radius:0 0 0 8px;transition:top .2s}\n.skip-nav:focus{top:0}\n\n/* ── PHASE 3: Bottom Sheet Modal ── */\n.modal-overlay.bottom-sheet{align-items:flex-end;padding:0}\n.modal-overlay.bottom-sheet .modal{border-radius:20px 20px 0 0;max-height:85vh;max-width:100%;margin-bottom:0;animation:sheet-up .3s cubic-bezier(.16,1,.3,1)}\n@keyframes sheet-up{from{transform:translateY(100%)}to{transform:none}}\n.modal-overlay.bottom-sheet .modal::before{content:\'\'";display:block;width:40px;height:4px;background:var(--text-muted);border-radius:2px;margin:0 auto 12px}\n\n/* ── PHASE 3: Touch Targets ── */\n@media(pointer:coarse){\n  .btn,.nav-tab,.option-btn,.lifeline-btn,.question-item,.cat-pres-btn{min-height:44px;min-width:44px}\n  .btn-icon{min-width:44px;min-height:44px;padding:10px}\n}\n\n/* ── PHASE 3: Badge Notification ── */\n.badge-notif{position:fixed;top:50%;left:50%;z-index:9000;transform:translate(-50%,-50%) scale(0);background:var(--bg-card);border:2px solid var(--accent1);border-radius:24px;padding:32px 48px;text-align:center;box-shadow:0 0 80px rgba(0,232,208,.4),0 24px 64px rgba(0,0,0,.8);animation:badge-pop .6s cubic-bezier(.175,.885,.32,1.275) forwards;pointer-events:none}\n.badge-notif-icon{font-size:4rem;display:block;margin-bottom:8px;animation:badge-spin 1s ease}\n.badge-notif-name{font-size:1.5rem;font-weight:900;color:var(--accent1);margin-bottom:4px}\n.badge-notif-desc{font-size:.9rem;color:var(--text-secondary)}\n@keyframes badge-pop{0%{transform:translate(-50%,-50%) scale(0);opacity:0}60%{transform:translate(-50%,-50%) scale(1.15);opacity:1}100%{transform:translate(-50%,-50%) scale(1);opacity:1}}\n@keyframes badge-spin{0%{transform:rotateY(0)}100%{transform:rotateY(720deg)}}\n.badge-notif.badge-exit{animation:badge-fade .4s ease forwards}\n@keyframes badge-fade{to{transform:translate(-50%,-50%) scale(.8);opacity:0}}\n\n/* ── PHASE 3: Badges Grid ── */\n.badges-grid{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;justify-content:center}\n.badge-item{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 8px;border-radius:12px;border:1px solid var(--border);background:var(--bg-panel);min-width:80px;text-align:center;transition:border-color .2s}\n.badge-item.earned{border-color:var(--accent1);box-shadow:0 0 12px rgba(0,232,208,.15)}\n.badge-item.locked{opacity:.4;filter:grayscale(.6)}\n.badge-item-icon{font-size:1.8rem}\n.badge-item-name{font-size:.7rem;font-weight:700;color:var(--text-primary)}\n.badge-item-desc{font-size:.6rem;color:var(--text-muted)}\n\n/* ── PHASE 3: Question Branching UI ── */\n.branch-section{margin-top:12px;padding:12px;border:1px dashed var(--accent2);border-radius:10px;background:rgba(162,89,255,.06)}\n.branch-section-title{font-size:.83rem;font-weight:700;color:var(--accent2);margin-bottom:8px;display:flex;align-items:center;gap:6px}\n.branch-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}\n.branch-label-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:12px;font-size:.7rem;font-weight:700;background:rgba(162,89,255,.1);color:var(--accent2);border:1px solid rgba(162,89,255,.3)}\n\n/* ── PHASE 3: Keyboard Shortcuts Overlay ── */\n.kb-shortcuts-overlay{position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;animation:fade-in .2s ease}\n.kb-shortcuts-panel{background:var(--bg-card);border:1px solid var(--border-light);border-radius:20px;padding:28px 32px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto}\n.kb-shortcuts-panel h3{font-size:1.1rem;font-weight:900;color:var(--accent1);margin-bottom:16px}\n.kb-shortcut-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)}\n.kb-key{display:inline-flex;padding:2px 8px;border-radius:6px;background:var(--bg-surface);border:1px solid var(--border);font-family:monospace;font-size:.8rem;font-weight:700;color:var(--accent1);min-width:28px;text-align:center}\n.kb-desc{font-size:.85rem;color:var(--text-secondary)}\n\n/* ── PHASE 3: Bulk Import ── */\n.bulk-import-area{margin-top:12px}\n.bulk-import-area textarea{width:100%;min-height:120px;font-family:Cairo,monospace;font-size:.85rem;direction:rtl;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text-primary);padding:12px;resize:vertical}\n\n/* ── PHASE 3: Mobile Collapsible Sections ── */\n@media(max-width:768px){\n  .admin-content .card-header{cursor:pointer;-webkit-tap-highlight-color:transparent}\n  .admin-content .card-body-collapsible{max-height:0;overflow:hidden;transition:max-height .3s ease}\n  .admin-content .card-body-collapsible.expanded{max-height:5000px}\n  .mobile-collapse-toggle{display:inline-flex!important}\n}\n.mobile-collapse-toggle{display:none;align-items:center;gap:4px;font-size:.75rem;color:var(--text-muted);cursor:pointer;margin-right:auto;padding:4px 8px;border-radius:6px;background:var(--bg-surface)}\n.mobile-collapse-toggle:hover{color:var(--text-primary)}\n\n/* ── PHASE 3: Touch Scroll ── */\n.touch-scroll{overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;scrollbar-width:thin}\n.touch-scroll::-webkit-scrollbar{width:4px}\n.touch-scroll::-webkit-scrollbar-thumb{background:var(--border-light);border-radius:2px}\n\n/* ── PHASE 3: Question Preview ── */\n.q-preview-overlay{position:fixed;inset:0;z-index:7000;background:rgba(0,0,0,.92);backdrop-filter:blur(12px);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:fade-in .2s ease}\n.q-preview-box{background:var(--bg-card);border:2px solid var(--accent1);border-radius:20px;padding:32px;max-width:700px;width:92%;text-align:center;box-shadow:0 0 60px rgba(0,232,208,.2)}\n.q-preview-close{position:absolute;top:16px;left:16px;z-index:1}\n';
document.head.appendChild(_phase3CSS);

// ── Phase 3: Inject SVG filters for color blindness ─────
var _svgFilters=document.createElement('div');
_svgFilters.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
_svgFilters.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0"><defs><filter id="cb-filter-protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/></filter><filter id="cb-filter-deuteranopia"><feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/></filter><filter id="cb-filter-tritanopia"><feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/></filter></defs></svg>';
document.body.insertBefore(_svgFilters,document.body.firstChild);

// ── Phase 3: Add skip navigation link ────────────────────
(function(){
  var skipLink=document.createElement('a');
  skipLink.className='skip-nav';
  skipLink.href='#app';
  skipLink.textContent=I18n.t('btn.skipToContent')||'انتقل إلى المحتوى الرئيسي';
  document.body.insertBefore(skipLink,document.body.firstChild);
})();

// ── Phase 3: Add aria-live region ────────────────────────
(function(){
  var liveRegion=document.createElement('div');
  liveRegion.id='aria-score-updates';
  liveRegion.setAttribute('aria-live','polite');
  liveRegion.setAttribute('aria-atomic','true');
  liveRegion.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)';
  document.body.appendChild(liveRegion);
})();


// ────────────────────────────────────────────────────────────
//  Continued from previous section (merged boundary)
// ────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════
//  1. ADVANCED STATISTICS WITH CHARTS
// ════════════════════════════════════════════════════════

var QuizCharts={};

QuizCharts.drawPieChart=function(canvas,data,colors){
  if(!canvas||!data||!data.length)return;
  var ctx=canvas.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr;
  canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,rect.width,rect.height);
  var w=rect.width,h=rect.height;
  var cx=w/2,cy=h/2;
  var radius=Math.max(10,Math.min(cx,cy)-40);
  var innerRadius=radius*0.5;
  var total=data.reduce(function(s,d){return s+Math.max(0,d.value||0);},0);
  if(total===0){
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()||'#666';
    ctx.font='14px Cairo,sans-serif';ctx.textAlign='center';
    ctx.fillText(t('empty.noData'),cx,cy);
    return;
  }
  var cs=colors||['#00e8d0','#a259ff','#ff3d5a','#ffb800','#00e676','#f472b6','#fb923c','#34d399'];
  var startAngle=-Math.PI/2;
  data.forEach(function(d,i){
    var sliceAngle=Math.max(0,(d.value||0)/total)*2*Math.PI;
    if(sliceAngle<0.001){startAngle+=sliceAngle;return;}
    ctx.beginPath();
    ctx.arc(cx,cy,radius,startAngle,startAngle+sliceAngle);
    ctx.arc(cx,cy,innerRadius,startAngle+sliceAngle,startAngle,true);
    ctx.closePath();
    ctx.fillStyle=cs[i%cs.length];ctx.fill();
    if(sliceAngle>0.15){
      var midAngle=startAngle+sliceAngle/2;
      var lx=cx+Math.cos(midAngle)*(radius*0.75);
      var ly=cy+Math.sin(midAngle)*(radius*0.75);
      ctx.fillStyle='#fff';ctx.font='bold 12px Cairo,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';
      var pct=Math.round((d.value||0)/total*100);
      ctx.fillText(pct+'%',lx,ly);
    }
    startAngle+=sliceAngle;
  });
  var legendY=h-8;
  ctx.textAlign='right';ctx.textBaseline='bottom';
  ctx.font='11px Cairo,sans-serif';
  var legendSpacing=w/data.length;
  data.forEach(function(d,i){
    var lx=legendSpacing*i+legendSpacing/2;
    ctx.fillStyle=cs[i%cs.length];
    ctx.fillRect(lx-30,legendY-10,8,8);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()||'#aaa';
    var label=(d.label||'').length>8?(d.label||'').slice(0,7)+'…':d.label||'';
    ctx.fillText(label,lx+20,legendY);
  });
};

QuizCharts.drawBarChart=function(canvas,labels,values,colors){
  if(!canvas||!labels||!labels.length)return;
  var ctx=canvas.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);ctx.clearRect(0,0,rect.width,rect.height);
  var w=rect.width,h=rect.height;
  var padTop=20,padBottom=40,padLeft=50,padRight=20;
  var chartW=w-padLeft-padRight,chartH=h-padTop-padBottom;
  var maxVal=Math.max.apply(null,values.map(function(v){return Math.max(0,v||0);}).concat([1]));
  var cs=colors||['#00e8d0','#a259ff','#ff3d5a','#ffb800','#00e676'];
  var barW=Math.max(8,Math.min(50,chartW/labels.length-12));
  ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#333';
  ctx.lineWidth=0.5;
  for(var gi=0;gi<=4;gi++){
    var gy=padTop+chartH*(1-gi/4);
    ctx.beginPath();ctx.moveTo(padLeft,gy);ctx.lineTo(w-padRight,gy);ctx.stroke();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()||'#666';
    ctx.font='10px Cairo,sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';
    ctx.fillText(Math.round(maxVal*gi/4),padLeft-6,gy);
  }
  labels.forEach(function(label,i){
    var x=padLeft+(i+0.5)*(chartW/labels.length);
    var barH=Math.max(0,(values[i]||0)/maxVal)*chartH;
    var y=padTop+chartH-barH;
    ctx.fillStyle=cs[i%cs.length];
    var rx=x-barW/2;
    var r=Math.min(4,barW/4);
    ctx.beginPath();
    ctx.moveTo(rx+r,y);ctx.lineTo(rx+barW-r,y);
    ctx.quadraticCurveTo(rx+barW,y,rx+barW,y+r);
    ctx.lineTo(rx+barW,padTop+chartH);ctx.lineTo(rx,padTop+chartH);
    ctx.lineTo(rx,y+r);ctx.quadraticCurveTo(rx,y,rx+r,y);
    ctx.fill();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim()||'#fff';
    ctx.font='bold 11px Cairo,sans-serif';ctx.textAlign='center';ctx.textBaseline='bottom';
    ctx.fillText(values[i]||0,x,y-4);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()||'#aaa';
    ctx.font='10px Cairo,sans-serif';ctx.textBaseline='top';
    var truncLabel=label.length>6?label.slice(0,5)+'…':label;
    ctx.fillText(truncLabel,x,padTop+chartH+6);
  });
};

QuizCharts.drawLineChart=function(canvas,dataPoints,colors,labels){
  if(!canvas||!dataPoints||!dataPoints.length)return;
  var ctx=canvas.getContext('2d');
  var dpr=window.devicePixelRatio||1;
  var rect=canvas.getBoundingClientRect();
  canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;
  ctx.scale(dpr,dpr);ctx.clearRect(0,0,rect.width,rect.height);
  var w=rect.width,h=rect.height;
  var padTop=20,padBottom=40,padLeft=50,padRight=20;
  var chartW=w-padLeft-padRight,chartH=h-padTop-padBottom;
  var cs=colors||['#00e8d0','#a259ff','#ff3d5a','#ffb800','#00e676'];
  var allVals=[];
  dataPoints.forEach(function(d){if(d.points)allVals=allVals.concat(d.points);});
  var maxVal=Math.max.apply(null,allVals.concat([1]));
  var numPts=Math.max.apply(null,dataPoints.map(function(d){return (d.points||[]).length;}).concat([1]));
  ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--border').trim()||'#333';
  ctx.lineWidth=0.5;
  for(var gi=0;gi<=4;gi++){
    var gy=padTop+chartH*(1-gi/4);
    ctx.beginPath();ctx.moveTo(padLeft,gy);ctx.lineTo(w-padRight,gy);ctx.stroke();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()||'#666';
    ctx.font='10px Cairo,sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';
    ctx.fillText(Math.round(maxVal*gi/4),padLeft-6,gy);
  }
  if(labels&&labels.length){
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()||'#666';
    ctx.font='9px Cairo,sans-serif';ctx.textAlign='center';ctx.textBaseline='top';
    labels.forEach(function(lbl,i){
      if(i%Math.max(1,Math.floor(labels.length/8))!==0&&i!==labels.length-1)return;
      var x=padLeft+i/(labels.length-1||1)*chartW;
      ctx.fillText(lbl.length>5?lbl.slice(0,4)+'…':lbl,x,padTop+chartH+6);
    });
  }
  dataPoints.forEach(function(team,ti){
    var pts=team.points||[];
    if(pts.length<1)return;
    ctx.strokeStyle=cs[ti%cs.length];ctx.lineWidth=2.5;
    ctx.beginPath();
    pts.forEach(function(v,i){
      var x=padLeft+i/(numPts-1||1)*chartW;
      var y=padTop+chartH-Math.max(0,v)/maxVal*chartH;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    });
    ctx.stroke();
    pts.forEach(function(v,i){
      var x=padLeft+i/(numPts-1||1)*chartW;
      var y=padTop+chartH-Math.max(0,v)/maxVal*chartH;
      ctx.fillStyle=cs[ti%cs.length];
      ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();
    });
  });
  var legendY=8;var legendX=padLeft;
  ctx.font='10px Cairo,sans-serif';ctx.textAlign='right';ctx.textBaseline='top';
  dataPoints.forEach(function(team,ti){
    ctx.fillStyle=cs[ti%cs.length];ctx.fillRect(legendX,legendY,8,8);
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim()||'#aaa';
    var name=(team.label||'').length>10?(team.label||'').slice(0,9)+'…':team.label||'';
    ctx.fillText(name,legendX+12+ctx.measureText(name).width,legendY);
    legendX+=40+ctx.measureText(name).width;
  });
};

QuizCharts.renderAdvancedStats=function(){
  var _t=function(key,fallback){try{var v=I18n.t(key);return v&&v!==key?v:fallback;}catch(e){return fallback;}};
  var panel=document.getElementById('adv-stats-panel');
  if(!panel)return;
  if(panel.classList.contains('hidden'))return;
  var teams=state.teams||[];
  if(!teams.length){panel.innerHTML='<div style="text-align:center;color:var(--text-muted);padding:32px">'+_t('stats.noTeams','لا توجد فرق لعرض الإحصائيات')+'</div>';return;}
  var teamColors=teams.map(function(t){return t.color||'#00e8d0';});
  var teamNames=teams.map(function(t){return t.name||'فريق';});
  // Calculate summary stats
  var totalAnswers=0,totalCorrect=0,fastestTeam='',fastestAvg=Infinity;
  teams.forEach(function(t){
    var s=state.sessionStats[t.id]||{correct:0,wrong:0,totalTime:0};
    var cnt=(s.correct||0)+(s.wrong||0);
    totalAnswers+=cnt;
    totalCorrect+=(s.correct||0);
    if(cnt>0){
      var avg=Math.round((s.totalTime||0)/cnt*10)/10;
      if(avg<fastestAvg){fastestAvg=avg;fastestTeam=t.name||'فريق';}
    }
  });
  var overallAccuracy=totalAnswers>0?Math.round(totalCorrect/totalAnswers*100):0;
  var totalCategories=(state.categories||[]).length;
  var summaryHTML='<div class="adv-summary-grid">'
    +'<div class="adv-summary-card"><div class="adv-summary-value">'+totalAnswers+'</div><div class="adv-summary-label">'+_t('stats.totalAnswers','إجمالي الإجابات')+'</div></div>'
    +'<div class="adv-summary-card"><div class="adv-summary-value">'+overallAccuracy+'%</div><div class="adv-summary-label">'+_t('stats.accuracy','الدقة الإجمالية')+'</div></div>'
    +'<div class="adv-summary-card"><div class="adv-summary-value">'+(fastestTeam||'—')+'</div><div class="adv-summary-label">'+_t('stats.fastestTeam','أسرع فريق')+'</div></div>'
    +'<div class="adv-summary-card"><div class="adv-summary-value">'+totalCategories+'</div><div class="adv-summary-label">'+_t('stats.categoriesPlayed','الأقسام الملعوبة')+'</div></div>'
    +'</div>';
  panel.innerHTML=summaryHTML+'<div class="adv-stats-charts"><div class="adv-chart-card"><div class="adv-chart-title">📊 '+_t('stats.accuracyPerTeam','دقة الإجابات لكل فريق')+'</div><canvas id="chart-accuracy" class="adv-chart-canvas" style="height:260px"></canvas></div><div class="adv-chart-card"><div class="adv-chart-title">📈 '+_t('stats.scoreEvolution','تطور النتائج')+'</div><canvas id="chart-timeline" class="adv-chart-canvas" style="height:260px"></canvas></div><div class="adv-chart-card"><div class="adv-chart-title">📂 '+_t('stats.categoryPerformance','أداء الأقسام')+'</div><canvas id="chart-categories" class="adv-chart-canvas" style="height:260px"></canvas></div><div class="adv-chart-card"><div class="adv-chart-title">⏱ '+_t('stats.answerSpeed','سرعة الإجابة')+'</div><canvas id="chart-speed" class="adv-chart-canvas" style="height:260px"></canvas></div></div><div id="badges-panel" style="margin-top:20px;max-width:1100px;width:100%"></div>';
  requestAnimationFrame(function(){
    var accCanvas=document.getElementById('chart-accuracy');
    if(accCanvas){
      var accData=teams.map(function(t){
        var s=state.sessionStats[t.id]||{correct:0,wrong:0};
        var total=(s.correct||0)+(s.wrong||0);
        return {label:t.name,value:total>0?Math.round((s.correct||0)/total*100):0};
      });
      QuizCharts.drawPieChart(accCanvas,accData,teamColors);
    }
    var timeCanvas=document.getElementById('chart-timeline');
    if(timeCanvas&&state.scoreHistory&&state.scoreHistory.length){
      var scores={};
      teams.forEach(function(t){scores[t.id]=[0];});
      var timeLabels=['0'];var step=0;
      (state.scoreHistory||[]).forEach(function(entry){
        step++;
        teams.forEach(function(t){
          var prev=scores[t.id][scores[t.id].length-1]||0;
          scores[t.id].push(t.id===entry.teamId?prev+(entry.delta||0):prev);
        });
        timeLabels.push(String(step));
      });
      var dp=teams.map(function(t){return {label:t.name,teamId:t.id,points:scores[t.id]||[]};});
      QuizCharts.drawLineChart(timeCanvas,dp,teamColors,timeLabels);
    }else if(timeCanvas){
      var tctx=timeCanvas.getContext('2d');
      var tdpr=window.devicePixelRatio||1;
      var trect=timeCanvas.getBoundingClientRect();
      timeCanvas.width=trect.width*tdpr;timeCanvas.height=trect.height*tdpr;
      tctx.scale(tdpr,tdpr);
      tctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim()||'#666';
      tctx.font='14px Cairo,sans-serif';tctx.textAlign='center';
      var _t2=function(key,fb){try{var v=I18n.t(key);return v&&v!==key?v:fb;}catch(e){return fb;}};
      tctx.fillText(_t2('stats.noDataYet','لا توجد بيانات بعد'),trect.width/2,trect.height/2);
    }
    var catCanvas=document.getElementById('chart-categories');
    if(catCanvas){
      var categories=state.categories||[];
      var catLabels=categories.map(function(c){return c.name||'قسم';}).slice(0,8);
      var catCorrect=categories.slice(0,8).map(function(c){
        var total=0;
        teams.forEach(function(t){
          var s=state.sessionStats[t.id];
          if(s&&s.answers)s.answers.forEach(function(a){if(a.catId===c.id&&a.correct)total++;});
        });
        return total;
      });
      QuizCharts.drawBarChart(catCanvas,catLabels,catCorrect,categories.map(function(_,i){return i%2===0?'#00e676':'#00c050';}));
    }
    var speedCanvas=document.getElementById('chart-speed');
    if(speedCanvas){
      var speedData=teams.map(function(t){
        var s=state.sessionStats[t.id]||{correct:0,wrong:0,totalTime:0};
        var total=(s.correct||0)+(s.wrong||0);
        return total>0?Math.round((s.totalTime||0)/total*10)/10:0;
      });
      QuizCharts.drawBarChart(speedCanvas,teamNames,speedData,teamColors);
    }
    if(typeof renderBadgesPanel==='function'){
      teams.forEach(function(t){renderBadgesPanel(t.id);});
    }
  });
};

QuizCharts.toggleAdvancedStats=function(){
  var panel=document.getElementById('adv-stats-panel');
  if(!panel)return;
  var btn=document.getElementById('btn-adv-stats');
  if(panel.classList.contains('hidden')){
    panel.classList.remove('hidden');
    QuizCharts.renderAdvancedStats();
    if(btn)btn.innerHTML='📊 '+(function(){try{var v=I18n.t('btn.hideAdvancedStats');return v&&v!=='btn.hideAdvancedStats'?v:'إخفاء الإحصائيات';}catch(e){return 'إخفاء الإحصائيات';}})();
  }else{
    panel.classList.add('hidden');
    if(btn)btn.innerHTML='📊 '+(function(){try{var v=I18n.t('btn.advancedStats');return v&&v!=='btn.advancedStats'?v:'الإحصائيات المتقدمة';}catch(e){return 'الإحصائيات المتقدمة';}})();
  }
};

// ── Enhance renderTeamStats: add "Advanced Statistics" button ──
// Use QuizStats.renderTeamStats which is set at line ~6400 (same scope as the function)
// rather than window.renderTeamStats which may not be set yet at parse time
(function(){
  // Wait until the function is available (it's set during app init)
  var _orig=typeof renderTeamStats==='function'?renderTeamStats:(typeof QuizStats!=='undefined'&&QuizStats.renderTeamStats?QuizStats.renderTeamStats:null);
  if(!_orig){
    // Defer: try again after DOM is ready
    document.addEventListener('DOMContentLoaded',function(){
      var orig2=typeof renderTeamStats==='function'?renderTeamStats:(typeof QuizStats!=='undefined'&&QuizStats.renderTeamStats?QuizStats.renderTeamStats:null);
      if(orig2)_installAdvStats(orig2);
    });
    return;
  }
  _installAdvStats(_orig);
  function _installAdvStats(origFn){
    // Override the globally-accessible renderTeamStats
    window._renderTeamStatsWithAdvStats=origFn;
    window.renderTeamStats=function(){
      origFn.call(this);
      // V11: Button is now in the header bar HTML, no need to create dynamically
      // Update button text based on current language
      var btn=document.getElementById('btn-adv-stats');
      if(btn){
        var panel=document.getElementById('adv-stats-panel');
        var isHidden=panel&&panel.classList.contains('hidden');
        btn.innerHTML='📊 '+(function(){
          try{
            var v=isHidden?I18n.t('btn.advancedStats'):I18n.t('btn.hideAdvancedStats');
            return v&&v!=='btn.advancedStats'&&v!=='btn.hideAdvancedStats'?v:(isHidden?'الإحصائيات المتقدمة':'إخفاء الإحصائيات');
          }catch(e){return isHidden?'الإحصائيات المتقدمة':'إخفاء الإحصائيات';}
        })();
      }
      var panel=document.getElementById('adv-stats-panel');
      if(panel&&!panel.classList.contains('hidden')){
        QuizCharts.renderAdvancedStats();
      }
    };
    // Also update QuizStats reference
    if(typeof QuizStats!=='undefined')QuizStats.renderTeamStats=window.renderTeamStats;
  }
})();


// ════════════════════════════════════════════════════════
//  2. CONDITIONAL / BRANCHING QUESTIONS
// ════════════════════════════════════════════════════════

function isQuestionAvailable(catId,qIndex){
  try{
    var cat=(state.categories||[]).find(function(c){return c.id===catId;});
    if(!cat||!cat.questions||!cat.questions[qIndex])return true;
    var q=cat.questions[qIndex];
    if(!q.dependsOn||!q.dependsOn.questionId)return true;
    var depQId=q.dependsOn.questionId;
    var reqResult=q.dependsOn.answerRequired||'any';
    var teams=state.teams||[];
    for(var ti=0;ti<teams.length;ti++){
      var s=state.sessionStats[teams[ti].id];
      if(!s||!s.answers)continue;
      var ans=s.answers.find(function(a){
        for(var ci=0;ci<state.categories.length;ci++){
          var idx=state.categories[ci].questions.findIndex(function(qq){return qq.id===depQId;});
          if(idx!==-1&&a.catId===state.categories[ci].id&&a.qIdx===idx)return true;
        }
        return false;
      });
      if(ans){
        if(reqResult==='any')return true;
        if(reqResult==='correct'&&ans.correct)return true;
        if(reqResult==='wrong'&&!ans.correct)return true;
      }
    }
    for(var ci2=0;ci2<state.categories.length;ci2++){
      var depIdx=state.categories[ci2].questions.findIndex(function(qq){return qq.id===depQId;});
      if(depIdx!==-1){
        var usedSet=state.usedQuestions[state.categories[ci2].id];
        if(!usedSet||!usedSet.has(depIdx)){return true;}
        return reqResult==='any';
      }
    }
    return false;
  }catch(e){
    console.warn('isQuestionAvailable error:',e);
    return true;
  }
}

function getAvailableQuestions(catId){
  try{
    var cat=(state.categories||[]).find(function(c){return c.id===catId;});
    if(!cat||!cat.questions)return[];
    return cat.questions.map(function(_,i){return i;}).filter(function(i){return isQuestionAvailable(catId,i);});
  }catch(e){
    console.warn('getAvailableQuestions error:',e);
    var cat2=(state.categories||[]).find(function(c){return c.id===catId;});
    return cat2?cat2.questions.map(function(_,i){return i;}):[];
  }
}

// ── Patch loadQuestion to skip unavailable questions ──
(function(){
  var _origLoadQuestion=window.loadQuestion;
  if(_origLoadQuestion){
    window.loadQuestion=function(catId,qIdx,teamIdx){
      if(!isQuestionAvailable(catId,qIdx)){
        var available=getAvailableQuestions(catId);
        var nextIdx=available.find(function(i){return i>qIdx;});
        if(nextIdx!==undefined){qIdx=nextIdx;}
        else if(available.length>0){qIdx=available[0];}
        else{if(typeof toast==='function')toast(I18n.t('toast.noAvailableQuestions'),'info');return;}
      }
      return _origLoadQuestion.call(this,catId,qIdx,teamIdx);
    };
  }
})();

// ── Add branching UI to question editor ──
(function(){
  var observer=new MutationObserver(function(){
    var modal=document.getElementById('modal-question');
    if(!modal||document.getElementById('branch-section'))return;
    var footer=modal.querySelector('.modal-footer');
    if(!footer)return;
    var branchSection=document.createElement('div');
    branchSection.id='branch-section';branchSection.className='branch-section';
    branchSection.innerHTML='<div class="branch-section-title">🔗 شروط العرض</div><div class="branch-row"><label class="form-label" style="margin:0;font-size:.78rem">يعتمد على السؤال:</label><select id="q-depends-on" class="form-select" style="max-width:200px;font-size:.82rem"><option value="">— بدون شرط —</option></select><label class="form-label" style="margin:0;font-size:.78rem">النتيجة المطلوبة:</label><select id="q-depends-result" class="form-select" style="max-width:140px;font-size:.82rem"><option value="any">أي إجابة</option><option value="correct">إجابة صحيحة</option><option value="wrong">إجابة خاطئة</option></select><input type="text" id="q-branch-label" class="form-input" style="max-width:140px;font-size:.82rem" placeholder="تسمية الفرع"></div>';
    footer.parentNode.insertBefore(branchSection,footer);
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();

// ── Populate dependsOn dropdown when opening question modal ──
var _origOpenQuestionModal=window.openQuestionModal;
if(_origOpenQuestionModal){
  window.openQuestionModal=function(catId,qId){
    _origOpenQuestionModal.apply(this,arguments);
    setTimeout(function(){
      var sel=document.getElementById('q-depends-on');
      if(!sel)return;
      sel.innerHTML='<option value="">— بدون شرط —</option>';
      var tCat=catId||state.currentCatId;
      if(!tCat)return;
      var cat=state.categories.find(function(c){return c.id===tCat;});
      if(!cat)return;
      cat.questions.forEach(function(q,i){
        if(qId&&q.id===qId)return;
        var opt=document.createElement('option');
        opt.value=q.id;
        opt.textContent=(i+1)+'. '+(q.text||'').slice(0,40);
        sel.appendChild(opt);
      });
      if(qId){
        var eq=cat.questions.find(function(qq){return qq.id===qId;});
        if(eq&&eq.dependsOn){
          sel.value=eq.dependsOn.questionId||'';
          var resSel=document.getElementById('q-depends-result');
          if(resSel)resSel.value=eq.dependsOn.answerRequired||'any';
        }
        if(eq&&eq.branchLabel){
          var lbl=document.getElementById('q-branch-label');
          if(lbl)lbl.value=eq.branchLabel;
        }
      }
    },100);
  };
}

// ── Patch saveQuestion to include branching fields ──
var _origSaveQuestion=window.saveQuestion;
if(_origSaveQuestion){
  window.saveQuestion=function(){
    var cat=state.categories.find(function(c){return c.id===state.currentCatId;});
    if(cat&&state.editingQId){
      var q=cat.questions.find(function(qq){return qq.id===state.editingQId;});
      if(q){
        var depSel=document.getElementById('q-depends-on');
        var depRes=document.getElementById('q-depends-result');
        var branchLbl=document.getElementById('q-branch-label');
        if(depSel&&depSel.value){q.dependsOn={questionId:depSel.value,answerRequired:depRes?depRes.value:'any'};}
        else{delete q.dependsOn;}
        if(branchLbl&&branchLbl.value.trim()){q.branchLabel=branchLbl.value.trim();}
        else{delete q.branchLabel;}
        if(typeof saveState==='function')saveState();
      }
    }
    var depSel2=document.getElementById('q-depends-on');
    var depRes2=document.getElementById('q-depends-result');
    var branchLbl2=document.getElementById('q-branch-label');
    window._pendingDependsOn=depSel2&&depSel2.value?{questionId:depSel2.value,answerRequired:depRes2?depRes2.value:'any'}:null;
    window._pendingBranchLabel=branchLbl2?branchLbl2.value.trim():'';
    _origSaveQuestion.apply(this,arguments);
    if(window._pendingDependsOn||window._pendingBranchLabel){
      var cat2=state.categories.find(function(c){return c.id===state.currentCatId;});
      if(cat2){
        var lastQ=cat2.questions[cat2.questions.length-1];
        if(lastQ&&!state.editingQId){
          if(window._pendingDependsOn)lastQ.dependsOn=window._pendingDependsOn;
          if(window._pendingBranchLabel)lastQ.branchLabel=window._pendingBranchLabel;
          if(typeof saveState==='function')saveState();
        }
      }
      window._pendingDependsOn=null;window._pendingBranchLabel='';
    }
  };
}

// ── Show branch badge in question list ──
var _origRenderQuestionsAdmin=window.renderQuestionsAdmin;
if(_origRenderQuestionsAdmin){
  window.renderQuestionsAdmin=function(catId){
    _origRenderQuestionsAdmin.apply(this,arguments);
    var cat=state.categories.find(function(c){return c.id===catId;});
    if(!cat)return;
    var items=document.querySelectorAll('.question-item[data-qidx]');
    items.forEach(function(item){
      var idx=+item.dataset.qidx;
      var q=cat.questions[idx];
      if(!q)return;
      if(q.dependsOn&&q.dependsOn.questionId){
        var badge=document.createElement('span');
        badge.className='branch-label-badge';
        var depQ=cat.questions.find(function(qq){return qq.id===q.dependsOn.questionId;});
        var depName=depQ?(depQ.text||'').slice(0,20):q.dependsOn.questionId.slice(0,6);
        var resLabel=q.dependsOn.answerRequired==='correct'?I18n.t('answer.correct'):q.dependsOn.answerRequired==='wrong'?I18n.t('answer.wrong'):I18n.t('branch.anyAnswer','أي');
        badge.textContent='🔗 '+I18n.t('branch.dependsOn','يعتمد على')+': '+depName+' ('+resLabel+')';
        var body=item.querySelector('.question-body');
        if(body)body.appendChild(badge);
      }
      if(!isQuestionAvailable(catId,idx)){
        item.style.opacity='0.5';item.style.borderStyle='dashed';
        var lock=document.createElement('span');
        lock.style.cssText='font-size:.7rem;color:var(--danger);margin-right:4px';
        lock.textContent='🔒';
        var numEl=item.querySelector('.question-num');
        if(numEl)numEl.appendChild(lock);
      }
    });
  };
}


// ────────────────────────────────────────────────────────────
//  Continued from previous section (merged boundary)
// ────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════
//  3. ACCESSIBILITY IMPROVEMENTS
// ════════════════════════════════════════════════════════

var _focusTrapHandler=null;
var _prevFocusEl=null;

function trapFocus(modalEl){
  if(!modalEl)return;
  _prevFocusEl=document.activeElement;
  var focusable=modalEl.querySelectorAll('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])');
  if(!focusable.length)return;
  var first=focusable[0];var last=focusable[focusable.length-1];
  _focusTrapHandler=function(e){
    if(e.key!=='Tab')return;
    if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus();}}
    else{if(document.activeElement===last){e.preventDefault();first.focus();}}
  };
  document.addEventListener('keydown',_focusTrapHandler);
  first.focus();
}

function releaseFocus(){
  if(_focusTrapHandler){document.removeEventListener('keydown',_focusTrapHandler);_focusTrapHandler=null;}
  if(_prevFocusEl){try{_prevFocusEl.focus();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_201")}catch(_){}}_prevFocusEl=null;}
}

var _origOpenModal=window.openModal;
if(_origOpenModal){
  window.openModal=function(id){
    _origOpenModal.apply(this,arguments);
    setTimeout(function(){
      var modal=document.getElementById(id);
      if(modal)trapFocus(modal.querySelector('.modal')||modal);
    },50);
  };
}
var _origCloseModal=window.closeModal;
if(_origCloseModal){
  window.closeModal=function(id){releaseFocus();_origCloseModal.apply(this,arguments);};
}

// ── Announce score updates via aria-live ──
var _origRecordAnswer=window.recordAnswer;
if(_origRecordAnswer){
  window.recordAnswer=function(teamId,isCorrect,timeUsed){
    _origRecordAnswer.apply(this,arguments);
    try{
      // V14.3: Only announce team score updates when in team/competition mode
      // In solo mode, team announcements are confusing — solo has its own announce
      var soloActive=typeof _soloAnswered!=='undefined' && !document.getElementById('view-solo-question')?.classList.contains('hidden');
      if(soloActive)return;
      var team=(state.teams||[]).find(function(t){return t.id===teamId;});
      var liveEl=document.getElementById('aria-score-updates');
      if(team&&liveEl){liveEl.textContent=(team.name||'فريق')+' — '+(isCorrect?'إجابة صحيحة!':'إجابة خاطئة')+(team.score!==undefined?' — النتيجة: '+team.score:'');}
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_202")}catch(_){}}
  };
}

function setColorBlindMode(mode){
  document.body.classList.remove('cb-protanopia','cb-deuteranopia','cb-tritanopia');
  if(mode&&mode!=='none'){document.body.classList.add('cb-'+mode);}
  if(state.settings)state.settings.colorBlindMode=mode;
  if(typeof saveState==='function')saveState();
}

function showKeyboardShortcuts(){
  var existing=document.querySelector('.kb-shortcuts-overlay');
  if(existing){existing.remove();return;}
  var overlay=document.createElement('div');
  overlay.className='kb-shortcuts-overlay';
  overlay.innerHTML='<div class="kb-shortcuts-panel"><h3>⌨️ اختصارات لوحة المفاتيح</h3><div class="kb-shortcut-row"><span class="kb-desc">عرض الاختصارات</span><span class="kb-key">?</span></div><div class="kb-shortcut-row"><span class="kb-desc">السؤال التالي</span><span class="kb-key">→</span></div><div class="kb-shortcut-row"><span class="kb-desc">السؤال السابق</span><span class="kb-key">←</span></div><div class="kb-shortcut-row"><span class="kb-desc">إجابة صحيحة</span><span class="kb-key">C</span></div><div class="kb-shortcut-row"><span class="kb-desc">إجابة خاطئة</span><span class="kb-key">X</span></div><div class="kb-shortcut-row"><span class="kb-desc">إغلاق النافذة</span><span class="kb-key">Esc</span></div><div class="kb-shortcut-row"><span class="kb-desc">عرض النتائج</span><span class="kb-key">S</span></div><div style="margin-top:16px;text-align:center"><button class="btn btn-ghost btn-sm" onclick="this.closest(\'.kb-shortcuts-overlay\').remove()">إغلاق</button></div></div>';
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
  document.body.appendChild(overlay);
}

document.addEventListener('keydown',function(e){
  if(e.key==='?'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?document.activeElement.tagName:'')){
    e.preventDefault();showKeyboardShortcuts();
  }
});


// ════════════════════════════════════════════════════════
//  4. MOBILE IMPROVEMENTS
// ════════════════════════════════════════════════════════

function initSwipeNavigation(){
  var startX=0,startY=0,swiping=false;
  var questionView=document.getElementById('view-question');
  if(!questionView)return;
  questionView.addEventListener('touchstart',function(e){startX=e.touches[0].clientX;startY=e.touches[0].clientY;swiping=true;},{passive:true});
  questionView.addEventListener('touchmove',function(){},{passive:true});
  questionView.addEventListener('touchend',function(e){
    if(!swiping)return;swiping=false;
    var dx=e.changedTouches[0].clientX-startX;
    var dy=e.changedTouches[0].clientY-startY;
    if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)){
      if(dx<0){if(typeof nextQuestion==='function')nextQuestion();}
    }
  },{passive:true});
}

function openBottomSheet(modalId){
  var overlay=document.getElementById(modalId);
  if(!overlay)return;
  overlay.classList.add('bottom-sheet');overlay.classList.remove('hidden');
  setTimeout(function(){var modal=overlay.querySelector('.modal');if(modal)trapFocus(modal);},50);
}

function initMobileCollapsibles(){
  if(window.innerWidth>768)return;
  document.querySelectorAll('.admin-content .card-header').forEach(function(header){
    if(header.dataset.collapsibleInit)return;
    header.dataset.collapsibleInit='1';
    var body=header.nextElementSibling;
    if(!body)return;
    var toggle=document.createElement('span');
    toggle.className='mobile-collapse-toggle';toggle.innerHTML='▼';
    header.style.display='flex';header.style.alignItems='center';
    header.appendChild(toggle);
    body.classList.add('card-body-collapsible');body.classList.add('expanded');
    header.addEventListener('click',function(e){
      if(e.target.closest('button')||e.target.closest('.btn'))return;
      body.classList.toggle('expanded');
      toggle.textContent=body.classList.contains('expanded')?'▼':'▲';
    });
  });
}

function initTouchScrolling(){
  document.querySelectorAll('.questions-list,.teams-grid,.scoreboard-list').forEach(function(el){el.classList.add('touch-scroll');});
}

function initMobileImprovements(){
  initSwipeNavigation();initTouchScrolling();
  try{if(typeof Store!=='undefined')Store.subscribe('VIEW_CHANGE',function(){setTimeout(initMobileCollapsibles,200);});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_203")}catch(_){}}
  setTimeout(initMobileCollapsibles,500);
}


// ════════════════════════════════════════════════════════
//  5. BADGES AND ACHIEVEMENTS
// ════════════════════════════════════════════════════════

var BADGES=[
  {id:'first_win',name:'الفوز الأول',desc:'إجابة صحيحة أولى',icon:'🏆',condition:function(stats){return(stats.correct||0)>=1;}},
  {id:'streak_3',name:'سلسلة 3',desc:'3 إجابات صحيحة متتالية',icon:'🔥',condition:function(stats,streak){return(streak||0)>=3;}},
  {id:'streak_5',name:'سلسلة 5',desc:'5 إجابات صحيحة متتالية',icon:'⚡',condition:function(stats,streak){return(streak||0)>=5;}},
  {id:'streak_10',name:'الأسطورة',desc:'10 إجابات صحيحة متتالية',icon:'👑',condition:function(stats,streak){return(streak||0)>=10;}},
  {id:'perfect',name:'كامل',desc:'إجابات صحيحة 100%',icon:'💎',condition:function(stats){return(stats.correct||0)>0&&(stats.wrong||0)===0;}},
  {id:'speed_demon',name:'البرق',desc:'إجابة في أقل من 3 ثوان',icon:'⚡',condition:function(stats){return(stats.answers||[]).some(function(a){return a.correct&&a.time<3;});}},
  {id:'comeback',name:'العودة',desc:'تصدر بعد التخلف',icon:'🔄',condition:null},
  {id:'category_master',name:'خبير القسم',desc:'إجابات صحيحة في كل أقسام',icon:'📚',condition:null},
  {id:'ten_correct',name:'العشرة',desc:'10 إجابات صحيحة',icon:'⭐',condition:function(stats){return(stats.correct||0)>=10;}},
  {id:'fifty_correct',name:'الخمسون',desc:'50 إجابة صحيحة',icon:'🌟',condition:function(stats){return(stats.correct||0)>=50;}}
];

if(!state.teamBadges)state.teamBadges={};

function checkBadges(teamId){
  if(!state.teamBadges)state.teamBadges={};
  if(!state.teamBadges[teamId])state.teamBadges[teamId]=[];
  var stats=state.sessionStats[teamId]||{correct:0,wrong:0,skipped:0,totalTime:0,answers:[]};
  var streak=state.teamStreaks?state.teamStreaks[teamId]||0:0;
  var earned=state.teamBadges[teamId]||[];
  var newBadges=[];
  BADGES.forEach(function(badge){
    if(earned.indexOf(badge.id)!==-1)return;
    var earned_flag=false;
    if(badge.condition){try{earned_flag=badge.condition(stats,streak);}catch(_){earned_flag=false;}}
    if(badge.id==='comeback'&&state.scoreHistory&&state.scoreHistory.length>2){
      var team=(state.teams||[]).find(function(t){return t.id===teamId;});
      if(team){
        var sorted=[].concat(state.teams||[]).sort(function(a,b){return(b.score||0)-(a.score||0);});
        var isLeading=sorted.length>0&&sorted[0].id===teamId;
        var wasTrailing=state.scoreHistory.some(function(h){return h.teamId!==teamId&&h.delta>0;});
        if(isLeading&&wasTrailing)earned_flag=true;
      }
    }
    if(badge.id==='category_master'){
      var categories=state.categories||[];
      var answeredCats=new Set();
      (stats.answers||[]).forEach(function(a){if(a.correct)answeredCats.add(a.catId);});
      if(categories.length>0&&answeredCats.size>=categories.length)earned_flag=true;
    }
    if(earned_flag){earned.push(badge.id);newBadges.push(badge.id);showBadgeNotification(teamId,badge);}
  });
  state.teamBadges[teamId]=earned;
  if(newBadges.length&&typeof saveState==='function')saveState();
  return newBadges;
}

function renderBadgesPanel(teamId){
  var panel=document.getElementById('badges-panel');
  if(!panel)return;
  if(!state.teamBadges)state.teamBadges={};
  if(!panel.innerHTML){
    panel.innerHTML='<div class="adv-chart-card"><div class="adv-chart-title">🏅 الإنجازات والأوسمة</div><div class="badges-grid" id="badges-grid-inner"></div></div>';
  }
  var grid=document.getElementById('badges-grid-inner');
  if(!grid)return;
  var allEarned=new Set();
  (state.teams||[]).forEach(function(t){(state.teamBadges[t.id]||[]).forEach(function(b){allEarned.add(b);});});
  grid.innerHTML=BADGES.map(function(badge){
    var isEarned=allEarned.has(badge.id);
    return '<div class="badge-item '+(isEarned?'earned':'locked')+'"><span class="badge-item-icon">'+badge.icon+'</span><span class="badge-item-name">'+badge.name+'</span><span class="badge-item-desc">'+badge.desc+'</span></div>';
  }).join('');
}

function showBadgeNotification(teamId,badge){
  var team=(state.teams||[]).find(function(t){return t.id===teamId;});
  var notif=document.createElement('div');
  notif.className='badge-notif';
  notif.innerHTML='<span class="badge-notif-icon">'+_sanitize(badge.icon||'')+'</span><div class="badge-notif-name">'+_sanitize(badge.name||'')+'</div><div class="badge-notif-desc">'+(team?_sanitizeUser(team.name)+' — ':'')+_sanitize(badge.desc||'')+'</div>';
  document.body.appendChild(notif);
  setTimeout(function(){notif.classList.add('badge-exit');setTimeout(function(){notif.remove();},400);},3000);
}

// ── Hook checkBadges into recordAnswer ──
var _origRecordAnswer2=window.recordAnswer;
if(_origRecordAnswer2){
  window.recordAnswer=function(teamId,isCorrect,timeUsed){
    _origRecordAnswer2.apply(this,arguments);
    try{checkBadges(teamId);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_204")}catch(_){}}
  };
}

// ── Hook checkBadges into streak update ──
var _origUpdateStreak=window._updateStreak;
if(_origUpdateStreak){
  window._updateStreak=function(teamId,isCorrect){
    _origUpdateStreak.apply(this,arguments);
    try{checkBadges(teamId);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_205")}catch(_){}}
  };
}


// ════════════════════════════════════════════════════════
//  6. ENHANCED QUESTION EDITOR
// ════════════════════════════════════════════════════════

function previewQuestion(){
  try{
    var cat=state.categories.find(function(c){return c.id===state.currentCatId;});
    if(!cat){toast(I18n.t('toast.selectCatFirst'),'info');return;}
    var textEl=document.getElementById('q-text-input');
    var text=textEl?textEl.value||'':'';
    var qtype=typeof _currentQType!=='undefined'?_currentQType:'text';
    var options=[0,1,2,3].map(function(i){var el=document.getElementById('q-opt-'+i);return el?el.value||'':'';});
    var correctEl=document.getElementById('q-correct-input');
    var correct=correctEl?+correctEl.value||0:0;
    // Remove any existing preview overlay
    var existing=document.querySelector('.q-preview-overlay');
    if(existing)existing.remove();
    var overlay=document.createElement('div');
    overlay.className='q-preview-overlay';
    var optsHtml='';
    if(qtype==='tf'){
      optsHtml='<div style="display:flex;gap:12px;justify-content:center"><div style="padding:12px 32px;border-radius:12px;border:2px solid '+(correct===0?'var(--success)':'var(--border)')+';background:'+(correct===0?'rgba(0,230,118,.1)':'var(--bg-panel)')+';font-size:1.1rem;font-weight:700">صح ✓</div><div style="padding:12px 32px;border-radius:12px;border:2px solid '+(correct===1?'var(--danger)':'var(--border)')+';background:'+(correct===1?'rgba(255,64,96,.1)':'var(--bg-panel)')+';font-size:1.1rem;font-weight:700">خطأ ✗</div></div>';
    }else if(qtype==='fitb'){
      optsHtml='<div style="color:var(--accent2);font-weight:700;font-size:1.1rem">✏️ سؤال إكمال الفراغ</div>';
    }else if(qtype==='order'){
      optsHtml='<div style="color:var(--accent2);font-weight:700;font-size:1.1rem">🔢 سؤال ترتيب</div>';
    }else if(qtype==='match'){
      optsHtml='<div style="color:var(--accent2);font-weight:700;font-size:1.1rem">🔗 سؤال توصيل</div>';
    }else{
      var filteredOpts=options.filter(Boolean);
      if(filteredOpts.length){
        optsHtml='<div style="display:flex;flex-direction:column;gap:8px;max-width:400px;margin:0 auto">';
        options.forEach(function(o,i){
          if(!o)return;
          optsHtml+='<div style="padding:10px 16px;border-radius:10px;border:2px solid '+(i===correct?'var(--success)':'var(--border)')+';background:'+(i===correct?'rgba(0,230,118,.1)':'var(--bg-panel)')+';text-align:right;font-size:.95rem"><span style="font-weight:700;color:'+(i===correct?'var(--success)':'var(--text-muted)')+'">'+['أ','ب','ج','د'][i]+'. </span>'+o+'</div>';
        });
        optsHtml+='</div>';
      }else{optsHtml='<div style="color:var(--text-muted)">لا توجد خيارات</div>';}
    }
    overlay.innerHTML='<button class="btn btn-ghost btn-sm q-preview-close" onclick="this.closest(\'.q-preview-overlay\').remove()">✕ إغلاق المعاينة</button><div class="q-preview-box"><div style="font-size:.8rem;color:var(--text-muted);margin-bottom:8px">'+(cat.icon||'📂')+' '+_sanitizeUser(cat.name)+' — معاينة</div><div style="font-size:1.3rem;font-weight:700;margin-bottom:20px;line-height:1.7">'+(text||'نص السؤال')+'</div>'+optsHtml+'</div>';
    overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
    document.body.appendChild(overlay);
  }catch(err){
    console.error('Preview error:',err);
    toast(I18n.t('toast.previewError'),'danger');
  }
}

var QUESTION_TEMPLATES=[
  {type:'text',name:'سؤال اختيار متعدد',text:'ما هو ...؟',options:['الخيار أ','الخيار ب','الخيار ج','الخيار د'],correct:0,difficulty:'medium',time:30},
  {type:'tf',name:'صح أو خطأ',text:'العبارة التالية صحيحة:',options:[],correct:0,difficulty:'easy',time:20},
  {type:'fitb',name:'أكمل الفراغ',text:'أكمل: [___]',options:[],correct:0,fitbAnswer:'الإجابة',difficulty:'medium',time:25},
  {type:'image',name:'سؤال بالصورة',text:'ما الذي يظهر في الصورة؟',options:['الخيار أ','الخيار ب','الخيار ج','الخيار د'],correct:0,difficulty:'medium',time:30},
  {type:'math',name:'سؤال رياضيات',text:'ما ناتج $2 + 2$؟',options:['3','4','5','6'],correct:1,difficulty:'easy',time:30},
  {type:'order',name:'ترتيب',text:'رتّب العناصر التالية:',options:['الأول','الثاني','الثالث','الرابع'],correct:0,difficulty:'hard',time:40},
  {type:'match',name:'توصيل',text:'صِل كل عنصر بنظيره:',options:[],correct:0,difficulty:'hard',time:45}
];

function applyQuestionTemplateByIndex(templateIndex){
  var tmpl=QUESTION_TEMPLATES[templateIndex];
  if(!tmpl)return;
  var textEl=document.getElementById('q-text-input');
  if(textEl)textEl.value=tmpl.text||'';
  if(typeof setQType==='function')setQType(tmpl.type||'text');
  if(tmpl.options&&tmpl.options.length){tmpl.options.forEach(function(o,i){var el=document.getElementById('q-opt-'+i);if(el)el.value=o||'';});}
  var correctEl=document.getElementById('q-correct-input');
  if(correctEl)correctEl.value=tmpl.correct||0;
  var diffEl=document.getElementById('q-difficulty-input');
  if(diffEl)diffEl.value=tmpl.difficulty||'medium';
  var timeEl=document.getElementById('q-time-input');
  if(timeEl)timeEl.value=tmpl.time||30;
  if(tmpl.type==='fitb'&&tmpl.fitbAnswer){var fitbEl=document.getElementById('fitb-answer-input');if(fitbEl)fitbEl.value=tmpl.fitbAnswer;}
  if(typeof toast==='function')toast(I18n.t('toast.templateApplied',{name:tmpl.name}),'success');
}

// ── Add template dropdown to question modal ──
(function addTemplateDropdown(){
  var observer=new MutationObserver(function(){
    var modalTitle=document.getElementById('q-modal-title');
    if(!modalTitle||document.getElementById('q-template-dropdown'))return;
    var dropdown=document.createElement('select');
    dropdown.id='q-template-dropdown';dropdown.className='form-select';
    dropdown.style.cssText='max-width:180px;font-size:.78rem;margin-right:8px;vertical-align:middle';
    dropdown.innerHTML='<option value="">📋 قالب سريع...</option>'+QUESTION_TEMPLATES.map(function(t,i){return '<option value="'+i+'">'+t.name+'</option>';}).join('');
    dropdown.addEventListener('change',function(){if(this.value!==''){applyQuestionTemplateByIndex(+this.value);this.value='';}});
    modalTitle.parentNode.style.display='flex';modalTitle.parentNode.style.alignItems='center';modalTitle.parentNode.style.gap='8px';
    modalTitle.parentNode.insertBefore(dropdown,modalTitle.nextSibling);
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();

// ── Add Preview button to question modal footer ──
(function addPreviewButton(){
  var observer=new MutationObserver(function(){
    var footer=document.querySelector('#modal-question .modal-footer');
    if(!footer||document.getElementById('btn-q-preview'))return;
    var btn=document.createElement('button');
    btn.id='btn-q-preview';btn.className='btn btn-purple btn-sm';
    btn.style.marginLeft='8px';btn.innerHTML='👁 معاينة';btn.onclick=previewQuestion;
    footer.insertBefore(btn,footer.firstChild);
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();

function bulkImportQuestions(){
  var textarea=document.getElementById('bulk-import-textarea');
  if(!textarea||!textarea.value.trim()){if(typeof toast==='function')toast(I18n.t('toast.addCategoriesFirst'),'danger');return;}
  var cat=state.categories.find(function(c){return c.id===state.currentCatId;});
  if(!cat){if(typeof toast==='function')toast(I18n.t('toast.selectCatFirst'),'danger');return;}
  var lines=textarea.value.trim().split('\n').filter(function(l){return l.trim()&&!l.trim().startsWith('#');});
  var imported=0,errors=0;
  lines.forEach(function(line){
    try{
      var parts=line.split('|').map(function(s){return s.trim();});
      if(parts.length<2){errors++;return;}
      var text=_sanitizeUser(parts[0]);
      if(!text){errors++;return;}
      if(parts.length===2){
        var answer=parts[1].toLowerCase();
        cat.questions.push({id:uid(),text:text,type:'tf',options:[],optionImages:[],correct:answer==='صح'||answer==='true'||answer==='1'?0:1,difficulty:'easy',time:state.settings.defaultTime||30,explanation:'',hostNote:'',mediaData:null,mediaAttachment:null});
        imported++;return;
      }
      var opts=parts.slice(1).filter(function(p){return p&&!['0','1','2','3','e','m','h','easy','medium','hard'].includes(p.toLowerCase());});
      if(opts.length<2){errors++;return;}
      var correctIdx=0;var difficulty='medium';
      var lastParts=parts.slice(-2);
      if(lastParts.length>=1){
        var lp=lastParts[lastParts.length-1];
        if(['e','m','h','easy','medium','hard'].includes(lp.toLowerCase())){
          difficulty=lp.toLowerCase().startsWith('e')?'easy':lp.toLowerCase().startsWith('h')?'hard':'medium';
        }
        if(lastParts.length>=2){var ci=parseInt(lastParts[0]);if(!isNaN(ci)&&ci>=0&&ci<opts.length)correctIdx=ci;}
      }
      cat.questions.push({id:uid(),text:text,type:'text',options:opts.map(function(o){return _sanitizeUser(o);}),optionImages:[],correct:correctIdx,difficulty:difficulty,time:state.settings.defaultTime||30,explanation:'',hostNote:'',mediaData:null,mediaAttachment:null});
      imported++;
    }catch(e){errors++;}
  });
  if(typeof saveState==='function')saveState();
  if(typeof renderQuestionsAdmin==='function')renderQuestionsAdmin(state.currentCatId);
  if(typeof renderStatsGrid==='function')renderStatsGrid();
  var msg=imported>0?(errors>0?I18n.t('toast.importedWithErrors',{count:imported,errors:errors}):I18n.t('toast.importedQuestions',{count:imported})):I18n.t('toast.noImported');
  if(typeof toast==='function')toast(msg,imported>0?'success':'danger');
  var bulkModal=document.getElementById('modal-bulk-import');
  if(bulkModal)bulkModal.classList.add('hidden');
}

function openBulkImport(){
  var modal=document.getElementById('modal-bulk-import');
  if(!modal){
    modal=document.createElement('div');modal.id='modal-bulk-import';modal.className='modal-overlay hidden';
    modal.innerHTML='<div class="modal" style="max-width:650px"><div class="modal-header"><div class="modal-title">📋 استيراد أسئلة مجمّع</div><button class="modal-close" onclick="closeModal(\'modal-bulk-import\')">✕</button></div><div style="padding:4px 0"><p style="font-size:.82rem;color:var(--text-secondary);margin-bottom:8px">كل سطر = سؤال واحد. الصيغة: <code style="color:var(--accent1)">السؤال | خيار1 | خيار2 | خيار3 | خيار4 | رقم_الصحيح | صعوبة</code></p><p style="font-size:.78rem;color:var(--text-muted);margin-bottom:8px">سؤال صح/خطأ: <code style="color:var(--accent1)">السؤال | صح</code> أو <code style="color:var(--accent1)">السؤال | خطأ</code></p><div class="bulk-import-area"><textarea id="bulk-import-textarea" placeholder="مثال:&#10;ما عاصمة السعودية؟ | الرياض | جدة | مكة | المدينة | 0 | e&#10;الشمس نجم | صح&#10;أكبر محيط في العالم؟ | الهادي | الأطلسي | الهندي | المتجمد | 0 | m"></textarea></div></div><div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal(\'modal-bulk-import\')">إلغاء</button><button class="btn btn-primary" onclick="bulkImportQuestions()">استيراد</button></div></div>';
    modal.addEventListener('click',function(e){if(e.target===modal)closeModal('modal-bulk-import');});
    document.body.appendChild(modal);
  }
  openModal('modal-bulk-import');
}

// ── Add bulk import button to questions admin ──
(function addBulkImportButton(){
  var observer=new MutationObserver(function(){
    var addBtn=document.getElementById('btn-add-question');
    if(!addBtn||document.getElementById('btn-bulk-import'))return;
    var btn=document.createElement('button');
    btn.id='btn-bulk-import';btn.className='btn btn-ghost btn-sm';
    btn.style.marginRight='8px';btn.innerHTML='📋 استيراد مجمّع';btn.onclick=openBulkImport;
    addBtn.parentNode.insertBefore(btn,addBtn.nextSibling);
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();


// ────────────────────────────────────────────────────────────
//  Continued from previous section (merged boundary)
// ────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════
//  INITIALIZATION
// ════════════════════════════════════════════════════════

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',function(){
    initMobileImprovements();
    if(state.settings&&state.settings.colorBlindMode&&state.settings.colorBlindMode!=='none'){setColorBlindMode(state.settings.colorBlindMode);}
  });
}else{
  initMobileImprovements();
  if(state.settings&&state.settings.colorBlindMode&&state.settings.colorBlindMode!=='none'){setColorBlindMode(state.settings.colorBlindMode);}
}

// ── Add color blindness setting to settings panel ──
(function addColorBlindSetting(){
  var observer=new MutationObserver(function(){
    var themeSelect=document.getElementById('s-theme');
    if(!themeSelect||document.getElementById('colorblind-setting'))return;
    var parent=themeSelect.parentNode;
    if(!parent)return;
    var div=document.createElement('div');div.id='colorblind-setting';div.className='form-group';
    div.innerHTML='<label class="form-label">👁 وضع عمى الألوان</label><select id="s-colorblind-mode" class="form-select" onchange="setColorBlindMode(this.value)"><option value="none" '+((!state.settings||!state.settings.colorBlindMode||state.settings.colorBlindMode==='none')?'selected':'')+'>عادي</option><option value="protanopia" '+((state.settings&&state.settings.colorBlindMode==='protanopia')?'selected':'')+'>عمى الأحمر (بروتانوبيا)</option><option value="deuteranopia" '+((state.settings&&state.settings.colorBlindMode==='deuteranopia')?'selected':'')+'>عمى الأخضر (ديوتيرانوبيا)</option><option value="tritanopia" '+((state.settings&&state.settings.colorBlindMode==='tritanopia')?'selected':'')+'>عمى الأزرق (تريتانوبيا)</option></select>';
    parent.parentNode.insertBefore(div,parent.nextSibling);
  });
  observer.observe(document.body,{childList:true,subtree:true});
})();

// Expose functions globally
window.QuizCharts=QuizCharts;
window.isQuestionAvailable=isQuestionAvailable;
window.getAvailableQuestions=getAvailableQuestions;
window.trapFocus=trapFocus;
window.releaseFocus=releaseFocus;
window.setColorBlindMode=setColorBlindMode;
window.showKeyboardShortcuts=showKeyboardShortcuts;
window.initSwipeNavigation=initSwipeNavigation;
window.openBottomSheet=openBottomSheet;
window.BADGES=BADGES;
window.checkBadges=checkBadges;
window.renderBadgesPanel=renderBadgesPanel;
window.showBadgeNotification=showBadgeNotification;
window.previewQuestion=previewQuestion;
window.applyQuestionTemplate=applyQuestionTemplate;
window.bulkImportQuestions=bulkImportQuestions;
window.openBulkImport=openBulkImport;
window.QUESTION_TEMPLATES=QUESTION_TEMPLATES;

// ═══════════════════════════════════════════════════════════════
// Google Sheets Import Module
// ═══════════════════════════════════════════════════════════════
var _gsheetsData=null;

/**
 * Validate Google Sheets URL and show status
 */
function validateSheetsURL(input){
  var status=document.getElementById('gsheets-url-status');
  if(!status)return;
  var url=input.value.trim();
  if(!url){status.innerHTML='';return;}
  var sheetId=extractSheetId(url);
  if(sheetId){
    status.innerHTML='<span style="color:#00e676">'+I18n.t('gsheets.urlValid','✓ رابط صالح')+'</span>';
  }else{
    status.innerHTML='<span style="color:#ff5252">'+I18n.t('gsheets.urlInvalid','✗ رابط غير صالح')+'</span>';
  }
}

/**
 * Extract Google Sheet ID from various URL formats
 */
function extractSheetId(url){
  if(!url)return null;
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/...
  var match=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if(match)return match[1];
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/edit...
  match=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/edit/);
  if(match)return match[1];
  // Format: https://docs.google.com/spreadsheets/d/SHEET_ID/copy
  match=url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/copy/);
  if(match)return match[1];
  return null;
}

/**
 * Build CSV export URL from Google Sheets URL
 */
function buildCSVUrl(url,sheetName){
  var sheetId=extractSheetId(url);
  if(!sheetId)return null;
  var encodedSheet=encodeURIComponent(sheetName||'Sheet1');
  return 'https://docs.google.com/spreadsheets/d/'+sheetId+'/gviz/tq?tqx=out:csv&sheet='+encodedSheet;
}

/**
 * Fetch Google Sheet data and parse it
 */
async function fetchGoogleSheet(){
  var urlInput=document.getElementById('gsheets-url-input');
  var csvUrlInput=document.getElementById('gsheets-csv-url');
  var fetchBtn=document.getElementById('gsheets-fetch-btn');
  var sheetNameInput=document.getElementById('gsheets-sheet-name');
  var firstRowHeader=document.getElementById('gsheets-first-row-header');

  var url=(urlInput?urlInput.value.trim():'');
  var csvUrl=(csvUrlInput?csvUrlInput.value.trim():'');
  var sheetName=sheetNameInput?sheetNameInput.value.trim():'Sheet1';
  var hasHeader=firstRowHeader?firstRowHeader.checked:true;

  // Determine which URL to use
  var fetchUrl=csvUrl;
  if(!fetchUrl&&url){
    fetchUrl=buildCSVUrl(url,sheetName);
  }

  if(!fetchUrl){
    toast(I18n.t('gsheets.invalidURL','رابط غير صالح'),'danger');
    return;
  }

  // Show loading
  if(fetchBtn){
    fetchBtn.disabled=true;
    fetchBtn.innerHTML='<span class="spinner" style="width:16px;height:16px;border-width:2px;margin:0 6px 0 0"></span>'+I18n.t('gsheets.fetching','جارٍ الجلب...');
  }
  if(typeof showLoading==='function')showLoading();

  try{
    var response=await fetch(fetchUrl);
    if(!response.ok)throw new Error('HTTP '+response.status);
    var csvText=await response.text();

    if(!csvText||csvText.trim().length===0){
      toast(I18n.t('gsheets.noData','لم يتم العثور على بيانات'),'warning');
      return;
    }

    // Parse CSV
    _gsheetsData=parseGoogleSheetsCSV(csvText,hasHeader);

    if(!_gsheetsData||!_gsheetsData.categories||_gsheetsData.categories.length===0||
       _gsheetsData.categories.every(function(c){return c.questions.length===0;})){
      toast(I18n.t('gsheets.noData','لم يتم العثور على بيانات'),'warning');
      return;
    }

    // Show preview
    showGoogleSheetsPreview(_gsheetsData);
    toast(I18n.t('gsheets.success','تم جلب البيانات بنجاح!'),'success');

  }catch(err){
    console.error('[GoogleSheets] Fetch error:',err);
    toast(I18n.t('gsheets.error','فشل في جلب البيانات')+': '+err.message,'danger');
  }finally{
    if(fetchBtn){
      fetchBtn.disabled=false;
      fetchBtn.innerHTML=I18n.t('gsheets.fetchBtn','جلب البيانات');
    }
    if(typeof hideLoading==='function')hideLoading();
  }
}

/**
 * Robust CSV parser that handles quoted fields with commas and newlines
 */
function parseGoogleSheetsCSV(csvText,hasHeader){
  var rows=parseCSVRows(csvText);
  if(rows.length===0)return{categories:[]};

  var startRow=hasHeader?1:0;
  var catMap={};
  var catOrder=[];

  for(var i=startRow;i<rows.length;i++){
    var cols=rows[i];
    if(!cols||cols.length<2)continue;

    var questionText=(cols[0]||'').trim();
    if(!questionText)continue;

    var opt1=(cols[1]||'').trim();
    var opt2=(cols[2]||'').trim();
    var opt3=(cols[3]||'').trim();
    var opt4=(cols[4]||'').trim();
    var correctIdx=parseInt(cols[5]||'1')-1;
    if(isNaN(correctIdx)||correctIdx<0)correctIdx=0;
    if(correctIdx>3)correctIdx=3;

    var category=(cols[6]||'عام').trim();
    var time=parseInt(cols[7]||'20');
    if(isNaN(time)||time<5)time=20;
    var diffRaw=(cols[8]||'m').trim().toLowerCase();
    var difficulty=diffRaw==='e'?'easy':diffRaw==='h'?'hard':'medium';
    var qType=(cols[9]||'text').trim().toLowerCase();
    var explanation=(cols[10]||'').trim();

    // Determine question type
    var type='text';
    var options=[];
    var correct=correctIdx;
    var fitbAnswer='';
    var matchPairs=[];

    if(qType==='tf'||qType==='truefalse'){
      type='tf';
      correct=(opt1==='صح'||opt1==='true'||opt1==='1'||opt1==='نعم')?0:1;
    }else if(qType==='fitb'||qType==='fill'||qType==='fillblank'){
      type='fitb';
      fitbAnswer=opt1||'';
    }else if(qType==='order'||qType==='ordering'){
      type='order';
      options=[opt1,opt2,opt3,opt4].filter(function(o){return o;});
    }else if(qType==='match'||qType==='matching'){
      type='match';
      // Format: left1:right1 | left2:right2 | ...
      var pairStrs=[opt1,opt2,opt3,opt4].filter(function(o){return o;});
      pairStrs.forEach(function(p){
        var parts=p.split(':');
        if(parts.length>=2){
          matchPairs.push({left:parts[0].trim(),right:parts[1].trim()});
        }
      });
    }else{
      // Default: text (multiple choice)
      type='text';
      options=[opt1,opt2,opt3,opt4].filter(function(o){return o;});
      if(options.length<2){
        // If less than 2 options, treat as true/false
        type='tf';
        correct=0;
      }
    }

    // Build category
    if(!catMap[category]){
      catMap[category]={
        id:'gcat_'+Date.now()+'_'+Object.keys(catMap).length,
        name:category,
        icon:'📊',
        color:'#'+Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0'),
        catImage:null,
        questions:[]
      };
      catOrder.push(category);
    }

    var qObj={
      id:'gq_'+Date.now()+'_'+i+'_'+Math.random().toString(36).substr(2,6),
      text:questionText,
      type:type,
      difficulty:difficulty,
      time:time,
      explanation:explanation,
      hostNote:'',
      mediaData:null,
      options:options,
      optionImages:options.map(function(){return null;}),
      correct:correct
    };

    if(type==='fitb')qObj.fitbAnswer=fitbAnswer;
    if(type==='match')qObj.matchPairs=matchPairs;

    catMap[category].questions.push(qObj);
  }

  return{categories:catOrder.map(function(name){return catMap[name];})};
}

/**
 * Parse CSV text into rows, handling quoted fields
 */
function parseCSVRows(text){
  var rows=[];
  var current=[];
  var field='';
  var inQuotes=false;

  for(var i=0;i<text.length;i++){
    var ch=text[i];
    var next=text[i+1];

    if(inQuotes){
      if(ch==='"'&&next==='"'){
        field+='"';
        i++;
      }else if(ch==='"'){
        inQuotes=false;
      }else{
        field+=ch;
      }
    }else{
      if(ch==='"'){
        inQuotes=true;
      }else if(ch===','){
        current.push(field);
        field='';
      }else if(ch==='\r'&&next==='\n'){
        current.push(field);
        field='';
        if(current.length>0&&current.some(function(c){return c.trim();}))rows.push(current);
        current=[];
        i++;
      }else if(ch==='\n'){
        current.push(field);
        field='';
        if(current.length>0&&current.some(function(c){return c.trim();}))rows.push(current);
        current=[];
      }else{
        field+=ch;
      }
    }
  }
  // Last field/row
  current.push(field);
  if(current.length>0&&current.some(function(c){return c.trim();}))rows.push(current);

  return rows;
}

/**
 * Show preview of Google Sheets data
 */
function showGoogleSheetsPreview(data){
  var preview=document.getElementById('gsheets-preview');
  var actions=document.getElementById('gsheets-actions');
  if(!preview||!data)return;

  var cats=data.categories||[];
  var totalQ=cats.reduce(function(s,c){return s+c.questions.length;},0);

  preview.classList.remove('hidden');
  preview.innerHTML=
    '<div style="padding:12px;background:var(--bg-secondary,rgba(255,255,255,.04));border-radius:12px;border:1px solid var(--border-color,rgba(255,255,255,.08))">'+
      '<div style="font-weight:700;margin-bottom:8px;font-size:.95rem">'+I18n.t('gsheets.previewTitle','معاينة البيانات')+'</div>'+
      '<div style="display:flex;gap:16px;margin-bottom:12px">'+
        '<div style="text-align:center"><div style="font-size:1.6rem;font-weight:800;color:var(--accent)">'+totalQ+'</div><div style="font-size:.78rem;opacity:.7">'+I18n.t('gsheets.questions','أسئلة')+'</div></div>'+
        '<div style="text-align:center"><div style="font-size:1.6rem;font-weight:800;color:var(--accent2)">'+cats.length+'</div><div style="font-size:.78rem;opacity:.7">'+I18n.t('gsheets.categories','أقسام')+'</div></div>'+
      '</div>'+
      '<div style="max-height:250px;overflow-y:auto;font-size:.82rem">'+
        cats.map(function(cat){
          return '<div style="padding:6px 8px;margin-bottom:4px;border-radius:6px;background:rgba(255,255,255,.03)">'+
            '<span style="color:'+cat.color+'">'+cat.icon+'</span> <strong>'+cat.name+'</strong> <span style="opacity:.6">('+cat.questions.length+' '+I18n.t('gsheets.questions','أسئلة')+')</span>'+
          '</div>';
        }).join('')+
      '</div>'+
    '</div>';

  if(actions)actions.classList.remove('hidden');
}

/**
 * Import questions from Google Sheets into the app state
 */
function importFromGoogleSheet(mode){
  if(!_gsheetsData||!_gsheetsData.categories||_gsheetsData.categories.length===0){
    toast(I18n.t('gsheets.noData','لم يتم العثور على بيانات'),'warning');
    return;
  }

  if(!mode)mode='replace';

  // Deep clone to avoid reference issues
  var importCats=JSON.parse(JSON.stringify(_gsheetsData.categories));

  // Regenerate IDs to avoid conflicts
  importCats.forEach(function(cat){
    cat.id=uid();
    cat.questions.forEach(function(q){q.id=uid();});
  });

  if(mode==='replace'){
    state.categories=importCats;
  }else if(mode==='append'){
    state.categories=state.categories.concat(importCats);
  }else if(mode==='merge'){
    importCats.forEach(function(importCat){
      var existing=state.categories.find(function(c){return c.name===importCat.name;});
      if(existing){
        importCat.questions.forEach(function(q){
          q.id=uid();
          existing.questions.push(q);
        });
      }else{
        importCat.id=uid();
        importCat.questions.forEach(function(q){q.id=uid();});
        state.categories.push(importCat);
      }
    });
  }

  // Save to IndexedDB for large data
  if(typeof MediaDB!=='undefined'){
    try{
      MediaDB.set('_gsheets_import',JSON.stringify({
        timestamp:Date.now(),
        mode:mode,
        categories:state.categories.map(function(c){return{id:c.id,name:c.name,qCount:c.questions.length};})
      })).catch(function(e){_logErr(e,'MediaDB:setGSheetsImport')});
    }catch(e){console.error("[Error]",e);}
  }

  // Save state
  _lastSavedJSON='';
  if(!_idbLoadDone){_idbLoadDone=true;_pendingSaveNeeded=false;}
  try{saveStateSync();}catch(e){try{saveState();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_206")}catch(_){}}}

  toast(I18n.t('gsheets.imported','تم استيراد الأسئلة من Google Sheets بنجاح!'),'success');
  renderAdmin();

  // Reset preview
  _gsheetsData=null;
  var preview=document.getElementById('gsheets-preview');
  var actions=document.getElementById('gsheets-actions');
  if(preview){preview.classList.add('hidden');preview.innerHTML='';}
  if(actions)actions.classList.add('hidden');
}

window.validateSheetsURL=validateSheetsURL;
window.fetchGoogleSheet=fetchGoogleSheet;
window.importFromGoogleSheet=importFromGoogleSheet;

})();
