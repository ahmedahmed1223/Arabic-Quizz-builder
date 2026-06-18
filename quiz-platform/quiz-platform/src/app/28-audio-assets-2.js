// ════════════════════════════════════════════════════════
//  ENHANCED BACKUP
// ════════════════════════════════════════════════════════
let _backupTimer=null;
let _lastBackupTime=null;
let _backupSeqNum=0;
let _backupHistory=[];

function setBackupInterval(selOrVal){
  clearInterval(_backupTimer);_backupTimer=null;
  const sel=typeof selOrVal==='object'?selOrVal:document.getElementById('s-backup-interval');
  const customWrap=document.getElementById('backup-custom-wrap');
  let minutes=0;
  if(sel&&sel.value==='custom'){
    if(customWrap)customWrap.style.display='block';
    const ci=document.getElementById('s-backup-custom');
    if(ci)minutes=+ci.value||60;else return;
  }else{
    if(customWrap)customWrap.style.display='none';
    minutes=sel?+sel.value:+(selOrVal)||0;
  }
  state.settings.backupInterval=minutes;saveState();
  if(minutes>0){
    _backupTimer=setInterval(()=>doBackupNow(true),minutes*60*1000);
    toast(I18n.t('toast.autoBackupInterval',{minutes:minutes}),'success');
  }else{
    toast(I18n.t('toast.autoBackupDisabled'),'info');
  }
  updateBackupStatus();
}

function applyCustomBackupInterval(val){
  state.settings.backupInterval=val;
  clearInterval(_backupTimer);_backupTimer=null;
  if(val>0)_backupTimer=setInterval(()=>doBackupNow(true),val*60*1000);
  saveState();updateBackupStatus();
}

function doBackupNow(auto=false,compact=false){
  const content=compact?'progress':(state.settings.backupContent||'full');
  let exportObj={backupDate:new Date().toISOString(),backupType:auto?'auto':'manual',version:'8'};
  const cleanSettings={...state.settings,customMusicData:null,customCorrectData:null,customWrongData:null,
    // V10-fix: also strip other large media fields for compact backup
    customTenseData:null,podiumMusicData:null,wheelMusicData:null,certBgImage:null};
  if(content==='full'||content==='questions'){
    exportObj.settings=cleanSettings;
    exportObj.categories=state.categories;
    exportObj.teams=state.teams;
    exportObj.credits=state.credits;
  }
  if(content==='full'||content==='progress'){
    exportObj.sessionStats=state.sessionStats;
    if(content==='progress'){exportObj.teams=state.teams.map(t=>({id:t.id,name:t.name,score:t.score}));}
  }
  const json=JSON.stringify(exportObj,null,2);
  const blob=new Blob([json],{type:'application/json'});
  // Generate filename
  const safeName=(state.settings.name||'quiz').replace(/[^\w\u0600-\u06FF]/g,'_').slice(0,25);
  const fmt=state.settings.backupNameFormat||'date';
  let fname='';
  if(fmt==='date'){
    const d=new Date();
    const ds=d.toISOString().slice(0,16).replace('T','_').replace(':','-');
    fname='backup_'+safeName+'_'+ds+'.json';
  }else if(fmt==='seq'){
    _backupSeqNum++;
    fname='backup_'+safeName+'_'+String(_backupSeqNum).padStart(3,'0')+'.json';
  }else{
    fname=safeName+'.json';
  }
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=fname;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  _lastBackupTime=new Date();
  // Store in history
  _backupHistory.unshift({name:fname,time:_lastBackupTime,size:Math.round(blob.size/1024)});
  if(_backupHistory.length>3)_backupHistory.pop();
  updateBackupStatus();
  if(!auto)toast(I18n.t('toast.backupCreatedWithInfo',{name:fname,size:Math.round(blob.size/1024)}),'success');
}

function updateBackupStatus(){
  const el=document.getElementById('backup-status');if(!el)return;
  const interval=state.settings.backupInterval||0;
  if(interval===0&&!_lastBackupTime){el.textContent=I18n.t('backup.none')||'لم يتم أي نسخ بعد';renderBackupHistory();return;}
  if(_lastBackupTime){
    const mins=Math.round((Date.now()-_lastBackupTime)/60000);
    const timeStr=mins===0?'الآن':mins<60?'منذ '+mins+' دقيقة':'منذ '+Math.round(mins/60)+' ساعة';
    el.textContent=(I18n.t('backup.last')||'آخر نسخة: ')+timeStr+(interval>0?' | كل '+interval+' دقيقة':'');
  }else if(interval>0){
    el.textContent=(I18n.t('backup.next')||'التالية خلال ')+interval+' دقيقة';
  }
  renderBackupHistory();
}

