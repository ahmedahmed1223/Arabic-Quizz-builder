// ═══════════════════════════════════════════════════════════════
//  REMOTE CONTROL — Enhanced (BroadcastChannel + window.open)
// ═══════════════════════════════════════════════════════════════
var _remoteChannel=null;
var _remoteWin=null;
var _remotePingTimer=null;

function initRemoteControl(){
  if(!('BroadcastChannel' in window)){toast(I18n.t('remote.browserNotSupported'),'danger');return;}
  if(_remoteChannel){try{_remoteChannel.close();}catch(e){try{ErrorBus.capture(e,"catch#44")}catch(_){}}}
  _remoteChannel=new BroadcastChannel('quiz_remote_v1');
  _remoteChannel.onmessage=function(e){
    const m=e.data;if(!m||!m.action)return;
    // Immediately push state after remote actions for near-instantaneous feedback
    if(m.action==='next'){nextQuestion();_pushRemoteState();}
    else if(m.action==='reveal'){revealAnswer();_pushRemoteState();}
    else if(m.action==='categories'){showView('categories');_pushRemoteState();}
    else if(m.action==='scores'){showView('scores');_pushRemoteState();}
    else if(m.action==='podium'){showPodium();_pushRemoteState();}
    else if(m.action==='timer'){toggleTimer();_pushRemoteState();}
    else if(m.action==='music'){toggleMusic();_pushRemoteState();}
    else if(m.action==='pauseTimer'){
      if(state.timerInterval)togglePauseTimer();
      _pushRemoteState();
    }
    else if(m.action==='setTimerTime'){
      if(m.payload&&m.payload.seconds){
        state.timeLeft=parseInt(m.payload.seconds)||30;
        state.timerTotal=state.timeLeft;
        updateTimerDisplay(state.timeLeft,state.timerTotal);
        _pushRemoteState();
      }
    }
    else if(m.action==='adjustScore'){
      if(m.payload){
        const idx=m.payload.teamIdx;
        const delta=m.payload.delta;
        if(idx!==undefined&&idx>=0&&idx<state.teams.length&&delta&&isFinite(delta)){
          const team=state.teams[idx];
          if(team){
            try{changeScore(team,delta,'remote_control');}catch(e){
              // Fallback: direct mutation if changeScore not available
              if(delta>0){team.score=(team.score||0)+delta;recordScoreHistoryV5(team.id,delta);floatScore(team,'+'+delta);}
              else{team.score=Math.max(0,(team.score||0)+delta);recordScoreHistoryV5(team.id,delta);floatScore(team,''+delta,'minus');}
              saveState();try{saveGameProgress();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_223")}catch(_){}}updateTicker();
            }
            if(typeof renderAdmin==='function'&&document.getElementById('admin-panel')&&!document.getElementById('admin-panel').classList.contains('hidden'))renderTeamsAdmin();
            _pushRemoteState();
          }
        }
      }
    }
    else if(m.action==='confetti'){
      try{launchConfetti(150);}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    }
    else if(m.action==='whiteboard'){
      toggleWhiteboard();
    }
    else if(m.action==='resetBuzzer'){
      try{resetBuzzer();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      _pushRemoteState();
    }
    else if(m.action==='tiebreaker'){startTiebreakerRound();_pushRemoteState();}
    else if(m.action==='grantTiebreakerPoint'){grantTiebreakerPoint(m.payload?.teamId||m.teamId);_pushRemoteState();}
    else if(m.action==='nextTiebreaker'){nextTiebreakerQuestion();_pushRemoteState();}
    else if(m.action==='skipTiebreaker'){skipTiebreaker();_pushRemoteState();}
    else if(m.action==='selectCategory'){
      if(m.payload&&m.payload.catId){
        const cat=state.categories.find(c=>c.id===m.payload.catId);
        if(cat&&state.gameActive){selectCatAndStart(m.payload.catId);}
        _pushRemoteState();
      }
    }
    else if(m.action==='gotoQuestion'){
      if(m.payload&&m.payload.questionNum){
        const qIdx=parseInt(m.payload.questionNum)-1;
        if(qIdx>=0&&state.currentCatId){
          const cat=state.categories.find(c=>c.id===state.currentCatId);
          if(cat&&qIdx<cat.questions.length){
            loadQuestion(state.currentCatId,qIdx,state.currentTeamIndex);
          }
        }
        _pushRemoteState();
      }
    }
    else if(m.action==='ping'){
      _remoteChannel.postMessage({action:'state_update',payload:_buildRemoteState()});
    }
  };
}

function _buildRemoteState(){
  const teams=(state.teams||[]).map(t=>({name:t.name,score:t.score||0,color:t.color||'#888'}));
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  const q=cat?.questions[state.currentQIndex];
  // Build options array for audience/remote display
  const options=(q&&q.options)?q.options.map((opt,i)=>({
    text:typeof opt==='object'?opt.text:opt,
    isCorrect:i===q.correct,
    isSelected:state.answered&&i===state._lastSelectedAnswer,
    image:q.optionImages&&q.optionImages[i]?q.optionImages[i]:null
  })):[];
  // Determine if options should be hidden (progressive reveal)
  const optRevealed=state.optionsRevealed||0;
  const progressiveReveal=!!(state.settings&&state.settings.progressiveReveal);
  return {
    teams,
    currentTeam:getCurrentTeam()?.name||'',
    currentQ:q?q.text:'',
    currentQFull:q?q.text:'',
    currentCatName:cat?.name||'',
    currentCatIcon:cat?.icon||'',
    currentQIndex:state.currentQIndex??0,
    catTotalQs:cat?cat.questions.length:0,
    qDifficulty:q?.difficulty||'',
    qType:q?.type||'text',
    options,
    correctAnswer:q?q.correct:-1,
    optionsRevealed:optRevealed,
    progressiveReveal,
    answered:!!state.answered,
    selectedAnswer:state._lastSelectedAnswer??-1,
    answerLabelStyle:(state.settings&&state.settings.answerLabelStyle)||'arabic',
    timeLeft:state.timeLeft??0,
    timerTotal:state.timerTotal||30,
    timerRunning:!!(state.timerInterval),
    musicPlaying:!!state.musicPlaying,
    gameActive:!!state.gameActive,
    currentView:document.querySelector('.view-container:not(.hidden)')?.id||'',
    teamMembers:(state.teams||[]).map(t=>(t.members||[]).map(m=>typeof m==='object'?m.name:m)),
    teamImages:(state.teams||[]).map(t=>!!t.teamImage),
    categories:(state.categories||[]).map(c=>({id:c.id,name:c.name,icon:c.icon||'',qCount:c.questions.length,type:c.type||'regular'})),
    buzzerActive:!!state.buzzerActive,
    buzzerWinner:state.buzzerWinner||null,
    currentTeamId:getCurrentTeam()?.id||'',
    currentTeamColor:getCurrentTeam()?.color||'',
    currentTeamIdx:state.currentTeamIndex||0,
    lang:I18n.getCurrentLang(),
    fitbAnswer:q&&q.type==='fitb'?(q.fitbAnswer||''):'',
    // Enhanced data for audience screen section bar and status
    currentViewName:document.querySelector('.view-container:not(.hidden)')?.id||'',
    usedQuestionsCount:state.usedQuestions?Object.values(state.usedQuestions).reduce((sum,s)=>sum+(s?s.size:0),0):0,
    totalQuestionsCount:getPlayableQuestionCount(),
    competitionName:state.settings.name||state.settings.competitionName||'',
    tiebreakerActive:_tiebreakerActive,
    tiebreakerQuestionIndex:_tiebreakerQIndex,
    tiebreakerTotal:_tiebreakerQuestions.length,
    tiebreakerCurrentQ:_tiebreakerActive&&_tiebreakerQuestions[_tiebreakerQIndex]?_tiebreakerQuestions[_tiebreakerQIndex].text:'',
    tiebreakerCurrentOptions:_tiebreakerActive&&_tiebreakerQuestions[_tiebreakerQIndex]?(_tiebreakerQuestions[_tiebreakerQIndex].options||[]):[],
    tiebreakerCurrentCorrect:_tiebreakerActive&&_tiebreakerQuestions[_tiebreakerQIndex]?(_tiebreakerQuestions[_tiebreakerQIndex].correct??-1):-1,
    tiebreakerCurrentTime:_tiebreakerActive?Math.max(0,Math.round(_tiebreakerTimerTotal-(Date.now()-_tiebreakerTimerStart)/1000)):0,
    tiebreakerTimerTotal:_tiebreakerTimerTotal||0,
    tiebreakerTiedTeams:_tiebreakerActive?_getTiedTeams().map(t=>({name:t.name,score:t.score||0,color:t.color||'#888',id:t.id})):[],
    tiebreakerPoints:(state.settings&&state.settings.tiebreakerPoints)||1,
  };
}

function showRemotePanel(){
  if(!_remoteChannel)initRemoteControl();
  // Build the remote window HTML inline
  const remoteHTML=_buildRemoteWindowHTML();
  if(_remoteWin&&!_remoteWin.closed){_remoteWin.focus();return;}
  _remoteWin=window.open('','quiz_remote_panel','width=440,height=680,resizable=yes,scrollbars=yes');
  if(!_remoteWin){toast(I18n.t('toast.remoteWindowBlocked'),'danger');return;}
  _remoteWin.document.open();
  _remoteWin.document.write(remoteHTML);
  _remoteWin.document.close();
  // Push state every 500ms for near-instantaneous remote control updates
  clearInterval(_remotePingTimer);
  _remotePingTimer=setInterval(()=>{
    if(_remoteWin&&_remoteWin.closed){clearInterval(_remotePingTimer);return;}
    if(_remoteChannel) _remoteChannel.postMessage({action:'state_update',payload:_buildRemoteState()});
  },500);
  toast(I18n.t('toast.remoteWindowOpen'),'success');
}

function _buildRemoteWindowHTML(){
  const isAr=I18n.getCurrentLang()!=='en';
  const dir=isAr?'rtl':'ltr';
  const lang=I18n.getCurrentLang();
  const t=function(k,fb){return I18n.t(k)||fb||k;};
  return `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${t('remote.title','📡 لوحة التحكم عن بُعد')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Cairo',sans-serif;background:#09091f;color:#e0e0ff;direction:${dir};min-height:100vh;display:flex;flex-direction:column;-webkit-tap-highlight-color:transparent;overflow-x:hidden}
.rc-header{background:#0e0e2e;padding:10px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid #2a2a5a;position:sticky;top:0;z-index:10}
.rc-title{font-size:.9rem;font-weight:900;color:#00e8d0;flex:1}
.rc-status{width:8px;height:8px;border-radius:50%;background:#00e676;box-shadow:0 0 6px #00e676;animation:blink 2s ease infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
.rc-turn-bar{padding:8px 14px;background:linear-gradient(90deg,rgba(0,232,208,.1),transparent);border-bottom:1px solid #2a2a5a;font-size:.8rem;font-weight:700;display:flex;align-items:center;gap:8px;min-height:36px}
.rc-turn-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;animation:pulse 1.5s ease infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}
.rc-scores{display:flex;flex-direction:column;gap:5px;padding:10px 12px}
.rc-score-row{display:flex;align-items:center;gap:6px;padding:6px 10px;border-radius:10px;background:#13133a;border:1px solid #2a2a5a;flex-wrap:wrap}
.rc-score-row.leader{border-color:#f5c842;background:#1a1508}
.rc-team-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
.rc-team-name{flex:1;font-size:.78rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:50px}
.rc-team-members{font-size:.6rem;color:#666;width:100%;padding-${isAr?'right':'left'}:18px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rc-team-score{font-size:.95rem;font-weight:900;color:#00e8d0;min-width:28px;text-align:center}
.rc-adj-btns{display:flex;gap:3px;margin-${isAr?'right':'left'}:auto}
.rc-adj{width:26px;height:26px;border-radius:6px;border:1px solid #2a2a5a;background:#1a1a3e;color:#e0e0ff;font-size:.7rem;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'Cairo',sans-serif}
.rc-adj:active{transform:scale(.93)}
.rc-adj.plus{color:#00e676;border-color:#00e67644}
.rc-adj.minus{color:#ff3b5c;border-color:#ff3b5c44}
.rc-divider{height:1px;background:#2a2a5a;margin:0 12px}
.rc-current{padding:6px 14px;font-size:.72rem;color:#8888cc;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px}
.rc-q-text{padding:0 14px 6px;font-size:.82rem;color:#ddd;line-height:1.6;max-height:120px;overflow-y:auto;word-break:break-word}
.rc-q-badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:.65rem;font-weight:700;background:rgba(0,232,208,.12);color:#00e8d0;border:1px solid rgba(0,232,208,.25)}
.rc-timer-bar{height:6px;background:#2a2a5a;margin:0 14px 8px;border-radius:3px;overflow:hidden;position:relative}
.rc-timer-fill{height:100%;background:#00e8d0;border-radius:3px;transition:width .9s linear}
.rc-timer-fill.warn{background:#f5c842}
.rc-timer-fill.danger{background:#ff3b5c}
.rc-timer-ctrls{display:flex;gap:4px;padding:0 12px 8px;flex-wrap:wrap;align-items:center}
.rc-timer-time{font-size:.75rem;font-weight:900;color:#00e8d0;min-width:30px;text-align:center}
.rc-timer-input{width:48px;height:28px;border-radius:6px;border:1px solid #2a2a5a;background:#13133a;color:#e0e0ff;font-family:'Cairo',sans-serif;font-size:.7rem;text-align:center;padding:0 4px}
.rc-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px 12px}
.rc-btn{padding:8px 6px;border-radius:10px;border:1.5px solid #2a2a5a;background:#13133a;color:#e0e0ff;font-family:'Cairo',sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .15s;text-align:center;display:flex;flex-direction:column;align-items:center;gap:2px;touch-action:manipulation}
.rc-btn:hover{background:#1e1e5a;border-color:#00e8d0}
.rc-btn:active{transform:scale(.95)}
.rc-btn.wide{grid-column:1/-1}
.rc-btn.primary{background:linear-gradient(135deg,#1a3a8a,#2d5be3);border-color:#2d5be3;color:#fff}
.rc-btn.accent{background:linear-gradient(135deg,#004a5a,#00e8d0);border-color:#00e8d0;color:#001a1f}
.rc-btn.success{background:linear-gradient(135deg,#004a20,#00e676);border-color:#00e676;color:#001a0e}
.rc-btn.danger{background:linear-gradient(135deg,#5a0010,#ff3b5c);border-color:#ff3b5c;color:#fff}
.rc-btn.warn{background:linear-gradient(135deg,#5a4a00,#f5c842);border-color:#f5c842;color:#1a1000}
.rc-btn .ic{font-size:1rem}
.rc-cat-nav{padding:4px 12px 6px;max-height:100px;overflow-y:auto;display:flex;gap:4px;flex-wrap:wrap}
.rc-cat-btn{padding:3px 8px;border-radius:8px;border:1px solid #2a2a5a;background:#13133a;color:#aaa;font-family:'Cairo',sans-serif;font-size:.65rem;font-weight:700;cursor:pointer;white-space:nowrap}
.rc-cat-btn:active{background:#1e1e5a}
.rc-cat-btn.active{border-color:#00e8d0;color:#00e8d0}
.rc-q-jump{display:flex;gap:4px;padding:4px 12px 8px;align-items:center}
.rc-q-jump input{width:40px;height:28px;border-radius:6px;border:1px solid #2a2a5a;background:#13133a;color:#e0e0ff;font-family:'Cairo',sans-serif;font-size:.7rem;text-align:center}
.rc-q-jump button{padding:4px 10px;border-radius:6px;border:1px solid #2a2a5a;background:#13133a;color:#e0e0ff;font-family:'Cairo',sans-serif;font-size:.7rem;font-weight:700;cursor:pointer}
.rc-q-jump button:active{background:#1e1e5a}
.rc-answer-status{padding:4px 14px 6px;font-size:.75rem;font-weight:700;display:flex;align-items:center;gap:6px}
.rc-answer-status.answered{color:#00e676}
.rc-answer-status.pending{color:#f5c842}
.rc-footer{padding:6px 12px;font-size:.6rem;color:#444;text-align:center;margin-top:auto;border-top:1px solid #2a2a5a}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2a5a;border-radius:2px}
</style>
</head><body>
<div class="rc-header">
  <div class="rc-status" id="rc-dot"></div>
  <div class="rc-title">📡 ${t('remote.title','لوحة التحكم عن بُعد')}</div>
  <button id="rc-back-btn" onclick="try{window.close();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}" style="display:none;position:fixed;top:8px;${isAr?'left':'right'}:8px;z-index:100;padding:4px 12px;border-radius:8px;border:1px solid #2a2a5a;background:rgba(19,19,58,.85);color:#aaa;font-family:Cairo,sans-serif;font-size:.7rem;font-weight:700;cursor:pointer;opacity:.6;transition:opacity .2s;backdrop-filter:blur(4px)" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.6'">← ${t('nav.backToQuiz','رجوع للمسابقة')}</button>
</div>
<script>try{if(window.opener)document.getElementById('rc-back-btn').style.display='block';}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}<\/script>
<div class="rc-turn-bar" id="rc-turn-bar"><span style="color:#555">${t('audience.waiting','في انتظار بدء المسابقة...')}</span></div>
<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:4px 14px;background:#0a0a22;border-bottom:1px solid #2a2a5a;font-size:.65rem;color:#666;flex-wrap:wrap" id="rc-section-bar">
  <span id="rc-sec-status">⚪ ${t('remote.ready','جاهز')}</span>
</div>
<div class="rc-scores" id="rc-scores">
  <div style="color:#555;font-size:.75rem;text-align:center;padding:6px">—</div>
</div>
<div class="rc-divider"></div>
<div class="rc-answer-status pending" id="rc-answer-status">⏳ ${t('question.noAnswer','بانتظار الإجابة')}</div>
<div class="rc-current" id="rc-current"><span>—</span><span id="rc-q-badge"></span></div>
<div class="rc-q-text" id="rc-q-text"></div>
<div class="rc-timer-bar"><div class="rc-timer-fill" id="rc-timer-fill" style="width:100%"></div></div>
<div class="rc-timer-ctrls">
  <span class="rc-timer-time" id="rc-timer-time">0:30</span>
  <button class="rc-btn" style="padding:4px 8px;font-size:.7rem" onclick="send('timer')" id="rc-timer-toggle-btn">⏱ ${t('remote.timerCtrl','التحكم بالعداد')}</button>
  <button class="rc-btn" style="padding:4px 8px;font-size:.7rem" onclick="sendAction('pauseTimer')" id="rc-pause-btn">⏸ ${t('remote.pauseTimer','إيقاف مؤقت')}</button>
  <input type="number" class="rc-timer-input" id="rc-custom-time" value="30" min="5" max="600" placeholder="${t('remote.customTime','وقت مخصص')}">
  <button class="rc-btn" style="padding:4px 8px;font-size:.7rem" onclick="setCustomTime()">⏲ ${t('remote.setTime','تعيين الوقت')}</button>
</div>
<div class="rc-divider"></div>
<div class="rc-grid">
  <button class="rc-btn primary" onclick="send('next')"><span class="ic">⏭</span>${t('question.next','التالي')}</button>
  <button class="rc-btn accent" onclick="send('reveal')"><span class="ic">🔍</span>${t('question.reveal','كشف')}</button>
  <button class="rc-btn" onclick="send('categories')"><span class="ic">📂</span>${t('transition.categories','الأقسام')}</button>
  <button class="rc-btn" onclick="send('scores')"><span class="ic">🏆</span>${t('scores.title','النتائج')}</button>
  <button class="rc-btn" onclick="send('music')" id="rc-music-btn"><span class="ic">🎵</span>${t('btn.music','موسيقى')}</button>
  <button class="rc-btn warn" onclick="sendAction('confetti')"><span class="ic">🎊</span>${t('remote.confetti','إطلاق الاحتفال')}</button>
  <button class="rc-btn" onclick="sendAction('whiteboard')"><span class="ic">🖊️</span>${t('remote.whiteboard','السبورة')}</button>
  <button class="rc-btn" onclick="sendAction('resetBuzzer')"><span class="ic">🔔</span>${t('remote.resetBuzzer','إعادة المُسرِّع')}</button>
  <button class="rc-btn success wide" onclick="send('podium')"><span class="ic">🏆</span>${t('podium.closing','المنصة')}</button>
  <button class="rc-btn warn wide" id="rc-tiebreaker-btn" onclick="sendAction('tiebreaker')"><span class="ic">⚡</span>${t('tiebreaker.start','جولة الحسم')}</button>
</div>
<!-- Tiebreaker In-Progress Controls (shown/hidden dynamically) -->
<div id="rc-tiebreaker-controls" style="display:none;padding:6px 12px">
  <div style="font-size:.72rem;font-weight:700;color:#f5c842;margin-bottom:4px">⚡ ${t('tiebreaker.title','جولة الحسم')}</div>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px" id="rc-tb-grant-btns"></div>
  <div style="display:flex;gap:6px">
    <button class="rc-btn accent" style="flex:1" onclick="sendAction('nextTiebreaker')"><span class="ic">⏭</span>${t('tiebreaker.nextQuestion','التالي')}</button>
    <button class="rc-btn danger" style="flex:1" onclick="sendAction('skipTiebreaker')"><span class="ic">✕</span>${t('tiebreaker.endRound','إنهاء')}</button>
  </div>
</div>
<div class="rc-divider"></div>
<div style="padding:4px 12px;font-size:.68rem;font-weight:700;color:#888">📂 ${t('remote.catNav','تصفح الأقسام')}</div>
<div class="rc-cat-nav" id="rc-cat-nav"></div>
<div class="rc-q-jump">
  <span style="font-size:.68rem;color:#888">⏭ ${t('remote.gotoQ','الانتقال لسؤال')}:</span>
  <input type="number" id="rc-q-num" min="1" value="1">
  <button onclick="gotoQuestion()">${t('admin.confirm','تأكيد')}</button>
</div>
<div class="rc-footer">${t('remote.footer','يُغلق تلقائياً عند إغلاق نافذة المسابقة')}</div>
<script>
  var ch=null;
  var _isAr=${isAr};
  // ── Phase 1.2: Bilingual translation maps for remote window ──
  var _trAr={'remote.sep':'، ','remote.turnLabel':'🎯 دور: ','remote.quizNotActive':'المسابقة غير نشطة','remote.questionLabel':'سؤال ','remote.gameActive':'🟢 جارية','remote.gameWaiting':'⚪ في الانتظار','remote.answeredBadge':'✅ تمت الإجابة','remote.pendingBadge':'⏳ بانتظار الإجابة','remote.canCloseWindow':'يمكن إغلاق هذه النافذة','browser.windowClosed':'أُغلقت نافذة المسابقة'};
  var _trEn={'remote.sep':', ','remote.turnLabel':'🎯 Turn: ','remote.quizNotActive':'Quiz is not active','remote.questionLabel':'Question ','remote.gameActive':'🟢 Active','remote.gameWaiting':'⚪ Waiting','remote.answeredBadge':'✅ Answered','remote.pendingBadge':'⏳ Pending','remote.canCloseWindow':'You can close this window','browser.windowClosed':'Quiz window closed'};
  function _t(k){return _isAr?(_trAr[k]||k):(_trEn[k]||k);}
  function init(){
    if(!('BroadcastChannel' in window)){document.body.innerHTML='<div style="padding:24px;color:red">'+('${t('browser.notSupported','المتصفح لا يدعم هذه الميزة')}')+'</div>';return;}
    ch=new BroadcastChannel('quiz_remote_v1');
    ch.onmessage=function(e){
      var m=e.data;
      if(!m)return;
      if(m.action==='state_update'&&m.payload) updateUI(m.payload);
      if(m.action==='host_closed'){
        document.body.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;font-family:Cairo,sans-serif;color:#e0e0ff;background:#09091f;text-align:center;direction:'+(_isAr?'rtl':'ltr')+'"><div style="font-size:2.5rem">📴</div><div style="font-weight:700;font-size:1.1rem">'+_t('browser.windowClosed')+'</div><div style="font-size:.85rem;color:#666">'+_t('remote.canCloseWindow')+'</div></div>';
        try{ch.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_224")}catch(_){}}
      }
    };
    ch.postMessage({action:'ping'});
    // Faster ping every 800ms for near-instantaneous remote sync
    var _rcPingInterval=setInterval(function(){try{ch.postMessage({action:'ping'});}catch(e){clearInterval(_rcPingInterval);}},800);
    window.addEventListener('unload',function(){clearInterval(_rcPingInterval);try{if(ch)ch.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_225")}catch(_){}}});
  }
  function send(action){
    if(!ch)return;
    ch.postMessage({action:action,ts:Date.now()});
    flashDot();
  }
  function sendAction(action,payload){
    if(!ch)return;
    ch.postMessage({action:action,payload:payload||{},ts:Date.now()});
    flashDot();
  }
  function flashDot(){
    var dot=document.getElementById('rc-dot');
    if(dot){dot.style.background='#f5c842';setTimeout(function(){dot.style.background='#00e676';},400);}
  }
  function adjustScore(teamIdx,delta){
    sendAction('adjustScore',{teamIdx:teamIdx,delta:delta});
  }
  function setCustomTime(){
    var val=parseInt(document.getElementById('rc-custom-time').value)||30;
    sendAction('setTimerTime',{seconds:val});
  }
  function gotoQuestion(){
    var num=parseInt(document.getElementById('rc-q-num').value)||1;
    sendAction('gotoQuestion',{questionNum:num});
  }
  function selectCat(catId){
    sendAction('selectCategory',{catId:catId});
  }
  function updateUI(s){
    // Expose globally for direct window.opener access
    window._lastState=s;
    // Update language from state
    if(s.lang)_isAr=(s.lang!=='en');
    var sep=_t('remote.sep');
    var turnLabel=_t('remote.turnLabel');
    var notActiveLabel=_t('remote.quizNotActive');
    var qLabel=_t('remote.questionLabel');
    // Section status bar
    var secBar=document.getElementById('rc-section-bar');
    if(secBar){
      var secParts=[];
      secParts.push(s.gameActive?_t('remote.gameActive'):_t('remote.gameWaiting'));
      if(s.currentCatName&&s.gameActive) secParts.push('📂 '+s.currentCatName);
      if(s.currentQIndex!==undefined&&s.catTotalQs&&s.gameActive) secParts.push(qLabel+(s.currentQIndex+1)+'/'+s.catTotalQs);
      if(s.usedQuestionsCount!==undefined&&s.totalQuestionsCount>0) secParts.push('📊 '+s.usedQuestionsCount+'/'+s.totalQuestionsCount);
      if(s.teams&&s.teams.length) secParts.push('👥 '+s.teams.length);
      secBar.innerHTML=secParts.join(' │ ');
    }
    // Turn bar
    var turnBar=document.getElementById('rc-turn-bar');
    if(turnBar){
      if(s.currentTeam&&s.gameActive){
        turnBar.innerHTML='<div class="rc-turn-dot" style="background:'+(s.currentTeamColor||'#00e8d0')+'"></div><span style="color:'+(s.currentTeamColor||'#00e8d0')+'">'+turnLabel+s.currentTeam+'</span>';
      }else if(!s.gameActive){
        turnBar.innerHTML='<span style="color:#555">'+notActiveLabel+'</span>';
      }
    }
    // Scores with adjust buttons
    var box=document.getElementById('rc-scores');
    if(s.teams&&s.teams.length){
      var sorted=[].concat(s.teams).sort(function(a,b){return b.score-a.score;});
      var maxScore=sorted[0].score;
      box.innerHTML=sorted.map(function(t,si){
        var origIdx=s.teams.indexOf(t);
        var members=(s.teamMembers&&s.teamMembers[origIdx])?s.teamMembers[origIdx].join(sep):'';
        var memberHTML=members?'<div class="rc-team-members">👥 '+members+'</div>':'';
        return '<div class="rc-score-row'+(t.score===maxScore&&t.score>0?' leader':'')+'">'
          +'<div class="rc-team-dot" style="background:'+t.color+'"></div>'
          +'<div class="rc-team-name">'+t.name+'</div>'
          +'<div class="rc-team-score">'+t.score+'</div>'
          +'<div class="rc-adj-btns">'
          +'<button class="rc-adj plus" onclick="adjustScore('+origIdx+',5)">+5</button>'
          +'<button class="rc-adj plus" onclick="adjustScore('+origIdx+',2)">+2</button>'
          +'<button class="rc-adj plus" onclick="adjustScore('+origIdx+',1)">+1</button>'
          +'<button class="rc-adj minus" onclick="adjustScore('+origIdx+',-1)">-1</button>'
          +'<button class="rc-adj minus" onclick="adjustScore('+origIdx+',-2)">-2</button>'
          +'</div>'+memberHTML+'</div>';
      }).join('');
    }
    // Answer status
    var ansSt=document.getElementById('rc-answer-status');
    if(ansSt){
      if(s.answered){ansSt.className='rc-answer-status answered';ansSt.textContent=_t('remote.answeredBadge');}
      else{ansSt.className='rc-answer-status pending';ansSt.textContent=_t('remote.pendingBadge');}
    }
    // Current info
    var cur=document.getElementById('rc-current');
    if(cur){
      var parts=[];
      if(s.currentCatName)parts.push('📂 '+s.currentCatName);
      if(s.currentQIndex!==undefined&&s.catTotalQs)parts.push(qLabel+(s.currentQIndex+1)+'/'+s.catTotalQs);
      cur.innerHTML='<span>'+parts.join(' | ')+'</span>';
    }
    var badge=document.getElementById('rc-q-badge');
    if(badge){
      var badges=[];
      if(s.qDifficulty)badges.push(s.qDifficulty);
      if(s.qType&&s.qType!=='text')badges.push(s.qType);
      badge.innerHTML=badges.map(function(b){return '<span class="rc-q-badge">'+b+'</span>';}).join(' ');
    }
    // Question text (full)
    var qt=document.getElementById('rc-q-text');
    if(qt) qt.textContent=s.currentQFull||s.currentQ||'';
    // Timer bar
    var fill=document.getElementById('rc-timer-fill');
    if(fill&&s.timerTotal>0){
      var pct=Math.max(0,Math.round(s.timeLeft/s.timerTotal*100));
      fill.style.width=pct+'%';
      fill.className='rc-timer-fill'+(pct<20?' danger':pct<40?' warn':'');
    }
    // Timer text
    var tt=document.getElementById('rc-timer-time');
    if(tt&&s.timeLeft!==undefined){
      var min=Math.floor(s.timeLeft/60);var sec=s.timeLeft%60;
      tt.textContent=min+':'+(sec<10?'0':'')+sec;
    }
    // Music btn
    var mb=document.getElementById('rc-music-btn');
    if(mb) mb.style.opacity=s.musicPlaying?'1':'.55';
    // Category nav
    var catNav=document.getElementById('rc-cat-nav');
    if(catNav&&s.categories){
      catNav.innerHTML=s.categories.map(function(c){
        return '<button class="rc-cat-btn" onclick="selectCat(\\''+c.id+'\\')">'+(c.icon||'📂')+' '+c.name+' ('+c.qCount+')</button>';
      }).join('');
    }
    // Update q jump max
    var qInput=document.getElementById('rc-q-num');
    if(qInput&&s.catTotalQs) qInput.max=s.catTotalQs;
    // ── Tiebreaker Controls ──
    var tbBtn=document.getElementById('rc-tiebreaker-btn');
    var tbCtrl=document.getElementById('rc-tiebreaker-controls');
    var tbGrantBtns=document.getElementById('rc-tb-grant-btns');
    if(s.tiebreakerActive){
      if(tbBtn)tbBtn.style.display='none';
      if(tbCtrl)tbCtrl.style.display='block';
      if(tbGrantBtns&&s.tiebreakerTiedTeams){
        var pts=s.tiebreakerPoints||1;
        tbGrantBtns.innerHTML=s.tiebreakerTiedTeams.map(function(t){
          return '<button class="rc-btn accent" style="flex:1;padding:6px;font-size:.7rem" onclick="sendAction(\\'grantTiebreakerPoint\\',{teamId:\\''+t.id+'\\'})">+'+pts+' '+t.name+'</button>';
        }).join('');
      }
    }else{
      if(tbBtn)tbBtn.style.display='';
      if(tbCtrl)tbCtrl.style.display='none';
    }
  }
  init();
<\/script>
</body></html>`;
}

function _sendRemote(action){
  if(!_remoteChannel)initRemoteControl();
  if(_remoteChannel)_remoteChannel.postMessage({action:action,ts:Date.now()});
}

// Push full state to audience/remote screens immediately (no delay)
// Near-instantaneous remote sync — reduced throttle to 50ms for real-time control
var _lastPushTime=0;
// Dedicated BroadcastChannel for sound events (works even without remote control)
var _soundChannel=null;
try{_soundChannel=new BroadcastChannel('quiz_remote_v1');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_226")}catch(_){}}
var _pushPending=false;
window._pushRemoteState = _pushRemoteState;
function _pushRemoteState(){
  var now=Date.now();
  // Throttle: only push at most every 50ms (near-instantaneous for remote control)
  if(now-_lastPushTime<50){
    if(!_pushPending){
      _pushPending=true;
      setTimeout(function(){_pushPending=false;_pushRemoteState();},50-(now-_lastPushTime));
    }
    return;
  }
  _lastPushTime=now;
  try{
    var payload=_buildRemoteState();
    payload._ts=Date.now();
    // Primary: BroadcastChannel
    if(_remoteChannel){
      try{_remoteChannel.postMessage({action:'state_update',payload:payload});}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    }
    // Secondary: localStorage fallback for cross-origin audience windows
    try{localStorage.setItem('quiz_audience_state',JSON.stringify(payload));}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    // Tertiary: sessionStorage for same-tab recovery
    try{sessionStorage.setItem('quiz_audience_state',JSON.stringify(payload));}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    // Push directly to open audience/remote windows via window reference
    // V12-fix: Push to audience window — silently handle errors (window may still be loading)
    if(_audienceWin&&!_audienceWin.closed){
      try{
        if(typeof _audienceWin.updateAll==='function'){_audienceWin.updateAll(payload);}
      }catch(e){/* silently ignore — audience window may still be loading or cross-origin */}
      // V15-fix: Also push via postMessage as additional fallback (works even when direct call fails)
      try{_audienceWin.postMessage({action:'audience_state_update',payload:payload},'*');}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    }
    if(_remoteWin&&!_remoteWin.closed){
      try{
        if(typeof _remoteWin.updateUI==='function'){_remoteWin.updateUI(payload);}
      }catch(e){/* silently ignore — remote window may still be loading */}
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
}

// Function called by audience screen via window.opener to get current state
function _getAudienceState(){
  try{
    var payload=_buildRemoteState();
    payload._ts=Date.now();
    return payload;
  }catch(e){
    // Fallback: try to read from localStorage
    try{
      var lsData=localStorage.getItem('quiz_audience_state');
      if(lsData){return JSON.parse(lsData);}
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_227")}catch(_){}}
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  CERTIFICATE BACKGROUND IMAGE SUPPORT
// ═══════════════════════════════════════════════════════════════

function loadCertBgImage(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    state.settings.certBgImage=e.target.result;
    // Try to get dimensions
    const img=new Image();
    img.onload=()=>{
      state.settings.certBgWidth=img.naturalWidth;
      state.settings.certBgHeight=img.naturalHeight;
      _applyCertBg();
      saveState();
      toast(I18n.t('cert.bgSet'),'success');
      // Store in MediaDB for large images
      try{MediaDB.set('s_certBgImage',state.settings.certBgImage);}catch(err){console.error("[Error]",err);}
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
  input.value='';
}

function loadCertBgFromCert(input){
  const file=input.files[0];if(!file)return;
  if(file.type==='application/pdf'){
    // For PDF, we just store dimensions hint
    toast(I18n.t('toast.pdfNotForCertBg'),'info');
    input.value='';
    return;
  }
  const reader=new FileReader();
  reader.onload=e=>{
    state.settings.certBgImage=e.target.result;
    const img=new Image();
    img.onload=()=>{
      state.settings.certBgWidth=img.naturalWidth;
      state.settings.certBgHeight=img.naturalHeight;
      _applyCertBg();
      saveState();
      toast(I18n.t('cert.bgSet'),'success');
      try{MediaDB.set('s_certBgImage',state.settings.certBgImage);}catch(err){console.error("[Error]",err);}
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
  input.value='';
}

function clearCertBgImage(){
  state.settings.certBgImage=null;
  state.settings.certBgWidth=null;
  state.settings.certBgHeight=null;
  const certContent=document.getElementById('certificate-content');
  if(certContent){
    certContent.style.backgroundImage='';
    certContent.style.backgroundSize='';
    certContent.style.backgroundPosition='';
    certContent.style.backgroundRepeat='';
  }
  try{MediaDB['delete']('s_certBgImage');}catch(err){console.error("[Error]",err);}
  saveState();
  toast(I18n.t('cert.bgNone'),'info');
  // Re-apply certificate settings to restore gradient
  _applyCertSettings();
}

function _applyCertBg(){
  const certContent=document.getElementById('certificate-content');
  if(!certContent)return;
  if(state.settings.certBgImage){
    certContent.style.backgroundImage='url('+state.settings.certBgImage+')';
    certContent.style.backgroundSize='cover';
    certContent.style.backgroundPosition='center';
    certContent.style.backgroundRepeat='no-repeat';
    if(state.settings.certBgWidth&&state.settings.certBgHeight){
      certContent.style.minHeight=Math.round(state.settings.certBgHeight/state.settings.certBgWidth*600)+'px';
    }
  }else{
    certContent.style.backgroundImage='';
    certContent.style.backgroundSize='';
    certContent.style.backgroundPosition='';
    certContent.style.minHeight='';
  }
}

// ═══════════════════════════════════════════════════════════════
//  AUDIENCE SCREEN — New window for projection
// ═══════════════════════════════════════════════════════════════

var _audienceWin=null;
var _audiencePingTimer=null;

function showAudienceScreen(){
  if(!_remoteChannel)initRemoteControl();
  const initialState=JSON.stringify(_buildRemoteState());
  const audienceHTML=_buildAudienceHTML(initialState);
  if(_audienceWin&&!_audienceWin.closed){_audienceWin.focus();return;}
  _audienceWin=window.open('','quiz_audience_screen','width=1200,height=800,resizable=yes,scrollbars=yes');
  if(!_audienceWin){toast(I18n.t('toast.audienceWindowBlocked'),'danger');return;}
  _audienceWin.document.open();
  _audienceWin.document.write(audienceHTML);
  _audienceWin.document.close();
  clearInterval(_audiencePingTimer);
  _audiencePingTimer=setInterval(()=>{
    if(_audienceWin&&_audienceWin.closed){clearInterval(_audiencePingTimer);return;}
    try{
      var payload=_buildRemoteState();payload._ts=Date.now();
      if(_remoteChannel)_remoteChannel.postMessage({action:'state_update',payload:payload});
      try{localStorage.setItem('quiz_audience_state',JSON.stringify(payload));}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      try{sessionStorage.setItem('quiz_audience_state',JSON.stringify(payload));}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      // V15-fix: Also push via postMessage for popup reliability
      try{_audienceWin.postMessage({action:'audience_state_update',payload:payload},'*');}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  },800);
  // V11-fix: Wait for audience window to be ready before pushing initial state
  // The audience window's updateAll function is defined inside a <script> that may not
  // have been parsed yet when document.close() returns. We use DOMContentLoaded to wait.
  var _audReady=false;
  try{
    _audienceWin.addEventListener('DOMContentLoaded',function(){
      _audReady=true;
      setTimeout(function(){try{_pushRemoteState();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}},120);
    });
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  // Fallback: also push after a delay in case DOMContentLoaded already fired or isn't supported
  setTimeout(function(){try{_pushRemoteState();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}},1500);
  // Immediate attempt (may silently fail if window not ready — that's OK, fallbacks cover it)
  setTimeout(function(){try{_pushRemoteState();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}},300);
  toast(I18n.t('toast.audienceWindowOpen'),'success');
}

function _buildAudienceHTML(initialStateJSON){
  const isAr=I18n.getCurrentLang()!=='en';
  const dir=isAr?'rtl':'ltr';
  const lang=I18n.getCurrentLang();
  const t=function(k,fb){return I18n.t(k)||fb||k;};
  const LETTERS_AR='أبجدهوزحطيكلمنسعفصقرشتثخذضظغ';
  const LETTERS_EN='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t('audience.title','🖥 شاشة الجمهور')}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Cairo',sans-serif;background:#0a0a1a;color:#e8e8ff;direction:${dir};min-height:100vh;height:100vh;max-height:100vh;display:flex;flex-direction:column;overflow-x:hidden}

/* ── HEADER ── */
.aud-header{background:linear-gradient(135deg,#0e0e2e,#0a0a22);padding:8px 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #2a2a5a;position:relative;z-index:10}
.aud-title{font-size:1rem;font-weight:900;color:#00e8d0;flex:1}
.aud-status{width:8px;height:8px;border-radius:50%;background:#00e676;animation:blink 2s ease infinite;flex-shrink:0}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}

/* ── SECTION STATUS BAR ── */
.aud-section-bar{background:linear-gradient(90deg,#12123a,#0e0e2e,#12123a);padding:6px 20px;display:flex;align-items:center;justify-content:center;gap:16px;border-bottom:1px solid #1a1a4a;font-size:.82rem;color:#8888cc;min-height:36px;flex-wrap:wrap;transition:all .4s}
.aud-section-bar .sec-item{display:flex;align-items:center;gap:5px;white-space:nowrap}
.aud-section-bar .sec-icon{font-size:.9rem}
.aud-section-bar .sec-label{color:#666;font-weight:700}
.aud-section-bar .sec-value{color:#ccc;font-weight:900}
.aud-section-bar .sec-active{color:#00e8d0;font-weight:900}
.aud-section-bar .sec-divider{width:1px;height:16px;background:#2a2a5a;flex-shrink:0}
.aud-section-badge{display:inline-block;padding:2px 10px;border-radius:12px;font-size:.72rem;font-weight:700;background:rgba(0,232,208,.12);color:#00e8d0;border:1px solid rgba(0,232,208,.2)}
.aud-section-badge.active-badge{background:rgba(0,232,208,.2);border-color:rgba(0,232,208,.4)}
.aud-section-badge.danger-badge{background:rgba(255,59,92,.12);color:#ff3b5c;border-color:rgba(255,59,92,.2)}
.aud-section-badge.warn-badge{background:rgba(245,200,66,.12);color:#f5c842;border-color:rgba(245,200,66,.2)}

/* ── RESULTS TICKER BAR ── */
.aud-results-ticker{background:rgba(0,0,0,.6);backdrop-filter:blur(8px);border-top:1px solid #2a2a5a;padding:6px 10px;display:flex;align-items:center;justify-content:center;gap:0;min-height:40px;flex-shrink:0}
.aud-ticker-team{display:flex;align-items:center;gap:6px;padding:0 14px;flex:1;justify-content:center;max-width:200px}
.aud-ticker-team+.aud-ticker-team{border-inline-start:1px solid #2a2a5a}
.aud-ticker-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.aud-ticker-name{font-size:.78rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px;color:#ccc}
.aud-ticker-score{font-size:1.1rem;font-weight:900;color:#00e8d0;min-width:24px;text-align:center}
.aud-ticker-active .aud-ticker-name{color:#00e8d0}
.aud-ticker-active .aud-ticker-score{color:#fff}

/* ── TABS ── */
.aud-tabs{display:flex;background:#0e0e2e;border-bottom:1px solid #2a2a5a}
.aud-tab{flex:1;padding:9px;text-align:center;font-weight:700;font-size:.82rem;color:#666;cursor:pointer;border-bottom:3px solid transparent;transition:all .2s}
.aud-tab.active{color:#00e8d0;border-bottom-color:#00e8d0}
.aud-tab:hover{color:#aaa}

/* ── CONTENT ── */
.aud-content{flex:1;overflow-y:auto;display:flex;flex-direction:column;min-height:0}
.aud-panel{display:none;flex:1;padding:16px 20px;flex-direction:column;overflow-y:auto;min-height:0}
.aud-panel.active{display:flex}

/* ── WAITING SCREEN ── */
.aud-waiting{display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:20px;color:#555;padding:40px}
.aud-waiting-icon{font-size:4rem;animation:float 3s ease infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.aud-waiting-teams{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px}
.aud-waiting-team{padding:10px 20px;border-radius:12px;background:#13133a;border:2px solid #2a2a5a;text-align:center;min-width:110px;transition:all .3s}
.aud-waiting-team .wt-name{font-size:.85rem;font-weight:700;margin-bottom:2px}
.aud-waiting-team .wt-score{font-size:1.3rem;font-weight:900;color:#00e8d0}

/* ── QUESTION AREA ── */
.aud-q-cat{font-size:.85rem;color:#888;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
.aud-q-text{font-size:clamp(1.1rem,3.5vw,2.2rem);font-weight:900;line-height:1.4;margin-bottom:10px;word-break:break-word;text-align:center;color:#fff;max-height:30vh;overflow-y:auto}
.aud-options{display:flex;flex-direction:column;gap:8px;max-width:800px;margin:0 auto;width:100%}
.aud-option{padding:12px 18px;border-radius:12px;border:2px solid #2a2a5a;background:#13133a;font-size:clamp(.95rem,2.5vw,1.3rem);font-weight:700;color:#e0e0ff;text-align:center;transition:all .3s;display:flex;align-items:center;gap:12px;justify-content:center}
.aud-option .opt-letter{min-width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:900;flex-shrink:0}
.aud-option .opt-text{flex:1;text-align:center}
.aud-option.correct{border-color:#00e676;background:rgba(0,230,118,.15);color:#00e676;box-shadow:0 0 20px rgba(0,230,118,.15)}
.aud-option.correct .opt-letter{background:rgba(0,230,118,.25);color:#00e676}
.aud-option.wrong{border-color:#ff3b5c;background:rgba(255,59,92,.1);color:#ff3b5c}
.aud-option.hidden-opt{opacity:0;pointer-events:none;height:0;padding:0;margin:0;border:none;overflow:hidden;transition:all .3s}
.aud-option.revealed-opt{opacity:1;height:auto;padding:12px 18px;margin:0;border:2px solid #2a2a5a}

/* ── TIMER ── */
.aud-timer-wrap{display:flex;align-items:center;justify-content:center;gap:14px;margin:12px 0}
.aud-timer-ring{width:70px;height:70px;position:relative}
.aud-timer-ring svg{transform:rotate(-90deg);width:70px;height:70px}
.aud-timer-ring circle{fill:none;stroke-width:5;stroke-linecap:round}
.aud-timer-ring .ring-bg{stroke:#2a2a5a}
.aud-timer-ring .ring-fill{stroke:#00e8d0;transition:stroke-dashoffset .5s linear}
.aud-timer-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:900;color:#00e8d0}

/* ── TURN INDICATOR ── */
.aud-turn-indicator{font-size:1rem;font-weight:900;padding:8px 18px;border-radius:10px;text-align:center;margin-bottom:10px}

/* ── ANSWERED BADGE ── */
.aud-answered-badge{font-size:.9rem;font-weight:700;padding:5px 14px;border-radius:20px;text-align:center;margin:6px 0;display:inline-block;align-self:center}
.aud-answered-badge.yes{color:#00e676;background:rgba(0,230,118,.1)}
.aud-answered-badge.no{color:#f5c842;background:rgba(245,200,66,.1)}

/* ── SCOREBOARD TAB ── */
.aud-sb{width:100%;max-width:900px;margin:0 auto}
.aud-sb-row{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:#13133a;border:2px solid #2a2a5a;margin-bottom:8px;transition:all .3s}
.aud-sb-row.leader{border-color:#f5c842;background:linear-gradient(135deg,#1a1508,#13133a);box-shadow:0 0 20px rgba(245,200,66,.08)}
.aud-sb-rank{font-size:1.5rem;font-weight:900;min-width:36px;text-align:center}
.aud-sb-rank.gold{color:#f5c842}
.aud-sb-rank.silver{color:#c0c0c0}
.aud-sb-rank.bronze{color:#cd7f32}
.aud-sb-avatar{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:900;color:#fff;flex-shrink:0}
.aud-sb-info{flex:1}
.aud-sb-name{font-size:1.1rem;font-weight:900}
.aud-sb-members{font-size:.72rem;color:#888;margin-top:2px}
.aud-sb-score{font-size:1.8rem;font-weight:900;color:#00e8d0}
.aud-sb-bar-wrap{width:100%;height:4px;background:#1a1a3a;border-radius:2px;margin-top:4px;overflow:hidden}
.aud-sb-bar-fill{height:100%;border-radius:2px;transition:width .5s ease}

/* ── QUESTIONS TAB ── */
.aud-qq{max-width:800px;margin:0 auto;width:100%}
.aud-qq-cat{font-size:.95rem;color:#888;margin-bottom:6px}
.aud-qq-text{font-size:clamp(1.1rem,3.5vw,2rem);font-weight:900;line-height:1.5;word-break:break-word;margin-bottom:14px;text-align:center;color:#fff}
.aud-qq-meta{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:16px}
.aud-qq-badge{padding:3px 12px;border-radius:20px;font-size:.78rem;font-weight:700;background:rgba(0,232,208,.1);color:#00e8d0;border:1px solid rgba(0,232,208,.25)}
.aud-qq-badge.diff-hard{background:rgba(255,59,92,.1);color:#ff3b5c;border-color:rgba(255,59,92,.25)}
.aud-qq-badge.diff-medium{background:rgba(245,200,66,.1);color:#f5c842;border-color:rgba(245,200,66,.25)}

/* ── CATEGORY OVERVIEW IN QUESTIONS TAB ── */
.aud-cat-overview{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:16px}
.aud-cat-card{padding:10px;border-radius:10px;background:#13133a;border:1px solid #2a2a5a;text-align:center;transition:all .3s}
.aud-cat-card.current{border-color:#00e8d0;background:rgba(0,232,208,.06)}
.aud-cat-card .cc-icon{font-size:1.3rem}
.aud-cat-card .cc-name{font-size:.78rem;font-weight:700;color:#ccc;margin-top:3px}
.aud-cat-card .cc-count{font-size:.65rem;color:#666}

/* ── SCROLLBAR ── */
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#2a2a5a;border-radius:3px}

/* ── ANIMATIONS ── */
@keyframes pulse-glow{0%,100%{box-shadow:0 0 0 0 rgba(0,232,208,.3)}50%{box-shadow:0 0 12px 4px rgba(0,232,208,.15)}}
.aud-pulse{animation:pulse-glow 2s ease infinite}
@media(max-width:768px){
  .aud-header{padding:6px 12px}
  .aud-title{font-size:.85rem}
  .aud-section-bar{padding:4px 12px;font-size:.75rem;gap:8px}
  .aud-q-text{font-size:clamp(1rem,3vw,1.6rem);max-height:25vh}
  .aud-option{padding:8px 12px;font-size:clamp(.85rem,2vw,1.1rem)}
  .aud-option .opt-letter{min-width:24px;height:24px;font-size:.75rem}
  .aud-timer-ring{width:50px;height:50px}
  .aud-timer-ring svg{width:50px;height:50px}
  .aud-timer-num{font-size:1rem}
  .aud-sb-row{padding:10px 12px;gap:10px}
  .aud-sb-avatar{width:36px;height:36px;font-size:1rem}
  .aud-sb-score{font-size:1.4rem}
  .aud-results-ticker{padding:4px 8px;min-height:32px}
  .aud-ticker-team{padding:0 8px}
  .aud-ticker-name{font-size:.7rem;max-width:70px}
  .aud-ticker-score{font-size:.9rem}
}
@media(max-width:480px){
  .aud-header{padding:4px 8px}
  .aud-title{font-size:.75rem}
  .aud-section-bar{padding:3px 8px;font-size:.68rem;gap:4px}
  .aud-q-text{font-size:clamp(.9rem,2.5vw,1.3rem);max-height:20vh}
  .aud-option{padding:6px 10px;font-size:clamp(.8rem,1.8vw,1rem)}
  .aud-timer-ring{width:40px;height:40px}
  .aud-timer-ring svg{width:40px;height:40px}
  .aud-timer-num{font-size:.85rem}
  .aud-sb-row{padding:8px;gap:8px}
  .aud-sb-avatar{width:30px;height:30px;font-size:.85rem}
  .aud-sb-score{font-size:1.2rem}
  .aud-tab{font-size:.72rem;padding:7px 4px}
  .aud-results-ticker{flex-wrap:wrap;min-height:28px}
  .aud-ticker-team{padding:0 6px;max-width:120px}
  .aud-ticker-name{font-size:.65rem;max-width:55px}
  .aud-ticker-score{font-size:.8rem}
}
@media(max-height:500px){
  .aud-header{padding:3px 12px}
  .aud-section-bar{padding:2px 12px;min-height:24px}
  .aud-q-text{font-size:clamp(.9rem,2.5vw,1.4rem);max-height:20vh;margin-bottom:6px}
  .aud-timer-wrap{margin:4px 0}
  .aud-timer-ring{width:40px;height:40px}
  .aud-timer-ring svg{width:40px;height:40px}
  .aud-timer-num{font-size:.85rem}
  .aud-option{padding:6px 10px}
  .aud-results-ticker{min-height:28px;padding:2px 8px}
}
</style>
</head><body>
<div class="aud-header">
  <div class="aud-status" id="aud-dot"></div>
  <div class="aud-title">${t('audience.title','🖥 شاشة الجمهور')}</div>
  <button id="aud-back-btn" onclick="try{window.close();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}" style="display:none;position:fixed;top:8px;${isAr?'left':'right'}:8px;z-index:100;padding:4px 12px;border-radius:8px;border:1px solid #2a2a5a;background:rgba(19,19,58,.85);color:#aaa;font-family:Cairo,sans-serif;font-size:.7rem;font-weight:700;cursor:pointer;opacity:.6;transition:opacity .2s;backdrop-filter:blur(4px)" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='.6'">← ${t('nav.backToQuiz','رجوع للمسابقة')}</button>
</div>
<script>try{if(window.opener)document.getElementById('aud-back-btn').style.display='block';}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}<\/script>

<!-- Section Status Bar -->
<div class="aud-section-bar" id="aud-section-bar">
  <div class="sec-item"><span class="sec-icon">📺</span><span class="sec-value" id="sec-game-status">${t('audience.ready')}</span></div>
</div>

<div class="aud-tabs">
  <div class="aud-tab active" onclick="switchAudTab(0,this)">🎯 ${t('audience.tabCompetition','المسابقة')}</div>
  <div class="aud-tab" onclick="switchAudTab(1,this)">🏆 ${t('audience.tabScoreboard','لوحة النتائج')}</div>
  <div class="aud-tab" onclick="switchAudTab(2,this)">📋 ${t('audience.tabQuestions','الأسئلة')}</div>
</div>

<div class="aud-content">
  <!-- Competition Tab -->
  <div class="aud-panel active" id="aud-panel-comp">
    <div class="aud-waiting" id="aud-waiting">
      <div class="aud-waiting-icon">📺</div>
      <div style="font-size:1.1rem;font-weight:700">${t('audience.waiting','في انتظار بدء المسابقة...')}</div>
      <div class="aud-waiting-teams" id="aud-waiting-teams"></div>
    </div>
    <div id="aud-comp-content" style="display:none;flex:1;flex-direction:column;position:relative">
      <div class="aud-turn-indicator" id="aud-turn">—</div>
      <div class="aud-q-cat" id="aud-q-cat"><span id="aud-cat-name">—</span><span id="aud-q-num">—</span></div>
      <div class="aud-q-text" id="aud-q-text">—</div>
      <div class="aud-answered-badge no" id="aud-answered-badge">${t('audience.pending','⏳ بانتظار الإجابة')}</div>
      <div class="aud-timer-wrap">
        <div class="aud-timer-ring">
          <svg viewBox="0 0 80 80"><circle class="ring-bg" cx="40" cy="40" r="35"/><circle class="ring-fill" id="aud-ring-fill" cx="40" cy="40" r="35" stroke-dasharray="220" stroke-dashoffset="0"/></svg>
          <div class="aud-timer-num" id="aud-timer-num">30</div>
        </div>
      </div>
      <div class="aud-options" id="aud-options"></div>
      <!-- Tiebreaker overlay for audience -->
      <div id="aud-tiebreaker-overlay" style="display:none;position:absolute;inset:0;z-index:5;background:rgba(10,10,26,.98);flex-direction:column;align-items:center;justify-content:center;padding:16px;gap:12px;overflow-y:auto">
        <div class="aud-tb-title" style="font-size:clamp(1.3rem,3.5vw,2.2rem);font-weight:900;color:#f5c842;text-align:center">${t('audience.tiebreakerTitle')}</div>
        <div class="aud-tb-progress" style="font-size:.9rem;font-weight:700;color:#00e8d0">—</div>
        <div class="aud-tb-teams-bar" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"></div>
        <div class="aud-tb-question" style="font-size:clamp(1.1rem,3vw,2rem);font-weight:900;color:#fff;text-align:center;max-width:800px;line-height:1.4;word-break:break-word">—</div>
        <div style="display:flex;align-items:center;gap:10px">
          <div class="aud-timer-ring" style="width:60px;height:60px">
            <svg viewBox="0 0 80 80" style="width:60px;height:60px;transform:rotate(-90deg)"><circle class="ring-bg" cx="40" cy="40" r="35" fill="none" stroke="#2a2a5a" stroke-width="5"/><circle class="aud-tb-ring-fill ring-fill" cx="40" cy="40" r="35" fill="none" stroke="#00e8d0" stroke-width="5" stroke-linecap="round" stroke-dasharray="220" stroke-dashoffset="0" style="transition:stroke-dashoffset .5s linear"/></svg>
            <div class="aud-tb-timer-num" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:900;color:#00e8d0">30</div>
          </div>
        </div>
        <div class="aud-tb-options aud-options" style="display:flex;flex-direction:column;gap:8px;max-width:700px;width:100%"></div>
      </div>
    </div>
  </div>
  <!-- Scoreboard Tab -->
  <div class="aud-panel" id="aud-panel-scores">
    <div class="aud-sb" id="aud-sb"></div>
  </div>
  <!-- Questions Tab -->
  <div class="aud-panel" id="aud-panel-questions">
    <div class="aud-cat-overview" id="aud-cat-overview"></div>
    <div class="aud-qq" id="aud-qq">
      <div style="text-align:center;color:#555;padding:40px">${t('audience.noQuestion','لا يوجد سؤال حالياً')}</div>
    </div>
  </div>
</div>

<!-- Results Ticker Bar (always visible at bottom) -->
<div class="aud-results-ticker" id="aud-results-ticker"></div>

<script>
var ch=null;
var currentS=null;
var _isAr=${isAr?'true':'false'};
var _LETTERS_AR='${LETTERS_AR}';
var _LETTERS_EN='${LETTERS_EN}';
function _L(i){return _isAr?_LETTERS_AR[i]||'':_LETTERS_EN[i]||'';}
// ── Phase 1.2: Bilingual translation maps for audience window ──
var _trAr={'audience.ready':'جاهز','audience.quizWindowClosed':'أُغلقت نافذة المسابقة','audience.gameActive':'🟢 جارية','audience.gameWaiting':'⚪ في الانتظار','audience.sectionLabel':'القسم:','audience.qShort':'س','audience.timerStopped':'متوقف','audience.answeredShort':'تمت الإجابة','audience.pendingShort':'بانتظار الإجابة','audience.buzzerLabel':'المُسرِّع','audience.tiebreakerLabel':'جولة الحسم','audience.teamsCount':'فرق','audience.sectionsCount':'أقسام','audience.qCountShort':'سؤال','audience.quizWaitingTeams':'المسابقة في الانتظار — الفرق جاهزة','audience.waitingForQuiz':'في انتظار بدء المسابقة...','audience.turnLabel':'🎯 دور: ','audience.questionLabel':'سؤال ','audience.answeredBadge':'✅ تمت الإجابة','audience.pendingBadge':'⏳ بانتظار الإجابة','audience.tiebreakerTitle':'⚡ جولة الحسم','audience.tiebreakerQ':'سؤال الحسم ','audience.separator':'، ','audience.noCurrentQuestion':'لا يوجد سؤال حالياً'};
var _trEn={'audience.ready':'Ready','audience.quizWindowClosed':'Quiz window closed','audience.gameActive':'🟢 Active','audience.gameWaiting':'⚪ Waiting','audience.sectionLabel':'Section:','audience.qShort':'Q','audience.timerStopped':'Stopped','audience.answeredShort':'Answered','audience.pendingShort':'Pending','audience.buzzerLabel':'Buzzer','audience.tiebreakerLabel':'Tiebreaker','audience.teamsCount':'teams','audience.sectionsCount':'sections','audience.qCountShort':'Q','audience.quizWaitingTeams':'Quiz waiting — Teams ready','audience.waitingForQuiz':'Waiting for quiz to start...','audience.turnLabel':'🎯 Turn: ','audience.questionLabel':'Question ','audience.answeredBadge':'✅ Answered','audience.pendingBadge':'⏳ Pending','audience.tiebreakerTitle':'⚡ Tiebreaker','audience.tiebreakerQ':'Tiebreaker Q ','audience.separator':', ','audience.noCurrentQuestion':'No current question'};
function _t(k){return _isAr?(_trAr[k]||k):(_trEn[k]||k);}
var _initialState=${initialStateJSON||'null'};
var _reconnectAttempts=0;
var _maxReconnectAttempts=10;
var _lastMsgTime=0;
var _errorCount=0;
var _connectionHealthy=false;

// Sound system for audience window
var _audAudioCtx=null;
function _audGetAudioCtx(){
  if(!_audAudioCtx)_audAudioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(_audAudioCtx.state==='suspended'){try{_audAudioCtx.resume();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_228")}catch(_){}}}
  return _audAudioCtx;
}
function _audiencePlaySound(type,vol){
  try{
    var v=(vol||80)/100;
    if(type==='correct'){
      // Play a pleasant ascending chime for correct answer
      var ctx=_audGetAudioCtx();
      var freqs=[523.25,659.25,783.99,1046.50];
      freqs.forEach(function(f,i){
        var o=ctx.createOscillator(),g=ctx.createGain();
        o.type=i<2?'sine':'triangle';
        o.frequency.value=f;
        g.gain.setValueAtTime(v*.3/(i+1),ctx.currentTime+i*.1);
        g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.1+.6);
        o.connect(g);g.connect(ctx.destination);
        o.start(ctx.currentTime+i*.1);o.stop(ctx.currentTime+i*.1+.6);
      });
    }else if(type==='wrong'){
      // Play a descending buzz for wrong answer
      var ctx=_audGetAudioCtx();
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(150,ctx.currentTime);
      o.frequency.linearRampToValueAtTime(60,ctx.currentTime+.4);
      g.gain.setValueAtTime(v*.3,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.4);
      o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.4);
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
}
// Resume AudioContext on user interaction (required by browser autoplay policy)
document.addEventListener('click',function(){try{_audGetAudioCtx();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_229")}catch(_){}}},{once:true});
document.addEventListener('touchstart',function(){try{_audGetAudioCtx();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_230")}catch(_){}}},{once:true});

function init(){
  _lastMsgTime=0;
  // V10-fix: Track all interval IDs for cleanup
  var _audIntervals=[];
  // Use initial state if available
  if(_initialState){currentS=_initialState;updateAll(_initialState);_lastMsgTime=Date.now();}
  // Primary: poll via window.opener (most reliable for popups)
  _audIntervals.push(setInterval(function(){
    try{
      if(window.opener&&!window.opener.closed){
        var hostState=window.opener._getAudienceState&&window.opener._getAudienceState();
        if(hostState){
          if(!currentS||hostState._ts>(currentS._ts||0)){
            currentS=hostState;updateAll(hostState);_lastMsgTime=Date.now();_reconnectAttempts=0;_connectionHealthy=true;
          }
        }
      }
    }catch(e){
      _errorCount++;
      // Cross-origin fallback: try localStorage
      try{
        var lsData=localStorage.getItem('quiz_audience_state');
        if(lsData){
          var parsed=JSON.parse(lsData);
          if(parsed&&(!currentS||parsed._ts>(currentS._ts||0))){
            currentS=parsed;updateAll(parsed);_lastMsgTime=Date.now();_connectionHealthy=true;
          }
        }
      }catch(e){try{ErrorBus.capture(e,"catch#AUTO_231")}catch(_){}}
    }
    // Update connection status
    var dot=document.getElementById('aud-dot');
    if(dot){
      var age=Date.now()-_lastMsgTime;
      var healthy=age<5000;
      dot.style.background=healthy?'#00e676':age<10000?'#f5c842':'#ff3b5c';
      _connectionHealthy=healthy;
    }
  },1000));
  // Secondary: BroadcastChannel (works for same-origin tabs)
  if('BroadcastChannel' in window){
    try{
      ch=new BroadcastChannel('quiz_remote_v1');
      ch.onmessage=function(e){
        var m=e.data;if(!m)return;
        try{
          if(m.action==='state_update'&&m.payload){
            if(!currentS||m.payload._ts>(currentS._ts||0)){
              currentS=m.payload;updateAll(m.payload);_lastMsgTime=Date.now();_connectionHealthy=true;
            }
          }
          if(m.action==='host_closed'){
            var closedDiv=document.createElement('div');
            closedDiv.style.cssText='display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px;font-family:Cairo,sans-serif;color:#e0e0ff;background:#0a0a1a;text-align:center;direction:'+(_isAr?'rtl':'ltr');
            closedDiv.innerHTML='<div style="font-size:2.5rem">📴</div><div style="font-weight:700;font-size:1.1rem">'+_t('audience.quizWindowClosed')+'</div>';
            document.body.innerHTML='';document.body.appendChild(closedDiv);
            try{ch.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_232")}catch(_){}}
          }
          // Handle playSound action from host
          if(m.action==='playSound'&&m.type){
            _audiencePlaySound(m.type,m.vol);
          }
        }catch(err){console.error('Audience update error:',err);}
      };
      ch.postMessage({action:'ping'});
      // V10-fix: Store interval ID for cleanup
      var _bcPingInterval=setInterval(function(){try{ch.postMessage({action:'ping'});}catch(e){clearInterval(_bcPingInterval);}},3000);
      _audIntervals.push(_bcPingInterval);
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  }
  // Fallback: poll localStorage every 1.5s — always active for reliability (V15-fix)
  // Previously only ran when !_connectionHealthy, which caused missed updates
  _audIntervals.push(setInterval(function(){
    try{
      var lsData=localStorage.getItem('quiz_audience_state');
      if(lsData){
        var parsed=JSON.parse(lsData);
        if(parsed&&(!currentS||parsed._ts>(currentS._ts||0))){
          currentS=parsed;updateAll(parsed);_lastMsgTime=Date.now();_connectionHealthy=true;
        }
      }
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  },1500));
  // V15-fix: Also poll sessionStorage as additional fallback
  _audIntervals.push(setInterval(function(){
    try{
      var ssData=sessionStorage.getItem('quiz_audience_state');
      if(ssData){
        var parsed2=JSON.parse(ssData);
        if(parsed2&&(!currentS||parsed2._ts>(currentS._ts||0))){
          currentS=parsed2;updateAll(parsed2);_lastMsgTime=Date.now();_connectionHealthy=true;
        }
      }
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  },2000));
  // V10-fix: Cleanup all intervals on page unload
  window.addEventListener('unload',function(){_audIntervals.forEach(function(id){clearInterval(id);});try{if(ch)ch.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_233")}catch(_){}}});
  // V15-fix: Listen for postMessage from host window (most reliable for popup windows)
  // V11-SECURITY: Verify origin — only accept messages from the opener (host window)
  // to prevent cross-origin message injection attacks.
  window.addEventListener('message',function(e){
    try{
      // Origin check: must come from the opener window's origin
      if(window.opener){
        try{
          // For same-origin popups, e.origin matches our own origin
          if(e.origin!==window.location.origin){
            console.warn('[Audience] Rejected message from untrusted origin:',e.origin);
            return;
          }
        }catch(_originErr){
          // If we can't read opener.origin (cross-origin), reject the message
          console.warn('[Audience] Cannot verify origin, rejecting message');
          return;
        }
      }
      if(e.data&&e.data.action==='audience_state_update'&&e.data.payload){
        var p=e.data.payload;
        if(!currentS||p._ts>(currentS._ts||0)){
          currentS=p;updateAll(p);_lastMsgTime=Date.now();_connectionHealthy=true;
        }
      }
    }catch(err){console.error("[Error]",err);}
  });
  // V15-fix: Request fresh state from host immediately after init
  setTimeout(function(){
    try{
      if(window.opener&&!window.opener.closed&&typeof window.opener._getAudienceState==='function'){
        var freshState=window.opener._getAudienceState();
        if(freshState){currentS=freshState;updateAll(freshState);_lastMsgTime=Date.now();_connectionHealthy=true;}
      }
    }catch(e){
      // Cross-origin: try localStorage
      try{
        var lsData=localStorage.getItem('quiz_audience_state');
        if(lsData){var parsed=JSON.parse(lsData);if(parsed){currentS=parsed;updateAll(parsed);_lastMsgTime=Date.now();_connectionHealthy=true;}}
      }catch(e){try{ErrorBus.capture(e,"catch#AUTO_234")}catch(_){}}
    }
  },500);
  // V15-fix: Periodic force-refresh from host to catch missed updates (every 5s)
  _audIntervals.push(setInterval(function(){
    try{
      if(window.opener&&!window.opener.closed&&typeof window.opener._getAudienceState==='function'){
        var freshState2=window.opener._getAudienceState();
        if(freshState2&&freshState2._ts>(currentS?currentS._ts||0:0)){
          currentS=freshState2;updateAll(freshState2);_lastMsgTime=Date.now();_connectionHealthy=true;
        }
      }
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  },5000));
}
function switchAudTab(idx,el){
  document.querySelectorAll('.aud-tab').forEach(function(t){t.classList.remove('active');});
  el.classList.add('active');
  document.querySelectorAll('.aud-panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.aud-panel')[idx].classList.add('active');
}
function updateSectionBar(s){
  var bar=document.getElementById('aud-section-bar');
  if(!bar)return;
  var items=[];
  // Game status
  var statusText=s.gameActive?_t('audience.gameActive'):_t('audience.gameWaiting');
  items.push('<div class="sec-item"><span class="sec-value" id="sec-game-status">'+statusText+'</span></div>');
  if(s.gameActive){
    items.push('<div class="sec-divider"></div>');
    // Current category
    if(s.currentCatName){
      var catIcon=s.currentCatIcon||'📂';
      items.push('<div class="sec-item"><span class="sec-icon">'+catIcon+'</span><span class="sec-label">'+_t('audience.sectionLabel')+'</span><span class="sec-active">'+s.currentCatName+'</span></div>');
    }
    // Question number
    if(s.currentQIndex!==undefined&&s.catTotalQs){
      var qLabel=_t('audience.qShort');
      items.push('<div class="sec-divider"></div>');
      items.push('<div class="sec-item"><span class="sec-icon">❓</span><span class="sec-value">'+qLabel+(s.currentQIndex+1)+'/'+s.catTotalQs+'</span></div>');
    }
    // Timer status
    items.push('<div class="sec-divider"></div>');
    if(s.timerRunning){
      var timerPct=s.timerTotal>0?Math.round((s.timeLeft||0)/s.timerTotal*100):0;
      var timerClass=timerPct<20?'danger-badge':timerPct<40?'warn-badge':'';
      var min=Math.floor((s.timeLeft||0)/60);var sec=(s.timeLeft||0)%60;
      items.push('<div class="sec-item"><span class="sec-icon">⏱</span><span class="aud-section-badge '+timerClass+'">'+min+':'+(sec<10?'0':'')+sec+'</span></div>');
    }else{
      items.push('<div class="sec-item"><span class="sec-icon">⏱</span><span class="sec-value" style="color:#555">'+_t('audience.timerStopped')+'</span></div>');
    }
    // Current turn
    if(s.currentTeam){
      items.push('<div class="sec-divider"></div>');
      items.push('<div class="sec-item"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:'+(s.currentTeamColor||'#00e8d0')+';flex-shrink:0"></span><span class="sec-value" style="color:'+(s.currentTeamColor||'#00e8d0')+'">'+s.currentTeam+'</span></div>');
    }
    // Answered status
    items.push('<div class="sec-divider"></div>');
    if(s.answered){
      items.push('<div class="sec-item"><span class="aud-section-badge active-badge">'+_t('audience.answeredShort')+'</span></div>');
    }else{
      items.push('<div class="sec-item"><span class="aud-section-badge">'+_t('audience.pendingShort')+'</span></div>');
    }
    // Buzzer
    if(s.buzzerActive){
      items.push('<div class="sec-divider"></div>');
      items.push('<div class="sec-item"><span class="aud-section-badge warn-badge">🔔 '+_t('audience.buzzerLabel')+'</span></div>');
    }
    // Tiebreaker state
    if(s.tiebreakerActive){
      items.push('<div class="sec-divider"></div>');
      items.push('<div class="sec-item"><span class="sec-icon">⚡</span><span class="sec-value" style="color:var(--accent2)">'+_t('audience.tiebreakerLabel')+'</span></div>');
    }
  }else if(s.teams&&s.teams.length){
    // Not active but teams exist
    items.push('<div class="sec-divider"></div>');
    items.push('<div class="sec-item"><span class="sec-icon">👥</span><span class="sec-value">'+s.teams.length+' '+_t('audience.teamsCount')+'</span></div>');
  }
  // Categories overview
  if(s.categories&&s.categories.length){
    items.push('<div class="sec-divider"></div>');
    items.push('<div class="sec-item"><span class="sec-icon">📂</span><span class="sec-value">'+s.categories.length+' '+_t('audience.sectionsCount')+'</span></div>');
  }
  // Progress
  if(s.usedQuestionsCount!==undefined&&s.totalQuestionsCount>0){
    items.push('<div class="sec-divider"></div>');
    items.push('<div class="sec-item"><span class="sec-icon">📊</span><span class="sec-value">'+s.usedQuestionsCount+'/'+s.totalQuestionsCount+'</span></div>');
  }
  // Competition name
  if(s.competitionName){
    items.push('<div class="sec-divider"></div>');
    items.push('<div class="sec-item"><span class="sec-icon">🏆</span><span class="sec-active">'+s.competitionName+'</span></div>');
  }
  bar.innerHTML=items.join('');
}
function updateResultsTicker(s){
  var ticker=document.getElementById('aud-results-ticker');
  if(!ticker)return;
  if(!s.teams||!s.teams.length){ticker.style.display='none';return;}
  ticker.style.display='flex';
  var curTeamName=s.currentTeam||'';
  ticker.innerHTML=s.teams.map(function(t){
    var isActive=t.name===curTeamName;
    return '<div class="aud-ticker-team'+(isActive?' aud-ticker-active':'')+'">'
      +'<div class="aud-ticker-dot" style="background:'+t.color+'"></div>'
      +'<div class="aud-ticker-name" style="'+(isActive?'color:'+t.color:'')+'">'+t.name+'</div>'
      +'<div class="aud-ticker-score" style="'+(isActive?'color:'+t.color:'')+'">'+t.score+'</div>'
      +'</div>';
  }).join('');
}
function updateCategoryOverview(s){
  var container=document.getElementById('aud-cat-overview');
  if(!container||!s.categories)return;
  var currentCatName=s.currentCatName||'';
  // Filter out tiebreaker categories from audience view
  var regularCats=s.categories.filter(function(c){return c.type!=='tiebreaker';});
  container.innerHTML=regularCats.map(function(c){
    var isCurrent=c.name===currentCatName;
    return '<div class="aud-cat-card'+(isCurrent?' current':'')+'">'
      +'<div class="cc-icon">'+(_sanitizeIcon(c.icon)||'📂')+'</div>'
      +'<div class="cc-name" style="'+(isCurrent?'color:#00e8d0':'')+'">'+c.name+'</div>'
      +'<div class="cc-count">'+c.qCount+' '+_t('audience.qCountShort')+'</div>'
      +'</div>';
  }).join('');
}
function updateAll(s){
  if(!s)return;
  // Expose globally for direct window.opener access
  window._lastState=s;
  // Update language from state
  if(s.lang)_isAr=(s.lang!=='en');
  document.documentElement.dir=_isAr?'rtl':'ltr';
  document.documentElement.lang=_isAr?'ar':'en';

  // ── ALWAYS update: section bar, results ticker, scoreboard, category overview ──
  // V15-fix: Wrap each update in try-catch to prevent one error from blocking the rest
  try{updateSectionBar(s);}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  try{updateResultsTicker(s);}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  try{updateCategoryOverview(s);}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  var waiting=document.getElementById('aud-waiting');
  var content=document.getElementById('aud-comp-content');

  // V15-fix: Enhanced gameActive detection — also consider currentView and question data
  // This fixes the bug where gameActive=false in the pushed state even though the quiz has started
  var _isGameActive=s.gameActive;
  // Additional heuristics: if there's a current question or category and teams exist, the game is likely active
  if(!_isGameActive && s.currentQFull && s.teams && s.teams.length){
    _isGameActive=true;
  }
  if(!_isGameActive && s.currentCatName && s.teams && s.teams.length && s.currentView && s.currentView!=='login' && s.currentView!=='admin'){
    _isGameActive=true;
  }

  // ── Competition Tab ──
  if(!_isGameActive){
    if(waiting)waiting.style.display='flex';if(content)content.style.display='none';
    // Show teams in waiting area if available
    var waitTeams=document.getElementById('aud-waiting-teams');
    if(waitTeams&&s.teams&&s.teams.length){
      waitTeams.innerHTML=s.teams.map(function(t){
        return '<div class="aud-waiting-team" style="border-color:'+t.color+'44">'
          +'<div class="wt-name" style="color:'+t.color+'">'+t.name+'</div>'
          +'<div class="wt-score">'+t.score+'</div></div>';
      }).join('');
    }else if(waitTeams){
      waitTeams.innerHTML='';
    }
    // Update waiting message
    var waitMsg=waiting.querySelector('div:nth-child(2)');
    if(waitMsg){
      if(s.teams&&s.teams.length){
        waitMsg.textContent=_t('audience.quizWaitingTeams');
      }else{
        waitMsg.textContent=_t('audience.waitingForQuiz');
      }
    }
  }else{
    if(waiting)waiting.style.display='none';if(content)content.style.display='flex';
  }

  // ── Turn indicator ──
  var turn=document.getElementById('aud-turn');
  if(turn){
    if(s.currentTeam&&_isGameActive){
      var turnLabel=_t('audience.turnLabel');
      turn.innerHTML='<span style="color:'+(s.currentTeamColor||'#00e8d0')+'">'+turnLabel+s.currentTeam+'</span>';
      turn.style.background=''+(s.currentTeamColor||'#00e8d0')+'11';
      turn.style.border='1px solid '+(s.currentTeamColor||'#00e8d0')+'44';
    }else{
      turn.innerHTML='—';
      turn.style.background='transparent';turn.style.border='none';
    }
  }
  // ── Category + Q num ──
  var catName=document.getElementById('aud-cat-name');
  if(catName)catName.textContent=s.currentCatName?(s.currentCatIcon?s.currentCatIcon+' ':'')+'📂 '+s.currentCatName:'';
  var qNum=document.getElementById('aud-q-num');
  if(qNum){
    var qLabel=_t('audience.questionLabel');
    qNum.textContent=s.currentQIndex!==undefined&&s.catTotalQs?qLabel+(s.currentQIndex+1)+'/'+s.catTotalQs:'';
  }
  // ── Question text ──
  var qText=document.getElementById('aud-q-text');
  if(qText)qText.textContent=s.currentQFull||s.currentQ||'';
  // ── Answered badge ──
  var ab=document.getElementById('aud-answered-badge');
  if(ab){
    if(s.answered){ab.className='aud-answered-badge yes';ab.textContent=_t('audience.answeredBadge');}
    else{ab.className='aud-answered-badge no';ab.textContent=_t('audience.pendingBadge');}
  }
  // ── Timer ──
  var timerNum=document.getElementById('aud-timer-num');
  if(timerNum&&s.timeLeft!==undefined) timerNum.textContent=s.timeLeft;
  var ringFill=document.getElementById('aud-ring-fill');
  if(ringFill&&s.timerTotal>0){
    var pct=s.timeLeft/s.timerTotal;
    var offset=220*(1-pct);
    ringFill.setAttribute('stroke-dashoffset',offset);
    ringFill.style.stroke=pct<.2?'#ff3b5c':pct<.4?'#f5c842':'#00e8d0';
  }
  // ── Options rendering ──
  var optsEl=document.getElementById('aud-options');
  if(optsEl&&s.options){
    var optsArr=s.options;
    var revealed=s.optionsRevealed||optsArr.length;
    var isProg=s.progressiveReveal;
    var isAnswered=s.answered;
    var showCount=isProg?revealed:optsArr.length;
    var selIdx=s.selectedAnswer??-1;
    var html='';
    for(var i=0;i<optsArr.length;i++){
      var opt=optsArr[i];
      var letter=_L(i);
      var hidden=isProg&&i>=showCount&&!isAnswered;
      var isCorrect=isAnswered&&opt.isCorrect;
      // V11-fix: Show wrong answer highlight on audience screen
      var isWrong=isAnswered&&i===selIdx&&!opt.isCorrect;
      var cls='aud-option';
      if(hidden)cls+=' hidden-opt';
      if(isCorrect)cls+=' correct';
      if(isWrong)cls+=' wrong';
      // V11-fix: Include option images if available
      var imgHtml=(opt.image&&typeof opt.image==='string'&&opt.image.length>5)?'<img src="'+opt.image+'" style="max-width:60px;max-height:60px;border-radius:6px;margin:4px 0" alt="">':'';
      html+='<div class="'+cls+'">'
        +'<div class="opt-letter">'+letter+'</div>'
        +imgHtml
        +'<div class="opt-text">'+opt.text+'</div>'
        +'</div>';
    }
    optsEl.innerHTML=html;
  }else if(optsEl){
    optsEl.innerHTML='';
  }

  // ── Tiebreaker Mode: Override competition content ──
  var tbOverlay=document.getElementById('aud-tiebreaker-overlay');
  if(s.tiebreakerActive&&tbOverlay){
    // Show tiebreaker overlay in audience
    tbOverlay.style.display='flex';
    var tbTitle=tbOverlay.querySelector('.aud-tb-title');
    var tbProgress=tbOverlay.querySelector('.aud-tb-progress');
    var tbQText=tbOverlay.querySelector('.aud-tb-question');
    var tbOpts=tbOverlay.querySelector('.aud-tb-options');
    var tbTimerNum=tbOverlay.querySelector('.aud-tb-timer-num');
    var tbRingFill=tbOverlay.querySelector('.aud-tb-ring-fill');
    var tbTeamsBar=tbOverlay.querySelector('.aud-tb-teams-bar');
    if(tbTitle)tbTitle.textContent=_t('audience.tiebreakerTitle');
    if(tbProgress&&s.tiebreakerTotal>0)tbProgress.textContent=_t('audience.tiebreakerQ')+(s.tiebreakerQuestionIndex+1)+'/'+s.tiebreakerTotal;
    if(tbQText)tbQText.textContent=s.tiebreakerCurrentQ||'';
    if(tbTimerNum&&s.tiebreakerCurrentTime!==undefined)tbTimerNum.textContent=s.tiebreakerCurrentTime;
    if(tbRingFill&&s.tiebreakerTimerTotal>0){
      var tbPct=s.tiebreakerCurrentTime/s.tiebreakerTimerTotal;
      var tbOffset=220*(1-tbPct);
      tbRingFill.setAttribute('stroke-dashoffset',tbOffset);
      tbRingFill.style.stroke=tbPct<.2?'#ff3b5c':tbPct<.4?'#f5c842':'#00e8d0';
    }
    if(tbTeamsBar&&s.tiebreakerTiedTeams){
      tbTeamsBar.innerHTML=s.tiebreakerTiedTeams.map(function(t){
        return '<div style="padding:6px 16px;border-radius:10px;background:'+t.color+'22;border:2px solid '+t.color+';text-align:center;min-width:80px">'
          +'<div style="font-weight:900;color:'+t.color+';font-size:.8rem">'+t.name+'</div>'
          +'<div style="font-weight:900;color:#fff;font-size:1.2rem">'+t.score+'</div></div>';
      }).join('');
    }
    if(tbOpts&&s.tiebreakerCurrentOptions){
      var labelStyle=s.answerLabelStyle||'arabic';
      var tbLabels=labelStyle==='arabic'?['أ','ب','ج','د','هـ','و','ز','ح']:labelStyle==='english'?['A','B','C','D','E','F','G','H']:['1','2','3','4','5','6','7','8'];
      var tbHtml='';
      for(var oi=0;oi<s.tiebreakerCurrentOptions.length;oi++){
        var opt=s.tiebreakerCurrentOptions[oi];
        var optText=typeof opt==='object'?opt.text:opt;
        var lbl=tbLabels[oi]||String(oi+1);
        var isCorrect=s.answered&&oi===s.tiebreakerCurrentCorrect;
        var optCls='aud-option'+(isCorrect?' correct':'');
        tbHtml+='<div class="'+optCls+'">'
          +'<div class="opt-letter">'+lbl+'</div>'
          +'<div class="opt-text">'+optText+'</div>'
          +'</div>';
      }
      tbOpts.innerHTML=tbHtml;
    }
    // Hide regular competition content behind the overlay
    if(content)content.style.display='none';
    if(waiting)waiting.style.display='none';
  }else if(tbOverlay){
    tbOverlay.style.display='none';
  }

  // ── Scoreboard tab ──
  var sb=document.getElementById('aud-sb');
  if(sb&&s.teams&&s.teams.length){
    var sorted=[].concat(s.teams).sort(function(a,b){return b.score-a.score;});
    var maxScore=sorted[0].score||1;
    var sep=_t('audience.separator');
    sb.innerHTML=sorted.map(function(t,i){
      var rankClass=i===0?'gold':i===1?'silver':i===2?'bronze':'';
      var origIdx=s.teams.indexOf(t);
      var members=(s.teamMembers&&s.teamMembers[origIdx])?s.teamMembers[origIdx].join(sep):'';
      var barPct=Math.max(2,Math.round(t.score/maxScore*100));
      return '<div class="aud-sb-row'+(i===0&&t.score>0?' leader':'')+'">'
        +'<div class="aud-sb-rank '+rankClass+'">'+(i+1)+'</div>'
        +'<div class="aud-sb-avatar" style="background:'+t.color+'">'+t.name.charAt(0)+'</div>'
        +'<div class="aud-sb-info"><div class="aud-sb-name" style="color:'+t.color+'">'+t.name+'</div>'
        +(members?'<div class="aud-sb-members">👥 '+members+'</div>':'')
        +'<div class="aud-sb-bar-wrap"><div class="aud-sb-bar-fill" style="width:'+barPct+'%;background:'+t.color+'"></div></div>'
        +'</div><div class="aud-sb-score">'+t.score+'</div></div>';
    }).join('');
  }

  // ── Questions tab ──
  var qq=document.getElementById('aud-qq');
  if(qq){
    // V15-fix: Use _isGameActive instead of s.gameActive for reliable display
    if(s.currentQFull&&_isGameActive){
      var diffBadge='';
      if(s.qDifficulty){
        var dc=s.qDifficulty==='hard'?'diff-hard':s.qDifficulty==='medium'?'diff-medium':'';
        diffBadge='<span class="aud-qq-badge '+dc+'">'+s.qDifficulty+'</span>';
      }
      var typeBadge=s.qType&&s.qType!=='text'?'<span class="aud-qq-badge">'+s.qType+'</span>':'';
      var qLabel2=_t('audience.questionLabel');
      qq.innerHTML='<div class="aud-qq-cat">📂 '+(s.currentCatName||'—')+'</div>'
        +'<div class="aud-qq-text">'+s.currentQFull+'</div>'
        +'<div class="aud-qq-meta">'+diffBadge+typeBadge
        +(s.currentQIndex!==undefined&&s.catTotalQs?'<span class="aud-qq-badge">'+qLabel2+(s.currentQIndex+1)+'/'+s.catTotalQs+'</span>':'')
        +'</div>';
    }else{
      qq.innerHTML='<div style="text-align:center;color:#555;padding:40px">'+_t('audience.noCurrentQuestion')+'</div>';
    }
  }
}
init();
<\/script>
</body></html>`;
}

