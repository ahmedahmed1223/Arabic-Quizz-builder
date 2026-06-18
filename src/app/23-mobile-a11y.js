// ════════════════════════════════════════════════════════
const SafeDOM={
  /** Create an element with attributes and children (no innerHTML) */
  h:function(tag,attrs){
    const el=document.createElement(tag);
    if(attrs){
      if(attrs.className)el.className=attrs.className;
      if(attrs.id)el.id=attrs.id;
      if(attrs.style&&(typeof attrs.style==='string'))el.style.cssText=attrs.style;
      if(attrs.title)el.title=attrs.title;
      if(attrs.onclick)el.onclick=attrs.onclick;
      if(attrs.dir)el.dir=attrs.dir;
      if(attrs['aria-label'])el.setAttribute('aria-label',attrs['aria-label']);
    }
    for(let i=2;i<arguments.length;i++){
      const child=arguments[i];
      if(child==null)continue;
      if(typeof child==='string')el.appendChild(document.createTextNode(child));
      else if(child instanceof Node)el.appendChild(child);
      else if(Array.isArray(child))child.forEach(c=>{if(c)el.appendChild(typeof c==='string'?document.createTextNode(c):c);});
    }
    return el;
  },
  /** Safely set text content (no HTML injection) */
  text:function(el,text){
    if(el)el.textContent=text||'';
  },
  /** Clear element's children safely */
  clear:function(el){
    if(el){while(el.firstChild)el.removeChild(el.firstChild);}
  },
  /** Set children from an array of elements (replaces innerHTML) */
  setChildren:function(el,children){
    if(!el)return;
    SafeDOM.clear(el);
    children.forEach(child=>{
      if(typeof child==='string')el.appendChild(document.createTextNode(child));
      else if(child instanceof Node)el.appendChild(child);
    });
  },
  /** Create a text node safely */
  t:function(text){return document.createTextNode(text||'');},
  /** Safely create a fragment from an array of elements */
  frag:function(items){
    const f=document.createDocumentFragment();
    (items||[]).forEach(item=>{
      if(typeof item==='string')f.appendChild(document.createTextNode(item));
      else if(item instanceof Node)f.appendChild(item);
    });
    return f;
  }
};

