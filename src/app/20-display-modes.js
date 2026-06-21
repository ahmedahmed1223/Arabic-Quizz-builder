// ═══════════════════════════════════════════════════════
//  PRES: CATEGORIES
// ════════════════════════════════════════════════════════
function renderCatsSlide(){
  document.getElementById('cats-comp-name').textContent='🏆 '+state.settings.name;
  const team=getCurrentTeam();
  const banner=document.getElementById('cats-turn-banner');
  if(team){
    banner.innerHTML=`<span style="color:${_safeColor(team.color)}">🎯 ${I18n.t('cats.turnOf',{teamName:_sanitizeUser(team.name)})}</span>`;
    banner.style.display='';
  }else{
    banner.style.display='none';
  }

  // V12: Handle container play mode
  var containerMode=state.settings.containerPlayMode||'normal';
  var hasContainers=state.categories.some(c=>c.type==='container');

  // In normal mode, clear sequential state if activeContainerId was set by sequential
  if(!hasContainers||containerMode==='normal'){
    // If we're inside a container in normal mode, that's fine (user clicked into it)
    // But if there are no containers at all, clean up
    if(!hasContainers&&state._activeContainerId){
      if(state._prevCatDisplayMode){
        state.settings.catDisplayMode=state._prevCatDisplayMode;
        state._prevCatDisplayMode=null;
      }
      state._activeContainerId=null;
    }
  }

  // In sequential mode: auto-set activeContainerId if not set
  if(hasContainers&&containerMode==='sequential'&&!state._activeContainerId){
    var seqInfo=getCurrentSequentialContainer();
    if(seqInfo){
      state._activeContainerId=seqInfo.container.id;
      // Apply container display mode
      var contMode=seqInfo.container.containerDisplay&&seqInfo.container.containerDisplay!=='inherit'?seqInfo.container.containerDisplay:null;
      if(contMode&&contMode!==state.settings.catDisplayMode){
        state._prevCatDisplayMode=state.settings.catDisplayMode;
        state.settings.catDisplayMode=contMode;
      }
    }
  }

  // V12: If inside a container category, show subcategories label
  if(state._activeContainerId){
    const contCat=state.categories.find(c=>c.id===state._activeContainerId);
    var stageLabel=contCat?getContainerStageLabel(contCat):'';
    document.getElementById('cats-mode-label').textContent=(contCat?stageLabel+' — ':'')+I18n.t('cats.subcategories');
  }else{
    document.getElementById('cats-mode-label').textContent=
      state.settings.compMode==='full_cat'?'اختر القسم — ستُوزَّع جميع أسئلته على الفرق':'اختر القسم للإجابة';
  }

  // Sync mode switcher buttons
  const mode=state.settings.catDisplayMode||'grid';
  document.querySelectorAll('.cats-mode-btn').forEach(b=>{
    b.classList.toggle('active',b.dataset.mode===mode);
  });
  // Show/hide mode switcher based on catSwitcherLocation setting
  const switcher=document.getElementById('cats-mode-switcher');
  if(switcher){const loc=state.settings.catSwitcherLocation||'both';switcher.style.display=(loc==='admin')?'none':'flex';}
  // V7: When locked to 'frontend', admin setting UI shows a lock icon (non-editable hint)
  if(state.settings.catSwitcherLocation==='frontend'){const s=document.getElementById('s-cat-display-mode');if(s)s.setAttribute('data-hint','🖥 مُعرَّف من الجمهور')}

  // V12: Check if all playable categories are depleted (exclude containers & tiebreakers)
  const playableCats=getPlayableCats({all:true});
  const allDepleted=playableCats.every(cat=>{
    const used=state.usedQuestions[cat.id]||new Set();return cat.questions.length===used.size;
  });
  if(allDepleted&&playableCats.length>0){
    const grid=document.getElementById('cats-pres-grid');
    setChildren(grid,h('div.empty-state',{style:{gridColumn:'1/-1'}},h('div.empty-icon','🏆'),h('p',{style:{fontSize:'1.4rem',fontWeight:'900',color:'var(--accent1)'}},'🎉 انتهت المسابقة!'),h('p',{style:{marginTop:'8px'}},'جاري الانتقال لعرض النتائج...')));
    clearGameProgress();
    state.gameActive=false;
    launchConfetti(150);
    setTimeout(()=>showView('scores'),2500);
    return;
  }

  // Route to correct renderer
  switch(mode){
    case 'wheel':    renderCatsWheel();    break;
    case 'hidden':   renderCatsHidden();   break;
    case 'list':     renderCatsListImproved();     break;
    case 'jeopardy': renderCatsJeopardy(); break;
    default:         renderCatsGrid();     break;
  }
}

function setCatDisplayMode(mode, el){
  state.settings.catDisplayMode=mode;
  saveState();
  renderCatsSlide();
}

