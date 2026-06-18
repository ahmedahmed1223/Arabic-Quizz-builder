// ════════════════════════════════════════════════════════
//  V5 — PODIUM SCREEN
// ════════════════════════════════════════════════════════
function showPodium(){
  saveSessionHistory();
  if(!state.teams.length){toast(I18n.t('toast.noTeams'),'info');return}
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  const stage=document.getElementById('podium-stage');
  const rest=document.getElementById('podium-rest');
  // Build podium (1st, 2nd, 3rd)
  const top3=sorted.slice(0,3);
  const podiumOrder=[1,0,2]; // visual: 2nd-left, 1st-center, 3rd-right
  stage.innerHTML='';
  const ranks=['🥇','🥈','🥉'];
  const placeClass=['podium-1st','podium-2nd','podium-3rd'];
  const heights=['180px','130px','100px'];
  podiumOrder.forEach((dataIdx,visualPos)=>{
    const t=top3[dataIdx];if(!t)return;
    const rank=dataIdx+1;
    const div=document.createElement('div');
    div.className=`podium-place ${placeClass[dataIdx]}`;
    div.style.animationDelay=(visualPos*0.15)+'s';
    div.innerHTML=`
      <div class="podium-avatar" style="background:${t.color};overflow:hidden">
        ${rank===1?'<div class="podium-crown">👑</div>':''}
        ${t.teamImage?'<img src="'+_safeMediaSrc(t.teamImage)+'" alt="'+_sanitizeUser(t.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':t.name.charAt(0)}
      </div>
      <div class="podium-team-name" style="color:${t.color}">${_sanitizeUser(t.name)}</div>
      <div class="podium-score">${t.score||0} نقطة</div>
      <div class="podium-block">
        <span class="podium-rank-num">${ranks[dataIdx]}</span>
      </div>`;
    stage.appendChild(div);
  });
  // Build rest list
  rest.innerHTML=sorted.slice(3).map((t,i)=>`
    <div class="podium-rest-item" style="animation-delay:${(i+3)*0.08}s">
      <span class="podium-rest-rank">${i+4}</span>
      <span class="podium-rest-color" style="background:${t.color};overflow:hidden">${t.teamImage?'<img src="'+_safeMediaSrc(t.teamImage)+'" alt="'+_sanitizeUser(t.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':''}</span>
      <span class="podium-rest-name">${_sanitizeUser(t.name)}</span>
      <span class="podium-rest-score">${t.score||0}</span>
    </div>`).join('');
  document.getElementById('podium-title').textContent='🎊 '+( state.settings.name||'المسابقة' );
  showView('podium');
  // Force scroll to top AFTER view shown (multiple attempts for mobile reliability)
  const _scrollPodium=()=>{
    const v=document.getElementById('view-podium');
    if(v){v.scrollTop=0;v.scrollTo(0,0);const pr=v.querySelector('.podium-rest');if(pr){pr.scrollTop=0;pr.scrollTo(0,0);}}
    window.scrollTo({top:0,left:0,behavior:'instant'});
    document.documentElement.scrollTop=0;
    document.body.scrollTop=0;
  };
  requestAnimationFrame(()=>{_scrollPodium();});
  setTimeout(_scrollPodium,50);
  setTimeout(_scrollPodium,200);
  setTimeout(_scrollPodium,400);
  setTimeout(launchPodiumConfetti,600);
  // Auto-play podium music if set
  setTimeout(()=>startPodiumMusic(),400);
  // Show certificate preview card
  setTimeout(()=>_updatePodiumCertPreview(),500);
  // ── Tiebreaker check ──
  if(state.settings.tiebreakerEnabled && _checkTie()){
    setTimeout(()=>{
      _offerTiebreaker();
    },1500);
  }
}

// ── PODIUM MUSIC FUNCTIONS ──
window._podiumAudioEl=null;
window._podiumMusicPlaying=false;

function loadPodiumMusic(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    state.settings.podiumMusicData=e.target.result;
    saveState();
    const nm=document.getElementById('podium-music-name');
    if(nm)nm.textContent='✅ '+file.name.slice(0,28);
    toast(I18n.t('toast.podiumMusicUploaded'),'success');
  };
  reader.readAsDataURL(file);
}

function clearPodiumMusic(){
  stopPodiumMusicTest();
  state.settings.podiumMusicData=null;
  saveState();
  const nm=document.getElementById('podium-music-name');
  if(nm)nm.textContent=I18n.t('admin.notChosen')||'لم يُختر بعد';
  toast(I18n.t('toast.podiumMusicDeleted'),'info');
}

function testPodiumMusic(){
  if(!state.settings.podiumMusicData){toast(I18n.t('toast.noFileUploaded'),'danger');return;}
  stopPodiumMusicTest();
  const audio=new Audio(state.settings.podiumMusicData);
  audio.volume=(state.settings.podiumMusicVol??60)/100;
  audio.play().catch(()=>{});
  window._podiumTestAudio=audio;
  const btn=document.getElementById('test-btn-podiumMusic');
  const stop=document.getElementById('stop-btn-podiumMusic');
  if(btn)btn.classList.add('playing');
  if(stop)stop.classList.remove('hidden');
  audio.onended=()=>{stopPodiumMusicTest();};
}

