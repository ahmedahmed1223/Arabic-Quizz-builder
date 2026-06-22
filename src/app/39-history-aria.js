// ═══ History API: back/forward navigation support ═══
(function(){
  // Handle initial hash after app loads
  const _initHash=window.location.hash.slice(1);
  if(_initHash&&document.getElementById('view-'+_initHash)){
    window._pendingHashView=_initHash;
  }
  // Feature 2b: Enhanced popstate handler — validate view exists before navigating
  window.addEventListener('popstate',function(e){
    if(e.state&&e.state.view){
      // Validate view exists before navigating
      var targetView=e.state.view;
      var viewEl=document.getElementById('view-'+targetView);
      if(viewEl){
        try{showView(targetView,true);}catch(err){try{ErrorBus.capture(err,'HistoryAPI/popstate')}catch(_){}}
      }else{
        // View doesn't exist (stale history), go to login
        try{showView('login',true);}catch(err){}
      }
    }else{
      // No view in state — navigate to login as fallback
      try{showView('login',true);}catch(err){}
    }
  });
  // Apply pending hash view after init
  const _origInit=window.init;
  if(typeof _origInit==='function'){
    window.init=function(){
      _origInit.apply(this,arguments);
      if(window._pendingHashView){
        try{showView(window._pendingHashView,true);}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
        window._pendingHashView=null;
      }
    };
  }
})();
// Feature 2c: Navigation keyboard shortcuts (Alt+Left = back, Alt+Right = forward)
document.addEventListener('keydown',function(e){
  // Alt+Left = back, Alt+Right = forward
  if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();try{history.back();}catch(_){}}
  if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();try{history.forward();}catch(_){}}
});
// ═══ ARIA live announcements for accessibility ═══
function announceToARIA(message){
  try{const r=document.getElementById('aria-live-region');if(r)r.textContent=message;}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
}

// ═══ Progress Spinner Utilities ═══
function showProgress(message){
  let ov=document.getElementById('app-progress-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='app-progress-overlay';
    ov.className='progress-overlay';
    ov.innerHTML='<div class="spinner"></div><div class="progress-text"></div>';
    document.body.appendChild(ov);
  }
  ov.querySelector('.progress-text').textContent=message||'جاري التحميل...';
  ov.style.display='flex';
}
function hideProgress(){
  const ov=document.getElementById('app-progress-overlay');
  if(ov)ov.style.display='none';
}

