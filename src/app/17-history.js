// ═══ ENCRYPTED EXPORT/IMPORT ═══
function exportEncrypted(){
  const pwd=prompt(I18n.t('prompt.encryptPassword'));if(!pwd)return;
  const data=JSON.stringify({
    version:'9',
    settings:state.settings,
    categories:state.categories,
    teams:state.teams,
    credits:state.credits
  });
  try{
    let encrypted='';
    for(let i=0;i<data.length;i++){encrypted+=String.fromCharCode(data.charCodeAt(i)^pwd.charCodeAt(i%pwd.length));}
    const b64=btoa(unescape(encodeURIComponent(encrypted)));
    const blob=new Blob([JSON.stringify({v:2,enc:true,data:b64})],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='quiz-encrypted.qze';a.click();
    toast(I18n.t('toast.encryptedExport'),'success');
  }catch(e){toast(I18n.t('toast.encryptionError')+e.message,'danger');}
}
function importEncrypted(e){
  const file=e.target.files[0];if(!file)return;
  const pwd=prompt(I18n.t('prompt.decryptPassword'));if(!pwd){e.target.value='';return;}
  const reader=new FileReader();
  // V10-fix: Made async to support await for saveStateSync / MediaDB saves
  reader.onload=async ev=>{
    try{
      const obj=JSON.parse(ev.target.result);
      if(!obj.enc){toast(I18n.t('toast.notEncryptedFile'),'danger');return;}
      const encrypted=decodeURIComponent(escape(atob(obj.data)));
      let decrypted='';
      for(let i=0;i<encrypted.length;i++){decrypted+=String.fromCharCode(encrypted.charCodeAt(i)^pwd.charCodeAt(i%pwd.length));}
      const d=JSON.parse(decrypted);
      if(d.settings){state.settings={...state.settings,...d.settings};}
      if(d.categories){
        // Move large media to IndexedDB (same logic as importJSON)
        if(typeof MediaDB!=='undefined'){
          const catIdbPromises=[];
          d.categories.forEach(function(cat){
            if(cat.catImage&&typeof cat.catImage==='string'&&cat.catImage.length>500){
              catIdbPromises.push(MediaDB.set('ci_'+cat.id,cat.catImage).catch(function(e){_logErr(e,'MediaDB:setCatImg-importEncrypted')}));
            }
            if(cat.questions){
              cat.questions.forEach(function(q){
                if(q.mediaData&&typeof q.mediaData==='string'&&q.mediaData.length>500){
                  catIdbPromises.push(MediaDB.set('qm_'+q.id,q.mediaData).catch(function(e){_logErr(e,'MediaDB:setQuestionMedia-importEncrypted')}));
                }
                if(q.optionImages){
                  q.optionImages.forEach(function(img,idx){
                    if(img&&typeof img==='string'&&img.length>500){
                      catIdbPromises.push(MediaDB.set('qo_'+q.id+'_'+idx,img).catch(function(e){_logErr(e,'MediaDB:setOptionImg-importEncrypted')}));
                    }
                  });
                }
              });
            }
          });
          if(catIdbPromises.length>0)await Promise.all(catIdbPromises);
        }
        state.categories=d.categories;
      }
      if(d.teams){
        if(typeof MediaDB!=='undefined'){
          d.teams.forEach(function(t){
            if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500){
              MediaDB.set('ti_'+t.id,t.teamImage).catch(function(e){_logErr(e,'MediaDB:setTeamImg-importEncrypted')});
            }
          });
        }
        state.teams=d.teams;
      }
      if(d.credits){state.credits=d.credits;try{renderStatsGrid();}catch(e){try{ErrorBus.capture(e,"catch#15")}catch(e2){_logErr(e2,'importEncrypted:renderStatsGrid-inner')}}}
      // V10.3-fix: Save state properly with await + IDB primary state (same pattern as importJSON)
      _lastSavedJSON='';
      if(!_idbLoadDone){_idbLoadDone=true;_pendingSaveNeeded=false;}
      try{await saveStateSync();}catch(e){console.warn('[importEncrypted] saveStateSync error:',e);}
      try{if(typeof MediaDB!=='undefined')await MediaDB.saveAllMedia();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      try{if(typeof MediaDB!=='undefined')await MediaDB.saveCoreData();}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, "[Error]") : console.error("[Error]", e));}
      // V10.3-fix: Also save primary state to IDB for persistence guarantee
      try{
        if(typeof MediaDB!=='undefined'){
          var _encPsSettings={...state.settings};
          ['customMusicData','customCorrectData','customWrongData','customTenseData','podiumMusicData','wheelMusicData','certBgImage'].forEach(function(k){
            if(_encPsSettings[k]&&typeof _encPsSettings[k]==='string'&&_encPsSettings[k].length>500)_encPsSettings[k]=true;
          });
          var _encPsCats=_stripCatMedia(state.categories);
          var _encPsTeams=(state.teams||[]).map(function(t){return{...t,teamImage:(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)?true:t.teamImage};});
          var _encCoreStr=JSON.stringify({settings:_encPsSettings,categories:_encPsCats,teams:_encPsTeams,credits:state.credits});
          var _encCatImg={};state.categories.forEach(function(c){if(c.catImage&&typeof c.catImage==='string'&&c.catImage.length>500)_encCatImg[c.id]=c.catImage;});
          var _encTeamImg={teamImages:{},memberImages:{}};
          state.teams.forEach(function(t){
            if(t.teamImage&&typeof t.teamImage==='string'&&t.teamImage.length>500)_encTeamImg.teamImages[t.id]=t.teamImage;
            if(t.members&&Array.isArray(t.members)){
              var mImgs={};t.members.forEach(function(m,i){if(typeof m==='object'&&m.image&&typeof m.image==='string'&&m.image.length>500)mImgs[i]=m.image;});
              if(Object.keys(mImgs).length)_encTeamImg.memberImages[t.id]=mImgs;
            }
          });
          await MediaDB.savePrimaryState(_encCoreStr,Object.keys(_encCatImg).length>0?JSON.stringify(_encCatImg):null,JSON.stringify(_encTeamImg));
          console.info('[importEncrypted] Primary state saved to IDB');
        }
      }catch(e){console.warn('[importEncrypted] savePrimaryState error:',e);}
      renderAdmin();toast(I18n.t('toast.encryptedImport'),'success');
    }catch(err){toast(I18n.t('toast.wrongPasswordOrCorrupt'),'danger');}
  };
  reader.readAsText(file);e.target.value='';
}

