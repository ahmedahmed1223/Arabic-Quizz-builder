// ═══ Section 7.5: Browser Compatibility Check ═══
function checkBrowserCompat(){
  try{
    var criticalMissing=[];
    var nonCriticalMissing=[];

    // ── Critical checks (only these block usage) ──
    // IndexedDB (accept prefixed versions)
    if(typeof indexedDB==='undefined'&&typeof window.webkitIndexedDB==='undefined'&&typeof window.mozIndexedDB==='undefined'){
      criticalMissing.push('IndexedDB');
    }
    // Promise
    if(typeof Promise==='undefined'){
      criticalMissing.push('Promise');
    }

    // ── Non-critical checks (warnings only) ──
    // CSS Custom Properties
    try{
      if(!(typeof CSS!=='undefined'&&typeof CSS.supports==='function'&&CSS.supports('--a','0'))){
        nonCriticalMissing.push('CSS Custom Properties');
      }
    }catch(e){nonCriticalMissing.push('CSS Custom Properties');}

    // History API (pushState/popstate)
    if(typeof history==='undefined'||typeof history.pushState!=='function'){
      nonCriticalMissing.push('History API (pushState/popstate)');
    }

    // backdrop-filter (accept -webkit- prefix as valid alternative)
    try{
      var hasBackdropFilter=(typeof CSS!=='undefined'&&typeof CSS.supports==='function')&&
        (CSS.supports('backdrop-filter','blur(1px)')||CSS.supports('-webkit-backdrop-filter','blur(1px)'));
      if(!hasBackdropFilter){
        nonCriticalMissing.push('backdrop-filter');
      }
    }catch(e){nonCriticalMissing.push('backdrop-filter');}

    // clamp()
    try{
      if(!(typeof CSS!=='undefined'&&typeof CSS.supports==='function'&&CSS.supports('width','clamp(1px,2px,3px)'))){
        nonCriticalMissing.push('clamp()');
      }
    }catch(e){nonCriticalMissing.push('clamp()');}

    // inset
    try{
      if(!(typeof CSS!=='undefined'&&typeof CSS.supports==='function'&&CSS.supports('inset','0'))){
        nonCriticalMissing.push('inset');
      }
    }catch(e){nonCriticalMissing.push('inset');}

    // svh/dvh viewport units
    try{
      if(!(typeof CSS!=='undefined'&&typeof CSS.supports==='function'&&CSS.supports('height','1svh'))){
        nonCriticalMissing.push('svh/dvh viewport units');
      }
    }catch(e){nonCriticalMissing.push('svh/dvh viewport units');}

    // IntersectionObserver
    if(typeof IntersectionObserver==='undefined'){
      nonCriticalMissing.push('IntersectionObserver');
    }

    // Fetch API
    if(typeof fetch==='undefined'){
      nonCriticalMissing.push('Fetch API');
    }

    // ── Mobile detection and adjustment ──
    var ua=navigator.userAgent||'';
    var isMobile=/Android|iPhone|iPad|iPod|SamsungBrowser|Mobile/i.test(ua);
    // Detect specific mobile browsers for the supported list
    var isChromeAndroid=/Chrome\/[8-9]\d|Chrome\/\d{3,}/.test(ua)&&/Android/.test(ua);
    var isSamsungInternet=/SamsungBrowser\/1[4-9]/.test(ua)||/SamsungBrowser\/[2-9]\d/.test(ua);
    var isSafariIOS=/Version\/1[4-9]/.test(ua)&&/iPhone|iPad|iPod/.test(ua);
    var isFirefoxAndroid=/Firefox\/[8-9]\d|Firefox\/\d{3,}/.test(ua)&&/Android/.test(ua);
    var isOperaMobile=/OPR\/[6-9]\d|OPR\/\d{3,}/.test(ua)&&/Mobile/.test(ua);
    var isUCBrowser=/UCBrowser\/1[3-9]|UCBrowser\/[2-9]\d/.test(ua);
    var isQQBrowser=/QQBrowser\/1[3-9]|QQBrowser\/[2-9]\d/.test(ua);
    var isKiwi=/Kiwi/.test(ua);

    if(isMobile){
      // On mobile, only IndexedDB and Promise absence are critical blockers
      // CSS features are warnings only — they degrade gracefully
      criticalMissing=criticalMissing.filter(function(f){return f==='IndexedDB'||f==='Promise';});
      // Move any CSS features that somehow got into critical to non-critical
      var cssFeatures=['CSS Custom Properties','backdrop-filter','clamp()','inset','svh/dvh viewport units'];
      cssFeatures.forEach(function(cf){
        var idx=criticalMissing.indexOf(cf);
        if(idx!==-1){
          criticalMissing.splice(idx,1);
          if(nonCriticalMissing.indexOf(cf)===-1)nonCriticalMissing.push(cf);
        }
      });
    }

    // ── Handle critical failures: full-page overlay ──
    if(criticalMissing.length>0){
      console.error('[BrowserCompat] CRITICAL features missing:',criticalMissing.join(', '));
      var overlay=document.createElement('div');
      overlay.id='browser-compat-overlay';
      overlay.setAttribute('dir','rtl');
      overlay.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;width:100%;height:100%;z-index:2147483647;background:rgba(20,20,30,0.97);display:flex;align-items:center;justify-content:center;font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#fff;margin:0;padding:0;';
      var box=document.createElement('div');
      box.style.cssText='max-width:520px;width:90%;text-align:center;padding:40px 32px;border-radius:16px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);box-shadow:0 8px 40px rgba(0,0,0,0.5);';
      box.innerHTML='<div style="font-size:2.5rem;margin-bottom:12px;">⚠️</div>'+
        '<h1 style="margin:0 0 16px;font-size:1.6rem;font-weight:700;color:#ff6b6b;">متصفح غير مدعوم</h1>'+
        '<p style="margin:0 0 10px;font-size:1.05rem;line-height:1.7;color:#e0e0e0;">هذا التطبيق يتطلب متصفحاً حديثاً. الحد الأدنى المطلوب:</p>'+
        '<ul style="text-align:right;list-style:none;padding:0;margin:0 0 20px;font-size:0.95rem;line-height:2;color:#ccc;">'+
        '<li>✅ Chrome 80+ / Chrome Android 80+</li><li>✅ Firefox 80+ / Firefox Android 80+</li><li>✅ Safari 14+ (iOS 14+)</li><li>✅ Edge 80+</li><li>✅ Samsung Internet 14+</li><li>✅ Opera Mobile 60+</li><li>✅ UC Browser 13+</li><li>✅ QQ Browser 13+</li><li>✅ Kiwi Browser</li></ul>'+
        '<p style="margin:0 0 18px;font-size:0.85rem;color:#ff9800;">الميزات المفقودة: '+criticalMissing.join(', ')+'</p>'+
        '<button id="browser-compat-continue-btn" style="padding:10px 28px;font-size:1rem;font-weight:600;border:none;border-radius:8px;cursor:pointer;background:#4caf50;color:#fff;font-family:inherit;transition:background 0.2s;">متابعة على أي حال</button>';
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      var btn=document.getElementById('browser-compat-continue-btn');
      if(btn){
        btn.onclick=function(){
          try{overlay.remove();}catch(e){}
        };
        btn.onmouseover=function(){this.style.background='#388e3c';};
        btn.onmouseout=function(){this.style.background='#4caf50';};
      }
    }

    // ── Handle non-critical failures: toast notification or console.warn ──
    if(nonCriticalMissing.length>0){
      console.warn('[BrowserCompat] Non-critical features missing:',nonCriticalMissing.join(', '));
      // Try in-app toast if available
      try{
        if(typeof toast==='function'){
          toast('⚠️ ميزات غير مدعومة في المتصفح: '+nonCriticalMissing.join(', '),'warning',{duration:6000});
        }
      }catch(e){
        console.warn('[BrowserCompat] Could not show toast:',e);
      }
    }

    // Update browser info for diagnostics
    window._browserInfo={
      userAgent:navigator.userAgent,
      missing:criticalMissing.concat(nonCriticalMissing),
      criticalMissing:criticalMissing,
      nonCriticalMissing:nonCriticalMissing,
      supported:criticalMissing.length===0,
      isMobile:isMobile,
      detectedBrowser:{
        chromeAndroid:isChromeAndroid,
        samsungInternet:isSamsungInternet,
        safariIOS:isSafariIOS,
        firefoxAndroid:isFirefoxAndroid,
        operaMobile:isOperaMobile,
        ucBrowser:isUCBrowser,
        qqBrowser:isQQBrowser,
        kiwi:isKiwi
      }
    };

  }catch(e){
    try{ErrorBus.capture(e,'checkBrowserCompat');}catch(_){console.error('[BrowserCompat] Fatal:',e);}
  }
}