function stopPodiumMusicTest(){
  if(window._podiumTestAudio){try{window._podiumTestAudio.pause();window._podiumTestAudio.src='';}catch(e){try{ErrorBus.capture(e,"catch#42")}catch(_){}}}
  window._podiumTestAudio=null;
  const btn=document.getElementById('test-btn-podiumMusic');
  const stop=document.getElementById('stop-btn-podiumMusic');
  if(btn)btn.classList.remove('playing');
  if(stop)stop.classList.add('hidden');
}

function startPodiumMusic(){
  stopPodiumMusicInternal();
  if(!state.settings.podiumMusicData)return;
  // Stop BGM when podium music plays to avoid overlap
  try{if(state.musicPlaying){stopMusic();}}catch(e){try{ErrorBus.capture(e,"catch#AUTO_217")}catch(_){}}
  const audio=new Audio(state.settings.podiumMusicData);
  audio.volume=(state.settings.podiumMusicVol??60)/100;
  audio.loop=!!state.settings.podiumMusicLoop;
  audio.play().catch(()=>{});
  window._podiumAudioEl=audio;
  window._podiumMusicPlaying=true;
  updatePodiumMusicBtn();
}

function stopPodiumMusicInternal(){
  if(window._podiumAudioEl){try{window._podiumAudioEl.pause();window._podiumAudioEl.currentTime=0;window._podiumAudioEl.src='';}catch(e){try{ErrorBus.capture(e,"catch#43")}catch(_){}}}
  window._podiumAudioEl=null;
  window._podiumMusicPlaying=false;
  updatePodiumMusicBtn();
}

function togglePodiumMusic(){
  if(window._podiumMusicPlaying){stopPodiumMusicInternal();}
  else{startPodiumMusic();}
}

function updatePodiumMusicBtn(){
  const btn=document.getElementById('podium-music-toggle-btn');
  const lbl=document.getElementById('podium-music-btn-label');
  if(!btn)return;
  btn.style.display=state.settings.podiumMusicData?'inline-flex':'none';
  if(lbl)lbl.textContent=window._podiumMusicPlaying?'إيقاف ⏸':'موسيقى ▶';
  if(window._podiumMusicPlaying){btn.style.borderColor='var(--accent2)';btn.style.color='var(--accent2)';}
  else{btn.style.borderColor='';btn.style.color='';}
}
let _podiumConfAF=null;
function launchPodiumConfetti(){
  const canvas=document.getElementById('podium-confetti');
  if(!canvas)return;
  if(_podiumConfAF){cancelAnimationFrame(_podiumConfAF);_podiumConfAF=null;}
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  const pieces=[];
  const colors=['#f5c842','#00d4ff','#ff6b35','#00e676','#a78bfa','#f472b6'];
  for(let i=0;i<200;i++){
    pieces.push({
      x:Math.random()*canvas.width,y:-20-Math.random()*120,
      w:6+Math.random()*8,h:10+Math.random()*10,
      color:colors[Math.floor(Math.random()*colors.length)],
      vx:(Math.random()-0.5)*5,vy:2+Math.random()*4,
      rot:Math.random()*360,vrot:(Math.random()-0.5)*6,op:1
    });
  }
  let frame=0;
  function drawPodium(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive=0;
    pieces.forEach(p=>{
      if(p.op<=0)return;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);
      ctx.globalAlpha=p.op;ctx.fillStyle=p.color;
      ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();
      p.x+=p.vx;p.y+=p.vy;p.rot+=p.vrot;p.vy+=0.07;
      if(p.y>canvas.height+20)p.op=0;else alive++;
    });
    frame++;
    if(frame<260&&alive>0)_podiumConfAF=requestAnimationFrame(drawPodium);
    else{_podiumConfAF=null;ctx.clearRect(0,0,canvas.width,canvas.height);}
  }
  _podiumConfAF=requestAnimationFrame(drawPodium);
}
function resetForNewGame(){
  confirmAction(I18n.t('confirm.newGame'),()=>{
    // Stop all sounds
    try{stopMusic();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_218")}catch(_){}}
    try{stopEffectSound();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_219")}catch(_){}}
    try{_stopTenseAudio();state._tenseMusicActive=false;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_220")}catch(_){}}
    try{AudioMixer.stopAll();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_221")}catch(_){}}
    try{stopPodiumMusicInternal();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_222")}catch(_){}}
    if(state.settings.resetScoresOnNew!==false){
      state.teams.forEach(t=>t.score=0);
    }
    state.usedQuestions={};state.fullCatQueue=[];state.fullCatQueuePos=0;
    state.scoreHistory=[];state.teamStreaks={};state.gameActive=false;
    // ── FIX: Clear session stats and saved progress ──
    initSessionStats();
    clearGameProgress();
    saveState();showView('intro');
    toast(I18n.t('toast.newGameReady'),'success');
  },'🔄','بدء جديد');
}
