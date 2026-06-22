(function Phase4_Init(){
'use strict';

// ────────────────────────────────────────────────────────
// 4.1  VIRTUAL SCROLLING FOR QUESTION LISTS
// ────────────────────────────────────────────────────────
var VirtualList = (function(){
  var VIRTUAL_THRESHOLD = 50;       // Only activate for >50 items
  var BUFFER_ITEMS      = 5;        // Extra items above/below viewport
  var DEFAULT_ITEM_H    = 72;       // Approximate question-item height (px)

  function VL(container, opts){
    if(!(this instanceof VL)) return new VL(container, opts);
    this.container   = typeof container==='string'? document.getElementById(container):container;
    this.itemHeight  = (opts&&opts.itemHeight)||DEFAULT_ITEM_H;
    this.data        = (opts&&opts.data)||[];
    this.renderItem  = (opts&&opts.renderItem)||null;
    this.onSelect    = (opts&&opts.onSelect)||null;
    this._scrollEl   = null;
    this._innerEl    = null;
    this._rafId      = null;
    this._prevStart  = -1;
    this._prevEnd    = -1;
    if(this.container && this.data.length>VIRTUAL_THRESHOLD && this.renderItem){
      this._init();
    }
  }

  VL.prototype._init = function(){
    var self = this;
    // Create scroll wrapper if not already structured
    this._scrollEl = document.createElement('div');
    this._scrollEl.className = 'vlist-scroll';
    this._scrollEl.style.cssText = 'overflow-y:auto;max-height:60vh;position:relative;';

    // Spacer that sets total scrollable height
    this._innerEl = document.createElement('div');
    this._innerEl.className = 'vlist-inner';
    this._innerEl.style.cssText = 'position:relative;min-height:1px;';

    // Content container for rendered items
    this._contentEl = document.createElement('div');
    this._contentEl.className = 'vlist-content';
    this._contentEl.style.cssText = 'position:absolute;top:0;right:0;left:0;';

    this._innerEl.appendChild(this._contentEl);
    this._scrollEl.appendChild(this._innerEl);

    // Preserve existing children info then replace
    this.container.innerHTML = '';
    this.container.appendChild(this._scrollEl);

    // Set total height
    this._innerEl.style.height = (this.data.length * this.itemHeight) + 'px';

    // Bind scroll with rAF
    this._scrollEl.addEventListener('scroll', function(){ self._onScroll(); }, {passive:true});

    // Initial render
    this._renderRange();
  };

  VL.prototype._onScroll = function(){
    var self = this;
    if(this._rafId) return;
    this._rafId = requestAnimationFrame(function(){
      self._rafId = null;
      self._renderRange();
    });
  };

  VL.prototype._renderRange = function(){
    if(!this._scrollEl) return;
    var scrollTop    = this._scrollEl.scrollTop;
    var viewHeight   = this._scrollEl.clientHeight;
    var totalItems   = this.data.length;
    var itemH        = this.itemHeight;

    var start = Math.max(0, Math.floor(scrollTop / itemH) - BUFFER_ITEMS);
    var end   = Math.min(totalItems, Math.ceil((scrollTop + viewHeight) / itemH) + BUFFER_ITEMS);

    // Skip if same range
    if(start === this._prevStart && end === this._prevEnd) return;
    this._prevStart = start;
    this._prevEnd   = end;

    var html = '';
    for(var i = start; i < end; i++){
      try{ html += this.renderItem(this.data[i], i); }
      catch(e){ html += '<div style="height:'+itemH+'px"></div>'; }
    }
    this._contentEl.innerHTML = html;
    this._contentEl.style.transform = 'translateY(' + (start * itemH) + 'px)';
  };

  VL.prototype.update = function(newData){
    this.data = newData || [];
    this._prevStart = -1;
    this._prevEnd   = -1;
    if(this._innerEl){
      this._innerEl.style.height = (this.data.length * this.itemHeight) + 'px';
    }
    this._renderRange();
  };

  VL.prototype.destroy = function(){
    if(this._rafId){ cancelAnimationFrame(this._rafId); this._rafId=null; }
    this._scrollEl = null;
    this._innerEl  = null;
    this._contentEl = null;
    this.data = [];
  };

  // Expose threshold so callers can check
  VL.VIRTUAL_THRESHOLD = VIRTUAL_THRESHOLD;

  return VL;
})();


// ────────────────────────────────────────────────────────
// 4.2  LAZY RENDERING FOR ADMIN TABS
// ────────────────────────────────────────────────────────
var _lazyTabRendered = { settings:true }; // Settings is always rendered (default tab)
var _origSwitchTab   = (typeof switchTab==='function')? switchTab : null;

// Wrap switchTab to support lazy rendering
if(_origSwitchTab){
  (function(){
    var _lazyHandlers = {
      categories: function(){ try{ renderCategoriesAdmin(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));} },
      teams:      function(){ try{ renderTeamsAdmin(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));} },
      credits:    function(){ try{ renderCreditsAdmin(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));} },
      appearance: function(){ try{ if(typeof renderThemeGrid==='function') renderThemeGrid(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));} },
      settings:   function(){ try{ renderAdmin(); renderStatsGrid(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));} },
      import:     function(){} // No extra rendering needed
    };

    // Replace switchTab with lazy version
    // NOTE: We store original for reference but do NOT modify it
    window._phase4_switchTab_original = _origSwitchTab;

    // Lazy-aware tab switch: mark tab as rendered on first visit
    // The original switchTab already handles hiding/showing.
    // We add a post-switch hook that triggers first-render for unrendered tabs.
    window._phase4_onTabSwitched = function(tabName){
      if(!_lazyTabRendered[tabName]){
        _lazyTabRendered[tabName] = true;
        if(_lazyHandlers[tabName]){
          try{ _lazyHandlers[tabName](); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
        }
      }
    };
  })();
}


