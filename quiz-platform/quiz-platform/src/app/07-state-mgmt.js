// ════════════════════════════════════════════════════════
//  V10: UNIFIED TEMPLATE SYSTEM — DOM Builder
//  Safe DOM element creation replacing innerHTML.
//  h('tag.class#id', {attrs}, ...children)
//  Returns a DOM element — no XSS possible.
// ════════════════════════════════════════════════════════
function h(tag,attrs){
  // Parse tag: 'div.class1.class2#id' → {tag:'div', classes:['class1','class2'], id:'id'}
  const match=String(tag).match(/^([a-zA-Z][a-zA-Z0-9-]*)((?:\.[a-zA-Z0-9_-]+)*)(?:#([a-zA-Z0-9_-]+))?/);
  if(!match)return document.createTextNode(String(tag));
  const tagName=match[1]||'div';
  const classes=match[2]?match[2].slice(1).split('.'):[];  // remove leading dot
  const id=match[3]||null;

  const el=document.createElement(tagName);
  if(id)el.id=id;
  if(classes.length)el.classList.add(...classes);

  // Process attributes and children
  const args=[].slice.call(arguments,1);
  let childrenStarted=false;

  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(!childrenStarted && arg && typeof arg==='object' && !arg.nodeType && !Array.isArray(arg)){
      // Attributes object
      childrenStarted=true;
      Object.keys(arg).forEach(key=>{
        const val=arg[key];
        if(key==='style' && typeof val==='object'){
          Object.assign(el.style,val);
        }else if(key==='className'){
          el.className=val;
        }else if(key==='classList'){
          val.forEach(c=>el.classList.add(c));
        }else if(key==='dataset'){
          Object.keys(val).forEach(dk=>{el.dataset[dk]=val[dk];});
        }else if(key.startsWith('on') && typeof val==='function'){
          const evt=key.slice(2).toLowerCase();
          el.addEventListener(evt,val);
        }else if(key==='innerHTML'){
          // Escape innerHTML — use _sanitizeHTML if available
          if(typeof _sanitizeHTML==='function')el.innerHTML=_sanitizeHTML(String(val));
          else el.textContent=String(val);
        }else if(key==='textContent'){
          el.textContent=String(val);
        }else if(val===true){
          el.setAttribute(key,'');
        }else if(val!==false && val!=null){
          el.setAttribute(key,String(val));
        }
      });
      childrenStarted=true;
    }else{
      // Child element
      childrenStarted=true;
      if(arg==null||arg===false)continue;
      if(Array.isArray(arg)){
        arg.forEach(child=>{
          if(child==null||child===false)return;
          if(child.nodeType)el.appendChild(child);
          else el.appendChild(document.createTextNode(String(child)));
        });
      }else if(arg.nodeType){
        el.appendChild(arg);
      }else{
        el.appendChild(document.createTextNode(String(arg)));
      }
    }
  }
  return el;
}

// Document fragment helper — build multiple elements efficiently
function hFragment(...items){
  const frag=document.createDocumentFragment();
  items.forEach(item=>{
    if(item==null||item===false)return;
    if(item.nodeType)frag.appendChild(item);
    else if(Array.isArray(item))item.forEach(i=>{if(i&&i.nodeType)frag.appendChild(i);});
    else frag.appendChild(document.createTextNode(String(item)));
  });
  return frag;
}

// Safe HTML setter using h() — replaces innerHTML with DOM construction
// Use when you have pre-built HTML string that needs to be set safely
function setChildren(el,children){
  if(!el)return;
  el.textContent='';
  if(Array.isArray(children)){
    children.forEach(child=>{
      if(child==null||child===false)return;
      if(child.nodeType)el.appendChild(child);
      else el.appendChild(document.createTextNode(String(child)));
    });
  }else if(children&&children.nodeType){
    el.appendChild(children);
  }else if(children!=null){
    el.textContent=String(children);
  }
}

/* V14: Generic Empty State Component Builder */
function createEmptyState(config){
  var iconSVG='';
  var iconMap={
    categories:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7v10a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2 2zm6-2v12a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2zm8 0v10a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2h-2a2 2 0 00-2 2z"/></svg>',
    teams:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="17" cy="9" r="3"/><path d="M21 21v-2a3 3 0 00-2-2.83"/></svg>',
    questions:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r=".5"/></svg>',
    search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
    leaderboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    import:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>'
  };
  iconSVG=iconMap[config.iconType]||'';
  var children=[
    h('div.empty-state-icon-svg',{innerHTML:iconSVG}),
    h('div.empty-state-title',config.title||''),
    h('div.empty-state-desc',config.description||'')
  ];
  if(config.actionText&&config.actionFn){
    children.push(h('div.empty-state-action',h('button.btn.btn-primary',{onclick:config.actionFn},config.actionText)));
  }
  if(config.tipText){
    children.push(h('div.empty-state-tip',config.tipText));
  }
  return h('div.empty-state-enhanced',...children);
}
/* V14: Generic Haptic Feedback */
function triggerHaptic(type){
  if(!navigator.vibrate)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var patterns={light:30,medium:50,heavy:[50,30,50],success:[30,20,60],tick:10};
  var pattern=patterns[type]||patterns.light;
  try{navigator.vibrate(pattern)}catch(e){}
}
/* V14: Auto-attach haptic to all buttons */
document.addEventListener('click',function(e){
  var btn=e.target.closest('button,.btn');
  if(btn)triggerHaptic('light');
},true);
/* V14: Generic Input Validation Feedback */
function applyInputFeedback(inputEl,isValid){
  if(!inputEl)return;
  inputEl.classList.remove('input-valid','input-error-shake');
  if(isValid===true){inputEl.classList.add('input-valid');}
  else if(isValid===false){inputEl.classList.add('input-error-shake');triggerHaptic('heavy');}
}
/* V14: Generic Skeleton Loading Builders */
function createSkeletonCards(count){
  var cards=[];
  for(var i=0;i<count;i++){
    cards.push(h('div.skeleton-card',
      h('div.skeleton.skeleton-thumb'),
      h('div.skeleton-body',
        h('div.skeleton.skeleton-text'),
        h('div.skeleton.skeleton-text')
      )
    ));
  }
  return cards;
}
function createSkeletonRows(count){
  var rows=[];
  for(var i=0;i<count;i++){
    rows.push(h('div.skeleton-row',
      h('div.skeleton.skeleton-circle'),
      h('div.skeleton-body',
        h('div.skeleton.skeleton-text'),
        h('div.skeleton.skeleton-text')
      )
    ));
  }
  return rows;
}
function createSkeletonStats(count){
  var stats=[];
  for(var i=0;i<count;i++){
    stats.push(h('div.skeleton-stat',
      h('div.skeleton'),
      h('div.skeleton.skeleton-text')
    ));
  }
  return stats;
}
/* V14: Fun facts for loading screen */
var _funFacts=['هل تعلم؟ يمكنك إضافة حتى 500 سؤال في المسابقة','هل تعلم؟ يمكنك استيراد أسئلة من ملف JSON','هل تعلم؟ يتوفر 12 سمة مختلفة لتخصيص المظهر','هل تعلم؟ يمكنك إضافة مؤقت لكل سؤال','هل تعلم؟ دعم أنواع متعددة: اختيار متعدد، صح/خطأ، ملء فراغ','هل تعلم؟ يمكنك تصدير واستيراد بيانات المسابقة بالكامل','هل تعلم؟ وضع العرض التقديمي يدعم الكشف المتدرج للخيارات'];
var _funFactIndex=0;
function getNextFunFact(){
  var fact=_funFacts[_funFactIndex%_funFacts.length];
  _funFactIndex++;
  return fact;
}
/* V14: Show skeleton loading for a container, then replace with real content */
function showSkeletonThenRender(containerId,skeletonBuilder,renderFn,delay){
  var container=document.getElementById(containerId);
  if(!container)return;
  var skeletons=skeletonBuilder();
  if(Array.isArray(skeletons)){
    container.innerHTML='';
    skeletons.forEach(function(s){container.appendChild(s);});
  }else{
    setChildren(container,skeletons);
  }
  var factEl=h('div.skeleton-fun-fact',getNextFunFact());
  container.appendChild(factEl);
  var _factTimer=setInterval(function(){
    if(factEl.parentNode){factEl.textContent=getNextFunFact();}
    else{clearInterval(_factTimer);_factTimer=null;}
  },3000);
  if(typeof TimerRegistry!=='undefined'&&TimerRegistry.register){TimerRegistry.register('fun-fact',_factTimer);}
  setTimeout(function(){
    clearInterval(_factTimer);_factTimer=null;
    if(typeof TimerRegistry!=='undefined'&&TimerRegistry.clear){TimerRegistry.clear('fun-fact');}
    renderFn();
  },delay||500);
}
/* V14: Generic Error State Component Builder */
function createErrorState(config){
  var warningSVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
  var actions=[];
  if(config.retryFn){
    actions.push(h('button.btn.btn-primary',{onclick:config.retryFn},config.retryText||'أعد المحاولة'));
  }
  if(config.secondaryFn){
    actions.push(h('button.btn.btn-ghost',{onclick:config.secondaryFn},config.secondaryText||'المساعدة'));
  }
  return h('div.error-state-enhanced',
    h('div.error-state-icon-svg',{innerHTML:warningSVG}),
    h('div.error-state-title',config.title||'حدث خطأ'),
    h('div.error-state-desc',config.description||'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'),
    h('div.error-state-actions',...actions)
  );
}
/* V14: Data corruption recovery page */
function showCorruptionRecovery(error){
  var mainContent=document.querySelector('#admin-panel')||document.querySelector('main')||document.body;
  setChildren(mainContent,h('div',{style:'display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;padding:24px'},
    createErrorState({
      title:'تعذر تحميل بيانات المسابقة',
      description:'يبدو أن البيانات المحفوظة تالفة أو غير متوافقة. يمكنك إعادة ضبط البيانات أو محاولة التصدير.',
      retryText:'أعد المحاولة',
      retryFn:function(){location.reload()},
      secondaryText:'إعادة ضبط البيانات',
      secondaryFn:function(){confirmAction(t('confirm.resetData'),function(){localStorage.removeItem('quiz_state');location.reload()})}
    }),
    h('div',{style:'margin-top:16px;font-size:.78rem;color:var(--text-muted)'},'تفاصيل الخطأ: '+(error?String(error).slice(0,200):'غير معروف'))
  ));
}
/* V14: Enhanced interactive toast with action buttons */
function showActionToast(message,type,actionText,actionFn,duration){
  var existing=document.getElementById('notif-bar-container');
  if(!existing){toast(message,type);return;}
  var notif=h('div.notification',{className:'notification notification-'+(type||'info'),style:'display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:8px;margin-bottom:8px;animation:notif-slide-down .3s ease'},
    h('span',{style:'flex:1'},message),
    actionText?h('button.btn.btn-sm.btn-ghost',{onclick:function(){if(actionFn)actionFn();notif.remove()}},actionText):null
  );
  existing.appendChild(notif);
  setTimeout(function(){if(notif.parentNode)notif.remove()},(duration||5000));
}

/* V14: Generic Keyboard Navigation System */
function initKeyboardNavigation(){
  /* Add tabindex to interactive cards */
  document.querySelectorAll('.category-card').forEach(function(c){if(!c.hasAttribute('tabindex'))c.setAttribute('tabindex','0')});
  document.querySelectorAll('.team-card').forEach(function(c){if(!c.hasAttribute('tabindex'))c.setAttribute('tabindex','0')});
  document.querySelectorAll('.question-item').forEach(function(c){if(!c.hasAttribute('tabindex'))c.setAttribute('tabindex','0')});
  /* Enter/Space to activate focused card */
  document.addEventListener('keydown',function(e){
    var focused=document.activeElement;
    if((e.key==='Enter'||e.key===' ')&&focused){
      if(focused.classList.contains('category-card')||focused.classList.contains('team-card')||focused.classList.contains('question-item')){
        e.preventDefault();focused.click();
      }
    }
  });
}
/* V14: Global Escape key handler */
document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  /* Close open modal */
  var openModal=document.querySelector('.modal-overlay:not(.hidden)');
  if(openModal){
    var modalId=openModal.id||openModal.closest('[id]')?.id;
    if(modalId&&typeof closeModal==='function'){closeModal(modalId);return}
  }
  /* Close any drawer/sidebar */
  var openDrawer=document.querySelector('.drawer.open');
  if(openDrawer){openDrawer.classList.remove('open');return}
  /* Close notification panel */
  var notifPanel=document.querySelector('.notification-panel.open');
  if(notifPanel){notifPanel.classList.remove('open');return}
  /* Close keyboard shortcuts panel */
  var kbdPanel=document.querySelector('.keyboard-shortcuts-panel');
  if(kbdPanel){kbdPanel.remove();return}
});
/* V14: Arrow key navigation for question options */
function initOptionArrowNav(container){
  if(!container)return;
  var options=container.querySelectorAll('.question-option[tabindex],.option-pill[tabindex]');
  if(!options.length)return;
  container.addEventListener('keydown',function(e){
    var arrowKeys=['ArrowUp','ArrowDown','ArrowRight','ArrowLeft'];
    if(arrowKeys.indexOf(e.key)===-1)return;
    var currentIdx=-1;
    options.forEach(function(o,i){if(o===document.activeElement)currentIdx=i});
    if(currentIdx===-1)return;
    e.preventDefault();
    var nextIdx=-1;
    if(e.key==='ArrowDown'||e.key==='ArrowLeft'){nextIdx=(currentIdx+1)%options.length}
    else if(e.key==='ArrowUp'||e.key==='ArrowRight'){nextIdx=(currentIdx-1+options.length)%options.length}
    if(nextIdx>=0)options[nextIdx].focus();
  });
}
/* V14: Keyboard shortcuts help panel */
function showKeyboardShortcutsV14(){
  var existing=document.querySelector('.keyboard-shortcuts-panel');
  if(existing){existing.remove();return}
  var shortcuts=[
    {key:'?',desc:'عرض الاختصارات'},
    {key:'Esc',desc:'إغلاق النافذة / العودة'},
    {key:'Ctrl+K',desc:'بحث سريع'},
    {key:'1-6',desc:'اختيار خيار أثناء العرض'},
    {key:'↑↓',desc:'التنقل بين الخيارات'},
    {key:'Enter',desc:'تفعيل العنصر المحدد'},
    {key:'Tab',desc:'التنقل بين العناصر'}
  ];
  var rows=shortcuts.map(function(s){
    return h('div.keyboard-shortcut-row',h('span',s.desc),h('kbd',s.key));
  });
  var panel=h('div.keyboard-shortcuts-panel',
    h('h3','اختصارات لوحة المفاتيح'),
    h('div',...rows)
  );
  document.body.appendChild(panel);
  panel.focus();
  /* Close on click outside */
  setTimeout(function(){
    document.addEventListener('click',function handler(e){
      if(!panel.contains(e.target)){panel.remove();document.removeEventListener('click',handler)}
    });
  },100);
}
/* V14: Global keyboard shortcut listener */
document.addEventListener('keydown',function(e){
  /* '?' key to show shortcuts */
  if(e.key==='?'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
    var active=document.activeElement;
    if(active&&(active.tagName==='INPUT'||active.tagName==='TEXTAREA'||active.isContentEditable))return;
    showKeyboardShortcutsV14();
  }
  /* Ctrl+K for quick search */
  if(e.key==='k'&&(e.ctrlKey||e.metaKey)){
    e.preventDefault();
    var searchInput=document.getElementById('q-search-input')||document.getElementById('lib-search');
    if(searchInput)searchInput.focus();
  }
});
/* V14: Generic Touch Gesture System */
var GestureManager={
  _touchStartX:0,
  _touchStartY:0,
  _touchStartTime:0,
  _longPressTimer:null,
  _swipeThreshold:80,
  _longPressDelay:500,
  _edgeWidth:30,
  /* Initialize swipe navigation on a container */
  initSwipeNav:function(container,opts){
    if(!container||!'ontouchstart' in window)return;
    var onSwipeLeft=opts&&opts.onSwipeLeft;
    var onSwipeRight=opts&&opts.onSwipeRight;
    container.addEventListener('touchstart',function(e){
      GestureManager._touchStartX=e.changedTouches[0].screenX;
      GestureManager._touchStartY=e.changedTouches[0].screenY;
      GestureManager._touchStartTime=Date.now();
    },{passive:true});
    container.addEventListener('touchmove',function(e){
      var diffX=e.changedTouches[0].screenX-GestureManager._touchStartX;
      /* Visual feedback: move content slightly with finger */
      if(Math.abs(diffX)>20&&Math.abs(diffX)<150){
        container.style.transform='translateX('+Math.round(diffX*0.15)+'px)';
        container.style.transition='none';
      }
    },{passive:true});
    container.addEventListener('touchend',function(e){
      var diffX=GestureManager._touchStartX-e.changedTouches[0].screenX;
      var diffY=Math.abs(GestureManager._touchStartY-e.changedTouches[0].screenY);
      var elapsed=Date.now()-GestureManager._touchStartTime;
      container.style.transform='';
      container.style.transition='transform .2s ease';
      /* Only trigger if horizontal swipe is dominant and fast enough */
      if(Math.abs(diffX)>GestureManager._swipeThreshold&&diffY<Math.abs(diffX)&&elapsed<500){
        if(diffX>0&&onSwipeLeft){triggerHaptic('medium');onSwipeLeft();}
        else if(diffX<0&&onSwipeRight){triggerHaptic('medium');onSwipeRight();}
      }
    },{passive:true});
  },
  /* Initialize edge swipe (right edge to go back) */
  initEdgeSwipe:function(container,opts){
    if(!container||!'ontouchstart' in window)return;
    var onEdgeSwipe=opts&&opts.onEdgeSwipe;
    container.addEventListener('touchstart',function(e){
      var touchX=e.changedTouches[0].clientX;
      /* RTL: right edge in RTL is the start edge */
      var edgeStart=window.innerWidth-GestureManager._edgeWidth;
      if(touchX>edgeStart){
        GestureManager._edgeSwipeActive=true;
      }
    },{passive:true});
    container.addEventListener('touchend',function(e){
      if(!GestureManager._edgeSwipeActive)return;
      GestureManager._edgeSwipeActive=false;
      var diffX=GestureManager._touchStartX-e.changedTouches[0].screenX;
      if(Math.abs(diffX)>60&&onEdgeSwipe){triggerHaptic('medium');onEdgeSwipe();}
    },{passive:true});
  },
  /* Initialize long press context menu on elements */
  initLongPress:function(elements,menuBuilder){
    if(!elements||!'ontouchstart' in window)return;
    var items=typeof elements.length!=='undefined'?elements:[elements];
    items.forEach(function(el){
      el.addEventListener('touchstart',function(e){
        GestureManager._longPressTimer=setTimeout(function(){
          triggerHaptic('heavy');
          var menu=menuBuilder(el);
          if(menu)GestureManager._showContextMenu(menu,e.changedTouches[0].clientX,e.changedTouches[0].clientY);
        },GestureManager._longPressDelay);
      },{passive:true});
      el.addEventListener('touchmove',function(){clearTimeout(GestureManager._longPressTimer)},{passive:true});
      el.addEventListener('touchend',function(){clearTimeout(GestureManager._longPressTimer)},{passive:true});
      el.addEventListener('touchcancel',function(){clearTimeout(GestureManager._longPressTimer)},{passive:true});
    });
  },
  /* Show context menu at position */
  _showContextMenu:function(menuItems,x,y){
    GestureManager._dismissContextMenu();
    var menu=h('div.context-menu');
    menuItems.forEach(function(item){
      var cls=item.danger?'context-menu-item danger':'context-menu-item';
      var row=h('div',{className:cls,onclick:function(){
        if(item.action)item.action();
        GestureManager._dismissContextMenu();
      }},item.icon+' '+item.label);
      menu.appendChild(row);
    });
    /* Position: ensure it stays within viewport */
    if(y+menuItems.length*40>window.innerHeight)y=Math.max(10,y-menuItems.length*40);
    if(x+170>window.innerWidth)x=window.innerWidth-180;
    menu.style.top=y+'px';
    menu.style.left=x+'px';
    document.body.appendChild(menu);
    /* Dismiss on tap outside */
    setTimeout(function(){
      document.addEventListener('touchstart',GestureManager._dismissContextMenu,{once:true,passive:true});
      document.addEventListener('click',GestureManager._dismissContextMenu,{once:true});
    },100);
  },
  _dismissContextMenu:function(){
    var existing=document.querySelector('.context-menu');
    if(existing)existing.remove();
  },
  /* Initialize pinch-to-zoom on an element */
  initPinchZoom:function(element,opts){
    if(!element||!'ontouchstart' in window)return;
    var initialDistance=0;
    var initialFontSize=0;
    var minSize=opts&&opts.minSize||14;
    var maxSize=opts&&opts.maxSize||32;
    element.addEventListener('touchstart',function(e){
      if(e.touches.length===2){
        initialDistance=GestureManager._getDistance(e.touches[0],e.touches[1]);
        initialFontSize=parseFloat(window.getComputedStyle(element).fontSize);
      }
    },{passive:true});
    element.addEventListener('touchmove',function(e){
      if(e.touches.length===2&&initialDistance>0){
        e.preventDefault();
        var currentDistance=GestureManager._getDistance(e.touches[0],e.touches[1]);
        var scale=currentDistance/initialDistance;
        var newSize=Math.min(maxSize,Math.max(minSize,Math.round(initialFontSize*scale)));
        element.style.fontSize=newSize+'px';
        /* Save preference */
        if(opts&&opts.saveKey)localStorage.setItem(opts.saveKey,newSize);
      }
    });
    element.addEventListener('touchend',function(){initialDistance=0},{passive:true});
  },
  _getDistance:function(t1,t2){
    var dx=t1.clientX-t2.clientX;
    var dy=t1.clientY-t2.clientY;
    return Math.sqrt(dx*dx+dy*dy);
  },
  /* Initialize pull-to-refresh */
  initPullToRefresh:function(container,opts){
    if(!container||!'ontouchstart' in window)return;
    var onRefresh=opts&&opts.onRefresh;
    var startY=0;
    var pullEl=null;
    container.addEventListener('touchstart',function(e){
      if(container.scrollTop===0){startY=e.touches[0].clientY}
    },{passive:true});
    container.addEventListener('touchmove',function(e){
      if(startY===0)return;
      var diff=e.touches[0].clientY-startY;
      if(diff>0&&diff<100&&container.scrollTop===0){
        if(!pullEl){
          pullEl=h('div.pull-to-refresh',h('span.pull-icon','↓'),'اسحب للتحديث');
          container.prepend(pullEl);
        }
        pullEl.style.transform='translateY('+(diff-40)+'px)';
        pullEl.classList.toggle('pulling',diff>60);
      }
    },{passive:true});
    container.addEventListener('touchend',function(){
      if(pullEl&&pullEl.classList.contains('pulling')&&onRefresh){
        triggerHaptic('success');
        onRefresh();
      }
      if(pullEl){pullEl.remove();pullEl=null;}
      startY=0;
    },{passive:true});
  }
};

