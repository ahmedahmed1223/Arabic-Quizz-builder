// ════════════════════════════════════════════════════════
//  I18N: Language change handler — re-renders dynamic content
// ════════════════════════════════════════════════════════
function onLanguageChange(langCode){
  // Re-render current view's dynamic content
  try{
    // Sync wizard language with global I18n
    if(typeof Wizard!=='undefined'&&typeof Wizard.setLang==='function')Wizard.setLang(langCode);
    const cv=window._currentView;
    if(cv==='intro')renderIntro();
    if(cv==='teams')renderTeamsSlide();
    if(cv==='categories')renderCatsSlide();
    if(cv==='scores')renderScoresSlide();
    if(cv==='credits')renderCreditsSlide();
    if(cv==='teamstats'&&typeof renderTeamStats==='function')renderTeamStats();
    if(cv==='admin'&&typeof renderAdmin==='function')renderAdmin();
    // Re-apply DIFF_LABELS based on language
    if(langCode==='en'){
      DIFF_LABELS.easy='⭐ Easy';DIFF_LABELS.medium='⭐⭐ Medium';DIFF_LABELS.hard='⭐⭐⭐ Hard';
    }else{
      DIFF_LABELS.easy='⭐ سهل';DIFF_LABELS.medium='⭐⭐ متوسط';DIFF_LABELS.hard='⭐⭐⭐ صعب';
    }
    // Update admin comp name header
    const acnh=document.getElementById('admin-comp-name-header');
    if(acnh)acnh.textContent=state.settings.name||I18n.t('settings.compName');
  }catch(e){console.warn('onLanguageChange error:',e);}
}

// Safety net: if DOMContentLoaded already fired or was missed, ensure init runs within 3s
setTimeout(function(){
  if(!window._appInitialized){
    console.warn('[Init] Safety timeout — forcing app startup');
    _initApp();
  }
},3000);


// ── V15: New feature I18n keys ──
try{
if(typeof I18n!=='undefined'&&I18n._dicts&&I18n._dicts.ar){
  const ar=I18n._dicts.ar;
  ar['achievement.unlocked']='إنجاز جديد!';
  ar['achievement.title']='الإنجازات';
  ar['achievement.unlockedCount']='مفتوح';
  ar['leaderboard.title']='لوحة المتصدرين';
  ar['leaderboard.weekly']='أسبوعي';
  ar['leaderboard.monthly']='شهري';
  ar['leaderboard.allTime']='عام';
  ar['leaderboard.empty']='لا توجد نتائج بعد';
  ar['leaderboard.saved']='تم حفظ نتيجتك!';
  ar['bugReport.title']='الإبلاغ عن خطأ';
  ar['bugReport.type']='نوع البلاغ';
  ar['bugReport.description']='الوصف';
  ar['bugReport.submit']='إرسال البلاغ';
  ar['bugReport.submitted']='تم إرسال البلاغ';
}
if(typeof I18n!=='undefined'&&I18n._dicts&&I18n._dicts.en){
  const en=I18n._dicts.en;
  en['achievement.unlocked']='New Achievement!';
  en['achievement.title']='Achievements';
  en['achievement.unlockedCount']='unlocked';
  en['leaderboard.title']='Leaderboard';
  en['leaderboard.weekly']='Weekly';
  en['leaderboard.monthly']='Monthly';
  en['leaderboard.allTime']='All Time';
  en['leaderboard.empty']='No results yet';
  en['leaderboard.saved']='Your score has been saved!';
  en['bugReport.title']='Report Error';
  en['bugReport.type']='Report Type';
  en['bugReport.description']='Description';
  en['bugReport.submit']='Submit Report';
  en['bugReport.submitted']='Report submitted';
}
}catch(e){console.warn('[I18n] V15 keys add error:',e);}

// EMERGENCY: If loading screen is still visible after 8s, force-remove it
// V14-fix: Check wizard first-run before forcing login view
setTimeout(function(){
  try{
    var ls=document.getElementById('loading-screen');
    if(ls&&ls.style.display!=='none'){
      console.error('[Init] EMERGENCY: Loading screen still visible after 8s — force removing');
      ls.style.display='none';
      // V14-fix: Don't force login — check wizard first run
      try{
        if(typeof Wizard!=='undefined'&&Wizard.isFirstRun()){
          console.info('[Init] EMERGENCY: First run detected — showing setup wizard');
          window._wizardFirstRunPending=true;
          try{Wizard.show();}catch(e2){console.error('[Init] EMERGENCY: Wizard show error:',e2);}
        }else{
          showView('login');
        }
      }catch(e3){
        try{showView('login');}catch(e4){console.error('[Init] EMERGENCY: showView failed too:',e4);}
      }
    }
  }catch(e){console.error('[Init] EMERGENCY error:',e);}
},8000);

