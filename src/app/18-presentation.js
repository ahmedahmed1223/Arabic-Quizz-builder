// ═══════════════════════════════════════════════════════════════
//  SCREEN HELP / INSTRUCTIONS MODAL
// ═══════════════════════════════════════════════════════════════

function showScreenHelp(){
  const lang=state.settings.language||'ar';
  const isAr=lang==='ar';
  const remoteTitle=I18n.t('screenHelp.remoteTitle');
  const remoteDesc=I18n.t('screenHelp.remoteDesc');
  const audienceTitle=I18n.t('screenHelp.audienceTitle');
  const audienceDesc=I18n.t('screenHelp.audienceDesc');
  const setupTitle=I18n.t('screenHelp.setupTitle');
  const setupDesc=I18n.t('screenHelp.setupDesc');
  const troubleTitle=I18n.t('screenHelp.troubleTitle');
  const troubleDesc=I18n.t('screenHelp.troubleDesc');

  const html=`<div style="direction:${isAr?'rtl':'ltr'};line-height:1.8">
    <div style="background:var(--bg-panel);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-weight:900;font-size:1.05rem;margin-bottom:8px;color:var(--accent2)">${remoteTitle}</div>
      <div style="font-size:.88rem;color:var(--text-secondary)">${remoteDesc}</div>
    </div>
    <div style="background:var(--bg-panel);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-weight:900;font-size:1.05rem;margin-bottom:8px;color:var(--accent2)">${audienceTitle}</div>
      <div style="font-size:.88rem;color:var(--text-secondary)">${audienceDesc}</div>
    </div>
    <div style="background:var(--bg-panel);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:12px">
      <div style="font-weight:900;font-size:1.05rem;margin-bottom:8px;color:var(--accent1)">${setupTitle}</div>
      <div style="font-size:.85rem;color:var(--text-secondary)">${setupDesc}</div>
    </div>
    <div style="background:var(--bg-panel);border:1px solid var(--border);border-radius:12px;padding:16px">
      <div style="font-weight:900;font-size:1.05rem;margin-bottom:8px;color:var(--danger)">${troubleTitle}</div>
      <div style="font-size:.85rem;color:var(--text-secondary)">${troubleDesc}</div>
    </div>
  </div>`;
  openGenericModal(I18n.t('screenHelp.modalTitle'),html);
}

// ═══════════════════════════════════════════════════════════════
//  STORAGE STABILITY & MONITOR
// ═══════════════════════════════════════════════════════════════

function getStorageUsage(){
  let totalSize=0;
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      const val=localStorage.getItem(key);
      if(val)totalSize+=key.length+val.length;
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  // Rough byte estimate (2 bytes per char for UTF-16)
  const usedBytes=totalSize*2;
  const maxBytes=5*1024*1024; // Typical 5MB limit
  return{usedBytes,maxBytes,pct:Math.round(usedBytes/maxBytes*100),usedMB:(usedBytes/1024/1024).toFixed(2)};
}

