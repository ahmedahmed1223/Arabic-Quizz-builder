(function(){
'use strict';

// ═══════════════════════════════════════════════════════════
//  FEATURE 1: CENTRALIZED NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════════════

const NotificationCenter={
  _notifs:[],
  _batteryMonitored:false,
  _audienceCheckTimer:null,
  /* V14: Bell/Panel notification center properties */
  _items:[],
  _maxItems:50,
  _bellEl:null,
  _panelEl:null,
  _storageKey:'quiz_notifications',

  init(){
    // Sync settings UI with state
    this._syncNotifUI();
    // Start battery monitoring
    this._startBatteryMonitor();
    // Start audience disconnect monitor
    this._startAudienceMonitor();
    /* V14: Load persisted notification items */
    this._load();
    this._renderBell();
  },

  _syncNotifUI(){
    if(!state||!state.settings)return;
    const ne=state.settings.notifEnabled||{};
    ['extLibUpdate','insufficientQuestions','lowBattery','audienceDisconnect'].forEach(k=>{
      const el=document.getElementById('s-notif-'+k);
      if(el)el.checked=ne[k]!==false;
    });
  },

  show(type,message,action){
    if(!state.settings.notifEnabled||state.settings.notifEnabled[type]===false)return;
    const id='notif_'+Date.now()+'_'+Math.random().toString(36).substr(2,4);
    const typeMap={extLibUpdate:'info',insufficientQuestions:'warning',lowBattery:'danger',audienceDisconnect:'warning'};
    const notifType=typeMap[type]||'info';
    const container=document.getElementById('notif-bar-container');
    if(!container)return;
    // Limit to 3 bars
    while(container.children.length>=3){
      container.removeChild(container.firstChild);
    }
    const bar=document.createElement('div');
    bar.className='notif-bar '+notifType;
    bar.id=id;
    bar.setAttribute('role','alert');
    let html='<span class="notif-bar-icon">'+this._iconFor(type)+'</span>';
    html+='<span class="notif-bar-msg">'+message+'</span>';
    if(action&&action.label){
      html+='<button class="notif-bar-action" onclick="NotificationCenter._execAction(\''+id+'\')">'+action.label+'</button>';
    }
    html+='<button class="notif-bar-close" onclick="NotificationCenter.dismiss(\''+id+'\')" aria-label="إغلاق">✕</button>';
    html+='<div class="notif-bar-progress"><div class="notif-bar-progress-bar" id="'+id+'-prog"></div></div>';
    bar.innerHTML=html;
    if(action)bar._action=action.fn;
    container.appendChild(bar);
    // Auto-dismiss after 5s
    const progEl=document.getElementById(id+'-prog');
    if(progEl){progEl.style.transition='width 5s linear';progEl.style.width='0%';setTimeout(()=>{progEl.style.width='100%';},10);}
    bar._timer=setTimeout(()=>{NotificationCenter.dismiss(id);},5000);
    this._notifs.push({id,type,message});
  },

  dismiss(id){
    const bar=document.getElementById(id);
    if(!bar)return;
    clearTimeout(bar._timer);
    bar.classList.add('notif-exit');
    setTimeout(()=>{if(bar.parentNode)bar.parentNode.removeChild(bar);},400);
    this._notifs=this._notifs.filter(n=>n.id!==id);
  },

  _execAction(id){
    const bar=document.getElementById(id);
    if(bar&&bar._action){try{bar._action();}catch(e){}}
    this.dismiss(id);
  },

  _iconFor(type){
    const icons={extLibUpdate:'📥',insufficientQuestions:'⚠️',lowBattery:'🔋',audienceDisconnect:'🖥️'};
    return icons[type]||'🔔';
  },

  _startBatteryMonitor(){
    if(this._batteryMonitored)return;
    if(!navigator.getBattery)return;
    this._batteryMonitored=true;
    navigator.getBattery().then(battery=>{
      const checkLow=()=>{
        if(battery.level<=0.15&&!battery.charging&&state.gameActive){
          this.show('lowBattery','🔋 بطارية منخفضة ('+Math.round(battery.level*100)+'%) — يُنصح بالحفظ والخروج',
            {label:'حفظ وخروج',fn:()=>{saveState();if(state.gameActive)endCompetition();}});
        }
      };
      battery.addEventListener('levelchange',checkLow);
      battery.addEventListener('chargingchange',checkLow);
      checkLow();
    }).catch(()=>{});
  },

  _startAudienceMonitor(){
    if(this._audienceCheckTimer)return;
    this._audienceCheckTimer=setInterval(()=>{
      if(!state.gameActive)return;
      if(typeof _audienceWin==='undefined'||!_audienceWin||_audienceWin.closed){
        // Don't alert if never opened or intentionally closed
        if(typeof _audienceWin!=='undefined'&&_audienceWin===null)return;
      }
      // Check if audience win was open and is now closed
      try{
        if(typeof _audienceWin!=='undefined'&&_audienceWin&&_audienceWin.closed&&state.gameActive){
          this.show('audienceDisconnect','🖥️ انقطعت شاشة الجمهور',
            {label:'إعادة الاتصال',fn:()=>{if(typeof showAudienceScreen==='function')showAudienceScreen();}});
        }
      }catch(e){}
    },3000);
  },

  checkInsufficientQuestions(){
    const activeCats=getPlayableCats({all:true});
    const insufficient=activeCats.filter(c=>!c.questions||c.questions.length===0);
    if(insufficient.length>0){
      this.show('insufficientQuestions',
        '⚠️ '+insufficient.length+' قسم بدون أسئلة كافية',
        {label:'إضافة أسئلة',fn:()=>{if(typeof switchTab==='function')switchTab('categories',document.querySelectorAll('.nav-tab')[1]);}});
      return true;
    }
    return false;
  },

  notifyExtLibUpdate(updatedCats){
    this.show('extLibUpdate',
      '📥 تحديث متاح — '+updatedCats+' قسم محدّث في بنك الأسئلة الخارجي',
      {label:'تحديث الآن',fn:()=>{if(typeof applyExtLibImport==='function')applyExtLibImport();}});
  },

  /* ── V14: Bell & Panel Notification Center ── */
  add(notification){
    this._items.unshift({
      id:Date.now()+Math.random(),
      type:notification.type||'info',
      icon:notification.icon||'ℹ️',
      text:notification.text||'',
      time:new Date().toISOString(),
      read:false
    });
    if(this._items.length>this._maxItems)this._items.pop();
    this._save();
    this._updateBadge();
    this._renderPanelItems();
    /* Also show as toast */
    if(typeof toast==='function')toast(notification.text,notification.type==='error'?'error':notification.type==='warning'?'warning':'info');
  },
  markAllRead(){
    this._items.forEach(function(n){n.read=true});
    this._save();
    this._updateBadge();
    this._renderPanelItems();
  },
  clearAll(){
    this._items=[];
    this._save();
    this._updateBadge();
    this._renderPanelItems();
  },
  getUnreadCount(){
    return this._items.filter(function(n){return!n.read}).length;
  },
  togglePanel(){
    if(!this._panelEl)return;
    var isOpen=this._panelEl.classList.contains('open');
    if(isOpen){this._panelEl.classList.remove('open');this._panelEl.style.display='none';this.markAllRead();}
    else{this._panelEl.classList.add('open');this._panelEl.style.display='block';}
  },
  _renderBell(){
    var header=document.querySelector('.admin-header');
    if(!header)return;
    /* Check if bell already exists */
    if(document.getElementById('notification-bell'))return;
    var bellWrapper=h('div.notification-bell',{id:'notification-bell',onclick:function(){NotificationCenter.togglePanel()}},
      h('span.bell-icon','🔔'),
      h('span.notification-badge',{id:'notification-badge'},'')
    );
    var panel=h('div.notification-panel',{id:'notification-panel'},
      h('div.notification-panel-header',
        h('span','الإشعارات'),
        h('button',{onclick:function(){NotificationCenter.clearAll()}},'مسح الكل')
      ),
      h('div.notification-list',{id:'notification-list'})
    );
    bellWrapper.style.position='relative';
    bellWrapper.appendChild(panel);
    panel.style.display='none';
    /* Insert before language button or at end of header */
    var langBtn=header.querySelector('[onclick*="toggleLang"]')||header.querySelector('.lang-btn');
    if(langBtn&&langBtn.parentNode){langBtn.parentNode.insertBefore(bellWrapper,langBtn)}
    else{header.appendChild(bellWrapper)}
    this._bellEl=bellWrapper;
    this._panelEl=panel;
    this._updateBadge();
    this._renderPanelItems();
    /* Click outside to close */
    document.addEventListener('click',function(e){
      if(bellWrapper&&!bellWrapper.contains(e.target)){panel.style.display='none';panel.classList.remove('open')}
    });
  },
  _updateBadge(){
    var badge=document.getElementById('notification-badge');
    if(!badge)return;
    var count=this.getUnreadCount();
    badge.textContent=count>0?(count>9?'9+':String(count)):'';
    badge.style.display=count>0?'flex':'none';
  },
  _renderPanelItems(){
    var list=document.getElementById('notification-list');
    if(!list)return;
    if(!this._items.length){
      list.innerHTML='<div class="notification-empty">لا توجد إشعارات</div>';
      return;
    }
    list.innerHTML=this._items.slice(0,20).map(function(n){
      var timeStr=NotificationCenter._formatTime(n.time);
      return '<div class="notification-item'+(n.read?'':' unread')+'"><span class="notification-icon">'+n.icon+'</span><div class="notification-content"><div class="notification-text">'+n.text+'</div><div class="notification-time">'+timeStr+'</div></div></div>';
    }).join('');
  },
  _formatTime(isoStr){
    var d=new Date(isoStr);
    var now=new Date();
    var diff=Math.floor((now-d)/1000);
    if(diff<60)return'الآن';
    if(diff<3600)return'منذ '+Math.floor(diff/60)+' دقيقة';
    if(diff<86400)return'منذ '+Math.floor(diff/3600)+' ساعة';
    return'منذ '+Math.floor(diff/86400)+' يوم';
  },
  _save(){
    try{localStorage.setItem(this._storageKey,JSON.stringify(this._items))}catch(e){}
  },
  _load(){
    try{var data=localStorage.getItem(this._storageKey);if(data)this._items=JSON.parse(data)}catch(e){this._items=[]}
  }
};

window.NotificationCenter=NotificationCenter;
window.updateNotifEnabled=function(key,val){
  if(!state.settings.notifEnabled)state.settings.notifEnabled={};
  state.settings.notifEnabled[key]=val;
  saveState();
};

// Integration: check insufficient questions on startCompetition
const _origStartCompetition=window.startCompetition;
window.startCompetition=function(){
  if(!getPlayableCats({withQuestions:true}).length){
    toast(I18n.t('toast.addCategoriesFirst'),'danger');return;
  }
  if(NotificationCenter.checkInsufficientQuestions())return;
  _origStartCompetition.apply(this,arguments);
};

// Integration: notify on ext lib update - V14 improved
// Guard against the original not being defined (e.g., 40-features-block.js failed to load)
const _origFetchExtLib=window.fetchExternalLibrary;
window.fetchExternalLibrary=async function(){
  if(typeof _origFetchExtLib!=='function'){
    if(typeof toast==='function') toast('وحدة المكتبة الخارجية غير محمّلة','danger');
    else console.error('[ExtLib] fetchExternalLibrary original not loaded');
    return;
  }
  await _origFetchExtLib.apply(this,arguments);
  // After fetch, notify user if there are new/updated categories
  try{
    // _extLibData is inside the IIFE closure, check preview to determine updates
    const previewEl=document.getElementById('ext-lib-preview');
    if(previewEl&&!previewEl.classList.contains('hidden')){
      // The fetch succeeded and preview is shown - remove the update banner since data is fresh
      const importTab=document.getElementById('tab-import');
      if(importTab){
        const banner=importTab.querySelector('.ext-lib-update-banner');
        if(banner)banner.remove();
      }
    }
  }catch(e){}
};

// ═══════════════════════════════════════════════════════════
//  FEATURE 2: ADVANCED SEARCH & SMART FILTERING
// ═══════════════════════════════════════════════════════════

const QTypeIcons={
  text:'❓',tf:'✅',fitb:'📝',order:'🔢',match:'🔗',
  image:'🖼️',audio:'🎵',video:'🎬',math:'📐',quran:'📖'
};

// Override filterQuestions to search in text, options AND explanation
window.filterQuestions=function(term){
  state.qSearchTerm=term.trim().toLowerCase();
  renderQuestionsFiltered();
};

// Override renderQuestionsFiltered to show compact cards and search all fields
window.renderQuestionsFiltered=function(){
  if(!state.currentCatId)return;
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  if(!cat)return;
  const term=state.qSearchTerm;
  const mode=state.qFilterMode||'all';
  const adv=state.advFilters||{advCat:'',hasImage:false,hasExplanation:false};
  // If advCat is set, search across all categories
  const catsToSearch=adv.advCat?state.categories.filter(c=>c.id===adv.advCat):[cat];

  let allFiltered=[];
  catsToSearch.forEach(c=>{
    c.questions.forEach((q,i)=>{
      const matchDiff=mode==='all'||
        q.difficulty===mode||
        (mode==='tf'&&q.type==='tf')||
        (mode==='fitb'&&q.type==='fitb')||
        (mode==='order'&&q.type==='order')||
        (mode==='match'&&q.type==='match');
      const matchTerm=!term||
        (q.text&&q.text.toLowerCase().includes(term))||
        (q.options||[]).some(o=>o&&o.toLowerCase().includes(term))||
        (q.explanation&&q.explanation.toLowerCase().includes(term));
      const matchImage=!adv.hasImage||(q.type==='image'&&q.mediaData)||(q.optionImages&&q.optionImages.some(Boolean));
      const matchExplanation=!adv.hasExplanation||(q.explanation&&q.explanation.trim().length>0);
      if(matchDiff&&matchTerm&&matchImage&&matchExplanation){
        allFiltered.push({q,catId:c.id,catName:c.name,qIdx:i});
      }
    });
  });

  // Update search count badge
  const countEl=document.getElementById('q-search-count');
  if(countEl){
    countEl.textContent=allFiltered.length;
    countEl.style.display=allFiltered.length>0||term?'':'none';
  }

  const el=document.getElementById('questions-list-admin');
  if(!el)return;
  if(!allFiltered.length){
    el.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><p>لا توجد نتائج</p></div>';
    return;
  }

  el.innerHTML='<div class="questions-list">'+allFiltered.map(({q,catId,catName,qIdx})=>{
    const icon=QTypeIcons[q.type]||'❓';
    const preview=(q.text||'').substring(0,50)+(q.text&&q.text.length>50?'…':'');
    const diffBadge='<span class="diff-badge '+(DIFF_CLASS[q.difficulty||'medium'])+'">'+(DIFF_LABELS[q.difficulty||'medium'])+'</span>';
    const typeIcon='<span class="search-result-icon">'+icon+'</span>';
    // Show compact card layout
    return '<div class="search-result-card" onclick="openQuestionModal(\''+catId+'\',\''+q.id+'\')">'+
      typeIcon+
      '<div class="search-result-text">'+_sanitize(preview)+'</div>'+
      '<div class="search-result-badges">'+diffBadge+
      (catName&&catId!==state.currentCatId?'<span style="font-size:.68rem;color:var(--text-muted)">📂 '+_sanitize(catName)+'</span>':'')+
      '</div>'+
      '<div style="display:flex;gap:2px;flex-shrink:0">'+
      '<button class="btn btn-ghost btn-sm btn-icon" style="padding:2px 4px;font-size:.7rem" onclick="event.stopPropagation();quickEditQuestion(\''+catId+'\',\''+q.id+'\')" title="تعديل سريع">✏️</button>'+
      '<button class="btn btn-danger btn-sm btn-icon" style="padding:2px 4px;font-size:.7rem" onclick="event.stopPropagation();deleteQuestion(\''+catId+'\',\''+q.id+'\')" title="حذف">🗑️</button>'+
      '</div></div>';
  }).join('')+'</div>';
};

window.toggleAdvSearch=function(){
  const panel=document.getElementById('adv-search-panel');
  if(!panel)return;
  state.advSearchOpen=!state.advSearchOpen;
  panel.style.display=state.advSearchOpen?'block':'none';
  if(state.advSearchOpen){
    // Populate category dropdown
    const catSel=document.getElementById('adv-filter-cat');
    if(catSel){
      catSel.innerHTML='<option value="">كل الأقسام</option>';
      state.categories.forEach(c=>{
        catSel.innerHTML+='<option value="'+c.id+'">'+(c.icon||'📚')+' '+_sanitize(c.name)+'</option>';
      });
      catSel.value=state.advFilters.advCat||'';
    }
    // Sync chip states
    document.querySelectorAll('.adv-filter-chip').forEach(ch=>{
      const advKey=ch.getAttribute('data-adv');
      if(state.advFilters[advKey])ch.classList.add('active');else ch.classList.remove('active');
    });
    renderSavedFilters();
  }
};

window.toggleAdvChip=function(el){
  const key=el.getAttribute('data-adv');
  state.advFilters[key]=!state.advFilters[key];
  el.classList.toggle('active',state.advFilters[key]);
  renderQuestionsFiltered();
};

window.applyAdvFilters=function(){
  const catSel=document.getElementById('adv-filter-cat');
  if(catSel)state.advFilters.advCat=catSel.value;
  renderQuestionsFiltered();
};

window.clearAdvFilters=function(){
  state.advFilters={advCat:'',hasImage:false,hasExplanation:false};
  const catSel=document.getElementById('adv-filter-cat');
  if(catSel)catSel.value='';
  document.querySelectorAll('.adv-filter-chip').forEach(ch=>ch.classList.remove('active'));
  state.qFilterMode='all';
  state.qSearchTerm='';
  const searchInput=document.getElementById('q-search-input');
  if(searchInput)searchInput.value='';
  document.querySelectorAll('.q-filter-btn').forEach(b=>b.classList.remove('active'));
  const allBtn=document.querySelector('.q-filter-btn[data-filter="all"]');
  if(allBtn)allBtn.classList.add('active');
  renderQuestionsAdmin(state.currentCatId);
};

window.saveCurrentFilterPrompt=function(){
  const name=prompt('أدخل اسماً للفلتر المحفوظ:');
  if(!name||!name.trim())return;
  const filter={
    id:'sf_'+Date.now(),
    name:name.trim(),
    criteria:{
      mode:state.qFilterMode,
      term:state.qSearchTerm,
      advCat:state.advFilters.advCat||'',
      hasImage:!!state.advFilters.hasImage,
      hasExplanation:!!state.advFilters.hasExplanation
    }
  };
  if(!state.savedFilters)state.savedFilters=[];
  state.savedFilters.push(filter);
  saveState();
  renderSavedFilters();
  toast('تم حفظ الفلتر ✓','success');
};

window.applySavedFilter=function(id){
  const f=(state.savedFilters||[]).find(sf=>sf.id===id);
  if(!f)return;
  state.qFilterMode=f.criteria.mode||'all';
  state.qSearchTerm=f.criteria.term||'';
  state.advFilters={
    advCat:f.criteria.advCat||'',
    hasImage:!!f.criteria.hasImage,
    hasExplanation:!!f.criteria.hasExplanation
  };
  // Sync UI
  const searchInput=document.getElementById('q-search-input');
  if(searchInput)searchInput.value=state.qSearchTerm;
  document.querySelectorAll('.q-filter-btn').forEach(b=>b.classList.remove('active'));
  const activeBtn=document.querySelector('.q-filter-btn[data-filter="'+state.qFilterMode+'"]');
  if(activeBtn)activeBtn.classList.add('active');
  const catSel=document.getElementById('adv-filter-cat');
  if(catSel)catSel.value=state.advFilters.advCat||'';
  document.querySelectorAll('.adv-filter-chip').forEach(ch=>{
    const key=ch.getAttribute('data-adv');
    ch.classList.toggle('active',!!state.advFilters[key]);
  });
  renderQuestionsFiltered();
};

window.deleteSavedFilter=function(id){
  state.savedFilters=(state.savedFilters||[]).filter(f=>f.id!==id);
  saveState();
  renderSavedFilters();
};

function renderSavedFilters(){
  const row=document.getElementById('saved-filters-row');
  if(!row)return;
  if(!state.savedFilters||!state.savedFilters.length){row.innerHTML='';return;}
  row.innerHTML=state.savedFilters.map(f=>
    '<span class="saved-filter-btn" onclick="applySavedFilter(\''+f.id+'\')">'+
    '🔖 '+_sanitize(f.name)+
    ' <span class="sf-delete" onclick="event.stopPropagation();deleteSavedFilter(\''+f.id+'\')">✕</span>'+
    '</span>'
  ).join('');
}

// Quick edit - opens inline edit for question text
window.quickEditQuestion=function(catId,qId){
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat)return;
  const q=cat.questions.find(qq=>qq.id===qId);
  if(!q)return;
  // Find the card element and replace text with edit field
  const cards=document.querySelectorAll('.search-result-card');
  for(const card of cards){
    const editBtn=card.querySelector('button[onclick*="quickEditQuestion(\''+catId+'\',\''+qId+'\')"]');
    if(editBtn){
      const textEl=card.querySelector('.search-result-text');
      if(textEl&&!card.querySelector('.quick-edit-field')){
        const origText=q.text;
        textEl.innerHTML='<input class="quick-edit-field" value="'+_sanitize(origText).replace(/"/g,'&quot;')+'" onkeydown="if(event.key===\'Enter\')commitQuickEdit(\''+catId+'\',\''+qId+'\',this.value);if(event.key===\'Escape\')renderQuestionsFiltered()" onblur="commitQuickEdit(\''+catId+'\',\''+qId+'\',this.value)">';
        textEl.querySelector('.quick-edit-field').focus();
      }
      break;
    }
  }
};

window.commitQuickEdit=function(catId,qId,newText){
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat)return;
  const q=cat.questions.find(qq=>qq.id===qId);
  if(!q)return;
  if(newText.trim()&&newText.trim()!==q.text){
    q.text=newText.trim();
    saveState();
    toast('تم تحديث السؤال ✓','success');
  }
  renderQuestionsFiltered();
};

// ═══════════════════════════════════════════════════════════
//  FEATURE 3: RESULTS SHARING & CERTIFICATES
// ═══════════════════════════════════════════════════════════

// Calculate stats for a team
function getTeamStats(teamId){
  const ss=state.sessionStats&&state.sessionStats[teamId];
  const stats={correctPct:0,fastestAnswer:null,longestStreak:0};
  if(!ss)return stats;
  const total=(ss.correct||0)+(ss.wrong||0)+(ss.skipped||0);
  stats.correctPct=total>0?Math.round((ss.correct||0)/total*100):0;
  // Find fastest answer from sessionStats
  if(ss.answers&&ss.answers.length){
    const times=ss.answers.filter(a=>a.time!=null).map(a=>a.time);
    if(times.length)stats.fastestAnswer=Math.min(...times);
  }
  // Longest streak from teamStreaks history
  const streak=state.teamStreaks&&state.teamStreaks[teamId];
  stats.longestStreak=streak||0;
  // Also check scoreHistory for better streak calc
  if(state.scoreHistory&&state.scoreHistory.length){
    const teamScores=state.scoreHistory.filter(h=>h.teamId===teamId);
    let maxStreak=0,curStreak=0;
    teamScores.forEach(h=>{
      if(h.delta>0){curStreak++;maxStreak=Math.max(maxStreak,curStreak);}
      else{curStreak=0;}
    });
    stats.longestStreak=Math.max(stats.longestStreak,maxStreak);
  }
  return stats;
}

// Override openWinnerCertificate to support team selection and stats
const _origOpenWinnerCert=window.openWinnerCertificate;
window.openWinnerCertificate=function(teamId){
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  if(!sorted.length){toast(I18n.t('toast.noTeams'),'info');return;}

  // Move modal to body
  const certModal=document.getElementById('modal-certificate');
  if(certModal&&certModal.parentElement!==document.body)document.body.appendChild(certModal);
  // Reset avatar wrap
  const certWrap=document.getElementById('cert-avatar-wrap');
  if(certWrap)certWrap.innerHTML='<span id="cert-avatar-letter" style="font-size:1.8rem;font-weight:900;color:#fff"></span>';

  // Setup team selector
  const selector=document.getElementById('cert-team-selector');
  const select=document.getElementById('cert-team-select');
  if(selector&&select&&sorted.length>1){
    selector.style.display='block';
    select.innerHTML=sorted.map((t,i)=>
      '<option value="'+t.id+'"'+(i===0?' selected':'')+'>'+(i+1)+'. '+_sanitize(t.name)+' ('+t.score+' نقطة)</option>'
    ).join('');
  }

  // Display selected team (or winner)
  const team=teamId?state.teams.find(t=>t.id===teamId):sorted[0];
  if(!team){if(sorted[0])updateCertForTeam(sorted[0].id);return;}
  updateCertForTeam(team.id);

  _applyCertBg();
  _applyCertSettings();
  certModal.classList.remove('hidden');
};

window.updateCertForTeam=function(teamId){
  const team=state.teams.find(t=>t.id===teamId);
  if(!team)return;
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  const rank=sorted.findIndex(t=>t.id===teamId)+1;
  const rankLabels=['الأول','الثاني','الثالث'];

  document.getElementById('cert-winner-name').textContent=team.name;
  document.getElementById('cert-comp-name').textContent=state.settings.name||'المسابقة';
  document.getElementById('cert-score-row').textContent=
    'المركز '+rankLabels[rank-1]+' — بمجموع '+team.score+' نقطة';

  // Update rank display text
  const rankLabel=document.querySelector('#certificate-content [data-i18n="cert.firstPlace"]');
  if(rankLabel){
    if(rank===1)rankLabel.textContent='لتحقيقه المركز الأول في مسابقة';
    else if(rank===2)rankLabel.textContent='لتحقيقه المركز الثاني في مسابقة';
    else if(rank===3)rankLabel.textContent='لتحقيقه المركز الثالث في مسابقة';
    else rankLabel.textContent='لمشاركته في مسابقة';
  }

  const certLetter=document.getElementById('cert-avatar-letter');
  const certWrap=document.getElementById('cert-avatar-wrap');
  if(team.teamImage&&certWrap){
    certWrap.innerHTML='<img src="'+team.teamImage+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
  }else if(certLetter){
    certLetter.textContent=team.name.charAt(0);
    certLetter.style.color='#fff';
    certLetter.style.textShadow='0 1px 4px rgba(0,0,0,.4)';
  }
  if(certWrap&&!team.teamImage)certWrap.style.background=team.color||'#00d4ff';

  // Date
  const now=new Date();
  const greg=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',calendar:'gregory'});
  const hijri=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',calendar:'islamic'});
  document.getElementById('cert-date').textContent=greg+' — '+hijri;

  // Stats
  const stats=getTeamStats(teamId);
  const correctEl=document.getElementById('cert-stat-correct');
  const fastestEl=document.getElementById('cert-stat-fastest');
  const streakEl=document.getElementById('cert-stat-streak');
  if(correctEl)correctEl.textContent=stats.correctPct+'%';
  if(fastestEl)fastestEl.textContent=stats.fastestAnswer!=null?stats.fastestAnswer+'ث':'—';
  if(streakEl)streakEl.textContent=stats.longestStreak>0?stats.longestStreak:'—';
};

// Generate certificate as PNG
window.generateCertificatePNG=function(){
  const certContent=document.getElementById('certificate-content');
  if(!certContent){toast('خطأ: لم يتم العثور على الشهادة','danger');return;}

  const W=800,H=600;
  const canvas=document.createElement('canvas');
  canvas.width=W*2;canvas.height=H*2;
  const ctx=canvas.getContext('2d');
  ctx.scale(2,2);

  // Background
  const s=state.settings;
  const gradStart=s.certBgGradStart||'#fffdf5';
  const gradEnd=s.certBgGradEnd||'#fef3b0';
  const grd=ctx.createLinearGradient(0,0,W,H);
  grd.addColorStop(0,gradStart);grd.addColorStop(1,gradEnd);
  ctx.fillStyle=grd;
  roundRect(ctx,0,0,W,H,20);ctx.fill();

  // Border
  const borderCol=s.certBorderColor||'#f5c842';
  ctx.strokeStyle=borderCol;ctx.lineWidth=5;
  roundRect(ctx,2,2,W-4,H-4,18);ctx.stroke();

  // Title
  const titleCol=s.certTextColor||'#b8860b';
  ctx.textAlign='center';
  ctx.fillStyle=titleCol;
  ctx.font='bold 28px Cairo, Arial, sans-serif';
  ctx.fillText('🏆',W/2,50);
  ctx.font='bold 24px Cairo, Arial, sans-serif';
  ctx.fillText(s.certTitle||'شهادة تفوق وتميّز',W/2,85);

  // Awarded to
  ctx.fillStyle='#999';ctx.font='14px Cairo, Arial, sans-serif';
  ctx.fillText('تُمنح هذه الشهادة لـ',W/2,115);

  // Winner name
  const winnerEl=document.getElementById('cert-winner-name');
  ctx.fillStyle='#7a5800';ctx.font='bold 32px Cairo, Arial, sans-serif';
  ctx.fillText(winnerEl?winnerEl.textContent:'الفائز',W/2,160);

  // Competition name
  ctx.fillStyle='#888';ctx.font='14px Cairo, Arial, sans-serif';
  ctx.fillText('في مسابقة',W/2,190);
  ctx.fillStyle=titleCol;ctx.font='bold 20px Cairo, Arial, sans-serif';
  ctx.fillText(s.name||'المسابقة',W/2,220);

  // Score
  const scoreEl=document.getElementById('cert-score-row');
  if(scoreEl&&s.certShowScore!==false){
    ctx.fillStyle='#888';ctx.font='14px Cairo, Arial, sans-serif';
    ctx.fillText(scoreEl.textContent,W/2,250);
  }

  // Stats
  const statsSection=document.getElementById('cert-stats-section');
  if(statsSection){
    const y=280;
    const correctEl=document.getElementById('cert-stat-correct');
    const fastestEl=document.getElementById('cert-stat-fastest');
    const streakEl=document.getElementById('cert-stat-streak');
    ctx.font='bold 18px Cairo, Arial, sans-serif';
    ctx.fillStyle=titleCol;
    ctx.fillText((correctEl?correctEl.textContent:'—')+'  نسبة الصحة',W/2-200,y);
    ctx.fillText((fastestEl?fastestEl.textContent:'—')+'  أسرع إجابة',W/2,y);
    ctx.fillText((streakEl?streakEl.textContent:'—')+'  أطول سلسلة',W/2+200,y);
  }

  // Date
  if(s.certShowDate!==false){
    const dateEl=document.getElementById('cert-date');
    ctx.fillStyle='#aaa';ctx.font='12px Cairo, Arial, sans-serif';
    ctx.textAlign='right';
    ctx.fillText(dateEl?dateEl.textContent:'',W-40,H-30);
  }

  // Download
  const link=document.createElement('a');
  link.download='certificate-'+(s.name||'quiz')+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
  toast('تم تحميل الشهادة كصورة PNG ✓','success');
};

// Share certificate via Web Share API
window.shareCertificate=async function(){
  const certContent=document.getElementById('certificate-content');
  if(!certContent){toast('خطأ: لم يتم العثور على الشهادة','danger');return;}

  // Generate PNG blob for sharing
  const W=800,H=600;
  const canvas=document.createElement('canvas');
  canvas.width=W*2;canvas.height=H*2;
  const ctx=canvas.getContext('2d');
  ctx.scale(2,2);
  // Same drawing as generateCertificatePNG
  const s=state.settings;
  const gradStart=s.certBgGradStart||'#fffdf5';
  const gradEnd=s.certBgGradEnd||'#fef3b0';
  const grd=ctx.createLinearGradient(0,0,W,H);
  grd.addColorStop(0,gradStart);grd.addColorStop(1,gradEnd);
  ctx.fillStyle=grd;
  roundRect(ctx,0,0,W,H,20);ctx.fill();
  const borderCol=s.certBorderColor||'#f5c842';
  ctx.strokeStyle=borderCol;ctx.lineWidth=5;
  roundRect(ctx,2,2,W-4,H-4,18);ctx.stroke();
  const titleCol=s.certTextColor||'#b8860b';
  ctx.textAlign='center';
  ctx.fillStyle=titleCol;ctx.font='bold 28px Cairo, Arial, sans-serif';ctx.fillText('🏆',W/2,50);
  ctx.font='bold 24px Cairo, Arial, sans-serif';ctx.fillText(s.certTitle||'شهادة تفوق وتميّز',W/2,85);
  ctx.fillStyle='#999';ctx.font='14px Cairo, Arial, sans-serif';ctx.fillText('تُمنح هذه الشهادة لـ',W/2,115);
  const winnerEl=document.getElementById('cert-winner-name');
  ctx.fillStyle='#7a5800';ctx.font='bold 32px Cairo, Arial, sans-serif';ctx.fillText(winnerEl?winnerEl.textContent:'الفائز',W/2,160);
  ctx.fillStyle='#888';ctx.font='14px Cairo, Arial, sans-serif';ctx.fillText('في مسابقة',W/2,190);
  ctx.fillStyle=titleCol;ctx.font='bold 20px Cairo, Arial, sans-serif';ctx.fillText(s.name||'المسابقة',W/2,220);
  const scoreEl=document.getElementById('cert-score-row');
  if(scoreEl&&s.certShowScore!==false){ctx.fillStyle='#888';ctx.font='14px Cairo, Arial, sans-serif';ctx.fillText(scoreEl.textContent,W/2,250);}

  canvas.toBlob(async function(blob){
    if(navigator.share&&navigator.canShare){
      const file=new File([blob],'certificate.png',{type:'image/png'});
      const shareData={title:'شهادة المسابقة',text:'نتائج مسابقة '+(s.name||''),files:[file]};
      if(navigator.canShare(shareData)){
        try{await navigator.share(shareData);toast('تمت المشاركة ✓','success');return;}
        catch(e){if(e.name==='AbortError')return;}
      }
    }
    // Fallback: download
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download='certificate.png';a.click();
    URL.revokeObjectURL(url);
    toast('تم تحميل الشهادة (المشاركة غير مدعومة في هذا المتصفح)','info');
  },'image/png');
};

// Generate social media summary card as PNG
window.generateSocialCard=function(){
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  if(!sorted.length){toast('لا توجد فرق','danger');return;}

  const W=500,H=400;
  const canvas=document.createElement('canvas');
  canvas.width=W*2;canvas.height=H*2;
  const ctx=canvas.getContext('2d');
  ctx.scale(2,2);

  // Dark gradient background
  const grd=ctx.createLinearGradient(0,0,W,H);
  grd.addColorStop(0,'#1a1a2e');grd.addColorStop(1,'#16213e');
  ctx.fillStyle=grd;
  roundRect(ctx,0,0,W,H,16);ctx.fill();

  // Border
  ctx.strokeStyle='#f5c842';ctx.lineWidth=3;
  roundRect(ctx,1,1,W-2,H-2,15);ctx.stroke();

  // Title
  ctx.textAlign='center';
  ctx.fillStyle='#f5c842';ctx.font='bold 22px Cairo, Arial, sans-serif';
  ctx.fillText('🏆 '+(state.settings.name||'المسابقة'),W/2,45);

  // Top 3
  const top3=sorted.slice(0,3);
  const medals=['🥇','🥈','🥉'];
  top3.forEach((t,i)=>{
    const y=90+i*55;
    ctx.textAlign='right';
    ctx.fillStyle=t.color||'#00d4ff';ctx.font='bold 18px Cairo, Arial, sans-serif';
    ctx.fillText(medals[i]+' '+t.name,W-30,y);
    ctx.textAlign='left';
    ctx.fillStyle='#fff';ctx.font='bold 18px Cairo, Arial, sans-serif';
    ctx.fillText(t.score+' نقطة',30,y);
  });

  // Footer
  ctx.textAlign='center';
  ctx.fillStyle='#888';ctx.font='12px Cairo, Arial, sans-serif';
  const now=new Date();
  ctx.fillText(now.toLocaleDateString('ar'),W/2,H-20);

  // Download
  const link=document.createElement('a');
  link.download='quiz-results-'+(state.settings.name||'quiz')+'.png';
  link.href=canvas.toDataURL('image/png');
  link.click();
  toast('تم تحميل بطاقة المشاركة ✓','success');

  // Also offer Web Share
  canvas.toBlob(async function(blob){
    if(navigator.share&&navigator.canShare){
      const file=new File([blob],'quiz-results.png',{type:'image/png'});
      const shareData={title:'نتائج المسابقة',text:'نتائج مسابقة '+(state.settings.name||''),files:[file]};
      if(navigator.canShare(shareData)){
        try{await navigator.share(shareData);toast('تمت المشاركة ✓','success');}
        catch(e){}
      }
    }
  },'image/png');
};

// Helper: draw rounded rect on canvas
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════

NotificationCenter.init();
console.log('[Features] Notification Center, Advanced Search, Certificates & Sharing loaded');

// Browser compatibility IIFE removed — checkBrowserCompat() is called only from admin panel
// Store basic browser info for diagnostics
window._browserInfo={
  userAgent:navigator.userAgent,
  missing:[],
  supported:true
};

})();