function renderBackupHistory(){
  const wrap=document.getElementById('backup-history-wrap');
  const list=document.getElementById('backup-history-list');
  if(!wrap||!list)return;
  if(!_backupHistory.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  list.innerHTML=_backupHistory.map(h=>`
    <div class="backup-hist-item">
      <span class="backup-hist-icon">📄</span>
      <span class="backup-hist-name" title="${h.name}">${h.name}</span>
      <span class="backup-hist-time">${h.size}KB</span>
    </div>`).join('');
}

function restoreBackupInterval(){
  // ── FIX: Always clear existing timer before creating new one ──
  clearInterval(_backupTimer);_backupTimer=null;
  const interval=state.settings.backupInterval||0;
  if(interval>0)_backupTimer=setInterval(()=>doBackupNow(true),interval*60*1000);
  const sel=document.getElementById('s-backup-interval');
  if(sel){
    const opts=['0','15','30','60','120'];
    sel.value=opts.includes(String(interval))?String(interval):(interval>0?'custom':'0');
    const cw=document.getElementById('backup-custom-wrap');
    if(cw)cw.style.display=sel.value==='custom'?'block':'none';
    if(sel.value==='custom'){const ci=document.getElementById('s-backup-custom');if(ci)ci.value=interval;}
  }
  updateBackupStatus();
}


// ════════════════════════════════════════════════════════
//  CUSTOM THEME ENGINE
// ════════════════════════════════════════════════════════
const CUSTOM_VARS={
  'bg-deep':'--c-bg-deep','bg-card':'--c-bg-card','bg-panel':'--c-bg-panel',
  'bg-surface':'--c-bg-surface','accent1':'--c-accent1','accent1-light':'--c-accent1-light',
  'accent1-dark':'--c-accent1-dark','accent2':'--c-accent2',
  'text-primary':'--c-text-primary','text-secondary':'--c-text-secondary',
  'text-muted':'--c-text-muted','border':'--c-border','border-light':'--c-border-light',
};
function applyCustomColor(key,val){
  if(!val||val.length<4)return;
  document.documentElement.style.setProperty(CUSTOM_VARS[key]||'--c-'+key, val);
  // Sync text input
  const hex=document.getElementById('ct-'+key+'-hex');
  if(hex&&hex!==document.activeElement) hex.value=val;
  // Save to settings
  if(!state.settings.customThemeVars) state.settings.customThemeVars={};
  state.settings.customThemeVars[key]=val;
  saveState();
}
function syncColorInput(key,val){
  const ok=/^#[0-9a-fA-F]{6}$/.test(val);
  const picker=document.getElementById('ct-'+key);
  if(ok&&picker) picker.value=val;
  if(ok) applyCustomColor(key,val);
}
function lightenColor(hex,amt){
  let c=parseInt(hex.replace('#',''),16);
  let r=Math.min(255,(c>>16)+amt),g=Math.min(255,((c>>8)&0xff)+amt),b=Math.min(255,(c&0xff)+amt);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function darkenColor(hex,amt){
  let c=parseInt(hex.replace('#',''),16);
  let r=Math.max(0,(c>>16)-amt),g=Math.max(0,((c>>8)&0xff)-amt),b=Math.max(0,(c&0xff)-amt);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const CUSTOM_PRESETS={};
['dark-teal','warm-rose','pure-black','midnight-blue'].forEach(id=>{
  const t=THEMES.find(th=>th.id===id);
  if(t&&t.vars){
    // Only include keys that exist in CUSTOM_VARS (the custom theme editor UI)
    const filtered={};
    Object.keys(CUSTOM_VARS).forEach(k=>{if(t.vars[k]!==undefined)filtered[k]=t.vars[k];});
    CUSTOM_PRESETS[id]=filtered;
  }
});
function loadCustomThemePreset(name){
  const p=CUSTOM_PRESETS[name];if(!p)return;
  Object.entries(p).forEach(([k,v])=>{
    const picker=document.getElementById('ct-'+k);
    const hex=document.getElementById('ct-'+k+'-hex');
    if(picker) picker.value=v;
    if(hex) hex.value=v;
    applyCustomColor(k,v);
  });
  toast(I18n.t('toast.presetThemeApplied',{name:name}),'success');
}
function resetCustomTheme(){
  Object.keys(CUSTOM_VARS).forEach(k=>document.documentElement.style.removeProperty(CUSTOM_VARS[k]));
  state.settings.customThemeVars={};saveState();
  toast(I18n.t('toast.customThemeReset'),'info');
}
function exportCustomTheme(){
  const vars=Object.entries(CUSTOM_VARS).map(([k,v])=>{
    const val=getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    return val?`  ${v}: ${val};`:'';
  }).filter(Boolean).join('\n');
  const css=`[data-theme="custom"]{\n${vars}\n}`;
  navigator.clipboard?.writeText(css).then(()=>toast(I18n.t('toast.cssCopied'),'success'));
}
function restoreCustomThemeVars(){
  const vars=state.settings.customThemeVars||{};
  Object.entries(vars).forEach(([k,v])=>{
    document.documentElement.style.setProperty(CUSTOM_VARS[k]||'--c-'+k,v);
    const picker=document.getElementById('ct-'+k);
    const hex=document.getElementById('ct-'+k+'-hex');
    if(picker&&/^#[0-9a-fA-F]{6}$/.test(v)) picker.value=v;
    if(hex) hex.value=v;
  });
}