// ═══ SESSION HISTORY ═══
function saveSessionHistory(){
  const session={
    date:Date.now(),name:state.settings.name,
    teams:state.teams.map(t=>({name:t.name,score:t.score||0,color:t.color})),
    stats:{...state.sessionStats},
    categories:state.categories.length,
    totalQuestions:state.categories.reduce((a,c)=>a+c.questions.length,0)
  };
  let history=[];
  try{history=JSON.parse(localStorage.getItem('quiz_session_history')||'[]');}catch(e){console.warn('[History] Corrupt session_history, resetting:',e);history=[];}
  if(!Array.isArray(history))history=[];
  history.unshift(session);
  if(history.length>20)history=history.slice(0,20);
  try{localStorage.setItem('quiz_session_history',JSON.stringify(history));}catch(e){(typeof ErrorBus !== "undefined" ? ErrorBus.capture(e, '[History] save failed:') : console.error('[History] save failed:', e));}
}
function showSessionHistory(){
  let history=[];
  try{history=JSON.parse(localStorage.getItem('quiz_session_history')||'[]');}catch(e){console.warn('[History] Corrupt session_history:',e);history=[];}
  if(!Array.isArray(history))history=[];
  if(!history.length){toast(I18n.t('toast.noHistory')||'لا يوجد سجل مسابقات','info');return;}
  const content=history.map((s,i)=>{
    const d=new Date(s.date);
    const winner=s.teams.sort((a,b)=>b.score-a.score)[0];
    return `<div style="background:var(--bg-panel);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div style="font-weight:800;font-size:.9rem">${s.name}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${d.toLocaleDateString('ar')} ${d.toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
      <div style="font-size:.8rem;color:var(--text-secondary)">🏆 الفائز: <strong style="color:${winner?.color||'var(--accent1)'}">${winner?.name||'-'}</strong> (${winner?.score||0} نقطة) | ${s.teams.length} فرق | ${s.totalQuestions} سؤال</div>
    </div>`;
  }).join('');
  openGenericModal('📋 سجل المسابقات',content+'<div style="margin-top:12px;text-align:center"><button class="btn btn-danger btn-sm" onclick="confirmAction(\'حذف السجل بالكامل?\',function(){localStorage.removeItem(\'quiz_session_history\');closeModal(\'modal-generic\');toast(\'تم الحذف\',\'info\')})">🗑️ مسح السجل</button></div>');
}
function openUserGuide(){
  const sections=[
    {title:'🚀 البدء السريع',content:`
      <p><b>منصة المسابقات التفاعلية v12</b> هي أداة شاملة لإدارة المسابقات والأنشطة التفاعلية تعمل بالكامل بدون إنترنت.</p>
      <ol style="padding-right:20px;line-height:2.2">
        <li>سجّل الدخول بكلمة المرور الافتراضية <code>1234</code></li>
        <li>عند أول تشغيل يظهر <b>معالج البدء السريع</b> لمساعدتك على الإعداد</li>
        <li>أنشئ أقساماً (عادية أو حاوية) وأضف أسئلة لكل قسم</li>
        <li>أضف الفرق المشاركة</li>
        <li>اضغط <b>بدء العرض</b> لبدء المسابقة</li>
        <li>اختر قسماً ثم سؤالاً لعرضه على الشاشة</li>
        <li>أجب عن السؤال واضغط الزر المناسب (صحيح/خاطئ)</li>
      </ol>
    `},
    {title:'📁 أنواع الأقسام (جديد v12)',content:`
      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <tr style="border-bottom:1px solid var(--border)"><th style="padding:6px;text-align:right">النوع</th><th style="padding:6px;text-align:right">الوصف</th><th style="padding:6px;text-align:right">الاستخدام</th></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">📂 قسم عادي</td><td style="padding:6px">يحتوي أسئلة ويظهر في المسابقة</td><td style="padding:6px">الأقسام الأساسية</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">📁 قسم حاوي</td><td style="padding:6px">يجمع أقساماً فرعية تحته ولا يحتوي أسئلة</td><td style="padding:6px">تنظيم المراحل والمجموعات</td></tr>
        <tr><td style="padding:6px">⚡ قسم حسم</td><td style="padding:6px">يظهر فقط في جولة الحسم عند تعادل الفرق</td><td style="padding:6px">كسر التعادل</td></tr>
      </table>
      <p style="margin-top:10px"><b>الأقسام الحاوية</b> تتيح تنظيم المسابقة في مراحل — مثلاً "المرحلة الأولى" تحتوي أقساماً فرعية، وحين اكتمالها تنتقل تلقائياً للمرحلة التالية.</p>
      <ul style="padding-right:20px;line-height:2">
        <li><b>ترتيب المرحلة</b>: رقم يحدد ترتيب ظهور الحاوي في الوضع التتابعي</li>
        <li><b>عنوان المرحلة</b>: اسم يظهر بدل اسم القسم (مثل: "المرحلة الأولى")</li>
        <li><b>طريقة عرض الأقسام الفرعية</b>: شبكة/قائمة/عجلة/تلقائي</li>
      </ul>
    `},
    {title:'🔗 وضع لعب الأقسام الحاوية (جديد v12)',content:`
      <p>في الإعدادات ← طريقة عرض الأقسام ← إعدادات الأقسام الحاوية، يمكنك اختيار:</p>
      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <tr style="border-bottom:1px solid var(--border)"><th style="padding:6px;text-align:right">الوضع</th><th style="padding:6px;text-align:right">الوصف</th></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">📂 عادي</td><td style="padding:6px">تُعرض جميع الأقسام الحاوية ويختار المتسابق المجلد ثم القسم الفرعي بحرية</td></tr>
        <tr><td style="padding:6px">🔗 تتابعي</td><td style="padding:6px">تُعرض المراحل بالترتيب — بعد اكتمال أقسام المرحلة الأولى ينتقل تلقائياً للمرحلة الثانية وهكذا. مع شريط تقدم ومؤشرات المراحل</td></tr>
      </table>
      <p style="margin-top:8px">في الوضع التتابعي:</p>
      <ul style="padding-right:20px;line-height:2">
        <li>يظهر <b>شريط تقدم</b> يوضح حالة المرحلة الحالية</li>
        <li><b>مؤشرات المراحل</b> تُظهر المرحلة الحالية والمكتملة والقادمة</li>
        <li><b>انتقال تلقائي</b> للمرحلة التالية عند اكتمال الحالية (يمكن تعطيله)</li>
        <li><b>شاشة انتقال</b> متحركة بين المراحل</li>
      </ul>
    `},
    {title:'📝 أنواع الأسئلة',content:`
      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <tr style="border-bottom:1px solid var(--border)"><th style="padding:6px;text-align:right">النوع</th><th style="padding:6px;text-align:right">الوصف</th></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.text')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.text')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.tf')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.tf')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.fitb')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.fitb')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.quran')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.quran')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.order')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.order')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.match')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.match')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.math')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.math')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.image')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.image')}</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">${I18n.t('guide.qtype.audio')}</td><td style="padding:6px">${I18n.t('guide.qtypeDesc.audio')}</td></tr>
        <tr><td style="padding:6px">🎬 فيديو</td><td style="padding:6px">سؤال مع مقطع فيديو مرفق</td></tr>
      </table>
    `},
    {title:'🔗 الأسئلة الشرطية',content:`
      <p>يمكنك جعل سؤال يظهر فقط عند تحقيق شرط معين في سؤال سابق:</p>
      <ul style="padding-right:20px;line-height:2.2">
        <li>في محرر السؤال، اضغط <b>🔗 شروط العرض</b></li>
        <li>اختر السؤال الذي يعتمد عليه</li>
        <li>حدد الشرط: إجابة صحيحة / خاطئة / أي إجابة</li>
        <li>السؤال لن يظهر حتى يتحقق الشرط</li>
      </ul>
      <p style="color:var(--text-muted);font-size:.85rem">مثال: سؤال صعب يظهر فقط عند الإجابة الصحيحة على سؤال سهل سابق</p>
    `},
    {title:'🎮 أوضاع المسابقة',content:`
      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <tr style="border-bottom:1px solid var(--border)"><th style="padding:6px;text-align:right">الوضع</th><th style="padding:6px;text-align:right">الوصف</th></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">🔄 التناوب</td><td style="padding:6px">كل فريق يختار قسماً ويجيب على سؤال واحد ثم ينتقل الدور</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">📋 القسم الكامل</td><td style="padding:6px">الفريق يختار قسماً وتُوزَّع جميع أسئلته بالتساوي على الفرق</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">🏆 الفردي</td><td style="padding:6px">العب بمفردك واجمع النجوم عبر المراحل مع تتبع التقدم</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px">🎓 التدريب</td><td style="padding:6px">تدرب على الأسئلة بدون ضغط وقت</td></tr>
        <tr><td style="padding:6px">🔔 البازر</td><td style="padding:6px">تسابق عدة فرق للضغط أولاً عبر أزرار البازر</td></tr>
      </table>
    `},
    {title:'📊 لوحة التحكم (محسّنة v12)',content:`
      <p>لوحة التحكم في الصفحة الرئيسية تعرض:</p>
      <ul style="padding-right:20px;line-height:2.2">
        <li><b>📊 رسم بياني حلقي</b> لتوزيع الأسئلة حسب النوع مع نسب مئوية</li>
        <li>إجمالي الأسئلة والأقسام والفرق والجلسات</li>
        <li>حالة المسابقة والوضع وآخر نشاط</li>
        <li>مؤشرات إكمال الأقسام</li>
        <li>اضغط ⛶ لتكبير الرسم البياني</li>
      </ul>
    `},
    {title:'🎨 الثيمات والمظهر',content:`
      <p>19 ثيم متاح يناسب مختلف المناسبات:</p>
      <ul style="padding-right:20px;line-height:2">
        <li><b>مسرح المجرة</b> — الأزرق الداكن الكلاسيكي</li>
        <li><b>ساحة كهربائية</b> — نيون حماسي للشباب</li>
        <li><b>المسرح الذهبي</b> — ذهبي فاخر للنهائيات</li>
        <li><b>نهاري كلاسيكي</b> — فاتح للقاعات المضاءة</li>
        <li><b>ليلة احتفالية</b> — للمناسبات والأعراس</li>
        <li><b>مخصص</b> — صمّم ألوانك الخاصة</li>
      </ul>
      <p>يمكنك أيضاً تفعيل <b>وضع عمى الألوان</b> من تبويب المظهر لدعم ضعاف البصر.</p>
    `},
    {title:'🏆 الشارات والإنجازات',content:`
      <p>نظام الشارات يكافئ الفرق على إنجازاتهم:</p>
      <ul style="padding-right:20px;line-height:2.2">
        <li>🏆 <b>الفوز الأول</b> — أول إجابة صحيحة</li>
        <li>🔥 <b>سلسلة 3</b> — 3 إجابات متتالية</li>
        <li>⚡ <b>سلسلة 5</b> — 5 إجابات متتالية</li>
        <li>👑 <b>الأسطورة</b> — 10 إجابات متتالية</li>
        <li>💎 <b>كامل</b> — 100% إجابات صحيحة</li>
        <li>⚡ <b>البرق</b> — إجابة في أقل من 3 ثوان</li>
        <li>📚 <b>خبير القسم</b> — إجابات في كل الأقسام</li>
        <li>⭐ <b>العشرة</b> / 🌟 <b>الخمسون</b> — 10/50 إجابة صحيحة</li>
      </ul>
    `},
    {title:'📊 الإحصائيات المتقدمة',content:`
      <p>من شاشة الإحصائيات يمكنك:</p>
      <ul style="padding-right:20px;line-height:2.2">
        <li>عرض نسبة دقة كل فريق (رسم دائري)</li>
        <li>تتبع تطور النقاط عبر الوقت (رسم خطي)</li>
        <li>مقارنة الأداء بين الأقسام (رسم أعمدة)</li>
        <li>مقارنة سرعة الإجابة بين الفرق</li>
        <li>مشاهدة شارات كل فريق</li>
        <li>مقارنة فريقين وجهاً لوجه</li>
      </ul>
    `},
    {title:'🆘 أطواق النجاة',content:`
      <p>تُمنح لكل فريق في بداية المسابقة:</p>
      <ul style="padding-right:20px;line-height:2.2">
        <li><b>50/50</b>: حذف خيارين خاطئين</li>
        <li><b>وقت إضافي</b>: +15 ثانية إضافية</li>
        <li><b>تمرير</b>: تخطي السؤال بدون خسارة نقاط</li>
      </ul>
      <p style="color:var(--text-muted);font-size:.85rem">يمكن ضبط عدد كل طوق من الإعدادات (0-5)</p>
    `},
    {title:'⚡ جولة الحسم (جديد v12)',content:`
      <p>عند تعادل فريقين أو أكثر في النقاط النهائية:</p>
      <ul style="padding-right:20px;line-height:2.2">
        <li>يمكن تفعيل <b>جولة الحسم</b> من الإعدادات</li>
        <li>تُستخدم أسئلة من أقسام الحسم فقط</li>
        <li>عدد الأسئلة ونقاطها قابلان للتخصيص</li>
        <li>الفريق الذي يجيب أولاً بشكل صحيح يفوز</li>
      </ul>
    `},
    {title:'⌨️ اختصارات لوحة المفاتيح',content:`
      <table style="width:100%;border-collapse:collapse;font-size:.85rem">
        <tr style="border-bottom:1px solid var(--border)"><th style="padding:6px;text-align:right">المفتاح</th><th style="padding:6px;text-align:right">الوظيفة</th></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px"><code>?</code></td><td style="padding:6px">عرض اختصارات لوحة المفاتيح</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px"><code>Esc</code></td><td style="padding:6px">إغلاق النافذة / العودة</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px"><code>1-4</code></td><td style="padding:6px">اختيار الخيار في العرض</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px"><code>Space</code></td><td style="padding:6px">بدء/إيقاف المؤقت</td></tr>
        <tr style="border-bottom:1px solid var(--border)"><td style="padding:6px"><code>→</code></td><td style="padding:6px">السؤال التالي</td></tr>
        <tr><td style="padding:6px"><code>←</code></td><td style="padding:6px">السؤال السابق</td></tr>
      </table>
    `},
    {title:'💾 النسخ الاحتياطي والاستيراد',content:`
      <ul style="padding-right:20px;line-height:2.2">
        <li><b>تصدير</b>: حفظ البيانات كملف JSON (تبويب استيراد)</li>
        <li><b>استيراد</b>: تحميل بيانات من ملف JSON</li>
        <li><b>تصدير مشفّر</b>: حماية البيانات بكلمة مرور عند التصدير</li>
        <li><b>نسخ احتياطي تلقائي</b>: يُفعّل من الإعدادات مع فاصل زمني قابل للتخصيص</li>
        <li><b>ضغط البيانات</b>: ضغط تلقائي لتوفير المساحة</li>
        <li><b>استيراد مجمّع</b>: أضف عدة أسئلة دفعة واحدة من محرر الأسئلة</li>
      </ul>
    `},
    {title:'📱 الجوال والوصولية',content:`
      <ul style="padding-right:20px;line-height:2.2">
        <li>المنصة متجاوبة مع جميع أحجام الشاشات</li>
        <li>تنقل بالسحب للأسئلة على الجوال</li>
        <li>أهداف لمس كبيرة (44px كحد أدنى)</li>
        <li>نوافذ منزلقة من الأسفل على الجوال</li>
        <li>دعم عمى الألوان (3 أوضاع)</li>
        <li>تنقل بلوحة المفاتيح الكامل</li>
        <li>رابط تخطي التنقل للقارئات</li>
      </ul>
    `},
    {title:'🔔 وضع البازر',content:`
      <p>وضع المُسرِّع يتيح لعدة فرق التسابق للضغط أولاً:</p>
      <ul style="padding-right:20px;line-height:2.2">
        <li>اضغط زر البازر 🔔 من شريط العرض أو شاشة الأقسام</li>
        <li>كل فريق يضغط زره (أو على جهاز آخر عبر تبويب آخر)</li>
        <li>أول فريق يضغط يفوز بالفرصة</li>
        <li>المزامنة بين التبويبات عبر BroadcastChannel</li>
        <li>اضغط "جولة جديدة" لإعادة التعيين</li>
      </ul>
    `},
    {title:'🆕 ما الجديد في v12',content:`
      <ul style="padding-right:20px;line-height:2.2">
        <li>📁 <b>الأقسام الحاوية</b>: تنظيم الأقسام في مجلدات ومجموعات</li>
        <li>🔗 <b>الوضع التتابعي</b>: عرض المراحل بالتتالي مع انتقال تلقائي</li>
        <li>🔢 <b>ترقيم المراحل</b>: تحديد ترتيب وعنوان كل مرحلة</li>
        <li>📊 <b>رسم بياني محسّن</b>: رسم حلقي احترافي في لوحة التحكم</li>
        <li>⚡ <b>جولة الحسم</b>: أسئلة خاصة لكسر التعادل</li>
        <li>🔔 <b>أيقونة البازر</b> في شاشة الأقسام</li>
        <li>🧙 <b>معالج البدء</b>: يساعدك على الإعداد عند أول تشغيل</li>
        <li>🆘 <b>أطواق النجاة</b>: 50/50 ووقت إضافي وتمرير</li>
        <li>🔐 <b>تصدير مشفّر</b>: حماية البيانات بكلمة مرور</li>
        <li>🎬 <b>أسئلة الفيديو</b>: دعم مقاطع الفيديو في الأسئلة</li>
        <li>🛡️ <b>تحسينات الاستقرار</b>: معالجة أخطاء محسّنة وإدارة مؤقتات أفضل</li>
      </ul>
    `}
  ];
  const html=sections.map(s=>`
    <div style="margin-bottom:16px">
      <div style="font-size:1rem;font-weight:800;color:var(--accent1);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--border)">${s.title}</div>
      <div style="font-size:.88rem;line-height:1.8;color:var(--text-secondary)">${s.content}</div>
    </div>
  `).join('');
  openGenericModal('📖 دليل المستخدم — منصة المسابقات التفاعلية v12',html);
}

