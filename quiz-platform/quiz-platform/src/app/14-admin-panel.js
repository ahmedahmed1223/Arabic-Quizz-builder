// ════════════════════════════════════════════════════════
//  VIEWS
// ════════════════════════════════════════════════════════
const ALL_VIEWS=['login','admin','intro','teams','categories','question','scores','credits','bigclock','teamstats','podium','solo-map','solo-question'];

// Smart admin navigation with confirmation during active game
function goToAdmin(){
  if(state.gameActive){
    // Save progress before going to admin
    saveGameProgress();
    confirmAction(
      'سيتم إيقاف العرض والانتقال للوحة التحكم. التقدم محفوظ ويمكن استئنافه لاحقاً.',
      ()=>{
        state.gameActive=false;
        clearTimer();
        stopEffectSound();
        if(window._qAudioEl)try{window._qAudioEl.pause()}catch(e){try{ErrorBus.capture(e,"catch#12")}catch(_){}}
        stopMusic();
        showView('admin');
        try{switchSettingsSubtab('dashboard',document.querySelector('.settings-subtab.active'));}catch(e){}
      },
      '⚙️','الانتقال للتحكم'
    );
  }else{
    // If already on admin view, just stay; otherwise navigate to admin
    if(window._currentView!=='admin'){
      showView('admin');
      try{switchSettingsSubtab('dashboard',document.querySelector('.settings-subtab.active'));}catch(e){}
    }
  }
  // Show bottom nav on mobile when entering admin
  try{var _bnav=document.getElementById('bottom-nav');if(_bnav&&window.innerWidth<=768){_bnav.classList.add('nav-visible');}}catch(e){}
}