// ═══════════════════════════════════════════════════════════
//  UI ENHANCEMENTS: Theme Transitions, Auto-detect, Shortcuts, etc.
// ═══════════════════════════════════════════════════════════

// ── Smooth Theme Transition ──
function applyThemeSmoothly(themeName) {
  var html = document.documentElement;
  html.classList.add('theme-transitioning');
  // Apply the theme (false = not manual, so system-theme listener stays active)
  if (typeof applyTheme === 'function') {
    applyTheme(themeName, false);
  } else {
    html.setAttribute('data-theme', themeName);
  }
  // Remove transition class after animation
  setTimeout(function() {
    html.classList.remove('theme-transitioning');
  }, 500);
}

// ── Auto-detect system dark/light preference ──
function detectSystemTheme() {
  if (!window.matchMedia) return null;
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'space';
  return null;
}

function initSystemThemeListener() {
  if (!window.matchMedia) return;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  try {
    mq.addEventListener('change', function(e) {
      // Only auto-switch if user hasn't manually chosen a theme
      var manualChoice = localStorage.getItem('quiz-theme-manual');
      if (!manualChoice) {
        var theme = e.matches ? 'space' : 'light';
        applyThemeSmoothly(theme);
      }
    });
  } catch(e) {
    // Older browsers
    try {
      mq.addListener(function(e) {
        var manualChoice = localStorage.getItem('quiz-theme-manual');
        if (!manualChoice) {
          var theme = e.matches ? 'space' : 'light';
          applyThemeSmoothly(theme);
        }
      });
    } catch(e2) {}
  }
}