// ─── MODE 1: GRID (classic) ───────────────────────────────────────
function renderCatsGrid(){
  const grid=document.getElementById('cats-pres-grid');
  grid.className='categories-pres-grid';grid.style.display='grid';grid.style.flex='1';grid.style.alignContent='center';

  var containerMode=state.settings.containerPlayMode||'normal';
  var hasContainers=state.categories.some(c=>c.type==='container');

  // V12: If inside a container, show its subcategories
  if(state._activeContainerId){
    var catsToShow=state.categories.filter(c=>c.parentId===state._activeContainerId&&c.type!=='tiebreaker'&&c.type!=='container');

    // Build stage progress header for sequential mode
    var stageHeaderHtml='';
    if(containerMode==='sequential'){
      var contCat=state.categories.find(c=>c.id===state._activeContainerId);
      var seqInfo=getCurrentSequentialContainer();
      var prog=getContainerProgress(state._activeContainerId);
      var allContainers=getOrderedContainers();
      var currentIdx=allContainers.findIndex(c=>c.id===state._activeContainerId);
      // Stage progress bar
      stageHeaderHtml='<div style="grid-column:1/-1;margin-bottom:8px;padding:10px 14px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);border-radius:10px;display:flex;flex-direction:column;gap:6px">';
      stageHeaderHtml+='<div style="display:flex;align-items:center;justify-content:space-between">';
      stageHeaderHtml+='<div style="font-size:1rem;font-weight:800;color:var(--accent2)">'+(contCat?getContainerStageLabel(contCat):'')+'</div>';
      stageHeaderHtml+='<div style="font-size:.78rem;color:var(--text-muted)">'+I18n.t('cats.stageOf',{current:currentIdx+1,total:allContainers.length})+'</div>';
      stageHeaderHtml+='</div>';
      // Progress bar
      stageHeaderHtml+='<div style="display:flex;align-items:center;gap:8px">';
      stageHeaderHtml+='<div style="flex:1;height:6px;background:rgba(128,128,128,.15);border-radius:3px;overflow:hidden"><div style="width:'+prog.pct+'%;height:100%;background:var(--accent2);border-radius:3px;transition:width .4s ease"></div></div>';
      stageHeaderHtml+='<span style="font-size:.75rem;font-weight:700;color:var(--accent2)">'+prog.completed+'/'+prog.total+'</span>';
      stageHeaderHtml+='</div>';
      // All stages indicators
      stageHeaderHtml+='<div style="display:flex;gap:4px;justify-content:center;margin-top:2px">';
      allContainers.forEach(function(c,i){
        var isCurrent=c.id===state._activeContainerId;
        var isDone=isContainerCompleted(c.id);
        var dotColor=isCurrent?'var(--accent2)':isDone?'var(--success)':'rgba(128,128,128,.3)';
        stageHeaderHtml+='<div style="width:'+(isCurrent?'28px':'10px')+';height:10px;border-radius:5px;background:'+dotColor+';transition:all .3s ease"></div>';
      });
      stageHeaderHtml+='</div>';
      stageHeaderHtml+='</div>';
    }

    // Back button - only show in normal mode (sequential auto-advances)
    var backBtnHtml=containerMode==='normal'?`<div class="cat-pres-btn" style="border-color:var(--accent2)55;border-style:dashed" onclick="exitContainerCat()"><div class="cat-pres-icon">←</div><div class="cat-pres-name" style="color:var(--accent2)">${I18n.t('cats.backToContainers')}</div><div class="cat-pres-count" style="color:var(--accent2);font-weight:800"></div></div>`:'';

    grid.innerHTML=stageHeaderHtml+backBtnHtml+catsToShow.map(cat=>{
      const used=state.usedQuestions[cat.id]||new Set();
      const rem=cat.questions.length-used.size;
      const dep=rem===0;
      const bankSize=state.settings.bankSize||0;
      const showCount=bankSize>0&&!dep?Math.min(bankSize,rem):rem;
      const shuffleBadge=(state.settings.shuffleQuestions&&state.settings.showShuffleBadge&&!dep)?'<div class="shuffle-badge">🔀 عشوائي</div>':'';
      const iconHtml=dep?'<span style="font-size:2rem">✅</span>':cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" style="width:clamp(48px,7vw,72px);height:clamp(48px,7vw,72px);border-radius:10px;object-fit:cover;margin-bottom:clamp(5px,1vh,10px);border:2px solid ${cat.color}44" alt="${_sanitizeUser(cat.name)}">`:`<div class="cat-pres-icon">${_sanitizeIcon(cat.icon)||'📂'}</div>`;
      return `<div class="cat-pres-btn ${dep?'depleted':''}" style="border-color:${dep?'var(--border)':cat.color+'55'}" onclick="${dep?'':` selectCatAndStart('${cat.id}')`}">
        ${shuffleBadge}
        ${iconHtml}
        <div class="cat-pres-name" style="color:${dep?'var(--text-muted)':cat.color}">${_sanitizeUser(cat.name)}</div>
        <div class="cat-pres-count" style="${!dep?'color:'+cat.color+';font-weight:800':''}">
          ${dep?'اكتمل':showCount+(bankSize>0&&rem>bankSize?' من '+cat.questions.length:' / '+cat.questions.length)}
        </div>
      </div>`;
    }).join('');

    // Sequential mode: check if all sub-categories completed, auto-advance
    if(containerMode==='sequential'&&state.settings.containerAutoAdvance!==false&&!state._advancingContainer){
      var currentProg=getContainerProgress(state._activeContainerId);
      if(currentProg.pct>=100&&currentProg.total>0){
        // Check if there's a next container
        var nextSeqInfo=getCurrentSequentialContainer();
        if(nextSeqInfo&&nextSeqInfo.container.id!==state._activeContainerId){
          // Show completion message briefly then advance
          state._advancingContainer=true;
          setTimeout(function(){
            _advanceToNextContainer();
            state._advancingContainer=false;
          },1200);
        }else if(!nextSeqInfo){
          // All containers completed - quiz is done
        }
      }
    }
    return;
  }

  // NOT inside a container — show top-level categories
  var catsToShow;
  if(hasContainers&&containerMode==='sequential'){
    // Sequential mode: show current stage overview (container cards with progress)
    var containers=getOrderedContainers();
    catsToShow=containers;
  }else{
    // Normal mode: show all non-tiebreaker top-level categories
    catsToShow=state.categories.filter(c=>c.type!=='tiebreaker'&&!c.parentId);
  }

  // Back button if returning from container (normal mode)
  var backBtnHtml=state._activeContainerId?`<div class="cat-pres-btn" style="border-color:var(--accent2)55;border-style:dashed" onclick="exitContainerCat()"><div class="cat-pres-icon">←</div><div class="cat-pres-name" style="color:var(--accent2)">${I18n.t('cats.backToContainers')}</div><div class="cat-pres-count" style="color:var(--accent2);font-weight:800"></div></div>`:'';

  grid.innerHTML=backBtnHtml+catsToShow.map(cat=>{
    // Container category — show with subcategory count and progress
    if(cat.type==='container'){
      const subCats=state.categories.filter(c=>c.parentId===cat.id);
      const subCount=subCats.length;
      var prog=getContainerProgress(cat.id);
      var isDone=isContainerCompleted(cat.id);
      var isCurrent=false;
      if(containerMode==='sequential'){
        var seqInfo=getCurrentSequentialContainer();
        isCurrent=seqInfo&&seqInfo.container.id===cat.id;
      }
      var stageLabel=getContainerStageLabel(cat);
      var contIconHtml=cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" style="width:clamp(48px,7vw,72px);height:clamp(48px,7vw,72px);border-radius:10px;object-fit:cover;margin-bottom:clamp(5px,1vh,10px);border:2px solid ${cat.color}44" alt="${_sanitizeUser(cat.name)}">`:`<div class="cat-pres-icon">${isDone?'✅':_sanitizeIcon(cat.icon)||'📁'}</div>`;
      var borderStyle=isDone?'solid':isCurrent?'solid':'dashed';
      var borderColor=isDone?'var(--success)55':isCurrent?cat.color:cat.color+'55';
      var clickHandler=containerMode==='sequential'?(isCurrent?`enterContainerCat('${cat.id}')`:''):`enterContainerCat('${cat.id}')`;
      return `<div class="cat-pres-btn ${isDone?'depleted':''}" style="border-color:${borderColor};border-style:${borderStyle};${isCurrent?'box-shadow:0 0 20px '+cat.color+'33':''}" onclick="${clickHandler}">
      ${isCurrent?'<div style="position:absolute;top:4px;left:4px;font-size:.55rem;padding:1px 6px;border-radius:6px;background:var(--accent2);color:#fff;font-weight:700">▶ حالي</div>':''}
      ${isDone?'<div style="position:absolute;top:4px;left:4px;font-size:.55rem;padding:1px 6px;border-radius:6px;background:var(--success);color:#fff;font-weight:700">✓ مكتمل</div>':''}
      ${contIconHtml}
      <div class="cat-pres-name" style="color:${isDone?'var(--text-muted)':cat.color}">${_sanitizeUser(stageLabel)}</div>
      <div style="font-size:.7rem;color:var(--text-muted);margin-bottom:2px">${_sanitizeUser(cat.name)}</div>
      <div style="width:100%;height:4px;background:rgba(128,128,128,.12);border-radius:2px;overflow:hidden;margin-top:4px"><div style="width:${prog.pct}%;height:100%;background:${isDone?'var(--success)':cat.color};border-radius:2px;transition:width .4s ease"></div></div>
      <div class="cat-pres-count" style="color:${isDone?'var(--success)':cat.color};font-weight:800">${isDone?'اكتمل':prog.completed+'/'+prog.total+' '+I18n.t('cats.subcategories')}</div>
    </div>`;
    }
    // Regular category
    const used=state.usedQuestions[cat.id]||new Set();
    const rem=cat.questions.length-used.size;
    const dep=rem===0;
    const bankSize=state.settings.bankSize||0;
    const showCount=bankSize>0&&!dep?Math.min(bankSize,rem):rem;
    const shuffleBadge=(state.settings.shuffleQuestions&&state.settings.showShuffleBadge&&!dep)?'<div class="shuffle-badge">🔀 عشوائي</div>':'';
    const regIconHtml=dep?'<span style="font-size:2rem">✅</span>':cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" style="width:clamp(48px,7vw,72px);height:clamp(48px,7vw,72px);border-radius:10px;object-fit:cover;margin-bottom:clamp(5px,1vh,10px);border:2px solid ${cat.color}44" alt="${_sanitizeUser(cat.name)}">`:`<div class="cat-pres-icon">${_sanitizeIcon(cat.icon)||'📂'}</div>`;
    return `<div class="cat-pres-btn ${dep?'depleted':''}" style="border-color:${dep?'var(--border)':cat.color+'55'}" onclick="${dep?'':` selectCatAndStart('${cat.id}')`}">
      ${shuffleBadge}
      ${regIconHtml}
      <div class="cat-pres-name" style="color:${dep?'var(--text-muted)':cat.color}">${_sanitizeUser(cat.name)}</div>
      <div class="cat-pres-count" style="${!dep?'color:'+cat.color+';font-weight:800':''}">
        ${dep?'اكتمل':showCount+(bankSize>0&&rem>bankSize?' من '+cat.questions.length:' / '+cat.questions.length)}
      </div>
    </div>`;
  }).join('');
}
// V12: Enter a container category to show its subcategories
function enterContainerCat(catId){
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat||cat.type!=='container')return;
  state._activeContainerId=catId;
  // Use container's display mode if specified
  const contMode=cat.containerDisplay&&cat.containerDisplay!=='inherit'?cat.containerDisplay:null;
  if(contMode&&contMode!==state.settings.catDisplayMode){
    state._prevCatDisplayMode=state.settings.catDisplayMode;
    state.settings.catDisplayMode=contMode;
  }
  renderCatsSlide();
}
// V12: Exit container category back to main categories
function exitContainerCat(){
  // Restore previous display mode if it was changed by container
  if(state._prevCatDisplayMode){
    state.settings.catDisplayMode=state._prevCatDisplayMode;
    state._prevCatDisplayMode=null;
  }
  state._activeContainerId=null;
  renderCatsSlide();
}
// V12: Advance to next container in sequential mode
function _advanceToNextContainer(){
  try{
  // Restore display mode
  if(state._prevCatDisplayMode){
    state.settings.catDisplayMode=state._prevCatDisplayMode;
    state._prevCatDisplayMode=null;
  }
  state._activeContainerId=null;
  // Get next uncompleted container
  var nextSeqInfo=getCurrentSequentialContainer();
  if(nextSeqInfo){
    // Show stage transition overlay
    var nextCat=nextSeqInfo.container;
    var stageLabel=getContainerStageLabel(nextCat);
    var overlay=document.createElement('div');
    overlay.id='container-transition-overlay';
    overlay.style.cssText='position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:fade-in .3s ease';
    overlay.innerHTML='<div style="font-size:1.2rem;color:var(--accent2);font-weight:800;margin-bottom:8px">'+I18n.t('cats.stageComplete')+'</div>'+
      '<div style="font-size:2rem;font-weight:900;color:var(--accent1);margin-bottom:12px">'+I18n.t('cats.nextStage')+'</div>'+
      '<div style="font-size:1.4rem;font-weight:700;color:'+nextCat.color+';margin-bottom:6px">'+_sanitizeUser(stageLabel)+'</div>'+
      '<div style="font-size:.85rem;color:var(--text-muted)">'+_sanitizeUser(nextCat.name)+'</div>'+
      '<div style="margin-top:16px;font-size:.8rem;color:var(--text-muted)">'+I18n.t('cats.stageOf',{current:nextSeqInfo.index+1,total:nextSeqInfo.total})+'</div>';
    document.body.appendChild(overlay);
    setTimeout(function(){
      if(overlay.parentNode)overlay.remove();
      enterContainerCat(nextCat.id);
    },2500);
  }
  // If no next container, the quiz end logic in renderCatsSlide will handle it
  }catch(e){try{ErrorBus.capture(e,"_advanceToNextContainer")}catch(_){}state._advancingContainer=false;}
}

