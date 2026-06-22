// ════════════════════════════════════════════════════════════════
//  SAFE ACCESSORS — always use these in runtime paths
//  Returns null instead of crashing if index is out of range
// ════════════════════════════════════════════════════════════════
function getCurrentCat(){
  if(!state.currentCatId)return null;
  return state.categories.find(c=>c.id===state.currentCatId)||null;
}
function getCurrentQuestion(){
  const cat=getCurrentCat();
  if(!cat||state.currentQIndex==null)return null;
  const q=cat.questions[state.currentQIndex];
  return(q&&typeof q==='object')?q:null;
}
function getCurrentTeam(){
  const idx=state.settings.compMode==='full_cat'
    ?(state.fullCatQueue[state.fullCatQueuePos]?.teamIdx ?? state.currentTeamIndex)
    :state.currentTeamIndex;
  if(idx==null||idx<0||idx>=state.teams.length)return null;
  return state.teams[idx]||null;
}
// Safe DOM getter — returns null instead of throwing
function $el(id){return document.getElementById(id)||null;}
// Safe text/html setter — V9: sanitized by default to prevent XSS
function $setText(id,text){const el=$el(id);if(el)el.textContent=text;}
function $setHTML(id,h){const el=$el(id);if(el)_setSafeHTML(el,h);}
// Safe visibility helper
function $show(id,show){const el=$el(id);if(el)el.style.display=show==null?'':show?'':'none';}
// Safe class toggle
function $cls(id,cls,add){const el=$el(id);if(el)el.classList[add?'add':'remove'](cls);}

