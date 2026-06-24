// ════════════════════════════════════════════════════════
//  THEME
// ════════════════════════════════════════════════════════
function applyThemeCSS(id){
  if(typeof THEMES === 'undefined') return;
  var theme = THEMES.find(function(t){ return t.id === id; });
  if(!theme || !theme.vars) return;
  Object.keys(theme.vars).forEach(function(k){
    document.documentElement.style.setProperty('--' + k, theme.vars[k]);
  });
}
window.applyThemeCSS = applyThemeCSS;

function applyTheme(id, isManual){
  // Validate theme id — fall back to 'space' (the dark default) for unknown ids
  if(typeof THEMES!=='undefined' && !THEMES.find(t=>t.id===id)){
    console.warn('[Theme] Unknown theme id "'+id+'", falling back to "space"');
    id='space';
  }
  state.settings.theme=id;
  document.body.setAttribute('data-theme',id);
  // Apply CSS variables from THEMES[] single source of truth
  applyThemeCSS(id);
  saveState();
  // Mark as manual choice so system theme auto-detect doesn't override
  // (only when the user explicitly picked a theme, not during auto-detection)
  if(isManual){
    try{
      localStorage.setItem('quiz_theme_manually_set','true');
      localStorage.setItem('quiz-theme-manual','1');
    }catch(e){}
  }
  document.querySelectorAll('.theme-swatch').forEach(s=>s.classList.toggle('active',s.dataset.tid===id));
  // Show/hide custom theme editor
  const customPanel=document.getElementById('custom-theme-panel');
  if(customPanel) customPanel.style.display=id==='custom'?'block':'none';
  if(isManual) toast(I18n.t('toast.success')||'🎨 تم تطبيق الثيم','success');
}
function renderThemeGrid(){
  // V10: Using h() DOM builder instead of innerHTML — safe from XSS
  const grid=document.getElementById('theme-grid');
  if(!grid)return;
  const children=THEMES.map(t=>{
    const isActive=state.settings.theme===t.id;
    return h('div.theme-swatch'+(isActive?'.active':''),{
      dataset:{tid:t.id},
      onClick:()=>applyTheme(t.id, true)  // true = isManual
    },
      h('div.sw-tick',isActive?'✓':''),
      h('div.sw-preview',{style:{background:t.bg}},
        h('div.sw-dots',
          h('div.sw-dot',{style:{background:t.accent,boxShadow:'0 0 6px '+t.accent+'88'}}),
          h('div.sw-dot.sm',{style:{background:t.accent2,boxShadow:'0 0 4px '+t.accent2+'66'}}),
          h('div.sw-dot.sm',{style:{background:t.accent+'55'}})
        )
      ),
      h('div.sw-name',_sanitizeUser(t.name)),
      h('div.sw-desc',_sanitizeUser(t.desc))
    );
  });
  setChildren(grid,children);
  // Advanced theme editor
  try{renderThemeEditor();}catch(e){console.warn('[Theme] Editor render error:',e);}
}

/* V14: Auto Theme Detection */
function initAutoThemeDetection(){
  /* On first run, detect system preference */
  if(!localStorage.getItem('quiz_theme_preference_set')){
    var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
    var prefersHighContrast=window.matchMedia('(prefers-contrast: more)').matches;
    if(prefersHighContrast){
      // 'pure-black' is the high-contrast theme in THEMES[]
      if(typeof applyTheme==='function')applyTheme('pure-black', false);
    }else if(prefersDark){
      if(typeof applyTheme==='function')applyTheme('space', false);
    }else{
      // Light system → use 'light' theme (also exists in THEMES[])
      if(typeof applyTheme==='function')applyTheme('light', false);
    }
    localStorage.setItem('quiz_theme_preference_set','true');
  }
  /* Listen for system theme changes */
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(e){
    if(!localStorage.getItem('quiz_theme_manually_set')){
      if(typeof applyTheme==='function')applyTheme(e.matches?'space':'light', false);
    }
  });
}

/* V14: Generic Screen Reader Announcement */
function announceToScreenReader(text,priority){
  var el=document.getElementById('live-'+(priority||'polite'));
  if(!el)return;
  el.textContent='';
  setTimeout(function(){el.textContent=text},100);
}

/* V14: Enhanced Focus Trap for Modals */
function trapFocusInModal(modalEl){
  if(!modalEl)return;
  var focusable=modalEl.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(!focusable.length)return;
  var first=focusable[0];
  var last=focusable[focusable.length-1];
  var handler=function(e){
    if(e.key!=='Tab')return;
    if(e.shiftKey){
      if(document.activeElement===first){e.preventDefault();last.focus()}
    }else{
      if(document.activeElement===last){e.preventDefault();first.focus()}
    }
  };
  modalEl.addEventListener('keydown',handler);
  /* Focus first element */
  if(first)first.focus();
  /* Return cleanup function */
  return function(){modalEl.removeEventListener('keydown',handler)};
}

/* V14: Add visual indicators for correct/wrong answers (color-blind support) */
function applyAccessibilityIndicators(){
  /* Add checkmark/cross icons and border patterns to answer options */
  var style=document.getElementById('v14-accessibility-styles');
  if(!style){
    style=document.createElement('style');
    style.id='v14-accessibility-styles';
    document.head.appendChild(style);
  }
  style.textContent=`
    .option-correct-accessibility{border:3px solid var(--success,#0e6) !important;background-image:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(0,224,110,.05) 10px,rgba(0,224,110,.05) 20px) !important}
    .option-correct-accessibility::after{content:' ✓';font-weight:900;font-size:1.2em;color:var(--success,#0e6)}
    .option-wrong-accessibility{border:3px dashed var(--danger,#ef4444) !important}
    .option-wrong-accessibility::after{content:' ✗';font-weight:900;font-size:1.2em;color:var(--danger,#ef4444)}
  `;
}
