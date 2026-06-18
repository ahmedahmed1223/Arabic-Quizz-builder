// ════════════════════════════════════════════════════════
//  AUTH
// ════════════════════════════════════════════════════════
function showLoginPassword(){
  document.getElementById('login-step-btn').style.display='none';
  document.getElementById('login-step-pwd').style.display='';
  setTimeout(()=>document.getElementById('login-password-input').focus(),100);
}
// ── V9: Password hashing — SHA-256 via Web Crypto API (works offline) ──
// Falls back to btoa for legacy browsers; auto-migrates old btoa hashes on login
let _pwdSalt=null;
function _getPwdSalt(){
  if(!_pwdSalt){
    // Generate a random salt and store it
    let stored=localStorage.getItem('quiz_pwd_salt');
    if(!stored){
      stored=Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b=>b.toString(16).padStart(2,'0')).join('');
      localStorage.setItem('quiz_pwd_salt',stored);
    }
    _pwdSalt=stored;
  }
  return _pwdSalt;
}
async function _hashPwdAsync(pwd){
  try{
    const salt=_getPwdSalt();
    const encoder=new TextEncoder();
    const data=encoder.encode(pwd+salt);
    const hashBuffer=await crypto.subtle.digest('SHA-256',data);
    const hashArray=Array.from(new Uint8Array(hashBuffer));
    return 'v9:'+hashArray.map(b=>b.toString(16).padStart(2,'0')).join('');
  }catch(e){
    // Fallback for browsers without Web Crypto (very rare)
    return _hashPwdLegacy(pwd);
  }
}
function _hashPwdLegacy(pwd){try{return btoa(unescape(encodeURIComponent(pwd+'_quiz_salt_v6')))}catch(e){return pwd}}
// Synchronous wrapper — used for setting password in settings panel
function _hashPwd(pwd){
  // Return legacy hash synchronously; will be upgraded on next login via _verifyPwd
  return _hashPwdLegacy(pwd);
}
async function _verifyPwd(input,stored){
  // Empty password check
  if(!input&&!stored)return true;
  if(!input||!stored)return false;
  // Plain text match (original default)
  if(input===stored)return true;
  // V9: SHA-256 hash match
  if(stored.startsWith('v9:')){
    const computed=await _hashPwdAsync(input);
    return computed===stored;
  }
  // Legacy btoa hash match
  if(_hashPwdLegacy(input)===stored){
    // Auto-upgrade: migrate to SHA-256 on successful login
    const newHash=await _hashPwdAsync(input);
    state.settings.password=newHash;
    saveState();
    return true;
  }
  return false;
}

function doLogin(){
  const val=document.getElementById('login-password-input').value;
  // V9: Async password verification (SHA-256)
  _verifyPwd(val,state.settings.password).then(ok=>{
    if(ok){
      document.getElementById('login-error').classList.add('hidden');
      document.getElementById('login-password-input').value='';
      showView('admin');
      try{switchSettingsSubtab('dashboard',document.querySelector('.settings-subtab.active'));}catch(e){}
    }else{
      document.getElementById('login-error').classList.remove('hidden');
      document.getElementById('login-password-input').style.borderColor='var(--danger)';
      setTimeout(()=>document.getElementById('login-password-input').style.borderColor='',800);
    }
  });
}
function doLogout(){
  // Reset login view to step 1
  document.getElementById('login-step-btn').style.display='';
  document.getElementById('login-step-pwd').style.display='none';
  document.getElementById('login-password-input').value='';
  document.getElementById('login-error').classList.add('hidden');
  showView('login');
}