// Prevent accidental refresh during competition
// V10.3-fix: Add visibilitychange handler to proactively save state when page is hidden
// beforeunload cannot await async operations, so IDB writes don't complete there.
// visibilitychange fires earlier and allows async operations to start.
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='hidden'){
    // Page is being hidden — save state proactively while we still can
    try{_lastSavedJSON='';saveStateSync().catch(function(e){_logErr(e,'saveStateSync:visibilityChange')});}catch(e){_logErr(e,'saveStateSync:visibilityChange-outer')}
  }
});
window.addEventListener('beforeunload',e=>{
  // ── V11: Force save state before unload ──
  // V10.3-fix: saveStateSync is async but beforeunload can't await.
  // The sync localStorage writes inside _saveStateNow() WILL complete before the page unloads.
  // IDB writes started in visibilitychange or here may not complete — that's why we save to both.
  // Force-flush any pending debounced save
  if(typeof _saveStateTimer!=='undefined'&&_saveStateTimer){TimerRegistry.clear(_saveStateTimer);_saveStateTimer=null;try{_saveStateNow();}catch(e){}}
  try{saveStateSync().catch(function(e){_logErr(e,'saveStateSync:beforeUnload')});}catch(e){_logErr(e,'saveStateSync:beforeUnload-outer')}
  // V10.2-fix: Clear game timer interval to prevent ghost ticks
  // V11-fix: Preserve _timerStartTime so timer can be restarted on bfcache restore
  try{if(state.timerInterval){clearInterval(state.timerInterval);state.timerInterval=null;}}catch(e){try{ErrorBus.capture(e,"catch#AUTO_185")}catch(_){}}
  try{if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}}catch(e){try{ErrorBus.capture(e,"catch#AUTO_186")}catch(_){}}
  // ── Resource cleanup (no await here — sync only) ──
  // V11-fix: Don't close BroadcastChannel or child windows on beforeunload
  // because the page might be cached in bfcache and restored later.
  // Instead, we handle cleanup in the 'unload' event only when truly unloading.
  // Send host_closed message but don't close the channel yet (it can still work on restore)
  if(typeof _remoteChannel!=='undefined'&&_remoteChannel){
    try{_remoteChannel.postMessage({action:'state_update',payload:_buildRemoteState()});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_187")}catch(_){}}
  }
  // V10-fix: Also pause buzzer BroadcastChannel (don't close — bfcache may restore)
  // Cancel running animation frames
  if(typeof _confAF!=='undefined'&&_confAF){cancelAnimationFrame(_confAF);_confAF=null;}
  if(typeof _podiumConfAF!=='undefined'&&_podiumConfAF){cancelAnimationFrame(_podiumConfAF);_podiumConfAF=null;}
  // V11: Pause (but don't destroy) audio resources — they'll be cleaned on real unload
  var _allAudioEls=[window._qAudioEl,window._quranAudio,window._tenseAudioEl,window._podiumAudioEl];
  try{if(typeof _customMusicEl!=='undefined'&&_customMusicEl)_allAudioEls.push(_customMusicEl);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_188")}catch(_){}}
  try{if(typeof _effectAudioEl!=='undefined'&&_effectAudioEl)_allAudioEls.push(_effectAudioEl);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_189")}catch(_){}}
  _allAudioEls.forEach(function(a){if(a){try{a.pause();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_190")}catch(_){}}}});
  // V11: Warn only if game is active AND showRefreshConfirm is enabled
  // Also warn during solo play if a question is in progress
  const soloActive=!_soloAnswered && _soloCurrentCat && !document.getElementById('view-solo-question')?.classList.contains('hidden');
  if((state.gameActive && state.settings.showRefreshConfirm) || soloActive){
    e.preventDefault();
    e.returnValue=typeof I18n!=='undefined'?I18n.t('refreshConfirm.beforeunload'):'المسابقة جارية — هل تريد المغادرة؟';
    return e.returnValue;
  }
});
// V11-fix: True unload handler — only fires when page is actually being destroyed (not bfcache)
// This is where we do final cleanup like closing channels and child windows
window.addEventListener('unload',function(){
  try{
    if(typeof _remoteChannel!=='undefined'&&_remoteChannel){
      try{_remoteChannel.postMessage({action:'host_closed'});_remoteChannel.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_191")}catch(_){}}
    }
    if(typeof _buzzerChannel!=='undefined'&&_buzzerChannel){
      try{_buzzerChannel.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_192")}catch(_){}}
    }
    try{if(typeof _remoteWin!=='undefined'&&_remoteWin&&!_remoteWin.closed)_remoteWin.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_193")}catch(_){}}
    try{if(typeof _audienceWin!=='undefined'&&_audienceWin&&!_audienceWin.closed)_audienceWin.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_194")}catch(_){}}
    // Clean up audio resources on real unload
    var _allAudioEls=[window._qAudioEl,window._quranAudio,window._tenseAudioEl,window._podiumAudioEl];
    try{if(typeof _customMusicEl!=='undefined'&&_customMusicEl)_allAudioEls.push(_customMusicEl);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_195")}catch(_){}}
    try{if(typeof _effectAudioEl!=='undefined'&&_effectAudioEl)_allAudioEls.push(_effectAudioEl);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_196")}catch(_){}}
    _allAudioEls.forEach(function(a){if(a){try{a.pause();a.src='';a.load();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_197")}catch(_){}}}});
    window._qAudioEl=null;window._quranAudio=null;window._tenseAudioEl=null;window._podiumAudioEl=null;
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_198")}catch(_){}}
});

// F5 / Ctrl+R blocking during competition
document.addEventListener('keydown',e=>{
  if(state.gameActive&&(e.key==='F5'||(e.ctrlKey&&e.key==='r')||(e.ctrlKey&&e.key==='R'))){
    e.preventDefault();
    toast(I18n.t('toast.cannotRefreshDuringGame'),'danger');
    return false;
  }
});

// ── Mobile pull-to-refresh prevention (V11: respects showRefreshConfirm setting) ──
(function(){
  let _touchStartY=0;
  let _refreshOverlay=null;
  function _getRefreshOverlay(){
    if(!_refreshOverlay){
      _refreshOverlay=document.createElement('div');
      _refreshOverlay.id='refresh-confirm-overlay';
      _refreshOverlay.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease';
      var _refreshTitle=typeof I18n!=='undefined'?I18n.t('refreshConfirm.title'):'تحديث الصفحة';
      var _refreshMsg=typeof I18n!=='undefined'?I18n.t('refreshConfirm.message'):'سيؤدي التحديث إلى فقدان التقدم في المسابقة الحالية. هل تريد المتابعة؟';
      var _refreshCancel=typeof I18n!=='undefined'?I18n.t('refreshConfirm.cancel'):'إلغاء';
      var _refreshProceed=typeof I18n!=='undefined'?I18n.t('refreshConfirm.proceed'):'تحديث';
      _refreshOverlay.innerHTML=`
        <div style="background:var(--bg-card,#1a1a2e);border:2px solid var(--border-light,#333);border-radius:20px;padding:28px 32px;text-align:center;max-width:340px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.6)">
          <div style="font-size:2rem;margin-bottom:12px">⚠️</div>
          <div style="font-size:1.05rem;font-weight:800;color:var(--text-primary,#fff);margin-bottom:8px">`+_refreshTitle+`</div>
          <div style="font-size:.85rem;color:var(--text-secondary,#aaa);margin-bottom:20px;line-height:1.6">`+_refreshMsg+`</div>
          <div style="display:flex;gap:10px;justify-content:center">
            <button onclick="document.getElementById('refresh-confirm-overlay').remove()" style="padding:10px 24px;border-radius:12px;border:1px solid var(--border,#444);background:var(--bg-panel,#222);color:var(--text-primary,#fff);font-weight:700;cursor:pointer;font-size:.88rem">`+_refreshCancel+`</button>
            <button onclick="location.reload()" style="padding:10px 24px;border-radius:12px;border:none;background:var(--danger,#ff3d5a);color:#fff;font-weight:700;cursor:pointer;font-size:.88rem">`+_refreshProceed+`</button>
          </div>
        </div>`;
    }
    return _refreshOverlay;
  }
  document.addEventListener('touchstart',function(e){
    _touchStartY=e.touches[0].clientY;
  },{passive:true});
  document.addEventListener('touchmove',function(e){
    if(!state.gameActive)return;
    // Skip when whiteboard is active — drawing gestures should not trigger refresh
    if(typeof _whiteboardActive!=='undefined'&&_whiteboardActive)return;
    const y=e.touches[0].clientY;
    const scrollTop=document.documentElement.scrollTop||document.body.scrollTop;
    // If at top of page and pulling down
    if(scrollTop<=0 && y-_touchStartY>60){
      e.preventDefault();
      // V11: Only show overlay if showRefreshConfirm is true
      if(state.settings.showRefreshConfirm){
        if(!document.getElementById('refresh-confirm-overlay')){
          document.body.appendChild(_getRefreshOverlay());
        }
      }
      // If false, just prevent default silently (no overlay)
    }
  },{passive:false});
})();

// Keyboard shortcuts
document.addEventListener('keydown',e=>{
  if(document.getElementById('view-question').classList.contains('hidden'))return;
  if(e.key===' '||e.key==='Enter'){
    e.preventDefault();
    const revBar=document.getElementById('reveal-options-bar');
    if(revBar&&revBar.style.display!=='none'&&!state.answered){
      revealNextOption();
    }else if(!state.answered&&state.settings.confirmAnswer&&(state.pendingAnswer>=0||state._quranPendingIdx!=null)){
      // Confirm pending answer (works for T/F, regular, and Quran questions)
      confirmAnswer();
    }else if(!state.answered&&!state.settings.confirmAnswer){
      revealAnswer();
    }else if(state.answered){
      nextQuestion();
    }
  }
  if((e.key==='ArrowRight'||e.key==='ArrowLeft')&&state.answered)nextQuestion();
  // Sequence keyboard navigation (skip if inside text input)
  if(state.settings.seqKeyboard&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&!state.answered){
    const _activeTag=(document.activeElement?.tagName||'').toLowerCase();
    const _inInput=_activeTag==='input'||_activeTag==='textarea'||_activeTag==='select';
    if(!_inInput){
      const seqOv=$el('seq-nav-overlay');
      if(seqOv&&seqOv.style.display!=='none'){
        if(e.key==='ArrowLeft')seqNext();
        else if(e.key==='ArrowRight')seqPrev();
      }
    }
  }
  // Escape to undo pending answer (works for all question types)
  if(e.key==='Escape'&&(state.pendingAnswer>=0||state._quranPendingIdx!=null)){e.preventDefault();undoAnswer();}
  const keys={'1':0,'2':1,'3':2,'4':3,'أ':0,'ب':1,'ج':2,'د':3};
  if(keys[e.key]!==undefined&&!state.answered)handleOptionClick(keys[e.key]);
});

window.addEventListener('resize',()=>{
  const c=document.getElementById('confetti-canvas');
  c.width=innerWidth;c.height=innerHeight;
});
document.addEventListener('fullscreenchange',()=>{
  setTimeout(()=>{const c=document.getElementById('confetti-canvas');c.width=innerWidth;c.height=innerHeight},100);
});



// ════════════════════════════════════════════════════════
//  BIG CLOCK MODE
// ════════════════════════════════════════════════════════
const BC_CIRC = 848; // 2*π*135
function enterBigClock(){
  if(!state.timerInterval&&!state.answered){toast(I18n.t('toast.noActiveTimer'),'info');return;}
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  const q=cat?cat.questions[state.currentQIndex]:null;
  // Set question text
  const qEl=document.getElementById('bc-question-text');
  if(qEl)qEl.textContent=q?q.text:'';
  // Set cat label
  const cEl=document.getElementById('bc-cat-label');
  if(cEl)cEl.textContent=cat?(cat.icon||'📂')+' '+cat.name:'';
  // Set team label
  const teamIdx=state.settings.compMode==='full_cat'
    ?(state.fullCatQueue[state.fullCatQueuePos]?.teamIdx??state.currentTeamIndex)
    :state.currentTeamIndex;
  const team=state.teams[teamIdx];
  const tEl=document.getElementById('bc-team-label');
  if(tEl){tEl.textContent=team?'🎯 '+team.name:'';tEl.style.borderColor=team?team.color:'var(--border)';}
  // Sync ring
  updateBigClockDisplay();
  showView('bigclock');
}

function exitBigClock(){showView('question');}

function updateBigClockDisplay(){
  const total=state.timerTotal||1;
  const left=Math.max(0,state.timeLeft);
  const pct=left/total;
  const offset=BC_CIRC*(1-pct);
  const fill=document.getElementById('bc-ring-fill');
  const num=document.getElementById('bc-number');
  if(fill)fill.style.strokeDashoffset=offset;
  if(fill){
    if(pct>0.5)fill.style.stroke='var(--success)';
    else if(pct>0.25)fill.style.stroke='var(--accent1)';
    else fill.style.stroke='var(--danger)';
  }
  if(num)num.textContent=left;
  const wrap=document.querySelector('.bigclock-ring-wrap');
  if(wrap)wrap.classList.toggle('bigclock-warn',pct<=0.2);
}

// Patch the timer tick to also update big clock
const _origTimerTick=null; // will hook via interval

// ════════════════════════════════════════════════════════
//  TEAM STATS VIEW
// ════════════════════════════════════════════════════════