/* V14: Generic Streak System */
var StreakManager={
  _current:0,
  _max:0,
  _barEl:null,
  reset:function(){
    this._current=0;
    this._updateBar();
  },
  increment:function(){
    this._current++;
    if(this._current>this._max)this._max=this._current;
    this._updateBar();
    /* Milestone notifications */
    if(this._current===3){triggerHaptic('success');if(typeof toast==='function')toast(t('toast.streak3'),'success')}
    else if(this._current===5){triggerHaptic('success');if(typeof toast==='function')toast(t('toast.streak5'),'success')}
    else if(this._current===10){triggerHaptic('success');if(typeof toast==='function')toast(t('toast.streak10'),'success')}
    return this._current;
  },
  break:function(){
    if(this._current>=3){
      triggerHaptic('heavy');
      if(this._barEl)this._barEl.classList.add('streak-break');
      setTimeout(function(){if(StreakManager._barEl)StreakManager._barEl.classList.remove('streak-break')},500);
    }
    this._current=0;
    this._updateBar();
  },
  getCurrent:function(){return this._current},
  getMax:function(){return this._max},
  renderBar:function(containerId){
    var container=document.getElementById(containerId);
    if(!container)return;
    this._barEl=container;
    this._updateBar();
  },
  _updateBar:function(){
    if(!this._barEl)return;
    var dots=[];
    var maxDisplay=10;
    for(var i=0;i<maxDisplay;i++){
      var cls='streak-dot';
      if(i<this._current){
        cls+=this._current>=5?' active golden':' active';
      }
      dots.push(h('span',{className:cls}));
    }
    var label=h('span.streak-label','🔥 '+this._current);
    setChildren(this._barEl,h('div.streak-bar',label,...dots));
  }
};

