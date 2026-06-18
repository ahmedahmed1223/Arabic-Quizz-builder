// ════════════════════════════════════════════════════════
//  PERSISTENCE — V9: Debounced + Dirty-checked saves
// ════════════════════════════════════════════════════════
let _saveStateTimer=null;  // Phase 4.4: Now stores TimerRegistry id instead of raw handle
let _lastSavedJSON='';  // Track last saved state for dirty checking
const SAVE_DEBOUNCE_MS=500;
// V11-PERF: Track media changes separately — only flush to IDB when media actually changed,
// not on every save. Set to true by any function that modifies images/audio.
let _mediaDirty=false;
// Public setters — called from addCatImage, editAudio, addTeamImage, etc.
function markMediaDirty(){_mediaDirty=true;}

// V11.0: Extracted helper functions from _saveStateNow (avoids re-creation on every save call)
function _stripCatMedia(categories){
  return categories.map(function(c){
    var cc={...c};
    if(cc.catImage&&typeof cc.catImage==='string'&&cc.catImage.length>500)cc.catImage=true;
    cc.questions=(cc.questions||[]).map(function(q){
      var qClean={...q};
      if(qClean.mediaData&&typeof qClean.mediaData==='string'&&qClean.mediaData.length>500)qClean.mediaData=true;
      if(qClean.mediaAttachment&&qClean.mediaAttachment.data&&typeof qClean.mediaAttachment.data==='string'&&qClean.mediaAttachment.data.length>500){
        qClean.mediaAttachment={...qClean.mediaAttachment,data:true};
      }
      if(qClean.optionImages&&Array.isArray(qClean.optionImages)){
        qClean.optionImages=qClean.optionImages.map(function(img){
          return(img&&typeof img==='string'&&img.length>500)?true:img;
        });
      }
      return qClean;
    });
    return cc;
  });
}
function _compressLZ(data){
  try{
    var json=JSON.stringify(data);
    if(json.length<2048)return{data:json,compressed:false};
    var compressed=LZString.compressToUTF16(json);
    if(compressed.length<json.length)return{data:compressed,compressed:true};
    return{data:json,compressed:false};
  }catch(e){return{data:JSON.stringify(data),compressed:false};}
}
function _decompressForIDB(compressedResult){
  if(!compressedResult)return null;
  if(compressedResult.compressed){
    try{return LZString.decompressFromUTF16(compressedResult.data)||compressedResult.data;}
    catch(_){return compressedResult.data;}
  }
  return compressedResult.data;
}

/**
 * saveState - Debounced state persistence (500ms)
 * Queues a save operation, coalescing rapid calls
 * If IDB hasn't loaded yet, defers save until ready
 */
function saveState(){
  // Guard: if IDB hasn't finished loading, queue the save and skip LS write
  if(!_idbLoadDone){_pendingSaveNeeded=true;return;}
  // V9: Debounce — coalesce rapid calls within 500ms
  // Phase 4.4: Use TimerRegistry for timer leak prevention
  if(_saveStateTimer)TimerRegistry.clear(_saveStateTimer);
  _saveStateTimer=TimerRegistry.setTimeout(_saveStateNow,SAVE_DEBOUNCE_MS,'saveState:debounce');
}

/**
 * _saveStateNow - Immediately save state to localStorage + IndexedDB
 * Saves: core data (LZ-compressed), cat/team images, audio, media to IDB
 * Includes dirty-checking to skip unnecessary writes
 * @private
 */
