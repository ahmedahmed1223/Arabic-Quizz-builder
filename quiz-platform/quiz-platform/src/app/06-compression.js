// ════════════════════════════════════════════════════════
//  V10: LZ-STRING COMPRESSION — inline, offline-safe
//  Compresses data in localStorage to save space.
//  lz-string v1.5.0 (MIT) — minified, embedded for offline use
// ════════════════════════════════════════════════════════
const LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[p++]=r(s),c=p-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[p++]=r(s),c=p-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==p)return null;m=i+i.charAt(0)}v.push(m),l[p++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();/* lz-string v1.5.0 MIT */

// ════════════════════════════════════════════════════════
//  V10: CENTRALIZED STATE MANAGEMENT — AppState
//  Reactive state with auto-save, change events,
//  computed properties, and selective updates.
// ════════════════════════════════════════════════════════
const AppState=(function(){
  const _watchers=new Map();   // path → [callback, ...]
  const _computed=new Map();   // name → {deps:[], fn:Function, value:any}
  const _batchQueue=[];        // batched changes
  const _batchDepth=0;
  let _autoSaveEnabled=true;
  let _autoSaveDebounce=null;
  const AUTO_SAVE_DELAY=600;   // ms — slightly longer than saveState debounce

  // Parse dot-separated path: 'settings.theme' → ['settings','theme']
  function _parsePath(p){return typeof p==='string'?p.split('.'):p;}

  // Get nested value by path
  function _getByPath(obj,path){
    const parts=_parsePath(path);
    let cur=obj;
    for(let i=0;i<parts.length;i++){
      if(cur==null)return undefined;
      cur=cur[parts[i]];
    }
    return cur;
  }

  // Phase 4.3: Shallow comparison for dirty-checking — avoids O(n) JSON.stringify on every state change
  function _shallowEqual(a,b){
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
    const keysA=Object.keys(a);
    const keysB=Object.keys(b);
    if(keysA.length!==keysB.length)return false;
    for(const key of keysA){
      if(a[key]!==b[key])return false;
    }
    return true;
  }
  // Deep-equal fallback: use shallow first, then JSON.stringify for nested objects
  function _valueChanged(old,val){
    if(old===val)return false;
    if(old==null&&val==null)return false;
    if(old==null||val==null)return true;
    if(typeof old!=='object'||typeof val!=='object')return old!==val;
    if(_shallowEqual(old,val))return false;
    // Fallback for nested objects
    return JSON.stringify(old)!==JSON.stringify(val);
  }

  // Set nested value by path, return true if changed
  function _setByPath(obj,path,val){
    const parts=_parsePath(path);
    let cur=obj;
    for(let i=0;i<parts.length-1;i++){
      if(cur[parts[i]]==null)cur[parts[i]]={};
      cur=cur[parts[i]];
    }
    const key=parts[parts.length-1];
    const old=cur[key];
    if(!_valueChanged(old,val))return false;
    cur[key]=val;
    return true;
  }

  // Notify watchers for a path (and parent paths)
  function _notify(path,oldVal,newVal){
    const parts=_parsePath(path);
    // Notify exact path and all parent paths
    for(let i=parts.length;i>=1;i--){
      const p=parts.slice(0,i).join('.');
      const fns=_watchers.get(p);
      if(fns)fns.forEach(fn=>{
        try{fn(newVal,oldVal,p);}catch(e){ErrorBus.capture(e,'AppState.notify:'+p);}
      });
    }
    // Notify wildcard watchers
    const wcFns=_watchers.get('*');
    if(wcFns)wcFns.forEach(fn=>{
      try{fn(newVal,oldVal,path);}catch(e){ErrorBus.capture(e,'AppState.notify:*');}
    });
    // Recompute dependent computed properties
    _computed.forEach((cp,name)=>{
      if(cp.deps.some(d=>path.startsWith(d)||d.startsWith(path))){
        try{
          const newVal=cp.fn();
          if(_valueChanged(cp.value,newVal)){
            cp.value=newVal;
            const cbs=_watchers.get('computed:'+name);
            if(cbs)cbs.forEach(cb=>{try{cb(newVal,cp.value,name);}catch(e){console.error("[Error]",e);}});
          }
        }catch(e){ErrorBus.capture(e,'AppState.computed:'+name);}
      }
    });
  }

  // Schedule auto-save
  // Phase 4.4: Use TimerRegistry for timer leak prevention
  function _scheduleAutoSave(){
    if(!_autoSaveEnabled)return;
    if(_autoSaveDebounce)TimerRegistry.clear(_autoSaveDebounce);
    _autoSaveDebounce=TimerRegistry.setTimeout(function(){
      try{saveState();}catch(e){ErrorBus.capture(e,'AppState.autoSave');}
    },AUTO_SAVE_DELAY,'AppState:autoSave');
  }

  return{
    // ── Watch a path for changes ──
    // Returns unsubscribe function
    watch(path,callback){
      if(!_watchers.has(path))_watchers.set(path,[]);
      _watchers.get(path).push(callback);
      return()=>{
        const arr=_watchers.get(path);
        if(!arr)return;
        const i=arr.indexOf(callback);
        if(i>=0)arr.splice(i,1);
      };
    },

    // ── Watch all changes (wildcard) ──
    watchAll(callback){return this.watch('*',callback);},

    // ── Get value by path ──
    get(path){
      return path?_getByPath(state,path):state;
    },

    // ── Set value by path (triggers watchers + auto-save) ──
    set(path,val){
      const oldVal=_getByPath(state,path);
      const changed=_setByPath(state,path,val);
      if(changed){
        _notify(path,oldVal,val);
        _scheduleAutoSave();
      }
      return changed;
    },

    // ── Batch multiple changes (single notification at end) ──
    batch(fn){
      _batchDepth++;
      const changes=[];
      const origSet=this.set.bind(this);
      try{fn();}
      finally{
        _batchDepth--;
        if(_batchDepth===0){
          // Flush all batched changes
          changes.forEach(c=>_notify(c.path,c.oldVal,c.newVal));
          _scheduleAutoSave();
        }
      }
    },

    // ── Register a computed property ──
    computed(name,deps,fn){
      _computed.set(name,{deps,fn,value:fn()});
      return()=>_computed.get(name)?.value;
    },

    // ── Get computed value ──
    getComputed(name){return _computed.get(name)?.value;},

    // ── Toggle auto-save ──
    setAutoSave(enabled){_autoSaveEnabled=enabled;},

    // ── Force save now ──
    saveNow(){
      if(_autoSaveDebounce)TimerRegistry.clear(_autoSaveDebounce);
      try{saveState();}catch(e){ErrorBus.capture(e,'AppState.saveNow');}
    },

    // ── Get watcher count (debug) ──
    _watcherCount(){return Array.from(_watchers.entries()).map(([k,v])=>[k,v.length]);}
  };
})();
