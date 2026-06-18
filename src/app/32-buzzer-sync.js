// ── BroadcastChannel for cross-tab buzzer sync ──
var _buzzerChannel=null;
try{_buzzerChannel=new BroadcastChannel('quiz-buzzer');}catch(e){console.error("[Error]",e);}
if(_buzzerChannel){
  _buzzerChannel.onmessage=function(ev){
    if(!ev||!ev.data)return;
    if(ev.data.type==='buzz'&&ev.data.teamId&&state.buzzerActive&&!state.buzzerWinner){
      buzzIn(ev.data.teamId);
    }
    if(ev.data.type==='reset'&&state.buzzerActive){
      resetBuzzer();
    }
  };
}

function buzzIn(teamId){
  if(state.buzzerWinner)return;
  state.buzzerWinner=teamId;
  const team=state.teams.find(t=>t.id===teamId);if(!team)return;
  // Broadcast to other tabs
  try{if(_buzzerChannel)_buzzerChannel.postMessage({type:'buzz',teamId:teamId});}catch(e){console.error("[Error]",e);}
  // Flash the winner button
  const btn=document.getElementById('buzzer-'+teamId);
  if(btn)btn.classList.add('buzzed');
  // Dim others
  state.teams.forEach(t=>{if(t.id!==teamId){const b=document.getElementById('buzzer-'+t.id);if(b)b.style.opacity='0.2';}});
  // Show winner banner
  const banner=document.getElementById('buzzer-winner-banner');
  const nameEl=document.getElementById('buzzer-winner-name');
  banner.classList.remove('hidden');
  nameEl.textContent=team.name;
  nameEl.style.color=team.color;
  document.getElementById('buzzer-subtitle').style.opacity='0';
  playSound('correct');
}
function resetBuzzer(){
  state.buzzerWinner=null;
  // Broadcast reset to other tabs
  try{if(_buzzerChannel)_buzzerChannel.postMessage({type:'reset'});}catch(e){console.error("[Error]",e);}
  document.getElementById('buzzer-winner-banner').classList.add('hidden');
  document.getElementById('buzzer-subtitle').style.opacity='1';
  renderBuzzerGrid();
}

// ════════════════════════════════════════════════════════
//  TIEBREAKER / DECISIVE ROUND — Enhanced V2 (Category-based)
// ════════════════════════════════════════════════════════
let _tiebreakerActive=false;
let _tiebreakerQIndex=0;
let _tiebreakerQuestions=[];
let _tiebreakerTimerStart=0;
let _tiebreakerTimerTotal=0;

// Get all tiebreaker-type categories
function _getTiebreakerCategories(){
  return state.categories.filter(c=>c.type==='tiebreaker');
}

// Render tiebreaker categories list in settings
function refreshTiebreakerCategories(){
  const container=document.getElementById('tiebreaker-categories-list');
  if(!container)return;
  const tbCats=_getTiebreakerCategories();
  if(!tbCats.length){
    container.innerHTML='<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:.85rem">'+t('empty.noTiebreaker')+'</div>';
    return;
  }
  let html='';
  tbCats.forEach(cat=>{
    html+=`<div style="display:flex;align-items:center;gap:10px;padding:8px;border-radius:8px;border:1px solid ${cat.color}44;background:${cat.color}11;margin-bottom:6px">
      <span style="font-size:1.2rem">${_sanitizeIcon(cat.icon)||'⚡'}</span>
      <div style="flex:1">
        <div style="font-weight:700;font-size:.85rem;color:${cat.color}">${_sanitizeUser(cat.name)}</div>
        <div style="font-size:.75rem;color:var(--text-muted)">${cat.questions.length} سؤال حسم</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="openCatModal('${cat.id}')" style="padding:2px 8px;font-size:.7rem">✏️</button>
    </div>`;
  });
  container.innerHTML=html;
}

// Legacy: keep for backward compatibility but redirect
function refreshTiebreakerQuestions(){
  refreshTiebreakerCategories();
}

function updateTiebreakerSelection(){
  // No longer needed — categories drive the selection
  // Kept for backward compatibility
}

function _checkTie(){
  if(!state.teams||state.teams.length<2)return false;
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  return sorted.length>=2 && (sorted[0].score||0)===(sorted[1].score||0);
}

function _getTiedTeams(){
  if(!state.teams||!state.teams.length)return[];
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  if(sorted.length<2)return[];
  const topScore=sorted[0].score||0;
  return sorted.filter(t=>(t.score||0)===topScore);
}

