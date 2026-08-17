// ════════════════════════════════════════════════════════
//  V16.0: Auto-fix i18n for hardcoded Arabic text
// ════════════════════════════════════════════════════════
// Many buttons/labels in body.html are hardcoded in Arabic
// without data-i18n attributes. This module provides a fallback
// that scans for known Arabic strings and replaces them with
// translated versions when language changes.
// ════════════════════════════════════════════════════════

window.I18nAutoFix = (function() {
  'use strict';

  // Map of Arabic text → i18n key
  // When language changes, we search for these Arabic strings
  // and replace them with the translated version
  var _arToKey = {
    // Common buttons
    'إلغاء': 'btn.cancel', 'حفظ': 'btn.save', 'حذف': 'btn.delete',
    'تعديل': 'btn.edit', 'إضافة': 'btn.add', 'تأكيد': 'btn.confirm',
    'إغلاق': 'btn.close', 'معاينة': 'btn.preview',
    'تشغيل': 'btn.play', 'إيقاف': 'btn.stop',
    'صحيح': 'btn.true', 'خطأ': 'btn.false',
    'تخطي': 'btn.skip',
    // Intro view
    'بدء العرض': 'intro.start', 'بدء مسابقة': 'intro.startQuiz',
    'إنشاء سؤال': 'intro.createQuestion', 'استيراد بنك': 'intro.importBank',
    'إضافة قسم': 'intro.addCategory', 'استيراد': 'intro.import',
    'تصدير': 'intro.export',
    // Solo mode
    'لوحة المتصدرين': 'solo.leaderboard', 'الإنجازات': 'solo.achievements',
    'مراجعة الأخطاء': 'solo.review', 'إعداد سريع': 'solo.quickSetup',
    'الرجوع للقائمة الرئيسية': 'solo.goHome', 'العودة إلى الصفحة الرئيسية': 'solo.goHome',
    'العودة للأعلى': 'btn.backToTop', 'الرئيسية': 'btn.home',
    'التحكم': 'btn.control', 'النتائج': 'btn.results',
    'الإحصاءات': 'btn.stats', 'مفصّل': 'btn.detailed',
    'حفظ النتيجة': 'solo.saveScore', 'الخريطة': 'solo.map',
    'إعادة': 'btn.retry', 'السابق': 'btn.previous',
    'التالي': 'btn.next',
    // Settings
    'كتم الأصوات': 'solo.mute', 'موسيقى الخلفية': 'solo.bgmusic',
    'تأثيرات مخفضة': 'solo.reducedEffects', 'حجم الخط': 'settings.fontSize',
    'ملء الشاشة': 'settings.fullscreen', 'تشغيل المؤقت': 'settings.startTimer',
    'إظهار مراجعة الأخطاء': 'solo.showReview', 'إظهار الإعداد السريع': 'solo.showQuickSetup',
    'إضافة بنك أسئلة': 'solo.addBank', 'تحديث مكتبة الأسئلة': 'solo.updateLib',
    'مسح الكل': 'notif.clearAll', 'لا توجد إشعارات': 'notif.empty',
    'الإشعارات': 'notif.title', 'اضغط للتفعيل': 'notif.enable',
    // Audio
    'نسخ': 'btn.copy', 'نسخ الآن': 'btn.copyNow', 'نسخ مختصرة': 'btn.copyShort',
    'تصدير JSON': 'export.json', 'استيراد JSON': 'import.json',
    'تصدير ZIP': 'export.zip', 'استيراد ZIP': 'import.zip',
    'تصدير مشفر': 'export.encrypted', 'استيراد مشفر': 'import.encrypted',
    'تصدير PDF': 'export.pdf', 'تصدير Excel': 'export.excel',
    'مراقب التخزين': 'settings.storageMonitor', 'مسح التقدم': 'settings.clearProgress',
    'سجل المسابقات السابقة': 'settings.sessionHistory',
    // Misc
    'جلب': 'btn.fetch', 'استبدال الكل': 'btn.replaceAll',
    'إضافة للنهاية': 'btn.append', 'دمج ذكي': 'btn.smartMerge',
    'إضافة شخص': 'credits.addPerson', 'تحميل مكتبة الأسئلة': 'btn.loadLibrary',
    'إعادة تعيين': 'btn.reset', 'إعادة تعيين الإعدادات': 'btn.resetSettings',
    'تطبيق الألوان': 'theme.applyColors', 'نسخ CSS': 'theme.copyCSS',
    'تحديث القائمة': 'btn.refreshList', 'حفظ اللوحة': 'btn.saveLayout',
    'استعادة': 'btn.restore', 'إضافة زوج': 'btn.addPair',
    'حذف الأخير': 'btn.removeLast', 'تحميل PNG': 'btn.downloadPNG',
    'مشاركة': 'btn.share', 'بطاقة مشاركة': 'btn.shareCard',
    'رجوع للسؤال': 'btn.backToQuestion', 'الإحصائيات المتقدمة': 'btn.advStats',
    'موسيقى': 'btn.music', 'احتفال': 'btn.celebrate',
    'شهادة الفائز': 'cert.winner', 'الأقسام': 'nav.categories',
    'مسابقة جديدة': 'btn.newQuiz', 'الإنهاء': 'btn.end',
    'البلاغ عن خطأ': 'btn.reportBug', 'حفظ النتيجة': 'solo.saveScore',
    'القوالب': 'btn.templates', 'قص وتطبيق': 'btn.cropApply',
    'عربي قرآني': 'quran.font', 'تنزيل': 'btn.download',
    'جاهز': 'loading.ready',
    // V16.0-fix: Additional mappings for intro view buttons
    'إنشاء سؤال': 'intro.createQuestion',
    'بدء مسابقة': 'intro.startQuiz',
    'استيراد بنك': 'intro.importBank',
    'إضافة قسم': 'intro.addCategory',
    'استيراد': 'intro.import',
    'تصدير': 'intro.export',
    'بدء العرض': 'intro.start',
    'قالب': 'btn.template',
    'تخطي والبدء مباشرة': 'btn.skipDirect',
    'معاينة': 'btn.preview',
    'إيقاف': 'btn.stop',
    'حذف': 'btn.delete',
    'القوالب': 'btn.templates',
    'إعادة تعيين': 'btn.reset',
    'إعادة تعيين الإعدادات': 'btn.resetSettings',
    'إضافة زوج': 'btn.addPair',
    'حذف الأخير': 'btn.removeLast',
    'تحديث القائمة': 'btn.refreshList',
    'حفظ اللوحة': 'btn.saveLayout',
    'استعادة': 'btn.restore',
    'تطبيق الألوان': 'theme.applyColors',
    'نسخ CSS': 'theme.copyCSS',
    'تحميل PNG': 'btn.downloadPNG',
    'مشاركة': 'btn.share',
    'بطاقة مشاركة': 'btn.shareCard',
    'رجوع للسؤال': 'btn.backToQuestion',
    'الإحصائيات المتقدمة': 'btn.advStats',
    'موسيقى': 'btn.music',
    'احتفال': 'btn.celebrate',
    'شهادة الفائز': 'cert.winner',
    'مسابقة جديدة': 'btn.newQuiz',
    'إنهاء': 'btn.end',
    'البلاغ عن خطأ': 'btn.reportBug',
    'قص وتطبيق': 'btn.cropApply',
    'عربي قرآني': 'quran.font',
    'تنزيل': 'btn.download',
    'الإنجازات': 'solo.achievements',
    'لوحة المتصدرين': 'solo.leaderboard',
    'مراجعة الأخطاء': 'solo.review',
    'إعداد سريع': 'solo.quickSetup',
    'الرجوع للقائمة الرئيسية': 'solo.goHome',
    'العودة إلى الصفحة الرئيسية': 'solo.goHome',
    'العودة للأعلى': 'btn.backToTop',
    'الرئيسية': 'btn.home',
    'التحكم': 'btn.control',
    'النتائج': 'btn.results',
    'الإحصاءات': 'btn.stats',
    'مفصّل': 'btn.detailed',
    'حفظ النتيجة': 'solo.saveScore',
    'الخريطة': 'solo.map',
    'إعادة': 'btn.retry',
    'السابق': 'btn.previous',
    'التالي': 'btn.next',
    'كتم الأصوات': 'solo.mute',
    'موسيقى الخلفية': 'solo.bgmusic',
    'تأثيرات مخفضة': 'solo.reducedEffects',
    'حجم الخط': 'settings.fontSize',
    'ملء الشاشة': 'settings.fullscreen',
    'تشغيل المؤقت': 'settings.startTimer',
    'إظهار مراجعة الأخطاء': 'solo.showReview',
    'إظهار الإعداد السريع': 'solo.showQuickSetup',
    'إضافة بنك أسئلة': 'solo.addBank',
    'تحديث مكتبة الأسئلة': 'solo.updateLib',
    'مسح الكل': 'notif.clearAll',
    'لا توجد إشعارات': 'notif.empty',
    'الإشعارات': 'notif.title',
    'اضغط للتفعيل': 'notif.enable',
    'نسخ': 'btn.copy',
    'نسخ الآن': 'btn.copyNow',
    'نسخ مختصرة': 'btn.copyShort',
    'تصدير JSON': 'export.json',
    'استيراد JSON': 'import.json',
    'تصدير ZIP': 'export.zip',
    'استيراد ZIP': 'import.zip',
    'تصدير مشفر': 'export.encrypted',
    'استيراد مشفر': 'import.encrypted',
    'تصدير PDF': 'export.pdf',
    'تصدير Excel': 'export.excel',
    'مراقب التخزين': 'settings.storageMonitor',
    'مسح التقدم': 'settings.clearProgress',
    'سجل المسابقات السابقة': 'settings.sessionHistory',
    'جلب': 'btn.fetch',
    'استبدال الكل': 'btn.replaceAll',
    'إضافة للنهاية': 'btn.append',
    'دمج ذكي': 'btn.smartMerge',
    'إضافة شخص': 'credits.addPerson',
    'تحميل مكتبة الأسئلة': 'btn.loadLibrary',
    'تحديث القائمة': 'btn.refreshList',
  };

  // English translations for the above keys
  var _en = {
    'btn.cancel': 'Cancel', 'btn.save': 'Save', 'btn.delete': 'Delete',
    'btn.edit': 'Edit', 'btn.add': 'Add', 'btn.confirm': 'Confirm',
    'btn.close': 'Close', 'btn.preview': 'Preview',
    'btn.play': 'Play', 'btn.stop': 'Stop',
    'btn.true': 'True', 'btn.false': 'False',
    'btn.skip': 'Skip',
    'intro.start': 'Start Presentation', 'intro.startQuiz': 'Start Quiz',
    'intro.createQuestion': 'Create Question', 'intro.importBank': 'Import Bank',
    'intro.addCategory': 'Add Category', 'intro.import': 'Import',
    'intro.export': 'Export',
    'solo.leaderboard': 'Leaderboard', 'solo.achievements': 'Achievements',
    'solo.review': 'Review', 'solo.quickSetup': 'Quick Setup',
    'solo.goHome': 'Go Home', 'btn.backToTop': 'Back to Top',
    'btn.home': 'Home', 'btn.control': 'Control', 'btn.results': 'Results',
    'btn.stats': 'Stats', 'btn.detailed': 'Detailed',
    'solo.saveScore': 'Save Score', 'solo.map': 'Map',
    'btn.retry': 'Retry', 'btn.previous': 'Previous', 'btn.next': 'Next',
    'solo.mute': 'Mute', 'solo.bgmusic': 'Background Music',
    'solo.reducedEffects': 'Reduced Effects', 'settings.fontSize': 'Font Size',
    'settings.fullscreen': 'Fullscreen', 'settings.startTimer': 'Start Timer',
    'solo.showReview': 'Show Review', 'solo.showQuickSetup': 'Show Quick Setup',
    'solo.addBank': 'Add Question Bank', 'solo.updateLib': 'Update Library',
    'notif.clearAll': 'Clear All', 'notif.empty': 'No notifications',
    'notif.title': 'Notifications', 'notif.enable': 'Click to enable',
    'btn.copy': 'Copy', 'btn.copyNow': 'Copy Now', 'btn.copyShort': 'Copy Short',
    'export.json': 'Export JSON', 'import.json': 'Import JSON',
    'export.zip': 'Export ZIP', 'import.zip': 'Import ZIP',
    'export.encrypted': 'Export Encrypted', 'import.encrypted': 'Import Encrypted',
    'export.pdf': 'Export PDF', 'export.excel': 'Export Excel',
    'settings.storageMonitor': 'Storage Monitor', 'settings.clearProgress': 'Clear Progress',
    'settings.sessionHistory': 'Session History',
    'btn.fetch': 'Fetch', 'btn.replaceAll': 'Replace All',
    'btn.append': 'Append', 'btn.smartMerge': 'Smart Merge',
    'credits.addPerson': 'Add Person', 'btn.loadLibrary': 'Load Library',
    'btn.reset': 'Reset', 'btn.resetSettings': 'Reset Settings',
    'theme.applyColors': 'Apply Colors', 'theme.copyCSS': 'Copy CSS',
    'btn.refreshList': 'Refresh List', 'btn.saveLayout': 'Save Layout',
    'btn.restore': 'Restore', 'btn.addPair': 'Add Pair',
    'btn.removeLast': 'Remove Last', 'btn.downloadPNG': 'Download PNG',
    'btn.share': 'Share', 'btn.shareCard': 'Share Card',
    'btn.backToQuestion': 'Back to Question', 'btn.advStats': 'Advanced Stats',
    'btn.music': 'Music', 'btn.celebrate': 'Celebrate!',
    'cert.winner': 'Winner Certificate', 'nav.categories': 'Categories',
    'btn.newQuiz': 'New Quiz', 'btn.end': 'End',
    'btn.reportBug': 'Report Bug', 'btn.templates': 'Templates',
    'btn.cropApply': 'Crop & Apply', 'quran.font': 'Quranic Arabic',
    'btn.download': 'Download', 'loading.ready': 'Ready!',
  };

  // French translations
  var _fr = {
    'btn.cancel': 'Annuler', 'btn.save': 'Enregistrer', 'btn.delete': 'Supprimer',
    'btn.edit': 'Modifier', 'btn.add': 'Ajouter', 'btn.confirm': 'Confirmer',
    'btn.close': 'Fermer', 'btn.preview': 'Aperçu',
    'btn.play': 'Jouer', 'btn.stop': 'Arrêter',
    'btn.true': 'Vrai', 'btn.false': 'Faux', 'btn.skip': 'Passer',
    'intro.start': 'Démarrer', 'intro.export': 'Exporter',
    'btn.home': 'Accueil', 'btn.retry': 'Réessayer', 'btn.next': 'Suivant',
    'btn.previous': 'Précédent', 'btn.close': 'Fermer',
    'notif.clearAll': 'Tout effacer', 'notif.empty': 'Aucune notification',
    'notif.title': 'Notifications',
  };

  // Urdu translations
  var _ur = {
    'btn.cancel': 'منسوخ', 'btn.save': 'محفوظ کریں', 'btn.delete': 'حذف کریں',
    'btn.edit': 'ترمیم', 'btn.add': 'شامل کریں', 'btn.confirm': 'تصدیق',
    'btn.close': 'بند کریں', 'btn.preview': 'پیش نظارہ',
    'btn.play': 'چلائیں', 'btn.stop': 'روکیں',
    'btn.true': 'صحیح', 'btn.false': 'غلط', 'btn.skip': 'چھوڑیں',
    'intro.start': 'شروع کریں', 'intro.export': 'برآمد',
    'btn.home': 'گھر', 'btn.retry': 'دوبارہ', 'btn.next': 'اگلا',
    'btn.previous': 'پچھلا', 'notif.clearAll': 'سب صاف کریں',
    'notif.empty': 'کوئی اطلاع نہیں', 'notif.title': 'اطلاعات',
  };

  var _dicts = { en: _en, fr: _fr, ur: _ur };

  /**
   * Scan all elements and replace hardcoded Arabic text with translations.
   * Called after I18n.apply() on language change.
   * @param {string} lang - Target language ('ar', 'en', 'fr', 'ur')
   */
  function fixAll(lang) {
    if (lang === 'ar') return; // No need to fix when switching back to Arabic

    var dict = _dicts[lang] || _en;
    var fixed = 0;

    // Scan buttons, spans, labels, divs with direct text (no children)
    var els = document.querySelectorAll('button, span, label, div, a');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      // Skip elements with data-i18n (already handled by apply())
      if (el.hasAttribute('data-i18n')) continue;

      // V16.0-fix: Handle elements with child elements too
      // (e.g., buttons with <span> children)
      // Get the full text content
      var text = (el.textContent || '').trim();
      if (!text || text.length > 60) continue; // Skip long text or empty

      // V16.0-fix: Strip emoji prefix before lookup
      // Emoji ranges: 1F300-1F9FF (symbols & pictographs), 2600-27BF (misc symbols),
      // 2B00-2BFF (misc arrows), plus common symbol chars
      var emojiRegex = /^([\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}✓✕▶◀↑↓↶↷↺↻⏭⏹➕➖│←→⟫⟪⬛⬜⏸⏹✓✕★☆◆◇○●□■△▲▽▼♥♦♣♠]+\s*)/u;
      var emojiMatch = text.match(emojiRegex);
      var emoji = emojiMatch ? emojiMatch[1] : '';
      var textWithoutEmoji = emoji ? text.substring(emoji.length).trim() : text;

      // Check if text (without emoji) is in our map
      var key = _arToKey[textWithoutEmoji] || _arToKey[text];
      if (!key) continue;

      // Get translation
      var translated = dict[key];
      if (!translated || translated === textWithoutEmoji) continue;

      // Replace text but preserve emoji
      // For elements with child elements, only replace text nodes
      if (el.children.length > 0) {
        // Find and replace text nodes only
        for (var j = 0; j < el.childNodes.length; j++) {
          var node = el.childNodes[j];
          if (node.nodeType === 3) { // Text node
            var nodeText = node.textContent.trim();
            var nodeEmojiMatch = nodeText.match(emojiRegex);
            var nodeEmoji = nodeEmojiMatch ? nodeEmojiMatch[1] : '';
            var nodeTextClean = nodeEmoji ? nodeText.substring(nodeEmoji.length).trim() : nodeText;
            var nodeKey = _arToKey[nodeTextClean] || _arToKey[nodeText];
            if (nodeKey && dict[nodeKey]) {
              node.textContent = nodeEmoji + dict[nodeKey];
              fixed++;
            }
          }
        }
      } else {
        el.textContent = emoji + translated;
        fixed++;
      }
    }

    if (fixed > 0) {
      console.info('[I18nAutoFix] Fixed ' + fixed + ' elements for language: ' + lang);
    }
  }

  // Hook into I18n.setLang
  var _origSetLang = null;
  function hookI18n() {
    if (typeof I18n === 'undefined') {
      setTimeout(hookI18n, 100);
      return;
    }
    if (I18n._autoFixHooked) return;

    // Hook setLang
    _origSetLang = I18n.setLang;
    if (typeof _origSetLang === 'function') {
      I18n.setLang = function(lang) {
        var result = _origSetLang.apply(I18n, arguments);
        // After apply(), run our fix
        setTimeout(function() { fixAll(lang); }, 50);
        return result;
      };
    }

    // Also hook setLanguage from i18n-extensions
    if (I18n.setLanguage) {
      var _origSetLang2 = I18n.setLanguage;
      I18n.setLanguage = function(lang) {
        var result = _origSetLang2.apply(I18n, arguments);
        setTimeout(function() { fixAll(lang); }, 50);
        return result;
      };
    }

    I18n._autoFixHooked = true;
    console.info('[I18nAutoFix] Hooked into I18n.setLang/setLanguage');
  }

  // Initialize
  hookI18n();

  return {
    fixAll: fixAll,
    hookI18n: hookI18n
  };
})();

console.info('[I18nAutoFix] V16.0 auto-fix module loaded');