// ─── MODE 2: LIST ─────────────────────────────────────────────────
function renderCatsListImproved(){
  const grid=document.getElementById('cats-pres-grid');
  grid.className='';grid.style.display='block';grid.style.width='100%';grid.style.maxWidth='700px';
  var containerMode=state.settings.containerPlayMode||'normal';
  var hasContainers=state.categories.some(c=>c.type==='container');

  // V12: Filter based on container context
  var catsSource;
  if(state._activeContainerId){
    catsSource=state.categories.filter(c=>c.parentId===state._activeContainerId&&c.type!=='tiebreaker'&&c.type!=='container');
  }else if(hasContainers&&containerMode==='sequential'){
    catsSource=getOrderedContainers();
  }else{
    catsSource=state.categories.filter(c=>c.type!=='tiebreaker'&&!c.parentId);
  }

  // Sequential stage header
  var stageHeaderHtml='';
  if(state._activeContainerId&&containerMode==='sequential'){
    var contCat=state.categories.find(c=>c.id===state._activeContainerId);
    var prog=getContainerProgress(state._activeContainerId);
    var allContainers=getOrderedContainers();
    var currentIdx=allContainers.findIndex(c=>c.id===state._activeContainerId);
    stageHeaderHtml='<div style="padding:10px 14px;background:rgba(0,212,255,.08);border:1px solid rgba(0,212,255,.2);border-radius:10px;margin-bottom:8px;display:flex;flex-direction:column;gap:4px">';
    stageHeaderHtml+='<div style="display:flex;align-items:center;justify-content:space-between"><div style="font-size:.95rem;font-weight:800;color:var(--accent2)">'+(contCat?getContainerStageLabel(contCat):'')+'</div><div style="font-size:.75rem;color:var(--text-muted)">'+I18n.t('cats.stageOf',{current:currentIdx+1,total:allContainers.length})+'</div></div>';
    stageHeaderHtml+='<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;height:5px;background:rgba(128,128,128,.12);border-radius:3px;overflow:hidden"><div style="width:'+prog.pct+'%;height:100%;background:var(--accent2);border-radius:3px;transition:width .4s ease"></div></div><span style="font-size:.72rem;font-weight:700;color:var(--accent2)">'+prog.completed+'/'+prog.total+'</span></div>';
    stageHeaderHtml+='<div style="display:flex;gap:4px;justify-content:center">';
    allContainers.forEach(function(c){
      var isCurrent=c.id===state._activeContainerId;
      var isDone=isContainerCompleted(c.id);
      stageHeaderHtml+='<div style="width:'+(isCurrent?'24px':'8px')+';height:8px;border-radius:4px;background:'+(isCurrent?'var(--accent2)':isDone?'var(--success)':'rgba(128,128,128,.3)')+';transition:all .3s ease"></div>';
    });
    stageHeaderHtml+='</div></div>';
  }

  const cats=catsSource.map(cat=>{
    if(cat.type==='container'){
      const subCount=state.categories.filter(c=>c.parentId===cat.id).length;
      var prog=getContainerProgress(cat.id);
      var isDone=isContainerCompleted(cat.id);
      var isCurrent=false;
      if(containerMode==='sequential'){
        var seqInfo=getCurrentSequentialContainer();
        isCurrent=seqInfo&&seqInfo.container.id===cat.id;
      }
      return {cat,rem:isDone?0:prog.total-prog.completed,dep:isDone,isContainer:true,prog,isCurrent};
    }
    const used=state.usedQuestions[cat.id]||new Set();
    const rem=cat.questions.length-used.size;
    const dep=rem===0;
    return {cat,rem,dep,isContainer:false,prog:null,isCurrent:false};
  });
  var backBtnHtml=state._activeContainerId&&containerMode==='normal'?`<div class="cats-list-row" onclick="exitContainerCat()" style="border:1px dashed var(--accent2);border-radius:10px;margin-bottom:4px"><div class="cats-list-row-icon">←</div><div class="cats-list-row-info"><div class="cats-list-row-name" style="color:var(--accent2)">${I18n.t('cats.backToContainers')}</div><div class="cats-list-row-count"></div></div></div>`:'';
  grid.innerHTML=`<div style="width:100%;padding:8px 0">`+stageHeaderHtml+backBtnHtml+cats.map(({cat,rem,dep,isContainer,prog,isCurrent})=>{
    if(isContainer){
      var stageLabel=getContainerStageLabel(cat);
      var clickHandler=containerMode==='sequential'?(isCurrent?`enterContainerCat('${cat.id}')`:''):`enterContainerCat('${cat.id}')`;
      return `<div class="cats-list-row" onclick="${clickHandler}" style="border:1px ${dep?'solid':'dashed'} ${dep?'var(--success)55':cat.color+'55'};${isCurrent?'box-shadow:0 0 12px '+cat.color+'22':''}">
        <div class="cats-list-row-icon">${dep?'✅':cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" style="width:2.2rem;height:2.2rem;border-radius:8px;object-fit:cover" alt="${_sanitizeUser(cat.name)}">`:cat.icon||'📁'}</div>
        <div class="cats-list-row-info">
          <div class="cats-list-row-name" style="color:${dep?'var(--text-muted)':cat.color}">${_sanitizeUser(stageLabel)}</div>
          <div class="cats-list-row-count">${_sanitizeUser(cat.name)} — ${dep?'اكتمل':(prog?prog.completed+'/'+prog.total:rem)+' '+I18n.t('cats.subcategories')}</div>
          ${prog?'<div style="width:100%;height:3px;background:rgba(128,128,128,.1);border-radius:2px;overflow:hidden;margin-top:3px"><div style="width:'+prog.pct+'%;height:100%;background:'+(dep?'var(--success)':cat.color)+';border-radius:2px"></div></div>':''}
        </div>
        <div class="cats-list-row-pts"><div style="font-size:.65rem;color:${isCurrent?'var(--accent2)':'var(--text-muted)'}">${isCurrent?'▶ حالي':dep?'✓':'📁'}</div></div>
      </div>`;
    }
    return `<div class="cats-list-row${dep?' depleted':''}" onclick="${dep?'':'selectCatAndStart(\''+cat.id+'\')' }" style="${dep?'opacity:.45;cursor:default':''}">
      <div class="cats-list-row-icon">${dep?'✅':cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" style="width:2.2rem;height:2.2rem;border-radius:8px;object-fit:cover" alt="${_sanitizeUser(cat.name)}">`:cat.icon||'📂'}</div>
      <div class="cats-list-row-info">
        <div class="cats-list-row-name" style="color:${cat.color}">${_sanitizeUser(cat.name)}</div>
        <div class="cats-list-row-count">${dep?'اكتملت الأسئلة':rem+' سؤال متبقٍّ من '+cat.questions.length}</div>
      </div>
      <div class="cats-list-row-pts">
        ${dep?'<span style="color:var(--success);font-size:1.4rem">✅</span>':`<div class="cats-list-row-pts-num">${cat.points||1}×</div><div style="font-size:.65rem;color:var(--text-muted)">نقطة</div>`}
      </div>
    </div>`;
  }).join('')+'</div>';

  // Sequential auto-advance check
  if(state._activeContainerId&&containerMode==='sequential'&&state.settings.containerAutoAdvance!==false&&!state._advancingContainer){
    var currentProg=getContainerProgress(state._activeContainerId);
    if(currentProg.pct>=100&&currentProg.total>0){
      var nextSeqInfo=getCurrentSequentialContainer();
      if(nextSeqInfo&&nextSeqInfo.container.id!==state._activeContainerId){
        state._advancingContainer=true;
        setTimeout(function(){_advanceToNextContainer();state._advancingContainer=false;},1200);
      }
    }
  }
}
function renderCatsList(){
  const grid=document.getElementById('cats-pres-grid');
  grid.className='';grid.style.display='flex';grid.style.flexDirection='column';grid.style.alignItems='center';
  grid.innerHTML='<div class="cats-list-mode" style="width:100%;max-width:720px">'+state.categories.filter(c=>c.type!=='tiebreaker').map(cat=>{
    const used=state.usedQuestions[cat.id]||new Set();
    const rem=cat.questions.length-used.size;
    const dep=rem===0;
    const total=cat.questions.length;
    const usedPct=total>0?Math.round((total-rem)/total*100):100;
    return `<div class="cat-list-item${dep?' depleted':''}"
      style="border-color:${dep?'var(--border)':cat.color+'55'}"
      onclick="${dep?'':` selectCatAndStart('${cat.id}')`}">
      <div class="cat-list-item" style="position:absolute;right:0;top:0;bottom:0;width:5px;background:${cat.color};border-radius:0 18px 18px 0;display:block"></div>
      <div class="cat-list-icon">${dep?'✅':cat.icon||'📂'}</div>
      <div class="cat-list-body">
        <div class="cat-list-name" style="color:${dep?'var(--text-muted)':cat.color}">${_sanitizeUser(cat.name)}</div>
        <div class="cat-list-meta">
          <span>📋 ${total} سؤال</span>
          <span style="color:${dep?'var(--danger)':'var(--success)'}">
            ${dep?'✅ اكتمل':'⬤ '+rem+' متبقٍّ'}
          </span>
        </div>
        <div class="cat-list-progress">
          <div class="cat-list-progress-fill" style="width:${usedPct}%;background:${dep?'var(--success)':cat.color}"></div>
        </div>
      </div>
      ${dep?'':'<div class="cat-list-arrow">←</div>'}
    </div>`;
  }).join('')+'</div>';
}

// ─── MODE 3: HIDDEN / MYSTERY FLIP CARDS ─────────────────────────
function renderCatsHidden(){
  const grid=document.getElementById('cats-pres-grid');
  grid.className='';grid.style.display='block';grid.style.width='100%';
  // Shuffle categories display order every time we render in hidden mode
  // (called after each question, so positions appear random)
  // Filter out tiebreaker categories — they only appear in tiebreaker round
  const regularCats=state.categories.filter(c=>c.type!=='tiebreaker');
  state._hiddenCatOrder=[...regularCats.map(c=>c.id)].sort(()=>Math.random()-.5);
  const orderedCats=state._hiddenCatOrder.map(id=>state.categories.find(c=>c.id===id)).filter(Boolean);
  const activeCats=regularCats.filter(c=>{
    const used=state.usedQuestions[c.id]||new Set();
    return c.questions.length>used.size;
  });
  grid.innerHTML=`<div class="cats-hidden-grid">` + orderedCats.map(cat=>{
    const used=state.usedQuestions[cat.id]||new Set();
    const rem=cat.questions.length-used.size;
    const dep=rem===0;
    return `<div class="cat-flip-wrap${dep?' depleted':''}" id="flip-${cat.id}" onclick="flipCatCard('${cat.id}','${cat.id}')">
      <div class="cat-flip-inner">
        <div class="cat-flip-face">
          <div class="cat-flip-face-icon">❓</div>
          <div class="cat-flip-face-label">${dep?'اكتمل':'انقر للكشف'}</div>
        </div>
        <div class="cat-flip-back" style="border-color:${cat.color};box-shadow:0 8px 32px ${cat.color}44">
          <div class="cat-flip-back-icon">${dep?'✅':cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" style="width:52px;height:52px;border-radius:8px;object-fit:cover" alt="${_sanitizeUser(cat.name)}">`:cat.icon||'📂'}</div>
          <div class="cat-flip-back-name" style="color:${cat.color}">${_sanitizeUser(cat.name)}</div>
          <div class="cat-flip-back-count">${dep?'اكتمل':rem+' / '+cat.questions.length+' سؤال'}</div>
          ${dep?'':`<div class="cat-flip-back-click" style="color:${cat.color}88">انقر مجدداً للبدء ▶</div>`}
        </div>
      </div>
    </div>`;
  }).join('')+'</div>';
}

let _flipReady={};
function flipCatCard(catId, divId){
  const used=state.usedQuestions[catId]||new Set();
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat)return;
  const dep=(cat.questions.length-used.size)===0;
  if(dep)return;
  const wrap=document.getElementById('flip-'+divId);
  if(!wrap)return;
  if(!wrap.classList.contains('flipped')){
    // Close any other flipped card first (one active at a time)
    document.querySelectorAll('.cat-flip-wrap.flipped').forEach(el=>{
      if(el!==wrap){el.classList.remove('flipped');const id=el.id.replace('flip-','');delete _flipReady[id];}
    });
    // First click: flip to reveal
    wrap.classList.add('flipped');
    _flipReady[catId]=true;
  } else if(_flipReady[catId]){
    // Second click: start this category
    selectCatAndStart(catId);
  }
}

// ─── MODE 4: JEOPARDY BOARD ───────────────────────────────────────
function renderCatsJeopardy(){
  const grid=document.getElementById('cats-pres-grid');
  grid.className='';grid.style.display='flex';grid.style.flexDirection='column';grid.style.alignItems='center';
  // Point tiers and difficulty mapping
  const s_jep=state.settings;
  const _toAr=n=>{const ar=['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];return String(n).replace(/[0-9]/g,d=>ar[d]);};
  const jp1=s_jep.jepPts1||100,jp2=s_jep.jepPts2||200,jp3=s_jep.jepPts3||300,jp4=s_jep.jepPts4||400,jp5=s_jep.jepPts5||500;
  const TIERS=[
    {pts:jp1, diff:'easy',  label:_toAr(jp1), color:'var(--success)'},
    {pts:jp2, diff:'medium',label:_toAr(jp2), color:'var(--accent1)'},
    {pts:jp3, diff:'hard',  label:_toAr(jp3), color:'var(--danger)'},
    {pts:jp4, diff:'hard',  label:_toAr(jp4), color:'#a78bfa'},
    {pts:jp5, diff:'hard',  label:_toAr(jp5), color:'var(--accent2)'},
  ];
  const DIFF_COLORS={easy:'var(--success)',medium:'var(--accent1)',hard:'var(--danger)'};

  // Build per-cat per-tier availability (question index to use)
  // For jeopardy, we pre-assign question slots to tiers by difficulty
  const board=state.categories.filter(c=>c.type!=='tiebreaker').map(cat=>{
    const used=state.usedQuestions[cat.id]||new Set();
    const dep=(cat.questions.length-used.size)===0;
    const allQ=cat.questions.map((q,i)=>({q,i,used:used.has(i)}));
    // Assign: easy→tier0-1, medium→tier2-3, hard→tier4, fill others
    const byDiff={easy:[],medium:[],hard:[]};
    allQ.forEach(({q,i,used})=>{if(!used)byDiff[q.difficulty||'medium'].push(i);});
    const tierSlots=TIERS.map((tier,ti)=>{
      const pool=byDiff[tier.diff];
      if(pool.length>0){const idx=pool.shift();return{qIdx:idx,available:true};}
      // fallback: pick any available
      const anyPool=[...byDiff.easy,...byDiff.medium,...byDiff.hard];
      if(anyPool.length>0){const idx=anyPool[0];['easy','medium','hard'].forEach(d=>{byDiff[d]=byDiff[d].filter(i=>i!==idx)});return{qIdx:idx,available:true};}
      return{qIdx:-1,available:false};
    });
    return{cat,dep,tierSlots};
  });

  grid.innerHTML=`<div class="cats-jeopardy-board">`+board.map(({cat,dep,tierSlots})=>`
    <div class="jeopardy-col">
      <div class="jeopardy-cat-header" style="border-color:${cat.color}55;background:${cat.color}15">
        <div class="jeopardy-cat-header-icon">${dep?'✅':cat.catImage?`<img src="${_safeMediaSrc(cat.catImage)}" style="width:36px;height:36px;border-radius:6px;object-fit:cover" alt="${_sanitizeUser(cat.name)}">`:(cat.icon||'📂')}</div>
        <div class="jeopardy-cat-header-name" style="color:${cat.color}">${_sanitizeUser(cat.name)}</div>
      </div>
      ${TIERS.map((tier,ti)=>{
        const slot=tierSlots[ti];
        const avail=slot.available&&!dep;
        return `<div class="jeopardy-cell${avail?'':' used'}${dep?' depleted-col':''}"
          style="${avail?`border-color:${tier.color}55;box-shadow:0 2px 12px ${tier.color}22`:''}"
          onclick="${avail?`selectCatJeopardy('${cat.id}',${slot.qIdx})`:''}">
          ${avail
            ?`<div class="jeopardy-pts" style="color:${tier.color};text-shadow:0 0 18px ${tier.color}88">${tier.label}</div>
               <div class="jeopardy-diff-dot" style="background:${DIFF_COLORS[tier.diff]||tier.color}"></div>`
            :`<div class="jeopardy-used-icon">✅</div>`}
        </div>`;
      }).join('')}
    </div>`).join('')+'</div>';
}

function selectCatJeopardy(catId, qIdx){
  if(qIdx<0)return;
  state.currentCatId=catId;
  if(!state.usedQuestions[catId])state.usedQuestions[catId]=new Set();
  state.usedQuestions[catId].add(qIdx);
  state.currentQIndex=qIdx;
  // Determine jeopardy points for this slot
  const cat=state.categories.find(c=>c.id===catId);
  const q=cat&&cat.questions[qIdx];
  if(q&&state.settings.jeopardy_mode){
    // stored when rendering
  }
  state._jeopardyCurrentPts=_getJeopardyPtsForQ(catId,qIdx);
  showView('question');
  if(state.settings.jepShowPtsInQ!==false&&state._jeopardyCurrentPts){
    setTimeout(()=>{const nl=document.getElementById('q-number-label');if(nl)nl.textContent=nl.textContent+' — 🎯 '+state._jeopardyCurrentPts+' نقطة';},400);
  }
  showTurnOverlay(state.currentTeamIndex,()=>loadQuestion(catId,qIdx,state.currentTeamIndex));
}
function _getJeopardyPtsForQ(catId,qIdx){
  if(state.settings.catDisplayMode!=='jeopardy')return 0;
  const cat=state.categories.find(c=>c.id===catId);if(!cat)return 0;
  const q=cat.questions[qIdx];if(!q)return 0;
  const jp1=state.settings.jepPts1||100,jp2=state.settings.jepPts2||200,jp3=state.settings.jepPts3||300,jp4=state.settings.jepPts4||400,jp5=state.settings.jepPts5||500;
  const diffMap={easy:jp1,medium:jp2,hard:jp3};
  return diffMap[q.difficulty||'medium']||jp2;
}

// ─── MODE 5: FORTUNE WHEEL ────────────────────────────────────────
let _wheelSpinning=false;
let _wheelAngle=0;
let _wheelWinnerIdx=-1;
let _wheelAnimId=null;
let _wheelCats=[];

function renderCatsWheel(){
  const grid=document.getElementById('cats-pres-grid');
  grid.className='';
  // Collect non-depleted categories
  // Reset recently used if all cats used
  if(!state._wheelRecentlyUsed)state._wheelRecentlyUsed=[];
  _wheelCats=state.categories.filter(cat=>{
    if(cat.type==='tiebreaker')return false;
    const used=state.usedQuestions[cat.id]||new Set();
    return cat.questions.length>used.size;
  });
  if(!_wheelCats.length){
    grid.innerHTML='<div class="empty-state"><div class="empty-icon">🎡</div><p>'+I18n.t('empty.noTeams')+'</p></div>';
    return;
  }
  _wheelWinnerIdx=-1;
  _wheelSpinning=false;
  grid.innerHTML=`
    <div class="cats-wheel-wrap">
      <div class="cats-wheel-stage">
        <div class="wheel-pointer">▼</div>
        <canvas id="cats-wheel-canvas" width="500" height="500"></canvas>
        <button class="wheel-center-btn" id="wheel-spin-btn" onclick="spinWheel()">دوِّر!</button>
      </div>
      <div id="wheel-result-panel" style="display:none"></div>
    </div>`;
  drawWheel(_wheelAngle);
}

function drawWheel(rotAngle){
  const canvas=document.getElementById('cats-wheel-canvas');
  if(!canvas)return;
  // High-DPI canvas support
  const dpr=window.devicePixelRatio||1;
  const displayW=canvas.clientWidth||500;
  const displayH=canvas.clientHeight||500;
  if(canvas.width!==Math.round(displayW*dpr)||canvas.height!==Math.round(displayH*dpr)){
    canvas.width=Math.round(displayW*dpr);
    canvas.height=Math.round(displayH*dpr);
  }
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const W=displayW,H=displayH;
  const cx=W/2,cy=H/2,R=W/2-8;
  ctx.clearRect(0,0,W,H);
  const n=_wheelCats.length;
  const sliceAngle=(2*Math.PI)/n;

  // Draw slices
  _wheelCats.forEach((cat,i)=>{
    const startA=rotAngle+i*sliceAngle-Math.PI/2;
    const endA=startA+sliceAngle;
    const isWinner=(i===_wheelWinnerIdx);

    // Slice fill
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,R,startA,endA);
    ctx.closePath();
    ctx.fillStyle=cat.color+(isWinner?'ff':'bb');
    ctx.fill();
    // Slice border
    ctx.strokeStyle='rgba(0,0,0,.25)';
    ctx.lineWidth=2;
    ctx.stroke();
    // Winner glow ring
    if(isWinner){
      ctx.beginPath();
      ctx.arc(cx,cy,R+4,startA,endA);
      ctx.strokeStyle=cat.color;
      ctx.lineWidth=6;
      ctx.stroke();
    }

    // Icon + text on slice
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(startA+sliceAngle/2);
    const mid=R*0.62;
    // Icon emoji
    ctx.font=`${Math.max(18,Math.min(32,180/n))}px serif`;
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle='rgba(255,255,255,.95)';
    ctx.shadowColor='rgba(0,0,0,.7)';
    ctx.shadowBlur=6;
    // Draw icon or fallback text for wheel
    ctx.fillText(cat.catImage?'🖼':cat.icon||'📂',mid,0);
    // Name text
    const fs=Math.max(10,Math.min(14,130/n));
    ctx.font=`bold ${fs}px Cairo, sans-serif`;
    ctx.fillStyle='#ffffff';
    ctx.shadowBlur=4;
    const label=cat.name.length>10?cat.name.slice(0,9)+'…':cat.name;
    ctx.fillText(label,mid,fs+4);
    ctx.restore();
  });

  // Pointer triangle at top
  ctx.save();
  ctx.fillStyle='#fff';
  ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=10;
  ctx.beginPath();
  ctx.moveTo(cx,cy-R-4);
  ctx.lineTo(cx-12,cy-R+18);
  ctx.lineTo(cx+12,cy-R+18);
  ctx.closePath();ctx.fill();
  ctx.restore();
  // Center circle
  ctx.beginPath();
  ctx.arc(cx,cy,R*0.16,0,2*Math.PI);
  ctx.fillStyle='var(--bg-deep)'||'#02040f';
  ctx.fill();
  ctx.strokeStyle='var(--border)'||'#162040';
  ctx.lineWidth=3;
  ctx.stroke();
}

function spinWheel(){
  if(_wheelSpinning)return;
  if(!_wheelCats.length)return;
  _wheelSpinning=true;
  _wheelWinnerIdx=-1;
  document.getElementById('wheel-spin-btn').disabled=true;
  document.getElementById('wheel-result-panel').style.display='none';
  // V7 T-6.2: snapshot + stop BGM (so it resumes correctly after)
  try{BgmResumeTracker.snapshot();stopMusic();}catch(e){ErrorBus.capture(e,'spinWheel:bgm');}
  // V7 T-6.1: start custom wheel music if available
  try{
    if(state.settings.wheelMusicData){
      AudioMixer.play('wheel',{src:state.settings.wheelMusicData,loop:true,volume:(state.settings.wheelMusicVol||50)/100});
    }
  }catch(e){ErrorBus.capture(e,'spinWheel:wheelMusic');}

  // Decide winner — avoid recently used categories
  const allIdxs=_wheelCats.map((_,i)=>i);
  const nonRecent=allIdxs.filter(i=>!state._wheelRecentlyUsed.includes(_wheelCats[i].id));
  const pickPool=nonRecent.length?nonRecent:allIdxs;
  const winIdx=pickPool[Math.floor(Math.random()*pickPool.length)];
  // Track recently used (keep last N-1)
  state._wheelRecentlyUsed.push(_wheelCats[winIdx].id);
  if(state._wheelRecentlyUsed.length>=_wheelCats.length)state._wheelRecentlyUsed=[];
  const n=_wheelCats.length;
  const sliceAngle=(2*Math.PI)/n;

  // How many full rotations + land on winner
  const extraSpins=(6+Math.floor(Math.random()*5))*2*Math.PI;
  // The wheel draws starting from _wheelAngle, each slice i occupies [i*sliceAngle, (i+1)*sliceAngle]
  // The pointer is at the TOP of the canvas (canvas center pointing up).
  // When the wheel has rotated by angle R, the slice at angular position (offset from 0) that ends up at top
  // satisfies: (offset + R) mod 2PI ≈ 3PI/2  (because canvas draws from 3PI/2 = "12 o'clock" equivalent)
  // Actually drawWheel starts slices from (i*sliceAngle + _wheelAngle - PI/2) in canvas arc calls
  // So winner center at top: winIdx*sliceAngle + finalAngle - PI/2 ≡ -PI/2 (mod 2PI)
  // => finalAngle ≡ -winIdx*sliceAngle (mod 2PI)
  const winCenterOffset = winIdx * sliceAngle + sliceAngle/2;
  const targetBase = -winCenterOffset;
  const targetRot = (targetBase%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  const currentNorm=(_wheelAngle%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
  let delta=targetRot-currentNorm;
  if(delta<=0)delta+=2*Math.PI;
  const totalRot=extraSpins+delta;
  const finalAngle=_wheelAngle+totalRot;

  const duration=4200+Math.random()*800;
  const startAngle=_wheelAngle;
  const startTime=performance.now();

  function easeOut(t){
    // Cubic ease-out
    return 1-Math.pow(1-t,3);
  }

  function frame(now){
    const elapsed=now-startTime;
    const t=Math.min(1,elapsed/duration);
    const eased=easeOut(t);
    _wheelAngle=startAngle+(finalAngle-startAngle)*eased;
    drawWheel(_wheelAngle);
    if(t<1){
      _wheelAnimId=requestAnimationFrame(frame);
    }else{
      _wheelSpinning=false;
      _wheelAngle=finalAngle;
      _wheelWinnerIdx=winIdx;
      drawWheel(_wheelAngle);
      // V7 T-6.2: stop wheel music (AudioMixer routes it correctly)
      try{AudioMixer.stop('wheel');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_98")}catch(_){}}
      playSound('correct');
      showWheelResult(_wheelCats[winIdx]);
      // V7 T-6.2.b: BGM resume scheduled after result is shown briefly
      TimerRegistry.setTimeout(function(){try{BgmResumeTracker.restore();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_99")}catch(_){}}},1500,'wheel:bgm-resume');
    }
  }
  _wheelAnimId=requestAnimationFrame(frame);
}

function showWheelResult(cat){
  const panel=document.getElementById('wheel-result-panel');
  if(!panel)return;
  const used=state.usedQuestions[cat.id]||new Set();
  const rem=cat.questions.length-used.size;
  panel.style.display='block';
  panel.innerHTML=`
    <div class="wheel-result-panel wheel-winner-flash" style="border-color:${cat.color}">
      <div class="wheel-result-icon">${cat.icon||'🎯'}</div>
      <div class="wheel-result-name" style="color:${cat.color}">${_sanitizeUser(cat.name)}</div>
      <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:14px">${rem} سؤال متبقٍّ</div>
      <div class="wheel-result-btns">
        <button class="btn btn-primary" onclick="selectCatAndStart('${cat.id}')">▶ ابدأ الآن</button>
        <button class="btn btn-ghost" onclick="try{AudioMixer.stop('wheel');}catch(_){}spinWheel();document.getElementById('wheel-result-panel').style.display='none';document.getElementById('wheel-spin-btn').disabled=false;">🔄 دوِّر مجدداً</button>
      </div>
    </div>`;
  // Re-enable spin btn (for re-spin via button)
  const btn=document.getElementById('wheel-spin-btn');
  if(btn)btn.disabled=false;
}

// ════════════════════════════════════════════════════════
//  COMPETITION START
// ═══════════════════════════════════════════════════════
function startCompetition(){
  if(!getPlayableCats({withQuestions:true}).length){toast(I18n.t('toast.addCategoriesFirst'),'danger');return}
  // Check for saved progress
  const prog=loadGameProgress();
  if(prog && prog.compName===state.settings.name){
    const d=new Date(prog.savedAt);
    document.getElementById('resume-info-text').textContent=
      `تم العثور على مسابقة "${prog.compName}" محفوظة — ${d.toLocaleDateString('ar')} ${d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})}`;
    openModal('modal-resume');
    return;
  }
  newCompetition();
}

function resumeCompetition(){
  closeModal('modal-resume');
  const prog=loadGameProgress();
  if(!prog){newCompetition();return}
  // Restore progress
  state.usedQuestions={};
  Object.entries(prog.usedQuestions||{}).forEach(([k,v])=>{state.usedQuestions[k]=new Set(Array.isArray(v)?v:[])});
  state.teamLifelines=prog.teamLifelines||{};
  state.currentTeamIndex=prog.currentTeamIndex||0;
  state.fullCatQueue=prog.fullCatQueue||[];
  state.fullCatQueuePos=prog.fullCatQueuePos||0;
  state.currentCatId=prog.currentCatId||null;
  // Restore session stats and streaks
  if(prog.sessionStats)state.sessionStats=prog.sessionStats;
  if(prog.teamStreaks)state.teamStreaks=prog.teamStreaks;
  state.gameActive=true;
  requestFullscreenSafe();
  _pushRemoteState();
  // V15-fix: Force push state again after a short delay to ensure audience screen receives it
  setTimeout(function(){_pushRemoteState();},300);
  setTimeout(function(){_pushRemoteState();},1000);
  toast(I18n.t('toast.competitionResumed'),'success');
  showView('categories');
}

function newCompetition(){
  _earlyWinnerShown=false;
  closeModal('modal-resume');
  clearGameProgress();
  if(!getPlayableCats({withQuestions:true}).length){toast(I18n.t('toast.addCategoriesFirst'),'danger');return}
  // Reset game state
  state.usedQuestions={};
  state.currentTeamIndex=0;
  state.fullCatQueue=[];
  state.fullCatQueuePos=0;
  state.currentCatId=null;
  state.answered=false;
  state.pendingAnswer=-1;
  state._lastSelectedAnswer=-1;
  // V12: Reset container category navigation
  state._activeContainerId=null;
  state._prevCatDisplayMode=null;
  state._advancingContainer=false;
  // Reset V5 state
  state.teamStreaks={};
  state.scoreHistory=[];
  state.buzzerWinner=null;
  state.qFilterMode='all';
  state.qSearchTerm='';
  // Init used questions for every category
  state.categories.forEach(c=>state.usedQuestions[c.id]=new Set());
  // Reset lifelines
  state.teamLifelines={};
  // Reset scores if option enabled
  if(state.settings.resetScoresOnNew!==false){
    state.teams.forEach(t=>{ t.score=0; });
    saveState();
  }
  initSessionStats();  // resets sessionStats, streaks, scoreHistory, updateUndoBtn
  state.teams.forEach(t=>{
    state.teamLifelines[t.id]={
      fifty:state.settings.llFifty??1,
      time:state.settings.llTime??1,
      skip:state.settings.llSkip??1,
    };
    state.teamStreaks[t.id]=0;
  });
  state.gameActive=true;
  requestFullscreenSafe();
  updateUndoBtn();
  _pushRemoteState();
  // V15-fix: Force push state again after a short delay to ensure audience screen receives it
  setTimeout(function(){_pushRemoteState();},300);
  setTimeout(function(){_pushRemoteState();},1000);

  // Check presentation mode
  if(state.settings.presentationMode==='sequence'||state.settings.presentationMode==='manual'){
    startPresentationSequence();
  }else{
    showView('categories');
  }
}

// ══════════════════════════════════════════════════════════════
// SOLO GAME MODE — Candy Crush-style level system
// ══════════════════════════════════════════════════════════════

let _soloCurrentCat=null;
let _soloCurrentQIdx=0;
let _soloTimerStart=0;
let _soloAnswered=false;
let _soloTimerInterval=null;
let _soloSelectedAnswer=null;  // Currently selected answer (for confirm button)
let _soloAudioEl=null;         // Solo audio element for question sounds
let _soloTimedOut=false;       // Track if time expired
let _soloPrevLockedWorlds=null; // Track previously locked worlds for unlock animation
let _soloTransitioning=false; // Guard against rapid clicks on next level

// Question types that are NOT suitable for solo mode (no button-based answer possible)
const SOLO_UNSUPPORTED_TYPES=['quran','match','order','fitb'];

// ════════════════════════════════════════════════════════
//  ACHIEVEMENT SYSTEM
// ════════════════════════════════════════════════════════
// ACHIEVEMENTS array is defined later (V15) — this section only has helper functions

// OLD achievement system removed — unified to NEW system (state.soloProgress.achievements)
// Kept for backward compat: migrate old localStorage data on first load
(function _migrateOldAchievements(){
  try{
    var old=localStorage.getItem('quiz_achievements');
    if(old){
      var oldData=JSON.parse(old);
      if(Object.keys(oldData).length>0&&state.soloProgress){
        _initAchievementTracking();
        var newAch=state.soloProgress.achievements||{};
        var migrated=0;
        Object.keys(oldData).forEach(function(key){
          if(!newAch[key]){newAch[key]=oldData[key];migrated++;}
        });
        if(migrated>0){
          state.soloProgress.achievements=newAch;
          _saveSoloProgress();
        }
        localStorage.removeItem('quiz_achievements');
      }
    }
  }catch(e){}
})();

// Helper: Generate a stable progress key using the question's unique ID
// Falls back to index-based key for questions without an ID (backward compatibility)
function _soloLevelKey(catId,question,fallBackIdx){
  if(question&&question.id) return catId+'_'+question.id;
  // Fallback: use index for old questions without IDs
  return catId+'_'+(fallBackIdx!==undefined?fallBackIdx:0);
}

// Migration: Convert old index-based progress keys to ID-based keys
// This should run once when initSoloProgress is first called
var _soloProgressMigrated=false;
function _migrateSoloProgressKeys(){
  if(_soloProgressMigrated) return;
  _soloProgressMigrated=true;
  if(!state.soloProgress||!state.soloProgress.levels) return;
  const oldLevels=state.soloProgress.levels;
  const newLevels={};
  let migrated=0;
  (state.categories||[]).forEach(cat=>{
    if(cat.type==='tiebreaker') return;
    (cat.questions||[]).forEach((q,i)=>{
      if(SOLO_UNSUPPORTED_TYPES.includes(q.type)) return;
      const oldKey=cat.id+'_'+i;
      const newKey=_soloLevelKey(cat.id,q,i);
      // If there's old data under the index-based key, migrate it
      if(oldLevels[oldKey]&&oldKey!==newKey){
        newLevels[newKey]=oldLevels[oldKey];
        migrated++;
      }else if(oldLevels[newKey]){
        newLevels[newKey]=oldLevels[newKey];
      }
    });
  });
  if(migrated>0){
    // Also preserve any keys that don't match current categories (orphaned data)
    Object.keys(oldLevels).forEach(k=>{
      if(!newLevels[k]) newLevels[k]=oldLevels[k];
    });
    state.soloProgress.levels=newLevels;
    console.info('[SoloProgress] Migrated '+migrated+' keys from index-based to ID-based');
    try{_saveSoloProgress();}catch(e){}
  }
}

function initSoloProgress(){
  // Run key migration from index-based to ID-based (runs only once)
  _migrateSoloProgressKeys();
  // Build the correct level keys from current categories using question IDs
  // Skip unsupported question types for solo mode
  const correctLevels={};
  let totalLevels=0;
  (state.categories||[]).forEach(cat=>{
    if(cat.type==='tiebreaker') return;
    (cat.questions||[]).forEach((q,i)=>{
      // Skip unsupported question types (quran, match, order) — no button-based answer
      if(SOLO_UNSUPPORTED_TYPES.includes(q.type)) return;
      // Ensure every question has an ID
      if(!q.id) q.id='q_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
      const key=_soloLevelKey(cat.id,q,i);
      // Preserve existing progress if the level key still exists
      // Also check for old index-based key as fallback
      if(state.soloProgress?.levels?.[key]){
        correctLevels[key]=state.soloProgress.levels[key];
      }else{
        // Fallback: check old index-based key
        const oldKey=cat.id+'_'+i;
        if(state.soloProgress?.levels?.[oldKey]){
          correctLevels[key]=state.soloProgress.levels[oldKey];
        }else{
          correctLevels[key]={stars:0,completed:false,attempts:0};
        }
      }
      totalLevels++;
    });
  });
  if(!state.soloProgress){
    state.soloProgress={levels:correctLevels,totalStars:0,completedLevels:0,totalLevels,lastPlayedCat:null,lastPlayedQ:null,startTime:null};
  }else{
    // Merge: keep existing progress for keys that still exist, add new keys
    state.soloProgress.levels=correctLevels;
    state.soloProgress.totalLevels=totalLevels;
    // Ensure startTime exists
    if(!state.soloProgress.startTime) state.soloProgress.startTime=null;
  }
  // Count completed levels and stars
  let completedLevels=0, totalStars=0;
  Object.values(state.soloProgress.levels).forEach(l=>{
    if(l.completed) completedLevels++;
    totalStars+=l.stars||0;
  });
  state.soloProgress.completedLevels=completedLevels;
  state.soloProgress.totalStars=totalStars;
  // totalLevels was already set correctly during the loop above; keep that value
  // Only recalculate if it wasn't set (safety fallback)
  if(!state.soloProgress.totalLevels){
    state.soloProgress.totalLevels=Object.keys(state.soloProgress.levels).length;
  }
}

// Helper: Save solo progress with proper change detection
// Must create new object reference so AppState detects the change
function _saveSoloProgress(){
  // Force new reference so AppState._valueChanged detects the change
  state.soloProgress={...state.soloProgress,levels:{...state.soloProgress.levels}};
  AppState.set('soloProgress',state.soloProgress);
  // Also trigger immediate save to ensure persistence
  try{
    saveState();
  }catch(e){
    // Handle localStorage quota exceeded
    if(e.name==='QuotaExceededError'||e.code===22||e.code===1014){
      console.warn('[Storage] localStorage quota exceeded, attempting cleanup...');
      try{
        // Clean up old spaced repetition data
        var sr=localStorage.getItem('quiz_spaced_repetition');
        if(sr){
          var parsed=JSON.parse(sr);
          var now=Date.now();
          // Remove entries older than 30 days
          Object.keys(parsed.questionErrors||{}).forEach(function(k){
            var entry=parsed.questionErrors[k];
            if(entry&&(entry.nextReview||0)<now-30*24*60*60*1000){
              delete parsed.questionErrors[k];
            }
          });
          localStorage.setItem('quiz_spaced_repetition',JSON.stringify(parsed));
        }
        saveState();
      }catch(e2){
        console.error('[Storage] Failed to save even after cleanup:',e2);
      }
    }else{
      // Log instead of re-throwing — solo mode shouldn't crash mid-level
      console.error('[Solo] save failed (non-quota):',e);
      if(typeof toast==='function') toast('تعذّر حفظ التقدم — قد تفقد آخر تغيير','warning');
    }
  }
}

function isLevelUnlocked(catId, qIdx){
  // Get solo-supported questions for this category
  const cats=getPlayableCats({all:true});
  if(!cats.length) return false;
  const catIdx=cats.findIndex(c=>c.id===catId);
  if(catIdx<0) return false;
  // Make sure the question at qIdx is a supported type
  const q=cats[catIdx].questions?.[qIdx];
  if(q&&SOLO_UNSUPPORTED_TYPES.includes(q.type)) return false;
  // Check if the world itself is unlocked
  if(!isWorldUnlocked(catIdx)) return false;
  // Get supported questions in this world with their original indices
  const supportedWithIdx=[];
  (cats[catIdx].questions||[]).forEach((qq,idx)=>{
    if(!SOLO_UNSUPPORTED_TYPES.includes(qq.type)) supportedWithIdx.push(idx);
  });
  // Find the position of this question in the supported list
  const posInSupported=supportedWithIdx.indexOf(qIdx);
  if(posInSupported<0) return false;
  // Unlock up to SOLO_LOOK_AHEAD levels ahead of the last completed level
  const SOLO_LOOK_AHEAD=3;
  let lastCompletedPos=-1;
  for(let i=supportedWithIdx.length-1;i>=0;i--){
    const q=cats[catIdx].questions[supportedWithIdx[i]];
    const key=_soloLevelKey(catId,q,supportedWithIdx[i]);
    if(state.soloProgress.levels[key]?.completed){
      lastCompletedPos=i;
      break;
    }
  }
  // Unlock: all completed levels + SOLO_LOOK_AHEAD levels ahead
  const unlockThreshold=lastCompletedPos+SOLO_LOOK_AHEAD;
  return posInSupported<=unlockThreshold;
}

function isWorldComplete(catId){
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat) return false;
  // Only check supported question types
  const supportedQs=(cat.questions||[]).filter(q=>!SOLO_UNSUPPORTED_TYPES.includes(q.type));
  if(!supportedQs.length) return true; // No supported questions = auto-complete
  return supportedQs.every((q,i)=>{
    // Find the original index of this question
    const origIdx=cat.questions.indexOf(q);
    const key=_soloLevelKey(catId,q,origIdx);
    return state.soloProgress.levels[key]?.completed||false;
  });
}

function isWorldUnlocked(catIdx){
  const cats=getPlayableCats({all:true});
  if(catIdx===0) return true;
  if(catIdx>=cats.length) return false;
  const prevCat=cats[catIdx-1];
  // Unlock next world if at least half the supported questions in previous world are completed
  // (or if previous world has no supported questions)
  const supportedQs=(prevCat.questions||[]).filter(q=>!SOLO_UNSUPPORTED_TYPES.includes(q.type));
  if(!supportedQs.length) return true;
  const completedCount=supportedQs.filter(q=>{
    const origIdx=prevCat.questions.indexOf(q);
    const key=_soloLevelKey(prevCat.id,q,origIdx);
    return state.soloProgress.levels[key]?.completed||false;
  }).length;
  return completedCount>=Math.ceil(supportedQs.length/2);
}

function calculateStars(timeUsed, totalTime, wasCorrect){
  if(!wasCorrect) return 0;
  if(totalTime<=0) return 3;
  const ratio=timeUsed/totalTime;
  if(ratio<=0.25) return 3;
  if(ratio<=0.5) return 2;
  return 1;
}

function isSoloGameComplete(){
  if(!state.soloProgress) return false;
  return state.soloProgress.completedLevels>=state.soloProgress.totalLevels && state.soloProgress.totalLevels>0;
}

function renderSoloMap(){
  initSoloProgress();
  // Show/hide solo extra buttons based on settings
  var _showSoloReview=state.settings.showSoloReview===true;
  var _showSoloQuickSetup=state.settings.showSoloQuickSetup===true;
  var _reviewBtn=document.getElementById('solo-btn-review');
  var _quickSetupBtn=document.getElementById('solo-btn-quicksetup');
  if(_reviewBtn)_reviewBtn.style.display=_showSoloReview?'':'none';
  if(_quickSetupBtn)_quickSetupBtn.style.display=_showSoloQuickSetup?'':'none';
  // The extra buttons row is always visible (achievements & leaderboard are always shown)
  var _extraBtnsRow=document.getElementById('solo-extra-btns');
  if(_extraBtnsRow)_extraBtnsRow.style.display='flex';
  const container=document.getElementById('solo-map-body');
  if(!container) return;
  
  const cats=getPlayableCats({all:true});
  const prog=state.soloProgress;
  
  // Track which worlds are currently locked for unlock animation detection
  const nowLocked=new Set();
  cats.forEach((cat,catIdx)=>{if(!isWorldUnlocked(catIdx)) nowLocked.add(cat.id);});
  const newlyUnlocked=new Set();
  if(_soloPrevLockedWorlds){
    _soloPrevLockedWorlds.forEach(id=>{if(!nowLocked.has(id)) newlyUnlocked.add(id);});
  }
  _soloPrevLockedWorlds=nowLocked;
  
  // Update stats bar (individual elements)
  const pct=prog.totalLevels>0?Math.round(prog.completedLevels/prog.totalLevels*100):0;
  const totalStarsEl=document.getElementById('solo-map-total-stars');
  const completionEl=document.getElementById('solo-map-completion');
  const streakEl=document.getElementById('solo-map-streak');
  if(totalStarsEl) totalStarsEl.textContent=prog.totalStars+'/'+(prog.totalLevels*3);
  if(completionEl) completionEl.textContent=pct+'%';
  if(streakEl) streakEl.textContent=prog.completedLevels+'/'+prog.totalLevels;
  
  // Render worlds
  let html='';
  // Check if there are any supported questions at all (respecting difficulty filter)
  const _soloDiffFilter=_soloSettings.difficulty||'all';
  const _diffMatch=q=>_soloDiffFilter==='all'||(q.difficulty||'easy')===_soloDiffFilter;
  const hasSupportedQs=cats.some(c=>(c.questions||[]).some(q=>!SOLO_UNSUPPORTED_TYPES.includes(q.type)&&_diffMatch(q)));
  if(!hasSupportedQs||!cats.length){
    html=`<div style="text-align:center;padding:60px 20px;color:var(--text-secondary)">
      <div style="margin-bottom:12px"><svg style="width:2.5rem;height:2.5rem" viewBox="0 0 24 24" fill="var(--text-muted,#4a6080)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 014 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0120 12c0 4.42-3.58 8-8 8z"/></svg></div>
      <div style="font-size:1.1rem;font-weight:800;color:var(--text-primary);margin-bottom:6px">${I18n.t('solo.noQuestions','لا توجد أسئلة متاحة')}</div>
      <div style="font-size:.85rem">${I18n.t('solo.noQuestionsHint','أضف أسئلة من نوع اختيار متعدد أو صح/خطأ لبدء اللعب')}</div>
    </div>`;
    container.innerHTML=html;
    I18n.apply();
    return;
  }
  cats.forEach((cat,catIdx)=>{
    const unlocked=isWorldUnlocked(catIdx);
    // V11-SOLO: Collapse far-future locked worlds (>3 ahead) into a single "coming soon" card
    // to avoid an overwhelming 3000px+ scroll of `???` placeholders.
    if(!unlocked){
      // Find how many worlds are unlocked so far
      let unlockedCount=0;
      for(let i=0;i<cats.length;i++){ if(isWorldUnlocked(i)) unlockedCount++; else break; }
      const lockedAhead=catIdx-unlockedCount;  // 0=first locked, 1=second locked, ...
      if(lockedAhead>=3){
        // Skip — we'll show a single "more worlds coming" card after the loop
        return;
      }
    }
    const complete=isWorldComplete(cat.id);
    // Only count supported questions for stars (filtered by difficulty)
    const supportedQs=(cat.questions||[]).filter(q=>!SOLO_UNSUPPORTED_TYPES.includes(q.type)&&_diffMatch(q));
    const worldStars=supportedQs.reduce((s,q)=>{
      const origIdx=cat.questions.indexOf(q);
      return s+(prog.levels[_soloLevelKey(cat.id,q,origIdx)]?.stars||0);
    },0);
    const maxStars=supportedQs.length*3;
    const completedCount=supportedQs.filter(q=>{
      const origIdx=cat.questions.indexOf(q);
      return prog.levels[_soloLevelKey(cat.id,q,origIdx)]?.completed||false;
    }).length;
    const worldPct=supportedQs.length>0?Math.round(completedCount/supportedQs.length*100):0;
    
    html+=`<div class="solo-world ${unlocked?'':'solo-world-locked'} ${complete?'solo-world-complete':''} ${newlyUnlocked.has(cat.id)?'solo-world-unlocking':''}" data-cat-id="${cat.id}" style="--cat-color:${cat.color||'#00e8d0'}">`;
    html+=`<div style="position:absolute;top:0;left:0;right:0;height:3px;background:${cat.color||'#00e8d0'};border-radius:16px 16px 0 0;opacity:.7"></div>`;
    html+=`<div class="solo-world-header">`;
    html+=`<div class="solo-world-icon" style="background:${cat.color||'var(--accent)'}22;border-color:${cat.color||'var(--accent)'}">${unlocked?cat.icon:'<svg style="width:1.2rem;height:1.2rem" viewBox="0 0 24 24" fill="var(--text-muted,#4a6080)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg>'}</div>`;
    html+=`<div class="solo-world-info">`;
    html+=`<div class="solo-world-name">${unlocked?_sanitizeUser(cat.name):I18n.t('solo.lockedWorldName','???')}</div>`;
    html+=`<div class="solo-world-stars"><span class="solo-star-filled">★</span> ${worldStars}/${maxStars}${complete?' <span style="color:#00e06e;font-size:.75rem;font-weight:700">✓ '+I18n.t('solo.completed','مكتمل')+'</span>':''}</div>`;
    html+=`<div class="solo-world-progress"><div class="solo-world-progress-fill" style="width:${worldPct}%;background:${cat.color||'#00e8d0'}"></div></div>`;
    html+=`</div>`;
    if(complete) html+=`<span class="solo-world-badge"><svg style="width:1rem;height:1rem" viewBox="0 0 24 24" fill="#00e06e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg> ${worldPct}%</span>`;
    else if(!unlocked) html+=`<span class="solo-world-lock"><svg style="width:.9rem;height:.9rem" viewBox="0 0 24 24" fill="var(--text-muted,#4a6080)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg></span>`;
    html+=`</div>`;
    
    // Level path — only show supported question types
    if(unlocked){
      // Find the first unlocked & not-completed level index (the "current" one)
      let currentLevelIdx=-1;
      supportedQs.forEach((q)=>{
        if(currentLevelIdx<0){
          const origIdx=cat.questions.indexOf(q);
          const lvlKey=_soloLevelKey(cat.id,q,origIdx);
          const lvlProg=prog.levels[lvlKey];
          const lvlUnlocked=isLevelUnlocked(cat.id,origIdx);
          if(lvlUnlocked&&!lvlProg?.completed) currentLevelIdx=origIdx;
        }
      });
      html+=`<div class="solo-levels-path">`;
      let soloLevelNum=0;
      supportedQs.forEach((q)=>{
        const qIdx=cat.questions.indexOf(q);
        const lvlKey=_soloLevelKey(cat.id,q,qIdx);
        const lvlProg=prog.levels[lvlKey];
        const lvlUnlocked=isLevelUnlocked(cat.id,qIdx);
        soloLevelNum++;
        // Only the first unlocked & not-completed level gets the "current" highlight
        const isCurrent=qIdx===currentLevelIdx;
        const diff=q.difficulty||'easy';
        const diffClass=diff==='hard'?'solo-diff-hard':diff==='medium'?'solo-diff-medium':'solo-diff-easy';
        
        html+=`<div class="solo-level-node ${lvlUnlocked?'':'solo-level-locked'} ${isCurrent?'solo-level-current':''} ${lvlProg?.completed?'solo-level-done':''} ${diffClass}" 
          onclick="${lvlUnlocked?`playSoloLevel('${cat.id}',${qIdx})`:''}" data-lvl="${lvlKey}" data-difficulty="${diff}" aria-label="${I18n.t('solo.level','المرحلة')} ${soloLevelNum}${lvlUnlocked?'':', '+I18n.t('solo.locked','مقفل')}${lvlProg?.completed?', '+I18n.t('solo.completed','مكتمل'):''}">`;
        html+=`<div class="solo-node-circle ${lvlProg?.completed?'solo-node-completed':''}">`;
        if(lvlProg?.completed){
          html+=`<div class="solo-node-stars">`;
          for(let s=0;s<3;s++) html+=`<span class="${s<lvlProg.stars?'solo-node-star-filled':'solo-node-star-empty'}">★</span>`;
          html+=`</div>`;
        } else if(lvlUnlocked){
          html+=`<span class="solo-level-num">${soloLevelNum}</span>`;
        } else {
          html+=`<span class="solo-level-lock"><svg style="width:.7rem;height:.7rem" viewBox="0 0 24 24" fill="var(--text-muted,#4a6080)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/></svg></span>`;
        }
        html+=`</div>`;
        html+=`</div>`;
      });
      html+=`</div>`;
    }
    html+=`</div>`;
  });
  
  // V11-SOLO: Add a "more worlds coming" summary card if any worlds were skipped
  let _unlockedCount2=0;
  for(let i=0;i<cats.length;i++){ if(isWorldUnlocked(i)) _unlockedCount2++; else break; }
  let _skippedLocked=0;
  for(let i=_unlockedCount2+3;i<cats.length;i++){ if(!isWorldUnlocked(i)) _skippedLocked++; }
  if(_skippedLocked>0){
    html+=`<div class="solo-world solo-world-coming-soon" style="text-align:center;padding:24px 16px;opacity:.7">
      <div style="font-size:2rem;margin-bottom:8px">🔮</div>
      <div style="font-weight:800;color:var(--text-secondary);margin-bottom:4px">${_skippedLocked} ${I18n.t('solo.moreWorldsLocked','عوالم إضافية تنتظر')}</div>
      <div style="font-size:.78rem;color:var(--text-muted)">${I18n.t('solo.unlockHint','أكمل العوالم الحالية لكشف المزيد')}</div>
    </div>`;
  }
  
  container.innerHTML=html;
  
  // Animate newly unlocked levels (first unlocked & not-completed in each world)
  container.querySelectorAll('.solo-level-current').forEach(node=>{
    node.classList.add('solo-level-unlocking');
  });
  
  // Animate stats values with a bump effect
  ['solo-map-total-stars','solo-map-completion','solo-map-streak'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.classList.add('solo-stat-bump');setTimeout(()=>el.classList.remove('solo-stat-bump'),400);}
  });
  
  // Scroll to last played world
  if(prog.lastPlayedCat){
    const el=container.querySelector(`[data-cat-id="${prog.lastPlayedCat}"]`);
    if(el) el.scrollIntoView({behavior:'smooth',block:'center'});
  }
  
  // Show/hide scroll-to-top button based on scroll position
  var mapBody=document.getElementById('solo-map-body');
  var scrollTopBtn=document.getElementById('solo-scroll-top');
  if(mapBody&&scrollTopBtn){
    mapBody.onscroll=function(){
      scrollTopBtn.classList.toggle('visible',mapBody.scrollTop>300);
    };
  }
  
  I18n.apply();
}


