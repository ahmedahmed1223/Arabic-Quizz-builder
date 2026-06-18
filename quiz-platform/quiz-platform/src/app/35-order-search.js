// ════════════════════════════════════════════════════════
//  HOST TOOLBOX — Hints, Whiteboard, Audience Poll
// ════════════════════════════════════════════════════════

// ── HOST HINTS ──
// ═══ ORDER QUESTION FUNCTIONS ═══
var _orderDragIdx=null;
function onOrderDragStart(e,idx){
  _orderDragIdx=idx;
  e.currentTarget.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',String(idx));
}
function onOrderDragOver(e,idx){
  e.preventDefault();e.dataTransfer.dropEffect='move';
  document.querySelectorAll('.order-option-item').forEach(function(el){el.classList.remove('drag-over');});
  if(idx!==_orderDragIdx)e.currentTarget.classList.add('drag-over');
}
function onOrderDrop(e,dropIdx){
  e.preventDefault();
  document.querySelectorAll('.order-option-item').forEach(function(el){el.classList.remove('drag-over','dragging');});
  if(_orderDragIdx===null||_orderDragIdx===dropIdx){_orderDragIdx=null;return;}
  var items=state._orderItems;var m=items.splice(_orderDragIdx,1)[0];items.splice(dropIdx,0,m);
  _orderDragIdx=null;
  _renderOrderItems();
}
function onOrderDragEnd(e){
  _orderDragIdx=null;
  document.querySelectorAll('.order-option-item').forEach(function(el){el.classList.remove('dragging','drag-over');});
}
function _renderOrderItems(){
  var c=document.getElementById('order-items-container');if(!c)return;
  var n=state._orderItems.length;
  var locked=!!state.answered;
  function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  var btnBase='width:26px;height:22px;border:1px solid var(--border);border-radius:4px;background:var(--bg-surface);color:var(--text-primary);cursor:pointer;font-size:.75rem;line-height:1;padding:0;display:flex;align-items:center;justify-content:center';
  c.innerHTML=state._orderItems.map(function(item,i){
    var upDis=(i===0||locked);
    var dnDis=(i===n-1||locked);
    var dragAttrs=locked ? '' :
      ' draggable="true" ondragstart="onOrderDragStart(event,'+i+')" ondragover="onOrderDragOver(event,'+i+')" ondrop="onOrderDrop(event,'+i+')" ondragend="onOrderDragEnd(event)"';
    return '<div class="order-option-item" data-order-idx="'+i+'"'+dragAttrs+(locked?' style="opacity:.85;pointer-events:none"':'')+'>'+
      '<div class="order-num">'+(i+1)+'</div>'+
      '<div class="order-text" dir="auto">'+esc(item.text)+'</div>'+
      '<div style="display:flex;flex-direction:column;gap:2px;margin-right:2px">'+
        '<button type="button" style="'+btnBase+(upDis?';opacity:.3;pointer-events:none':'')+'"'+(upDis?' disabled':'')+' onclick="onOrderMove('+i+',-1)">▲</button>'+
        '<button type="button" style="'+btnBase+(dnDis?';opacity:.3;pointer-events:none':'')+'"'+(dnDis?' disabled':'')+' onclick="onOrderMove('+i+',1)">▼</button>'+
      '</div>'+
      '<div class="order-drag" data-touch-drag="order" style="font-size:1.2rem;cursor:'+(locked?'default':'grab')+';padding:0 4px">⠿</div>'+
    '</div>';
  }).join('');
  if(!locked)_initOrderTouchDrag();
}
function onOrderMove(idx,dir){
  var items=state._orderItems;
  var ni=idx+dir;
  if(ni<0||ni>=items.length)return;
  var tmp=items[idx];items[idx]=items[ni];items[ni]=tmp;
  _renderOrderItems();
}
function _initOrderTouchDrag(){
  var _ti=null,_tsy=0,_tm=false;
  var co=document.getElementById('order-items-container');if(!co)return;
  co.ontouchstart=function(e){var h=e.target.closest('.order-drag');if(!h)return;var it=h.closest('.order-option-item');if(!it)return;_ti=parseInt(it.dataset.orderIdx);_tsy=e.touches[0].clientY;_tm=false;};
  co.ontouchmove=function(e){if(_ti===null)return;if(Math.abs(e.touches[0].clientY-_tsy)<8&&!_tm)return;_tm=true;e.preventDefault();
    var y=e.touches[0].clientY;co.querySelectorAll('.order-option-item').forEach(function(el){el.style.borderColor='';var r=el.getBoundingClientRect();if(y>=r.top&&y<=r.bottom)el.style.borderColor='var(--accent2)';});};
  co.ontouchend=function(e){if(!_tm||_ti===null){_ti=null;return;}var y=e.changedTouches[0].clientY;var di=null;
    co.querySelectorAll('.order-option-item').forEach(function(el){var r=el.getBoundingClientRect();if(y>=r.top&&y<=r.bottom)di=parseInt(el.dataset.orderIdx);el.style.borderColor='';});
    if(di!==null&&di!==_ti){var arr=state._orderItems;var m=arr.splice(_ti,1)[0];arr.splice(di,0,m);_renderOrderItems();}
    _ti=null;_tm=false;};
}
function checkOrderAnswer(){
  if(state.answered)return;
  if(!state._orderCorrect||!state._orderItems){
    toast(I18n.t('toast.orderingDataMissing'),'danger');return;
  }
  // V12-fix: Respect confirmAnswer setting — show confirm panel before finalizing
  if(state.settings.confirmAnswer && !state._orderConfirmPending){
    state._orderConfirmPending=true;
    // Show the confirm panel with order-specific context
    const panel=document.getElementById('answer-confirm-panel');
    if(panel){
      const label=panel.querySelector('.confirm-team-label');
      if(label) label.textContent=I18n.t('question.confirmAnswer');
      panel.classList.remove('hidden');
    }
    return;
  }
  // Either confirmAnswer is OFF, or user has confirmed
  state._orderConfirmPending=false;
  const correct=state._orderCorrect;
  const current=state._orderItems.map(x=>x.origIdx);
  const total=correct.length;
  // Count how many positions are correct
  let correctCount=0;
  for(let i=0;i<total;i++){if(correct[i]===current[i])correctCount++;}
  const wrongCount=total-correctCount;
  // All-or-nothing check (every position matches)
  const isFullCorrect=correctCount===total;
  // Partial credit: count as correct if correctCount > wrongCount (i.e., majority correct)
  const isMajorityCorrect=correctCount>wrongCount;
  // Use orderScoringMode setting — 'all' requires all correct, 'majority' allows majority
  const scoringMode=state.settings.orderScoringMode||'all';
  const isCorrect=scoringMode==='majority'?(isFullCorrect||isMajorityCorrect):isFullCorrect;
  state.answered=true;clearTimer();_stopTenseAudio();
  document.querySelectorAll('.order-option-item').forEach((el,i)=>{el.classList.add(current[i]===correct[i]?'correct-pos':'wrong-pos');});
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  const team=getCurrentTeam();
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  const q=cat?.questions[state.currentQIndex];
  const timeUsed=(state.timerTotal||30)-Math.max(0,state.timeLeft);
  if(isCorrect){
    playSound('correct');launchConfetti(80);
    _updateStreak(team?.id,true);
    const streakBonus=_streakBonusPts(team?.id);
    const basePts=_getQuestionPts(q);
    // Award full points if all correct, partial if majority but not all
    let pts;
    if(isFullCorrect){
      pts=basePts+streakBonus;
    }else{
      // Partial: proportional points based on correct ratio, minimum 1
      pts=Math.round(basePts*(correctCount/total));
      if(pts<1)pts=1;
      // Still add streak bonus
      pts+=streakBonus;
    }
    if(team){team.score=(team.score||0)+pts;recordScoreHistoryV5(team.id,pts);saveState();saveGameProgress();floatScore(team,'+'+pts+(streakBonus>0?' 🔥':''));_checkEarlyWinner(team);}
    if(isFullCorrect){
      toast(I18n.t('toast.orderingCorrect')+(streakBonus>0?' 🔥 مكافأة تسلسل!':''),'success');
    }else{
      toast('✅ إجابة صحيحة جزئياً ('+correctCount+'/'+total+') +'+pts+' نقطة','success');
    }
    recordAnswer(team?.id,true,timeUsed);
  }else{
    playSound('wrong');
    if(team&&state.settings.negativeMarking){const neg=state.settings.negMarkValue||1;team.score=Math.max(0,(team.score||0)-neg);recordScoreHistoryV5(team.id,-neg);saveState();saveGameProgress();floatScore(team,'-'+neg,'minus');}
    // Show the correct order after a wrong answer
    const correctOrderEl=document.createElement('div');
    correctOrderEl.style.cssText='margin-top:12px;padding:10px 14px;background:rgba(0,230,118,.08);border:1px solid var(--success);border-radius:10px;font-size:.82rem;direction:rtl;text-align:right';
    correctOrderEl.innerHTML='<div style="font-weight:900;color:var(--success);margin-bottom:6px">'+t('ui.correctOrder')+'</div>'+
      state._orderCorrect.map((origIdx,pos)=>{
        const item=(state._orderItems||[]).find(x=>x.origIdx===origIdx)||(q?.options||[])[origIdx];
        const text=typeof item==='object'?item.text:item;
        return '<div style="padding:3px 0"><span style="color:var(--accent2);font-weight:700;margin-left:6px">'+(pos+1)+'.</span>'+(text||'—')+'</div>';
      }).join('');
    const grid=document.getElementById('q-options-grid');
    if(grid)grid.appendChild(correctOrderEl);
    toast(I18n.t('toast.orderingIncorrect')+' ('+correctCount+'/'+total+' صحيحة)','danger');recordAnswer(team?.id,false,timeUsed);
    _updateStreak(team?.id,false);
  }
  if(q?.explanation){const eb=document.getElementById('q-explanation-box');if(eb){eb.innerHTML='<span>💡</span> '+_sanitize(q.explanation);eb.classList.remove('hidden');}}
  updateTicker();updateUndoBtn();
}

