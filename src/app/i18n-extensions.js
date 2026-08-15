// ============================================================
// i18n-extensions.js — Additional language support (French, Urdu)
// Phase 4 (T-042) — Extends the existing I18n system
// ============================================================
// Adds French (fr) and Urdu (ur) to the existing Arabic (ar) and English (en).
// Only core UI strings are translated here; full coverage will be added
// incrementally. Missing keys fall back to English, then Arabic.
// ============================================================

(function() {
  'use strict';

  // Wait for I18n to be available
  function _init() {
    if (typeof I18n === 'undefined') {
      setTimeout(_init, 50);
      return;
    }

    // French translations
    var fr = {
      'app.title': 'Plateforme de Quiz Interactive',
      'app.shortTitle': 'Quiz',
      'login.heading': 'Panneau de Configuration',
      'login.sub': 'Gérer le quiz, les paramètres et les équipes',
      'login.password': 'Mot de passe',
      'login.enter': 'Entrer',
      'login.wrongPassword': 'Mot de passe incorrect',
      'admin.startPres': 'Démarrer',
      'admin.home': 'Accueil',
      'admin.categoriesCount': 'catégories',
      'admin.questionsCount': 'questions',
      'admin.soloQuestions': 'questions solo',
      'admin.title': 'Panneau d\'Administration',
      'admin.controlPanel': 'Panneau de Configuration',
      'categories.add': 'Ajouter une catégorie',
      'categories.edit': 'Modifier la catégorie',
      'categories.delete': 'Supprimer la catégorie',
      'categories.name': 'Nom de la catégorie',
      'categories.empty': 'Aucune catégorie',
      'questions.add': 'Ajouter une question',
      'questions.edit': 'Modifier la question',
      'questions.delete': 'Supprimer la question',
      'questions.text': 'Texte de la question',
      'questions.type': 'Type de question',
      'questions.difficulty': 'Difficulté',
      'questions.time': 'Temps (secondes)',
      'questions.options': 'Options',
      'questions.correct': 'Bonne réponse',
      'questions.explanation': 'Explication',
      'teams.add': 'Ajouter une équipe',
      'teams.edit': 'Modifier l\'équipe',
      'teams.delete': 'Supprimer l\'équipe',
      'teams.name': 'Nom de l\'équipe',
      'teams.color': 'Couleur',
      'teams.members': 'Membres',
      'toast.saved': 'Enregistré avec succès',
      'toast.deleted': 'Supprimé',
      'toast.error': 'Une erreur est survenue',
      'toast.success': 'Succès',
      'toast.warning': 'Attention',
      'toast.info': 'Information',
      'toast.exportSuccess': 'Exportation réussie',
      'toast.importSuccess': 'Importation réussie',
      'confirm.delete': 'Êtes-vous sûr de vouloir supprimer?',
      'confirm.deleteQuestion': 'Supprimer cette question?',
      'confirm.deleteCategory': 'Supprimer cette catégorie?',
      'confirm.deleteTeam': 'Supprimer cette équipe?',
      'confirm.reset': 'Réinitialiser?',
      'lbl.confirm': 'Confirmer',
      'lbl.cancel': 'Annuler',
      'lbl.save': 'Enregistrer',
      'lbl.delete': 'Supprimer',
      'lbl.edit': 'Modifier',
      'lbl.add': 'Ajouter',
      'lbl.close': 'Fermer',
      'lbl.search': 'Rechercher',
      'lbl.all': 'Tous',
      'lbl.none': 'Aucun',
      'lbl.yes': 'Oui',
      'lbl.no': 'Non',
      'qbadge.image': 'IMAGE',
      'qbadge.audio': 'AUDIO',
      'qbadge.video': 'VIDÉO',
      'qbadge.math': 'MATH',
      'qbadge.tf': 'V/F',
      'qbadge.fitb': 'COMPLÉTER',
      'qbadge.quran': 'CORAN',
      'qbadge.order': 'ORDRE',
      'qbadge.match': 'ASSOCIER',
      'diff.easy': 'Facile',
      'diff.medium': 'Moyen',
      'diff.hard': 'Difficile',
      'settings.title': 'Paramètres',
      'settings.general': 'Général',
      'settings.audio': 'Audio',
      'settings.theme': 'Thème',
      'settings.accessibility': 'Accessibilité',
      'settings.language': 'Langue',
      'settings.timer': 'Minuteur',
      'settings.scoring': 'Score',
      'settings.backup': 'Sauvegarde',
      'settings.export': 'Exporter',
      'settings.import': 'Importer',
      'pres.start': 'Démarrer la présentation',
      'pres.exit': 'Quitter la présentation',
      'pres.audience': 'Écran public',
      'pres.remote': 'Télécommande',
      'pres.fullscreen': 'Plein écran',
      'timer.remaining': 'Temps restant',
      'timer.expired': 'Temps écoulé',
      'score.current': 'Score actuel',
      'score.leader': 'En tête',
      'score.tie': 'Égalité',
      'solo.title': 'Mode Solo',
      'solo.level': 'Niveau',
      'solo.stars': 'Étoiles',
      'solo.next': 'Niveau suivant',
      'solo.retry': 'Réessayer',
      'solo.complete': 'Niveau terminé!',
      'solo.locked': 'Verrouillé',
      'aria.login': 'Connexion',
      'aria.loginForm': 'Formulaire de connexion',
      'aria.controlPanel': 'Panneau de configuration',
      'aria.startPresentation': 'Démarrer la présentation',
      'aria.questionText': 'Texte de la question',
      'aria.scoreDisplay': 'Affichage du score',
      'aria.timerDisplay': 'Affichage du minuteur',
      'title.dragToReorder': 'Glisser pour réorganiser',
      'title.moveUp': 'Monter',
      'title.moveDown': 'Descendre',
      'cert.imageLoaded': 'Image chargée ✅',
      'cert.noImage': 'Aucune image',
    };

    // Urdu translations
    var ur = {
      'app.title': 'انٹرایکٹو کوئز پلیٹ فارم',
      'app.shortTitle': 'کوئز',
      'login.heading': 'کنٹرول پینل',
      'login.sub': 'کوئز، ترتیبات اور ٹیموں کا انتظام',
      'login.password': 'پاس ورڈ',
      'login.enter': 'داخل ہوں',
      'login.wrongPassword': 'غلط پاس ورڈ',
      'admin.startPres': 'شروع کریں',
      'admin.home': 'گھر',
      'admin.categoriesCount': 'اقسام',
      'admin.questionsCount': 'سوالات',
      'admin.soloQuestions': 'سولو سوالات',
      'admin.title': 'انتظامیہ پینل',
      'admin.controlPanel': 'کنٹرول پینل',
      'categories.add': 'کوئی کیٹگری شامل کریں',
      'categories.edit': 'کیٹگری میں ترمیم کریں',
      'categories.delete': 'کیٹگری حذف کریں',
      'categories.name': 'کیٹگری کا نام',
      'categories.empty': 'کوئی کیٹگری نہیں',
      'questions.add': 'سوال شامل کریں',
      'questions.edit': 'سوال میں ترمیم',
      'questions.delete': 'سوال حذف کریں',
      'questions.text': 'سوال کا متن',
      'questions.type': 'سوال کی قسم',
      'questions.difficulty': 'مشکل',
      'questions.time': 'وقت (سیکنڈ)',
      'questions.options': 'اختیارات',
      'questions.correct': 'درست جواب',
      'questions.explanation': 'وضاحت',
      'teams.add': 'ٹیم شامل کریں',
      'teams.edit': 'ٹیم میں ترمیم',
      'teams.delete': 'ٹیم حذف کریں',
      'teams.name': 'ٹیم کا نام',
      'teams.color': 'رنگ',
      'teams.members': 'ارکان',
      'toast.saved': 'کامیابی سے محفوظ ہو گیا',
      'toast.deleted': 'حذف ہو گیا',
      'toast.error': 'ایک خرابی پیش آئی',
      'toast.success': 'کامیاب',
      'toast.warning': 'دھیان',
      'toast.info': 'معلومات',
      'toast.exportSuccess': 'برآمد کامیاب',
      'toast.importSuccess': 'درآمد کامیاب',
      'confirm.delete': 'کیا آپ واقعی حذف کرنا چاہتے ہیں؟',
      'confirm.deleteQuestion': 'اس سوال کو حذف کریں؟',
      'confirm.deleteCategory': 'اس کیٹگری کو حذف کریں؟',
      'confirm.deleteTeam': 'اس ٹیم کو حذف کریں؟',
      'confirm.reset': 'ری سیٹ کریں؟',
      'lbl.confirm': 'تصدیق',
      'lbl.cancel': 'منسوخ',
      'lbl.save': 'محفوظ کریں',
      'lbl.delete': 'حذف کریں',
      'lbl.edit': 'ترمیم',
      'lbl.add': 'شامل کریں',
      'lbl.close': 'بند کریں',
      'lbl.search': 'تلاش',
      'lbl.all': 'تمام',
      'lbl.none': 'کوئی نہیں',
      'lbl.yes': 'ہاں',
      'lbl.no': 'نہیں',
      'qbadge.image': 'تصویر',
      'qbadge.audio': 'آڈیو',
      'qbadge.video': 'ویڈیو',
      'qbadge.math': 'ریاضی',
      'qbadge.tf': 'ص/غ',
      'qbadge.fitb': 'پریں',
      'qbadge.quran': 'قرآن',
      'qbadge.order': 'ترتیب',
      'qbadge.match': 'ملائیں',
      'diff.easy': 'آسان',
      'diff.medium': 'درمیانہ',
      'diff.hard': 'مشکل',
      'settings.title': 'ترتیبات',
      'settings.general': 'عام',
      'settings.audio': 'آڈیو',
      'settings.theme': 'تھیم',
      'settings.accessibility': 'رسایی',
      'settings.language': 'زبان',
      'settings.timer': 'ٹائمر',
      'settings.scoring': 'اسکور',
      'settings.backup': 'بیک اپ',
      'settings.export': 'برآمد کریں',
      'settings.import': 'درآمد کریں',
      'pres.start': 'پیشکش شروع کریں',
      'pres.exit': 'پیشکش سے باہر',
      'pres.audience': 'ناظرین اسکرین',
      'pres.remote': 'ریموٹ کنٹرول',
      'pres.fullscreen': 'مکمل اسکرین',
      'timer.remaining': 'بقیہ وقت',
      'timer.expired': 'وقت ختم',
      'score.current': 'موجودہ اسکور',
      'score.leader': 'آگے',
      'score.tie': 'برابر',
      'solo.title': 'سولو موڈ',
      'solo.level': 'لیول',
      'solo.stars': 'ستارے',
      'solo.next': 'اگلا لیول',
      'solo.retry': 'دوبارہ کوشش',
      'solo.complete': 'لیول مکمل!',
      'solo.locked': 'بند',
      'aria.login': 'لاگ ان',
      'aria.loginForm': 'لاگ ان فارم',
      'aria.controlPanel': 'کنٹرول پینل',
      'aria.startPresentation': 'پیشکش شروع کریں',
      'aria.questionText': 'سوال کا متن',
      'aria.scoreDisplay': 'اسکور ڈسپلے',
      'aria.timerDisplay': 'ٹائمر ڈسپلے',
      'title.dragToReorder': 'دوبارہ ترتیب کے لیے کھینچیں',
      'title.moveUp': 'اوپر',
      'title.moveDown': 'نیچے',
      'cert.imageLoaded': 'تصویر لوڈ ہو گئی ✅',
      'cert.noImage': 'کوئی تصویر نہیں',
    };

    // Merge translations into I18n dictionaries
    if (!I18n._dicts) I18n._dicts = {};
    I18n._dicts.fr = fr;
    I18n._dicts.ur = ur;

    // Add to the list of available languages (if the app uses such a list)
    if (typeof window.AVAILABLE_LANGUAGES !== 'undefined') {
      if (!window.AVAILABLE_LANGUAGES.find(l => l.code === 'fr')) {
        window.AVAILABLE_LANGUAGES.push({ code: 'fr', name: 'Français', dir: 'ltr', flag: '🇫🇷' });
      }
      if (!window.AVAILABLE_LANGUAGES.find(l => l.code === 'ur')) {
        window.AVAILABLE_LANGUAGES.push({ code: 'ur', name: 'اردو', dir: 'rtl', flag: '🇵🇰' });
      }
    }

    // Patch I18n.t to support the new languages with fallback
    if (!I18n._tPatched) {
      var _origT = I18n.t;
      I18n.t = function(key, fallback) {
        var lang = (state && state.settings && state.settings.lang) || 'ar';
        // Try current language
        if (I18n._dicts[lang] && I18n._dicts[lang][key]) {
          return I18n._dicts[lang][key];
        }
        // Fall back to English
        if (I18n._dicts.en && I18n._dicts.en[key]) {
          return I18n._dicts.en[key];
        }
        // Fall back to Arabic (original)
        if (I18n._dicts.ar && I18n._dicts.ar[key]) {
          return I18n._dicts.ar[key];
        }
        // Fall back to the provided fallback
        return fallback || key;
      };
      I18n._tPatched = true;
    }

    // Helper to set document direction based on language
    I18n.setLanguage = function(lang) {
      if (!state.settings) state.settings = {};
      state.settings.lang = lang;
      var dir = (lang === 'ar' || lang === 'ur') ? 'rtl' : 'ltr';
      document.documentElement.setAttribute('dir', dir);
      document.documentElement.setAttribute('lang', lang);
      try { saveState(); } catch (e) {}
      // Re-render UI
      if (typeof _applyI18n === 'function') _applyI18n();
      if (typeof renderAdmin === 'function') renderAdmin(true);
      console.info('[i18n] Language set to:', lang, '(dir:', dir + ')');
    };

    console.info('[i18n] French (fr) and Urdu (ur) translations registered');
  }

  _init();
})();
