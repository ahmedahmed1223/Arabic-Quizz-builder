// ════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════

// ═══ IndexedDB MEDIA STORAGE — V9: Enhanced with team/member/option images + audio ═══
const MediaDB=(function(){
  const DB_NAME='quiz_media_v1',STORE='media';let _db=null;
  function open(){return new Promise((res,rej)=>{
    if(_db){res(_db);return;}
    // V10-fix: Check if IndexedDB is available (private browsing)
    if(typeof indexedDB==='undefined'){rej(new Error('IndexedDB not available'));return;}
    try{
      // V10-fix: Use APP_DB_VERSION constant instead of hardcoded 1
      const req=indexedDB.open(DB_NAME,APP_DB_VERSION||1);
      req.onupgradeneeded=e=>{const db=e.target.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);};
      req.onsuccess=e=>{
        _db=e.target.result;
        // V10-fix: Handle connection lifecycle events
        _db.onversionchange=()=>{try{_db.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_67")}catch(_){}}_db=null;};
        _db.onclose=()=>{_db=null;};
        res(_db);
      };
      req.onerror=()=>rej(req.error);
      req.onblocked=()=>{console.warn('[MediaDB] Database upgrade blocked by another tab');};
    }catch(e){rej(e);}
  });}
  return{
    set:async function(k,v){try{const db=await open();return new Promise((r,j)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(v,k);tx.oncomplete=()=>r(true);tx.onerror=()=>j(tx.error);});}catch(e){return false;}},
    get:async function(k){try{const db=await open();return new Promise((r,j)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(k);req.onsuccess=()=>r(req.result);req.onerror=()=>j(req.error);});}catch(e){return null;}},
    'delete':async function(k){try{const db=await open();return new Promise((r,j)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE)['delete'](k);tx.oncomplete=()=>r(true);tx.onerror=()=>j(tx.error);});}catch(e){return false;}},
    keys:async function(){try{const db=await open();return new Promise((r,j)=>{const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).getAllKeys();req.onsuccess=()=>r(req.result||[]);req.onerror=()=>j(tx.error);});}catch(e){return [];}},
    /** SAFETY: On failure, individual items are skipped — never cascades to deletion.
     *  V10.2-fix: Returns {saved, total, failed} for caller to verify success */
    saveAllMedia:async function(){
      var items=[];
      ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(function(k){
        if(state.settings[k]&&typeof state.settings[k]==='string'&&state.settings[k].length>500)items.push({key:'s_'+k,value:state.settings[k]});
      });
      state.categories.forEach(function(cat){
        if(cat.catImage&&typeof cat.catImage==='string'&&cat.catImage.length>500)items.push({key:'ci_'+cat.id,value:cat.catImage});
        cat.questions.forEach(function(q){
          if(q.mediaData&&typeof q.mediaData==='string'&&q.mediaData.length>500)items.push({key:'qm_'+q.id,value:q.mediaData});
          if(q.mediaAttachment&&q.mediaAttachment.data&&typeof q.mediaAttachment.data==='string'&&q.mediaAttachment.data.length>500)items.push({key:'qma_'+q.id,value:q.mediaAttachment});
          if(q.optionImages&&Array.isArray(q.optionImages)){
            q.optionImages.forEach(function(img,idx){
              if(img&&typeof img==='string'&&img.length>500)items.push({key:'qo_'+q.id+'_'+idx,value:img});
            });
          }
        });
      });
      state.teams.forEach(function(t){
        if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)items.push({key:'ti_'+t.id,value:t.teamImage});
        if(t.members&&Array.isArray(t.members)){
          t.members.forEach(function(m,idx){
            if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500)items.push({key:'mi_'+t.id+'_'+idx,value:m.image});
          });
        }
      });
      if(state.credits&&Array.isArray(state.credits)){
        state.credits.forEach(function(c){
          if(c.image&&typeof c.image==='string'&&c.image.length>500)items.push({key:'cr_'+c.id,value:c.image});
        });
      }
      var saved=0,failed=0;
      // V11-PERF: Use a single batched readwrite transaction instead of N sequential awaits.
      // Previously: 500+ sequential transactions on media-heavy quizzes (very slow on IDB).
      // Now: 1 transaction, all writes in parallel, single oncomplete.
      try{
        const db=await open();
        await new Promise((resolve)=>{
          const tx=db.transaction(STORE,'readwrite');
          const store=tx.objectStore(STORE);
          let completed=0, succeeded=0;
          items.forEach((it)=>{
            const req=store.put(it.value, it.key);
            req.onsuccess=()=>{succeeded++;};
            req.onerror=()=>{};
          });
          tx.oncomplete=()=>{
            saved=succeeded;
            failed=items.length-succeeded;
            resolve();
          };
          tx.onerror=()=>{
            failed=items.length;
            resolve();
          };
        });
      }catch(e){
        // Fallback: sequential writes (original behavior)
        for(var i=0;i<items.length;i++){
          var ok=await this.set(items[i].key,items[i].value);
          if(ok)saved++;else failed++;
        }
      }
      if(failed>0)console.warn('[MediaDB.saveAllMedia] '+failed+'/'+items.length+' items failed to save');
      // V10.2-fix: Return object with details for caller verification
      return{saved:saved,total:items.length,failed:failed};
    },
    loadAllMedia:async function(){
      var keys=await this.keys();
      // V11.0-fix: Build lookup maps once for O(N) instead of O(N×M) per media item
      var questionMap={};
      state.categories.forEach(function(c){
        (c.questions||[]).forEach(function(q){questionMap[q.id]=q;});
      });
      var catMap={};
      state.categories.forEach(function(c){catMap[c.id]=c;});
      var teamMap={};
      state.teams.forEach(function(t){teamMap[t.id]=t;});
      var creditMap={};
      (state.credits||[]).forEach(function(c){creditMap[c.id]=c;});
      for(var i=0;i<keys.length;i++){
        var k=keys[i],val=await this.get(k);if(!val)continue;
        // V10.1: Also check for 'true' placeholder values (set by _saveStateNow when media is stored in IDB)
        if(k.indexOf('s_')===0){var prop=k.slice(2);if(!state.settings[prop]||state.settings[prop]===true)state.settings[prop]=val;}
        else if(k.indexOf('ci_')===0){var cid=k.slice(3);var cat=catMap[cid];if(cat&&(!cat.catImage||cat.catImage===true))cat.catImage=val;}
        else if(k.indexOf('qm_')===0){var qid=k.slice(3);var q=questionMap[qid];if(q&&(!q.mediaData||q.mediaData===true))q.mediaData=val;}
        else if(k.indexOf('qma_')===0){var maid=k.slice(4);var qm=questionMap[maid];if(qm&&(!qm.mediaAttachment||qm.mediaAttachment===true||(qm.mediaAttachment&&qm.mediaAttachment.data===true)))qm.mediaAttachment=val;}
        else if(k.indexOf('qo_')===0){var parts=k.slice(3).split('_');var qid2=parts[0];var optIdx=parseInt(parts[1]);if(isNaN(optIdx))continue;var qo=questionMap[qid2];if(qo&&qo.optionImages&&(!qo.optionImages[optIdx]||qo.optionImages[optIdx]===true))qo.optionImages[optIdx]=val;}
        else if(k.indexOf('ti_')===0){var tid=k.slice(3);var team=teamMap[tid];if(team&&(!team.teamImage||team.teamImage===true))team.teamImage=val;}
        else if(k.indexOf('mi_')===0){var mParts=k.slice(3).split('_');var mTid=mParts[0];var mIdx=parseInt(mParts[1]);if(isNaN(mIdx))continue;var mTeam=teamMap[mTid];if(mTeam&&mTeam.members&&mTeam.members[mIdx]){if(typeof mTeam.members[mIdx]==='object'&&(!mTeam.members[mIdx].image||mTeam.members[mIdx].image===true))mTeam.members[mIdx].image=val;}}
        else if(k.indexOf('cr_')===0){var crid=k.slice(3);var credit=creditMap[crid];if(credit&&(!credit.image||credit.image===true))credit.image=val;}
      }
    },
    pruneOrphaned:async function(){
      try{
        var allKeys=await this.keys();
        var validKeys=new Set();
        ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(function(k){if(state.settings[k])validKeys.add('s_'+k);});
        state.categories.forEach(function(cat){
          if(cat.catImage)validKeys.add('ci_'+cat.id);
          cat.questions.forEach(function(q){if(q.mediaData)validKeys.add('qm_'+q.id);if(q.videoRef)validKeys.add(q.videoRef);if(q.mediaAttachment&&q.mediaAttachment.data)validKeys.add('qma_'+q.id);if(q.optionImages)q.optionImages.forEach(function(img,idx){if(img)validKeys.add('qo_'+q.id+'_'+idx);});});
        });
        state.teams.forEach(function(t){if(t.teamImage)validKeys.add('ti_'+t.id);if(t.members)t.members.forEach(function(m,idx){if(typeof m==='object'&&m.image)validKeys.add('mi_'+t.id+'_'+idx);});});
        if(state.credits)state.credits.forEach(function(c){if(c.image)validKeys.add('cr_'+c.id);});
        var pruned=0;
        for(var i=0;i<allKeys.length;i++){if(!validKeys.has(allKeys[i])){await this['delete'](allKeys[i]);pruned++;}}
        return pruned;
      }catch(e){return 0;}
    },
    /** Save entire app state to IDB for redundancy/disaster recovery
     *  SAFETY: On failure, returns false without cascading or deleting any data.
     */
    saveCoreData: async function(){
      try{
        // V10.1: Strip large media before saving to IDB (media is stored separately via saveAllMedia)
        var _cleanSettings={...state.settings};
        ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(function(k){
          if(_cleanSettings[k]&&typeof _cleanSettings[k]==='string'&&_cleanSettings[k].length>500)_cleanSettings[k]=true;
        });
        var _cleanCats=(state.categories||[]).map(function(c){
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
        var _cleanTeams=(state.teams||[]).map(function(t){
          var tc={...t};
          if(tc.teamImage&&typeof tc.teamImage==='string'&&tc.teamImage.length>500)tc.teamImage=true;
          if(tc.members&&Array.isArray(tc.members)){
            tc.members=tc.members.map(function(m){
              if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500)return{...m,image:true};
              return m;
            });
          }
          return tc;
        });
        // V11.0-fix: Also strip large credit images to prevent redundant storage in IDB
        var _cleanCredits=(state.credits||[]).map(function(c){
          var cc={...c};
          if(cc.image&&typeof cc.image==='string'&&cc.image.length>500)cc.image=true;
          return cc;
        });
        var coreData=JSON.stringify({
          version:typeof APP_VERSION!=='undefined'?APP_VERSION:'9',
          settings:_cleanSettings,
          categories:_cleanCats,
          teams:_cleanTeams,
          credits:_cleanCredits,
          savedAt:new Date().toISOString()
        });
        await this.set('_core_state',coreData);
        return true;
      }catch(e){try{ErrorBus.capture(e,'MediaDB.saveCoreData')}catch(e2){_logErr(e2,'MediaDB:saveCoreData-inner')}return false;}
    },
    /** Load core state from IDB (fallback if localStorage fails) */
    loadCoreData: async function(){
      try{
        var raw=await this.get('_core_state');
        if(!raw)return null;
        var d=JSON.parse(raw);
        if(d.savedAt){
          var age=Date.now()-new Date(d.savedAt).getTime();
          // V10-fix: Don't silently discard old data — warn but still return it
          // (prevents total data loss if user doesn't visit for 30 days)
          if(age>30*24*60*60*1000){
            console.warn('[MediaDB] Core data is '+(age/86400000).toFixed(0)+' days old — still loading but consider exporting a fresh backup');
          }
        }
        return d;
      }catch(e){return null;}
    },
    /** Clear all IDB data — ONLY for explicit user-initiated reset. NEVER call automatically. */
    clearAll: async function(){
      try{
        var allKeys=await this.keys();
        for(var i=0;i<allKeys.length;i++)await this['delete'](allKeys[i]);
        return allKeys.length;
      }catch(e){return 0;}
    },
    // ── V9.2: Primary state storage in IndexedDB ──
    /** Save primary state to IndexedDB (replaces localStorage as primary) */
    savePrimaryState: async function(coreStr, catImgObj, teamImgObj){
      try{
        await this.set('_primary_core',coreStr);
        if(catImgObj) await this.set('_primary_catImg',catImgObj);
        if(teamImgObj) await this.set('_primary_teamImg',teamImgObj);
        // V10-fix: Use APP_VERSION instead of hardcoded string
        await this.set('_primary_version',typeof APP_VERSION!=='undefined'?APP_VERSION:'10.0.0');
        await this.set('_primary_savedAt',String(Date.now()));
        return true;
      }catch(e){try{ErrorBus.capture(e,'MediaDB.savePrimaryState')}catch(e2){_logErr(e2,'MediaDB:savePrimaryState-inner')}return false;}
    },
    /** Load primary state from IndexedDB — V10: with version check */
    loadPrimaryState: async function(){
      try{
        var version=await this.get('_primary_version');
        if(!version)return null; // No primary state stored yet
        // V10: Warn if version mismatch (old data from different app version)
        if(typeof APP_VERSION!=='undefined'&&version!==APP_VERSION){
          console.info('[MediaDB] Primary state version mismatch: stored='+version+' current='+APP_VERSION+' — will attempt migration');
        }
        var core=await this.get('_primary_core');
        var catImg=await this.get('_primary_catImg');
        var teamImg=await this.get('_primary_teamImg');
        if(!core)return null;
        // V10-fix: Normalize catImg/teamImg to JSON strings (handle both string and object formats)
        // Old migrateAllToIDB stored objects instead of strings — normalize them
        if(catImg&&typeof catImg==='object')catImg=JSON.stringify(catImg);
        if(teamImg&&typeof teamImg==='object')teamImg=JSON.stringify(teamImg);
        return {core:core,catImg:catImg||null,teamImg:teamImg||null,version:version};
      }catch(e){return null;}
    },
    /** Check if primary state exists in IDB */
    hasPrimaryState: async function(){
      try{
        var v=await this.get('_primary_version');
        return !!v;
      }catch(e){return false;}
    },
    /** Migrate data from localStorage to IndexedDB */
    migrateFromLocalStorage: async function(){
      try{
        var coreData=null,catImgData=null,teamImgData=null;
        var lzFlag=localStorage.getItem('quiz_v4_lz');
        if(lzFlag==='1'){
          var raw=localStorage.getItem('quiz_v4');
          if(raw){try{coreData=LZString.decompressFromUTF16(raw)||raw;}catch(e){coreData=raw;}}
        }else{
          coreData=localStorage.getItem('quiz_v4');
        }
        var catImgLz=localStorage.getItem('quiz_v4_catimg_lz');
        if(catImgLz==='1'){
          var rawCI=localStorage.getItem('quiz_v4_catimg');
          if(rawCI){try{catImgData=LZString.decompressFromUTF16(rawCI)||rawCI;}catch(e){catImgData=rawCI;}}
        }else{
          catImgData=localStorage.getItem('quiz_v4_catimg');
        }
        var teamImgLz=localStorage.getItem('quiz_v4_teamimg_lz');
        if(teamImgLz==='1'){
          var rawTI=localStorage.getItem('quiz_v4_teamimg');
          if(rawTI){try{teamImgData=LZString.decompressFromUTF16(rawTI)||rawTI;}catch(e){teamImgData=rawTI;}}
        }else{
          teamImgData=localStorage.getItem('quiz_v4_teamimg');
        }
        if(coreData){
          await this.savePrimaryState(coreData,catImgData,teamImgData);
          return true;
        }
        return false;
      }catch(e){try{ErrorBus.capture(e,'MediaDB.migrateFromLS')}catch(e2){_logErr(e2,'MediaDB:migrateFromLS-inner')}return false;}
    },
    // V10: Estimate total IndexedDB size by summing all stored values
    estimateSize: async function(){
      try{
        var allKeys=await this.keys();
        var totalBytes=0;
        var itemCount=allKeys.length;
        // V10-fix: Limit items loaded to prevent memory issues with very large IDB stores
        var maxKeys=Math.min(allKeys.length,500);
        for(var i=0;i<maxKeys;i++){
          var val=await this.get(allKeys[i]);
          if(val){
            if(typeof val==='string'){
              totalBytes+=val.length*2; // UTF-16
            }else if(typeof val==='object'){
              totalBytes+=JSON.stringify(val).length*2;
            }
          }
        }
        // Extrapolate if we capped the keys
        if(allKeys.length>maxKeys){
          var avgBytesPerKey=totalBytes/maxKeys;
          totalBytes=Math.round(avgBytesPerKey*allKeys.length);
        }
        return {bytes:totalBytes,items:itemCount,keys:allKeys,usedMB:(totalBytes/1048576).toFixed(2)};
      }catch(e){return {bytes:0,items:0,keys:[],usedMB:'0.00'};}
    },
    // V10: Migrate all localStorage data to IndexedDB with progress callback
    migrateAllToIDB: async function(onProgress){
      try{
        var steps=[];
        // Step 1: Save all media
        steps.push({name:'media',fn:function(){return MediaDB.saveAllMedia();}});
        // Step 2: Save core data
        steps.push({name:'core',fn:function(){return MediaDB.saveCoreData();}});
        // Step 3: Save primary state (full backup)
        steps.push({name:'primary',fn:function(){
          var settingsClean={...state.settings};
          ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(function(k){
            if(settingsClean[k]&&typeof settingsClean[k]==='string'&&settingsClean[k].length>500)settingsClean[k]=true;
          });
          var catImages={};
          state.categories.forEach(function(c){if(c.catImage)catImages[c.id]=c.catImage;});
          var teamImages={};
          state.teams.forEach(function(t){if(t.teamImage)teamImages[t.id]=t.teamImage;});
          var memberImages={};
          state.teams.forEach(function(t){
            var imgs={};
            (t.members||[]).forEach(function(m,i){
              if(typeof m==='object'&&m.image)imgs[i]=m.image;
            });
            if(Object.keys(imgs).length)memberImages[t.id]=imgs;
          });
          var coreStr=JSON.stringify({settings:settingsClean,categories:_stripCatMedia(state.categories),teams:state.teams.map(function(t){var tc={...t,teamImage:!!t.teamImage};tc.members=(t.members||[]).map(function(m){return typeof m==='object'?{name:m.name,icon:m.icon||''}:m;});return tc;}),credits:state.credits});
          // V10-fix: Serialize catImages and teamImages to JSON strings (savePrimaryState expects strings, not objects)
          var catImgStr=Object.keys(catImages).length>0?JSON.stringify(catImages):null;
          var teamImgStr=JSON.stringify({teamImages:teamImages,memberImages:memberImages});
          return MediaDB.savePrimaryState(coreStr,catImgStr,teamImgStr);
        }});
        var completed=0;
        var results=[];
        for(var i=0;i<steps.length;i++){
          try{
            var result=await steps[i].fn();
            results.push({step:steps[i].name,ok:true,result:result});
          }catch(e){
            results.push({step:steps[i].name,ok:false,error:String(e)});
          }
          completed++;
          if(typeof onProgress==='function'){
            onProgress(completed,steps.length,steps[i].name);
          }
        }
        return {completed:completed,total:steps.length,results:results};
      }catch(e){return {completed:0,total:0,results:[{step:'error',ok:false,error:String(e)}]};}
    }
  };
})();