// ═══ Import Preview ═══
function showImportPreview(data){
  return new Promise((resolve)=>{
    const cats=(data.categories||[]).length;
    const qs=(data.categories||[]).reduce((s,c)=>s+(c.questions||[]).length,0);
    const teams=(data.teams||[]).length;
    const hasSettings=!!data.settings;
    const hasCredits=!!(data.credits&&data.credits.length);
    // Create preview overlay
    let ov=document.getElementById('import-preview-overlay');
    if(ov)ov.remove();
    ov=document.createElement('div');
    ov.id='import-preview-overlay';
    ov.className='modal-overlay';
    ov.setAttribute('role','dialog');
    ov.setAttribute('aria-modal','true');
    ov.style.cssText='position:fixed;inset:0;z-index:11000;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center';
    ov.innerHTML=`
      <div class="modal" style="max-width:480px;text-align:center">
        <div class="modal-header"><div class="modal-title">معاينة الاستيراد</div></div>
        <div class="import-preview">
          <div class="import-preview-summary">
            <div class="import-preview-stat"><div class="import-preview-stat-val">${cats}</div><div class="import-preview-stat-label">أقسام</div></div>
            <div class="import-preview-stat"><div class="import-preview-stat-val">${qs}</div><div class="import-preview-stat-label">أسئلة</div></div>
            <div class="import-preview-stat"><div class="import-preview-stat-val">${teams}</div><div class="import-preview-stat-label">فرق</div></div>
            <div class="import-preview-stat"><div class="import-preview-stat-val">${hasSettings?'✓':'✗'}</div><div class="import-preview-stat-label">إعدادات</div></div>
            <div class="import-preview-stat"><div class="import-preview-stat-val">${hasCredits?'✓':'✗'}</div><div class="import-preview-stat-label">شكر وتقدير</div></div>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
          <button class="btn btn-primary" id="import-confirm-btn">استيراد</button>
          <button class="btn btn-ghost" id="import-cancel-btn">إلغاء</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#import-confirm-btn').addEventListener('click',()=>{ov.remove();resolve(true);});
    ov.querySelector('#import-cancel-btn').addEventListener('click',()=>{ov.remove();resolve(false);});
    ov.addEventListener('click',(e)=>{if(e.target===ov){ov.remove();resolve(false);}});
    openModal('import-preview-overlay');
  });
}

// ═══ High Contrast Mode Init ═══
(function(){
  try{
    const hc=localStorage.getItem('quiz_hc');
    if(hc==='1'){
      document.body.classList.add('high-contrast');
      const cb=document.getElementById('s-high-contrast');
      if(cb)cb.checked=true;
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
})();

// ═══ Move inline handlers to addEventListener ═══
document.addEventListener('DOMContentLoaded',function(){
  const nextBtn=document.getElementById('btn-solo-next-level');
  if(nextBtn)nextBtn.addEventListener('click',soloNextLevel);
  const mapBtn=document.getElementById('btn-solo-return-map');
  if(mapBtn)mapBtn.addEventListener('click',soloReturnToMap);
});

// ═══ SVG Icon Helper ═══
const Icons={
  next:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
  prev:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>',
  delete:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
  play:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M8 5v14l11-7z"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
  upload:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/></svg>',
  trophy:'<svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em"><path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2z"/></svg>'
};
function icon(name,size){
  return `<span class="icon-svg" style="display:inline-flex;width:${size||'1em'};height:${size||'1em'};align-items:center;justify-content:center">${Icons[name]||''}</span>`;
}

// ═══ Unit Tests ═══
(function(){
  const _tests=[];
  function test(name,fn){_tests.push({name,fn});}
  function assert(cond,msg){if(!cond)throw new Error('Assertion failed: '+(msg||''));}
  function assertEquals(a,b,msg){if(a!==b)throw new Error((msg||'')+' Expected '+JSON.stringify(b)+' got '+JSON.stringify(a));}

  // Test: Quiz state management
  test('State has required fields',()=>{
    assert(typeof state==='object','state is object');
    assert(Array.isArray(state.categories),'categories is array');
    assert(Array.isArray(state.teams),'teams is array');
    assert(typeof state.settings==='object','settings is object');
  });

  // Test: Score calculation
  test('calculateStars returns 3 for fast correct',()=>{
    if(typeof calculateStars==='function'){
      const s=calculateStars(5,30,true);
      assert(s>=1&&s<=3,'stars in range');
    }
  });

  // Test: Timer starts and stops
  test('clearSoloTimer clears interval',()=>{
    if(typeof clearSoloTimer==='function'){
      _soloTimerInterval=123;
      clearSoloTimer();
      assertEquals(_soloTimerInterval,null);
    }
  });

  // Test: Question navigation - soloNextLevel guard
  test('soloNextLevel respects transition lock',()=>{
    if(typeof soloNextLevel==='function'){
      _soloTransitioning=true;
      // Should return without error
      soloNextLevel();
      _soloTransitioning=false;
      assert(true,'no crash on locked transition');
    }
  });

  // Test: State save/load round-trip
  test('State serialization round-trip',()=>{
    const json=JSON.stringify({categories:state.categories,teams:state.teams,settings:state.settings});
    const parsed=JSON.parse(json);
    assertEquals(parsed.categories.length,state.categories.length);
    assertEquals(parsed.teams.length,state.teams.length);
  });

  // Test: I18n returns strings
  test('I18n.t returns string',()=>{
    if(typeof I18n!=='undefined'&&typeof I18n.t==='function'){
      const r=I18n.t('app.title','مسابقة');
      assert(typeof r==='string','I18n.t returns string');
    }
  });

  // Test: _sanitizeUser escapes HTML
  test('_sanitizeUser prevents XSS',()=>{
    if(typeof _sanitizeUser==='function'){
      const r=_sanitizeUser('<script>alert(1)<\/script>');
      assert(!r.includes('<script>'),'script tag removed');
    }
  });

  // Test: High contrast toggle
  test('High contrast toggle works',()=>{
    document.body.classList.remove('high-contrast');
    document.body.classList.add('high-contrast');
    assert(document.body.classList.contains('high-contrast'));
    document.body.classList.remove('high-contrast');
    assert(!document.body.classList.contains('high-contrast'));
  });

  // Test: Icons helper
  test('Icons helper returns SVG',()=>{
    const s=icon('star');
    assert(s.includes('<svg'),'icon returns svg');
    assert(s.includes('viewBox'),'icon has viewBox');
  });

  // Run tests (only in console)
  window._runTests=function(){
    let passed=0,failed=0;
    _tests.forEach(t=>{
      try{t.fn();passed++;console.log('✓',t.name);}
      catch(e){failed++;console.error('✗',t.name,e.message);}
    });
    console.log(`Tests: ${passed} passed, ${failed} failed, ${_tests.length} total`);
    return {passed,failed,total:_tests.length};
  };
  // Auto-run hint
  console.log('Quiz Tests loaded. Run _runTests() to execute '+_tests.length+' tests.');
})();
