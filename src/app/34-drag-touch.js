// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
//  CATEGORY DRAG REORDER (admin panel)
// ════════════════════════════════════════════════════════
// V7: Native DnD replaced by SortableJS (see initCategoriesSortable below).
// These stubs remain for any inline HTML attributes still referencing them.
function onCatDragStart(e){if(e&&e.preventDefault)e.preventDefault();}
function onCatDragOver(e){if(e&&e.preventDefault)e.preventDefault();}
function onCatDrop(e){if(e&&e.preventDefault)e.preventDefault();}
function onCatDragEnd(){}
function initCategoriesSortable(container){
  if(!container)return;
  initSortable(container,{
    handle:'[data-catid]',
    draggable:'[data-catid]',
    onEnd:function(evt){
      if(evt.oldIndex===evt.newIndex)return;
      const [moved]=state.categories.splice(evt.oldIndex,1);
      state.categories.splice(evt.newIndex,0,moved);
      saveState();
      renderCategoriesAdmin();
      Store.dispatch('CATEGORIES_REORDERED',{from:evt.oldIndex,to:evt.newIndex});
      if(typeof toast==='function')toast(I18n.t('toast.categoriesReordered'),'success');
    }
  });
}

// ════════════════════════════════════════════════════════
//  CAT IMAGE + TEAM IMAGE HELPERS
// ════════════════════════════════════════════════════════
function loadCatImage(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    window._catImageTemp=e.target.result;
    _showCatImagePreview(e.target.result);
    const nm=document.getElementById('cat-image-name');
    if(nm)nm.textContent=f.name.slice(0,24);
  };
  reader.readAsDataURL(f);
}
function _showCatImagePreview(src){
  const wrap=document.getElementById('cat-image-preview-wrap');
  const img=document.getElementById('cat-image-preview');
  const nm=document.getElementById('cat-image-name');
  if(src){
    if(img)img.src=src;
    if(wrap)wrap.style.display='block';
    if(nm)nm.textContent=I18n.t('cert.imageLoaded')||'صورة محمّلة ✅';
  }else{
    if(img)img.src='';
    if(wrap)wrap.style.display='none';
    if(nm)nm.textContent=I18n.t('cert.noImage')||'لم تُختر صورة';
  }
  window._catImageTemp=src||null;
}
function clearCatImage(){_showCatImagePreview(null);}

function loadTeamImage(input){
  const f=input.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    window._teamImageTemp=e.target.result;
    _showTeamImagePreview(e.target.result);
  };
  reader.readAsDataURL(f);
}
function _showTeamImagePreview(src){
  const wrap=document.getElementById('team-image-preview-wrap');
  const img=document.getElementById('team-image-preview');
  if(src){if(img)img.src=src;if(wrap)wrap.style.display='block';}
  else{if(img)img.src='';if(wrap)wrap.style.display='none';}
  window._teamImageTemp=src||null;
}
function clearTeamImage(){_showTeamImagePreview(null);}

// ════════════════════════════════════════════════════════
//  OPTION DRAG-DROP REORDER (mouse + touch)
// ════════════════════════════════════════════════════════
let _optDragSrc=-1;
let _optTouchSrc=-1;
let _optTouchEl=null;
let _optTouchClone=null;
let _optTouchStartY=0;

// V7: Option rows reorder via SortableJS
function onOptDragStart(e){if(e&&e.preventDefault)e.preventDefault();}
function onOptDragOver(e){if(e&&e.preventDefault)e.preventDefault();}
function onOptDrop(e){if(e&&e.preventDefault)e.preventDefault();}
function onOptDragEnd(){}
function initOptionsEditorSortable(container){
  if(!container)return;
  initSortable(container,{
    handle:'.opt-drag-handle,.opt-editor-row',
    draggable:'.opt-editor-row',
    onEnd:function(evt){
      if(evt.oldIndex===evt.newIndex)return;
      try{_swapOptionRows(evt.oldIndex,evt.newIndex);}
      catch(e){ErrorBus.capture(e,'optSwap');}
    }
  });
}