/* ══ Solo Streak System ══ */
var _soloStreak=0;
var _soloMaxStreak=0;
var _soloStreakAnswered=0;
var _soloCorrect=0;
function soloStreakUpdate(correct){
  _soloStreakAnswered++;
  if(correct){
    _soloStreak++;
    _soloCorrect++;
    if(_soloStreak>_soloMaxStreak)_soloMaxStreak=_soloStreak;
  }else{
    _soloStreak=0;
  }
  var streakEl=document.getElementById('solo-streak');
  var countEl=document.getElementById('solo-streak-count');
  if(streakEl&&countEl){
    if(_soloStreak>=2){
      streakEl.style.display='flex';
      countEl.textContent=_soloStreak;
      streakEl.style.animation='none';
      streakEl.offsetHeight; // reflow
      streakEl.style.animation='streak-pulse 0.4s var(--ease-bounce)';
    }else{
      streakEl.style.display='none';
    }
  }
  // Update overall progress
  soloUpdateProgress();
}
function soloStreakReset(){
  _soloStreak=0;_soloMaxStreak=0;_soloStreakAnswered=0;_soloCorrect=0;
  var streakEl=document.getElementById('solo-streak');
  if(streakEl)streakEl.style.display='none';
  soloUpdateProgress();
}
function soloUpdateProgress(){
  try{
    // Use state.soloProgress.levels as the source of truth (not c._completed)
    var total=0,completed=0;
    if(state&&state.soloProgress&&state.soloProgress.levels){
      Object.values(state.soloProgress.levels).forEach(function(l){
        total++;
        if(l.completed)completed++;
      });
    }
    var pct=total>0?Math.round((completed/total)*100):0;
    var bar=document.getElementById('solo-progress-bar');
    var txt=document.getElementById('solo-progress-text');
    if(bar)bar.style.width=pct+'%';
    if(txt)txt.textContent=pct+'%';
  }catch(e){}
}