// ── Scroll to Top ──
function initScrollToTop() {
  var btn = document.createElement('button');
  btn.className = 'scroll-top-btn';
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>';
  btn.setAttribute('aria-label', 'العودة للأعلى');
  btn.onclick = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    var ac = document.querySelector('.admin-content');
    if (ac) ac.scrollTo({ top: 0, behavior: 'smooth' });
  };
  document.body.appendChild(btn);

  function checkScroll() {
    var scrollY = window.scrollY || document.documentElement.scrollTop;
    var ac = document.querySelector('.admin-content');
    var acScroll = ac ? ac.scrollTop : 0;
    if (scrollY > 300 || acScroll > 300) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', checkScroll, { passive: true });
  var ac = document.querySelector('.admin-content');
  if (ac) ac.addEventListener('scroll', checkScroll, { passive: true });
}

// ── Keyboard Shortcuts ──
var KEYBOARD_SHORTCUTS = [
  { key: '?', label: 'عرض الاختصارات', action: 'toggleShortcuts' },
  { key: 'Escape', label: 'إغلاق/رجوع', action: 'closeOverlay' },
  { key: 'D', label: 'لوحة المعلومات', action: 'goDashboard' },
  { key: 'P', label: 'بدء العرض', action: 'startPresentation' },
  { key: 'S', label: 'الإعدادات', action: 'goSettings' },
  { key: 'C', label: 'الأقسام', action: 'goCategories' },
  { key: 'T', label: 'الفرق', action: 'goTeams' },
  { key: 'H', label: 'المساعدة', action: 'goHelp' },
  { key: '/', label: 'بحث', action: 'focusSearch' }
];

