// ── Unified Media Helpers (eliminates duplication) ──

/**
 * Save all large media from state to IndexedDB.
 * Replaces duplicated save loops in: saveAllMedia, importJSON, importEncrypted, importZIP, _importBuiltinLibrary
 * @param {object} data - {settings, categories, teams, credits}
 * @returns {Promise<number>} Number of items saved
 */
async function saveAllMediaToIDB(data){
  const promises=[];
  const s=data.settings||{};
  // Settings media
  ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(k=>{
    if(s[k]&&typeof s[k]==='string'&&s[k].length>500)
      promises.push(MediaDB.set('s_'+k,s[k]).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:s_'+k):void 0);}));
  });
  // Category images
  (data.categories||[]).forEach(function(cat){
    if(cat.catImage&&typeof cat.catImage==='string'&&cat.catImage.length>500)
      promises.push(MediaDB.set('ci_'+cat.id,cat.catImage).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:ci_'+cat.id):void 0);}));
    // Question media
    (cat.questions||[]).forEach(function(q){
      if(q.mediaData&&typeof q.mediaData==='string'&&q.mediaData.length>500)
        promises.push(MediaDB.set('qm_'+q.id,q.mediaData).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:qm_'+q.id):void 0);}));
      if(q.mediaAttachment&&typeof q.mediaAttachment==='string'&&q.mediaAttachment.length>500)
        promises.push(MediaDB.set('qma_'+q.id,q.mediaAttachment).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:qma_'+q.id):void 0);}));
      // Option images
      (q.optionImages||[]).forEach(function(img,idx){
        if(img&&typeof img==='string'&&img.length>500)
          promises.push(MediaDB.set('qo_'+q.id+'_'+idx,img).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:qo_'+q.id+'_'+idx):void 0);}));
      });
    });
  });
  // Team images
  (data.teams||[]).forEach(function(t){
    if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)
      promises.push(MediaDB.set('ti_'+t.id,t.teamImage).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:ti_'+t.id):void 0);}));
    // Member images
    (t.members||[]).forEach(function(m,idx){
      if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500)
        promises.push(MediaDB.set('mi_'+t.id+'_'+idx,m.image).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:mi_'+t.id+'_'+idx):void 0);}));
    });
  });
  // Credit images
  (data.credits||[]).forEach(function(c){
    if(c.image&&typeof c.image==='string'&&c.image.length>500)
      promises.push(MediaDB.set('cr_'+c.id,c.image).catch(function(e){(typeof _logErr==='function'?_logErr(e,'MediaDB:set:cr_'+c.id):void 0);}));
  });
  await Promise.all(promises);
  return promises.length;
}

/**
 * Strip large base64 media from state, replacing with boolean true.
 * Used before saving to localStorage/IDB core data.
 * @param {object} data - {settings, categories, teams, credits}
 * @returns {object} New object with large media replaced by true
 */
function stripLargeMedia(data){
  const result={settings:{...(data.settings||{})},categories:[],teams:[],credits:[...(data.credits||[])]};
  // Strip settings
  ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(k=>{
    if(result.settings[k]&&typeof result.settings[k]==='string'&&result.settings[k].length>500)
      result.settings[k]=true;
  });
  // Strip categories
  result.categories=(data.categories||[]).map(function(cat){
    const cc={...cat};
    if(cc.catImage&&typeof cc.catImage==='string'&&cc.catImage.length>500)cc.catImage=true;
    cc.questions=(cc.questions||[]).map(function(q){
      const qClean={...q};
      if(qClean.mediaData&&typeof qClean.mediaData==='string'&&qClean.mediaData.length>500)qClean.mediaData=true;
      if(qClean.mediaAttachment&&typeof qClean.mediaAttachment==='string'&&qClean.mediaAttachment.length>500)qClean.mediaAttachment=true;
      qClean.optionImages=(qClean.optionImages||[]).map(function(img){
        return(img&&typeof img==='string'&&img.length>500)?true:img;
      });
      return qClean;
    });
    return cc;
  });
  // Strip teams
  result.teams=(data.teams||[]).map(function(t){
    const tc={...t};
    if(tc.teamImage&&typeof tc.teamImage==='string'&&tc.teamImage.length>500)tc.teamImage=true;
    tc.members=(tc.members||[]).map(function(m,idx){
      if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500){
        return{...m,image:true};
      }
      return m;
    });
    return tc;
  });
  // Strip credits
  result.credits=(data.credits||[]).map(function(c){
    if(c.image&&typeof c.image==='string'&&c.image.length>500)return{...c,image:true};
    return c;
  });
  return result;
}

/**
 * Extract image maps from state for primary state storage.
 * @param {object} stateObj - The state object
 * @returns {{catImages, teamImages, memberImages, creditImages}}
 */
function extractImageMaps(stateObj){
  const catImages={},teamImages={},memberImages={},creditImages={};
  (stateObj.categories||[]).forEach(function(c){if(c.catImage)catImages[c.id]=c.catImage;});
  (stateObj.teams||[]).forEach(function(t){
    if(t.teamImage)teamImages[t.id]=t.teamImage;
    const imgs={};
    (t.members||[]).forEach(function(m,i){
      if(typeof m==='object'&&m.image)imgs[i]=m.image;
    });
    if(Object.keys(imgs).length)memberImages[t.id]=imgs;
  });
  (stateObj.credits||[]).forEach(function(c){if(c.image)creditImages[c.id]=c.image;});
  return{catImages,teamImages,memberImages,creditImages};
}

/**
 * Generic file-to-dataURL loader.
 * @param {HTMLInputElement} input - File input element
 * @returns {Promise<string>} Data URL
 */
function loadImageFromFile(input){
  return new Promise(function(resolve,reject){
    const f=input.files[0];
    if(!f){reject(new Error('No file selected'));return;}
    const reader=new FileReader();
    reader.onload=function(e){resolve(e.target.result);};
    reader.onerror=function(){reject(new Error('FileReader error'));};
    reader.readAsDataURL(f);
  });
}