/* ══ Focus Trap for Modals ══ */
function focusTrap(modalEl){
  if(!modalEl)return;
  var focusable=modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if(!focusable.length)return;
  var first=focusable[0],last=focusable[focusable.length-1];
  function _trapHandler(e){
    if(e.key!=='Tab')return;
    if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus();}}
    else{if(document.activeElement===last){e.preventDefault();first.focus();}}
  }
  modalEl.addEventListener('keydown',_trapHandler);
  // Store handler for cleanup
  modalEl._trapHandler=_trapHandler;
  // Focus first element
  try{first.focus();}catch(e){}
}
function removeFocusTrap(modalEl){
  if(!modalEl||!modalEl._trapHandler)return;
  modalEl.removeEventListener('keydown',modalEl._trapHandler);
  delete modalEl._trapHandler;
}

function openGenericModal(title,content){
  let m=document.getElementById('modal-generic');
  if(!m){
    m=document.createElement('div');m.id='modal-generic';m.className='modal-overlay hidden';
    m.innerHTML='<div class="modal" style="max-width:560px"><div class="modal-header"><div class="modal-title" id="generic-modal-title"></div><button class="modal-close" onclick="closeModal(\'modal-generic\')">✕</button></div><div id="generic-modal-body" style="max-height:60vh;overflow-y:auto"></div></div>';
    document.body.appendChild(m);
  }
  document.getElementById('generic-modal-title').textContent=title;
  document.getElementById('generic-modal-body').innerHTML=content;
  openModal('modal-generic');
}
