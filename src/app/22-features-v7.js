// ── Error Log Viewer ──
function toggleErrorLogViewer(){
  var existing=document.getElementById('error-log-viewer');
  if(existing){existing.remove();return;}
  var log=typeof ErrorBus!=='undefined'?ErrorBus.getLog():[];
  var popup=document.createElement('div');
  popup.id='error-log-viewer';
  popup.setAttribute('dir','rtl');
  popup.style.cssText='position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:10000;background:var(--bg-card,#111432);border:1px solid var(--border);border-radius:12px;padding:20px;width:90%;max-width:600px;max-height:80vh;overflow-y:auto;box-shadow:0 8px 40px rgba(0,0,0,.5);direction:rtl';
  var html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;font-size:1.1rem;color:var(--text-primary)">🐛 سجل الأخطاء</h3><div style="display:flex;gap:8px"><button onclick="if(typeof ErrorBus!==\'undefined\')ErrorBus.clear();toggleErrorLogViewer();toggleErrorLogViewer()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:.75rem;padding:4px 8px;cursor:pointer">مسح</button><button onclick="document.getElementById(\'error-log-viewer\').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer">✕</button></div></div>';
  if(log.length===0){
    html+='<div style="text-align:center;color:var(--text-muted);padding:30px;font-size:.85rem">'+t('empty.noErrors')+'</div>';
  }else{
    log.slice().reverse().forEach(function(entry){
      var ctxColor='var(--text-secondary)';
      if(String(entry.context).indexOf('FATAL')!==-1||String(entry.context).indexOf('CRITICAL')!==-1)ctxColor='#ff3b5c';
      else if(/^catch#auto_/i.test(String(entry.context)))ctxColor='var(--text-muted)';
      html+='<div style="border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:6px;border-right:3px solid '+ctxColor+'">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><span style="font-size:.72rem;font-weight:700;color:'+ctxColor+'">'+_sanitize(String(entry.context))+'</span><span style="font-size:.65rem;color:var(--text-muted)">'+new Date(entry.t).toLocaleTimeString('ar')+'</span></div>';
      html+='<div style="font-size:.8rem;color:var(--text-primary);word-break:break-word">'+_sanitize(String(entry.msg))+'</div>';
      html+='</div>';
    });
  }
  popup.innerHTML=html;
  document.body.appendChild(popup);
  // Close on outside click
  setTimeout(function(){document.addEventListener('click',function _close(e){if(!popup.contains(e.target)){popup.remove();document.removeEventListener('click',_close);}});},100);
}

// ═══════════════════════════════════════════════════════════════
//  SPACED REPETITION SYSTEM
// ═══════════════════════════════════════════════════════════════
const SPACED_INTERVALS=[5*60*1000, 30*60*1000, 24*60*60*1000, 7*24*60*60*1000]; // 5min, 30min, 1day, 1week

function _getSpacedRepetition(){
  try{
    const data=localStorage.getItem('quiz_spaced_repetition');
    return data?JSON.parse(data):{questionErrors:{}};
  }catch(e){return{questionErrors:{}};}
}

function _saveSpacedRepetition(sr){
  try{
    localStorage.setItem('quiz_spaced_repetition',JSON.stringify(sr));
  }catch(e){console.warn('[SpacedRepetition] Save error:',e);}
}

function _recordQuestionError(catId,qIdx,questionId){
  const sr=_getSpacedRepetition();
  // Use questionId for the key if available, fallback to index
  const key=questionId?(catId+'_'+questionId):(catId+'_'+qIdx);
  if(!sr.questionErrors[key]){
    sr.questionErrors[key]={catId:catId,qIdx:qIdx,questionId:questionId,lastError:0,nextReview:0,interval:0,errorCount:0};
  }
  const entry=sr.questionErrors[key];
  entry.lastError=Date.now();
  entry.errorCount=(entry.errorCount||0)+1;
  // Calculate next interval
  const intervalIdx=Math.min(entry.errorCount-1,SPACED_INTERVALS.length-1);
  entry.interval=SPACED_INTERVALS[intervalIdx];
  entry.nextReview=Date.now()+entry.interval;
  _saveSpacedRepetition(sr);
}

function _recordQuestionCorrect(catId,qIdx){
  const sr=_getSpacedRepetition();
  // Try to find the question to use its ID
  const cat=state.categories.find(c=>c.id===catId);
  const q=cat&&cat.questions[qIdx];
  const key=q&&q.id?(catId+'_'+q.id):(catId+'_'+qIdx);
  if(sr.questionErrors[key]){
    // Question mastered — remove from error list
    delete sr.questionErrors[key];
    _saveSpacedRepetition(sr);
  }
}

function _getDueReviews(){
  const sr=_getSpacedRepetition();
  const now=Date.now();
  const due=[];
  Object.entries(sr.questionErrors).forEach(([key,entry])=>{
    if(entry.nextReview<=now){
      const cat=state.categories.find(c=>c.id===entry.catId);
      if(cat&&cat.questions[entry.qIdx]){
        due.push({catId:entry.catId,qIdx:entry.qIdx,question:cat.questions[entry.qIdx],cat:cat,errorCount:entry.errorCount});
      }
    }
  });
  return due;
}

function _getMasteryForCategory(catId){
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat)return{mastered:0,total:0,pct:0,level:'high'};
  const sr=_getSpacedRepetition();
  const supportedQs=(cat.questions||[]).filter(q=>!SOLO_UNSUPPORTED_TYPES.includes(q.type));
  let mastered=0;
  supportedQs.forEach((q,i)=>{
    const origIdx=cat.questions.indexOf(q);
    const key=_soloLevelKey(catId,q,origIdx);
    // Mastered if: no errors recorded, or level completed
    const prog=state.soloProgress?.levels?.[key];
    const srKey=q&&q.id?(catId+'_'+q.id):(catId+'_'+origIdx);
    if((prog&&prog.completed)||!sr.questionErrors[srKey]) mastered++;
  });
  const total=supportedQs.length;
  const pct=total>0?Math.round(mastered/total*100):100;
  const level=pct>=80?'high':pct>=50?'medium':'low';
  return{mastered,total,pct,level};
}

function _getMasteryRecommendations(){
  const recommendations=[];
  (state.categories||[]).forEach(cat=>{
    if(cat.type==='tiebreaker')return;
    const m=_getMasteryForCategory(cat.id);
    if(m.pct<80&&m.total>0){
      recommendations.push({catId:cat.id,catName:cat.name,mastery:m});
    }
  });
  recommendations.sort((a,b)=>a.mastery.pct-b.mastery.pct);
  return recommendations;
}

function renderSpacedRepetitionSection(){
  const due=_getDueReviews();
  const recs=_getMasteryRecommendations();
  let html='';
  
  if(due.length>0){
    html+='<div class="review-section"><div class="review-section-title">🔄 أسئلة تحتاج مراجعة ('+due.length+')</div>';
    html+='<div style="display:flex;flex-direction:column;gap:6px">';
    due.forEach(item=>{
      const qText=(item.question.text||'').substring(0,50);
      html+=`<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-panel);border-radius:8px;border:1px solid var(--border);cursor:pointer" onclick="playSoloLevel('${item.catId}',${item.qIdx})"><span class="review-badge">×${item.errorCount}</span><span style="font-size:.8rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${qText}</span><span style="font-size:.7rem;color:var(--text-muted)">${item.cat.name}</span></div>`;
    });
    html+='</div></div>';
  }
  
  if(recs.length>0){
    html+='<div class="review-section"><div class="review-section-title">💡 توصيات المراجعة</div>';
    html+='<div style="display:flex;flex-direction:column;gap:6px">';
    recs.slice(0,5).forEach(rec=>{
      const cls='mastery-'+rec.mastery.level;
      html+=`<div style="display:flex;align-items:center;gap:8px;font-size:.8rem"><span style="font-weight:700">${rec.catName}</span><div class="mastery-indicator"><div class="mastery-bar"><div class="mastery-fill ${cls}" style="width:${rec.mastery.pct}%"></div></div><span>${rec.mastery.pct}%</span></div></div>`;
    });
    html+='</div></div>';
  }
  
  return html;
}

// ═══════════════════════════════════════════════════════════════
//  BUG REPORT SYSTEM
// ═══════════════════════════════════════════════════════════════
function _getBugReports(){
  if(!state.bugReports) state.bugReports=[];
  return state.bugReports;
}

function _saveBugReports(){
  if(!state.bugReports) state.bugReports=[];
  saveState();
}

function reportBug(questionId,catId,questionText){
  // Sanitize IDs to prevent XSS in onclick attribute
  const safeQId=String(questionId||'').replace(/[^a-zA-Z0-9_\-]/g,'');
  const safeCatId=String(catId||'').replace(/[^a-zA-Z0-9_\-]/g,'');
  let html='<div class="bug-report-modal" onclick="if(event.target===this)this.remove()"><div class="bug-report-form">';
  html+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px"><div style="font-size:1rem;font-weight:900">🚫 ${I18n.t('bugReport.title','الإبلاغ عن خطأ')}</div><button class="btn btn-ghost btn-sm" onclick="this.closest('.bug-report-modal').remove()">✕</button></div>`;
  html+='<div style="font-size:.78rem;color:var(--text-secondary);margin-bottom:10px;padding:8px;background:var(--bg-surface);border-radius:8px;max-height:60px;overflow:hidden">'+_sanitize((questionText||'').substring(0,120))+'...</div>';
  html+='<div style="margin-bottom:10px"><label class="form-label" style="font-size:.8rem">'+I18n.t('bugReport.type','نوع البلاغ')+'</label><select id="bug-type-select" class="bug-type-select"><option value="scientific">خطأ علمي</option><option value="typo">خطأ إملائي</option><option value="suggestion">اقتراح تحسين</option></select></div>';
  html+='<div style="margin-bottom:10px"><label class="form-label" style="font-size:.8rem">'+I18n.t('bugReport.description','الوصف')+'</label><textarea id="bug-desc-input" class="bug-desc-input" placeholder="اشرح المشكلة..."></textarea></div>';
  html+=`<div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn btn-ghost" onclick="this.closest('.bug-report-modal').remove()">${I18n.t('common.cancel','إلغاء')}</button><button class="btn btn-primary" onclick="submitBugReport('${safeQId}','${safeCatId}')">${I18n.t('bugReport.submit','إرسال البلاغ')}</button></div>`;
  html+='</div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function submitBugReport(questionId,catId){
  const typeEl=document.getElementById('bug-type-select');
  const descEl=document.getElementById('bug-desc-input');
  if(!typeEl||!descEl)return;
  const type=typeEl.value;
  const desc=descEl.value.trim();
  if(!desc){descEl.style.borderColor='var(--danger)';return;}
  const reports=_getBugReports();
  reports.push({
    id:'br_'+Date.now(),
    questionId:questionId,
    catId:catId,
    type:type,
    description:desc,
    status:'pending',
    createdAt:Date.now(),
    resolvedAt:null
  });
  _saveBugReports();
  const modal=document.querySelector('.bug-report-modal');
  if(modal)modal.remove();
  if(typeof toast==='function')toast(I18n.t('bugReport.submitted','تم إرسال البلاغ'),'success');
}

function renderBugReportsTab(){
  const reports=_getBugReports();
  const container=document.getElementById('tab-bug-reports-inner')||document.getElementById('tab-bug-reports');
  if(!container)return;
  
  let html='<div class="card"><div class="card-header"><div class="card-title"><div class="icon" style="background:rgba(255,59,92,.15)">🚫</div> <span>بلاغات الأخطاء</span></div></div>';
  
  // Stats
  const pending=reports.filter(r=>r.status==='pending').length;
  const approved=reports.filter(r=>r.status==='approved').length;
  const rejected=reports.filter(r=>r.status==='rejected').length;
  html+='<div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">';
  html+='<div style="padding:8px 14px;background:rgba(255,152,0,.1);border-radius:8px;font-size:.8rem;font-weight:700">⏳ معلق: '+pending+'</div>';
  html+='<div style="padding:8px 14px;background:rgba(0,230,118,.1);border-radius:8px;font-size:.8rem;font-weight:700">✓ مقبول: '+approved+'</div>';
  html+='<div style="padding:8px 14px;background:rgba(255,59,92,.1);border-radius:8px;font-size:.8rem;font-weight:700">✕ مرفوض: '+rejected+'</div>';
  html+='</div>';
  
  if(reports.length===0){
    html+='<div class="empty-state"><div class="empty-icon">📋</div><p>'+t('empty.noBugReports')+'</p></div>';
  }else{
    // Show reports sorted by date (newest first)
    const sorted=[...reports].sort((a,b)=>b.createdAt-a.createdAt);
    sorted.forEach(r=>{
      const typeLabel=r.type==='scientific'?t('bug.scientificError'):r.type==='typo'?t('bug.typo'):t('bug.suggestion');
      const typeClass=r.type==='scientific'?'bug-type-scientific':r.type==='typo'?'bug-type-typo':'bug-type-suggestion';
      const statusClass='bug-status-'+r.status;
      const statusLabel=r.status==='pending'?t('bug.pending'):r.status==='approved'?t('bug.accepted'):t('bug.rejected');
      const dateStr=new Date(r.createdAt).toLocaleDateString('ar');
      // Find the question text
      let qText='';
      const cat=state.categories.find(c=>c.id===r.catId);
      if(cat){
        const q=cat.questions.find(qq=>qq.id===r.questionId);
        if(q) qText=(q.text||'').substring(0,60);
      }
      
      html+=`<div class="bug-report-row"><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="bug-type-badge ${typeClass}">${typeLabel}</span><span class="bug-status-badge ${statusClass}">${statusLabel}</span><span style="font-size:.65rem;color:var(--text-muted)">${dateStr}</span></div><div style="font-size:.78rem;color:var(--text-secondary)">${r.description}</div>${qText?'<div style="font-size:.7rem;color:var(--text-muted);margin-top:3px">السؤال: '+qText+'</div>':''}</div>`;
      if(r.status==='pending'){
        html+=`<div style="display:flex;gap:4px;flex-shrink:0"><button class="btn btn-sm" style="background:rgba(0,230,118,.15);color:var(--success);border:1px solid rgba(0,230,118,.3)" onclick="resolveBugReport('${r.id}','approved')">✓</button><button class="btn btn-sm" style="background:rgba(255,59,92,.15);color:var(--danger);border:1px solid rgba(255,59,92,.3)" onclick="resolveBugReport('${r.id}','rejected')">✕</button></div>`;
      }
      html+='</div>';
    });
  }
  html+='</div>';
  container.innerHTML=html;
}

function resolveBugReport(reportId,status){
  const reports=_getBugReports();
  const report=reports.find(r=>r.id===reportId);
  if(!report)return;
  report.status=status;
  report.resolvedAt=Date.now();
  _saveBugReports();
  renderBugReportsTab();
  if(typeof toast==='function')toast(status==='approved'?'تم قبول البلاغ':'تم رفض البلاغ',status==='approved'?'success':'info');
}

// ═══════════════════════════════════════════════════════════════
//  QUESTION TEMPLATES
// ═══════════════════════════════════════════════════════════════
function toggleTemplateMenu(){
  const menu=document.getElementById('template-menu');
  if(!menu)return;
  menu.classList.toggle('hidden');
  // Close on click outside
  if(!menu.classList.contains('hidden')){
    setTimeout(()=>{
      const close=e=>{if(!menu.contains(e.target)){menu.classList.add('hidden');document.removeEventListener('click',close);}};
      document.addEventListener('click',close);
    },0);
  }
}

function applyTemplate(type){
  const menu=document.getElementById('template-menu');
  if(menu)menu.classList.add('hidden');
  
  // Use the new question template system which is more robust
  try{
    applyQuestionTemplate(type);
  }catch(e){
    // Fallback: manually apply template
    try{
      openAddQuestion();
      setTimeout(function(){
        setQType(type);
        var textInput=document.getElementById('q-text-input');
        if(textInput){
          switch(type){
            case 'quran': textInput.value='ما هي السورة التي تحتوي على آية: "..."؟'; break;
            case 'order': textInput.value='رتب العناصر التالية بالترتيب الصحيح:'; break;
            case 'match': textInput.value='صِل كل عنصر من العمود الأيمن بما يناسبه من العمود الأيسر:'; break;
            case 'math': textInput.value='ما ناتج العملية التالية؟'; break;
            case 'tf': textInput.value='حدد هل العبارة التالية صحيحة أم خاطئة:'; break;
          }
        }
      },200);
    }catch(e2){
      console.error('[applyTemplate] Fallback error:',e2);
      toast(t('toast.templateError'),'danger');
    }
  }
}

function cloneQuestion(catId,qIdx){
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat||!cat.questions[qIdx])return;
  const orig=cat.questions[qIdx];
  const clone=JSON.parse(JSON.stringify(orig));
  // Regenerate the question ID
  clone.id='q_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
  // Regenerate IDs for nested objects (match pairs, order items, etc.)
  if(Array.isArray(clone.pairs)) clone.pairs=clone.pairs.map(p=>({...p,id:p.id?'p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6):undefined}));
  if(Array.isArray(clone.items)) clone.items=clone.items.map(item=>({...item,id:item.id?'item_'+Date.now()+'_'+Math.random().toString(36).slice(2,6):undefined}));
  if(clone.matchData&&Array.isArray(clone.matchData.pairs)) clone.matchData.pairs=clone.matchData.pairs.map(p=>({...p,id:p.id?'p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6):undefined}));
  clone.text=clone.text+' (نسخة)';
  cat.questions.splice(qIdx+1,0,clone);
  saveState();
  renderQuestionsAdmin(catId);
  if(typeof toast==='function')toast(I18n.t('toast.questionCloned','تم استنساخ السؤال'),'success');
}

function generateVariants(catId,qIdx,count){
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat||!cat.questions[qIdx])return;
  const orig=cat.questions[qIdx];
  count=count||3;
  for(let i=0;i<count;i++){
    const variant=JSON.parse(JSON.stringify(orig));
    variant.id='q_'+Date.now()+'_'+Math.random().toString(36).slice(2,6);
    // For math questions, try to randomize numbers
    if(orig.type==='math'&&orig.text){
      variant.text=orig.text.replace(/\d+/g,m=>{
        const n=parseInt(m);
        if(isNaN(n))return m;
        // Clamp to positive values: vary between n-5 and n+5, minimum 0
        const varied=Math.max(0,n+Math.floor(Math.random()*11)-5);
        return ''+varied;
      });
    }
    variant.text=variant.text||orig.text;
    cat.questions.splice(qIdx+1+i,0,variant);
  }
  saveState();
  renderQuestionsAdmin(catId);
  if(typeof toast==='function')toast(I18n.t('toast.variantsGenerated','تم توليد النسخ'),'success');
}

// ═══════════════════════════════════════════════════════════════
//  ACHIEVEMENT SYSTEM
// ═══════════════════════════════════════════════════════════════
const ACHIEVEMENTS=[
  {id:'streak_3',name:'سلسلة البداية',nameEn:'Starting Streak',desc:'3 إجابات صحيحة متتالية',icon:'🔥',cond:c=>c.consecutiveCorrect>=3},
  {id:'streak_5',name:'سلسلة الإنجاز',nameEn:'Achievement Chain',desc:'5 إجابات صحيحة متتالية',icon:'⚡',cond:c=>c.consecutiveCorrect>=5},
  {id:'streak_10',name:'الأسطورة',nameEn:'Legend',desc:'10 إجابات صحيحة متتالية',icon:'👑',cond:c=>c.consecutiveCorrect>=10},
  {id:'perfect_section',name:'إتقان القسم',nameEn:'Section Master',desc:'إتمام قسم كامل بدون أخطاء',icon:'💎',cond:c=>c.sectionPerfect},
  {id:'lightning',name:'البرق',nameEn:'Lightning',desc:'الإجابة خلال ثانيتين',icon:'⚡',cond:c=>c.timeUsed<=2&&c.isCorrect},
  {id:'speed_demon',name:'سباق الزمن',nameEn:'Speed Demon',desc:'الإجابة خلال ثانية واحدة',icon:'🚀',cond:c=>c.timeUsed<=1&&c.isCorrect},
  {id:'persistent',name:'المثابر',nameEn:'Persistent',desc:'إكمال 20 سؤال في الوضع الفردي',icon:'🏋️',cond:c=>c.totalCompleted>=20},
  {id:'quran_master',name:'حافظ القرآن',nameEn:'Quran Master',desc:'10 إجابات صحيحة في أسئلة القرآن (الوضع الجماعي)',icon:'📖',cond:c=>c.quranCorrect>=10},
  {id:'math_whiz',name:'عبقري الرياضيات',nameEn:'Math Whiz',desc:'10 إجابات صحيحة في أسئلة الرياضيات',icon:'🧮',cond:c=>c.mathCorrect>=10},
  {id:'comeback',name:'العودة القوية',nameEn:'Comeback',desc:'3 إجابات صحيحة بعد خطأ',icon:'💪',cond:c=>c.correctAfterWrong>=3},
  {id:'first_star',name:'النجمة الأولى',nameEn:'First Star',desc:'الحصول على أول نجمة',icon:'⭐',cond:c=>c.totalStarsEarned>=1},
  {id:'star_collector',name:'جامع النجوم',nameEn:'Star Collector',desc:'جمع 50 نجمة',icon:'🌟',cond:c=>c.totalStarsEarned>=50},
  {id:'perfectionist',name:'الكمال',nameEn:'Perfectionist',desc:'الحصول على 3 نجوم في 10 أسئلة',icon:'💯',cond:c=>c.threeStarCount>=10},
  {id:'explorer',name:'المستكشف',nameEn:'Explorer',desc:'إكمال أسئلة من 5 أقسام مختلفة',icon:'🗺️',cond:c=>c.sectionsPlayed>=5},
  {id:'century',name:'القرن',nameEn:'Century',desc:'إكمال 100 سؤال في الوضع الفردي',icon:'🏆',cond:c=>c.totalCompleted>=100},
  {id:'no_miss_5',name:'الدقة المتناهية',nameEn:'Pinpoint Accuracy',desc:'5 إجابات صحيحة متتالية بسرعة',icon:'🎯',cond:c=>c.consecutiveFast>=5},
];

function _initAchievementTracking(){
  if(!state.soloProgress)return;
  if(!state.soloProgress.achievementTracking){
    state.soloProgress.achievementTracking={
      consecutiveCorrect:0,
      consecutiveFast:0,
      quranCorrect:0,
      mathCorrect:0,
      correctAfterWrong:0,
      lastWasWrong:false,
      sectionsPlayedSet:{},  // Object for O(1) lookups instead of array
      threeStarCount:0,
    };
  }
  if(!state.soloProgress.achievements) state.soloProgress.achievements={};
}

function _checkAchievements(ctx){
  _initAchievementTracking();
  const at=state.soloProgress.achievementTracking;
  const unlocked=state.soloProgress.achievements;
  // Update tracking from context
  if(ctx.consecutiveCorrect!==undefined) at.consecutiveCorrect=ctx.consecutiveCorrect;
  if(ctx.consecutiveFast!==undefined) at.consecutiveFast=ctx.consecutiveFast;
  if(ctx.quranCorrect!==undefined) at.quranCorrect=ctx.quranCorrect;
  if(ctx.mathCorrect!==undefined) at.mathCorrect=ctx.mathCorrect;
  if(ctx.correctAfterWrong!==undefined) at.correctAfterWrong=ctx.correctAfterWrong;
  if(ctx.threeStarCount!==undefined) at.threeStarCount=ctx.threeStarCount;
  if(ctx.totalCompleted!==undefined) at.totalCompleted=ctx.totalCompleted;
  if(ctx.totalStarsEarned!==undefined) at.totalStarsEarned=ctx.totalStarsEarned;
  if(ctx.sectionsPlayedSet) at.sectionsPlayedSet=ctx.sectionsPlayedSet;
  // Build context for conditions
  const fullCtx=Object.assign({},at,ctx,{sectionsPlayed:Object.keys(at.sectionsPlayedSet||{}).length});
  // Check each achievement
  let newlyUnlocked=[];
  ACHIEVEMENTS.forEach(a=>{
    if(unlocked[a.id])return; // Already unlocked
    try{
      if(a.cond(fullCtx)){
        unlocked[a.id]={unlockedAt:Date.now()};
        newlyUnlocked.push(a);
      }
    }catch(e){console.warn('[Achievement] Error checking',a.id,e);}
  });
  // Show popup for newly unlocked
  if(newlyUnlocked.length>0){
    _saveSoloProgress();
    newlyUnlocked.forEach((a,i)=>{
      setTimeout(()=>_showAchievementPopup(a),i*600);
    });
  }
}

function _showAchievementPopup(achievement){
  const bar=document.querySelector('.achievement-bar')||document.createElement('div');
  bar.className='achievement-bar';
  if(!bar.parentElement){
    document.body.appendChild(bar);
  }
  const popup=document.createElement('div');
  popup.className='achievement-popup';
  popup.innerHTML=`<div class="ach-icon">${_sanitizeIcon(achievement.icon)}</div><div class="ach-info"><div class="ach-label">${I18n.t('achievement.unlocked','إنجاز جديد!')}</div><div class="ach-name">${_sanitize(achievement.name)}</div><div class="ach-desc">${_sanitize(achievement.desc)}</div></div>`;
  bar.appendChild(popup);
  // Play achievement sound
  try{
    const ctx=getAudioCtx();
    if(ctx){
      const osc=ctx.createOscillator();const gain=ctx.createGain();
      osc.type='sine';osc.frequency.value=880;gain.gain.value=0.15;
      osc.connect(gain);gain.connect(ctx.destination);
      osc.start();osc.stop(ctx.currentTime+0.1);
      osc.onended=function(){osc.disconnect();gain.disconnect();};
      setTimeout(()=>{
        const osc2=ctx.createOscillator();const gain2=ctx.createGain();
        osc2.type='sine';osc2.frequency.value=1320;gain2.gain.value=0.12;
        osc2.connect(gain2);gain2.connect(ctx.destination);
        osc2.start();osc2.stop(ctx.currentTime+0.15);
        osc2.onended=function(){osc2.disconnect();gain2.disconnect();};
      },100);
    }
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_103")}catch(_){}}
  // Vibrate
  try{if(navigator.vibrate)navigator.vibrate([50,30,80]);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_104")}catch(_){}}
  // Dismiss after 4s
  setTimeout(()=>{
    popup.classList.add('ach-exit');
    setTimeout(()=>{if(popup.parentElement)popup.remove();},400);
  },4000);
}

function showAchievementModal(){
  _initAchievementTracking();
  const unlocked=state.soloProgress.achievements||{};
  let html='<div class="achievement-modal" onclick="if(event.target===this)this.remove()"><div class="achievement-modal-content">';
  html+=`<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><div style="font-size:1.1rem;font-weight:900">🏆 ${I18n.t('achievement.title','الإنجازات')}</div><button class="btn btn-ghost btn-sm" onclick="this.closest('.achievement-modal').remove()">✕</button></div>`;
  const unlockedCount=Object.keys(unlocked).length;
  html+='<div style="font-size:.8rem;color:var(--text-secondary);margin-bottom:8px">'+unlockedCount+'/'+ACHIEVEMENTS.length+' '+I18n.t('achievement.unlockedCount','مفتوح')+'</div>';
  html+='<div class="achievement-grid">';
  ACHIEVEMENTS.forEach(a=>{
    const u=unlocked[a.id];
    const cls=u?'unlocked':'locked';
    const dateStr=u?new Date(u.unlockedAt).toLocaleDateString('ar'):'';
    html+=`<div class="achievement-card ${cls}"><div class="ac-icon">${u?_sanitizeIcon(a.icon):'🔒'}</div><div class="ac-info"><div class="ac-name">${_sanitize(a.name)}</div><div class="ac-desc">${_sanitize(a.desc)}</div>${u?'<div class="ac-date">'+dateStr+'</div>':''}</div></div>`;
  });
  html+='</div></div></div>';
  document.body.insertAdjacentHTML('beforeend',html);
}

function submitSoloAnswer(answer){
  if(_soloAnswered) return;
  _soloAnswered=true;
  var skipArea=document.getElementById('solo-q-skip');
  if(skipArea) skipArea.style.display='none';
  var confirmArea=document.getElementById('solo-q-confirm');if(confirmArea)confirmArea.style.display='none';
  _soloTransitioning=true; // Lock to prevent race condition with nextLevel clicks
  clearSoloTimer();
  
  const cat=state.categories.find(c=>c.id===_soloCurrentCat);
  if(!cat){_soloTransitioning=false;return;}
  const q=cat.questions[_soloCurrentQIdx];
  if(!q){_soloTransitioning=false;return;}
  
  const timeUsed=(Date.now()-_soloTimerStart)/1000;
  const totalTime=q.time||state.settings.defaultTime||30;
  let isCorrect=false;
  
  // Check answer based on question type
  if(q.type==='tf'){
    isCorrect=answer===(q.correct===0);
  } else {
    isCorrect=Number(answer)===Number(q.correct);
  }
  
  // Play sound effect (respect mute setting)
  try{
    if(typeof playSound==='function'&&!_soloSettings.muted){
      playSound(isCorrect?'correct':'wrong');
    }
  }catch(e){console.error("[Error]",e);}
  
  // Update streak system
  soloStreakUpdate(isCorrect);
  
  // Calculate stars
  const stars=calculateStars(timeUsed,totalTime,isCorrect);
  
  // Update progress — use ID-based key for stability
  const lvlKey=_soloLevelKey(_soloCurrentCat,q,_soloCurrentQIdx);
  if(!state.soloProgress.levels[lvlKey]) state.soloProgress.levels[lvlKey]={stars:0,completed:false,attempts:0};
  state.soloProgress.levels[lvlKey].attempts++;
  
  // ── Achievement tracking ──
  _initAchievementTracking();
  const at=state.soloProgress.achievementTracking;
  if(isCorrect){
    state.soloProgress.levels[lvlKey].completed=true;
    if(stars>state.soloProgress.levels[lvlKey].stars) state.soloProgress.levels[lvlKey].stars=stars;
    // Achievement: consecutive correct
    at.consecutiveCorrect=(at.consecutiveCorrect||0)+1;
    at.correctAfterWrong=(at.correctAfterWrong||0)+1;
    // Achievement: consecutive fast answers
    if(timeUsed<=2) at.consecutiveFast=(at.consecutiveFast||0)+1; else at.consecutiveFast=0;
    // Achievement: quran/math correct
    if(q.type==='quran') at.quranCorrect=(at.quranCorrect||0)+1;
    if(q.type==='math') at.mathCorrect=(at.mathCorrect||0)+1;
    at.lastWasWrong=false;
    // Track sections played
    if(!at.sectionsPlayedSet) at.sectionsPlayedSet={};
    if(!at.sectionsPlayedSet[_soloCurrentCat]) at.sectionsPlayedSet[_soloCurrentCat]=true;
  }else{
    at.consecutiveCorrect=0;
    at.consecutiveFast=0;
    at.correctAfterWrong=0;
    at.lastWasWrong=true;
    // ── Spaced repetition: record error ──
    try{_recordQuestionError(_soloCurrentCat,_soloCurrentQIdx,q.id);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_105")}catch(_){}}
  }
  // ── Spaced repetition: record correct answer ──
  if(isCorrect){
    try{_recordQuestionCorrect(_soloCurrentCat,_soloCurrentQIdx);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_106")}catch(_){}}
  }
  
  // Recalculate totals
  let completedLevels=0, totalStars=0, threeStarCount=0;
  Object.values(state.soloProgress.levels).forEach(l=>{
    if(l.completed) completedLevels++;
    totalStars+=l.stars||0;
    if(l.stars>=3) threeStarCount++;
  });
  state.soloProgress.completedLevels=completedLevels;
  state.soloProgress.totalStars=totalStars;
  
  // ── Check achievements after answer ──
  _checkAchievements({
    isCorrect:isCorrect,
    timeUsed:timeUsed,
    totalCompleted:completedLevels,
    totalStarsEarned:totalStars,
    threeStarCount:threeStarCount,
    consecutiveCorrect:at.consecutiveCorrect,
    consecutiveFast:at.consecutiveFast,
    quranCorrect:at.quranCorrect,
    mathCorrect:at.mathCorrect,
    correctAfterWrong:at.correctAfterWrong,
    sectionsPlayedSet:at.sectionsPlayedSet,
  });
  
  // ── Check section perfect (all questions in category correct) ──
  if(isCorrect){
    const cat=state.categories.find(c=>c.id===_soloCurrentCat);
    if(cat){
      const supportedQs=(cat.questions||[]).filter(qq=>!SOLO_UNSUPPORTED_TYPES.includes(qq.type));
      const allComplete=supportedQs.every((qq,i)=>{
        const origIdx=cat.questions.indexOf(qq);
        const k=_soloLevelKey(cat.id,qq,origIdx);
        return state.soloProgress.levels[k]?.completed;
      });
      const anyWrong=supportedQs.some((qq,i)=>{
        const origIdx=cat.questions.indexOf(qq);
        const k=_soloLevelKey(cat.id,qq,origIdx);
        const lvl=state.soloProgress.levels[k];
        return lvl&&lvl.attempts>1&&!lvl.completed;
      });
      if(allComplete&&!anyWrong&&supportedQs.length>0){
        _checkAchievements({sectionPerfect:true});
      }
      // Check if section is now complete (all questions answered correctly at least once)
      var _sectionComplete=supportedQs.every(function(qq){
        var origIdx2=cat.questions.indexOf(qq);
        var k2=_soloLevelKey(cat.id,qq,origIdx2);
        return state.soloProgress.levels[k2]?.completed;
      });
      if(_sectionComplete&&supportedQs.length>0){
        // Flag that section was just completed — will be shown in stars overlay
        window._soloSectionJustCompleted=cat;
      }
    }
  }
  
  // Save progress
  _saveSoloProgress();
  
  // Show result overlay
  showSoloStarsOverlay(isCorrect, stars, timeUsed, q);
  
  // Highlight correct/wrong options
  document.querySelectorAll('.solo-q-option').forEach(btn=>{
    const idx=btn.dataset.idx;
    // For TF questions: q.correct=0 means "true", q.correct=1 means "false"
    // The buttons have data-idx="true" or data-idx="false"
    var correctIdx;
    if(q.type==='tf'){
      correctIdx=q.correct===0?'true':'false';
    }else{
      correctIdx=String(q.correct);
    }
    var answerIdx=q.type==='tf'?String(answer):String(answer);
    if(idx===correctIdx) btn.classList.add('solo-opt-correct');
    else if(idx===answerIdx&&!isCorrect) btn.classList.add('solo-opt-wrong');
    btn.disabled=true;
    btn.classList.remove('solo-opt-selected');
  });
}

function showSoloStarsOverlay(isCorrect, stars, timeUsed, q){
  const overlay=document.getElementById('solo-stars-overlay');
  if(!overlay) return;
  
  const heading=document.getElementById('solo-stars-heading');
  const star1=document.getElementById('solo-star-1');
  const star2=document.getElementById('solo-star-2');
  const star3=document.getElementById('solo-star-3');
  const pointsEl=document.getElementById('solo-points-earned');
  const timeEl=document.getElementById('solo-time-taken');
  
  // Reset star icons
  [star1,star2,star3].forEach(s=>{if(s){s.classList.remove('solo-star-earned');s.textContent='★';}});
  
  // Update action buttons based on result
  const actionsEl=overlay.querySelector('.solo-stars-actions');
  if(actionsEl){
    if(isCorrect){
      actionsEl.innerHTML=`<button class="solo-btn solo-btn-primary" onclick="soloNextLevel()" data-i18n="solo.nextLevel" disabled style="opacity:.5">${I18n.t('solo.nextLevel')}</button><button class="solo-btn solo-btn-ghost" onclick="soloReturnToMap()" data-i18n="solo.returnMap" disabled style="opacity:.5">${I18n.t('solo.returnMap')}</button>`;
      setTimeout(()=>{actionsEl.querySelectorAll('.solo-btn').forEach(b=>{b.disabled=false;b.style.opacity='';});_soloTransitioning=false;},400);
    }else{
      actionsEl.innerHTML=`<button class="solo-btn solo-btn-primary" onclick="playSoloLevel(_soloCurrentCat,_soloCurrentQIdx)" data-i18n="solo.retry" disabled style="opacity:.5">${I18n.t('solo.retry')}</button><button class="solo-btn solo-btn-ghost" onclick="soloReturnToMap()" data-i18n="solo.returnMap" disabled style="opacity:.5">${I18n.t('solo.returnMap')}</button>`;
      setTimeout(()=>{actionsEl.querySelectorAll('.solo-btn').forEach(b=>{b.disabled=false;b.style.opacity='';});_soloTransitioning=false;},400);
    }
  }
  
  // Show explanation if available
  const explEl=document.getElementById('solo-q-explanation');
  if(explEl){
    if(q.explanation){
      explEl.style.display='block';
      explEl.innerHTML=`<span class="solo-q-explanation-label">${I18n.t('solo.explanation')}</span>${_sanitize(q.explanation)}`;
    }else{
      explEl.style.display='none';
    }
  }
  
  if(isCorrect){
    if(heading){heading.textContent=I18n.t('solo.correct','إجابة صحيحة!');heading.style.color='';heading.classList.remove('solo-heading-wrong');}
    // Show section complete message if applicable
    if(window._soloSectionJustCompleted){
      var _compCat=window._soloSectionJustCompleted;
      window._soloSectionJustCompleted=null;
      if(heading) heading.textContent=I18n.t('solo.sectionComplete','أتممت القسم!')+' 🎉';
      // Add world complete badge
      var badge=document.createElement('div');
      badge.className='solo-overlay-world-badge';
      badge.style.cssText='text-align:center;margin-top:8px;padding:6px 14px;background:rgba(0,224,110,.1);border:1px solid rgba(0,224,110,.3);border-radius:20px;font-size:.8rem;color:#00e06e';
      badge.textContent='✓ '+_compCat.name;
      var scrollContent=overlay.querySelector('.solo-stars-scroll-content');
      if(scrollContent) scrollContent.appendChild(badge);
    }
    // Haptic feedback
    try{if(navigator.vibrate)navigator.vibrate(50);}catch(e){console.error("[Error]",e);}
    // Animate earned stars
    if(star1&&stars>=1) setTimeout(()=>star1.classList.add('solo-star-earned'),200);
    if(star2&&stars>=2) setTimeout(()=>star2.classList.add('solo-star-earned'),450);
    if(star3&&stars>=3) setTimeout(()=>star3.classList.add('solo-star-earned'),700);
    
    const pts=q.difficulty==='hard'?(state.settings.hardPoints||2):(state.settings.correctPoints||1);
    if(pointsEl) pointsEl.textContent='+'+pts;
    if(timeEl) timeEl.textContent=Math.round(timeUsed)+'s';
  } else {
    if(heading){
      heading.textContent=_soloTimedOut?I18n.t('solo.timesUp'):I18n.t('solo.wrong');
      heading.style.color='';
      heading.classList.add('solo-heading-wrong');
    }
    // Haptic feedback - double pulse for wrong
    try{if(navigator.vibrate)navigator.vibrate([100,50,100]);}catch(e){console.error("[Error]",e);}
    // Show 0 stars (keep empty stars, don't show X)
    if(pointsEl) pointsEl.textContent=I18n.t('solo.tryAgain','حاول مرة أخرى');
    if(timeEl) timeEl.textContent=Math.round(timeUsed)+'s';
  }
  
  overlay.classList.add('solo-overlay-visible');
  // Show report button
  var reportBtnWrap=document.getElementById('solo-report-btn-wrap');
  if(reportBtnWrap)reportBtnWrap.style.display='block';
  
  // Check if game is complete
  if(isCorrect && isSoloGameComplete()){
    setTimeout(()=>showSoloVictory(),2000);
  }
  // Check if world is complete (but game isn't) — show a special badge
  if(isCorrect && !isSoloGameComplete() && isWorldComplete(_soloCurrentCat)){
    const cat=state.categories.find(c=>c.id===_soloCurrentCat);
    if(cat){
      const worldBadge=document.createElement('div');
      worldBadge.className='solo-overlay-world-badge';
      worldBadge.style.cssText='position:absolute;top:12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#f5c842,#ff9100);color:#000;font-size:.78rem;font-weight:900;padding:4px 14px;border-radius:20px;z-index:2;animation:solo-victory-pop .5s both;white-space:nowrap';
      worldBadge.textContent=I18n.t('solo.worldComplete','عالم مكتمل!') + ' ' + (cat.name||'');
      overlay.style.position='relative';
      overlay.appendChild(worldBadge);
      try{if(navigator.vibrate)navigator.vibrate([50,50,100]);}catch(e){console.error("[Error]",e);}
    }
  }
}

function soloNextLevel(){
  // Difficulty filter helper (matches _diffMatch from renderSoloMap)
  var _soloDiffFilter=function(q){var d=_soloSettings.difficulty||'all';return d==='all'||(q.difficulty||'easy')===d;};
  // Guard against rapid/double clicks — use a lock to prevent race conditions
  if(_soloTransitioning) return;
  _soloTransitioning=true;
  
  // Ensure progress is saved atomically before navigating
  try{
    _saveSoloProgress();
    saveState();
  }catch(e){console.error('[soloNextLevel] save error:',e);}
  
  // Hide stars overlay before navigating
  const starsOverlay=document.getElementById('solo-stars-overlay');
  if(starsOverlay) starsOverlay.classList.remove('solo-overlay-visible');
  // Remove any world-complete badges that might have been appended
  const badges=document.querySelectorAll('#solo-stars-overlay > .solo-overlay-world-badge');
  badges.forEach(b=>b.remove());
  
  const cats=getPlayableCats({all:true});
  const catIdx=cats.findIndex(c=>c.id===_soloCurrentCat);
  
  // Try next supported question in same category
  if(catIdx>=0){
    const cat=cats[catIdx];
    for(let i=_soloCurrentQIdx+1;i<(cat.questions?.length||0);i++){
      var _q=cat.questions[i];
      if(!SOLO_UNSUPPORTED_TYPES.includes(_q.type)&&_soloDiffFilter(_q)){
        playSoloLevel(_soloCurrentCat,i);
        // Keep _soloTransitioning=true until playSoloLevel sets it to false
        return;
      }
    }
  }
  
  // Try first supported question of next world
  if(catIdx>=0&&catIdx<cats.length-1){
    for(let ci=catIdx+1;ci<cats.length;ci++){
      const nextCat=cats[ci];
      if(!isWorldUnlocked(ci)) break;
      for(let i=0;i<(nextCat.questions?.length||0);i++){
        var _nq=nextCat.questions[i];
        if(!SOLO_UNSUPPORTED_TYPES.includes(_nq.type)&&_soloDiffFilter(_nq)){
          playSoloLevel(nextCat.id,i);
          // Keep _soloTransitioning=true until playSoloLevel sets it to false
          return;
        }
      }
    }
  }
  
  // No more levels — go back to map
  _soloTransitioning=false;
  backToSoloMap();
}

function backToSoloMap(){
  clearSoloTimer();
  _soloAnswered=false;
  _soloSelectedAnswer=null;
  _soloTimedOut=false;
  _soloTransitioning=false;
  const starsOverlay=document.getElementById('solo-stars-overlay');
  if(starsOverlay) starsOverlay.classList.remove('solo-overlay-visible');
  showView('solo-map');
  renderSoloMap();
}

// ── Custom confirm dialog for solo mode ──
let _soloConfirmResolver=null;
function soloCustomConfirm(message){
  return new Promise(resolve=>{
    _soloConfirmResolver=resolve;
    const dialog=document.getElementById('solo-confirm-dialog');
    const textEl=document.getElementById('solo-confirm-text');
    const yesBtn=document.getElementById('solo-confirm-yes');
    const noBtn=document.getElementById('solo-confirm-no');
    if(!dialog||!textEl||!yesBtn||!noBtn){resolve(false);return;}
    // Set onclick handlers BEFORE I18n.apply() so they are not lost if I18n rebuilds elements
    yesBtn.onclick=()=>{dialog.classList.remove('solo-overlay-visible');_soloConfirmResolver=null;resolve(true);};
    noBtn.onclick=()=>{dialog.classList.remove('solo-overlay-visible');_soloConfirmResolver=null;resolve(false);};
    // Reject promise when user clicks outside the dialog (on the overlay background)
    dialog.onclick=(e)=>{if(e.target===dialog){dialog.classList.remove('solo-overlay-visible');_soloConfirmResolver=null;resolve(false);}};
    textEl.textContent=message;
    // Apply i18n after handlers are set — only updates text, not onclick
    try{I18n.apply();}catch(e){console.error("[Error]",e);}
    dialog.classList.add('solo-overlay-visible');
  });
}

// Alias used by HTML onclick handlers
async function soloReturnToMap(){
  // Confirm before leaving if a question is active and not yet answered
  if(!_soloAnswered && _soloCurrentCat){
    const ok=await soloCustomConfirm(I18n.t('solo.confirmLeave','هل تريد الخروج؟'));
    if(!ok) return;
  }
  backToSoloMap();
}

// ── Keyboard shortcuts for solo mode ──
document.addEventListener('keydown',function(e){
  // Only active when solo question is visible and not answered
  const soloQ=document.getElementById('view-solo-question');
  if(!soloQ||soloQ.classList.contains('hidden')) return;
  if(_soloAnswered) return;
  
  const options=document.querySelectorAll('.solo-q-option');
  if(!options.length) return;
  
  // Number keys 1-9, English letters A-I, or Arabic letters أ-د and beyond to select options
  let idx=-1;
  if(e.key>='1'&&e.key<='9') idx=parseInt(e.key)-1;
  else if(e.key==='a'||e.key==='A') idx=0;
  else if(e.key==='b'||e.key==='B') idx=1;
  else if(e.key==='c'||e.key==='C') idx=2;
  else if(e.key==='d'||e.key==='D') idx=3;
  else if(e.key==='e'||e.key==='E') idx=4;
  else if(e.key==='f'||e.key==='F') idx=5;
  else if(e.key==='g'||e.key==='G') idx=6;
  else if(e.key==='h'||e.key==='H') idx=7;
  else if(e.key==='i'||e.key==='I') idx=8;
  // Arabic letter shortcuts (أ، ب، ج، د، هـ، و، ز، ح، ط)
  else if(e.key==='أ'||e.key==='ا') idx=0;
  else if(e.key==='ب') idx=1;
  else if(e.key==='ج') idx=2;
  else if(e.key==='د') idx=3;
  else if(e.key==='ه'||e.key==='هـ') idx=4;
  else if(e.key==='و') idx=5;
  else if(e.key==='ز') idx=6;
  else if(e.key==='ح') idx=7;
  else if(e.key==='ط') idx=8;
  
  if(idx>=0&&idx<options.length){
    e.preventDefault();
    options[idx].click();
    // Haptic feedback on selection
    try{if(navigator.vibrate)navigator.vibrate(10);}catch(ex){console.error("[Error]",ex);}
    return;
  }
  
  // Enter to confirm
  if(e.key==='Enter'){
    e.preventDefault();
    confirmSoloAnswer();
    return;
  }
  
  // Escape to return to map
  if(e.key==='Escape'){
    e.preventDefault();
    soloReturnToMap();
    return;
  }
});

function showSoloVictory(){
  const overlay=document.getElementById('solo-victory-overlay');
  if(!overlay) return;
  
  const prog=state.soloProgress;
  const pct=prog.totalLevels>0?Math.round(prog.completedLevels/prog.totalLevels*100):0;
  
  const totalStarsEl=document.getElementById('solo-v-total-stars');
  const completionEl=document.getElementById('solo-v-completion');
  const totalTimeEl=document.getElementById('solo-v-total-time');
  
  if(totalStarsEl) totalStarsEl.textContent='⭐ '+prog.totalStars+'/'+(prog.totalLevels*3);
  if(completionEl) completionEl.textContent=pct+'%';
  if(totalTimeEl){
    const totalSec=Math.round((Date.now()-(prog.startTime||Date.now()))/1000);
    const min=Math.floor(totalSec/60);
    const sec=totalSec%60;
    totalTimeEl.textContent=min+':'+(sec<10?'0':'')+sec;
  }
  
  overlay.classList.add('solo-overlay-visible');
  // Trigger confetti animation
  if(typeof soloConfetti==='function') soloConfetti();
  // Show nickname form for leaderboard
  try{
    const nickForm=document.getElementById('solo-nickname-form');
    if(nickForm)nickForm.style.display='block';
    const nickInput=document.getElementById('solo-nickname-input');
    if(nickInput)nickInput.value='';
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_107")}catch(_){}}
  // Show achievements earned in this session
  var achEl=document.getElementById('solo-v-achievements');
  if(achEl){
    _initAchievementTracking();
    var achData=state.soloProgress.achievements||{};
    var unlocked=ACHIEVEMENTS.filter(function(a){return achData[a.id];});
    if(unlocked.length>0){
      achEl.innerHTML='<div style="font-size:.85rem;color:#ff9800;margin-bottom:6px">🏆 '+I18n.t('achievement.unlockedCount','الإنجازات المفتوحة')+' ('+unlocked.length+'/'+ACHIEVEMENTS.length+')</div><div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">'+unlocked.map(function(a){return '<span style="font-size:1.3rem" title="'+_sanitize(a.desc)+'">'+_sanitizeIcon(a.icon)+'</span>';}).join('')+'</div>';
    }else{
      achEl.innerHTML='';
    }
  }
  // Prompt for leaderboard nickname
  _showLeaderboardPrompt();
}

function closeSoloVictory(){
  const overlay=document.getElementById('solo-victory-overlay');
  if(overlay) overlay.classList.remove('solo-overlay-visible');
  backToSoloMap();
}

function soloGoHome(){
  clearSoloTimer();
  const victoryOverlay=document.getElementById('solo-victory-overlay');
  if(victoryOverlay) victoryOverlay.classList.remove('solo-overlay-visible');
  const starsOverlay=document.getElementById('solo-stars-overlay');
  if(starsOverlay) starsOverlay.classList.remove('solo-overlay-visible');
  const settingsPanel=document.getElementById('solo-settings-panel');
  if(settingsPanel) settingsPanel.classList.remove('solo-overlay-visible');
  // V15-fix: Navigate to solo-map instead of login for better UX
  // Solo players shouldn't need to re-enter password every time they go "home"
  try{
    if(state&&state.settings&&state.settings.pwLevel==='none'){
      showView('intro');
    }else{
      showView('solo-map');
    }
  }catch(e){showView('solo-map');}
}

// ════════════════════════════════════════════════════════
//  TASK 2: Solo Mode Feature Enhancements
// ════════════════════════════════════════════════════════

// ── Feature 1: Retry Question ──
function soloRetryQuestion(){
  if(_soloTransitioning) return;
  _soloAnswered=false;
  _soloTransitioning=true;
  const starsOverlay=document.getElementById('solo-stars-overlay');
  if(starsOverlay) starsOverlay.classList.remove('solo-overlay-visible');
  // Remove any world-complete badges
  document.querySelectorAll('#solo-stars-overlay > .solo-overlay-world-badge').forEach(function(b){b.remove();});
  playSoloLevel(_soloCurrentCat,_soloCurrentQIdx);
}

// ── Feature 3: Solo Settings Panel ──
// Unified: _soloSettings is now a proxy that syncs with state.settings
// This ensures there is a single source of truth for all settings
var _soloSettings={
  muted:false,
  reducedEffects:false,
  difficulty:'all',
  fullscreen:false
};

// Migration: load old solo_settings from localStorage and merge into state.settings
// Then sync from state.settings back to _soloSettings (state.settings is the source of truth)
function _syncSoloSettingsFromState(){
  if(typeof state==='undefined'||!state||!state.settings) return;
  _soloSettings.muted=state.settings.soloMuted||false;
  _soloSettings.reducedEffects=state.settings.soloReducedEffects||false;
  _soloSettings.difficulty=state.settings.soloDifficulty||'all';
  _soloSettings.fullscreen=state.settings.soloFullscreen||false;
}

function _syncSoloSettingsToState(){
  if(typeof state==='undefined'||!state||!state.settings) return;
  state.settings.soloMuted=_soloSettings.muted;
  state.settings.soloReducedEffects=_soloSettings.reducedEffects;
  state.settings.soloDifficulty=_soloSettings.difficulty;
  state.settings.soloFullscreen=_soloSettings.fullscreen;
}

// On initial load: migrate old localStorage data, then sync from state
(function _migrateSoloSettings(){
  try{
    var oldData=localStorage.getItem('solo_settings');
    if(oldData){
      var old=JSON.parse(oldData);
      // Migrate old data to state.settings (will be applied when state loads)
      if(old.muted!==undefined) _soloSettings.muted=old.muted;
      if(old.reducedEffects!==undefined) _soloSettings.reducedEffects=old.reducedEffects;
      if(old.difficulty!==undefined) _soloSettings.difficulty=old.difficulty;
      if(old.fullscreen!==undefined) _soloSettings.fullscreen=old.fullscreen;
      // Remove old key after migration
      localStorage.removeItem('solo_settings');
    }
  }catch(e){_logErr(e,'localStorage:migrateSoloSettings')}
})();

function _saveSoloSettings(){
  // Sync to state.settings first, then save state
  _syncSoloSettingsToState();
  try{saveState();}catch(e){_logErr(e,'saveSoloSettings')}
}

function toggleSoloMapSettings(){
  // Unify: delegate to the main solo settings panel
  toggleSoloSettings();
}

function toggleSoloSettings(){
  var panel=document.getElementById('solo-settings-panel');
  if(!panel) return;
  var isVisible=panel.classList.contains('solo-overlay-visible');
  if(isVisible){
    panel.classList.remove('solo-overlay-visible');
  }else{
    // Sync UI with current settings state
    var muteBtn=document.getElementById('solo-settings-mute');
    if(muteBtn) muteBtn.classList.toggle('active',_soloSettings.muted);
    var effectsBtn=document.getElementById('solo-settings-reduced-effects');
    if(effectsBtn) effectsBtn.classList.toggle('active',_soloSettings.reducedEffects);
    var diffSel=document.getElementById('solo-settings-difficulty');
    if(diffSel) diffSel.value=_soloSettings.difficulty||'all';
    var fsBtn=document.getElementById('solo-settings-fullscreen');
    if(fsBtn) fsBtn.classList.toggle('active',_soloSettings.fullscreen||false);
    // Sync bg music toggle
    var bgMusicBtn=document.getElementById('solo-settings-bgmusic');
    if(bgMusicBtn) bgMusicBtn.classList.toggle('active',state.settings.soloBgMusic!==false);
    // Sync new map options toggles
    var reviewBtn=document.getElementById('solo-settings-show-review');
    if(reviewBtn) reviewBtn.classList.toggle('active',state.settings.showSoloReview===true);
    var quickSetupBtn=document.getElementById('solo-settings-show-quicksetup');
    if(quickSetupBtn) quickSetupBtn.classList.toggle('active',state.settings.showSoloQuickSetup===true);
    var timerBtn=document.getElementById('solo-settings-timer-enabled');
    if(timerBtn) timerBtn.classList.toggle('active',state.settings.soloTimerEnabled!==false);
    // Sync font scale slider
    var fontSlider=document.getElementById('solo-settings-font-slider');
    var fontVal=document.getElementById('solo-settings-font-val');
    var currentFontScale=state.settings.fontScale||100;
    if(fontSlider) fontSlider.value=currentFontScale;
    if(fontVal) fontVal.textContent=currentFontScale+'%';
    panel.classList.add('solo-overlay-visible');
  }
}

// Toggle a map option that also controls a button visibility
function toggleSoloMapOption(key,btnId,mapBtnId){
  state.settings[key]=!state.settings[key];
  var btn=document.getElementById(btnId);
  if(btn) btn.classList.toggle('active',state.settings[key]);
  saveState();
  // Update corresponding map button visibility
  var mapBtn=document.getElementById(mapBtnId);
  if(mapBtn) mapBtn.style.display=state.settings[key]?'':'none';
}

// Toggle a simple map option (no button visibility)
function toggleSoloMapOptionSimple(key,btnId){
  state.settings[key]=!state.settings[key];
  var btn=document.getElementById(btnId);
  if(btn) btn.classList.toggle('active',state.settings[key]);
  saveState();
}

function toggleSoloMute(){
  _soloSettings.muted=!_soloSettings.muted;
  var btn=document.getElementById('solo-settings-mute');
  if(btn) btn.classList.toggle('active',_soloSettings.muted);
  // Stop all currently playing sounds if muted
  if(_soloSettings.muted){
    // Stop solo audio element
    if(typeof _soloAudioEl!=='undefined'&&_soloAudioEl){
      try{_soloAudioEl.pause();}catch(e){}
    }
    // Stop effect sounds
    try{stopEffectSound();}catch(e){}
    // Stop tense music
    if(typeof window._tenseAudioEl!=='undefined'&&window._tenseAudioEl){
      try{window._tenseAudioEl.pause();window._tenseAudioEl.currentTime=0;}catch(e){}
    }
    // Stop background music if in solo mode
    if(typeof window._currentView!=='undefined'&&window._currentView&&window._currentView.startsWith('solo')){
      try{stopMusic();}catch(e){}
    }
  }
  // When unmuting and soloBgMusic is enabled, start background music if in solo mode
  if(!_soloSettings.muted&&state.settings.soloBgMusic!==false){
    var _inSolo=window._currentView&&window._currentView.startsWith('solo');
    if(_inSolo&&!state.musicPlaying){
      try{startMusic(state.settings.musicType||'builtin');}catch(e){}
    }
  }
  _saveSoloSettings();
}

function toggleSoloBgMusic(){
  state.settings.soloBgMusic=!state.settings.soloBgMusic;
  var btn=document.getElementById('solo-settings-bgmusic');
  if(btn) btn.classList.toggle('active',state.settings.soloBgMusic);
  // Start or stop music immediately
  if(state.settings.soloBgMusic&&!_soloSettings.muted){
    if(!state.musicPlaying){try{startMusic(state.settings.musicType||'builtin');}catch(e){}}
  }else{
    if(state.musicPlaying){try{stopMusic();}catch(e){}}
  }
  saveState();
}

function setSoloDifficulty(val){
  _soloSettings.difficulty=val||'all';
  _saveSoloSettings();
  // Re-render the solo map to apply the difficulty filter
  try{renderSoloMap();}catch(e){}
  try{updateSoloProgressBar();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_109")}catch(_){}}
}

function toggleSoloReducedEffects(){
  _soloSettings.reducedEffects=!_soloSettings.reducedEffects;
  var btn=document.getElementById('solo-settings-reduced-effects');
  if(btn) btn.classList.toggle('active',_soloSettings.reducedEffects);
  // Apply/remove reduced effects class
  var container=document.getElementById('solo-question-container');
  if(container){
    container.classList.toggle('solo-reduced-effects',_soloSettings.reducedEffects);
  }
  _saveSoloSettings();
}

function updateSoloQuestionLibrary(){
  // Reload BUILTIN_LIBRARY into state.categories if available
  try{
    if(typeof BUILTIN_LIBRARY!=='undefined'&&BUILTIN_LIBRARY&&BUILTIN_LIBRARY.length>0){
      // Only add categories that don't already exist
      var existingIds=(state.categories||[]).map(function(c){return c.id;});
      var added=0;
      BUILTIN_LIBRARY.forEach(function(cat){
        if(!existingIds.includes(cat.id)){
          state.categories.push(JSON.parse(JSON.stringify(cat)));
          added++;
        }
      });
      if(added>0){
        saveState();
        toast(I18n.t('solo.updateLibSuccess','تم تحديث المكتبة بنجاح')+' (+'+added+')','success');
      }else{
        toast(I18n.t('solo.updateLibSuccess','المكتبة محدثة بالفعل'),'info');
      }
    }else{
      toast(I18n.t('solo.updateLibNoData','لا توجد مكتبة مدمجة للتحديث'),'error');
    }
  }catch(e){
    console.error('[updateSoloQuestionLibrary]',e);
    toast(t('toast.updateError'),'error');
  }
}

function addOfflineQuestionBank(){
  try{
    var input=document.createElement('input');
    input.type='file';
    input.accept='.json';
    input.onchange=function(e){
      var file=e.target.files[0];
      if(!file)return;
      var reader=new FileReader();
      reader.onload=function(ev){
        try{
          var data=JSON.parse(ev.target.result);
          if(!Array.isArray(data)){
            // Try wrapping if it's a single category object
            if(data&&data.id&&data.questions)data=[data];
            else{toast(t('toast.importBadFormat'),'danger');return;}
          }
          var existingIds=(state.categories||[]).map(function(c){return c.id;});
          var added=0;
          data.forEach(function(cat){
            if(cat&&cat.id&&!existingIds.includes(cat.id)){
              state.categories.push(JSON.parse(JSON.stringify(cat)));
              existingIds.push(cat.id);
              added++;
            }
          });
          if(added>0){
            saveState();
            toast(t('toast.importSuccess',{n:added}),'success');
          }else{
            toast(t('toast.importDuplicate'),'info');
          }
        }catch(err){
          console.error('[addOfflineQuestionBank] Parse error:',err);
          toast(t('toast.importJsonError'),'danger');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }catch(e){
    console.error('[addOfflineQuestionBank]',e);
    toast(t('toast.importFileError'),'danger');
  }
}

// ── Feature 4: Multi-Layer Progress Bar ──
function updateSoloProgressBar(){
  try{
    var cats=state.categories.filter(function(c){return c.type!=='tiebreaker';});
    // Count total supported questions across all categories
    var totalQs=0,answeredQs=0,correctQs=0,wrongQs=0;
    var sectionTotal=0,sectionAnswered=0,sectionCorrect=0,sectionWrong=0;

    cats.forEach(function(cat){
      var supportedQs=(cat.questions||[]).filter(function(q){return !SOLO_UNSUPPORTED_TYPES.includes(q.type);});
      totalQs+=supportedQs.length;
      supportedQs.forEach(function(q,i){
        var idx=cat.questions.indexOf(q);
        var lvlKey=_soloLevelKey(cat.id,q,idx);
        var lvl=state.soloProgress.levels[lvlKey];
        if(lvl&&lvl.completed){
          answeredQs++;
          if(lvl.attempts<=1) correctQs++; else { correctQs++; wrongQs+=(lvl.attempts-1); }
        }else if(lvl&&lvl.attempts>0){
          wrongQs+=lvl.attempts;
          answeredQs++;
        }
        // Section-specific counts
        if(cat.id===_soloCurrentCat){
          sectionTotal++;
          if(lvl&&lvl.completed) sectionAnswered++;
          if(lvl&&lvl.attempts>0&&!lvl.completed) sectionAnswered++;
          if(lvl&&lvl.completed) sectionCorrect++;
          if(lvl&&lvl.attempts>0&&!lvl.completed) sectionWrong+=lvl.attempts;
        }
      });
    });

    // Overall progress
    var overallPct=totalQs>0?(answeredQs/totalQs*100):0;
    var overallEl=document.getElementById('solo-prog-overall');
    if(overallEl) overallEl.style.width=overallPct+'%';
    var overallVal=document.getElementById('solo-prog-val-overall');
    if(overallVal) overallVal.textContent=answeredQs+'/'+totalQs;

    // Section progress
    var sectionPct=sectionTotal>0?(sectionAnswered/sectionTotal*100):0;
    var sectionEl=document.getElementById('solo-prog-section');
    if(sectionEl) sectionEl.style.width=sectionPct+'%';
    var sectionVal=document.getElementById('solo-prog-val-section');
    if(sectionVal) sectionVal.textContent=sectionAnswered+'/'+sectionTotal;

    // Correct/Wrong
    var totalAttempts=correctQs+wrongQs;
    var correctPct=totalAttempts>0?(correctQs/totalAttempts*100):0;
    var wrongPct=totalAttempts>0?(wrongQs/totalAttempts*100):0;
    var correctEl=document.getElementById('solo-prog-correct');
    if(correctEl) correctEl.style.width=correctPct+'%';
    var wrongEl=document.getElementById('solo-prog-wrong');
    if(wrongEl) wrongEl.style.width=wrongPct+'%';
    var cwVal=document.getElementById('solo-prog-val-cw');
    if(cwVal) cwVal.textContent=correctQs+'/'+wrongQs;

    // Jeopardy/difficulty progress (show in certain modes)
    var cat=state.categories.find(function(c){return c.id===_soloCurrentCat;});
    if(cat){
      var diffCounts={easy:0,medium:0,hard:0};
      var supportedQs=(cat.questions||[]).filter(function(q){return !SOLO_UNSUPPORTED_TYPES.includes(q.type);});
      supportedQs.forEach(function(q){var d=q.difficulty||'easy';diffCounts[d]=(diffCounts[d]||0)+1;});
      var diffCompleted={easy:0,medium:0,hard:0};
      supportedQs.forEach(function(q,i){
        var idx=cat.questions.indexOf(q);
        var lvlKey=_soloLevelKey(cat.id,q,idx);
        var lvl=state.soloProgress.levels[lvlKey];
        if(lvl&&lvl.completed){diffCompleted[q.difficulty||'easy']++;}
      });
      var totalDiff=diffCounts.easy+diffCounts.medium+diffCounts.hard;
      var completedDiff=diffCompleted.easy+diffCompleted.medium+diffCompleted.hard;
      var diffPct=supportedQs.length>0?(completedDiff/supportedQs.length*100):0;
      var jeopardyEl=document.getElementById('solo-prog-jeopardy');
      if(jeopardyEl) jeopardyEl.style.width=diffPct+'%';
      var jeopardyVal=document.getElementById('solo-prog-val-jeopardy');
      if(jeopardyVal) jeopardyVal.textContent=completedDiff+'/'+supportedQs.length;
      // Show jeopardy row if difficulty filter is set (not 'all')
      var jRow=document.getElementById('solo-prog-jeopardy-row');
      if(jRow&&_soloSettings.difficulty&&_soloSettings.difficulty!=='all'){
        jRow.style.display='flex';
      }
    }
  }catch(e){console.error('[updateSoloProgressBar]',e);}
}

// ── Feature 5: Visual Effects ──
function _isReducedEffects(){
  return _soloSettings.reducedEffects||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

function spawnParticleBurst(element,color){
  if(_isReducedEffects()) return;
  try{
    var rect=element.getBoundingClientRect();
    var cx=rect.left+rect.width/2;
    var cy=rect.top+rect.height/2;
    var container=document.createElement('div');
    container.className='solo-particles-container';
    container.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);
    var particleColors=[color||'#00e06e','#f5c842','#00e8d0','#60a5fa'];
    for(var i=0;i<18;i++){
      var p=document.createElement('div');
      p.className='solo-particle';
      var angle=Math.random()*Math.PI*2;
      var dist=40+Math.random()*80;
      var px=Math.cos(angle)*dist;
      var py=Math.sin(angle)*dist;
      p.style.cssText='left:'+(cx-4)+'px;top:'+(cy-4)+'px;width:'+(4+Math.random()*6)+'px;height:'+(4+Math.random()*6)+'px;background:'+particleColors[i%particleColors.length]+';--px:'+px+'px;--py:'+py+'px;';
      container.appendChild(p);
    }
    setTimeout(function(){if(container.parentNode)container.parentNode.removeChild(container);},1000);
  }catch(e){console.error('[spawnParticleBurst]',e);}
}

function spawnRippleEffect(element){
  if(_isReducedEffects()) return;
  try{
    var rect=element.getBoundingClientRect();
    var cx=rect.left+rect.width/2;
    var cy=rect.top+rect.height/2;
    var ripple=document.createElement('div');
    ripple.className='solo-ripple';
    ripple.style.cssText='position:fixed;left:'+cx+'px;top:'+cy+'px;pointer-events:none;z-index:9999;';
    document.body.appendChild(ripple);
    setTimeout(function(){if(ripple.parentNode)ripple.parentNode.removeChild(ripple);},700);
  }catch(e){console.error('[spawnRippleEffect]',e);}
}

function applyZoomPulse(element){
  if(_isReducedEffects()) return;
  try{
    element.classList.remove('solo-zoom-pulse');
    void element.offsetWidth; // force reflow
    element.classList.add('solo-zoom-pulse');
    setTimeout(function(){element.classList.remove('solo-zoom-pulse');},600);
  }catch(e){console.error('[applyZoomPulse]',e);}
}

// ── Score bar with animated counter ──
var _soloCurrentScore=0;
function updateSoloScoreBar(newScore){
  try{
    var scoreEl=document.getElementById('solo-score-bar-val');
    if(!scoreEl) return;
    if(typeof newScore==='undefined'){
      // Calculate total score from progress
      var total=0;
      Object.values(state.soloProgress.levels).forEach(function(l){
        if(l.completed) total+=(l.stars||0);
      });
      newScore=total;
    }
    _soloCurrentScore=newScore;
    scoreEl.textContent=newScore;
    scoreEl.classList.add('bump');
    setTimeout(function(){scoreEl.classList.remove('bump');},500);
  }catch(e){console.error('[updateSoloScoreBar]',e);}
}

// ── Override showSoloStarsOverlay to use 3-button layout and visual effects ──
// Patch: Replace the actions innerHTML generation in showSoloStarsOverlay
var _origShowSoloStarsOverlay=showSoloStarsOverlay;
showSoloStarsOverlay=function(isCorrect,stars,timeUsed,q){
  // Call original function
  _origShowSoloStarsOverlay(isCorrect,stars,timeUsed,q);

  // Update the actions to always show 3 buttons
  var actionsEl=document.getElementById('solo-stars-actions');
  if(actionsEl){
    actionsEl.innerHTML=
      '<button class="solo-btn solo-btn-primary" onclick="soloNextLevel()" data-i18n="solo.next" disabled style="opacity:.5">'+I18n.t('solo.next','التالي')+'</button>'+
      '<button class="solo-btn solo-btn-ghost" onclick="soloReturnToMap()" data-i18n="solo.returnMap" disabled style="opacity:.5">'+I18n.t('solo.returnMap','العودة للخريطة')+'</button>'+
      '<button class="solo-btn solo-btn-ghost" onclick="soloRetryQuestion()" data-i18n="solo.retryQuestion" disabled style="opacity:.5;border-color:rgba(255,145,0,.3);color:#ff9100">'+I18n.t('solo.retryQuestion','إعادة السؤال')+'</button>';
    setTimeout(function(){
      actionsEl.querySelectorAll('.solo-btn').forEach(function(b){b.disabled=false;b.style.opacity='';});
      _soloTransitioning=false;
    },400);
  }

  // Apply visual effects on answer reveal
  if(!_isReducedEffects()){
    try{
      var correctBtn=null,wrongBtn=null;
      document.querySelectorAll('.solo-q-option').forEach(function(btn){
        var idx=btn.dataset.idx;
        if(idx===String(q.correct)) correctBtn=btn;
        else if(idx===String(_soloSelectedAnswer)&&!isCorrect) wrongBtn=btn;
      });
      if(correctBtn){
        spawnParticleBurst(correctBtn,'#00e06e');
        applyZoomPulse(correctBtn);
      }
      if(wrongBtn){
        spawnRippleEffect(wrongBtn);
      }
    }catch(e){console.error('[visual effects]',e);}
  }

  // Update score bar
  var pts=isCorrect?(q.difficulty==='hard'?(state.settings.hardPoints||2):(state.settings.correctPoints||1)):0;
  var newTotal=_soloCurrentScore+pts;
  updateSoloScoreBar(newTotal);

  // Update progress bar
  updateSoloProgressBar();
};

// ── Override renderSoloQuestion to add progress bar update, score bar, and reduced effects ──
var _origRenderSoloQuestion=renderSoloQuestion;
renderSoloQuestion=function(cat,q,qIdx){
  _origRenderSoloQuestion(cat,q,qIdx);
  // Update progress bar
  updateSoloProgressBar();
  // Update score bar
  updateSoloScoreBar();
  // Apply reduced effects class
  var container=document.getElementById('solo-question-container');
  if(container){
    container.classList.toggle('solo-reduced-effects',_soloSettings.reducedEffects);
  }
  // Show/hide settings button based on current state
  var settingsGear=document.getElementById('solo-settings-gear');
  if(settingsGear) settingsGear.style.display='flex';
  // Show/hide fullscreen button
  var fsBtn=document.getElementById('solo-fullscreen-btn');
  if(fsBtn) fsBtn.style.display='flex';
  // Hide post-answer buttons (fresh question)
  var postAnswer=document.getElementById('solo-post-answer');
  if(postAnswer) postAnswer.style.display='none';
  // Restore fullscreen state
  if(_soloSettings.fullscreen){
    container.classList.add('solo-question-fullscreen');
    fsBtn.classList.add('active');
  }
  // Focus first option for keyboard accessibility
  try{var _firstOpt=document.querySelector('.solo-q-option');if(_firstOpt)_firstOpt.focus();}catch(e){}
};

// ════════════════════════════════════════════════════════
//  TASK 2a: Enhanced Solo Mode Features - JavaScript
// ════════════════════════════════════════════════════════

// ── Feature 1: Enhanced Post-Answer Actions ──
// Override showSoloStarsOverlay to show enhanced post-answer buttons + visual effects
(function(){
  var _prevShowSoloStarsOverlay=showSoloStarsOverlay;
  showSoloStarsOverlay=function(isCorrect,stars,timeUsed,q){
    // Call previous version
    _prevShowSoloStarsOverlay(isCorrect,stars,timeUsed,q);

    // Show enhanced post-answer buttons
    var postAnswer=document.getElementById('solo-post-answer');
    var legacyActions=document.getElementById('solo-stars-actions');
    if(postAnswer){
      // Update button states based on result
      var nextBtn=document.getElementById('btn-solo-next-2');
      var mapBtn=document.getElementById('btn-solo-return-map-2');
      var retryBtn=document.getElementById('btn-solo-retry-2');
      if(isCorrect){
        if(nextBtn){nextBtn.style.display='';nextBtn.textContent='▶ التالي';}
        if(retryBtn) retryBtn.style.display=''; // Always show retry
      }else{
        if(nextBtn){nextBtn.style.display='';nextBtn.textContent='▶ التالي';} // Allow skipping wrong answers
        if(retryBtn){retryBtn.style.display='';}
      }
      postAnswer.style.display='flex';
      // Disable briefly to prevent accidental taps
      postAnswer.querySelectorAll('.solo-post-btn').forEach(function(b){b.disabled=true;b.style.opacity='.5';});
      setTimeout(function(){
        postAnswer.querySelectorAll('.solo-post-btn').forEach(function(b){b.disabled=false;b.style.opacity='';});
      },500);
    }
    // Hide legacy actions to avoid duplicate buttons
    if(legacyActions) legacyActions.style.display='none';

    // Apply enhanced visual effects
    if(!_isReducedEffects()){
      try{
        var correctBtn=null,wrongBtn=null;
        document.querySelectorAll('.solo-q-option').forEach(function(btn){
          var idx=btn.dataset.idx;
          if(idx===String(q.correct)) correctBtn=btn;
          else if(idx===String(_soloSelectedAnswer)&&!isCorrect) wrongBtn=btn;
        });
        if(isCorrect&&correctBtn){
          spawnAnswerParticleBurst(correctBtn,'#00e06e');
          correctBtn.classList.add('answer-zoom-pulse');
          correctBtn.classList.add('answer-glow-ring');
          setTimeout(function(){
            correctBtn.classList.remove('answer-zoom-pulse');
            correctBtn.classList.remove('answer-glow-ring');
          },1000);
        }
        if(!isCorrect&&wrongBtn){
          spawnAnswerRipple(wrongBtn);
          wrongBtn.classList.add('answer-shake');
          setTimeout(function(){wrongBtn.classList.remove('answer-shake');},600);
        }
      }catch(e){console.error('[enhanced visual effects]',e);}
    }

    // Update progress bar (with accuracy)
    updateSoloProgressBar();
  };
})();

// ── Feature 2: Enhanced Visual Effects (answer-particle, answer-ripple, answer-zoom-pulse) ──
function spawnAnswerParticleBurst(element,color){
  if(_isReducedEffects()) return;
  try{
    var rect=element.getBoundingClientRect();
    var cx=rect.left+rect.width/2;
    var cy=rect.top+rect.height/2;
    var container=document.createElement('div');
    container.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);
    var particleColors=[color||'#00e06e','#f5c842','#00e8d0','#60a5fa','#a259ff'];
    for(var i=0;i<24;i++){
      var p=document.createElement('div');
      p.className='answer-particle';
      var angle=Math.random()*Math.PI*2;
      var dist=50+Math.random()*100;
      var px=Math.cos(angle)*dist;
      var py=Math.sin(angle)*dist;
      var rot=Math.round(Math.random()*360);
      var size=3+Math.random()*8;
      p.style.cssText='left:'+(cx-size/2)+'px;top:'+(cy-size/2)+'px;width:'+size+'px;height:'+size+'px;background:'+particleColors[i%particleColors.length]+';--px:'+px+'px;--py:'+py+'px;--rot:'+rot+'deg;';
      container.appendChild(p);
    }
    setTimeout(function(){if(container.parentNode)container.parentNode.removeChild(container);},1100);
  }catch(e){console.error('[spawnAnswerParticleBurst]',e);}
}

function spawnAnswerRipple(element){
  if(_isReducedEffects()) return;
  try{
    var rect=element.getBoundingClientRect();
    var cx=rect.left+rect.width/2;
    var cy=rect.top+rect.height/2;
    // Create multiple ripples for a richer effect
    for(var i=0;i<3;i++){
      (function(delay){
        setTimeout(function(){
          var ripple=document.createElement('div');
          ripple.className='answer-ripple';
          ripple.style.cssText='position:fixed;left:'+cx+'px;top:'+cy+'px;pointer-events:none;z-index:9999;border-color:'+(i===0?'#ff3d5a':i===1?'#ff9100':'#f5c842')+';';
          document.body.appendChild(ripple);
          setTimeout(function(){if(ripple.parentNode)ripple.parentNode.removeChild(ripple);},800);
        },delay);
      })(i*150);
    }
  }catch(e){console.error('[spawnAnswerRipple]',e);}
}

// ── Feature 3: Enhanced Multi-Layer Progress Bar with Accuracy ──
var _origUpdateSoloProgressBar=updateSoloProgressBar;
updateSoloProgressBar=function(){
  // Call original progress bar update
  _origUpdateSoloProgressBar();
  // Add accuracy calculation and display
  try{
    var cats=state.categories.filter(function(c){return c.type!=='tiebreaker';});
    var totalAttempts=0,correctAttempts=0;
    cats.forEach(function(cat){
      var supportedQs=(cat.questions||[]).filter(function(q){return !SOLO_UNSUPPORTED_TYPES.includes(q.type);});
      supportedQs.forEach(function(q){
        var idx=cat.questions.indexOf(q);
        var lvlKey=_soloLevelKey(cat.id,q,idx);
        var lvl=state.soloProgress.levels[lvlKey];
        if(lvl&&lvl.attempts>0){
          totalAttempts+=lvl.attempts;
          if(lvl.completed) correctAttempts+=1; // count each completed question as one correct
          // Count wrong attempts
          if(lvl.attempts>1){
            // First attempt might have been wrong, then later correct
          }
        }
      });
    });
    // Calculate accuracy: correct answers / total answers
    var accuracyPct=totalAttempts>0?Math.round((state.soloProgress.completedLevels/totalAttempts)*100):0;
    if(accuracyPct>100) accuracyPct=100;
    
    var accuracyEl=document.getElementById('solo-prog-accuracy');
    if(accuracyEl) accuracyEl.style.width=accuracyPct+'%';
    
    // Update accuracy badge color based on percentage
    var accuracyBadge=document.getElementById('solo-prog-accuracy-badge');
    if(accuracyBadge){
      accuracyBadge.textContent=accuracyPct+'%';
      accuracyBadge.classList.remove('high','mid','low');
      if(accuracyPct>=70) accuracyBadge.classList.add('high');
      else if(accuracyPct>=40) accuracyBadge.classList.add('mid');
      else accuracyBadge.classList.add('low');
    }
  }catch(e){console.error('[updateSoloProgressBar accuracy]',e);}
};

// ── Feature 4: Full-Screen Question Mode (Mobile) ──
// Initialize fullscreen setting
if(!_soloSettings.fullscreen) _soloSettings.fullscreen=false;

function toggleSoloFullscreen(){
  var container=document.getElementById('solo-question-container');
  var btn=document.getElementById('solo-fullscreen-btn');
  if(!container) return;
  
  _soloSettings.fullscreen=!_soloSettings.fullscreen;
  
  if(_soloSettings.fullscreen){
    container.classList.add('solo-question-fullscreen');
    if(btn) btn.classList.add('active');
    // Also try native fullscreen API
    try{
      var elem=document.documentElement;
      if(elem.requestFullscreen) elem.requestFullscreen();
      else if(elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_110")}catch(_){}}
  }else{
    container.classList.remove('solo-question-fullscreen');
    if(btn) btn.classList.remove('active');
    // Exit native fullscreen
    try{
      if(document.exitFullscreen) document.exitFullscreen();
      else if(document.webkitExitFullscreen) document.webkitExitFullscreen();
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_111")}catch(_){}}
  }
  _saveSoloSettings();
}

// Auto-detect mobile and suggest fullscreen
(function(){
  try{
    var isMobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    var isSmallScreen=window.innerWidth<=480;
    if(isMobile&&isSmallScreen&&!localStorage.getItem('solo_fullscreen_prompted')){
      // Auto-enable fullscreen on first mobile visit
      _soloSettings.fullscreen=true;
      _saveSoloSettings();
      localStorage.setItem('solo_fullscreen_prompted','1');
    }
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_112")}catch(_){}}
})();

// ── Feature 5: Solo Guided Wizard (4-Step Quick Setup) ──
var _soloWizStep=1;
var _soloWizData={
  catId:null,
  difficulty:'all',
  soundMode:'on' // 'on', 'minimal', 'off'
};

function showSoloGuidedWizard(){
  _soloWizStep=1;
  _soloWizData={catId:null,difficulty:'all',soundMode:'on'};
  var wiz=document.getElementById('solo-guided-wizard');
  if(!wiz) return;
  
  // Populate categories list
  populateSoloWizCategories();
  
  // Reset step indicator
  updateSoloWizIndicator();
  
  // Show step 1
  showSoloWizStep(1);
  
  // Show wizard
  wiz.classList.add('active');
}

function hideSoloGuidedWizard(){
  var wiz=document.getElementById('solo-guided-wizard');
  if(wiz) wiz.classList.remove('active');
}

function populateSoloWizCategories(){
  var listEl=document.getElementById('solo-wiz-cats-list');
  if(!listEl) return;
  listEl.innerHTML='';
  var cats=state.categories.filter(function(c){return c.type!=='tiebreaker'&&c.questions&&c.questions.length>0;});
  if(cats.length===0){
    listEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:.85rem">'+(typeof I18n!=='undefined'&&I18n.t?I18n.t('solo.noCategories'):'لا توجد أقسام متاحة حالياً')+'</div>';
    return;
  }
  cats.forEach(function(cat){
    var supportedQs=(cat.questions||[]).filter(function(q){return !SOLO_UNSUPPORTED_TYPES.includes(q.type);});
    if(supportedQs.length===0) return;
    var card=document.createElement('div');
    card.className='solo-wiz-card';
    card.dataset.catId=cat.id;
    var icon=cat.icon||'📚';
    var prog=state.soloProgress.levels||{};
    var completed=0;
    supportedQs.forEach(function(q){
      var idx=cat.questions.indexOf(q);
      var key=_soloLevelKey(cat.id,q,idx);
      if(prog[key]&&prog[key].completed) completed++;
    });
    card.innerHTML='<div class="solo-wiz-card-icon">'+icon+'</div><div class="solo-wiz-card-title">'+_sanitizeUser(cat.name||I18n.t('solo.category','قسم'))+'</div><div class="solo-wiz-card-desc">'+supportedQs.length+' '+(typeof I18n!=='undefined'?I18n.t('solo.questions','سؤال'):'سؤال')+' · '+completed+'/'+supportedQs.length+' '+(typeof I18n!=='undefined'?I18n.t('solo.completed','مكتمل'):'مكتمل')+'</div>';
    card.addEventListener('click',function(){
      listEl.querySelectorAll('.solo-wiz-card').forEach(function(c){c.classList.remove('selected');});
      card.classList.add('selected');
      _soloWizData.catId=cat.id;
    });
    listEl.appendChild(card);
  });
}

function soloWizSelectDiff(diff){
  _soloWizData.difficulty=diff;
  document.querySelectorAll('#solo-wiz-s2 .solo-wiz-card').forEach(function(c){
    c.classList.toggle('selected',c.dataset.diff===diff);
  });
}

function soloWizSelectSound(mode){
  _soloWizData.soundMode=mode;
  document.querySelectorAll('#solo-wiz-s3 .solo-wiz-card').forEach(function(c){
    c.classList.toggle('selected',c.dataset.sound===mode);
  });
}

function showSoloWizStep(step){
  _soloWizStep=step;
  // Hide all steps
  document.querySelectorAll('.solo-wiz-step').forEach(function(s){s.classList.remove('active');});
  // Show target step
  var target=document.getElementById('solo-wiz-s'+step);
  if(target) target.classList.add('active');
  // Update indicator
  updateSoloWizIndicator();
  // Update buttons
  var backBtn=document.getElementById('solo-wiz-back');
  var nextBtn=document.getElementById('solo-wiz-next');
  if(backBtn) backBtn.style.display=step>1?'':'none';
  if(nextBtn){
    if(step===4){
      nextBtn.textContent='🚀 ابدأ اللعب';
    }else{
      nextBtn.textContent='التالي ←';
    }
  }
  // If step 4, populate summary
  if(step===4) populateSoloWizSummary();
}

function updateSoloWizIndicator(){
  var dots=document.querySelectorAll('#solo-wiz-indicator .wiz-step-dot-sm');
  var lines=document.querySelectorAll('#solo-wiz-indicator .wiz-step-line-sm');
  dots.forEach(function(d,i){
    var s=parseInt(d.dataset.s);
    d.classList.remove('active','done');
    if(s===_soloWizStep) d.classList.add('active');
    else if(s<_soloWizStep) d.classList.add('done');
  });
  lines.forEach(function(l,i){
    l.classList.toggle('done',i<_soloWizStep-1);
  });
}

function populateSoloWizSummary(){
  var summary=document.getElementById('solo-wiz-summary');
  if(!summary) return;
  var catName='غير محدد';
  if(_soloWizData.catId){
    var cat=state.categories.find(function(c){return c.id===_soloWizData.catId;});
    if(cat) catName=(cat.icon||'📚')+' '+(cat.name||'قسم');
  }
  var diffNames={easy:'🟢 '+(I18n?I18n.t('lbl.easyShort'):'سهل'),medium:'🟡 '+(I18n?I18n.t('lbl.mediumShort'):'متوسط'),hard:'🔴 '+(I18n?I18n.t('lbl.hardShort'):'صعب')};
  var soundNames={on:'🔊 '+(I18n?I18n.t('solo.soundOn'):'مفعّل'),minimal:'🔉 '+(I18n?I18n.t('solo.soundMinimal'):'خفيف'),off:'🔇 '+(I18n?I18n.t('solo.soundOff'):'مكتوم')};
  summary.innerHTML=
    '<div style="margin-bottom:6px"><strong>🌍 العالم:</strong> '+catName+'</div>'+
    '<div style="margin-bottom:6px"><strong>⚡ الصعوبة:</strong> '+(diffNames[_soloWizData.difficulty]||'متوسط')+'</div>'+
    '<div><strong>🔊 الأصوات:</strong> '+(soundNames[_soloWizData.soundMode]||'كاملة')+'</div>';
}

function soloWizNext(){
  if(_soloWizStep===1){
    // Validate: must select a category
    if(!_soloWizData.catId){
      toast(t('toast.selectCatFirst'),'error');
      return;
    }
    showSoloWizStep(2);
  }else if(_soloWizStep===2){
    showSoloWizStep(3);
  }else if(_soloWizStep===3){
    showSoloWizStep(4);
  }else if(_soloWizStep===4){
    // Apply settings and start
    applySoloWizSettings();
  }
}

function soloWizBack(){
  if(_soloWizStep>1){
    showSoloWizStep(_soloWizStep-1);
  }
}

function applySoloWizSettings(){
  // Apply difficulty
  _soloSettings.difficulty=_soloWizData.difficulty;
  // Apply sound/effects
  if(_soloWizData.soundMode==='off'){
    _soloSettings.muted=true;
    _soloSettings.reducedEffects=true;
  }else if(_soloWizData.soundMode==='minimal'){
    _soloSettings.muted=false;
    _soloSettings.reducedEffects=true;
  }else{
    _soloSettings.muted=false;
    _soloSettings.reducedEffects=false;
  }
  _saveSoloSettings();
  
  // Close wizard
  hideSoloGuidedWizard();
  
  // Start playing the selected category
  if(_soloWizData.catId){
    // Find first supported question index (skip unsupported types)
    var cat=state.categories.find(function(c){return c.id===_soloWizData.catId;});
    if(cat){
      var firstQIdx=-1;
      for(var i=0;i<cat.questions.length;i++){
        if(!SOLO_UNSUPPORTED_TYPES.includes(cat.questions[i].type)){
          firstQIdx=i;
          break;
        }
      }
      // Guard: if no supported questions found, show error instead of crashing
      if(firstQIdx===-1){
        toast(I18n.t('solo.noSupportedQuestions','لا توجد أسئلة مدعومة في هذا القسم'),'error');
        return;
      }
      playSoloLevel(_soloWizData.catId,firstQIdx);
    }
  }
}

// ── Show guided wizard on first solo map visit ──
var _origRenderSoloMap=typeof renderSoloMap==='function'?renderSoloMap:null;
renderSoloMap=function(){
  if(_origRenderSoloMap) _origRenderSoloMap();
  // Solo mode should feel like a game - no setup wizard on map visit
};

// ── Feature 6: Full-Screen Question on Mobile (dvh/svh) ──
// Patch solo-question CSS to use dynamic viewport units
(function(){
  try{
    // Add a style element for dynamic viewport height
    var style=document.createElement('style');
    style.textContent=
      '.solo-question{min-height:100vh;min-height:100dvh}'+
      '@supports(min-height:100dvh){.solo-question{min-height:100dvh}}'+
      '.solo-question-fullscreen .solo-question{min-height:100dvh;height:100dvh}'+
      '@media(max-width:480px){.solo-question-fullscreen .solo-q-body{padding:4px 4px 0}}';
    document.head.appendChild(style);
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_113")}catch(_){}}
})();

// ── Auto-apply fullscreen on mobile when question loads ──
(function(){
  var origPlaySoloLevel=typeof playSoloLevel==='function'?playSoloLevel:null;
  if(origPlaySoloLevel){
    playSoloLevel=function(catId,qIdx){
      origPlaySoloLevel(catId,qIdx);
      // Auto-apply fullscreen on mobile
      if(_soloSettings.fullscreen){
        var container=document.getElementById('solo-question-container');
        if(container&&!container.classList.contains('solo-question-fullscreen')){
          container.classList.add('solo-question-fullscreen');
          var fsBtn=document.getElementById('solo-fullscreen-btn');
          if(fsBtn) fsBtn.classList.add('active');
        }
      }
    };
  }
})();

// ════════════════════════════════════════════════════════
//  LEADERBOARD SYSTEM
// ════════════════════════════════════════════════════════
// _lbChannel is defined earlier — this section only has helper functions

function _getLeaderboard(){
  try{var d=localStorage.getItem('quiz_leaderboard');return d?JSON.parse(d):[];}catch(e){return[];}
}
function _saveLeaderboard(lb){
  try{localStorage.setItem('quiz_leaderboard',JSON.stringify(lb));}catch(e){_logErr(e,'localStorage:saveLeaderboard')}
}
function _addToLeaderboard(entry){
  var lb=_getLeaderboard();
  lb.push(entry);
  lb.sort(function(a,b){return b.score-a.score;});
  if(lb.length>100)lb=lb.slice(0,100);
  _saveLeaderboard(lb);
  try{if(_lbChannel)_lbChannel.postMessage({type:'update',entry:entry});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_114")}catch(_){}}
  return lb;
}
function _showLeaderboardPrompt(){
  // Add nickname input to victory overlay if not already present
  var victoryActions=document.querySelector('#solo-victory-overlay .solo-victory-actions');
  if(!victoryActions||document.getElementById('solo-lb-nickname-wrap'))return;
  var wrap=document.createElement('div');
  wrap.id='solo-lb-nickname-wrap';
  wrap.style.cssText='margin-top:10px;text-align:center';
  wrap.innerHTML='<div style="display:flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap"><input id="solo-lb-nickname" type="text" class="form-input" placeholder="'+(typeof I18n!=='undefined'?I18n.t('leaderboard.nicknamePlaceholder','اسمك للوحة المتصدرين'):'اسمك للوحة المتصدرين')+'" style="max-width:200px;text-align:center;font-size:.85rem;padding:6px 10px" maxlength="30" dir="auto"><button class="solo-btn solo-btn-primary" style="font-size:.8rem;padding:6px 14px" onclick="_submitLeaderboardEntry()">'+(typeof I18n!=='undefined'?I18n.t('leaderboard.save','حفظ'):'حفظ')+'</button></div>';
  victoryActions.parentElement.insertBefore(wrap,victoryActions);
}
function _submitLeaderboardEntry(){
  var input=document.getElementById('solo-lb-nickname');
  if(!input)return;
  var nickname=input.value.trim()||'لاعب';
  var prog=state.soloProgress||{};
  var entry={
    nickname:nickname,
    score:prog.totalStars||0,
    stars:prog.totalStars||0,
    date:Date.now(),
    sessionId:(typeof crypto!=='undefined'&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).substr(2,9)
  };
  _addToLeaderboard(entry);
  var wrap=document.getElementById('solo-lb-nickname-wrap');
  if(wrap)wrap.innerHTML='<div style="color:#00e676;font-size:.85rem">'+t('ui.leaderboardSaved')+'</div>';
  toast(nickname+' تم الإضافة للوحة المتصدرين!','success');
}
function showLeaderboardModal(filter){
  var lb=_getLeaderboard();
  filter=filter||'all';
  var now=Date.now();
  var weekAgo=now-7*86400000;
  var monthAgo=now-30*86400000;
  var filtered=lb;
  if(filter==='weekly')filtered=lb.filter(function(e){return e.date>=weekAgo;});
  else if(filter==='monthly')filtered=lb.filter(function(e){return e.date>=monthAgo;});
  filtered=filtered.slice(0,10);
  var medals=['🥇','🥈','🥉'];
  var html='<div style="padding:20px;max-height:70vh;overflow-y:auto">';
  html+='<h2 style="text-align:center;margin-bottom:12px;font-size:1.2rem">🏅 لوحة المتصدرين</h2>';
  // Filter tabs
  html+='<div style="display:flex;gap:6px;justify-content:center;margin-bottom:16px">';
  ['all','weekly','monthly'].forEach(function(f){
    var label=f==='all'?(I18n?I18n.t('lbl.all'):'الكل'):f==='weekly'?(I18n?I18n.t('lbl.weekly'):'أسبوعي'):(I18n?I18n.t('lbl.monthly'):'شهري');
    var active=f===filter;
    html+='<button onclick="showLeaderboardModal(\''+f+'\')" style="padding:4px 12px;border-radius:8px;border:1px solid '+(active?'rgba(0,230,118,.4)':'var(--border-light)')+';background:'+(active?'rgba(0,230,118,.1)':'transparent')+';color:'+(active?'#00e676':'var(--text-muted)')+';font-size:.78rem;cursor:pointer">'+label+'</button>';
  });
  html+='</div>';
  if(filtered.length===0){
    html+='<div style="text-align:center;color:var(--text-muted);padding:30px">'+t('empty.noResults')+'</div>';
  }else{
    filtered.forEach(function(e,i){
      var bg=i<3?'rgba(255,193,7,'+(0.12-i*0.03)+')':'transparent';
      html+='<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:'+bg+';margin-bottom:4px;border:1px solid '+(i<3?'rgba(255,193,7,.15)':'var(--border-light)')+'">';
      html+='<span style="font-size:1.1rem;width:28px;text-align:center">'+(i<3?medals[i]:(i+1))+'</span>';
      html+='<span style="flex:1;font-weight:600;font-size:.88rem">'+e.nickname+'</span>';
      html+='<span style="color:#f5c842;font-size:.85rem">⭐ '+e.stars+'</span>';
      html+='<span style="color:var(--text-muted);font-size:.72rem">'+new Date(e.date).toLocaleDateString('ar')+'</span>';
      html+='</div>';
    });
  }
  html+='</div>';
  var modal=document.getElementById('modal-leaderboard');
  if(!modal){
    modal=document.createElement('div');
    modal.id='modal-leaderboard';
    modal.className='modal-overlay hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML='<div class="modal" style="max-width:480px"><div class="modal-header"><div class="modal-title">🏅 '+(typeof I18n!=='undefined'&&I18n.t?I18n.t('leaderboard.title'):'لوحة المتصدرين')+'</div><button class="modal-close" onclick="closeModal(\'modal-leaderboard\')">✕</button></div><div id="leaderboard-content"></div></div>';
    modal.addEventListener('click',function(e){if(e.target===modal)closeModal('modal-leaderboard');});
    document.body.appendChild(modal);
  }
  document.getElementById('leaderboard-content').innerHTML=html;
  openModal('modal-leaderboard');
}

// ════════════════════════════════════════════════════════
//  BUG REPORT SYSTEM
// ════════════════════════════════════════════════════════
function _getBugReports(){
  try{var d=localStorage.getItem('quiz_bug_reports');return d?JSON.parse(d):[];}catch(e){return[];}
}
function _saveBugReports(reports){
  try{localStorage.setItem('quiz_bug_reports',JSON.stringify(reports));}catch(e){_logErr(e,'localStorage:saveBugReports')}
}
function showBugReportModal(qId,catId){
  qId=qId||null;catId=catId||null;
  var html='<div style="padding:20px">';
  html+='<h3 style="text-align:center;margin-bottom:12px;font-size:1rem">⚠️ الإبلاغ عن خطأ</h3>';
  html+='<div style="margin-bottom:12px"><label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px">نوع البلاغ</label>';
  html+='<select id="bug-report-type" class="form-input" style="width:100%">';
  html+='<option value="scientific">خطأ علمي</option>';
  html+='<option value="typo">خطأ إملائي</option>';
  html+='<option value="suggestion">اقتراح تحسين</option>';
  html+='</select></div>';
  html+='<div style="margin-bottom:12px"><label style="display:block;font-size:.82rem;font-weight:700;margin-bottom:4px">الوصف</label>';
  html+='<textarea id="bug-report-desc" class="form-textarea" rows="3" dir="auto" placeholder="اشرح المشكلة بالتفصيل..." style="width:100%"></textarea></div>';
  html+='<button class="btn btn-primary btn-full" onclick="submitBugReport(\''+qId+'\',\''+catId+'\')">إرسال البلاغ</button>';
  html+='</div>';
  var modal=document.getElementById('modal-bug-report');
  if(!modal){
    modal=document.createElement('div');
    modal.id='modal-bug-report';
    modal.className='modal-overlay hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML='<div class="modal" style="max-width:440px"><div class="modal-header"><div class="modal-title">⚠️ '+(typeof I18n!=='undefined'&&I18n.t?I18n.t('bugReport.reportError'):'الإبلاغ عن خطأ')+'</div><button class="modal-close" onclick="closeModal(\'modal-bug-report\')">✕</button></div><div id="bug-report-content"></div></div>';
    modal.addEventListener('click',function(e){if(e.target===modal)closeModal('modal-bug-report');});
    document.body.appendChild(modal);
  }
  document.getElementById('bug-report-content').innerHTML=html;
  openModal('modal-bug-report');
}
function submitBugReport(qId,catId){
  // Unified version - handles both UI patterns (inline modal + overlay modal)
  var typeEl=document.getElementById('bug-report-type')||document.getElementById('bug-type-select');
  var descEl=document.getElementById('bug-report-desc')||document.getElementById('bug-desc-input');
  if(!typeEl||!descEl){toast(t('toast.reportSendError'),'danger');return;}
  var type=typeEl.value;
  var desc=descEl.value.trim();
  if(!desc){descEl.style.borderColor='var(--danger)';toast(t('toast.reportDescRequired'),'danger');return;}
  var reports=_getBugReports();
  reports.push({
    id:Date.now().toString(36)+Math.random().toString(36).substr(2,5),
    questionId:qId||null,
    catId:catId||null,
    type:type,
    description:desc,
    status:'pending',
    createdAt:Date.now(),
    resolvedAt:null
  });
  _saveBugReports(reports);
  // Close whichever modal pattern is active
  var overlayModal=document.querySelector('.bug-report-modal');
  if(overlayModal)overlayModal.remove();
  try{closeModal('modal-bug-report');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_115")}catch(_){}}
  toast(t('toast.reportSent'),'success');
}
function renderBugReportsAdmin(){
  var el=document.getElementById('tab-reports');
  if(!el)return;
  
  // ── Build Reports Dashboard ──
  var html='<div style="padding:16px">';
  
  // ── Section Header ──
  html+='<div style="margin-bottom:20px;text-align:center">';
  html+='<h2 style="font-size:1.2rem;font-weight:900;color:var(--text-primary);margin:0 0 6px">📊 تقارير المسابقة</h2>';
  html+='<p style="font-size:.82rem;color:var(--text-secondary);margin:0">عرض سجل الجلسات وإحصائيات الأداء وإدارة بلاغات الأسئلة</p>';
  html+='</div>';
  
  // ── Export Action Buttons (at the top) ──
  html+='<div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">';
  html+='<button class="btn btn-primary" style="flex:1;min-width:120px;justify-content:center" onclick="exportReportPDF()">📄 تصدير PDF</button>';
  html+='<button class="btn btn-accent" style="flex:1;min-width:120px;justify-content:center" onclick="exportReportExcel()">📊 تصدير Excel</button>';
  html+='<button class="btn btn-ghost" style="flex:1;min-width:120px;justify-content:center" onclick="exportSessionData()">📥 تصدير البيانات</button>';
  html+='<button class="btn btn-ghost" style="flex:1;min-width:120px;justify-content:center" onclick="showSessionHistory()">📋 سجل المسابقات</button>';
  html+='</div>';
  
  // ── Summary Cards ──
  var totalSessions=0,avgScore=0,bestScore=0,totalQuestionsAnswered=0;
  try{
    var sh=state.scoreHistory||[];
    totalSessions=sh.length;
    if(totalSessions>0){
      var sumScores=0;
      sh.forEach(function(s){sumScores+=(s.scores||[]).reduce(function(a,b){return a+b;},0);});
      avgScore=Math.round(sumScores/totalSessions);
      bestScore=Math.max.apply(null,sh.map(function(s){return(s.scores||[]).reduce(function(a,b){return a+b;},0);}));
    }
    totalQuestionsAnswered=state.categories.reduce(function(a,c){return a+(c.questions||[]).length;},0);
  }catch(e){try{ErrorBus.capture(e,"catch#reports-dash")}catch(_){}}
  
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:20px">';
  html+='<div class="card" style="text-align:center;padding:14px;border-radius:12px;border-top:3px solid var(--accent1)"><div style="font-size:1.8rem;font-weight:900;color:var(--accent1)">'+totalSessions+'</div><div style="font-size:.75rem;color:var(--text-secondary);margin-top:4px">جلسات المسابقة</div></div>';
  html+='<div class="card" style="text-align:center;padding:14px;border-radius:12px;border-top:3px solid var(--accent2)"><div style="font-size:1.8rem;font-weight:900;color:var(--accent2)">'+totalQuestionsAnswered+'</div><div style="font-size:.75rem;color:var(--text-secondary);margin-top:4px">إجمالي الأسئلة</div></div>';
  html+='<div class="card" style="text-align:center;padding:14px;border-radius:12px;border-top:3px solid var(--success)"><div style="font-size:1.8rem;font-weight:900;color:var(--success)">'+avgScore+'</div><div style="font-size:.75rem;color:var(--text-secondary);margin-top:4px">متوسط النقاط</div></div>';
  html+='<div class="card" style="text-align:center;padding:14px;border-radius:12px;border-top:3px solid #ffc107"><div style="font-size:1.8rem;font-weight:900;color:#ffc107">'+bestScore+'</div><div style="font-size:.75rem;color:var(--text-secondary);margin-top:4px">أعلى نتيجة</div></div>';
  html+='</div>';
  
  // ── Score Trend Chart ──
  var sh2=state.scoreHistory||[];
  if(sh2.length>1){
    html+='<div class="card" style="padding:14px;border-radius:12px;margin-bottom:20px;overflow:hidden;box-sizing:border-box">';
    html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="font-size:.9rem;font-weight:800;color:var(--text-primary)">📈 اتجاه النتائج</div><button class="btn btn-ghost btn-sm" onclick="exportSessionData()" style="font-size:.7rem;padding:4px 8px">📥 تصدير</button></div>';
    html+='<div style="position:relative;width:100%;height:120px;overflow:hidden"><canvas id="reports-trend-chart" style="width:100%;height:100%;display:block"></canvas></div>';
    html+='</div>';
  }
  
  // ── Session History ──
  html+='<div style="margin-bottom:20px">';
  html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><h3 style="font-size:1rem;font-weight:800;color:var(--text-primary);margin:0;display:flex;align-items:center;gap:6px">📜 سجل الجلسات</h3>';
  if(sh2.length>0){
    html+='<button class="btn btn-ghost btn-sm" onclick="exportSessionData()" style="font-size:.72rem;padding:4px 10px">📥 تصدير البيانات</button>';
  }
  html+='</div>';
  if(sh2.length===0){
    html+='<div style="text-align:center;color:var(--text-muted);padding:20px;font-size:.85rem">'+t('empty.noSessions')+'</div>';
  }else{
    html+='<div style="max-height:300px;overflow-y:auto;border:1px solid var(--border);border-radius:8px">';
    sh2.slice().reverse().slice(0,20).forEach(function(session,idx){
      var dateStr='—';
      try{if(session.date){var d=new Date(session.date);dateStr=d.toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});}}catch(e){dateStr='—';}
      var teamsCount=(session.teams||[]).length;
      var totalScore=(session.scores||[]).reduce(function(a,b){return a+b;},0);
      var duration='—';
      if(session.duration){var mins=Math.floor(session.duration/60);var secs=session.duration%60;duration=mins+'د '+secs+'ث';}
      var categoriesUsed=(session.categoriesUsed||[]).length;
      html+='<div style="padding:10px 12px;border-bottom:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:4px">';
      html+='<div><span style="font-size:.82rem;font-weight:700;color:var(--text-primary)">جلسة #'+(sh2.length-idx)+'</span> <span style="font-size:.72rem;color:var(--text-muted)">'+dateStr+'</span></div>';
      html+='<div style="display:flex;gap:10px;font-size:.75rem">';
      html+='<span style="color:var(--accent1)">👥 '+teamsCount+' فريق</span>';
      html+='<span style="color:var(--success)">⭐ '+totalScore+' نقطة</span>';
      if(duration!=='—')html+='<span style="color:var(--text-muted)">⏱ '+duration+'</span>';
      if(categoriesUsed>0)html+='<span style="color:var(--text-muted)">📂 '+categoriesUsed+' قسم</span>';
      html+='</div></div>';
    });
    html+='</div>';
  }
  html+='</div>';
  
  // ── Visual Separator ──
  html+='<div style="border-top:2px dashed var(--border);margin:24px 0;position:relative;text-align:center">';
  html+='<span style="position:relative;top:-10px;background:var(--bg-card,#111432);padding:0 12px;font-size:.75rem;color:var(--text-muted)">بلاغات الأسئلة</span>';
  html+='</div>';
  
  // ── Bug Reports Section ──
  var reports=_getBugReports();
  var pending=reports.filter(function(r){return r.status==='pending';});
  var approved=reports.filter(function(r){return r.status==='approved';});
  var rejected=reports.filter(function(r){return r.status==='rejected';});
  var typeLabels={scientific:'خطأ علمي',typo:'خطأ إملائي',suggestion:'اقتراح تحسين'};
  
  html+='<h3 style="font-size:1rem;font-weight:800;color:var(--text-primary);margin-bottom:10px;display:flex;align-items:center;gap:6px">🚫 بلاغات الأسئلة</h3>';
  
  html+='<div style="display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap">';
  html+='<div class="card" style="flex:1;min-width:100px;text-align:center;padding:10px;border-radius:8px;border-top:3px solid #ff3b5c"><div style="font-size:1.2rem;font-weight:800;color:#ff3b5c">'+pending.length+'</div><div style="font-size:.72rem;color:var(--text-muted)">قيد الانتظار</div></div>';
  html+='<div class="card" style="flex:1;min-width:100px;text-align:center;padding:10px;border-radius:8px;border-top:3px solid #00e676"><div style="font-size:1.2rem;font-weight:800;color:#00e676">'+approved.length+'</div><div style="font-size:.72rem;color:var(--text-muted)">تم القبول</div></div>';
  html+='<div class="card" style="flex:1;min-width:100px;text-align:center;padding:10px;border-radius:8px;border-top:3px solid var(--text-muted)"><div style="font-size:1.2rem;font-weight:800;color:var(--text-muted)">'+rejected.length+'</div><div style="font-size:.72rem;color:var(--text-muted)">مرفوض</div></div>';
  html+='</div>';
  
  if(reports.length===0){
    html+='<div style="text-align:center;color:var(--text-muted);padding:24px;font-size:.85rem">'+t('empty.noBugReportsHint')+'</div>';
  }else{
    reports.slice().reverse().forEach(function(r){
      var statusColor=r.status==='pending'?'#ff3b5c':r.status==='approved'?'#00e676':'var(--text-muted)';
      var statusLabel=r.status==='pending'?'قيد الانتظار':r.status==='approved'?'مقبول':'مرفوض';
      html+='<div style="border:1px solid var(--border-light);border-radius:10px;padding:12px;margin-bottom:8px;border-right:3px solid '+statusColor+'">';
      html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
      html+='<span style="font-size:.78rem;font-weight:700;color:'+statusColor+'">'+statusLabel+'</span>';
      html+='<span style="font-size:.7rem;color:var(--text-muted)">'+(typeLabels[r.type]||r.type)+'</span>';
      html+='</div>';
      html+='<div style="font-size:.82rem;margin-bottom:6px;color:var(--text-primary)">'+r.description+'</div>';
      html+='<div style="display:flex;gap:6px;justify-content:flex-end">';
      if(r.status==='pending'){
        html+='<button class="btn btn-ghost btn-sm" onclick="updateBugReportStatus(\''+r.id+'\',\'approved\')" style="color:#00e676;font-size:.72rem">قبول</button>';
        html+='<button class="btn btn-ghost btn-sm" onclick="updateBugReportStatus(\''+r.id+'\',\'rejected\')" style="color:#ff3b5c;font-size:.72rem">رفض</button>';
      }
      html+='<button class="btn btn-ghost btn-sm" onclick="deleteBugReport(\''+r.id+'\')" style="font-size:.72rem">حذف</button>';
      html+='</div></div>';
    });
  }
  
  html+='</div>';
  el.innerHTML=html;
  
  // ── Draw trend chart if canvas exists ──
  try{
    var trendCanvas=document.getElementById('reports-trend-chart');
    if(trendCanvas&&sh2.length>1){
      var tctx=trendCanvas.getContext('2d');
      trendCanvas.width=trendCanvas.parentElement.offsetWidth||400;
      trendCanvas.height=120;
      var tw=trendCanvas.width,th=trendCanvas.height;
      var scores=sh2.map(function(s){return(s.scores||[]).reduce(function(a,b){return a+b;},0);});
      var maxS=Math.max.apply(null,scores)||1;
      var minS=Math.min.apply(null,scores)||0;
      var range=Math.max(maxS-minS,1);
      tctx.clearRect(0,0,tw,th);
      // Draw grid lines
      tctx.strokeStyle='rgba(255,255,255,.06)';
      tctx.lineWidth=1;
      for(var gi=0;gi<4;gi++){
        var gy=10+gi*(th-20)/3;
        tctx.beginPath();tctx.moveTo(0,gy);tctx.lineTo(tw,gy);tctx.stroke();
      }
      // Draw line
      tctx.beginPath();
      tctx.strokeStyle='#00e8d0';
      tctx.lineWidth=2;
      tctx.lineJoin='round';
      scores.forEach(function(score,i){
        var x=(i/(scores.length-1))*tw;
        var y=th-10-((score-minS)/range)*(th-20);
        if(i===0)tctx.moveTo(x,y);else tctx.lineTo(x,y);
      });
      tctx.stroke();
      // Draw dots
      scores.forEach(function(score,i){
        var x=(i/(scores.length-1))*tw;
        var y=th-10-((score-minS)/range)*(th-20);
        tctx.beginPath();tctx.arc(x,y,3,0,Math.PI*2);
        tctx.fillStyle='#00e8d0';tctx.fill();
      });
    }
  }catch(e){console.warn('[Reports] Chart error:',e);}
}

function exportSessionData(){
  try{
    var data=state.scoreHistory||[];
    if(data.length===0){if(typeof toast==='function')toast(t('toast.noExportData'),'warning');return;}
    var csv='الجلسة,التاريخ,عدد الفرق,النقاط,المدة(ث),الأقسام\n';
    data.forEach(function(s,idx){
      var dateStr='—';
      try{if(s.date)dateStr=new Date(s.date).toISOString();}catch(e){dateStr='—';}
      var teamsCount=(s.teams||[]).length;
      var totalScore=(s.scores||[]).reduce(function(a,b){return a+b;},0);
      var duration=s.duration||'—';
      var categories=(s.categoriesUsed||[]).length;
      csv+=(idx+1)+','+dateStr+','+teamsCount+','+totalScore+','+duration+','+categories+'\n';
    });
    var blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='session_data_'+new Date().toISOString().slice(0,10)+'.csv';
    document.body.appendChild(a);a.click();a.remove();
    URL.revokeObjectURL(url);
    if(typeof toast==='function')toast(t('toast.exportSuccess'),'success');
  }catch(e){_logErr(e,'exportSessionData');if(typeof toast==='function')toast(t('toast.exportError'),'danger');}
}
function updateBugReportStatus(reportId,status){
  var reports=_getBugReports();
  var report=reports.find(function(r){return r.id===reportId;});
  if(report){
    report.status=status;
    if(status==='approved')report.resolvedAt=Date.now();
    _saveBugReports(reports);
    // Mark question for review if approved
    if(status==='approved'&&report.questionId){
      try{
        var cat=state.categories.find(function(c){return c.id===report.catId;});
        if(cat){
          var q=cat.questions.find(function(qq){return qq.id===report.questionId;});
          if(q)q.flaggedForReview=true;
          saveState();
        }
      }catch(e){try{ErrorBus.capture(e,"catch#AUTO_116")}catch(_){}}
    }
    renderBugReportsAdmin();
    toast(t('toast.reportStatusUpdated'),'success');
  }
}
function deleteBugReport(reportId){
  var reports=_getBugReports().filter(function(r){return r.id!==reportId;});
  _saveBugReports(reports);
  renderBugReportsAdmin();
  toast(t('toast.reportDeleted'),'info');
}

// ════════════════════════════════════════════════════════
//  SPACED REPETITION SYSTEM
// ════════════════════════════════════════════════════════
// OLD _SR_INTERVALS and _recordSpacedRepetitionError removed — unified to NEW system
// New system uses SPACED_INTERVALS (milliseconds) and stores catId/qIdx/questionId
function _getDueForReview(){
  var sr=_getSpacedRepetition();
  var now=Date.now();
  var due=[];
  Object.entries(sr.questionErrors).forEach(function(entry){
    var key=entry[0],data=entry[1];
    if(data.nextReview<=now){
      due.push({key:key,data:data});
    }
  });
  return due;
}
function _getSectionMastery(catId){
  if(!state.soloProgress||!state.soloProgress.levels)return 0;
  var total=0,mastered=0;
  Object.entries(state.soloProgress.levels).forEach(function(entry){
    var key=entry[0],l=entry[1];
    // Check if this level belongs to the section
    var parts=key.split('_');
    var levelCatId=parts.slice(0,-1).join('_');
    if(levelCatId===catId){
      total++;
      if(l.completed)mastered++;
    }
  });
  return total>0?Math.round(mastered/total*100):0;
}
function _getSmartRecommendations(){
  var recommendations=[];
  if(!state.soloProgress||!state.categories)return recommendations;
  state.categories.forEach(function(cat){
    if(cat.type==='tiebreaker')return;
    var mastery=_getSectionMastery(cat.id);
    if(mastery<50&&mastery>0){
      recommendations.push({catId:cat.id,name:cat.name,mastery:mastery,icon:cat.icon||'📚'});
    }
  });
  recommendations.sort(function(a,b){return a.mastery-b.mastery;});
  return recommendations.slice(0,3);
}
function showSpacedRepetitionView(){
  var sr=_getSpacedRepetition();
  var due=_getDueForReview();
  var recommendations=_getSmartRecommendations();
  var html='<div style="padding:20px;max-height:70vh;overflow-y:auto">';
  html+='<h2 style="text-align:center;margin-bottom:16px;font-size:1.1rem">📝 مراجعة الأخطاء</h2>';
  // Mastery indicators per section
  html+='<div style="margin-bottom:20px">';
  html+='<h3 style="font-size:.9rem;font-weight:700;margin-bottom:10px">💪 قوة الإتقان</h3>';
  if(state.categories){
    state.categories.forEach(function(cat){
      if(cat.type==='tiebreaker')return;
      var mastery=_getSectionMastery(cat.id);
      var color=mastery>=80?'#00e676':mastery>=50?'#ffc107':'#ff3b5c';
      html+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
      html+='<span style="font-size:.82rem;min-width:80px">'+(cat.icon||'📚')+' '+cat.name+'</span>';
      html+='<div style="flex:1;height:8px;background:rgba(128,128,128,.15);border-radius:4px;overflow:hidden">';
      html+='<div style="width:'+mastery+'%;height:100%;background:'+color+';border-radius:4px;transition:width .3s"></div>';
      html+='</div>';
      html+='<span style="font-size:.75rem;font-weight:700;color:'+color+';min-width:35px;text-align:left">'+mastery+'%</span>';
      html+='</div>';
    });
  }
  html+='</div>';
  // Smart recommendations
  if(recommendations.length>0){
    html+='<div style="margin-bottom:20px;padding:12px;border-radius:10px;background:rgba(255,152,0,.08);border:1px solid rgba(255,152,0,.2)">';
    html+='<h3 style="font-size:.85rem;font-weight:700;color:#ff9800;margin-bottom:8px">💡 توصيات ذكية</h3>';
    recommendations.forEach(function(r){
      html+='<div style="font-size:.8rem;margin-bottom:4px">'+r.icon+' يُنصح بمراجعة قسم '+r.name+' ('+r.mastery+'% إتقان)</div>';
    });
    html+='</div>';
  }
  // Due for review
  html+='<h3 style="font-size:.9rem;font-weight:700;margin-bottom:10px">🔄 أسئلة مستحقة للمراجعة ('+due.length+')</h3>';
  if(due.length===0){
    html+='<div style="text-align:center;color:var(--text-muted);padding:20px">'+t('empty.noReviewDue')+'</div>';
  }else{
    due.slice(0,10).forEach(function(item){
      var key=item.key;
      var data=item.data;
      // Find the question
      var parts=key.split('_');
      var qIdx=parseInt(parts[parts.length-1]);
      var catId=parts.slice(0,-1).join('_');
      var cat=state.categories.find(function(c){return c.id===catId;});
      var q=cat?cat.questions[qIdx]:null;
      if(q){
        var intervalLabel=data.interval<60?data.interval+' دقيقة':data.interval<1440?Math.round(data.interval/60)+' ساعة':Math.round(data.interval/1440)+' يوم';
        html+='<div style="border:1px solid var(--border-light);border-radius:10px;padding:10px;margin-bottom:6px;cursor:pointer" onclick="closeModal(\'modal-spaced-repetition\');playSoloLevel(\''+catId+'\','+qIdx+')">';
        html+='<div style="font-size:.82rem;font-weight:600;margin-bottom:3px">'+q.text.substring(0,60)+(q.text.length>60?'...':'')+'</div>';
        html+='<div style="font-size:.72rem;color:var(--text-muted)">عدد الأخطاء: '+data.errorCount+' | فترة المراجعة: '+intervalLabel+'</div>';
        html+='</div>';
      }
    });
  }
  html+='</div>';
  var modal=document.getElementById('modal-spaced-repetition');
  if(!modal){
    modal=document.createElement('div');
    modal.id='modal-spaced-repetition';
    modal.className='modal-overlay hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML='<div class="modal" style="max-width:520px"><div class="modal-header"><div class="modal-title">📝 '+(typeof I18n!=='undefined'&&I18n.t?I18n.t('spacedRepetition.title'):'مراجعة الأخطاء')+'</div><button class="modal-close" onclick="closeModal(\'modal-spaced-repetition\')">✕</button></div><div id="spaced-repetition-content"></div></div>';
    modal.addEventListener('click',function(e){if(e.target===modal)closeModal('modal-spaced-repetition');});
    document.body.appendChild(modal);
  }
  document.getElementById('spaced-repetition-content').innerHTML=html;
  openModal('modal-spaced-repetition');
}

async function resetSoloProgress(skipConfirm){
  if(!skipConfirm){
    const ok=await soloCustomConfirm(I18n.t('solo.confirmReset','هل تريد إعادة تعيين التقدم؟'));
    if(!ok) return false;
  }
  // Reset all runtime solo variables
  clearSoloTimer();
  _soloCurrentCat=null;
  _soloCurrentQIdx=0;
  _soloAnswered=false;
  _soloSelectedAnswer=null;
  _soloTimedOut=false;
  _soloTransitioning=false;
  _soloPrevLockedWorlds=null;
  if(_soloAudioEl){try{_soloAudioEl.pause();}catch(e){console.error("[Error]",e);}_soloAudioEl=null;}
  // Reset progress data
  state.soloProgress=null;
  initSoloProgress();
  _saveSoloProgress();
  saveState();
  // Reset streak system
  soloStreakReset();
  return true;
}

// ── Solo Confetti Animation ──
function soloConfetti(){
  const container=document.getElementById('solo-victory-confetti');
  if(!container) return;
  container.innerHTML='';
  const colors=['#f5c842','#00e8d0','#ff3b5c','#7c5cfc','#00e676','#ff9100','#e040fb'];
  for(let i=0;i<80;i++){
    const piece=document.createElement('div');
    piece.className='solo-confetti-piece';
    piece.style.cssText=`
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
      animation-delay:${Math.random()*3}s;
      animation-duration:${2+Math.random()*3}s;
      border-radius:${Math.random()>0.5?'50%':'2px'};
    `;
    container.appendChild(piece);
  }
  // Cleanup after animation
  setTimeout(()=>{container.innerHTML='';},6000);
}

// ════════════════════════════════════════════════════════
//  PRESENTATION SEQUENCE — welcome → credits → teams → categories
// ════════════════════════════════════════════════════════
let _seqTimer=null;
let _seqStep=0;
const _seqScreens=['seq-welcome','credits','teams','categories'];

function startPresentationSequence(){
  clearTimeout(_seqTimer);
  _seqStep=0;
  // Show sequence overlay with next button
  _showSeqOverlay(true);
  _showSeqScreen(0);
}

function _showSeqOverlay(show){
  let ov=document.getElementById('seq-nav-overlay');
  if(show){
    if(!ov){
      ov=document.createElement('div');
      ov.id='seq-nav-overlay';
      ov.style.cssText='position:fixed;bottom:calc(clamp(44px,6vh,56px) + env(safe-area-inset-bottom,0) + 16px);left:50%;transform:translateX(-50%);z-index:300;display:flex;gap:10px;align-items:center;background:var(--bg-card);border:2px solid var(--border-light);border-radius:16px;padding:8px 16px;box-shadow:0 8px 32px rgba(0,0,0,.6);backdrop-filter:blur(12px);animation:float-up .4s ease';
      ov.innerHTML=`
        <button class="btn btn-ghost btn-sm" onclick="seqPrev()" id="seq-prev-btn" style="gap:6px;padding:8px 14px;border-radius:12px;font-size:.85rem">← السابق</button>
        <div id="seq-dots" style="display:flex;gap:6px;align-items:center"></div>
        <button class="btn btn-primary btn-sm" onclick="seqNext()" id="seq-next-btn" style="gap:6px;padding:8px 20px;border-radius:12px">التالي →</button>
        <button class="btn btn-ghost btn-sm" onclick="seqSkipAll()" style="font-size:.72rem;padding:6px 10px;opacity:.7">تخطي</button>`;
      document.body.appendChild(ov);
    }
    ov.style.display='flex';
  }else{
    if(ov) ov.style.display='none';
  }
}

function _showSeqScreen(idx){
  _seqStep=idx;
  clearTimeout(_seqTimer);
  if(idx>=_seqScreens.length){
    // Sequence complete — hide overlay and start competition
    _showSeqOverlay(false);
    _removeSeqWelcome();
    startCompetition();
    return;
  }
  const screen=_seqScreens[idx];
  const isLast=(idx===_seqScreens.length-1);

  // Update dot indicators
  const dotsEl=document.getElementById('seq-dots');
  if(dotsEl){
    dotsEl.innerHTML=_seqScreens.map((_,i)=>
      `<div style="width:${i===idx?18:8}px;height:8px;border-radius:4px;background:${i===idx?'var(--accent1)':i<idx?'var(--accent2)':'var(--border-light)'};transition:all .3s"></div>`
    ).join('');
  }

  // Update next button
  const nextBtn=document.getElementById('seq-next-btn');
  if(nextBtn){
    if(isLast){
      nextBtn.textContent=I18n.t('intro.startComp')||'▶ ابدأ المسابقة';
      nextBtn.style.background='linear-gradient(135deg,#00a854,var(--success))';
      nextBtn.style.color='#001a0e';
      nextBtn.style.padding='10px 22px';
    }else{
      nextBtn.textContent=I18n.t('question.next')||'التالي →';
      nextBtn.style.background='';nextBtn.style.color='';nextBtn.style.padding='8px 20px';
    }
  }
  _updateSeqNavButtons();

  if(screen==='seq-welcome'){
    _showSeqWelcome();
  }else{
    _removeSeqWelcome();
    showView(screen);
  }

  // Auto-advance only in auto mode — NOT on the last screen (categories)
  if(state.settings.presentationMode==='sequence'&&!isLast){
    const delay=screen==='seq-welcome'?5000:4500;
    _seqTimer=setTimeout(()=>_showSeqScreen(idx+1),delay);
  }
}

function seqNext(){
  clearTimeout(_seqTimer);_seqTimer=null;
  try{stopEffectSound();}catch(e){try{ErrorBus.capture(e,"catch#19")}catch(_){}}
  // On last screen, start competition directly
  if(_seqStep>=_seqScreens.length-1){
    _showSeqOverlay(false);_removeSeqWelcome();
    // T-5.2: Last step in sequence → jump to categories view directly
    showView('categories');
    return;
  }
  _showSeqScreen(_seqStep+1);
}

function seqPrev(){
  clearTimeout(_seqTimer);_seqTimer=null;
  if(_seqStep<=0){toast(I18n.t('toast.alreadyAtFirst'),'info');return;}
  try{stopEffectSound();}catch(e){try{ErrorBus.capture(e,"catch#20")}catch(_){}}
  _showSeqScreen(_seqStep-1);
}

function seqSkipAll(){
  clearTimeout(_seqTimer);_seqTimer=null;
  _seqStep=0;
  _showSeqOverlay(false);_removeSeqWelcome();
  showView('categories');
}

// Update prev button visibility
function _updateSeqNavButtons(){
  const prevBtn=document.getElementById('seq-prev-btn');
  if(prevBtn){
    prevBtn.style.opacity=_seqStep<=0?'.4':'1';
    prevBtn.style.pointerEvents=_seqStep<=0?'none':'auto';
  }
}

function _showSeqWelcome(){
  _removeSeqWelcome();
  const ALL_VIEWS_IDS=['login','admin','intro','teams','categories','question','scores','credits','bigclock','teamstats','podium','solo-map','solo-question'];
  ALL_VIEWS_IDS.forEach(v=>{const el=document.getElementById('view-'+v);if(el)el.classList.add('hidden')});
  const div=document.createElement('div');
  div.id='seq-welcome-screen';
  div.style.cssText='position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;background:var(--bg-deep);overflow:hidden;box-sizing:border-box';
  div.innerHTML=`
    <div style="position:absolute;inset:0;pointer-events:none;background:var(--bg-particles)"></div>
    <div style="position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(var(--grid-color) 1px,transparent 1px),linear-gradient(90deg,var(--grid-color) 1px,transparent 1px);background-size:56px 56px;mask-image:radial-gradient(ellipse at center,black 10%,transparent 75%);opacity:.5"></div>
    <div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;max-width:800px">
      <div class="seq-anim-item" style="font-size:clamp(1rem,2.5vw,1.4rem);color:var(--accent2);font-weight:700;margin-bottom:clamp(12px,2vh,24px);opacity:0;animation:seq-fade-up .8s ease .2s forwards">مرحباً بكم في</div>
      <div class="seq-anim-item" style="font-size:clamp(2.2rem,8vw,5.5rem);font-weight:900;line-height:1.1;margin-bottom:clamp(14px,3vh,32px);background:linear-gradient(135deg,var(--accent1-light),var(--accent1),var(--accent1-dark));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-shadow:none;opacity:0;animation:seq-scale-in 1s cubic-bezier(.175,.885,.32,1.275) .5s forwards">${state.settings.name||'المسابقة'}</div>
      <div class="seq-anim-item" style="font-size:clamp(.95rem,2.5vw,1.5rem);color:var(--text-secondary);line-height:1.7;max-width:600px;opacity:0;animation:seq-fade-up .8s ease 1s forwards">${state.settings.welcomeMessage||'أهلاً وسهلاً'}</div>
      <div style="margin-top:clamp(20px,4vh,40px);opacity:0;animation:seq-fade-up .6s ease 1.5s forwards">
        <div style="width:60px;height:3px;background:linear-gradient(90deg,var(--accent2),var(--accent1));border-radius:2px;margin:0 auto"></div>
      </div>
    </div>`;
  document.body.appendChild(div);
}

function _removeSeqWelcome(){
  const el=document.getElementById('seq-welcome-screen');
  if(el)el.remove();
}

let _previewTimer=null;

// Insert Arabic text wrapper at cursor position
function insertArabicText(){
  const ta=document.getElementById('q-text-input');
  if(!ta)return;
  const start=ta.selectionStart,end=ta.selectionEnd;
  const selected=ta.value.slice(start,end)||'النص';
  const insert='\\text{'+selected+'}';
  ta.value=ta.value.slice(0,start)+insert+ta.value.slice(end);
  ta.focus();
  // Place cursor inside the {} wrapping the selected text
  ta.setSelectionRange(start+7,start+7+selected.length);
  debouncePreviewMath();
}

// Common equation templates
function insertCommonTemplate(name){
  const templates={
    quadratic: '\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\n\n\\text{حيث } a, b, c \\text{ هي معاملات المعادلة}',
    pythagoras: '\n$$a^2 + b^2 = c^2$$\n\n\\text{حيث } c \\text{ هو الوتر}',
    fraction: '\n$$\\frac{\\text{البسط}}{\\text{المقام}}$$',
    area_circle: '\n$$A = \\pi r^2$$\n\n\\text{حيث } r \\text{ نصف القطر}',
  };
  const ta=document.getElementById('q-text-input');
  if(!ta||!templates[name])return;
  const start=ta.selectionStart;
  const insert=templates[name];
  ta.value=ta.value.slice(0,start)+insert+ta.value.slice(ta.selectionEnd);
  ta.focus();
  ta.setSelectionRange(start+insert.length,start+insert.length);
  debouncePreviewMath();
}
function debouncePreviewMath(){
  clearTimeout(_previewTimer);
  _previewTimer=setTimeout(previewMath,500);
}

function insertMathSnippet(snippet){
  const ta=document.getElementById('q-text-input');
  if(!ta)return;
  const start=ta.selectionStart, end=ta.selectionEnd;
  const selected=ta.value.slice(start,end);
  // For snippets with {}, place cursor/selection inside first {}
  let insert=snippet;
  let cursorOffset=snippet.length;
  if(snippet.includes('{}')&&selected){
    insert=snippet.replace('{}','{'+selected+'}');
    cursorOffset=insert.length;
  }else if(snippet.includes('{}')){
    cursorOffset=snippet.indexOf('{}') + 1; // inside {}
  }
  ta.value=ta.value.slice(0,start)+insert+ta.value.slice(end);
  ta.focus();
  ta.setSelectionRange(start+cursorOffset, start+cursorOffset);
  debouncePreviewMath();
}

function insertMathTemplate(type){
  const ta=document.getElementById('q-text-input');
  if(!ta)return;
  const start=ta.selectionStart, end=ta.selectionEnd;
  const selected=ta.value.slice(start,end)||'';
  let insert, cursor;
  if(type==='inline'){
    insert=' $'+selected+'$ ';
    cursor=start+2+selected.length;
  }else{
    insert='\n$$'+selected+'$$\n';
    cursor=start+4+selected.length;
  }
  ta.value=ta.value.slice(0,start)+insert+ta.value.slice(end);
  ta.focus();
  ta.setSelectionRange(cursor,cursor);
  debouncePreviewMath();
}

function previewMath(){
  const txt=document.getElementById('q-text-input').value.trim();
  const prev=document.getElementById('math-live-preview');
  if(!prev)return;
  if(!txt){
    prev.innerHTML='<span style="color:var(--text-muted);font-size:.85rem">'+I18n.t('question.mathPreview')+'</span>';
    prev.className='math-preview-output';
    return;
  }
  prev.textContent=txt;
  prev.className='math-preview-output';
  if(window.renderMathInElement){
    try{
      renderMathInElement(prev,{
        delimiters:[
          {left:'$$',right:'$$',display:true},
          {left:'$',right:'$',display:false},
          {left:'\\(',right:'\\)',display:false},
          {left:'\\[',right:'\\]',display:true}
        ],
        strict:false,
        throwOnError:false,
        output:'html',
        trust:false,
        // Arabic shorthand macros (typed in equation without \text{})
        macros:{
          '\\س':'x','\\ص':'y','\\ع':'n',
          '\\أ':'a','\\ب':'b','\\ر':'r',
          '\\ك':'k','\\م':'m',
        }
      });
      prev.className='math-preview-output';
      // After render — fix RTL inside KaTeX text spans
      prev.querySelectorAll('.katex .mord.text,.katex-html .mord.text').forEach(el=>{
        el.style.direction='rtl';
        el.style.unicodeBidi='embed';
      });
    }catch(err){
      prev.innerHTML='<span style="color:var(--danger);font-size:.82rem">⚠ '+err.message+'</span>';
      prev.className='math-preview-output has-error';
    }
  }
}
function toggleFullscreen(){
  if(document.fullscreenElement){
    try{document.exitFullscreen()}catch(e){try{ErrorBus.capture(e,"catch#21")}catch(_){}}
  }else{requestFullscreenSafe()}
}
function requestFullscreenSafe(){
  const el=document.documentElement;
  try{
    if(el.requestFullscreen)el.requestFullscreen();
    else if(el.webkitRequestFullscreen)el.webkitRequestFullscreen();
    else if(el.mozRequestFullScreen)el.mozRequestFullScreen();
    // Show hint
    const hint=document.getElementById('fs-hint');
    if(hint){hint.classList.add('show');setTimeout(()=>hint.classList.remove('show'),3500);}
  }catch(e){try{ErrorBus.capture(e,"catch#22")}catch(_){}}
}

function selectCatAndStart(catId){
  // Stop wheel music if still playing from wheel spin
  try{AudioMixer.stop('wheel');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_117")}catch(_){}}
  // Restore BGM after wheel spin (if it was playing before)
  try{BgmResumeTracker.restore();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_118")}catch(_){}}
  state.currentCatId=catId;
  if(!state.usedQuestions[catId])state.usedQuestions[catId]=new Set();
  const cat=state.categories.find(c=>c.id===catId);
  const used=state.usedQuestions[catId];
  let avail=cat.questions.map((_,i)=>i).filter(i=>!used.has(i));
  // Apply bank size limit
  const bankSize=state.settings.bankSize||0;
  if(bankSize>0&&avail.length>bankSize){
    avail=shuffleArray(avail).slice(0,bankSize);
  }
  // Shuffle questions if enabled
  if(state.settings.shuffleQuestions) avail=shuffleArray(avail);
  if(!avail.length){toast(I18n.t('toast.noMoreQuestions'),'info');return}
  if(state.settings.compMode==='full_cat'){
    const nT=state.teams.length||1;
    state.fullCatQueue=avail.map((qIdx,offset)=>({catId,qIdx,teamIdx:(state.currentTeamIndex+offset)%nT}));
    state.fullCatQueuePos=0;
    showView('question');
    loadQuestionFromQueue();
  }else{
    const qIdx=avail[Math.floor(Math.random()*avail.length)];
    state.currentQIndex=qIdx;
    showView('question');
    showTurnOverlay(state.currentTeamIndex,()=>loadQuestion(catId,qIdx,state.currentTeamIndex));
  }
}

// ═══════════════════════════════════════════════════════
//  TURN OVERLAY
// ════════════════════════════════════════════════════════
function showTurnOverlay(teamIdx,cb){
  const team=state.teams[teamIdx];
  if(!team){if(cb)cb();return}
  const overlay=document.getElementById('turn-overlay');
  document.getElementById('turn-overlay-name').textContent=team.name;
  document.getElementById('turn-overlay-name').style.color=team.color;
  document.getElementById('turn-overlay-sub').textContent=I18n.t('turn.getReady');
  overlay.classList.add('show');
  setTimeout(()=>{overlay.classList.remove('show');if(cb)setTimeout(cb,300)},2000);
}

// ════════════════════════════════════════════════════════
//  QUESTION LOADING
// ════════════════════════════════════════════════════════

// Helper: restore "التالي" button if manual-transition mode changed it
function restoreNextButton(){
  const nextBtn=document.querySelector('.footer-action-btns .btn-primary');
  if(nextBtn&&nextBtn.dataset.mode==='transition'){
    nextBtn.textContent=I18n.t('question.next');
    nextBtn.dataset.mode='';
    nextBtn.onclick=()=>nextQuestion();
  }
}
function showTransitionPrompt(){
  const nextBtn=document.querySelector('.footer-action-btns .btn-primary');
  if(nextBtn){
    nextBtn.dataset.originalText=nextBtn.textContent;
    nextBtn.innerHTML='<svg class="svg-icon" viewBox="0 0 24 24" fill="currentColor" style="width:.9em;height:.9em"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg> '+I18n.t('transition.categories');
    nextBtn.dataset.mode='transition';
    nextBtn.onclick=function(){
      nextBtn.dataset.mode='';
      nextBtn.innerHTML='<svg class="svg-icon" viewBox="0 0 24 24" fill="currentColor" style="width:.9em;height:.9em"><path d="M8 5v14l11-7z"/></svg> '+(nextBtn.dataset.originalText||I18n.t('question.next')||'التالي ←');
      nextBtn.onclick=function(){nextQuestion();};
      showView('categories');
    };
  }
}
function loadQuestionFromQueue(){
  const item=state.fullCatQueue[state.fullCatQueuePos];
  if(!item){document.getElementById('fullcat-progress-wrap').classList.add('hidden');advanceTeamAndGoBack();return}
  const total=state.fullCatQueue.length,done=state.fullCatQueuePos;
  document.getElementById('fullcat-progress-wrap').classList.remove('hidden');
  document.getElementById('fullcat-label-text').textContent=I18n.t('fullcat.questionOf',{current:done+1,total:total});
  document.getElementById('fullcat-progress-fill').style.width=(total>0?done/total*100:0)+'%';
  state.currentQIndex=item.qIdx;
  showTurnOverlay(item.teamIdx,()=>loadQuestion(item.catId,item.qIdx,item.teamIdx));
}



// ─── V7 S6: MATCH question type helpers ───

// Editor state for pairs during modal editing
let _editingMatchPairs = [];

function _initMatchPairsEditor(){
  const editor=document.getElementById('match-pairs-editor');
  if(!editor)return;
  // Default to 4 empty pairs if empty
  if(_editingMatchPairs.length===0){
    _editingMatchPairs=[{left:'',right:''},{left:'',right:''},{left:'',right:''},{left:'',right:''}];
  }
  _renderMatchPairsEditor();
}

function _renderMatchPairsEditor(){
  const editor=document.getElementById('match-pairs-editor');
  if(!editor)return;
  editor.innerHTML=_editingMatchPairs.map((p,i)=>`
    <div class="match-pair-row" style="display:flex;gap:10px;align-items:center;padding:10px;background:var(--bg-surface);border-radius:8px;border:1px solid var(--border)">
      <span style="font-weight:700;color:var(--accent1);min-width:24px;text-align:center">${i+1}</span>
      <input type="text" class="form-input" style="flex:1;margin:0" placeholder="العنصر الأول" value="${_escapeAttr(p.left||'')}"
        oninput="_updateMatchPair(${i},'left',this.value)">
      <span style="color:var(--text-muted);font-size:1.2rem">⇄</span>
      <input type="text" class="form-input" style="flex:1;margin:0" placeholder="يقابله" value="${_escapeAttr(p.right||'')}"
        oninput="_updateMatchPair(${i},'right',this.value)">
    </div>
  `).join('');
  const cnt=document.getElementById('match-pair-count');if(cnt)cnt.textContent=_editingMatchPairs.length;
}

function _escapeAttr(s){return String(s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;');}

function _updateMatchPair(idx,side,value){
  if(!_editingMatchPairs[idx])return;
  _editingMatchPairs[idx][side]=value;
}

function addMatchPair(){
  if(_editingMatchPairs.length>=8){if(typeof toast==='function')toast(I18n.t('toast.maxPairsReached'),'info');return;}
  _editingMatchPairs.push({left:'',right:''});
  _renderMatchPairsEditor();
}

function removeLastMatchPair(){
  if(_editingMatchPairs.length<=2){if(typeof toast==='function')toast(I18n.t('toast.minPairsRequired'),'info');return;}
  _editingMatchPairs.pop();
  _renderMatchPairsEditor();
}

// ─── MATCH runtime renderer (called from loadQuestion) ───
let _matchRuntime = null;  // {selections: Map<leftIdx, rightIdx>, submitted: false}

function _renderMatchQuestion(q){
  if(!q||q.type!=='match')return;
  const pairs=q.matchPairs||[];
  if(pairs.length<2)return;
  const grid=document.getElementById('q-options-grid');if(!grid)return;
  
  // Hide legacy bars (options revealer etc.)
  const rb=document.getElementById('reveal-options-bar');if(rb)rb.style.display='none';
  
  // Create shuffled right column (but keep original order reference for grading)
  const rightOrder=pairs.map((_,i)=>i);
  for(let i=rightOrder.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [rightOrder[i],rightOrder[j]]=[rightOrder[j],rightOrder[i]];
  }
  
  _matchRuntime={selections:new Map(),rightOrder,submitted:false,pairs};
  
  // 4-color palette for linked pairs
  const colors=['#00d4ff','#ffb300','#a78bfa','#00e676','#ff4b6e','#00bcd4','#ff9800','#c5e1a5'];
  
  const leftHtml=pairs.map((p,i)=>`
    <button type="button" class="match-item match-left" data-match-idx="${i}" onclick="_handleMatchLeftClick(${i})">
      <span class="match-bullet">${i+1}</span>
      <span class="match-text">${_escapeAttr(p.left||'')}</span>
    </button>
  `).join('');
  
  const rightHtml=rightOrder.map((origIdx,pos)=>`
    <button type="button" class="match-item match-right" data-match-origidx="${origIdx}" onclick="_handleMatchRightClick(${origIdx})">
      <span class="match-text">${_escapeAttr(pairs[origIdx].right||'')}</span>
    </button>
  `).join('');
  
  grid.innerHTML=`
    <div class="match-container">
      <div class="match-columns">
        <div class="match-col match-col-left">${leftHtml}</div>
        <div class="match-col match-col-right">${rightHtml}</div>
      </div>
      <div class="match-status" id="match-status">اضغط على عنصر من اليمين ثم ما يقابله من اليسار</div>
      <div class="match-actions">
        <button class="btn btn-ghost btn-sm" onclick="_resetMatch()">↶ مسح التوصيلات</button>
        <button class="btn btn-success btn-lg" id="match-submit-btn" onclick="_submitMatch()" disabled>✓ تحقق من الإجابة</button>
      </div>
    </div>
  `;
  
  // Attach palette on the container for CSS variable use
  const cont=grid.querySelector('.match-container');
  if(cont)cont._colors=colors;
}

let _matchSelectedLeft = -1;

function _handleMatchLeftClick(idx){
  if(!_matchRuntime||_matchRuntime.submitted)return;
  if(_matchRuntime.selections.has(idx)){
    // Unlink this left
    _matchRuntime.selections.delete(idx);
    _refreshMatchUI();
    return;
  }
  _matchSelectedLeft=idx;
  document.querySelectorAll('.match-left').forEach(el=>{
    el.classList.toggle('match-selected',+el.dataset.matchIdx===idx);
  });
  document.getElementById('match-status').textContent=I18n.t('match.nowSelectLeft');
}

function _handleMatchRightClick(origIdx){
  if(!_matchRuntime||_matchRuntime.submitted)return;
  if(_matchSelectedLeft<0){
    document.getElementById('match-status').textContent=I18n.t('match.selectRight');
    return;
  }
  // Remove any existing link to this right (one-to-one)
  for(const [l,r] of _matchRuntime.selections){
    if(r===origIdx){_matchRuntime.selections.delete(l);break;}
  }
  _matchRuntime.selections.set(_matchSelectedLeft,origIdx);
  _matchSelectedLeft=-1;
  _refreshMatchUI();
}

function _refreshMatchUI(){
  if(!_matchRuntime)return;
  const container=document.querySelector('.match-container');
  const colors=(container&&container._colors)||['#00d4ff','#ffb300','#a78bfa','#00e676'];
  // Reset all
  document.querySelectorAll('.match-item').forEach(el=>{
    el.style.removeProperty('--match-color');
    el.classList.remove('match-linked','match-selected');
  });
  // Apply colors
  let colorIdx=0;
  for(const [leftIdx,rightIdx] of _matchRuntime.selections){
    const color=colors[colorIdx%colors.length];colorIdx++;
    const l=document.querySelector('.match-left[data-match-idx="'+leftIdx+'"]');
    const r=document.querySelector('.match-right[data-match-origidx="'+rightIdx+'"]');
    if(l){l.classList.add('match-linked');l.style.setProperty('--match-color',color);}
    if(r){r.classList.add('match-linked');r.style.setProperty('--match-color',color);}
  }
  // Update status + enable submit when all linked
  const status=document.getElementById('match-status');
  const total=_matchRuntime.pairs.length;
  const linked=_matchRuntime.selections.size;
  if(status)status.textContent=I18n.t('match.linkedOf',{linked:linked,total:total});
  const submit=document.getElementById('match-submit-btn');
  if(submit)submit.disabled=(linked<total);
}

function _resetMatch(){
  if(!_matchRuntime||_matchRuntime.submitted)return;
  _matchRuntime.selections.clear();
  _matchSelectedLeft=-1;
  _refreshMatchUI();
  document.getElementById('match-status').textContent=I18n.t('match.instructions');
}

function _submitMatch(){
  if(!_matchRuntime||_matchRuntime.submitted)return;
  if(state.answered)return;
  _matchRuntime.submitted=true;
  state.answered=true;
  try{clearTimer();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_119")}catch(_){}}
  try{_stopTenseAudio();state._tenseMusicActive=false;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_120")}catch(_){}}

  // Grade: ground truth is left i ↔ right origIdx i
  const total=_matchRuntime.pairs.length;
  let correct=0;
  for(let i=0;i<total;i++){ if(_matchRuntime.selections.get(i)===i)correct++; }

  // Highlight user's selections
  for(const [leftIdx,rightIdx] of _matchRuntime.selections){
    const isOk=(leftIdx===rightIdx);
    const l=document.querySelector('.match-left[data-match-idx="'+leftIdx+'"]');
    const r=document.querySelector('.match-right[data-match-origidx="'+rightIdx+'"]');
    if(l)l.classList.add(isOk?'match-correct':'match-wrong');
    if(r)r.classList.add(isOk?'match-correct':'match-wrong');
  }
  // Mark unmatched lefts as missed
  for(let i=0;i<total;i++){
    if(!_matchRuntime.selections.has(i)){
      const l=document.querySelector('.match-left[data-match-idx="'+i+'"]');
      if(l)l.classList.add('match-missed');
    }
  }

  const team=getCurrentTeam();
  const q=getCurrentQuestion();
  const wrongCount=total-correct;
  const isFullCorrect=correct===total;
  // Partial credit: count as correct if correct > wrong (majority correct)
  const isMajorityCorrect=correct>wrongCount;
  // Use orderScoringMode setting for match too (consistent with order scoring)
  const scoringMode=state.settings.orderScoringMode||'all';
  const isOverallCorrect=state.settings.matchAllOrNothing?(correct===total):(scoringMode==='majority'?(isFullCorrect||isMajorityCorrect):isFullCorrect);
  _updateStreak(team?.id,isOverallCorrect);
  const streakBonus=_streakBonusPts(team?.id);
  const basePts=_getQuestionPts(q);
  const fullPts=basePts+streakBonus;
  let awardedPts=0;
  if(state.settings.matchAllOrNothing){
    awardedPts=(correct===total)?fullPts:0;
  }else if(isFullCorrect){
    awardedPts=fullPts;
  }else if(isMajorityCorrect&&scoringMode==='majority'){
    // Majority correct (only in majority mode): proportional points based on correct ratio
    awardedPts=Math.round(basePts*(correct/total));
    if(awardedPts<1)awardedPts=1;
    awardedPts+=streakBonus;
  }else{
    // Minority correct: no points
    awardedPts=0;
  }

  const status=document.getElementById('match-status');
  if(status){
    if(correct===total){
      status.innerHTML='<span style="color:var(--success);font-weight:800">🎉 '+I18n.t('match.allCorrect',{pts:awardedPts})+'</span>';
    }else if(isMajorityCorrect){
      status.innerHTML='<span style="color:var(--success);font-weight:700">✅ إجابة صحيحة جزئياً ('+correct+'/'+total+') +'+awardedPts+' نقطة</span>';
    }else if(correct===0){
      status.innerHTML='<span style="color:var(--danger);font-weight:800">❌ '+I18n.t('match.noCorrect')+'</span>';
    }else{
      status.innerHTML='<span style="color:var(--accent2);font-weight:700">'+I18n.t('match.partialCorrect',{correct:correct,total:total,pts:awardedPts})+'</span>';
    }
  }

  // Show correct mapping for missed/incorrect pairs
  function _esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  const wrongOrMissed=[];
  for(let i=0;i<total;i++){ if(_matchRuntime.selections.get(i)!==i) wrongOrMissed.push(i); }
  if(wrongOrMissed.length){
    const cont=document.querySelector('.match-container');
    if(cont && !cont.querySelector('.match-correct-hint')){
      const hint=document.createElement('div');
      hint.className='match-correct-hint';
      hint.style.cssText='margin-top:12px;padding:10px 14px;background:rgba(0,230,118,.08);border:1px solid var(--success);border-radius:10px;font-size:.82rem;direction:rtl;text-align:right';
      hint.innerHTML='<div style="font-weight:900;color:var(--success);margin-bottom:6px">✅ '+I18n.t('match.correctLinks')+'</div>'+
        wrongOrMissed.map(function(i){
          const p=_matchRuntime.pairs[i]||{};
          return '<div style="padding:3px 0"><span style="color:var(--accent2);font-weight:700;margin-left:6px">'+(i+1)+'.</span>'+_esc(p.left||'')+' ⟵ '+_esc(p.right||'')+'</div>';
        }).join('');
      cont.appendChild(hint);
    }
  }

  const timeUsed=(state.timerTotal||30)-Math.max(0,(state.timeLeft||0));

  // Apply score / negative marking — symmetric with other question types
  if(team){
    if(awardedPts>0){
      playSound('correct');try{launchConfetti();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_121")}catch(_){}}
      applyScore(team,awardedPts,{reason:'match:'+correct+'/'+total});
      try{_checkEarlyWinner(team);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_122")}catch(_){}}
    }else{
      try{playSound('wrong');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_123")}catch(_){}}
      if(state.settings.negativeMarking){
        const neg=state.settings.negMarkValue||1;
        team.score=Math.max(0,(team.score||0)-neg);
        try{recordScoreHistoryV5(team.id,-neg);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_124")}catch(_){}}
        try{saveState();saveGameProgress();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_125")}catch(_){}}
        try{floatScore(team,'-'+neg,'minus');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_126")}catch(_){}}
      }
    }
  }

  // Always log answer for analytics — V10-fix: use isOverallCorrect for majority match credit in stats
  try{recordAnswer(team?.id, isOverallCorrect||(correct>0), timeUsed);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_127")}catch(_){}}

  // Mark question as used — V10-fix: ensure Set is initialized
  try{ if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set(); state.usedQuestions[state.currentCatId].add(state.currentQIndex); }catch(e){try{ErrorBus.capture(e,"catch#AUTO_128")}catch(_){}}

  // Show explanation if any
  if(q && q.explanation){
    const eb=document.getElementById('q-explanation-box');
    if(eb){eb.innerHTML='<span>💡</span> '+_sanitize(q.explanation);eb.classList.remove('hidden');}
  }

  // Disable interaction
  const btn=document.getElementById('match-submit-btn');if(btn)btn.disabled=true;
  const resetBtn=document.querySelector('.match-actions .btn-ghost');
  if(resetBtn){resetBtn.disabled=true;resetBtn.style.opacity='.4';resetBtn.style.pointerEvents='none';}

  try{updateTicker();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_129")}catch(_){}}
  try{updateUndoBtn();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_130")}catch(_){}}
  try{Store.dispatch('MATCH_SUBMITTED',{teamId:team?.id,correct:correct,total:total,points:awardedPts});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_131")}catch(_){}}
}

// Match.expose: wired via Quiz object literal below


// ── V7 T-5.3: Progressive reveal function ──
function _applyProgressiveReveal(grid){
  if(!state.settings.progressiveReveal)return;
  const buttons=Array.from(grid.querySelectorAll('.option-btn'));
  if(!buttons.length)return;
  // Only apply in auto mode (manual mode handled by reveal button)
  if(state.settings.progressiveRevealMode!=='auto')return;
  const interval=Math.max(200,Math.min(5000,state.settings.revealInterval||800));
  buttons.forEach(btn=>{
    btn.classList.add('opt-hidden-pr');
    btn.classList.remove('opt-visible-pr');
  });
  buttons.forEach((btn,idx)=>{
    TimerRegistry.setTimeout(function(){
      btn.classList.remove('opt-hidden-pr');
      btn.classList.remove('hidden-option'); // V12-fix: Also remove hidden-option so button becomes clickable
      btn.classList.add('opt-visible-pr');
      btn.classList.add('reveal-anim');
      state.optionsRevealed=Math.min((state.optionsRevealed||0)+1, state.totalOptionsToReveal);
    },idx*interval,'question');
  });
}

// V7 M2: render correct/wrong host buttons on fitb questions
function _renderHostFitbButtons(q){
  if(!q||q.type!=='fitb')return;
  if(state.settings.showHostTfBtnsOnFitb===false)return;
  const grid=document.getElementById('q-options-grid');if(!grid)return;
  if(grid.querySelector('.host-fitb-controls'))return;
  const team=getCurrentTeam();
  const teamLabel=team?(' لفريق '+team.name):'';
  const pts=_getQuestionPts(q);
  const host=document.createElement('div');
  host.className='host-fitb-controls';
  host.style.cssText='display:flex;gap:8px;margin-top:14px;justify-content:center;flex-wrap:wrap';
  host.innerHTML='<button class="btn btn-success btn-sm" onclick="_hostFitbGrade(true)" title="'+I18n.t('question.grantPointTeam','منح النقطة').replace('{team}','').replace('+{pts}','')+'">✅ '+I18n.t('answer.correct')+'</button>'+
    '<button class="btn btn-danger btn-sm" onclick="_hostFitbGrade(false)" title="'+I18n.t('fitb.judgeHint','أو يحكم المقدم')+'">❌ '+I18n.t('answer.wrong')+'</button>';
  grid.appendChild(host);
}
function _hostFitbGrade(isCorrect){
  if(state.answered)return;
  const q=getCurrentQuestion();if(!q||(q.type!=='fitb'&&q.type!=='quran'))return;
  const team=getCurrentTeam();
  state.answered=true;
  try{clearTimer();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_132")}catch(_){}}
  try{_stopTenseAudio();state._tenseMusicActive=false;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_133")}catch(_){}}
  // Mark question as used so it doesn't reappear in the category
  try{
    if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
    state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_134")}catch(_){}}
  const pts_base=_getQuestionPts(q);
  _updateStreak(team?.id,isCorrect);
  const streakBonus=isCorrect?_streakBonusPts(team?.id):0;
  const pts=pts_base+streakBonus;
  const timeUsed=(state.timerTotal||30)-Math.max(0,state.timeLeft);
  const inp=document.getElementById('fitb-player-input');
  if(inp){
    inp.disabled=true;
    inp.style.borderBottomColor=isCorrect?'var(--success)':'var(--danger)';
    if(isCorrect)inp.style.color='var(--success)';
  }
  if(isCorrect){
    try{playSound('correct');launchConfetti();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_135")}catch(_){}}
    if(team){
      team.score=(team.score||0)+pts;
      try{recordScoreHistoryV5(team.id,pts);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_136")}catch(_){}}
      try{floatScore(team,'+'+pts+(streakBonus>0?' 🔥':''));}catch(e){try{ErrorBus.capture(e,"catch#AUTO_137")}catch(_){}}
      try{_checkEarlyWinner(team);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_138")}catch(_){}}
    }
    toast((I18n.t('toast.correctAnswer')||'✅ المقدم: إجابة صحيحة!')+(streakBonus>0?' 🔥 مكافأة تسلسل!':''),'success');
  }else{
    try{playSound('wrong');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_139")}catch(_){}}
    if(team&&state.settings.negativeMarking){
      const neg=state.settings.negMarkValue||1;
      team.score=Math.max(0,(team.score||0)-neg);
      try{recordScoreHistoryV5(team.id,-neg);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_140")}catch(_){}}
      try{floatScore(team,'-'+neg,'minus');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_141")}catch(_){}}
    }
    toast(I18n.t('toast.hostWrongAnswer'),'danger');
    // Show correct answer hint for fitb and quran
    if((q.type==='fitb'||q.type==='quran') && inp){
      const storedAns=(q.fitbAnswer||(state._fitbCorrect||'')).trim();
      const cleanAns=(state._fitbCorrectDisplay||storedAns.split('|')[0]).trim();
      if(cleanAns && !inp.parentNode.querySelector('.fitb-correct-hint')){
        const hint=document.createElement('div');
        hint.className='fitb-correct-hint';
        hint.innerHTML='✅ '+I18n.t('fitb.correctAnswer')+' <strong dir="rtl">'+cleanAns+'</strong>';
        const wrap=inp.closest('.fitb-blank-wrap');
        if(wrap)wrap.insertAdjacentElement('afterend',hint);else inp.parentNode.appendChild(hint);
      }
    }
  }
  if(q.explanation){
    try{const ebox=document.getElementById('q-explanation-box');if(ebox){ebox.innerHTML='<span style="font-size:1rem">💡</span> '+_sanitize(q.explanation);ebox.classList.remove('hidden');}}catch(e){try{ErrorBus.capture(e,"catch#AUTO_252")}catch(_){}}
  }
  try{recordAnswer(team?.id,isCorrect,timeUsed);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_142")}catch(_){}}
  try{saveState();saveGameProgress();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_143")}catch(_){}}
  try{updateTicker();updateUndoBtn();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_144")}catch(_){}}
  const ctrl=document.querySelector('.host-fitb-controls');if(ctrl)ctrl.remove();
  try{Store.dispatch('FITB_GRADED',{teamId:team?.id,correct:isCorrect,points:isCorrect?pts:0});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_145")}catch(_){}}
}

// ── Phase 4.1: DOM element cache for loadQuestion() ──
const _qCache={};
function qEl(id){
  if(!_qCache[id])_qCache[id]=document.getElementById(id);
  return _qCache[id];
}
function invalidateQCache(){Object.keys(_qCache).forEach(k=>delete _qCache[k]);}

function loadQuestion(catId,qIdx,teamIdx){
  // ── Phase 1: clean previous question state ──
  clearTimer();
  clearQuestionState();
  cancelTransition(false);
  _transitionInProgress=false;
  restoreNextButton();
  // ── Phase 2: validate inputs ──
  const cat=state.categories.find(c=>c.id===catId);
  if(!cat){console.warn('loadQuestion: catId not found:',catId);return;}
  const q=cat.questions[qIdx];
  if(!q||typeof q!=='object'){console.warn('loadQuestion: qIdx out of range:',qIdx,'/ len:',cat.questions.length);return;}
  const team=state.teams[teamIdx]||null;
  // ── Phase 3: update state ──
  state.currentCatId=catId;state.currentQIndex=qIdx;
  // Difficulty badge
  // V12-fix: Normalize legacy question types ('mcq' → 'text') for backward compatibility
  if(q.type==='mcq'||!q.type) q.type='text';
  const diff=q.difficulty||'medium';
  // Phase 4.2: Use DOM builder instead of innerHTML for diff badge
  const _diffBadge=qEl('q-diff-badge');
  _diffBadge.textContent='';
  _diffBadge.appendChild(h('span.diff-badge.'+DIFF_CLASS[diff],DIFF_LABELS[diff]));
  const typeIcon={text:'',image:'🖼️ ',audio:'🎧 ',video:'🎬 ',math:'∑ '}[q.type||'text']||'';
  // Phase 4.2: Use DOM builder instead of innerHTML for category label
  const _catLabel=qEl('q-cat-label');
  _catLabel.textContent='';
  _catLabel.appendChild(document.createTextNode((_sanitizeIcon(cat.icon)||'📂')+' '));
  _catLabel.appendChild(document.createTextNode(_sanitizeUser(cat.name)));
  if(typeIcon){
    const tiSpan=document.createElement('span');
    tiSpan.style.cssText='margin-right:6px;font-size:.75rem;opacity:.7';
    tiSpan.textContent=typeIcon;
    _catLabel.appendChild(tiSpan);
  }
  // Show host hint button if question has hostNote
  const hintBtn=qEl('host-hint-btn');if(hintBtn)hintBtn.style.display=q.hostNote?'':'none';
  // Show proper question number depending on mode
  const qLabel=state.settings.compMode==='full_cat'&&state.fullCatQueue.length
    ?`السؤال ${state.fullCatQueuePos+1} من ${state.fullCatQueue.length} (${cat.name})`
    :`السؤال ${qIdx+1} من ${cat.questions.length}`;
  qEl('q-number-label').textContent=qLabel;
  // (text content is set below in media/math block)
  // ── Media area ──
  const mediaArea=qEl('q-media-area');
  mediaArea.style.display='none';
  mediaArea.innerHTML='';
  if(q.type==='image'&&q.mediaData){
    const img=document.createElement('img');
    img.src=q.mediaData;img.className='q-media-img';img.alt='صورة السؤال';
    mediaArea.appendChild(img);mediaArea.style.display='block';
  } else if(q.type==='audio'&&q.mediaData){
    mediaArea.innerHTML=`
      <button class="q-media-audio-btn" id="q-audio-play-btn" onclick="toggleQuestionAudio()">
        <div class="audio-wave"><span></span><span></span><span></span><span></span><span></span></div>
        <span id="q-audio-btn-label">▶ تشغيل المقطع الصوتي</span>
      </button>`;
    mediaArea.style.display='block';
    // Preload
    if(window._qAudioEl){try{window._qAudioEl.pause();window._qAudioEl.src='';window._qAudioEl.load()}catch(e){try{ErrorBus.capture(e,"catch#23")}catch(_){}}}
    window._qAudioEl=new Audio(q.mediaData);
    window._qAudioEl.onended=()=>{
      document.getElementById('q-audio-play-btn')?.classList.remove('playing');
      const lbl=document.getElementById('q-audio-btn-label');
      if(lbl)lbl.textContent=I18n.t('question.playAudio')||'▶ تشغيل المقطع الصوتي';
    };
  } else if(q.type==='video'){
    // Build enhanced video player container
    var videoContainer=document.createElement('div');
    videoContainer.className='q-video-container';
    videoContainer.style.cssText='position:relative;max-width:100%;border-radius:14px;overflow:hidden;border:2px solid var(--border);box-shadow:0 8px 30px rgba(0,0,0,.5);background:#000';
    var vid=document.createElement('video');
    vid.id='q-video-player';
    vid.className='q-media-video';
    vid.playsInline=true;
    vid.preload='metadata';
    vid.setAttribute('playsinline','');
    vid.style.cssText='width:100%;max-height:400px;object-fit:contain;display:block';
    vid.alt='فيديو السؤال';
    // Custom controls overlay
    var controlsBar=document.createElement('div');
    controlsBar.className='q-video-controls';
    controlsBar.style.cssText='position:absolute;bottom:0;left:0;right:0;display:flex;align-items:center;gap:8px;padding:8px 12px;background:linear-gradient(transparent,rgba(0,0,0,.85));opacity:0;transition:opacity .3s;z-index:10';
    // Play/Pause button
    var playPauseBtn=document.createElement('button');
    playPauseBtn.id='q-video-playpause';
    playPauseBtn.innerHTML='▶';
    playPauseBtn.style.cssText='background:none;border:none;color:#fff;font-size:1.4rem;cursor:pointer;padding:4px 8px;min-width:36px';
    playPauseBtn.onclick=function(){if(vid.paused){vid.play();}else{vid.pause();}};
    // Progress bar
    var progressWrap=document.createElement('div');
    progressWrap.style.cssText='flex:1;height:6px;background:rgba(255,255,255,.2);border-radius:3px;cursor:pointer;position:relative';
    var progressFill=document.createElement('div');
    progressFill.id='q-video-progress';
    progressFill.style.cssText='height:100%;background:#00e8d0;border-radius:3px;width:0%;transition:width .1s';
    progressWrap.appendChild(progressFill);
    progressWrap.onclick=function(e){var r=this.getBoundingClientRect();var pct=(e.clientX-r.left)/r.width;vid.currentTime=pct*vid.duration;};
    // Time display
    var timeDisplay=document.createElement('span');
    timeDisplay.id='q-video-time';
    timeDisplay.style.cssText='color:#fff;font-size:.75rem;min-width:80px;text-align:center;font-family:monospace';
    timeDisplay.textContent='0:00 / 0:00';
    // Volume slider
    var volumeWrap=document.createElement('div');
    volumeWrap.style.cssText='display:flex;align-items:center;gap:4px';
    var volumeIcon=document.createElement('span');
    volumeIcon.innerHTML='🔊';
    volumeIcon.style.cssText='font-size:.9rem;cursor:pointer';
    volumeIcon.onclick=function(){if(vid.muted){vid.muted=false;volumeIcon.innerHTML='🔊';}else{vid.muted=true;volumeIcon.innerHTML='🔇';}};
    var volumeSlider=document.createElement('input');
    volumeSlider.type='range';
    volumeSlider.min='0';volumeSlider.max='100';volumeSlider.value='80';
    volumeSlider.style.cssText='width:60px;height:4px;accent-color:#00e8d0;cursor:pointer';
    volumeSlider.oninput=function(){vid.volume=this.value/100;volumeIcon.innerHTML=this.value==0?'🔇':this.value<50?'🔉':'🔊';};
    vid.volume=0.8;
    volumeWrap.appendChild(volumeIcon);
    volumeWrap.appendChild(volumeSlider);
    // Speed control button
    var speedBtn=document.createElement('button');
    speedBtn.innerHTML='1x';
    speedBtn.style.cssText='background:none;border:1px solid rgba(255,255,255,.4);border-radius:4px;color:#fff;font-size:.75rem;cursor:pointer;padding:2px 8px;min-width:30px';
    var _speeds=[0.5,1,1.5,2];var _speedIdx=1;
    speedBtn.onclick=function(){_speedIdx=(_speedIdx+1)%_speeds.length;vid.playbackRate=_speeds[_speedIdx];speedBtn.innerHTML=_speeds[_speedIdx]+'x';};
    // Fullscreen button
    var fsBtn=document.createElement('button');
    fsBtn.innerHTML='⛶';
    fsBtn.style.cssText='background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;padding:4px 8px';
    fsBtn.onclick=function(){if(videoContainer.requestFullscreen)videoContainer.requestFullscreen();else if(videoContainer.webkitRequestFullscreen)videoContainer.webkitRequestFullscreen();};
    // Back to question button
    var backBtn=document.createElement('button');
    backBtn.innerHTML='↩';
    backBtn.title='العودة للسؤال';
    backBtn.style.cssText='background:none;border:none;color:#fff;font-size:1.2rem;cursor:pointer;padding:4px 8px';
    backBtn.onclick=function(){vid.pause();vid.currentTime=0;};
    controlsBar.appendChild(playPauseBtn);
    controlsBar.appendChild(progressWrap);
    controlsBar.appendChild(timeDisplay);
    controlsBar.appendChild(speedBtn);
    controlsBar.appendChild(volumeWrap);
    controlsBar.appendChild(backBtn);
    controlsBar.appendChild(fsBtn);
    videoContainer.appendChild(vid);
    videoContainer.appendChild(controlsBar);
    // Show/hide controls on hover
    videoContainer.onmouseenter=function(){controlsBar.style.opacity='1';};
    videoContainer.onmouseleave=function(){if(!vid.paused)controlsBar.style.opacity='0';};
    vid.onplay=function(){playPauseBtn.innerHTML='⏸';controlsBar.style.opacity='1';setTimeout(function(){if(!vid.paused)controlsBar.style.opacity='0';},3000);};
    vid.onpause=function(){playPauseBtn.innerHTML='▶';controlsBar.style.opacity='1';};
    vid.ontimeupdate=function(){
      if(!vid.duration)return;
      var pct=(vid.currentTime/vid.duration)*100;
      progressFill.style.width=pct+'%';
      var fmt=function(s){var m=Math.floor(s/60);var sec=Math.floor(s%60);return m+':'+(sec<10?'0':'')+sec;};
      timeDisplay.textContent=fmt(vid.currentTime)+' / '+fmt(vid.duration);
    };
    vid.onended=function(){
      playPauseBtn.innerHTML='▶';controlsBar.style.opacity='1';
      // If video timer mode is 'afterVideo', start the timer now
      if(state._videoTimerPending){
        state._videoTimerPending=false;
        var timeLimit=q.time||state.settings.defaultTime||30;
        startTimer(timeLimit);
        toast(I18n.t('toast.timerAfterVideo'),'info');
      }
    };
    mediaArea.appendChild(videoContainer);mediaArea.style.display='block';
    // Load video source - handle both blob reference and data URL
    if(q.videoRef&&typeof MediaDB!=='undefined'){
      try{
        MediaDB.get(q.videoRef).then(function(blob){
          if(blob){
            var blobUrl=URL.createObjectURL(blob);
            vid.src=blobUrl;
            vid._blobUrl=blobUrl;
            vid.load();
          }else if(q.mediaData){
            // Fallback to data URL if blob not found
            vid.src=q.mediaData;vid.load();
          }
        }).catch(function(){if(q.mediaData){vid.src=q.mediaData;vid.load();}});
      }catch(e){if(q.mediaData){vid.src=q.mediaData;vid.load();}}
    }else if(q.mediaData){
      vid.src=q.mediaData;vid.load();
    }
  }
  // ── Media Attachment (audio/video on ANY question type) ──
  if(q.mediaAttachment){
    const attachBtn=document.createElement('button');
    attachBtn.className='q-media-audio-btn';
    attachBtn.id='q-media-attach-play-btn';
    attachBtn.style.cssText='margin-top:10px';
    attachBtn.onclick=function(){toggleMediaAttachment(q);};
    const icon=q.mediaAttachment.type==='video'?'🎬':'🎵';
    attachBtn.innerHTML=`<span>${icon}</span><span id="q-media-attach-btn-label">`+I18n.t('media.playAttachment')+`</span>`;
    mediaArea.appendChild(attachBtn);
    mediaArea.style.display='block';
  }
  // ── Text / Math rendering ──
  const textEl=qEl('q-text-main');
  textEl.textContent=q.text;
  // Apply question text font (Cairo default or Amiri for Quranic text)
  textEl.style.fontFamily=q.textFont==='amiri'?"'Amiri','Noto Naskh Arabic',serif":"'Cairo',sans-serif";
  textEl.style.fontSize=q.textFont==='amiri'?'calc(clamp(1.2rem,3.5vw,2rem)*var(--fs))':'';
  textEl.style.lineHeight=q.textFont==='amiri'?'2.2':'';
  if(q.type==='math'&&window.renderMathInElement){
    try{
      renderMathInElement(textEl,{
        delimiters:[
          {left:'$$',right:'$$',display:true},
          {left:'$',right:'$',display:false},
          {left:'\\(',right:'\\)',display:false},
          {left:'\\[',right:'\\]',display:true}
        ],
        strict:false,
        throwOnError:false,
        output:'html',
        trust:false,
      });
    }catch(e){
      // Graceful fallback — show raw text
      textEl.textContent=q.text;
      toast(I18n.t('toast.mathRenderError'),'danger');
    }
  }
  // ── Progressive reveal ──
  state.optionsRevealed=0;
  const optImgsCount=q.optionImages||[];
  state.totalOptionsToReveal=[0,1,2,3].filter(i=>q.options[i]||(optImgsCount[i])).length;
  const revBar=qEl('reveal-options-bar');
  const _revMode=state.settings.progressiveRevealMode||(state.settings.progressiveReveal?'manual':'off');
  if(state.settings.progressiveReveal&&!state.answered){
    revBar.style.display='block';
    qEl('reveal-btn').disabled=false;
    qEl('reveal-btn-text').textContent=I18n.t('question.showOptionN',{revealed:state.optionsRevealed,total:state.totalOptionsToReveal});
    // Auto reveal mode: start automatic progressive reveal
    if(_revMode==='auto'){
      qEl('reveal-options-bar').style.display='none';
      let _autoRevIdx=0;
      const _autoRevDelay=state.settings.revealDuration||1000;
      const _autoRevInterval=setInterval(()=>{
        if(state.answered||_autoRevIdx>=state.totalOptionsToReveal){clearInterval(_autoRevInterval);return;}
        revealNextOption();_autoRevIdx++;
      },_autoRevDelay);
      state._autoRevInterval=_autoRevInterval;
    }
    qEl('reveal-btn-icon').textContent='▶';
  }else{
    revBar.style.display='none';
  }
  // ── Confirm panel reset ──
  state.pendingAnswer=-1;
  qEl('answer-confirm-panel').classList.add('hidden');
  // ── Team label
  // Team label
  const tl=qEl('q-team-label');
  if(team){tl.textContent=team.name;tl.style.background=team.color;tl.style.color='#1a1000';tl.style.display=''}
  else tl.style.display='none';
  // Options - support progressive reveal
  const hiddenCls=state.settings.progressiveReveal?'hidden-option':'';
  // Shuffle options if enabled (store mapping for correct answer)
  let optOrder=[0,1,2,3];
  if(state.settings.shuffleOptions){
    optOrder=shuffleArray([0,1,2,3].filter(i=>q.options[i]||((q.optionImages||[])[i])));
    // pad remaining
    [0,1,2,3].forEach(i=>{if(!optOrder.includes(i))optOrder.push(i)});
    state._shuffledOptOrder=optOrder; // store for answer check
  }else{
    state._shuffledOptOrder=null;
  }
  const optImgs=q.optionImages||[];
  // Phase 4.2: Use DocumentFragment + DOM builder instead of innerHTML for options
  const _optGrid=qEl('q-options-grid');
  _optGrid.textContent='';
  const _optFrag=document.createDocumentFragment();
  optOrder.forEach(function(origIdx,displayPos){
    const i=origIdx; const opt=q.options[i];
    const hasText=!!opt;
    const hasImg=!!optImgs[i];
    if(!hasText&&!hasImg)return;
    const btn=document.createElement('button');
    const extraCls=!hasText&&hasImg?'opt-btn-img-only':'';
    btn.className='option-btn '+hiddenCls+(extraCls?' '+extraCls:'');
    btn.id='opt-btn-'+i;
    btn.setAttribute('onclick','handleOptionClick('+i+')');
    btn.setAttribute('aria-label','الخيار '+getAnswerLabel(i)+': '+(hasText?_sanitize(opt).replace(/<[^>]*>/g,''):'صورة'));
    const letterDiv=document.createElement('div');
    letterDiv.className='opt-btn-letter';
    letterDiv.setAttribute('aria-hidden','true');
    letterDiv.textContent=getAnswerLabel(i);
    const contentDiv=document.createElement('div');
    contentDiv.className='opt-btn-content';
    if(hasImg){
      const imgEl=document.createElement('img');
      imgEl.className='opt-btn-image';
      imgEl.src=optImgs[i];
      imgEl.alt='خيار '+getAnswerLabel(i);
      contentDiv.appendChild(imgEl);
    }
    if(hasText){
      const textDiv=document.createElement('div');
      textDiv.className='opt-btn-text';
      textDiv.setAttribute('dir','auto');
      textDiv.innerHTML=_sanitize(opt); // sanitized HTML for rich text
      contentDiv.appendChild(textDiv);
    }
    btn.appendChild(letterDiv);
    btn.appendChild(contentDiv);
    _optFrag.appendChild(btn);
  });
  _optGrid.appendChild(_optFrag);
  // Staggered option entry animation
  try{
    var _opts=document.querySelectorAll('#view-question .option-btn');
    _opts.forEach(function(opt,i){
      opt.classList.add('anim-stagger-in');
      opt.style.animationDelay=(i*80)+'ms';
    });
  }catch(e){}
  // Render math in options containing $ delimiters
  if(window.renderMathInElement){
    document.querySelectorAll('#q-options-grid .opt-btn-text').forEach(el=>{
      if(el.textContent.includes('$')||el.textContent.includes('\\(')){
        try{
          renderMathInElement(el,{
            delimiters:[
              {left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},
              {left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}
            ],
            strict:false,throwOnError:false,
            macros:{'\\س':'x','\\ص':'y','\\ع':'n','\\أ':'a','\\ب':'b','\\ر':'r'}
          });
          el.querySelectorAll('.katex .mord.text').forEach(e=>{
            e.style.direction='rtl';e.style.unicodeBidi='embed';
          });
        }catch(e){try{ErrorBus.capture(e,"catch#24")}catch(_){}}
      }
    });
  }
  // Explanation
  qEl('q-explanation-box').classList.add('hidden');
  qEl('q-explanation-box').textContent='';
  // ── FITB: fill-in-the-blank ──
  if(q.type==='fitb'){
    qEl('reveal-options-bar').style.display='none';
    const textEl=qEl('q-text-main');
    // Replace [___] with a styled input
    textEl.innerHTML=q.text.replace(/\[___\]/g,
      '<span class="fitb-blank-wrap"><input class="fitb-input" id="fitb-player-input" type="text" dir="auto" placeholder="اكتب إجابتك..." autocomplete="off" spellcheck="false"></span>');
    const fitbInput=document.getElementById('fitb-player-input');
    if(fitbInput){
      fitbInput.addEventListener('keydown',e=>{if(e.key==='Enter')checkFitbAnswer();});
      setTimeout(()=>fitbInput.focus(),200);
    }
    qEl('q-options-grid').innerHTML=
      '<div style="text-align:center;margin-top:14px">'+
      '<button class="btn btn-primary" style="padding:12px 36px;font-size:1rem" onclick="checkFitbAnswer()">✅ تحقق من الإجابة</button></div>';
  }
  // ── QURAN: verse display ──
  if(q.type==='quran'){
    qEl('reveal-options-bar').style.display='none';
    const meta=q.quranMeta||{};
    const displayMode=q.quranDisplayMode||'both';
    const mode=q.quranMode||'full';
    const isComplete=(mode==='complete');
    const textEl=qEl('q-text-main');
    // For complete mode: show first half, blank for second
    const halfIdx=meta.halfIdx||Math.ceil(q.text.length/2);
    // For complete mode: show the first half with a styled gap indicator
    const displayText=isComplete
      ?q.text.slice(0,halfIdx)+
       '<span style="display:inline-block;border-bottom:2px dashed var(--accent1);min-width:80px;margin:0 8px;opacity:.6;vertical-align:middle">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>'+
       '<span style="color:var(--text-muted);font-size:.8em"> ﴾ أكمل الآية ﴿</span>'
      :q.text;
    if(displayMode!=='audio'){
      const _metaBadge=q.quranHideMeta?'':
        '<div style="text-align:center;margin-top:4px"><span class="quran-meta-badge">'+
        (meta.surah||'')+(meta.ayah?' — الآية '+meta.ayah:'')+(meta.juz?' — الجزء '+meta.juz:'')+
        '</span></div>';
      textEl.innerHTML='<div class="quran-verse-display">'+displayText+'</div>'+_metaBadge;
    } else {
      textEl.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:.95rem;padding:16px">'+I18n.t('quran.listenThenAnswer')+'</div>';
    }
    // Audio button
    const audioWrap=qEl('q-media-area');
    audioWrap.innerHTML='';audioWrap.style.display='none';
    if(q.quranAudio&&(displayMode==='audio'||displayMode==='both')){
      const _qaBtn=document.createElement('button');
      _qaBtn.className='q-media-audio-btn';_qaBtn.id='quran-audio-btn';
      _qaBtn.innerHTML='<div class="audio-wave"><span></span><span></span><span></span><span></span><span></span></div><span id="quran-audio-lbl">\u25b6 \u0627\u0633\u062a\u0645\u0639 \u0644\u0644\u062a\u0644\u0627\u0648\u0629</span>';
      _qaBtn.addEventListener('click',()=>toggleQuranAudio(q.quranAudio));
      audioWrap.innerHTML='';audioWrap.appendChild(_qaBtn);
      audioWrap.style.display='block';
      if(displayMode==='audio')setTimeout(()=>toggleQuranAudio(q.quranAudio),800);
    }
    // Options grid
    const optGrid=qEl('q-options-grid');
    if(isComplete){
      const _complDiv=document.createElement('div');_complDiv.style.cssText='text-align:center;margin-top:16px;display:flex;flex-direction:column;align-items:center;gap:12px';
      const _complInp=document.createElement('input');
      _complInp.type='text';_complInp.id='fitb-player-input';_complInp.dir='rtl';
      _complInp.placeholder='أكمل الآية الكريمة...';
      _complInp.style.cssText="max-width:500px;width:100%;font-family:'Amiri','Noto Naskh Arabic',serif;font-size:1.1rem;text-align:center;padding:10px 14px;border:2px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--text-primary);direction:rtl";
      _complInp.addEventListener('keydown',e=>{if(e.key==='Enter')checkFitbAnswer();});
      const _complBtn=document.createElement('button');
      _complBtn.className='btn btn-primary';_complBtn.style.cssText='padding:12px 36px;font-size:1rem';
      _complBtn.textContent='✅ '+I18n.t('order.verifyAnswer');_complBtn.addEventListener('click',checkFitbAnswer);
      // Presenter judge buttons
      const _judgeRow=document.createElement('div');_judgeRow.style.cssText='display:flex;gap:8px;margin-top:4px';
      const _jOk=document.createElement('button');_jOk.className='btn btn-success btn-sm';_jOk.textContent='✅ '+I18n.t('answer.correct');_jOk.addEventListener('click',()=>presenterJudge(true));
      const _jNo=document.createElement('button');_jNo.className='btn btn-danger btn-sm';_jNo.textContent='❌ '+I18n.t('answer.wrong');_jNo.addEventListener('click',()=>presenterJudge(false));
      _judgeRow.appendChild(_jOk);_judgeRow.appendChild(_jNo);
      const _judgeHint=document.createElement('div');_judgeHint.style.cssText='font-size:.7rem;color:var(--text-muted)';_judgeHint.textContent=I18n.t('question.judgeHint');
      _complDiv.appendChild(_complInp);_complDiv.appendChild(_complBtn);_complDiv.appendChild(_judgeRow);_complDiv.appendChild(_judgeHint);
      optGrid.innerHTML='';optGrid.appendChild(_complDiv);
      // Store correct answer for checking
      // For complete mode: the correct answer is the second half of the verse
      // We store raw (with tashkeel) but compare after stripping
      const rawSecondHalf=q.text.slice(halfIdx).trim();
      state._fitbCorrect=rawSecondHalf;
      state._fitbCorrectDisplay=rawSecondHalf; // shown to user after wrong answer
    } else if(mode==='number'){
      const n=+(meta.ayah||1);
      const pool=[];for(let d=-8;d<=8;d++){if(d!==0&&n+d>0)pool.push(String(n+d));}
      const choices=shuffleArray([String(n),...shuffleArray(pool).slice(0,3)]);
      const ci=choices.indexOf(String(n));state._quranCorrectIdx=ci;state._quranChoices=choices;
      optGrid.innerHTML=choices.map((s,i)=>'<button class="option-btn" id="opt-btn-'+i+'" onclick="handleQuranChoice('+i+')"><div class="opt-btn-letter">'+getAnswerLabel(i)+'</div><div class="opt-btn-content"><div class="opt-btn-text">الآية '+s+'</div></div></button>').join('');
    } else if(mode==='surah_number'){
      const n=+(meta.surahNum||1);
      const pool=[];for(let d=-8;d<=8;d++){if(d!==0&&n+d>=1&&n+d<=114)pool.push(String(n+d));}
      const choices=shuffleArray([String(n),...shuffleArray(pool).slice(0,3)]);
      const ci=choices.indexOf(String(n));state._quranCorrectIdx=ci;state._quranChoices=choices;
      optGrid.innerHTML=choices.map((s,i)=>'<button class="option-btn" id="opt-btn-'+i+'" onclick="handleQuranChoice('+i+')"><div class="opt-btn-letter">'+getAnswerLabel(i)+'</div><div class="opt-btn-content"><div class="opt-btn-text">السورة رقم '+s+'</div></div></button>').join('');
    } else if(mode==='juz'){
      const n=+(meta.juz||1);
      const pool=[];for(let d=-5;d<=5;d++){if(d!==0&&n+d>=1&&n+d<=30)pool.push(String(n+d));}
      const choices=shuffleArray([String(n),...shuffleArray(pool).slice(0,3)]);
      const ci=choices.indexOf(String(n));state._quranCorrectIdx=ci;state._quranChoices=choices;
      optGrid.innerHTML=choices.map((s,i)=>'<button class="option-btn" id="opt-btn-'+i+'" onclick="handleQuranChoice('+i+')"><div class="opt-btn-letter">'+getAnswerLabel(i)+'</div><div class="opt-btn-content"><div class="opt-btn-text">الجزء '+s+'</div></div></button>').join('');
    } else {
      // Default: surah name
      const correct=meta.surah||'';
      const dist=shuffleArray(QURAN_SURAHS.filter(s=>s!==correct)).slice(0,3);
      const choices=shuffleArray([correct,...dist]);
      const ci=choices.indexOf(correct);state._quranCorrectIdx=ci;state._quranChoices=choices;
      optGrid.innerHTML=choices.map((s,i)=>'<button class="option-btn" id="opt-btn-'+i+'" onclick="handleQuranChoice('+i+')"><div class="opt-btn-letter">'+getAnswerLabel(i)+'</div><div class="opt-btn-content"><div class="opt-btn-text" dir="rtl">'+s+'</div></div></button>').join('');
    }
  }
  // ── ORDER: drag-to-sort UI ──
  if(q.type==='order'){
    document.getElementById('reveal-options-bar').style.display='none';
    var orderOpts=q.options.filter(function(o){return o}).map(function(o,i){return{text:o,origIdx:i}});
    function _fyShuffle(arr){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
    var shuffled=_fyShuffle(orderOpts);
    if(orderOpts.length>=2){var attempts=0;while(attempts<8 && shuffled.every(function(it,idx){return it.origIdx===idx;})){shuffled=_fyShuffle(orderOpts);attempts++;}
      if(shuffled.every(function(it,idx){return it.origIdx===idx;})){var _t=shuffled[0];shuffled[0]=shuffled[1];shuffled[1]=_t;}}
    state._orderItems=shuffled;state._orderCorrect=orderOpts.map(function(o){return o.origIdx});
    state._fitbCorrect=null;state._fitbCorrectDisplay=null; // clear any quran complete state
    document.getElementById('q-options-grid').innerHTML=
      '<div id="order-items-container" style="display:flex;flex-direction:column;gap:8px;max-width:540px;margin:0 auto;width:100%"></div>'+
      '<div style="text-align:center;margin-top:14px;display:flex;flex-direction:column;align-items:center;gap:8px">'+
      '<div class="text-sm text-muted" style="font-size:.75rem">'+I18n.t('order.dragHint')+'</div>'+
      '<button class="btn btn-primary" style="padding:12px 32px;font-size:1rem" onclick="checkOrderAnswer()">✅ '+I18n.t('order.verifyAnswer')+'</button>'+(state.settings.orderShowTF!==false?'<div style="display:flex;gap:8px;margin-top:2px"><button class="btn btn-success btn-sm" onclick="presenterJudge(true)">✅ '+I18n.t('answer.correct')+'</button><button class="btn btn-danger btn-sm" onclick="presenterJudge(false)">❌ '+I18n.t('answer.wrong')+'</button></div>':'')+
      '<div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">'+I18n.t('order.judgeHint')+'</div>'+
      '</div>';
    _renderOrderItems();
    _initOrderTouchDrag();
  }
    // ── T/F: replace options grid with special UI ──
  if(q.type==='tf'){
    document.getElementById('reveal-options-bar').style.display='none';
    document.getElementById('q-options-grid').innerHTML=
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:clamp(10px,2vw,20px);max-width:500px;margin:0 auto;width:100%">'+
        '<button class="option-btn" id="opt-btn-0" onclick="handleOptionClick(0)" style="border-color:var(--success);min-height:90px;font-size:1.2rem">'+
          '<div class="opt-btn-letter" style="font-size:1.5rem;background:rgba(0,230,118,.15);border-color:var(--success)">✅</div>'+
          '<div class="opt-btn-content" style="text-align:center;font-size:1.1rem;font-weight:800">'+I18n.t('answer.correct')+'</div>'+
        '</button>'+
        '<button class="option-btn" id="opt-btn-1" onclick="handleOptionClick(1)" style="border-color:var(--danger);min-height:90px;font-size:1.2rem">'+
          '<div class="opt-btn-letter" style="font-size:1.5rem;background:rgba(255,59,92,.12);border-color:var(--danger)">❌</div>'+
          '<div class="opt-btn-content" style="text-align:center;font-size:1.1rem;font-weight:800">'+I18n.t('answer.wrong')+'</div>'+
        '</button>'+
      '</div>';
  }
  // Lifelines
  buildLifelinesBtns(team);
  buildScoreBtns();
  // Timer (hard questions get accent color)
  const timeLimit=q.time||state.settings.defaultTime;
  document.getElementById('timer-ring-fill').style.stroke=diff==='hard'?'var(--danger)':'var(--success)';
  // Timer - handle video timer mode
  if(q.type==='video'&&state.settings.videoTimerMode&&state.settings.videoTimerMode!=='auto'){
    if(state.settings.videoTimerMode==='manual'){
      // Don't start timer - host will start it manually
      state.timeLeft=timeLimit;state.timerTotal=timeLimit;
      updateTimerDisplay(timeLimit,timeLimit);
      state._videoTimerPending=false;
      toast(I18n.t('toast.timerClickHint'),'info');
    }else if(state.settings.videoTimerMode==='afterVideo'){
      // Prepare timer values but don't start - will auto-start when video ends
      state.timeLeft=timeLimit;state.timerTotal=timeLimit;
      updateTimerDisplay(timeLimit,timeLimit);
      state._videoTimerPending=true;
      toast(I18n.t('toast.timerAutoAfterVideo'),'info');
    }
  }else{
    startTimer(timeLimit);
  }
  try{_renderHostFitbButtons(q);}catch(e){ErrorBus.capture(e,"loadQuestion:fitbBtns");}
  try{if(q&&q.type==="match")_renderMatchQuestion(q);}catch(e){ErrorBus.capture(e,"loadQuestion:match");}
  try{const _g=document.getElementById("q-options-grid");if(_g&&q&&q.type!=="match")_applyProgressiveReveal(_g);}catch(e){ErrorBus.capture(e,"loadQuestion:progressiveReveal");}
  // Push state to audience/remote screens immediately
  _pushRemoteState();
}

// ════════════════════════════════════════════════════════
//  LIFELINES
// ════════════════════════════════════════════════════════
function buildLifelinesBtns(team){
  const bar=document.getElementById('lifelines-bar');
  if(!team||!state.settings.showLifelines){bar.innerHTML='';return;}
  const ll=state.teamLifelines[team.id]||{fifty:0,time:0,skip:0};
  // Hide completely if all zeros and showLifelinesWhenZero is false
  const allZero=ll.fifty<=0&&ll.time<=0&&ll.skip<=0;
  if(allZero&&!state.settings.showLifelinesWhenZero){bar.innerHTML='';return;}
  bar.innerHTML=`
    <span class="text-sm text-muted" style="margin-right:4px;white-space:nowrap">🆘 أطواق النجاة:</span>
    <button class="lifeline-btn" id="ll-btn-fifty" onclick="useLifeline('fifty')" ${ll.fifty<=0?'disabled':''} title="حذف خيارين خاطئين" data-i18n="title.fiftyFifty" data-i18n-attr="title">
      <span class="ll-icon">🔀</span><span>50/50</span>
      <span class="ll-label">${ll.fifty>0?ll.fifty+' متبقي':'نفد'}</span>
    </button>
    <button class="lifeline-btn" id="ll-btn-time" onclick="useLifeline('time')" ${ll.time<=0?'disabled':''} title="إضافة 15 ثانية للعداد" data-i18n="title.extraTime" data-i18n-attr="title">
      <span class="ll-icon">⏰</span><span>+15 ثانية</span>
      <span class="ll-label">${ll.time>0?ll.time+' متبقي':'نفد'}</span>
    </button>
    <button class="lifeline-btn" id="ll-btn-skip" onclick="useLifeline('skip')" ${ll.skip<=0?'disabled':''}>
      <span class="ll-icon">🔄</span><span>تمرير</span>
      <span class="ll-label">${ll.skip>0?ll.skip+' متبقي':'نفد'}</span>
    </button>`;
}

function useLifeline(type){
  if(state.answered)return;
  const team=state.teams[state.settings.compMode==='full_cat'
    ?(state.fullCatQueue[state.fullCatQueuePos]?.teamIdx??state.currentTeamIndex)
    :state.currentTeamIndex];
  if(!team)return;
  const ll=state.teamLifelines[team.id];
  if(!ll||ll[type]<=0)return;
  ll[type]--;
  if(type==='fifty'){
    // Reveal all hidden options first (progressive reveal compatibility)
    const hiddenBtns=document.querySelectorAll('.option-btn.hidden-option, .option-btn.opt-hidden-pr');
    hiddenBtns.forEach((b,hi)=>{
      setTimeout(()=>{b.classList.remove('hidden-option','opt-hidden-pr');b.classList.add('reveal-anim','opt-visible-pr')},hi*120);
    });
    if(hiddenBtns.length>0){
      state.optionsRevealed=state.totalOptionsToReveal;
      document.getElementById('reveal-options-bar').style.display='none';
    }
    const cat=state.categories.find(c=>c.id===state.currentCatId);
    if(!cat||!cat.questions){toast(I18n.t('toast.catNotFound')||'القسم غير موجود','danger');ll[type]++;return;}
    const q=cat.questions[state.currentQIndex];
    if(!q){toast(I18n.t('toast.qNotFound')||'السؤال غير موجود','danger');ll[type]++;return;}
    // Build list of visible wrong options only
    const allBtns=[...document.querySelectorAll('.option-btn')];
    const visibleWrongs=allBtns
      .map(btn=>{const origI=parseInt(btn.id.replace('opt-btn-',''));return {btn,i:origI};})
      .filter(({btn,i})=>!isNaN(i) && i!==q.correct && q.options[i] && !btn.classList.contains('faded'));
    const canHide=Math.min(2,visibleWrongs.length-0); // keep at least correct visible
    // Make sure we don't hide all wrongs if there's only 1
    const numToHide=Math.min(canHide, visibleWrongs.length>1?2:0);
    if(numToHide===0){toast(I18n.t('toast.noWrongOptionsVisible'),'info');ll[type]++;return;}
    const shuffled=visibleWrongs.sort(()=>Math.random()-.5).slice(0,numToHide);
    setTimeout(()=>{
      shuffled.forEach(({btn})=>btn.classList.add('faded'));
      toast(I18n.t('toast.fiftyFiftyUsed',{count:numToHide===1?'1':'2'}),'gold');
    }, hiddenBtns.length>0 ? hiddenBtns.length*120+100 : 0);
  }
  if(type==='time'){
    state.timeLeft+=15;
    state.timerTotal+=15;              // ← grow total so % stays meaningful
    updateTimerDisplay(state.timeLeft,state.timerTotal);
    toast(I18n.t('toast.extraTimeAdded'),'gold');
  }
  if(type==='skip'){
    toast(I18n.t('toast.questionSkipped'),'gold');
    if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
    state.usedQuestions[state.currentCatId].add(state.currentQIndex);
    nextQuestion();return;
  }
  buildLifelinesBtns(team);
  // Animate the button briefly after rebuild
  setTimeout(()=>{
    const btn=document.getElementById(`ll-btn-${type}`);
    if(btn&&!btn.disabled){btn.classList.add('just-used');setTimeout(()=>btn.classList.remove('just-used'),400);}
  },50);
}

function buildScoreBtns(){
  // Show/hide manual scoring bar based on setting
  const scWrap=document.getElementById('score-controls-wrap');
  if(scWrap) scWrap.style.display=(state.settings.showManualPoint!==false)?'':'none';
  document.getElementById('score-btns-container').innerHTML=state.teams.map(t=>`
    <button class="score-team-btn" 
      style="background:linear-gradient(135deg,${t.color}dd,${t.color});box-shadow:0 3px 14px ${t.color}55"
      onclick="givePoint('${t.id}')" title="منح نقطة لـ ${_sanitizeUser(t.name)}">
      <span style="width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.25);display:inline-flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:900;flex-shrink:0">${t.name[0]}</span>
      <span style="font-size:.83rem">${_sanitizeUser(t.name)}</span>
      <span style="background:rgba(0,0,0,.2);border-radius:20px;padding:1px 7px;font-size:.8rem;font-weight:900">+1</span>
    </button>`
  ).join('');
}

// ════════════════════════════════════════════════════════
//  GAMEPLAY
// ════════════════════════════════════════════════════════
function handleOptionClick(origIdx){
  if(state.answered)return;
  if(!getCurrentQuestion()){console.warn('handleOptionClick: no current question');return;}
  // V12-fix: Track click to prevent double-fire from onclick + event delegation
  _lastOptionClickTime=Date.now();_lastOptionClickIdx=origIdx;
  const btn=document.getElementById(`opt-btn-${origIdx}`);
  if(btn&&btn.classList.contains('hidden-option')){
    // Reveal all then select
    revealAllOptions();
    setTimeout(()=>{if(!state.answered)handleOptionClick(origIdx);}, state.totalOptionsToReveal*120+60);
    return;
  }
  if(state.settings.confirmAnswer){
    state.pendingAnswer=origIdx;
    state._quranPendingIdx=null; // clear quran pending if switching to regular option
    document.querySelectorAll('.option-btn').forEach(b=>b.classList.remove('pending-answer'));
    if(btn) btn.classList.add('pending-answer');
    document.getElementById('answer-confirm-panel').classList.remove('hidden');
  }else{
    selectOption(origIdx);
  }
}

function undoAnswer(){
  if(state.answered)return;
  state.pendingAnswer=-1;
  state._quranPendingIdx=null;
  state._orderConfirmPending=false; // V12-fix: Also clear ordering confirmation
  document.querySelectorAll('.option-btn').forEach(btn=>btn.classList.remove('pending-answer'));
  document.getElementById('answer-confirm-panel').classList.add('hidden');
}

function confirmAnswer(){
  if(state.answered)return; // Guard: already answered (e.g., reveal was used)
  // Handle Quran pending answer first (unified confirm flow)
  if(state._quranPendingIdx!=null){
    const pending=state._quranPendingIdx;
    state._quranPendingIdx=null;
    document.getElementById('answer-confirm-panel').classList.add('hidden');
    _finalizeQuranChoice(pending);
    return;
  }
  // V7 F6: guard against null/undefined AND negative (preserves behaviour for 0 = false answer in T/F)
  if(state.pendingAnswer==null||state.pendingAnswer<0){
    // V12-fix: Check for ordering question confirmation pending
    if(state._orderConfirmPending){
      document.getElementById('answer-confirm-panel').classList.add('hidden');
      checkOrderAnswer(); // This will finalize the ordering answer
      return;
    }
    return;
  }
  document.getElementById('answer-confirm-panel').classList.add('hidden');
  selectOption(state.pendingAnswer);
  state.pendingAnswer=-1;
}

// Progressive reveal
function revealAllOptions(){
  document.querySelectorAll('.option-btn.hidden-option, .option-btn.opt-hidden-pr').forEach((b,i)=>{
    setTimeout(()=>{b.classList.remove('hidden-option','opt-hidden-pr');b.classList.add('reveal-anim','opt-visible-pr')},i*120);
  });
  state.optionsRevealed=state.totalOptionsToReveal;
  _pushRemoteState();
  setTimeout(()=>{document.getElementById('reveal-options-bar').style.display='none'},state.totalOptionsToReveal*120+400);
}
function revealNextOption(){
  if(state.answered)return; // stop auto-reveal once answered
  if(state.optionsRevealed>=state.totalOptionsToReveal)return;
  // Find the next hidden option btn
  let revealed=0;
  const btns=[...document.querySelectorAll('.option-btn.hidden-option')];
  if(btns.length===0){
    document.getElementById('reveal-options-bar').style.display='none';return;
  }
  const btn=btns[0];
  btn.classList.remove('hidden-option');
  btn.classList.add('reveal-anim');
  state.optionsRevealed++;
  _pushRemoteState();
  const remaining=document.querySelectorAll('.option-btn.hidden-option').length;
  if(remaining===0){
    // All revealed
    document.getElementById('reveal-btn').disabled=true;
    document.getElementById('reveal-btn-text').textContent=I18n.t('question.allRevealed');
    document.getElementById('reveal-btn-icon').textContent='✓';
    setTimeout(()=>{document.getElementById('reveal-options-bar').style.display='none'},800);
  }else{
    document.getElementById('reveal-btn-text').textContent=I18n.t('question.nextN',{revealed:state.optionsRevealed,total:state.totalOptionsToReveal});
  }
}


// ── B6: Unified question point value (difficulty-based) ──
function _getQuestionPts(q){
  if(!q)return 1;
  return (q.difficulty==='hard')?(state.settings.hardPoints||2):1;
}
// V8: Get streak bonus points for a team (call AFTER _updateStreak)
function _streakBonusPts(teamId){
  if(!teamId||!state.settings.streakBonus)return 0;
  const streak=state.teamStreaks[teamId]||0;
  const sc=state.settings.streakCount||3;
  const sv=state.settings.streakValue||2;
  if(streak>0 && streak%sc===0){
    const team=state.teams.find(t=>t.id===teamId);
    if(team) showStreakAnimation(team,streak,sv);
    return sv;
  }
  return 0;
}
function selectOption(idx){
  if(state.answered)return;
  const cat=getCurrentCat();
  const q=getCurrentQuestion();
  if(!cat||!q){console.warn('selectOption: no active question');return;}
  // V11-fix: Track selected answer for audience screen display
  state._lastSelectedAnswer=idx;
  state.answered=true;clearTimer();
  // V11: Stop question video/audio on answer selection
  stopEffectSound();_stopTenseAudio();
  if(window._qAudioEl){try{window._qAudioEl.pause();window._qAudioEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_146")}catch(_){}}}
  var _vP=document.getElementById('q-video-player');
  if(_vP){try{_vP.pause();_vP.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_147")}catch(_){}}}
  if(window._mediaAttachEl){try{window._mediaAttachEl.pause();window._mediaAttachEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_148")}catch(_){}}}
  document.querySelectorAll('.option-btn.hidden-option, .option-btn.opt-hidden-pr').forEach(b=>{
    b.classList.remove('hidden-option','opt-hidden-pr');b.classList.add('reveal-anim','opt-visible-pr');
  });
  $show('reveal-options-bar',false);
  $cls('answer-confirm-panel','hidden',true);
  const isCorrect=idx===q.correct;
  // Use button id to get origIdx — safe whether options are shuffled or not
  document.querySelectorAll('.option-btn').forEach(btn=>{
    btn.classList.remove('pending-answer');
    btn.classList.add('revealed');
    const origI=parseInt(btn.id.replace('opt-btn-',''));
    if(origI===q.correct) btn.classList.add('correct-answer');
    else if(origI===idx&&!isCorrect) btn.classList.add('wrong-answer');
  });
  // Show explanation
  if(q.explanation){
    const ebox=document.getElementById('q-explanation-box');
    ebox.innerHTML=`<span style="font-size:1rem">💡</span> ${_sanitize(q.explanation)}`;
    ebox.classList.remove('hidden');
  }
  const teamIdx=state.settings.compMode==='full_cat'
    ?(state.fullCatQueue[state.fullCatQueuePos]?.teamIdx??state.currentTeamIndex)
    :state.currentTeamIndex;
  const timeUsed=(state.timerTotal||30)-Math.max(0,state.timeLeft);
  const team=state.teams[teamIdx];
  if(isCorrect){
    playSound('correct');launchConfetti();
    const pts=q.difficulty==='hard'?(state.settings.hardPoints||2):1;
    // ── V5: Streak Bonus ──
    let streakBonus=0;
    if(team && state.settings.streakBonus){
      state.teamStreaks[team.id]=(state.teamStreaks[team.id]||0)+1;
      const sc=state.settings.streakCount||3;
      const sv=state.settings.streakValue||2;
      if(state.teamStreaks[team.id]>0 && state.teamStreaks[team.id]%sc===0){
        streakBonus=sv;
        showStreakAnimation(team,state.teamStreaks[team.id],sv);
      }
    }else if(team){ state.teamStreaks[team.id]=(state.teamStreaks[team.id]||0)+1; }
    const totalPts=pts+streakBonus;
    toast(I18n.t('toast.correctAnswerPlay')+(totalPts>1?' ✦ '+totalPts+' '+I18n.t('question.pointsLabel'):'')+(streakBonus>0?' 🔥 '+I18n.t('toast.sequenceBonus'):''),'success');
    if(team){team.score=(team.score||0)+totalPts;recordScoreHistoryV5(team.id,totalPts);saveState();saveGameProgress();floatScore(team,'+'+totalPts);_checkEarlyWinner(team);}
    recordAnswer(teamIdx<state.teams.length?team?.id:null,true,timeUsed);
    updateStreakDisplay(team);
  }else{
    playSound('wrong');
    // Human-readable correct answer label
    const correctLabel = q.type==='tf'
      ? (q.correct===0?'✅ صحيح':'❌ خطأ')
      : (q.options[q.correct]||getAnswerLabel(q.correct));
    toast(I18n.t('toast.wrongAnswerPlay',{label:correctLabel}),'danger');
    // ── V5: Negative Marking ──
    if(state.settings.negativeMarking && team){
      const penalty=state.settings.negMarkValue||1;
      team.score=Math.max(0,(team.score||0)-penalty);
      recordScoreHistoryV5(team.id,-penalty);
      saveState();saveGameProgress();
      floatScore(team,'-'+penalty,'minus');
      toast(I18n.t('toast.penaltyDeducted',{penalty:penalty,team:team.name}),'danger');
    }
    // ── V5: Reset streak on wrong answer ──
    if(team) state.teamStreaks[team.id]=0;
    recordAnswer(team?.id,false,timeUsed);
  }
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  updateTicker();
  // Push state to audience/remote screens immediately
  try{_pushRemoteState();}catch(e){console.error("[Error]",e);}
  // ── V5: Update undo button ──
  updateUndoBtn();
  // Enhanced answer reveal animations
  try{
    var _optBtns=document.querySelectorAll('.option-btn');
    _optBtns.forEach(function(btn){
      if(btn.classList.contains('correct-answer')){btn.classList.add('correct-reveal');}
      if(btn.classList.contains('wrong-answer')){btn.classList.add('wrong-reveal');}
    });
    // Announce result to screen readers
    var _correctOpt=document.querySelector('.option-btn.correct-answer');
    if(_correctOpt)announce(t('ui.correctAnswerLabel')+_correctOpt.textContent.trim(),'assertive');
  }catch(e){}
}

function revealAnswer(){
  if(state.answered)return;clearTimer();state.answered=true;
  stopEffectSound();_stopTenseAudio();
  // V11: Stop question video/audio on answer reveal
  if(window._qAudioEl){try{window._qAudioEl.pause();window._qAudioEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_149")}catch(_){}}}
  var _vP=document.getElementById('q-video-player');
  if(_vP){try{_vP.pause();_vP.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_150")}catch(_){}}}
  if(window._mediaAttachEl){try{window._mediaAttachEl.pause();window._mediaAttachEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_151")}catch(_){}}}
  // Clear pending answer state
  state.pendingAnswer=-1;
  state._quranPendingIdx=null;
  // V11-fix: Clear selected answer tracking on reveal (no answer was selected)
  state._lastSelectedAnswer=-1;
  // Clear auto-reveal interval if active
  if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
  // Show all hidden options first
  document.querySelectorAll('.option-btn.hidden-option, .option-btn.opt-hidden-pr').forEach(b=>{
    b.classList.remove('hidden-option','opt-hidden-pr');b.classList.add('reveal-anim','opt-visible-pr');
  });
  document.getElementById('reveal-options-bar').style.display='none';
  document.getElementById('answer-confirm-panel').classList.add('hidden');
  const cat=getCurrentCat();
  const q=getCurrentQuestion();
  if(!cat||!q){return;} // guard already checked at entry

  // ── Handle different question types for reveal ──
  const qtype=q.type||'text';

  // Standard option-based questions: highlight correct answer
  if(qtype==='text'||qtype==='image'||qtype==='audio'||qtype==='video'||qtype==='math'||qtype==='tf'){
    document.querySelectorAll('.option-btn').forEach(btn=>{
      btn.classList.remove('pending-answer');
      btn.classList.add('revealed');
      const origI=parseInt(btn.id.replace('opt-btn-',''));
      if(origI===q.correct) btn.classList.add('correct-answer');
    });
  }
  // Fill-in-the-blank: show the correct answer
  else if(qtype==='fitb'){
    const inp=document.getElementById('fitb-player-input');
    const correctAns=q.fitbAnswer||(state._fitbCorrect||'');
    const displayAns=state._fitbCorrectDisplay||correctAns.split('|')[0]||correctAns;
    if(inp){
      inp.value=displayAns;
      inp.style.borderColor='var(--success)';
      inp.style.color='var(--success)';
      inp.disabled=true;
    }
    // Show correct answer below
    const optGrid=document.getElementById('q-options-grid');
    if(optGrid&&displayAns){
      const hint=document.createElement('div');
      hint.style.cssText='text-align:center;margin-top:10px;padding:8px 14px;background:rgba(0,230,118,.08);border:1px solid var(--success);border-radius:10px;color:var(--success);font-weight:700;font-size:.95rem;direction:rtl';
      hint.textContent=I18n.t('question.revealed')+' '+displayAns;
      optGrid.appendChild(hint);
    }
  }
  // Quran questions: reveal based on mode
  else if(qtype==='quran'){
    const mode=q.quranMode||'full';
    const displayMode=q.quranDisplayMode||'both';
    // For complete mode: show the full verse
    if(mode==='complete'){
      const textEl=document.getElementById('q-text-main');
      if(textEl&&q.text){
        const meta=q.quranMeta||{};
        // V11-SECURITY: Sanitize meta fields to prevent XSS via imported Quran questions
        const _safeSurah = (typeof _sanitizeUser==='function') ? _sanitizeUser(meta.surah||'') : String(meta.surah||'').replace(/[<>&"]/g,'');
        const _safeAyah  = parseInt(meta.ayah,10) || '';
        const _safeJuz   = parseInt(meta.juz,10)  || '';
        const _metaBadge=q.quranHideMeta?'':
          '<div style="text-align:center;margin-top:4px"><span class="quran-meta-badge">'+
          _safeSurah+(_safeAyah!==''?' — الآية '+_safeAyah:'')+(_safeJuz!==''?' — الجزء '+_safeJuz:'')+
          '</span></div>';
        // V11-SECURITY: quran q.text may contain HTML formatting from rich text editor,
        // but we still need to strip <script> and event handlers. Use _sanitizeHTML if available,
        // else fall back to plain text.
        const _safeQText = (typeof _sanitizeHTML==='function') ? _sanitizeHTML(q.text) : _sanitize(q.text);
        textEl.innerHTML='<div class="quran-verse-display">'+_safeQText+'</div>'+_metaBadge;
      }
      const inp=document.getElementById('fitb-player-input');
      if(inp){inp.disabled=true;}
    }
    // For number mode: highlight correct choice
    else if(mode==='number'){
      document.querySelectorAll('.option-btn').forEach(btn=>{
        btn.classList.remove('pending-answer');
        btn.classList.add('revealed');
        const origI=parseInt(btn.id.replace('opt-btn-',''));
        if(origI===q.correct) btn.classList.add('correct-answer');
      });
    }
    // For full mode: highlight correct choice if options exist
    else{
      document.querySelectorAll('.option-btn').forEach(btn=>{
        btn.classList.remove('pending-answer');
        btn.classList.add('revealed');
        const origI=parseInt(btn.id.replace('opt-btn-',''));
        if(origI===q.correct) btn.classList.add('correct-answer');
      });
    }
    // Show meta (surah, ayah, juz) on reveal if it was hidden
    if(q.quranHideMeta){
      const meta=q.quranMeta||{};
      const textEl=document.getElementById('q-text-main');
      if(textEl&&meta.surah){
        const badge=document.createElement('div');
        badge.style.cssText='text-align:center;margin-top:4px';
        badge.innerHTML='<span class="quran-meta-badge">'+meta.surah+(meta.ayah?' — الآية '+meta.ayah:'')+(meta.juz?' — الجزء '+meta.juz:'')+'</span>';
        textEl.appendChild(badge);
      }
    }
  }
  // Order questions: show correct order
  else if(qtype==='order'&&state._orderCorrect&&state._orderItems){
    document.querySelectorAll('.order-option-item').forEach((el,i)=>{
      const current=state._orderItems.map(x=>x.origIdx);
      el.classList.add(current[i]===state._orderCorrect[i]?'correct-pos':'wrong-pos');
    });
    // Show correct order if wrong
    const currentOrder=state._orderItems.map(x=>x.origIdx);
    const isCorrect=state._orderCorrect.every((v,i)=>v===currentOrder[i]);
    if(!isCorrect){
      const correctOrderEl=document.createElement('div');
      correctOrderEl.style.cssText='margin-top:12px;padding:10px 14px;background:rgba(0,230,118,.08);border:1px solid var(--success);border-radius:10px;font-size:.82rem;direction:rtl;text-align:right';
      correctOrderEl.innerHTML='<div style="font-weight:900;color:var(--success);margin-bottom:6px">'+t('ui.correctOrder')+'</div>'+
        state._orderCorrect.map((origIdx,pos)=>{
          const item=(state._orderItems||[]).find(x=>x.origIdx===origIdx)||(q?.options||[])[origIdx];
          const text=typeof item==='object'?item.text:item;
          return '<div style="padding:3px 0"><span style="color:var(--accent2);font-weight:700;margin-left:6px">'+(pos+1)+'.</span>'+(text||'—')+'</div>';
        }).join('');
      const grid=document.getElementById('q-options-grid');
      if(grid)grid.appendChild(correctOrderEl);
    }
  }
  // Match questions: show correct matches
  else if(qtype==='match'){
    // Highlight correct/incorrect matches
    document.querySelectorAll('.match-item').forEach(el=>{
      el.classList.add('revealed');
    });
    // Show correct pairs if available
    const matchData=q.matchPairs||q.options||[];
    if(matchData.length>0){
      const optGrid=document.getElementById('q-options-grid');
      if(optGrid){
        const hint=document.createElement('div');
        hint.style.cssText='margin-top:12px;padding:10px 14px;background:rgba(0,230,118,.08);border:1px solid var(--success);border-radius:10px;font-size:.82rem;direction:rtl;text-align:right';
        hint.innerHTML='<div style="font-weight:900;color:var(--success);margin-bottom:6px">'+t('ui.correctAnswers')+'</div>'+
          matchData.map((p,i)=>{
            const left=typeof p==='object'?p.left||p[0]||'':p;
            const right=typeof p==='object'?p.right||p[1]||'':'';
            return '<div style="padding:3px 0"><span style="color:var(--accent2);font-weight:700">'+(i+1)+'.</span> '+left+' ← '+right+'</div>';
          }).join('');
        optGrid.appendChild(hint);
      }
    }
  }

  if(q.explanation){
    const ebox=document.getElementById('q-explanation-box');
    ebox.innerHTML=`<span>💡</span> ${_sanitize(q.explanation)}`;
    ebox.classList.remove('hidden');
  }
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  // Record stats and reset streak (question was not answered correctly)
  const team=getCurrentTeam();
  const timeUsed=(state.timerTotal||30)-Math.max(0,state.timeLeft);
  recordAnswer(team?.id,false,timeUsed);
  _updateStreak(team?.id,false);
  updateTicker();updateUndoBtn();
  // Push state to audience/remote screens immediately
  _pushRemoteState();
  // Enhanced answer reveal animations
  try{
    var _optBtns=document.querySelectorAll('.option-btn');
    _optBtns.forEach(function(btn){
      if(btn.classList.contains('correct-answer')){btn.classList.add('correct-reveal');}
      if(btn.classList.contains('wrong-answer')){btn.classList.add('wrong-reveal');}
    });
    // Announce result to screen readers
    var _correctOpt=document.querySelector('.option-btn.correct-answer');
    if(_correctOpt)announce(t('ui.correctAnswerLabel')+_correctOpt.textContent.trim(),'assertive');
  }catch(e){}
}

function skipQuestion(){
  clearTimer();
  stopEffectSound();
  // V12-fix: Clear auto-reveal interval on skip
  if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
  if(window._qAudioEl){try{window._qAudioEl.pause()}catch(e){try{ErrorBus.capture(e,"catch#25")}catch(_){}}}
  document.getElementById('answer-confirm-panel').classList.add('hidden');
  document.getElementById('reveal-options-bar').style.display='none';
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  // ── FIX: Record skip in session stats ──
  const teamIdx=state.settings.compMode==='full_cat'
    ?(state.fullCatQueue[state.fullCatQueuePos]?.teamIdx??state.currentTeamIndex)
    :state.currentTeamIndex;
  const team=state.teams[teamIdx];
  if(team){
    if(!state.sessionStats[team.id])
      state.sessionStats[team.id]={correct:0,wrong:0,skipped:0,totalTime:0,answers:[]};
    state.sessionStats[team.id].skipped++;
    // Reset streak on skip
    if(state.teamStreaks) state.teamStreaks[team.id]=0;
  }
  try{refreshTeamStatsIfVisible();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_152")}catch(_){}}
  nextQuestion();
}

// Score history for undo (V5 - uses state)
function recordScoreHistoryV5(teamId,delta){
  // Store undo context: previous streak value, category/question index for full reversal
  const prevStreak=state.teamStreaks[teamId]||0;
  const catId=state.currentCatId;
  const qIdx=state.currentQIndex;
  state.scoreHistory.push({teamId,delta,ts:Date.now(),prevStreak,catId,qIdx});
  if(state.scoreHistory.length>500)state.scoreHistory=state.scoreHistory.slice(-400);
  updateUndoBtn();
}
function updateUndoBtn(){
  const btn=document.getElementById('undo-score-btn');if(!btn)return;
  const hasHistory=state.scoreHistory.length>0;
  btn.disabled=!hasHistory;
  if(hasHistory){
    const last=state.scoreHistory[state.scoreHistory.length-1];
    const t=state.teams.find(t=>t.id===last.teamId);
    btn.classList.add('has-action');
    btn.title=t?`تراجع: ${last.delta>0?'+':''}${last.delta} من ${t.name}`:'تراجع';
  }else{
    btn.classList.remove('has-action');
    btn.title='لا يوجد تغيير للتراجع عنه';
  }
}
function undoLastScore(){
  if(!state.scoreHistory.length){toast(I18n.t('toast.noChangeToUndo'),'info');return}
  const last=state.scoreHistory.pop();
  const t=state.teams.find(t=>t.id===last.teamId);if(!t)return;
  const before=t.score||0;
  t.score=Math.max(0,before-last.delta);
  // Restore streak: if score went up (correct answer), decrement streak; if down (wrong), restore previous streak
  if(last.delta>0){
    // Was a correct answer — decrement streak
    state.teamStreaks[last.teamId]=Math.max(0,(state.teamStreaks[last.teamId]||0)-1);
  }else if(last.delta<0){
    // Was a wrong answer — streak was reset to 0, restore previous value if stored
    if(last.prevStreak!=null) state.teamStreaks[last.teamId]=last.prevStreak;
  }
  // Remove question from usedQuestions if it was marked as used
  if(last.catId!=null&&last.qIdx!=null&&state.usedQuestions[last.catId]){
    state.usedQuestions[last.catId].delete(last.qIdx);
  }
  saveState();updateTicker();
  try{refreshTeamStatsIfVisible();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_153")}catch(_){}}
  const diff=before-t.score;
  toast(I18n.t('toast.scoreUndo',{diff:diff>0?diff:Math.abs(diff),team:t.name}),'gold');
  floatScore(t,(diff>0?'-':'+')+(Math.abs(diff)||''),'minus');
  updateUndoBtn();
  buildScoreBtns();
}
function givePoint(teamId){
  const t=state.teams.find(t=>t.id===teamId);if(!t)return;
  t.score=(t.score||0)+1;saveState();
  recordScoreHistoryV5(teamId,1);
  toast(I18n.t('toast.quickPlusOne',{team:t.name}),'gold');
  floatScore(t,'+1');
  updateTicker();buildScoreBtns();
}

function _showNextConfirmDialog(withDeduct){
  const team=getCurrentTeam();
  const teamName=team?team.name:'الفريق';
  const negVal=state.settings.negMarkValue||1;
  const mode=state.settings.nextWithoutAnswerMode||'warn';
  let msg='لم تتم الإجابة بعد. هل تريد الانتقال للسؤال التالي؟';
  if(mode==='add_deduct'){
    const addVal=state.settings.noAnsAddVal||1;
    const dedVal=state.settings.noAnsDeductVal||1;
    const _tn=(state.teams[state.currentTeamIndex]||{}).name||'الفريق';
    const _html='<div style="padding:8px 0;text-align:center"><div style="font-size:2rem;margin-bottom:10px">⚠️</div>'
      +'<div style="font-size:.9rem;line-height:1.7;margin-bottom:16px">لم تتم الإجابة — اختر إجراءً لـ <strong>'+_tn+'</strong>:</div>'
      +'<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">'
      +'<button class="btn btn-success btn-sm" style="padding:8px 16px" onclick="closeModal(\'modal-generic\');_noAnsAward('+addVal+')">➕ إضافة '+addVal+' نقطة</button>'
      +'<button class="btn btn-danger btn-sm" style="padding:8px 16px" onclick="closeModal(\'modal-generic\');_noAnsDeduct('+dedVal+')">➖ خصم '+dedVal+' نقطة</button>'
      +'<button class="btn btn-ghost btn-sm" style="padding:8px 16px" onclick="closeModal(\'modal-generic\');advanceQuestion()">⏭ تخطي</button>'
      +'</div></div>';
    openGenericModal('عند عدم الإجابة',_html);
    return;
  }
  let extraBtn='';
  if(withDeduct&&team){
    msg='لم تتم الإجابة بعد.<br>هل تريد الانتقال للسؤال التالي مع <strong style="color:var(--danger)">خصم '+negVal+' نقطة</strong> من فريق '+teamName+'؟';
    extraBtn='<button class="btn btn-danger btn-sm" onclick="_confirmNextWithDeduct()" style="padding:8px 16px">⏭ خصم وانتقال</button>';
  }
  const html='<div style="padding:8px 0;text-align:center"><div style="font-size:2.2rem;margin-bottom:10px">⚠️</div><div style="font-size:.95rem;line-height:1.7;margin-bottom:18px">'+msg+'</div><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-ghost btn-sm" onclick="closeModal(\'modal-generic\')" style="padding:8px 16px">إلغاء</button><button class="btn btn-primary btn-sm" onclick="_confirmNextNoDeduct()" style="padding:8px 16px">⏭ انتقال بدون خصم</button>'+extraBtn+'</div></div>';
  openGenericModal('تأكيد الانتقال',html);
}
function _confirmNextNoDeduct(){
  closeModal('modal-generic');
  state._nextConfirmBypass=true;
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  state.answered=true;
  try{_pushRemoteState();}catch(e){console.error("[Error]",e);}
  nextQuestion();
}
function _confirmNextWithDeduct(){
  closeModal('modal-generic');
  const team=getCurrentTeam();
  if(team){
    const neg=state.settings.negMarkValue||1;
    team.score=Math.max(0,team.score-neg);
    recordScoreHistoryV5(team.id,-neg);
    saveState();updateTicker();
    toast(I18n.t('toast.negDeducted',{pts:neg,team:team.name}),'danger');
  }
  state._nextConfirmBypass=true;
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  state.answered=true;
  try{_pushRemoteState();}catch(e){console.error("[Error]",e);}
  nextQuestion();
}

function _noAnsAward(pts){
  const team=getCurrentTeam();
  if(team){team.score=(team.score||0)+pts;recordScoreHistoryV5(team.id,pts);floatScore(team,'+'+pts,'plus');saveState();updateTicker();toast(I18n.t('toast.pointsAdded',{pts:pts}),'success');}
  advanceQuestion();
}
function _noAnsDeduct(pts){
  const team=getCurrentTeam();
  if(team){team.score=Math.max(0,(team.score||0)-pts);recordScoreHistoryV5(team.id,-pts);floatScore(team,'-'+pts,'minus');saveState();updateTicker();toast(I18n.t('toast.pointsDeducted',{pts:pts}),'danger');}
  advanceQuestion();
}
function advanceQuestion(){
  state._nextConfirmBypass=true;
  if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
  state.usedQuestions[state.currentCatId].add(state.currentQIndex);
  state.answered=true;
  nextQuestion();
}
function nextQuestion(){
  // ── CONFIRM dialog for unanswered questions ──
  if(!state.answered && !state._nextConfirmBypass){
    const mode=state.settings.nextWithoutAnswerMode||'warn';
    if(mode==='warn'){
      _showNextConfirmDialog(false);return;
    }else if(mode==='deduct'){
      _showNextConfirmDialog(true);return;
    }else if(mode==='add_deduct'){
      _showNextConfirmDialog(false);return;
    }
    // mode==='silent': proceed without confirmation, record as skipped
    const team=getCurrentTeam();
    if(team){
      if(!state.sessionStats[team.id])
        state.sessionStats[team.id]={correct:0,wrong:0,skipped:0,totalTime:0,answers:[]};
      state.sessionStats[team.id].skipped++;
      if(state.teamStreaks) state.teamStreaks[team.id]=0;
    }
    if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
    state.usedQuestions[state.currentCatId].add(state.currentQIndex);
    state.answered=true;
    try{refreshTeamStatsIfVisible();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_154")}catch(_){}}
  }
  state._nextConfirmBypass=false;
  cancelTransition(false);
  _transitionInProgress=false;
  // V8: Re-shuffle hidden category order after each question so positions appear random
  if(state.settings.catDisplayMode==='hidden'){
    state._hiddenCatOrder=[...state.categories.map(c=>c.id)].sort(()=>Math.random()-.5);
  }
  // Cancel auto-reveal if still running
  if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
  saveGameProgress();
  stopEffectSound();
  $cls('q-explanation-box','hidden',true);
  $cls('answer-confirm-panel','hidden',true);
  $show('reveal-options-bar',false);
  if(state.settings.compMode==='full_cat'){
    state.fullCatQueuePos++;
    if(state.fullCatQueuePos<state.fullCatQueue.length)loadQuestionFromQueue();
    else{document.getElementById('fullcat-progress-wrap').classList.add('hidden');advanceTeamAndGoBack()}
  }else{
    if(!state.teams.length){showView('categories');return;}
    state.currentTeamIndex=(state.currentTeamIndex+1)%state.teams.length;
    transitionToCategories();
  }
  // Push state to audience/remote screens immediately
  _pushRemoteState();
}

function transitionToCategories(){
  if(_transitionInProgress)return;
  // Guard: only transition if we're currently on the question screen
  const qView=$el('view-question');
  if(qView&&qView.classList.contains('hidden'))return;
  const auto=state.settings.autoTransition!==false;
  const delay=+(state.settings.autoTransitionDelay||0);
  if(!auto){
    showTransitionPrompt();
    return;
  }
  if(delay>0){
    showTransitionCountdown(delay);
  }else{
    showView('categories');
  }
}

let _transitionTimer=null;
let _transitionInProgress=false;
function showTransitionCountdown(secs){
  if(_transitionInProgress)return; // guard: prevent double-call
  _transitionInProgress=true;
  // Phase 4.4: Use TimerRegistry for timer leak prevention
  if(_transitionTimer)TimerRegistry.clear(_transitionTimer);
  _transitionTimer=null;
  // Remove any existing badge first
  const existing=document.getElementById('transition-countdown');
  if(existing)existing.remove();
  const footer=document.querySelector('.question-slide-footer');
  if(!footer){_transitionInProgress=false;showView('categories');return;}
  const badge=document.createElement('div');
  badge.id='transition-countdown';
  badge.className='transition-countdown';
  badge.innerHTML=`<span>`+I18n.t('transition.categories')+` <strong id="cd-num">${secs}</strong>`+I18n.t('categories.time')+`</span><button onclick="cancelTransition()" class="btn btn-ghost btn-sm" style="padding:4px 10px;font-size:.78rem">✕ إلغاء</button>`;
  footer.appendChild(badge);
  let left=secs;
  // Phase 4.4: Use TimerRegistry for timer leak prevention
  _transitionTimer=TimerRegistry.setInterval(()=>{
    left--;
    const el=document.getElementById('cd-num');
    if(el) el.textContent=left;
    if(left<=0){cancelTransition(true);}
  },1000,'transition:countdown');
}
function cancelTransition(proceed=false){
  if(_transitionTimer)TimerRegistry.clear(_transitionTimer);
  _transitionTimer=null;
  _transitionInProgress=false;
  const badge=document.getElementById('transition-countdown');
  if(badge) badge.remove();
  if(proceed) showView('categories');
}

function advanceTeamAndGoBack(){
  state.currentTeamIndex=(state.currentTeamIndex+1)%Math.max(state.teams.length,1);
  state.fullCatQueue=[];state.fullCatQueuePos=0;
  // V8: Re-shuffle hidden category order so positions appear random
  if(state.settings.catDisplayMode==='hidden'){
    state._hiddenCatOrder=[...state.categories.map(c=>c.id)].sort(()=>Math.random()-.5);
  }
  transitionToCategories();
}

function goBackFromQuestion(){
  clearTimer();
  // V12-fix: Clear auto-reveal interval when going back
  if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
  if(window._qAudioEl){try{window._qAudioEl.pause()}catch(e){try{ErrorBus.capture(e,"catch#26")}catch(_){}}}
  document.getElementById('answer-confirm-panel').classList.add('hidden');
  document.getElementById('reveal-options-bar').style.display='none';
  if(!state.answered){if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();state.usedQuestions[state.currentCatId].add(state.currentQIndex);}
  document.getElementById('fullcat-progress-wrap').classList.add('hidden');
  state.fullCatQueue=[];state.fullCatQueuePos=0;
  // V8: Re-shuffle hidden category order so positions appear random
  if(state.settings.catDisplayMode==='hidden'){
    state._hiddenCatOrder=[...state.categories.map(c=>c.id)].sort(()=>Math.random()-.5);
  }
  saveGameProgress();showView('categories');
}

// ════════════════════════════════════════════════════════
//  SCORE TICKER
// ════════════════════════════════════════════════════════
function updateTicker(){
  const ticker=document.getElementById('score-ticker');
  if(!state.teams.length){ticker.classList.add('hidden');return}
  const curTeam=getCurrentTeam();
  ticker.innerHTML=state.teams.map(t=>{
    const isActive=t.id===curTeam?.id;
    const dotHtml=t.teamImage
      ?`<img src="${_safeMediaSrc(t.teamImage)}" alt="${_sanitizeUser(t.name)}" style="width:16px;height:16px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1px solid ${_safeColor(t.color)}88">`
      :`<div class="ticker-dot" style="background:${_safeColor(t.color)};${isActive?'box-shadow:0 0 8px '+_safeColor(t.color):''}"></div>`;
    return `<div class="ticker-team ${isActive?'ticker-active':''}" data-team-id="${t.id}" style="${isActive?'border-bottom:2px solid '+_safeColor(t.color):''}">
      ${dotHtml}
      <div class="ticker-name" style="${isActive?'color:'+_safeColor(t.color):''}">${_sanitize(t.name)}</div>
      <div class="ticker-score" style="${isActive?'color:'+_safeColor(t.color):''}">${t.score||0}</div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════
//  FLOATING SCORE ANIMATION
// ════════════════════════════════════════════════════════
function floatScore(team,text,type='plus'){
  const ticker=document.getElementById('score-ticker');
  // ── FIX: Use data-team-id instead of fragile style selector ──
  const teamEl=ticker.querySelector(`.ticker-team[data-team-id="${team.id}"]`);
  let x=window.innerWidth/2,y=window.innerHeight-80;
  if(teamEl){const r=teamEl.getBoundingClientRect();x=r.left+r.width/2;y=r.top}
  const el=document.createElement('div');
  el.className='score-float'+(type==='minus'?' minus':'');
  el.textContent=text;
  el.style.left=(x-20)+'px';el.style.top=(y-20)+'px';
  el.style.color=type==='minus'?'var(--danger)':team.color;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1300);
}

// ════════════════════════════════════════════════════════
//  TIMER
// ════════════════════════════════════════════════════════
let _timerPaused=false;
function togglePauseTimer(){
  if(state.answered)return;
  _timerPaused=!_timerPaused;
  if(_timerPaused){
    state._timerPauseStart=Date.now();
  }else if(state._timerPauseStart){
    state._timerPauseAccum+=(Date.now()-state._timerPauseStart);
    state._timerPauseStart=0;
  }
  const wrap=document.getElementById('timer-wrapper');
  if(!wrap)return;
  wrap.classList.toggle('paused',_timerPaused);
  const pauseBtn=wrap.querySelector('.pause-timer-btn');
  if(pauseBtn)pauseBtn.textContent=_timerPaused?'▶':'⏸';
  toast(_timerPaused?I18n.t('toast.timerPaused'):I18n.t('toast.timerRunning'),'info');
}
let _timerDelayCountdown=null; // Phase 4.4: Now stores TimerRegistry id
let _timerDelayTimeout=null;   // Phase 4.4: Now stores TimerRegistry id
function startTimer(seconds,_bypassDelay){
  // Guard: don't start timer if question already answered
  if(state.answered){return;}
  // Guard: validate seconds
  if(!seconds||isNaN(seconds)||seconds<=0){
    console.warn('startTimer: invalid seconds',seconds);return;
  }
  // Clear any running timer or delay countdown first
  if(state.timerInterval){clearInterval(state.timerInterval);state.timerInterval=null;}
  if(_timerDelayCountdown){TimerRegistry.clear(_timerDelayCountdown);_timerDelayCountdown=null;}
  if(_timerDelayTimeout){TimerRegistry.clear(_timerDelayTimeout);_timerDelayTimeout=null;}
  _timerPaused=false;
  document.getElementById('timer-wrapper').classList.remove('paused');
  const pauseBtn=document.querySelector('.pause-timer-btn');
  if(pauseBtn)pauseBtn.textContent='⏸';
  state.timeLeft=seconds;
  state.timerTotal=seconds;
  updateTimerDisplay(seconds,seconds);
  // Timer start delay — only on first call, not on recursive restart
  const _delaySecs=(!_bypassDelay)?(state.settings.timerStartDelay||0):0;
  if(_delaySecs>0){
    // Show countdown indicator
    const delayEl=document.getElementById('timer-delay-indicator');
    let remaining=_delaySecs;
    if(delayEl){
      delayEl.style.display='flex';
      delayEl.textContent=I18n.t('question.timerStarting')+' '+remaining;
    }
    _timerDelayCountdown=TimerRegistry.setInterval(()=>{
      remaining--;
      if(delayEl){
        if(remaining>0) delayEl.textContent=I18n.t('question.timerStarting')+' '+remaining;
        else{delayEl.textContent=I18n.t('btn.start')||'ابدأ!';delayEl.style.fontWeight='900';}
      }
    },1000,'timer:delayCountdown');
    _timerDelayTimeout=TimerRegistry.setTimeout(()=>{
      if(_timerDelayCountdown){TimerRegistry.clear(_timerDelayCountdown);_timerDelayCountdown=null;}
      _timerDelayTimeout=null;
      if(delayEl){delayEl.style.display='none';delayEl.style.fontWeight='';}
      // Start the actual timer with bypass so delay doesn't re-trigger
      if(!state.answered) startTimer(seconds,true);
    },_delaySecs*1000,'timer:delayTimeout');
    return;
  }
  state._timerStartTime=Date.now();
  state._timerStartLeft=seconds;
  state._timerPauseAccum=0; // accumulated pause time
  state._timerPauseStart=0;
  let _lastRemotePush=0; // track last audience push timestamp for reliable sync
  if(state.timerInterval){clearInterval(state.timerInterval);state.timerInterval=null;}state.timerInterval=setInterval(()=>{
    if(_timerPaused){
      // Track how long we've been paused
      if(!state._timerPauseStart)state._timerPauseStart=Date.now();
      return;
    }else if(state._timerPauseStart){
      // Just unpaused - accumulate the pause duration
      state._timerPauseAccum+=(Date.now()-state._timerPauseStart);
      state._timerPauseStart=0;
    }
    // Calculate actual elapsed time since timer started (minus paused time)
    var elapsed=Math.floor((Date.now()-state._timerStartTime-state._timerPauseAccum)/1000);
    state.timeLeft=Math.max(0,state._timerStartLeft-elapsed);
    updateTimerDisplay(state.timeLeft,state.timerTotal);
    // Push state to audience screen (time-based for reliability)
    if(Date.now()-_lastRemotePush>=500){_lastRemotePush=Date.now();_pushRemoteState();}
    // Sync big clock if visible
    if(!document.getElementById('view-bigclock').classList.contains('hidden'))
      updateBigClockDisplay();  // ← use stored total
    // Switch to tense music near the end
    const tenseAt=state.settings.tenseSeconds||10;
    if(state.timeLeft<=tenseAt&&!state.answered&&!state._tenseMusicActive&&state.settings.tenseEnabled!==false){
      // Solo mode: respect mute setting — skip tense music
      if(typeof _soloSettings!=='undefined'&&_soloSettings.muted&&typeof window._currentView!=='undefined'&&window._currentView&&window._currentView.startsWith('solo')){
        // skip tense music in solo mode when muted
      }else
      if(state.settings.tenseMusicType==='embedded'&&typeof DEFAULT_TENSE_MUSIC==='string'&&DEFAULT_TENSE_MUSIC.length>100){
        // Play embedded tension music (base64) — snapshot & stop background music first to avoid overlap
        try{
          if(state.musicPlaying){try{BgmResumeTracker.snapshot();stopCustomMusic();stopMusic();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_155")}catch(_){}}}
          if(!window._tenseAudioEl){window._tenseAudioEl=new Audio()}
          else{try{window._tenseAudioEl.pause();window._tenseAudioEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_156")}catch(_){}}}
          window._tenseAudioEl.src=DEFAULT_TENSE_MUSIC;
          window._tenseAudioEl.volume=(state.settings.tenseMusicVol||70)/100;
          window._tenseAudioEl.loop=true;
          try{window._tenseAudioEl.load();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_157")}catch(_){}}
          window._tenseAudioEl.play().catch(()=>{});
          try{AudioMixer.register('tense',window._tenseAudioEl)}catch(e){try{ErrorBus.capture(e,"catch#AUTO_158")}catch(_){}}
          state._tenseMusicActive=true;
        }catch(e){try{ErrorBus.capture(e,"catch#27a")}catch(_){}}
      }else if(state.settings.tenseMusicType==='custom'&&state.settings.customTenseData){
        // Play custom tense music file — snapshot & stop background music first to avoid overlap
        try{
          if(state.musicPlaying){try{BgmResumeTracker.snapshot();stopCustomMusic();stopMusic();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_159")}catch(_){}}}
          if(!window._tenseAudioEl){window._tenseAudioEl=new Audio()}
          else{try{window._tenseAudioEl.pause();window._tenseAudioEl.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_160")}catch(_){}}}
          window._tenseAudioEl.src=state.settings.customTenseData;
          window._tenseAudioEl.volume=(state.settings.tenseMusicVol||70)/100;
          window._tenseAudioEl.loop=true;
          try{window._tenseAudioEl.load();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_161")}catch(_){}}
          window._tenseAudioEl.play().catch(()=>{});
          try{AudioMixer.register('tense',window._tenseAudioEl)}catch(e){try{ErrorBus.capture(e,"catch#AUTO_162")}catch(_){}}
          state._tenseMusicActive=true;
        }catch(e){try{ErrorBus.capture(e,"catch#27")}catch(_){}}
      }else if(state.musicPlaying&&state.settings.musicType!=='tense'){
        // Builtin/ambient/synth BGM — snapshot before switching to tense pattern
        try{BgmResumeTracker.snapshot();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_163")}catch(_){}}
        switchMusicPattern('tense');
        state._tenseMusicActive=true;
      }
    }
    if(state.timeLeft<=0){clearTimer();if(!state.answered){handleTimerEnd();}}
  },1000);
}
function handleTimerEnd(){
  const _team=getCurrentTeam();
  try{Store.dispatch("TIMER_ENDED",{teamId:_team?.id,teamName:_team?.name});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_164")}catch(_){}}
  _stopTenseAudio();

  const action=state.settings.timerEndAction||'reveal';
  if(action==='reveal'||action==='all'){
    playSound('wrong');
    revealAnswer();
    toast(I18n.t('question.timeUp'),'danger');
  } else if(action==='sound'){
    playSound('wrong');
    toast(I18n.t('question.timeUp'),'danger');
    // Mark as answered and record stats, but don't reveal the answer
    if(!state.answered){
      state.answered=true;
      if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
    state.usedQuestions[state.currentCatId].add(state.currentQIndex);
      const timeUsed=(state.timerTotal||30);
      recordAnswer(_team?.id,false,timeUsed);
      _updateStreak(_team?.id,false);
      updateTicker();updateUndoBtn();
    }
    // V11-fix: Push state to audience/remote screens
    try{_pushRemoteState();}catch(e){console.error("[Error]",e);}
  } else if(action==='notify'){
    showTimeUpOverlay();
    // Also mark as answered so the question doesn't remain in limbo
    if(!state.answered){
      state.answered=true;
      if(!state.usedQuestions[state.currentCatId])state.usedQuestions[state.currentCatId]=new Set();
    state.usedQuestions[state.currentCatId].add(state.currentQIndex);
      const timeUsed=(state.timerTotal||30);
      recordAnswer(_team?.id,false,timeUsed);
      _updateStreak(_team?.id,false);
      updateTicker();updateUndoBtn();
    }
    // V11-fix: Push state to audience/remote screens
    try{_pushRemoteState();}catch(e){console.error("[Error]",e);}
  }
  // 'all': show overlay ONCE with a slight delay (after reveal animation)
  if(action==='all'){
    setTimeout(()=>showTimeUpOverlay(), 400);
  }
}

let _timeUpTimer=null;
function showTimeUpOverlay(){
  const existing=document.getElementById('timeup-overlay');if(existing)existing.remove();
  const overlay=document.createElement('div');
  overlay.id='timeup-overlay';
  overlay.style.cssText='position:fixed;inset:0;z-index:4500;display:flex;align-items:center;justify-content:center;pointer-events:none;';
  overlay.innerHTML='<div class="timeup-badge">'+I18n.t('question.timeUp')+'</div>';
  document.body.appendChild(overlay);
  clearTimeout(_timeUpTimer);
  _timeUpTimer=setTimeout(()=>{const el=document.getElementById('timeup-overlay');if(el)el.remove();},2500);
}

// ════════════════════════════════════════════════════════════════
//  clearQuestionState — call at start of every loadQuestion
//  Resets ALL per-question runtime state to a clean slate
// ════════════════════════════════════════════════════════════════
function clearQuestionState(){
  // ── 1. Stop ALL running media ──
  // V10-fix: use _stopTenseAudio() for proper cleanup (restores BGM, registers with AudioMixer)
  _stopTenseAudio();
  [window._qAudioEl,window._quranAudio]
    .forEach(a=>{if(a){try{a.pause();a.src='';a.load();}catch(e){try{ErrorBus.capture(e,"catch#28")}catch(_){}}}});
  // Stop video player if running
  var vPlayer=document.getElementById('q-video-player');
  if(vPlayer){try{vPlayer.pause();vPlayer.currentTime=0;if(vPlayer._blobUrl){URL.revokeObjectURL(vPlayer._blobUrl);vPlayer._blobUrl=null;}}catch(e){console.error("[Error]",e);}}
  window._tenseMusicActive=false; // also reset this flag
  // ── 2. Cancel all running timers/intervals ──
  if(state.timerInterval){clearInterval(state.timerInterval);state.timerInterval=null;}
  if(typeof _timerDelayCountdown!=='undefined'&&_timerDelayCountdown){
    TimerRegistry.clear(_timerDelayCountdown);_timerDelayCountdown=null;
  }
  // V10-fix: also clear the delay timeout to prevent ghost timer start for a different question
  if(typeof _timerDelayTimeout!=='undefined'&&_timerDelayTimeout){
    TimerRegistry.clear(_timerDelayTimeout);_timerDelayTimeout=null;
  }
  // Cancel auto progressive-reveal interval
  if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
  // Cancel auto-transition countdown
  // Phase 4.4: Use TimerRegistry for cleanup
  if(typeof _transitionTimer!=='undefined'&&_transitionTimer){
    TimerRegistry.clear(_transitionTimer);_transitionTimer=null;
  }
  if(typeof _transitionInProgress!=='undefined')_transitionInProgress=false;
  // Remove transition badge if present
  const txBadge=$el('transition-countdown');if(txBadge)txBadge.remove();
  // ── 3. Reset per-question state fields ──
  state.answered=false;
  state.pendingAnswer=-1;
  state._lastSelectedAnswer=-1;
  state.timeLeft=0;
  state.timerTotal=0;
  state._timerStartTime=0;state._timerStartLeft=0;state._timerPauseAccum=0;state._timerPauseStart=0;
  state.optionsRevealed=0;
  state._fitbCorrect=null;
  state._fitbCorrectDisplay=null;
  state._quranCorrectIdx=null;
  state._quranChoices=null;
  state._quranPendingIdx=null;
  state._orderItems=null;
  state._orderCorrect=null;
  state._orderConfirmPending=false;
  state._tenseMusicActive=false;
  state._nextConfirmBypass=false;
  state._videoTimerPending=false;
  // ── 4. Clean transient UI ──
  const ov=$el('timeup-overlay');if(ov)ov.remove();
  const dlInd=$el('timer-delay-indicator');
  if(dlInd){dlInd.style.display='none';dlInd.style.fontWeight='';}
  $cls('answer-confirm-panel','hidden',true);
  $cls('q-explanation-box','hidden',true);
  $show('reveal-options-bar',false);
  // B5: cancel stale RAF + clear confetti + reset progressive reveal
  try{
    if(typeof _confAF!=='undefined'&&_confAF){cancelAnimationFrame(_confAF);_confAF=null;}
    const _cc=$el('confetti-canvas');
    if(_cc){try{_cc.getContext('2d').clearRect(0,0,_cc.width,_cc.height);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_165")}catch(_){}}}
    document.querySelectorAll('.opt-hidden-pr,.opt-visible-pr').forEach(function(b){
      b.classList.remove('opt-hidden-pr','opt-visible-pr');
    });
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_166")}catch(_){}}
}

function clearTimer(){
  // Stop main interval
  if(state.timerInterval){clearInterval(state.timerInterval);state.timerInterval=null;}
  // V12-fix: Also clean up auto-reveal interval when clearing timer
  if(state._autoRevInterval){clearInterval(state._autoRevInterval);state._autoRevInterval=null;}
  // Also cancel delay countdown (prevents "ghost" delay continuing after clearTimer)
  // Phase 4.4: Use TimerRegistry for cleanup
  if(typeof _timerDelayCountdown!=='undefined'&&_timerDelayCountdown){
    TimerRegistry.clear(_timerDelayCountdown);_timerDelayCountdown=null;
  }
  // Cancel the delay timeout itself (prevents ghost timer start)
  if(_timerDelayTimeout){TimerRegistry.clear(_timerDelayTimeout);_timerDelayTimeout=null;}
  const dlInd=$el('timer-delay-indicator');
  if(dlInd){dlInd.style.display='none';dlInd.style.fontWeight='';}
  _stopTenseAudio();
  _timerPaused=false;
  state._timerPauseAccum=0;state._timerPauseStart=0;
  const wrap=$el('timer-wrapper');
  if(wrap){wrap.classList.remove('paused');const pb=wrap.querySelector('.pause-timer-btn');if(pb)pb.textContent='⏸';}
}
function updateTimerDisplay(left,total){
  // Phase 4.5: Use requestAnimationFrame for smoother visual updates
  // The actual time tracking is still done by setInterval, but DOM updates
  // are batched with the browser's rendering cycle via rAF.
  if(updateTimerDisplay._rafPending)return; // coalesce multiple calls within one frame
  updateTimerDisplay._rafPending=true;
  requestAnimationFrame(function(){
    updateTimerDisplay._rafPending=false;
    const n=Math.max(0,Number.isFinite(left)?left:0);
    const timerNum=document.getElementById('timer-number');
    const timerFill=document.getElementById('timer-ring-fill');
    const timerWrap=document.getElementById('timer-wrapper');
    if(!timerNum||!timerFill||!timerWrap)return;
    timerNum.textContent=n;
    const t=Number.isFinite(total)&&total>0?total:1;
    const pct=Math.max(0,n/t);
    timerFill.style.strokeDashoffset=CIRC*(1-pct);
    if(pct>.5)timerFill.style.stroke='var(--success)';
    else if(pct>.25)timerFill.style.stroke='var(--accent1)';
    else timerFill.style.stroke='var(--danger)';
    timerWrap.classList.toggle('timer-warn',pct<=.2);
    // Timer urgency effects
    try{
      var _timerEl=document.querySelector('.timer-ring-container')||document.querySelector('.timer-svg');
      if(!_timerEl)_timerEl=timerWrap;
      if(_timerEl){
        _timerEl.classList.remove('timer-urgent','timer-critical');
        if(n<=10&&n>5)_timerEl.classList.add('timer-urgent');
        else if(n<=5)_timerEl.classList.add('timer-critical');
      }
      // Vibration on critical timer (mobile)
      if(n<=3&&n>0&&navigator.vibrate){navigator.vibrate(100);}
    }catch(e){}
  });
}
// Static property for rAF coalescing
updateTimerDisplay._rafPending=false;

// ════════════════════════════════════════════════════════
//  SCORES SLIDE
// ════════════════════════════════════════════════════════
function renderScoresSlide(){
  const sorted=[...state.teams].sort((a,b)=>(b.score||0)-(a.score||0));
  const mx=Math.max(1,...sorted.map(t=>t.score||0));
  const medals=['🥇','🥈','🥉'];const rcls=['gold','silver','bronze'];
  document.getElementById('scoreboard-list').innerHTML=sorted.length?sorted.map((t,i)=>`
    <div class="score-row" style="animation-delay:${i*.1}s;${i===0?'border-color:var(--accent1)':''}">
      <div class="score-rank ${rcls[i]||''}">${medals[i]||i+1}</div>
      <div style="width:36px;height:36px;border-radius:50%;background:${t.color};display:flex;align-items:center;justify-content:center;font-weight:900;color:#1a1000;flex-shrink:0;overflow:hidden">${t.teamImage?'<img src="'+_safeMediaSrc(t.teamImage)+'" alt="'+_sanitizeUser(t.name)+'" style="width:100%;height:100%;object-fit:cover">':t.name[0]}</div>
      <div class="score-team-name">${_sanitizeUser(t.name)}</div>
      <div class="score-bar-wrap"><div class="score-bar-fill" style="width:${(t.score||0)/mx*100}%;background:${t.color}"></div></div>
      <div class="score-points">${t.score||0}<span style="font-size:.7rem;color:var(--text-muted)"> ${I18n.t('question.pointsLabel')||'نقطة'}</span></div>
    </div>`).join(''):'<div class="empty-state"><div class="empty-icon">🏆</div><p>'+t('empty.noResults')+'</p></div>';
  if(sorted.length&&sorted[0].score>0)launchConfetti(80);
}

// ════════════════════════════════════════════════════════
//  CREDITS SLIDE
// ════════════════════════════════════════════════════════
function renderCreditsSlide(){
  document.getElementById('credits-comp-name-display').textContent=state.settings.name;
  const grouped={};Object.keys(CREDIT_CATS).forEach(k=>grouped[k]=[]);
  state.credits.forEach(p=>{if(grouped[p.category])grouped[p.category].push(p)});
  const style=state.settings.creditsStyle||'normal';
  const empty='<div class="empty-state"><div class="empty-icon">🌟</div><p>'+t('empty.noNamesYet')+'</p></div>';
  const footer=`<strong>🌟</strong><br>${state.settings.closingMessage||'شكراً للجميع'}<br><br><span style="font-size:.76rem">🏆 منصة المسابقات التفاعلية</span>`;

  // Remove any existing cinematic wrapper
  const oldCin=document.getElementById('credits-cinematic-wrapper');
  if(oldCin)oldCin.remove();

  if(style==='cinematic'){
    // ── Cinematic: scroll-up rolling credits ──
    const dur=(state.settings.cinematicDuration||40);
    const allPeople=[];
    Object.entries(CREDIT_CATS).forEach(([key,info])=>{
      if(!grouped[key]||!grouped[key].length)return;
      allPeople.push({isCat:true,label:info.label,color:info.color});
      grouped[key].forEach(p=>allPeople.push({isCat:false,p,info}));
    });
    if(!allPeople.length){
      document.getElementById('credits-sections-display').innerHTML=empty;
      document.getElementById('credits-footer-msg').innerHTML=footer;
      return;
    }
    document.getElementById('credits-sections-display').style.overflow='hidden';
    document.getElementById('credits-sections-display').style.height='60vh';
    document.getElementById('credits-sections-display').style.position='relative';
    document.getElementById('credits-sections-display').innerHTML='';
    const wrap=document.createElement('div');
    wrap.id='credits-cinematic-wrapper';
    wrap.style.cssText='position:absolute;width:100%;bottom:0;animation:cin-scroll-up '+dur+'s linear forwards;text-align:center;padding-bottom:40px';
    wrap.innerHTML=allPeople.map(item=>{
      if(item.isCat)return`<div style="font-size:1.1rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:${item.color};padding:36px 0 16px;border-bottom:1px solid ${item.color}44;margin-bottom:20px">${item.label}</div>`;
      const p=item.p,info=item.info;
      return`<div style="display:flex;align-items:center;gap:16px;justify-content:center;padding:10px 0">
        <div style="width:48px;height:48px;border-radius:50%;background:${(p.color||info.color)}22;color:${p.color||info.color};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;overflow:hidden;flex-shrink:0">${p.image?'<img src="'+_safeMediaSrc(p.image)+'" alt="'+_sanitizeUser(p.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':p.name[0]}</div>
        <div style="text-align:right"><div style="font-weight:700;font-size:1.05rem">${p.name}</div><div style="font-size:.82rem;color:${p.color||info.color}">${p.role||''}</div></div>
      </div>`;
    }).join('') + `<div style="padding:48px 0 12px;color:var(--text-muted);font-size:.85rem">🏆 منصة المسابقات التفاعلية</div>`;
    document.getElementById('credits-sections-display').appendChild(wrap);
    document.getElementById('credits-footer-msg').innerHTML='';

  }else if(style==='cards'){
    // ── Cards: 2-col grid with flip animation ──
    const sections=Object.entries(CREDIT_CATS).filter(([key])=>grouped[key].length>0).map(([key,info],si)=>`
      <div class="credits-section" style="animation-delay:${.1+si*.15}s">
        <div class="credits-section-label" style="color:${info.color}">${info.label}</div>
        <div class="cred-cards-flip-grid">${grouped[key].map((p,pi)=>`
          <div class="cred-flip-card" style="animation:float-up .6s ease ${.2+si*.15+pi*.07}s both">
            <div class="cred-flip-inner">
              <div class="cred-flip-front" style="border-top:3px solid ${p.color||info.color}">
                <div class="cred-avatar" style="background:${(p.color||info.color)}22;color:${p.color||info.color};overflow:hidden">${p.image?'<img src="'+_safeMediaSrc(p.image)+'" alt="'+_sanitizeUser(p.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':p.name[0]}</div>
                <div class="cred-name">${p.name}</div>
                <div class="cred-role" style="color:${p.color||info.color}">${p.role||''}</div>
              </div>
              <div class="cred-flip-back" style="background:${(p.color||info.color)}18;border:2px solid ${p.color||info.color}">
                <div style="font-size:2rem;margin-bottom:8px">🌟</div>
                <div style="font-weight:700;color:${p.color||info.color}">${p.name}</div>
                ${p.role?`<div style="font-size:.82rem;margin-top:6px;color:var(--text-secondary)">${p.role}</div>`:''}
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>`).join('');
    document.getElementById('credits-sections-display').style='';
    document.getElementById('credits-sections-display').innerHTML=sections||empty;
    document.getElementById('credits-footer-msg').innerHTML=footer;

  }else{
    // ── Normal (default) ──
    document.getElementById('credits-sections-display').style='';
    const sections=Object.entries(CREDIT_CATS).filter(([key])=>grouped[key].length>0).map(([key,info],si)=>`
      <div class="credits-section" style="animation-delay:${.1+si*.15}s">
        <div class="credits-section-label" style="color:${info.color}">${info.label}</div>
        <div class="credits-people">${grouped[key].map((p,pi)=>`
          <div class="cred-card" style="animation:float-up .6s ease ${.2+si*.15+pi*.08}s both;border-top:3px solid ${p.color||info.color}">
            <div class="cred-avatar" style="background:${(p.color||info.color)}22;color:${p.color||info.color};overflow:hidden">${p.image?'<img src="'+_safeMediaSrc(p.image)+'" alt="'+_sanitizeUser(p.name)+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':p.name[0]}</div>
            <div class="cred-name">${p.name}</div>
            <div class="cred-role" style="color:${p.color||info.color}">${p.role||''}</div>
          </div>`).join('')}
        </div>
      </div>`).join('');
    document.getElementById('credits-sections-display').innerHTML=sections||empty;
    document.getElementById('credits-footer-msg').innerHTML=footer;
  }
}

// ════════════════════════════════════════════════════════
//  BACKGROUND MUSIC  (Web Audio API synth)
// ════════════════════════════════════════════════════════
let audioCtx=null,musicNodes=[],musicGain=null;
let _effectAudioEl=null; // global ref to the current effect sound

// V10-fix: Make getAudioCtx async-aware — resume() returns a Promise that must be awaited for reliable audio after idle
function getAudioCtx(){
  if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended'){
    // Resume the context — the Promise is returned but callers don't need to await it;
    // audio nodes created after resume will play once the context is running
    audioCtx.resume().catch(()=>{});
  }
  return audioCtx;
}
// Ensure AudioContext is resumed on first user interaction (required by browser autoplay policy)
(function(){
  var _audioResumed=false;
  function _resumeAudio(){
    if(_audioResumed)return;
    _audioResumed=true;
    try{if(audioCtx&&audioCtx.state==='suspended')audioCtx.resume().catch(function(){});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_167")}catch(_){}}
  }
  // Resume on common user interactions
  ['click','touchstart','keydown','pointerdown'].forEach(function(evt){
    document.addEventListener(evt,_resumeAudio,{once:true,passive:true,capture:true});
  });
})();
function setMusicVolume(v){
  // Web Audio API synth
  if(musicGain) musicGain.gain.value = v * 0.4;
  // Custom music HTML5 Audio
  if(_customMusicEl) _customMusicEl.volume = Math.min(1, v * 0.9);
  // Also update AudioMixer bgm channel if registered
  try{const bgmNode=AudioMixer.get('bgm');if(bgmNode&&bgmNode!==_customMusicEl)bgmNode.volume=Math.min(1,v*0.7);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_168")}catch(_){}}
}

function startMusic(type){
  stopMusic();
  // Only two supported types: 'builtin' (embedded base64) and 'custom' (external file)
  // Auto-fix legacy types from old saved settings
  if(!type||type==='none'||type==='ambient'||type==='upbeat'||type==='tense'){
    // Migrate legacy/none to 'builtin' automatically
    type='builtin';
    if(state.settings.musicType!==type){state.settings.musicType=type;saveState();}
  }
  // 'builtin' = use embedded DEFAULT_BG_MUSIC (base64)
  if(type==='builtin'){
    if(DEFAULT_BG_MUSIC){
      if(_customMusicEl){try{_customMusicEl.pause();_customMusicEl.src='';_customMusicEl.load();}catch(e){try{ErrorBus.capture(e,"catch#35b")}catch(_){}}}
      _customMusicEl=new Audio(DEFAULT_BG_MUSIC);
      _customMusicEl.loop=true;
      _customMusicEl.volume=(state.settings.musicVol||40)/100*0.7;
      try{AudioMixer.register('bgm',_customMusicEl)}catch(e){try{ErrorBus.capture(e,"catch#AUTO_169")}catch(_){}}
      _customMusicEl.play().catch(e=>{if(e.name!=='NotAllowedError'){try{ErrorBus.capture(e,'startMusic:builtin')}catch(_){}}});
      state.musicPlaying=true;updateMusicBtn();
      return;
    }
    // No embedded music found — prompt user to add an external file
    toast(t('toast.musicUnavailable'),'info');
    return;
  }
  if(type==='custom'){
    if(playCustomMusic())return;
    // Fallback: if no custom music data but DEFAULT_BG_MUSIC is available, use it directly
    if(DEFAULT_BG_MUSIC && !state.settings.customMusicData){
      if(_customMusicEl){try{_customMusicEl.pause();_customMusicEl.src='';_customMusicEl.load();}catch(e){try{ErrorBus.capture(e,"catch#35b")}catch(_){}}}
      _customMusicEl=new Audio(DEFAULT_BG_MUSIC);
      _customMusicEl.loop=true;
      _customMusicEl.volume=(state.settings.musicVol||40)/100*0.7;
      try{AudioMixer.register('bgm',_customMusicEl)}catch(e){try{ErrorBus.capture(e,"catch#AUTO_170")}catch(_){}}
      _customMusicEl.play().catch(e=>{if(e.name!=='NotAllowedError'){try{ErrorBus.capture(e,'startMusic:DEFAULT_BG_MUSIC')}catch(_){}}});
      state.musicPlaying=true;updateMusicBtn();
      return;
    }
    toast(I18n.t('toast.noExternalMusic'),'info');return;
  }
  // Unknown type — default to builtin
  startMusic('builtin');
}

function stopMusic(){
  musicNodes.forEach(n=>{try{if(n.stop)n.stop();}catch(e){try{ErrorBus.capture(e,"catch#30")}catch(_){}}try{if(n.disconnect)n.disconnect();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_171")}catch(_){}}});
  musicNodes=[];
  if(musicGain){try{musicGain.disconnect();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_172")}catch(_){}}musicGain=null;}
  stopCustomMusic();
  state.musicPlaying=false;updateMusicBtn();
}

function toggleMusic(){
  if(state.musicPlaying){stopMusic()}
  else{startMusic(state.settings.musicType||'builtin')}
}

// Custom audio file helpers
let _customAudioTestEl=null;
let _customVideoTestEl=null;
function loadCustomAudio(input,key,nameId){
  const file=input.files[0];if(!file)return;
  if(file.size>8*1024*1024){toast(I18n.t('toast.fileTooLarge8MB'),'danger');return}
  const reader=new FileReader();
  reader.onload=e=>{
    state.settings[key]=e.target.result;
    document.getElementById(nameId).textContent=file.name.length>18?file.name.slice(0,15)+'…':file.name;
    // Save audio data to IndexedDB (primary) instead of localStorage (too small for audio)
    var audioData={
      customMusicData:state.settings.customMusicData===DEFAULT_BG_MUSIC?null:state.settings.customMusicData,
      customCorrectData:state.settings.customCorrectData,
      customWrongData:state.settings.customWrongData,
      customTenseData:state.settings.customTenseData||null,
      podiumMusicData:state.settings.podiumMusicData||null,
      wheelMusicData:state.settings.wheelMusicData||null,
    };
    // Save to IndexedDB ONLY (V14: no localStorage for audio data >100KB)
    if(typeof MediaDB!=='undefined'){
      // Save each audio key individually to IndexedDB for efficiency
      var idbPromises=[];
      Object.keys(audioData).forEach(function(k){
        if(audioData[k]&&typeof audioData[k]==='string'&&audioData[k].length>500){
          idbPromises.push(MediaDB.set('s_'+k,audioData[k]).catch(function(e){_logErr(e,'MediaDB:setAudioData')}));
        }
      });
      if(idbPromises.length>0)Promise.all(idbPromises).then(function(){try{saveState();}catch(e){console.error("[Error]",e);}}).catch(function(e){_logErr(e,'MediaDB:audioPromiseAll')});
    }
    // Save only metadata flags to localStorage (NOT the actual audio data)
    var _audioMeta={};
    ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData'].forEach(function(k){
      _audioMeta[k]=!!state.settings[k];
    });
    try{localStorage.setItem('quiz_v4_audio_meta',JSON.stringify(_audioMeta))}catch(e){console.error("[Error]",e);}
    toast(I18n.t('toast.audioFileLoaded'),'success');
    if(key==='customMusicData'&&state.settings.musicType!=='custom')updateSetting('musicType','custom');
  };
  reader.readAsDataURL(file);
  input.value='';
}
let _testAudioBtnId=null;
function _resetAudioTestUI(){
  // Reset all test buttons to default state
  document.querySelectorAll('.audio-test-btn').forEach(b=>b.classList.remove('playing'));
  document.querySelectorAll('.audio-stop-btn').forEach(b=>b.classList.add('hidden'));
  _testAudioBtnId=null;
}
function stopCustomAudioTest(key, btnId){
  if(_customAudioTestEl){
    try{_customAudioTestEl.pause();_customAudioTestEl.currentTime=0}catch(e){try{ErrorBus.capture(e,"catch#31")}catch(_){}}
    _customAudioTestEl=null;
  }
  _resetAudioTestUI();
}
function stopQuestionAudioTest(){
  if(_customAudioTestEl){
    try{_customAudioTestEl.pause();_customAudioTestEl.currentTime=0}catch(e){try{ErrorBus.capture(e,"catch#32")}catch(_){}}
    _customAudioTestEl=null;
  }
  const stopBtn=document.getElementById('stop-btn-qAudio');
  const playBtn=document.getElementById('test-btn-qAudio');
  if(stopBtn)stopBtn.classList.add('hidden');
  if(playBtn){playBtn.classList.remove('playing');playBtn.textContent='▶ تشغيل';}
}
function testCustomAudio(key, btnId){
  const data=state.settings[key];
  if(!data){toast(I18n.t('toast.noFileSelected'),'info');return}
  // If already playing this same audio, stop it
  if(_testAudioBtnId===btnId&&_customAudioTestEl&&!_customAudioTestEl.paused){
    stopCustomAudioTest(key,btnId);return;
  }
  // Stop any previously playing test
  if(_customAudioTestEl){try{_customAudioTestEl.pause();_customAudioTestEl.currentTime=0}catch(e){try{ErrorBus.capture(e,"catch#33")}catch(_){}}}
  _resetAudioTestUI();
  stopEffectSound();
  _customAudioTestEl=new Audio(data);
  // Use the appropriate volume slider based on the audio key type
  var _testVol=0.8;
  if(key==='customMusicData')_testVol=(state.settings.musicVol||40)/100;
  else if(key==='customCorrectData')_testVol=(state.settings.soundCorrectVol||80)/100;
  else if(key==='customWrongData')_testVol=(state.settings.soundWrongVol||80)/100;
  else if(key==='customTenseData')_testVol=(state.settings.tenseMusicVol||70)/100;
  else if(key==='podiumMusicData')_testVol=(state.settings.podiumMusicVol||60)/100;
  else if(key==='wheelMusicData')_testVol=(state.settings.wheelMusicVol||50)/100;
  _customAudioTestEl.volume=Math.min(1,_testVol);
  _testAudioBtnId=btnId;
  _customAudioTestEl.onended=()=>{_resetAudioTestUI();_customAudioTestEl=null;};
  _customAudioTestEl.onerror=()=>{toast(I18n.t('toast.audioPlayError'),'danger');_resetAudioTestUI();_customAudioTestEl=null;};
  _customAudioTestEl.play().then(()=>{
    // Show stop button, mark play button as active
    const playBtn=document.getElementById(btnId);
    const stopBtn=document.getElementById('stop-btn-'+key);
    if(playBtn)playBtn.classList.add('playing');
    if(stopBtn)stopBtn.classList.remove('hidden');
  }).catch(()=>{toast(I18n.t('toast.audioPlayFailed'),'danger');_resetAudioTestUI();});
}
function clearCustomAudio(key,nameId){
  state.settings[key]=null;
  document.getElementById(nameId).textContent=I18n.t('admin.notChosen')||'لم يُختر بعد';
  // Also clear from IndexedDB
  if(typeof MediaDB!=='undefined'){
    try{MediaDB['delete']('s_'+key).catch(function(e){_logErr(e,'MediaDB:deleteAudioKey')});}catch(e){console.error("[Error]",e);}
  }
  try{localStorage.removeItem('quiz_v4_audio')}catch(e){_logErr(e,'localStorage:removeAudioKey')}
  // V14: Update metadata flags in localStorage only (actual data in IndexedDB)
  var _audioMeta={};
  ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData'].forEach(function(k){
    _audioMeta[k]=!!state.settings[k];
  });
  try{localStorage.setItem('quiz_v4_audio_meta',JSON.stringify(_audioMeta))}catch(e){console.error("[Error]",e);}
  toast(I18n.t('toast.audioFileDeleted'),'info');
}
// V12: Test embedded tense music preview
let _embeddedTenseTestEl=null;
function testEmbeddedTenseMusic(){
  if(typeof DEFAULT_TENSE_MUSIC!=='string'||DEFAULT_TENSE_MUSIC.length<10){
    toast(I18n.t('toast.audioPlayFailed')||'فشل تشغيل الصوت','danger');return;
  }
  stopEmbeddedTenseMusic();
  _embeddedTenseTestEl=new Audio(DEFAULT_TENSE_MUSIC);
  _embeddedTenseTestEl.volume=(state.settings.tenseMusicVol||70)/100;
  _embeddedTenseTestEl.loop=true;
  _embeddedTenseTestEl.play().then(()=>{
    const playBtn=document.getElementById('test-btn-embedded-tense');
    const stopBtn=document.getElementById('stop-btn-embedded-tense');
    if(playBtn)playBtn.classList.add('hidden');
    if(stopBtn)stopBtn.classList.remove('hidden');
  }).catch(()=>{toast(I18n.t('toast.audioPlayFailed')||'فشل تشغيل الصوت','danger');});
}
function stopEmbeddedTenseMusic(){
  if(_embeddedTenseTestEl){try{_embeddedTenseTestEl.pause();_embeddedTenseTestEl.currentTime=0;}catch(e){console.error("[Error]",e);}}
  _embeddedTenseTestEl=null;
  const playBtn=document.getElementById('test-btn-embedded-tense');
  const stopBtn=document.getElementById('stop-btn-embedded-tense');
  if(playBtn)playBtn.classList.remove('hidden');
  if(stopBtn)stopBtn.classList.add('hidden');
}

// External background music playback
let _customMusicEl=null;
let _musicSwitchPending=false;
function playCustomMusic(){
  if(!state.settings.customMusicData && !DEFAULT_BG_MUSIC)return false;
  // Release previous custom music element to prevent memory leak
  if(_customMusicEl){try{_customMusicEl.pause();_customMusicEl.src='';_customMusicEl.load();}catch(e){try{ErrorBus.capture(e,"catch#35")}catch(_){}}}
  _customMusicEl=new Audio(state.settings.customMusicData || DEFAULT_BG_MUSIC);
  _customMusicEl.loop=true;
  _customMusicEl.volume=(state.settings.musicVol||40)/100*0.7;
  // Register with AudioMixer for proper stopAll/ducking support
  try{AudioMixer.register('bgm',_customMusicEl)}catch(e){try{ErrorBus.capture(e,"catch#AUTO_173")}catch(_){}}
  _customMusicEl.play().catch(e=>{try{ErrorBus.capture(e,'playCustomMusic')}catch(_){}});
  state.musicPlaying=true;updateMusicBtn();
  return true;
}
function stopCustomMusic(){
  if(_customMusicEl){try{_customMusicEl.pause();_customMusicEl.src='';_customMusicEl.load();}catch(e){try{ErrorBus.capture(e,"catch#36")}catch(_){}}}_customMusicEl=null;
}

// Font scale
function applyCatIconScale(val){
  document.documentElement.style.setProperty('--cat-icon-scale', val/100);
  const d=document.getElementById('cat-icon-size-display');if(d)d.textContent=val+'%';
}
function applyCatCardScale(val){
  document.documentElement.style.setProperty('--cat-card-scale', val/100);
  const d=document.getElementById('cat-card-size-display');if(d)d.textContent=val+'%';
}
function _applyTeamCardHeight(){
  const mode=state.settings.teamCardHeight||'auto';
  const heights={auto:'360px',compact:'280px',medium:'360px',large:'460px',fill:'calc(100svh - var(--header-h) - 130px)'};
  const mobileHeights={auto:'260px',compact:'220px',medium:'280px',large:'340px',fill:'calc(100svh - var(--header-h) - 110px)'};
  document.documentElement.style.setProperty('--team-card-h',heights[mode]||'360px');
  document.documentElement.style.setProperty('--team-card-h-mobile',mobileHeights[mode]||'260px');
  // Add/remove fill-mode class on the teams grid for proper row stretching
  const grid=document.getElementById('teams-pres-grid');
  if(grid){
    if(mode==='fill'){grid.classList.add('fill-mode')}
    else{grid.classList.remove('fill-mode')}
  }
}
function applyFontScale(val){
  val=parseInt(val)||100;
  if(val<50)val=50;if(val>200)val=200;
  document.documentElement.style.setProperty('--fs',val/100);
  const el=document.getElementById('font-scale-display');
  if(el)el.textContent=val+'%';
  // Sync the appearance tab font scale display too
  const el2=document.getElementById('font-scale-appearance-display');
  if(el2)el2.textContent=val+'%';
  const sl=document.getElementById('s-font-scale-appearance');
  if(sl)sl.value=val;
  // V14: Persist to state so it survives page reloads
  try{
    if(typeof state!=='undefined'&&state&&state.settings){
      if(state.settings.fontScale!==val){
        state.settings.fontScale=val;
        if(typeof saveState==='function')saveState();
      }
    }
  }catch(e){try{if(typeof ErrorBus!=='undefined')ErrorBus.capture(e,'applyFontScale:save')}catch(_){}}
}
function updateFontScale(val){
  updateSetting('fontScale',val);
  applyFontScale(val);
}

// Question audio (in question slide)
function toggleQuestionAudio(){
  const btn=document.getElementById('q-audio-play-btn');
  const lbl=document.getElementById('q-audio-btn-label');
  if(!window._qAudioEl)return;
  if(window._qAudioEl.paused){
    window._qAudioEl.play();
    btn.classList.add('playing');
    lbl.textContent=I18n.t('question.stopMedia')||'⏸ إيقاف';
  }else{
    window._qAudioEl.pause();
    btn.classList.remove('playing');
    lbl.textContent='▶ تشغيل المقطع الصوتي';
  }
}
// ── Media Attachment toggle for presentation view ──
let _presMediaAttachEl=null;
function toggleMediaAttachment(q){
  if(!q||!q.mediaAttachment)return;
  const btn=document.getElementById('q-media-attach-play-btn');
  const lbl=document.getElementById('q-media-attach-btn-label');
  if(!_presMediaAttachEl){
    // Start playing
    if(q.mediaAttachment.type==='video'){
      _presMediaAttachEl=document.createElement('video');
      _presMediaAttachEl.src=q.mediaAttachment.data;
      _presMediaAttachEl.style.cssText='max-width:100%;max-height:300px;border-radius:12px;margin-top:8px';
      _presMediaAttachEl.controls=true;_presMediaAttachEl.playsInline=true;
      const mediaArea=document.getElementById('q-media-area');
      mediaArea.appendChild(_presMediaAttachEl);
      _presMediaAttachEl.play().catch(()=>toast(I18n.t('toast.videoPlayFailed'),'danger'));
    }else{
      _presMediaAttachEl=new Audio(q.mediaAttachment.data);
      _presMediaAttachEl.volume=Math.min(1,(state.settings.musicVol||40)/100);
      _presMediaAttachEl.play().then(()=>{
        if(btn)btn.classList.add('playing');
        if(lbl)lbl.textContent='⏸ إيقاف المرفق';
      }).catch(()=>toast(I18n.t('toast.audioPlayFailedPresenter'),'danger'));
      _presMediaAttachEl.onended=()=>{
        if(btn)btn.classList.remove('playing');
        if(lbl)lbl.textContent='▶ تشغيل المرفق';
        _presMediaAttachEl=null;
      };
      return; // audio doesn't need appendChild
    }
    if(btn)btn.classList.add('playing');
    if(lbl)lbl.textContent='⏸ إيقاف المرفق';
  }else{
    // Stop
    try{_presMediaAttachEl.pause();_presMediaAttachEl.currentTime=0}catch(e){console.error("[Error]",e);}
    if(_presMediaAttachEl instanceof HTMLVideoElement&&_presMediaAttachEl.parentNode){
      _presMediaAttachEl.parentNode.removeChild(_presMediaAttachEl);
    }
    _presMediaAttachEl=null;
    if(btn)btn.classList.remove('playing');
    if(lbl)lbl.textContent='▶ تشغيل المرفق';
  }
}

// Question type selector in modal
let _currentQType='text';
let _qMediaDataTemp=null;
let _optImages=[null,null,null,null]; // temp image data per option (base64)
let _optMathActive=[false,false,false,false]; // math preview toggle per option

// ── Option image helpers ──
function loadOptImage(input, idx){
  const file=input.files[0];
  if(!file)return;
  if(file.size>3*1024*1024){toast(I18n.t('toast.imageTooLarge'),'danger');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    _optImages[idx]=e.target.result;
    const thumb=document.getElementById(`opt-img-thumb-${idx}`);
    const row=document.getElementById(`opt-img-row-${idx}`);
    const optRow=document.getElementById(`opt-row-${idx}`);
    const btn=document.getElementById(`opt-img-btn-${idx}`);
    if(thumb) thumb.src=e.target.result;
    if(row) row.style.display='flex';
    if(optRow) optRow.classList.add('has-image');
    if(btn) btn.classList.add('active-img');
    input.value='';
    toast(I18n.t('toast.optionImageLoaded'),'success');
  };
  reader.readAsDataURL(file);
}

function clearOptImage(idx){
  _optImages[idx]=null;
  const thumb=document.getElementById(`opt-img-thumb-${idx}`);
  const row=document.getElementById(`opt-img-row-${idx}`);
  const optRow=document.getElementById(`opt-row-${idx}`);
  const btn=document.getElementById(`opt-img-btn-${idx}`);
  const fileInput=document.getElementById(`opt-img-file-${idx}`);
  if(thumb) thumb.src='';
  if(row) row.style.display='none';
  if(optRow) optRow.classList.remove('has-image');
  if(btn) btn.classList.remove('active-img');
  if(fileInput) fileInput.value='';
}

function toggleOptMath(idx){
  _optMathActive[idx]=!_optMathActive[idx];
  const btn=document.getElementById(`opt-math-btn-${idx}`);
  const prev=document.getElementById(`opt-math-preview-${idx}`);
  if(btn) btn.classList.toggle('active-math',_optMathActive[idx]);
  if(prev) prev.style.display=_optMathActive[idx]?'block':'none';
  if(_optMathActive[idx]) renderOptMathPreview(idx);
}

function onOptTextChange(idx){
  if(_optMathActive[idx]) renderOptMathPreview(idx);
  // highlight correct row
  updateOptRowState();
}

function renderOptMathPreview(idx){
  const txt=document.getElementById(`q-opt-${idx}`)?.value||'';
  const prev=document.getElementById(`opt-math-preview-${idx}`);
  if(!prev) return;
  if(!txt){prev.innerHTML='<span style="color:var(--text-muted);font-size:.8rem">اكتب معادلة...</span>';return;}
  prev.textContent=txt;
  if(window.renderMathInElement){
    try{
      renderMathInElement(prev,{
        delimiters:[
          {left:'$$',right:'$$',display:true},{left:'$',right:'$',display:false},
          {left:'\\(',right:'\\)',display:false},{left:'\\[',right:'\\]',display:true}
        ],
        strict:false,throwOnError:false,
        macros:{'\\س':'x','\\ص':'y','\\ع':'n','\\أ':'a','\\ب':'b','\\ر':'r'}
      });
    }catch(e){prev.textContent='⚠ '+e.message;}
  }
}

function updateOptRowState(){
  const correctIdx=+document.getElementById('q-correct-input').value;
  [0,1,2,3].forEach(i=>{
    const row=document.getElementById(`opt-row-${i}`);
    const badge=document.getElementById(`opt-letter-badge-${i}`);
    if(row) row.classList.toggle('is-correct', i===correctIdx);
  });
}

function resetOptEditor(){
  _optImages=Array(8).fill(null);
  _optMathActive=Array(8).fill(false);
  for(var i=0;i<8;i++){
    var fi=document.getElementById('opt-img-file-'+i);
    if(fi) fi.value='';
    clearOptImage(i);
    var prev=document.getElementById('opt-math-preview-'+i);
    if(prev){prev.style.display='none';prev.innerHTML='';}
    var btn=document.getElementById('opt-math-btn-'+i);
    if(btn) btn.classList.remove('active-math');
    var inp=document.getElementById('q-opt-'+i);
    if(inp) inp.value='';
  }
  setOptionCount(4);
}

// ════════════════════════════════════════════════════════
//  QUESTION TEMPLATES SYSTEM
// ════════════════════════════════════════════════════════
var _questionTemplates=[
  {id:'quran',label:'📖 قالب القرآن',desc:'سؤال مع حقول السورة والآية',apply:function(){
    setQType('quran');
    setTimeout(function(){
      var tf=document.getElementById('q-text-input');if(tf)tf.value='ما هي السورة التي تحتوي على آية: "..."؟';
    },150);
  }},
  {id:'order',label:'📝 قالب الترتيب',desc:'4-6 عناصر قابلة للترتيب',apply:function(){
    setQType('order');
    setTimeout(function(){
      var tf=document.getElementById('q-text-input');if(tf)tf.value='رتب العناصر التالية بالترتيب الصحيح:';
      setOptionCount(4);
      setTimeout(function(){
        for(var i=0;i<4;i++){
          var inp=document.getElementById('q-opt-'+i);
          if(inp)inp.value='العنصر '+(i+1);
        }
      },150);
    },150);
  }},
  {id:'match',label:'🔗 قالب التوصيل',desc:'أزواج يسار-يمين للتوصيل',apply:function(){
    setQType('match');
    setTimeout(function(){
      var tf=document.getElementById('q-text-input');if(tf)tf.value='صل كل عنصر من العمود الأيمن بما يناسبه من العمود الأيسر:';
    },150);
  }},
  {id:'math',label:'∑ قالب الرياضيات',desc:'سؤال رياضيات مع KaTeX',apply:function(){
    setQType('math');
    setTimeout(function(){
      var tf=document.getElementById('q-text-input');if(tf)tf.value='ما ناتج العملية التالية؟';
      var katexInput=document.getElementById('q-katex');if(katexInput)katexInput.value='2 + 2';
      setOptionCount(4);
      setTimeout(function(){
        for(var i=0;i<4;i++){
          var inp=document.getElementById('q-opt-'+i);
          if(inp)inp.value='';
        }
        if(document.getElementById('q-opt-0'))document.getElementById('q-opt-0').value='4';
        if(document.getElementById('q-opt-1'))document.getElementById('q-opt-1').value='3';
        if(document.getElementById('q-opt-2'))document.getElementById('q-opt-2').value='5';
        if(document.getElementById('q-opt-3'))document.getElementById('q-opt-3').value='6';
        var correctSel=document.getElementById('q-correct-input');if(correctSel)correctSel.value='0';
      },150);
    },150);
  }},
  {id:'tf',label:'✅ قالب صح/خطأ',desc:'سؤال صح أو خطأ',apply:function(){
    setQType('tf');
    setTimeout(function(){
      var tf=document.getElementById('q-text-input');if(tf)tf.value='هل العبارة التالية صحيحة أم خاطئة؟';
    },150);
  }}
];
function showTemplateSelector(){
  var html='<div style="padding:16px">';
  html+='<h3 style="text-align:center;margin-bottom:12px;font-size:1rem">📋 القوالب الجاهزة</h3>';
  html+='<div style="display:flex;flex-direction:column;gap:8px">';
  _questionTemplates.forEach(function(t){
    html+='<button onclick="applyQuestionTemplate(\''+t.id+'\');closeModal(\'modal-template-selector\')" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;border:1px solid var(--border-light);background:var(--bg-panel);cursor:pointer;text-align:right;transition:background .2s" onmouseover="this.style.background=\'rgba(255,152,0,.08)\'" onmouseout="this.style.background=\'var(--bg-panel)\'">';
    html+='<span style="font-size:1rem">'+t.label+'</span>';
    html+='<span style="font-size:.75rem;color:var(--text-muted);flex:1">'+t.desc+'</span>';
    html+='</button>';
  });
  html+='</div></div>';
  var modal=document.getElementById('modal-template-selector');
  if(!modal){
    modal=document.createElement('div');
    modal.id='modal-template-selector';
    modal.className='modal-overlay hidden';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML='<div class="modal" style="max-width:420px"><div class="modal-header"><div class="modal-title">📋 القوالب الجاهزة</div><button class="modal-close" onclick="closeModal(\'modal-template-selector\')">✕</button></div><div id="template-selector-content"></div></div>';
    modal.addEventListener('click',function(e){if(e.target===modal)closeModal('modal-template-selector');});
    document.body.appendChild(modal);
  }
  document.getElementById('template-selector-content').innerHTML=html;
  openModal('modal-template-selector');
}
function applyQuestionTemplate(id){
  try{
    var tpl=_questionTemplates.find(function(t){return t.id===id;});
    if(tpl){
      tpl.apply();
      toast(t('toast.templateApplied'),'success');
    }else{
      toast(t('toast.templateNotFound'),'warning');
    }
  }catch(e){
    console.error('[applyQuestionTemplate] Error:',e);
    toast(t('toast.templateApplyError',{msg:e.message}),'danger');
  }
}
function cloneQuestion(catId,qIdx){
  var cat=state.categories.find(function(c){return c.id===catId;});
  if(!cat||!cat.questions[qIdx])return;
  var orig=cat.questions[qIdx];
  var clone=JSON.parse(JSON.stringify(orig));
  // Regenerate the question ID
  clone.id=Date.now().toString(36)+Math.random().toString(36).substr(2,5);
  // Regenerate IDs for nested objects (match pairs, order items, etc.)
  if(Array.isArray(clone.pairs)) clone.pairs=clone.pairs.map(function(p){var np=Object.assign({},p);if(p.id)np.id='p_'+Date.now().toString(36)+Math.random().toString(36).substr(2,5);return np;});
  if(Array.isArray(clone.items)) clone.items=clone.items.map(function(item){var ni=Object.assign({},item);if(item.id)ni.id='item_'+Date.now().toString(36)+Math.random().toString(36).substr(2,5);return ni;});
  if(clone.matchData&&Array.isArray(clone.matchData.pairs)) clone.matchData.pairs=clone.matchData.pairs.map(function(p){var np=Object.assign({},p);if(p.id)np.id='p_'+Date.now().toString(36)+Math.random().toString(36).substr(2,5);return np;});
  // Append " (نسخة)" to question text
  if(clone.text)clone.text=clone.text.replace(/ \(نسخة\)*$/,'')+' (نسخة)';
  cat.questions.splice(qIdx+1,0,clone);
  saveState();
  renderQuestionsAdmin(catId);
  toast(t('toast.questionCloned'),'success');
}
function generateMultipleQuestions(catId,qIdx,count){
  count=count||3;
  var cat=state.categories.find(function(c){return c.id===catId;});
  if(!cat||!cat.questions[qIdx])return;
  var orig=cat.questions[qIdx];
  for(var i=0;i<count;i++){
    var clone=JSON.parse(JSON.stringify(orig));
    clone.id=Date.now().toString(36)+Math.random().toString(36).substr(2,5);
    if(clone.type==='math'&&clone.text){
      // Generate random values for math questions
      var a=Math.floor(Math.random()*20)+1;
      var b=Math.floor(Math.random()*20)+1;
      clone.text=clone.text.replace(/\d+/g,function(){return Math.floor(Math.random()*20)+1;});
      if(clone.katex)clone.katex=clone.katex.replace(/\d+/g,function(){return Math.floor(Math.random()*20)+1;});
      // Recalculate correct answer for simple arithmetic
      if(clone.options){
        clone.options=clone.options.map(function(opt){
          return opt.replace(/\d+/g,function(){return Math.floor(Math.random()*30)+1;});
        });
      }
    }else{
      if(clone.text)clone.text=clone.text.replace(/ \(نسخة\)*$/,'')+' (نسخة '+(i+1)+')';
    }
    cat.questions.splice(qIdx+1+i,0,clone);
  }
  saveState();
  renderQuestionsAdmin(catId);
  toast('تم توليد '+count+' أسئلة','success');
}

function setQType(type){
  _currentQType=type;
  const allTypes=['text','image','audio','math','tf','order','fitb','quran','match','video'];
  document.querySelectorAll('.qtype-tab').forEach((t,i)=>{
    t.classList.toggle('active',i<allTypes.length&&allTypes[i]===type);
  });
  document.getElementById('qtype-image-section').style.display=type==='image'?'block':'none';
  document.getElementById('qtype-audio-section').style.display=type==='audio'?'block':'none';
  document.getElementById('qtype-tf-section').style.display=type==='tf'?'block':'none';
  const fitbSec=document.getElementById('qtype-fitb-section');
  if(fitbSec)fitbSec.style.display=type==='fitb'?'block':'none';
  const quranSec=document.getElementById('qtype-quran-section');
  if(quranSec)quranSec.style.display=type==='quran'?'block':'none';
  const matchSec=document.getElementById('qtype-match-section');
  if(matchSec)matchSec.style.display=type==='match'?'block':'none';
  const videoSec=document.getElementById('qtype-video-section');
  if(videoSec)videoSec.style.display=type==='video'?'block':'none';
  if(type==='match')_initMatchPairsEditor();
  // Show media attachment section for ALL question types except audio/video (they have their own media)
  const mediaAttachSec=document.getElementById('qtype-media-attachment-section');
  if(mediaAttachSec)mediaAttachSec.style.display='block';
  // Hide options editor for types that don't need MC options
  // 'order' NEEDS the options editor but hides the "correct answer" row
  const hideOptsEditor=['tf','fitb','quran','match'];
  const hideCorrectRow=['tf','order','fitb','quran','match'];
  const optEditor=document.querySelector('.options-editor');
  const correctRow=document.getElementById('q-correct-input')?.closest('.form-row');
  if(optEditor)optEditor.style.display=hideOptsEditor.includes(type)?'none':'flex';
  if(correctRow)correctRow.style.display=hideCorrectRow.includes(type)?'none':'grid';
  // For order: update placeholders and labels to show "العنصر N"
  const _letters=['أ','ب','ج','د'];
  if(type==='order'){
    [0,1,2,3].forEach(i=>{
      const inp=document.getElementById('q-opt-'+i);
      if(inp)inp.placeholder='العنصر '+(i+1)+' (الترتيب الصحيح)';
      const badge=document.getElementById('opt-letter-badge-'+i);
      if(badge)badge.textContent=(i+1)+'';
    });
  }else{
    [0,1,2,3].forEach(i=>{
      const inp=document.getElementById('q-opt-'+i);
      if(inp)inp.placeholder='';
      const badge=document.getElementById('opt-letter-badge-'+i);
      if(badge)badge.textContent=_letters[i]||'';
    });
  }
  // Handle text input
  const textEl=document.getElementById('q-text-input');
  if(textEl){
    textEl.readOnly=(type==='quran');
    textEl.placeholder=type==='fitb'?'مثال: عاصمة المملكة هي [___]':
      type==='quran'?'سيُملأ تلقائياً بعد جلب الآية...':'أدخل نص السؤال...';
  }
  if(type==='math'){setTimeout(previewMath,100);}
  else{
    const prev=document.getElementById('math-live-preview');
    if(prev)prev.innerHTML='<span style="color:var(--text-muted);font-size:.85rem">اكتب معادلة وستظهر هنا...</span>';
  }
  document.getElementById('math-hint').style.display=type==='math'?'block':'none';
  if(type==='quran')_initQuranDatalist();
  // Show type-specific hints in the options editor area
  const optHint=document.getElementById('qtype-options-hint');
  if(optHint){
    const hints={
      text:'',image:'',audio:'',math:'',tf:'',
      order:'💡 أدخل عناصر الجواب بالترتيب الصحيح في حقول "العنصر 1، 2، 3..." أدناه — ستظهر للمتسابق بترتيب عشوائي عليه إعادة ترتيبها',
      fitb:'',quran:'',video:'💡 سؤال الفيديو يعرض مقطع فيديو للمتسابق — أضف خيارات الإجابة أدناه'
    };
    optHint.textContent=hints[type]||'';
    optHint.style.display=hints[type]?'block':'none';
  }
}

function selectTFAnswer(val){
  document.getElementById('tf-correct-answer').value=val;
  document.getElementById('tf-true-btn').classList.toggle('selected',val==='true');
  document.getElementById('tf-false-btn').classList.toggle('selected',val==='false');
}

var _currentOptCount = 4;
function setOptionCount(count){
  count = Math.max(2, Math.min(8, count));
  _currentOptCount = count;
  var container = document.querySelector('.options-editor');
  if(!container) return;
  // Show/hide option fields
  for(var i=0; i<8; i++){
    var optRow = document.getElementById('q-opt-row-'+i);
    if(optRow) optRow.style.display = i < count ? '' : 'none';
  }
  // Update counter display
  var counterEl = document.getElementById('opt-count-display');
  if(counterEl) counterEl.textContent = count;
  // Update correct answer dropdown
  updateCorrectAnswerDropdown(count);
}

function updateCorrectAnswerDropdown(count){
  var sel = document.getElementById('q-correct-input');
  if(!sel) return;
  var currentVal = sel.value;
  sel.innerHTML = '';
  for(var i=0; i<count; i++){
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = getAnswerLabel(i);
    sel.appendChild(opt);
  }
  if(currentVal < count) sel.value = currentVal;
  else sel.value = 0;
}

function addOption(){
  setOptionCount(_currentOptCount + 1);
}

function removeOption(){
  if(_currentOptCount <= 2) return;
  setOptionCount(_currentOptCount - 1);
}

function loadQuestionMedia(input,mediaType){
  const file=input.files[0];if(!file)return;
  const maxSize=mediaType==='video'?50*1024*1024:5*1024*1024;
  const maxLabel=mediaType==='video'?'50MB':'5MB';
  if(file.size>maxSize){toast(I18n.t('media.fileTooLarge')||'حجم الملف كبير (أقصى '+maxLabel+')','danger');return}
  const reader=new FileReader();
  reader.onload=e=>{
    if(mediaType==='video'){
      // Store video as blob in IndexedDB, use reference key
      const blob=new Blob([new Uint8Array(e.target.result)],{type:file.type});
      const refKey='qv_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
      try{
        MediaDB.set(refKey,blob).then(()=>{
          _qMediaDataTemp={type:mediaType,refKey:refKey,name:file.name,blobSize:file.size};
          document.getElementById('q-video-preview').style.display='flex';
          document.getElementById('q-video-preview-name').textContent=file.name.length>20?file.name.slice(0,17)+'…':file.name;
          toast(I18n.t('toast.videoLoaded'),'success');
        }).catch(err=>{
          // Fallback to blob URL if IndexedDB fails
          console.warn('MediaDB video storage failed, using blob URL fallback:',err);
          var fallbackBlobUrl=URL.createObjectURL(blob);
          _qMediaDataTemp={type:mediaType,data:fallbackBlobUrl,name:file.name,_isBlobUrl:true};
          document.getElementById('q-video-preview').style.display='flex';
          document.getElementById('q-video-preview-name').textContent=file.name.length>20?file.name.slice(0,17)+'…':file.name;
          toast(I18n.t('toast.videoLoadedFallback'),'success');
        });
      }catch(err){
        // Fallback to blob URL
        var fallbackBlob2=new Blob([new Uint8Array(e.target.result)],{type:file.type});
        var fallbackBlobUrl2=URL.createObjectURL(fallbackBlob2);
        _qMediaDataTemp={type:mediaType,data:fallbackBlobUrl2,name:file.name,_isBlobUrl:true};
        document.getElementById('q-video-preview').style.display='flex';
        document.getElementById('q-video-preview-name').textContent=file.name.length>20?file.name.slice(0,17)+'…':file.name;
        toast(I18n.t('toast.videoLoaded'),'success');
      }
    }else{
      // For non-video media, keep existing behavior (base64 data URL)
      _qMediaDataTemp={type:mediaType,data:e.target.result,name:file.name};
      if(mediaType==='image'){
        document.getElementById('q-image-preview').style.display='block';
        document.getElementById('q-image-preview-img').src=e.target.result;
      }else if(mediaType==='audio'){
        document.getElementById('q-audio-preview').style.display='flex';
        document.getElementById('q-audio-preview-name').textContent=file.name.length>20?file.name.slice(0,17)+'…':file.name;
      }
      toast(I18n.t('toast.mediaLoaded'),'success');
    }
  };
  if(mediaType==='video'){
    reader.readAsArrayBuffer(file); // Read as ArrayBuffer for blob creation
  }else{
    reader.readAsDataURL(file); // Keep existing behavior for images/audio
  }
  input.value='';
}
function clearQuestionMedia(mediaType){
  // Clean up IndexedDB blob reference if video was stored there
  if(_qMediaDataTemp&&_qMediaDataTemp.refKey&&typeof MediaDB!=='undefined'){
    try{MediaDB['delete'](_qMediaDataTemp.refKey).catch(function(e){_logErr(e,'MediaDB:deleteQuestionMediaRef')});}catch(e){console.error("[Error]",e);}
  }
  // Revoke blob URL if fallback was used
  if(_qMediaDataTemp&&_qMediaDataTemp._isBlobUrl&&_qMediaDataTemp.data){
    try{URL.revokeObjectURL(_qMediaDataTemp.data);}catch(e){console.error("[Error]",e);}
  }
  _qMediaDataTemp=null;
  if(mediaType==='image'){document.getElementById('q-image-preview').style.display='none';document.getElementById('q-image-preview-img').src=''}
  else if(mediaType==='audio'){document.getElementById('q-audio-preview').style.display='none'}
  else if(mediaType==='video'){document.getElementById('q-video-preview').style.display='none'}
}
function testQuestionVideo(){
  if(!_qMediaDataTemp||_qMediaDataTemp.type!=='video'){toast(I18n.t('toast.noVideo'),'info');return}
  if(_customVideoTestEl&&!_customVideoTestEl.paused){stopQuestionVideoTest();return;}
  if(_customVideoTestEl){try{_customVideoTestEl.pause()}catch(e){console.error("[Error]",e);}}
  _customVideoTestEl=document.createElement('video');
  // Handle both blob reference and data URL
  if(_qMediaDataTemp.refKey){
    try{
      MediaDB.get(_qMediaDataTemp.refKey).then(blob=>{
        if(!blob){toast(I18n.t('toast.videoNotFoundInStorage'),'danger');return;}
        var blobUrl=URL.createObjectURL(blob);
        _customVideoTestEl.src=blobUrl;
        _customVideoTestEl._blobUrl=blobUrl; // Store for cleanup
        _customVideoTestEl.volume=Math.min(1,(state.settings.musicVol||40)/100);
        _customVideoTestEl.onended=()=>{stopQuestionVideoTest();_customVideoTestEl=null;};
        _customVideoTestEl.play().then(()=>{
          const stopBtn=document.getElementById('stop-btn-qVideo');
          const playBtn=document.getElementById('test-btn-qVideo');
          if(stopBtn)stopBtn.classList.remove('hidden');
          if(playBtn){playBtn.classList.add('playing');playBtn.textContent='⏸ إيقاف';}
        }).catch(()=>toast(I18n.t('toast.videoPlayFailed'),'danger'));
      }).catch(()=>toast(I18n.t('toast.videoReadFailed'),'danger'));
    }catch(e){toast(I18n.t('toast.videoReadError'),'danger');}
  }else{
    // Fallback to data URL
    _customVideoTestEl.src=_qMediaDataTemp.data;
    _customVideoTestEl.volume=Math.min(1,(state.settings.musicVol||40)/100);
    _customVideoTestEl.onended=()=>{stopQuestionVideoTest();_customVideoTestEl=null;};
    _customVideoTestEl.play().then(()=>{
      const stopBtn=document.getElementById('stop-btn-qVideo');
      const playBtn=document.getElementById('test-btn-qVideo');
      if(stopBtn)stopBtn.classList.remove('hidden');
      if(playBtn){playBtn.classList.add('playing');playBtn.textContent='⏸ إيقاف';}
    }).catch(()=>toast(I18n.t('toast.videoPlayFailed'),'danger'));
  }
}
function stopQuestionVideoTest(){
  if(_customVideoTestEl){
    try{_customVideoTestEl.pause();_customVideoTestEl.currentTime=0}catch(e){console.error("[Error]",e);}
    if(_customVideoTestEl._blobUrl){try{URL.revokeObjectURL(_customVideoTestEl._blobUrl);}catch(e){console.error("[Error]",e);}}
    _customVideoTestEl=null;
  }
  const stopBtn=document.getElementById('stop-btn-qVideo');
  const playBtn=document.getElementById('test-btn-qVideo');
  if(stopBtn)stopBtn.classList.add('hidden');
  if(playBtn){playBtn.classList.remove('playing');playBtn.textContent='▶ تشغيل';}
}
// ── Media Attachment helpers (audio/video attachment for ANY question type) ──
let _mediaAttachmentTemp=null; // {type:'audio'|'video', data:base64, name:string}
let _customMediaAttachEl=null;
function loadMediaAttachment(input,mediaType){
  const file=input.files[0];if(!file)return;
  const maxSize=mediaType==='video'?20*1024*1024:5*1024*1024;
  const maxLabel=mediaType==='video'?'20MB':'5MB';
  if(file.size>maxSize){toast(I18n.t('media.fileTooLarge')||'حجم الملف كبير (أقصى '+maxLabel+')','danger');return}
  toast(I18n.t('media.loading')||'جارٍ تحميل المرفق...','info');
  const reader=new FileReader();
  reader.onload=e=>{
    const data=e.target.result;
    // For large files, store in IndexedDB instead of keeping in memory
    if(data.length>100*1024&&typeof MediaDB!=='undefined'){
      const refKey='qma_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
      const storeData=mediaType==='video'?(function(){
        try{var binaryStr=atob(data.split(',')[1]||data);var bytes=new Uint8Array(binaryStr.length);
        for(var bi=0;bi<binaryStr.length;bi++)bytes[bi]=binaryStr.charCodeAt(bi);
        return new Blob([bytes],{type:file.type});}catch(e){return data;}
      })():data;
      MediaDB.set(refKey,storeData).then(()=>{
        _mediaAttachmentTemp={type:mediaType,refKey,name:file.name,blobSize:file.size};
        document.getElementById('q-media-attach-preview').style.display='flex';
        document.getElementById('q-media-attach-icon').textContent=mediaType==='video'?'🎬':'🎵';
        document.getElementById('q-media-attach-name').textContent=file.name.length>20?file.name.slice(0,17)+'…':file.name;
        document.getElementById('test-btn-mediaAttach').style.display='inline-flex';
        document.getElementById('clear-btn-mediaAttach').style.display='inline-flex';
        toast(I18n.t('media.savedAttachment')||'تم تحميل المرفق ✓','success');
      }).catch(()=>{
        // Fallback: keep in memory if IndexedDB fails
        _mediaAttachmentTemp={type:mediaType,data,name:file.name};
        document.getElementById('q-media-attach-preview').style.display='flex';
        document.getElementById('q-media-attach-icon').textContent=mediaType==='video'?'🎬':'🎵';
        document.getElementById('q-media-attach-name').textContent=file.name.length>20?file.name.slice(0,17)+'…':file.name;
        document.getElementById('test-btn-mediaAttach').style.display='inline-flex';
        document.getElementById('clear-btn-mediaAttach').style.display='inline-flex';
        toast(I18n.t('media.savedAttachment')||'تم تحميل المرفق ✓','success');
      });
    }else{
      _mediaAttachmentTemp={type:mediaType,data,name:file.name};
      document.getElementById('q-media-attach-preview').style.display='flex';
      document.getElementById('q-media-attach-icon').textContent=mediaType==='video'?'🎬':'🎵';
      document.getElementById('q-media-attach-name').textContent=file.name.length>20?file.name.slice(0,17)+'…':file.name;
      document.getElementById('test-btn-mediaAttach').style.display='inline-flex';
      document.getElementById('clear-btn-mediaAttach').style.display='inline-flex';
      toast(I18n.t('media.savedAttachment')||'تم تحميل المرفق ✓','success');
    }
  };
  reader.readAsDataURL(file);
  input.value='';
}
function clearMediaAttachment(){
  _mediaAttachmentTemp=null;
  if(_customMediaAttachEl){try{_customMediaAttachEl.pause();_customMediaAttachEl=null}catch(e){console.error("[Error]",e);}}
  document.getElementById('q-media-attach-preview').style.display='none';
  document.getElementById('test-btn-mediaAttach').style.display='none';
  document.getElementById('clear-btn-mediaAttach').style.display='none';
  const stopBtn=document.getElementById('stop-btn-mediaAttach');
  if(stopBtn)stopBtn.classList.add('hidden');
  const playBtn=document.getElementById('test-btn-mediaAttach');
  if(playBtn){playBtn.classList.remove('playing');playBtn.textContent='▶ تشغيل';}
}
function testMediaAttachment(){
  if(!_mediaAttachmentTemp){toast(I18n.t('media.noAttachment')||'لا يوجد مرفق وسائط','info');return}
  if(_customMediaAttachEl&&!_customMediaAttachEl.paused){stopMediaAttachmentTest();return;}
  if(_customMediaAttachEl){try{_customMediaAttachEl.pause()}catch(e){console.error("[Error]",e);}}
  // Handle refKey (data in IndexedDB)
  if(_mediaAttachmentTemp.refKey&&typeof MediaDB!=='undefined'){
    MediaDB.get(_mediaAttachmentTemp.refKey).then(function(blobOrData){
      var src=blobOrData;
      if(blobOrData instanceof Blob)src=URL.createObjectURL(blobOrData);
      if(_mediaAttachmentTemp.type==='video'){
        _customMediaAttachEl=document.createElement('video');
      }else{
        _customMediaAttachEl=new Audio();
      }
      _customMediaAttachEl.src=src;
      _customMediaAttachEl.volume=Math.min(1,(state.settings.musicVol||40)/100);
      _customMediaAttachEl.onended=()=>{stopMediaAttachmentTest();_customMediaAttachEl=null;};
      _customMediaAttachEl.play().then(()=>{
        var stopBtn=document.getElementById('stop-btn-mediaAttach');
        var playBtn=document.getElementById('test-btn-mediaAttach');
        if(stopBtn)stopBtn.classList.remove('hidden');
        if(playBtn){playBtn.classList.add('playing');playBtn.textContent='⏸ إيقاف';}
      }).catch(()=>toast(I18n.t('media.playFailed')||'تعذّر تشغيل المرفق','danger'));
    }).catch(function(){toast(I18n.t('media.playFailed')||'تعذّر تشغيل المرفق','danger');});
    return;
  }
  if(_mediaAttachmentTemp.type==='video'){
    _customMediaAttachEl=document.createElement('video');
    _customMediaAttachEl.src=_mediaAttachmentTemp.data;
  }else{
    _customMediaAttachEl=new Audio(_mediaAttachmentTemp.data);
  }
  _customMediaAttachEl.volume=Math.min(1,(state.settings.musicVol||40)/100);
  _customMediaAttachEl.onended=()=>{stopMediaAttachmentTest();_customMediaAttachEl=null;};
  _customMediaAttachEl.play().then(()=>{
    const stopBtn=document.getElementById('stop-btn-mediaAttach');
    const playBtn=document.getElementById('test-btn-mediaAttach');
    if(stopBtn)stopBtn.classList.remove('hidden');
    if(playBtn){playBtn.classList.add('playing');playBtn.textContent='⏸ إيقاف';}
  }).catch(()=>toast(I18n.t('media.playFailed')||'تعذّر تشغيل المرفق','danger'));
}
function stopMediaAttachmentTest(){
  if(_customMediaAttachEl){try{_customMediaAttachEl.pause();_customMediaAttachEl.currentTime=0}catch(e){console.error("[Error]",e);}_customMediaAttachEl=null;}
  const stopBtn=document.getElementById('stop-btn-mediaAttach');
  const playBtn=document.getElementById('test-btn-mediaAttach');
  if(stopBtn)stopBtn.classList.add('hidden');
  if(playBtn){playBtn.classList.remove('playing');playBtn.textContent='▶ تشغيل';}
}
function testQuestionAudio(){
  if(!_qMediaDataTemp||_qMediaDataTemp.type!=='audio'){toast(I18n.t('media.noAttachment')||'لا يوجد مقطع صوتي','info');return}
  if(_customAudioTestEl&&!_customAudioTestEl.paused){stopQuestionAudioTest();return;}
  if(_customAudioTestEl){try{_customAudioTestEl.pause()}catch(e){try{ErrorBus.capture(e,"catch#37")}catch(_){}}}
  _customAudioTestEl=new Audio(_qMediaDataTemp.data);
  _customAudioTestEl.volume=Math.min(1,(state.settings.musicVol||40)/100);
  _customAudioTestEl.onended=()=>{stopQuestionAudioTest();_customAudioTestEl=null;};
  _customAudioTestEl.play().then(()=>{
    const stopBtn=document.getElementById('stop-btn-qAudio');
    const playBtn=document.getElementById('test-btn-qAudio');
    if(stopBtn)stopBtn.classList.remove('hidden');
    if(playBtn){playBtn.classList.add('playing');playBtn.textContent='⏸ إيقاف';}
  }).catch(()=>toast(I18n.t('media.playFailed')||'تعذّر التشغيل','danger'));
}

function switchMusicPattern(type){
  if(!state.musicPlaying)return;
  // For custom music: duck volume during tense moments instead of stopping
  if(state.settings.musicType==='custom'){
    if(_customMusicEl){
      if(type==='tense'){
        _customMusicEl.volume=Math.min(1,(state.settings.musicVol||40)/100*0.3);
      }else{
        _customMusicEl.volume=Math.min(1,(state.settings.musicVol||40)/100*0.7);
      }
    }
    return;
  }
  if(typeof _musicSwitchPending!=='undefined'&&_musicSwitchPending)return;
  _musicSwitchPending=true;
  stopMusic();
  setTimeout(()=>{
    _musicSwitchPending=false;
    if(state.gameActive)startMusic(type);
  },200);
}

function _stopTenseAudio(){
  state._tenseMusicActive=false;
  // V10-fix: also unregister from AudioMixer so stopAll() works correctly
  try{AudioMixer.stop('tense');}catch(e){try{ErrorBus.capture(e,"catch#AUTO_174")}catch(_){}}
  // Stop custom/embedded tense audio file and release memory
  if(window._tenseAudioEl){try{window._tenseAudioEl.pause();window._tenseAudioEl.src='';window._tenseAudioEl.load();}catch(e){try{ErrorBus.capture(e,"catch#38")}catch(_){}}window._tenseAudioEl=null;}
  // Stop synth tense music (if pattern was switched via switchMusicPattern)
  if(state.musicPlaying&&state.settings.musicType==='tense'){
    stopMusic();
  }
  // Restore custom music volume if it was ducked during tense period
  if(_customMusicEl && state.settings.musicType==='custom'){
    _customMusicEl.volume=Math.min(1,(state.settings.musicVol||40)/100*0.7);
  }
  // Resume background music if it was playing before tense music started
  try{BgmResumeTracker.restore();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_175")}catch(_){}}
}

// V7 M1/F2: extend timer — also stops tense audio and resets _tensePlaying flag
function extendTimerSeconds(extra){
  if(typeof extra!=='number'||extra<=0)extra=state.settings.timeExtendSeconds||15;
  if(typeof state.timeLeft!=='number')return false;
  state.timeLeft=(state.timeLeft||0)+extra;
  state.timerTotal=(state.timerTotal||0)+extra;
  // V12: Update timer baseline so the interval tick calculates correctly after extension
  state._timerStartLeft=state.timeLeft;
  state._timerStartTime=Date.now();
  state._timerPauseAccum=0;
  state._timerPauseStart=0;
  // Update UI — use updateTimerDisplay for proper ring + number update
  try{updateTimerDisplay(state.timeLeft,state.timerTotal);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_176")}catch(_){}}
  // Critical: stop tense music if we're back above threshold
  try{
    const tenseSecs=state.settings.tenseSeconds||10;
    if(state._tenseMusicActive&&state.timeLeft>tenseSecs){
      _stopTenseAudio();state._tenseMusicActive=false;
    }
  }catch(e){ErrorBus.capture(e,'extendTimerSeconds');}
  try{Store.dispatch('TIMER_EXTENDED',{added:extra,newTime:state.timeLeft});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_177")}catch(_){}}
  if(typeof toast==='function')toast(I18n.t('toast.extraSecondsAdded',{seconds:extra}),'success');
  return true;
}


function updateMusicBtn(){
  const btn=document.getElementById('music-toggle-btn');
  const icon=document.getElementById('music-icon');
  const lbl=document.getElementById('music-label');
  if(btn){
    if(state.musicPlaying){btn.classList.add('playing');if(icon)icon.textContent='🎵';if(lbl)lbl.textContent=I18n.t('btn.music')||'موسيقى'}
    else{btn.classList.remove('playing');if(icon)icon.textContent='🔇';if(lbl)lbl.textContent=I18n.t('btn.music')||'موسيقى'}
  }
  syncGlobalMusicWidget();
}
function syncGlobalMusicWidget(){
  const gBtn=document.getElementById('gm-toggle-btn');
  const gIcon=document.getElementById('gm-icon');
  const gSlider=document.getElementById('gm-vol-slider');
  const gLabel=document.getElementById('gm-vol-label');
  const vol=state.settings.musicVol||40;
  if(gIcon) gIcon.textContent=state.musicPlaying?'🎵':'🔇';
  if(gBtn) gBtn.classList.toggle('playing',state.musicPlaying);
  if(gSlider&&+gSlider.value!==vol) gSlider.value=vol;
  if(gLabel) gLabel.textContent=vol+'%';
}

// ════════════════════════════════════════════════════════
//  SOUND EFFECTS
// ════════════════════════════════════════════════════════
// ── V11: Embedded default sound effects (applause + buzzer) ──
var _defaultSoundCache={}; // Cache Audio objects for reuse
// Build data URL from base64 raw data (not a full data URL)
function _b64ToDataUrl(b64Data,mime){
  if(!b64Data)return null;
  // If already a data URL, return as-is
  if(typeof b64Data==='string'&&b64Data.indexOf('data:')===0)return b64Data;
  return 'data:'+(mime||'audio/mpeg')+';base64,'+b64Data;
}
function _playDefaultSound(key){
  try{
    // Determine volume based on sound type
    var _vol=0.8;
    if(key==='applause'||key==='chime'||key==='fanfare')_vol=(state.settings.soundCorrectVol||80)/100;
    else if(key==='buzz'||key==='descend')_vol=(state.settings.soundWrongVol||80)/100;
    // 1. Try cached Audio object first (fastest path)
    if(_defaultSoundCache[key]){
      try{
        _defaultSoundCache[key].currentTime=0;
        _defaultSoundCache[key].volume=_vol;
        _defaultSoundCache[key].play().catch(function(playErr){
          // Cached audio play failed — fall back to Web Audio API synthesis
          console.warn('[Sound] Cached audio play failed for',key,', falling back:',playErr);
          delete _defaultSoundCache[key];
          _playDefaultSoundFallback(key,_vol);
        });
        return true;
      }catch(cacheErr){
        // Cached object may be invalid (e.g. src revoked), remove and rebuild
        delete _defaultSoundCache[key];
      }
    }
    // 2. Try direct base64 data URL from embedded data (primary method)
    var _directSrc=null;
    if(key==='applause'&&typeof APPLAUSE_B64_DATA!=='undefined'&&APPLAUSE_B64_DATA){
      _directSrc=_b64ToDataUrl(APPLAUSE_B64_DATA,'audio/mpeg');
    }else if(key==='buzz'&&typeof BUZZER_B64_DATA!=='undefined'&&BUZZER_B64_DATA){
      _directSrc=_b64ToDataUrl(BUZZER_B64_DATA,'audio/mpeg');
    }
    if(_directSrc){
      try{
        var audio=new Audio(_directSrc);
        audio.volume=_vol;
        _defaultSoundCache[key]=audio;
        audio.play().catch(function(playErr){
          // Autoplay rejected or decode failed — fall back to Web Audio API synthesis
          console.warn('[Sound] HTML5 Audio play failed for',key,', falling back to Web Audio:',playErr);
          _playDefaultSoundFallback(key,_vol);
        });
        // Also store to IndexedDB in background for future Blob-based loading
        if(typeof MediaDB!=='undefined'){
          try{
            MediaDB.get('_default_sound_init').then(function(existing){
              if(!existing){
                // Store the base64 sounds to IDB for future sessions
                _initDefaultSounds();
              }
            }).catch(function(){});
          }catch(e){try{ErrorBus.capture(e,"catch#AUTO_178")}catch(_){}}
        }
        return true;
      }catch(directErr){
        // Direct base64 failed, continue to fallbacks
      }
    }
    // 3. Try loading from IndexedDB (stored as Blob for efficiency)
    if(typeof MediaDB!=='undefined'){
      MediaDB.get('_default_sound_'+key).then(function(data){
        if(data){
          var src=(data instanceof Blob)?URL.createObjectURL(data):data;
          if(src){
            var audio=new Audio(src);
            audio.volume=_vol;
            _defaultSoundCache[key]=audio;
            audio.play().catch(function(){});
          }
        }else{
          // IDB has no data — fall back to Web Audio API synthesis immediately
          _playDefaultSoundFallback(key,_vol);
        }
      }).catch(function(){
        // IDB read failed — fall back to Web Audio API synthesis
        _playDefaultSoundFallback(key,_vol);
      });
    }else{
      // No MediaDB — fall back to Web Audio API synthesis
      _playDefaultSoundFallback(key,_vol);
    }
  }catch(e){
    // Last resort: try Web Audio API fallback
    try{_playDefaultSoundFallback(key,0.8);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_179")}catch(_){}}
  }
  return false;
}
// Web Audio API fallback for default sounds when IDB sounds aren't available
function _playDefaultSoundFallback(key,vol){
  try{
    var ctx=getAudioCtx();
    if(!ctx||ctx.state==='suspended'){try{ctx.resume();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_180")}catch(_){}}}
    if(key==='applause'){
      // Simulate applause with noise bursts
      for(var i=0;i<8;i++){
        (function(idx){
          var buf=ctx.createBuffer(1,ctx.sampleRate*.12,ctx.sampleRate);
          var d=buf.getChannelData(0);
          for(var j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.exp(-j/d.length*3);
          var s=ctx.createBufferSource();s.buffer=buf;
          var g=ctx.createGain();g.gain.setValueAtTime(vol*.4,ctx.currentTime+idx*.15);
          g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+idx*.15+.12);
          s.connect(g);g.connect(ctx.destination);
          s.start(ctx.currentTime+idx*.15);
        })(i);
      }
    }else if(key==='buzz'){
      // Simulate buzzer with descending sawtooth
      var o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sawtooth';o.frequency.setValueAtTime(150,ctx.currentTime);
      o.frequency.linearRampToValueAtTime(60,ctx.currentTime+.5);
      g.gain.setValueAtTime(vol*.4,ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);
      o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.5);
    }
  }catch(e){console.error("[Error]",e);}
}
// V11: Initialize default sounds from uploaded files into IndexedDB
function _initDefaultSounds(){
  if(typeof MediaDB==='undefined')return;
  // Defer to idle time to avoid blocking the UI thread during startup
  var _doInit=function(){
    try{
      MediaDB.get('_default_sound_init').then(function(existing){
        if(existing)return; // Already initialized
        // Use requestAnimationFrame to break up the heavy atob() work
        if(typeof APPLAUSE_B64_DATA!=='undefined'&&APPLAUSE_B64_DATA){
          requestAnimationFrame(function(){
            try{
              var binApplause=atob(APPLAUSE_B64_DATA);
              var bytesApplause=new Uint8Array(binApplause.length);
              for(var i=0;i<binApplause.length;i++)bytesApplause[i]=binApplause.charCodeAt(i);
              var blobApplause=new Blob([bytesApplause],{type:'audio/mpeg'});
              MediaDB.set('_default_sound_applause',blobApplause);
            }catch(e){console.warn('[Sounds] Failed to store applause:',e);}
            // Store buzzer after applause is done
            if(typeof BUZZER_B64_DATA!=='undefined'&&BUZZER_B64_DATA){
              requestAnimationFrame(function(){
                try{
                  var binBuzzer=atob(BUZZER_B64_DATA);
                  var bytesBuzzer=new Uint8Array(binBuzzer.length);
                  for(var j=0;j<binBuzzer.length;j++)bytesBuzzer[j]=binBuzzer.charCodeAt(j);
                  var blobBuzzer=new Blob([bytesBuzzer],{type:'audio/mpeg'});
                  MediaDB.set('_default_sound_buzz',blobBuzzer);
                }catch(e){console.warn('[Sounds] Failed to store buzzer:',e);}
                MediaDB.set('_default_sound_init','1');
                console.info('[Sounds] Default sounds stored in IndexedDB');
              });
            }else{
              MediaDB.set('_default_sound_init','1');
              console.info('[Sounds] Default sounds stored in IndexedDB (no buzzer)');
            }
          });
        }else{
          MediaDB.set('_default_sound_init','1');
          console.info('[Sounds] No embedded sound data — skipping');
        }
      }).catch(function(e){console.warn('[Sounds] IDB check failed:',e);});
    }catch(e){console.warn('[Sounds] Init failed:',e);}
  };
  // Schedule after 2s to let the app fully start first
  if(typeof requestIdleCallback==='function'){requestIdleCallback(_doInit,{timeout:3000});}
  else{setTimeout(_doInit,2000);}
}
function stopEffectSound(){
  // Stop HTML5 Audio effect (custom files) — release memory
  if(_effectAudioEl){
    try{_effectAudioEl.pause();_effectAudioEl.src='';_effectAudioEl.load();}catch(e){try{ErrorBus.capture(e,"catch#39")}catch(_){}}
    _effectAudioEl=null;
  }
  // Stop cached default sounds (base64 applause/buzz) — pause without destroying
  Object.keys(_defaultSoundCache).forEach(function(key){
    try{
      var cached=_defaultSoundCache[key];
      if(cached&&!cached.paused){cached.pause();cached.currentTime=0;}
    }catch(e){try{ErrorBus.capture(e,"catch#AUTO_181")}catch(_){}}
  });
  // Stop Web Audio API oscillators (built-in sounds)
  stopAllWebAudioSounds();
}
function playSound(type){
  try{
    // Solo mode: respect mute setting
    if(typeof _soloSettings!=='undefined'&&_soloSettings.muted&&typeof window._currentView!=='undefined'&&window._currentView&&window._currentView.startsWith('solo')){
      return;
    }
    // Broadcast sound to audience/presenter window via BroadcastChannel
    if(state.settings.audiencePlaySounds!==false){
      try{
        var _sndCh=_soundChannel||_remoteChannel;
        if(_sndCh){
          _sndCh.postMessage({action:'playSound',type:type,
            vol:type==='correct'?(state.settings.soundCorrectVol||80):(state.settings.soundWrongVol||80)});
        }
      }catch(e){try{ErrorBus.capture(e,"catch#AUTO_182")}catch(_){}}
      try{
        if(typeof _audienceWin!=='undefined'&&_audienceWin&&!_audienceWin.closed&&_audienceWin._audiencePlaySound){
          _audienceWin._audiencePlaySound(type,type==='correct'?(state.settings.soundCorrectVol||80):(state.settings.soundWrongVol||80));
        }
      }catch(e){try{ErrorBus.capture(e,"catch#AUTO_183")}catch(_){}}
    }
    stopEffectSound(); // stop any previous effect
    const ctx=getAudioCtx();
    // Support mp3_correct type: plays a short clip from DEFAULT_BG_MUSIC or a rich chime
    if(type==='mp3_correct'){
      if(typeof DEFAULT_BG_MUSIC!=='undefined'&&DEFAULT_BG_MUSIC){
        try{
          // V10-fix: assign to _effectAudioEl so stopEffectSound() can clean it up, preventing memory leak on rapid calls
          _effectAudioEl=new Audio(DEFAULT_BG_MUSIC);
          _effectAudioEl.currentTime=0;_effectAudioEl.volume=.6;
          _effectAudioEl.play().catch(function(){});
          // Stop after 2 seconds (short clip) and release memory
          var _mp3CleanupTimer=setTimeout(function(){try{if(_effectAudioEl){_effectAudioEl.pause();_effectAudioEl.src='';_effectAudioEl.load();_effectAudioEl=null;}}catch(e){console.error("[Error]",e);}},2000);
          return;
        }catch(e){console.error("[Error]",e);}
      }
      // Fallback to rich chime if no MP3
      playRichChime(ctx);return;
    }
    const _sd=type==='correct'?state.settings.soundCorrect:state.settings.soundWrong;
    // If custom, use customCorrectData / customWrongData
    if(_sd==='custom'){
      const _key=type==='correct'?'customCorrectData':'customWrongData';
      const _cd=state.settings[_key];
      if(_cd){
        _effectAudioEl=new Audio(_cd);
        _effectAudioEl.volume=(type==='correct'?(state.settings.soundCorrectVol||80):(state.settings.soundWrongVol||80))/100;
        _effectAudioEl.play().catch(()=>{});
        return;
      }
      return;
    }
    const customKey=type==='correct'?'customCorrectData':'customWrongData';
    // V10-fix: Legacy path — only play custom data if sound setting is 'default' (not when user chose chime/fanfare/etc)
    if(state.settings[customKey]&&(_sd==='default'||_sd==='')){
      _effectAudioEl=new Audio(state.settings[customKey]);
      _effectAudioEl.volume=(type==='correct'?(state.settings.soundCorrectVol||80):(state.settings.soundWrongVol||80))/100;
      _effectAudioEl.play().catch(()=>{});
      return;
    }
  const s=_sd;
    if(s==='none')return;
    if(type==='correct'){
      // 'default' or '' or unknown → use embedded applause (base64) as default
      if(s==='applause'||s==='default'||s===''||(!['chime','fanfare','rich_chime','custom','none'].includes(s))){
        _playDefaultSound('applause');return;
      }
      else if(s==='chime')playChime(ctx);
      else if(s==='fanfare')playFanfare(ctx);
      else if(s==='rich_chime')playRichChime(ctx);
    }else{
      // 'default' or '' or unknown → use embedded buzz (base64) as default
      if(s==='buzz'||s==='default'||s===''||(!['descend','custom','none'].includes(s))){
        _playDefaultSound('buzz');return;
      }
      else if(s==='descend')playDescend(ctx);
    }
  }catch(e){try{ErrorBus.capture(e,"catch#40")}catch(_){}}
}
// Rich chime sound — a more musical correct answer sound with harmonics
function playRichChime(ctx){
  try{
    var freqs=[523.25,659.25,783.99,1046.50,1318.51];
    freqs.forEach(function(f,i){
      var o=_trackEffectNode(ctx.createOscillator()),g=ctx.createGain();
      o.type=i<3?'sine':'triangle';
      o.frequency.value=f;
      g.gain.setValueAtTime(.3/(i+1),ctx.currentTime+i*.12);
      g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.12+.8);
      o.connect(g);g.connect(ctx.destination);
      o.start(ctx.currentTime+i*.12);
      o.stop(ctx.currentTime+i*.12+.8);
    });
    // Add a soft shimmer overlay
    var shimmer=_trackEffectNode(ctx.createOscillator()),sg=ctx.createGain();
    shimmer.type='sine';shimmer.frequency.value=2093;
    sg.gain.setValueAtTime(.08,ctx.currentTime+.4);
    sg.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+1.2);
    shimmer.connect(sg);sg.connect(ctx.destination);
    shimmer.start(ctx.currentTime+.4);shimmer.stop(ctx.currentTime+1.2);
  }catch(e){console.error("[Error]",e);}
}
// Track Web Audio effect nodes for cleanup
let _webAudioEffectNodes=[];
function stopAllWebAudioSounds(){
  _webAudioEffectNodes.forEach(n=>{try{n.stop&&n.stop();n.disconnect&&n.disconnect()}catch(e){try{ErrorBus.capture(e,"catch#41")}catch(_){}}});
  _webAudioEffectNodes=[];
}
function _trackEffectNode(node){
  _webAudioEffectNodes.push(node);
  // Periodic cleanup: cap tracked nodes to prevent unbounded growth
  // Stopped/disconnected nodes can accumulate; clean every 100 additions
  if(_webAudioEffectNodes.length>100){
    _webAudioEffectNodes=_webAudioEffectNodes.filter(n=>{
      try{return n.context&&n.context.state==='running'}catch(_){return false}
    });
  }
  return node;
}

function playApplause(ctx){for(let i=0;i<8;i++){const buf=ctx.createBuffer(1,ctx.sampleRate*.15,ctx.sampleRate),d=buf.getChannelData(0);for(let j=0;j<d.length;j++)d[j]=(Math.random()*2-1)*Math.exp(-j/d.length*4);const s=_trackEffectNode(ctx.createBufferSource()),g=ctx.createGain();s.buffer=buf;g.gain.setValueAtTime(.3,ctx.currentTime+i*.18);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.18+.15);s.connect(g);g.connect(ctx.destination);s.start(ctx.currentTime+i*.18)}}
function playChime(ctx){[523,659,784,1047].forEach((f,i)=>{const o=_trackEffectNode(ctx.createOscillator()),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.4,ctx.currentTime+i*.15);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.15+.6);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+i*.15);o.stop(ctx.currentTime+i*.15+.6)})}
function playFanfare(ctx){[[392,0],[523,.15],[659,.3],[784,.45],[1047,.6]].forEach(([f,t])=>{const o=_trackEffectNode(ctx.createOscillator()),g=ctx.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.25,ctx.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+t+.3);o.connect(g);g.connect(ctx.destination);o.start(ctx.currentTime+t);o.stop(ctx.currentTime+t+.3)})}
function playBuzz(ctx){const o=_trackEffectNode(ctx.createOscillator()),g=ctx.createGain();o.type='sawtooth';o.frequency.value=120;o.frequency.linearRampToValueAtTime(60,ctx.currentTime+.4);g.gain.setValueAtTime(.4,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.5);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.5)}
function playDescend(ctx){const o=_trackEffectNode(ctx.createOscillator()),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(500,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(100,ctx.currentTime+.7);g.gain.setValueAtTime(.3,ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.7);o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.7)}

// ════════════════════════════════════════════════════════
//  CONFETTI
// ════════════════════════════════════════════════════════
let confettiP=[];let _confAF=null;
const MAX_CONFETTI=350;
function launchConfetti(count=120){
  const canvas=document.getElementById('confetti-canvas');
  canvas.width=innerWidth;canvas.height=innerHeight;
  const colors=['#f5c842','#00d4ff','#ff6b35','#00e676','#ff3b5c','#a78bfa'];
  const toAdd=Math.min(count,MAX_CONFETTI);
  if(confettiP.length+toAdd>MAX_CONFETTI)confettiP=confettiP.slice(confettiP.length+toAdd-MAX_CONFETTI);
  for(let i=0;i<toAdd;i++)confettiP.push({x:Math.random()*canvas.width,y:-20,w:7+Math.random()*8,h:5+Math.random()*6,color:colors[~~(Math.random()*colors.length)],vx:(Math.random()-.5)*6,vy:3+Math.random()*5,rot:Math.random()*360,rotV:(Math.random()-.5)*8,life:1});
  if(!_confAF)_animConf();
}
function _animConf(){
  const canvas=document.getElementById('confetti-canvas'),ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  confettiP=confettiP.filter(p=>p.life>0);
  // Decay life over time for natural fade-out
  confettiP.forEach(p=>{p.life-=.008;});
  confettiP.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.rot+=p.rotV;p.vy+=.1;if(p.y>canvas.height)p.life=0;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;ctx.globalAlpha=Math.min(1,p.life);ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore()});
  if(confettiP.length)_confAF=requestAnimationFrame(_animConf);
  else{_confAF=null;ctx.clearRect(0,0,canvas.width,canvas.height)}
}

// ════════════════════════════════════════════════════════
//  MODALS
// ════════════════════════════════════════════════════════
let _lastFocusedBeforeModal=null;
function openModal(id){
  const el=document.getElementById(id);
  if(!el)return;
  _lastFocusedBeforeModal=document.activeElement;
  el.classList.remove('hidden');
  const focusable=el.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(focusable.length)setTimeout(()=>focusable[0].focus(),50);
  el._focusTrapHandler=function(e){
    if(e.key!=='Tab')return;
    const fl=el.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    if(!fl.length)return;
    const first=fl[0],last=fl[fl.length-1];
    if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus();}}
    else{if(document.activeElement===last){e.preventDefault();first.focus();}}
  };
  el.addEventListener('keydown',el._focusTrapHandler);
}
function closeModal(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.add('hidden');
  if(el._focusTrapHandler){el.removeEventListener('keydown',el._focusTrapHandler);el._focusTrapHandler=null;}
  if(_lastFocusedBeforeModal){try{_lastFocusedBeforeModal.focus();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_184")}catch(_){}}_lastFocusedBeforeModal=null;}
  if(id==='modal-question'){_qMediaDataTemp=null;_mediaAttachmentTemp=null;resetOptEditor();}
}
function confirmAction(msg,cb,icon='⚠️',ok){
  // V11-fix: ensure ok is always a string even if i18n key missing
  if(!ok) ok = (typeof I18n!=='undefined' && I18n.t && I18n.t('lbl.confirm')) || 'تأكيد';
  var iconEl=document.getElementById('confirm-icon');
  var msgEl=document.getElementById('confirm-msg');
  var okBtn=document.getElementById('confirm-ok-btn');
  if(!msgEl||!okBtn){console.warn('[confirmAction] modal elements missing');cb();return;}
  if(iconEl)iconEl.textContent=icon;
  msgEl.textContent=msg;
  okBtn.textContent=ok;
  okBtn.onclick=()=>{closeModal('modal-confirm');cb()};
  openModal('modal-confirm');
}
document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeModal(o.id)}));

// ════════════════════════════════════════════════════════
//  TOAST — Enhanced Multi-Notification System
// ════════════════════════════════════════════════════════
const _toastIcons={success:'✓',danger:'✕',warning:'⚠',info:'ℹ',gold:'★',achievement:'⚡'};
const _toastDurations={success:3500,danger:4000,warning:4500,info:3500,gold:4000,achievement:5000};
let _toastCount=0;
const _TOAST_MAX=5;

/* Announce to screen readers */
function announce(msg,priority){
  try{
    var el=document.getElementById(priority==='assertive'?'live-assertive':'live-polite');
    if(el){el.textContent='';TimerRegistry.setTimeout(function(){el.textContent=msg;},100,'announce-'+Date.now());}
  }catch(e){}
}

/* Enhanced Notification System */
function notify(msg,type,actionText,actionCb,duration){
  try{
    var container=document.getElementById('toast-container');
    if(!container){
      container=document.createElement('div');
      container.id='toast-container';
      container.className='toast-container';
      document.body.appendChild(container);
    }
    var icons={success:'✓',error:'✗',warning:'⚠',info:'ℹ'};
    var el=document.createElement('div');
    el.className='notification notif-'+(type||'info');
    // Use textContent instead of innerHTML for XSS safety
    var iconSpan=document.createElement('span');
    iconSpan.className='notif-icon';
    iconSpan.textContent=icons[type]||icons.info;
    var msgSpan=document.createElement('span');
    msgSpan.className='notif-msg';
    msgSpan.textContent=msg;
    el.appendChild(iconSpan);
    el.appendChild(msgSpan);
    if(actionText){
      var btn=document.createElement('button');
      btn.className='notif-action';
      btn.textContent=actionText;
      btn.onclick=function(){if(actionCb)actionCb();el.classList.add('notif-exit');TimerRegistry.setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},300,'notif-remove');};
      el.appendChild(btn);
    }
    // Add progress bar
    var progressBar=document.createElement('div');
    progressBar.className='toast-progress '+(type||'info');
    progressBar.style.width='100%';
    el.style.position='relative';
    el.appendChild(progressBar);
    container.appendChild(el);
    // Auto dismiss
    var dur=duration||3000;
    // Animate progress bar
    progressBar.style.transitionDuration=dur+'ms';
    requestAnimationFrame(function(){requestAnimationFrame(function(){progressBar.style.width='0%';});});
    TimerRegistry.setTimeout(function(){
      el.classList.add('notif-exit');
      TimerRegistry.setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},300,'notif-cleanup');
    },dur,'notif-auto');
    // Announce to screen readers
    announce(msg,type==='error'?'assertive':'polite');
  }catch(e){}
}

function toast(msg,type='info',opts){
  const container=document.getElementById('toast-container');
  if(!container)return;
  // Enforce max visible
  const existing=container.querySelectorAll('.toast-item:not(.toast-exit)');
  if(existing.length>=_TOAST_MAX){
    const oldest=existing[existing.length-1];
    _dismissToast(oldest);
  }
  const duration=(opts&&opts.duration)||_toastDurations[type]||3500;
  const icon=_toastIcons[type]||_toastIcons.info;
  const el=document.createElement('div');
  el.className='toast-item '+type;
  el.innerHTML='<span class="toast-icon">'+icon+'</span><span class="toast-msg">'+msg+'</span><button class="toast-close" onclick="_dismissToast(this.parentElement)">×</button><div class="toast-progress"><div class="toast-progress-bar" style="width:100%"></div></div>';
  container.appendChild(el);
  // Progress bar animation
  const bar=el.querySelector('.toast-progress-bar');
  if(bar){
    bar.style.transitionDuration=duration+'ms';
    requestAnimationFrame(function(){requestAnimationFrame(function(){bar.style.width='0%';});});
  }
  // Auto dismiss
  el._toastTimer=setTimeout(function(){_dismissToast(el);},duration);
  _toastCount++;
}
function _dismissToast(el){
  if(!el||el._dismissed)return;
  el._dismissed=true;
  if(el._toastTimer){clearTimeout(el._toastTimer);el._toastTimer=null;}
  el.classList.add('toast-exit');
  setTimeout(function(){if(el.parentElement)el.remove();},300);
}

// ════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════

// ── V7: Question reorder via SortableJS ──
function onQDragStart(e){if(e&&e.preventDefault)e.preventDefault();}
function onQDragOver(e){if(e&&e.preventDefault)e.preventDefault();}
function onQDrop(e){if(e&&e.preventDefault)e.preventDefault();}
function initQuestionsSortable(container){
  if(!container)return;
  initSortable(container,{
    handle:'.question-item',
    draggable:'.question-item',
    onEnd:function(evt){
      if(evt.oldIndex===evt.newIndex)return;
      const cat=state.categories.find(c=>c.id===state.currentCatId);if(!cat)return;
      const [moved]=cat.questions.splice(evt.oldIndex,1);
      cat.questions.splice(evt.newIndex,0,moved);
      saveState();
      renderQuestionsAdmin(state.currentCatId);
      Store.dispatch('QUESTIONS_REORDERED',{catId:cat.id,from:evt.oldIndex,to:evt.newIndex});
      if(typeof toast==='function')toast(I18n.t('toast.reordered'),'success');
    }
  });
}


function moveTeam(id, dir){
  const idx=state.teams.findIndex(t=>t.id===id);
  if(idx<0)return;
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=state.teams.length)return;
  [state.teams[idx],state.teams[newIdx]]=[state.teams[newIdx],state.teams[idx]];
  saveState();renderTeamsAdmin();
}

// ── V7: Team reorder via SortableJS ──
function onTeamDragStart(e){if(e&&e.preventDefault)e.preventDefault();}
function onTeamDragOver(e){if(e&&e.preventDefault)e.preventDefault();}
function onTeamDrop(e){if(e&&e.preventDefault)e.preventDefault();}
function onTeamDragEnd(){}
function initTeamsSortable(container){
  if(!container)return;
  initSortable(container,{
    handle:'[data-teamid]',
    draggable:'[data-teamid]',
    onEnd:function(evt){
      if(evt.oldIndex===evt.newIndex)return;
      const [moved]=state.teams.splice(evt.oldIndex,1);
      state.teams.splice(evt.newIndex,0,moved);
      saveState();
      renderTeamsAdmin();
      Store.dispatch('TEAMS_REORDERED',{from:evt.oldIndex,to:evt.newIndex});
      if(typeof toast==='function')toast(I18n.t('toast.teamsReordered'),'info');
    }
  });
}

// V7: Touch DnD polyfill removed — SortableJS handles touch natively.

// ═══ CUSTOM PALETTE SAVE/LOAD ═══
function saveCustomPalette(){
  const name=prompt(I18n.t('prompt.boardName'),I18n.t('prompt.boardNameDefault'));if(!name)return;
  const colors={};
  ['bg-deep','bg-card','bg-panel','bg-surface','accent1','accent1-light','accent1-dark','accent2','success','danger','text-primary','text-secondary','text-muted','border','border-light'].forEach(k=>{
    colors[k]=getComputedStyle(document.documentElement).getPropertyValue('--'+k).trim();
  });
  let palettes=JSON.parse(localStorage.getItem('quiz_custom_palettes')||'[]');
  palettes.push({name,colors,date:Date.now()});
  localStorage.setItem('quiz_custom_palettes',JSON.stringify(palettes));
  toast(I18n.t('toast.paletteSaved',{name:name}),'success');
  renderSavedPalettes();
}
function loadCustomPalettePrompt(){renderSavedPalettes()}
function renderSavedPalettes(){
  const el=document.getElementById('saved-palettes-list');if(!el)return;
  const palettes=JSON.parse(localStorage.getItem('quiz_custom_palettes')||'[]');
  if(!palettes.length){el.innerHTML='<div class="text-sm text-muted">'+t('empty.noPalettes')+'</div>';return;}
  el.innerHTML=palettes.map((p,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-panel);border:1px solid var(--border);border-radius:8px;margin-bottom:5px">
      <div style="display:flex;gap:2px">${Object.values(p.colors).slice(0,5).map(c=>'<div style="width:14px;height:14px;border-radius:3px;background:'+c+'"></div>').join('')}</div>
      <span style="flex:1;font-size:.8rem;font-weight:700">${p.name}</span>
      <button class="btn btn-primary btn-sm" style="padding:3px 10px;font-size:.72rem" onclick="applyPalette(${i})">تطبيق</button>
      <button class="btn btn-danger btn-sm" style="padding:3px 8px;font-size:.72rem" onclick="deletePalette(${i})">✕</button>
    </div>`).join('');
}
function applyPalette(idx){
  const palettes=JSON.parse(localStorage.getItem('quiz_custom_palettes')||'[]');
  const p=palettes[idx];if(!p)return;
  Object.entries(p.colors).forEach(([k,v])=>{document.documentElement.style.setProperty('--'+k,v);});
  // Sync color pickers
  const map={'bg-deep':'ct-bg-deep','accent1':'ct-accent1','accent2':'ct-accent2','bg-card':'ct-bg-card','text-primary':'ct-text-primary','border':'ct-border'};
  Object.entries(map).forEach(([k,id])=>{const el=document.getElementById(id);if(el&&p.colors[k])el.value=p.colors[k];});
  toast(I18n.t('toast.paletteApplied',{name:p.name}),'success');
}
function deletePalette(idx){
  let palettes=JSON.parse(localStorage.getItem('quiz_custom_palettes')||'[]');
  palettes.splice(idx,1);
  localStorage.setItem('quiz_custom_palettes',JSON.stringify(palettes));
  renderSavedPalettes();toast(I18n.t('toast.deleted')||'تم الحذف','info');
}
function resetCustomPalette(){
  ['bg-deep','bg-card','bg-panel','bg-surface','accent1','accent1-light','accent1-dark','accent2','success','danger','text-primary','text-secondary','text-muted','border','border-light'].forEach(k=>{
    document.documentElement.style.removeProperty('--'+k);
  });
  applyTheme(state.settings.theme||'space');toast(I18n.t('toast.themeReset'),'info');
}

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function shuffleArray(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}
function populateColorSwatches(cId,iId,colors){
  const el=document.getElementById(cId);if(!el)return;
  el.innerHTML=colors.map(c=>`<div onclick="document.getElementById('${iId}').value='${c}'" style="width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer;transition:transform .15s" onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform=''"></div>`).join('');
}
// ── V9: Enhanced HTML sanitizer — escapes user content to prevent XSS
// _sanitize() is used for user-provided text (explanations, answers, etc.)
// It escapes HTML entities so <script> and <img onerror=...> become harmless text
function _sanitize(str){
  if(!str)return '';
  return _sanitizeUser(String(str));
}

// V10: Validate CSS color values to prevent CSS injection
// Only allows hex colors (#rgb, #rrggbb, #rrggbbaa), rgb()/rgba(), and named CSS colors
function _safeColor(c){
  if(!c||typeof c!=='string')return '#888';
  var s=c.trim();
  // Allow hex colors: #rgb, #rrggbb, #rrggbbaa
  if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s))return s;
  // Allow rgb()/rgba()
  if(/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[01]?\.?\d*\s*)?\)$/.test(s))return s;
  // Allow hsl()/hsla()
  if(/^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*[01]?\.?\d*\s*)?\)$/.test(s))return s;
  // Allow common CSS named colors (whitelist)
  var namedColors=['red','blue','green','yellow','orange','purple','pink','cyan','magenta','lime','teal','indigo','violet','gold','silver','bronze','white','black','gray','grey','navy','maroon','olive','aqua','fuchsia','coral','salmon','crimson','tomato','turquoise','sienna','peru','khaki','lavender','mintcream','aliceblue','antiquewhite','beige','bisque','blanchedalmond','burlywood','cadetblue','chartreuse','chocolate','cornflowerblue','cornsilk','darkblue','darkcyan','darkgoldenrod','darkgray','darkgreen','darkgrey','darkkhaki','darkmagenta','darkolivegreen','darkorange','darkorchid','darkred','darksalmon','darkseagreen','darkslateblue','darkslategray','darkslategrey','darkturquoise','darkviolet','deeppink','deepskyblue','dimgray','dimgrey','dodgerblue','firebrick','floralwhite','forestgreen','gainsboro','ghostwhite','goldenrod','greenyellow','honeydew','hotpink','indianred','ivory','lawngreen','lemonchiffon','lightblue','lightcoral','lightcyan','lightgoldenrodyellow','lightgray','lightgreen','lightgrey','lightpink','lightsalmon','lightseagreen','lightskyblue','lightslategray','lightslategrey','lightsteelblue','lightyellow','limegreen','linen','mediumaquamarine','mediumblue','mediumorchid','mediumpurple','mediumseagreen','mediumslateblue','mediumspringgreen','mediumturquoise','mediumvioletred','midnightblue','mintcream','mistyrose','moccasin','navajowhite','oldlace','olivedrab','orangered','orchid','palegoldenrod','palegreen','paleturquoise','palevioletred','papayawhip','peachpuff','plum','powderblue','rosybrown','royalblue','saddlebrown','sandybrown','seagreen','seashell','skyblue','slateblue','slategray','slategrey','snow','springgreen','steelblue','tan','thistle','wheat','whitesmoke','yellowgreen'];
  if(namedColors.indexOf(s.toLowerCase())!==-1)return s;
  return '#888'; // Fallback safe color
}

// V10: Global media source validator (prevents javascript: and other unsafe URLs)
// Only allows data:image/*, data:audio/*, data:video/*, blob:, https:, http:
function _safeMediaSrc(src){
  if(!src||typeof src!=='string')return '';
  if(/^(data:image\/|data:audio\/|data:video\/|blob:|https?:\/\/)/i.test(src))return src;
  return '';
}

// Sanitize emoji/icon: allow only safe characters (emoji, common symbols)
function _sanitizeIcon(icon){
  if(!icon)return '';
  const s=String(icon).trim();
  // Allow only emoji and common safe characters (no HTML tags)
  if(/<[a-zA-Z\/]/.test(s))return '📂'; // Default icon if HTML detected
  return s.slice(0,8);
}

// ════════════════════════════════════════════════════════
//  V9.2: SafeDOM — Safe template rendering without innerHTML
//  Replaces dangerous innerHTML with safe DOM manipulation