// V10: Enhanced Storage Monitor with localStorage + IndexedDB breakdown
async function showStorageMonitor(){
  const isAr=state.settings.language!=='en';
  const dir=isAr?'rtl':'ltr';
  const lsUsage=getStorageUsage();
  const lsPct=lsUsage.pct;
  const lsBarColor=lsPct>80?'var(--danger)':lsPct>60?'var(--accent1)':'var(--success)';

  // V10: Get IndexedDB size estimate
  var idbInfo={bytes:0,items:0,keys:[],usedMB:'0.00'};
  try{if(typeof MediaDB!=='undefined')idbInfo=await MediaDB.estimateSize();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  // V10: Get navigator.storage.estimate for total storage quota
  var totalUsedMB='—', totalQuotaMB='—', totalPct=0;
  try{
    if(navigator.storage&&navigator.storage.estimate){
      var est=await navigator.storage.estimate();
      totalUsedMB=((est.usage||0)/1048576).toFixed(1);
      totalQuotaMB=((est.quota||0)/1048576).toFixed(1);
      totalPct=est.quota?Math.round((est.usage||0)/(est.quota||1)*100):0;
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  // V10.3: Detailed localStorage key listing
  var lsKeyDetails=[];
  try{
    for(var i=0;i<localStorage.length;i++){
      var k=localStorage.key(i);
      if(k){
        var v=localStorage.getItem(k)||'';
        var sizeBytes=(k.length*2)+(v.length*2);
        lsKeyDetails.push({key:k,sizeKB:(sizeBytes/1024).toFixed(1),sizeBytes:sizeBytes});
      }
    }
    lsKeyDetails.sort(function(a,b){return b.sizeBytes-a.sizeBytes;});
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  var lsKeys={quiz:0,other:0};
  try{lsKeyDetails.forEach(function(d){if(d.key.indexOf('quiz')===0)lsKeys.quiz++;else lsKeys.other++;});}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  // V10.3: IDB primary state check
  var idbPrimaryStatus=I18n.t('storage.idbUnknown');
  var idbPrimaryVersion='';
  try{
    if(typeof MediaDB!=='undefined'&&MediaDB.hasPrimaryState){
      var hasPS=await MediaDB.hasPrimaryState();
      if(hasPS){
        var psData=await MediaDB.loadPrimaryState();
        if(psData&&psData.core){
          idbPrimaryStatus=I18n.t('storage.idbAvailable');
          idbPrimaryVersion=psData.version?' (v'+psData.version+')':'';
          // Check if categories have questions
          try{
            var psParsed=JSON.parse(psData.core);
            var psQCount=0;(psParsed.categories||[]).forEach(function(c){psQCount+=(c.questions||[]).length;});
            idbPrimaryStatus+=' — '+psParsed.categories.length+' '+I18n.t('statsGrid.categories')+', '+psQCount+' '+I18n.t('statsGrid.questions');
          }catch(e){try{ErrorBus.capture(e,"catch#AUTO_96")}catch(_){}}
        }else{
          idbPrimaryStatus=I18n.t('storage.idbEmpty');
        }
      }else{
        idbPrimaryStatus=I18n.t('storage.idbNotFound');
      }
    }
  }catch(e){idbPrimaryStatus=I18n.t('storage.idbError');}

  var idbPct=idbInfo.bytes>0&&totalQuotaMB!=='—'?Math.round(idbInfo.bytes/(parseFloat(totalQuotaMB)*1048576)*100):0;
  var idbBarColor=idbPct>80?'var(--danger)':idbPct>60?'var(--accent1)':'var(--success)';
  var totalBarColor=totalPct>80?'var(--danger)':totalPct>60?'var(--accent1)':'var(--success)';

  var dangerAlert=lsPct>80?'<div class="alert alert-danger" style="font-size:.85rem">'+I18n.t('storage.warning')+'</div>':'';

  // V10.3: Top localStorage keys table
  var topLsKeysHtml='';
  try{
    var topKeys=lsKeyDetails.slice(0,10);
    topLsKeysHtml=topKeys.map(function(d){
      var barW=Math.min(Math.round(d.sizeBytes/51200*100),100);
      var barC=d.sizeBytes>30000?'var(--danger)':d.sizeBytes>10000?'var(--accent1)':'var(--success)';
      return '<div style="display:flex;align-items:center;gap:6px;font-size:.72rem;margin:2px 0">'+
        '<span style="min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;direction:ltr;text-align:left" title="'+d.key+'">'+d.key+'</span>'+
        '<div style="flex:1;background:var(--bg-panel);border-radius:4px;height:10px;overflow:hidden;border:1px solid var(--border)">'+
        '<div style="width:'+barW+'%;height:100%;background:'+barC+';border-radius:4px"></div></div>'+
        '<span style="min-width:50px;text-align:left;direction:ltr">'+d.sizeKB+' KB</span></div>';
    }).join('');
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  // V10.3: IDB key listing
  var idbKeysHtml='';
  try{
    var idbKeys=idbInfo.keys||[];
    var topIdbKeys=idbKeys.slice(0,10);
    idbKeysHtml=topIdbKeys.map(function(k){
      return '<span style="display:inline-block;padding:2px 6px;margin:2px;border-radius:4px;background:var(--bg-panel);font-size:.7rem;direction:ltr">'+k+'</span>';
    }).join('');
    if(idbKeys.length>10)idbKeysHtml+='<span style="font-size:.7rem;color:var(--text-muted)"> +'+( idbKeys.length-10)+' more</span>';
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  var html=`<div style="direction:${dir};line-height:1.7">
    <!-- Total Storage (navigator.storage) -->
    <div style="margin-bottom:14px;padding:12px;border-radius:10px;background:var(--bg-secondary,rgba(255,255,255,.04));border:1px solid var(--border-color,rgba(255,255,255,.08))">
      <div style="font-weight:700;font-size:.95rem;margin-bottom:8px">${I18n.t('storage.totalStorageLabel')} <span style="font-weight:400;color:var(--text-muted);font-size:.8rem">(navigator.storage)</span></div>
      <div style="background:var(--bg-panel);border-radius:8px;height:20px;overflow:hidden;border:1px solid var(--border)">
        <div style="width:${Math.min(totalPct,100)}%;height:100%;background:${totalBarColor};border-radius:8px;transition:width .5s;display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:900;color:#fff">${totalPct}%</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-muted);margin-top:4px">
        <span>${I18n.t('storage.used')}: ${totalUsedMB} MB</span>
        <span>${I18n.t('storage.quota')}: ${totalQuotaMB} MB</span>
      </div>
    </div>

    <!-- LocalStorage Section -->
    <div style="margin-bottom:14px;padding:12px;border-radius:10px;background:var(--bg-secondary,rgba(255,255,255,.04));border:1px solid var(--border-color,rgba(255,255,255,.08))">
      <div style="font-weight:700;font-size:.95rem;margin-bottom:8px">💾 ${I18n.t('storage.lsUsage','localStorage')}</div>
      <div style="background:var(--bg-panel);border-radius:8px;height:18px;overflow:hidden;border:1px solid var(--border)">
        <div style="width:${Math.min(lsPct,100)}%;height:100%;background:${lsBarColor};border-radius:8px;transition:width .5s;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:900;color:#fff">${lsPct}%</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-muted);margin-top:4px">
        <span>${I18n.t('storage.used')}: ${lsUsage.usedMB} MB / 5 MB</span>
        <span>${I18n.t('storage.keys')}: ${lsKeys.quiz} quiz + ${lsKeys.other} ${I18n.t('storage.other')}</span>
      </div>
      ${topLsKeysHtml?'<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)"><div style="font-size:.78rem;font-weight:600;margin-bottom:4px">'+I18n.t('storage.topKeys')+'</div>'+topLsKeysHtml+'</div>':''}
    </div>

    <!-- IndexedDB Section -->
    <div style="margin-bottom:14px;padding:12px;border-radius:10px;background:var(--bg-secondary,rgba(255,255,255,.04));border:1px solid var(--border-color,rgba(255,255,255,.08))">
      <div style="font-weight:700;font-size:.95rem;margin-bottom:8px">📦 ${I18n.t('storage.idbUsage','IndexedDB')}</div>
      <div style="background:var(--bg-panel);border-radius:8px;height:18px;overflow:hidden;border:1px solid var(--border)">
        <div style="width:${Math.min(idbPct,100)}%;height:100%;background:${idbBarColor};border-radius:8px;transition:width .5s;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:900;color:#fff">${idbPct}%</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.75rem;color:var(--text-muted);margin-top:4px">
        <span>${I18n.t('storage.used')}: ${idbInfo.usedMB} MB</span>
        <span>${I18n.t('storage.idbItems')}: ${idbInfo.items} | ${I18n.t('storage.keys')}: ${idbInfo.keys.length}</span>
      </div>
      <div style="margin-top:6px;font-size:.78rem"><b>${I18n.t('storage.primaryState')}</b> ${idbPrimaryStatus}${idbPrimaryVersion}</div>
      ${idbKeysHtml?'<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border)"><div style="font-size:.72rem;font-weight:600;margin-bottom:4px">'+I18n.t('storage.keysLabel')+'</div>'+idbKeysHtml+'</div>':''}
    </div>

    ${dangerAlert}

    <!-- Actions -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      <button class="btn btn-primary btn-sm" onclick="exportData()">${I18n.t('export.zip')||'تصدير'}</button>
      <button class="btn btn-accent btn-sm" onclick="migrateToIDBUi()" id="migrate-to-idb-btn">🔄 ${I18n.t('storage.migrateToIDB','نقل إلى IndexedDB')}</button>
      <button class="btn btn-ghost btn-sm" onclick="try{MediaDB.pruneOrphaned().then(function(c){toast(I18n.t('storage.migrateOK'),'success');showStorageMonitor();}).catch(function(){toast(I18n.t('toast.error'),'danger');});}catch(e){toast(I18n.t('toast.error'),'danger');}">🗑️ ${I18n.t('storage.cleanOrphaned')}</button>
    </div>
    <!-- Migration progress -->
    <div id="idb-migrate-progress" style="margin-top:10px;display:none">
      <div style="background:var(--bg-panel);border-radius:8px;height:14px;overflow:hidden;border:1px solid var(--border)">
        <div id="idb-migrate-bar" style="width:0%;height:100%;background:var(--accent2);border-radius:8px;transition:width .3s"></div>
      </div>
      <div id="idb-migrate-status" style="font-size:.75rem;color:var(--text-muted);margin-top:4px"></div>
    </div>
  </div>`;
  openGenericModal(I18n.t('storage.monitor'),html);
}

// V10: Migrate data to IDB with real progress indicator
async function migrateToIDBUi(){
  var progEl=document.getElementById('idb-migrate-progress');
  var barEl=document.getElementById('idb-migrate-bar');
  var statusEl=document.getElementById('idb-migrate-status');
  var btnEl=document.getElementById('migrate-to-idb-btn');
  if(!progEl||!barEl||!statusEl)return;
  progEl.style.display='block';
  if(btnEl)btnEl.disabled=true;
  try{
    var result=await MediaDB.migrateAllToIDB(function(current,total,stepName){
      var pct=Math.round(current/total*100);
      barEl.style.width=pct+'%';
      statusEl.textContent=I18n.t('storage.migratingProgress','Migrating...').replace('{current}',current).replace('{total}',total)+' — '+stepName;
    });
    barEl.style.width='100%';
    var okCount=result.results.filter(function(r){return r.ok;}).length;
    if(okCount===result.total){
      statusEl.textContent='✅ '+I18n.t('storage.migrateSuccess');
      toast(I18n.t('storage.migrateSuccess'),'success');
      // V10: After successful migration, remove large LS keys that are now safely in IDB
      try{localStorage.removeItem('quiz_v4_catimg');localStorage.removeItem('quiz_v4_catimg_lz');}catch(e){_logErr(e,'localStorage:migrateUI-removeCatImg')}
      try{localStorage.removeItem('quiz_v4_teamimg');localStorage.removeItem('quiz_v4_teamimg_lz');}catch(e){_logErr(e,'localStorage:migrateUI-removeTeamImg')}
      try{localStorage.removeItem('quiz_v4_audio');}catch(e){_logErr(e,'localStorage:migrateUI-removeAudio')}
    }else if(okCount>0){
      var msg=I18n.t('storage.migratePartial').replace('{ok}',okCount).replace('{total}',result.total);
      statusEl.textContent='⚠️ '+msg;
      toast(msg,'warning');
    }else{
      statusEl.textContent='❌ '+I18n.t('storage.migrateFail');
      toast(I18n.t('storage.migrateFail'),'danger');
    }
  }catch(e){
    statusEl.textContent='❌ '+I18n.t('storage.migrateFail');
    toast(I18n.t('storage.migrateFail'),'danger');
  }
  if(btnEl)btnEl.disabled=false;
}

// V10-fix: Removed redundant saveState error wrapper — error handling is now built into _saveStateNow directly
// The async _saveStateNow function handles QuotaExceededError internally with IDB fallback

async function _migrateLargeMediaToIDB(){
  try{
    // V11.0-fix: Await all IDB writes to prevent data loss from unhandled rejections
    var promises=[];
    // Migrate media data from state to IDB only (not in localStorage)
    var mediaKeys=['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'];
    mediaKeys.forEach(function(k){
      if(state.settings[k]&&typeof state.settings[k]==='string'&&state.settings[k].length>500){
        promises.push(MediaDB.set('s_'+k,state.settings[k]).catch(function(e){_logErr(e,'MediaDB:setSettingMedia')}));
      }
    });
    // V10.1: Also migrate category/question/team media to IDB
    state.categories.forEach(function(c){
      if(c.catImage&&typeof c.catImage==='string'&&c.catImage.length>500){
        promises.push(MediaDB.set('ci_'+c.id,c.catImage).catch(function(e){_logErr(e,'MediaDB:setCatImg-migrate')}));
      }
      (c.questions||[]).forEach(function(q){
        if(q.mediaData&&typeof q.mediaData==='string'&&q.mediaData.length>500){
          promises.push(MediaDB.set('qm_'+q.id,q.mediaData).catch(function(e){_logErr(e,'MediaDB:setQuestionMedia-migrate')}));
        }
        if(q.mediaAttachment&&q.mediaAttachment.data&&typeof q.mediaAttachment.data==='string'&&q.mediaAttachment.data.length>500){
          promises.push(MediaDB.set('qma_'+q.id,q.mediaAttachment).catch(function(e){_logErr(e,'MediaDB:setQuestionAttachment-migrate')}));
        }
        if(q.optionImages&&Array.isArray(q.optionImages)){
          q.optionImages.forEach(function(img,idx){
            if(img&&typeof img==='string'&&img.length>500){
              promises.push(MediaDB.set('qo_'+q.id+'_'+idx,img).catch(function(e){_logErr(e,'MediaDB:setOptionImg-migrate')}));
            }
          });
        }
      });
    });
    state.teams.forEach(function(t){
      if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500){
        promises.push(MediaDB.set('ti_'+t.id,t.teamImage).catch(function(e){_logErr(e,'MediaDB:setTeamImg-migrate')}));
      }
      if(t.members&&Array.isArray(t.members)){
        t.members.forEach(function(m,idx){
          if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500){
            promises.push(MediaDB.set('mi_'+t.id+'_'+idx,m.image).catch(function(e){_logErr(e,'MediaDB:setMemberImg-migrate')}));
          }
        });
      }
    });
    await Promise.allSettled(promises);
  }catch(e){console.warn('[migrateLargeMedia]',e);}
}

// ═══════════════════════════════════════════════════════════════
//  REFERENCE-BASED FILE MODE + ZIP EXPORT/IMPORT (JSZip inline)
// ═══════════════════════════════════════════════════════════════

// Minimal JSZip implementation for offline use
const JSZip=(function(){
  // Simple ZIP builder using CompressionMethod=STORE (no compression needed for offline use)
  function JSZip(){this.files={};}
  function crc32(buf){
    var crc=0xFFFFFFFF;
    for(var i=0;i<buf.length;i++){
      crc=(crc>>>8)^crc32Table[(crc^buf[i])&0xFF];
    }
    return (crc^0xFFFFFFFF)>>>0;
  }
  var crc32Table=(function(){
    var table=[];
    for(var i=0;i<256;i++){
      var c=i;
      for(var j=0;j<8;j++){
        c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
      }
      table[i]=c;
    }
    return table;
  })();
  function strToUint8(str){
    var buf=new Uint8Array(str.length);
    for(var i=0;i<str.length;i++)buf[i]=str.charCodeAt(i);
    return buf;
  }
  function uint8ToStr(u8){
    var s='';for(var i=0;i<u8.length;i++)s+=String.fromCharCode(u8[i]);
    return s;
  }
  JSZip.prototype.file=function(name,data){
    if(typeof data==='string')data=strToUint8(data);
    this.files[name]={data:data,isDir:false};
    return this;
  };
  JSZip.prototype.generateAsync=function(opts){
    return new Promise((resolve)=>{
      var localHeaders='';
      var centralHeaders='';
      var offset=0;
      var fileNames=Object.keys(this.files);
      for(var i=0;i<fileNames.length;i++){
        var fname=fileNames[i];
        var f=this.files[fname];
        var fnameBytes=strToUint8(fname);
        var data=f.data;
        var crc=crc32(data);
        // Local file header
        var local=String.fromCharCode(0x50,0x4B,0x03,0x04)// signature
          +String.fromCharCode(20,0)// version needed
          +String.fromCharCode(0,0)// flags
          +String.fromCharCode(0,0)// compression: STORE
          +String.fromCharCode(0,0)// mod time
          +String.fromCharCode(0,0)// mod date
          +String.fromCharCode(crc&0xFF,(crc>>8)&0xFF,(crc>>16)&0xFF,(crc>>24)&0xFF)// crc32
          +String.fromCharCode(data.length&0xFF,(data.length>>8)&0xFF,(data.length>>16)&0xFF,(data.length>>24)&0xFF)// compressed size
          +String.fromCharCode(data.length&0xFF,(data.length>>8)&0xFF,(data.length>>16)&0xFF,(data.length>>24)&0xFF)// uncompressed size
          +String.fromCharCode(fnameBytes.length&0xFF,(fnameBytes.length>>8)&0xFF)// fname length
          +String.fromCharCode(0,0)// extra field length
          +uint8ToStr(fnameBytes)
          +uint8ToStr(data);
        localHeaders+=local;
        // Central directory header
        var central=String.fromCharCode(0x50,0x4B,0x01,0x02)// signature
          +String.fromCharCode(0,0)// made by
          +String.fromCharCode(20,0)// version needed
          +String.fromCharCode(0,0)// flags
          +String.fromCharCode(0,0)// compression
          +String.fromCharCode(0,0)// mod time
          +String.fromCharCode(0,0)// mod date
          +String.fromCharCode(crc&0xFF,(crc>>8)&0xFF,(crc>>16)&0xFF,(crc>>24)&0xFF)
          +String.fromCharCode(data.length&0xFF,(data.length>>8)&0xFF,(data.length>>16)&0xFF,(data.length>>24)&0xFF)
          +String.fromCharCode(data.length&0xFF,(data.length>>8)&0xFF,(data.length>>16)&0xFF,(data.length>>24)&0xFF)
          +String.fromCharCode(fnameBytes.length&0xFF,(fnameBytes.length>>8)&0xFF)
          +String.fromCharCode(0,0)// extra field length
          +String.fromCharCode(0,0)// comment length
          +String.fromCharCode(0,0)// disk start
          +String.fromCharCode(0,0)// internal attr
          +String.fromCharCode(0,0,0,0)// external attr
          +String.fromCharCode(offset&0xFF,(offset>>8)&0xFF,(offset>>16)&0xFF,(offset>>24)&0xFF)// offset
          +uint8ToStr(fnameBytes);
        centralHeaders+=central;
        offset+=local.length;
      }
      var centralOffset=offset;
      var centralSize=centralHeaders.length;
      var endRecord=String.fromCharCode(0x50,0x4B,0x05,0x06)// signature
        +String.fromCharCode(0,0,0,0)// disk numbers
        +String.fromCharCode(fileNames.length&0xFF,(fileNames.length>>8)&0xFF,0,0)// entries on disk
        +String.fromCharCode(fileNames.length&0xFF,(fileNames.length>>8)&0xFF,0,0)// total entries
        +String.fromCharCode(centralSize&0xFF,(centralSize>>8)&0xFF,(centralSize>>16)&0xFF,(centralSize>>24)&0xFF)// central dir size
        +String.fromCharCode(centralOffset&0xFF,(centralOffset>>8)&0xFF,(centralOffset>>16)&0xFF,(centralOffset>>24)&0xFF)// central dir offset
        +String.fromCharCode(0,0);// comment length
      var zipStr=localHeaders+centralHeaders+endRecord;
      // Convert to Uint8Array
      var buf=new Uint8Array(zipStr.length);
      for(var k=0;k<zipStr.length;k++)buf[k]=zipStr.charCodeAt(k);
      resolve(new Blob([buf],{type:'application/zip'}));
    });
  };
  // Simple ZIP reader
  JSZip.loadAsync=function(blob){
    return new Promise((resolve,reject)=>{
      var reader=new FileReader();
      reader.onload=function(){
        var buf=new Uint8Array(reader.result);
        var zip=new JSZip();
        // Find End of central directory
        var eocd=-1;
        for(var i=buf.length-22;i>=0;i--){
          if(buf[i]===0x50&&buf[i+1]===0x4B&&buf[i+2]===0x05&&buf[i+3]===0x06){
            eocd=i;break;
          }
        }
        if(eocd===-1){reject(new Error('Invalid ZIP'));return;}
        var centralDirOffset=buf[eocd+16]|(buf[eocd+17]<<8)|(buf[eocd+18]<<16)|(buf[eocd+19]<<24);
        var numEntries=buf[eocd+10]|(buf[eocd+11]<<8);
        // Parse central directory
        var pos=centralDirOffset;
        for(var e=0;e<numEntries;e++){
          if(buf[pos]!==0x50||buf[pos+1]!==0x4B||buf[pos+2]!==0x01||buf[pos+3]!==0x02)break;
          var fnameLen=buf[pos+28]|(buf[pos+29]<<8);
          var extraLen=buf[pos+30]|(buf[pos+31]<<8);
          var commentLen=buf[pos+32]|(buf[pos+33]<<8);
          var localOffset=buf[pos+42]|(buf[pos+43]<<8)|(buf[pos+44]<<16)|(buf[pos+45]<<24);
          var fname='';
          for(var c=0;c<fnameLen;c++)fname+=String.fromCharCode(buf[pos+46+c]);
          // Parse local file header
          var lpos=localOffset;
          var lfnameLen=buf[lpos+26]|(buf[lpos+27]<<8);
          var lextraLen=buf[lpos+28]|(buf[lpos+29]<<8);
          var dataSize=buf[lpos+18]|(buf[lpos+19]<<8)|(buf[lpos+20]<<16)|(buf[lpos+21]<<24);
          var dataStart=lpos+30+lfnameLen+lextraLen;
          var fileData=buf.slice(dataStart,dataStart+dataSize);
          zip.files[fname]={data:new Uint8Array(fileData),isDir:false};
          pos+=46+fnameLen+extraLen+commentLen;
        }
        resolve(zip);
      };
      reader.readAsArrayBuffer(blob);
    });
  };
  return JSZip;
})();

function exportDataZip(){
  const exportObj={
    version:'9',
    appVersion:typeof APP_VERSION!=='undefined'?APP_VERSION:'unknown',
    settings:{...state.settings},
    categories:state.categories,
    teams:state.teams.map(t=>({...t,members:(t.members||[]).map(m=>typeof m==='object'?{...m}:m)})),
    credits:state.credits,
    exportedAt:new Date().toISOString()
  };
  const zip=new JSZip();
  zip.file('quiz-data.json',JSON.stringify(exportObj,null,2));
  // Add referenced media files
  var mediaCount=0;
  function addMediaToZip(key,data,prefix){
    if(data&&typeof data==='string'&&data.length>100){
      // Extract extension from data URL
      var match=data.match(/^data:([^;]+);base64,/);
      var ext=match?match[1].split('/')[1]||'bin':'bin';
      ext=ext.replace('mpeg','mp3').replace('x-wav','wav').replace('ogg','ogg').replace('webm','webm');
      var base64=data.split(',')[1];
      if(base64){
        // Decode base64 to binary
        try{
          var binary=atob(base64);
          var bytes=new Uint8Array(binary.length);
          for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
          zip.file('media/'+prefix+'.'+ext,bytes);
          mediaCount++;
        }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      }
    }
  }
  // Settings media
  ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(k=>{
    addMediaToZip(k,state.settings[k],'settings_'+k);
  });
  // Category images
  state.categories.forEach(cat=>{
    if(cat.catImage)addMediaToZip('cat_'+cat.id,cat.catImage,'cat_'+cat.id);
    cat.questions.forEach(q=>{
      if(q.mediaData)addMediaToZip('q_'+q.id,q.mediaData,'q_'+q.id);
    });
  });
  // Team images
  state.teams.forEach(t=>{
    if(t.teamImage)addMediaToZip('team_'+t.id,t.teamImage,'team_'+t.id);
  });
  zip.generateAsync({type:'blob'}).then(blob=>{
    const a=document.createElement('a');
    const url=URL.createObjectURL(blob);
    a.href=url;
    a.download='quiz-backup-'+new Date().toISOString().slice(0,10)+'.zip';
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 100);
    toast(I18n.t('toast.dataExported')+' (ZIP — '+mediaCount+' ملف وسائط)','success');
  }).catch(e=>{
    toast(I18n.t('toast.zipError')+e.message,'danger');
  });
}

function importZIP(e){
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=ev=>{
    const blob=new Blob([ev.target.result],{type:'application/zip'});
    JSZip.loadAsync(blob).then(async zip=>{
      const jsonFile=zip.files['quiz-data.json'];
      if(!jsonFile){toast(I18n.t('toast.invalidZip'),'danger');return;}
      // Convert Uint8Array to string
      var bytes=jsonFile.data;
      var jsonStr='';
      for(var i=0;i<bytes.length;i++)jsonStr+=String.fromCharCode(bytes[i]);
      try{
        const d=JSON.parse(jsonStr);
        if(d.settings){
          const mediaKeys=['customMusicData','customCorrectData','customWrongData',
            'customTenseData','podiumMusicData','wheelMusicData','certBgImage'];
          mediaKeys.forEach(k=>{if(d.settings[k])state.settings[k]=d.settings[k];});
          Object.keys(d.settings).forEach(k=>{if(!mediaKeys.includes(k))state.settings[k]=d.settings[k];});
        }
        if(d.categories)state.categories=d.categories;
        if(d.teams)state.teams=d.teams;
        if(d.credits)state.credits=d.credits;
        // V10-fix: also import media files from media/ folder in ZIP
        try{
          const mediaFiles=Object.keys(zip.files).filter(n=>n.startsWith('media/')&&!zip.files[n].dir);
          for(const mf of mediaFiles){
            const mBlob=await zip.files[mf].async('blob');
            const mDataUrl=await new Promise(res=>{const r=new FileReader();r.onload=()=>res(r.result);r.readAsDataURL(mBlob);});
            const mKey=mf.replace('media/','');
            // Try to match media file to the correct settings key
            const keyMap={'customMusic':'customMusicData','customCorrect':'customCorrectData','customWrong':'customWrongData',
              'customTense':'customTenseData','podiumMusic':'podiumMusicData','wheelMusic':'wheelMusicData','certBg':'certBgImage'};
            if(keyMap[mKey])state.settings[keyMap[mKey]]=mDataUrl;
          }
        }catch(mediaErr){console.warn('ZIP media import partial:',mediaErr);}
        // V10.2-fix: Save state properly with IDB (same as importJSON)
        _lastSavedJSON=''; // Force dirty check to pass
        // V10-fix: Force _idbLoadDone=true so saveStateSync actually saves
        if(!_idbLoadDone){_idbLoadDone=true;_pendingSaveNeeded=false;}
        try{await saveStateSync();}catch(e){console.warn('[importZIP] saveStateSync error:',e);}
        // Also save ALL media to IDB immediately
        try{if(typeof MediaDB!=='undefined')await MediaDB.saveAllMedia();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
        try{if(typeof MediaDB!=='undefined')await MediaDB.saveCoreData();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
        // V10.2-fix: Save primary state to IDB
        try{
          if(typeof MediaDB!=='undefined'){
            var _psSettings={...state.settings};
            ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(function(k){
              if(_psSettings[k]&&typeof _psSettings[k]==='string'&&_psSettings[k].length>500)_psSettings[k]=true;
            });
            var _psCategories=_stripCatMedia(state.categories);
            var _psTeams=(state.teams||[]).map(function(t){return{...t,teamImage:(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)?true:t.teamImage};});
            var _coreStr=JSON.stringify({settings:_psSettings,categories:_psCategories,teams:_psTeams,credits:state.credits});
            var _psCatImg={};state.categories.forEach(function(c){if(c.catImage&&typeof c.catImage==='string'&&c.catImage.length>500)_psCatImg[c.id]=c.catImage;});
            var _psTeamImg={teamImages:{},memberImages:{}};
            state.teams.forEach(function(t){
              if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)_psTeamImg.teamImages[t.id]=t.teamImage;
              if(t.members&&Array.isArray(t.members)){
                var mImgs={};t.members.forEach(function(m,i){if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500)mImgs[i]=m.image;});
                if(Object.keys(mImgs).length)_psTeamImg.memberImages[t.id]=mImgs;
              }
            });
            await MediaDB.savePrimaryState(_coreStr,Object.keys(_psCatImg).length>0?JSON.stringify(_psCatImg):null,JSON.stringify(_psTeamImg));
          }
        }catch(e){console.warn('[importZIP] savePrimaryState error:',e);}
        document.body.setAttribute('data-theme',state.settings.theme||'space');
        applyThemeCSS(state.settings.theme||'space');
        applyFontScale(state.settings.fontScale||100);
        try{applyCatCardScale(state.settings.catCardSize||100)}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
        if(state.settings.theme==='custom'){try{restoreCustomThemeVars()}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}}
        renderAdmin();
        toast(I18n.t('toast.dataImported')+' (ZIP)','success');
      }catch(e2){toast(I18n.t('toast.dataError')+e2.message,'danger');}
    }).catch(err=>{
      toast(I18n.t('toast.zipReadError')+err.message,'danger');
    });
  };
  reader.onerror=function(){toast(I18n.t('error.fileRead')||'خطأ في قراءة الملف','danger');};
  reader.readAsArrayBuffer(file);
  e.target.value='';
}

function exportData(){
  const hasMedia=state.categories.some(c=>c.questions.some(q=>q.mediaData||q.mediaAttachment))||
    state.categories.some(c=>c.catImage)||
    state.teams.some(t=>t.teamImage);
  // V10-fix: Use non-blocking confirmAction instead of blocking confirm()
  function doExport(){
    const exportObj={
      version:'9',
      appVersion:typeof APP_VERSION!=='undefined'?APP_VERSION:'unknown',
      settings:{...state.settings},
      categories:state.categories,
      teams:state.teams.map(t=>({// Preserve all team data including images
        ...t,
        members:(t.members||[]).map(m=>typeof m==='object'?{...m}:m)
      })),
      credits:state.credits,
      exportedAt:new Date().toISOString()
    };
    const blob=new Blob([JSON.stringify(exportObj,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    const url=URL.createObjectURL(blob);
    a.href=url;
    a.download='quiz-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 100);
    toast(I18n.t('toast.dataExported'),'success');
  }
  if(hasMedia){
    confirmAction(I18n.t('confirm.mediaWarning')||'بعض الأسئلة تحتوي على صور/صوت مضمنة — الملف قد يكون كبيراً. هل تريد المتابعة؟',doExport);
  }else{
    doExport();
  }
}
function importJSON(e){
  const file=e.target.files[0];if(!file)return;
  toast(I18n.t('toast.importing')||'جاري الاستيراد...','info');
  const reader=new FileReader();
  reader.onload=async ev=>{
    try{
      const d=JSON.parse(ev.target.result);
      if(!d||typeof d!=='object')throw new Error(I18n.t('error.invalidFile')||'ملف غير صالح');
      // Basic schema validation — ensure critical fields have correct types
      if(d.categories&&!Array.isArray(d.categories)){toast(I18n.t('error.invalidFile')||'ملف غير صالح','danger');return;}
      if(d.teams&&!Array.isArray(d.teams)){toast(I18n.t('error.invalidFile')||'ملف غير صالح','danger');return;}
      if(d.settings&&typeof d.settings!=='object'){toast(I18n.t('error.invalidFile')||'ملف غير صالح','danger');return;}

      // 1. Merge settings — move large media (>500 chars) to IndexedDB
      // V11-SECURITY: NEVER overwrite password/pwLevel from imported JSON — prevents
      // account takeover via malicious quiz files. User's existing password is preserved.
      const _preservedPassword = state.settings.password;
      const _preservedPwLevel  = state.settings.pwLevel;
      if(d.settings){
        const mediaKeys=['customMusicData','customCorrectData','customWrongData',
          'customTenseData','podiumMusicData','wheelMusicData','certBgImage'];
        const idbPromises=[];
        mediaKeys.forEach(k=>{
          if(d.settings[k]){
            if(typeof d.settings[k]==='string'&&d.settings[k].length>500&&typeof MediaDB!=='undefined'){
              idbPromises.push(MediaDB.set('s_'+k,d.settings[k]).catch(function(e){_logErr(e,'MediaDB:setSettingMedia-importJSON')}));
            }
            state.settings[k]=d.settings[k];
          }
        });
        Object.keys(d.settings).forEach(k=>{
          if(!mediaKeys.includes(k))state.settings[k]=d.settings[k];
        });
        // V11-SECURITY: Restore user's original password + pwLevel — never trust imported password
        state.settings.password = _preservedPassword;
        state.settings.pwLevel  = _preservedPwLevel;
        // Await IDB writes for settings media
        if(idbPromises.length>0)await Promise.all(idbPromises);
      }

      // 2. Process categories — move large media to IndexedDB (>500 chars, consistent with saveAllMedia threshold)
      if(d.categories){
        const catIdbPromises=[];
        d.categories.forEach(function(cat){
          if(cat.catImage&&typeof cat.catImage==='string'&&cat.catImage.length>500&&typeof MediaDB!=='undefined'){
            catIdbPromises.push(MediaDB.set('ci_'+cat.id,cat.catImage).catch(function(e){_logErr(e,'MediaDB:setCatImg-importJSON')}));
          }
          if(cat.questions){
            cat.questions.forEach(function(q){
              if(q.mediaData&&typeof q.mediaData==='string'&&q.mediaData.length>500&&typeof MediaDB!=='undefined'){
                catIdbPromises.push(MediaDB.set('qm_'+q.id,q.mediaData).catch(function(e){_logErr(e,'MediaDB:setQuestionMedia-importJSON')}));
              }
              if(q.mediaAttachment&&q.mediaAttachment.data&&typeof q.mediaAttachment.data==='string'&&q.mediaAttachment.data.length>500&&typeof MediaDB!=='undefined'){
                catIdbPromises.push(MediaDB.set('qma_'+q.id,q.mediaAttachment).catch(function(e){_logErr(e,'MediaDB:setQuestionAttachment-importJSON')}));
              }
              if(q.optionImages){
                q.optionImages.forEach(function(img,idx){
                  if(img&&typeof img==='string'&&img.length>500&&typeof MediaDB!=='undefined'){
                    catIdbPromises.push(MediaDB.set('qo_'+q.id+'_'+idx,img).catch(function(e){_logErr(e,'MediaDB:setOptionImg-importJSON')}));
                  }
                });
              }
              // Handle video references in imported data — store as Blob for efficiency
              if(q.mediaData&&typeof q.mediaData==='string'&&q.mediaData.length>500&&q.type==='video'&&typeof MediaDB!=='undefined'){
                try{
                  var binaryStr=atob(q.mediaData.split(',')[1]||q.mediaData);
                  var bytes=new Uint8Array(binaryStr.length);
                  for(var bi=0;bi<binaryStr.length;bi++)bytes[bi]=binaryStr.charCodeAt(bi);
                  var blob=new Blob([bytes],{type:'video/mp4'});
                  var refKey='qv_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
                  (function(q,refKey,blob){
                    catIdbPromises.push(MediaDB.set(refKey,blob).then(function(){
                      q.videoRef=refKey;
                      delete q.mediaData;
                    }).catch(function(e){_logErr(e,'MediaDB:setVideoRef-importJSON')}));
                  })(q,refKey,blob);
                }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
              }
            });
          }
        });
        state.categories=d.categories;
        // Await IDB writes for category media before saving state
        if(catIdbPromises.length>0)await Promise.all(catIdbPromises);
      }

      // Process team images — move large ones to IndexedDB
      if(d.teams){
        const teamIdbPromises=[];
        d.teams.forEach(function(t){
          if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500&&typeof MediaDB!=='undefined'){
            teamIdbPromises.push(MediaDB.set('ti_'+t.id,t.teamImage).catch(function(e){_logErr(e,'MediaDB:setTeamImg-importJSON')}));
          }
          if(t.members&&Array.isArray(t.members)){
            t.members.forEach(function(m,idx){
              if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500&&typeof MediaDB!=='undefined'){
                teamIdbPromises.push(MediaDB.set('mi_'+t.id+'_'+idx,m.image).catch(function(e){_logErr(e,'MediaDB:setMemberImg-importJSON')}));
              }
            });
          }
        });
        state.teams=d.teams;
        if(teamIdbPromises.length>0)await Promise.all(teamIdbPromises);
      }

      // Process credits — move large images to IndexedDB
      if(d.credits){
        const creditIdbPromises=[];
        d.credits.forEach(function(c){
          if(c.image&&typeof c.image==='string'&&c.image.length>500&&typeof MediaDB!=='undefined'){
            creditIdbPromises.push(MediaDB.set('cr_'+c.id,c.image).catch(function(e){_logErr(e,'MediaDB:setCreditImg-importJSON')}));
          }
        });
        state.credits=d.credits;
        if(creditIdbPromises.length>0)await Promise.all(creditIdbPromises);
      }

      // 3. Save state AFTER all IDB writes complete (force immediate save, not debounced)
      _lastSavedJSON=''; // Force dirty check to pass
      // V10-fix: Force _idbLoadDone=true so saveStateSync actually saves
      if(!_idbLoadDone){_idbLoadDone=true;_pendingSaveNeeded=false;}
      // V10.2-fix: Await saveStateSync to prevent race condition with concurrent IDB writes
      try{await saveStateSync();}catch(e){console.warn('[importJSON] saveStateSync error:',e);}
      // Also save ALL media to IDB immediately (ensures everything is in IDB)
      try{if(typeof MediaDB!=='undefined')await MediaDB.saveAllMedia();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      try{if(typeof MediaDB!=='undefined')await MediaDB.saveCoreData();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      // V10.1: Save proper primary state to IDB with catImg and teamImg data
      // This replaces the previous incomplete save that passed null for images
      try{
        if(typeof MediaDB!=='undefined'){
          // Prepare clean state for primary storage (strip large media, use placeholders)
          var _psSettings={...state.settings};
          ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(function(k){
            if(_psSettings[k]&&typeof _psSettings[k]==='string'&&_psSettings[k].length>500)_psSettings[k]=true;
          });
          var _psCategories=(state.categories||[]).map(function(c){
            var cc={...c};
            if(cc.catImage&&typeof cc.catImage==='string'&&cc.catImage.length>500)cc.catImage=true;
            cc.questions=(cc.questions||[]).map(function(q){
              var qClean={...q};
              if(qClean.mediaData&&typeof qClean.mediaData==='string'&&qClean.mediaData.length>500)qClean.mediaData=true;
              if(qClean.mediaAttachment&&qClean.mediaAttachment.data&&typeof qClean.mediaAttachment.data==='string'&&qClean.mediaAttachment.data.length>500){
                qClean.mediaAttachment={...qClean.mediaAttachment,data:true};
              }
              if(qClean.optionImages&&Array.isArray(qClean.optionImages)){
                qClean.optionImages=qClean.optionImages.map(function(img){return(img&&typeof img==='string'&&img.length>500)?true:img;});
              }
              return qClean;
            });
            return cc;
          });
          var _psTeams=(state.teams||[]).map(function(t){return{...t,teamImage:(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)?true:t.teamImage};});
          var coreStr=JSON.stringify({settings:_psSettings,categories:_psCategories,teams:_psTeams,credits:state.credits});
          // Extract cat and team images for separate IDB storage
          var _psCatImg={};
          state.categories.forEach(function(c){if(c.catImage&&typeof c.catImage==='string'&&c.catImage.length>500)_psCatImg[c.id]=c.catImage;});
          var _psTeamImg={teamImages:{},memberImages:{}};
          state.teams.forEach(function(t){
            if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)_psTeamImg.teamImages[t.id]=t.teamImage;
            if(t.members&&Array.isArray(t.members)){
              var mImgs={};
              t.members.forEach(function(m,i){
                if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500)mImgs[i]=m.image;
              });
              if(Object.keys(mImgs).length)_psTeamImg.memberImages[t.id]=mImgs;
            }
          });
          var catImgStr=Object.keys(_psCatImg).length>0?JSON.stringify(_psCatImg):null;
          var teamImgStr=JSON.stringify(_psTeamImg);
          await MediaDB.savePrimaryState(coreStr,catImgStr,teamImgStr);
        }
      }catch(e){console.warn('[importJSON] savePrimaryState error:',e);}

      // 4. Apply UI settings
      document.body.setAttribute('data-theme',state.settings.theme||'space');
      applyThemeCSS(state.settings.theme||'space');
      applyFontScale(state.settings.fontScale||100);
      try{applyCatCardScale(state.settings.catCardSize||100)}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      if(state.settings.theme==='custom'){try{restoreCustomThemeVars()}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}}

      renderAdmin();
      toast(I18n.t('toast.dataImported')||'تم استيراد البيانات بنجاح','success');
    }catch(e){
      (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[importJSON] Error:') : console.error('[importJSON] Error:', e));
      toast(I18n.t('error.importFailed')||'خطأ في الملف: '+e.message,'danger');
    }finally{
      try{if(typeof hideLoading==='function')hideLoading();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_97")}catch(_){}}
    }
  };
  reader.onerror=function(){toast(I18n.t('error.fileRead')||'خطأ في قراءة الملف','danger');};
  reader.readAsText(file);e.target.value='';
}
// clearAllData — ONLY callable via explicit user button press. NEVER call automatically.
function clearAllData(){confirmAction(typeof I18n!=='undefined'?I18n.t('clear.confirm'):'مسح جميع البيانات نهائياً؟',async()=>{
    state.categories=[];state.teams=[];state.credits=[];
    saveState();
    // V10-fix: Await IDB clear to prevent stale data contamination
    try{if(typeof MediaDB!=='undefined'){await MediaDB.clearAll();}}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    // V10-fix: also clear all other localStorage keys that clearAllData should remove
    try{
      ['quiz_v4_progress','quiz_pwd_salt','quiz_session_history','quiz_custom_palettes',
       'quiz_v7_migrated_at','quiz_audience_state','quiz_v4_audio','quiz_app_version',
       'quiz_v4','quiz_v4_lz','quiz_v4_catimg','quiz_v4_catimg_lz','quiz_v4_teamimg','quiz_v4_teamimg_lz'
      ].forEach(function(k){try{localStorage.removeItem(k);}catch(e){_logErr(e,'localStorage:clearAllData')}});
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    renderAdmin();toast(typeof I18n!=='undefined'?I18n.t('clear.done'):'تم المسح','info');
  },'🗑️',typeof I18n!=='undefined'?I18n.t('clear.all'):'مسح الكل')}