function _gatherTiebreakerQuestions(){
  const count=state.settings.tiebreakerQuestionCount||3;
  let questions=[];
  // Gather ALL questions from tiebreaker-type categories
  const tbCats=_getTiebreakerCategories();
  tbCats.forEach(cat=>{
    cat.questions.forEach(q=>{
      questions.push({...q,_catName:cat.name,_catColor:cat.color,_catIcon:cat.icon});
    });
  });
  // Shuffle all tiebreaker questions
  for(let i=questions.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [questions[i],questions[j]]=[questions[j],questions[i]];
  }
  // If no tiebreaker categories exist, fall back to random questions from regular categories
  if(questions.length===0){
    getPlayableCats({all:true}).forEach(cat=>{
      cat.questions.forEach(q=>{
        questions.push({...q,_catName:cat.name,_catColor:cat.color,_catIcon:cat.icon});
      });
    });
    // Shuffle fallback
    for(let i=questions.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [questions[i],questions[j]]=[questions[j],questions[i]];
    }
  }
  return questions.slice(0,count);
}

function _renderTiebreakerTeamsBar(teams){
  const teamsBar=document.getElementById('tb-teams-bar');
  if(!teamsBar)return;
  teamsBar.innerHTML=teams.map(t=>`<div style="padding:8px 18px;border-radius:10px;background:${_safeColor(t.color)}22;border:2px solid ${_safeColor(t.color)};text-align:center;min-width:90px"><div style="font-weight:900;color:${_safeColor(t.color)};font-size:.9rem">${_sanitizeUser(t.name)}</div><div style="font-weight:900;color:#fff;font-size:1.3rem">${t.score||0}</div></div>`).join('');
}

function startTiebreakerRound(){
  _tiebreakerActive=true;
  _tiebreakerQIndex=0;
  _tiebreakerQuestions=_gatherTiebreakerQuestions();
  if(_tiebreakerQuestions.length===0){
    toast(I18n.t('tiebreaker.noQuestions')||'لا توجد أسئلة حسم','danger');
    _tiebreakerActive=false;
    return;
  }
  // Populate grant-point buttons for tied teams
  const tiedTeams=_getTiedTeams();
  const grantBtns=document.getElementById('tb-grant-btns');
  if(grantBtns){
    const pts=state.settings.tiebreakerPoints||1;
    grantBtns.innerHTML=tiedTeams.map(t=>`<button class="btn btn-sm" style="background:${_safeColor(t.color)};color:#fff;font-weight:900;border:none;padding:6px 16px;border-radius:8px" onclick="grantTiebreakerPoint('${t.id}')">${I18n.t('tiebreaker.grantPoint',{pts:pts,team:_sanitizeUser(t.name)})}</button>`).join('');
  }
  // Populate teams bar (only tied teams initially)
  _renderTiebreakerTeamsBar(tiedTeams);
  _showTiebreakerQuestion();
  // Push state to audience/remote
  _pushRemoteState();
}

