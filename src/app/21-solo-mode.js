// ── Solo option selection (select-then-confirm pattern) ──
function soloSelectOption(btn,value){
  if(_soloAnswered) return;
  // Deselect all other options
  document.querySelectorAll('.solo-q-option').forEach(b=>b.classList.remove('solo-opt-selected'));
  // Select this one
  btn.classList.add('solo-opt-selected');
  _soloSelectedAnswer=value;
  // Activate confirm button
  const confirmBtn=document.getElementById('solo-confirm-btn');
  if(confirmBtn) confirmBtn.classList.add('solo-confirm-active');
}

function confirmSoloAnswer(){
  if(_soloAnswered) return;
  if(_soloSelectedAnswer===null) return;
  submitSoloAnswer(_soloSelectedAnswer);
}

function skipSoloQuestion(){
  if(_soloAnswered) return;
  submitSoloAnswer(-1);
}

// ── Solo audio element for question sounds ──
// ── Solo audio element for question sounds (declared above with _soloCurrentCat etc.) ──

function startSoloTimer(seconds){
  clearSoloTimer();
  const timerNumEl=document.getElementById('solo-timer-number');
  const barEl=document.getElementById('solo-timer-fill');
  const timerBar=document.querySelector('.solo-timer-bar');
  let remaining=seconds;
  
  if(timerNumEl) timerNumEl.textContent=remaining;
  if(barEl){barEl.style.width='100%';barEl.classList.remove('solo-timer-low');}
  if(timerNumEl) timerNumEl.classList.remove('solo-timer-number-critical');
  if(timerBar) timerBar.classList.remove('solo-timer-critical-flash');
  
  _soloTimerInterval=setInterval(()=>{
    remaining--;
    if(timerNumEl) timerNumEl.textContent=remaining;
    if(barEl){
      const pct=remaining/seconds*100;
      barEl.style.width=pct+'%';
      if(pct<40) barEl.classList.add('solo-timer-low');
      else barEl.classList.remove('solo-timer-low');
    }
    // Critical timer warning when 20% or less time remaining
    if(remaining<=Math.ceil(seconds*0.2)&&remaining>0){
      if(timerBar) timerBar.classList.add('solo-timer-critical-flash');
      if(timerNumEl) timerNumEl.classList.add('solo-timer-number-critical');
      // Warning haptic + subtle tick sound
      try{if(navigator.vibrate)navigator.vibrate(15);}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      if(!_soloSettings.muted){
        try{
          const ctx=getAudioCtx();
          if(ctx){
            const osc=ctx.createOscillator();
            const gain=ctx.createGain();
            osc.type='sine';osc.frequency.value=880;
            gain.gain.value=0.08;
            osc.connect(gain);gain.connect(ctx.destination);
            osc.start();osc.stop(ctx.currentTime+0.06);
            osc.onended=function(){osc.disconnect();gain.disconnect();};
          }
        }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      }
    }else{
      if(timerBar) timerBar.classList.remove('solo-timer-critical-flash');
      if(timerNumEl) timerNumEl.classList.remove('solo-timer-number-critical');
    }
    if(remaining<=0){
      clearSoloTimer();
      _soloTimedOut=true;
      _soloTransitioning=true; // V15-fix: Prevent race condition with user clicks
      submitSoloAnswer(-1); // Time's up
    }
  },1000);
  // V15-fix: Register solo timer with TimerRegistry for consistent lifecycle management
  try{if(typeof TimerRegistry!=='undefined'&&TimerRegistry.register){TimerRegistry.register('solo-timer',_soloTimerInterval);}}catch(e){}
}

function clearSoloTimer(){
  if(_soloTimerInterval){clearInterval(_soloTimerInterval);_soloTimerInterval=null;}
  // V15-fix: Also clear from TimerRegistry
  try{if(typeof TimerRegistry!=='undefined'&&TimerRegistry.clear){TimerRegistry.clear('solo-timer');}}catch(e){}
}