// V11: Storage health check function
async function checkStorageHealth(){
  const result={localStorageOk:false,idbOk:false,usedMB:0,quotaMB:0,availableMB:0,categories:0,questions:0,lsKeyCount:0,lsTotalBytes:0,idbKeyCount:0,idbTotalBytes:0};
  // Check localStorage
  try{
    const testKey='_storage_health_test_'+Date.now();
    localStorage.setItem(testKey,'1');
    if(localStorage.getItem(testKey)==='1'){result.localStorageOk=true;}
    localStorage.removeItem(testKey);
  }catch(e){result.localStorageOk=false;}
  // V10-fix: Count ALL localStorage keys and estimate total size
  try{
    var _lsTotalBytes=0;var _lsKeyCount=0;
    for(var _lsi=0;_lsi<localStorage.length;_lsi++){
      var _lsk=localStorage.key(_lsi);
      if(_lsk){
        _lsKeyCount++;
        var _lsv=localStorage.getItem(_lsk);
        _lsTotalBytes+=(_lsk.length*2)+(_lsv?_lsv.length*2:0);
      }
    }
    result.lsKeyCount=_lsKeyCount;
    result.lsTotalBytes=_lsTotalBytes;
  }catch(e){console.error("[Error]",e);}
  // Check IndexedDB — V10-fix: use safe set/delete instead of savePrimaryState which overwrites _primary_core
  try{
    if(typeof MediaDB!=='undefined'&&MediaDB.set){
      await MediaDB.set('__health_check__','1');
      const verify=await MediaDB.get('__health_check__');
      result.idbOk=(verify==='1');
      try{await MediaDB['delete']('__health_check__');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_68")}catch(_){}}
    }else{result.idbOk=true;} // MediaDB may not be initialized yet
  }catch(e){result.idbOk=false;}
  // V10-fix: Get IDB key count and estimated size
  try{
    if(typeof MediaDB!=='undefined'&&MediaDB.estimateSize){
      var _idbEst=await MediaDB.estimateSize();
      result.idbKeyCount=_idbEst.items||0;
      result.idbTotalBytes=_idbEst.bytes||0;
    }
  }catch(e){console.error("[Error]",e);}
  // Estimate storage
  try{
    if(navigator.storage&&navigator.storage.estimate){
      const est=await navigator.storage.estimate();
      result.usedMB=((est.usage||0)/1048576).toFixed(1);
      result.quotaMB=((est.quota||1)/1048576).toFixed(1);
      result.availableMB=(Math.max(0,(est.quota||0)-(est.usage||0))/1048576).toFixed(1);
    }
  }catch(e){console.error("[Error]",e);}
  // Count categories and questions
  try{
    if(typeof state!=='undefined'&&state.categories){
      result.categories=state.categories.length;
      result.questions=state.categories.reduce((s,c)=>s+(c.questions||[]).length,0);
    }
  }catch(e){console.error("[Error]",e);}
  return result;
}
// V10.2: Enhanced storage monitor V2 with detailed LS + IDB breakdown
async function showStorageMonitorV2(){
  const health=await checkStorageHealth();
  const lsStatus=health.localStorageOk?'✅':'❌';
  const idbStatus=health.idbOk?'✅':'❌';
  // V10.2: Also get IDB size estimate with key list
  var idbSize={bytes:0,items:0,keys:[],usedMB:'0.00'};
  try{idbSize=await MediaDB.estimateSize();}catch(e){console.error("[Error]",e);}
  var lsUsage=getStorageUsage();
  // V10.2: List localStorage quiz keys
  var lsQuizKeys=[];
  try{
    for(var _i=0;_i<localStorage.length;_i++){
      var _k=localStorage.key(_i);
      if(_k&&_k.indexOf('quiz')===0){
        var _v=localStorage.getItem(_k);
        lsQuizKeys.push({key:_k,size:(_v?_v.length*2:0),compressed:_k.endsWith('_lz')});
      }
    }
  }catch(e){console.error("[Error]",e);}
  var lsQuizSizeBytes=lsQuizKeys.reduce(function(s,k){return s+k.size;},0);
  var isAr=typeof state!=='undefined'&&state.settings.language!=='en';
  var dir=isAr?'rtl':'ltr';
  // Build detailed HTML
  var lsKeysHtml=lsQuizKeys.map(function(k){
    var sizeMB=(k.size/1048576).toFixed(3);
    var icon=k.compressed?'🗜️':'📄';
    return '<div style="display:flex;justify-content:space-between;font-size:.75rem;padding:2px 0;border-bottom:1px solid var(--border-color,rgba(255,255,255,.04))"><span>'+icon+' '+k.key+'</span><span style="color:var(--text-muted)">'+sizeMB+' MB</span></div>';
  }).join('');
  var idbKeysHtml=idbSize.keys.slice(0,20).map(function(k){
    return '<span style="font-size:.7rem;background:var(--bg-panel);padding:2px 6px;border-radius:4px;margin:2px;display:inline-block">'+k+'</span>';
  }).join('');
  if(idbSize.keys.length>20)idbKeysHtml+='<span style="font-size:.7rem;color:var(--text-muted)">+'+( idbSize.keys.length-20)+' more</span>';
  var info=`<div style="direction:${dir};line-height:1.7">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:.85rem;margin-bottom:10px">
      <div>💾 LS: ${lsStatus} (${lsUsage.usedMB} MB, ${health.lsKeyCount} keys)</div><div>📦 IDB: ${idbStatus} (${idbSize.usedMB} MB, ${health.idbKeyCount} keys)</div>
      <div>📈 ${I18n.t('storage.used','مستخدم')}: ${health.usedMB} MB</div><div>📉 ${I18n.t('storage.available','متاح')}: ${health.availableMB} MB</div>
      <div>📊 ${health.categories} ${I18n.t('admin.categoriesCount','أقسام')}</div><div>❓ ${health.questions} ${I18n.t('admin.questionsCount','أسئلة')}</div>
      <div>💾 LS Total: ${(health.lsTotalBytes/1048576).toFixed(2)} MB</div><div>📦 IDB Total: ${(health.idbTotalBytes/1048576).toFixed(2)} MB</div>
      <div>📊 Quota: ${health.quotaMB} MB</div><div>📈 Usage: ${health.usedMB} / ${health.quotaMB} MB (${health.quotaMB>0?Math.round((parseFloat(health.usedMB)/parseFloat(health.quotaMB))*100):0}%)</div>
    </div>
    <details style="margin-bottom:8px"><summary style="cursor:pointer;font-size:.8rem;font-weight:600">💾 LocalStorage Keys (${lsQuizKeys.length})</summary>
      <div style="margin-top:6px;max-height:200px;overflow-y:auto">${lsKeysHtml||'<span style="color:var(--text-muted);font-size:.75rem">No quiz keys found</span>'}</div>
    </details>
    <details><summary style="cursor:pointer;font-size:.8rem;font-weight:600">📦 IndexedDB Keys (${idbSize.items})</summary>
      <div style="margin-top:6px;max-height:200px;overflow-y:auto;display:flex;flex-wrap:wrap;gap:2px">${idbKeysHtml||'<span style="color:var(--text-muted);font-size:.75rem">No IDB keys found</span>'}</div>
    </details>
  </div>`;
  // Show in storage monitor UI area
  const monEl=document.getElementById('storage-monitor-info');
  if(monEl){
    monEl.innerHTML=info;
  }
  if(typeof toast==='function'){
    toast(I18n.t('storage.healthCheck','فحص التخزين')+': LS='+lsStatus+'('+lsUsage.usedMB+'MB) IDB='+idbStatus+'('+idbSize.usedMB+'MB) | '+health.usedMB+'MB / '+health.quotaMB+'MB','info');
  }
  return health;
}

// V11: Check storage space before save; warn if likely insufficient
function _checkStorageBeforeSave(){
  try{
    if(navigator.storage&&navigator.storage.estimate){
      navigator.storage.estimate().then(function(est){
        var usedMB=(est.usage||0)/1048576;
        var quotaMB=(est.quota||1)/1048576;
        if(quotaMB>0&&usedMB/quotaMB>0.9){
          toast(I18n.t('storage.almostFull',{pct:Math.round(usedMB/quotaMB*100),usedMB:usedMB.toFixed(1)}),'warning');
        }
      }).catch(function(e){_logErr(e,'storage:estimate')});
    }
  }catch(e){console.error("[Error]",e);}
}

async function _saveStateNow(){
  if(!_idbLoadDone){_pendingSaveNeeded=true;return;}
  // V11: Check storage space before saving
  _checkStorageBeforeSave();
  // Don't save large media data in main quiz_v4 key (save separately per question)
  const settingsClean={...state.settings};
  // Save category images separately
  const catImages={};
  state.categories.forEach(c=>{if(c.catImage)catImages[c.id]=c.catImage;});
  const teamImages={};
  state.teams.forEach(t=>{if(t.teamImage)teamImages[t.id]=t.teamImage;});
  const memberImages={};
  state.teams.forEach(t=>{
    const imgs={};
    (t.members||[]).forEach((m,i)=>{
      if(typeof m==='object'&&m.image){imgs[i]=m.image;}
    });
    if(Object.keys(imgs).length)memberImages[t.id]=imgs;
  });
  // V9: Dirty check — skip write if nothing changed
  // Avoid storing DEFAULT_BG_MUSIC in audioData — it's already embedded in the source code
  // (typeof guard prevents ReferenceError if 05-audio-assets.js failed to load)
  const _bgMusicConst = (typeof DEFAULT_BG_MUSIC !== 'undefined') ? DEFAULT_BG_MUSIC : null;
  const audioData={
    customMusicData:(_bgMusicConst && state.settings.customMusicData===_bgMusicConst)?null:state.settings.customMusicData,
    customCorrectData:state.settings.customCorrectData,
    customWrongData:state.settings.customWrongData,
    customTenseData:state.settings.customTenseData,
    podiumMusicData:state.settings.podiumMusicData,
    wheelMusicData:state.settings.wheelMusicData,
    certBgImage:state.settings.certBgImage,
  };
  settingsClean.customMusicData=!!state.settings.customMusicData;
  settingsClean.customCorrectData=!!state.settings.customCorrectData;
  settingsClean.customWrongData=!!state.settings.customWrongData;
  settingsClean.customTenseData=!!state.settings.customTenseData;
  settingsClean.podiumMusicData=!!state.settings.podiumMusicData;
  settingsClean.wheelMusicData=!!state.settings.wheelMusicData;
  settingsClean.certBgImage=!!state.settings.certBgImage;
  const teamsClean=state.teams.map(t=>{
    const tc={...t,teamImage:!!t.teamImage};
    tc.members=(t.members||[]).map(m=>typeof m==='object'?{name:m.name,icon:m.icon||''}:m);
    return tc;
  });
  // V10.1: Strip large media from categories before saving to localStorage (prevents QuotaExceededError)
  // Media is saved to IDB via saveAllMedia() — only keep placeholder 'true' in localStorage
  // V11.0: _stripCatMedia is now a module-level function (not re-created on every save)
  const categoriesClean=_stripCatMedia(state.categories);
  // Quick JSON fingerprint for dirty checking (exclude images/audio which are saved separately)
  const fingerprint=JSON.stringify({s:settingsClean,c:categoriesClean,t:teamsClean,cr:state.credits,solo:state.soloProgress});
  if(fingerprint===_lastSavedJSON){
    // V11-PERF: Core data unchanged — skip the expensive IDB scan entirely.
    // Media is only saved when explicitly dirtied (image upload, audio change),
    // tracked via _mediaDirty flag (set by addCatImage/editAudio/etc).
    // Previous code called MediaDB.saveAllMedia() on EVERY no-op save, causing
    // 500+ IDB round-trips per save on media-heavy quizzes.
    if(typeof _mediaDirty!=='undefined' && _mediaDirty){
      try{MediaDB.saveAllMedia().then(function(){_mediaDirty=false;}).catch(function(e){_logErr(e,'MediaDB:saveAllMedia-dirtyCheck')});}catch(e){console.error("[Error]",e);}
    }
    return;
  }
  // V10-fix: Do NOT set _lastSavedJSON here — only set after saves succeed to prevent data loss on write failure
  // V10: LZ-String compression for localStorage (reduces size by ~50-70%)
  // V11.0: _compressLZ is now a module-level function (not re-created on every save)
  // V10.1-fix: Declare catImgData/teamImgData at function scope so they're accessible below
  var catImgData=null;
  var teamImgData=null;
  try{
    catImgData=_compressLZ(catImages);
    localStorage.setItem('quiz_v4_catimg',catImgData.data);
    localStorage.setItem('quiz_v4_catimg_lz',catImgData.compressed?'1':'0');
  }catch(e){try{ErrorBus.capture(e,"catch#1")}catch(e2){_logErr(e2,'saveState:catch1-inner')}}
  try{
    teamImgData=_compressLZ({teamImages,memberImages});
    localStorage.setItem('quiz_v4_teamimg',teamImgData.data);
    localStorage.setItem('quiz_v4_teamimg_lz',teamImgData.compressed?'1':'0');
  }catch(e){try{ErrorBus.capture(e,"catch#2")}catch(e2){_logErr(e2,'saveState:catch2-inner')}}
  try{
    const coreData=_compressLZ({settings:settingsClean,categories:categoriesClean,teams:teamsClean,credits:state.credits,soloProgress:state.soloProgress});
    localStorage.setItem('quiz_v4',coreData.data);
    localStorage.setItem('quiz_v4_lz',coreData.compressed?'1':'0');
  }
  catch(e){
    ErrorBus.capture(e,'saveState.localStorage');
    // NEVER delete or reset data — try critical-only fallback
    if(e&&(e.name==='QuotaExceededError'||e.code===22||e.code===1014)){
      // Fallback 1: Try to save only critical data (no images/audio) with compression
      try{
        var _criticalOnly={settings:{...settingsClean},categories:categoriesClean.map(function(c){
          var cc={...c};delete cc.catImage;
          // Also strip question media that might have been missed
          cc.questions=(cc.questions||[]).map(function(q){
            var qClean={...q};delete qClean.mediaData;
            if(qClean.mediaAttachment)qClean.mediaAttachment={...qClean.mediaAttachment,data:true};
            if(qClean.optionImages)qClean.optionImages=qClean.optionImages.map(function(img){return img?true:img;});
            return qClean;
          });
          return cc;
        }),teams:state.teams.map(function(t){
          var tc={...t};delete tc.teamImage;tc.members=(t.members||[]).map(function(m){return typeof m==='object'?{name:m.name,icon:m.icon||''}:m;});return tc;
        }),credits:state.credits,soloProgress:state.soloProgress};
        var critCompressed=_compressLZ(_criticalOnly);
        localStorage.setItem('quiz_v4',critCompressed.data);
        localStorage.setItem('quiz_v4_lz',critCompressed.compressed?'1':'0');
        // V10-fix: Do NOT delete LS image keys here — wait for IDB save to complete first
        // (moved to after IDB saves below)
        toast(typeof I18n!=='undefined'?I18n.t('storage.criticalFallback'):'⚠️ تعذّر حفظ بعض البيانات — تم حفظ الأساسيات فقط','warning');
      }catch(e2){
        // Fallback 2: Even critical-only failed — IDB is our safety net
        ErrorBus.capture(e2,'saveState.criticalFallback');
        // V10.2-fix: Instead of just showing "export your data", actually migrate to IDB with progress
        var _qMsg='';
        if(e2&&(e2.name==='QuotaExceededError'||e2.code===22||e2.code===1014)){
          _qMsg='⚠️ '+I18n.t('storage.quotaExceeded','حصة التخزين ممتلئة');
        }else{
          _qMsg='⚠️ '+I18n.t('storage.saveFailed','تعذّر الحفظ');
        }
        toast(typeof I18n!=='undefined'?_qMsg:t('toast.saveFailed'),'danger');
        // V10.2-fix: Automatically migrate to IndexedDB with real progress
        try{
          if(typeof MediaDB!=='undefined'&&MediaDB.migrateAllToIDB){
            toast(I18n.t('storage.migratingToIDB','جاري نقل البيانات إلى IndexedDB...'),'info');
            var _migrateResult=await MediaDB.migrateAllToIDB();
            var _okCount=_migrateResult.results.filter(function(r){return r.ok;}).length;
            if(_okCount===_migrateResult.total){
              toast('✅ '+I18n.t('storage.migrateSuccess','تم نقل البيانات بنجاح إلى IndexedDB'),'success');
              console.info('[saveState] Data migrated to IDB successfully');
            }else if(_okCount>0){
              toast('⚠️ '+I18n.t('storage.migratePartial','تم نقل بعض البيانات').replace('{ok}',_okCount).replace('{total}',_migrateResult.total),'warning');
            }else{
              toast('❌ '+I18n.t('storage.migrateFailed','فشل نقل البيانات — صدّر بياناتك فوراً'),'danger');
            }
          }
        }catch(migrateErr){
          console.error('[saveState] IDB migration failed:',migrateErr);
          toast('❌ '+I18n.t('storage.exportUrgent','صدِّر بياناتك فوراً'),'danger');
        }
      }
    }else{
      toast(typeof I18n!=='undefined'?I18n.t('storage.saveFailed'):'تعذّر الحفظ — جرّب تصدير البيانات','danger');
    }
  }
  // V10-fix: Save to IDB FIRST, then delete LS image keys after confirmation
  // V10.2-fix: Verify IDB media was actually saved before removing LS keys
  // V10-fix: Always save primary state to IDB for persistence guarantee
  var _idbMediaSaved=false;
  var _idbMediaVerified=false;
  try{
    var _mediaResult=await MediaDB.saveAllMedia();
    // V10.2-fix: Check if saveAllMedia returned success details
    if(_mediaResult&&typeof _mediaResult==='object'){
      _idbMediaSaved=(_mediaResult.failed===0);
      if(!_idbMediaSaved&&_mediaResult.failed>0){
        console.warn('[saveState] IDB media save: '+_mediaResult.failed+' items failed');
      }
    }else{
      // Legacy return (just a number) — treat as success if >0 or no items to save
      _idbMediaSaved=true;
    }
    // V10.2-fix: Verify critical media is actually in IDB before removing LS keys
    if(_idbMediaSaved){
      _idbMediaVerified=true;
      // Quick verification: check if team images are in IDB
      for(var _vi=0;_vi<state.teams.length;_vi++){
        var _t=state.teams[_vi];
        if(_t.teamImage&&typeof _t.teamImage==='string'&&_t.teamImage.length>500){
          var _check=await MediaDB.get('ti_'+_t.id);
          if(!_check){_idbMediaVerified=false;console.warn('[saveState] IDB verification failed for team image: ti_'+_t.id);break;}
        }
      }
    }
  }catch(e){try{ErrorBus.capture(e,"catch#3")}catch(e2){_logErr(e2,'saveState:catch3-inner')}}
  try{await MediaDB.saveCoreData();}catch(e){console.error("[Error]",e);}
  // ── V9.2: Also save primary state to IndexedDB (replaces localStorage as primary) ──
  try{
    // Save FULL state to IDB (with media references) — this is the authoritative backup
    const coreStr=JSON.stringify({settings:settingsClean,categories:categoriesClean,teams:teamsClean,credits:state.credits,soloProgress:state.soloProgress});
    // V11.0-fix: Decompress LZ data before saving to IDB (loadPrimaryState expects raw JSON, not LZ-compressed)
    // _decompressForIDB is now a module-level function
    await MediaDB.savePrimaryState(coreStr,_decompressForIDB(catImgData),_decompressForIDB(teamImgData));
    // V10-fix: Only mark state as saved after IDB primary save succeeds
    _lastSavedJSON=fingerprint;
  }catch(e){console.error("[Error]",e);}
  // V10-fix: Now safe to remove LS image/audio keys — IDB has confirmed the data
  // V10.2-fix: Only remove if IDB media was verified (not just "attempted")
  if(_idbMediaVerified){
    try{localStorage.removeItem('quiz_v4_catimg');localStorage.removeItem('quiz_v4_catimg_lz');}catch(e){_logErr(e,'localStorage:removeCatImg')}
    try{localStorage.removeItem('quiz_v4_teamimg');localStorage.removeItem('quiz_v4_teamimg_lz');}catch(e){_logErr(e,'localStorage:removeTeamImg')}
    try{localStorage.removeItem('quiz_v4_audio');}catch(e){_logErr(e,'localStorage:removeAudio')}
  }
  // V14: Audio data is saved ONLY to IndexedDB (never localStorage for files >100KB)
  // Each audio key is saved individually via MediaDB.saveAllMedia above
  // Save only metadata (boolean flags) to localStorage as a lightweight reference
  var _audioMeta={};
  ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData'].forEach(function(k){
    _audioMeta[k]=!!state.settings[k]; // just save boolean flag, not the actual data
  });
  try{localStorage.setItem('quiz_v4_audio_meta',JSON.stringify(_audioMeta))}catch(e){console.error("[Error]",e);}
  // Auto-save notification (only after app is fully loaded, max every 60s)
  try{/* auto-save notification removed — save is invisible */}catch(e){}
  // V11-fix: Clear the debounce timer id so SmartSave polling can detect completion
  _saveStateTimer=null;
}

