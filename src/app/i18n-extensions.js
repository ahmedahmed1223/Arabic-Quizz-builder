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

    // V16.0: Expanded French translations
    'admin.categories': 'Catégories',
    'admin.questions': 'Questions',
    'admin.teams': 'Équipes',
    'admin.settings': 'Paramètres',
    'admin.import': 'Importer',
    'admin.export': 'Exporter',
    'admin.analytics': 'Analytique',
    'admin.newCategory': 'Nouvelle catégorie',
    'admin.newQuestion': 'Nouvelle question',
    'admin.newTeam': 'Nouvelle équipe',
    'admin.editCategory': 'Modifier la catégorie',
    'admin.editQuestion': 'Modifier la question',
    'admin.editTeam': 'Modifier l\'équipe',
    'admin.deleteCategory': 'Supprimer la catégorie',
    'admin.deleteQuestion': 'Supprimer la question',
    'admin.deleteTeam': 'Supprimer l\'équipe',
    'admin.questionCount': 'Nombre de questions',
    'admin.teamCount': 'Nombre d\'équipes',
    'admin.totalScore': 'Score total',
    'admin.sessionHistory': 'Historique des sessions',
    'admin.clearData': 'Effacer les données',
    'admin.exportPDF': 'Exporter PDF',
    'admin.exportExcel': 'Exporter Excel',
    'admin.aiGenerate': 'Générer avec IA',
    'admin.multiplayer': 'Multijoueur',
    'admin.createRoom': 'Créer une salle',
    'admin.joinRoom': 'Rejoindre une salle',
    'admin.roomCode': 'Code de salle',
    'admin.startQuiz': 'Démarrer le quiz',
    'admin.endQuiz': 'Terminer le quiz',
    'admin.nextQuestion': 'Question suivante',
    'admin.prevQuestion': 'Question précédente',
    'admin.revealAnswer': 'Révéler la réponse',
    'admin.resetScores': 'Réinitialiser les scores',
    'admin.adjustScore': 'Ajuster le score',
    'admin.useLifeline': 'Utiliser un indice',
    'admin.fiftyFifty': '50/50',
    'admin.skip': 'Passer',
    'admin.extraTime': 'Temps supplémentaire',
    'admin.timeFreeze': 'Geler le temps',
    'admin.doubleChance': 'Double chance',
    'admin.buzzer': 'Buzzer',
    'admin.audience': 'Écran public',
    'admin.remote': 'Télécommande',
    'admin.fullscreen': 'Plein écran',
    'admin.certificates': 'Certificats',
    'admin.themes': 'Thèmes',
    'admin.languages': 'Langues',
    'admin.accessibility': 'Accessibilité',
    'admin.security': 'Sécurité',
    'admin.password': 'Mot de passe',
    'admin.changePassword': 'Changer le mot de passe',
    'admin.backup': 'Sauvegarde',
    'admin.restore': 'Restaurer',
    'admin.about': 'À propos',
    'admin.help': 'Aide',
    'question.text': 'Texte de la question',
    'question.type': 'Type',
    'question.difficulty': 'Difficulté',
    'question.time': 'Temps (secondes)',
    'question.options': 'Options',
    'question.correct': 'Bonne réponse',
    'question.explanation': 'Explication',
    'question.image': 'Image',
    'question.audio': 'Audio',
    'question.video': 'Vidéo',
    'question.math': 'Mathématiques',
    'difficulty.easy': 'Facile',
    'difficulty.medium': 'Moyen',
    'difficulty.hard': 'Difficile',
    'type.mcq': 'Choix multiple',
    'type.tf': 'Vrai/Faux',
    'type.fitb': 'Compléter',
    'type.order': 'Ordonner',
    'type.match': 'Associer',
    'type.quran': 'Coran',
    'timer.start': 'Démarrer',
    'timer.pause': 'Pause',
    'timer.reset': 'Réinitialiser',
    'timer.remaining': 'Temps restant',
    'timer.expired': 'Temps écoulé',
    'score.team': 'Équipe',
    'score.points': 'Points',
    'score.correct': 'Correct',
    'score.wrong': 'Faux',
    'score.skipped': 'Passé',
    'onboarding.welcome': 'Bienvenue',
    'onboarding.step1': 'Créez des catégories',
    'onboarding.step2': 'Ajoutez des questions',
    'onboarding.step3': 'Préparez les équipes',
    'onboarding.step4': 'Commencez le quiz',
    'onboarding.skip': 'Passer',
    'onboarding.next': 'Suivant',
    'onboarding.done': 'Terminé',
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

    // V16.0: Expanded Urdu translations
    'admin.categories': 'اقسام',
    'admin.questions': 'سوالات',
    'admin.teams': 'ٹیمیں',
    'admin.settings': 'ترتیبات',
    'admin.import': 'درآمد',
    'admin.export': 'برآمد',
    'admin.analytics': 'تجزیات',
    'admin.newCategory': 'نیا قسم',
    'admin.newQuestion': 'نیا سوال',
    'admin.newTeam': 'نئی ٹیم',
    'admin.editCategory': 'قسم میں ترمیم',
    'admin.editQuestion': 'سوال میں ترمیم',
    'admin.editTeam': 'ٹیم میں ترمیم',
    'admin.deleteCategory': 'قسم حذف کریں',
    'admin.deleteQuestion': 'سوال حذف کریں',
    'admin.deleteTeam': 'ٹیم حذف کریں',
    'admin.questionCount': 'سوالات کی تعداد',
    'admin.teamCount': 'ٹیموں کی تعداد',
    'admin.totalScore': 'کل اسکور',
    'admin.sessionHistory': 'سیشن ہسٹری',
    'admin.clearData': 'ڈیٹا صاف کریں',
    'admin.exportPDF': 'PDF برآمد کریں',
    'admin.exportExcel': 'ایکسل برآمد کریں',
    'admin.aiGenerate': 'AI سے بنائیں',
    'admin.multiplayer': 'ملٹی پلیئر',
    'admin.createRoom': 'کمرہ بنائیں',
    'admin.joinRoom': 'کمرہ میں شامل ہوں',
    'admin.roomCode': 'کمرہ کوڈ',
    'admin.startQuiz': 'کوئز شروع کریں',
    'admin.endQuiz': 'کوئز ختم کریں',
    'admin.nextQuestion': 'اگلا سوال',
    'admin.prevQuestion': 'پچھلا سوال',
    'admin.revealAnswer': 'جواب ظاہر کریں',
    'admin.resetScores': 'اسکور ری سیٹ کریں',
    'admin.adjustScore': 'اسکور ایڈجسٹ کریں',
    'admin.useLifeline': 'لائف لائن استعمال کریں',
    'admin.fiftyFifty': '50/50',
    'admin.skip': 'چھوڑیں',
    'admin.extraTime': 'اضافی وقت',
    'admin.timeFreeze': 'وقت منجمد',
    'admin.doubleChance': 'دہرا موقع',
    'admin.buzzer': 'بزر',
    'admin.audience': 'ناظرین اسکرین',
    'admin.remote': 'ریموٹ کنٹرول',
    'admin.fullscreen': 'مکمل اسکرین',
    'admin.certificates': 'سرٹیفکیٹس',
    'admin.themes': 'تھیمز',
    'admin.languages': 'زبانیں',
    'admin.accessibility': 'رسایی',
    'admin.security': 'سیکیورٹی',
    'admin.password': 'پاس ورڈ',
    'admin.changePassword': 'پاس ورڈ تبدیل کریں',
    'admin.backup': 'بیک اپ',
    'admin.restore': 'بحال کریں',
    'admin.about': 'بارے میں',
    'admin.help': 'مدد',
    'question.text': 'سوال کا متن',
    'question.type': 'قسم',
    'question.difficulty': 'مشکل',
    'question.time': 'وقت (سیکنڈ)',
    'question.options': 'اختیارات',
    'question.correct': 'درست جواب',
    'question.explanation': 'وضاحت',
    'question.image': 'تصویر',
    'question.audio': 'آڈیو',
    'question.video': 'ویڈیو',
    'question.math': 'ریاضی',
    'difficulty.easy': 'آسان',
    'difficulty.medium': 'درمیانہ',
    'difficulty.hard': 'مشکل',
    'type.mcq': 'متعدد انتخاب',
    'type.tf': 'صحیح/غلط',
    'type.fitb': 'خالی جگہ بھریں',
    'type.order': 'ترتیب دیں',
    'type.match': 'ملائیں',
    'type.quran': 'قرآن',
    'timer.start': 'شروع',
    'timer.pause': 'روکیں',
    'timer.reset': 'ری سیٹ',
    'timer.remaining': 'بقیہ وقت',
    'timer.expired': 'وقت ختم',
    'score.team': 'ٹیم',
    'score.points': 'پوائنٹس',
    'score.correct': 'درست',
    'score.wrong': 'غلط',
    'score.skipped': 'چھوڑا',
    'onboarding.welcome': 'خوش آمدید',
    'onboarding.step1': 'اقسام بنائیں',
    'onboarding.step2': 'سوالات شامل کریں',
    'onboarding.step3': 'ٹیمیں تیار کریں',
    'onboarding.step4': 'کوئز شروع کریں',
    'onboarding.skip': 'چھوڑیں',
    'onboarding.next': 'اگلا',
    'onboarding.done': 'مکمل',
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
    // V16.0-fix: The previous patch ONLY checked I18n._dicts (small dictionary
    // with ~100 keys from this file). When a key wasn't found there (e.g.,
    // 'wizard.quickTitle' which lives in I18n._translations in 04-i18n.js),
    // it returned the KEY ITSELF as text — causing "wizard.quickTitle" to
    // appear as literal text in the UI instead of the translated text.
    // Fix: Call the ORIGINAL I18n.t() (_origT) as the primary lookup — it
    // checks I18n._translations which has the full ~1700 key dictionary.
    // Only for fr/ur (not in _translations) do we check _dicts.
    if (!I18n._tPatched) {
      var _origT = I18n.t;
      I18n.t = function(key, vars, fallback) {
        // V16.0-fix: Determine the effective language
        var lang = 'ar';
        try {
          if (state && state.settings) {
            lang = state.settings.lang || state.settings.language || 'ar';
          }
        } catch(e) {}
        // For fr/ur (new languages not in _translations), check _dicts first
        if ((lang === 'fr' || lang === 'ur') && I18n._dicts[lang] && I18n._dicts[lang][key]) {
          return I18n._dicts[lang][key];
        }
        // Call the ORIGINAL I18n.t() which checks _translations (full dictionary)
        // This handles ar, en, and all keys that exist in _translations
        // V16.0-fix: Guard against _origT being undefined (double-patch prevention)
        var result = key;
        try {
          if (typeof _origT === 'function') {
            result = _origT.call(I18n, key, vars, fallback);
          }
        } catch(e) {
          console.warn('[i18n-ext] _origT call failed:', e.message);
        }
        // If the original returned the key itself (not found), try _dicts
        if (result === key) {
          if (I18n._dicts[lang] && I18n._dicts[lang][key]) return I18n._dicts[lang][key];
          if (I18n._dicts.en && I18n._dicts.en[key]) return I18n._dicts.en[key];
          if (I18n._dicts.ar && I18n._dicts.ar[key]) return I18n._dicts.ar[key];
        }
        return result;
      };
      I18n._tPatched = true;
    }

    // Helper to set document direction based on language
    // V16.0: Added optional RTL for French (for Maghreb users)
    I18n.setLanguage = function(lang, useRTL) {
      if (!state.settings) state.settings = {};
      state.settings.lang = lang;
      // V16.0: French can use RTL if user prefers (Maghreb)
      var rtlLangs = ['ar', 'ur'];
      if (useRTL && lang === 'fr') rtlLangs.push('fr');
      var dir = rtlLangs.includes(lang) ? 'rtl' : 'ltr';
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