// ═══ SEARCH/JUMP DURING PLAY ═══
function showPlaySearch(){
  var cat=state.categories.find(function(c){return c.id===state.currentCatId});
  if(!cat){toast(I18n.t('toast.selectCatFirst'),'info');return;}
  var qList=cat.questions.map(function(q,i){var used=state.usedQuestions[state.currentCatId]&&state.usedQuestions[state.currentCatId].has(i);
    return '<div style="padding:8px 12px;border-bottom:1px solid var(--border);cursor:'+(used?'default':'pointer')+';opacity:'+(used?'.4':'1')+'" '+(used?'':'onclick="closeModal(\'modal-generic\');loadQuestion(\''+cat.id+'\','+i+','+state.currentTeamIndex+')"')+'><span style="font-weight:700;color:var(--accent2);margin-left:6px">'+(i+1)+'.</span> <span style="font-size:.85rem">'+q.text.slice(0,60)+(q.text.length>60?'…':'')+'</span>'+(used?' <span style="color:var(--success);font-size:.75rem">✅</span>':'')+'</div>';
  }).join('');
  openGenericModal('🔍 انتقل لسؤال — '+cat.name,'<input type="text" placeholder="ابحث بالنص أو الرقم..." style="width:100%;padding:10px 14px;border:2px solid var(--border);border-radius:10px;background:var(--bg-panel);color:var(--text-primary);font-size:.9rem;margin-bottom:12px;box-sizing:border-box" oninput="filterPlaySearch(this.value)" id="play-search-input" dir="auto"><div id="play-search-results" style="max-height:50vh;overflow-y:auto">'+qList+'</div>');
  setTimeout(function(){var el=document.getElementById('play-search-input');if(el)el.focus();},200);
}
function filterPlaySearch(term){
  var cat=state.categories.find(function(c){return c.id===state.currentCatId});if(!cat)return;var t=term.trim().toLowerCase();
  var el=document.getElementById('play-search-results');if(!el)return;
  el.innerHTML=cat.questions.map(function(q,i){if(t&&q.text.toLowerCase().indexOf(t)<0&&String(i+1).indexOf(t)<0)return '';
    var used=state.usedQuestions[state.currentCatId]&&state.usedQuestions[state.currentCatId].has(i);
    return '<div style="padding:8px 12px;border-bottom:1px solid var(--border);cursor:'+(used?'default':'pointer')+';opacity:'+(used?'.4':'1')+'" '+(used?'':'onclick="closeModal(\'modal-generic\');loadQuestion(\''+cat.id+'\','+i+','+state.currentTeamIndex+')"')+'><span style="font-weight:700;color:var(--accent2);margin-left:6px">'+(i+1)+'.</span> <span style="font-size:.85rem">'+q.text.slice(0,60)+(q.text.length>60?'…':'')+'</span></div>';
  }).join('')||'<div class="text-sm text-muted" style="padding:12px;text-align:center">لا توجد نتائج</div>';
}