var state={settings:{name:'مسابقة المعرفة الكبرى',password:'1234'},categories:[],teams:[],credits:[],currentCatId:null,currentQIndex:0,currentTeamIndex:0,usedQuestions:{},fullCatQueue:[],fullCatQueuePos:0,timerInterval:null,timeLeft:0,timerTotal:0,answered:false,teamLifelines:{},editingCatId:null,editingQId:null,editingTeamId:null,editingCreditId:null,sessionStats:{},modalMembers:[],musicPlaying:false,gameActive:false,optionsRevealed:0,totalOptionsToReveal:0,pendingAnswer:-1,editingQType:'text',qMediaData:null,qMediaType:null,scoreHistory:[],teamStreaks:{},qFilterMode:'all',qSearchTerm:'',savedFilters:[],advSearchOpen:false,advFilters:{advCat:'',hasImage:false,hasExplanation:false},buzzerActive:false,buzzerWinner:null,soloProgress:null};
try{
state={
  settings:{
    name:(typeof I18n!=='undefined'&&typeof I18n.t==='function')?I18n.t('wizard.compDefaultName'):'مسابقة المعرفة الكبرى',password:'1234',
    welcomeMessage:(typeof I18n!=='undefined'&&typeof I18n.t==='function')?I18n.t('wizard.welcomeDefault'):'أهلاً وسهلاً بكم في مسابقتنا التفاعلية',
    defaultTime:30,compMode:'turns',hardPoints:2,
    soundCorrect:'applause',soundWrong:'buzz',hideNavOnCats:true,orderShowTF:true,
    musicType:'builtin',musicVol:40,tenseSeconds:10,
    theme:'space',closingMessage:'شكراً لجميع المشاركين والحضور الكريم',
    llFifty:1,llTime:1,llSkip:1,
    // إضافات جديدة
    customMusicData:null,customCorrectData:null,customWrongData:null,
    soundCorrectVol:80,soundWrongVol:80,
    progressiveReveal:false,progressiveRevealMode:'auto',confirmAnswer:false,revealInterval:800,
    hideStartInSeq:true,showManualPoint:true,timerStartDelay:0,seqKeyboard:true,tenseMusicType:'embedded',tenseEnabled:true,tenseMusicVol:70,showShuffleBadge:false,nextWithoutAnswerMode:'warn',revealDuration:1000,teamCardHeight:'auto',
    fontScale:100,
    autoTransition:true,
    autoTransitionDelay:0,
    backupInterval:0,
    backupNameFormat:'date',
    backupContent:'full',
    shuffleQuestions:false,
    shuffleOptions:false,
    bankSize:0,
    timeExtendSeconds:15,  // V7 F2/M1: seconds to add when extending time
    showHostTfBtnsOnFitb:true,  // V7 M2: show correct/wrong buttons on fill-blank
    matchAllOrNothing:false,  // V7 S6: match grading mode
    orderScoringMode:'all',   // 'all' = all correct required, 'majority' = majority correct counts
    audiencePlaySounds:true,  // play sounds in audience/presenter window
    creditsStyle:'normal',  // V7 T-5.1: 'normal'|'cinematic'|'cards'
    cinematicDuration:40,   // V7 T-5.1: cinematic credits scroll duration (seconds)
    viewTransitions:true,
    timerEndAction:'reveal',     // 'reveal'|'sound'|'notify'|'all'
    videoTimerMode:'auto',       // 'auto'|'manual'|'afterVideo' — timer behavior for video questions
    autoStartMusic:false,        // auto-start music on presentation start
    resetScoresOnNew:true,       // reset team scores when starting new competition
    showLifelines:true,          // show/hide lifelines bar
    catIconSize:100,             // category icon size % (50-200)
    showLifelinesWhenZero:false, // show disabled lifelines when count is 0
    // ── V5 NEW SETTINGS ──
    negativeMarking:false,
    negMarkValue:1,
    streakBonus:false,
    streakCount:3,
    streakValue:2,
    podiumMusicData:null,
    podiumMusicVol:60,
    wheelMusicData:null,
    wheelMusicVol:50,
    autoMuteOnAdmin:true,
    catDisplayMode:'grid',
    catCardSize:100,          // category card size % (60-200)       // 'grid'|'wheel'|'hidden'|'list'|'jeopardy'
    catSwitcherLocation:'both',    // 'both'|'admin' - where mode switcher appears
    containerPlayMode:'normal',     // 'normal'|'sequential' - how container categories are played
    containerAutoAdvance:true,      // auto-advance to next container in sequential mode
    presentationMode:'direct',     // 'direct'|'sequence' - direct start or intro→credits→teams→categories
    language:'ar',                 // i18n: 'ar'|'en'
    certBgImage:null,              // Certificate background image (base64 data URL)
    certBgWidth:null,              // Certificate background width (matched from uploaded cert)
    certBgHeight:null,             // Certificate background height
    certTitle:null,                // Certificate title text (null = default)
    certSubtitle:null,             // Certificate subtitle text (null = default)
    certBorderColor:null,          // Certificate border color (null = default #f5c842)
    certTextColor:null,            // Certificate text color (null = default #b8860b)
    certBgGradStart:null,          // Certificate bg gradient start (null = default #fffdf5)
    certBgGradEnd:null,            // Certificate bg gradient end (null = default #fef3b0)
    certShowDate:true,             // Show date on certificate
    certShowScore:true,            // Show score on certificate
    notifEnabled:{extLibUpdate:true,insufficientQuestions:true,lowBattery:true,audienceDisconnect:true},
    refModeFiles:false,            // Reference-based file storage mode
    answerLabelStyle:'arabic',     // 'arabic'|'numbers'|'english'|'custom'
    customLabels:'',               // Custom answer labels (comma-separated)
    showRefreshConfirm:false,       // V11: Show pull-to-refresh confirmation overlay
    tiebreakerEnabled:false,
    tiebreakerQuestionCount:3,
    tiebreakerPoints:1,
    tiebreakerQuestions:[],   // Array of question IDs selected for tiebreaker
    showErrorScreen:false,    // Show error log viewer to regular users
    showSoloReview:false,     // Show review errors button in solo mode
    showSoloQuickSetup:false, // Show quick setup button in solo mode
    showBugReportsTab:false,  // Show bug reports tab in admin nav
    extUpdateOnOpen:false,    // Update external library when opening admin panel (disabled by default)
    // V14-fix: Add missing solo properties that were only in the recovery state
    soloDifficulty:'all',
    soloMuted:false,
    soloReducedEffects:false,
    soloFullscreen:false,
    soloBgMusic:true,
    soloTimerEnabled:true,
    soloEnableFreeze:true,    // V15.2: Enable Time Freeze lifeline in Solo Play
    soloEnableDouble:true,    // V15.2: Enable Double Chance lifeline in Solo Play
  },
  categories:[],teams:[],credits:[],
  currentCatId:null,currentQIndex:0,currentTeamIndex:0,
  usedQuestions:{},fullCatQueue:[],fullCatQueuePos:0,
  timerInterval:null,timeLeft:0,timerTotal:0,answered:false,
  teamLifelines:{},
  editingCatId:null,editingQId:null,editingTeamId:null,editingCreditId:null,
  sessionStats:{},  // {teamId:{correct,wrong,skipped,totalTime}}
  modalMembers:[],
  musicPlaying:false,
  // حالة جديدة
  gameActive:false,
  optionsRevealed:0,
  totalOptionsToReveal:0,
  pendingAnswer:-1,
  editingQType:'text',
  qMediaData:null,qMediaType:null,
  // ── V5 NEW STATE ──
  scoreHistory:[],              // [{teamId,delta,ts}] - undo stack
  teamStreaks:{},               // {teamId: currentStreak}
  qFilterMode:'all',            // current question filter
  qSearchTerm:'',               // current question search
  savedFilters:[],              // [{id,name,criteria:{mode,term,advCat,hasImage,hasExplanation}}]
  advSearchOpen:false,          // advanced search panel visible
  advFilters:{advCat:'',hasImage:false,hasExplanation:false},
  buzzerActive:false,           // buzzer mode active
  buzzerWinner:null,            // teamId of buzzer winner
  soloProgress:null  // { levels: { "catId_qIdx": { stars:0-3, completed:false, attempts:0 } }, totalStars:0, completedLevels:0, lastPlayedCat:null, lastPlayedQ:null }
};
}catch(_stateInitErr){
  console.error('[Init] State initialization failed, using fallback defaults:',_stateInitErr);
  state={settings:{name:'مسابقة المعرفة الكبرى',password:'1234',welcomeMessage:'أهلاً وسهلاً بكم في مسابقتنا التفاعلية',defaultTime:30,compMode:'turns',hardPoints:2,soundCorrect:'applause',soundWrong:'buzz',hideNavOnCats:true,orderShowTF:true,musicType:'builtin',musicVol:40,tenseSeconds:10,theme:'space',closingMessage:'شكراً لجميع المشاركين والحضور الكريم',llFifty:1,llTime:1,llSkip:1,customMusicData:null,customCorrectData:null,customWrongData:null,soundCorrectVol:80,soundWrongVol:80,progressiveReveal:false,progressiveRevealMode:'auto',confirmAnswer:false,revealInterval:800,hideStartInSeq:true,showManualPoint:true,timerStartDelay:0,seqKeyboard:true,tenseMusicType:'embedded',tenseEnabled:true,tenseMusicVol:70,showShuffleBadge:false,nextWithoutAnswerMode:'warn',revealDuration:1000,teamCardHeight:'auto',fontScale:100,autoTransition:true,autoTransitionDelay:0,backupInterval:0,backupNameFormat:'date',backupContent:'full',shuffleQuestions:false,shuffleOptions:false,bankSize:0,timeExtendSeconds:15,showHostTfBtnsOnFitb:true,matchAllOrNothing:false,orderScoringMode:'all',audiencePlaySounds:true,creditsStyle:'normal',cinematicDuration:40,viewTransitions:true,timerEndAction:'reveal',videoTimerMode:'auto',autoStartMusic:false,resetScoresOnNew:true,showLifelines:true,catIconSize:100,showLifelinesWhenZero:false,negativeMarking:false,negMarkValue:1,streakBonus:false,streakCount:3,streakValue:2,podiumMusicData:null,podiumMusicVol:60,wheelMusicData:null,wheelMusicVol:50,autoMuteOnAdmin:true,catDisplayMode:'grid',catCardSize:100,catSwitcherLocation:'both',containerPlayMode:'normal',containerAutoAdvance:true,presentationMode:'direct',language:'ar',certBgImage:null,certBgWidth:null,certBgHeight:null,certTitle:null,certSubtitle:null,certBorderColor:null,certTextColor:null,certBgGradStart:null,certBgGradEnd:null,certShowDate:true,certShowScore:true,notifEnabled:{extLibUpdate:true,insufficientQuestions:true,lowBattery:true,audienceDisconnect:true},refModeFiles:false,answerLabelStyle:'arabic',customLabels:'',showRefreshConfirm:false,tiebreakerEnabled:false,tiebreakerQuestionCount:3,tiebreakerPoints:1,tiebreakerQuestions:[],showErrorScreen:false,showSoloReview:false,showSoloQuickSetup:false,showBugReportsTab:false,extUpdateOnOpen:false,soloDifficulty:'all',soloMuted:false,soloReducedEffects:false,soloFullscreen:false,soloBgMusic:true,soloTimerEnabled:true,soloEnableFreeze:true,soloEnableDouble:true},categories:[],teams:[],credits:[],currentCatId:null,currentQIndex:0,currentTeamIndex:0,usedQuestions:{},fullCatQueue:[],fullCatQueuePos:0,timerInterval:null,timeLeft:0,timerTotal:0,answered:false,teamLifelines:{},editingCatId:null,editingQId:null,editingTeamId:null,editingCreditId:null,sessionStats:{},modalMembers:[],musicPlaying:false,gameActive:false,optionsRevealed:0,totalOptionsToReveal:0,pendingAnswer:-1,editingQType:'text',qMediaData:null,qMediaType:null,scoreHistory:[],teamStreaks:{},qFilterMode:'all',qSearchTerm:'',savedFilters:[],advSearchOpen:false,advFilters:{advCat:'',hasImage:false,hasExplanation:false},buzzerActive:false,buzzerWinner:null,soloProgress:null};
}
