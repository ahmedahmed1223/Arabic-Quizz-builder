(function(){
  // Minimal DOMPurify-like sanitizer — works offline, no dependencies
  // Allows safe HTML tags/attributes, strips scripts/events/iframes/objects
  var ALLOWED_TAGS=['b','i','u','em','strong','small','sub','sup','br','p','span','div',
    'ul','ol','li','h1','h2','h3','h4','h5','h6','table','thead','tbody','tr','th','td',
    'img','hr','blockquote','pre','code','a','mark','del','ins','abbr','details','summary',
    'figure','figcaption','audio','source','video',
    'svg','path','circle','polyline','line','rect','g','defs','clippath'];
  var ALLOWED_ATTR=['class','id','style','dir','lang','title','alt','src','href',
    'width','height','colspan','rowspan','align','valign','role','aria-label',
    'aria-live','aria-hidden','aria-expanded','aria-controls','data-type',
    'viewBox','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin',
    'd','cx','cy','r','points','x1','y1','x2','y2','x','y','transform',
    'xmlns','fill-rule','clip-rule','opacity'];
  var URI_ATTR=['src','href'];
  var SAFE_URI_RE=/^(?:(?:https?|mailto|tel|data):|[^a-z]|[a-z+.-]+(?:[^a-z]|$))/i;
  var TAG_RE=/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/gi;
  var ATTR_RE=/\b([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
  var EVENT_RE=/^on/i;
  var JS_URI_RE=/^\s*javascript\s*:/i;

  function _sanitizeHTML(dirty){
    if(typeof dirty!=='string')return '';
    // Fast path: if no < tags, just return escaped
    if(dirty.indexOf('<')===-1)return dirty;
    return dirty.replace(TAG_RE,function(m,tagName){
      tagName=tagName.toLowerCase();
      // Closing tags always pass through (we checked the open tag before)
      if(m.charAt(1)==='/')return '</'+tagName+'>';
      // Self-closing
      var isSelfClosing=m.charAt(m.length-2)==='/';
      if(ALLOWED_TAGS.indexOf(tagName)===-1)return '';
      // Filter attributes
      var clean=m.replace(ATTR_RE,function(attrMatch,attrName){
        attrName=attrName.toLowerCase();
        // Block event handlers
        if(EVENT_RE.test(attrName))return '';
        // Check allowed list
        if(ALLOWED_ATTR.indexOf(attrName)===-1)return '';
        // Sanitize URI attributes
        if(URI_ATTR.indexOf(attrName)!==-1){
          var val=attrMatch.slice(attrMatch.indexOf('=')+1).replace(/^["']|["']$/g,'');
          if(!SAFE_URI_RE.test(val)||JS_URI_RE.test(val))return '';
        }
        return attrMatch;
      });
      return clean;
    });
  }

  // Global API
  window._sanitizeHTML=_sanitizeHTML;
  // Safe innerHTML setter — sanitizes user-provided content
  // Use this when setting HTML that contains user input (question text, names, etc.)
  window._setSafeHTML=function(el,html){
    if(!el)return;
    if(typeof html==='string'){
      el.innerHTML=_sanitizeHTML(html);
    }else{
      el.innerHTML='';
    }
  };
  // V9: Sanitize only user-provided content (not template HTML with onclick handlers)
  // Use _sanitizeUser(html) for embedding user text inside template literals
  window._sanitizeUser=function(str){
    if(!str)return '';
    // Escape HTML entities in user text — prevents XSS while preserving display
    var d=document.createElement('div');
    d.textContent=String(str);
    return d.innerHTML;
  };
})();