function _initApp(){
  // Guard: only run once
  if(window._appInitialized)return;
  window._appInitialized=true;

  // V15-CRITICAL: Check wizard first-run IMMEDIATELY at the start of init
  // This ensures the flag is set before ANY code can throw and bypass the wizard
  try{
    if(typeof Wizard!=='undefined'&&typeof Wizard.isFirstRun==='function'&&Wizard.isFirstRun()){
      window._wizardFirstRunPending=true;
      console.info('[Init] First run flag set at init entry \u2014 wizard will be shown after loading');
    }
  }catch(e){console.warn('[Init] Wizard first-run early check error:',e);}

  // Safety: ensure state is initialized before any access
  if(typeof state==='undefined'||!state){
    console.error('[Init] CRITICAL: state is not defined! Attempting recovery...');
    try{
      // Re-declare state with defaults if it was never initialized
      state={settings:{name:'\u0645\u0633\u0627\u0628\u0642\u0629 \u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u0627\u0644\u0643\u0628\u0631\u0649',password:'1234',defaultTime:30,compMode:'turns',hardPoints:2,language:'ar',theme:'space',musicType:'builtin',musicVol:40,fontScale:100,soloDifficulty:'all',soloMuted:false,soloReducedEffects:false,soloFullscreen:false,soloBgMusic:true,soloTimerEnabled:true,showSoloReview:false,showSoloQuickSetup:false,showBugReportsTab:false,showErrorScreen:false},categories:[],teams:[],credits:[],currentCatId:null,currentQIndex:0,currentTeamIndex:0,usedQuestions:{},fullCatQueue:[],fullCatQueuePos:0,timerInterval:null,timeLeft:0,timerTotal:0,answered:false,teamLifelines:{},editingCatId:null,editingQId:null,editingTeamId:null,editingCreditId:null,sessionStats:{},modalMembers:[],musicPlaying:false,gameActive:false,optionsRevealed:0,totalOptionsToReveal:0,pendingAnswer:-1,editingQType:'text',qMediaData:null,qMediaType:null,scoreHistory:[],teamStreaks:{},qFilterMode:'all',qSearchTerm:'',savedFilters:[],advSearchOpen:false,advFilters:{advCat:'',hasImage:false,hasExplanation:false},buzzerActive:false,buzzerWinner:null,soloProgress:null};
      console.info('[Init] State recovery successful');
    }catch(recoveryErr){
      console.error('[Init] State recovery failed:',recoveryErr);
      // Show error to user
      try{var _ls=document.getElementById('loading-screen');if(_ls)_ls.innerHTML='<div style="color:#fff;text-align:center;padding:40px"><h2>\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062a\u062d\u0645\u064a\u0644</h2><p>\u064a\u0631\u062c\u0649 \u0645\u0633\u062d \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062a\u0635\u0641\u062d \u0648\u0625\u0639\u0627\u062f\u0629 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629</p><button onclick="localStorage.clear();location.reload()" style="margin-top:20px;padding:10px 30px;font-size:18px;cursor:pointer">\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0639\u064a\u064a\u0646</button></div>';return;}catch(e){}
    }
  }
  console.info('[Init] App starting...');
  // Session timer & custom theme colors (V15: wrapped in try-catch to prevent blocking init)
  window._sessionStartTime = window._sessionStartTime || Date.now();
  try{var _sessionDurTimer=setInterval(updateSessionDuration, 60000);if(typeof TimerRegistry!=='undefined'&&TimerRegistry.register){TimerRegistry.register('session-duration',_sessionDurTimer);}}catch(e){console.warn('[Init] Session timer error:',e);}
  try{loadCustomThemeColors();}catch(e){console.warn('[Init] loadCustomThemeColors error:',e);}

  // Browser check moved to admin panel only
  
  // V14-fix: Properly await loadState to prevent race condition with wizard first-run check
  var _loadStateDone=false;
  try{
    var _loadStatePromise=loadState();
    // Set a 5-second timeout for loadState
    var _loadStateTimeout=new Promise(function(resolve){setTimeout(resolve,5000);});
    Promise.race([_loadStatePromise,_loadStateTimeout]).then(function(){
      _loadStateDone=true;
      console.info('[Init] State loading complete');
    }).catch(function(e){
      _loadStateDone=true;
      console.error('[Init] loadState async error:',e);
    });
    console.info('[Init] State loading started');
  }catch(e){
    _loadStateDone=true;
    console.error('[Init] loadState error:',e);
  }
  
  // Step 1.5: Default embedded background music is available at runtime via DEFAULT_BG_MUSIC
  // Do NOT assign it to customMusicData — that would waste ~1MB in localStorage on every save.
  // playCustomMusic() already falls back to DEFAULT_BG_MUSIC when customMusicData is empty.
  try{
    if(typeof DEFAULT_BG_MUSIC!=='undefined' && DEFAULT_BG_MUSIC){
      console.info('[Init] Default embedded background music available (not stored in state)');
    }
  }catch(e){console.warn('[Init] Default music check error:',e);}
  
  // Step 2: Pre-cache default sound effects from embedded base64 data (immediate)
  try{
    if(typeof APPLAUSE_B64_DATA!=='undefined'&&APPLAUSE_B64_DATA){
      var _appSrc=_b64ToDataUrl(APPLAUSE_B64_DATA,'audio/mpeg');
      if(_appSrc&&!_defaultSoundCache.applause){
        _defaultSoundCache.applause=new Audio(_appSrc);
        _defaultSoundCache.applause.volume=(state.settings.soundCorrectVol||80)/100;
        _defaultSoundCache.applause.preload='auto';
        console.info('[Init] Pre-cached applause sound from embedded base64');
      }
    }
    if(typeof BUZZER_B64_DATA!=='undefined'&&BUZZER_B64_DATA){
      var _buzzSrc=_b64ToDataUrl(BUZZER_B64_DATA,'audio/mpeg');
      if(_buzzSrc&&!_defaultSoundCache.buzz){
        _defaultSoundCache.buzz=new Audio(_buzzSrc);
        _defaultSoundCache.buzz.volume=(state.settings.soundWrongVol||80)/100;
        _defaultSoundCache.buzz.preload='auto';
        console.info('[Init] Pre-cached buzz sound from embedded base64');
      }
    }
  }catch(e){console.warn('[Init] Pre-cache sounds error:',e);}
  // Also initialize default sounds in IDB (deferred — non-blocking)
  try{_initDefaultSounds();}catch(e){console.warn('[Init] _initDefaultSounds error:',e);}
  
  // Step 3: Safety — ensure _idbLoadDone becomes true within 6s max
  // V11-fix: bumped from 3s → 6s to give MediaDB.loadAllMedia() enough time on slow devices
  // (was generating noisy warnings on first load of large IDB stores)
  setTimeout(()=>{
    if(!_idbLoadDone){
      _idbLoadDone=true;
      console.info('[Init] IDB load safety timeout — saves enabled (load still running in background)');
      if(_pendingSaveNeeded){_pendingSaveNeeded=false;try{saveState();}catch(e2){console.warn('[Init] IDB timeout save failed:',e2);}}
    }
  },6000);
  
  // Step 4: Apply visual settings (with safety checks)
  try{if(state&&state.settings){const _tid=state.settings.theme||'space';document.body.setAttribute('data-theme',_tid);if(typeof applyThemeCSS==='function')applyThemeCSS(_tid);}}catch(e){console.warn('[Init] theme error:',e);}
  try{if(state&&state.settings&&typeof applyFontScale==='function')applyFontScale(state.settings.fontScale||100);}catch(e){console.warn('[Init] fontScale error:',e);}
  try{if(typeof _syncSoloSettingsFromState==='function')_syncSoloSettingsFromState();}catch(e){}
  try{if(state&&state.settings)document.title=(typeof I18n!=='undefined'&&I18n.t?I18n.t('app.title'):'منصة المسابقات')+' — '+(state.settings.name||'');}catch(e){console.warn('[Init] title error:',e);}
  
  // Step 5: Initialize i18n from saved language
  try{if(typeof I18n!=='undefined'&&I18n.init&&state&&state.settings)I18n.init(state.settings.language||'ar');console.info('[Init] I18n initialized');}catch(e){console.warn('[Init] I18n init error:',e);}
  
  // Step 6: Dismiss loading screen and show login view or wizard
  var _loadingDismissed=false;
  // V15-note: Wizard first-run flag is now set at the very start of _initApp() (line 30936)
  // This redundant check is kept as a safety net in case the early check was somehow missed
  var _showInitialView=function(){
    // V14-fix: Wait for loadState to complete before showing initial view
    // This prevents race condition where state is loaded after view is shown
    var _doShowView=function(){
      // Check if this is first run — show wizard instead of login
      try{
        var _isFirstRun=typeof Wizard!=='undefined'&&typeof Wizard.isFirstRun==='function'&&Wizard.isFirstRun();
        if(_isFirstRun||window._wizardFirstRunPending){
          console.info('[Init] First run detected — showing setup wizard (isFirstRun='+_isFirstRun+', pending='+window._wizardFirstRunPending+')');
          window._wizardFirstRunPending=true; // Mark that wizard is being shown
          // Hide any view that might be showing
          try{document.querySelectorAll('.view-container > div').forEach(function(v){v.classList.add('hidden');});}catch(e){}
          try{document.querySelectorAll('.view-container .view').forEach(function(v){v.classList.add('hidden');});}catch(e){}
          try{
            var ls2=document.getElementById('loading-screen');
            if(ls2){ls2.style.opacity='0';ls2.style.display='none';}
          }catch(e){}
          // V14-fix: Also hide login view explicitly in case it was already shown
          try{var _loginView=document.getElementById('view-login');if(_loginView)_loginView.classList.add('hidden');}catch(e){}
          // V15-fix: Hide all other views that might have been shown by error handlers
          try{var _views=document.querySelectorAll('[id^=\"view-\"]');_views.forEach(function(v){if(v.id!=='wizard-overlay')v.classList.add('hidden');});}catch(e){}
          try{Wizard.show();}catch(e){console.error('[Init] Wizard show error:',e);}
          return;
        }
      }catch(e){console.warn('[Init] Wizard check error:',e);}
      // Normal flow: show login
      window._wizardFirstRunPending=false; // Clear flag — not a first run
      try{showView('login');console.info('[Init] Login view shown');}catch(e){console.error('[Init] showView error:',e);}
      // Feature 2a: Set initial history state so back button works from first navigation
      try{history.replaceState({view:window._currentView||'login'},'','#'+(window._currentView||'login'));}catch(e){}
    };

    // V14-fix: If loadState is still in progress, wait for it (max 2s)
    if(!_loadStateDone){
      console.info('[Init] Waiting for loadState to complete before showing initial view...');
      var _waitStart=Date.now();
      var _waitInterval=setInterval(function(){
        if(_loadStateDone||Date.now()-_waitStart>2000){
          clearInterval(_waitInterval);
          _doShowView();
        }
      },100);
    }else{
      _doShowView();
    }
  };

/* Progressive Loading Stages */
var _loadStages=[
  {msg:'تحميل الهيكل الأساسي...',tip:'💡 يمكنك استخدام اختصارات لوحة المفاتيح أثناء العرض'},
  {msg:'تحميل المحرر والأدوات...',tip:'💡 جرب وضع اللعب الفردي للتدرب بمفردك'},
  {msg:'تحميل المحرك الرياضي...',tip:'💡 يدعم المحرر صيغ KaTeX الرياضية'},
  {msg:'تحميل بياناتك...',tip:'💡 استورد مسابقاتك من Google Sheets بسهولة'},
  {msg:'جاهز!',tip:''}
];
var _loadStageIdx=0;
function updateLoadStage(){
  try{
    var s=_loadStages[Math.min(_loadStageIdx,_loadStages.length-1)];
    var stageEl=document.getElementById('loading-stage');
    var tipEl=document.getElementById('loading-tip');
    if(stageEl)stageEl.textContent=s.msg;
    if(tipEl)tipEl.textContent=s.tip;
    // Update step dots
    var stepEl=document.getElementById('load-step-'+_loadStageIdx);
    if(stepEl){
      stepEl.style.background='var(--accent1)';
      stepEl.style.width='12px';
      stepEl.style.height='12px';
      stepEl.style.boxShadow='0 0 8px var(--accent1)';
    }
    // Mark previous steps as completed
    for(var i=0;i<_loadStageIdx;i++){
      var prevStep=document.getElementById('load-step-'+i);
      if(prevStep){
        prevStep.style.background='var(--accent1)';
        prevStep.style.opacity='0.6';
      }
    }
    _loadStageIdx++;
  }catch(e){}
}
// Fire stages at intervals
TimerRegistry.setTimeout(updateLoadStage,300,'v13-load-1');
TimerRegistry.setTimeout(updateLoadStage,600,'v13-load-2');
TimerRegistry.setTimeout(updateLoadStage,1000,'v13-load-3');
TimerRegistry.setTimeout(updateLoadStage,1400,'v13-load-4');
TimerRegistry.setTimeout(function(){updateLoadStage();},1800,'v13-load-5');

  var _dismissLoading=function(){
    if(_loadingDismissed)return; // Prevent double-dismiss
    _loadingDismissed=true;
    window._appReady=true;
    try{
      var ls=document.getElementById('loading-screen');
      if(ls){
        ls.style.opacity='0';
        setTimeout(function(){
          try{ls.style.display='none';}catch(e){try{ErrorBus.capture(e,"catch#AUTO_214")}catch(_){}}
          _showInitialView();
        },500);
      }else{
        _showInitialView();
      }
    }catch(e){
      console.error('[Init] Loading dismiss error:',e);
      // Emergency fallback
      try{_showInitialView();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_215")}catch(_){}}
    }
  };
  
  // Dismiss loading screen quickly
  if(document.readyState==='complete'){_dismissLoading();}
  else{setTimeout(_dismissLoading,400);}
  
  // SAFETY: Force dismiss loading screen after 2s no matter what
  setTimeout(function(){
    if(!_loadingDismissed){
      console.warn('[Init] Forced loading dismiss (safety timeout)');
      _dismissLoading();
    }
  },2000);
  try{populateColorSwatches('color-swatches','cat-color-input',CAT_COLORS);}catch(e){console.error("[Error]",e);}
  try{populateColorSwatches('team-color-swatches','team-color-input',TEAM_COLORS);}catch(e){console.error("[Error]",e);}
  try{restoreBackupInterval();}catch(e){console.error("[Error]",e);}
  try{initSessionStats();}catch(e){console.error("[Error]",e);}
  try{restoreV5Settings();}catch(e){console.error("[Error]",e);}
  try{restoreCustomThemeVars();}catch(e){console.error("[Error]",e);}
  // Initialize settings sub-tabs (show dashboard, hide others)
  try{var _firstSubtab=document.querySelector('.settings-subtab.active');switchSettingsSubtab('dashboard',_firstSubtab);}catch(e){console.error("[Error]",e);}
  // Show custom panel if custom theme active
  try{
    if(state&&state.settings&&state.settings.theme==='custom'){
      const p=document.getElementById('custom-theme-panel');
      if(p)p.style.display='block';
    }
  }catch(e){console.error("[Error]",e);}
  document.addEventListener('fullscreenchange',()=>{
    if(!document.fullscreenElement){const h=document.getElementById('fs-hint');if(h)h.classList.remove('show')}
  });

  // EventDelegate available for new code via data-action attributes
  // Inline handlers are kept as-is for backward compatibility

  // ── Initialize UI Enhancements ──
  try{if(typeof initUIEnhancements==='function')initUIEnhancements();}catch(e){console.warn('[Init] UI Enhancements error:',e);}
}

// Primary: DOMContentLoaded (fast, doesn't wait for CDN resources)
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',_initApp);
}else{
  // DOM already ready (script loaded with defer or after DOMContentLoaded)
  _initApp();
}
