/**
 * ── 45-solo-enhancer.js ──
 * ملف تحسينات وتطوير الوضع الفردي (الخرائط والمراحل)
 * 
 * الميزات المضافة:
 * 1. نظام مستويات اللاعب ونقاط الخبرة اللامتناهي (XP & Level Mastery System) مع ألقاب معربة مميزة.
 * 2. وسيلة المساعدة الثالثة المبتكرة: "حذف خيارين" (50:50 Lifeline) للتحقق وحل العقبات التنافسية.
 * 3. مفتاح الأنماط المتقدم للعب الفردي:
 *    - نمط سباق تتابع الوقت (Time Attack) بآلية شحن الوقت Rollover مذهلة.
 *    - نمط التدريب الهادئ (Zen/Practice) من غير ضغط مؤقت ومع تمكين تلميحات الأسئلة الذكية (💡 Show Hint).
 * 4. تأثيرات بصرية صغرى ووهج ناري للـ Streak لتعزيز المنافسة والتشويق.
 */

(function() {
  console.log('[Solo Enhancer] Initializing Solo Mode improvements...');

  // ── 1. إعداد وتكوين المتغيرات الأساسية ──
  window._soloFiftyFiftyCount = 1;

  // تعريف الرتب المعقدة والنطاقات اللازمة لخبرة اللاعب
  const XP_RANGES = [
    { level: 1, min: 0, title: "مبتدئ المعرفة" },
    { level: 2, min: 500, title: "مستكشف مبتدئ" },
    { level: 3, min: 1200, title: "باحث ذكي" },
    { level: 4, min: 2200, title: "مفكر مبهر" },
    { level: 5, min: 3500, title: "نابغة الأقسام" },
    { level: 6, min: 5000, title: "عبقري متقد" },
    { level: 7, min: 7000, title: "حكيم ومحنك" },
    { level: 8, min: 9500, title: "عالم راسخ" },
    { level: 9, min: 12500, title: "فيلسوف التحديات" },
    { level: 10, min: 16000, title: "أسطورة المعرفة" }
  ];

  // دالة تحصيل مستوى الخبرة
  window.getLevelInfo = function(xp) {
    let matched = XP_RANGES[0];
    for (let i = 0; i < XP_RANGES.length; i++) {
      if (xp >= XP_RANGES[i].min) {
        matched = XP_RANGES[i];
      } else {
        break;
      }
    }
    
    let currentLevelMin = matched.min;
    let nextLevelIndex = XP_RANGES.indexOf(matched) + 1;
    let nextLevelMin = nextLevelIndex < XP_RANGES.length ? XP_RANGES[nextLevelIndex].min : matched.min + 5000;
    
    let range = nextLevelMin - currentLevelMin;
    let gap = xp - currentLevelMin;
    let pct = Math.min(100, Math.floor((gap / range) * 100));
    
    return {
      level: matched.level,
      title: matched.title,
      pct: pct,
      currentLevelMin: currentLevelMin,
      nextLevelMin: nextLevelMin
    };
  };

  // ── 2. حاقن المؤثرات البصرية وتصميم الستريك ──
  const style = document.createElement('style');
  style.innerHTML = `
    /* وهج ناري فائق الجمال للستريك المستمر */
    @keyframes fire-pulse {
      0% { transform: scale(1); filter: drop-shadow(0 0 2px #ff9100) brightness(1); }
      50% { transform: scale(1.12); filter: drop-shadow(0 0 8px #ff4500) brightness(1.2); }
      100% { transform: scale(1); filter: drop-shadow(0 0 2px #ff9100) brightness(1); }
    }
    .solo-streak-active {
      animation: fire-pulse 1s infinite ease-in-out !important;
      border: 1px solid #ff9100 !important;
      background: rgba(255,145,0,0.18) !important;
      box-shadow: 0 0 10px rgba(255,145,0,0.2) !important;
    }
    
    /* أنيميشن نافذة صعود تروفي المستوى */
    @keyframes modal-bounce-in {
      0% { transform: scale(0.7); opacity: 0; }
      70% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }
    .solo-level-up-container {
      animation: modal-bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    }

    /* أسلوب توهج أزرار الدعم الكلاسيكية */
    .solo-powerup-btn:hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
      box-shadow: 0 0 8px currentColor;
    }
    .solo-powerup-btn:active {
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);


  // ── 3. نظام وميكانيزم نقاط الخبرة (XP System) ──

  window.addSoloXP = function(amount, showToast) {
    if (typeof state === 'undefined' || !state.soloProgress) return;
    
    if (typeof state.soloProgress.xp === 'undefined') state.soloProgress.xp = 0;
    if (typeof state.soloProgress.level === 'undefined') state.soloProgress.level = 1;
    
    const oldXp = state.soloProgress.xp;
    const newXp = oldXp + amount;
    state.soloProgress.xp = newXp;
    
    const oldLvlInfo = getLevelInfo(oldXp);
    const newLvlInfo = getLevelInfo(newXp);
    
    if (newLvlInfo.level > oldLvlInfo.level) {
      triggerLevelUpCelebration(oldLvlInfo.level, newLvlInfo.level, newLvlInfo.title);
    } else if (showToast) {
      if (typeof toast === 'function') {
        toast(`✨ مهارة! كسبت +${amount} نقطة خبرة (XP)`, 'success');
      }
    }
    
    try {
      if (typeof _saveSoloProgress === 'function') {
        _saveSoloProgress();
      }
    } catch(e) {}
  };

  // نافذة تهنئة بصعود المستوى الكفؤ
  function triggerLevelUpCelebration(oldLvl, newLvl, title) {
    state.soloProgress.level = newLvl;
    
    try {
      if (typeof playSound === 'function' && !_soloSettings.muted) {
        playSound('correct');
      }
    } catch(e) {}
    
    if (typeof soloConfetti === 'function') {
      try { soloConfetti(); } catch(e){}
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'solo-level-up-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(10,14,26,0.92);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;text-align:center;font-family:Cairo,sans-serif;color:#fff;';
    
    overlay.innerHTML = `
      <div class="solo-level-up-container" style="background:linear-gradient(135deg, rgba(0,232,208,0.12), rgba(162,89,255,0.12)); border:2px solid var(--accent1,#00e8d0); border-radius:24px; padding:32px; max-width:400px; width:100%; box-shadow: 0 0 35px rgba(0,232,208,0.25);">
        <div style="font-size:3.8rem; margin-bottom:12px;">🏆</div>
        <div style="font-size:1.35rem; font-weight:900; color:var(--accent1,#00e8d0); margin-bottom:8px;">صعود مستوى جديد!</div>
        <div style="font-size:1rem; color:rgba(255,255,255,0.7); margin-bottom:18px;">تم صقل رتبتك ومهاراتك الفردية بنجاح</div>
        
        <div style="display:flex; justify-content:center; align-items:center; gap:20px; margin:20px 0;">
          <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); width:60px; height:60px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.2rem; font-weight:800; color:rgba(255,255,255,0.4);">${oldLvl}</div>
          <div style="font-size:1.5rem; color:var(--accent2,#e040fb);">➡️</div>
          <div style="background:var(--accent1,#00e8d0); border:1px solid var(--accent1,#00e8d0); width:70px; height:70px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.8rem; font-weight:900; color:#0a0e1a; box-shadow:0 0 15px var(--accent1,#00e8d0);">${newLvl}</div>
        </div>
        
        <div style="font-size:1.1rem; font-weight:700; color:#fff; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); padding:8px 16px; border-radius:12px; margin-bottom:24px; display:inline-block;">لقبك المعرفي: <span style="color:#f5c842; font-weight:800;">${title}</span></div>
        
        <button class="solo-btn solo-btn-primary" style="width:100%; font-size:1rem; padding:12px 24px; border-radius:12px; cursor:pointer;" onclick="this.closest('.solo-level-up-overlay').remove()">متابعة التحديات 🚀</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // ── 4. رسم شريط الخبرة في ترويسة الخريطة والأسئلة ──

  window.renderXPWidgetOnMap = function() {
    const mapHeader = document.querySelector('.solo-map-header');
    if (!mapHeader) return;
    
    let widget = document.getElementById('solo-map-xp-widget');
    if (!widget) {
      widget = document.createElement('div');
      widget.id = 'solo-map-xp-widget';
      widget.style.cssText = 'margin: 10px 16px 0; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 12px; font-family: Cairo, sans-serif;';
      
      // إدراجها بالترتيب المناسب
      mapHeader.appendChild(widget);
    }
    
    const xp = (state && state.soloProgress && state.soloProgress.xp) || 0;
    const info = getLevelInfo(xp);
    
    widget.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; font-size: 0.76rem;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="background:var(--accent1,#00e8d0); color:#0a0e1a; font-weight:900; padding:1px 6px; border-radius:6px; font-size:0.68rem;">مستوى ${info.level}</span>
          <span style="font-weight:700; color:#fff">${info.title}</span>
        </div>
        <span style="color:var(--text-muted); font-size:0.7rem;">${xp} / ${info.nextLevelMin} XP</span>
      </div>
      <div style="height:5px; background:rgba(255,255,255,0.05); border-radius:2.5px; overflow:hidden;">
        <div style="height:100%; width:${info.pct}%; background:linear-gradient(90deg, var(--accent1,#00e8d0), var(--accent2,#e040fb)); border-radius:2.5px; transition: width 0.4s ease;"></div>
      </div>
    `;
  };

  window.renderXPWidgetOnQuestion = function() {
    const levelEl = document.getElementById('solo-q-level');
    if (!levelEl) return;
    
    let qBadge = document.getElementById('solo-q-xp-badge');
    if (!qBadge) {
      qBadge = document.createElement('div');
      qBadge.id = 'solo-q-xp-badge';
      qBadge.className = 'solo-q-difficulty';
      qBadge.style.cssText = 'background: linear-gradient(135deg, #00e8d0, #00b4d8); color: #0a0e1a; font-weight: 800; border: none; padding: 2px 8px; border-radius: 8px; font-size: 0.72rem; margin-right: 6px; display: inline-flex; align-items:center; cursor:pointer;';
      
      levelEl.parentNode.insertBefore(qBadge, levelEl.nextSibling);
    }
    
    const xp = (state && state.soloProgress && state.soloProgress.xp) || 0;
    const info = getLevelInfo(xp);
    qBadge.textContent = `مستوى ${info.level} ⭐`;
    qBadge.title = `لقبك الدائم: ${info.title}`;
  };


  // ── 5. وسيلة المساعدة الثالثة: حذف إجابتين (50:50 Lifeline) ──

  window.injectFiftyFiftyButton = function() {
    const bar = document.getElementById('solo-lifelines-bar');
    if (!bar) return;
    
    let btn = document.getElementById('solo-powerup-fifty');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'solo-powerup-fifty';
      btn.className = 'solo-powerup-btn';
      btn.title = "حذف إجابتين (50:50) - مرة واحدة لكل مرحلة";
      btn.style.cssText = 'display:flex; align-items:center; gap:6px; background:rgba(0,232,208,0.15); border:1px solid rgba(0,232,208,0.3); color:#00e8d0; padding:6px 16px; border-radius:12px; font-weight:800; cursor:pointer; transition:all 0.2s ease; justify-content:center; border-style:solid;';
      btn.onclick = function() { useSoloFiftyFifty(); };
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2rem;height:1.2rem"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="15"></line><line x1="15" y1="9" x2="9" y2="15"></line></svg>
        <span id="solo-fifty-count" style="background:#0a0e1a; padding:2px 8px; border-radius:8px; font-size:0.85rem; margin-right:4px;">1</span>
      `;
      bar.appendChild(btn);
    }
    
    // محاذاة العرض
    const enabled = typeof state !== 'undefined' && state.settings && state.settings.soloEnableFreeze !== false; 
    btn.style.display = enabled ? 'flex' : 'none';
  };

  window.useSoloFiftyFifty = function() {
    if (typeof _soloAnswered !== 'undefined' && _soloAnswered) return;
    if (window._soloFiftyFiftyCount <= 0) return;
    
    const cat = state.categories.find(c => c.id === _soloCurrentCat);
    if (!cat) return;
    const q = cat.questions[_soloCurrentQIdx];
    if (!q) return;
    
    if (q.type === 'tf') {
      if (typeof toast === 'function') {
        toast('💡 هذا السؤال صح/خطأ، لا توجد خيارات كافية للحذف!', 'info');
      }
      return;
    }
    
    const options = document.querySelectorAll('.solo-q-option');
    if (options.length <= 2) {
      if (typeof toast === 'function') {
        toast('💡 تتوفر إجابتين فقط بالفعل!', 'info');
      }
      return;
    }
    
    // حصر الإجابات الخاطئة
    const wrongButtons = [];
    options.forEach(btn => {
      const idx = Number(btn.dataset.idx);
      if (idx !== Number(q.correct)) {
        wrongButtons.push(btn);
      }
    });
    
    if (wrongButtons.length < 2) return;
    
    // بعثرة عشوائية واختيار اثنتين لحذفهما
    for (let i = wrongButtons.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [wrongButtons[i], wrongButtons[j]] = [wrongButtons[j], wrongButtons[i]];
    }
    
    const toDisable = wrongButtons.slice(0, 2);
    toDisable.forEach(btn => {
      btn.style.opacity = '0.15';
      btn.style.pointerEvents = 'none';
      btn.disabled = true;
    });
    
    window._soloFiftyFiftyCount = 0;
    
    const span = document.getElementById('solo-fifty-count');
    if (span) span.textContent = '0';
    
    const btn = document.getElementById('solo-powerup-fifty');
    if (btn) {
      btn.style.opacity = '0.3';
      btn.disabled = true;
      btn.classList.add('powerup-used');
    }
    
    addSoloXP(15, false);
    
    if (typeof playSound === 'function' && !_soloSettings.muted) {
      try { playSound('wrong'); } catch(e){}
    }
    
    if (typeof toast === 'function') {
      toast('🪄 تم حذف إجابتين غير صحيحتين تماماً!', 'success');
    }
  };


  // ── 6. حقن إعدادات نمط اللعب الفردي في القائمة ──

  window.injectGameModeSetting = function() {
    const box = document.querySelector('#solo-settings-panel .solo-settings-box');
    if (!box) return;
    
    if (document.getElementById('solo-settings-game-mode-row')) return;
    
    const row = document.createElement('div');
    row.id = 'solo-settings-game-mode-row';
    row.className = 'solo-settings-row';
    row.style.cssText = 'border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; margin-top: 10px;';
    
    row.innerHTML = `
      <span class="solo-settings-label">نمط الجائزة الفردية</span>
      <select class="solo-settings-select" id="solo-settings-game-mode" onchange="setSoloGameMode(this.value)" style="background:var(--bg-deep,#0a0e1a); color:#fff; border:1px solid var(--border); border-radius:6px; padding:4px 8px; font-family:Cairo,sans-serif; font-size:0.8rem; outline:none; cursor:pointer;">
        <option value="classic" selected>كلاسيكي (تحدي افتراضي)</option>
        <option value="time-attack">سباق الوقت (+Rollover شحن متبقي)</option>
        <option value="zen">التدريب الهادئ (تلميحات وبدون ضغط)</option>
      </select>
    `;
    
    const fontRow = Array.from(box.querySelectorAll('.solo-settings-row')).find(r => r.style.flexDirection === 'column' || r.querySelector('input[type="range"]'));
    if (fontRow) {
      box.insertBefore(row, fontRow);
    } else {
      box.appendChild(row);
    }
  };

  window.setSoloGameMode = function(val) {
    if (state && state.soloProgress) {
      state.soloProgress.mode = val;
      _saveSoloProgress();
      if (typeof toast === 'function') {
        const modeNames = {
          'classic': 'الكلاسيكي (المؤقت الأساسي)',
          'time-attack': 'سباق تتابع الوقت (+40% شحن متبقي)',
          'zen': 'التدريب الهادئ (دون مؤقت مع زر التلميح 💡)'
        };
        toast(`🎮 تم تغيير نمط اللعب إلى: ${modeNames[val] || val}`, 'success');
      }
    }
  };


  // ── 7. زر تلميحات الـ Zen الهادئ ──

  window.injectZenHintButton = function() {
    const bar = document.getElementById('solo-lifelines-bar');
    if (!bar) return;
    
    let hintBtn = document.getElementById('solo-powerup-hint');
    if (!hintBtn) {
      hintBtn = document.createElement('button');
      hintBtn.id = 'solo-powerup-hint';
      hintBtn.className = 'solo-powerup-btn';
      hintBtn.title = "عرض تلميح مساعد فريد (حصري للنمط الهادئ)";
      hintBtn.style.cssText = 'display:flex; align-items:center; gap:6px; background:rgba(242,197,63,0.15); border:1px solid rgba(242,197,63,0.3); color:#f5c842; padding:6px 16px; border-radius:12px; font-weight:800; cursor:pointer; transition:all 0.2s ease; justify-content:center; border-style:solid;';
      hintBtn.onclick = function() { showZenQuestionHint(); };
      hintBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:1.2rem;height:1.2rem"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        <span>تلميح 💡</span>
      `;
      bar.appendChild(hintBtn);
    }
    hintBtn.style.display = 'flex';
  };

  window.hideZenHintButton = function() {
    const hintBtn = document.getElementById('solo-powerup-hint');
    if (hintBtn) hintBtn.style.display = 'none';
  };

  window.showZenQuestionHint = function() {
    const cat = state.categories.find(c => c.id === _soloCurrentCat);
    if (!cat) return;
    const q = cat.questions[_soloCurrentQIdx];
    if (!q) return;
    
    let hintText = q.explanation || '';
    if (!hintText) {
      const correctVal = q.correct;
      let correctText = '';
      if (q.type === 'tf') {
        correctText = q.correct === 0 ? 'صحيح' : 'خطأ';
      } else if (q.options && q.options[correctVal]) {
        correctText = q.options[correctVal];
      }
      
      if (correctText) {
        if (typeof correctText === 'string') {
          const words = correctText.trim().split(' ');
          if (words.length > 1) {
            hintText = `الإجابة تحتوي الكلمة مفتاحية: "${words[0]}" ؛ فكر بها جيداً!`;
          } else {
            hintText = `الإجابة الصحيحة تتكون من ${correctText.length} أحرف ؛ ركز وستجدها!`;
          }
        } else {
          hintText = `فكر في القيمة الرقمية المساوية لـ: ${correctText}`;
        }
      }
    }
    
    if (!hintText) {
      hintText = "لا يوجد تلميح مسجل لهذا السؤال، لكننا نثق بذكائك الشديد للحل!";
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'solo-hint-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.85);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Cairo,sans-serif;color:#fff;';
    overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
    
    overlay.innerHTML = `
      <div style="background:#141b2e; border:2px solid #f5c842; border-radius:18px; padding:24px; max-width:380px; width:100%; box-shadow:0 0 25px rgba(242,197,63,0.22); text-align:center;">
        <div style="font-size:2.8rem; margin-bottom:12px;">💡</div>
        <div style="font-size:1.12rem; font-weight:800; color:#f5c842; margin-bottom:12px;">تلميح الـ Zen المساعد</div>
        <div style="font-size:0.92rem; line-height:1.6; color:rgba(255,255,255,0.85); margin-bottom:20px; word-wrap:break-word;">
          ${hintText}
        </div>
        <button class="solo-btn" style="background:#f5c842; color:#0a0e1a; font-weight:800; font-size:0.85rem; width:100%; padding:10px; border-radius:8px; cursor:pointer;" onclick="this.closest('.solo-hint-overlay').remove()">فهمت، سأحلها الآن 👍</button>
      </div>
    `;
    document.body.appendChild(overlay);
  };


  // ── 8. إعادة الهيكلة وربط الـ Hooks التفاعلية ──

  // أ) ربط معزز شاشة الخريطة
  const origRenderSoloMap = window.renderSoloMap;
  window.renderSoloMap = function() {
    if (typeof origRenderSoloMap === 'function') {
      try { origRenderSoloMap.apply(this, arguments); } catch(e) { console.error(e); }
    }
    
    setTimeout(() => {
      try {
        renderXPWidgetOnMap();
        injectGameModeSetting();
        
        // استعادة الخيار المنشط 
        const select = document.getElementById('solo-settings-game-mode');
        if (select && state && state.soloProgress) {
          select.value = state.soloProgress.mode || 'classic';
        }
      } catch(e) {}
    }, 50);
  };

  // ب) ربط شاشة الأسئلة وتلميح النار للستريك
  const origRenderSoloQuestion = window.renderSoloQuestion;
  window.renderSoloQuestion = function(cat, q, qIdx) {
    if (typeof origRenderSoloQuestion === 'function') {
      try { origRenderSoloQuestion.apply(this, arguments); } catch(e) { console.error(e); }
    }
    
    setTimeout(() => {
      try {
        renderXPWidgetOnQuestion();
        
        // تلميع شكل مستمر النار للستريك (Streak Visual Glow/Fire)
        const streakEl = document.getElementById('solo-streak');
        if (streakEl) {
          const currentStreak = (state && state.soloProgress && state.soloProgress.streak) || 0;
          if (currentStreak >= 3) {
            streakEl.classList.add('solo-streak-active');
          } else {
            streakEl.classList.remove('solo-streak-active');
          }
        }
        
        // محاذاة كلاسيكي والـ Zen في العرض
        const mode = (state && state.soloProgress && state.soloProgress.mode) || 'classic';
        if (mode === 'zen') {
          injectZenHintButton();
        } else {
          hideZenHintButton();
        }
      } catch(e) {}
    }, 50);
  };

  // ج) نظام المؤقت المتقدم (دعم سباق الوقت وتدريب Zen)
  window.startSoloTimer = function(seconds) {
    clearSoloTimer();
    
    const mode = (state && state.soloProgress && state.soloProgress.mode) || 'classic';
    const timerNumEl = document.getElementById('solo-timer-number');
    const barEl = document.getElementById('solo-timer-fill');
    const timerBar = document.querySelector('.solo-timer-bar');
    
    if (mode === 'zen') {
      if (timerNumEl) timerNumEl.textContent = '🕊️ نمط هادئ';
      if (barEl) {
        barEl.style.width = '100%';
        barEl.style.background = '#4db6ac'; 
      }
      _soloTimerStart = Date.now();
      injectZenHintButton();
      return;
    }
    
    hideZenHintButton();
    
    // شحن الوقت المتبقي في حالة Time Attack
    let extraBonus = window._timeAttackExtraBonus || 0;
    window._timeAttackExtraBonus = 0; // استهلاك
    
    let finalSeconds = seconds + extraBonus;
    if (mode === 'time-attack' && extraBonus > 0) {
      if (typeof toast === 'function') {
        toast(`⏱️ شحن الوقت المتتابع: +${extraBonus} ثوانٍ مبهرة!`, 'info');
      }
    }
    
    let remaining = finalSeconds;
    
    if (timerNumEl) timerNumEl.textContent = remaining;
    if (barEl) {
      barEl.style.width = '100%';
      barEl.classList.remove('solo-timer-low');
    }
    if (timerNumEl) timerNumEl.classList.remove('solo-timer-number-critical');
    if (timerBar) timerBar.classList.remove('solo-timer-critical-flash');
    
    _soloTimerInterval = setInterval(() => {
      if (window._soloTimeFrozen) return;
      remaining--;
      
      // تخزين احتياطي لاحتساب rollover
      window._soloTimerRemainingSec = remaining;
      
      if (timerNumEl) timerNumEl.textContent = remaining;
      if (barEl) {
        const pct = (remaining / finalSeconds) * 100;
        barEl.style.width = pct + '%';
        if (pct < 40) barEl.classList.add('solo-timer-low');
         else barEl.classList.remove('solo-timer-low');
      }
      
      if (remaining <= Math.ceil(finalSeconds * 0.2) && remaining > 0) {
        if (timerBar) timerBar.classList.add('solo-timer-critical-flash');
        if (timerNumEl) timerNumEl.classList.add('solo-timer-number-critical');
        try { if (navigator.vibrate) navigator.vibrate(15); } catch(e) {}
        if (!_soloSettings.muted) {
          try {
            const ctx = getAudioCtx();
            if (ctx) {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine'; osc.frequency.value = 880;
              gain.gain.value = 0.08;
              osc.connect(gain); gain.connect(ctx.destination);
              osc.start(); osc.stop(ctx.currentTime + 0.06);
              osc.onended = function() { osc.disconnect(); gain.disconnect(); };
            }
          } catch(e) {}
        }
      } else {
        if (timerBar) timerBar.classList.remove('solo-timer-critical-flash');
        if (timerNumEl) timerNumEl.classList.remove('solo-timer-number-critical');
      }
      
      if (remaining <= 0) {
        clearSoloTimer();
        _soloTimedOut = true;
        _soloTransitioning = true;
        submitSoloAnswer(-1);
      }
    }, 1000);
    
    try { if (typeof TimerRegistry !== 'undefined' && TimerRegistry.register) { TimerRegistry.register('solo-timer', _soloTimerInterval); } } catch(e) {}
  };

  // د) ربط إرسال الإجابة واحتساب النقاط والـ Rollover
  const origSubmitSoloAnswer = window.submitSoloAnswer;
  window.submitSoloAnswer = function(answer) {
    const mode = (state && state.soloProgress && state.soloProgress.mode) || 'classic';
    let earnedXp = 0;
    
    const cat = state.categories.find(c => c.id === _soloCurrentCat);
    if (cat) {
      const q = cat.questions[_soloCurrentQIdx];
      if (q) {
        let isCorrect = false;
        if (q.type === 'tf') {
          isCorrect = answer === (q.correct === 0);
        } else {
          isCorrect = Number(answer) === Number(q.correct);
        }
        
        if (isCorrect) {
          earnedXp += 50; // خبرة أساسية
          
          // احتساب الشحن لـ Time Attack
          if (mode === 'time-attack') {
            const left = window._soloTimerRemainingSec || 0;
            if (left > 0) {
              // الاحتفاظ بـ 40% من الوقت المتبقي كشحن تراكمي بحد أقصى 15 ثانية
              window._timeAttackExtraBonus = Math.min(15, Math.ceil(left * 0.40));
            }
            earnedXp += 25; // بونص الوقت المتتابع
          }
          
          // بونص الستريك
          const streak = (state && state.soloProgress && state.soloProgress.streak) || 0;
          if (streak >= 3) {
            earnedXp += streak * 10;
          }
        }
      }
    }
    
    // تنفيذ الجرد الأساسي
    if (typeof origSubmitSoloAnswer === 'function') {
      try { origSubmitSoloAnswer.apply(this, arguments); } catch(e) { console.error(e); }
    }
    
    // إضافة نقاط الخبرة
    if (earnedXp > 0) {
      setTimeout(() => {
        addSoloXP(earnedXp, mode !== 'zen');
      }, 50);
    }
    
    // تجديد العرض
    setTimeout(() => {
      try {
        renderXPWidgetOnMap();
        renderXPWidgetOnQuestion();
      } catch(e) {}
    }, 120);
  };

  // هـ) ربط استعادة وسائل الدعم وإعادة تعيين اللعبة الفردية
  const origResetSoloPowerups = window.resetSoloPowerups;
  window.resetSoloPowerups = function() {
    window._soloFiftyFiftyCount = 1;
    if (typeof origResetSoloPowerups === 'function') {
      try { origResetSoloPowerups.apply(this, arguments); } catch(e) { console.error(e); }
    }
    
    const btn = document.getElementById('solo-powerup-fifty');
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.classList.remove('powerup-used');
    }
    const span = document.getElementById('solo-fifty-count');
    if (span) span.textContent = '1';
  };

  const origSyncSoloPowerupsUI = window.syncSoloPowerupsUI;
  window.syncSoloPowerupsUI = function() {
    if (typeof origSyncSoloPowerupsUI === 'function') {
      try { origSyncSoloPowerupsUI.apply(this, arguments); } catch(e) { console.error(e); }
    }
    try {
      injectFiftyFiftyButton();
    } catch(e) {}
  };

  // استباق تهيئة الـ XP لأول مرة
  setTimeout(() => {
    if (state && state.soloProgress) {
      if (typeof state.soloProgress.xp === 'undefined') state.soloProgress.xp = 0;
      if (typeof state.soloProgress.level === 'undefined') state.soloProgress.level = 1;
      if (typeof state.soloProgress.mode === 'undefined') state.soloProgress.mode = 'classic';
    }
  }, 1000);

  console.log('[Solo Enhancer] Loaded successfully.');
})();