// ── Touch drag for option rows ──
function onOptHandleTouchStart(e,idx){
  e.stopPropagation();
  _optTouchSrc=idx;
  _optTouchStartY=e.touches[0].clientY;
  const row=document.getElementById('opt-row-'+idx);
  if(!row)return;
  _optTouchEl=row;
  _optTouchEl.classList.add('dragging-opt');
  // Create floating clone
  _optTouchClone=row.cloneNode(true);
  _optTouchClone.style.cssText=`position:fixed;z-index:9999;left:${row.getBoundingClientRect().left}px;top:${row.getBoundingClientRect().top}px;width:${row.offsetWidth}px;opacity:.85;pointer-events:none;background:var(--bg-card);border:2px solid var(--accent1);border-radius:10px;`;
  document.body.appendChild(_optTouchClone);
}
function onOptHandleTouchMove(e){
  if(_optTouchSrc<0||!_optTouchClone)return;
  e.preventDefault();
  const touch=e.touches[0];
  _optTouchClone.style.top=(touch.clientY-30)+'px';
  // Find target row
  document.querySelectorAll('.opt-editor-row').forEach(r=>r.classList.remove('drag-over-opt'));
  const elBelow=document.elementFromPoint(touch.clientX,touch.clientY);
  const targetRow=elBelow?.closest('.opt-editor-row');
  if(targetRow&&targetRow!==_optTouchEl){
    const tidx=+targetRow.id.replace('opt-row-','');
    if(!isNaN(tidx)) targetRow.classList.add('drag-over-opt');
  }
}
function onOptHandleTouchEnd(e){
  if(_optTouchSrc<0)return;
  if(_optTouchClone){_optTouchClone.remove();_optTouchClone=null;}
  document.querySelectorAll('.opt-editor-row').forEach(r=>{r.classList.remove('drag-over-opt');r.classList.remove('dragging-opt');});
  // Find drop target
  const touch=e.changedTouches[0];
  const elBelow=document.elementFromPoint(touch.clientX,touch.clientY);
  const targetRow=elBelow?.closest('.opt-editor-row');
  const src=_optTouchSrc;
  _optTouchSrc=-1;_optTouchEl=null;
  if(targetRow){
    const tidx=+targetRow.id.replace('opt-row-','');
    if(!isNaN(tidx)&&tidx!==src) _swapOptionRows(src,tidx);
  }
}
// Attach touch handlers after DOM ready
function _initOptTouchDrag(){
  for(let i=0;i<4;i++){
    const handle=document.querySelector(`#opt-row-${i} .opt-drag-handle`);
    if(!handle)continue;
    handle.ontouchstart=(e)=>onOptHandleTouchStart(e,i);
  }
}
document.addEventListener('touchmove',e=>{if(_optTouchSrc>=0)onOptHandleTouchMove(e);},{passive:false});
document.addEventListener('touchend',e=>{if(_optTouchSrc>=0)onOptHandleTouchEnd(e);},{passive:true});