// V9: Force immediate save (for beforeunload and critical operations)
// V10-fix: _saveStateNow is now async; saveStateSync fires it and returns the promise
// V10.3-fix: Declared async to properly return Promise from _saveStateNow()
async function saveStateSync(){
  if(_saveStateTimer)TimerRegistry.clear(_saveStateTimer);
  return _saveStateNow();
}
// V7: Async wrapper for saveState — use in beforeunload / when storage estimate is needed
async function saveStateAsync(){
  try{
    if(navigator.storage&&navigator.storage.estimate){
      const est=await navigator.storage.estimate();
      const usedMB=(est.usage||0)/1048576;
      const quotaMB=(est.quota||1)/1048576;
      if(quotaMB>0&&usedMB/quotaMB>0.9){
        toast(I18n.t('toast.storageOver90',{used:usedMB.toFixed(1),quota:quotaMB.toFixed(1)}),'danger');
      }
    }
    try{await saveStateSync();}catch(e){console.error("[Error]",e);}  // V10.3-fix: properly await the async save
    return true;
  }catch(e){ErrorBus.capture(e,'saveStateAsync');return false;}
}


// Debounced version of saveGameProgress — prevents excessive LS writes
let _sgpTimer=null;
function saveGameProgressDebounced(){
  clearTimeout(_sgpTimer);
  _sgpTimer=setTimeout(saveGameProgress,500);
}

