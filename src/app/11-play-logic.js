// ════════════════════════════════════════════════════════
//  PLAY LOGIC - Main game flow (V14)
//  Note: BUILTIN_LIBRARY has been moved to a separate file
//        (src/app/11-builtin-library.js) which is loaded BEFORE
//        this file. See index.html for load order.
// ════════════════════════════════════════════════════════

function loadBuiltinLibrary(mode){
  if(!mode)mode='replace';
  // V11: Only import checked categories
  const checkedIndices=new Set();
  document.querySelectorAll('.lib-cat-check:checked').forEach(cb=>{
    checkedIndices.add(parseInt(cb.dataset.catIndex));
  });
  if(checkedIndices.size===0){
    toast(I18n.t('toast.noCategoriesSelected'),'warning');
    return;
  }
  const libCats=JSON.parse(JSON.stringify(BUILTIN_LIBRARY.filter((_,i)=>checkedIndices.has(i))));
  // Regenerate IDs to avoid conflicts
  libCats.forEach(cat=>{
    cat.id=uid();
    cat.questions.forEach(q=>{q.id=uid();});
  });
  if(mode==='replace'){
    state.categories=libCats;
    toast(I18n.t('toast.libLoaded',{cats:libCats.length,qs:libCats.reduce((s,c)=>s+c.questions.length,0)}),'success');
  }else if(mode==='append'){
    state.categories=state.categories.concat(libCats);
    toast(I18n.t('toast.libAdded',{cats:libCats.length,qs:libCats.reduce((s,c)=>s+c.questions.length,0)}),'success');
  }else if(mode==='merge'){
    // Merge: add questions from library into existing categories with matching names
    let merged=0,added=0;
    libCats.forEach(libCat=>{
      const existing=state.categories.find(c=>c.name===libCat.name);
      if(existing){
        libCat.questions.forEach(q=>{
          q.id=uid();
          existing.questions.push(q);
          merged++;
        });
      }else{
        libCat.id=uid();
        libCat.questions.forEach(q=>{q.id=uid();});
        state.categories.push(libCat);
        added++;
      }
    });
    toast(I18n.t('toast.libMerged',{merged:merged,added:added}),'success');
  }
  // Save imported library data to IndexedDB for large data handling
  // This prevents localStorage overflow when the library is large
  if(typeof MediaDB!=='undefined'){
    try{
      MediaDB.set('_library_import',JSON.stringify({
        timestamp:Date.now(),
        mode:mode,
        categories:state.categories.map(function(c){return{id:c.id,name:c.name,qCount:c.questions.length};})
      })).catch(function(e){_logErr(e,'MediaDB:setLibraryImport')});
      // Save all media data for imported categories to IndexedDB
      var idbPromises=[];
      state.categories.forEach(function(cat){
        if(cat.catImage&&typeof cat.catImage==='string'&&cat.catImage.length>500){
          idbPromises.push(MediaDB.set('ci_'+cat.id,cat.catImage).catch(function(e){_logErr(e,'MediaDB:setCatImg')}));
        }
        (cat.questions||[]).forEach(function(q){
          if(q.mediaData&&typeof q.mediaData==='string'&&q.mediaData.length>500){
            idbPromises.push(MediaDB.set('qm_'+q.id,q.mediaData).catch(function(e){_logErr(e,'MediaDB:setQuestionMedia')}));
          }
          if(q.optionImages){
            q.optionImages.forEach(function(img,idx){
              if(img&&typeof img==='string'&&img.length>500){
                idbPromises.push(MediaDB.set('qo_'+q.id+'_'+idx,img).catch(function(e){_logErr(e,'MediaDB:setOptionImg')}));
              }
            });
          }
        });
      });
      if(idbPromises.length>0)Promise.all(idbPromises).catch(function(e){_logErr(e,'MediaDB:libraryImport-PromiseAll')});
    }catch(e){console.error("[Error]",e);}
  }
  // V10-fix: Use saveStateSync instead of debounced saveState for library import
  _lastSavedJSON='';
  if(!_idbLoadDone){_idbLoadDone=true;_pendingSaveNeeded=false;}
  try{saveStateSync();}catch(e){try{saveState();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_69")}catch(_){}}}
  renderAdmin();
  // Close modal
  const m=document.getElementById('library-modal');
  if(m)m.remove();
}

function showLibraryModal(){
  // Check if modal already exists
  if(document.getElementById('library-modal'))return;
  const totalQ=BUILTIN_LIBRARY.reduce((s,c)=>s+c.questions.length,0);
  const catList=BUILTIN_LIBRARY.map((c,ci)=>{
    const types={};
    c.questions.forEach(q=>{types[q.type]=(types[q.type]||0)+1;});
    const typeNames={text:I18n.t('qtype.text'),tf:I18n.t('qtype.tf'),fitb:I18n.t('qtype.fillBlank'),order:I18n.t('qtype.ordering'),match:I18n.t('qtype.matching'),quran:I18n.t('qtype.quran'),math:I18n.t('qtype.math'),image:I18n.t('qtype.image'),audio:I18n.t('qtype.audio')};
    const typeStr=Object.entries(types).map(([t,n])=>(typeNames[t]||t)+':'+n).join(' · ');
    // V11: Add checkbox for each category
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:10px;background:var(--bg-secondary,rgba(255,255,255,.06));border:1px solid var(--border-color,rgba(255,255,255,.08))"><input type="checkbox" class="lib-cat-check" data-cat-index="${ci}" checked style="width:16px;height:16px;accent-color:var(--accent1);flex-shrink:0"><span style="font-size:1.5em">${c.icon}</span><div style="flex:1"><div style="font-weight:700">${c.name}</div><div style="font-size:.78em;opacity:.7">${c.questions.length} ${I18n.t('lib.questionCount','سؤال')} — ${typeStr}</div></div><span style="width:10px;height:10px;border-radius:50%;background:${c.color};flex-shrink:0"></span></div>`;
  }).join('');
  
  const modal=document.createElement('div');
  modal.id='library-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);animation:fadeIn .25s ease';
  // V11: Close handler with toast notification
  const _closeLibModal=function(){
    const m=document.getElementById('library-modal');
    if(m)m.remove();
  };
  const _closeLibModalWithToast=function(){
    _closeLibModal();
    toast(I18n.t('toast.libImportCanceled'),'info');
  };
  modal.innerHTML=`
    <div style="background:var(--card-bg,#1a1d2e);border-radius:20px;max-width:620px;width:92%;max-height:85vh;display:flex;flex-direction:column;border:1px solid var(--border-color,rgba(255,255,255,.1));box-shadow:0 20px 60px rgba(0,0,0,.5)">
      <div style="padding:20px 24px;border-bottom:1px solid var(--border-color,rgba(255,255,255,.08));display:flex;align-items:center;gap:12px">
        <span style="font-size:2em">📚</span>
        <div style="flex:1">
          <div style="font-size:1.2em;font-weight:800">${I18n.t('lib.title','مكتبة الأسئلة المدمجة')}</div>
          <div style="font-size:.82em;opacity:.65">${BUILTIN_LIBRARY.length} ${I18n.t('lib.sections','أقسام')} · ${totalQ} ${I18n.t('lib.questions','سؤال')}</div>
        </div>
        <button id="lib-close-btn" style="background:none;border:none;color:var(--text-secondary,rgba(255,255,255,.5));font-size:1.5em;cursor:pointer;padding:4px 8px;border-radius:8px;transition:all .2s" onmouseover="this.style.background='var(--bg-secondary)'" onmouseout="this.style.background='none'">✕</button>
      </div>
      <div style="padding:8px 24px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-color,rgba(255,255,255,.06))">
        <button id="lib-select-all" style="padding:3px 10px;border-radius:8px;border:1px solid var(--border-color,rgba(255,255,255,.15));background:var(--bg-secondary,rgba(255,255,255,.06));color:var(--text-primary);font-size:.72rem;font-weight:700;cursor:pointer">${I18n.t('admin.selectAll','تحديد الكل')}</button>
        <button id="lib-deselect-all" style="padding:3px 10px;border-radius:8px;border:1px solid var(--border-color,rgba(255,255,255,.15));background:var(--bg-secondary,rgba(255,255,255,.06));color:var(--text-primary);font-size:.72rem;font-weight:700;cursor:pointer">${I18n.t('admin.deselectAll','إلغاء التحديد')}</button>
        <span style="font-size:.72rem;opacity:.5;flex:1;text-align:end" id="lib-selected-count"></span>
      </div>
      <div style="padding:16px 24px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px">
        ${catList}
      </div>
      <div style="padding:16px 24px;border-top:1px solid var(--border-color,rgba(255,255,255,.08));display:flex;flex-direction:column;gap:8px">
        <div style="font-size:.85em;opacity:.7;margin-bottom:4px;text-align:center">${I18n.t('lib.chooseMode','اختر كيف تريد تحميل المكتبة:')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">
          <button class="btn btn-primary" onclick="loadBuiltinLibrary('replace')" style="flex:1;min-width:140px">🔄 ${I18n.t('lib.replace','استبدال الكل')}</button>
          <button class="btn btn-accent" onclick="loadBuiltinLibrary('append')" style="flex:1;min-width:140px">➕ ${I18n.t('lib.append','إضافة للنهاية')}</button>
          <button class="btn btn-ghost" onclick="loadBuiltinLibrary('merge')" style="flex:1;min-width:140px">🔀 ${I18n.t('lib.merge','دمج ذكي')}</button>
        </div>
        <div style="font-size:.75em;opacity:.5;text-align:center;margin-top:4px">
          ${I18n.t('lib.modeHint','استبدال: يحل محل الأقسام الحالية · إضافة: يضيف بعد الأقسام الموجودة · دمج: يضيف الأسئلة للأقسام المطابقة')}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // V11: Close handlers with toast
  document.getElementById('lib-close-btn').addEventListener('click',_closeLibModalWithToast);
  modal.addEventListener('click',e=>{if(e.target===modal)_closeLibModalWithToast();});
  // V11: Select All / Deselect All buttons
  document.getElementById('lib-select-all').addEventListener('click',function(){
    document.querySelectorAll('.lib-cat-check').forEach(cb=>{cb.checked=true;});
    _updateLibSelectedCount();
  });
  document.getElementById('lib-deselect-all').addEventListener('click',function(){
    document.querySelectorAll('.lib-cat-check').forEach(cb=>{cb.checked=false;});
    _updateLibSelectedCount();
  });
  // V11: Update selected count on checkbox change
  document.querySelectorAll('.lib-cat-check').forEach(cb=>{
    cb.addEventListener('change',_updateLibSelectedCount);
  });
  function _updateLibSelectedCount(){
    const total=document.querySelectorAll('.lib-cat-check').length;
    const checked=document.querySelectorAll('.lib-cat-check:checked').length;
    const el=document.getElementById('lib-selected-count');
    if(el)el.textContent=checked+'/'+total+' '+I18n.t('lib.selected','محدد');
  }
  _updateLibSelectedCount();
}

/**
 * loadState - Restore all application state from localStorage + IndexedDB
 * Priority: quiz_v4 (LZ-compressed) -> legacy keys -> IDB fallback
 * Also restores: category images, team images, audio data, font scale, theme
 */
async function loadState(){
  // V10: Helper to decompress LZ-String data with backward compatibility
  const _decompressLZ=function(raw,key){
    if(!raw)return null;
    try{
      // Check if data was saved with compression
      const isCompressed=localStorage.getItem(key+'_lz')==='1';
      if(isCompressed){
        const decompressed=LZString.decompressFromUTF16(raw);
        if(decompressed)return JSON.parse(decompressed);
      }
      // Fallback: try normal JSON parse (backward compatible with V9 data)
      return JSON.parse(raw);
    }catch(e){
      // If JSON.parse fails on uncompressed data, try decompressing
      try{
        const decompressed=LZString.decompressFromUTF16(raw);
        if(decompressed)return JSON.parse(decompressed);
      }catch(e){try{ErrorBus.capture(e,"catch#AUTO_70")}catch(_){}}
      // Last resort: try raw JSON parse
      try{return JSON.parse(raw);}catch(e3){return null;}
    }
  };
  try{
    // V10: Try compressed quiz_v4 first, then legacy keys
    let raw=localStorage.getItem('quiz_v4');
    let s=null;
    if(raw){
      try{s=_decompressLZ(raw,'quiz_v4');}catch(e){console.warn('[loadState] Decompress quiz_v4 failed:',e);s=null;}
    }
    // Fallback to legacy keys (uncompressed)
    if(!s){
      const v3=localStorage.getItem('quiz_v3');
      if(v3){try{s=JSON.parse(v3);}catch(e){_logErr(e,'localStorage:parseV3')}}
    }
    if(!s){
      const v2=localStorage.getItem('quiz_platform_v2');
      if(v2){try{s=JSON.parse(v2);}catch(e){_logErr(e,'localStorage:parseV2')}}
    }
    // V10-fix: If no data in localStorage, try IDB primary state BEFORE returning
    if(!s){
      try{
        if(typeof MediaDB!=='undefined'&&MediaDB.loadPrimaryState){
          var _primaryData=await MediaDB.loadPrimaryState();
          if(_primaryData&&_primaryData.core){
            var ps=JSON.parse(_primaryData.core);
            if(ps&&(ps.categories||ps.teams||ps.settings)){
              s=ps;
              // V10.2-fix: Also restore cat/team images from IDB primary state
              if(_primaryData.catImg){
                try{
                  var _pCatImg=JSON.parse(_primaryData.catImg);
                  if(_pCatImg&&(s.categories||[]).length){
                    s.categories.forEach(function(c){if(_pCatImg[c.id])c.catImage=_pCatImg[c.id];});
                  }
                }catch(_pciErr){_logErr(_pciErr,'IDB:parseCatImg')}
              }
              if(_primaryData.teamImg){
                try{
                  var _pTeamImg=JSON.parse(_primaryData.teamImg);
                  if(_pTeamImg&&_pTeamImg.teamImages&&(s.teams||[]).length){
                    s.teams.forEach(function(t){
                      if(_pTeamImg.teamImages[t.id])t.teamImage=_pTeamImg.teamImages[t.id];
                      if(_pTeamImg.memberImages&&_pTeamImg.memberImages[t.id]){
                        var mImgs=_pTeamImg.memberImages[t.id];
                        (t.members||[]).forEach(function(m,i){
                          if(mImgs[i]){
                            if(typeof m==='object')m.image=mImgs[i];
                            else t.members[i]={name:m,icon:'',image:mImgs[i]};
                          }
                        });
                      }
                    });
                  }
                }catch(_ptiErr){_logErr(_ptiErr,'IDB:parseTeamImg')}
              }
              console.info('[loadState] Restored from IDB primary state (localStorage empty)');
            }
          }
        }
      }catch(_idbErr){console.warn('[loadState] IDB primary fallback failed:',_idbErr);}
      // Also try IDB core state
      if(!s){
        try{
          if(typeof MediaDB!=='undefined'&&MediaDB.loadCoreData){
            var _coreData=await MediaDB.loadCoreData();
            if(_coreData&&(_coreData.categories||_coreData.teams)){
              s=_coreData;
              console.info('[loadState] Restored from IDB core data (localStorage empty)');
            }
          }
        }catch(_idbErr2){console.warn('[loadState] IDB core fallback failed:',_idbErr2);}
      }
      if(!s)return;
      // V10-fix: Validate loaded data — if categories exist but all have 0 questions, data is corrupted
      if(s&&s.categories&&Array.isArray(s.categories)&&s.categories.length>0){
        var _totalQ=0;s.categories.forEach(function(c){_totalQ+=(c.questions||[]).length;});
        if(_totalQ===0){
          console.warn('[loadState] Categories exist but 0 questions — data may be corrupted, trying IDB');
          try{
            if(typeof MediaDB!=='undefined'&&MediaDB.loadPrimaryState){
              var _primaryFix=await MediaDB.loadPrimaryState();
              if(_primaryFix&&_primaryFix.core){
                var _psFix=JSON.parse(_primaryFix.core);
                if(_psFix&&_psFix.categories&&_psFix.categories.length){
                  var _psqTotal=0;_psFix.categories.forEach(function(c){_psqTotal+=(c.questions||[]).length;});
                  if(_psqTotal>0){s=_psFix;console.info('[loadState] Recovered from IDB primary state (corrupted LS data)');}
                }
              }
            }
          }catch(_idbFixErr){console.warn('[loadState] IDB recovery failed:',_idbFixErr);}
        }
      }
    }
    state.settings={...state.settings,...s.settings};
    // Ensure solo-specific settings have defaults if missing from saved data
    if(state.settings.soloBgMusic===undefined) state.settings.soloBgMusic=true;
    if(state.settings.soloTimerEnabled===undefined) state.settings.soloTimerEnabled=true;
    if(state.settings.soloDifficulty===undefined) state.settings.soloDifficulty='all';
    if(state.settings.soloMuted===undefined) state.settings.soloMuted=false;
    // V10.3: Validate critical data types from loaded state to prevent poisoning
    if(state.settings){
      // Validate color settings are valid CSS colors
      if(state.settings.certBorderColor)state.settings.certBorderColor=_safeColor(state.settings.certBorderColor);
      if(state.settings.certBgImage)state.settings.certBgImage=_safeMediaSrc(state.settings.certBgImage);
      // Validate numeric settings
      if(typeof state.settings.defaultTime!=='number')state.settings.defaultTime=15;
      if(typeof state.settings.hardPoints!=='number')state.settings.hardPoints=2;
    }
    // Validate categories array
    if(!Array.isArray(s.categories))s.categories=[];
    // Validate teams array
    if(s.teams&&!Array.isArray(s.teams))s.teams=[];
    // Sanitize team colors in loaded state
    if(Array.isArray(s.teams)){
      s.teams.forEach(function(t){
        if(t&&t.color)t.color=_safeColor(t.color);
        if(t&&t.teamImage)t.teamImage=_safeMediaSrc(t.teamImage);
      });
    }
    // Sanitize category colors in loaded state
    if(Array.isArray(s.categories)){
      s.categories.forEach(function(c){
        if(c&&c.color)c.color=_safeColor(c.color);
        if(c&&c.catImage)c.catImage=_safeMediaSrc(c.catImage);
      });
    }
    state.categories=(s.categories||[]).map(cat=>({
      catImage:null,
      type:cat.type||'regular',  // V12: Category type migration — default to 'regular'
      ...cat,
      questions:(cat.questions||[]).map(q=>{
        // V10-fix: Add missing fields for backward compatibility with old data
        const defaults={
          optionImages:[null,null,null,null],
          type:q.type||'text',
          difficulty:q.difficulty||(q.type==='tf'?'easy':'medium'),
          time:q.time||null,
          fitbAnswer:q.fitbAnswer||null,
          matchPairs:q.matchPairs||null,
          quranMode:q.quranMode||null,
          quranDisplayMode:q.quranDisplayMode||null,
          mediaAttachment:q.mediaAttachment||null,
          videoRef:q.videoRef||null,
          explanation:q.explanation||'',
        };
        const mq={...defaults,...q};
        // V15-fix: Migrate old tf convention (correct:1=True) to new (correct:0=True)
        // Old convention: options=["خطأ","صحيح"], correct:1=True
        // New convention: options=["صحيح","خطأ"], correct:0=True
        if(mq.type==='tf' && mq.options && mq.options.length>=2){
          const opt0=(mq.options[0]||'').toLowerCase();
          const opt1=(mq.options[1]||'').toLowerCase();
          // Detect old convention: options[0]="خطأ" or "wrong", options[1]="صحيح" or "correct"
          const isOldConvention=(opt0.includes('خطأ')||opt0.includes('wrong'))&&(opt1.includes('صحيح')||opt1.includes('correct'));
          if(isOldConvention){
            // Flip correct value and swap options
            mq.correct=mq.correct===0?1:0;
            mq.options=[mq.options[1],mq.options[0]];
          }
        }
        return mq;
      })
    }));
    state.teams=s.teams||[];
    state.credits=s.credits||[];
    // Restore solo progress (persists between sessions)
    if(s.soloProgress&&typeof s.soloProgress==='object'&&s.soloProgress.levels){
      state.soloProgress=s.soloProgress;
      console.info('[loadState] Restored solo progress:',Object.keys(s.soloProgress.levels).length,'levels');
    }
    // Restore cat images (V10: with LZ-String decompression)
    try{
      const catImgRaw=localStorage.getItem('quiz_v4_catimg');
      const ci=catImgRaw?(_decompressLZ(catImgRaw,'quiz_v4_catimg')||{}):{};
      state.categories.forEach(c=>{if(ci[c.id])c.catImage=ci[c.id];});
    }catch(e){try{ErrorBus.capture(e,"catch#6")}catch(e2){_logErr(e2,'loadState:catch6-inner')}}
    // Restore team images + member images (V10: with LZ-String decompression)
    try{
      const teamImgRaw=localStorage.getItem('quiz_v4_teamimg');
      const ti=teamImgRaw?(_decompressLZ(teamImgRaw,'quiz_v4_teamimg')||{}):{};
      state.teams.forEach(t=>{
        if(ti.teamImages&&ti.teamImages[t.id])t.teamImage=ti.teamImages[t.id];
        if(ti.memberImages&&ti.memberImages[t.id]){
          const mImgs=ti.memberImages[t.id];
          (t.members||[]).forEach((m,i)=>{
            if(mImgs[i]){
              if(typeof m==='object')m.image=mImgs[i];
              else t.members[i]={name:m,icon:'',image:mImgs[i]};
            }
          });
        }
      });
    }catch(e){try{ErrorBus.capture(e,"catch#7")}catch(e2){_logErr(e2,'loadState:catch7-inner')}}
    // Restore audio data (localStorage — V9: will migrate to IDB via saveAllMedia)
    try{
      const audioRaw=localStorage.getItem('quiz_v4_audio');
      if(audioRaw){
        const ad=JSON.parse(audioRaw);
        state.settings.customMusicData=ad.customMusicData||null;
        state.settings.customCorrectData=ad.customCorrectData||null;
        state.settings.customWrongData=ad.customWrongData||null;
        state.settings.customTenseData=ad.customTenseData||null;
        state.settings.podiumMusicData=ad.podiumMusicData||null;
        state.settings.wheelMusicData=ad.wheelMusicData||null;
        state.settings.certBgImage=ad.certBgImage||null;  // V10-fix: Restore certBgImage from audio key
      }
    }catch(e){try{ErrorBus.capture(e,"catch#audio-restore")}catch(e2){_logErr(e2,'loadState:audioRestore-inner')}}
    // Apply font scale
    try{applyFontScale(state.settings.fontScale||100)}catch(e){try{ErrorBus.capture(e,"catch#8")}catch(e2){_logErr(e2,'loadState:fontScale-inner')}}
    // Sync solo settings from state.settings (unified settings system)
    try{if(typeof _syncSoloSettingsFromState==='function')_syncSoloSettingsFromState();}catch(e){}
    // V9: loadAllMedia now handles team images, member images, option images, credits, wheel audio
    // IDB data takes priority over localStorage data (fills in nulls and 'true' placeholders)
    // V10-fix: Add timeout for loadAllMedia to prevent hang
    var _loadMediaTimeout=setTimeout(function(){
      console.warn('[loadState] loadAllMedia timeout — proceeding without full media restore');
      _idbLoadDone=true;
      if(_pendingSaveNeeded){_pendingSaveNeeded=false;try{saveState();}catch(e2){console.warn('[loadState] Pending save failed after IDB timeout:',e2);}}
    },8000);
    try{MediaDB.loadAllMedia().then(function(){
      clearTimeout(_loadMediaTimeout);
      // V10.2-fix: Enhanced IDB fallback — also check if data appears corrupted or incomplete
      var _needsIDBRestore=!state.categories.length&&!state.teams.length;
      // Also check if categories loaded with empty questions (data corruption)
      if(!_needsIDBRestore&&state.categories.length>0){
        var _totalQuestions=0;
        state.categories.forEach(function(c){_totalQuestions+=(c.questions||[]).length;});
        // If we have category containers but ZERO questions, data might be corrupted — try IDB
        if(_totalQuestions===0)_needsIDBRestore=true;
      }
      // V10.2-fix: Also check if localStorage data was restored from IDB (incomplete — missing images)
      if(!_needsIDBRestore&&state.categories.length>0){
        var _allMediaPlaceholder=true;
        state.categories.forEach(function(c){
          if(c.catImage&&c.catImage!==true){_allMediaPlaceholder=false;}
          (c.questions||[]).forEach(function(q){
            if(q.mediaData&&q.mediaData!==true){_allMediaPlaceholder=false;}
            if(q.optionImages)q.optionImages.forEach(function(img){if(img&&img!==true){_allMediaPlaceholder=false;}});
          });
        });
        // V10-fix: If ALL media is placeholder, trigger IDB restore for media
        if(_allMediaPlaceholder&&typeof MediaDB!=='undefined'){
          console.warn('[loadState] All media is placeholder — triggering IDB media restore');
          _needsIDBRestore=true;
        }
      }
      if(_needsIDBRestore){
        try{
          MediaDB.loadPrimaryState().then(function(primaryData){
            if(primaryData&&primaryData.core){
              var ps=JSON.parse(primaryData.core);
              if(ps&&ps.categories&&ps.categories.length){
                state.settings={...state.settings,...ps.settings};
                // Ensure solo-specific settings have defaults if missing from saved data
                if(state.settings.soloBgMusic===undefined) state.settings.soloBgMusic=true;
                if(state.settings.soloTimerEnabled===undefined) state.settings.soloTimerEnabled=true;
                if(state.settings.soloDifficulty===undefined) state.settings.soloDifficulty='all';
                if(state.settings.soloMuted===undefined) state.settings.soloMuted=false;
                state.categories=(ps.categories||[]).map(function(cat){return {catImage:null,...cat,questions:(cat.questions||[]).map(function(q){
                  // V10-fix: Full field defaults for IDB primary state restore (same as localStorage path)
                  var qDefaults={
                    optionImages:[null,null,null,null],
                    type:q.type||'text',
                    difficulty:q.difficulty||(q.type==='tf'?'easy':'medium'),
                    time:q.time||null,
                    fitbAnswer:q.fitbAnswer||null,
                    matchPairs:q.matchPairs||null,
                    quranMode:q.quranMode||null,
                    quranDisplayMode:q.quranDisplayMode||null,
                    mediaAttachment:q.mediaAttachment||null,
                    videoRef:q.videoRef||null,
                    explanation:q.explanation||''
                  };
                  return {...qDefaults,...q};
                })};});
                state.teams=ps.teams||[];
                state.credits=ps.credits||[];
                // Restore images from IDB if available
                if(primaryData.catImg){
                  try{
                    var ci=JSON.parse(primaryData.catImg);
                    state.categories.forEach(function(c){if(ci[c.id])c.catImage=ci[c.id];});
                  }catch(e){_logErr(e,'IDB:parseCatImg-loadState')}
                }
                if(primaryData.teamImg){
                  try{
                    var ti=JSON.parse(primaryData.teamImg);
                    state.teams.forEach(function(t){
                      if(ti.teamImages&&ti.teamImages[t.id])t.teamImage=ti.teamImages[t.id];
                      if(ti.memberImages&&ti.memberImages[t.id]){
                        var mImgs=ti.memberImages[t.id];
                        (t.members||[]).forEach(function(m,i){
                          if(mImgs[i]){
                            if(typeof m==='object')m.image=mImgs[i];
                            else t.members[i]={name:m,icon:'',image:mImgs[i]};
                          }
                        });
                      }
                    });
                  }catch(e){_logErr(e,'IDB:parseTeamImg-loadState')}
                }
                // Now reload all media from IDB to fill in 'true' placeholders
                MediaDB.loadAllMedia().then(async function(){
                  // Save restored state back to localStorage
                  _lastSavedJSON='';
                  try{await saveStateSync();}catch(e){_logErr(e,'saveStateSync:afterIDBRestore')}
                  try{renderAdmin();}catch(e){_logErr(e,'renderAdmin:afterIDBRestore')}
                  console.info('[loadState] Restored state from IDB primary data with media');
                }).catch(async function(){
                  _lastSavedJSON='';
                  try{await saveStateSync();}catch(e){_logErr(e,'saveStateSync:afterIDBRestoreError')}
                  try{renderAdmin();}catch(e){_logErr(e,'renderAdmin:afterIDBRestoreError')}
                });
                console.info('[loadState] Restored state from IDB primary data');
              }
            }
          }).catch(function(e){_logErr(e,'IDB:loadPrimaryState')});
        }catch(e){_logErr(e,'IDB:loadPrimaryState-outer')}
      }
      try{renderAdmin();}catch(e){try{ErrorBus.capture(e,"catch#9")}catch(e2){_logErr(e2,'loadState:renderAdmin-inner')}}
      _idbLoadDone=true;
      if(_pendingSaveNeeded){_pendingSaveNeeded=false;try{saveState();}catch(e2){console.warn('[loadState] Pending save failed after IDB load:',e2);}}
      // V9: Periodic cleanup of orphaned IDB keys (every 10 loads, ~1% chance each time)
      if(Math.random()<0.1)try{MediaDB.pruneOrphaned();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_71")}catch(_){}}
      try{MediaDB.saveCoreData().catch(function(e){_logErr(e,'MediaDB:saveCoreData-loadState')});}catch(e){console.error("[Error]",e);}
    }).catch(function(){clearTimeout(_loadMediaTimeout);_idbLoadDone=true;if(_pendingSaveNeeded){_pendingSaveNeeded=false;try{saveState();}catch(e2){console.warn('[loadState] Pending save failed after IDB error:',e2);}}});}catch(e){clearTimeout(_loadMediaTimeout);_idbLoadDone=true;if(_pendingSaveNeeded){_pendingSaveNeeded=false;try{saveState();}catch(e2){console.warn('[loadState] Pending save failed after IDB exception:',e2);}}}
    try{applyCatCardScale(state.settings.catCardSize||100)}catch(e){try{ErrorBus.capture(e,"catch#10")}catch(e2){_logErr(e2,'loadState:catCardScale-inner')}}
    try{_applyTeamCardHeight()}catch(e){try{ErrorBus.capture(e,"catch#11")}catch(e2){_logErr(e2,'loadState:teamCardHeight-inner')}}
  }catch(e){_idbLoadDone=true;if(_pendingSaveNeeded){_pendingSaveNeeded=false;try{saveState();}catch(e2){console.warn('[loadState] Pending save failed after outer catch:',e2);}}try{showCorruptionRecovery(e);}catch(_crErr){console.error('[loadState] showCorruptionRecovery failed:',_crErr);}}
}