function _showTiebreakerQuestion(){
  if(_tiebreakerQIndex>=_tiebreakerQuestions.length){
    _endTiebreakerRound();
    return;
  }
  const q=_tiebreakerQuestions[_tiebreakerQIndex];
  const isAr=I18n.getCurrentLang()!=='en';
  const total=_tiebreakerQuestions.length;
  const current=_tiebreakerQIndex+1;
  // Show tiebreaker overlay
  const overlay=document.getElementById('tiebreaker-overlay');
  if(!overlay)return;
  overlay.classList.remove('hidden');
  const tbTitle=overlay.querySelector('.tb-title');
  const tbSubtitle=overlay.querySelector('.tb-subtitle');
  const tbProgress=overlay.querySelector('.tb-progress');
  const tbQuestionText=overlay.querySelector('.tb-question-text');
  const tbOptions=overlay.querySelector('.tb-options');
  const tbTimer=overlay.querySelector('.tb-timer');
  const tbNextBtn=document.getElementById('tb-next-btn');
  const tbEndBtn=document.getElementById('tb-end-btn');
  if(tbTitle)tbTitle.textContent=I18n.t('tiebreaker.title')||'⚡ جولة الحسم';
  if(tbSubtitle)tbSubtitle.textContent=I18n.t('tiebreaker.subtitle')||'تعادل! حسم النتيجة بأسئلة إضافية';
  if(tbProgress)tbProgress.textContent=(I18n.t('tiebreaker.questionOf')||'سؤال الحسم {current} من {total}').replace('{current}',current).replace('{total}',total);
  if(tbQuestionText)tbQuestionText.textContent=q.text;
  if(tbNextBtn)tbNextBtn.textContent=I18n.t('tiebreaker.nextQuestion')||'⏭ التالي';
  if(tbEndBtn)tbEndBtn.textContent=I18n.t('tiebreaker.endRound')||'✕ إنهاء';
  // Build options
  if(tbOptions){
    const labelStyle=state.settings.answerLabelStyle||'arabic';
    const labels=labelStyle==='arabic'?['أ','ب','ج','د','هـ','و','ز','ح']:labelStyle==='english'?['A','B','C','D','E','F','G','H']:['1','2','3','4','5','6','7','8'];
    let optHtml='';
    (q.options||[]).forEach((opt,i)=>{
      const lbl=labels[i]||String(i+1);
      optHtml+=`<button class="tb-option" onclick="revealTiebreakerAnswer(${i},${q.correct})" style="padding:10px 16px;border-radius:10px;border:2px solid var(--border);background:var(--bg-panel);color:var(--text-primary);font-size:1rem;font-weight:700;cursor:pointer;text-align:center;transition:all .2s;font-family:Cairo,sans-serif;width:100%"><span style="min-width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.08);display:inline-flex;align-items:center;justify-content:center;font-size:.85rem;margin-inline-end:8px">${lbl}</span>${_sanitizeUser(opt)}</button>`;
    });
    tbOptions.innerHTML=optHtml;
  }
  // Start timer
  const time=q.time||state.settings.defaultTime||30;
  _tiebreakerTimerTotal=time;
  _tiebreakerTimerStart=Date.now();
  if(tbTimer){
    let remaining=time;
    tbTimer.textContent=remaining;
    tbTimer.style.color='';
    // Phase 4.4: Use TimerRegistry for timer leak prevention
    if(window._tbTimerInterval)TimerRegistry.clear(window._tbTimerInterval);
    window._tbTimerInterval=TimerRegistry.setInterval(()=>{
      remaining--;
      if(tbTimer){
        tbTimer.textContent=remaining;
        // Color warning when time is low
        if(remaining<=5)tbTimer.style.color='var(--danger)';
        else if(remaining<=10)tbTimer.style.color='var(--accent1)';
        else tbTimer.style.color='';
      }
      if(remaining<=0){
        TimerRegistry.clear(window._tbTimerInterval);
        window._tbTimerInterval=null;
        // Time's up — reveal answer automatically
        toast(I18n.t('tiebreaker.timeUp')||'انتهى الوقت!','warning');
        revealTiebreakerAnswer(-1,q.correct);
      }
    },1000);
  }
  // Update grant buttons for current tied teams
  const tiedTeams=_getTiedTeams();
  const grantBtns=document.getElementById('tb-grant-btns');
  if(grantBtns){
    const pts=state.settings.tiebreakerPoints||1;
    grantBtns.innerHTML=tiedTeams.map(t=>`<button class="btn btn-sm" style="background:${_safeColor(t.color)};color:#fff;font-weight:900;border:none;padding:6px 16px;border-radius:8px" onclick="grantTiebreakerPoint('${t.id}')">${I18n.t('tiebreaker.grantPoint',{pts:pts,team:_sanitizeUser(t.name)})}</button>`).join('');
  }
  _pushRemoteState();
}

function revealTiebreakerAnswer(selectedIdx,correctIdx){
  if(window._tbTimerInterval){TimerRegistry.clear(window._tbTimerInterval);window._tbTimerInterval=null;}
  const tbOptions=document.querySelector('#tiebreaker-overlay .tb-options');
  if(tbOptions){
    const buttons=tbOptions.querySelectorAll('.tb-option');
    buttons.forEach((btn,i)=>{
      btn.style.pointerEvents='none';
      if(i===correctIdx){
        btn.style.borderColor='var(--success)';
        btn.style.background='rgba(0,230,118,.15)';
        btn.style.color='var(--success)';
      }
      if(i===selectedIdx&&i!==correctIdx){
        btn.style.borderColor='var(--danger)';
        btn.style.background='rgba(255,59,92,.1)';
        btn.style.color='var(--danger)';
      }
    });
  }
  _pushRemoteState();
  // After 2.5s, go to next question
  setTimeout(()=>{
    _tiebreakerQIndex++;
    _showTiebreakerQuestion();
  },2500);
}