function showView(name,_noHistory){
  // History API support: push state unless navigating via popstate
  if(!_noHistory){try{history.pushState({view:name},'','#'+name);}catch(e){console.error("[Error]",e);}}
  // Phase 4.1: Invalidate DOM element cache on view change
  invalidateQCache();
  window._prevView=window._currentView||'scores';window._currentView=name;
  // Feature 2d: Track view history for navigation/breadcrumbs
  if(!window._viewHistory)window._viewHistory=[];
  if(window._viewHistory[window._viewHistory.length-1]!==name){
    window._viewHistory.push(name);
    // Keep history manageable
    if(window._viewHistory.length>50)window._viewHistory.shift();
  }
  // V11: Stop all question media when leaving question view
  if(window._currentView!=='question'&&window._prevView==='question'){
    try{
      // Stop audio
      [window._qAudioEl,window._quranAudio,window._tenseAudioEl].forEach(function(a){if(a){try{a.pause();a.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_72")}catch(_){}}}});
      // Stop embedded tense preview
      try{stopEmbeddedTenseMusic();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_73")}catch(_){}}
      // Stop video
      var vPlayer=document.getElementById('q-video-player');
      if(vPlayer){try{vPlayer.pause();vPlayer.currentTime=0;if(vPlayer._blobUrl){URL.revokeObjectURL(vPlayer._blobUrl);vPlayer._blobUrl=null;}}catch(e){try{ErrorBus.capture(e,"catch#AUTO_74")}catch(_){}}}
      // Stop media attachment
      if(window._mediaAttachEl){try{window._mediaAttachEl.pause();window._mediaAttachEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_75")}catch(_){}}}
      // Stop effect sounds
      stopEffectSound();
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_76")}catch(_){}}
  }
  // V7: Notify Store + optional timer cleanup on view change
  try{TimerRegistry.clearAll();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_77")}catch(_){}}  // V11: Clear orphaned timers on view change
  // V10-fix: Clean up raw intervals that bypass TimerRegistry when leaving question view
  try{
    if(window._currentView!=='question'&&window._prevView==='question'){
      // Clear auto-reveal interval
      if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
      // Clear timer delay countdown
      // Phase 4.4: Use TimerRegistry for cleanup
      if(typeof _timerDelayCountdown!=='undefined'&&_timerDelayCountdown){TimerRegistry.clear(_timerDelayCountdown);_timerDelayCountdown=null;}
      // Clear timer delay timeout
      if(typeof _timerDelayTimeout!=='undefined'&&_timerDelayTimeout){TimerRegistry.clear(_timerDelayTimeout);_timerDelayTimeout=null;}
    }
    // Clean up transition timer on any view change
    // Phase 4.4: Use TimerRegistry for cleanup
    if(typeof _transitionTimer!=='undefined'&&_transitionTimer){TimerRegistry.clear(_transitionTimer);_transitionTimer=null;_transitionInProgress=false;}
    // V12-fix: Clean up tiebreaker timer on view change
    // Phase 4.4: Use TimerRegistry for cleanup
    if(window._tbTimerInterval){TimerRegistry.clear(window._tbTimerInterval);window._tbTimerInterval=null;}
    // Check remote/audience windows — clear ping timers if windows are closed
    if(typeof _remotePingTimer!=='undefined'&&_remotePingTimer&&(!_remoteWin||_remoteWin.closed)){clearInterval(_remotePingTimer);_remotePingTimer=null;}
    if(typeof _audiencePingTimer!=='undefined'&&_audiencePingTimer&&(!_audienceWin||_audienceWin.closed)){clearInterval(_audiencePingTimer);_audiencePingTimer=null;}
    // Solo mode: clear solo timer when leaving solo-question view
    if(typeof clearSoloTimer==='function'&&window._currentView!=='solo-question'){clearSoloTimer();}
    // Solo mode: stop solo audio when leaving solo-question view
    if(typeof _soloAudioEl!=='undefined'&&_soloAudioEl&&window._currentView!=='solo-question'){try{_soloAudioEl.pause();_soloAudioEl=null;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_78")}catch(_){}}}
    // Stop solo background music when leaving solo mode
    var _prevSolo=window._prevView&&window._prevView.startsWith('solo');
    var _currSolo=name&&name.startsWith('solo');
    if(_prevSolo&&!_currSolo&&state.musicPlaying){
      try{stopMusic();}catch(e){}
    }
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_79")}catch(_){}}
  try{Store.dispatch("VIEW_CHANGE",{view:arguments[0]});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_80")}catch(_){}}

  // Hide #app when showing views outside it (podium, teamstats, bigclock)
  // to prevent it from taking up space and pushing content below viewport
  const _outsideAppViews=['podium','teamstats','bigclock','solo-map','solo-question'];
  const _appEl=document.getElementById('app');
  if(_appEl){
    if(_outsideAppViews.includes(name)){
      _appEl.style.display='none';
    }else{
      _appEl.style.display='';
    }
  }

  // Hide/show cat nav buttons in sequential/manual mode
  if(name==='categories'){
    // Always ensure the header bar is fully visible in categories view
    const _headerBar=document.querySelector('#view-categories .pres-header-bar');
    if(_headerBar){
      _headerBar.style.opacity='1';
      _headerBar.style.pointerEvents='';
      _headerBar.style.display='';
    }
    // In manual mode with hideNav, hide only the nav BUTTONS (not the entire actions div)
    // so the competition name logo remains visible.
    // In sequence mode or when game is active, always show everything.
    const _seqManual=state.settings.presentationMode==='manual';
    const _isSeqMode=state.settings.presentationMode==='sequence';
    const _hideNav=state.settings.hideNavOnCats!==false;
    const _gameActive=state.gameActive;
    // Only hide nav buttons in manual mode when game hasn't started yet
    const _shouldHideNav=_seqManual&&_hideNav&&!_gameActive;
    const _catActions=document.querySelector('#view-categories .pres-header-actions');
    if(_catActions){
      // Always keep the actions container visible (opacity 1) so logo area is unaffected
      _catActions.style.transition='opacity .3s';
      _catActions.style.opacity='1';
      _catActions.style.pointerEvents='';
      // Instead, hide individual buttons inside .pres-header-actions
      const _navBtns=_catActions.querySelectorAll('.btn');
      _navBtns.forEach(btn=>{
        btn.style.transition='opacity .3s';
        btn.style.opacity=_shouldHideNav?'0':'1';
        btn.style.pointerEvents=_shouldHideNav?'none':'';
      });
    }
    const _modeSwitcher=document.getElementById('cats-mode-switcher');
    if(_modeSwitcher){_modeSwitcher.style.display=_shouldHideNav?'none':'';}
  }
  try{
  // Reset transition state on any navigation
  if(name!=='question'){
    cancelTransition(false);
    _transitionInProgress=false;
  }
  // V15-fix: Add view transition exit animation to currently visible views
  // Hide them AFTER the exit animation completes (not immediately) so the animation is visible
  // V16-fix: Exclude the TARGET view from exit animation to prevent race condition
  // When navigating to the same view (e.g. solo-question → solo-question), the target view
  // must NOT be in _exitingViews, otherwise the 220ms timeout hides it after we just showed it
  var _targetViewId='view-'+name;
  var _exitingViews=[];
  ALL_VIEWS.forEach(v=>{const ve=document.getElementById('view-'+v);if(ve&&!ve.classList.contains('hidden')&&ve.id!==_targetViewId){_exitingViews.push(ve);ve.classList.add('view-exit');}});
  // Hide exiting views after animation completes (200ms CSS transition)
  if(_exitingViews.length>0){
    setTimeout(function(){_exitingViews.forEach(ve=>{ve.classList.remove('view-exit');ve.classList.add('hidden');ve.setAttribute('aria-hidden','true');});},220);
  }
  // For the target view: if it's currently visible (re-navigating to same view), remove exit class
  const el=document.getElementById('view-'+name);
  if(!el){console.error('View not found:',name);return;}
  // Remove exit animation if accidentally added (safety)
  el.classList.remove('view-exit');
  el.classList.remove('hidden');
  el.setAttribute('aria-hidden','false');
  // Add view transition entrance animation
  el.classList.add('view-enter');
  setTimeout(function(){el.classList.remove('view-enter');},400);
  // Scroll reset — multi-step for reliability on all browsers
  el.scrollTop=0;
  window.scrollTo({top:0,left:0,behavior:'instant'});
  document.documentElement.scrollTop=0;
  document.body.scrollTop=0;
  // Reset scroll on ALL scrollable child containers (including CSS overflow not just inline)
  el.querySelectorAll('.teamstats-wrapper,.scoreboard-list,.podium-rest,[style*="overflow"]').forEach(c=>{try{c.scrollTop=0;c.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_81")}catch(_){}}});
  // Also reset scroll on the view element itself if it's the scroll container
  try{el.scrollTop=0;el.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_82")}catch(_){}}
  // Second pass after paint
  requestAnimationFrame(()=>{
    el.scrollTop=0;
    window.scrollTo({top:0,left:0,behavior:'instant'});
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    el.querySelectorAll('.teamstats-wrapper,.scoreboard-list,.podium-rest,[style*="overflow"]').forEach(c=>{try{c.scrollTop=0;c.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_83")}catch(_){}}});
    try{el.scrollTop=0;el.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_84")}catch(_){}}
  });
  // Third pass for stubborn browsers (especially mobile)
  setTimeout(()=>{
    el.scrollTop=0;try{el.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_85")}catch(_){}}
    window.scrollTo({top:0,left:0,behavior:'instant'});
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
    el.querySelectorAll('.teamstats-wrapper,.scoreboard-list,.podium-rest,[style*="overflow"]').forEach(c=>{try{c.scrollTop=0;c.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_86")}catch(_){}}});
  },100);
  // Fourth pass — ensure scroll on mobile after layout settles
  setTimeout(()=>{
    el.scrollTop=0;try{el.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_87")}catch(_){}}
    window.scrollTo({top:0,left:0});
    el.querySelectorAll('.teamstats-wrapper,.scoreboard-list,.podium-rest,[style*="overflow"]').forEach(c=>{try{c.scrollTop=0;c.scrollTo(0,0);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_88")}catch(_){}}});
  },300);
  if(state.settings.viewTransitions!==false){
    el.classList.remove('view-animate-enter');
    void el.offsetWidth;
    el.classList.add('view-animate-enter');
  }
  const presViews=['intro','welcome','teams','categories','question','scores','credits'];
  const allPresViews=['intro','welcome','teams','categories','question','scores','credits','bigclock','teamstats','podium'];
  const ticker=document.getElementById('score-ticker');
  if(ticker)ticker.classList.toggle('hidden',!allPresViews.includes(name)||!state.teams.length);
  // Always stop effect sounds and wheel music when navigating to any view
  stopEffectSound();
  try{AudioMixer.stop('wheel');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_89")}catch(_){}}
  if(name!=='question'){
    // Clean up question resources when leaving question screen
    if(window._qAudioEl){try{window._qAudioEl.pause();window._qAudioEl.src='';}catch(e){try{ErrorBus.capture(e,"catch#13")}catch(_){}}}
    if(window._quranAudio){try{window._quranAudio.pause();}catch(e){try{ErrorBus.capture(e,"catch#14")}catch(_){}}}
    // Stop tense music when leaving question
    try{_stopTenseAudio();state._tenseMusicActive=false;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_90")}catch(_){}}
    // Cancel auto-reveal and transition timers when navigating away
    if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
    // Remove any orphaned overlays
    const txBadge=$el('transition-countdown');if(txBadge)txBadge.remove();
    const tuOv=$el('timeup-overlay');if(tuOv)tuOv.remove();
    // Clear confetti canvas to avoid stale pixels
    if(!_confAF){
      const _cc=$el('confetti-canvas');
      if(_cc)try{_cc.getContext('2d').clearRect(0,0,_cc.width,_cc.height);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_91")}catch(_){}}
    }
  }
  // Stop podium music when leaving podium screen
  if(name!=='podium' && window._podiumMusicPlaying){
    stopPodiumMusicInternal();
  }
  // Stop podium test audio when leaving admin (test is only in admin settings)
  if(name!=='admin' && window._podiumTestAudio){
    try{window._podiumTestAudio.pause();window._podiumTestAudio.src='';}catch(e){try{ErrorBus.capture(e,"catch#AUTO_92")}catch(_){}}
    window._podiumTestAudio=null;
  }
  // Stop custom audio test when leaving admin
  if(name!=='admin' && typeof _customAudioTestEl!=='undefined' && _customAudioTestEl){
    try{_customAudioTestEl.pause();_customAudioTestEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_93")}catch(_){}}
    _customAudioTestEl=null;
    if(typeof _resetAudioTestUI==='function')_resetAudioTestUI();
  }
  // Hide sequence nav overlay on admin/login
  const seqOv=document.getElementById('seq-nav-overlay');
  if(seqOv&&(name==='admin'||name==='login')){seqOv.style.display='none';clearTimeout(_seqTimer);_seqTimer=null;_removeSeqWelcome();}
  if(name==='admin'||name==='login'||name==='scores'||name==='credits') {
    if(name==='scores'||name==='credits') saveGameProgress();
    if(name==='admin'||name==='login') state.gameActive=false;
  }
  // Render view-specific content (each wrapped individually to prevent one failure from breaking others)
  if(name==='admin'){try{renderAdmin();}catch(e){console.error('[showView] renderAdmin error:',e);}}
  if(name==='intro'){try{renderIntro();}catch(e){console.error('[showView] renderIntro error:',e);}}
  if(name==='teams'){try{renderTeamsSlide();}catch(e){console.error('[showView] renderTeamsSlide error:',e);}}
  if(name==='categories'){try{renderCatsSlide();}catch(e){console.error('[showView] renderCatsSlide error:',e);}}
  if(name==='scores'){try{renderScoresSlide();}catch(e){console.error('[showView] renderScoresSlide error:',e);}}
  if(name==='credits'){try{renderCreditsSlide();}catch(e){console.error('[showView] renderCreditsSlide error:',e);}}
  if(name==='teamstats'){try{renderTeamStats();}catch(e){console.error('[showView] renderTeamStats error:',e);}}
  if(name==='solo-map'){try{renderSoloMap();}catch(e){console.error('[showView] renderSoloMap error:',e);}}
  // Hide competition overlays when entering solo mode
  if(name==='solo-map'||name==='solo-question'){
    try{
      ['turn-overlay','buzzer-overlay'].forEach(function(id){
        var el=document.getElementById(id);
        if(el)el.classList.add('hidden');
      });
    }catch(e){}
  }
  // Ensure solo overlays are in correct initial state when entering solo views
  if(name==='solo-map'){
    try{
      ['solo-settings-panel','solo-stars-overlay','solo-victory-overlay','solo-confirm-dialog'].forEach(function(id){
        var el=document.getElementById(id);
        if(el){el.classList.remove('solo-overlay-visible');el.classList.remove('hidden');}
      });
    }catch(e){}
  }
  // Start background music for solo mode if enabled
  if((name==='solo-map'||name==='solo-question')&&state.settings.soloBgMusic!==false&&!_soloSettings.muted&&!state.musicPlaying){
    try{startMusic(state.settings.musicType||'builtin');}catch(e){console.error('[showView] solo bgm error:',e);}
  }
  if(presViews.includes(name)){try{updateTicker();}catch(e){console.error("[Error]",e);}}
  // Push state to audience/remote screens on view change
  try{_pushRemoteState();}catch(e){console.error("[Error]",e);}
  // V15-fix: Additional delayed push for views that indicate active quiz (categories, question)
  if((name==='categories'||name==='question')&&state.gameActive){
    setTimeout(function(){try{_pushRemoteState();}catch(e){console.error("[Error]",e);}},200);
  }
  }catch(err){console.error('[showView] error for "'+name+'":', err);}
  // Show bottom nav only in admin view (visible on mobile/tablet)
  try{var _bnav=document.getElementById('bottom-nav');if(_bnav){var _isSmall=window.innerWidth<=1024;_bnav.style.display=(name==='admin'&&_isSmall)?'flex':'none';if(name==='admin'&&_isSmall){_bnav.classList.add('nav-visible');}else{_bnav.classList.remove('nav-visible');}}}catch(e){}
  // Focus management — redirect focus on view change for accessibility
  try{
    var _focusTarget=document.querySelector('#view-'+name+' button, #view-'+name+' input, #view-'+name+' [tabindex]');
    if(_focusTarget){
      TimerRegistry.setTimeout(function(){try{_focusTarget.focus({preventScroll:true});}catch(e){}},100,'focus-redirect');
    }
  }catch(e){}
  /* V14: Initialize gestures for presentation view */
  if(name==='present'||name==='game'){
    var presentArea=document.getElementById('present-area')||document.getElementById('game-area');
    if(presentArea&&!presentArea._gesturesInit){
      GestureManager.initSwipeNav(presentArea,{
        onSwipeLeft:function(){if(typeof nextQuestion==='function')nextQuestion()},
        onSwipeRight:function(){if(typeof prevQuestion==='function')prevQuestion()}
      });
      presentArea._gesturesInit=true;
    }
  }
  /* V14: Reset streak on new game */
  if(name==='solo'||name==='adventure'){
    StreakManager.reset();
    setTimeout(function(){
      StreakManager.renderBar('streak-bar-container');
      /* Create streak bar container if not exists */
      var sbar=document.getElementById('streak-bar-container');
      if(!sbar){
        var soloArea=document.getElementById('solo-area')||document.getElementById('adventure-area');
        if(soloArea){
          sbar=h('div',{id:'streak-bar-container'});
          soloArea.prepend(sbar);
          StreakManager.renderBar('streak-bar-container');
        }
      }
    },100);
  }
}