function createShortcutsPanel() {
  if (document.getElementById('shortcuts-panel')) return;
  var panel = document.createElement('div');
  panel.id = 'shortcuts-panel';
  panel.className = 'shortcuts-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'اختصارات لوحة المفاتيح');
  var html = '<div class="shortcuts-panel-inner">';
  html += '<div class="shortcuts-panel-title">اختصارات لوحة المفاتيح</div>';
  KEYBOARD_SHORTCUTS.forEach(function(s) {
    html += '<div class="shortcut-row">';
    html += '<span class="shortcut-label">' + s.label + '</span>';
    html += '<span class="shortcut-key">' + s.key + '</span>';
    html += '</div>';
  });
  html += '<div style="margin-top:var(--spacing-lg);text-align:center">';
  html += '<button class="btn btn-ghost" onclick="toggleShortcutsPanel()" style="font-family:inherit">إغلاق</button>';
  html += '</div></div>';
  panel.innerHTML = html;
  panel.onclick = function(e) { if (e.target === panel) toggleShortcutsPanel(); };
  document.body.appendChild(panel);
}

function toggleShortcutsPanel() {
  var panel = document.getElementById('shortcuts-panel');
  if (!panel) { createShortcutsPanel(); panel = document.getElementById('shortcuts-panel'); }
  panel.classList.toggle('open');
  if (panel.classList.contains('open')) {
    panel.querySelector('.shortcuts-panel-inner').focus();
  }
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Don't trigger in input/textarea
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    var key = e.key;
    // ? = shortcuts panel
    if (key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      toggleShortcutsPanel();
      return;
    }
    // Escape = close shortcuts
    if (key === 'Escape') {
      var panel = document.getElementById('shortcuts-panel');
      if (panel && panel.classList.contains('open')) {
        toggleShortcutsPanel();
        return;
      }
    }
    // Only in admin view
    if (window._currentView !== 'admin') return;

    if (key === 'd' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (typeof switchTab === 'function') switchTab('settings');
      if (typeof switchSettingsSubtab === 'function') switchSettingsSubtab('dashboard');
    } else if (key === 'p' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (typeof showView === 'function') showView('intro');
    } else if (key === 's' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (typeof switchTab === 'function') switchTab('settings');
    } else if (key === 'c' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (typeof switchTab === 'function') switchTab('categories');
    } else if (key === 't' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (typeof switchTab === 'function') switchTab('teams');
    } else if (key === 'h' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      if (typeof switchTab === 'function') switchTab('help');
    } else if (key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      var searchEl = document.getElementById('help-search') || document.querySelector('.form-input[type="search"]');
      if (searchEl) searchEl.focus();
    }
  });
}

// ── Stagger Animation Helper ──
function applyStaggerAnimation(container, itemSelector, baseDelay) {
  baseDelay = baseDelay || 60;
  var items = container.querySelectorAll(itemSelector);
  items.forEach(function(item, i) {
    item.classList.add('stagger-item');
    item.style.animationDelay = (i * baseDelay) + 'ms';
  });
}

// ── Empty State Renderer ──
function renderEmptyState(container, icon, title, description, actionBtn) {
  var html = '<div class="empty-state">';
  html += '<div class="empty-state-icon">' + icon + '</div>';
  html += '<div class="empty-state-title">' + title + '</div>';
  html += '<div class="empty-state-desc">' + description + '</div>';
  if (actionBtn) {
    html += '<button class="btn btn-primary" style="margin-top:var(--spacing-md)" onclick="' + actionBtn.onclick + '">' + actionBtn.label + '</button>';
  }
  html += '</div>';
  container.innerHTML = html;
}

