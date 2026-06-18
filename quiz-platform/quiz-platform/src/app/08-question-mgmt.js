// ════════════════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  V10: COMPLETE NAMESPACE SYSTEM
//  All functions organized into namespaces.
//  Global functions remain for backward compatibility.
//  New code MUST use namespace references.
// ════════════════════════════════════════════════════════
const QuizUtils={
  uid:null,  // assigned after uid() definition
  $el:null,$setText:null,$setHTML:null,$show:null,$cls:null,
  _sanitizeUser:null,_sanitizeHTML:null,_setSafeHTML:null,
  h,hFragment,setChildren,
  toast:null,
};
const QuizStorage={
  saveState:null,saveStateSync:null,saveStateAsync:null,
  loadState:null,
  saveGameProgress:null,saveGameProgressDebounced:null,
  loadGameProgress:null,clearGameProgress:null,
  MediaDB:null,
  _hashPwdAsync:null,_verifyPwd:null,_hashPwd:null,_getPwdSalt:null,
  LZString,  // V10: compression utility
  compress:typeof LZString!=='undefined'?function(s){try{return LZString.compressToUTF16(s);}catch(e){return s;}}:null,
  decompress:typeof LZString!=='undefined'?function(s){try{return LZString.decompressFromUTF16(s);}catch(e){return s;}}:null,
};
const QuizAdmin={
  switchTab:null,renderAdmin:null,renderStatsGrid:null,
  renderCategoriesAdmin:null,selectCatAdmin:null,
  renderQuestionsAdmin:null,openCatModal:null,saveCategory:null,
  deleteCat:null,openQuestionModal:null,saveQuestion:null,
  deleteQuestion:null,renderTeamsAdmin:null,openTeamModal:null,
  addMemberToModal:null,saveTeam:null,deleteTeam:null,
  adjustScore:null,renderCreditsAdmin:null,updateSetting:null,
  selectMode:null,filterQuestions:null,setQFilter:null,
  renderQuestionsFiltered:null,duplicateQuestion:null,
  loadBuiltinLibrary:null,showLibraryModal:null,
  setQType:null,resetOptEditor:null,
};
const QuizPresenter={
  showView:null,goToAdmin:null,
  getCurrentCat:null,getCurrentQuestion:null,getCurrentTeam:null,
  renderIntro:null,renderTeamsSlide:null,renderCatsSlide:null,
  renderCatsGrid:null,renderCatsListImproved:null,renderCatsList:null,
  renderCatsHidden:null,renderCatsJeopardy:null,renderCatsWheel:null,
  setCatDisplayMode:null,
  startCompetition:null,resumeCompetition:null,newCompetition:null,
  selectCatAndStart:null,showTurnOverlay:null,
  startPresentationSequence:null,
  loadQuestion:null,confirmAnswer:null,revealAnswer:null,
  skipQuestion:null,advanceQuestion:null,nextQuestion:null,
  revealAllOptions:null,revealNextOption:null,
  updateTicker:null,floatScore:null,
  renderScoresSlide:null,renderCreditsSlide:null,
  showPodium:null,
};
const QuizTimer={
  startTimer:null,clearTimer:null,togglePauseTimer:null,
  handleTimerEnd:null,updateTimerDisplay:null,
  extendTimerSeconds:null,
  enterBigClock:null,exitBigClock:null,updateBigClockDisplay:null,
};
const QuizQuestion={
  buildLifelinesBtns:null,useLifeline:null,
  buildScoreBtns:null,handleOptionClick:null,
  selectOption:null,undoAnswer:null,
  checkFitbAnswer:null,checkOrderAnswer:null,
  handleQuranChoice:null,toggleQuranAudio:null,
  _renderMatchQuestion:null,_handleMatchLeftClick:null,
  _handleMatchRightClick:null,_submitMatch:null,_resetMatch:null,
  _renderOrderItems:null,
  _renderHostFitbButtons:null,_hostFitbGrade:null,
  _applyProgressiveReveal:null,
  loadQuestionFromQueue:null,
};
const QuizAudio={
  AudioMixer:null,
  startMusic:null,stopMusic:null,toggleMusic:null,
  playSound:null,stopEffectSound:null,
  setMusicVolume:null,switchMusicPattern:null,
  loadCustomAudio:null,testCustomAudio:null,clearCustomAudio:null,
  playCustomMusic:null,stopCustomMusic:null,
  playApplause:null,playChime:null,playFanfare:null,playBuzz:null,
};
const QuizThemes={
  THEMES:null,CREDIT_CATS:null,TEAM_COLORS:null,CAT_COLORS:null,
  applyTheme:null,renderThemeGrid:null,
  applyFontScale:null,applyCatCardScale:null,applyCatIconScale:null,
  applyCustomColor:null,syncColorInput:null,
  lightenColor:null,darkenColor:null,
  loadCustomThemePreset:null,resetCustomTheme:null,
  exportCustomTheme:null,restoreCustomThemeVars:null,
};
const QuizImport={
  exportData:null,importJSON:null,
  exportEncrypted:null,importEncrypted:null,
  processExcelFile:null,handleFileSelect:null,handleFileDrop:null,
  exportResultsCSV:null,
};
const QuizPodium={
  showPodium:null,launchPodiumConfetti:null,
  loadPodiumMusic:null,clearPodiumMusic:null,
  testPodiumMusic:null,stopPodiumMusicTest:null,
  startPodiumMusic:null,togglePodiumMusic:null,
};
const QuizRemote={
  initRemoteControl:null,showRemotePanel:null,
  _sendRemote:null,_buildRemoteState:null,
  showPlaySearch:null,filterPlaySearch:null,
};
const QuizWhiteboard={
  toggleWhiteboard:null,
  wbSetColor:null,wbSetWidth:null,wbClear:null,
  wbUndo:null,wbSetMode:null,
};
const QuizTraining={
  openTrainingMode:null,startTrainingMode:null,
  _renderTrainingQ:null,_trainingReveal:null,_trainingNav:null,
};
const QuizCertificate={
  openWinnerCertificate:null,loadCertLogo:null,
  printCertificate:null,_checkEarlyWinner:null,_dismissEarlyWinner:null,
};
const QuizBuzzer={
  openBuzzerMode:null,closeBuzzerMode:null,
  renderBuzzerGrid:null,buzzIn:null,resetBuzzer:null,
};
const QuizMatch={
  _initMatchPairsEditor:null,_renderMatchPairsEditor:null,
  addMatchPair:null,removeLastMatchPair:null,
  _updateMatchPair:null,
};
const QuizStats={
  initSessionStats:null,recordAnswer:null,
  _updateStreak:null,showTeamStats:null,
  renderTeamStats:null,refreshTeamStatsIfVisible:null,
  showStreakAnimation:null,updateStreakDisplay:null,
  openCompare1v1:null,_renderCompare1v1:null,
};
const QuizBackup={
  doBackupNow:null,updateBackupStatus:null,
  renderBackupHistory:null,setBackupInterval:null,
  applyCustomBackupInterval:null,restoreBackupInterval:null,
};
const QuizImage={
  loadCatImage:null,clearCatImage:null,
  loadTeamImage:null,clearTeamImage:null,
  loadOptImage:null,clearOptImage:null,
  loadMemberImageForRow:null,clearMemberImage:null,
  loadCreditPersonImage:null,clearCreditPersonImage:null,
  previewMemberAddImage:null,
};
// V10: Link namespaces after all functions are defined
function _initNamespaces(){
  QuizUtils.uid=uid; QuizUtils.$el=$el; QuizUtils.$setText=$setText;
  QuizUtils.$setHTML=$setHTML; QuizUtils.$show=$show; QuizUtils.$cls=$cls;
  QuizUtils._sanitizeUser=_sanitizeUser; QuizUtils._sanitizeHTML=_sanitizeHTML;
  QuizUtils._setSafeHTML=_setSafeHTML; QuizUtils.toast=toast;
  QuizStorage.saveState=saveState; QuizStorage.saveStateSync=saveStateSync;
  QuizStorage.saveStateAsync=saveStateAsync; QuizStorage.loadState=loadState;
  QuizStorage.saveGameProgress=saveGameProgress; QuizStorage.saveGameProgressDebounced=saveGameProgressDebounced;
  QuizStorage.loadGameProgress=loadGameProgress; QuizStorage.clearGameProgress=clearGameProgress;
  QuizStorage.MediaDB=MediaDB; QuizStorage._hashPwdAsync=_hashPwdAsync;
  QuizStorage._verifyPwd=_verifyPwd; QuizStorage._hashPwd=_hashPwd; QuizStorage._getPwdSalt=_getPwdSalt;
  QuizAdmin.switchTab=switchTab; QuizAdmin.renderAdmin=renderAdmin;
  QuizAdmin.renderStatsGrid=renderStatsGrid; QuizAdmin.renderCategoriesAdmin=renderCategoriesAdmin;
  QuizAdmin.selectCatAdmin=selectCatAdmin; QuizAdmin.renderQuestionsAdmin=renderQuestionsAdmin;
  QuizAdmin.openCatModal=openCatModal; QuizAdmin.saveCategory=saveCategory;
  QuizAdmin.deleteCat=deleteCat; QuizAdmin.openQuestionModal=openQuestionModal;
  QuizAdmin.saveQuestion=saveQuestion; QuizAdmin.deleteQuestion=deleteQuestion;
  QuizAdmin.renderTeamsAdmin=renderTeamsAdmin; QuizAdmin.openTeamModal=openTeamModal;
  QuizAdmin.addMemberToModal=addMemberToModal; QuizAdmin.saveTeam=saveTeam;
  QuizAdmin.deleteTeam=deleteTeam; QuizAdmin.adjustScore=adjustScore;
  QuizAdmin.renderCreditsAdmin=renderCreditsAdmin; QuizAdmin.updateSetting=updateSetting;
  QuizAdmin.selectMode=selectMode; QuizAdmin.filterQuestions=filterQuestions;
  QuizAdmin.setQFilter=setQFilter; QuizAdmin.renderQuestionsFiltered=renderQuestionsFiltered;
  QuizAdmin.duplicateQuestion=duplicateQuestion;
  QuizAdmin.loadBuiltinLibrary=loadBuiltinLibrary; QuizAdmin.showLibraryModal=showLibraryModal;
  QuizAdmin.setQType=setQType; QuizAdmin.resetOptEditor=resetOptEditor;
  QuizPresenter.showView=showView; QuizPresenter.goToAdmin=goToAdmin;
  QuizPresenter.getCurrentCat=getCurrentCat; QuizPresenter.getCurrentQuestion=getCurrentQuestion;
  QuizPresenter.getCurrentTeam=getCurrentTeam;
  QuizPresenter.renderIntro=renderIntro; QuizPresenter.renderTeamsSlide=renderTeamsSlide;
  QuizPresenter.renderCatsSlide=renderCatsSlide; QuizPresenter.renderCatsGrid=renderCatsGrid;
  QuizPresenter.renderCatsListImproved=renderCatsListImproved;
  QuizPresenter.renderCatsList=renderCatsList; QuizPresenter.renderCatsHidden=renderCatsHidden;
  QuizPresenter.renderCatsJeopardy=renderCatsJeopardy; QuizPresenter.renderCatsWheel=renderCatsWheel;
  QuizPresenter.setCatDisplayMode=setCatDisplayMode;
  QuizPresenter.startCompetition=startCompetition; QuizPresenter.resumeCompetition=resumeCompetition;
  QuizPresenter.newCompetition=newCompetition; QuizPresenter.selectCatAndStart=selectCatAndStart;
  QuizPresenter.showTurnOverlay=showTurnOverlay;
  QuizPresenter.startPresentationSequence=startPresentationSequence;
  QuizPresenter.loadQuestion=loadQuestion; QuizPresenter.confirmAnswer=confirmAnswer;
  QuizPresenter.revealAnswer=revealAnswer; QuizPresenter.skipQuestion=skipQuestion;
  QuizPresenter.advanceQuestion=advanceQuestion; QuizPresenter.nextQuestion=nextQuestion;
  QuizPresenter.revealAllOptions=revealAllOptions; QuizPresenter.revealNextOption=revealNextOption;
  QuizPresenter.updateTicker=updateTicker; QuizPresenter.floatScore=floatScore;
  QuizPresenter.renderScoresSlide=renderScoresSlide; QuizPresenter.renderCreditsSlide=renderCreditsSlide;
  QuizPresenter.showPodium=showPodium;
  QuizTimer.startTimer=startTimer; QuizTimer.clearTimer=clearTimer;
  QuizTimer.togglePauseTimer=togglePauseTimer; QuizTimer.handleTimerEnd=handleTimerEnd;
  QuizTimer.updateTimerDisplay=updateTimerDisplay; QuizTimer.extendTimerSeconds=extendTimerSeconds;
  QuizTimer.enterBigClock=enterBigClock; QuizTimer.exitBigClock=exitBigClock;
  QuizTimer.updateBigClockDisplay=updateBigClockDisplay;
  QuizQuestion.buildLifelinesBtns=buildLifelinesBtns; QuizQuestion.useLifeline=useLifeline;
  QuizQuestion.buildScoreBtns=buildScoreBtns; QuizQuestion.handleOptionClick=handleOptionClick;
  QuizQuestion.selectOption=selectOption; QuizQuestion.undoAnswer=undoAnswer;
  QuizQuestion.checkFitbAnswer=checkFitbAnswer; QuizQuestion.checkOrderAnswer=checkOrderAnswer;
  QuizQuestion.handleQuranChoice=handleQuranChoice; QuizQuestion.toggleQuranAudio=toggleQuranAudio;
  QuizQuestion._renderMatchQuestion=_renderMatchQuestion; QuizQuestion._handleMatchLeftClick=_handleMatchLeftClick;
  QuizQuestion._handleMatchRightClick=_handleMatchRightClick; QuizQuestion._submitMatch=_submitMatch;
  QuizQuestion._resetMatch=_resetMatch; QuizQuestion._renderOrderItems=_renderOrderItems;
  QuizQuestion._renderHostFitbButtons=_renderHostFitbButtons; QuizQuestion._hostFitbGrade=_hostFitbGrade;
  QuizQuestion._applyProgressiveReveal=_applyProgressiveReveal;
  QuizQuestion.loadQuestionFromQueue=loadQuestionFromQueue;
  QuizAudio.AudioMixer=AudioMixer; QuizAudio.startMusic=startMusic;
  QuizAudio.stopMusic=stopMusic; QuizAudio.toggleMusic=toggleMusic;
  QuizAudio.playSound=playSound; QuizAudio.stopEffectSound=stopEffectSound;
  QuizAudio.setMusicVolume=setMusicVolume; QuizAudio.switchMusicPattern=switchMusicPattern;
  QuizAudio.loadCustomAudio=loadCustomAudio; QuizAudio.testCustomAudio=testCustomAudio;
  QuizAudio.clearCustomAudio=clearCustomAudio; QuizAudio.playCustomMusic=playCustomMusic;
  QuizAudio.stopCustomMusic=stopCustomMusic;
  QuizAudio.playApplause=playApplause; QuizAudio.playChime=playChime;
  QuizAudio.playFanfare=playFanfare; QuizAudio.playBuzz=playBuzz;
  QuizThemes.THEMES=THEMES; QuizThemes.CREDIT_CATS=CREDIT_CATS;
  QuizThemes.TEAM_COLORS=TEAM_COLORS; QuizThemes.CAT_COLORS=CAT_COLORS;
  QuizThemes.applyTheme=applyTheme; QuizThemes.renderThemeGrid=renderThemeGrid;
  QuizThemes.applyFontScale=applyFontScale; QuizThemes.applyCatCardScale=applyCatCardScale;
  QuizThemes.applyCatIconScale=applyCatIconScale;
  QuizThemes.applyCustomColor=applyCustomColor; QuizThemes.syncColorInput=syncColorInput;
  QuizThemes.lightenColor=lightenColor; QuizThemes.darkenColor=darkenColor;
  QuizThemes.loadCustomThemePreset=loadCustomThemePreset;
  QuizThemes.resetCustomTheme=resetCustomTheme;
  QuizThemes.exportCustomTheme=exportCustomTheme;
  QuizThemes.restoreCustomThemeVars=restoreCustomThemeVars;
  QuizImport.exportData=exportData; QuizImport.importJSON=importJSON;
  QuizImport.exportEncrypted=exportEncrypted; QuizImport.importEncrypted=importEncrypted;
  QuizImport.processExcelFile=processExcelFile; QuizImport.handleFileSelect=handleFileSelect;
  QuizImport.handleFileDrop=handleFileDrop; QuizImport.exportResultsCSV=exportResultsCSV;
  QuizImport.exportDataZip=exportDataZip; QuizImport.importZIP=importZIP;
  QuizPodium.showPodium=showPodium; QuizPodium.launchPodiumConfetti=launchPodiumConfetti;
  QuizPodium.loadPodiumMusic=loadPodiumMusic; QuizPodium.clearPodiumMusic=clearPodiumMusic;
  QuizPodium.testPodiumMusic=testPodiumMusic; QuizPodium.stopPodiumMusicTest=stopPodiumMusicTest;
  QuizPodium.startPodiumMusic=startPodiumMusic; QuizPodium.togglePodiumMusic=togglePodiumMusic;
  QuizRemote.initRemoteControl=initRemoteControl; QuizRemote.showRemotePanel=showRemotePanel;
  QuizRemote._sendRemote=_sendRemote; QuizRemote._buildRemoteState=_buildRemoteState;
  QuizRemote.showPlaySearch=showPlaySearch; QuizRemote.filterPlaySearch=filterPlaySearch;
  QuizRemote.showAudienceScreen=showAudienceScreen;
  QuizWhiteboard.toggleWhiteboard=toggleWhiteboard;
  QuizWhiteboard.wbSetColor=wbSetColor; QuizWhiteboard.wbSetWidth=wbSetWidth;
  QuizWhiteboard.wbClear=wbClear; QuizWhiteboard.wbUndo=wbUndo; QuizWhiteboard.wbSetMode=wbSetMode;
  QuizTraining.openTrainingMode=openTrainingMode; QuizTraining.startTrainingMode=startTrainingMode;
  QuizTraining._renderTrainingQ=_renderTrainingQ;
  QuizTraining._trainingReveal=_trainingReveal; QuizTraining._trainingNav=_trainingNav;
  QuizCertificate.openWinnerCertificate=openWinnerCertificate; QuizCertificate.loadCertLogo=loadCertLogo;
  QuizCertificate.printCertificate=printCertificate;
  QuizCertificate._checkEarlyWinner=_checkEarlyWinner; QuizCertificate._dismissEarlyWinner=_dismissEarlyWinner;
  QuizCertificate.loadCertBgImage=loadCertBgImage; QuizCertificate.loadCertBgFromCert=loadCertBgFromCert;
  QuizCertificate.clearCertBgImage=clearCertBgImage; QuizCertificate._applyCertBg=_applyCertBg;
  QuizBuzzer.openBuzzerMode=openBuzzerMode; QuizBuzzer.closeBuzzerMode=closeBuzzerMode;
  QuizBuzzer.renderBuzzerGrid=renderBuzzerGrid; QuizBuzzer.buzzIn=buzzIn; QuizBuzzer.resetBuzzer=resetBuzzer;
  QuizMatch._initMatchPairsEditor=_initMatchPairsEditor; QuizMatch._renderMatchPairsEditor=_renderMatchPairsEditor;
  QuizMatch.addMatchPair=addMatchPair; QuizMatch.removeLastMatchPair=removeLastMatchPair;
  QuizMatch._updateMatchPair=_updateMatchPair;
  QuizStats.initSessionStats=initSessionStats; QuizStats.recordAnswer=recordAnswer;
  QuizStats._updateStreak=_updateStreak; QuizStats.showTeamStats=showTeamStats;
  QuizStats.renderTeamStats=renderTeamStats; QuizStats.refreshTeamStatsIfVisible=refreshTeamStatsIfVisible;
  QuizStats.showStreakAnimation=showStreakAnimation; QuizStats.updateStreakDisplay=updateStreakDisplay;
  QuizStats.openCompare1v1=openCompare1v1; QuizStats._renderCompare1v1=_renderCompare1v1;
  QuizBackup.doBackupNow=doBackupNow; QuizBackup.updateBackupStatus=updateBackupStatus;
  QuizBackup.renderBackupHistory=renderBackupHistory; QuizBackup.setBackupInterval=setBackupInterval;
  QuizBackup.applyCustomBackupInterval=applyCustomBackupInterval;
  QuizBackup.restoreBackupInterval=restoreBackupInterval;
  QuizImage.loadCatImage=loadCatImage; QuizImage.clearCatImage=clearCatImage;
  QuizImage.loadTeamImage=loadTeamImage; QuizImage.clearTeamImage=clearTeamImage;
  QuizImage.loadOptImage=loadOptImage; QuizImage.clearOptImage=clearOptImage;
  QuizImage.loadMemberImageForRow=loadMemberImageForRow; QuizImage.clearMemberImage=clearMemberImage;
  QuizImage.loadCreditPersonImage=loadCreditPersonImage; QuizImage.clearCreditPersonImage=clearCreditPersonImage;
  QuizImage.previewMemberAddImage=previewMemberAddImage;
}
