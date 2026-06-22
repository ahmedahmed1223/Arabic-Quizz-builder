// ════════════════════════════════════════════════════════
//  ADMIN
// ════════════════════════════════════════════════════════
function switchSettingsSubtab(group,btn){
  var subtabs=document.querySelectorAll('.settings-subtab');
  subtabs.forEach(function(t){
    t.style.background='var(--bg-surface)';
    t.style.color='var(--text-secondary)';
    t.style.fontWeight='700';
    t.classList.remove('active');
  });
  if(btn){
    btn.style.background='var(--accent1)';
    btn.style.color='#000';
    btn.style.fontWeight='800';
    btn.classList.add('active');
  }
  var cards=document.querySelectorAll('#tab-settings [data-settings-group]');
  cards.forEach(function(c){
    c.style.display=c.getAttribute('data-settings-group')===group?'':'none';
  });
  var dash=document.getElementById('settings-dashboard');
  if(dash)dash.style.display=group==='dashboard'?'':'none';
}
function toggleHelpSection(btn){
  var section=btn.closest('.help-section');
  if(!section)return;
  var isOpen=section.classList.contains('open');
  section.classList.toggle('open');
  var body=section.querySelector('.help-section-body');
  if(body){
    body.style.display=isOpen?'none':'block';
  }
}
function filterHelpSections(query){
  var sections=document.querySelectorAll('.help-section');
  var q=query.trim().toLowerCase();
  sections.forEach(function(s){
    if(!q){
      s.classList.remove('hidden-by-search');
      return;
    }
    var keywords=(s.getAttribute('data-keywords')||'').toLowerCase();
    var text=s.textContent.toLowerCase();
    if(text.indexOf(q)!==-1||keywords.indexOf(q)!==-1){
      s.classList.remove('hidden-by-search');
    }else{
      s.classList.add('hidden-by-search');
    }
  });
}
function renderHelpAdmin(){
  var helpEl=document.getElementById('tab-help');
  if(!helpEl)return;
  var searchEl=document.getElementById('help-search');
  if(searchEl)searchEl.value='';
  filterHelpSections('');
}
function switchTab(name,el){
  // Ensure we are in the admin view first
  if(window._currentView!=='admin'){
    showView('admin');
  }
  // Fix: find matching nav-tab if el not provided
  if(!el){el=document.querySelector('.nav-tab[aria-controls="tab-'+name+'"]')||document.querySelector('.nav-tab');}
  document.querySelectorAll('.nav-tab').forEach(t=>{t.classList.remove('active');t.setAttribute('aria-selected','false');});
  document.querySelectorAll('.tab-content').forEach(t=>{t.classList.add('hidden');t.setAttribute('aria-hidden','true');});
  if(el){el.classList.add('active');el.setAttribute('aria-selected','true');}
  // Update bottom nav active state
  document.querySelectorAll('.bottom-nav-item').forEach(b=>{b.classList.remove('active');});
  var bnItem=document.querySelector('.bottom-nav-item[data-tab="'+name+'"]');
  if(bnItem)bnItem.classList.add('active');
  const tabEl=document.getElementById('tab-'+name);
  if(!tabEl){console.error('Tab not found:',name);return;}
  tabEl.classList.remove('hidden');
  tabEl.setAttribute('aria-hidden','false');
  // Scroll admin content to top on tab switch
  const ac=document.querySelector('.admin-content');
  if(ac){ac.scrollTop=0;}
  window.scrollTo({top:0,behavior:'instant'});
  if(name==='settings'){renderAdmin();}
  if(name==='categories') showSkeletonThenRender('categories-list-admin',function(){return createSkeletonCards(3)},renderCategoriesAdmin,300);
  if(name==='teams') showSkeletonThenRender('teams-grid-admin',function(){return createSkeletonCards(3)},renderTeamsAdmin,300);
  if(name==='credits') renderCreditsAdmin();
  if(name==='settings') renderStatsGrid();
  if(name==='settings') renderSettingsDashboard();
  if(name==='settings'){var firstSubtab=document.querySelector('.settings-subtab.active');switchSettingsSubtab('dashboard',firstSubtab);}
  if(name==='appearance') renderThemeGrid();
  if(name==='reports') renderBugReportsAdmin();
  if(name==='bug-reports') renderBugReportsTab();
  if(name==='help') renderHelpAdmin();
  // V14: Show notification to update external library when import tab opens
  if(name==='import'){
    try{
      var extUrl=document.getElementById('ext-lib-url');
      if(extUrl&&extUrl.value.trim()){
        // Check if auto-update on open is enabled
        if(state.settings.extUpdateOnOpen===true){
          setTimeout(function(){
            if(typeof fetchExternalLibrary==='function'){
              fetchExternalLibrary();
            }
          },500);
        }else{
          // Show notification suggesting update
          setTimeout(function(){
            showExtLibUpdateNotification();
          },600);
        }
      }
      // Always update last-update display
      if(typeof updateExtLibLastUpdate==='function') updateExtLibLastUpdate();
    }catch(e){console.warn('[switchTab] ext lib notification error:',e);}
  }
}
function renderAdmin(){
  const s=state.settings;
  document.getElementById('admin-comp-name-header').textContent=s.name;
  document.getElementById('s-comp-name').value=s.name;
  try{document.getElementById('s-password').value=state.settings.password.startsWith('v9:')?'':decodeURIComponent(escape(atob(s.password))).replace('_quiz_salt_v6','');}catch(e){document.getElementById('s-password').value=state.settings.password.startsWith('v9:')?'':s.password;}
  document.getElementById('s-welcome').value=s.welcomeMessage;
  document.getElementById('s-default-time').value=s.defaultTime;
  document.getElementById('s-hard-pts').value=s.hardPoints||2;
  document.getElementById('s-sound-correct').value=s.soundCorrect;
  if(s.soundCorrect==='custom')document.getElementById('custom-correct-wrap').style.display='block';
  if(s.soundWrong==='custom')document.getElementById('custom-wrong-wrap').style.display='block';
  document.getElementById('s-sound-wrong').value=s.soundWrong;
  const _hncEl=document.getElementById('s-hide-nav-on-cats');if(_hncEl)_hncEl.checked=s.hideNavOnCats!==false;
  document.getElementById('s-music-type').value=s.musicType||'builtin';
  // Show/hide custom music section based on current music type
  var _cms=document.getElementById('custom-music-section');
  if(_cms)_cms.style.display=(s.musicType==='custom')?'block':'none';
  document.getElementById('s-music-vol').value=s.musicVol||40;
  document.getElementById('vol-display').textContent=(s.musicVol||40)+'%';
  // Sound volume sliders
  const _cvEl=document.getElementById('s-correct-vol');if(_cvEl)_cvEl.value=s.soundCorrectVol!=null?s.soundCorrectVol:80;
  const _cvDsp=document.getElementById('correct-vol-display');if(_cvDsp)_cvDsp.textContent=(s.soundCorrectVol!=null?s.soundCorrectVol:80)+'%';
  const _wvEl=document.getElementById('s-wrong-vol');if(_wvEl)_wvEl.value=s.soundWrongVol!=null?s.soundWrongVol:80;
  const _wvDsp=document.getElementById('wrong-vol-display');if(_wvDsp)_wvDsp.textContent=(s.soundWrongVol!=null?s.soundWrongVol:80)+'%';
  document.getElementById('s-tense-sec').value=s.tenseSeconds||10;
  // إعدادات جديدة
  document.getElementById('s-progressive-reveal').checked=!!s.progressiveReveal;
  const riEl=document.getElementById('s-reveal-interval');if(riEl)riEl.value=s.revealInterval||800;
  const sqEl=document.getElementById('s-shuffle-questions');if(sqEl)sqEl.checked=!!s.shuffleQuestions;
  const soEl=document.getElementById('s-shuffle-options');if(soEl)soEl.checked=!!s.shuffleOptions;
  const sbEl=document.getElementById('s-bank-size');if(sbEl)sbEl.value=s.bankSize||0;
  const tesEl=document.getElementById('s-time-extend-secs');if(tesEl)tesEl.value=s.timeExtendSeconds||15;
  const snEl=document.getElementById('s-backup-name');if(snEl)snEl.value=s.backupNameFormat||'date';
  const scEl=document.getElementById('s-backup-content');if(scEl)scEl.value=s.backupContent||'full';
  // New settings sync
  const teaEl=document.getElementById('s-timer-end-action');if(teaEl)teaEl.value=s.timerEndAction||'reveal';
  var vtmEl=document.getElementById('setting-videoTimerMode');if(vtmEl)vtmEl.value=s.videoTimerMode||'auto';
  const asmEl=document.getElementById('s-auto-start-music');if(asmEl)asmEl.checked=!!s.autoStartMusic;
  const rsnEl=document.getElementById('s-reset-scores-new');if(rsnEl)rsnEl.checked=s.resetScoresOnNew!==false;
  const sllEl=document.getElementById('s-show-lifelines');if(sllEl)sllEl.checked=s.showLifelines!==false;
  const slzEl=document.getElementById('s-show-ll-zero');if(slzEl)slzEl.checked=!!s.showLifelinesWhenZero;
  const cisEl=document.getElementById('s-cat-icon-size');if(cisEl)cisEl.value=s.catIconSize||100;
  applyCatIconScale(s.catIconSize||100);
  document.getElementById('s-confirm-answer').checked=!!s.confirmAnswer;
  var _rcCheckbox=document.getElementById('s-refresh-confirm');if(_rcCheckbox)_rcCheckbox.checked=!!s.showRefreshConfirm;
  const htbf=document.getElementById('s-host-tf-fitb');if(htbf)htbf.checked=(s.showHostTfBtnsOnFitb!==false);
  const smpEl2=document.getElementById('s-show-manual-point');if(smpEl2)smpEl2.checked=s.showManualPoint!==false;
  const mao=document.getElementById('match-all-or-nothing');if(mao)mao.checked=!!s.matchAllOrNothing;
  const osm=document.getElementById('s-order-scoring-mode');if(osm)osm.value=s.orderScoringMode||'all';
  const aps=document.getElementById('s-audience-play-sounds');if(aps)aps.checked=s.audiencePlaySounds!==false;
  // Sync new checkboxes
  const _sShowSoloReview=document.getElementById('s-show-solo-review');if(_sShowSoloReview)_sShowSoloReview.checked=s.showSoloReview===true;
  const _sShowSoloQuickSetup=document.getElementById('s-show-solo-quicksetup');if(_sShowSoloQuickSetup)_sShowSoloQuickSetup.checked=s.showSoloQuickSetup===true;
  const _sSoloEnableFreeze=document.getElementById('s-solo-enable-freeze');if(_sSoloEnableFreeze)_sSoloEnableFreeze.checked=s.soloEnableFreeze!==false;
  const _sSoloEnableDouble=document.getElementById('s-solo-enable-double');if(_sSoloEnableDouble)_sSoloEnableDouble.checked=s.soloEnableDouble!==false;
  const _sShowBugReports=document.getElementById('s-show-bug-reports-tab');if(_sShowBugReports)_sShowBugReports.checked=s.showBugReportsTab===true;
  const _sShowErrorScreen=document.getElementById('s-show-error-screen');if(_sShowErrorScreen)_sShowErrorScreen.checked=s.showErrorScreen===true;
  const csEl=document.getElementById('s-credits-style');if(csEl)csEl.value=s.creditsStyle||'normal';
  const csWrap=document.getElementById('s-cinematic-speed-wrap');if(csWrap)csWrap.style.display=(s.creditsStyle==='cinematic')?'block':'none';
  const csDur=document.getElementById('s-cinematic-speed');if(csDur)csDur.value=s.cinematicDuration||40;
  const autoTr=s.autoTransition!==false;
  document.getElementById('s-auto-transition').value=autoTr?'auto':'manual';
  document.getElementById('s-transition-delay').value=s.autoTransitionDelay||0;
  const bi=s.backupInterval||0;
  const biSel=document.getElementById('s-backup-interval');
  if(biSel){
    const opts=['0','15','30','60','120'];
    biSel.value=opts.includes(String(bi))?String(bi):'custom';
    const cw=document.getElementById('backup-custom-wrap');
    if(cw)cw.style.display=biSel.value==='custom'?'block':'none';
    if(biSel.value==='custom'){const ci=document.getElementById('s-backup-custom');if(ci)ci.value=bi;}
  }
  updateBackupStatus();
  const fs=s.fontScale||100;
  document.getElementById('s-font-scale').value=fs;
  document.getElementById('font-scale-display').textContent=fs+'%';
  // Sync the appearance tab font scale slider too
  const fsAppSlider=document.getElementById('s-font-scale-appearance');
  if(fsAppSlider)fsAppSlider.value=fs;
  const fsAppDisp=document.getElementById('font-scale-appearance-display');
  if(fsAppDisp)fsAppDisp.textContent=fs+'%';
  applyFontScale(fs);
  // Restore custom audio display names
  document.getElementById('custom-music-name').textContent=s.customMusicData?I18n.t('admin.fileLoaded'):I18n.t('admin.notChosen');
  document.getElementById('custom-correct-name').textContent=s.customCorrectData?I18n.t('admin.fileLoaded'):I18n.t('admin.builtIn');
  document.getElementById('custom-wrong-name').textContent=s.customWrongData?I18n.t('admin.fileLoaded'):I18n.t('admin.builtIn');
  const pmn=document.getElementById('podium-music-name');if(pmn)pmn.textContent=s.podiumMusicData?I18n.t('admin.fileLoaded'):I18n.t('admin.notChosen');
  const pmv=document.getElementById('s-podium-music-vol');if(pmv)pmv.value=s.podiumMusicVol??60;
  const pvd=document.getElementById('podium-vol-display');if(pvd)pvd.textContent=(s.podiumMusicVol??60)+'%';
  const pml=document.getElementById('s-podium-music-loop');if(pml)pml.checked=!!s.podiumMusicLoop;
  const cdm=document.getElementById('s-cat-display-mode');if(cdm)cdm.value=s.catDisplayMode||'grid';
  const ccs=document.getElementById('s-cat-card-size');if(ccs)ccs.value=s.catCardSize||100;
  applyCatCardScale(s.catCardSize||100);
  const csl=document.getElementById('s-cat-switcher-location');if(csl)csl.value=s.catSwitcherLocation||'both';
  // Container play mode sync
  const cpm=document.getElementById('s-container-play-mode');if(cpm)cpm.value=s.containerPlayMode||'normal';
  const caa=document.getElementById('s-container-auto-advance');if(caa)caa.checked=(s.containerAutoAdvance!==false);
  _toggleContainerOpts();
  // Answer label style sync
  const alsEl=document.getElementById('s-answer-label-style');if(alsEl)alsEl.value=s.answerLabelStyle||'arabic';
  const clsEl=document.getElementById('custom-labels-section');if(clsEl)clsEl.style.display=(s.answerLabelStyle==='custom')?'block':'none';
  const clInp=document.getElementById('custom-labels-input');if(clInp)clInp.value=s.customLabels||'';
  // V7 S4 — sync new audio settings to UI
  const ama=document.getElementById('s-auto-mute-admin');if(ama)ama.checked=(s.autoMuteOnAdmin!==false);
  const wmv=document.getElementById('s-wheel-music-vol');if(wmv){wmv.value=s.wheelMusicVol||50;const d=document.getElementById('wheel-vol-display');if(d)d.textContent=(s.wheelMusicVol||50)+'%';}
  const wn=document.getElementById('wheel-music-name');if(wn&&s.wheelMusicData)wn.textContent=I18n.t('admin.fileUploaded');
  const spm=document.getElementById('s-presentation-mode');
  if(spm){
    spm.value=s.presentationMode||'direct';
    const seqWrap=document.getElementById('seq-options-wrap');
    if(seqWrap)seqWrap.style.display=(s.presentationMode&&s.presentationMode!=='direct')?'block':'none';
  }
  const skEl=document.getElementById('s-seq-keyboard');if(skEl)skEl.checked=!!s.seqKeyboard;
  // Sync volume slider
  document.getElementById('s-music-vol').value=s.musicVol||40;
  document.getElementById('vol-display').textContent=(s.musicVol||40)+'%';
  document.getElementById('s-closing-msg').value=s.closingMessage||'';
  document.getElementById('ll-fifty').value=s.llFifty??1;
  document.getElementById('ll-time').value=s.llTime??1;
  document.getElementById('ll-skip').value=s.llSkip??1;
  selectMode(s.compMode||'turns',true);
  renderStatsGrid();
  // Update question bank stats
  _updateBankStats();
  renderThemeGrid();          // ← always re-render theme grid
  renderCategoriesAdmin();    // ← sync categories list
  renderTeamsAdmin();         // ← sync teams list
  applyTheme(s.theme||'space');
  populateColorSwatches('color-swatches','cat-color-input',CAT_COLORS);
  populateColorSwatches('team-color-swatches','team-color-input',TEAM_COLORS);
  restoreBackupInterval();
  initSessionStats();
  restoreV5Settings();        // ← sync V5 settings UI
  // Sync certificate settings UI safely
  if(typeof _syncCertSettingsUI==='function')_syncCertSettingsUI();
  // Restore custom theme panel visibility
  const ctp=document.getElementById('custom-theme-panel');
  if(ctp) ctp.style.display=(s.theme==='custom')?'block':'none';
  // V14: Initialize notification bell in admin header
  if(typeof NotificationCenter!=='undefined'&&NotificationCenter._renderBell)NotificationCenter._renderBell();
}
function _updateBankStats(){
  const bankStatsEl=document.getElementById('q-bank-stats');
  if(!bankStatsEl) return;
  const totalCats=state.categories.length;
  const totalQs=state.categories.reduce((a,c)=>a+(c.questions||[]).length,0);
  const supportedQs=state.categories.reduce((a,c)=>a+(c.questions||[]).filter(q=>!SOLO_UNSUPPORTED_TYPES.includes(q.type)).length,0);
  bankStatsEl.innerHTML=`📊 ${totalCats} ${I18n.t('admin.categoriesCount','أقسام')} · ❓ ${totalQs} ${I18n.t('admin.questionsCount','أسئلة')} · 🎮 ${supportedQs} ${I18n.t('admin.soloQuestions','أسئلة الوضع الفردي')}`;
}
function renderStatsGrid(){
  const tq=state.categories.reduce((a,c)=>a+c.questions.length,0);
  const statsData=[
    {l:I18n.t('statsGrid.categories'),v:state.categories.length,i:'📂',c:'var(--accent1)'},
    {l:I18n.t('statsGrid.questions'),v:tq,i:'❓',c:'var(--accent2)'},
    {l:I18n.t('statsGrid.teams'),v:state.teams.length,i:'👥',c:'var(--success)'},
    {l:I18n.t('statsGrid.credits'),v:(state.credits||[]).filter(c=>c&&c.name&&String(c.name).trim()).length,i:'🌟',c:'#a78bfa'},
  ];
  const el=document.getElementById('stats-grid');
  if(el){
    // V10: Using h() DOM builder instead of innerHTML — safe from XSS
    const children=statsData.map(s=>
      h('div.stat-card',
        h('div',{style:{fontSize:'1.5rem',marginBottom:'3px'}},s.i),
        h('div',{style:{fontSize:'1.7rem',fontWeight:'900',color:s.c}},s.v),
        h('div',{style:{fontSize:'.78rem',color:'var(--text-secondary)'}},s.l)
      )
    );
    setChildren(el,children);
  }
}
// ════════════════════════════════════════════════════════
//  SETTINGS DASHBOARD
// ════════════════════════════════════════════════════════
function renderSettingsDashboard(){
  // Quick stats
  var totalQ=0,totalCats=state.categories.length,totalTeams=state.teams.length;
  var typeCounts={text:0,tf:0,math:0,quran:0,order:0,match:0,fitb:0,image:0,audio:0,video:0};
  state.categories.forEach(function(c){
    (c.questions||[]).forEach(function(q){
      totalQ++;
      var t=q.type||'text';
      if(typeCounts[t]!==undefined)typeCounts[t]++;else typeCounts.text++;
    });
  });
  var sessions=0;
  try{var sh=state.scoreHistory||[];sessions=sh.length;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_94")}catch(_){}}
  // Update stat cards
  var el;
  el=document.getElementById('dash-total-q');if(el)el.textContent=totalQ;
  el=document.getElementById('dash-total-cats');if(el)el.textContent=totalCats;
  el=document.getElementById('dash-total-teams');if(el)el.textContent=totalTeams;
  el=document.getElementById('dash-sessions');if(el)el.textContent=sessions;
  // Show contextual tips for empty states
  try{
    var tipCats=document.getElementById('tip-no-cats');
    var tipTeams=document.getElementById('tip-no-teams');
    if(tipCats)tipCats.style.display=(state.categories.length===0)?'block':'none';
    if(tipTeams)tipTeams.style.display=(state.teams.length===0)?'block':'none';
  }catch(e){}
  // Rotating daily tip
  try{
    var dailyTipEl=document.getElementById('dash-daily-tip');
    if(dailyTipEl){
      var _dashTips=[
        '💡 نصيحة اليوم: استخدم "تصدير" بانتظام لحفظ نسخة احتياطية من مسابقتك',
        '💡 نصيحة اليوم: جرب وضع البازر لإثارة حماس المنافسة بين الفرق',
        '💡 نصيحة اليوم: يمكنك إضافة أسئلة شرطية تظهر فقط عند الإجابة الصحيحة على سؤال سابق',
        '💡 نصيحة اليوم: الأقسام الحاوية تتيح تنظيم المسابقة في مراحل متتالية',
        '💡 نصيحة اليوم: جرب الثيمات المختلفة من تبويب "المظهر" — 19 ثيم متاح',
        '💡 نصيحة اليوم: يمكنك استيراد مكتبة الأسئلة المدمجة للبدء بسرعة',
        '💡 نصيحة اليوم: اضغط F11 لملء الشاشة أثناء العرض',
        '💡 نصيحة اليوم: أطواق النجاة (50/50، وقت إضافي، تمرير) تضيف إثارة للمسابقة',
        '💡 نصيحة اليوم: جرب وضع اللعب الفردي للتدرب بمفردك',
        '💡 نصيحة اليوم: يمكنك تعديل نقاط كل سؤال individually من محرر السؤال'
      ];
      var tipIdx=Math.floor(Date.now()/86400000)%_dashTips.length;
      dailyTipEl.textContent=_dashTips[tipIdx];
      dailyTipEl.style.display='block';
    }
  }catch(e){}
  // Quiz status
  el=document.getElementById('dash-quiz-status');
  if(el){
    var status='لم تبدأ';
    try{if(state.gameStarted)status='في الدور';else if(state.gameFinished)status='انتهت';}catch(e){try{ErrorBus.capture(e,"catch#AUTO_95")}catch(_){}}
    el.textContent=status;
    el.style.color=status==='في الدور'?'#00e676':status==='انتهت'?'#ff3b5c':'var(--text-muted)';
  }
  el=document.getElementById('dash-quiz-mode');
  if(el){
    var modeLabels={turns:t('mode.turns'),buzzer:t('mode.buzzer'),fastest:t('mode.fastest'),board:t('mode.board'),solo:t('mode.solo'),practice:t('mode.practice')};
    el.textContent=modeLabels[state.settings.compMode]||state.settings.compMode;
  }
  el=document.getElementById('dash-last-activity');
  if(el){
    try{
      var lastAct=0;
      (state.scoreAudit||[]).forEach(function(a){if(a.ts>lastAct)lastAct=a.ts;});
      if(lastAct>0){
        var diff=Date.now()-lastAct;
        if(diff<60000)el.textContent=t('time.justNow');
        else if(diff<3600000)el.textContent=t('time.minutesAgo',{n:Math.floor(diff/60000)});
        else if(diff<86400000)el.textContent=t('time.hoursAgo',{n:Math.floor(diff/3600000)});
        else el.textContent=t('time.daysAgo',{n:Math.floor(diff/86400000)});
      }else{el.textContent='—';}
    }catch(e){el.textContent='—';}
  }
  // Section completion indicators
  el=document.getElementById('dash-section-indicators');
  if(el&&state.soloProgress){
    var html='';
    state.categories.slice(0,4).forEach(function(cat){
      if(cat.type==='tiebreaker')return;
      var mastery=_getSectionMastery(cat.id);
      var color=mastery>=80?'#00e676':mastery>=50?'#ffc107':'#ff3b5c';
      html+='<div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;font-size:.72rem">';
      html+='<span style="min-width:50px">'+(cat.icon||'📚')+' '+cat.name.substring(0,10)+'</span>';
      html+='<div style="flex:1;height:5px;background:rgba(128,128,128,.1);border-radius:3px;overflow:hidden">';
      html+='<div style="width:'+mastery+'%;height:100%;background:'+color+';border-radius:3px"></div>';
      html+='</div>';
      html+='<span style="color:'+color+';font-weight:700">'+mastery+'%</span>';
      html+='</div>';
    });
    el.innerHTML=html;
  }
  // Draw pie chart
  _drawDashPieChart(typeCounts);
}
function _drawDashPieChart(typeCounts){
  var canvas=document.getElementById('dash-qtype-chart');
  if(!canvas)return;
  // High-DPI canvas support
  var dpr=window.devicePixelRatio||1;
  var displayW=canvas.clientWidth||240;
  var displayH=canvas.clientHeight||240;
  if(canvas.width!==displayW*dpr||canvas.height!==displayH*dpr){
    canvas.width=displayW*dpr;
    canvas.height=displayH*dpr;
  }
  var ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  var w=displayW,h=displayH;
  var cx=w/2,cy=h/2,r=Math.min(cx,cy)-12;
  var innerR=r*0.52;
  ctx.clearRect(0,0,w,h);
  var typeLabels={text:t('type.text'),tf:t('type.tf'),math:t('type.math'),quran:t('type.quran'),order:t('type.order'),match:t('type.match'),fitb:t('type.fitb'),image:t('type.image'),audio:t('type.audio'),video:t('type.video')};
  var typeColors={text:'#00d4ff',tf:'#00e676',math:'#a78bfa',quran:'#ffc107',order:'#ff9800',match:'#e040fb',fitb:'#00bcd4',image:'#ff5252',audio:'#7c5cfc',video:'#ff3b5c'};
  var total=0;
  Object.values(typeCounts).forEach(function(v){total+=v;});
  if(total===0){
    // Draw empty state
    ctx.beginPath();ctx.arc(cx,cy,r,0,2*Math.PI);
    ctx.arc(cx,cy,innerR,0,2*Math.PI,true);
    ctx.fillStyle='rgba(128,128,128,.08)';ctx.fill();
    ctx.fillStyle='rgba(128,128,128,.4)';ctx.font='bold 13px Cairo';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(t('empty.noQuestions'),cx,cy);
    return;
  }
  var startAngle=-Math.PI/2;
  var legendEl=document.getElementById('dash-qtype-legend');
  var legendHtml='';
  var activeEntries=Object.entries(typeCounts).filter(function(e){return e[1]>0;});
  activeEntries.forEach(function(entry,idx){
    var type=entry[0],count=entry[1];
    var sliceAngle=(count/total)*2*Math.PI;
    var midAngle=startAngle+sliceAngle/2;
    var gap=0.02;
    // Draw donut slice with gap
    ctx.beginPath();
    ctx.arc(cx,cy,r,startAngle+gap,startAngle+sliceAngle-gap);
    ctx.arc(cx,cy,innerR,startAngle+sliceAngle-gap,startAngle+gap,true);
    ctx.closePath();
    var color=typeColors[type]||'#999';
    // Gradient fill
    var gx1=cx+r*0.6*Math.cos(midAngle),gy1=cy+r*0.6*Math.sin(midAngle);
    var gx2=cx+r*Math.cos(midAngle),gy2=cy+r*Math.sin(midAngle);
    try{
      var grad=ctx.createLinearGradient(gx1,gy1,gx2,gy2);
      grad.addColorStop(0,color);grad.addColorStop(1,color+'cc');
      ctx.fillStyle=grad;
    }catch(e){ctx.fillStyle=color;}
    ctx.fill();
    // Shadow/border
    ctx.strokeStyle='rgba(26,26,46,.6)';ctx.lineWidth=1.5;ctx.stroke();
    // Percentage label on slice (if large enough)
    var pct=Math.round(count/total*100);
    if(pct>=6){
      var labelR=(r+innerR)/2;
      var lx=cx+labelR*Math.cos(midAngle),ly=cy+labelR*Math.sin(midAngle);
      ctx.fillStyle='#fff';ctx.font='bold '+Math.max(10,r/12)+'px Cairo';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=3;
      ctx.fillText(pct+'%',lx,ly);
      ctx.shadowBlur=0;
    }
    startAngle+=sliceAngle;
    legendHtml+='<span style="display:flex;align-items:center;gap:3px;padding:2px 6px;border-radius:4px;background:'+(typeColors[type]||'#999')+'12;border:1px solid '+(typeColors[type]||'#999')+'33"><span style="width:8px;height:8px;border-radius:2px;background:'+(typeColors[type]||'#999')+'"></span><span style="font-weight:600">'+(typeLabels[type]||type)+'</span><span style="color:var(--text-muted)">'+count+'</span></span>';
  });
  // Center text
  ctx.fillStyle='var(--accent1)';ctx.font='bold '+Math.max(16,r/4)+'px Cairo';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(total,cx,cy-6);
  ctx.fillStyle='rgba(128,128,128,.6)';ctx.font='500 '+Math.max(9,r/10)+'px Cairo';
  ctx.fillText('سؤال',cx,cy+12);
  if(legendEl)legendEl.innerHTML=legendHtml;
}
function updateMusicVol(val){
  state.settings.musicVol = val;
  saveState();
  const pct = val / 100;
  setMusicVolume(pct);
  // Update all volume display elements
  const els=[
    ['vol-display', val+'%'],
    ['pres-vol-display', val+'%'],
  ];
  els.forEach(([id,txt])=>{const e=document.getElementById(id);if(e)e.textContent=txt;});
  // Sync sliders bidirectionally
  ['s-music-vol','pres-vol-slider','gm-vol-slider'].forEach(id=>{
    const el=document.getElementById(id);if(el&&+el.value!==val)el.value=val;
  });
  syncGlobalMusicWidget();
}
function updateSetting(key,val){
  // V9: Sanitize user-provided text settings
  if(key==='name'||key==='welcomeMessage')val=_sanitizeUser(val);
  // V9: Hash password asynchronously with SHA-256
  if(key==='password'){
    const plain=val||'1234';
    _hashPwdAsync(plain).then(hashed=>{
      state.settings.password=hashed;
      saveState();
      // V10: Notify AppState watchers
      AppState.set('settings.password',hashed);
    }).catch(()=>{
      state.settings.password=_hashPwdLegacy(plain);
      saveState();
      AppState.set('settings.password',state.settings.password);
    });
    return;
  }
  state.settings[key]=val;saveState();
  // V10: Notify AppState watchers about settings change
  AppState.set('settings.'+key,val);
  if(key==='name') document.getElementById('admin-comp-name-header').textContent=val;
  if(key==='musicVol') document.getElementById('vol-display').textContent=val+'%';
}
function selectMode(mode,silent=false){
  state.settings.compMode=mode;
  document.querySelectorAll('.mode-card').forEach(c=>c.classList.remove('selected'));
  const c=document.getElementById('mode-card-'+mode);if(c)c.classList.add('selected');
  if(!silent)saveState();
  // Update solo button visibility
  const isSoloMode=mode==='solo'||mode==='practice';
  const hasQuestions=getPlayableCats({withQuestions:true}).length>0;
  const show=isSoloMode&&hasQuestions;
  const soloBtn=document.getElementById('login-solo-btn');
  if(soloBtn) soloBtn.style.display=show?'flex':'none';
  const lbBtn=document.getElementById('login-lb-btn');
  if(lbBtn) lbBtn.style.display=show?'flex':'none';
  const adminSoloBtn=document.getElementById('admin-solo-btn');
  if(adminSoloBtn) adminSoloBtn.style.display=show?'inline-flex':'none';
}
function stepValue(id,delta){
  const el=document.getElementById(id);
  el.value=Math.max(+(el.min)||0,(+el.value||0)+delta);
  el.dispatchEvent(new Event('input'));
}

// ═══════════════════════════════════════════════════════
//  V12: HELPER — Get playable categories (excludes container & tiebreaker, respects parentId)
// ═══════════════════════════════════════════════════════
function getPlayableCats(opts){
  opts=opts||{};
  var cats=state.categories;
  if(opts.all){
    // All non-tiebreaker, non-container categories (including subcategories)
    return cats.filter(c=>c.type!=='tiebreaker'&&c.type!=='container');
  }
  if(opts.withQuestions){
    return cats.filter(c=>c.type!=='tiebreaker'&&c.type!=='container'&&c.questions&&c.questions.length>0);
  }
  // Default: top-level playable categories (no parentId, not tiebreaker, not container)
  return cats.filter(c=>c.type!=='tiebreaker'&&c.type!=='container'&&!c.parentId);
}
// Get total question count from playable categories
function getPlayableQuestionCount(){
  return state.categories.filter(c=>c.type!=='tiebreaker'&&c.type!=='container').reduce((sum,c)=>sum+(c.questions?c.questions.length:0),0);
}
// ═══════════════════════════════════════════════════════
//  V12: CONTAINER PLAY MODE HELPERS
// ═══════════════════════════════════════════════════════
// Get all container categories sorted by containerOrder
function getOrderedContainers(){
  return state.categories.filter(c=>c.type==='container').sort((a,b)=>{
    var oa=a.containerOrder||999,ob=b.containerOrder||999;
    if(oa!==ob)return oa-ob;
    return state.categories.indexOf(a)-state.categories.indexOf(b);
  });
}
// Check if a container category is fully completed (all sub-category questions used)
function isContainerCompleted(containerId){
  var subCats=state.categories.filter(c=>c.parentId===containerId&&c.type!=='container'&&c.type!=='tiebreaker');
  if(subCats.length===0)return true;
  return subCats.every(function(sub){
    var used=state.usedQuestions[sub.id]||new Set();
    return sub.questions.length<=used.size;
  });
}
// Get the current sequential container based on progress
function getCurrentSequentialContainer(){
  var containers=getOrderedContainers();
  for(var i=0;i<containers.length;i++){
    if(!isContainerCompleted(containers[i].id)){
      return{container:containers[i],index:i,total:containers.length};
    }
  }
  return null; // All completed
}
// Get progress info for a container (completed sub-cats / total sub-cats)
function getContainerProgress(containerId){
  var subCats=state.categories.filter(c=>c.parentId===containerId&&c.type!=='container'&&c.type!=='tiebreaker');
  var completed=subCats.filter(function(sub){
    var used=state.usedQuestions[sub.id]||new Set();
    return sub.questions.length<=used.size;
  }).length;
  return{completed:completed,total:subCats.length,pct:subCats.length>0?Math.round(completed/subCats.length*100):100};
}
// Get the stage label for a container
function getContainerStageLabel(cat){
  if(cat.stageLabel)return cat.stageLabel;
  var containers=getOrderedContainers();
  var idx=containers.findIndex(c=>c.id===cat.id);
  var stageNames=['المرحلة الأولى','المرحلة الثانية','المرحلة الثالثة','المرحلة الرابعة','المرحلة الخامسة','المرحلة السادسة','المرحلة السابعة','المرحلة الثامنة','المرحلة التاسعة','المرحلة العاشرة'];
  return idx>=0&&idx<stageNames.length?stageNames[idx]:'المرحلة '+(idx+1);
}
// Toggle sequential options visibility in settings
function _toggleContainerOpts(){
  var modeEl=document.getElementById('s-container-play-mode');
  var seqOpts=document.getElementById('container-sequential-opts');
  if(seqOpts&&modeEl){
    seqOpts.style.display=modeEl.value==='sequential'?'block':'none';
  }
}

// ═══════════════════════════════════════════════════════
//  CATEGORIES ADMIN
// ═══════════════════════════════════════════════════════
function renderCategoriesAdmin(){
  const el=document.getElementById('categories-list-admin');
  if(!state.categories.length){var _catTip=state.categories.length===1?'💡 أضف المزيد من الأقسام لتنويع المسابقة':null;setChildren(el,createEmptyState({iconType:'categories',title:'أنشئ قسمك الأول لبدء المسابقة',description:'الأقسام تجمع الأسئلة حسب الموضوع أو المرحلة',actionText:'إنشاء قسم',actionFn:function(){openCatModal()},tipText:_catTip}));return}
  // Filter categories based on search term (if any)
  const searchTerm=(state.catSearchTerm||'').trim().toLowerCase();
  let filteredCats=state.categories;
  if(searchTerm){
    filteredCats=state.categories.filter(c=>_sanitizeUser(c.name).toLowerCase().includes(searchTerm));
  }
  // Update search count display
  try{
    const countEl=document.getElementById('cat-search-count');
    if(countEl){
      if(searchTerm){
        countEl.textContent=filteredCats.length+' / '+state.categories.length;
        countEl.style.display='block';
      }else{
        countEl.textContent=state.categories.length+' قسم';
        countEl.style.display='block';
      }
    }
    // Sync search input value if not focused (e.g., when cleared programmatically)
    const inputEl=document.getElementById('cat-search-input');
    if(inputEl && document.activeElement!==inputEl){
      inputEl.value=state.catSearchTerm||'';
    }
  }catch(e){}
  if(filteredCats.length===0){
    el.innerHTML='<div style="padding:32px 16px;text-align:center;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:8px">🔍</div><div style="font-size:.9rem">لا توجد أقسام مطابقة لـ "'+_sanitizeUser(searchTerm)+'"</div><button class="btn btn-ghost btn-sm" style="margin-top:12px" onclick="state.catSearchTerm=\'\';renderCategoriesAdmin();">مسح البحث</button></div>';
    return;
  }
  el.innerHTML=filteredCats.map(cat=>{
    // V12: Count subcategories for container type
    const subCount=cat.type==='container'?state.categories.filter(c=>c.parentId===cat.id).length:0;
    return `
    <div class="category-card ${state.currentCatId===cat.id?'selected':''}" data-catid="${cat.id}"
      onclick="selectCatAdmin('${cat.id}')"
      ondragstart="onCatDragStart(event,'${cat.id}')"
      ondragover="onCatDragOver(event,'${cat.id}')"
      ondrop="onCatDrop(event,'${cat.id}')"
      ondragleave="this.classList.remove('drag-over-cat')"
      ondragend="onCatDragEnd()">
      <div style="position:absolute;top:0;right:0;width:4px;height:100%;background:${_safeColor(cat.color)}"></div>
      ${cat.type==='tiebreaker'?'<div style="position:absolute;top:4px;left:4px;font-size:.6rem;padding:1px 6px;border-radius:6px;background:rgba(245,200,66,.15);color:var(--accent1);font-weight:700;border:1px solid rgba(245,200,66,.3)">⚡ حسم</div>':''}
      ${cat.type==='container'?'<div style="position:absolute;top:4px;left:4px;font-size:.6rem;padding:1px 6px;border-radius:6px;background:rgba(0,212,255,.12);color:var(--accent2);font-weight:700;border:1px solid rgba(0,212,255,.3)">📁 حاوي'+(cat.containerOrder?' #'+cat.containerOrder:'')+'</div>':''}
      ${cat.parentId?'<div style="position:absolute;top:4px;left:'+(cat.type==='container'||cat.type==='tiebreaker'?'70px':'4px')+';font-size:.6rem;padding:1px 6px;border-radius:6px;background:rgba(162,89,255,.1);color:var(--accent2);font-weight:700;border:1px solid rgba(162,89,255,.3)">↩ فرعي</div>':''}
      <div style="display:flex;align-items:center;gap:7px;padding-right:8px">
        <span style="font-size:1rem;cursor:grab;color:var(--text-muted);padding:2px" data-touch-drag="cat">⠿</span>
        ${cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" loading="lazy" alt="${_sanitizeUser(cat.name)}" style="width:32px;height:32px;border-radius:6px;object-fit:cover;flex-shrink:0;border:1px solid var(--border)">`:`<span style="font-size:1.4rem">${_sanitizeIcon(cat.icon)||'📂'}</span>`}
        <div><div style="font-weight:700;font-size:.9rem">${_sanitizeUser(cat.name)}</div><div style="font-size:.76rem;color:var(--text-secondary)">${cat.type==='container'?subCount+' قسم فرعي':cat.questions.length+' سؤال'}${cat.type==='tiebreaker'?' — ⚡ حسم':''}${cat.parentId?' — فرعي':''}</div></div>
      </div>
      <div style="display:flex;gap:4px;margin-top:9px">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="event.stopPropagation();openCatModal('${cat.id}')">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="event.stopPropagation();deleteCat('${cat.id}')">🗑️</button>
      </div>
    </div>`;
  }).join('');
  try{initCategoriesSortable(document.getElementById("categories-list-admin"))}catch(e){ErrorBus.capture(e,"renderCategoriesAdmin:sortable")}
  _updateBankStats();
  initKeyboardNavigation();
  /* V14: Long press context menu on category cards */
  var catCards=document.querySelectorAll('.category-card');
  if(catCards.length)GestureManager.initLongPress(catCards,function(card){
    var catId=card.dataset.catid;
    return[
      {icon:'✏️',label:'تعديل',action:function(){openCatModal(catId)}},
      {icon:'📋',label:'نسخ',action:function(){duplicateCategory(catId)}},
      {icon:'🗑️',label:'حذف',danger:true,action:function(){deleteCat(catId)}}
    ];
  });
}
function selectCatAdmin(id){
  state.currentCatId=id;
  state.qSearchTerm='';state.qFilterMode='all';
  renderCategoriesAdmin();renderQuestionsAdmin(id);
  document.getElementById('btn-add-question').classList.remove('hidden');
  const sc=document.getElementById('q-search-container');
  if(sc){sc.classList.remove('hidden');const si=document.getElementById('q-search-input');if(si)si.value='';}
  document.querySelectorAll('.q-filter-btn').forEach(b=>b.classList.toggle('active',b.dataset.filter==='all'));
  // Scroll selected category into view smoothly (fixes "must scroll to edit" issue)
  try{
    requestAnimationFrame(()=>{
      const selected=document.querySelector('.category-card.selected');
      if(selected){
        const list=document.getElementById('categories-list-admin');
        if(list){
          // Use scrollIntoView with block:'nearest' to avoid jumping if already visible
          selected.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});
        }else{
          // Mobile: page-level scroll
          selected.scrollIntoView({behavior:'smooth',block:'center'});
        }
      }
    });
  }catch(e){try{ErrorBus.capture(e,'selectCatAdmin/scroll')}catch(_){}}
}
function renderQuestionsAdmin(catId){
  const cat=state.categories.find(c=>c.id===catId);if(!cat)return;
  document.getElementById('questions-panel-title').innerHTML=`<div class="icon icon-accent">❓</div> ${_sanitizeUser(cat.name)}`;
  const el=document.getElementById('questions-list-admin');
  if(!cat.questions.length){var _qTip=cat.questions&&cat.questions.length<5?'💡 يُفضل 5 أسئلة على الأقل لكل قسم لتجربة أفضل':null;setChildren(el,createEmptyState({iconType:'questions',title:'أضف أسئلة لهذا القسم',description:'الأسئلة هي محتوى المسابقة، أضف أسئلة متنوعة لتجربة أفضل',actionText:'إضافة سؤال',actionFn:function(){openAddQuestion(catId)},tipText:_qTip}));return}
  el.innerHTML=`<div class="questions-list" id="q-sortable-list" ondragover="event.preventDefault()">${cat.questions.map((q,i)=>`
    <div class="question-item" data-qidx="${i}" ondragleave="this.classList.remove('drag-over-q')">
      <div class="question-drag-handle" data-touch-drag="q" title="اسحب لإعادة الترتيب" data-i18n="title.dragToReorder" data-i18n-attr="title">⠿</div>
      <div class="question-num">${i+1}</div>
      <div class="question-body">
        <div class="question-text">
          ${q.type==='image'?'<span class="q-type-badge q-type-img">'+I18n.t('qbadge.image')+'</span>':q.type==='audio'?'<span class="q-type-badge q-type-audio">'+I18n.t('qbadge.audio')+'</span>':q.type==='video'?'<span class="q-type-badge" style="background:rgba(167,139,250,.12);color:#a78bfa;border:1px solid rgba(167,139,250,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">'+I18n.t('qbadge.video')+'</span>':q.type==='math'?'<span class="q-type-badge q-type-math">'+I18n.t('qbadge.math')+'</span>':q.type==='tf'?'<span class="q-type-badge" style="background:rgba(0,230,118,.12);color:var(--success);border:1px solid rgba(0,230,118,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">'+I18n.t('qbadge.tf')+'</span>':q.type==='fitb'?'<span class="q-type-badge" style="background:rgba(0,212,255,.1);color:var(--accent2);border:1px solid rgba(0,212,255,.25);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">'+I18n.t('qbadge.fitb')+'</span>':q.type==='quran'?'<span class="q-type-badge" style="background:rgba(245,200,66,.12);color:var(--accent1);border:1px solid rgba(245,200,66,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">'+I18n.t('qbadge.quran')+'</span>':q.type==='order'?'<span class="q-type-badge" style="background:rgba(167,139,250,.1);color:#a78bfa;border:1px solid rgba(167,139,250,.25);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">'+I18n.t('qbadge.order')+'</span>':q.type==='match'?'<span class="q-type-badge" style="background:rgba(255,179,0,.12);color:var(--accent1);border:1px solid rgba(255,179,0,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">'+I18n.t('qbadge.match')+'</span>':''}
          ${_sanitize(q.text)}
        </div>
        ${q.type==='image'&&q.mediaData?`<div style="margin-top:5px"><img src="${_safeMediaSrc(q.mediaData)}" style="max-height:48px;max-width:120px;border-radius:6px;border:1px solid var(--border);object-fit:cover" alt=""></div>`:''}
        ${q.type==='audio'&&q.mediaData?`<div style="font-size:.72rem;color:var(--accent2);margin-top:3px">🎵 مقطع صوتي مرفق</div>`:''}
        ${q.type==='video'&&(q.mediaData||q.videoRef)?`<div style="font-size:.72rem;color:#a78bfa;margin-top:3px">🎬 فيديو مرفق</div>`:''}
        ${q.mediaAttachment?`<div style="font-size:.72rem;color:${q.mediaAttachment.type==='video'?'#a78bfa':'var(--accent2)'};margin-top:3px">${q.mediaAttachment.type==='video'?'🎬 فيديو ملحق':'🎵 صوتي ملحق'}</div>`:''}
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          <span class="diff-badge ${DIFF_CLASS[q.difficulty||'medium']}">${DIFF_LABELS[q.difficulty||'medium']}</span>
          <span style="font-size:.74rem;color:var(--text-muted)">⏱${q.time||state.settings.defaultTime}ث</span>
          ${q.difficulty==='hard'?`<span style="font-size:.74rem;color:var(--accent1)">✦ ${state.settings.hardPoints||2} نقطة</span>`:''}
        </div>
             <div class="question-options">${(q.options||[]).map((o,oi)=>{
          const hasImg=!!(q.optionImages&&q.optionImages[oi]);
          const hasMath=!!(o&&o.includes('$'));
          if(!o&&!hasImg)return '';
          const cls=['option-pill',oi===q.correct?'correct':'',hasImg?'has-img':'',hasMath?'has-math':''].filter(Boolean).join(' ');
          const label=o||(hasImg?'[صورة]':'');
          return '<span class="'+cls+'">'+getAnswerLabel(oi)+'. '+_sanitizeUser(label.length>18?label.slice(0,16)+'…':label)+'</span>';
        }).join('')}</div>
        ${q.explanation?`<div style="font-size:.73rem;color:var(--accent2);margin-top:3px">💡 ${_sanitize(q.explanation)}</div>`:''}
      </div>
      <div class="question-actions">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="duplicateQuestion('${catId}','${q.id}')" title="نسخ السؤال" data-label="نسخ" aria-label="نسخ السؤال">📋</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="cloneQuestion('${catId}',${i})" title="استنساخ" data-label="استنساخ" aria-label="استنساخ السؤال">🔄</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="generateMultipleQuestions('${catId}',${i},3)" title="توليد متعدد" data-label="توليد" aria-label="توليد متعدد">🔢</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="openQuestionModal('${catId}','${q.id}')" title="تعديل" data-label="تعديل" aria-label="تعديل السؤال">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteQuestion('${catId}','${q.id}')" title="حذف" data-label="حذف" aria-label="حذف السؤال">🗑️</button>
      </div>
    </div>`).join('')}</div>`;
  try{initQuestionsSortable(document.getElementById("q-sortable-list"))}catch(e){ErrorBus.capture(e,"renderQuestionsAdmin:sortable")}
}
function openCatModal(catId=null){
  state.editingCatId=catId;
  if(catId){const c=state.categories.find(c=>c.id===catId);if(!c){state.editingCatId=null;return;}document.getElementById('cat-modal-title').textContent=I18n.t('categories.editQuestion')||'✏️ تعديل القسم';document.getElementById('cat-name-input').value=c.name;document.getElementById('cat-icon-input').value=c.icon||'';document.getElementById('cat-color-input').value=c.color||'#f5c842';document.getElementById('cat-type-input').value=c.type||'regular';_showCatImagePreview(c.catImage);
    // V12: Load parent and container display fields
    _populateParentSelect(c.id,c.parentId);
    const contDisp=document.getElementById('cat-container-display');
    if(contDisp)contDisp.value=c.containerDisplay||'inherit';
    const contOrder=document.getElementById('cat-container-order');
    if(contOrder)contOrder.value=c.containerOrder||1;
    const stgLabel=document.getElementById('cat-container-stage-label');
    if(stgLabel)stgLabel.value=c.stageLabel||'';
  }
  else{document.getElementById('cat-modal-title').textContent=I18n.t('categories.addCat')||'➕ إضافة قسم';document.getElementById('cat-name-input').value='';document.getElementById('cat-icon-input').value='📚';document.getElementById('cat-color-input').value=CAT_COLORS[state.categories.length%CAT_COLORS.length];document.getElementById('cat-type-input').value='regular';_showCatImagePreview(null);
    _populateParentSelect(null,null);
    const contOrder=document.getElementById('cat-container-order');
    if(contOrder)contOrder.value=1;
    const stgLabel=document.getElementById('cat-container-stage-label');
    if(stgLabel)stgLabel.value='';
  }
  // V12: Show/hide fields based on type
  onCatTypeChange(document.getElementById('cat-type-input').value);
  openModal('modal-category');
}
// V12: Populate parent category select dropdown
function _populateParentSelect(excludeId,selectedParentId){
  const sel=document.getElementById('cat-parent-input');
  if(!sel)return;
  sel.innerHTML='<option value="">— '+I18n.t('modal.catParent')?.replace('القسم الأب (الحاوي)','لا يتبع قسماً حاوياً')+' —</option>';
  state.categories.filter(c=>c.type==='container'&&c.id!==excludeId).forEach(c=>{
    const opt=document.createElement('option');
    opt.value=c.id;
    opt.textContent=(c.icon||'📁')+' '+c.name;
    if(c.id===selectedParentId)opt.selected=true;
    sel.appendChild(opt);
  });
}
// V12: Handle category type change — show/hide relevant fields
function onCatTypeChange(type){
  const parentWrap=document.getElementById('cat-parent-wrap');
  const containerOptsWrap=document.getElementById('cat-container-opts-wrap');
  const hint=document.getElementById('cat-type-hint');
  if(parentWrap){
    // Show parent selector for regular categories (can be subcategories)
    parentWrap.classList.toggle('hidden',type==='container'||type==='tiebreaker');
  }
  if(containerOptsWrap){
    // Show container display options only for container type
    containerOptsWrap.classList.toggle('hidden',type!=='container');
  }
  if(hint){
    if(type==='container')hint.textContent=I18n.t('modal.catContainerDesc')||'الأقسام الحاوية لا تظهر كأقسام أسئلة بل تجمع أقساماً فرعية تحتها';
    else if(type==='tiebreaker')hint.textContent=I18n.t('modal.catTiebreakDesc')||'أقسام الحسم لا تظهر في المسابقة العادية بل تُستخدم تلقائياً عند تعادل الفرق';
    else hint.textContent='';
  }
}
function saveCategory(){
  const name=_sanitizeUser(document.getElementById('cat-name-input').value.trim());
  if(!name){toast(I18n.t('categories.catName')||'أدخل اسم القسم','danger');return}
  const icon=document.getElementById('cat-icon-input').value.trim()||'📚';
  const color=document.getElementById('cat-color-input').value;
  const catImg=window._catImageTemp||null;
  const catType=document.getElementById('cat-type-input').value||'regular';
  const parentId=document.getElementById('cat-parent-input')?.value||null;
  const containerDisplay=document.getElementById('cat-container-display')?.value||'inherit';
  const containerOrder=parseInt(document.getElementById('cat-container-order')?.value)||1;
  const stageLabel=_sanitizeUser(document.getElementById('cat-container-stage-label')?.value?.trim()||'');
  if(state.editingCatId){const c=state.categories.find(c=>c.id===state.editingCatId);if(!c)return;c.name=name;c.icon=icon;c.color=color;c.type=catType;c.parentId=parentId||null;c.containerDisplay=catType==='container'?containerDisplay:null;if(catType==='container'){c.containerOrder=containerOrder;c.stageLabel=stageLabel||null;}else{c.containerOrder=undefined;c.stageLabel=undefined;}if(catImg!==undefined)c.catImage=catImg;
    // V12: Container category cannot have its own questions
    if(catType==='container')c.questions=[];
  }
  else state.categories.push({id:uid(),name,icon,color,catImage:catImg,type:catType,parentId:parentId||null,containerDisplay:catType==='container'?containerDisplay:null,containerOrder:catType==='container'?containerOrder:undefined,stageLabel:catType==='container'?(stageLabel||null):undefined,questions:[]});
  window._catImageTemp=undefined;
  saveState();closeModal('modal-category');renderCategoriesAdmin();toast(I18n.t('toast.saved'),'success');
}
function deleteCat(id){confirmAction(I18n.t('confirm.deleteCategory'),()=>{
  const cat=state.categories.find(c=>c.id===id);
  // V12: If deleting a container, orphan its subcategories
  if(cat&&cat.type==='container'){
    state.categories.forEach(c=>{if(c.parentId===id)c.parentId=null;});
  }
  // V12: Clean up parentId references if deleting a subcategory
  state.categories=state.categories.filter(c=>c.id!==id);
  delete state.usedQuestions[id];
  if(state.currentCatId===id){state.currentCatId=null;document.getElementById('btn-add-question').classList.add('hidden');document.getElementById('questions-list-admin').innerHTML=''}
  saveState();renderCategoriesAdmin();_updateBankStats();toast(I18n.t('toast.deleted'),'info');
})}

// ════════════════════════════════════════════════════════
//  QUESTIONS ADMIN
// ════════════════════════════════════════════════════════
function openAddQuestion(catId){
  openQuestionModal(catId||state.currentCatId,null);
}
function openQuestionModal(catId=null,qId=null){
  const tCat=catId||state.currentCatId;if(!tCat){toast(I18n.t('categories.catName')||'اختر قسماً','danger');return}
  state.editingQId=qId;state.currentCatId=tCat;
  _qMediaDataTemp=null;
  _mediaAttachmentTemp=null;
  resetOptEditor();
  if(!qId)_editingMatchPairs=[];  // V7 S6: reset match pairs for new question
  // Reset type to text
  setQType('text');
  clearQuestionMedia('image');clearQuestionMedia('audio');clearQuestionMedia('video');
  clearMediaAttachment();
  if(qId){
    const cat=state.categories.find(c=>c.id===tCat);
    const q=cat.questions.find(q=>q.id===qId);
    // V7 S6: load match pairs into editor if question is match type
    if(q&&q.type==='match'&&q.matchPairs){
      _editingMatchPairs=q.matchPairs.map(p=>({left:p.left||'',right:p.right||''}));
    }else{
      _editingMatchPairs=[];
    }
    document.getElementById('q-modal-title').textContent=I18n.t('categories.editQuestion')||'✏️ تعديل السؤال';
    document.getElementById('q-text-input').value=q.text;
    q.options.forEach((o,i)=>{
      const el=document.getElementById(`q-opt-${i}`);
      if(el) el.value=o||'';
    });
    // Restore option count based on question's options
    var optCount=q.options?q.options.length:4;
    if(optCount>4) setOptionCount(optCount);
    // Restore option images
    if(q.optionImages){
      q.optionImages.forEach((img,i)=>{
        if(img){
          _optImages[i]=img;
          const thumb=document.getElementById(`opt-img-thumb-${i}`);
          const row=document.getElementById(`opt-img-row-${i}`);
          const optRow=document.getElementById(`opt-row-${i}`);
          const btn=document.getElementById(`opt-img-btn-${i}`);
          if(thumb) thumb.src=img;
          if(row) row.style.display='flex';
          if(optRow) optRow.classList.add('has-image');
          if(btn) btn.classList.add('active-img');
        }
      });
    }
    document.getElementById('q-correct-input').value=q.correct;
    document.getElementById('q-difficulty-input').value=q.difficulty||'medium';
    document.getElementById('q-time-input').value=q.time||state.settings.defaultTime;
    document.getElementById('q-explanation-input').value=q.explanation||'';
    document.getElementById('q-hostnote-input').value=q.hostNote||'';
    // Update correct row highlight
    setTimeout(updateOptRowState, 50);
    // Restore text font
    const savedFont=q.textFont||'cairo';
    document.getElementById('q-text-font').value=savedFont;
    document.getElementById('q-text-input').style.fontFamily=savedFont==='amiri'?"'Amiri',serif":"'Cairo',sans-serif";
    document.querySelectorAll('.q-font-btn').forEach(b=>{b.style.borderColor=b.dataset.font===savedFont?'var(--accent1)':'var(--border)';b.style.color=b.dataset.font===savedFont?'var(--accent1)':'var(--text-secondary)';});
    // Restore type
    const qtype=q.type||'text';
    setQType(qtype);
    // Restore T/F answer
    if(qtype==='tf'){
      const tfVal=q.correct===0?'true':'false';
      document.getElementById('tf-correct-answer').value=tfVal;
      selectTFAnswer(tfVal);
    }
    // Restore FITB answer
    if(qtype==='fitb'){
      const fitbEl=document.getElementById('fitb-answer-input');
      if(fitbEl){fitbEl.value=q.fitbAnswer||'';const prev=document.getElementById('fitb-ans-preview');if(prev)prev.textContent=q.fitbAnswer||'';}
    }
    // Restore Quran fields
    if(qtype==='quran'){
      const meta=q.quranMeta||{};
      window._lastQuranMeta=meta;
      const surahEl=document.getElementById('quran-surah-input');if(surahEl)surahEl.value=meta.surah||'';
      const ayahEl=document.getElementById('quran-ayah-input');if(ayahEl)ayahEl.value=meta.ayah||1;
      const modeEl=document.getElementById('quran-mode-select');if(modeEl)modeEl.value=q.quranMode||'full';
      const dispEl=document.getElementById('quran-display-mode');if(dispEl)dispEl.value=q.quranDisplayMode||'both';
      const hideMetaEl=document.getElementById('quran-hide-meta');if(hideMetaEl)hideMetaEl.checked=!!q.quranHideMeta;
      const audioEl=document.getElementById('quran-audio-url');if(audioEl)audioEl.value=q.quranAudio||'';
      const dlBtn=document.getElementById('quran-download-btn');if(dlBtn)dlBtn.style.display=q.quranAudio?'':'none';
      // Show preview of saved verse
      const prev=document.getElementById('quran-preview-box');
      if(prev&&q.text){
        prev.style.display='block';
        const d=document.createElement('div');d.style.cssText="font-family:'Amiri',serif;font-size:1.1rem;line-height:2.2;direction:rtl";d.textContent=q.text;
        const m=document.createElement('div');m.style.cssText='font-size:.76rem;color:var(--text-muted);margin-top:4px';
        m.textContent=(meta.surah||'')+(meta.ayah?' — الآية '+meta.ayah:'')+(meta.juz?' — الجزء '+meta.juz:'');
        prev.innerHTML='';prev.appendChild(d);prev.appendChild(m);
      }
      setTimeout(_updateQuranModeHint,50);
    }
    if(q.mediaData){
      _qMediaDataTemp={type:q.type==='image'?'image':q.type==='video'?'video':'audio',data:q.mediaData};
      if(qtype==='image'){document.getElementById('q-image-preview').style.display='block';document.getElementById('q-image-preview-img').src=q.mediaData}
      else if(qtype==='audio'){document.getElementById('q-audio-preview').style.display='flex';document.getElementById('q-audio-preview-name').textContent=I18n.t('media.savedFile')}
      else if(qtype==='video'){document.getElementById('q-video-preview').style.display='flex';document.getElementById('q-video-preview-name').textContent=I18n.t('media.savedVideo')}
    }
    // Handle videoRef (IndexedDB blob reference) when editing a video question
    if(q.videoRef&&qtype==='video'){
      _qMediaDataTemp={type:'video',refKey:q.videoRef,name:I18n.t('media.savedVideo')||'فيديو محفوظ'};
      document.getElementById('q-video-preview').style.display='flex';
      document.getElementById('q-video-preview-name').textContent=I18n.t('media.savedVideo')||'فيديو محفوظ';
    }
    // Restore media attachment
    if(q.mediaAttachment){
      _mediaAttachmentTemp={type:q.mediaAttachment.type,data:q.mediaAttachment.data,name:q.mediaAttachment.name||'مرفق'};
      document.getElementById('q-media-attach-preview').style.display='flex';
      document.getElementById('q-media-attach-icon').textContent=q.mediaAttachment.type==='video'?'🎬':'🎵';
      document.getElementById('q-media-attach-name').textContent=q.mediaAttachment.name||I18n.t('media.savedAttachment');
      document.getElementById('test-btn-mediaAttach').style.display='inline-flex';
      document.getElementById('clear-btn-mediaAttach').style.display='inline-flex';
    }
  }else{
    document.getElementById('q-modal-title').textContent=I18n.t('categories.addQuestion')||'➕ إضافة سؤال';
    document.getElementById('q-text-input').value='';
    [0,1,2,3].forEach(i=>document.getElementById(`q-opt-${i}`).value='');
    document.getElementById('q-correct-input').value=0;
    document.getElementById('q-difficulty-input').value='medium';
    document.getElementById('q-time-input').value=state.settings.defaultTime;
    document.getElementById('q-explanation-input').value='';
  document.getElementById('q-hostnote-input').value='';
    setTimeout(updateOptRowState, 50);
  }
  openModal('modal-question');
  // B4: init SortableJS for desktop drag-drop on options editor
  setTimeout(function(){
    const oe=document.getElementById('options-editor');
    if(oe&&typeof initOptionsEditorSortable==='function')initOptionsEditorSortable(oe);
  },80);
}
function saveQuestion(){
  const qtype=_currentQType||'text';
  const text=document.getElementById('q-text-input').value.trim();
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  const difficulty=document.getElementById('q-difficulty-input').value;
  const time=+document.getElementById('q-time-input').value||state.settings.defaultTime;
  const explanation=document.getElementById('q-explanation-input').value.trim();
  const hostNote=document.getElementById('q-hostnote-input').value.trim();
  // V9: Sanitize all user-provided text fields
  const safeText=_sanitizeUser(text);
  const safeExplanation=_sanitizeUser(explanation);
  const safeHostNote=_sanitizeUser(hostNote);

  // ── V7 S6: MATCH ──
  if(qtype==='match'){
    if(!text){toast(I18n.t('toast.matchEnterText'),'danger');return}
    const pairs=(_editingMatchPairs||[]).filter(p=>p&&(p.left||'').trim()&&(p.right||'').trim()).map(p=>({left:_sanitizeUser(p.left.trim()),right:_sanitizeUser(p.right.trim())}));
    if(pairs.length<2){toast(I18n.t('toast.matchMinPairs'),'danger');return}
    const qObj={id:uid(),text:safeText,type:'match',matchPairs:pairs,difficulty,time,explanation:safeExplanation,hostNote:safeHostNote,options:[],optionImages:[],correct:0,mediaData:null,mediaAttachment:null};
    if(state.editingQId){const q=cat.questions.find(q=>q.id===state.editingQId);Object.assign(q,qObj);q.id=state.editingQId;}
    else cat.questions.push(qObj);
    _qMediaDataTemp=null;resetOptEditor();_editingMatchPairs=[];
    saveState();closeModal('modal-question');renderQuestionsAdmin(state.currentCatId);renderStatsGrid();_updateBankStats();toast(I18n.t('toast.saved'),'success');return;
  }
  // ── FITB ──
  if(qtype==='fitb'){
    if(!text||!text.includes('[___]')){toast(I18n.t('toast.fitbMissingBlank'),'danger');return}
    const ans=_sanitizeUser(document.getElementById('fitb-answer-input').value.trim());
    if(!ans){toast(I18n.t('toast.enterCorrectAnswer')||'أدخل الإجابة الصحيحة للفراغ','danger');return}
    const qObj={id:uid(),text:safeText,type:'fitb',fitbAnswer:ans,difficulty,time,explanation:safeExplanation,hostNote:safeHostNote,options:[],optionImages:[],correct:0,mediaData:null,mediaAttachment:null};
    if(state.editingQId){const q=cat.questions.find(q=>q.id===state.editingQId);Object.assign(q,qObj);q.id=state.editingQId;}
    else cat.questions.push(qObj);
    _qMediaDataTemp=null;resetOptEditor();
    saveState();closeModal('modal-question');renderQuestionsAdmin(state.currentCatId);renderStatsGrid();_updateBankStats();toast(I18n.t('toast.saved'),'success');return;
  }
  // ── QURAN ──
  if(qtype==='quran'){
    if(!text){toast(I18n.t('toast.fetchVerseFirst')||'اجلب الآية أولاً بزر 🔍','danger');return}
    const qObj={id:uid(),text:safeText,type:'quran',
      quranMode:document.getElementById('quran-mode-select').value,
      quranDisplayMode:document.getElementById('quran-display-mode').value,
      quranAudio:document.getElementById('quran-audio-url').value||'',
      quranMeta:window._lastQuranMeta||{},
      quranHideMeta:document.getElementById('quran-hide-meta').checked,
      difficulty,time,explanation:safeExplanation,hostNote:safeHostNote,options:[],optionImages:[],correct:0,mediaData:null,mediaAttachment:null};
    if(state.editingQId){const q=cat.questions.find(q=>q.id===state.editingQId);Object.assign(q,qObj);q.id=state.editingQId;}
    else cat.questions.push(qObj);
    _qMediaDataTemp=null;resetOptEditor();
    saveState();closeModal('modal-question');renderQuestionsAdmin(state.currentCatId);renderStatsGrid();_updateBankStats();toast(I18n.t('toast.saved'),'success');return;
  }

  // ── Standard (text/image/audio/math/tf/order/video) ──
  if(!text){toast(I18n.t('categories.questionText')||'أدخل نص السؤال','danger');return}
  // For video type, require media and process options the same as text questions
  if(qtype==='video'){
    const mediaData=_qMediaDataTemp?.data||null;
    const videoRef=_qMediaDataTemp?.refKey||null;
    if(!mediaData&&!videoRef){toast(I18n.t('categories.videoFile')||'اختر ملف فيديو للسؤال','danger');return}
    const options=Array.from({length:_currentOptCount},(_,i)=>_sanitizeUser(document.getElementById(`q-opt-${i}`)?.value?.trim()||''));
    const optionImages=[..._optImages].slice(0,_currentOptCount);
    const validCount=options.filter((o,i)=>o||optionImages[i]).length;
    const correct=+document.getElementById('q-correct-input').value;
    const mediaAttachment=_mediaAttachmentTemp?{type:_mediaAttachmentTemp.type,data:_mediaAttachmentTemp.data,name:_mediaAttachmentTemp.name,refKey:_mediaAttachmentTemp.refKey}:null;
    if(state.editingQId){
      const q=cat.questions.find(qq=>qq.id===state.editingQId);
      q.text=safeText;q.type=qtype;q.difficulty=difficulty;q.time=time;q.explanation=safeExplanation;q.hostNote=safeHostNote;
      q.options=options;q.optionImages=optionImages;q.correct=correct;
      if(videoRef){q.videoRef=videoRef;q.mediaData=null;}else if(mediaData){q.mediaData=mediaData;q.videoRef=null;}else if(!_qMediaDataTemp){q.mediaData=null;q.videoRef=null;}
      if(mediaAttachment)q.mediaAttachment=mediaAttachment;else if(!_mediaAttachmentTemp)q.mediaAttachment=null;
    }else{
      cat.questions.push({id:uid(),text:safeText,options,optionImages,correct,difficulty,time,explanation:safeExplanation,hostNote:safeHostNote,type:qtype,mediaData:videoRef?null:mediaData,videoRef:videoRef||null,mediaAttachment});
    }
    _qMediaDataTemp=null;_mediaAttachmentTemp=null;resetOptEditor();
    saveState();closeModal('modal-question');renderQuestionsAdmin(state.currentCatId);renderStatsGrid();_updateBankStats();toast(I18n.t('toast.saved'),'success');return;
  }
  const options=Array.from({length:_currentOptCount},(_,i)=>_sanitizeUser(document.getElementById(`q-opt-${i}`)?.value?.trim()||''));
  const optionImages=[..._optImages].slice(0,_currentOptCount);
  const validCount=options.filter((o,i)=>o||optionImages[i]).length;
  if(validCount<2){toast(I18n.t('categories.enterTwoOptions')||'أدخل خيارين على الأقل (نص أو صورة)','danger');return}
  const correct=+document.getElementById('q-correct-input').value;
  const mediaData=_qMediaDataTemp?.data||null;
  const videoRef=_qMediaDataTemp?.refKey||null;
  const mediaAttachment=_mediaAttachmentTemp?{type:_mediaAttachmentTemp.type,data:_mediaAttachmentTemp.data,name:_mediaAttachmentTemp.name}:null;
  if(state.editingQId){
    const q=cat.questions.find(qq=>qq.id===state.editingQId);
    q.text=safeText;q.options=options;q.optionImages=optionImages;
    q.correct=correct;q.difficulty=difficulty;q.time=time;q.explanation=safeExplanation;q.hostNote=safeHostNote;
    q.type=qtype;
    if(videoRef){q.videoRef=videoRef;q.mediaData=null;}else if(mediaData){q.mediaData=mediaData;q.videoRef=null;}else if(!_qMediaDataTemp){q.mediaData=null;q.videoRef=null;}
    if(mediaAttachment)q.mediaAttachment=mediaAttachment;
    else if(!_mediaAttachmentTemp)q.mediaAttachment=null;
  }else{
    cat.questions.push({id:uid(),text:safeText,options,optionImages,correct,difficulty,time,explanation:safeExplanation,hostNote:safeHostNote,type:qtype,mediaData:videoRef?null:mediaData,videoRef:videoRef||null,mediaAttachment});
  }
  _qMediaDataTemp=null;_mediaAttachmentTemp=null;
  resetOptEditor();
  saveState();closeModal('modal-question');renderQuestionsAdmin(state.currentCatId);renderStatsGrid();_updateBankStats();toast(I18n.t('toast.saved'),'success');
}
function deleteQuestion(catId,qId){confirmAction(I18n.t('confirm.deleteQuestion'),()=>{const cat=state.categories.find(c=>c.id===catId);if(!cat)return;cat.questions=cat.questions.filter(q=>q.id!==qId);saveState();renderQuestionsAdmin(catId);renderStatsGrid();_updateBankStats();toast(I18n.t('toast.deleted'),'info')})}

// ════════════════════════════════════════════════════════
//  TEAMS ADMIN
// ════════════════════════════════════════════════════════
function renderTeamsAdmin(){
  const el=document.getElementById('teams-grid-admin');
  if(!state.teams.length){var _teamTip=state.teams.length===1?'💡 أضف فريقين على الأقل لبدء المسابقة':null;setChildren(el,h('div',{style:{gridColumn:'1/-1'}},createEmptyState({iconType:'teams',title:'أضف فريقاً للمشاركة في المسابقة',description:'الفرق تتنافس على الإجابات الصحيحة وكسب النقاط',actionText:'إضافة فريق',actionFn:function(){openTeamModal()},tipText:_teamTip})));return}
  el.innerHTML=state.teams.map(t=>`
    <div class="team-card" data-teamid="${t.id}"
      ondragstart="onTeamDragStart(event,'${t.id}')"
      ondragover="onTeamDragOver(event,'${t.id}')"
      ondrop="onTeamDrop(event,'${t.id}')"
      ondragleave="this.classList.remove('drag-over-team')"
      ondragend="onTeamDragEnd()">
      <div class="team-color-bar" style="background:${_safeColor(t.color)}"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1rem;cursor:grab;color:var(--text-muted);padding:2px;touch-action:none" data-touch-drag="team">⠿</span>
          ${t.teamImage?`<img src="${_safeMediaSrc(t.teamImage)}" loading="lazy" alt="${_sanitizeUser(t.name)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid ${_safeColor(t.color)}66">`:t.teamIcon?`<span style="font-size:1.6rem">${_sanitizeIcon(t.teamIcon)}</span>`:`<div style="width:36px;height:36px;border-radius:50%;background:${_safeColor(t.color)};display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:900;color:#1a1000">${_sanitizeUser(t.name.charAt(0))}</div>`}
          <div><div class="team-name-display" style="color:${_safeColor(t.color)}">${_sanitizeUser(t.name)}</div><div class="team-score-display">${t.score||0}<span style="font-size:.82rem;color:var(--text-muted)"> نقطة</span></div></div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="moveTeam('${t.id}',-1)" title="تحريك للأعلى">▲</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="moveTeam('${t.id}',1)" title="تحريك للأسفل">▼</button>
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openTeamModal('${t.id}')">✏️</button>
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteTeam('${t.id}')">🗑️</button>
        </div>
      </div>
      <div class="team-members-list">${(t.members||[]).map(m=>{const nm=typeof m==='object'?m.name:m;const mImg=typeof m==='object'&&m.image?m.image:null;return `<span class="member-tag">${mImg?'<img src="'+_safeMediaSrc(mImg)+'" alt="'+_sanitizeUser(nm)+'" style="width:18px;height:18px;border-radius:50%;object-fit:cover"> ':''}<span>${_sanitizeUser(nm)}</span></span>`}).join('')||'<span class="text-sm text-muted">لا أعضاء</span>'}</div>
      <div style="display:flex;gap:5px;margin-top:9px;flex-wrap:wrap">
        <button class="btn btn-sm btn-ghost" onclick="adjustScore('${t.id}',1)">+1</button>
        <button class="btn btn-sm btn-ghost" onclick="adjustScore('${t.id}',-1)">−1</button>
        <button class="btn btn-sm btn-danger" onclick="adjustScore('${t.id}','reset')">صفر</button>
      </div>
    </div>`).join('');
  try{initTeamsSortable(document.getElementById("teams-grid-admin"))}catch(e){ErrorBus.capture(e,"renderTeamsAdmin:sortable")}
  initKeyboardNavigation();
  /* V14: Long press context menu on team cards */
  var teamCards=document.querySelectorAll('.team-card');
  if(teamCards.length)GestureManager.initLongPress(teamCards,function(card){
    var teamId=card.dataset.teamid;
    return[
      {icon:'✏️',label:'تعديل',action:function(){openTeamModal(teamId)}},
      {icon:'🗑️',label:'حذف',danger:true,action:function(){deleteTeam(teamId)}}
    ];
  });
}
function openTeamModal(teamId=null){
  state.editingTeamId=teamId;state.modalMembers=[];
  window._teamImageTemp=undefined;
  if(teamId){
    const t=state.teams.find(t=>t.id===teamId);
    document.getElementById('team-modal-title').textContent=I18n.t('admin.edit')||'✏️ تعديل';
    document.getElementById('team-name-input').value=t.name;
    document.getElementById('team-color-input').value=t.color;
    const ti=document.getElementById('team-icon-input');if(ti)ti.value=t.teamIcon||'';
    state.modalMembers=(t.members||[]).map((m,i)=>(typeof m==='object'?{name:m.name||'',icon:m.icon||'',image:m.image||null}:{name:m,icon:'',image:null}));
    _showTeamImagePreview(t.teamImage);
  }else{
    document.getElementById('team-modal-title').textContent=I18n.t('teams.addTeam')||'➕ إضافة فريق';
    document.getElementById('team-name-input').value='';
    document.getElementById('team-color-input').value=TEAM_COLORS[state.teams.length%TEAM_COLORS.length];
    document.getElementById('team-member-input').value='';
    const ti=document.getElementById('team-icon-input');if(ti)ti.value='';
    _showTeamImagePreview(null);
  }
  renderModalMembers();openModal('modal-team');
}
function addMemberToModal(){
  const v=document.getElementById('team-member-input').value.trim();if(!v)return;
  const img=window._pendingMemberImage||null;
  state.modalMembers.push({name:v,icon:'',image:img});
  document.getElementById('team-member-input').value='';
  window._pendingMemberImage=null;
  // Reset add-image preview
  const prev=document.getElementById('member-add-img-preview');
  if(prev)prev.innerHTML='📷';
  const fi=document.getElementById('team-member-img-input');if(fi)fi.value='';
  renderModalMembers();
}
function previewMemberAddImage(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=function(e){
    window._pendingMemberImage=e.target.result;
    const prev=document.getElementById('member-add-img-preview');
    if(prev)prev.innerHTML='<img src="'+e.target.result+'" style="width:26px;height:26px;border-radius:50%;object-fit:cover">';
  };
  reader.readAsDataURL(f);
}
function loadMemberImageForRow(input,idx){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=function(e){
    if(state.modalMembers[idx]){
      state.modalMembers[idx].image=e.target.result;
      renderModalMembers();
    }
  };
  reader.readAsDataURL(f);
}
function clearMemberImage(idx){
  if(state.modalMembers[idx]){state.modalMembers[idx].image=null;renderModalMembers();}
}
function renderModalMembers(){
  document.getElementById('modal-members-list').innerHTML=state.modalMembers.map((m,i)=>{
    const name=typeof m==='object'?m.name:m;
    const img=typeof m==='object'?m.image:null;
    const avatarHtml=img
      ?'<button class="member-img-btn" onclick="clearMemberImage('+i+')" title="حذف الصورة" data-i18n="title.deleteImage" data-i18n-attr="title"><img src="'+img+'" alt=""></button>'
      :'<label class="member-img-btn" for="member-img-file-'+i+'" title="إضافة صورة" data-i18n="title.addImage" data-i18n-attr="title"><svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/></svg></label>';
    return '<div class="member-edit-row">'
      +avatarHtml
      +'<input type="file" id="member-img-file-'+i+'" accept="image/*" class="hidden" onchange="loadMemberImageForRow(this,'+i+')">'
      +'<input type="text" class="form-input" value="'+_sanitizeUser(name)+'" style="flex:1" oninput="updateModalMember('+i+',\'name\',this.value)">'
      +'<button class="btn btn-ghost btn-sm btn-icon" onclick="moveModalMember('+i+',-1)" title="تحريك للأعلى" data-i18n="title.moveUp" data-i18n-attr="title" style="padding:2px 5px;font-size:.75rem;min-width:auto'+(i===0?';opacity:.3;pointer-events:none':'')+'">▲</button>'
      +'<button class="btn btn-ghost btn-sm btn-icon" onclick="moveModalMember('+i+',1)" title="تحريك للأسفل" data-i18n="title.moveDown" data-i18n-attr="title" style="padding:2px 5px;font-size:.75rem;min-width:auto'+(i===state.modalMembers.length-1?';opacity:.3;pointer-events:none':'')+'">▼</button>'
      +'<button class="rm-btn" onclick="removeModalMember('+i+')">✕</button>'
      +'</div>';
  }).join('');
}
function removeModalMember(i){state.modalMembers.splice(i,1);renderModalMembers()}
function moveModalMember(i,dir){
  const newIdx=i+dir;
  if(newIdx<0||newIdx>=state.modalMembers.length)return;
  [state.modalMembers[i],state.modalMembers[newIdx]]=[state.modalMembers[newIdx],state.modalMembers[i]];
  renderModalMembers();
}
function updateModalMember(i,field,val){if(state.modalMembers[i])state.modalMembers[i][field]=val;}
function saveTeam(){
  const name=_sanitizeUser(document.getElementById('team-name-input').value.trim());if(!name){toast(I18n.t('teams.teamName')||'أدخل اسم الفريق','danger');return}
  const color=document.getElementById('team-color-input').value;
  const teamIcon=document.getElementById('team-icon-input')?.value.trim()||'';
  const teamImage=window._teamImageTemp!==undefined?window._teamImageTemp:undefined;
  // V9: Sanitize member names
  const members=state.modalMembers.map(m=>typeof m==='object'?{name:_sanitizeUser(m.name),icon:m.icon||''}:{name:_sanitizeUser(m),icon:''});
  if(state.editingTeamId){
    const t=state.teams.find(t=>t.id===state.editingTeamId);
    t.name=name;t.color=color;t.members=members;t.teamIcon=teamIcon;
    if(teamImage!==undefined)t.teamImage=teamImage;
  }else{
    state.teams.push({id:uid(),name,color,teamIcon,teamImage:teamImage||null,members,score:0});
  }
  window._teamImageTemp=undefined;
  saveState();closeModal('modal-team');renderTeamsAdmin();toast(I18n.t('toast.saved'),'success');
}
function deleteTeam(id){confirmAction(I18n.t('confirm.deleteTeam'),()=>{state.teams=state.teams.filter(t=>t.id!==id);if(state.currentTeamIndex>=state.teams.length)state.currentTeamIndex=Math.max(0,state.teams.length-1);saveState();renderTeamsAdmin();toast(I18n.t('toast.deleted'),'info')})}
function adjustScore(id,delta){
  const t=state.teams.find(t=>t.id===id);if(!t)return;
  const prev=t.score||0;
  if(delta==='reset')t.score=0;
  else t.score=Math.max(0,prev+delta);
  if(typeof delta==='number'&&delta!==0)recordScoreHistoryV5(id,t.score-prev);
  saveState();renderTeamsAdmin();updateTicker();
}

// ════════════════════════════════════════════════════════
//  CREDITS ADMIN
// ════════════════════════════════════════════════════════
function renderCreditsAdmin(){
  const grouped={};Object.keys(CREDIT_CATS).forEach(k=>grouped[k]=[]);
  state.credits.forEach(p=>{if(grouped[p.category])grouped[p.category].push(p)});
  document.getElementById('credits-admin-sections').innerHTML=Object.entries(CREDIT_CATS).map(([key,info])=>`
    <div style="margin-bottom:20px">
      <div style="font-size:.85rem;font-weight:700;color:${info.color};margin-bottom:8px">${info.label}</div>
      ${grouped[key].map((p,i,arr)=>`
        <div style="background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;padding:11px 14px;display:flex;align-items:center;justify-content:space-between;margin-bottom:7px">
          <div style="display:flex;align-items:center;gap:10px">
            ${p.image?`<img src="${_safeMediaSrc(p.image)}" alt="${_sanitizeUser(p.name)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid ${p.color||info.color}66">`:`<div style="width:32px;height:32px;border-radius:50%;background:${(p.color||info.color)}22;color:${p.color||info.color};display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:900">${p.name[0]}</div>`}
            <div><div style="font-weight:700;font-size:.88rem">${p.name}</div><div style="font-size:.76rem;color:var(--text-secondary)">${p.role||''}</div></div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-ghost btn-sm btn-icon" onclick="moveCreditPerson('${p.id}','${key}',-1)" title="تحريك للأعلى" data-i18n="title.moveUp" data-i18n-attr="title" style="padding:2px 5px;font-size:.72rem${i===0?';opacity:.3;pointer-events:none':''}">▲</button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="moveCreditPerson('${p.id}','${key}',1)" title="تحريك للأسفل" data-i18n="title.moveDown" data-i18n-attr="title" style="padding:2px 5px;font-size:.72rem${i===arr.length-1?';opacity:.3;pointer-events:none':''}">▼</button>
            <button class="btn btn-ghost btn-sm btn-icon" onclick="openCreditPersonModal('${p.id}')">✏️</button>
            <button class="btn btn-danger btn-sm btn-icon" onclick="deleteCreditPerson('${p.id}')">🗑️</button>
          </div>
        </div>`).join('')||`<div class="text-sm text-muted" style="padding:6px 0">${t('empty.noOneYet')}</div>`}
    </div>`).join('');
}
function openCreditPersonModal(pid=null){
  state.editingCreditId=pid;
  window._creditImageTemp=undefined;
  if(pid){const p=state.credits.find(c=>c.id===pid);document.getElementById('credit-modal-title').textContent=I18n.t('admin.edit')||'✏️ تعديل';document.getElementById('cp-name-input').value=p.name;document.getElementById('cp-role-input').value=p.role||'';document.getElementById('cp-category-input').value=p.category||'producers';document.getElementById('cp-color-input').value=p.color||'#f5c842';_showCreditImagePreview(p.image)}
  else{document.getElementById('credit-modal-title').textContent=I18n.t('credits.addCredit')||'➕ إضافة شخص';document.getElementById('cp-name-input').value='';document.getElementById('cp-role-input').value='';document.getElementById('cp-category-input').value='producers';document.getElementById('cp-color-input').value='#f5c842';_showCreditImagePreview(null)}
  openModal('modal-credit-person');
}
function loadCreditPersonImage(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=function(e){window._creditImageTemp=e.target.result;_showCreditImagePreview(e.target.result)};
  reader.readAsDataURL(f);
}
function clearCreditPersonImage(){window._creditImageTemp=null;_showCreditImagePreview(null);const fi=document.getElementById('cp-image-file-input');if(fi)fi.value=''}
function _showCreditImagePreview(src){
  const wrap=document.getElementById('cp-image-preview-wrap');
  const img=document.getElementById('cp-image-preview');
  if(src){wrap.style.display='';img.src=src}else{wrap.style.display='none';img.src=''}
}
function saveCreditPerson(){
  const name=document.getElementById('cp-name-input').value.trim();if(!name){toast(I18n.t('credits.name')||'أدخل الاسم','danger');return}
  const role=document.getElementById('cp-role-input').value.trim();
  const category=document.getElementById('cp-category-input').value;
  const color=document.getElementById('cp-color-input').value;
  const image=window._creditImageTemp!==undefined?window._creditImageTemp:undefined;
  if(state.editingCreditId){const p=state.credits.find(c=>c.id===state.editingCreditId);p.name=name;p.role=role;p.category=category;p.color=color;if(image!==undefined)p.image=image}
  else state.credits.push({id:uid(),name,role,category,color,image:image||null});
  window._creditImageTemp=undefined;
  saveState();closeModal('modal-credit-person');renderCreditsAdmin();renderStatsGrid();toast(I18n.t('toast.saved'),'success');
}
function moveCreditPerson(id,catKey,dir){
  // Get people in same category in their order within state.credits
  const inCat=state.credits.filter(c=>c.category===catKey);
  const idx=inCat.findIndex(c=>c.id===id);
  if(idx<0)return;
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=inCat.length)return;
  // Swap in state.credits
  const globalIdx1=state.credits.indexOf(inCat[idx]);
  const globalIdx2=state.credits.indexOf(inCat[newIdx]);
  [state.credits[globalIdx1],state.credits[globalIdx2]]=[state.credits[globalIdx2],state.credits[globalIdx1]];
  saveState();renderCreditsAdmin();
}
function deleteCreditPerson(id){confirmAction(I18n.t('confirm.deleteCredit'),()=>{state.credits=state.credits.filter(c=>c.id!==id);saveState();renderCreditsAdmin();renderStatsGrid();toast(I18n.t('toast.deleted'),'info')})}

// ════════════════════════════════════════════════════════
//  IMPORT / EXPORT
// ════════════════════════════════════════════════════════
function handleFileDrop(e){e.preventDefault();document.getElementById('import-zone').classList.remove('drag-over');const f=e.dataTransfer.files[0];if(f)processExcelFile(f)}
function handleFileSelect(e){const f=e.target.files[0];if(f)processExcelFile(f);e.target.value=''}
function processExcelFile(file){
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const wb=XLSX.read(e.target.result,{type:'binary'});
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
      let imp=0;
      rows.slice(1).filter(r=>r[0]).forEach(row=>{
        const text=String(row[0]||'').trim();if(!text)return;
        const opts=[row[1],row[2],row[3],row[4]].map(o=>String(o||'').trim());
        // Validate: must have at least 2 non-empty options
        if(opts.filter(o=>o).length<2)return;
        const correct=Math.max(0,Math.min(opts.filter(o=>o).length-1,(+row[5]||1)-1));
        const catName=String(row[6]||'عام').trim();
        const time=+row[7]||state.settings.defaultTime;
        const difficulty=(['easy','medium','hard'].includes(row[8]))?row[8]:'medium';
        const explanation=String(row[9]||'').trim();
        const hostNote=String(row[10]||'').trim();
        const imageUrl=String(row[11]||'').trim();
        const audioUrl=String(row[12]||'').trim();
        const videoUrl=String(row[13]||'').trim();
        // Determine question type from media
        let qType='text';
        let mediaData=null;
        if(imageUrl){qType='image';mediaData=imageUrl;}
        else if(videoUrl){qType='video';mediaData=videoUrl;}
        else if(audioUrl){qType='audio';mediaData=audioUrl;}
        let cat=state.categories.find(c=>c.name===catName);
        if(!cat){cat={id:uid(),name:catName,icon:'📚',color:CAT_COLORS[state.categories.length%CAT_COLORS.length],type:'regular',questions:[]};state.categories.push(cat)}
        cat.questions.push({id:uid(),text,options:opts,optionImages:[null,null,null,null],correct,difficulty,time,explanation,hostNote:hostNote||'',type:qType,mediaData:mediaData,mediaAttachment:null});
        imp++;
      });
      saveState();
      document.getElementById('import-preview').classList.remove('hidden');
      document.getElementById('import-preview').innerHTML=`<div class="alert alert-success">✅ ${I18n.t('toast.importedQuestions',{count:imp})}</div>`;
      renderStatsGrid();toast(I18n.t('toast.importedQuestions',{count:imp}),'success');
    }catch(err){toast(I18n.t('toast.dataError')+err.message,'danger')}
  };
  reader.readAsBinaryString(file);
}