// ── Initialize UI Enhancements ──
function initUIEnhancements() {
  try {
    initAutoThemeDetection();
    applyAccessibilityIndicators();
    initSystemThemeListener();
    initScrollToTop();
    initKeyboardShortcuts();
    // Add btn-press class to all buttons
    document.querySelectorAll('.btn, .nav-tab, .bottom-nav-item, .form-select, .option-btn').forEach(function(btn) {
      btn.classList.add('btn-press');
    });
    // Add tooltips to header action buttons
    var tooltipMap = {
      'admin-solo-btn': 'الوضع الفردي',
      'admin-error-log-btn': 'سجل الأخطاء'
    };
    Object.keys(tooltipMap).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.setAttribute('data-tooltip', tooltipMap[id]);
    });
    // Add card-hover-lift to category cards
    document.querySelectorAll('.category-card, .stat-card').forEach(function(card) {
      card.classList.add('card-hover-lift');
    });
  } catch(e) {
    console.warn('[UI Enhancements] Init error:', e);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUIEnhancements);
} else {
  initUIEnhancements();
}

// ── Enhanced Dashboard Rendering ──
function renderEnhancedDashboard() {
  var dashboard = document.getElementById('settings-dashboard');
  if (!dashboard) return;
  
  // Calculate session duration
  var sessionStart = window._sessionStartTime || Date.now();
  var sessionMins = Math.floor((Date.now() - sessionStart) / 60000);
  var sessionHours = Math.floor(sessionMins / 60);
  var sessionStr = sessionHours > 0 ? sessionHours + ' س ' + (sessionMins % 60) + ' د' : sessionMins + ' دقيقة';
  
  // Count questions and categories
  var totalQuestions = 0;
  var totalCategories = 0;
  var answeredQuestions = 0;
  try {
    if (state && state.categories) {
      totalCategories = state.categories.length;
      state.categories.forEach(function(cat) {
        totalQuestions += (cat.questions || []).length;
      });
    }
    if (state && state.teams) {
      state.teams.forEach(function(t) {
        answeredQuestions += (t.answeredQuestions || 0);
      });
    }
  } catch(e) {}
  
  // Add enhanced stats if not already present
  var enhancedEl = document.getElementById('enhanced-stats-row');
  if (!enhancedEl) {
    var statsHtml = '<div id="enhanced-stats-row" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:var(--spacing-sm);margin-bottom:var(--spacing-md)">';
    statsHtml += '<div class="stat-card-enhanced stagger-item" style="animation-delay:0ms">';
    statsHtml += '<div class="stat-card-icon">📋</div>';
    statsHtml += '<div class="stat-card-value">' + totalQuestions + '</div>';
    statsHtml += '<div class="stat-card-label">إجمالي الأسئلة</div></div>';
    
    statsHtml += '<div class="stat-card-enhanced stagger-item" style="animation-delay:60ms">';
    statsHtml += '<div class="stat-card-icon">📁</div>';
    statsHtml += '<div class="stat-card-value">' + totalCategories + '</div>';
    statsHtml += '<div class="stat-card-label">الأقسام</div></div>';
    
    statsHtml += '<div class="stat-card-enhanced stagger-item" style="animation-delay:120ms">';
    statsHtml += '<div class="stat-card-icon">👥</div>';
    statsHtml += '<div class="stat-card-value">' + (state.teams ? state.teams.length : 0) + '</div>';
    statsHtml += '<div class="stat-card-label">الفرق</div></div>';
    
    statsHtml += '<div class="stat-card-enhanced stagger-item" style="animation-delay:180ms">';
    statsHtml += '<div class="stat-card-icon">⏱️</div>';
    statsHtml += '<div class="stat-card-value">' + sessionStr + '</div>';
    statsHtml += '<div class="stat-card-label">مدة الجلسة</div></div>';
    
    statsHtml += '</div>';
    
    // Session timer
    statsHtml += '<div class="session-timer" style="margin-bottom:var(--spacing-md)">';
    statsHtml += '<span class="session-timer-dot"></span>';
    statsHtml += '<span>الجلسة نشطة</span>';
    statsHtml += '<span style="margin-right:auto;font-weight:700;color:var(--success)" id="session-duration-live">' + sessionStr + '</span>';
    statsHtml += '</div>';
    
    // Activity chart
    statsHtml += '<div style="margin-bottom:var(--spacing-md)">';
    statsHtml += '<div style="font-size:var(--font-size-sm);font-weight:800;color:var(--text-secondary);margin-bottom:var(--spacing-xs)">نشاط الأقسام</div>';
    statsHtml += '<div class="activity-chart" id="activity-chart">';
    if (state.categories && state.categories.length > 0) {
      var maxQ = 1;
      state.categories.forEach(function(cat) {
        var qLen = (cat.questions || []).length;
        if (qLen > maxQ) maxQ = qLen;
      });
      state.categories.forEach(function(cat, i) {
        var qLen = (cat.questions || []).length;
        var height = Math.max(4, (qLen / maxQ) * 70);
        var catName = (cat.name || 'قسم').substring(0, 6);
        statsHtml += '<div class="activity-bar" style="height:' + height + 'px;animation-delay:' + (i * 80) + 'ms" data-label="' + catName + '" data-tooltip="' + cat.name + ': ' + qLen + ' سؤال"></div>';
      });
    } else {
      statsHtml += '<div style="color:var(--text-muted);font-size:var(--font-size-sm);text-align:center;width:100%">لا توجد أقسام بعد</div>';
    }
    statsHtml += '</div></div>';
    
    // Insert after the quick actions bar
    var quickActions = dashboard.querySelector('[style*="display:flex"]');
    if (quickActions) {
      quickActions.insertAdjacentHTML('afterend', statsHtml);
    } else {
      dashboard.insertAdjacentHTML('afterbegin', statsHtml);
    }
  }
}

// ── Session Duration Timer ──
function updateSessionDuration() {
  var el = document.getElementById('session-duration-live');
  if (!el) return;
  var sessionStart = window._sessionStartTime || Date.now();
  var elapsed = Date.now() - sessionStart;
  var mins = Math.floor(elapsed / 60000);
  var hours = Math.floor(mins / 60);
  if (hours > 0) {
    el.textContent = hours + ' س ' + (mins % 60) + ' د';
  } else {
    el.textContent = mins + ' دقيقة';
  }
}

// ── Theme Editor with Color Pickers ──
function renderThemeEditor() {
  var panel = document.getElementById('theme-editor-panel');
  if (panel) return; // Already rendered
  
  var appearanceTab = document.getElementById('tab-appearance');
  if (!appearanceTab) return;
  
  var editorHtml = '<div class="theme-editor-panel" id="theme-editor-panel">';
  editorHtml += '<div class="theme-editor-title">🎨 محرر الألوان المتقدم</div>';
  editorHtml += '<div class="theme-color-grid">';
  
  var colorDefs = [
    { var: '--c-bg-deep', label: 'الخلفية العميقة', fallback: '#08091a' },
    { var: '--c-bg-card', label: 'خلفية البطاقات', fallback: '#111432' },
    { var: '--c-bg-panel', label: 'خلفية اللوحات', fallback: '#181c48' },
    { var: '--c-bg-surface', label: 'السطح', fallback: '#202560' },
    { var: '--c-accent1', label: 'اللون الأساسي', fallback: '#00e8d0' },
    { var: '--c-accent2', label: 'اللون الثانوي', fallback: '#a259ff' },
    { var: '--c-text-primary', label: 'النص الرئيسي', fallback: '#f0f8ff' },
    { var: '--c-text-secondary', label: 'النص الثانوي', fallback: '#90aecb' },
    { var: '--c-border', label: 'الحدود', fallback: '#232870' }
  ];
  
  colorDefs.forEach(function(cd) {
    var currentVal = getComputedStyle(document.documentElement).getPropertyValue(cd.var).trim() || cd.fallback;
    editorHtml += '<div class="theme-color-item">';
    editorHtml += '<div class="theme-color-label">' + cd.label + '</div>';
    editorHtml += '<div class="theme-color-input-wrap">';
    editorHtml += '<input type="color" class="theme-color-swatch" value="' + currentVal + '" data-css-var="' + cd.var + '" onchange="updateCustomThemeColor(this)">';
    editorHtml += '<input type="text" class="theme-color-hex" value="' + currentVal + '" data-css-var="' + cd.var + '" onchange="updateCustomThemeColor(this)">';
    editorHtml += '</div></div>';
  });
  
  editorHtml += '</div>';
  
  // Preview card
  editorHtml += '<div class="theme-preview-card">';
  editorHtml += '<div class="theme-preview-label">معاينة</div>';
  editorHtml += '<div style="font-size:var(--font-size-lg);font-weight:900;color:var(--accent1);margin-bottom:8px">منصة المسابقات</div>';
  editorHtml += '<div style="font-size:var(--font-size-sm);color:var(--text-secondary)">هذه معاينة مباشرة للألوان</div>';
  editorHtml += '<div class="theme-preview-btn-row">';
  editorHtml += '<button class="theme-preview-btn" style="background:linear-gradient(135deg,var(--accent1),var(--accent2));color:#000;border-color:transparent;font-weight:800">زر أساسي</button>';
  editorHtml += '<button class="theme-preview-btn" style="background:transparent;color:var(--text-primary)">زر ثانوي</button>';
  editorHtml += '</div></div>';
  
  // Apply/Reset buttons
  editorHtml += '<div style="display:flex;gap:var(--spacing-sm);margin-top:var(--spacing-md);justify-content:center">';
  editorHtml += '<button class="btn btn-primary" onclick="applyCustomThemeColors()" style="gap:6px">✨ تطبيق الألوان</button>';
  editorHtml += '<button class="btn btn-ghost" onclick="resetCustomThemeColors()">↶ إعادة تعيين</button>';
  editorHtml += '</div>';
  
  editorHtml += '</div>';
  
  // Append to appearance tab
  appearanceTab.insertAdjacentHTML('beforeend', editorHtml);
}

function updateCustomThemeColor(input) {
  var cssVar = input.getAttribute('data-css-var');
  var value = input.value;
  // Update the sibling input
  var wrap = input.closest('.theme-color-input-wrap');
  if (wrap) {
    var otherInput = wrap.querySelector(input.type === 'color' ? '.theme-color-hex' : '.theme-color-swatch');
    if (otherInput) otherInput.value = value;
  }
  // Live preview
  document.documentElement.style.setProperty(cssVar, value);
}

function applyCustomThemeColors() {
  // Collect all custom colors
  var customColors = {};
  document.querySelectorAll('.theme-color-input-wrap .theme-color-swatch').forEach(function(swatch) {
    var cssVar = swatch.getAttribute('data-css-var');
    customColors[cssVar] = swatch.value;
  });
  // Save to localStorage
  try {
    localStorage.setItem('quiz-custom-theme-colors', JSON.stringify(customColors));
  } catch(e) {}
  // Apply the custom theme
  if (typeof applyTheme === 'function') {
    applyTheme('custom');
  } else {
    document.documentElement.setAttribute('data-theme', 'custom');
  }
  // Re-apply all custom colors
  Object.keys(customColors).forEach(function(k) {
    document.documentElement.style.setProperty(k, customColors[k]);
  });
  if (typeof showNotification === 'function') {
    showNotification('تم تطبيق الألوان المخصصة بنجاح', 'success');
  } else if (typeof notify === 'function') {
    notify('تم تطبيق الألوان المخصصة بنجاح', 'success');
  }
}