// ────────────────────────────────────────────────────────
// 4.3  DEBOUNCED SAVE IMPROVEMENT
// ────────────────────────────────────────────────────────
var SmartSave = (function(){
  var _dirtyProps   = {};     // { propertyPath: true } for dirty tracking
  var _saveQueued   = false;
  var _saveIndicator = null;

  // Create or reuse save indicator
  function _getIndicator(){
    if(_saveIndicator && _saveIndicator.parentNode) return _saveIndicator;
    _saveIndicator = document.createElement('div');
    _saveIndicator.id = 'save-indicator';
    _saveIndicator.style.cssText = 'position:fixed;bottom:12px;left:12px;z-index:99999;padding:6px 14px;'
      + 'border-radius:20px;font-size:.75rem;font-weight:600;pointer-events:none;'
      + 'transition:opacity .3s,transform .3s;opacity:0;transform:translateY(8px);'
      + 'background:rgba(0,230,180,.15);color:#00e6b4;border:1px solid rgba(0,230,180,.3);'
      + 'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);';
    document.body.appendChild(_saveIndicator);
    return _saveIndicator;
  }

  function _showIndicator(){
    var el = _getIndicator();
    el.textContent = t('ui.saving');
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  }

  function _hideIndicator(){
    if(!_saveIndicator) return;
    var el = _getIndicator;
    _saveIndicator.style.opacity = '0';
    _saveIndicator.style.transform = 'translateY(8px)';
  }

  function markDirty(propPath){
    _dirtyProps[propPath] = true;
    if(!_saveQueued){
      _saveQueued = true;
      _showIndicator();
    }
  }

  function onSaved(){
    _dirtyProps = {};
    _saveQueued = false;
    // Show "saved" briefly
    var el = _getIndicator();
    el.textContent = t('ui.saved');
    el.style.background = 'rgba(0,230,118,.15)';
    el.style.color = '#00e676';
    el.style.borderColor = 'rgba(0,230,118,.3)';
    setTimeout(function(){
      _hideIndicator();
      // Reset styles
      el.style.background = 'rgba(0,230,180,.15)';
      el.style.color = '#00e6b4';
      el.style.borderColor = 'rgba(0,230,180,.3)';
    }, 1200);
  }

  // Observe state mutations for dirty tracking
  // We hook into the existing Store dispatch to detect changes
  try{
    if(typeof Store!=='undefined' && Store.subscribe){
      Store.subscribe(function(evt, payload){
        if(evt==='SET_STATE' || evt==='STATE_CHANGE' || evt==='VIEW_CHANGE') return; // too broad
        // Mark relevant paths as dirty
        if(payload && typeof payload==='object'){
          var keys = Object.keys(payload);
          for(var i=0;i<keys.length;i++) markDirty(keys[i]);
        }
      });
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  // Hook into _saveStateNow to detect when save completes
  try{
    var _origSaveNow = (typeof _saveStateNow==='function')? _saveStateNow : null;
    if(_origSaveNow){
      // We can't modify _saveStateNow directly, so we use a polling approach
      // Check if save indicator should be hidden
      // V10-fix: Use TimerRegistry for cleanup instead of raw setInterval
      TimerRegistry.setInterval(function(){
        if(_saveQueued && typeof _saveStateTimer!=='undefined' && !_saveStateTimer){
          // Timer cleared = save completed
          onSaved();
        }
      }, 600, 'smartSave-poll');
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  return {
    markDirty: markDirty,
    onSaved: onSaved,
    isDirty: function(){ return Object.keys(_dirtyProps).length>0; },
    getDirtyProps: function(){ return Object.keys(_dirtyProps); }
  };
})();


// ────────────────────────────────────────────────────────
// 4.4  MEMORY MANAGEMENT
// ────────────────────────────────────────────────────────
var _SESSION_ANSWERS_CAP = 300;    // Max answers per team before trimming
var _SESSION_ANSWERS_KEEP = 200;   // Keep this many after trim
var _LS_WARNING_THRESHOLD = 0.8;   // 80% full

function cleanupMemory(){
  try{
    // 1. Trim sessionStats answers arrays
    if(state && state.sessionStats){
      var teamIds = Object.keys(state.sessionStats);
      var trimmed = 0;
      for(var i=0;i<teamIds.length;i++){
        var stats = state.sessionStats[teamIds[i]];
        if(stats && stats.answers && stats.answers.length > _SESSION_ANSWERS_CAP){
          stats.answers = stats.answers.slice(-_SESSION_ANSWERS_KEEP);
          trimmed++;
        }
      }
      if(trimmed>0){
        try{ PerfMonitor.start('cleanupMemory.save'); }catch(e){try{ErrorBus.capture(e,"catch#AUTO_249")}catch(_){}}
        if(typeof saveState==='function') saveState();
        try{ PerfMonitor.end('cleanupMemory.save'); }catch(e){try{ErrorBus.capture(e,"catch#AUTO_250")}catch(_){}}
      }
    }

    // 2. Trim scoreAudit if oversized
    if(state && state.scoreAudit && state.scoreAudit.length > 1000){
      state.scoreAudit = state.scoreAudit.slice(-500);
    }

    // 3. Trim scoreHistory
    if(state && state.scoreHistory && state.scoreHistory.length > 500){
      state.scoreHistory = state.scoreHistory.slice(-400);
    }

    // 4. Check localStorage usage
    checkStorageUsage();

  }catch(e){ try{ if(typeof ErrorBus!=='undefined') ErrorBus.capture(e,'cleanupMemory'); }catch(_){} }
}

function checkStorageUsage(){
  try{
    // Estimate localStorage usage
    var total = 0;
    for(var i=0;i<localStorage.length;i++){
      var key = localStorage.key(i);
      if(key){
        total += (localStorage.getItem(key)||'').length * 2; // UTF-16 = 2 bytes per char
      }
    }
    // Typical localStorage limit is 5MB (5*1024*1024 = 5242880 bytes)
    var limit = 5 * 1024 * 1024;
    var usage = total / limit;

    if(usage > _LS_WARNING_THRESHOLD){
      var pct = Math.round(usage * 100);
      var usedMB = (total / (1024*1024)).toFixed(2);
      // Show i18n-aware warning — NEVER reset data
      if(typeof toast==='function'){
        var _msg = typeof I18n!=='undefined' ? I18n.t('storage.almostFull',{pct:pct,usedMB:usedMB}) : '⚠️ التخزين ممتلئ '+pct+'% ('+usedMB+'MB) — صدّر بياناتك';
        toast(_msg,'danger');
      }
      console.warn('[Phase4] localStorage usage: '+pct+'% ('+usedMB+'MB / 5MB)');
      // Attempt to migrate large data (audio, images) from localStorage to IndexedDB
      try{
        if(typeof MediaDB!=='undefined' && typeof state!=='undefined'){
          toast(typeof I18n!=='undefined'?I18n.t('storage.migratingToIDB'):'🔄 جارٍ نقل الوسائط إلى تخزين احتياطي...','info');
          // V10-fix: Await IDB save before removing LS keys (prevent data loss)
          MediaDB.saveAllMedia().then(function(){
            // V10.4-fix: Properly await IDB verification before removing LS keys
            // Verify a critical IDB key exists to confirm data was saved
            var _verifyPromise=Promise.resolve(true);
            try{
              if(state.categories&&state.categories.length>0&&state.categories[0].catImage){
                _verifyPromise=MediaDB.get('ci_'+state.categories[0].id).then(function(v){return !!v;}).catch(function(){return false;});
              }
            }catch(ve){/* verification not possible */}
            _verifyPromise.then(function(idbOk){
              if(idbOk){
                try{localStorage.removeItem('quiz_v4_catimg');localStorage.removeItem('quiz_v4_catimg_lz');}catch(e){_logErr(e,'localStorage:storageMgmt-removeCatImg')}
                try{localStorage.removeItem('quiz_v4_teamimg');localStorage.removeItem('quiz_v4_teamimg_lz');}catch(e){_logErr(e,'localStorage:storageMgmt-removeTeamImg')}
                try{localStorage.removeItem('quiz_v4_audio');}catch(e){_logErr(e,'localStorage:storageMgmt-removeAudio')}
                toast(typeof I18n!=='undefined'?I18n.t('storage.migrateOK'):'✅ تم نقل الوسائط بنجاح لتفريغ مساحة','success');
              }else{
                toast(typeof I18n!=='undefined'?I18n.t('storage.migrateFail'):'❌ فشل التحقق من نقل البيانات — تم الإبقاء على النسخة المحلية','warning');
              }
            });
          }).catch(function(){
            toast(typeof I18n!=='undefined'?I18n.t('storage.migrateFail'):'❌ فشل نقل البيانات','danger');
          });
        }
      }catch(e){/* non-critical — don't cascade */}
    }
    return { usage: usage, bytes: total, limit: limit, pct: Math.round(usage*100) };
  }catch(e){ return null; }
}

// Periodic cleanup timer (every 5 minutes during active game)
// V10-fix: Register with TimerRegistry for clean shutdown
TimerRegistry.setInterval(function _phase4Cleanup(){
  try{
    if(state && state.gameActive){
      cleanupMemory();
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
}, 300000, 'phase4-cleanup');

// Initial storage check after load
setTimeout(function(){ try{ checkStorageUsage(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));} }, 3000);


// ────────────────────────────────────────────────────────
// 4.5  PERFORMANCE MONITOR
// ────────────────────────────────────────────────────────
var PerfMonitor = (function(){
  var _timings    = {};   // { label: { starts:[], ends:[], durations:[] } }
  var _marks      = {};   // { label: timestamp } for start marks
  var _maxSamples = 100;  // Keep last N measurements per label

  function _ensure(label){
    if(!_timings[label]){
      _timings[label] = { starts:[], ends:[], durations:[], count:0, total:0, min:Infinity, max:0 };
    }
  }

  function start(label){
    try{
      _marks[label] = performance.now();
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  }

  function end(label){
    try{
      if(!_marks[label]) return -1;
      var duration = performance.now() - _marks[label];
      delete _marks[label];

      _ensure(label);
      var t = _timings[label];
      t.durations.push(duration);
      t.count++;
      t.total += duration;
      if(duration < t.min) t.min = duration;
      if(duration > t.max) t.max = duration;

      // Cap samples
      if(t.durations.length > _maxSamples){
        t.durations.shift();
      }
      return duration;
    }catch(e){ return -1; }
  }

  function measure(label, fn){
    start(label);
    try{
      var result = fn();
      end(label);
      return result;
    }catch(e){
      end(label);
      throw e;
    }
  }

  function measureAsync(label, fn){
    start(label);
    return fn().then(function(result){
      end(label);
      return result;
    }).catch(function(e){
      end(label);
      throw e;
    });
  }

  function report(){
    var result = {};
    var labels = Object.keys(_timings);
    for(var i=0;i<labels.length;i++){
      var l = labels[i];
      var t = _timings[l];
      var avg = t.count>0? (t.total/t.count) : 0;
      result[l] = {
        count: t.count,
        avg: Math.round(avg*100)/100,
        min: Math.round(t.min*100)/100,
        max: Math.round(t.max*100)/100,
        last: t.durations.length? Math.round(t.durations[t.durations.length-1]*100)/100 : null,
        total: Math.round(t.total*100)/100
      };
    }
    return result;
  }

  function reset(){
    _timings = {};
    _marks = {};
  }

  function summary(){
    var r = report();
    var lines = ['%c╔══════════════════════════════════════╗','background:#1a1a2e;color:#0ff;font-weight:bold'];
    lines.push(['%c║  Performance Monitor Report          ','background:#1a1a2e;color:#0ff;font-weight:bold']);
    lines.push(['%c╚══════════════════════════════════════╝','background:#1a1a2e;color:#0ff;font-weight:bold']);
    var labels = Object.keys(r);
    if(!labels.length){
      lines.push(['No measurements recorded.','color:#888']);
    }
    for(var i=0;i<labels.length;i++){
      var l = labels[i];
      var d = r[l];
      lines.push(['  '+l+': avg='+d.avg+'ms  min='+d.min+'ms  max='+d.max+'ms  ('+d.count+'x)','color:#0f0']);
    }
    // Print each line
    for(var j=0;j<lines.length;j++){
      console.log(lines[j][0], lines[j][1]);
    }
    return r;
  }

  // Auto-track key operations by wrapping common functions
  try{
    // Track showView
    var _origShowView = (typeof showView==='function')? showView : null;
    if(_origShowView){
      // Don't replace - just measure via Store subscription
      if(typeof Store!=='undefined' && Store.subscribe){
        Store.subscribe(function(evt){
          if(evt==='VIEW_CHANGE'){
            try{ PerfMonitor.start('viewSwitch'); setTimeout(function(){ PerfMonitor.end('viewSwitch'); },0); }catch(e){try{ErrorBus.capture(e,"catch#AUTO_251")}catch(_){}}
          }
        });
      }
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  // Track save operations
  try{
    var _origSaveState = (typeof saveState==='function')? saveState : null;
    if(_origSaveState && typeof Store!=='undefined' && Store.subscribe){
      // We detect saves by watching the debounce timer
      // This is indirect but safe
    }
  }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

  return {
    start: start,
    end: end,
    measure: measure,
    measureAsync: measureAsync,
    report: report,
    summary: summary,
    reset: reset
  };
})();


// ────────────────────────────────────────────────────────
// 4.6  CSS CONTAINMENT (Dynamic Style Injection)
// ────────────────────────────────────────────────────────
try{
  var _phase4Style = document.createElement('style');
  _phase4Style.id = 'phase4-containment-css';
  _phase4Style.textContent = [
    /* Virtual list container */
    '.vlist-scroll{contain:layout style paint;will-change:transform;}',
    '.vlist-content{contain:layout style;}',

    /* Admin tabs - isolate each tab panel */
    '.tab-content{contain:content;}',
    '.tab-content.hidden{contain:strict;}',

    /* Question items in list - limit layout scope */
    '.question-item{contain:layout style;}',

    /* Categories list - isolate */
    '#categories-list-admin{contain:layout style;}',

    /* Teams grid */
    '.teams-grid{contain:layout style;}',

    /* Stats cards */
    '.stat-card{contain:layout style paint;}',

    /* Scoreboard */
    '.scoreboard-list{contain:layout style;}',

    /* View containers - isolate each view */
    '[id^="view-"]{contain:layout style;}',

    /* Save indicator animation */
    '#save-indicator{contain:layout style paint;}',

    /* Performance: reduce layout scope on form controls */
    '.form-input,.form-select,.form-textarea{contain:layout style;}',

    /* Modal content isolation */
    '.modal-body{contain:content;}',

    /* Podium canvas strict containment */
    '#podium-canvas{contain:strict;}',

    /* Intro action cards */
    '.intro-action-card{contain:layout style;}',

    /* Question presentation area */
    '.question-box{contain:content;}',
    '.option-btn{contain:layout style paint;}'
  ].join('\n');
  document.head.appendChild(_phase4Style);
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}


// ────────────────────────────────────────────────────────
// 4.7  requestIdleCallback FOR NON-CRITICAL TASKS
// ────────────────────────────────────────────────────────
var _ric = (typeof requestIdleCallback==='function')
  ? requestIdleCallback
  : function(cb){ var start=Date.now(); return setTimeout(function(){ cb({didTimeout:false,timeRemaining:function(){return Math.max(0,50-(Date.now()-start));}}); },1); };

var _cic = (typeof cancelIdleCallback==='function')
  ? cancelIdleCallback
  : clearTimeout;

var IdleTasks = {
  _queue: [],
  _scheduled: false,

  schedule: function(fn, opts){
    opts = opts || {};
    var task = {
      fn: fn,
      label: opts.label || 'anonymous',
      priority: opts.priority || 'low', // 'low' | 'medium'
      timeout: opts.timeout || 5000
    };
    this._queue.push(task);
    if(!this._scheduled){
      this._scheduled = true;
      this._flush();
    }
    return task;
  },

  _flush: function(){
    var self = this;
    _ric(function(deadline){
      // Process as many tasks as we have time for
      while(self._queue.length > 0 && (deadline.timeRemaining() > 5 || deadline.didTimeout)){
        var task = self._queue.shift();
        try{
          PerfMonitor.start('idle:'+task.label);
          task.fn();
          PerfMonitor.end('idle:'+task.label);
        }catch(e){
          try{ if(typeof ErrorBus!=='undefined') ErrorBus.capture(e,'IdleTask:'+task.label); }catch(_){}
        }
      }
      if(self._queue.length > 0){
        // Still have tasks - schedule again
        _ric(function(d){ self._flush.call(self,d); });
      }else{
        self._scheduled = false;
      }
    }, {timeout: 5000});
  },

  pending: function(){ return this._queue.length; },

  clear: function(){ this._queue = []; this._scheduled = false; }
};


// ────────────────────────────────────────────────────────
// HOOK NON-CRITICAL TASKS TO requestIdleCallback
// ────────────────────────────────────────────────────────

// 1. Badge checking → idle
try{
  if(typeof checkBadges==='function'){
    var _origCheckBadges = checkBadges;
    // Replace global checkBadges with idle-scheduled version
    // But DON'T modify the original function - wrap the callsites
    // Instead, we provide a utility that callers can opt into
    window.checkBadgesIdle = function(teamId){
      IdleTasks.schedule(function(){
        try{ _origCheckBadges(teamId); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      }, {label:'checkBadges:'+teamId, timeout:3000});
    };
  }
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

// 2. Stats refreshing → idle
try{
  if(typeof refreshTeamStatsIfVisible==='function'){
    window.refreshTeamStatsIdle = function(){
      IdleTasks.schedule(function(){
        try{ refreshTeamStatsIfVisible(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      }, {label:'refreshTeamStats', timeout:2000});
    };
  }
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

// 3. Backup operations → idle
try{
  if(typeof doBackupNow==='function'){
    window.doBackupNowIdle = function(auto, compact){
      IdleTasks.schedule(function(){
        try{ doBackupNow(auto, compact); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      }, {label:'doBackupNow', timeout:10000, priority:'low'});
    };
  }
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

// 4. Orphaned IDB cleanup → idle
try{
  if(typeof MediaDB!=='undefined' && MediaDB.pruneOrphaned){
    window.pruneOrphanedIdle = function(){
      IdleTasks.schedule(function(){
        try{
          PerfMonitor.start('pruneOrphaned');
          MediaDB.pruneOrphaned().then(function(count){
            PerfMonitor.end('pruneOrphaned');
            if(count>0) console.info('[Phase4] Pruned '+count+' orphaned IDB keys');
          });
        }catch(e){ PerfMonitor.end('pruneOrphaned'); }
      }, {label:'pruneOrphaned', timeout:15000, priority:'low'});
    };
    // Schedule periodic idle IDB cleanup (every 10 minutes)
    // V10-fix: Register with TimerRegistry for clean shutdown
    TimerRegistry.setInterval(function(){
      if(typeof state!=='undefined' && state.gameActive){
        window.pruneOrphanedIdle();
      }
    }, 600000, 'idb-prune');
  }
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

// 5. Storage usage check → idle
try{
  window.checkStorageUsageIdle = function(){
    IdleTasks.schedule(function(){
      try{ var info = checkStorageUsage(); if(info) console.info('[Phase4] Storage: '+info.pct+'% ('+info.bytes+' bytes)'); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    }, {label:'checkStorageUsage', priority:'low'});
  };
  // Run idle storage check every 5 minutes
  // V10-fix: Register with TimerRegistry for clean shutdown
  TimerRegistry.setInterval(function(){ try{ window.checkStorageUsageIdle(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));} }, 300000, 'storage-check');
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}


// ────────────────────────────────────────────────────────
// VIRTUAL LIST INTEGRATION WITH QUESTION ADMIN
// ────────────────────────────────────────────────────────
// Override renderQuestionsAdmin to use virtual scrolling for large lists
try{
  var _origRenderQuestionsAdmin = (typeof renderQuestionsAdmin==='function')? renderQuestionsAdmin : null;
  var _activeVirtualList = null;

  window.renderQuestionsAdminVirtual = function(catId){
    var cat = (typeof state!=='undefined')? state.categories.find(function(c){return c.id===catId;}) : null;
    if(!cat) return;

    // For lists under threshold, use original renderer
    if(cat.questions.length <= VirtualList.VIRTUAL_THRESHOLD){
      if(_activeVirtualList){
        try{ _activeVirtualList.destroy(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
        _activeVirtualList = null;
      }
      if(_origRenderQuestionsAdmin) _origRenderQuestionsAdmin(catId);
      return;
    }

    // Update panel title
    var titleEl = document.getElementById('questions-panel-title');
    if(titleEl){
      titleEl.innerHTML = '<div class="icon icon-accent">❓</div> ' + _sanitizeUser(cat.name)
        + ' <span style="font-size:.75rem;color:var(--text-muted);margin-right:8px">⚡ تمرير افتراضي</span>';
    }

    var container = document.getElementById('questions-list-admin');
    if(!container) return;

    // Build question item renderer
    var renderer = function(q, i){
      var diffBadge = '<span class="diff-badge '+(DIFF_CLASS[q.difficulty||'medium'])+'">'+(DIFF_LABELS[q.difficulty||'medium'])+'</span>';
      var typeBadge = '';
      if(q.type==='image') typeBadge='<span class="q-type-badge q-type-img">🖼️ صورة</span>';
      else if(q.type==='audio') typeBadge='<span class="q-type-badge q-type-audio">🎧 صوتي</span>';
      else if(q.type==='video') typeBadge='<span class="q-type-badge" style="background:rgba(167,139,250,.12);color:#a78bfa;border:1px solid rgba(167,139,250,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">🎬 فيديو</span>';
      else if(q.type==='math') typeBadge='<span class="q-type-badge q-type-math">∑ رياضيات</span>';
      else if(q.type==='tf') typeBadge='<span class="q-type-badge" style="background:rgba(0,230,118,.12);color:var(--success);border:1px solid rgba(0,230,118,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">✓✗ صح/خطأ</span>';
      else if(q.type==='fitb') typeBadge='<span class="q-type-badge" style="background:rgba(0,212,255,.1);color:var(--accent2);border:1px solid rgba(0,212,255,.25);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">___ فراغ</span>';
      else if(q.type==='quran') typeBadge='<span class="q-type-badge" style="background:rgba(245,200,66,.12);color:var(--accent1);border:1px solid rgba(245,200,66,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">📖 قرآن</span>';
      else if(q.type==='order') typeBadge='<span class="q-type-badge" style="background:rgba(167,139,250,.1);color:#a78bfa;border:1px solid rgba(167,139,250,.25);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">📋 ترتيب</span>';
      else if(q.type==='match') typeBadge='<span class="q-type-badge" style="background:rgba(255,179,0,.12);color:var(--accent1);border:1px solid rgba(255,179,0,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">🔗 توصيل</span>';
      else if(q.type==='video') typeBadge='<span class="q-type-badge" style="background:rgba(167,139,250,.12);color:#a78bfa;border:1px solid rgba(167,139,250,.3);padding:2px 7px;border-radius:20px;font-size:.72rem;font-weight:700">🎬 فيديو</span>';

      var mediaHtml = '';
      if(q.type==='image'&&q.mediaData) mediaHtml='<div style="margin-top:5px"><img src="'+_safeMediaSrc(q.mediaData)+'" style="max-height:48px;max-width:120px;border-radius:6px;border:1px solid var(--border);object-fit:cover" alt=""></div>';
      if(q.type==='audio'&&q.mediaData) mediaHtml='<div style="font-size:.72rem;color:var(--accent2);margin-top:3px">🎵 مقطع صوتي مرفق</div>';
      if(q.type==='video'&&(q.mediaData||q.videoRef)) mediaHtml='<div style="font-size:.72rem;color:#a78bfa;margin-top:3px">🎬 فيديو مرفق</div>';
      if(q.mediaAttachment) mediaHtml+='<div style="font-size:.72rem;color:'+(q.mediaAttachment.type==='video'?'#a78bfa':'var(--accent2)')+';margin-top:3px">'+(q.mediaAttachment.type==='video'?'🎬 فيديو ملحق':'🎵 صوتي ملحق')+'</div>';

      var optionsHtml = (q.options||[]).map(function(o,oi){
        var hasImg = !!(q.optionImages&&q.optionImages[oi]);
        var hasMath = !!(o&&o.includes('$'));
        if(!o&&!hasImg) return '';
        var cls = ['option-pill', oi===q.correct?'correct':'', hasImg?'has-img':'', hasMath?'has-math':''].filter(Boolean).join(' ');
        var label = o || (hasImg?'[صورة]':'');
        return '<span class="'+cls+'">'+LETTERS[oi]+'. '+(label.length>18?label.slice(0,16)+'…':label)+'</span>';
      }).join('');

      var explanationHtml = q.explanation? '<div style="font-size:.73rem;color:var(--accent2);margin-top:3px">💡 '+q.explanation+'</div>' : '';

      return '<div class="question-item" data-qidx="'+i+'">'
        + '<div class="question-drag-handle" title="اسحب لإعادة الترتيب">⠿</div>'
        + '<div class="question-num">'+(i+1)+'</div>'
        + '<div class="question-body">'
        + '<div class="question-text">'+typeBadge+' '+q.text+'</div>'
        + mediaHtml
        + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">'
        + diffBadge
        + '<span style="font-size:.74rem;color:var(--text-muted)">⏱'+(q.time||state.settings.defaultTime)+'ث</span>'
        + (q.difficulty==='hard'?'<span style="font-size:.74rem;color:var(--accent1)">✦ '+(state.settings.hardPoints||2)+' نقطة</span>':'')
        + '</div>'
        + '<div class="question-options">'+optionsHtml+'</div>'
        + explanationHtml
        + '</div>'
        + '<div class="question-actions">'
        + '<button class="btn btn-ghost btn-sm btn-icon" onclick="duplicateQuestion(\''+catId+'\',\''+q.id+'\')" title="نسخ السؤال" data-label="نسخ" aria-label="نسخ السؤال">📋</button>'
        + '<button class="btn btn-ghost btn-sm btn-icon" onclick="openQuestionModal(\''+catId+'\',\''+q.id+'\')" title="تعديل" data-label="تعديل" aria-label="تعديل السؤال">✏️</button>'
        + '<button class="btn btn-danger btn-sm btn-icon" onclick="deleteQuestion(\''+catId+'\',\''+q.id+'\')" title="حذف" data-label="حذف" aria-label="حذف السؤال">🗑️</button>'
        + '</div></div>';
    };

    // Destroy previous virtual list
    if(_activeVirtualList){
      try{ _activeVirtualList.destroy(); }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
    }

    // Create virtual list
    _activeVirtualList = new VirtualList(container, {
      data: cat.questions,
      itemHeight: 72,
      renderItem: renderer
    });
  };

  // Note: renderQuestionsAdminVirtual is available but does NOT replace
  // the original renderQuestionsAdmin by default, to avoid breaking existing code.
  // It can be activated by setting: window._useVirtualQuestions = true;
  // When a category has >50 questions, auto-activate:
  var _origSelectCatAdmin = (typeof selectCatAdmin==='function')? selectCatAdmin : null;
  if(_origSelectCatAdmin){
    window.selectCatAdminEnhanced = function(id){
      _origSelectCatAdmin(id);
      // After original renders, check if we should upgrade to virtual list
      var cat = (typeof state!=='undefined')? state.categories.find(function(c){return c.id===id;}) : null;
      if(cat && cat.questions.length > VirtualList.VIRTUAL_THRESHOLD){
        try{
          PerfMonitor.start('virtualList:upgrade');
          window.renderQuestionsAdminVirtual(id);
          PerfMonitor.end('virtualList:upgrade');
        }catch(e){
          try{ if(typeof ErrorBus!=='undefined') ErrorBus.capture(e,'virtualList:upgrade'); }catch(_){}
        }
      }
    };
  }
}catch(e){ try{ if(typeof ErrorBus!=='undefined') ErrorBus.capture(e,'Phase4:VirtualList'); }catch(_){} }


// ────────────────────────────────────────────────────────
// AUTO-TRACK KEY OPERATIONS WITH PerfMonitor
// ────────────────────────────────────────────────────────
try{
  // Track init time (time from DOMContentLoaded to now)
  PerfMonitor.start('init');
  PerfMonitor.end('init'); // captures time since page start approximately

  // Track showView calls
  if(typeof Store!=='undefined' && Store.subscribe){
    Store.subscribe(function(evt, payload){
      if(evt==='VIEW_CHANGE'){
        PerfMonitor.start('viewSwitch');
        requestAnimationFrame(function(){ PerfMonitor.end('viewSwitch'); });
      }
    });
  }

  // Track saveState debounce completion
  // V10-fix: Use longer interval (500ms instead of 100ms) and register for cleanup
  var _lastSaveTimer = null;
  var _perfSaveTracker = TimerRegistry.setInterval(function(){
    try{
      if(typeof _saveStateTimer!=='undefined'){
        if(_saveStateTimer && !_lastSaveTimer){
          PerfMonitor.start('saveState');
        }
        if(!_saveStateTimer && _lastSaveTimer){
          PerfMonitor.end('saveState');
        }
        _lastSaveTimer = _saveStateTimer;
      }
    }catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
  }, 500, 'perf-save-tracker');
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}


// ────────────────────────────────────────────────────────
// EXPOSE ON WINDOW / NAMESPACE
// ────────────────────────────────────────────────────────
try{
  if(window.Quiz){
    window.Quiz.VirtualList     = VirtualList;
    window.Quiz.SmartSave       = SmartSave;
    window.Quiz.PerfMonitor     = PerfMonitor;
    window.Quiz.IdleTasks       = IdleTasks;
    window.Quiz.cleanupMemory   = cleanupMemory;
    window.Quiz.checkStorageUsage = checkStorageUsage;
    window.Quiz.perf            = PerfMonitor; // Quick access: Quiz.perf.report()
  }
}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}

console.info(
  '%c Phase 4 Ready ','background:#1a1a2e;color:#0ff;font-weight:bold',
  'Virtual Scrolling · Lazy Tabs · Smart Save · Memory Mgmt · PerfMonitor · CSS Containment · requestIdleCallback'
);

})(); // end Phase4_Init
