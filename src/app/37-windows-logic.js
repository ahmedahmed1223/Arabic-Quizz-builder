function showHostHint(){
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  if(!cat)return;
  const q=cat.questions[state.currentQIndex];
  if(!q||!q.hostNote){toast(I18n.t('toast.noHostNote'),'info');return;}
  openGenericModal('💡 تلميح المضيف',`<div style="font-size:1rem;line-height:1.8;padding:12px 0" dir="auto">${q.hostNote}</div>`);
}

// ── WHITEBOARD OVERLAY ──
let _whiteboardActive=false;
function toggleWhiteboard(){
  let wb=document.getElementById('whiteboard-overlay');
  if(_whiteboardActive){
    if(wb)wb.remove();
    _whiteboardActive=false;
    if(window._wbResizeHandler){window.removeEventListener('resize',window._wbResizeHandler);window._wbResizeHandler=null;}
    toast(I18n.t('toast.whiteboardClosed'),'info');return;
  }
  _whiteboardActive=true;
  wb=document.createElement('div');wb.id='whiteboard-overlay';
  wb.style.cssText='position:fixed;inset:0;z-index:5000;cursor:crosshair;touch-action:none';
  window._wbMode='pen'; window._wbShapeStart=null;
  wb.innerHTML=`<canvas id="wb-canvas" style="width:100%;height:100%"></canvas>
    <canvas id="wb-preview-canvas" style="width:100%;height:100%;position:absolute;inset:0;pointer-events:none"></canvas>
    <div id="wb-toolbar" style="position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:5001;display:flex;flex-wrap:wrap;gap:6px;background:rgba(15,15,30,.95);border:1.5px solid rgba(255,255,255,.15);border-radius:18px;padding:10px 14px;box-shadow:0 8px 40px rgba(0,0,0,.8);max-width:95vw;justify-content:center">
      <div style="display:flex;gap:4px;align-items:center;border-right:1px solid rgba(255,255,255,.15);padding-right:8px;margin-right:2px">
        <button id="wb-btn-pen" onclick="wbSetMode('pen')" title="قلم" data-i18n="title.wbPen" data-i18n-attr="title" style="width:32px;height:32px;border-radius:8px;background:var(--accent2);border:none;cursor:pointer;font-size:.95rem">✏️</button>
        <button id="wb-btn-eraser" onclick="wbSetMode('eraser')" title="ممحاة" data-i18n="title.wbEraser" data-i18n-attr="title" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:.95rem">🧹</button>
      </div>
      <div style="display:flex;gap:4px;align-items:center;border-right:1px solid rgba(255,255,255,.15);padding-right:8px;margin-right:2px">
        <button id="wb-btn-rect" onclick="wbSetMode('rect')" title="مستطيل" data-i18n="title.wbRect" data-i18n-attr="title" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:.85rem">▭</button>
        <button id="wb-btn-circle" onclick="wbSetMode('circle')" title="دائرة" data-i18n="title.wbCircle" data-i18n-attr="title" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:.85rem">⭕</button>
        <button id="wb-btn-triangle" onclick="wbSetMode('triangle')" title="مثلث" data-i18n="title.wbTriangle" data-i18n-attr="title" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:.85rem">△</button>
        <button id="wb-btn-line" onclick="wbSetMode('line')" title="خط" data-i18n="title.wbLine" data-i18n-attr="title" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);cursor:pointer;font-size:.85rem">╱</button>
      </div>
      <div style="display:flex;gap:4px;align-items:center;border-right:1px solid rgba(255,255,255,.15);padding-right:8px;margin-right:2px">
        <button onclick="wbSetColor('#ffffff')" style="width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid #888;cursor:pointer" title="أبيض" data-i18n="title.wbWhite" data-i18n-attr="title"></button>
        <button onclick="wbSetColor('#ff3d5a')" style="width:24px;height:24px;border-radius:50%;background:#ff3d5a;border:none;cursor:pointer" title="أحمر" data-i18n="title.wbRed" data-i18n-attr="title"></button>
        <button onclick="wbSetColor('#00e8d0')" style="width:24px;height:24px;border-radius:50%;background:#00e8d0;border:none;cursor:pointer" title="فيروزي" data-i18n="title.wbCyan" data-i18n-attr="title"></button>
        <button onclick="wbSetColor('#ffe23d')" style="width:24px;height:24px;border-radius:50%;background:#ffe23d;border:none;cursor:pointer" title="أصفر" data-i18n="title.wbYellow" data-i18n-attr="title"></button>
        <button onclick="wbSetColor('#4ade80')" style="width:24px;height:24px;border-radius:50%;background:#4ade80;border:none;cursor:pointer" title="أخضر" data-i18n="title.wbGreen" data-i18n-attr="title"></button>
        <button onclick="wbSetColor('#a78bfa')" style="width:24px;height:24px;border-radius:50%;background:#a78bfa;border:none;cursor:pointer" title="بنفسجي" data-i18n="title.wbPurple" data-i18n-attr="title"></button>
      </div>
      <div style="display:flex;gap:4px;align-items:center;border-right:1px solid rgba(255,255,255,.15);padding-right:8px;margin-right:2px">
        <button onclick="wbSetWidth(2)" style="padding:4px 8px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:.7rem">رفيع</button>
        <button onclick="wbSetWidth(6)" style="padding:4px 8px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:.7rem">وسط</button>
        <button onclick="wbSetWidth(14)" style="padding:4px 8px;border-radius:8px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:.7rem">سميك</button>
      </div>
      <button onclick="wbUndo()" style="padding:4px 10px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:.75rem;font-weight:700">↩ تراجع</button>
      <button onclick="wbClear()" style="padding:4px 10px;border-radius:10px;background:var(--danger);border:none;color:#fff;cursor:pointer;font-size:.75rem;font-weight:700">🗑 مسح الكل</button>
      <button onclick="toggleWhiteboard()" style="padding:4px 10px;border-radius:10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:.75rem;font-weight:700">✕ إغلاق</button>
    </div>`;
  document.body.appendChild(wb);
  const canvas=document.getElementById('wb-canvas');
  const previewCanvas=document.getElementById('wb-preview-canvas');
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  previewCanvas.width=window.innerWidth;previewCanvas.height=window.innerHeight;
  const ctx=canvas.getContext('2d');
  const pCtx=previewCanvas.getContext('2d');
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#ffffff';ctx.lineWidth=3;
  window._wbCtx=ctx;window._wbPCtx=pCtx;window._wbDrawing=false;
  window._wbHistory=[];
  function wbSaveSnapshot(){const imgData=ctx.getImageData(0,0,canvas.width,canvas.height);window._wbHistory.push(imgData);if(window._wbHistory.length>20)window._wbHistory.shift();}
  canvas.addEventListener('pointerdown',e=>{
    e.preventDefault();
    const x=e.clientX,y=e.clientY;
    wbSaveSnapshot();
    if(window._wbMode==='pen'){window._wbDrawing=true;ctx.beginPath();ctx.moveTo(x,y);}
    else if(window._wbMode==='eraser'){window._wbDrawing=true;ctx.globalCompositeOperation='destination-out';ctx.lineWidth=(window._wbLineWidth||3)*5;ctx.beginPath();ctx.moveTo(x,y);}
    else{window._wbDrawing=true;window._wbShapeStart={x,y};}
  },{passive:false});
  canvas.addEventListener('pointermove',e=>{
    e.preventDefault();
    const x=e.clientX,y=e.clientY;
    if(!window._wbDrawing)return;
    if(window._wbMode==='pen'||window._wbMode==='eraser'){ctx.lineTo(x,y);ctx.stroke();}
    else if(window._wbShapeStart){
      pCtx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
      pCtx.strokeStyle=ctx.strokeStyle;pCtx.lineWidth=ctx.lineWidth;pCtx.lineCap='round';pCtx.lineJoin='round';
      const sx=window._wbShapeStart.x,sy=window._wbShapeStart.y;
      pCtx.beginPath();
      if(window._wbMode==='rect'){pCtx.strokeRect(sx,sy,x-sx,y-sy);}
      else if(window._wbMode==='circle'){const rx=(x-sx)/2,ry=(y-sy)/2;pCtx.ellipse(sx+rx,sy+ry,Math.abs(rx),Math.abs(ry),0,0,2*Math.PI);pCtx.stroke();}
      else if(window._wbMode==='triangle'){pCtx.moveTo((sx+x)/2,sy);pCtx.lineTo(x,y);pCtx.lineTo(sx,y);pCtx.closePath();pCtx.stroke();}
      else if(window._wbMode==='line'){pCtx.moveTo(sx,sy);pCtx.lineTo(x,y);pCtx.stroke();}
    }
  },{passive:false});
  function finishShape(x,y){
    if(!window._wbDrawing)return;
    window._wbDrawing=false;
    pCtx.clearRect(0,0,previewCanvas.width,previewCanvas.height);
    if(window._wbMode==='eraser'){ctx.globalCompositeOperation='source-over';ctx.lineWidth=window._wbLineWidth||3;return;}
    if(!window._wbShapeStart)return;
    const sx=window._wbShapeStart.x,sy=window._wbShapeStart.y;
    ctx.beginPath();
    if(window._wbMode==='rect'){ctx.strokeRect(sx,sy,x-sx,y-sy);}
    else if(window._wbMode==='circle'){const rx=(x-sx)/2,ry=(y-sy)/2;ctx.ellipse(sx+rx,sy+ry,Math.abs(rx),Math.abs(ry),0,0,2*Math.PI);ctx.stroke();}
    else if(window._wbMode==='triangle'){ctx.moveTo((sx+x)/2,sy);ctx.lineTo(x,y);ctx.lineTo(sx,y);ctx.closePath();ctx.stroke();}
    else if(window._wbMode==='line'){ctx.moveTo(sx,sy);ctx.lineTo(x,y);ctx.stroke();}
    window._wbShapeStart=null;
  }
  canvas.addEventListener('pointerup',e=>finishShape(e.clientX,e.clientY));
  canvas.addEventListener('pointerleave',e=>finishShape(e.clientX,e.clientY));
  let _wbResizeTimer=null;
  window._wbResizeHandler=()=>{clearTimeout(_wbResizeTimer);_wbResizeTimer=setTimeout(()=>{if(_whiteboardActive){toggleWhiteboard();toast(I18n.t('toast.whiteboardAutoClosed'),'info');}},300);};
  window.addEventListener('resize',window._wbResizeHandler,{passive:true});
  toast(I18n.t('toast.whiteboardEnabled'),'success');
}
function wbSetColor(c){if(window._wbCtx){window._wbCtx.strokeStyle=c;window._wbPCtx&&(window._wbPCtx.strokeStyle=c);}}
function wbSetWidth(w){window._wbLineWidth=w;if(window._wbCtx){window._wbCtx.lineWidth=w;window._wbPCtx&&(window._wbPCtx.lineWidth=w);}}
function wbClear(){const c=document.getElementById('wb-canvas');if(c){const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);}window._wbHistory=[];}
function wbUndo(){if(!window._wbHistory||!window._wbHistory.length)return;const c=document.getElementById('wb-canvas');if(!c)return;const ctx=c.getContext('2d');const snap=window._wbHistory.pop();ctx.putImageData(snap,0,0);}
function wbSetMode(mode){
  window._wbMode=mode;
  if(window._wbCtx){window._wbCtx.globalCompositeOperation='source-over';window._wbCtx.lineWidth=window._wbLineWidth||3;}
  ['pen','eraser','rect','circle','triangle','line'].forEach(m=>{
    const btn=document.getElementById('wb-btn-'+m);
    if(btn)btn.style.background=m===mode?'var(--accent2)':'rgba(255,255,255,.08)';
  });
  if(mode==='eraser'&&window._wbCtx){window._wbCtx.globalCompositeOperation='destination-out';}
  document.getElementById('wb-canvas').style.cursor=mode==='eraser'?'cell':'crosshair';
}

