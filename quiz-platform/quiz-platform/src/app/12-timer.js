// ════════════════════════════════════════════════════════
//  V10: VERSION MIGRATION — detect and migrate old data
// ════════════════════════════════════════════════════════
(function _v10Migration(){
  try{
    var storedVersion=localStorage.getItem('quiz_app_version');
    var currentVer=typeof APP_VERSION!=='undefined'?APP_VERSION:'10.0.0';

    if(storedVersion&&storedVersion!==currentVer){
      console.info('[V10 Migration] App version changed: '+storedVersion+' → '+currentVer);

      // Migrate data from any old version format
      var _needsIDBMigrate=false;

      // Check if old-style LS data exists that needs IDB migration
      try{
        var catImgRaw=localStorage.getItem('quiz_v4_catimg');
        var teamImgRaw=localStorage.getItem('quiz_v4_teamimg');
        var audioRaw=localStorage.getItem('quiz_v4_audio');
        if((catImgRaw&&catImgRaw.length>1000)||(teamImgRaw&&teamImgRaw.length>1000)||(audioRaw&&audioRaw.length>1000)){
          _needsIDBMigrate=true;
        }
      }catch(e){console.error("[Error]",e);}

      // Auto-migrate large LS data to IDB if needed
      if(_needsIDBMigrate&&typeof MediaDB!=='undefined'){
        console.info('[V10 Migration] Large localStorage data detected — migrating to IndexedDB');
        try{
          MediaDB.migrateAllToIDB(function(current,total,step){
            console.info('[V10 Migration] Step '+current+'/'+total+': '+step);
          }).then(function(result){
            if(result.completed===result.total){
              // Safe to remove large LS keys
              try{localStorage.removeItem('quiz_v4_catimg');localStorage.removeItem('quiz_v4_catimg_lz');}catch(e){_logErr(e,'localStorage:V10Migrate-removeCatImg')}
              try{localStorage.removeItem('quiz_v4_teamimg');localStorage.removeItem('quiz_v4_teamimg_lz');}catch(e){_logErr(e,'localStorage:V10Migrate-removeTeamImg')}
              try{localStorage.removeItem('quiz_v4_audio');}catch(e){_logErr(e,'localStorage:V10Migrate-removeAudio')}
              console.info('[V10 Migration] Data migration completed successfully');
              if(typeof toast==='function')toast(I18n.t('storage.migrateSuccess'),'success');
            }else{
              console.warn('[V10 Migration] Partial migration: '+result.completed+'/'+result.total);
            }
          }).catch(function(e){
            console.warn('[V10 Migration] Migration failed:',e);
          });
        }catch(e){console.error("[Error]",e);}
      }

      // Clean up truly obsolete keys from very old versions
      try{
        ['quiz_v3','quiz_platform_v2'].forEach(function(k){
          if(localStorage.getItem(k)!==null){
            console.info('[V10 Migration] Removing obsolete key: '+k);
            localStorage.removeItem(k);
          }
        });
      }catch(e){console.error("[Error]",e);}
    }

    // Update stored version
    localStorage.setItem('quiz_app_version',currentVer);
  }catch(e){console.error("[Error]",e);}
})();