function resetCustomThemeColors() {
  try {
    localStorage.removeItem('quiz-custom-theme-colors');
  } catch(e) {}
  // Reset all CSS custom properties
  var colorDefs = ['--c-bg-deep', '--c-bg-card', '--c-bg-panel', '--c-bg-surface', '--c-accent1', '--c-accent2', '--c-text-primary', '--c-text-secondary', '--c-border'];
  colorDefs.forEach(function(v) {
    document.documentElement.style.removeProperty(v);
  });
  if (typeof applyTheme === 'function') {
    applyTheme('space', false);  // reset to dark default
  }
  // Re-render theme editor
  var panel = document.getElementById('theme-editor-panel');
  if (panel) { panel.remove(); renderThemeEditor(); }
  if (typeof showNotification === 'function') {
    showNotification('تم إعادة تعيين الألوان', 'info');
  } else if (typeof notify === 'function') {
    notify('تم إعادة تعيين الألوان', 'info');
  }
}

function loadCustomThemeColors() {
  try {
    var saved = localStorage.getItem('quiz-custom-theme-colors');
    if (saved) {
      var colors = JSON.parse(saved);
      Object.keys(colors).forEach(function(k) {
        document.documentElement.style.setProperty(k, colors[k]);
      });
    }
  } catch(e) {}
}

// ═══════════════════════════════════════════════════════════
// Solo Play & Presentation Mode UX Enhancements
// ═══════════════════════════════════════════════════════════

// ── Solo Play Combo Display ──
function showSoloCombo(count) {
  var existing = document.getElementById('solo-combo-display');
  if (!existing) {
    var el = document.createElement('div');
    el.id = 'solo-combo-display';
    el.className = 'solo-combo-display';
    document.body.appendChild(el);
    existing = el;
  }
  var label = count >= 5 ? 'خارق! ' + count + 'x' : count >= 3 ? 'رائع! ' + count + 'x' : count + 'x';
  existing.textContent = label;
  existing.classList.remove('show');
  // Force reflow
  void existing.offsetWidth;
  existing.classList.add('show');
  setTimeout(function() { existing.classList.remove('show'); }, 900);
}

// ── Solo Answer Flash ──
function showSoloAnswerFlash(isCorrect) {
  var existing = document.getElementById('solo-answer-flash');
  if (!existing) {
    var el = document.createElement('div');
    el.id = 'solo-answer-flash';
    el.className = 'solo-answer-flash';
    document.body.appendChild(el);
    existing = el;
  }
  existing.className = 'solo-answer-flash ' + (isCorrect ? 'correct' : 'wrong');
  setTimeout(function() { existing.className = 'solo-answer-flash'; }, 700);
}

// ── Presentation Timer Countdown Effects ──
function applyCountdownEffect(timerEl, secondsLeft) {
  if (!timerEl) return;
  if (secondsLeft <= 5 && secondsLeft > 0) {
    timerEl.classList.add('countdown-urgent');
    timerEl.classList.remove('countdown-pulse');
  } else if (secondsLeft <= 10 && secondsLeft > 5) {
    timerEl.classList.add('countdown-pulse');
    timerEl.classList.remove('countdown-urgent');
  } else {
    timerEl.classList.remove('countdown-pulse', 'countdown-urgent');
  }
}

// ── Score Animation ──
function animateScoreChange(scoreEl) {
  if (!scoreEl) return;
  scoreEl.classList.remove('score-bump');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-bump');
  setTimeout(function() { scoreEl.classList.remove('score-bump'); }, 600);
}

// ── Category Reveal Animation ──
function animateCategoryReveal(catEl, delay) {
  if (!catEl) return;
  delay = delay || 0;
  catEl.classList.add('cat-reveal-enter');
  catEl.style.animationDelay = delay + 'ms';
}

// ── Standalone Bottom Sheet Component ──
// (Uses .bottom-sheet and .bottom-sheet-overlay classes — different from
//  the existing modal-overlay.bottom-sheet which wraps modals)
function openStandaloneBottomSheet(sheetId) {
  var sheet = document.getElementById(sheetId);
  var overlay = document.getElementById(sheetId + '-overlay');
  if (sheet) sheet.classList.add('open');
  if (overlay) overlay.classList.add('open');
}

function closeStandaloneBottomSheet(sheetId) {
  var sheet = document.getElementById(sheetId);
  var overlay = document.getElementById(sheetId + '-overlay');
  if (sheet) sheet.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
}

// ── Focus Highlight Enhancement ──
// Adds focus-visible ring to interactive elements inside a container
function enableFocusHighlight(container) {
  if (!container) return;
  var focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  focusable.forEach(function(el) { el.classList.add('focus-highlight'); });
}

// ── Hook: Integrate with existing solo mode ──
// Wrap soloStreakUpdate to show combo + flash effects
(function() {
  if (typeof soloStreakUpdate === 'function') {
    var _origSoloStreakUpdate = soloStreakUpdate;
    // Replace with enhanced version
    window.soloStreakUpdate = function(correct) {
      _origSoloStreakUpdate(correct);
      // Show combo display for streaks > 1
      if (typeof _soloStreak !== 'undefined' && _soloStreak > 1) {
        showSoloCombo(_soloStreak);
      }
      // Show answer flash
      showSoloAnswerFlash(correct);
    };
  }
})();

// ── Hook: Integrate countdown effects with presentation timer ──
(function() {
  // Patch into timer display if it exists
  var timerObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'childList' || m.type === 'characterData') {
        var timerEl = document.querySelector('.timer-display, .timer-number, #timer-display');
        if (timerEl) {
          var timeText = timerEl.textContent.trim();
          var seconds = parseInt(timeText, 10);
          if (!isNaN(seconds)) {
            applyCountdownEffect(timerEl, seconds);
          }
        }
      }
    });
  });

  // Observe the presentation view for timer changes
  setTimeout(function() {
    var presView = document.getElementById('view-question') || document.querySelector('.pres-container');
    if (presView) {
      timerObserver.observe(presView, { childList: true, subtree: true, characterData: true });
    }
  }, 2000);
})();

// ── Welcome Screen Title Animation ──
(function() {
  setTimeout(function() {
    var welcomeTitle = document.querySelector('.pres-welcome-title, .welcome-title');
    if (welcomeTitle) {
      welcomeTitle.classList.add('welcome-title-animated');
    }
  }, 1000);
})();

// ── Category Reveal with Stagger ──
(function() {
  // Hook into categories view render
  var origRenderCat = window.renderCategoriesView || window.renderCategoryButtons;
  if (typeof origRenderCat === 'function') {
    // After categories are rendered, apply stagger animations
    setTimeout(function() {
      var catCards = document.querySelectorAll('.category-card, .cat-pres-btn');
      catCards.forEach(function(card, i) {
        animateCategoryReveal(card, i * 100);
      });
    }, 500);
  }
})();