// ── AUDIENCE POLL (Simulated) ──
function showAudiencePoll(){
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  if(!cat)return;
  const q=cat.questions[state.currentQIndex];if(!q)return;
  const opts=q.options.filter(o=>o);
  const LETTERS=['أ','ب','ج','د'];
  // Generate weighted random votes favoring correct answer
  const votes=opts.map((_,i)=>{
    const base=Math.random()*20+5;
    return i===q.correct?base+Math.random()*40+20:base;
  });
  const total=votes.reduce((a,v)=>a+v,0);
  const pcts=votes.map(v=>Math.round(v/total*100));
  // Normalize to 100%
  const diff=100-pcts.reduce((a,v)=>a+v,0);
  pcts[q.correct]+=diff;
  const colors=['var(--accent1)','var(--accent2)','var(--success)','var(--danger)'];
  const bars=opts.map((o,i)=>`
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-size:.85rem;margin-bottom:4px">
        <span style="font-weight:700">${getAnswerLabel(i)}: ${o.length>25?o.slice(0,22)+'…':o}</span>
        <span style="font-weight:900;color:${colors[i]}">${pcts[i]}%</span>
      </div>
      <div style="height:28px;background:var(--bg-panel);border-radius:8px;overflow:hidden;position:relative">
        <div style="height:100%;width:0%;background:${colors[i]};border-radius:8px;transition:width 1.5s cubic-bezier(.22,1,.36,1)" id="poll-bar-${i}"></div>
      </div>
    </div>`).join('');
  openGenericModal('📊 استطلاع رأي الجمهور',`<div style="padding:8px 0">${bars}</div><div class="text-sm text-muted" style="text-align:center;margin-top:8px">إجمالي الأصوات: ${Math.round(total)}</div>`);
  // Animate bars
  setTimeout(()=>{opts.forEach((_,i)=>{const el=document.getElementById('poll-bar-'+i);if(el)el.style.width=pcts[i]+'%';});},100);
}

// ── QR GENERATOR ──
function showQuizQR(){
  const data=JSON.stringify({name:state.settings.name,teams:state.teams.length,categories:state.categories.length,questions:state.categories.reduce((a,c)=>a+c.questions.length,0)});
  // Simple QR using canvas pattern (basic text encoding display)
  openGenericModal('📱 رمز QR للمسابقة',`
    <div style="text-align:center;padding:16px">
      <div style="background:#fff;padding:24px;border-radius:16px;display:inline-block;margin-bottom:16px">
        <canvas id="qr-canvas" width="200" height="200"></canvas>
      </div>
      <div style="font-size:.82rem;color:var(--text-secondary);line-height:1.6">
        <div><strong>المسابقة:</strong> ${state.settings.name}</div>
        <div><strong>الأقسام:</strong> ${state.categories.length} | <strong>الأسئلة:</strong> ${state.categories.reduce((a,c)=>a+c.questions.length,0)}</div>
        <div><strong>الفرق:</strong> ${state.teams.length}</div>
      </div>
      <button class="btn btn-primary btn-sm" style="margin-top:12px" onclick="navigator.clipboard.writeText(location.href).then(()=>toast(I18n.t('toast.linkCopied'),'success'))">📋 نسخ الرابط</button>
    </div>`);
  // Draw simple QR-like pattern
  setTimeout(()=>{
    const c=document.getElementById('qr-canvas');if(!c)return;
    const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,200,200);
    ctx.fillStyle='#000';
    // Generate a simple visual pattern from data hash
    let hash=0;for(let i=0;i<data.length;i++)hash=((hash<<5)-hash)+data.charCodeAt(i);
    for(let y=0;y<20;y++){for(let x=0;x<20;x++){
      const val=(hash>>(x+y))&1||(x<3&&y<3)||(x>16&&y<3)||(x<3&&y>16);
      if(val)ctx.fillRect(x*10,y*10,10,10);
    }}
    // Corner markers
    [[0,0],[140,0],[0,140]].forEach(([ox,oy])=>{
      ctx.fillStyle='#000';ctx.fillRect(ox,oy,60,60);
      ctx.fillStyle='#fff';ctx.fillRect(ox+10,oy+10,40,40);
      ctx.fillStyle='#000';ctx.fillRect(ox+20,oy+20,20,20);
    });
  },100);
}

// ════════════════════════════════════════════════════════
//  KEYBOARD SHORTCUTS — Presentation & Admin
// ════════════════════════════════════════════════════════
(function(){
  function getCurrentView(){
    for(const v of ALL_VIEWS){
      const el=document.getElementById('view-'+v);
      if(el&&!el.classList.contains('hidden'))return v;
    }
    return null;
  }

  document.addEventListener('keydown',function(e){
    // Skip if user is typing in an input/textarea/select
    if(e.target.matches('input,textarea,select,[contenteditable]'))return;

    const view=getCurrentView();

    // ── Presentation: Question view shortcuts ──
    if(view==='question'){
      if(e.code==='Space'){
        e.preventDefault();
        // Progressive reveal or show answer
        if(state.settings.progressiveReveal&&state.optionsRevealed<state.totalOptionsToReveal){
          if(typeof revealNextOption==='function')revealNextOption();
        }
      }
      if(e.code==='KeyT'&&typeof toggleTimer==='function'){toggleTimer();}
      if(e.code==='KeyM'){toggleMusic();}
      // Digit keys 1-4 to select options
      if(e.key>='1'&&e.key<='4'){
        const idx=+e.key-1;
        const btn=document.getElementById('opt-btn-'+idx);
        if(btn&&!btn.classList.contains('hidden-option')&&!btn.classList.contains('faded')){
          btn.click();
        }
      }
    }

    // ── Presentation: Navigation shortcuts ──
    if(['intro','teams','categories','scores','credits','podium','teamstats'].includes(view)){
      if(e.code==='KeyM'){toggleMusic();}
      if(e.code==='KeyF'){
        e.preventDefault();
        if(typeof toggleFullscreen==='function')toggleFullscreen();
      }
      if(e.code==='KeyC'){showView('credits');}
      if(e.code==='KeyS'){showView('scores');}
    }

    // ── Admin: Undo with Ctrl+Z ──
    if(view==='admin'&&e.ctrlKey&&e.code==='KeyZ'){
      e.preventDefault();
      if(typeof performUndo==='function')performUndo();
      else if(state.scoreHistory&&state.scoreHistory.length){
        // Score undo fallback
        const last=state.scoreHistory.pop();
        if(last){
          const t=state.teams.find(tm=>tm.id===last.teamId);
          if(t){t.score-=last.delta;saveState();renderAdmin();toast(I18n.t('toast.scoreChangeUndone'),'info');}
        }
      }
    }

    // ── Escape to go back ──
    if(e.code==='Escape'){
      // Cancel presentation sequence if running
      if(_seqTimer){clearTimeout(_seqTimer);_seqTimer=null;_showSeqOverlay(false);_removeSeqWelcome();showView('categories');return}
      // Close any open modal first
      const openModal=document.querySelector('.modal-overlay:not(.hidden)');
      if(openModal){
        const id=openModal.id;
        if(id)closeModal(id);
        return;
      }
      // Then navigate back
      if(['teams','categories','question','scores','credits','podium','teamstats','bigclock'].includes(view)){
        if(typeof goToAdmin==='function')goToAdmin();
      }
    }
  });

  // ── Keyboard shortcut help overlay ──
  window._showKeyboardHelp=function(){
    let ov=document.getElementById('kb-help-overlay');
    if(ov){ov.style.display=ov.style.display==='flex'?'none':'flex';return;}
    ov=document.createElement('div');
    ov.id='kb-help-overlay';
    ov.onclick=function(e){if(e.target===ov)ov.style.display='none';};
    ov.style.cssText='position:fixed;inset:0;z-index:6000;background:rgba(0,0,0,.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:20px;animation:fade-in .2s ease;';
    const shortcuts=[
      {section:'أثناء عرض السؤال',items:[
        ['مسافة','كشف الخيار التالي'],['1 - 4','اختيار الإجابة'],
        ['T','تشغيل/إيقاف المؤقت'],['M','تشغيل/إيقاف الموسيقى']]},
      {section:'أثناء العرض',items:[
        ['F','ملء الشاشة'],['M','الموسيقى'],['C','شاشة الشكر'],['S','النتائج'],['Esc','العودة']]},
      {section:'في لوحة التحكم',items:[
        ['Ctrl+Z','تراجع'],['Esc','إغلاق النافذة']]}
    ];
    let html='<div style="background:var(--bg-card);border:1px solid var(--border-light);border-radius:20px;padding:28px;max-width:420px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 24px 64px rgba(0,0,0,.6)">';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div style="font-size:1.05rem;font-weight:800;color:var(--text-primary)">⌨️ اختصارات لوحة المفاتيح</div><button onclick="document.getElementById(\'kb-help-overlay\').style.display=\'none\'" style="width:28px;height:28px;border-radius:50%;border:1px solid var(--border);background:var(--bg-surface);color:var(--text-secondary);cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center">✕</button></div>';
    shortcuts.forEach(function(s){
      html+='<div style="font-size:.78rem;font-weight:700;color:var(--accent2);margin:14px 0 8px;letter-spacing:.05em">'+s.section+'</div>';
      s.items.forEach(function(item){
        html+='<div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">';
        html+='<span style="font-size:.85rem;color:var(--text-secondary)">'+item[1]+'</span>';
        html+='<kbd style="background:var(--bg-surface);border:1px solid var(--border-light);border-radius:6px;padding:3px 10px;font-size:.78rem;font-weight:700;color:var(--accent1);font-family:monospace;min-width:36px;text-align:center">'+item[0]+'</kbd>';
        html+='</div>';
      });
    });
    html+='</div>';
    ov.innerHTML=html;
    document.body.appendChild(ov);
  };
})();

