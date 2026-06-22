/* ═══════════════════════════════════════════════════════════
   V15: New Features - External Library, WYSIWYG, Image Crop,
         Undo/Redo, Report Export
   ═══════════════════════════════════════════════════════════ */

// ─── 1. EXTERNAL QUESTION LIBRARY ───
(function(){
  const EXT_LIB_STORAGE_KEY='quiz_ext_lib_state';
  const EXT_LIB_CACHE_KEY='quiz_ext_lib_cache';
  const EXT_LIB_MAX_RETRIES=3;
  const EXT_LIB_RETRY_DELAY=2000;
  let _extLibData=null;
  let _extAutoUpdateTimer=null;
  let _extLibFetchInProgress=false;

  // V14: Convert github.com URLs to raw.githubusercontent.com to avoid CORS redirect issues
  function _resolveGithubUrl(url){
    // Pattern: https://github.com/{user}/{repo}/raw/{branch}/{path}
    // Target:  https://raw.githubusercontent.com/{user}/{repo}/{branch}/{path}
    const githubRawMatch=url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/raw\/(.+)$/);
    if(githubRawMatch){
      return 'https://raw.githubusercontent.com/'+githubRawMatch[1]+'/'+githubRawMatch[2];
    }
    return url;
  }

  // V14: Improved fetch with retry, cache, and better error handling
  window.fetchExternalLibrary=async function(retryCount){
    if(_extLibFetchInProgress)return;
    const rawUrl=document.getElementById('ext-lib-url').value.trim();
    const statusEl=document.getElementById('ext-lib-status');
    const fetchBtn=document.getElementById('ext-fetch-btn');
    if(!rawUrl){statusEl.innerHTML='<span class="ext-status-error">الرجاء إدخال رابط صالح</span>';return;}
    // Resolve github.com/raw/ URLs to raw.githubusercontent.com for CORS support
    const url=_resolveGithubUrl(rawUrl);
    if(url!==rawUrl)console.log('[ExtLib] Resolved URL:',rawUrl,'->',url);
    const attempt=(retryCount||0)+1;
    statusEl.innerHTML='<span class="ext-status-info">⏳ جاري الجلب'+(attempt>1?' (محاولة '+attempt+'/'+EXT_LIB_MAX_RETRIES+')':'')+'...</span>';
    fetchBtn.disabled=true;
    _extLibFetchInProgress=true;
    try{
      const controller=new AbortController();
      const timeoutId=setTimeout(()=>controller.abort(),30000);
      const resp=await fetch(url,{cache:'no-cache',signal:controller.signal,mode:'cors'});
      clearTimeout(timeoutId);
      if(!resp.ok)throw new Error('HTTP '+resp.status+' '+resp.statusText);
      const data=await resp.json();
      if(!data||typeof data!=='object')throw new Error('ملف غير صالح — يجب أن يكون JSON يحتوي على أقسام');
      // Validate structure
      if(!data.categories||!Array.isArray(data.categories)){
        throw new Error('الملف لا يحتوي على مصفوفة categories صالحة');
      }
      _extLibData=data;
      // Cache the data for offline use (with size limit — localStorage ~5MB)
      try{
        const cacheData={data:data,url:rawUrl,timestamp:Date.now()};
        const cacheStr=JSON.stringify(cacheData);
        // Only cache if under 4MB to avoid localStorage overflow
        if(cacheStr.length<4*1024*1024){
          localStorage.setItem(EXT_LIB_CACHE_KEY,cacheStr);
        }else{
          console.warn('[ExtLib] Cache too large ('+Math.round(cacheStr.length/1024/1024*10)/10+'MB), skipping cache write');
        }
      }catch(cacheErr){console.warn('[ExtLib] Cache write error:',cacheErr);}
      // Show preview
      const previewEl=document.getElementById('ext-lib-preview');
      const actionsEl=document.getElementById('ext-lib-actions');
      const cats=data.categories||[];
      const totalQ=cats.reduce((s,c)=>s+(c.questions||[]).length,0);
      // Check for changes
      const existingCats=state.categories||[];
      let newCats=0,updatedCats=0,unchangedCats=0;
      cats.forEach(ec=>{
        const existing=existingCats.find(c=>c.id===ec.id||c.name===ec.name);
        if(!existing)newCats++;
        else if(JSON.stringify(ec.questions)!==JSON.stringify(existing.questions))updatedCats++;
        else unchangedCats++;
      });
      let html='<div style="background:var(--bg-secondary,rgba(255,255,255,.04));border-radius:10px;padding:12px;border:1px solid var(--border-color,rgba(255,255,255,.08))">';
      html+='<div style="font-weight:700;margin-bottom:8px">📋 معاينة المكتبة الخارجية</div>';
      html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.85rem">';
      html+='<div>الأقسام: <strong>'+cats.length+'</strong></div>';
      html+='<div>الأسئلة: <strong>'+totalQ+'</strong></div>';
      html+='<div style="color:#4caf50">أقسام جديدة: <strong>'+newCats+'</strong></div>';
      html+='<div style="color:#ff9800">أقسام محدثة: <strong>'+updatedCats+'</strong></div>';
      html+='<div>أقسام بدون تغيير: <strong>'+unchangedCats+'</strong></div>';
      if(data.settings)html+='<div>يتضمن إعدادات: <strong>نعم</strong></div>';
      if(data.teams&&data.teams.length)html+='<div>يتضمن فرق: <strong>'+data.teams.length+'</strong></div>';
      html+='</div>';
      if(cats.length>0){
        html+='<div style="margin-top:10px;font-size:.82rem"><strong>الأقسام:</strong></div>';
        html+='<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">';
        cats.forEach(c=>{
          const qCount=(c.questions||[]).length;
          const isNew=!existingCats.find(ec=>ec.id===c.id||ec.name===c.name);
          const badge=isNew?'<span style="color:#4caf50;font-size:.7rem">جديد</span>':'<span style="color:#ff9800;font-size:.7rem">محدّث</span>';
          html+='<span style="background:var(--bg-surface,#333);padding:4px 10px;border-radius:8px;font-size:.8rem">'+(c.icon||'📚')+' '+(c.name||'قسم')+' ('+qCount+') '+badge+'</span>';
        });
        html+='</div>';
      }
      html+='</div>';
      previewEl.innerHTML=html;
      previewEl.classList.remove('hidden');
      actionsEl.classList.remove('hidden');
      statusEl.innerHTML='<span class="ext-status-success">✓ تم الجلب بنجاح — '+cats.length+' قسم، '+totalQ+' سؤال</span>';
      // Save last fetch info
      try{
        const libState=JSON.parse(localStorage.getItem(EXT_LIB_STORAGE_KEY)||'{}');
        libState.lastFetchTime=Date.now();
        libState.lastUrl=url;
        libState.dataHash=JSON.stringify(data).length;
        localStorage.setItem(EXT_LIB_STORAGE_KEY,JSON.stringify(libState));
      }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[ExtLib] Save state error:') : console.error('[ExtLib] Save state error:', e));}
      updateExtLibLastUpdate();
    }catch(e){
      (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[ExtLib] Fetch error:') : console.error('[ExtLib] Fetch error:', e));
      // Retry logic
      if(attempt<EXT_LIB_MAX_RETRIES&&e.name!=='AbortError'){
        statusEl.innerHTML='<span class="ext-status-warning">⚠️ خطأ: '+e.message+' — إعادة المحاولة تلقائياً...</span>';
        setTimeout(function(){_extLibFetchInProgress=false;window.fetchExternalLibrary(attempt);},EXT_LIB_RETRY_DELAY*attempt);
        return;
      }
      // All retries failed — try loading from cache
      let cacheLoaded=false;
      try{
        const cacheRaw=localStorage.getItem(EXT_LIB_CACHE_KEY);
        if(cacheRaw){
          const cacheObj=JSON.parse(cacheRaw);
          if(cacheObj.data&&cacheObj.data.categories){
            _extLibData=cacheObj.data;
            const cacheAge=Math.round((Date.now()-cacheObj.timestamp)/60000);
            const cacheAgeText=cacheAge<60?cacheAge+' دقيقة':Math.round(cacheAge/60)+' ساعة';
            statusEl.innerHTML='<span class="ext-status-warning">⚠️ فشل الاتصال — تم تحميل بيانات مخزنة من '+cacheAgeText+' مضت <button class="btn btn-ghost btn-sm" onclick="fetchExternalLibrary()" style="font-size:.75rem;margin-right:4px">أعد المحاولة</button></span>';
            // Show cached preview
            const previewEl=document.getElementById('ext-lib-preview');
            const actionsEl=document.getElementById('ext-lib-actions');
            const cats=cacheObj.data.categories||[];
            const totalQ=cats.reduce(function(s,c){return s+(c.questions||[]).length;},0);
            let html='<div style="background:var(--bg-secondary,rgba(255,255,255,.04));border-radius:10px;padding:12px;border:1px solid rgba(255,152,0,.3)">';
            html+='<div style="font-weight:700;margin-bottom:8px;color:#ff9800">📋 معاينة من البيانات المخزنة مؤقتاً</div>';
            html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.85rem">';
            html+='<div>الأقسام: <strong>'+cats.length+'</strong></div>';
            html+='<div>الأسئلة: <strong>'+totalQ+'</strong></div>';
            html+='</div></div>';
            previewEl.innerHTML=html;
            previewEl.classList.remove('hidden');
            actionsEl.classList.remove('hidden');
            cacheLoaded=true;
          }
        }
      }catch(cacheErr){console.warn('[ExtLib] Cache read error:',cacheErr);}
      if(!cacheLoaded){
        statusEl.innerHTML='<span class="ext-status-error">✗ خطأ: '+e.message+' <button class="btn btn-ghost btn-sm" onclick="fetchExternalLibrary()" style="font-size:.75rem;margin-right:4px">أعد المحاولة</button></span>';
      }
    }finally{
      fetchBtn.disabled=false;
      _extLibFetchInProgress=false;
    }
  };

  window.importExtLibrary=async function(mode){
    if(!_extLibData)return toast('لا توجد بيانات للاستيراد','danger');
    const overrideBuiltIn=document.getElementById('ext-override-built-in').checked;
    try{
      if(mode==='replace'){
        if(_extLibData.categories)state.categories=_extLibData.categories;
        if(_extLibData.teams)state.teams=_extLibData.teams;
        if(_extLibData.settings)Object.keys(_extLibData.settings).forEach(k=>{state.settings[k]=_extLibData.settings[k];});
      }else if(mode==='append'){
        if(_extLibData.categories){
          _extLibData.categories.forEach(cat=>{
            const existing=state.categories.find(c=>c.id===cat.id);
            if(!existing)state.categories.push(cat);
            else if(overrideBuiltIn){
              Object.assign(existing,cat);
            }
          });
        }
      }else if(mode==='merge'){
        if(_extLibData.categories){
          _extLibData.categories.forEach(cat=>{
            const existing=state.categories.find(c=>c.id===cat.id||c.name===cat.name);
            if(!existing){
              state.categories.push(cat);
            }else if(overrideBuiltIn){
              // Merge questions: add new, update existing by ID
              (cat.questions||[]).forEach(q=>{
                const eq=existing.questions.find(eq=>eq.id===q.id);
                if(!eq)existing.questions.push(q);
                else Object.assign(eq,q);
              });
            }else{
              // Only add questions not already present
              (cat.questions||[]).forEach(q=>{
                if(!existing.questions.find(eq=>eq.id===q.id)){
                  existing.questions.push(q);
                }
              });
            }
          });
        }
      }
      // Save state
      if(typeof saveState==='function')saveState();
      if(typeof renderAdmin==='function')renderAdmin();
      if(typeof initSoloProgress==='function')initSoloProgress();
      toast('تم استيراد المكتبة الخارجية بنجاح ('+mode+')','success');
      // Save import state
      try{
        const libState=JSON.parse(localStorage.getItem(EXT_LIB_STORAGE_KEY)||'{}');
        libState.lastImportTime=Date.now();
        libState.lastImportMode=mode;
        localStorage.setItem(EXT_LIB_STORAGE_KEY,JSON.stringify(libState));
      }catch(e){}
    }catch(e){
      (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[ExtLib] Import error:') : console.error('[ExtLib] Import error:', e));
      toast('خطأ في الاستيراد: '+e.message,'danger');
    }
  };

  window.toggleExtAutoUpdate=function(enabled){
    // V12: Always show the interval selector (it's useful even when auto-update is off)
    // Just start/stop the auto-update timer
    if(enabled){
      const interval=parseInt(document.getElementById('ext-update-interval').value)||60;
      _startExtAutoUpdate(interval);
    }else{
      if(_extAutoUpdateTimer){clearInterval(_extAutoUpdateTimer);_extAutoUpdateTimer=null;}
    }
    try{localStorage.setItem('quiz_ext_auto_update',enabled?'1':'0');}catch(e){_logErr(e,'localStorage:saveExtAutoUpdate')}
  };

  window.setExtUpdateInterval=function(mins){
    if(_extAutoUpdateTimer){clearInterval(_extAutoUpdateTimer);}
    const enabled=document.getElementById('ext-auto-update').checked;
    if(enabled)_startExtAutoUpdate(parseInt(mins)||60);
    try{localStorage.setItem('quiz_ext_update_interval',mins);}catch(e){_logErr(e,'localStorage:saveExtUpdateInterval')}
  };

  function _startExtAutoUpdate(mins){
    if(_extAutoUpdateTimer)clearInterval(_extAutoUpdateTimer);
    _extAutoUpdateTimer=setInterval(()=>{
      const url=document.getElementById('ext-lib-url').value.trim();
      if(url)window.fetchExternalLibrary();
    },mins*60*1000);
  }

  function updateExtLibLastUpdate(){
    const el=document.getElementById('ext-lib-last-update');
    if(!el)return;
    try{
      const libState=JSON.parse(localStorage.getItem(EXT_LIB_STORAGE_KEY)||'{}');
      if(libState.lastFetchTime){
        const d=new Date(libState.lastFetchTime);
        el.textContent='آخر جلب: '+d.toLocaleDateString('ar')+' '+d.toLocaleTimeString('ar');
      }
      if(libState.lastImportTime){
        const d=new Date(libState.lastImportTime);
        el.textContent+=(el.textContent?' | ':'')+'آخر استيراد: '+d.toLocaleDateString('ar')+' '+d.toLocaleTimeString('ar');
      }
    }catch(e){}
  }

  // Expose to global scope for use from switchTab
  window.updateExtLibLastUpdate=updateExtLibLastUpdate;

  // Check for updates on startup (single-player mode)
  function _checkExtLibOnStartup(){
    try{
      const libState=JSON.parse(localStorage.getItem(EXT_LIB_STORAGE_KEY)||'{}');
      const autoEnabled=localStorage.getItem('quiz_ext_auto_update')==='1';
      if(autoEnabled&&libState.lastUrl){
        document.getElementById('ext-lib-url').value=libState.lastUrl;
        document.getElementById('ext-auto-update').checked=true;
        document.getElementById('ext-auto-interval-wrap').style.display='inline-block';
        const savedInterval=localStorage.getItem('quiz_ext_update_interval');
        if(savedInterval)document.getElementById('ext-update-interval').value=savedInterval;
        // Auto-fetch on startup (with delay to avoid blocking page load)
        setTimeout(()=>window.fetchExternalLibrary(),3000);
      }else{
        // Try loading from cache for offline preview
        try{
          const cacheRaw=localStorage.getItem(EXT_LIB_CACHE_KEY);
          if(cacheRaw){
            const cacheObj=JSON.parse(cacheRaw);
            if(cacheObj.data&&cacheObj.data.categories){
              _extLibData=cacheObj.data;
              if(cacheObj.url)document.getElementById('ext-lib-url').value=cacheObj.url;
            }
          }
        }catch(cacheErr){console.warn('[ExtLib] Cache load on startup error:',cacheErr);}
      }
      // Restore "update on open" checkbox state
      const updateOnOpenEl=document.getElementById('ext-update-on-open');
      if(updateOnOpenEl&&typeof state!=='undefined'&&state.settings) updateOnOpenEl.checked=state.settings.extUpdateOnOpen===true;
      updateExtLibLastUpdate();
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[ExtLib] Startup check error:') : console.error('[ExtLib] Startup check error:', e));}
  }

  // V14: Notification suggesting update when import tab opens
  window.showExtLibUpdateNotification=function(){
    try{
      var libState=JSON.parse(localStorage.getItem(EXT_LIB_STORAGE_KEY)||'{}');
      var lastFetch=libState.lastFetchTime;
      var timeSince=lastFetch?Math.round((Date.now()-lastFetch)/60000):null;
      var timeText='';
      if(timeSince===null) timeText='لم يتم جلب المكتبة بعد';
      else if(timeSince<1) timeText='آخر جلب منذ أقل من دقيقة';
      else if(timeSince<60) timeText='آخر جلب منذ '+timeSince+' دقيقة';
      else if(timeSince<1440) timeText='آخر جلب منذ '+Math.round(timeSince/60)+' ساعة';
      else timeText='آخر جلب منذ '+Math.round(timeSince/1440)+' يوم';
      
      // Insert a banner notification at the top of the import tab
      var importTab=document.getElementById('tab-import');
      if(!importTab)return;
      // Remove any existing banner first
      var existingBanner=importTab.querySelector('.ext-lib-update-banner');
      if(existingBanner)existingBanner.remove();
      
      var banner=document.createElement('div');
      banner.className='ext-lib-update-banner';
      banner.innerHTML='<span class="banner-icon">📚</span>'+
        '<span class="banner-text">يتوفر تحديث للمكتبة الخارجية — '+timeText+'</span>'+
        '<button class="btn btn-primary btn-sm banner-btn" onclick="fetchExternalLibrary();this.closest(\'.ext-lib-update-banner\').remove()">تحديث الآن</button>'+
        '<button class="btn btn-ghost btn-sm" onclick="this.closest(\'.ext-lib-update-banner\').remove()" style="padding:4px 8px;font-size:.8rem">لاحقاً</button>';
      importTab.insertBefore(banner,importTab.firstChild);
    }catch(e){console.warn('[ExtLib] Notification error:',e);}
  };

  // Init on DOM ready
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',_checkExtLibOnStartup);
  }else{
    setTimeout(_checkExtLibOnStartup,1000);
  }
})();


// ─── 2. WYSIWYG RICH TEXT EDITOR ───
(function(){
  let _quillInstances={};

  window.initQuillEditor=function(containerId,initialContent){
    const container=document.getElementById(containerId);
    if(!container||typeof Quill==='undefined')return null;
    // Create wrapper
    const wrapper=document.createElement('div');
    wrapper.className='rich-text-editor-wrap';
    const editorDiv=document.createElement('div');
    wrapper.appendChild(editorDiv);
    container.parentNode.insertBefore(wrapper,container);
    container.style.display='none';
    // Initialize Quill
    const quill=new Quill(editorDiv,{
      theme:'snow',
      modules:{
        toolbar:[
          [{header:[1,2,3,false]}],
          ['bold','italic','underline','strike'],
          [{color:[]},{background:[]}],
          [{list:'ordered'},{list:'bullet'}],
          [{direction:'rtl'},{align:[]}],
          ['link','image','blockquote','code-block'],
          ['clean']
        ]
      },
      placeholder:'اكتب نص السؤال هنا...',
    });
    // Set initial content
    if(initialContent){
      try{
        if(initialContent.includes('<')&&initialContent.includes('>')){
          quill.root.innerHTML=initialContent;
        }else{
          quill.setText(initialContent);
        }
      }catch(e){
        quill.setText(initialContent||'');
      }
    }
    // Sync to hidden textarea on change
    quill.on('text-change',function(){
      container.value=quill.root.innerHTML;
      container.dispatchEvent(new Event('input',{bubbles:true}));
    });
    _quillInstances[containerId]=quill;
    return quill;
  };

  window.getQuillContent=function(containerId){
    const quill=_quillInstances[containerId];
    if(!quill)return'';
    return quill.root.innerHTML;
  };

  window.setQuillContent=function(containerId,content){
    const quill=_quillInstances[containerId];
    if(!quill)return;
    try{
      if(content&&content.includes('<')&&content.includes('>')){
        quill.root.innerHTML=content;
      }else{
        quill.setText(content||'');
      }
    }catch(e){quill.setText(content||'');}
  };

  // Auto-init Quill on visible textareas with data-rich attribute
  function _autoInitQuill(){
    document.querySelectorAll('textarea[data-rich="true"]').forEach(ta=>{
      if(!_quillInstances[ta.id]){
        window.initQuillEditor(ta.id,ta.value);
      }
    });
  }

  // Observe DOM changes to auto-init Quill
  const _observer=new MutationObserver(function(mutations){
    let shouldCheck=false;
    mutations.forEach(m=>{
      if(m.addedNodes.length)shouldCheck=true;
    });
    if(shouldCheck)setTimeout(_autoInitQuill,100);
  });
  _observer.observe(document.body,{childList:true,subtree:true});

  // Also add a "Rich Edit" toggle button next to question textareas
  window.toggleRichEditor=function(textareaId){
    const ta=document.getElementById(textareaId);
    if(!ta)return;
    if(_quillInstances[textareaId]){
      // Already rich - switch back to plain
      const quill=_quillInstances[textareaId];
      ta.value=quill.root.innerHTML;
      const wrapper=quill.container.parentNode;
      wrapper.parentNode.removeChild(wrapper);
      ta.style.display='';
      delete _quillInstances[textareaId];
    }else{
      // Switch to rich
      window.initQuillEditor(textareaId,ta.value);
    }
  };
})();


// ─── 3. IMAGE CROPPING TOOL ───
(function(){
  let _cropper=null;
  let _cropCallback=null;

  window.openCropModal=function(imageSrc,callback){
    const modal=document.getElementById('crop-modal');
    const img=document.getElementById('crop-image');
    if(!modal||!img)return;
    _cropCallback=callback;
    img.src=imageSrc;
    modal.classList.remove('hidden');
    modal.style.display='flex';
    // Destroy previous cropper
    if(_cropper){_cropper.destroy();_cropper=null;}
    // Wait for image to load
    img.onload=function(){
      _cropper=new Cropper(img,{
        viewMode:1,
        dragMode:'move',
        autoCropArea:0.8,
        responsive:true,
        ready:function(){}
      });
    };
  };

  window.closeCropModal=function(){
    const modal=document.getElementById('crop-modal');
    if(_cropper){_cropper.destroy();_cropper=null;}
    if(modal){modal.classList.add('hidden');modal.style.display='none';}
    _cropCallback=null;
  };

  window.applyCrop=function(){
    if(!_cropper||!_cropCallback)return;
    const canvas=_cropper.getCroppedCanvas({
      maxWidth:1024,
      maxHeight:1024,
      imageSmoothingEnabled:true,
      imageSmoothingQuality:'high'
    });
    if(!canvas)return toast('خطأ في قص الصورة','danger');
    const dataUrl=canvas.toDataURL('image/png');
    _cropCallback(dataUrl);
    closeCropModal();
    toast('تم قص الصورة بنجاح','success');
  };

  window.setCropAspectRatio=function(val){
    if(!_cropper)return;
    const ratio=parseFloat(val);
    _cropper.setAspectRatio(isNaN(ratio)?NaN:ratio);
  };

  // Hook into image upload - add crop option
  window.addCropButton=function(imgElement){
    if(!imgElement||!imgElement.src)return;
    const btn=document.createElement('button');
    btn.className='btn btn-ghost btn-sm';
    btn.style.cssText='position:absolute;top:4px;right:4px;z-index:5;padding:4px 8px;font-size:.75rem;background:rgba(0,0,0,.6);color:#fff;border:none;border-radius:4px;cursor:pointer';
    btn.textContent='✂ قص';
    btn.onclick=function(e){
      e.preventDefault();
      e.stopPropagation();
      openCropModal(imgElement.src,function(croppedDataUrl){
        imgElement.src=croppedDataUrl;
        // Update related data
        if(typeof state!=='undefined'&&state.editingQId){
          const cat=state.categories.find(c=>c.id===state.editingCatId);
          if(cat){
            const q=cat.questions.find(q=>q.id===state.editingQId);
            if(q)q.mediaData=croppedDataUrl;
          }
        }
      });
    };
    imgElement.parentNode.style.position='relative';
    imgElement.parentNode.appendChild(btn);
  };

  // Observe for new images to add crop buttons
  const _imgObserver=new MutationObserver(function(mutations){
    mutations.forEach(m=>{
      m.addedNodes.forEach(node=>{
        if(node.nodeType===1){
          const imgs=node.querySelectorAll?node.querySelectorAll('img[src^="data:"]'):[]; 
          imgs.forEach(img=>{
            if(!img.dataset.cropBtnAdded&&img.src.length>100){
              img.dataset.cropBtnAdded='true';
              setTimeout(()=>addCropButton(img),200);
            }
          });
        }
      });
    });
  });
  _imgObserver.observe(document.body,{childList:true,subtree:true});
})();


// ─── 4. UNDO/REDO SYSTEM ───
(function(){
  const MAX_UNDO_STEPS=50;
  let _undoStack=[];
  let _redoStack=[];
  let _isUndoRedoAction=false;

  function _captureState(){
    if(typeof state==='undefined'||!state)return null;
    try{
      return{
        categories:JSON.parse(JSON.stringify(state.categories||[])),
        teams:JSON.parse(JSON.stringify(state.teams||[])),
        credits:JSON.parse(JSON.stringify(state.credits||[])),
        settings:JSON.parse(JSON.stringify(state.settings||{})),
        timestamp:Date.now()
      };
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[Undo] captureState error:') : console.error('[Undo] captureState error:', e));return null;}
  }

  function _restoreState(snapshot){
    _isUndoRedoAction=true;
    state.categories=snapshot.categories;
    state.teams=snapshot.teams;
    state.credits=snapshot.credits;
    // Don't restore all settings, just quiz-related ones
    Object.keys(snapshot.settings).forEach(k=>{
      if(!['password'].includes(k))state.settings[k]=snapshot.settings[k];
    });
    if(typeof saveState==='function')saveState();
    if(typeof renderAdmin==='function')renderAdmin();
    _isUndoRedoAction=false;
  }

  function _updateButtons(){
    const undoBtn=document.getElementById('undo-btn');
    const redoBtn=document.getElementById('redo-btn');
    if(undoBtn){
      undoBtn.disabled=_undoStack.length===0;
      undoBtn.style.opacity=_undoStack.length===0?'.4':'1';
    }
    if(redoBtn){
      redoBtn.disabled=_redoStack.length===0;
      redoBtn.style.opacity=_redoStack.length===0?'.4':'1';
    }
  }

  // Push initial state
  function _pushUndo(){
    if(_isUndoRedoAction)return;
    var snap=_captureState();
    if(!snap)return;
    _undoStack.push(snap);
    if(_undoStack.length>MAX_UNDO_STEPS)_undoStack.shift();
    _redoStack=[]; // Clear redo on new action
    _updateButtons();
  }

  window.adminUndo=function(){
    if(_undoStack.length===0)return;
    var snap=_captureState();
    if(snap)_redoStack.push(snap);
    const snapshot=_undoStack.pop();
    _restoreState(snapshot);
    _updateButtons();
    toast('تم التراجع','info');
  };

  window.adminRedo=function(){
    if(_redoStack.length===0)return;
    var snap=_captureState();
    if(snap)_undoStack.push(snap);
    const snapshot=_redoStack.pop();
    _restoreState(snapshot);
    _updateButtons();
    toast('تم الإعادة','info');
  };

  // Hook into state changes
  const _origUpdateSetting=window.updateSetting;
  if(typeof _origUpdateSetting==='function'){
    window.updateSetting=function(key,val){
      _pushUndo();
      _origUpdateSetting(key,val);
    };
  }

  // Hook into saveState
  const _origSaveState=window.saveState;
  if(typeof _origSaveState==='function'){
    let _saveDebounce=null;
    window.saveState=function(){
      // Debounce undo captures
      if(!_isUndoRedoAction){
        clearTimeout(_saveDebounce);
        _saveDebounce=setTimeout(_pushUndo,500);
      }
      return _origSaveState.apply(this,arguments);
    };
  }

  // Keyboard shortcuts
  document.addEventListener('keydown',function(e){
    if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){
      e.preventDefault();
      window.adminUndo();
    }
    if((e.ctrlKey||e.metaKey)&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){
      e.preventDefault();
      window.adminRedo();
    }
  });

  // Capture initial state
  setTimeout(_pushUndo,2000);
})();


// ─── 5. REPORT EXPORT (PDF & Excel) ───
(function(){

  window.exportReportPDF=async function(){
    if(typeof jspdf==='undefined'&&typeof window.jspdf==='undefined'){
      toast('مكتبة jsPDF غير محملة. تأكد من اتصال الإنترنت.','danger');
      return;
    }
    try{
      const {jsPDF}=window.jspdf;
      const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});

      // Title
      doc.setFont('helvetica','bold');
      doc.setFontSize(20);
      const compName=state.settings.name||'مسابقة';
      doc.text(compName,105,20,{align:'center'});

      // Subtitle
      doc.setFont('helvetica','normal');
      doc.setFontSize(12);
      doc.text('Quiz Report',105,30,{align:'center'});
      doc.text(new Date().toLocaleDateString(),105,37,{align:'center'});

      // Separator line
      doc.setDrawColor(100,100,255);
      doc.setLineWidth(0.5);
      doc.line(20,42,190,42);

      let y=50;

      // Categories Summary
      doc.setFontSize(14);
      doc.setFont('helvetica','bold');
      doc.text('Categories Summary',20,y);
      y+=8;
      doc.setFontSize(10);
      doc.setFont('helvetica','normal');

      const cats=state.categories||[];
      doc.setTextColor(100,100,100);
      doc.text('Category',20,y);
      doc.text('Questions',100,y);
      doc.text('Difficulty',140,y);
      y+=5;
      doc.setDrawColor(200,200,200);
      doc.line(20,y,190,y);
      y+=5;
      doc.setTextColor(0,0,0);

      cats.forEach(cat=>{
        if(y>270){doc.addPage();y=20;}
        const qCount=(cat.questions||[]).length;
        const diff=cat.questions&&cat.questions[0]?cat.questions[0].difficulty||'mixed':'N/A';
        doc.text(String(cat.name||'').substring(0,30),20,y);
        doc.text(String(qCount),100,y);
        doc.text(String(diff),140,y);
        y+=6;
      });

      y+=10;

      // Teams Scores
      const teams=state.teams||[];
      if(teams.length>0){
        if(y>240){doc.addPage();y=20;}
        doc.setFontSize(14);
        doc.setFont('helvetica','bold');
        doc.text('Teams Scores',20,y);
        y+=8;
        doc.setFontSize(10);
        doc.setFont('helvetica','normal');
        doc.setTextColor(100,100,100);
        doc.text('Team',20,y);
        doc.text('Score',100,y);
        doc.text('Rank',140,y);
        y+=5;
        doc.line(20,y,190,y);
        y+=5;
        doc.setTextColor(0,0,0);

        const sorted=[...teams].sort((a,b)=>(b.score||0)-(a.score||0));
        sorted.forEach((team,i)=>{
          if(y>270){doc.addPage();y=20;}
          doc.text(String(team.name||'').substring(0,30),20,y);
          doc.text(String(team.score||0),100,y);
          doc.text('#'+(i+1),140,y);
          y+=6;
        });
      }

      y+=10;

      // Statistics
      if(y>240){doc.addPage();y=20;}
      doc.setFontSize(14);
      doc.setFont('helvetica','bold');
      doc.text('Statistics',20,y);
      y+=8;
      doc.setFontSize(10);
      doc.setFont('helvetica','normal');

      const totalQ=cats.reduce((s,c)=>s+(c.questions||[]).length,0);
      const stats=[
        ['Total Categories',cats.length],
        ['Total Questions',totalQ],
        ['Total Teams',teams.length],
        ['Average Score',teams.length?(teams.reduce((s,t)=>s+(t.score||0),0)/teams.length).toFixed(1):'N/A'],
        ['Highest Score',teams.length?Math.max(...teams.map(t=>t.score||0)):'N/A'],
      ];
      stats.forEach(([label,val])=>{
        doc.text(label+': '+val,20,y);
        y+=6;
      });

      // Session History
      if(state.sessionStats&&Object.keys(state.sessionStats).length>0){
        y+=5;
        if(y>240){doc.addPage();y=20;}
        doc.setFontSize(14);
        doc.setFont('helvetica','bold');
        doc.text('Session Statistics',20,y);
        y+=8;
        doc.setFontSize(10);
        doc.setFont('helvetica','normal');
        Object.entries(state.sessionStats).forEach(([teamId,stats])=>{
          if(y>270){doc.addPage();y=20;}
          const team=teams.find(t=>t.id===teamId);
          doc.text((team?team.name:teamId)+': Correct='+((stats.correct||0))+' Wrong='+((stats.wrong||0))+' Skipped='+((stats.skipped||0)),20,y);
          y+=6;
        });
      }

      // Footer
      const pageCount=doc.internal.getNumberOfPages();
      for(let i=1;i<=pageCount;i++){
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150,150,150);
        doc.text('Page '+i+' of '+pageCount,105,290,{align:'center'});
      }

      doc.save((compName||'quiz')+'-report.pdf');
      toast('تم تصدير التقرير بصيغة PDF بنجاح','success');
    }catch(e){
      (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[PDF Export] Error:') : console.error('[PDF Export] Error:', e));
      toast('خطأ في تصدير PDF: '+e.message,'danger');
    }
  };

  window.exportReportExcel=function(){
    if(typeof XLSX==='undefined'){
      toast('مكتبة XLSX غير محملة','danger');
      return;
    }
    try{
      const wb=XLSX.utils.book_new();

      // Categories Sheet
      const catsData=[['القسم','عدد الأسئلة','صعوبة']];
      (state.categories||[]).forEach(cat=>{
        catsData.push([cat.name||'',(cat.questions||[]).length,cat.questions&&cat.questions[0]?cat.questions[0].difficulty||'':'']);
      });
      const catsWs=XLSX.utils.aoa_to_sheet(catsData);
      XLSX.utils.book_append_sheet(wb,catsWs,'الأقسام');

      // Teams Sheet
      const teamsData=[['الفريق','النقاط','الترتيب']];
      const sorted=[...(state.teams||[])].sort((a,b)=>(b.score||0)-(a.score||0));
      sorted.forEach((team,i)=>{
        teamsData.push([team.name||'',team.score||0,i+1]);
      });
      const teamsWs=XLSX.utils.aoa_to_sheet(teamsData);
      XLSX.utils.book_append_sheet(wb,teamsWs,'الفرق');

      // Questions Sheet
      const qData=[['القسم','السؤال','النوع','الصعوبة','الوقت']];
      (state.categories||[]).forEach(cat=>{
        (cat.questions||[]).forEach(q=>{
          qData.push([cat.name||'',q.text||q.question||'',q.type||'text',q.difficulty||'easy',q.time||state.settings.defaultTime||30]);
        });
      });
      const qWs=XLSX.utils.aoa_to_sheet(qData);
      XLSX.utils.book_append_sheet(wb,qWs,'الأسئلة');

      // Statistics Sheet
      const statData=[['المقياس','القيمة']];
      const totalQ=(state.categories||[]).reduce((s,c)=>s+(c.questions||[]).length,0);
      statData.push(['إجمالي الأقسام',(state.categories||[]).length]);
      statData.push(['إجمالي الأسئلة',totalQ]);
      statData.push(['إجمالي الفرق',(state.teams||[]).length]);
      if(state.teams&&state.teams.length){
        statData.push(['متوسط النقاط',(state.teams.reduce((s,t)=>s+(t.score||0),0)/state.teams.length).toFixed(1)]);
        statData.push(['أعلى نقاط',Math.max(...state.teams.map(t=>t.score||0))]);
      }
      const statWs=XLSX.utils.aoa_to_sheet(statData);
      XLSX.utils.book_append_sheet(wb,statWs,'الإحصائيات');

      // Session Stats Sheet
      if(state.sessionStats&&Object.keys(state.sessionStats).length>0){
        const ssData=[['الفريق','صحيحة','خاطئة','تم تخطيها']];
        Object.entries(state.sessionStats).forEach(([teamId,stats])=>{
          const team=(state.teams||[]).find(t=>t.id===teamId);
          ssData.push([team?team.name:teamId,stats.correct||0,stats.wrong||0,stats.skipped||0]);
        });
        const ssWs=XLSX.utils.aoa_to_sheet(ssData);
        XLSX.utils.book_append_sheet(wb,ssWs,'إحصائيات الجلسة');
      }

      const compName=state.settings.name||'quiz';
      XLSX.writeFile(wb,(compName)+'-report.xlsx');
      toast('تم تصدير التقرير بصيغة Excel بنجاح','success');
    }catch(e){
      (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[Excel Export] Error:') : console.error('[Excel Export] Error:', e));
      toast('خطأ في تصدير Excel: '+e.message,'danger');
    }
  };
})();

console.log('[V15] New features loaded: External Library, WYSIWYG, Image Crop, Undo/Redo, Report Export');