/* V14: Generic Transition Orchestrator */
var TransitionManager={
  presets:{
    fade:{enterClass:'',exitClass:'transition-fade-out',duration:200},
    'slide-up':{enterClass:'',exitClass:'transition-slide-down-out',duration:250},
    scale:{enterClass:'',exitClass:'transition-scale-out',duration:200}
  },
  transition:function(fromEl,toEl,type){
    var preset=this.presets[type||'fade']||this.presets.fade;
    var self=this;
    return new Promise(function(resolve){
      if(fromEl){
        fromEl.classList.add(preset.exitClass);
        setTimeout(function(){
          fromEl.classList.add('hidden');
          fromEl.classList.remove(preset.exitClass);
          if(toEl){toEl.classList.remove('hidden');}
          resolve();
        },preset.duration);
      }else{
        if(toEl)toEl.classList.remove('hidden');
        resolve();
      }
    });
  },
  /* Smooth view transition with exit animation */
  transitionView:function(fromViewId,toViewId,type){
    var fromEl=document.getElementById(fromViewId);
    var toEl=document.getElementById(toViewId);
    return this.transition(fromEl,toEl,type);
  }
};

/* V14: Enhanced Timer - Last seconds visual */
function enhanceTimerDisplay(timerEl,secondsLeft){
  if(!timerEl)return;
  var ring=timerEl.querySelector('.timer-ring')||timerEl.querySelector('svg');
  if(ring){
    ring.classList.toggle('timer-ring-critical',secondsLeft<=10&&secondsLeft>3);
    ring.classList.toggle('timer-ring-last3',secondsLeft<=3);
  }
  /* Show large number overlay in last 10 seconds */
  var existingOverlay=timerEl.querySelector('.timer-text-overlay');
  if(secondsLeft<=10){
    if(!existingOverlay){
      var overlay=h('div.timer-text-overlay',String(secondsLeft));
      timerEl.style.position='relative';
      timerEl.appendChild(overlay);
    }else{
      existingOverlay.textContent=String(secondsLeft);
    }
    if(secondsLeft<=3)triggerHaptic('tick');
  }else if(existingOverlay){
    existingOverlay.remove();
  }
}

/* V14: Show flying points animation */
function showFlyingPoints(x,y,points){
  var el=h('div.points-fly','+'+points);
  el.style.left=x+'px';
  el.style.top=y+'px';
  document.body.appendChild(el);
  setTimeout(function(){el.remove()},1000);
}

/* V14: Achievement badges renderer */
function renderAchievementBadges(container,achievements){
  if(!container||!achievements||!achievements.length)return;
  var badges=achievements.map(function(a){
    var cls='achievement-badge '+(a.tier||'bronze');
    return h('span',{className:cls},a.icon+' '+a.label);
  });
  setChildren(container,h('div',{style:'display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:16px'},...badges));
}