function startSoloGame(){
  initSoloProgress();
  // Record start time if this is a fresh game
  if(!state.soloProgress.startTime){
    state.soloProgress.startTime=Date.now();
  }
  _saveSoloProgress();
  // V14.4: Clear stale team-mode aria-live announcements when entering solo mode
  try{
    var ariaScoreEl=document.getElementById('aria-score-updates');
    if(ariaScoreEl)ariaScoreEl.textContent='';
  }catch(e){}
  showView('solo-map');
}

function playSoloLevel(catId, qIdx){
  _soloCurrentCat=catId;
  _soloCurrentQIdx=qIdx;
  _soloAnswered=false; _soloTransitioning=false;
  
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat||!cat.questions[qIdx]) return;
  const q=cat.questions[qIdx];
  
  // Save last played
  state.soloProgress.lastPlayedCat=catId;
  state.soloProgress.lastPlayedQ=qIdx;
  _saveSoloProgress();
  
  // Show solo question UI
  renderSoloQuestion(cat, q, qIdx);
  showView('solo-question');
}

function renderSoloQuestion(cat, q, qIdx){
  // Stop any previously playing audio
  if(_soloAudioEl){try{_soloAudioEl.pause();_soloAudioEl.currentTime=0;_soloAudioEl=null;}catch(e){}}
  // Update top bar
  const catIconEl=document.getElementById('solo-q-cat-icon');
  if(catIconEl) catIconEl.textContent=cat.icon||'📚';
  const catNameEl=document.getElementById('solo-q-cat-name');
  if(catNameEl) catNameEl.textContent=cat.name;
  // Count only supported questions for level progress
  const supportedQs=(cat.questions||[]).filter(qq=>!SOLO_UNSUPPORTED_TYPES.includes(qq.type));
  const supportedIdx=supportedQs.findIndex(qq=>cat.questions.indexOf(qq)===qIdx);
  const totalSupported=supportedQs.length;
  document.getElementById('solo-q-level').textContent=I18n.t('solo.levelOf','المرحلة {n}/{t}').replace('{n}',supportedIdx+1).replace('{t}',totalSupported);
  
  // V15: Update mini progress bar
  try{
    var _miniFill=document.getElementById('solo-q-mini-progress-fill');
    if(_miniFill&&totalSupported>0){
      _miniFill.style.width=((supportedIdx+1)/totalSupported*100)+'%';
    }
  }catch(e){}

  // Show difficulty badge
  const diffEl=document.getElementById('solo-q-difficulty');
  if(diffEl){
    const diff=q.difficulty||'easy';
    const diffKey='solo.difficulty.'+diff;
    diffEl.textContent=I18n.t(diffKey,diff);
    diffEl.className='solo-q-difficulty solo-diff-badge-'+diff;
  }
  
  // Show stars earned for this level (if replaying)
  const lvlKey=_soloLevelKey(_soloCurrentCat,q,qIdx);
  const existing=state.soloProgress.levels[lvlKey];
  const starContainer=document.getElementById('solo-q-stars');
  if(starContainer){
    let sh='';
    for(let i=0;i<3;i++) sh+=`<span class="${existing&&i<existing.stars?'solo-q-star-filled':'solo-q-star-empty'}">★</span>`;
    starContainer.innerHTML=sh;
  }
  
  // Timer setup
  const timerSec=q.time||state.settings.defaultTime||30;
  _soloTimerStart=Date.now();
  
  // Media area — handle image/audio/video types
  const mediaEl=document.getElementById('solo-q-media');
  if(mediaEl){
    mediaEl.style.display='none';
    mediaEl.innerHTML='';
    // Sanitize media URLs — only allow safe protocols
    const _safeMediaSrc=function(src){
      if(!src)return '';
      if(/^(data:image\/|data:audio\/|data:video\/|blob:|https?:\/\/)/i.test(src))return src;
      return '';
    };
    if(q.type==='image'&&q.mediaData){
      const safeSrc=_safeMediaSrc(q.mediaData);
      if(safeSrc){
        mediaEl.innerHTML=`<img src="${safeSrc}" style="max-width:100%;max-height:280px;border-radius:12px;object-fit:contain;border:1px solid var(--border)" alt="">`;
        mediaEl.style.display='block';
      }
    }else if(q.type==='audio'&&q.mediaData){
      const safeSrc=_safeMediaSrc(q.mediaData);
      if(safeSrc){
        const audioId='solo-audio-'+Date.now();
        mediaEl.innerHTML=`<button class="solo-btn solo-btn-ghost" id="${audioId}" style="font-size:1rem">▶ ${I18n.t('question.playAudio')||'تشغيل المقطع'}</button>`;
        mediaEl.style.display='block';
        // Set up audio playback via event listener (safer than inline onclick)
        const audioBtn=document.getElementById(audioId);
        if(audioBtn){
          let playing=false;
          audioBtn.addEventListener('click',function(){
            if(!playing){
              _soloAudioEl=new Audio(safeSrc);
              _soloAudioEl.play().catch(()=>{});
              playing=true;
              audioBtn.textContent='⏸ '+(I18n.t('question.pauseAudio')||'إيقاف');
              _soloAudioEl.onended=()=>{playing=false;audioBtn.textContent='▶ '+(I18n.t('question.playAudio')||'تشغيل');};
            }else{
              if(_soloAudioEl)_soloAudioEl.pause();
              playing=false;
              audioBtn.textContent='▶ '+(I18n.t('question.playAudio')||'تشغيل');
            }
          });
        }
      }
    }else if(q.type==='video'&&(q.mediaData||q.videoRef)){
      if(q.mediaData){
        const safeSrc=_safeMediaSrc(q.mediaData);
        if(safeSrc){
          mediaEl.innerHTML=`<video src="${safeSrc}" controls playsinline style="max-width:100%;max-height:280px;border-radius:12px;background:#000"></video>`;
          mediaEl.style.display='block';
        }
      }
      // videoRef (IndexedDB) — attempt async load
      if(q.videoRef&&typeof MediaDB!=='undefined'){
        try{MediaDB.get(q.videoRef).then(d=>{if(d?.data){const safeD=_safeMediaSrc(d.data);if(safeD){mediaEl.innerHTML=`<video src="${safeD}" controls playsinline style="max-width:100%;max-height:280px;border-radius:12px;background:#000"></video>`;mediaEl.style.display='block';}}}).catch((e)=>{_logErr(e,'MediaDB:getVideoRef')});}catch(e){console.error("[Error]",e);}
      }
    }
  }
  
  // Question text — handle math and quran types
  const textEl=document.getElementById('solo-q-text');
  if(q.type==='quran'){
    textEl.textContent=q.text;
    textEl.style.fontFamily="'Amiri',serif";
    textEl.style.fontSize='clamp(1.3rem,4vw,2.2rem)';
    textEl.style.lineHeight='2';
  }else if(q.type==='math'){
    textEl.textContent=q.text;
    textEl.style.fontFamily='inherit';
    // KaTeX auto-render will be triggered below
  }else{
    textEl.textContent=q.text;
    textEl.style.fontFamily='inherit';
    textEl.style.fontSize='';
    textEl.style.lineHeight='';
  }
  
  // Reset selected answer
  _soloSelectedAnswer=null;
  _soloAnswered=false;
  _soloTimedOut=false;
  const confirmBtn=document.getElementById('solo-confirm-btn');
  if(confirmBtn) confirmBtn.classList.remove('solo-confirm-active');
  // Show/hide confirm area based on question type
  const confirmArea=document.getElementById('solo-q-confirm');
  var skipArea=document.getElementById('solo-q-skip');
  if(skipArea) skipArea.style.display='flex';
  
  // Options — handle each question type
  const optsEl=document.getElementById('solo-q-options');
  if(q.type==='tf'){
    // True/False: select then confirm
    optsEl.innerHTML=`
      <button class="solo-q-option solo-q-tf-true" onclick="soloSelectOption(this,true)" data-idx="true" aria-label="${typeof I18n!=='undefined'?I18n.t('question.true','صحيح'):'صحيح'}"><span class="solo-tf-icon">✓</span><span>${I18n.t('question.true')}</span></button>
      <button class="solo-q-option solo-q-tf-false" onclick="soloSelectOption(this,false)" data-idx="false" aria-label="${typeof I18n!=='undefined'?I18n.t('question.false','خطأ'):'خطأ'}"><span class="solo-tf-icon">✕</span><span>${I18n.t('question.false')}</span></button>`;
    if(confirmArea) confirmArea.style.display='flex';
  }else if(SOLO_UNSUPPORTED_TYPES.includes(q.type)){
    // Unsupported type — should have been filtered, fallback: return to map
    backToSoloMap();
    return;
  }else{
    // Default MCQ: select then confirm
    let oh='';
    const LETTERS_AR='أبجدهوزحطيكلمنسعفصقرشتثخذضظغ';
    const LETTERS_EN='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const isAr=I18n.getCurrentLang()!=='en';
    const letters=isAr?LETTERS_AR:LETTERS_EN;
    (q.options||[]).forEach((opt,i)=>{
      const letter=letters[i]||String(i+1);
      const optText=typeof opt==='object'?opt.text:opt;
      const optImg=q.optionImages&&q.optionImages[i]?`<img src="${_safeMediaSrc(q.optionImages[i])}" style="width:40px;height:40px;border-radius:6px;object-fit:cover;flex-shrink:0" alt="${typeof I18n!=='undefined'?I18n.t('question.option','خيار')+' '+(i+1):'خيار '+(i+1)}">`:'';
      oh+=`<button class="solo-q-option" onclick="soloSelectOption(this,${i})" data-idx="${i}" aria-label="${typeof I18n!=='undefined'?I18n.t('question.option','خيار')+' '+(i+1):'خيار '+(i+1)}"><span class="solo-q-option-letter">${letter}</span>${optImg}<span>${_sanitizeUser(optText)}</span></button>`;
    });
    optsEl.innerHTML=oh;
    if(confirmArea) confirmArea.style.display='flex';
  }
  
  // Math rendering with KaTeX
  if(q.type==='math'&&window.renderMathInElement){
    try{renderMathInElement(textEl,{delimiters:[{left:'$$',right:'$$',display:true},{left:'$',right:'',display:false}]});}catch(e){console.error("[Error]",e);}
  }
  
  // Start timer (respect soloTimerEnabled setting)
  if(state.settings.soloTimerEnabled!==false){startSoloTimer(timerSec);}
  
  // Hide stars overlay
  const starsOverlay=document.getElementById('solo-stars-overlay');
  if(starsOverlay) starsOverlay.classList.remove('solo-overlay-visible');
}