// ═══════════════════════════════════════════════════════
//  V5 — RESTORE NEW SETTINGS
// ════════════════════════════════════════════════════════
function restoreV5Settings(){
  const s=state.settings;
  const nm=document.getElementById('s-negative-marking');
  if(nm){nm.checked=!!s.negativeMarking;const nmw=document.getElementById('neg-mark-val-wrap');if(nmw)nmw.style.display=s.negativeMarking?'flex':'none';}
  const nmv=document.getElementById('s-neg-mark-val');if(nmv)nmv.value=s.negMarkValue||1;
  const sb=document.getElementById('s-streak-bonus');
  if(sb){sb.checked=!!s.streakBonus;const sbw=document.getElementById('streak-val-wrap');if(sbw)sbw.style.display=s.streakBonus?'flex':'none';}
  const sc=document.getElementById('s-streak-count');if(sc)sc.value=s.streakCount||3;
  const ccs2=document.getElementById('s-cat-card-size');if(ccs2){ccs2.value=s.catCardSize||100;applyCatCardScale(s.catCardSize||100);}
  const sv=document.getElementById('s-streak-val');if(sv)sv.value=s.streakValue||2;
  // ── Session 1 additions ──
  const hsisEl=document.getElementById('s-hide-start-in-seq');if(hsisEl)hsisEl.checked=s.hideStartInSeq!==false;
  const smpEl=document.getElementById('s-show-manual-point');if(smpEl)smpEl.checked=s.showManualPoint!==false;
  const tsdEl=document.getElementById('s-timer-start-delay');if(tsdEl)tsdEl.value=s.timerStartDelay||0;
  const ewEl=document.getElementById('s-early-winner');if(ewEl){ewEl.checked=!!s.earlyWinnerEnabled;const eww=document.getElementById('early-winner-wrap');if(eww)eww.style.display=s.earlyWinnerEnabled?'flex':'none';}
  const ewsEl=document.getElementById('s-early-winner-score');if(ewsEl)ewsEl.value=s.earlyWinnerScore||10;
  const tbEl=document.getElementById('s-tiebreaker-enabled');if(tbEl){tbEl.checked=!!s.tiebreakerEnabled;const tbw=document.getElementById('tiebreaker-options-wrap');if(tbw)tbw.style.display=s.tiebreakerEnabled?'block':'none';}
  const tbcEl=document.getElementById('s-tiebreaker-count');if(tbcEl)tbcEl.value=s.tiebreakerQuestionCount||3;
  const tbpEl=document.getElementById('s-tiebreaker-pts');if(tbpEl)tbpEl.value=s.tiebreakerPoints||1;
  try{refreshTiebreakerCategories();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_216")}catch(_){}}
  const teEl=document.getElementById('s-tense-enabled');if(teEl){teEl.checked=s.tenseEnabled!==false;const tow=document.getElementById('tense-options-wrap');if(tow)tow.style.display=teEl.checked?'block':'none';}
  const tmtEl=document.getElementById('s-tense-music-type');if(tmtEl){tmtEl.value=s.tenseMusicType||'embedded';const tw=document.getElementById('tense-custom-audio-wrap');if(tw)tw.style.display=tmtEl.value==='custom'?'block':'none';}
  const tvEl=document.getElementById('s-tense-vol');if(tvEl){tvEl.value=s.tenseMusicVol||70;const tvd=document.getElementById('tense-vol-display');if(tvd)tvd.textContent=(s.tenseMusicVol||70)+'%';}
  const ssbEl=document.getElementById('s-show-shuffle-badge');if(ssbEl)ssbEl.checked=!!s.showShuffleBadge;
  const rdEl=document.getElementById('s-reveal-duration');if(rdEl){const rdv=s.revealDuration||1000;rdEl.value=rdv;const rdd=document.getElementById('reveal-dur-display');if(rdd)rdd.textContent=(rdv/1000).toFixed(1);const rdn=document.getElementById('s-reveal-duration-num');if(rdn)rdn.value=(rdv/1000).toFixed(1);}
  const tchEl=document.getElementById('s-team-card-height');if(tchEl)tchEl.value=s.teamCardHeight||'auto';
  const ctdEl=document.getElementById('custom-tense-name');if(ctdEl)ctdEl.textContent=s.customTenseData?'✅ ملف محمّل':'لم يُختر بعد';
  const prmEl=document.getElementById('s-progressive-reveal-mode');if(prmEl){prmEl.value=s.progressiveRevealMode||'auto';const pw=document.getElementById('progressive-mode-wrap');if(pw)pw.style.display=s.progressiveReveal?'block':'none';const rIWrap=document.getElementById('s-reveal-interval-wrap');if(rIWrap)rIWrap.style.display=(s.progressiveRevealMode||'auto')==='auto'?'block':'none';}
  // ── New v5.2 settings ──
  const nnaEl2=document.getElementById('s-next-no-answer');if(nnaEl2){nnaEl2.value=s.nextWithoutAnswerMode||'warn';const napw=document.getElementById('no-ans-pts-wrap');if(napw)napw.style.display=s.nextWithoutAnswerMode==='add_deduct'?'flex':'none';}
  const snaAdd=document.getElementById('s-no-ans-add');if(snaAdd)snaAdd.value=s.noAnsAddVal||1;
  const snaDed=document.getElementById('s-no-ans-deduct');if(snaDed)snaDed.value=s.noAnsDeductVal||1;
  const sotfEl=document.getElementById('s-order-show-tf');if(sotfEl)sotfEl.checked=s.orderShowTF!==false;
  const jcw=document.getElementById('jeopardy-controls-wrap');if(jcw)jcw.style.display=(s.catDisplayMode==='jeopardy')?'block':'none';
  const jp1El=document.getElementById('s-jep-pts1');if(jp1El)jp1El.value=s.jepPts1||100;
  const jp2El=document.getElementById('s-jep-pts2');if(jp2El)jp2El.value=s.jepPts2||200;
  const jp3El=document.getElementById('s-jep-pts3');if(jp3El)jp3El.value=s.jepPts3||300;
  const jp4El=document.getElementById('s-jep-pts4');if(jp4El)jp4El.value=s.jepPts4||400;
  const jp5El=document.getElementById('s-jep-pts5');if(jp5El)jp5El.value=s.jepPts5||500;
  const japEl=document.getElementById('s-jep-award-pts');if(japEl)japEl.checked=s.jepAwardPts!==false;
  const jdwEl=document.getElementById('s-jep-deduct-wrong');if(jdwEl)jdwEl.checked=!!s.jepDeductWrong;
  const jspEl=document.getElementById('s-jep-show-pts-in-q');if(jspEl)jspEl.checked=s.jepShowPtsInQ!==false;
  const hncEl2=document.getElementById('s-hide-nav-on-cats');if(hncEl2)hncEl2.checked=s.hideNavOnCats!==false;
}

// ════════════════════════════════════════════════════════
//  V5 — QUESTION SEARCH & FILTER
// ═══════════════════════════════════════════════════════
function filterQuestions(term){
  state.qSearchTerm=term.trim().toLowerCase();
  renderQuestionsFiltered();
}
function setQFilter(mode, btn){
  state.qFilterMode=mode;
  document.querySelectorAll('.q-filter-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderQuestionsFiltered();
}
function renderQuestionsFiltered(){
  if(!state.currentCatId)return;
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  if(!cat)return;
  const term=state.qSearchTerm;
  const mode=state.qFilterMode||'all';
  const filtered=cat.questions.filter((q,i)=>{
    const matchDiff=mode==='all'||q.difficulty===mode||(mode==='tf'&&q.type==='tf');
    const matchTerm=!term||q.text.toLowerCase().includes(term)||
      (q.options||[]).some(o=>o&&o.toLowerCase().includes(term));
    return matchDiff&&matchTerm;
  });
  const el=document.getElementById('questions-list-admin');
  if(!el)return;
  if(!filtered.length){
    setChildren(el,h('div.empty-state',h('div.empty-icon','🔍'),h('p',I18n.t('empty.noQuestions'))));
    return;
  }
  const catId=state.currentCatId;
  el.innerHTML=`<div class="questions-list">${filtered.map((q,i)=>{
    const letter=getAnswerLabel(q.correct)||'أ';
    const diffBadge=`<span class="diff-badge ${DIFF_CLASS[q.difficulty||'medium']}">${DIFF_LABELS[q.difficulty||'medium']}</span>`;
    const typeBadge=q.type==='tf'?'<span class="diff-badge diff-easy">✓✗ صح/خطأ</span>':'';
    return `<div class="question-item" id="qi-${q.id}">
      <div class="question-info">
        <div class="question-text-preview">${q.text}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">${diffBadge}${typeBadge}</div>
        <div class="question-options-preview">${(q.options||[]).map((o,oi)=>{
          if(!o&&!(q.optionImages&&q.optionImages[oi]))return '';
          const cls=['option-pill',oi===q.correct?'correct':''].filter(Boolean).join(' ');
          const label=o||'[صورة]';
          return '<span class="'+cls+'">'+getAnswerLabel(oi)+'. '+(label.length>18?label.slice(0,16)+'…':label)+'</span>';
        }).join('')}</div>
      </div>
      <div class="question-actions">
        <button class="btn btn-ghost btn-sm btn-icon" onclick="duplicateQuestion('${catId}','${q.id}')" title="نسخ" data-label="نسخ" aria-label="نسخ السؤال">📋</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="openQuestionModal('${catId}','${q.id}')" title="تعديل" data-label="تعديل" aria-label="تعديل السؤال">✏️</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteQuestion('${catId}','${q.id}')" title="حذف" data-label="حذف" aria-label="حذف السؤال">🗑️</button>
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ═══════════════════════════════════════════════════════
//  V5 — DUPLICATE QUESTION
// ════════════════════════════════════════════════════════
function duplicateQuestion(catId,qId){
  const cat=state.categories.find(c=>c.id===catId);if(!cat)return;
  const orig=cat.questions.find(q=>q.id===qId);if(!orig)return;
  const copy={
    ...JSON.parse(JSON.stringify(orig)),
    id:'q'+Date.now()+'_dup',
    text:'(نسخة) '+orig.text,
  };
  const idx=cat.questions.findIndex(q=>q.id===qId);
  cat.questions.splice(idx+1,0,copy);
  saveState();renderQuestionsAdmin(catId);
  // Flash the new item
  setTimeout(()=>{
    const el=document.getElementById('qi-'+copy.id);
    if(el)el.classList.add('dup-flash');
  },100);
  toast(I18n.t('toast.questionCopied'),'success');
}

// ════════════════════════════════════════════════════════
//  V5 — STREAK SYSTEM
// ════════════════════════════════════════════════════════
function updateStreakDisplay(team){
  const el=document.getElementById('streak-display');if(!el||!team)return;
  if(!state.settings.streakBonus){el.style.display='none';return;}
  const streak=state.teamStreaks[team.id]||0;
  const sc=state.settings.streakCount||3;
  if(streak<=0){el.style.display='none';return;}
  const remaining=sc-(streak%sc);
  const pct=((streak%sc)/sc)*100;
  el.style.display='flex';
  el.innerHTML=`<div class="streak-badge" style="color:var(--accent1)">
    🔥 ${team.name}: ${streak} متتالية ${remaining<sc?'('+remaining+' للمكافأة)':'✦'}
  </div>`;
}
function showStreakAnimation(team,streak,bonus){
  const el=document.createElement('div');
  el.className='streak-float';
  el.textContent=`🔥 ×${streak} مكافأة +${bonus}!`;
  el.style.cssText=`top:40%;left:50%;transform:translateX(-50%)`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1600);
}

// ════════════════════════════════════════════════════════
//  V5 — BUZZER MODE
// ════════════════════════════════════════════════════════
function openBuzzerMode(){
  if(!state.teams.length){toast(I18n.t('toast.addTeamsFirst'),'danger');return}
  state.buzzerActive=true;state.buzzerWinner=null;
  renderBuzzerGrid();
  document.getElementById('buzzer-overlay').classList.add('show');
  document.getElementById('buzzer-title').textContent=I18n.t('buzzer.title')||'🔔 وضع المُسرِّع';
  document.getElementById('buzzer-subtitle').textContent=I18n.t('buzzer.subtitle')||'أي فريق يضغط أولاً؟';
  document.getElementById('buzzer-winner-banner').classList.add('hidden');
}
function closeBuzzerMode(){
  state.buzzerActive=false;state.buzzerWinner=null;
  document.getElementById('buzzer-overlay').classList.remove('show');
}
function renderBuzzerGrid(){
  const grid=document.getElementById('buzzer-grid');
  if(!grid)return;
  grid.innerHTML=state.teams.map(t=>`
    <button class="buzzer-btn" id="buzzer-${t.id}"
      style="background:linear-gradient(135deg,${t.color}cc,${t.color});color:#1a1000"
      onclick="buzzIn('${t.id}')">
      <span class="buzzer-btn-icon">${t.name.charAt(0)}</span>
      <span class="buzzer-btn-name">${_sanitizeUser(t.name)}</span>
    </button>`).join('');
}