function _swapOptionRows(a,b){
  // Collect current data for all 4 rows
  const rows=[];
  for(let i=0;i<4;i++){
    rows.push({
      text:document.getElementById('q-opt-'+i)?.value||'',
      imgSrc:document.getElementById('opt-img-thumb-'+i)?.src||'',
      imgVisible:(document.getElementById('opt-img-row-'+i)?.style.display!=='none'),
      mathVisible:(document.getElementById('opt-math-preview-'+i)?.style.display!=='none'),
      mathHTML:document.getElementById('opt-math-preview-'+i)?.innerHTML||'',
    });
  }
  // Perform swap
  const tmp=rows[a];rows[a]=rows[b];rows[b]=tmp;
  // Update correct answer index if it was one of the swapped rows
  const correct=+document.getElementById('q-correct-input').value;
  let newCorrect=correct;
  if(correct===a) newCorrect=b;
  else if(correct===b) newCorrect=a;
  // Write back all row data
  for(let i=0;i<4;i++){
    const inpEl=document.getElementById('q-opt-'+i);
    const imgRow=document.getElementById('opt-img-row-'+i);
    const imgThumb=document.getElementById('opt-img-thumb-'+i);
    const mathPrev=document.getElementById('opt-math-preview-'+i);
    if(inpEl) inpEl.value=rows[i].text;
    if(imgThumb) imgThumb.src=rows[i].imgSrc;
    if(imgRow) imgRow.style.display=rows[i].imgVisible&&rows[i].imgSrc&&rows[i].imgSrc!==window.location.href?'flex':'none';
    if(mathPrev){
      mathPrev.innerHTML=rows[i].mathHTML;
      mathPrev.style.display=rows[i].mathVisible&&rows[i].mathHTML?'block':'none';
    }
  }
  // Update correct answer select
  const corrEl=document.getElementById('q-correct-input');
  if(corrEl){corrEl.value=String(newCorrect);updateOptRowState();}
  // Also swap stored image data in _optImages array
  if(typeof _optImages!=='undefined'&&Array.isArray(_optImages)){
    const tmpImg=_optImages[a];
    _optImages[a]=_optImages[b];
    _optImages[b]=tmpImg;
    // Re-sync thumb srcz from _optImages (in case src was empty placeholder)
    for(let i=0;i<4;i++){
      const thumb=document.getElementById('opt-img-thumb-'+i);
      const imgRow=document.getElementById('opt-img-row-'+i);
      if(thumb&&_optImages[i]){
        thumb.src=_optImages[i];
        if(imgRow)imgRow.style.display='flex';
      }else if(thumb&&!_optImages[i]){
        thumb.src='';
        if(imgRow)imgRow.style.display='none';
      }
    }
  }
  toast(I18n.t('toast.optionsReordered'),'info');
}

// ════════════════════════════════════════════════════════
//  MOBILE UI IMPROVEMENTS — ensure presentation views
//  always start at top and admin nav is scrollable
// ════════════════════════════════════════════════════════
(function(){
  // On admin-nav touch scroll: prevent body scroll bleed
  const nav=document.querySelector('.admin-nav');
  if(nav){
    nav.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});
  }
  // On modal open, scroll modal content to top + init touch drag
  const origOpenModal=window.openModal;
  if(typeof origOpenModal==='function'){
    window.openModal=function(id){
      origOpenModal(id);
      const m=document.querySelector('#'+id+' .modal');
      if(m) m.scrollTop=0;
      if(id==='modal-question') setTimeout(_initOptTouchDrag,100);
    };
  }
})();
(function(){
  const _orig=saveQuestion;
  saveQuestion=function(){
    if(_currentQType!=='tf'){_orig();return;}
    const text=document.getElementById('q-text-input').value.trim();
    if(!text){toast(I18n.t('categories.questionText')||'أدخل نص السؤال','danger');return;}
    const isTrue=document.getElementById('tf-correct-answer').value==='true';
    const cat=state.categories.find(c=>c.id===state.currentCatId);
    if(!cat)return;
    const difficulty=document.getElementById('q-difficulty-input').value;
    const time=+document.getElementById('q-time-input').value||state.settings.defaultTime;
    const explanation=document.getElementById('q-explanation-input').value.trim();
    const hostNote=document.getElementById('q-hostnote-input').value.trim();
    const newQ={
      id:state.editingQId||('q'+Date.now()),
      text,type:'tf',
      options:[I18n.t('answer.correct'),I18n.t('answer.wrong')], // Index 0=صح(True), Index 1=خطأ(False)
      optionImages:[null,null,null,null],
      correct:isTrue?0:1, // 0=صح(True), 1=خطأ(False) — standard 0-indexed options
      difficulty,time,explanation,hostNote,mediaData:null,mediaAttachment:null,
    };
    if(state.editingQId){
      const idx=cat.questions.findIndex(q=>q.id===state.editingQId);
      if(idx>=0)cat.questions[idx]=newQ;
    }else{
      cat.questions.push(newQ);
    }
    saveState();
    renderQuestionsAdmin(state.currentCatId);
    closeModal('modal-question');
    toast(state.editingQId?I18n.t('toast.questionEdited'):I18n.t('toast.questionAdded'),'success');
  };
})();