// ── V15.2: SMART SPA DIAGNOSTICS & DASHBOARD UX HELPER ──
(function() {
  'use strict';

  var translations = {
    ar: {
      title: "💡 المساعد المعرفي الذكي ومؤشرات الأداء",
      offlineBadge: "🟢 متصل محلياً ويعمل بالكامل دون إنترنت",
      offlineBadgeWarning: "🟡 يعمل بالكامل دون إنترنت — الشبكة الخارجية غير متصلة",
      checklistTitle: "خطوات إعداد المسابقة التفاعلية",
      stepName: "اسم ومعلومات المسابقة",
      stepNameCompleted: "🟢 تمت تسمية المسابقة بنجاح",
      stepNamePending: "🟡 لم يتم التسمية - تستخدم التسمية الافتراضية",
      stepCats: "الأقسام وبنك الأسئلة",
      stepCatsCompleted: "🟢 الأقسام والأسئلة جاهزة ومحمّلة",
      stepCatsPending: "🟡 لا توجد أقسام أو أسئلة مدرجة بعد",
      stepTeams: "إعداد الفرق المشاركة",
      stepTeamsCompleted: "🟢 تم تحديد الفرق وتجهيزها بالكامل",
      stepTeamsPending: "🟡 لم تقم بإضافة فرق للمسابقة بعد",
      actionEdit: "تعديل",
      actionAdd: "إضافة قسم",
      actionAddTeams: "إضافة فريق",
      storageTitle: "مقياس السعة والتخزين لمتصفح الـ SPA",
      storageKB: "كيلوبايت مستخدمة من أصل 5000 كيلوبايت",
      storageQuestions: "الأسئلة النشطة في بنك الذاكرة المحلية",
      inspirationTitle: "حكمة اليوم التعليمية",
      inspirationQuote0: "العلم في الصغر كالنقش على الحجر.",
      inspirationQuote1: "العلم كنز لا يفنى، وذخر لا يبيد.",
      inspirationQuote2: "كل إناء يضيق بما جعل فيه إلا وعاء العلم فإنه يتسع.",
      inspirationQuote3: "من لم يذق مر التعلم سويعات، تجرع ذل الجهل طول حياته.",
      inspirationQuote4: "رأس مالي علمي، وسلاحي عقلي وصبري ومثابرتي.",
      inspirationQuote5: "العلم ينير الطريق للقلوب والعقول، والجهل يظلم مسيرات المجتمعات.",
      alertsHubTitle: "🚨 التوجيه الذكي والإرشادات الحية للتشغيل",
      alertNoName: "لم تختر اسمًا مخصصًا للمسابقة حتى الآن. سيظهر الاسم بشكل افتراضي كـ 'المسابقة'. تذكر تخصيصه في تبويب 'عام'!",
      alertNoCats: "بنك الأسئلة فارغ تمامًا! يُتطلب إضافة قسم واحد وأسئلته، أو الانتقال لعلامة تبويب 'استيراد' لتحميل مسابقة جاهزة بنقرة واحدة.",
      alertNoTeams: "لا توجد فرق لعب مضافة حتى الآن! أضف فريقًا واحدًا على الأقل من تبويب 'الفرق' لتشغيل لوحة عرض النقاط.",
      alertNoAudience: "💡 فكرة لتقديم أفضل: شاشة الجمهور مغلقة حاليًا. انقر 'بدء العرض والتصيير' أو 'فتح شاشة الجمهور' لعرض الأسئلة بملء الشاشة.",
      alertAudienceConnected: "🖥️ شاشة الجمهور متصلة ومفتوحة حاليًا في نافذة منفصلة بنجاح.",
      alertBatteryLow: "⚠️ تنبيه طاقة منخفض: طاقة البطارية أقل من 15% ({level}%). يرجى توصيل الشاحن فورًا لضمان سلامة العرض الرسومي وتفادي توقفه تلقائيًا.",
      alertBatteryCharging: "⚡ حماية الطاقة نشطة: البطارية متصلة بالشاحن الآن ومحمية ({level}%).",
      alertBatteryOk: "🔋 حالة الطاقة مستقرة: شحن الجهاز {level}% ويعمل بأقصى كفاءة للمؤثرات البصرية."
    },
    en: {
      title: "💡 Smart Cognitive Assistant & Diagnostics Hub",
      offlineBadge: "🟢 Connected locally & working 100% offline",
      offlineBadgeWarning: "🟡 Offline-ready — External network is disconnected",
      checklistTitle: "Setup Checklist Progress",
      stepName: "Quiz Info & Title",
      stepNameCompleted: "🟢 Quiz named successfully",
      stepNamePending: "🟡 Pending - Using default name",
      stepCats: "Categories & Question Bank",
      stepCatsCompleted: "🟢 Categories & questions loaded",
      stepCatsPending: "🟡 No categories or questions added yet",
      stepTeams: "Teams & Scoreboards",
      stepTeamsCompleted: "🟢 Teams successfully added",
      stepTeamsPending: "🟡 No teams added to the quiz yet",
      actionEdit: "Edit",
      actionAdd: "Add Category",
      actionAddTeams: "Add Team",
      storageTitle: "Local Browser Storage Utilization (Quotas)",
      storageKB: "KB used out of 5000 KB available",
      storageQuestions: "Total active questions in memory core",
      inspirationTitle: "Daily Educational Quotes",
      inspirationQuote0: "Knowledge gained in youth is like engraving on stone.",
      inspirationQuote1: "Knowledge is a treasure that never fades, and a storehouse that never perishes.",
      inspirationQuote2: "Every vessel shrinks with what runs into it, except for the vessel of knowledge, which expands.",
      inspirationQuote3: "He who has not tasted the bitterness of learning for an hour, will swallow the humiliation of ignorance for an eternity.",
      inspirationQuote4: "My capital is my knowledge, and my weapon is my intellect and patience.",
      inspirationQuote5: "Knowledge lights the path for hearts and minds, while ignorance darkens our journey.",
      alertsHubTitle: "🚨 Intelligent Directives & Live Runtime Alerts",
      alertNoName: "Your quiz uses the default name. Consider editing it in the 'General' subtab for a customized branding/title!",
      alertNoCats: "The question bank is empty! You must define at least one category, or go to 'Import' to ingest standard templates instantly.",
      alertNoTeams: "No teams defined yet! Go to the 'Teams' tab and add at least one playing group to enable scoreboards.",
      alertNoAudience: "💡 Presentation Tip: Audience screen is closed. Click 'Start presentation' or open it via projection tools to show questions on external screens.",
      alertAudienceConnected: "🖥️ Audience projection window is fully connected and projected on second screen successfully.",
      alertBatteryLow: "⚠️ Low power warning: Device battery is under 15% ({level}%). Please plug in your charger to assure buttery-smooth canvas animations and safeguard your session.",
      alertBatteryCharging: "⚡ Power safety active: Battery is connected and charging ({level}%).",
      alertBatteryOk: "🔋 Stable power: Device power is at {level}% and calibrated for optimal visual effects speed."
    }
  };

  // Select a random quote index that persists per session/refresh
  var quoteIndex = Math.floor(Math.random() * 6);

  // Monitor battery state locally
  var batteryState = { level: 100, charging: true, supported: false };

  function initBatteryMonitoring() {
    if (typeof navigator !== 'undefined' && navigator.getBattery) {
      navigator.getBattery().then(function(batt) {
        batteryState.supported = true;
        batteryState.level = Math.round(batt.level * 100);
        batteryState.charging = batt.charging;
        
        function update() {
          batteryState.level = Math.round(batt.level * 100);
          batteryState.charging = batt.charging;
          try {
            if (typeof window.renderEnhancedDashboardUX === 'function') {
              window.renderEnhancedDashboardUX();
            }
          } catch(e) {}
        }
        
        batt.addEventListener('levelchange', update);
        batt.addEventListener('chargingchange', update);
        update();
      }).catch(function() {});
    }
  }

  // Initialize battery monitoring immediately
  initBatteryMonitoring();

  // Listen to network status changes
  window.addEventListener('online', function() {
    try { if (typeof window.renderEnhancedDashboardUX === 'function') window.renderEnhancedDashboardUX(); } catch(e) {}
  });
  window.addEventListener('offline', function() {
    try { if (typeof window.renderEnhancedDashboardUX === 'function') window.renderEnhancedDashboardUX(); } catch(e) {}
  });

  function getLocalStorageSizeInKB() {
    var total = 0;
    try {
      for (var x in localStorage) {
        if (localStorage.hasOwnProperty(x)) {
          total += (localStorage[x].length + x.length) * 2;
        }
      }
    } catch(e) {}
    return parseFloat((total / 1024).toFixed(2));
  }

  function getQuestionsCount() {
    var total = 0;
    if (state && state.categories) {
      state.categories.forEach(function(c) {
        if (c.questions) total += c.questions.length;
      });
    }
    return total;
  }

  window.renderEnhancedDashboardUX = function() {
    var dashGroup = document.getElementById('settings-dashboard');
    if (!dashGroup) return;

    // Determine Language
    var lang = (typeof I18n !== 'undefined' && I18n.getCurrentLang() === 'en') ? 'en' : 'ar';
    var dict = translations[lang] || translations.ar;

    // Check if the hub container already exists, otherwise create it
    var hub = document.getElementById('spa-diagnostics-hub');
    if (!hub) {
      hub = document.createElement('div');
      hub.id = 'spa-diagnostics-hub';
      hub.style.marginBottom = '20px';
      
      // Insert right at the top of settings-dashboard
      if (dashGroup.firstElementChild) {
        dashGroup.insertBefore(hub, dashGroup.firstElementChild);
      } else {
        dashGroup.appendChild(hub);
      }

      // Inject custom scoped CSS styles for diagnostics hub with low-battery animations
      if (!document.getElementById('spa-diagnostics-styles')) {
        var style = document.createElement('style');
        style.id = 'spa-diagnostics-styles';
        style.textContent = [
          '#spa-diagnostics-hub {',
          '  background: linear-gradient(135deg, rgba(8, 12, 34, 0.6) 0%, rgba(26, 17, 51, 0.6) 100%) !important;',
          '  border: 1px solid var(--border-light) !important;',
          '  border-radius: var(--radius-md, 12px) !important;',
          '  padding: 18px !important;',
          '  box-shadow: var(--v152-shadow-lg) !important;',
          '  backdrop-filter: blur(12px) !important;',
          '  -webkit-backdrop-filter: blur(12px) !important;',
          '  color: var(--text-primary) !important;',
          '  font-family: inherit !important;',
          '  direction: ' + (lang === 'ar' ? 'rtl' : 'ltr') + ' !important;',
          '  transition: transform 0.3s ease, border-color 0.3s ease !important;',
          '}',
          '[data-theme="light"] #spa-diagnostics-hub, [data-theme="sunrise"] #spa-diagnostics-hub, [data-theme="mint"] #spa-diagnostics-hub {',
          '  background: linear-gradient(135deg, rgba(230, 235, 255, 0.45) 0%, rgba(240, 242, 255, 0.45) 100%) !important;',
          '  border-color: rgba(26, 86, 232, 0.15) !important;',
          '}',
          '.spa-hub-header {',
          '  display: flex !important;',
          '  justify-content: space-between !important;',
          '  align-items: center !important;',
          '  margin-bottom: 14px !important;',
          '  flex-wrap: wrap !important;',
          '  gap: 10px !important;',
          '}',
          '.spa-hub-title {',
          '  font-size: 0.95rem !important;',
          '  font-weight: 800 !important;',
          '  color: var(--accent1) !important;',
          '}',
          '.spa-offline-badge {',
          '  font-size: 0.72rem !important;',
          '  background: rgba(0, 230, 118, 0.12) !important;',
          '  color: var(--success) !important;',
          '  border: 1px solid rgba(0, 230, 118, 0.25) !important;',
          '  padding: 4px 10px !important;',
          '  border-radius: 99px !important;',
          '  font-weight: 700 !important;',
          '  display: inline-flex !important;',
          '  align-items: center !important;',
          '  gap: 6px !important;',
          '  animation: spa-pulse 2s infinite !important;',
          '}',
          '.spa-offline-badge.warning {',
          '  background: rgba(255, 179, 0, 0.12) !important;',
          '  color: #ffb300 !important;',
          '  border-color: rgba(255, 179, 0, 0.25) !important;',
          '  animation: none !important;',
          '}',
          '@keyframes spa-pulse {',
          '  0%, 100% { box-shadow: 0 0 0 0px rgba(0, 230, 118, 0.2); }',
          '  50% { box-shadow: 0 0 0 6px rgba(0, 230, 118, 0); }',
          '}',
          '.spa-checklist-grid {',
          '  display: grid !important;',
          '  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important;',
          '  gap: 12px !important;',
          '  margin-top: 10px !important;',
          '}',
          '.spa-checklist-item {',
          '  background: rgba(255, 255, 255, 0.03) !important;',
          '  border: 1px solid rgba(255, 255, 255, 0.05) !important;',
          '  padding: 12px !important;',
          '  border-radius: 8px !important;',
          '  display: flex !important;',
          '  flex-direction: column !important;',
          '  gap: 6px !important;',
          '  transition: background 0.2s ease !important;',
          '}',
          '[data-theme="light"] .spa-checklist-item, [data-theme="sunrise"] .spa-checklist-item, [data-theme="mint"] .spa-checklist-item {',
          '  background: rgba(0, 0, 0, 0.02) !important;',
          '  border-color: rgba(0, 0, 0, 0.05) !important;',
          '}',
          '.spa-checklist-item:hover {',
          '  background: rgba(255, 255, 255, 0.05) !important;',
          '}',
          '[data-theme="light"] .spa-checklist-item:hover, [data-theme="sunrise"] .spa-checklist-item:hover, [data-theme="mint"] .spa-checklist-item:hover {',
          '  background: rgba(0, 0, 0, 0.04) !important;',
          '}',
          '.spa-step-header {',
          '  display: flex !important;',
          '  justify-content: space-between !important;',
          '  align-items: center !important;',
          '  font-size: 0.8rem !important;',
          '  font-weight: 700 !important;',
          '}',
          '.spa-step-desc {',
          '  font-size: 0.72rem !important;',
          '  color: var(--text-muted) !important;',
          '}',
          '.spa-step-btn {',
          '  background: transparent !important;',
          '  border: 1px solid var(--border) !important;',
          '  color: var(--text-primary) !important;',
          '  padding: 3px 10px !important;',
          '  border-radius: 6px !important;',
          '  font-size: 0.68rem !important;',
          '  font-weight: 700 !important;',
          '  cursor: pointer !important;',
          '  align-self: flex-start !important;',
          '  transition: all 0.2s ease !important;',
          '}',
          '.spa-step-btn:hover {',
          '  background: var(--accent1) !important;',
          '  color: #000 !important;',
          '  border-color: var(--accent1) !important;',
          '}',
          '.spa-storage-section {',
          '  margin-top: 14px !important;',
          '  border-top: 1px dashed var(--border-light) !important;',
          '  padding-top: 14px !important;',
          '}',
          '.spa-storage-info {',
          '  display: flex !important;',
          '  justify-content: space-between !important;',
          '  font-size: 0.75rem !important;',
          '  color: var(--text-secondary) !important;',
          '  margin-bottom: 6px !important;',
          '}',
          '.spa-progress-bg {',
          '  background: rgba(255, 255, 255, 0.08) !important;',
          '  height: 6px !important;',
          '  border-radius: 99px !important;',
          '  overflow: hidden !important;',
          '}',
          '[data-theme="light"] .spa-progress-bg, [data-theme="sunrise"] .spa-progress-bg, [data-theme="mint"] .spa-progress-bg {',
          '  background: rgba(0, 0, 0, 0.08) !important;',
          '}',
          '.spa-progress-bar {',
          '  height: 100% !important;',
          '  border-radius: 99px !important;',
          '  background: linear-gradient(90deg, var(--accent1), var(--accent2)) !important;',
          '  transition: width 0.5s ease-out !important;',
          '}',
          '.spa-alerts-panel {',
          '  margin-top: 14px !important;',
          '  background: rgba(255, 255, 255, 0.02) !important;',
          '  border: 1px dashed var(--border-light) !important;',
          '  border-radius: 8px !important;',
          '  padding: 12px !important;',
          '}',
          '[data-theme="light"] .spa-alerts-panel, [data-theme="sunrise"] .spa-alerts-panel, [data-theme="mint"] .spa-alerts-panel {',
          '  background: rgba(0, 0, 0, 0.01) !important;',
          '}',
          '.spa-alert-line {',
          '  font-size: 0.72rem !important;',
          '  line-height: 1.4 !important;',
          '  display: flex !important;',
          '  align-items: flex-start !important;',
          '  gap: 8px !important;',
          '  margin-bottom: 8px !important;',
          '}',
          '.spa-alert-line:last-child {',
          '  margin-bottom: 0 !important;',
          '}',
          '.spa-alert-yellow { color: #ffb300 !important; }',
          '.spa-alert-green { color: #00e676 !important; }',
          '.spa-alert-red {',
          '  color: #ff5252 !important;',
          '  animation: spa-blink 1.5s infinite !important;',
          '}',
          '@keyframes spa-blink {',
          '  0%, 100% { opacity: 1; }',
          '  50% { opacity: 0.5; }',
          '}',
          '.spa-quote-box {',
          '  margin-top: 12px !important;',
          '  padding: 10px 14px !important;',
          '  border-radius: 8px !important;',
          '  background: rgba(245, 200, 66, 0.05) !important;',
          '  border-inline-start: 3px solid #f5c842 !important;',
          '  font-size: 0.74rem !important;',
          '  line-height: 1.5 !important;',
          '  color: var(--text-secondary) !important;',
          '  font-style: italic !important;',
          '}'
        ].join('\n');
        document.head.appendChild(style);
      }
    }

    // Read Dynamic Metrics & States
    var sizeKB = getLocalStorageSizeInKB();
    var quotaProgress = Math.min((sizeKB / 5000) * 100, 100);
    var totalQuestions = getQuestionsCount();

    // Checklist Logic
    var hasUniqueName = state.settings.name && state.settings.name.trim() !== '' && 
                       state.settings.name !== 'المسابقة' && state.settings.name !== 'Unnamed Quiz';
    var hasCategories = state.categories && state.categories.length > 0;
    var hasTeams = state.teams && state.teams.length > 0;

    // Check Audience projection window connection state
    var isAudienceConnected = typeof _audienceWin !== 'undefined' && _audienceWin && !_audienceWin.closed;

    // Online badge logic
    var isOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
    var badgClass = isOnlineState ? 'spa-offline-badge' : 'spa-offline-badge warning';
    var badgTxt = isOnlineState ? dict.offlineBadge : dict.offlineBadgeWarning;

    // Build intelligent alerts / warnings dynamically
    var activeAlertsHtml = [];

    // 1. Name Warning
    if (!hasUniqueName) {
      activeAlertsHtml.push(
        '<div class="spa-alert-line spa-alert-yellow">',
        '  <span>⚠️</span>',
        '  <span>' + _sanitize(dict.alertNoName) + '</span>',
        '</div>'
      );
    }

    // 2. Questions / Categories Warning
    if (!hasCategories) {
      activeAlertsHtml.push(
        '<div class="spa-alert-line spa-alert-red">',
        '  <span>🚨</span>',
        '  <span>' + _sanitize(dict.alertNoCats) + '</span>',
        '</div>'
      );
    }

    // 3. Teams Warning
    if (!hasTeams) {
      activeAlertsHtml.push(
        '<div class="spa-alert-line spa-alert-red">',
        '  <span>👥</span>',
        '  <span>' + _sanitize(dict.alertNoTeams) + '</span>',
        '</div>'
      );
    }

    // 4. Audience Screen Info or Connected Success
    if (isAudienceConnected) {
      activeAlertsHtml.push(
        '<div class="spa-alert-line spa-alert-green">',
        '  <span>🖥️</span>',
        '  <span>' + _sanitize(dict.alertAudienceConnected) + '</span>',
        '</div>'
      );
    } else {
      activeAlertsHtml.push(
        '<div class="spa-alert-line spa-alert-yellow">',
        '  <span>💡</span>',
        '  <span>' + _sanitize(dict.alertNoAudience) + '</span>',
        '</div>'
      );
    }

    // 5. Battery warnings / tracking
    if (batteryState.supported) {
      var batPrefix = batteryState.charging ? dict.alertBatteryCharging : (batteryState.level < 15 ? dict.alertBatteryLow : dict.alertBatteryOk);
      var batClass = batteryState.charging ? 'spa-alert-green' : (batteryState.level < 15 ? 'spa-alert-red' : 'spa-alert-yellow');
      var batIcon = batteryState.charging ? '⚡' : (batteryState.level < 15 ? '⚠️🔋' : '🔋');
      
      var batLabel = batPrefix.replace('{level}', batteryState.level);
      
      activeAlertsHtml.push(
        '<div class="spa-alert-line ' + batClass + '">',
        '  <span>' + batIcon + '</span>',
        '  <span>' + _sanitize(batLabel) + '</span>',
        '</div>'
      );
    }

    // Generate inner structure
    var html = [
      '<div class="spa-hub-header">',
      '  <div class="spa-hub-title">' + _sanitize(dict.title) + '</div>',
      '  <div class="' + badgClass + '"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:' + (isOnlineState ? '#00e676' : '#ffb300') + '"></span>' + _sanitize(badgTxt) + '</div>',
      '</div>',
      
      '<div style="font-size:0.75rem;font-weight:700;color:var(--text-muted);margin-bottom:8px">' + _sanitize(dict.checklistTitle) + '</div>',
      
      '<div class="spa-checklist-grid">',
      
      '  <div class="spa-checklist-item">',
      '    <div class="spa-step-header">',
      '      <span>' + _sanitize(dict.stepName) + '</span>',
      '      <button class="spa-step-btn" onclick="switchSettingsSubtab(\'general\', document.querySelectorAll(\'.settings-subtab\')[1])">' + _sanitize(dict.actionEdit) + '</button>',
      '    </div>',
      '    <div class="spa-step-desc">' + _sanitize(hasUniqueName ? dict.stepNameCompleted : dict.stepNamePending) + '</div>',
      '  </div>',

      '  <div class="spa-checklist-item">',
      '    <div class="spa-step-header">',
      '      <span>' + _sanitize(dict.stepCats) + '</span>',
      '      <button class="spa-step-btn" onclick="switchTab(\'categories\', document.querySelectorAll(\'.nav-tab\')[2])">' + _sanitize(dict.actionAdd) + '</button>',
      '    </div>',
      '    <div class="spa-step-desc">' + _sanitize(hasCategories ? dict.stepCatsCompleted : dict.stepCatsPending) + '</div>',
      '  </div>',

      '  <div class="spa-checklist-item">',
      '    <div class="spa-step-header">',
      '      <span>' + _sanitize(dict.stepTeams) + '</span>',
      '      <button class="spa-step-btn" onclick="switchTab(\'teams\', document.querySelectorAll(\'.nav-tab\')[3])">' + _sanitize(dict.actionAddTeams) + '</button>',
      '    </div>',
      '    <div class="spa-step-desc">' + _sanitize(hasTeams ? dict.stepTeamsCompleted : dict.stepTeamsPending) + '</div>',
      '  </div>',
      
      '</div>',

      '<div class="spa-storage-section">',
      '  <div class="spa-storage-info">',
      '    <span>' + _sanitize(dict.storageTitle) + '</span>',
      '    <span>' + sizeKB + ' KB / 5000 KB ( ' + quotaProgress.toFixed(1) + '% )</span>',
      '  </div>',
      '  <div class="spa-progress-bg">',
      '    <div class="spa-progress-bar" style="width:' + quotaProgress + '%"></div>',
      '  </div>',
      '  <div style="font-size:0.68rem;color:var(--text-muted);margin-top:6px;display:flex;justify-content:space-between">',
      '    <span>' + _sanitize(dict.storageQuestions) + ': ' + totalQuestions + '</span>',
      '    <span>' + (lang === 'ar' ? '💾 الحفظ التلقائي نشط وتلقائي وبكامل الأمان' : '💾 Autosave active, local & secure') + '</span>',
      '  </div>',
      '</div>',

      '<div class="spa-alerts-panel">',
      '  <div style="font-size: 0.74rem; font-weight: 800; color: var(--accent2); margin-bottom: 8px">' + _sanitize(dict.alertsHubTitle) + '</div>',
         activeAlertsHtml.join('\n'),
      '</div>',

      '<div class="spa-quote-box">',
      '  <strong>' + _sanitize(dict.inspirationTitle) + ':</strong> «' + _sanitize(dict['inspirationQuote' + quoteIndex]) + '»',
      '</div>'
    ].join('\n');

    hub.innerHTML = html;
  };

  // Override switchSettingsSubtab to render enhanced diagnostics on entering 'dashboard'
  if (typeof switchSettingsSubtab === 'function') {
    var origSwitchSubtab = switchSettingsSubtab;
    window.switchSettingsSubtab = function(group, btn) {
      origSwitchSubtab(group, btn);
      if (group === 'dashboard') {
        try {
          window.renderEnhancedDashboardUX();
        } catch(e) {
          console.warn('[UX Helper] render error:', e);
        }
      }
    };
  }

  // Also catch switchTab calls when opening settings tab
  if (typeof switchTab === 'function') {
    var origSwitchTab = switchTab;
    window.switchTab = function(name, btn) {
      origSwitchTab(name, btn);
      if (name === 'settings') {
        setTimeout(function() {
          try {
            window.renderEnhancedDashboardUX();
          } catch(e) {}
        }, 100);
      }
    };
  }

  // Set up periodic update checks only when Admin tab is active
  setInterval(function() {
    var adminView = document.getElementById('view-admin');
    if (adminView && !adminView.classList.contains('hidden')) {
      var dashGroup = document.getElementById('settings-dashboard');
      if (dashGroup && dashGroup.style.display !== 'none') {
        try {
          window.renderEnhancedDashboardUX();
        } catch(e) {}
      }
    }
  }, 2500);

  // Initial trigger after loading state
  setTimeout(function() {
    try {
      window.renderEnhancedDashboardUX();
    } catch(e) {}
  }, 1500);

})();