function grantTiebreakerPoint(teamId){
  const team=state.teams.find(t=>t.id===teamId);
  if(!team)return;
  const pts=state.settings.tiebreakerPoints||1;
  team.score=(team.score||0)+pts;
  saveState();
  saveGameProgress();
  floatScore(team,'+'+pts+' ⚡');
  toast((I18n.t('toast.quickPlusOne')||'✨ +{pts} نقطة لـ {team}').replace('{pts}',pts).replace('{team}',team.name),'success');
  // Update teams bar consistently — show tied teams only
  const tiedTeams=_getTiedTeams();
  _renderTiebreakerTeamsBar(tiedTeams.length>=2?tiedTeams:[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,Math.min(4,state.teams.length)));
  // Update grant buttons for new tied teams
  const grantBtns=document.getElementById('tb-grant-btns');
  if(grantBtns){
    const newTied=_getTiedTeams();
    grantBtns.innerHTML=newTied.map(t=>`<button class="btn btn-sm" style="background:${_safeColor(t.color)};color:#fff;font-weight:900;border:none;padding:6px 16px;border-radius:8px" onclick="grantTiebreakerPoint('${t.id}')">${I18n.t('tiebreaker.grantPoint',{pts:pts,team:_sanitizeUser(t.name)})}</button>`).join('');
  }
  // CRITICAL FIX: Push remote state immediately after granting point
  _pushRemoteState();
}

function nextTiebreakerQuestion(){
  if(window._tbTimerInterval){TimerRegistry.clear(window._tbTimerInterval);window._tbTimerInterval=null;}
  _tiebreakerQIndex++;
  _showTiebreakerQuestion();
}

function _endTiebreakerRound(){
  if(window._tbTimerInterval){TimerRegistry.clear(window._tbTimerInterval);window._tbTimerInterval=null;}
  _tiebreakerActive=false;
  _tiebreakerQuestions=[];
  _tiebreakerQIndex=0;
  const overlay=document.getElementById('tiebreaker-overlay');
  if(overlay)overlay.classList.add('hidden');
  // Check if still tied
  if(_checkTie()){
    toast(I18n.t('tiebreaker.stillTied')||'لا يزال التعادل!','warning');
    // Re-offer tiebreaker after a short delay
    setTimeout(()=>{
      _offerTiebreaker();
    },1500);
  }else{
    const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
    const winner=sorted[0];
    toast((I18n.t('tiebreaker.winner')||'🏆 فاز {team} بجولة الحسم!').replace('{team}',winner.name),'success');
    showPodium();
  }
  _pushRemoteState();
}

function skipTiebreaker(){
  if(window._tbTimerInterval){TimerRegistry.clear(window._tbTimerInterval);window._tbTimerInterval=null;}
  _tiebreakerActive=false;
  _tiebreakerQuestions=[];
  _tiebreakerQIndex=0;
  const overlay=document.getElementById('tiebreaker-overlay');
  if(overlay)overlay.classList.add('hidden');
  _pushRemoteState();
  showPodium();
}

function _offerTiebreaker(){
  const tiedTeams=_getTiedTeams();
  if(tiedTeams.length<2)return;
  const tiedNames=tiedTeams.map(t=>t.name).join(I18n.getCurrentLang()==='en'?' & ':' و ');
  const isAr=I18n.getCurrentLang()!=='en';
  // Remove existing offer overlay
  const existing=document.getElementById('tiebreaker-offer-overlay');
  if(existing)existing.remove();
  const el=document.createElement('div');
  el.id='tiebreaker-offer-overlay';
  el.className='tb-reoffer';
  // Use proper I18n with dual/plural grammar
  const scoreText=tiedTeams.length===2
    ?I18n.t('tiebreaker.offerTwoTeams',{names:tiedNames,score:tiedTeams[0].score||0})
    :I18n.t('tiebreaker.offerMultiTeams',{names:tiedNames,score:tiedTeams[0].score||0});
  el.innerHTML=`
    <div class="tb-offer-title">${I18n.t('tiebreaker.offerTitle')||'⚡ تعادل!'}</div>
    <div class="tb-offer-subtitle">${scoreText}</div>
    <div class="tb-offer-btns">
      <button class="btn btn-primary" onclick="this.closest('#tiebreaker-offer-overlay').remove();startTiebreakerRound()" style="padding:12px 28px;font-size:1.1rem;font-weight:900">${I18n.t('tiebreaker.start')||'بدء جولة الحسم'}</button>
      <button class="btn btn-ghost" onclick="this.closest('#tiebreaker-offer-overlay').remove()" style="padding:12px 28px">${I18n.t('tiebreaker.skip')||'تخطي'}</button>
    </div>`;
  document.body.appendChild(el);
}