// ════════════════════════════════════════════════════════
//  LOADING OVERLAY — show/hide during heavy operations
// ════════════════════════════════════════════════════════
function showLoading(msg){
  msg=msg||'جاري التحميل...';
  let ov=document.getElementById('loading-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='loading-overlay';
    ov.setAttribute('role','alert');
    ov.setAttribute('aria-live','assertive');
    ov.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);transition:opacity .2s;';
    ov.innerHTML='<div style="text-align:center"><div style="font-size:2.2rem;margin-bottom:14px;animation:pulse-glow 1s ease-in-out infinite" id="loading-spinner-icon">⏳</div><div id="loading-msg" style="font-size:.95rem;font-weight:700;color:var(--text-primary)"></div><div style="width:160px;height:3px;background:var(--border);margin:16px auto 0;border-radius:2px;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,var(--accent2),var(--accent1));animation:loading-progress 2s ease infinite;width:60%"></div></div></div>';
    document.body.appendChild(ov);
  }
  document.getElementById('loading-msg').textContent=msg;
  ov.style.display='flex';
  ov.style.opacity='1';
}
function hideLoading(){
  const ov=document.getElementById('loading-overlay');
  if(ov){ov.style.opacity='0';setTimeout(()=>{ov.style.display='none';},200);}
}
// ── Patch importJSON to show loading ──
(function(){
  const _origImportJSON=window.importJSON;
  if(typeof _origImportJSON==='function'){
    window.importJSON=function(e){
      showLoading('جاري استيراد البيانات...');
      // hideLoading() is called inside importJSON's async finally block after processing completes
      try{_origImportJSON(e);}catch(err){toast(I18n.t('toast.dataError')+err.message,'danger');try{if(typeof hideLoading==='function')hideLoading();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_235")}catch(_){}}}
    };
  }
})();
// ── Patch importExcel if exists ──
(function(){
  const _origImportExcel=window.importExcelFile;
  if(typeof _origImportExcel==='function'){
    window.importExcelFile=function(e){
      showLoading('جاري معالجة ملف Excel...');
      setTimeout(()=>{
        try{_origImportExcel(e);}catch(err){toast(I18n.t('toast.dataError')+err.message,'danger');}
        hideLoading();
      },100);
    };
  }
})();

// ────────────────────────────────────────────────────
// All functions are now in global scope (no IIFE wrapping).
// The IIFE was removed because it was blocking access to many
// inline onclick/oninput/onchange handlers in the HTML.
// ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════
//  FITB ANSWER CHECK
// ═══════════════════════════════════════════════════════
function checkFitbAnswer(){
  if(state.answered)return;
  const input=$el('fitb-player-input');
  if(!input||!input.value.trim()){toast(I18n.t('toast.writeYourAnswer'),'info');return;}
  const cat=getCurrentCat();
  const q=getCurrentQuestion();
  if(!cat||!q){toast(I18n.t('toast.noActiveQuestion'),'danger');return;}
    // Multiple accepted answers separated by '|'
  // Compare after full Arabic normalization, with small typo tolerance.
  const storedAns=(q.fitbAnswer||(state._fitbCorrect||'')).trim();
  const accepted=storedAns.split('|').map(function(s){return s.trim();}).filter(Boolean);
  const isCorrect=_fitbMatches(input.value, accepted);
  state.answered=true;clearTimer();_stopTenseAudio();
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  input.disabled=true;
  if(isCorrect){
    input.style.borderBottomColor='var(--success)';
    input.style.color='var(--success)';
  } else {
    input.style.borderBottomColor='var(--danger)';
    const hint=document.createElement('div');
    hint.className='fitb-correct-hint';
    const cleanAns=(state._fitbCorrectDisplay||storedAns.split('|')[0]).trim();
    const isQuran=state.categories.find(c=>c.id===state.currentCatId)?.questions[state.currentQIndex]?.type==='quran';
    hint.innerHTML='✅ الإجابة الصحيحة: <strong dir="rtl" style="font-family: '+(isQuran?'Amiri, ':'Cairo, ')+' serif; font-size: '+(isQuran?'1.2em':'1em')+'">'+cleanAns+'</strong>';
    const wrap=input.closest('.fitb-blank-wrap');
    if(wrap)wrap.insertAdjacentElement('afterend',hint);else input.parentNode.appendChild(hint);
  }
  if(q.explanation){
    const ebox=document.getElementById('q-explanation-box');
    ebox.innerHTML='<span style="font-size:1rem">💡</span> '+_sanitize(q.explanation);
    ebox.classList.remove('hidden');
  }
  const teamIdx=state.settings.compMode==='full_cat'
    ?(state.fullCatQueue[state.fullCatQueuePos]?.teamIdx??state.currentTeamIndex)
    :state.currentTeamIndex;
  const team=state.teams[teamIdx];
  const timeUsed=(state.timerTotal||30)-Math.max(0,state.timeLeft);
  if(isCorrect){
    playSound('correct');launchConfetti();
    _updateStreak(team?.id,true);
    const streakBonus=_streakBonusPts(team?.id);
    const pts=_getQuestionPts(q)+streakBonus;
    if(team){team.score=(team.score||0)+pts;recordScoreHistoryV5(team.id,pts);saveState();saveGameProgress();floatScore(team,'+'+pts+(streakBonus>0?' 🔥':''));try{_checkEarlyWinner(team);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_236")}catch(_){}}}
    toast(I18n.t('toast.correctAnswerPlay')+(streakBonus>0?' 🔥 '+I18n.t('toast.sequenceBonus'):''),'success');
    recordAnswer(team?.id,true,timeUsed);
  }else{
    playSound('wrong');
    if(team&&state.settings.negativeMarking){const neg=state.settings.negMarkValue||1;team.score=Math.max(0,(team.score||0)-neg);recordScoreHistoryV5(team.id,-neg);saveState();saveGameProgress();floatScore(team,'-'+neg,'minus');}
    toast(I18n.t('toast.fitbWrong'),'danger');
    recordAnswer(team?.id,false,timeUsed);
    _updateStreak(team?.id,false);
  }
  updateTicker();updateUndoBtn();
}

// ═══════════════════════════════════════════════════════
//  QURAN OPTION CLICK
// ═══════════════════════════════════════════════════════
function handleQuranChoice(idx){
  if(state.answered)return;
  if(state._quranCorrectIdx==null){toast(I18n.t('toast.quranDataMissing'),'danger');return;}
  // Support confirm-answer setting (do not reveal until user confirms)
  // Now uses unified confirmAnswer() flow — no onclick rewiring needed
  if(state.settings.confirmAnswer && state._quranPendingIdx!==idx){
    state._quranPendingIdx=idx;
    state.pendingAnswer=-1; // ensure regular pending is clear
    document.querySelectorAll('#q-options-grid .option-btn').forEach(b=>b.classList.remove('pending-answer'));
    const btn=document.getElementById('opt-btn-'+idx);
    if(btn)btn.classList.add('pending-answer');
    const panel=document.getElementById('answer-confirm-panel');
    if(panel) panel.classList.remove('hidden');
    return;
  }
  _finalizeQuranChoice(idx);
}
function _finalizeQuranChoice(idx){
  if(state.answered)return;
  if(state._quranCorrectIdx==null)return;
  const isCorrect=(idx===state._quranCorrectIdx);
  for(let i=0;i<(state._quranChoices||[]).length;i++){
    const btn=$el('opt-btn-'+i);
    if(!btn)continue;
    btn.classList.add('revealed');
    if(i===state._quranCorrectIdx)btn.classList.add('correct-answer');
    else if(i===idx&&!isCorrect)btn.classList.add('wrong-answer');
  }
  const cat=getCurrentCat();
  const q=getCurrentQuestion();
  if(!cat||!q){toast(I18n.t('toast.noActiveQuestion'),'danger');return;}
  state.answered=true;clearTimer();_stopTenseAudio();
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  if(q.explanation){const ebox=document.getElementById('q-explanation-box');ebox.innerHTML='<span style="font-size:1rem">💡</span> '+_sanitize(q.explanation);ebox.classList.remove('hidden');}
  const teamIdx=state.settings.compMode==='full_cat'
    ?(state.fullCatQueue[state.fullCatQueuePos]?.teamIdx??state.currentTeamIndex)
    :state.currentTeamIndex;
  const team=state.teams[teamIdx];
  const timeUsed=(state.timerTotal||30)-Math.max(0,state.timeLeft);
  if(isCorrect){
    playSound('correct');launchConfetti();
    _updateStreak(team?.id,true);
    const streakBonus=_streakBonusPts(team?.id);
    const pts=_getQuestionPts(q)+streakBonus;
    if(team){team.score=(team.score||0)+pts;recordScoreHistoryV5(team.id,pts);saveState();saveGameProgress();floatScore(team,'+'+pts+(streakBonus>0?' 🔥':''));_checkEarlyWinner(team);}
    toast(I18n.t('toast.correctAnswerPlay')+(streakBonus>0?' 🔥 '+I18n.t('toast.sequenceBonus'):''),'success');recordAnswer(team?.id,true,timeUsed);
  }else{
    playSound('wrong');
    if(team&&state.settings.negativeMarking){const neg=state.settings.negMarkValue||1;team.score=Math.max(0,(team.score||0)-neg);recordScoreHistoryV5(team.id,-neg);saveState();saveGameProgress();floatScore(team,'-'+neg,'minus');}
    toast(I18n.t('toast.fitbWrong'),'danger');recordAnswer(team?.id,false,timeUsed);
    _updateStreak(team?.id,false);
  }
  updateTicker();updateUndoBtn();
}

// ═══════════════════════════════════════════════════════
//  QURAN AUDIO TOGGLE
// ═══════════════════════════════════════════════════════
function toggleQuranAudio(url){
  if(!url)return;
  if(window._quranAudio&&!window._quranAudio.paused){
    window._quranAudio.pause();
    const lbl=document.getElementById('quran-audio-lbl');if(lbl)lbl.textContent=I18n.t('question.playAudio')||'▶ استمع للتلاوة';
    return;
  }
  if(window._quranAudio){try{window._quranAudio.pause();window._quranAudio.src='';}catch(e){try{ErrorBus.capture(e,"catch#45")}catch(_){}}}
  window._quranAudio=new Audio(url);
  window._quranAudio.volume=Math.min(1,(state.settings.musicVol||40)/100);
  window._quranAudio.play().catch(()=>toast(I18n.t('toast.quranPlayFailed'),'danger'));
  const lbl=document.getElementById('quran-audio-lbl');if(lbl)lbl.textContent=t('quran.pauseRecitation');
  window._quranAudio.onended=()=>{const l2=document.getElementById('quran-audio-lbl');if(l2)l2.textContent=I18n.t('question.playAudio')||'▶ استمع للتلاوة';};
}

// ══════════════════════════════════════════════════════
//  QURAN FETCH + DOWNLOAD
// ═══════════════════════════════════════════════════════
const QURAN_SURAHS=['الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال','التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء','الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء','النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر','يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان','الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم','القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف','الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة','المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات','النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج','الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى','الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة','التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون','النصر','المسد','الإخلاص','الفلق','الناس'];
const QURAN_SURAH_NUMS=Object.fromEntries(QURAN_SURAHS.map((n,i)=>[n,i+1]));

// Strip Arabic diacritics/tashkeel + unify alef variants
function _stripTashkeel(s){
  if(!s)return'';
  return String(s).replace(/[\u064B-\u0652\u0670\u0640]/g,'')
          .replace(/[\u0622\u0623\u0625\u0671]/g,'\u0627')
          .trim();
}
// Levenshtein with early-out for performance
function _levenshtein(a,b){
  if(a===b)return 0;
  var al=a.length, bl=b.length;
  if(!al)return bl; if(!bl)return al;
  if(Math.abs(al-bl)>3)return Math.abs(al-bl);
  var prev=new Array(bl+1); for(var j=0;j<=bl;j++)prev[j]=j;
  for(var i=1;i<=al;i++){
    var curr=[i];
    for(var k=1;k<=bl;k++){
      var cost=a.charCodeAt(i-1)===b.charCodeAt(k-1)?0:1;
      curr[k]=Math.min(curr[k-1]+1, prev[k]+1, prev[k-1]+cost);
    }
    prev=curr;
  }
  return prev[bl];
}
function _normalizeArabic(s){
  if(s==null)return'';
  var t=_stripTashkeel(s);
  // Unify ya/alef-maqsura, ta marbuta/ha, hamza on waw/ya
  t=t.replace(/\u0649/g,'\u064A').replace(/\u0629/g,'\u0647')
     .replace(/\u0624/g,'\u0648').replace(/\u0626/g,'\u064A');
  // Arabic-Indic / Persian digits → Western
  t=t.replace(/[\u0660-\u0669]/g,function(d){return String.fromCharCode(d.charCodeAt(0)-0x0660+48);})
     .replace(/[\u06F0-\u06F9]/g,function(d){return String.fromCharCode(d.charCodeAt(0)-0x06F0+48);});
  // Strip common Arabic + Latin punctuation
  t=t.replace(/[.,،؛;:!؟?"'`\-_/\\()\[\]{}]/g,' ');
  t=t.replace(/\s+/g,' ').trim().toLowerCase();
  return t;
}
// FITB comparator: exact normalized match + small Levenshtein tolerance
function _fitbMatches(userAns, acceptedList){
  var u=_normalizeArabic(userAns);
  if(!u)return false;
  for(var i=0;i<acceptedList.length;i++){
    var a=_normalizeArabic(acceptedList[i]);
    if(!a)continue;
    if(a===u)return true;
    var tol = a.length>=8 ? 2 : (a.length>=4 ? 1 : 0);
    if(tol>0 && Math.abs(a.length-u.length)<=tol && _levenshtein(a,u)<=tol)return true;
  }
  return false;
}

// Offline fallback — Juz Amma + key verses embedded
const QURAN_OFFLINE={'1:1':'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ','1:2':'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ','1:3':'ٱلرَّحْمَٰنِ ٱلرَّحِيمِ','1:4':'مَٰلِكِ يَوْمِ ٱلدِّينِ','1:5':'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ','1:6':'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ','1:7':'صِرَٰطَ ٱلَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ ٱلْمَغْضُوبِ عَلَيْهِمْ وَلَا ٱلضَّآلِّينَ','2:255':'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ','2:256':'لَآ إِكْرَاهَ فِى ٱلدِّينِ ۖ قَد تَّبَيَّنَ ٱلرُّشْدُ مِنَ ٱلْغَىِّ','2:285':'ءَامَنَ ٱلرَّسُولُ بِمَآ أُنزِلَ إِلَيْهِ مِن رَّبِّهِۦ وَٱلْمُؤْمِنُونَ','2:286':'لَا يُكَلِّفُ ٱللَّهُ نَفْسًا إِلَّا وُسْعَهَا','112:1':'قُلْ هُوَ ٱللَّهُ أَحَدٌ','112:2':'ٱللَّهُ ٱلصَّمَدُ','112:3':'لَمْ يَلِدْ وَلَمْ يُولَدْ','112:4':'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌ','113:1':'قُلْ أَعُوذُ بِرَبِّ ٱلْفَلَقِ','113:2':'مِن شَرِّ مَا خَلَقَ','114:1':'قُلْ أَعُوذُ بِرَبِّ ٱلنَّاسِ','114:2':'مَلِكِ ٱلنَّاسِ','114:3':'إِلَٰهِ ٱلنَّاسِ','96:1':'ٱقْرَأْ بِٱسْمِ رَبِّكَ ٱلَّذِى خَلَقَ','96:2':'خَلَقَ ٱلْإِنسَٰنَ مِنْ عَلَقٍ','97:1':'إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةِ ٱلْقَدْرِ','103:1':'وَٱلْعَصْرِ','103:2':'إِنَّ ٱلْإِنسَٰنَ لَفِى خُسْرٍ','108:1':'إِنَّآ أَعْطَيْنَٰكَ ٱلْكَوْثَرَ','108:2':'فَصَلِّ لِرَبِّكَ وَٱنْحَرْ','109:1':'قُلْ يَٰٓأَيُّهَا ٱلْكَٰفِرُونَ','110:1':'إِذَا جَآءَ نَصْرُ ٱللَّهِ وَٱلْفَتْحُ','67:1':'تَبَٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ','36:1':'يس','36:2':'وَٱلْقُرْءَانِ ٱلْحَكِيمِ','55:1':'ٱلرَّحْمَٰنُ','55:2':'عَلَّمَ ٱلْقُرْءَانَ','55:13':'فَبِأَىِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ'};

window._lastQuranMeta={};

function _initQuranDatalist(){
  const dl=document.getElementById('quran-surah-list');
  if(!dl||dl.children.length)return;
  QURAN_SURAHS.forEach((name,i)=>{const opt=document.createElement('option');opt.value=name;opt.label=(i+1)+' — '+name;dl.appendChild(opt);});
}

function _updateQuranModeHint(){
  const mode=document.getElementById('quran-mode-select')?.value;
  const meta=window._lastQuranMeta;
  const hint=document.getElementById('quran-answer-hint');
  if(!hint||!meta?.surah)return;
  const labels={
    full:'اسم السورة — 4 خيارات للاختيار',
    complete:'أكمل الآية — يكتب المتسابق النصف الثاني',
    number:'رقم الآية في السورة — الإجابة: '+meta.ayah,
    surah_number:'رقم السورة — الإجابة: '+meta.surahNum,
    juz:'رقم الجزء — الإجابة: '+meta.juz
  };
  hint.innerHTML='<strong>نوع السؤال: </strong>'+(labels[mode]||'');
  hint.style.display='block';
}

async function fetchQuranVerse(){
  const raw=document.getElementById('quran-surah-input').value.trim();
  const ayah=+document.getElementById('quran-ayah-input').value;
  if(!raw){toast(I18n.t('toast.quranEnterSurah'),'danger');return;}
  if(!ayah||ayah<1){toast(I18n.t('toast.quranEnterAyah'),'danger');return;}
  let surah=parseInt(raw);
  if(isNaN(surah)||surah<1){surah=QURAN_SURAH_NUMS[raw]||0;if(!surah){toast(I18n.t('toast.quranUnknownSurah'),'danger');return;}}
  if(surah<1||surah>114){toast(I18n.t('toast.quranInvalidSurah'),'danger');return;}
  const btn=document.getElementById('quran-fetch-btn');
  btn.disabled=true;btn.textContent='⏳';
  const reader=document.getElementById('quran-reader-select').value||'ar.alafasy';
  let fetchedText='',fetchedAudio='',fetchedSurahName=QURAN_SURAHS[surah-1]||'',fetchedAyah=ayah,online=false;
  try{
    const ctrl=new AbortController();
    const tid=setTimeout(()=>ctrl.abort(),8000);
    const r=await fetch('https://api.alquran.cloud/v1/ayah/'+surah+':'+ayah+'/editions/quran-uthmani,'+reader,{signal:ctrl.signal});
    clearTimeout(tid);
    const data=await r.json();
    if(data.code===200&&Array.isArray(data.data)&&data.data.length>=2){
      fetchedText=data.data[0].text;fetchedAudio=data.data[1].audio||'';
      fetchedSurahName=data.data[0].surah?.name||QURAN_SURAHS[surah-1];
      fetchedAyah=data.data[0].numberInSurah||ayah;online=true;
    }
  }catch(e){try{ErrorBus.capture(e,"catch#46")}catch(_){}}
  // Offline fallback
  if(!fetchedText){
    const key=surah+':'+ayah;
    if(QURAN_OFFLINE[key]){fetchedText=QURAN_OFFLINE[key];fetchedSurahName=QURAN_SURAHS[surah-1]||'';toast(I18n.t('toast.quranOfflineData'),'info');}
    else{toast(I18n.t('toast.quranFetchFailed'),'danger');btn.disabled=false;btn.textContent=t('quran.fetch');return;}
  }
  // Compute juz (approximate)
  const juz=_getApproxJuz(surah,ayah);
  // Split at word boundary near midpoint — avoids cutting inside a word
  const _words=fetchedText.trim().split(' ');
  const _totalWords=_words.length;
  const _halfWords=Math.max(1,Math.ceil(_totalWords/2));
  const halfByWord=_words.slice(0,_halfWords).join(' ').length;
  const halfIdx=halfByWord;
  window._lastQuranMeta={surah:fetchedSurahName,surahNum:surah,ayah:fetchedAyah,juz,halfIdx,totalWords:_totalWords};
  // Fill question text field
  const textEl=document.getElementById('q-text-input');
  textEl.value=fetchedText;textEl.readOnly=false;
  document.getElementById('quran-audio-url').value=fetchedAudio;
  document.getElementById('quran-surah-num').value=surah;
  // Show download button if audio available
  const dlBtn=document.getElementById('quran-download-btn');
  if(dlBtn)dlBtn.style.display=fetchedAudio?'':'none';
  // Show preview
  const prev=document.getElementById('quran-preview-box');
  prev.style.display='block';
  prev.style.display='block';
  const _prvFirst=fetchedText.slice(0,halfIdx),_prvSecond=fetchedText.slice(halfIdx);
  const _prvMode=document.getElementById('quran-mode-select')?.value||'full';
  const _prvDiv=document.createElement('div');
  _prvDiv.style.cssText="font-family:'Amiri',serif;font-size:1.12rem;line-height:2.2;direction:rtl;margin-bottom:4px";
  if(_prvMode==='complete'){
    _prvDiv.innerHTML='<span>'+_prvFirst+'</span><span style="border-bottom:2px dashed var(--accent1);color:var(--text-muted);margin:0 6px;padding:0 8px">'+_prvSecond+'</span>';
  }else{_prvDiv.textContent=fetchedText;}
  const _metaDiv=document.createElement('div');
  _metaDiv.style.cssText='font-size:.76rem;color:var(--text-muted);margin-top:4px';
  _metaDiv.textContent=fetchedSurahName+' — '+t('quran.ayah')+' '+fetchedAyah+' — '+t('quran.juz')+' '+juz;
  prev.innerHTML='';prev.appendChild(_prvDiv);prev.appendChild(_metaDiv);
  if(_prvMode==='complete'){const _cDiv=document.createElement('div');_cDiv.style.cssText='font-size:.72rem;color:var(--accent2);margin-top:2px';_cDiv.textContent=t('quran.dottedLine');prev.appendChild(_cDiv);}
  if(fetchedAudio){const _aBtn=document.createElement('button');_aBtn.className='btn btn-ghost btn-sm';_aBtn.style.marginTop='8px';_aBtn.textContent=t('quran.listen');_aBtn.addEventListener('click',()=>toggleQuranAudio(fetchedAudio));prev.appendChild(_aBtn);}
  toast(online?I18n.t('toast.quranFetched'):I18n.t('toast.quranLocalData'),'success');
  btn.disabled=false;btn.textContent=t('quran.fetch');
}

function _getApproxJuz(surah,ayah){
  const juzMap=[[1,1],[2,142],[2,253],[3,92],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],[9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],[29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1]];
  let juz=1;
  for(let j=juzMap.length-1;j>=0;j--){
    const[s,a]=juzMap[j];
    if(surah>s||(surah===s&&ayah>=a)){juz=j+1;break;}
  }
  return juz;
}

function downloadQuranAudio(){
  const url=document.getElementById('quran-audio-url').value;
  if(!url){toast(I18n.t('toast.noAudioToDownload'),'info');return;}
  const meta=window._lastQuranMeta||{};
  const name='quran_'+meta.surah+'_ayah'+meta.ayah+'.mp3';
  const a=document.createElement('a');a.href=url;a.download=name;a.target='_blank';a.click();
  toast(I18n.t('toast.downloading'),'success');
}


// ═══════════════════════════════════════════════════════════════
//  TRAINING MODE
// ═══════════════════════════════════════════════════════════════
let _trainingState={catId:null,qIdx:0,order:[],revealed:false};

function openTrainingMode(){
  if(!getPlayableCats({withQuestions:true}).length){toast(I18n.t('toast.noCategories'),'info');return;}
  const catOpts=getPlayableCats({withQuestions:true}).map(c=>`<option value="${c.id}">${_sanitizeIcon(c.icon)||'📂'} ${_sanitizeUser(c.name)} (${(c.questions||[]).length} سؤال)</option>`).join('');
  openGenericModal('🎓 وضع التدريب',`
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-group">
        <label class="form-label">القسم</label>
        <select class="form-select" id="training-cat-sel">${catOpts}</select>
      </div>
      <div class="form-group">
        <label class="form-label">ترتيب الأسئلة</label>
        <select class="form-select" id="training-order-sel">
          <option value="seq">تسلسلي</option>
          <option value="random">عشوائي</option>
        </select>
      </div>
      <button class="btn btn-primary" style="padding:12px" onclick="startTrainingMode()">▶ ابدأ التدريب</button>
    </div>`);
}

function startTrainingMode(){
  const catId=document.getElementById('training-cat-sel').value;
  const order=document.getElementById('training-order-sel').value;
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat||!cat.questions.length){toast(I18n.t('toast.noQuestionsInCat'),'info');return;}
  let idxArr=cat.questions.map((_,i)=>i);
  if(order==='random')idxArr=shuffleArray(idxArr);
  _trainingState={catId,qIdx:0,order:idxArr,revealed:false};
  closeModal('modal-generic');
  setTimeout(_renderTrainingQ,80);
}

function _renderTrainingQ(){
  const {catId,qIdx,order}=_trainingState;
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat)return;
  const total=order.length;
  if(qIdx>=total){
    openGenericModal('🎓 انتهى التدريب!',`<div style="text-align:center;padding:20px">
      <div style="font-size:3rem;margin-bottom:12px">🏁</div>
      <div style="font-size:1.1rem;font-weight:700;margin-bottom:16px">أتممت ${total} سؤالاً في قسم «${_sanitizeUser(cat.name)}»</div>
      <div style="display:flex;gap:8px;justify-content:center">
        <button class="btn btn-primary" onclick="startTrainingMode();closeModal('modal-generic')">إعادة</button>
        <button class="btn btn-ghost" onclick="closeModal('modal-generic')">إغلاق</button>
      </div></div>`);
    return;
  }
  const realIdx=order[qIdx];
  const q=cat.questions[realIdx];
  _trainingState.revealed=false;

  // Build options HTML
  let optsHtml='';
  if(q.type==='tf'){
    optsHtml=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div id="tr-opt-0" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-surface);text-align:center;font-weight:700">✅ صحيح</div>
      <div id="tr-opt-1" style="padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-surface);text-align:center;font-weight:700">❌ خطأ</div>
    </div>`;
  } else if(q.type==='fitb'){
    optsHtml=`<div style="font-size:.85rem;color:var(--text-muted)">سؤال أكمل الفراغ — الإجابة مخفية</div>
      <div id="tr-fitb-ans" style="display:none;padding:10px 14px;background:rgba(0,230,118,.1);border:1px solid var(--success);border-radius:8px;color:var(--success);font-weight:700;margin-top:6px">${q.fitbAnswer||'—'}</div>`;
  } else if(q.type==='quran'){
    optsHtml=`<div style="font-size:.85rem;color:var(--text-muted)">سؤال قرآني (${q.quranMode||'full'})</div>`;
  } else if(q.type==='video'){
    optsHtml=`<div style="font-size:.85rem;color:var(--text-muted)">🎬 سؤال فيديو</div>`;
  } else if(q.type==='order'){
    const items=(q.options||[]).filter(o=>o);
    optsHtml=items.map((o,i)=>`<div style="padding:8px 12px;border-radius:7px;border:1px solid var(--border);background:var(--bg-surface);margin-bottom:5px"><span style="color:var(--accent2);font-weight:700;margin-left:6px">${i+1}.</span>${o}</div>`).join('');
  } else {
    optsHtml=(q.options||[]).filter(o=>o).map((o,i)=>`<div id="tr-opt-${i}" style="padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg-surface);margin-bottom:6px;cursor:default"><span style="color:var(--accent2);font-weight:700;width:22px;display:inline-block">${getAnswerLabel(i)}</span>${o}</div>`).join('');
  }

  // Correct answer label
  let correctLabel='';
  if(q.type==='tf')correctLabel=q.correct===0?'✅ صحيح':'❌ خطأ';
  else if(q.type==='fitb')correctLabel=q.fitbAnswer||'';
  else if(q.type==='quran')correctLabel=(q.quranMeta?.surah||'')+' الآية '+(q.quranMeta?.ayah||'');
  else if(q.type==='order')correctLabel=(q.options||[]).filter(o=>o).join(' ← ');
  else correctLabel=q.options?.[q.correct]||'';

  const progressDots=order.map((_,i)=>`<div style="width:${i===qIdx?16:6}px;height:6px;border-radius:3px;background:${i===qIdx?'var(--accent1)':i<qIdx?'var(--accent2)':'var(--border)'};transition:all .2s"></div>`).join('');

  openGenericModal(`🎓 تدريب — ${qIdx+1} / ${total}`,`
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">${progressDots}</div>
      <div style="font-size:.72rem;color:var(--text-muted)">${cat.icon||'📂'} ${_sanitizeUser(cat.name)}</div>
      <div style="font-size:1rem;font-weight:700;line-height:1.6;direction:rtl;padding:10px 12px;background:var(--bg-surface);border-radius:8px;border:1px solid var(--border)">${q.text}</div>
      <div id="tr-opts-wrap">${optsHtml}</div>
      <div id="tr-reveal-box" style="display:none;padding:10px 14px;background:rgba(0,230,118,.1);border:1px solid var(--success);border-radius:8px;color:var(--success);font-weight:700;direction:rtl">✅ ${correctLabel}</div>
      ${q.explanation?`<div id="tr-explain" style="display:none;font-size:.82rem;color:var(--text-muted);padding:8px 12px;background:var(--bg-panel);border-radius:6px">💡 ${q.explanation}</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        <button class="btn btn-accent btn-sm" onclick="_trainingReveal()">👁 كشف الإجابة</button>
        ${qIdx>0?`<button class="btn btn-ghost btn-sm" onclick="_trainingNav(-1)">← السابق</button>`:''}
        <button class="btn btn-primary btn-sm" onclick="_trainingNav(1)">${qIdx<total-1?'التالي →':'إنهاء التدريب'}</button>
      </div>
    </div>`);
}

function _trainingReveal(){
  if(_trainingState.revealed)return;
  _trainingState.revealed=true;
  const box=document.getElementById('tr-reveal-box');
  if(box)box.style.display='block';
  const explain=document.getElementById('tr-explain');
  if(explain)explain.style.display='block';
  const fitbAns=document.getElementById('tr-fitb-ans');
  if(fitbAns)fitbAns.style.display='block';
  // Highlight correct option
  const cat=state.categories.find(c=>c.id===_trainingState.catId);
  const q=cat?.questions[_trainingState.order[_trainingState.qIdx]];
  if(q&&(q.type==='text'||q.type==='image'||q.type==='audio'||q.type==='video'||q.type==='math')){
    const correct=document.getElementById('tr-opt-'+q.correct);
    if(correct){correct.style.background='rgba(0,230,118,.15)';correct.style.borderColor='var(--success)';correct.style.color='var(--success)';}
  }
  if(q?.type==='tf'){
    const tfAnswerIsTrue=(q.tfAnswer==='true'||q.correct===0); // correct:0=صح(True), correct:1=خطأ(False)
    const trueBtn=document.getElementById('tr-opt-0'); // tr-opt-0 = True (صح)
    const falseBtn=document.getElementById('tr-opt-1'); // tr-opt-1 = False (خطأ)
    if(tfAnswerIsTrue&&trueBtn){trueBtn.style.background='rgba(0,230,118,.15)';trueBtn.style.borderColor='var(--success)';trueBtn.style.color='var(--success)';}
    else if(!tfAnswerIsTrue&&falseBtn){falseBtn.style.background='rgba(0,230,118,.15)';falseBtn.style.borderColor='var(--success)';falseBtn.style.color='var(--success)';}
  }
}

function _trainingNav(dir){
  _trainingState.qIdx+=dir;
  if(_trainingState.qIdx<0)_trainingState.qIdx=0;
  closeModal('modal-generic');
  setTimeout(_renderTrainingQ,80);
}

// ═══════════════════════════════════════════════════════════════
//  WINNER CERTIFICATE
// ═══════════════════════════════════════════════════════════════

/**
 * Apply certificate settings from state.settings to the certificate modal elements.
 * Called by openWinnerCertificate() and previewCertificate().
 */
function _applyCertSettings(){
  const s=state.settings;
  const certContent=document.getElementById('certificate-content');
  const certModal=document.getElementById('modal-certificate');
  if(!certContent)return;

  // Title
  const titleEl=certContent.querySelector('[data-i18n="cert.excellence"]');
  if(titleEl) titleEl.textContent=s.certTitle||I18n.t('cert.excellence')||'شهادة تفوق وتميّز';

  // Subtitle
  const subtitleEl=certContent.querySelector('[data-i18n="cert.awardedTo"]');
  if(subtitleEl) subtitleEl.textContent=s.certSubtitle||I18n.t('cert.awardedTo')||'تُمنح هذه الشهادة لـ';

  // Border color — applies to both certificate-content and action bar
  const borderCol=s.certBorderColor||'#f5c842';
  certContent.style.borderColor=borderCol;
  const actionBar=certModal?certModal.querySelector('div[style*="border:5px solid"]+div, div[style*="border-top:none"]'):null;
  // Update action bar border color
  if(certModal){
    const bars=certModal.querySelectorAll('div');
    bars.forEach(d=>{
      if(d.style.border&&d.style.border.includes('solid')&&d.style.borderTop==='none'){
        d.style.borderColor=borderCol;
      }
    });
  }

  // Text color
  const textCol=s.certTextColor||'#b8860b';
  if(titleEl) titleEl.style.color=textCol;
  const compNameEl=document.getElementById('cert-comp-name');
  if(compNameEl) compNameEl.style.color=textCol;

  // Background gradient (only when no bg image)
  if(!s.certBgImage){
    const gradStart=s.certBgGradStart||'#fffdf5';
    const gradEnd=s.certBgGradEnd||'#fef3b0';
    certContent.style.background='linear-gradient(160deg,'+gradStart+' 0%,'+gradEnd+' 100%)';
  }

  // Show/hide date
  const dateEl=document.getElementById('cert-date');
  if(dateEl) dateEl.style.display=s.certShowDate!==false?'':'none';

  // Show/hide score
  const scoreEl=document.getElementById('cert-score-row');
  if(scoreEl) scoreEl.style.display=s.certShowScore!==false?'':'none';
}

function openWinnerCertificate(){
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  const winner=sorted[0];
  if(!winner){toast(I18n.t('toast.noTeams'),'info');return;}
  // Move modal to body to escape #app stacking context (fixes z-index behind podium)
  const certModal=document.getElementById('modal-certificate');
  if(certModal&&certModal.parentElement!==document.body){
    document.body.appendChild(certModal);
  }
  // Reset avatar wrap in case it was replaced by team image previously
  const certWrap=document.getElementById('cert-avatar-wrap');
  if(certWrap) certWrap.innerHTML='<span id="cert-avatar-letter" style="font-size:1.8rem;font-weight:900;color:#fff"></span>';

  document.getElementById('cert-winner-name').textContent=winner.name;
  document.getElementById('cert-comp-name').textContent=state.settings.name||'المسابقة';
  document.getElementById('cert-score-row').textContent='بمجموع '+winner.score+' نقطة';
  const certLetter=document.getElementById('cert-avatar-letter');
  if(certLetter){
    certLetter.textContent=winner.name.charAt(0);
    certLetter.style.color='#fff';
    certLetter.style.textShadow='0 1px 4px rgba(0,0,0,.4)';
  }
  if(certWrap) certWrap.style.background=winner.color||'#00d4ff';
  // Hijri + Gregorian date
  const now=new Date();
  const greg=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',calendar:'gregory'});
  const hijri=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',calendar:'islamic'});
  document.getElementById('cert-date').textContent=greg+' — '+hijri;
  // Team image if available
  if(winner.teamImage){
    const wrap=document.getElementById('cert-avatar-wrap');
    if(wrap) wrap.innerHTML=`<img src="${_safeMediaSrc(winner.teamImage)}" alt="${_sanitizeUser(winner.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
  }
  // Apply background image if set
  _applyCertBg();
  // Apply certificate settings (title, subtitle, colors, toggles)
  _applyCertSettings();
  certModal.classList.remove('hidden');
}

/**
 * Preview certificate with sample data (from admin settings panel)
 */
function previewCertificate(){
  const certModal=document.getElementById('modal-certificate');
  if(certModal&&certModal.parentElement!==document.body){
    document.body.appendChild(certModal);
  }
  // Reset avatar wrap
  const certWrap=document.getElementById('cert-avatar-wrap');
  if(certWrap) certWrap.innerHTML='<span id="cert-avatar-letter" style="font-size:1.8rem;font-weight:900;color:#fff"></span>';

  document.getElementById('cert-winner-name').textContent='اسم الفائز';
  document.getElementById('cert-comp-name').textContent=state.settings.name||'المسابقة';
  document.getElementById('cert-score-row').textContent='بمجموع 100 نقطة';
  const certLetter=document.getElementById('cert-avatar-letter');
  if(certLetter){
    certLetter.textContent='ا';
    certLetter.style.color='#fff';
    certLetter.style.textShadow='0 1px 4px rgba(0,0,0,.4)';
  }
  if(certWrap) certWrap.style.background='#00d4ff';
  // Date
  const now=new Date();
  const greg=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',calendar:'gregory'});
  const hijri=now.toLocaleDateString('ar-SA',{year:'numeric',month:'long',day:'numeric',calendar:'islamic'});
  document.getElementById('cert-date').textContent=greg+' — '+hijri;
  // Apply bg + settings
  _applyCertBg();
  _applyCertSettings();
  certModal.classList.remove('hidden');
}

/**
 * Reset certificate settings to defaults
 */
function resetCertSettings(){
  state.settings.certTitle=null;
  state.settings.certSubtitle=null;
  state.settings.certBorderColor=null;
  state.settings.certTextColor=null;
  state.settings.certBgGradStart=null;
  state.settings.certBgGradEnd=null;
  state.settings.certShowDate=true;
  state.settings.certShowScore=true;
  // Update UI controls
  _syncCertSettingsUI();
  saveState();
  toast(I18n.t('toast.saved')||'تم الحفظ ✓','success');
}

/**
 * Sync certificate settings UI controls with current state.settings values.
 * Called on load and after reset.
 */
function _syncCertSettingsUI(){
  const s=state.settings;
  const el=(id)=>document.getElementById(id);
  if(el('s-cert-title')) el('s-cert-title').value=s.certTitle||'';
  if(el('s-cert-subtitle')) el('s-cert-subtitle').value=s.certSubtitle||'';
  const borderCol=s.certBorderColor||'#f5c842';
  if(el('s-cert-border-color')) el('s-cert-border-color').value=borderCol;
  if(el('s-cert-border-color-hex')) el('s-cert-border-color-hex').value=borderCol;
  const textCol=s.certTextColor||'#b8860b';
  if(el('s-cert-text-color')) el('s-cert-text-color').value=textCol;
  if(el('s-cert-text-color-hex')) el('s-cert-text-color-hex').value=textCol;
  const gradStart=s.certBgGradStart||'#fffdf5';
  if(el('s-cert-bg-grad-start')) el('s-cert-bg-grad-start').value=gradStart;
  if(el('s-cert-bg-grad-start-hex')) el('s-cert-bg-grad-start-hex').value=gradStart;
  const gradEnd=s.certBgGradEnd||'#fef3b0';
  if(el('s-cert-bg-grad-end')) el('s-cert-bg-grad-end').value=gradEnd;
  if(el('s-cert-bg-grad-end-hex')) el('s-cert-bg-grad-end-hex').value=gradEnd;
  if(el('s-cert-show-date')) el('s-cert-show-date').checked=s.certShowDate!==false;
  if(el('s-cert-show-score')) el('s-cert-show-score').checked=s.certShowScore!==false;
  const dateLabel=el('cert-show-date-label');
  if(dateLabel) dateLabel.textContent=s.certShowDate!==false?'مفعّل':'معطّل';
  const scoreLabel=el('cert-show-score-label');
  if(scoreLabel) scoreLabel.textContent=s.certShowScore!==false?'مفعّل':'معطّل';
}

/**
 * Toggle certificate fullscreen mode
 */
function toggleCertFullscreen(){
  const certModal=document.getElementById('modal-certificate');
  if(!certModal)return;
  if(!document.fullscreenElement){
    certModal.requestFullscreen().catch(err=>{
      toast(I18n.t('cert.fullscreenNotAvailable','ملء الشاشة غير متاح'),'info');
    });
  }else{
    document.exitFullscreen();
  }
}

// Listen for fullscreen changes to update button text
document.addEventListener('fullscreenchange',()=>{
  const btn=document.getElementById('cert-fullscreen-btn');
  if(!btn)return;
  if(document.fullscreenElement){
    btn.textContent=I18n.t('cert.exitFullscreen')||'خروج من ملء الشاشة';
  }else{
    btn.textContent=I18n.t('cert.fullscreen')||'⛶ ملء الشاشة';
  }
});

/**
 * Show/update podium certificate preview card
 */
function _updatePodiumCertPreview(){
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  const winner=sorted[0];
  const preview=document.getElementById('podium-cert-preview');
  if(!preview)return;
  if(!winner){preview.style.display='none';return;}
  preview.style.display='block';
  const s=state.settings;
  const titleEl=document.getElementById('podium-cert-title');
  const subtitleEl=document.getElementById('podium-cert-subtitle');
  const nameEl=document.getElementById('podium-cert-winner-name');
  if(titleEl) titleEl.textContent=s.certTitle||I18n.t('cert.excellence')||'شهادة تفوق وتميّز';
  if(subtitleEl) subtitleEl.textContent=s.certSubtitle||I18n.t('cert.awardedTo')||'تُمنح هذه الشهادة لـ';
  if(nameEl) nameEl.textContent=winner.name;
  // Apply custom colors to preview card
  const innerCard=preview.querySelector('div');
  if(innerCard){
    const borderCol=s.certBorderColor||'#f5c842';
    const textCol=s.certTextColor||'#b8860b';
    const gradStart=s.certBgGradStart||'#fffdf5';
    const gradEnd=s.certBgGradEnd||'#fef3b0';
    innerCard.style.borderColor=borderCol;
    innerCard.style.background='linear-gradient(160deg,'+gradStart+','+gradEnd+')';
    innerCard.style.boxShadow='0 4px 20px '+borderCol+'44';
    if(titleEl) titleEl.style.color=textCol;
  }
}

function loadCertLogo(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const logoArea=document.getElementById('cert-logo-area');
    const logoImg=document.getElementById('cert-logo-img');
    if(logoImg)logoImg.src=e.target.result;
    if(logoArea)logoArea.style.display='block';
  };
  reader.readAsDataURL(file);
  input.value='';
}

function printCertificate(){
  const certEl=document.getElementById('certificate-content');
  const bgColor=certEl.style.background||'linear-gradient(160deg,#fffdf5 0%,#fff8dc 60%,#fef3b0 100%)';
  const bgImage=state.settings.certBgImage?'background-image:url('+_safeMediaSrc(state.settings.certBgImage)+');background-size:cover;background-position:center;':'';
  const borderCol=_safeColor(state.settings.certBorderColor||'#f5c842');
  const content=certEl.innerHTML;
  const w=window.open('','_blank','width=820,height=640');
  if(!w){toast(I18n.t('toast.printWindowBlocked'),'danger');return;}
  w.document.write('<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">'+
    '<title>شهادة الفائز</title>'+
    '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap" rel="stylesheet">'+
    '<style>'+
    '*{margin:0;padding:0;box-sizing:border-box}'+
    'body{background:#f5f0dd;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Cairo,sans-serif;padding:20px}'+
    '.cert-wrap{width:min(680px,100%);padding:44px 48px;background:'+bgColor+';'+bgImage+'border:5px solid '+borderCol+';border-radius:20px;text-align:center;position:relative;color:#1a1000;overflow:hidden;direction:rtl}'+
    '@media print{body{background:#fff;padding:0}@page{size:A4 landscape;margin:.8cm}.cert-wrap{width:100%;border-radius:0;padding:32px 40px}}'+
    '</style></head><body>'+
    '<div class="cert-wrap">'+content+'</div>'+
    '<script>setTimeout(function(){window.print();},500);<\/script>'+
    '</body></html>');
  w.document.close();
}



// ══════════════════════════════════════════════════════════════
//  EARLY WINNER SYSTEM
// ═══════════════════════════════════════════════════════════════
let _earlyWinnerShown=false;

function _checkEarlyWinner(team){
  if(!state.settings.earlyWinnerEnabled)return;
  if(_earlyWinnerShown)return;
  const target=state.settings.earlyWinnerScore||10;
  if(!team||(team.score||0)<target)return;
  _earlyWinnerShown=true;
  // Flash big overlay
  // V11-SECURITY: sanitize team.name and validate team.color before innerHTML
  const _safeTeamName = (typeof _sanitizeUser==='function') ? _sanitizeUser(team.name) : String(team.name||'').replace(/[<>&"]/g,'');
  const _safeTeamColor = (typeof _safeColor==='function') ? _safeColor(team.color) : '#00e8d0';
  const ov=document.createElement('div');
  ov.id='early-winner-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:6000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);text-align:center;padding:24px;animation:float-up .5s ease';
  ov.innerHTML=`<div style="font-size:clamp(3rem,10vw,6rem);margin-bottom:16px;animation:scale-in .6s ease">🏆</div>
    <div style="font-size:clamp(1.2rem,4vw,2.2rem);font-weight:900;color:var(--accent1);text-shadow:var(--glow1);margin-bottom:8px">🎉 الفائز المبكر!</div>
    <div style="font-size:clamp(1.6rem,6vw,3.5rem);font-weight:900;color:${_safeTeamColor};margin-bottom:12px;text-shadow:0 0 40px ${_safeTeamColor}66">${_safeTeamName}</div>
    <div style="font-size:1rem;color:var(--text-secondary);margin-bottom:28px">وصل إلى ${parseInt(target,10)||0} نقطة أولاً</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center">
      <button class="btn btn-success btn-lg" onclick="document.getElementById('early-winner-overlay').remove();showPodium()">🎊 المنصة</button>
      <button class="btn btn-ghost btn-lg" onclick="_dismissEarlyWinner()">متابعة اللعب</button>
    </div>`;
  document.body.appendChild(ov);
  launchConfetti(200);
  playSound('correct');
}

function _dismissEarlyWinner(){
  const ov=document.getElementById('early-winner-overlay');
  if(ov){ov.style.opacity='0';setTimeout(()=>ov.remove(),400);}
  _earlyWinnerShown=false; // allow re-trigger if another team reaches target
}

// ═══════════════════════════════════════════════════════════════
//  1v1 TEAM COMPARISON
// ═══════════════════════════════════════════════════════════════
function openCompare1v1(){
  if(state.teams.length<2){toast(I18n.t('toast.needTwoTeams'),'info');return;}
  const opts=state.teams.map((t,i)=>`<option value="${i}">${_sanitizeUser(t.name)}</option>`).join('');
  openGenericModal('⚔️ مقارنة فريقين',`
    <div style="display:flex;flex-direction:column;gap:14px">
      <div class="form-row" style="grid-template-columns:1fr auto 1fr;align-items:center;gap:10px">
        <select class="form-select" id="cmp-team-a">${opts}</select>
        <div style="font-weight:900;color:var(--accent2);font-size:1.1rem">⚔️</div>
        <select class="form-select" id="cmp-team-b">${opts.replace('<option value="0"','<option value="0" disabled').replace('<option value="1"','<option value="1" selected')}</select>
      </div>
      <button class="btn btn-primary" onclick="_renderCompare1v1()">▶ عرض المقارنة</button>
    </div>`);
}

function _renderCompare1v1(){
  const idxA=+document.getElementById('cmp-team-a').value;
  const idxB=+document.getElementById('cmp-team-b').value;
  if(idxA===idxB){toast(I18n.t('toast.chooseDifferentTeams'),'info');return;}
  const a=state.teams[idxA],b=state.teams[idxB];
  const scoreA=a.score||0,scoreB=b.score||0;
  const total=Math.max(scoreA+scoreB,1);
  const pctA=Math.round(scoreA/total*100);
  const pctB=100-pctA;
  const winner=scoreA>scoreB?a:scoreB>scoreA?b:null;
  // Session stats
  const statsA=_getTeamSessionStats(a.id),statsB=_getTeamSessionStats(b.id);
  closeModal('modal-generic');
  // Show comparison view (use full-screen generic modal with wider content)
  const body=`<div style="display:flex;flex-direction:column;gap:18px;min-width:min(500px,90vw)">
    <!-- Score bars -->
    <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center">
      <div style="text-align:right">
        <div style="font-size:1.1rem;font-weight:900;color:${a.color}">${a.name}</div>
        <div style="font-size:2rem;font-weight:900;color:${a.color}">${scoreA}</div>
      </div>
      <div style="font-size:1.4rem;color:var(--text-muted)">⚔️</div>
      <div style="text-align:left">
        <div style="font-size:1.1rem;font-weight:900;color:${b.color}">${b.name}</div>
        <div style="font-size:2rem;font-weight:900;color:${b.color}">${scoreB}</div>
      </div>
    </div>
    <!-- Progress bar -->
    <div style="height:12px;border-radius:6px;overflow:hidden;display:flex;background:var(--bg-surface)">
      <div style="width:${pctA}%;background:${a.color};transition:width 1s ease;border-radius:6px 0 0 6px"></div>
      <div style="width:${pctB}%;background:${b.color};transition:width 1s ease;border-radius:0 6px 6px 0"></div>
    </div>
    <!-- Winner badge -->
    ${winner?`<div style="text-align:center;padding:10px;background:rgba(245,200,66,.1);border:1px solid var(--accent1);border-radius:10px;color:var(--accent1);font-weight:900">🏆 ${winner.name} متصدر</div>`:'<div style="text-align:center;color:var(--text-muted);font-size:.9rem">تعادل!</div>'}
    <!-- Stats table -->
    <table style="width:100%;border-collapse:collapse;font-size:.82rem">
      <thead><tr>
        <th style="padding:6px;color:${a.color};text-align:right">${a.name}</th>
        <th style="padding:6px;color:var(--text-muted);text-align:center">الإحصاء</th>
        <th style="padding:6px;color:${b.color};text-align:left">${b.name}</th>
      </tr></thead>
      <tbody>
        ${[
          ['النقاط الإجمالية',scoreA,scoreB],
          ['الإجابات الصحيحة',statsA.correct,statsB.correct],
          ['الإجابات الخاطئة',statsA.wrong,statsB.wrong],
          ['الأسئلة المُجابة',statsA.total,statsB.total],
          ['دقة الإجابات',(statsA.total?Math.round(statsA.correct/statsA.total*100):0)+'%',(statsB.total?Math.round(statsB.correct/statsB.total*100):0)+'%'],
        ].map(([label,va,vb])=>`<tr style="border-top:1px solid var(--border)">
          <td style="padding:7px;text-align:right;font-weight:700;color:${+va>(+vb||0)?'var(--success)':'var(--text-primary)'}">${va}</td>
          <td style="padding:7px;text-align:center;color:var(--text-muted)">${label}</td>
          <td style="padding:7px;text-align:left;font-weight:700;color:${+vb>(+va||0)?'var(--success)':'var(--text-primary)'}">${vb}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
  openGenericModal('⚔️ مقارنة — '+a.name+' vs '+b.name,body);
}

function _getTeamSessionStats(teamId){
  // Pull from session stats if available
  const s=state.sessionStats||{};
  const ts=s[teamId]||{correct:0,wrong:0};
  return{correct:ts.correct||0,wrong:ts.wrong||0,total:(ts.correct||0)+(ts.wrong||0)};
}

// ═══════════════════════════════════════════════════════════════
//  EXPORT RESULTS AS CSV
// ═══════════════════════════════════════════════════════════════
function exportResultsCSV(){
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  if(!sorted.length){toast(I18n.t('toast.noTeams'),'info');return;}
  const now=new Date();
  const dateStr=now.toLocaleDateString('ar-SA',{calendar:'gregory',year:'numeric',month:'2-digit',day:'2-digit'});
  const timeStr=now.toLocaleTimeString('ar-SA',{hour:'2-digit',minute:'2-digit'});
  const rows=[
    ['الترتيب','اسم الفريق','النقاط','الإجابات الصحيحة','الإجابات الخاطئة','الدقة'],
    ...sorted.map((t,i)=>{
      const stats=_getTeamSessionStats(t.id);
      const pct=stats.total?Math.round(stats.correct/stats.total*100):0;
      return[i+1,t.name,t.score||0,stats.correct,stats.wrong,pct+'%'];
    }),
    [],
    ['المسابقة:',state.settings.name||'—'],
    ['التاريخ:',dateStr+' '+timeStr],
  ];
  const csv=rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const bom='﻿'; // UTF-8 BOM for Excel Arabic support
  const blob=new Blob([bom+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='نتائج_'+(state.settings.name||'المسابقة')+'_'+dateStr.replace(/\//g,'-')+'.csv';
  a.click();URL.revokeObjectURL(url);
  toast(I18n.t('toast.resultsExported'),'success');
}


// ═══════════════════════════════════════════════════════════════
//  PRESENTER JUDGE — manual correct/wrong for fitb/order/quran
// ═══════════════════════════════════════════════════════════════
function presenterJudge(isCorrect){
  if(state.answered)return;
  state.answered=true;
  clearTimer();_stopTenseAudio();
  const cat=state.categories.find(c=>c.id===state.currentCatId);
  const q=cat?.questions[state.currentQIndex];
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  const team=getCurrentTeam();
  const timeUsed=(state.timerTotal||30)-Math.max(0,state.timeLeft);

  if(isCorrect){
    playSound('correct');launchConfetti();
    _updateStreak(team?.id,true);
    // In jeopardy mode, award tile points instead of standard points
    const _isJep=state.settings.catDisplayMode==='jeopardy'&&state.settings.jepAwardPts!==false;
    const _jepPts=_isJep?(_getJeopardyPtsForQ(state.currentCatId,state.currentQIndex)||0):0;
    const streakBonus=_streakBonusPts(team?.id);
    const pts=_isJep&&_jepPts?_jepPts:(_getQuestionPts(q)+streakBonus);
    if(team){
      team.score=(team.score||0)+pts;
      recordScoreHistoryV5(team.id,pts);
      saveState();saveGameProgress();
      floatScore(team,'+'+pts+(streakBonus>0?' 🔥':''));
      _checkEarlyWinner(team);
    }
    toast((I18n.t('toast.correctAnswer')||'✅ المقدم: إجابة صحيحة!')+(streakBonus>0?' 🔥 مكافأة تسلسل!':''),'success');
    recordAnswer(team?.id,true,timeUsed);
    // Visual feedback on any visible input
    const inp=document.getElementById('fitb-player-input');
    if(inp){inp.style.borderColor='var(--success)';inp.style.color='var(--success)';}
  } else {
    playSound('wrong');
    if(state.settings.catDisplayMode==='jeopardy'&&state.settings.jepDeductWrong){
      const _jdp=_getJeopardyPtsForQ(state.currentCatId,state.currentQIndex)||0;
      if(_jdp>0&&team){team.score=Math.max(0,(team.score||0)-_jdp);recordScoreHistoryV5(team.id,-_jdp);saveState();floatScore(team,'-'+_jdp,'minus');}
    } else if(team&&state.settings.negativeMarking){
      const neg=state.settings.negMarkValue||1;
      team.score=Math.max(0,(team.score||0)-neg);
      recordScoreHistoryV5(team.id,-neg);
      saveState();saveGameProgress();
      floatScore(team,'-'+neg,'minus');
    }
    toast(I18n.t('toast.hostWrongAnswer'),'danger');
    recordAnswer(team?.id,false,timeUsed);
    _updateStreak(team?.id,false);
    const inp=document.getElementById('fitb-player-input');
    if(inp){inp.style.borderColor='var(--danger)';}
  }
  // Show correct order for order questions
  if(q?.type==='order'&&state._orderCorrect&&state._orderItems){
    const correct=state._orderCorrect;
    const current=state._orderItems.map(x=>x.origIdx);
    document.querySelectorAll('.order-option-item').forEach((el,i)=>{
      el.classList.add(current[i]===correct[i]?'correct-pos':'wrong-pos');
    });
    // Show correct order if wrong
    if(!isCorrect){
      const correctOrderEl=document.createElement('div');
      correctOrderEl.style.cssText='margin-top:12px;padding:10px 14px;background:rgba(0,230,118,.08);border:1px solid var(--success);border-radius:10px;font-size:.82rem;direction:rtl;text-align:right';
      correctOrderEl.innerHTML='<div style="font-weight:900;color:var(--success);margin-bottom:6px">الترتيب الصحيح:</div>'+
        state._orderCorrect.map((origIdx,pos)=>{
          const item=(state._orderItems||[]).find(x=>x.origIdx===origIdx)||(q?.options||[])[origIdx];
          const text=typeof item==='object'?item.text:item;
          return '<div style="padding:3px 0"><span style="color:var(--accent2);font-weight:700;margin-left:6px">'+(pos+1)+'.</span>'+(text||'—')+'</div>';
        }).join('');
      const grid=document.getElementById('q-options-grid');
      if(grid)grid.appendChild(correctOrderEl);
    }
  }
  if(q?.explanation){
    const eb=document.getElementById('q-explanation-box');
    if(eb){eb.innerHTML='<span>💡</span> '+_sanitize(q.explanation);eb.classList.remove('hidden');}
  }
  updateTicker();updateUndoBtn();
}

// ═══════════════════════════════════════════════════════════════
//  QUESTION FONT TOGGLE (Cairo / Amiri Quranic)
// ═══════════════════════════════════════════════════════════════
function setQFont(font,btn){
  // B3: use class toggle, remove inline overrides
  document.getElementById('q-text-font').value=font;
  const ta=document.getElementById('q-text-input');
  if(ta){
    ta.style.fontFamily=font==='amiri'?"'Amiri','Noto Naskh Arabic',serif":"'Cairo',sans-serif";
    if(font==='amiri'){ta.style.fontSize='1.05rem';ta.style.lineHeight='2.1';}
    else{ta.style.removeProperty('font-size');ta.style.removeProperty('line-height');}
    ta.style.direction='rtl';
  }
  document.querySelectorAll('.q-font-btn').forEach(b=>{
    b.classList.toggle('font-active',b.dataset.font===font);
    ['border-color','color','background','font-weight'].forEach(p=>b.style.removeProperty(p));
  });
}

// ═══════════════════════════════════════════════════════════════
//  GLOBAL ERROR SAFETY NET
//  — NEVER suggests data reset or page reload for storage errors
//  — Distinguishes storage errors from other runtime errors
// ═══════════════════════════════════════════════════════════════
window.addEventListener('error', function(ev){
  if(!ev.error)return; // resource load failures — ignore
  console.error('[Quiz Runtime Error]', ev.error);
  // Suppress toast during startup — only log to console
  if(typeof _suppressStartupToasts!=='undefined'&&_suppressStartupToasts)return;
  // Show toast max once per 3s to avoid spam
  const now=Date.now();
  if(!window._lastErrToast||now-window._lastErrToast>3000){
    window._lastErrToast=now;
    if(typeof toast==='function'){
      var errMsg=String(ev.error?.message||ev.error||'');
      var isStorageError=errMsg.includes('QuotaExceeded')||errMsg.includes('quota')||
        errMsg.includes('localStorage')||errMsg.includes('NS_ERROR_DOM_QUOTA')||
        (ev.error&&ev.error.name==='QuotaExceededError')||(ev.error&&ev.error.code===22);
      if(isStorageError){
        toast(typeof I18n!=='undefined'?I18n.t('error.storage'):'⚠️ خطأ في التخزين — صدّر بياناتك فوراً','danger');
      }else{
        toast(typeof I18n!=='undefined'?I18n.t('error.internal'):'⚠️ حدث خطأ داخلي','danger');
      }
    }
  }
}, true);

window.addEventListener('unhandledrejection', function(ev){
  if(!ev.reason)return;
  const msg=String(ev.reason?.message||ev.reason||'');
  // Suppress known non-critical async errors
  if(msg.includes('IndexedDB')||msg.includes('IDB')||
     msg.includes('fetch')||msg.includes('network')||
     msg.includes('abort')||msg.includes('QuotaExceeded'))return;
  console.warn('[Quiz Unhandled Promise]', ev.reason);
});

// ═══════════════════════════════════════════════════════════════
//  applyScore — UNIFIED scoring helper
//  Reduces 5+ duplicate score patterns to one call.
//  opts: { silent: bool }  — suppress sounds/confetti if true
// ═══════════════════════════════════════════════════════════════
function applyScore(team, delta, opts){
  // V7: validation + audit via changeScore; ActionLock prevents double-tap
  if(!team||delta===0)return false;
  opts=opts||{};
  const lockKey='applyScore:'+team.id+':'+(delta>0?'+':'-');
  const gate=ActionLock.run(lockKey,function(){
    const isPos=(delta>0);
    // Floor semantics preserved: negative scores can't drop below 0 via this path
    const safeDelta=isPos?delta:Math.max(delta,-(team.score||0));
    if(safeDelta===0)return false;
    const ok=changeScore(team,safeDelta,opts.reason||'applyScore');
    if(!ok)return false;
    try{recordScoreHistoryV5(team.id,safeDelta);}catch(e){ErrorBus.capture(e,'applyScore:history');}
    try{saveState();saveGameProgress();}catch(e){ErrorBus.capture(e,'applyScore:save');}
    try{floatScore(team,(isPos?'+':'')+safeDelta,isPos?undefined:'minus');}catch(e){ErrorBus.capture(e,'applyScore:float');}
    if(isPos){try{_checkEarlyWinner(team);}catch(e){ErrorBus.capture(e,'applyScore:winner');}}
    if(!opts.silent){
      try{if(isPos){playSound('correct');launchConfetti();}else playSound('wrong');}
      catch(e){ErrorBus.capture(e,'applyScore:sfx');}
    }
    return true;
  },300);
  if(gate.locked){
    // Silent by design — double-tap should not emit a Toast.
    return false;
  }
  return gate.result===true;
}

// ── Tab visibility change: recalculate timer when tab becomes visible ──
// V10-fix: Handle tab visibility to pause/resume resource-intensive operations
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
    // Tab back in focus — recalculate timer display from absolute timestamps
    if(state.timerInterval&&!state.answered){
      if(state._timerStartTime){
        var elapsed=Math.floor((Date.now()-state._timerStartTime-(state._timerPauseAccum||0))/1000);
        state.timeLeft=Math.max(0,(state._timerStartLeft||state.timerTotal||30)-elapsed);
        updateTimerDisplay(state.timeLeft,state.timerTotal);
        // V11-fix: If timer expired while tab was hidden, handle it now
        if(state.timeLeft<=0){
          try{handleTimerEnd();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
        }
      }
      _pushRemoteState();
    }else if(!state.timerInterval&&!state.answered&&state._timerStartTime&&state.gameActive){
      // V11-fix: Timer interval was lost (e.g., bfcache restoration, beforeunload cleanup)
      // Recalculate remaining time and either handle expiry or restart timer
      var elapsed2=Math.floor((Date.now()-state._timerStartTime-(state._timerPauseAccum||0))/1000);
      state.timeLeft=Math.max(0,(state._timerStartLeft||state.timerTotal||30)-elapsed2);
      updateTimerDisplay(state.timeLeft,state.timerTotal);
      if(state.timeLeft<=0){
        try{handleTimerEnd();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      }else if(state.timeLeft>0){
        // Restart the timer interval
        try{startTimer(state.timeLeft,true);}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      }
      _pushRemoteState();
    }
    // V11-fix: Clean up any stuck progressive-reveal CSS classes that block button clicks
    try{
      document.querySelectorAll('.opt-hidden-pr,.opt-visible-pr').forEach(function(b){
        b.classList.remove('opt-hidden-pr','opt-visible-pr');
      });
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_237")}catch(_){}}
    // V12-fix: Ensure option buttons are in a consistent clickable state when tab regains focus
    // Remove any orphaned CSS classes that might block clicks
    try{
      if(!state.answered){
        document.querySelectorAll('.option-btn').forEach(function(btn){
          // Remove stuck progressive-reveal classes
          btn.classList.remove('opt-hidden-pr','opt-visible-pr');
          // V12-fix: If progressive reveal is in auto mode and options should be visible by now, remove hidden-option too
          // Check if the option was supposed to be revealed already
          if(btn.classList.contains('hidden-option')){
            var totalOpts=state.totalOptionsToReveal||0;
            var revealed=state.optionsRevealed||0;
            if(revealed>=totalOpts){
              // All options should be revealed — remove hidden class
              btn.classList.remove('hidden-option');
              btn.classList.add('reveal-anim');
            }
          }
          // Ensure visible buttons are clickable
          if(!btn.classList.contains('hidden-option')&&!btn.classList.contains('opt-hidden-pr')){
            btn.style.pointerEvents='';
            btn.style.opacity='';
          }
        });
        // Restore the confirm panel visibility if there's a pending answer
        if(state.pendingAnswer>=0||state._quranPendingIdx!=null){
          document.getElementById('answer-confirm-panel')?.classList.remove('hidden');
        }
      }
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_238")}catch(_){}}
    // Resume AudioContext if it was suspended during idle
    if(audioCtx&&audioCtx.state==='suspended'){try{audioCtx.resume().catch(()=>{});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_239")}catch(_){}}}
    // V10-fix: Validate state integrity after long idle period
    try{
      if(state.categories&&Array.isArray(state.categories)){
        state.categories.forEach(function(c){
          if(c.questions&&!Array.isArray(c.questions))c.questions=[];
        });
      }
      if(state.teams&&!Array.isArray(state.teams))state.teams=[];
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_240")}catch(_){}}
    // V10-fix: Trigger a debounced save to sync any changes
    try{saveState();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_241")}catch(_){}}
    // V12-fix: Force UI repaint when tab regains focus
    try{
      requestAnimationFrame(function(){
        // Re-render current view timer display if on question screen
        if(state.timerInterval&&!state.answered){
          updateTimerDisplay(state.timeLeft,state.timerTotal);
        }
        // Ensure the current view is properly sized after potential resize during hidden
        try{
          var cv=window._currentView;
          if(cv){
            var viewEl=document.getElementById('view-'+cv);
            if(viewEl)viewEl.offsetHeight; // Force reflow
          }
        }catch(e){}
      });
    }catch(e){}
  }else{
    // Tab hidden — stop expensive remote pings to save battery/CPU
    // The pings will resume automatically when tab becomes visible again
    // since the intervals check for closed windows.
    // Also try to save state proactively in case the user closes the tab
    try{saveState();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_242")}catch(_){}}
  }
});

// V11-fix: Handle bfcache (back-forward cache) restoration
// When the user navigates back to this page, the browser may restore it from bfcache
// with JS state intact but all timers/intervals destroyed. This handler fixes that.
window.addEventListener('pageshow',function(e){
  if(e.persisted){
    // Page restored from bfcache — fix stale UI state
    try{
      // Remove any stuck progressive-reveal classes that block button clicks
      document.querySelectorAll('.opt-hidden-pr,.opt-visible-pr').forEach(function(b){
        b.classList.remove('opt-hidden-pr','opt-visible-pr');
      });
      // V12-fix: Ensure option buttons are clickable after bfcache restoration
      if(!state.answered){
        document.querySelectorAll('.option-btn').forEach(function(btn){
          btn.classList.remove('opt-hidden-pr','opt-visible-pr');
          if(!btn.classList.contains('hidden-option')){
            btn.style.pointerEvents='';
            btn.style.opacity='';
          }
        });
      }
      // Restart timer if it was running when the page was cached
      if(!state.answered&&state._timerStartTime&&state.gameActive){
        var elapsed=Math.floor((Date.now()-state._timerStartTime-(state._timerPauseAccum||0))/1000);
        state.timeLeft=Math.max(0,(state._timerStartLeft||state.timerTotal||30)-elapsed);
        updateTimerDisplay(state.timeLeft,state.timerTotal);
        if(state.timeLeft>0){
          try{startTimer(state.timeLeft,true);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_243")}catch(_){}}
        }else{
          try{handleTimerEnd();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_244")}catch(_){}}
        }
      }
      // Reinitialize BroadcastChannel for remote control sync
      if(!_remoteChannel){
        try{initRemoteControl();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_245")}catch(_){}}
      }
      // Push current state to any open audience/remote windows
      try{_pushRemoteState();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_246")}catch(_){}}
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_247")}catch(_){}}
  }
});



// V7: Init Sortable for "order" question type answer UI
document.addEventListener('DOMContentLoaded',function(){
  // Watch for order-option containers (player rearranges order for "rank" questions)
  const initOrderIf=function(){
    document.querySelectorAll('.order-options-wrap,.order-options-list,[data-order-sortable]').forEach(el=>{
      if(!el._sortable){
        initSortable(el,{
          draggable:'.order-option-item',
          onEnd:function(evt){
            // Update the visual order; the actual answer check happens on submit.
            Store.dispatch('ORDER_REARRANGED',{from:evt.oldIndex,to:evt.newIndex});
          }
        });
      }
    });
  };
  try{new MutationObserver(initOrderIf).observe(document.body,{childList:true,subtree:true});}catch(e){try{ErrorBus.capture(e,"catch#47")}catch(_){}}
});


// V7 T-6.4: Auto-mute BGM when admin view is active
Store.subscribe('VIEW_CHANGE',function(payload){
  if(!payload)return;
  const entering=payload.view;
  try{
    if(entering==='admin'){
      // Snapshot + stop BGM if user hasn't disabled auto-mute
      if(state.settings.autoMuteOnAdmin!==false){
        BgmResumeTracker.snapshot();
        if(state.musicPlaying){stopMusic();}
      }
    }else{
      // Leaving admin (to any other view) → restore BGM
      if(state.settings.autoMuteOnAdmin!==false){
        TimerRegistry.setTimeout(function(){
          try{BgmResumeTracker.restore();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_248")}catch(_){}}
        },200,'admin:bgm-resume');
      }
    }
  }catch(e){ErrorBus.capture(e,'view-change:bgm');}
});

// V9: Expose migration utilities on window for advanced users
window.Quiz={
  Store:Store,ErrorBus:ErrorBus,Migration:MigrationV7,TimerRegistry:TimerRegistry,ActionLock:ActionLock,AudioMixer:AudioMixer,NotificationManager:NotificationManager,extendTimer:extendTimerSeconds,submitMatch:function(){return _submitMatch();},resetMatch:function(){return _resetMatch();},Match:{get _runtime(){return _matchRuntime;},_getRuntime:function(){return _matchRuntime;},_getEditingPairs:function(){return _editingMatchPairs;},_setEditingPairs:function(pairs){_editingMatchPairs=pairs;_renderMatchPairsEditor();}},changeScore:changeScore,undoLastScoreChange:undoLastScoreChange,getScoreAudit:getScoreAudit,
  version:'9.0',
  get state(){return state;},
  // NEW V9: Get app info
  info(){
    return {
      version: this.version,
      categories: state?.categories?.length || 0,
      questions: state?.categories?.reduce((s,c) => s + c.questions.length, 0) || 0,
      teams: state?.teams?.length || 0,
      language: typeof I18n!=='undefined' ? (I18n.getCurrentLang?.() || 'ar') : 'ar',
      theme: state?.settings?.theme || 'default'
    };
  },
  // NEW V9: Quick export all data
  exportAll(){
    return JSON.stringify(state, null, 2);
  },
  // NEW V9: Quick import data
  importAll(jsonStr){
    try {
      const data=JSON.parse(jsonStr);
      if(data&&data.categories&&data.teams){
        Object.assign(state,data);
        if(typeof saveState==='function')saveState();
        if(typeof renderAll==='function')renderAll();
        return true;
      }
      return false;
    }catch(e){
      (typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, 'Quiz.importAll failed:') : console.error('Quiz.importAll failed:', e));
      return false;
    }
  },
  // NEW V9: Reset quiz state (preserve settings)
  resetQuiz(){
    if(state){
      state.currentCategoryIndex=-1;
      state.currentQuestionIndex=-1;
      state.currentTeamIndex=0;
      state.scoreHistory=[];
      state.scoreAudit=[];
      state.teams.forEach(t=>t.score=0);
      if(typeof saveState==='function')saveState();
      if(typeof showView==='function')showView('intro');
    }
  },
  // NEW V9: Get storage usage
  storageUsage(){
    let total=0;
    for(let key in localStorage){
      if(localStorage.hasOwnProperty(key)){
        total+=localStorage[key].length*2; // UTF-16
      }
    }
    return {
      usedMB:(total/1024/1024).toFixed(2),
      usedPercent:(total/(5*1024*1024)*100).toFixed(1),
      keys:Object.keys(localStorage).length
    };
  },
  diagnostics(){
    console.log('=== Quiz Platform V9 Diagnostics ===');
    console.log('Store listeners:',Store._listenersCount());
    console.log('Errors logged:',ErrorBus.getLog().length);
    console.log('Active timers:',TimerRegistry.size(),TimerRegistry.list());
    console.log('Active locks:',ActionLock.size());
    console.log('Score audit entries:',(state&&state.scoreAudit||[]).length);
    console.log('Audio channels:',AudioMixer.snapshot());
    console.log('Migration backup days left:',this.Migration.daysUntilPrune());
    console.log('Store history (last 10):',Store.getHistory().slice(-10));
    console.log('Confetti particles:',confettiP.length);
    console.log('WebAudio nodes tracked:',_webAudioEffectNodes.length);
    return'see console.';
  }
};

// ── Periodic cleanup for long-running sessions ──
// Runs every 5 minutes to prevent memory leaks
// V10-fix: Register with TimerRegistry for clean shutdown
TimerRegistry.setInterval(function _periodicCleanup(){
  try{
    // Clean orphaned score-float elements (shouldn't persist beyond 1.3s but safety net)
    document.querySelectorAll('.score-float').forEach(function(el){
      if(el.parentNode)el.parentNode.removeChild(el);
    });
    // Cap confetti particles (should auto-clear but safety net)
    if(confettiP.length>MAX_CONFETTI){
      confettiP=confettiP.slice(confettiP.length-MAX_CONFETTI);
    }
    // Clean up stale transition countdown badges
    const txb=document.getElementById('transition-countdown');
    if(txb&&!_transitionInProgress)txb.remove();
    // Clean up stale timeup overlays
    const tuOv=document.getElementById('timeup-overlay');
    if(tuOv)tuOv.remove();
    // Cap scoreAudit if somehow it grew too large
    if(state.scoreAudit&&state.scoreAudit.length>_SCORE_AUDIT_MAX){
      state.scoreAudit=state.scoreAudit.slice(-_SCORE_AUDIT_MAX);
    }
    // Cap scoreHistory if somehow it grew too large
    if(state.scoreHistory&&state.scoreHistory.length>500){
      state.scoreHistory=state.scoreHistory.slice(-400);
    }
  }catch(e){try{ErrorBus.capture(e,'periodicCleanup')}catch(_){}}
},300000,'periodic-cleanup');

// V10: Initialize namespace references (links all global functions to their namespace objects)
try{_initNamespaces();}catch(e){console.warn('[V9] Namespace init partial:',e);}

// V10: Register key computed properties
try{
  AppState.computed('totalCategories',['settings'],()=>state.categories.length);
  AppState.computed('totalTeams',['settings'],()=>state.teams.length);
  AppState.computed('totalQuestions',['settings'],()=>state.categories.reduce((s,c)=>s+c.questions.length,0));
  AppState.computed('activeTeamIndex',['settings'],()=>state.currentTeamIndex);
}catch(e){console.warn('[V9] Computed props init:',e);}

// V14: Sync certificate settings UI once logic code is parsed
try{if(typeof _syncCertSettingsUI==='function')_syncCertSettingsUI();}catch(e){}

console.info('%c Quiz Platform V9 ready ','background:#222;color:#0f0;font-weight:bold','— V9: i18n + Video + Audio/Video Attachments + Quiz namespace');

// ╔══════════════════════════════════════════════════════════════════╗
// ║  PHASE 4: PERFORMANCE OPTIMIZATIONS                             ║
// ║  Virtual Scrolling · Lazy Tabs · Smart Save · Memory Mgmt       ║
// ║  PerfMonitor · CSS Containment · requestIdleCallback            ║
// ╚══════════════════════════════════════════════════════════════════╝
