// ════════════════════════════════════════════════════════
//  PRES: INTRO
// ════════════════════════════════════════════════════════
function renderIntro(){
  document.getElementById('intro-title-text').textContent=state.settings.name;
  document.getElementById('intro-welcome-text').textContent=state.settings.welcomeMessage;
  updateMusicBtn();
  // Auto-start music if enabled and not already playing
  if(state.settings.autoStartMusic&&!state.musicPlaying){
    const t=state.settings.musicType||'none';
    if(t!=='none') setTimeout(()=>startMusic(t),800);
  }
  // Sync volume slider
  const vol=state.settings.musicVol||40;
  const ps=document.getElementById('pres-vol-slider');
  const pd=document.getElementById('pres-vol-display');
  if(ps) ps.value=vol;
  if(pd) pd.textContent=vol+'%';
  // Show/hide solo button — only visible when solo/practice mode is enabled and questions exist
  const isSoloMode=state.settings.compMode==='solo'||state.settings.compMode==='practice';
  const hasQuestions=state.categories.some(c=>c.type!=='tiebreaker'&&c.questions&&c.questions.length>0);
  const showSolo=isSoloMode&&hasQuestions;
  const soloBtn=document.getElementById('login-solo-btn');
  if(soloBtn) soloBtn.style.display=showSolo?'flex':'none';
  const lbBtn=document.getElementById('login-lb-btn');
  if(lbBtn) lbBtn.style.display=showSolo?'flex':'none';
  const adminSoloBtn=document.getElementById('admin-solo-btn');
  if(adminSoloBtn) adminSoloBtn.style.display=showSolo?'inline-flex':'none';
  const introSoloBtn=document.getElementById('intro-solo-btn');
  if(introSoloBtn) introSoloBtn.style.display=showSolo?'inline-flex':'none';
}

// ════════════════════════════════════════════════════════
//  PRES: TEAMS
// ════════════════════════════════════════════════════════
function renderTeamsSlide(){
  // Hide start button in sequential mode if setting enabled
  const tsBtn=document.getElementById('teams-start-btn');
  if(tsBtn){
    const isSeq=(state.settings.presentationMode==='sequence'||state.settings.presentationMode==='manual');
    tsBtn.style.display=(isSeq&&state.settings.hideStartInSeq!==false)?'none':'';
  }
  const el=document.getElementById('teams-pres-grid');
  if(!state.teams.length){setChildren(el,h('div.empty-state',h('p',{style:{fontSize:'1.5rem',opacity:'.4',marginBottom:'8px'}},'👥'),h('p',I18n.t('teams.noTeams'))));return}
  el.setAttribute('data-count',Math.min(state.teams.length,3));
  // Apply fill-mode class if needed
  if((state.settings.teamCardHeight||'auto')==='fill'){el.classList.add('fill-mode')}else{el.classList.remove('fill-mode')}
  el.innerHTML=state.teams.map((t,i)=>{
    const membersHtml=t.members.length
      ? t.members.map((m,mi)=>{
          const mName=typeof m==='object'?m.name:m;
          const mImg=typeof m==='object'?m.image:null;
          const avatarInner=mImg
            ?`<img src="${_safeMediaSrc(mImg)}" alt="${_sanitizeUser(mName)}">`
            :`<span>${_sanitizeUser(mName[0]||'؟')}</span>`;
          return `<div class="team-pres-member-row" style="animation:member-fade-in .4s ease ${(i*.25)+(mi*.12)+.3}s both">
            <div class="team-pres-member-avatar" style="background:${_safeColor(t.color)}">${avatarInner}</div>
            <div class="team-pres-member-name">${_sanitizeUser(mName)}</div>
          </div>`;
        }).join('')
      : `<div class="team-pres-empty-members">${I18n.t('teams.noMembers')}</div>`;
    const membersSection=t.members.length?`
      <div class="team-pres-divider"></div>
      <div class="team-pres-members-section">
        <div class="team-pres-members-title"><svg class="svg-icon" viewBox="0 0 24 24" style="opacity:.6"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg> <span>${I18n.t('teams.members')} (${t.members.length})</span></div>
        <div class="team-pres-members-list">${membersHtml}</div>
      </div>`:'';
    // Team avatar: image > icon > first letter
    const teamAvatarInner=t.teamImage
      ?`<img src="${_safeMediaSrc(t.teamImage)}" alt="${_sanitizeUser(t.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      :`${_sanitizeUser(t.name[0])}`;
    return `
      <div class="team-pres-card" style="animation-delay:${i*.25}s;border-color:${_safeColor(t.color)}30">
        <div class="team-pres-top-bar" style="background:linear-gradient(90deg,${_safeColor(t.color)},${_safeColor(t.color)}99)"></div>
        <div class="team-pres-body">
          <div class="team-pres-avatar" style="background:${_safeColor(t.color)}">${teamAvatarInner}</div>
          <div class="team-pres-name" style="color:${_safeColor(t.color)}">${_sanitizeUser(t.name)}</div>
          <div class="team-pres-score" style="color:${_safeColor(t.color)};text-shadow:0 0 30px ${_safeColor(t.color)}66">${t.score||0}</div>
          <div class="team-pres-score-label">${I18n.t('teams.point')}</div>
          ${membersSection}
        </div>
      </div>`;
  }).join('');
}