function saveGameProgress(){
  if(!state.gameActive)return;
  const prog={
    usedQuestions:{},teamLifelines:state.teamLifelines,
    currentTeamIndex:state.currentTeamIndex,
    fullCatQueue:state.fullCatQueue,fullCatQueuePos:state.fullCatQueuePos,
    currentCatId:state.currentCatId,
    savedAt:new Date().toISOString(),
    compName:state.settings.name,
    sessionStats:state.sessionStats,
    teamStreaks:state.teamStreaks,
  };
  Object.entries(state.usedQuestions).forEach(([k,v])=>{prog.usedQuestions[k]=[...v]});
  try{localStorage.setItem('quiz_v4_progress',JSON.stringify(prog))}catch(e){try{ErrorBus.capture(e,"catch#5")}catch(e2){_logErr(e2,'localStorage:saveGameProgress-inner')}}
}

function loadGameProgress(){
  try{const raw=localStorage.getItem('quiz_v4_progress');if(!raw)return null;const p=JSON.parse(raw);
    // Basic validation of critical fields to prevent runtime errors
    if(p&&typeof p==='object'){
      if(typeof p.currentTeamIndex==='number'&&state.teams&&p.currentTeamIndex>=state.teams.length)p.currentTeamIndex=0;
      if(p.currentCatId&&state.categories&&!state.categories.find(c=>c.id===p.currentCatId))p.currentCatId=null;
      if(typeof p.fullCatQueuePos==='number'&&p.fullCatQueue&&p.fullCatQueuePos>=p.fullCatQueue.length)p.fullCatQueuePos=0;
    }
    return p;
  }catch(e){_logErr(e,'localStorage:loadGameProgress');return null}
}

function clearGameProgress(){
  localStorage.removeItem('quiz_v4_progress');
}
let _idbLoadDone=false;   // true after IDB phase completes
let _pendingSaveNeeded=false; // saveState was called before IDB finished