// ═══════════════════════════════════════════════════════════════
//  LEADERBOARD SYSTEM
// ═══════════════════════════════════════════════════════════════
const _lbChannel = typeof BroadcastChannel!=='undefined' ? new BroadcastChannel('quiz_leaderboard') : null;

function _getLeaderboard(){
  try{
    const data=localStorage.getItem('quiz_leaderboard');
    return data?JSON.parse(data):[];
  }catch(e){return[];}
}

function _saveLeaderboard(lb){
  try{
    localStorage.setItem('quiz_leaderboard',JSON.stringify(lb));
    if(_lbChannel) _lbChannel.postMessage({type:'update'});
  }catch(e){console.warn('[Leaderboard] Save error:',e);}
}

function showLeaderboardModal(period){
  period=period||'all';
  const lb=_getLeaderboard();
  const now=Date.now();
  const weekAgo=now-7*24*60*60*1000;
  const monthAgo=now-30*24*60*60*1000;
  let filtered=lb;
  if(period==='weekly') filtered=lb.filter(e=>e.date>=weekAgo);
  else if(period==='monthly') filtered=lb.filter(e=>e.date>=monthAgo);
  filtered.sort((a,b)=>b.score-a.score);
  const top10=filtered.slice(0,10);
  
  let html='<div class="leaderboard-modal" onclick="if(event.target===this)this.remove()"><div class="leaderboard-content">';
  html+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:1.1rem;font-weight:900">🏆 ${I18n.t('leaderboard.title','لوحة المتصدرين')}</div><button class="btn btn-ghost btn-sm" onclick="this.closest('.leaderboard-modal').remove()">✕</button></div>`;
  html+=`<div class="lb-tabs"><div class="lb-tab${period==='weekly'?' active':''}" onclick="this.closest('.leaderboard-modal').remove();showLeaderboardModal('weekly')">${I18n.t('leaderboard.weekly','أسبوعي')}</div><div class="lb-tab${period==='monthly'?' active':''}" onclick="this.closest('.leaderboard-modal').remove();showLeaderboardModal('monthly')">${I18n.t('leaderboard.monthly','شهري')}</div><div class="lb-tab${period==='all'?' active':''}" onclick="this.closest('.leaderboard-modal').remove();showLeaderboardModal('all')">${I18n.t('leaderboard.allTime','عام')}</div></div>`;
  
  if(top10.length===0){
    html+='<div style="text-align:center;padding:40px 20px;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:8px">🏆</div><div style="font-size:.9rem">'+I18n.t('leaderboard.empty','لا توجد نتائج بعد')+'</div></div>';
  }else{
    const medals=['🥇','🥈','🥉'];
    top10.forEach((entry,i)=>{
      const topClass=i===0?'lb-top1':i===1?'lb-top2':i===2?'lb-top3':'';
      const rankDisplay=i<3?medals[i]:''+(i+1);
      const dateStr=(function(){try{const d=new Date(entry.date);return d.getFullYear()+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+String(d.getDate()).padStart(2,'0');}catch(e){return'';}})();
      html+=`<div class="lb-row ${topClass}"><div class="lb-rank">${i<3?'<span class="lb-medal">'+medals[i]+'</span>':''+(i+1)}</div><div class="lb-name">${_sanitize(entry.nickname)}</div><div class="lb-score">${entry.score}</div><div class="lb-stars">⭐${entry.stars||0}</div><div class="lb-date">${dateStr}</div></div>`;
    });
  }
  html+='</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}


function submitSoloNickname(){
  const input=document.getElementById('solo-nickname-input');
  const nickname=(input?input.value:'').trim();
  if(!nickname){if(input)input.style.borderColor='var(--danger)';return;}
  const prog=state.soloProgress||{};
  // Use the entry object format that matches the original _addToLeaderboard
  _addToLeaderboard({nickname:nickname,score:prog.totalStars||0,stars:prog.totalStars||0,date:Date.now(),sessionId:(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).substr(2,9)});
  document.getElementById('solo-nickname-form').style.display='none';
  if(typeof toast==='function')toast(I18n.t('leaderboard.saved','تم حفظ نتيجتك!'),'success');
}

// Listen for leaderboard updates from other tabs
if(_lbChannel){
  _lbChannel.onmessage=function(ev){
    if(ev.data&&ev.data.type==='update'){
      // If leaderboard modal is open, refresh it
      const modal=document.querySelector('.leaderboard-modal');
      if(modal) modal.remove();
    }
  };
}





// ═══════════════════════════════════════════════════════════════
//  SETTINGS DASHBOARD
// ═══════════════════════════════════════════════════════════════

// Expand pie chart into a fullscreen popup for better visibility on small screens
function expandPieChart(){
  var srcCanvas=document.getElementById('dash-qtype-chart');
  if(!srcCanvas)return;
  // Create popup overlay
  var overlay=document.createElement('div');
  overlay.id='pie-chart-popup';
  overlay.style.cssText='position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.92);backdrop-filter:blur(16px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;animation:fade-in .25s ease';
  // Close button
  var closeBtn=document.createElement('button');
  closeBtn.className='btn btn-ghost';
  closeBtn.style.cssText='position:absolute;top:16px;left:16px;font-size:1.1rem;padding:8px 16px;color:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.15);border-radius:8px';
  closeBtn.textContent='✕ إغلاق';
  closeBtn.onclick=function(){overlay.remove();};
  overlay.appendChild(closeBtn);
  // Title
  var title=document.createElement('div');
  title.style.cssText='font-size:1.3rem;font-weight:900;color:var(--accent1);margin-bottom:20px';
  title.textContent=t('ui.chartTitle');
  overlay.appendChild(title);
  // Canvas
  var popupCanvas=document.createElement('canvas');
  var size=Math.min(window.innerWidth-60,window.innerHeight-180,520);
  popupCanvas.width=size;popupCanvas.height=size;
  popupCanvas.style.cssText='max-width:100%;height:auto;border-radius:16px';
  overlay.appendChild(popupCanvas);
  // Legend container
  var legendDiv=document.createElement('div');
  legendDiv.style.cssText='display:flex;flex-wrap:wrap;gap:8px;margin-top:20px;justify-content:center;font-size:.9rem;max-width:'+(size+40)+'px';
  overlay.appendChild(legendDiv);
  document.body.appendChild(overlay);
  // Re-render the chart on popup canvas as donut
  try{
    var ctx=popupCanvas.getContext('2d');
    var _qTypes={};
    state.categories.forEach(function(c){
      (c.questions||[]).forEach(function(q){
        var t=q.type||'text';
        _qTypes[t]=(_qTypes[t]||0)+1;
      });
    });
    var _typeLabels={text:t('type.text'),tf:t('type.tf'),fitb:t('type.fitb'),order:t('type.order'),match:t('type.match'),quran:t('type.quran'),math:t('type.math'),image:t('type.image'),audio:t('type.audio'),video:t('type.video')};
    var _typeColors={text:'#00d4ff',tf:'#00e676',math:'#a78bfa',quran:'#ffc107',order:'#ff9800',match:'#e040fb',fitb:'#00bcd4',image:'#ff5252',audio:'#7c5cfc',video:'#ff3b5c'};
    var activeTypes=Object.entries(_qTypes).filter(function(e){return e[1]>0;});
    if(activeTypes.length>0){
      var total=activeTypes.reduce(function(s,e){return s+e[1];},0);
      var cx=popupCanvas.width/2,cy=popupCanvas.height/2;
      var radius=Math.min(cx,cy)-20;
      var innerRadius=radius*0.52;
      var startAngle=-Math.PI/2;
      activeTypes.forEach(function(entry,i){
        var sliceAngle=(entry[1]/total)*2*Math.PI;
        var midAngle=startAngle+sliceAngle/2;
        var gap=0.02;
        ctx.beginPath();
        ctx.arc(cx,cy,radius,startAngle+gap,startAngle+sliceAngle-gap);
        ctx.arc(cx,cy,innerRadius,startAngle+sliceAngle-gap,startAngle+gap,true);
        ctx.closePath();
        var color=_typeColors[entry[0]]||['#00e8d0','#a259ff','#f5c842','#ff6b35','#00b4d8','#e040fb','#4caf50','#ff9800','#2196f3','#9c27b0'][i%10];
        try{var grad=ctx.createLinearGradient(cx+radius*0.6*Math.cos(midAngle),cy+radius*0.6*Math.sin(midAngle),cx+radius*Math.cos(midAngle),cy+radius*Math.sin(midAngle));grad.addColorStop(0,color);grad.addColorStop(1,color+'cc');ctx.fillStyle=grad;}catch(e){ctx.fillStyle=color;}
        ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=2;ctx.stroke();
        // Label on slice
        var pct=Math.round(entry[1]/total*100);
        if(pct>=5){
          var labelR=(radius+innerRadius)/2;
          ctx.fillStyle='#fff';ctx.font='bold '+Math.max(12,size/22)+'px Cairo';
          ctx.textAlign='center';ctx.textBaseline='middle';
          ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=4;
          ctx.fillText((_typeLabels[entry[0]]||entry[0])+' '+pct+'%',cx+labelR*Math.cos(midAngle),cy+labelR*Math.sin(midAngle));
          ctx.shadowBlur=0;
        }
        startAngle+=sliceAngle;
        // Legend item
        var legItem=document.createElement('span');
        legItem.style.cssText='display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:6px;background:'+color+'15;border:1px solid '+color+'44';
        legItem.innerHTML='<span style="width:10px;height:10px;border-radius:3px;background:'+color+'"></span><span style="font-weight:600;color:#fff">'+(_typeLabels[entry[0]]||entry[0])+'</span><span style="color:rgba(255,255,255,.6)">'+entry[1]+' سؤال</span>';
        legendDiv.appendChild(legItem);
      });
      // Center text
      ctx.fillStyle='#f5c842';ctx.font='bold '+Math.max(22,size/10)+'px Cairo';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(total,cx,cy-8);
      ctx.fillStyle='rgba(255,255,255,.5)';ctx.font='500 '+Math.max(12,size/28)+'px Cairo';
      ctx.fillText('سؤال',cx,cy+14);
    }
  }catch(e2){console.warn('[expandPieChart] re-render failed:',e2);}
  // Close on outside click
  overlay.addEventListener('click',function(e){if(e.target===overlay)overlay.remove();});
}

function renderSettingsDashboard(){
  const statsGrid=document.getElementById('stats-grid');
  if(!statsGrid)return;
  
  const totalQ=(state.categories||[]).reduce((s,c)=>s+(c.questions||[]).length,0);
  const totalCats=getPlayableCats({all:true}).length;
  const totalTeams=(state.teams||[]).length;
  const sessions=(state.sessionStats&&Object.keys(state.sessionStats).length)||0;
  const bugReportCount=(state.bugReports||[]).filter(r=>r.status==='pending').length;
  
  // Question type distribution
  const typeCounts={text:0,tf:0,math:0,quran:0,order:0,match:0,fitb:0,image:0,audio:0,video:0};
  (state.categories||[]).forEach(cat=>{
    (cat.questions||[]).forEach(q=>{
      if(typeCounts[q.type]!==undefined) typeCounts[q.type]++;
      else typeCounts.text++;
    });
  });
  
  // Quiz status
  let quizStatus='idle'; // idle, active, ended
  if(window._currentView==='intro'||window._currentView==='teams'||window._currentView==='categories'||window._currentView==='scores'){
    quizStatus='active';
  }else if(window._currentView==='credits'){
    quizStatus='ended';
  }
  const statusLabels={idle:typeof t==='function'?t('status.idle'):'غير نشط',active:typeof t==='function'?t('status.active'):'نشط',ended:typeof t==='function'?t('status.ended'):'منتهي'};
  const statusColors={idle:'idle',active:'active',ended:'ended'};
  
  // Pie chart colors
  const pieColors=['#00e8d0','#f5c842','#7c5cfc','#ff9100','#ff3b5c','#00e676','#e040fb','#00bcd4','#8bc34a','#ff5722'];
  const typeLabels={text:typeof t==='function'?t('type.text'):'نصي',tf:typeof t==='function'?t('type.tf'):'صح/خطأ',math:typeof t==='function'?t('type.math'):'رياضي',quran:typeof t==='function'?t('type.quran'):'قرآني',order:typeof t==='function'?t('type.order'):'ترتيب',match:typeof t==='function'?t('type.match'):'توصيل',fitb:typeof t==='function'?t('type.fitb'):'ملء فراغ',image:typeof t==='function'?t('type.image'):'صورة',audio:typeof t==='function'?t('type.audio'):'صوت',video:typeof t==='function'?t('type.video'):'فيديو'};
  
  // Build pie chart as conic-gradient
  let activeTypes=Object.entries(typeCounts).filter(([k,v])=>v>0);
  let totalForPie=activeTypes.reduce((s,[,v])=>s+v,0);
  let gradParts=[];
  let currentAngle=0;
  activeTypes.forEach(([type,count],i)=>{
    const angle=(count/totalForPie)*360;
    const color=pieColors[i%pieColors.length];
    gradParts.push(color+' '+currentAngle+'deg '+(currentAngle+angle)+'deg');
    currentAngle+=angle;
  });
  const pieGradient=gradParts.length>0?'conic-gradient('+gradParts.join(',')+')':'conic-gradient(var(--border) 0deg 360deg)';
  
  // Last activity
  const lastActivity=state.sessionHistory?.[state.sessionHistory.length-1];
  const lastActivityStr=lastActivity?new Date(lastActivity.date||lastActivity.endedAt||Date.now()).toLocaleDateString('ar'):'لا يوجد';
  
  // Render
  let html='';
  
  // Quick stats cards
  html+='<div class="dashboard-stats">';
  html+=`<div class="dash-stat-card stat-questions"><div class="dash-stat-icon">📝</div><div class="dash-stat-value">${totalQ}</div><div class="dash-stat-label">${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.totalQuestions'):'إجمالي الأسئلة'}</div></div>`;
  html+=`<div class="dash-stat-card stat-categories"><div class="dash-stat-icon">📂</div><div class="dash-stat-value">${totalCats}</div><div class="dash-stat-label">${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.categories'):'الأقسام'}</div></div>`;
  html+=`<div class="dash-stat-card stat-teams"><div class="dash-stat-icon">👥</div><div class="dash-stat-value">${totalTeams}</div><div class="dash-stat-label">${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.teams'):'الفرق'}</div></div>`;
  html+=`<div class="dash-stat-card stat-sessions"><div class="dash-stat-icon">📊</div><div class="dash-stat-value">${sessions}</div><div class="dash-stat-label">${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.sessions'):'الجلسات'}</div></div>`;
  html+='</div>';
  
  // Quiz status
  html+=`<div class="dash-status-card"><div class="dash-status-dot ${statusColors[quizStatus]}"></div><div><div style="font-weight:800;font-size:.9rem">${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.quizStatus'):'حالة المسابقة'}: ${statusLabels[quizStatus]}</div><div style="font-size:.72rem;color:var(--text-secondary)">${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.lastActivity'):'آخر نشاط'}: ${lastActivityStr}</div></div></div>`;
  
  // Quick actions
  html+='<div class="dash-quick-actions">';
  html+=`<button class="dash-quick-btn" onclick="openAddQuestion()"><span>➕</span> ${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.createQuestion'):'إنشاء سؤال'}</button>`;
  html+=`<button class="dash-quick-btn" onclick="showView('intro')"><span>▶️</span> ${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.startQuiz'):'بدء مسابقة'}</button>`;
  html+=`<button class="dash-quick-btn" onclick="switchTab('import',document.querySelectorAll('.nav-tab')[5])"><span>📥</span> ${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.importBank'):'استيراد بنك'}</button>`;
  if(bugReportCount>0){
    html+=`<button class="dash-quick-btn" onclick="switchTab('bug-reports',document.querySelectorAll('.nav-tab')[6]);renderBugReportsTab()" style="border-color:rgba(255,59,92,.3);color:var(--danger)"><span>🚫</span> ${bugReportCount} ${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.reports'):'بلاغ'}</button>`;
  }
  html+='</div>';
  
  // Pie chart
  if(activeTypes.length>0){
    html+='<div class="dash-chart-section">';
    html+='<div class="dash-chart-title">'+t('ui.chartTitle')+'</div>';
    html+=`<div class="dash-pie-chart" style="background:${pieGradient}"></div>`;
    html+='<div class="dash-legend">';
    activeTypes.forEach(([type,count],i)=>{
      html+=`<div class="dash-legend-item"><div class="dash-legend-dot" style="background:${pieColors[i%pieColors.length]}"></div>${typeLabels[type]||type}: ${count}</div>`;
    });
    html+='</div></div>';
  }
  
  // Section completion (from solo progress)
  if(state.soloProgress){
    html+='<div class="dash-chart-section">';
    html+=`<div class="dash-chart-title">📈 ${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.sectionProgress'):'تقدم الأقسام'}</div>`;
    (state.categories||[]).filter(c=>c.type!=='tiebreaker').forEach(cat=>{
      const m=_getMasteryForCategory(cat.id);
      const pct=state.soloProgress?.totalLevels>0?Math.round((state.soloProgress.completedLevels/state.soloProgress.totalLevels)*100):0;
      html+=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:.8rem"><span style="min-width:80px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${cat.name}</span><div style="flex:1;height:8px;background:var(--bg-deep);border-radius:4px;overflow:hidden"><div style="height:100%;width:${m.pct}%;background:${cat.color||'var(--accent1)'};border-radius:4px;transition:width .4s"></div></div><span style="font-size:.7rem;color:var(--text-muted);min-width:30px;text-align:left">${m.pct}%</span></div>`;
    });
    html+='</div>';
  }
  
  // Spaced repetition section
  try{
    const srSection=renderSpacedRepetitionSection();
    if(srSection) html+=srSection;
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_101")}catch(_){}}
  
  // Bug report stats
  if(state.bugReports&&state.bugReports.length>0){
    const brPending=state.bugReports.filter(r=>r.status==='pending').length;
    html+=`<div class="dash-chart-section"><div class="dash-chart-title">🚫 ${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.bugReportStats'):'إحصائيات البلاغات'}</div><div style="display:flex;gap:12px;font-size:.82rem"><span>${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.total'):'إجمالي'}: ${state.bugReports.length}</span><span style="color:#ff9800">${typeof I18n!=='undefined'&&I18n.t?I18n.t('dashboard.pending'):'معلق'}: ${brPending}</span></div></div>`;
  }
  
  statsGrid.innerHTML=html;
  // Enhanced dashboard stats
  try{renderEnhancedDashboard();}catch(e){console.warn('[Dashboard] Enhanced render error:',e);}
}

// Override renderAdmin to also render dashboard
const _origRenderAdmin=renderAdmin;
renderAdmin=function(){
  _origRenderAdmin();
  try{renderSettingsDashboard();}catch(e){console.warn('[Dashboard] Render error:',e);}
  // Show browser compatibility warning only in admin panel
  try{checkBrowserCompat();}catch(e){try{ErrorBus.capture(e,'renderAdmin/checkBrowserCompat')}catch(_){}}
  // Show/hide bug reports tab based on settings
  var _bugReportsTab=document.getElementById('admin-tab-bug-reports');
  if(_bugReportsTab)_bugReportsTab.style.display=state.settings.showBugReportsTab===true?'':'none';
  // Show/hide error log button in admin header based on settings
  var _errorLogBtn=document.getElementById('admin-error-log-btn');
  if(_errorLogBtn)_errorLogBtn.style.display=state.settings.showErrorScreen===true?'':'none';
};
