// ════════════════════════════════════════════════════════
//  V7 — SortableJS bundled inline (offline support, 45KB)
// ════════════════════════════════════════════════════════
/*! Sortable 1.15.6 - MIT | git://github.com/SortableJS/Sortable.git */
!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?module.exports=e():"function"==typeof define&&define.amd?define(e):(t=t||self).Sortable=e()}(this,function(){"use strict";function e(e,t){var n,o=Object.keys(e);return Object.getOwnPropertySymbols&&(n=Object.getOwnPropertySymbols(e),t&&(n=n.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),o.push.apply(o,n)),o}function I(o){for(var t=1;t<arguments.length;t++){var i=null!=arguments[t]?arguments[t]:{};t%2?e(Object(i),!0).forEach(function(t){var e,n;e=o,t=i[n=t],n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t}):Object.getOwnPropertyDescriptors?Object.defineProperties(o,Object.getOwnPropertyDescriptors(i)):e(Object(i)).forEach(function(t){Object.defineProperty(o,t,Object.getOwnPropertyDescriptor(i,t))})}return o}function o(t){return(o="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}function a(){return(a=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n,o=arguments[e];for(n in o)Object.prototype.hasOwnProperty.call(o,n)&&(t[n]=o[n])}return t}).apply(this,arguments)}function i(t,e){if(null==t)return{};var n,o=function(t,e){if(null==t)return{};for(var n,o={},i=Object.keys(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||(o[n]=t[n]);return o}(t,e);if(Object.getOwnPropertySymbols)for(var i=Object.getOwnPropertySymbols(t),r=0;r<i.length;r++)n=i[r],0<=e.indexOf(n)||Object.prototype.propertyIsEnumerable.call(t,n)&&(o[n]=t[n]);return o}function r(t){return function(t){if(Array.isArray(t))return l(t)}(t)||function(t){if("undefined"!=typeof Symbol&&null!=t[Symbol.iterator]||null!=t["@@iterator"])return Array.from(t)}(t)||function(t,e){if(t){if("string"==typeof t)return l(t,e);var n=Object.prototype.toString.call(t).slice(8,-1);return"Map"===(n="Object"===n&&t.constructor?t.constructor.name:n)||"Set"===n?Array.from(t):"Arguments"===n||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?l(t,e):void 0}}(t)||function(){throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")}()}function l(t,e){(null==e||e>t.length)&&(e=t.length);for(var n=0,o=new Array(e);n<e;n++)o[n]=t[n];return o}function t(t){if("undefined"!=typeof window&&window.navigator)return!!navigator.userAgent.match(t)}var y=t(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),w=t(/Edge/i),s=t(/firefox/i),u=t(/safari/i)&&!t(/chrome/i)&&!t(/android/i),c=t(/iP(ad|od|hone)/i),n=t(/chrome/i)&&t(/android/i),d={capture:!1,passive:!1};function h(t,e,n){t.addEventListener(e,n,!y&&d)}function p(t,e,n){t.removeEventListener(e,n,!y&&d)}function f(t,e){if(e&&(">"===e[0]&&(e=e.substring(1)),t))try{if(t.matches)return t.matches(e);if(t.msMatchesSelector)return t.msMatchesSelector(e);if(t.webkitMatchesSelector)return t.webkitMatchesSelector(e)}catch(t){return}}function g(t){return t.host&&t!==document&&t.host.nodeType?t.host:t.parentNode}function P(t,e,n,o){if(t){n=n||document;do{if(null!=e&&(">"!==e[0]||t.parentNode===n)&&f(t,e)||o&&t===n)return t}while(t!==n&&(t=g(t)))}return null}var m,v=/\s+/g;function k(t,e,n){var o;t&&e&&(t.classList?t.classList[n?"add":"remove"](e):(o=(" "+t.className+" ").replace(v," ").replace(" "+e+" "," "),t.className=(o+(n?" "+e:"")).replace(v," ")))}function R(t,e,n){var o=t&&t.style;if(o){if(void 0===n)return document.defaultView&&document.defaultView.getComputedStyle?n=document.defaultView.getComputedStyle(t,""):t.currentStyle&&(n=t.currentStyle),void 0===e?n:n[e];o[e=!(e in o||-1!==e.indexOf("webkit"))?"-webkit-"+e:e]=n+("string"==typeof n?"":"px")}}function b(t,e){var n="";if("string"==typeof t)n=t;else do{var o=R(t,"transform")}while(o&&"none"!==o&&(n=o+" "+n),!e&&(t=t.parentNode));var i=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return i&&new i(n)}function D(t,e,n){if(t){var o=t.getElementsByTagName(e),i=0,r=o.length;if(n)for(;i<r;i++)n(o[i],i);return o}return[]}function O(){var t=document.scrollingElement;return t||document.documentElement}function X(t,e,n,o,i){if(t.getBoundingClientRect||t===window){var r,a,l,s,c,u,d=t!==window&&t.parentNode&&t!==O()?(a=(r=t.getBoundingClientRect()).top,l=r.left,s=r.bottom,c=r.right,u=r.height,r.width):(l=a=0,s=window.innerHeight,c=window.innerWidth,u=window.innerHeight,window.innerWidth);if((e||n)&&t!==window&&(i=i||t.parentNode,!y))do{if(i&&i.getBoundingClientRect&&("none"!==R(i,"transform")||n&&"static"!==R(i,"position"))){var h=i.getBoundingClientRect();a-=h.top+parseInt(R(i,"border-top-width")),l-=h.left+parseInt(R(i,"border-left-width")),s=a+r.height,c=l+r.width;break}}while(i=i.parentNode);return o&&t!==window&&(o=(e=b(i||t))&&e.a,t=e&&e.d,e&&(s=(a/=t)+(u/=t),c=(l/=o)+(d/=o))),{top:a,left:l,bottom:s,right:c,width:d,height:u}}}function Y(t,e,n){for(var o=M(t,!0),i=X(t)[e];o;){var r=X(o)[n];if(!("top"===n||"left"===n?r<=i:i<=r))return o;if(o===O())break;o=M(o,!1)}return!1}function B(t,e,n,o){for(var i=0,r=0,a=t.children;r<a.length;){if("none"!==a[r].style.display&&a[r]!==jt.ghost&&(o||a[r]!==jt.dragged)&&P(a[r],n.draggable,t,!1)){if(i===e)return a[r];i++}r++}return null}function F(t,e){for(var n=t.lastElementChild;n&&(n===jt.ghost||"none"===R(n,"display")||e&&!f(n,e));)n=n.previousElementSibling;return n||null}function j(t,e){var n=0;if(!t||!t.parentNode)return-1;for(;t=t.previousElementSibling;)"TEMPLATE"===t.nodeName.toUpperCase()||t===jt.clone||e&&!f(t,e)||n++;return n}function E(t){var e=0,n=0,o=O();if(t)do{var i=b(t),r=i.a,i=i.d}while(e+=t.scrollLeft*r,n+=t.scrollTop*i,t!==o&&(t=t.parentNode));return[e,n]}function M(t,e){if(!t||!t.getBoundingClientRect)return O();var n=t,o=!1;do{if(n.clientWidth<n.scrollWidth||n.clientHeight<n.scrollHeight){var i=R(n);if(n.clientWidth<n.scrollWidth&&("auto"==i.overflowX||"scroll"==i.overflowX)||n.clientHeight<n.scrollHeight&&("auto"==i.overflowY||"scroll"==i.overflowY)){if(!n.getBoundingClientRect||n===document.body)return O();if(o||e)return n;o=!0}}}while(n=n.parentNode);return O()}function S(t,e){return Math.round(t.top)===Math.round(e.top)&&Math.round(t.left)===Math.round(e.left)&&Math.round(t.height)===Math.round(e.height)&&Math.round(t.width)===Math.round(e.width)}function _(e,n){return function(){var t;m||(1===(t=arguments).length?e.call(this,t[0]):e.apply(this,t),m=setTimeout(function(){m=void 0},n))}}function H(t,e,n){t.scrollLeft+=e,t.scrollTop+=n}function C(t){var e=window.Polymer,n=window.jQuery||window.Zepto;return e&&e.dom?e.dom(t).cloneNode(!0):n?n(t).clone(!0)[0]:t.cloneNode(!0)}function T(t,e){R(t,"position","absolute"),R(t,"top",e.top),R(t,"left",e.left),R(t,"width",e.width),R(t,"height",e.height)}function x(t){R(t,"position",""),R(t,"top",""),R(t,"left",""),R(t,"width",""),R(t,"height","")}function L(n,o,i){var r={};return Array.from(n.children).forEach(function(t){var e;P(t,o.draggable,n,!1)&&!t.animated&&t!==i&&(e=X(t),r.left=Math.min(null!==(t=r.left)&&void 0!==t?t:1/0,e.left),r.top=Math.min(null!==(t=r.top)&&void 0!==t?t:1/0,e.top),r.right=Math.max(null!==(t=r.right)&&void 0!==t?t:-1/0,e.right),r.bottom=Math.max(null!==(t=r.bottom)&&void 0!==t?t:-1/0,e.bottom))}),r.width=r.right-r.left,r.height=r.bottom-r.top,r.x=r.left,r.y=r.top,r}var K="Sortable"+(new Date).getTime();function A(){var e,o=[];return{captureAnimationState:function(){o=[],this.options.animation&&[].slice.call(this.el.children).forEach(function(t){var e,n;"none"!==R(t,"display")&&t!==jt.ghost&&(o.push({target:t,rect:X(t)}),e=I({},o[o.length-1].rect),!t.thisAnimationDuration||(n=b(t,!0))&&(e.top-=n.f,e.left-=n.e),t.fromRect=e)})},addAnimationState:function(t){o.push(t)},removeAnimationState:function(t){o.splice(function(t,e){for(var n in t)if(t.hasOwnProperty(n))for(var o in e)if(e.hasOwnProperty(o)&&e[o]===t[n][o])return Number(n);return-1}(o,{target:t}),1)},animateAll:function(t){var c=this;if(!this.options.animation)return clearTimeout(e),void("function"==typeof t&&t());var u=!1,d=0;o.forEach(function(t){var e=0,n=t.target,o=n.fromRect,i=X(n),r=n.prevFromRect,a=n.prevToRect,l=t.rect,s=b(n,!0);s&&(i.top-=s.f,i.left-=s.e),n.toRect=i,n.thisAnimationDuration&&S(r,i)&&!S(o,i)&&(l.top-i.top)/(l.left-i.left)==(o.top-i.top)/(o.left-i.left)&&(t=l,s=r,r=a,a=c.options,e=Math.sqrt(Math.pow(s.top-t.top,2)+Math.pow(s.left-t.left,2))/Math.sqrt(Math.pow(s.top-r.top,2)+Math.pow(s.left-r.left,2))*a.animation),S(i,o)||(n.prevFromRect=o,n.prevToRect=i,e=e||c.options.animation,c.animate(n,l,i,e)),e&&(u=!0,d=Math.max(d,e),clearTimeout(n.animationResetTimer),n.animationResetTimer=setTimeout(function(){n.animationTime=0,n.prevFromRect=null,n.fromRect=null,n.prevToRect=null,n.thisAnimationDuration=null},e),n.thisAnimationDuration=e)}),clearTimeout(e),u?e=setTimeout(function(){"function"==typeof t&&t()},d):"function"==typeof t&&t(),o=[]},animate:function(t,e,n,o){var i,r;o&&(R(t,"transition",""),R(t,"transform",""),i=(r=b(this.el))&&r.a,r=r&&r.d,i=(e.left-n.left)/(i||1),r=(e.top-n.top)/(r||1),t.animatingX=!!i,t.animatingY=!!r,R(t,"transform","translate3d("+i+"px,"+r+"px,0)"),this.forRepaintDummy=t.offsetWidth,R(t,"transition","transform "+o+"ms"+(this.options.easing?" "+this.options.easing:"")),R(t,"transform","translate3d(0,0,0)"),"number"==typeof t.animated&&clearTimeout(t.animated),t.animated=setTimeout(function(){R(t,"transition",""),R(t,"transform",""),t.animated=!1,t.animatingX=!1,t.animatingY=!1},o))}}}var N=[],W={initializeByDefault:!0},z={mount:function(e){for(var t in W)!W.hasOwnProperty(t)||t in e||(e[t]=W[t]);N.forEach(function(t){if(t.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")}),N.push(e)},pluginEvent:function(e,n,o){var t=this;this.eventCanceled=!1,o.cancel=function(){t.eventCanceled=!0};var i=e+"Global";N.forEach(function(t){n[t.pluginName]&&(n[t.pluginName][i]&&n[t.pluginName][i](I({sortable:n},o)),n.options[t.pluginName]&&n[t.pluginName][e]&&n[t.pluginName][e](I({sortable:n},o)))})},initializePlugins:function(n,o,i,t){for(var e in N.forEach(function(t){var e=t.pluginName;(n.options[e]||t.initializeByDefault)&&((t=new t(n,o,n.options)).sortable=n,t.options=n.options,n[e]=t,a(i,t.defaults))}),n.options){var r;n.options.hasOwnProperty(e)&&(void 0!==(r=this.modifyOption(n,e,n.options[e]))&&(n.options[e]=r))}},getEventProperties:function(e,n){var o={};return N.forEach(function(t){"function"==typeof t.eventProperties&&a(o,t.eventProperties.call(n[t.pluginName],e))}),o},modifyOption:function(e,n,o){var i;return N.forEach(function(t){e[t.pluginName]&&t.optionListeners&&"function"==typeof t.optionListeners[n]&&(i=t.optionListeners[n].call(e[t.pluginName],o))}),i}};function G(t){var e=t.sortable,n=t.rootEl,o=t.name,i=t.targetEl,r=t.cloneEl,a=t.toEl,l=t.fromEl,s=t.oldIndex,c=t.newIndex,u=t.oldDraggableIndex,d=t.newDraggableIndex,h=t.originalEvent,p=t.putSortable,f=t.extraEventProperties;if(e=e||n&&n[K]){var g,m=e.options,t="on"+o.charAt(0).toUpperCase()+o.substr(1);!window.CustomEvent||y||w?(g=document.createEvent("Event")).initEvent(o,!0,!0):g=new CustomEvent(o,{bubbles:!0,cancelable:!0}),g.to=a||n,g.from=l||n,g.item=i||n,g.clone=r,g.oldIndex=s,g.newIndex=c,g.oldDraggableIndex=u,g.newDraggableIndex=d,g.originalEvent=h,g.pullMode=p?p.lastPutMode:void 0;var v,b=I(I({},f),z.getEventProperties(o,e));for(v in b)g[v]=b[v];n&&n.dispatchEvent(g),m[t]&&m[t].call(e,g)}}function U(t,e){var n=(o=2<arguments.length&&void 0!==arguments[2]?arguments[2]:{}).evt,o=i(o,q);z.pluginEvent.bind(jt)(t,e,I({dragEl:Z,parentEl:$,ghostEl:Q,rootEl:J,nextEl:tt,lastDownEl:et,cloneEl:nt,cloneHidden:ot,dragStarted:mt,putSortable:ct,activeSortable:jt.active,originalEvent:n,oldIndex:it,oldDraggableIndex:at,newIndex:rt,newDraggableIndex:lt,hideGhostForTarget:Xt,unhideGhostForTarget:Yt,cloneNowHidden:function(){ot=!0},cloneNowShown:function(){ot=!1},dispatchSortableEvent:function(t){V({sortable:e,name:t,originalEvent:n})}},o))}var q=["evt"];function V(t){G(I({putSortable:ct,cloneEl:nt,targetEl:Z,rootEl:J,oldIndex:it,oldDraggableIndex:at,newIndex:rt,newDraggableIndex:lt},t))}var Z,$,Q,J,tt,et,nt,ot,it,rt,at,lt,st,ct,ut,dt,ht,pt,ft,gt,mt,vt,bt,yt,wt,Dt=!1,Et=!1,St=[],_t=!1,Ct=!1,Tt=[],xt=!1,Ot=[],Mt="undefined"!=typeof document,At=c,Nt=w||y?"cssFloat":"float",It=Mt&&!n&&!c&&"draggable"in document.createElement("div"),Pt=function(){if(Mt){if(y)return!1;var t=document.createElement("x");return t.style.cssText="pointer-events:auto","auto"===t.style.pointerEvents}}(),kt=function(t,e){var n=R(t),o=parseInt(n.width)-parseInt(n.paddingLeft)-parseInt(n.paddingRight)-parseInt(n.borderLeftWidth)-parseInt(n.borderRightWidth),i=B(t,0,e),r=B(t,1,e),a=i&&R(i),l=r&&R(r),s=a&&parseInt(a.marginLeft)+parseInt(a.marginRight)+X(i).width,t=l&&parseInt(l.marginLeft)+parseInt(l.marginRight)+X(r).width;if("flex"===n.display)return"column"===n.flexDirection||"column-reverse"===n.flexDirection?"vertical":"horizontal";if("grid"===n.display)return n.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(i&&a.float&&"none"!==a.float){e="left"===a.float?"left":"right";return!r||"both"!==l.clear&&l.clear!==e?"horizontal":"vertical"}return i&&("block"===a.display||"flex"===a.display||"table"===a.display||"grid"===a.display||o<=s&&"none"===n[Nt]||r&&"none"===n[Nt]&&o<s+t)?"vertical":"horizontal"},Rt=function(t){function l(r,a){return function(t,e,n,o){var i=t.options.group.name&&e.options.group.name&&t.options.group.name===e.options.group.name;if(null==r&&(a||i))return!0;if(null==r||!1===r)return!1;if(a&&"clone"===r)return r;if("function"==typeof r)return l(r(t,e,n,o),a)(t,e,n,o);e=(a?t:e).options.group.name;return!0===r||"string"==typeof r&&r===e||r.join&&-1<r.indexOf(e)}}var e={},n=t.group;n&&"object"==o(n)||(n={name:n}),e.name=n.name,e.checkPull=l(n.pull,!0),e.checkPut=l(n.put),e.revertClone=n.revertClone,t.group=e},Xt=function(){!Pt&&Q&&R(Q,"display","none")},Yt=function(){!Pt&&Q&&R(Q,"display","")};Mt&&!n&&document.addEventListener("click",function(t){if(Et)return t.preventDefault(),t.stopPropagation&&t.stopPropagation(),t.stopImmediatePropagation&&t.stopImmediatePropagation(),Et=!1},!0);function Bt(t){if(Z){t=t.touches?t.touches[0]:t;var e=(i=t.clientX,r=t.clientY,St.some(function(t){var e=t[K].options.emptyInsertThreshold;if(e&&!F(t)){var n=X(t),o=i>=n.left-e&&i<=n.right+e,e=r>=n.top-e&&r<=n.bottom+e;return o&&e?a=t:void 0}}),a);if(e){var n,o={};for(n in t)t.hasOwnProperty(n)&&(o[n]=t[n]);o.target=o.rootEl=e,o.preventDefault=void 0,o.stopPropagation=void 0,e[K]._onDragOver(o)}}var i,r,a}function Ft(t){Z&&Z.parentNode[K]._isOutsideThisEl(t.target)}function jt(t,e){if(!t||!t.nodeType||1!==t.nodeType)throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(t));this.el=t,this.options=e=a({},e),t[K]=this;var n,o,i={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(t.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return kt(t,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(t,e){t.setData("Text",e.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:!1!==jt.supportPointer&&"PointerEvent"in window&&(!u||c),emptyInsertThreshold:5};for(n in z.initializePlugins(this,t,i),i)n in e||(e[n]=i[n]);for(o in Rt(e),this)"_"===o.charAt(0)&&"function"==typeof this[o]&&(this[o]=this[o].bind(this));this.nativeDraggable=!e.forceFallback&&It,this.nativeDraggable&&(this.options.touchStartThreshold=1),e.supportPointer?h(t,"pointerdown",this._onTapStart):(h(t,"mousedown",this._onTapStart),h(t,"touchstart",this._onTapStart)),this.nativeDraggable&&(h(t,"dragover",this),h(t,"dragenter",this)),St.push(this.el),e.store&&e.store.get&&this.sort(e.store.get(this)||[]),a(this,A())}function Ht(t,e,n,o,i,r,a,l){var s,c,u=t[K],d=u.options.onMove;return!window.CustomEvent||y||w?(s=document.createEvent("Event")).initEvent("move",!0,!0):s=new CustomEvent("move",{bubbles:!0,cancelable:!0}),s.to=e,s.from=t,s.dragged=n,s.draggedRect=o,s.related=i||e,s.relatedRect=r||X(e),s.willInsertAfter=l,s.originalEvent=a,t.dispatchEvent(s),c=d?d.call(u,s,a):c}function Lt(t){t.draggable=!1}function Kt(){xt=!1}function Wt(t){return setTimeout(t,0)}function zt(t){return clearTimeout(t)}jt.prototype={constructor:jt,_isOutsideThisEl:function(t){this.el.contains(t)||t===this.el||(vt=null)},_getDirection:function(t,e){return"function"==typeof this.options.direction?this.options.direction.call(this,t,e,Z):this.options.direction},_onTapStart:function(e){if(e.cancelable){var n=this,o=this.el,t=this.options,i=t.preventOnFilter,r=e.type,a=e.touches&&e.touches[0]||e.pointerType&&"touch"===e.pointerType&&e,l=(a||e).target,s=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||l,c=t.filter;if(!function(t){Ot.length=0;var e=t.getElementsByTagName("input"),n=e.length;for(;n--;){var o=e[n];o.checked&&Ot.push(o)}}(o),!Z&&!(/mousedown|pointerdown/.test(r)&&0!==e.button||t.disabled)&&!s.isContentEditable&&(this.nativeDraggable||!u||!l||"SELECT"!==l.tagName.toUpperCase())&&!((l=P(l,t.draggable,o,!1))&&l.animated||et===l)){if(it=j(l),at=j(l,t.draggable),"function"==typeof c){if(c.call(this,e,l,this))return V({sortable:n,rootEl:s,name:"filter",targetEl:l,toEl:o,fromEl:o}),U("filter",n,{evt:e}),void(i&&e.preventDefault())}else if(c=c&&c.split(",").some(function(t){if(t=P(s,t.trim(),o,!1))return V({sortable:n,rootEl:t,name:"filter",targetEl:l,fromEl:o,toEl:o}),U("filter",n,{evt:e}),!0}))return void(i&&e.preventDefault());t.handle&&!P(s,t.handle,o,!1)||this._prepareDragStart(e,a,l)}}},_prepareDragStart:function(t,e,n){var o,i=this,r=i.el,a=i.options,l=r.ownerDocument;n&&!Z&&n.parentNode===r&&(o=X(n),J=r,$=(Z=n).parentNode,tt=Z.nextSibling,et=n,st=a.group,ut={target:jt.dragged=Z,clientX:(e||t).clientX,clientY:(e||t).clientY},ft=ut.clientX-o.left,gt=ut.clientY-o.top,this._lastX=(e||t).clientX,this._lastY=(e||t).clientY,Z.style["will-change"]="all",o=function(){U("delayEnded",i,{evt:t}),jt.eventCanceled?i._onDrop():(i._disableDelayedDragEvents(),!s&&i.nativeDraggable&&(Z.draggable=!0),i._triggerDragStart(t,e),V({sortable:i,name:"choose",originalEvent:t}),k(Z,a.chosenClass,!0))},a.ignore.split(",").forEach(function(t){D(Z,t.trim(),Lt)}),h(l,"dragover",Bt),h(l,"mousemove",Bt),h(l,"touchmove",Bt),a.supportPointer?(h(l,"pointerup",i._onDrop),this.nativeDraggable||h(l,"pointercancel",i._onDrop)):(h(l,"mouseup",i._onDrop),h(l,"touchend",i._onDrop),h(l,"touchcancel",i._onDrop)),s&&this.nativeDraggable&&(this.options.touchStartThreshold=4,Z.draggable=!0),U("delayStart",this,{evt:t}),!a.delay||a.delayOnTouchOnly&&!e||this.nativeDraggable&&(w||y)?o():jt.eventCanceled?this._onDrop():(a.supportPointer?(h(l,"pointerup",i._disableDelayedDrag),h(l,"pointercancel",i._disableDelayedDrag)):(h(l,"mouseup",i._disableDelayedDrag),h(l,"touchend",i._disableDelayedDrag),h(l,"touchcancel",i._disableDelayedDrag)),h(l,"mousemove",i._delayedDragTouchMoveHandler),h(l,"touchmove",i._delayedDragTouchMoveHandler),a.supportPointer&&h(l,"pointermove",i._delayedDragTouchMoveHandler),i._dragStartTimer=setTimeout(o,a.delay)))},_delayedDragTouchMoveHandler:function(t){t=t.touches?t.touches[0]:t;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){Z&&Lt(Z),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var t=this.el.ownerDocument;p(t,"mouseup",this._disableDelayedDrag),p(t,"touchend",this._disableDelayedDrag),p(t,"touchcancel",this._disableDelayedDrag),p(t,"pointerup",this._disableDelayedDrag),p(t,"pointercancel",this._disableDelayedDrag),p(t,"mousemove",this._delayedDragTouchMoveHandler),p(t,"touchmove",this._delayedDragTouchMoveHandler),p(t,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(t,e){e=e||"touch"==t.pointerType&&t,!this.nativeDraggable||e?this.options.supportPointer?h(document,"pointermove",this._onTouchMove):h(document,e?"touchmove":"mousemove",this._onTouchMove):(h(Z,"dragend",this),h(J,"dragstart",this._onDragStart));try{document.selection?Wt(function(){document.selection.empty()}):window.getSelection().removeAllRanges()}catch(e){try{ErrorBus.capture(e,"catch#AUTO_48")}catch(_){}}},_dragStarted:function(t,e){var n;Dt=!1,J&&Z?(U("dragStarted",this,{evt:e}),this.nativeDraggable&&h(document,"dragover",Ft),n=this.options,t||k(Z,n.dragClass,!1),k(Z,n.ghostClass,!0),jt.active=this,t&&this._appendGhost(),V({sortable:this,name:"start",originalEvent:e})):this._nulling()},_emulateDragOver:function(){if(dt){this._lastX=dt.clientX,this._lastY=dt.clientY,Xt();for(var t=document.elementFromPoint(dt.clientX,dt.clientY),e=t;t&&t.shadowRoot&&(t=t.shadowRoot.elementFromPoint(dt.clientX,dt.clientY))!==e;)e=t;if(Z.parentNode[K]._isOutsideThisEl(t),e)do{if(e[K])if(e[K]._onDragOver({clientX:dt.clientX,clientY:dt.clientY,target:t,rootEl:e})&&!this.options.dragoverBubble)break}while(e=g(t=e));Yt()}},_onTouchMove:function(t){if(ut){var e=this.options,n=e.fallbackTolerance,o=e.fallbackOffset,i=t.touches?t.touches[0]:t,r=Q&&b(Q,!0),a=Q&&r&&r.a,l=Q&&r&&r.d,e=At&&wt&&E(wt),a=(i.clientX-ut.clientX+o.x)/(a||1)+(e?e[0]-Tt[0]:0)/(a||1),l=(i.clientY-ut.clientY+o.y)/(l||1)+(e?e[1]-Tt[1]:0)/(l||1);if(!jt.active&&!Dt){if(n&&Math.max(Math.abs(i.clientX-this._lastX),Math.abs(i.clientY-this._lastY))<n)return;this._onDragStart(t,!0)}Q&&(r?(r.e+=a-(ht||0),r.f+=l-(pt||0)):r={a:1,b:0,c:0,d:1,e:a,f:l},r="matrix(".concat(r.a,",").concat(r.b,",").concat(r.c,",").concat(r.d,",").concat(r.e,",").concat(r.f,")"),R(Q,"webkitTransform",r),R(Q,"mozTransform",r),R(Q,"msTransform",r),R(Q,"transform",r),ht=a,pt=l,dt=i),t.cancelable&&t.preventDefault()}},_appendGhost:function(){if(!Q){var t=this.options.fallbackOnBody?document.body:J,e=X(Z,!0,At,!0,t),n=this.options;if(At){for(wt=t;"static"===R(wt,"position")&&"none"===R(wt,"transform")&&wt!==document;)wt=wt.parentNode;wt!==document.body&&wt!==document.documentElement?(wt===document&&(wt=O()),e.top+=wt.scrollTop,e.left+=wt.scrollLeft):wt=O(),Tt=E(wt)}k(Q=Z.cloneNode(!0),n.ghostClass,!1),k(Q,n.fallbackClass,!0),k(Q,n.dragClass,!0),R(Q,"transition",""),R(Q,"transform",""),R(Q,"box-sizing","border-box"),R(Q,"margin",0),R(Q,"top",e.top),R(Q,"left",e.left),R(Q,"width",e.width),R(Q,"height",e.height),R(Q,"opacity","0.8"),R(Q,"position",At?"absolute":"fixed"),R(Q,"zIndex","100000"),R(Q,"pointerEvents","none"),jt.ghost=Q,t.appendChild(Q),R(Q,"transform-origin",ft/parseInt(Q.style.width)*100+"% "+gt/parseInt(Q.style.height)*100+"%")}},_onDragStart:function(t,e){var n=this,o=t.dataTransfer,i=n.options;U("dragStart",this,{evt:t}),jt.eventCanceled?this._onDrop():(U("setupClone",this),jt.eventCanceled||((nt=C(Z)).removeAttribute("id"),nt.draggable=!1,nt.style["will-change"]="",this._hideClone(),k(nt,this.options.chosenClass,!1),jt.clone=nt),n.cloneId=Wt(function(){U("clone",n),jt.eventCanceled||(n.options.removeCloneOnHide||J.insertBefore(nt,Z),n._hideClone(),V({sortable:n,name:"clone"}))}),e||k(Z,i.dragClass,!0),e?(Et=!0,n._loopId=setInterval(n._emulateDragOver,50)):(p(document,"mouseup",n._onDrop),p(document,"touchend",n._onDrop),p(document,"touchcancel",n._onDrop),o&&(o.effectAllowed="move",i.setData&&i.setData.call(n,o,Z)),h(document,"drop",n),R(Z,"transform","translateZ(0)")),Dt=!0,n._dragStartId=Wt(n._dragStarted.bind(n,e,t)),h(document,"selectstart",n),mt=!0,window.getSelection().removeAllRanges(),u&&R(document.body,"user-select","none"))},_onDragOver:function(n){var o,i,r,t,e,a=this.el,l=n.target,s=this.options,c=s.group,u=jt.active,d=st===c,h=s.sort,p=ct||u,f=this,g=!1;if(!xt){if(void 0!==n.preventDefault&&n.cancelable&&n.preventDefault(),l=P(l,s.draggable,a,!0),O("dragOver"),jt.eventCanceled)return g;if(Z.contains(n.target)||l.animated&&l.animatingX&&l.animatingY||f._ignoreWhileAnimating===l)return A(!1);if(Et=!1,u&&!s.disabled&&(d?h||(i=$!==J):ct===this||(this.lastPutMode=st.checkPull(this,u,Z,n))&&c.checkPut(this,u,Z,n))){if(r="vertical"===this._getDirection(n,l),o=X(Z),O("dragOverValid"),jt.eventCanceled)return g;if(i)return $=J,M(),this._hideClone(),O("revert"),jt.eventCanceled||(tt?J.insertBefore(Z,tt):J.appendChild(Z)),A(!0);var m=F(a,s.draggable);if(m&&(S=n,c=r,x=X(F((E=this).el,E.options.draggable)),E=L(E.el,E.options,Q),!(c?S.clientX>E.right+10||S.clientY>x.bottom&&S.clientX>x.left:S.clientY>E.bottom+10||S.clientX>x.right&&S.clientY>x.top)||m.animated)){if(m&&(t=n,e=r,C=X(B((_=this).el,0,_.options,!0)),_=L(_.el,_.options,Q),e?t.clientX<_.left-10||t.clientY<C.top&&t.clientX<C.right:t.clientY<_.top-10||t.clientY<C.bottom&&t.clientX<C.left)){var v=B(a,0,s,!0);if(v===Z)return A(!1);if(D=X(l=v),!1!==Ht(J,a,Z,o,l,D,n,!1))return M(),a.insertBefore(Z,v),$=a,N(),A(!0)}else if(l.parentNode===a){var b,y,w,D=X(l),E=Z.parentNode!==a,S=(S=Z.animated&&Z.toRect||o,x=l.animated&&l.toRect||D,_=(e=r)?S.left:S.top,t=e?S.right:S.bottom,C=e?S.width:S.height,v=e?x.left:x.top,S=e?x.right:x.bottom,x=e?x.width:x.height,!(_===v||t===S||_+C/2===v+x/2)),_=r?"top":"left",C=Y(l,"top","top")||Y(Z,"top","top"),v=C?C.scrollTop:void 0;if(vt!==l&&(y=D[_],_t=!1,Ct=!S&&s.invertSwap||E),0!==(b=function(t,e,n,o,i,r,a,l){var s=o?t.clientY:t.clientX,c=o?n.height:n.width,t=o?n.top:n.left,o=o?n.bottom:n.right,n=!1;if(!a)if(l&&yt<c*i){if(_t=!_t&&(1===bt?t+c*r/2<s:s<o-c*r/2)?!0:_t)n=!0;else if(1===bt?s<t+yt:o-yt<s)return-bt}else if(t+c*(1-i)/2<s&&s<o-c*(1-i)/2)return function(t){return j(Z)<j(t)?1:-1}(e);if((n=n||a)&&(s<t+c*r/2||o-c*r/2<s))return t+c/2<s?1:-1;return 0}(n,l,D,r,S?1:s.swapThreshold,null==s.invertedSwapThreshold?s.swapThreshold:s.invertedSwapThreshold,Ct,vt===l)))for(var T=j(Z);(w=$.children[T-=b])&&("none"===R(w,"display")||w===Q););if(0===b||w===l)return A(!1);bt=b;var x=(vt=l).nextElementSibling,E=!1,S=Ht(J,a,Z,o,l,D,n,E=1===b);if(!1!==S)return 1!==S&&-1!==S||(E=1===S),xt=!0,setTimeout(Kt,30),M(),E&&!x?a.appendChild(Z):l.parentNode.insertBefore(Z,E?x:l),C&&H(C,0,v-C.scrollTop),$=Z.parentNode,void 0===y||Ct||(yt=Math.abs(y-X(l)[_])),N(),A(!0)}}else{if(m===Z)return A(!1);if((l=m&&a===n.target?m:l)&&(D=X(l)),!1!==Ht(J,a,Z,o,l,D,n,!!l))return M(),m&&m.nextSibling?a.insertBefore(Z,m.nextSibling):a.appendChild(Z),$=a,N(),A(!0)}if(a.contains(Z))return A(!1)}return!1}function O(t,e){U(t,f,I({evt:n,isOwner:d,axis:r?"vertical":"horizontal",revert:i,dragRect:o,targetRect:D,canSort:h,fromSortable:p,target:l,completed:A,onMove:function(t,e){return Ht(J,a,Z,o,t,X(t),n,e)},changed:N},e))}function M(){O("dragOverAnimationCapture"),f.captureAnimationState(),f!==p&&p.captureAnimationState()}function A(t){return O("dragOverCompleted",{insertion:t}),t&&(d?u._hideClone():u._showClone(f),f!==p&&(k(Z,(ct||u).options.ghostClass,!1),k(Z,s.ghostClass,!0)),ct!==f&&f!==jt.active?ct=f:f===jt.active&&ct&&(ct=null),p===f&&(f._ignoreWhileAnimating=l),f.animateAll(function(){O("dragOverAnimationComplete"),f._ignoreWhileAnimating=null}),f!==p&&(p.animateAll(),p._ignoreWhileAnimating=null)),(l===Z&&!Z.animated||l===a&&!l.animated)&&(vt=null),s.dragoverBubble||n.rootEl||l===document||(Z.parentNode[K]._isOutsideThisEl(n.target),t||Bt(n)),!s.dragoverBubble&&n.stopPropagation&&n.stopPropagation(),g=!0}function N(){rt=j(Z),lt=j(Z,s.draggable),V({sortable:f,name:"change",toEl:a,newIndex:rt,newDraggableIndex:lt,originalEvent:n})}},_ignoreWhileAnimating:null,_offMoveEvents:function(){p(document,"mousemove",this._onTouchMove),p(document,"touchmove",this._onTouchMove),p(document,"pointermove",this._onTouchMove),p(document,"dragover",Bt),p(document,"mousemove",Bt),p(document,"touchmove",Bt)},_offUpEvents:function(){var t=this.el.ownerDocument;p(t,"mouseup",this._onDrop),p(t,"touchend",this._onDrop),p(t,"pointerup",this._onDrop),p(t,"pointercancel",this._onDrop),p(t,"touchcancel",this._onDrop),p(document,"selectstart",this)},_onDrop:function(t){var e=this.el,n=this.options;rt=j(Z),lt=j(Z,n.draggable),U("drop",this,{evt:t}),$=Z&&Z.parentNode,rt=j(Z),lt=j(Z,n.draggable),jt.eventCanceled||(_t=Ct=Dt=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),zt(this.cloneId),zt(this._dragStartId),this.nativeDraggable&&(p(document,"drop",this),p(e,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),u&&R(document.body,"user-select",""),R(Z,"transform",""),t&&(mt&&(t.cancelable&&t.preventDefault(),n.dropBubble||t.stopPropagation()),Q&&Q.parentNode&&Q.parentNode.removeChild(Q),(J===$||ct&&"clone"!==ct.lastPutMode)&&nt&&nt.parentNode&&nt.parentNode.removeChild(nt),Z&&(this.nativeDraggable&&p(Z,"dragend",this),Lt(Z),Z.style["will-change"]="",mt&&!Dt&&k(Z,(ct||this).options.ghostClass,!1),k(Z,this.options.chosenClass,!1),V({sortable:this,name:"unchoose",toEl:$,newIndex:null,newDraggableIndex:null,originalEvent:t}),J!==$?(0<=rt&&(V({rootEl:$,name:"add",toEl:$,fromEl:J,originalEvent:t}),V({sortable:this,name:"remove",toEl:$,originalEvent:t}),V({rootEl:$,name:"sort",toEl:$,fromEl:J,originalEvent:t}),V({sortable:this,name:"sort",toEl:$,originalEvent:t})),ct&&ct.save()):rt!==it&&0<=rt&&(V({sortable:this,name:"update",toEl:$,originalEvent:t}),V({sortable:this,name:"sort",toEl:$,originalEvent:t})),jt.active&&(null!=rt&&-1!==rt||(rt=it,lt=at),V({sortable:this,name:"end",toEl:$,originalEvent:t}),this.save())))),this._nulling()},_nulling:function(){U("nulling",this),J=Z=$=Q=tt=nt=et=ot=ut=dt=mt=rt=lt=it=at=vt=bt=ct=st=jt.dragged=jt.ghost=jt.clone=jt.active=null,Ot.forEach(function(t){t.checked=!0}),Ot.length=ht=pt=0},handleEvent:function(t){switch(t.type){case"drop":case"dragend":this._onDrop(t);break;case"dragenter":case"dragover":Z&&(this._onDragOver(t),function(t){t.dataTransfer&&(t.dataTransfer.dropEffect="move");t.cancelable&&t.preventDefault()}(t));break;case"selectstart":t.preventDefault()}},toArray:function(){for(var t,e=[],n=this.el.children,o=0,i=n.length,r=this.options;o<i;o++)P(t=n[o],r.draggable,this.el,!1)&&e.push(t.getAttribute(r.dataIdAttr)||function(t){var e=t.tagName+t.className+t.src+t.href+t.textContent,n=e.length,o=0;for(;n--;)o+=e.charCodeAt(n);return o.toString(36)}(t));return e},sort:function(t,e){var n={},o=this.el;this.toArray().forEach(function(t,e){e=o.children[e];P(e,this.options.draggable,o,!1)&&(n[t]=e)},this),e&&this.captureAnimationState(),t.forEach(function(t){n[t]&&(o.removeChild(n[t]),o.appendChild(n[t]))}),e&&this.animateAll()},save:function(){var t=this.options.store;t&&t.set&&t.set(this)},closest:function(t,e){return P(t,e||this.options.draggable,this.el,!1)},option:function(t,e){var n=this.options;if(void 0===e)return n[t];var o=z.modifyOption(this,t,e);n[t]=void 0!==o?o:e,"group"===t&&Rt(n)},destroy:function(){U("destroy",this);var t=this.el;t[K]=null,p(t,"mousedown",this._onTapStart),p(t,"touchstart",this._onTapStart),p(t,"pointerdown",this._onTapStart),this.nativeDraggable&&(p(t,"dragover",this),p(t,"dragenter",this)),Array.prototype.forEach.call(t.querySelectorAll("[draggable]"),function(t){t.removeAttribute("draggable")}),this._onDrop(),this._disableDelayedDragEvents(),St.splice(St.indexOf(this.el),1),this.el=t=null},_hideClone:function(){ot||(U("hideClone",this),jt.eventCanceled||(R(nt,"display","none"),this.options.removeCloneOnHide&&nt.parentNode&&nt.parentNode.removeChild(nt),ot=!0))},_showClone:function(t){"clone"===t.lastPutMode?ot&&(U("showClone",this),jt.eventCanceled||(Z.parentNode!=J||this.options.group.revertClone?tt?J.insertBefore(nt,tt):J.appendChild(nt):J.insertBefore(nt,Z),this.options.group.revertClone&&this.animate(Z,nt),R(nt,"display",""),ot=!1)):this._hideClone()}},Mt&&h(document,"touchmove",function(t){(jt.active||Dt)&&t.cancelable&&t.preventDefault()}),jt.utils={on:h,off:p,css:R,find:D,is:function(t,e){return!!P(t,e,t,!1)},extend:function(t,e){if(t&&e)for(var n in e)e.hasOwnProperty(n)&&(t[n]=e[n]);return t},throttle:_,closest:P,toggleClass:k,clone:C,index:j,nextTick:Wt,cancelNextTick:zt,detectDirection:kt,getChild:B,expando:K},jt.get=function(t){return t[K]},jt.mount=function(){for(var t=arguments.length,e=new Array(t),n=0;n<t;n++)e[n]=arguments[n];(e=e[0].constructor===Array?e[0]:e).forEach(function(t){if(!t.prototype||!t.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(t));t.utils&&(jt.utils=I(I({},jt.utils),t.utils)),z.mount(t)})},jt.create=function(t,e){return new jt(t,e)};var Gt,Ut,qt,Vt,Zt,$t,Qt=[],Jt=!(jt.version="1.15.6");function te(){Qt.forEach(function(t){clearInterval(t.pid)}),Qt=[]}function ee(){clearInterval($t)}var ne,oe=_(function(n,t,e,o){if(t.scroll){var i,r=(n.touches?n.touches[0]:n).clientX,a=(n.touches?n.touches[0]:n).clientY,l=t.scrollSensitivity,s=t.scrollSpeed,c=O(),u=!1;Ut!==e&&(Ut=e,te(),Gt=t.scroll,i=t.scrollFn,!0===Gt&&(Gt=M(e,!0)));var d=0,h=Gt;do{var p=h,f=X(p),g=f.top,m=f.bottom,v=f.left,b=f.right,y=f.width,w=f.height,D=void 0,E=void 0,S=p.scrollWidth,_=p.scrollHeight,C=R(p),T=p.scrollLeft,f=p.scrollTop,E=p===c?(D=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX||"visible"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY||"visible"===C.overflowY)):(D=y<S&&("auto"===C.overflowX||"scroll"===C.overflowX),w<_&&("auto"===C.overflowY||"scroll"===C.overflowY)),T=D&&(Math.abs(b-r)<=l&&T+y<S)-(Math.abs(v-r)<=l&&!!T),f=E&&(Math.abs(m-a)<=l&&f+w<_)-(Math.abs(g-a)<=l&&!!f);if(!Qt[d])for(var x=0;x<=d;x++)Qt[x]||(Qt[x]={});Qt[d].vx==T&&Qt[d].vy==f&&Qt[d].el===p||(Qt[d].el=p,Qt[d].vx=T,Qt[d].vy=f,clearInterval(Qt[d].pid),0==T&&0==f||(u=!0,Qt[d].pid=setInterval(function(){o&&0===this.layer&&jt.active._onTouchMove(Zt);var t=Qt[this.layer].vy?Qt[this.layer].vy*s:0,e=Qt[this.layer].vx?Qt[this.layer].vx*s:0;"function"==typeof i&&"continue"!==i.call(jt.dragged.parentNode[K],e,t,n,Zt,Qt[this.layer].el)||H(Qt[this.layer].el,e,t)}.bind({layer:d}),24))),d++}while(t.bubbleScroll&&h!==c&&(h=M(h,!1)));Jt=u}},30),n=function(t){var e=t.originalEvent,n=t.putSortable,o=t.dragEl,i=t.activeSortable,r=t.dispatchSortableEvent,a=t.hideGhostForTarget,t=t.unhideGhostForTarget;e&&(i=n||i,a(),e=e.changedTouches&&e.changedTouches.length?e.changedTouches[0]:e,e=document.elementFromPoint(e.clientX,e.clientY),t(),i&&!i.el.contains(e)&&(r("spill"),this.onSpill({dragEl:o,putSortable:n})))};function ie(){}function re(){}ie.prototype={startIndex:null,dragStart:function(t){t=t.oldDraggableIndex;this.startIndex=t},onSpill:function(t){var e=t.dragEl,n=t.putSortable;this.sortable.captureAnimationState(),n&&n.captureAnimationState();t=B(this.sortable.el,this.startIndex,this.options);t?this.sortable.el.insertBefore(e,t):this.sortable.el.appendChild(e),this.sortable.animateAll(),n&&n.animateAll()},drop:n},a(ie,{pluginName:"revertOnSpill"}),re.prototype={onSpill:function(t){var e=t.dragEl,t=t.putSortable||this.sortable;t.captureAnimationState(),e.parentNode&&e.parentNode.removeChild(e),t.animateAll()},drop:n},a(re,{pluginName:"removeOnSpill"});var ae,le,se,ce,ue,de=[],he=[],pe=!1,fe=!1,ge=!1;function me(n,o){he.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)})}function ve(){de.forEach(function(t){t!==se&&t.parentNode&&t.parentNode.removeChild(t)})}return jt.mount(new function(){function t(){for(var t in this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0},this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this))}return t.prototype={dragStarted:function(t){t=t.originalEvent;this.sortable.nativeDraggable?h(document,"dragover",this._handleAutoScroll):this.options.supportPointer?h(document,"pointermove",this._handleFallbackAutoScroll):t.touches?h(document,"touchmove",this._handleFallbackAutoScroll):h(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(t){t=t.originalEvent;this.options.dragOverBubble||t.rootEl||this._handleAutoScroll(t)},drop:function(){this.sortable.nativeDraggable?p(document,"dragover",this._handleAutoScroll):(p(document,"pointermove",this._handleFallbackAutoScroll),p(document,"touchmove",this._handleFallbackAutoScroll),p(document,"mousemove",this._handleFallbackAutoScroll)),ee(),te(),clearTimeout(m),m=void 0},nulling:function(){Zt=Ut=Gt=Jt=$t=qt=Vt=null,Qt.length=0},_handleFallbackAutoScroll:function(t){this._handleAutoScroll(t,!0)},_handleAutoScroll:function(e,n){var o,i=this,r=(e.touches?e.touches[0]:e).clientX,a=(e.touches?e.touches[0]:e).clientY,t=document.elementFromPoint(r,a);Zt=e,n||this.options.forceAutoScrollFallback||w||y||u?(oe(e,this.options,t,n),o=M(t,!0),!Jt||$t&&r===qt&&a===Vt||($t&&ee(),$t=setInterval(function(){var t=M(document.elementFromPoint(r,a),!0);t!==o&&(o=t,te()),oe(e,i.options,t,n)},10),qt=r,Vt=a)):this.options.bubbleScroll&&M(t,!0)!==O()?oe(e,this.options,M(t,!1),!1):te()}},a(t,{pluginName:"scroll",initializeByDefault:!0})}),jt.mount(re,ie),jt.mount(new function(){function t(){this.defaults={swapClass:"sortable-swap-highlight"}}return t.prototype={dragStart:function(t){t=t.dragEl;ne=t},dragOverValid:function(t){var e=t.completed,n=t.target,o=t.onMove,i=t.activeSortable,r=t.changed,a=t.cancel;i.options.swap&&(t=this.sortable.el,i=this.options,n&&n!==t&&(t=ne,ne=!1!==o(n)?(k(n,i.swapClass,!0),n):null,t&&t!==ne&&k(t,i.swapClass,!1)),r(),e(!0),a())},drop:function(t){var e,n,o=t.activeSortable,i=t.putSortable,r=t.dragEl,a=i||this.sortable,l=this.options;ne&&k(ne,l.swapClass,!1),ne&&(l.swap||i&&i.options.swap)&&r!==ne&&(a.captureAnimationState(),a!==o&&o.captureAnimationState(),n=ne,t=(e=r).parentNode,l=n.parentNode,t&&l&&!t.isEqualNode(n)&&!l.isEqualNode(e)&&(i=j(e),r=j(n),t.isEqualNode(l)&&i<r&&r++,t.insertBefore(n,t.children[i]),l.insertBefore(e,l.children[r])),a.animateAll(),a!==o&&o.animateAll())},nulling:function(){ne=null}},a(t,{pluginName:"swap",eventProperties:function(){return{swapItem:ne}}})}),jt.mount(new function(){function t(o){for(var t in this)"_"===t.charAt(0)&&"function"==typeof this[t]&&(this[t]=this[t].bind(this));o.options.avoidImplicitDeselect||(o.options.supportPointer?h(document,"pointerup",this._deselectMultiDrag):(h(document,"mouseup",this._deselectMultiDrag),h(document,"touchend",this._deselectMultiDrag))),h(document,"keydown",this._checkKeyDown),h(document,"keyup",this._checkKeyUp),this.defaults={selectedClass:"sortable-selected",multiDragKey:null,avoidImplicitDeselect:!1,setData:function(t,e){var n="";de.length&&le===o?de.forEach(function(t,e){n+=(e?", ":"")+t.textContent}):n=e.textContent,t.setData("Text",n)}}}return t.prototype={multiDragKeyDown:!1,isMultiDrag:!1,delayStartGlobal:function(t){t=t.dragEl;se=t},delayEnded:function(){this.isMultiDrag=~de.indexOf(se)},setupClone:function(t){var e=t.sortable,t=t.cancel;if(this.isMultiDrag){for(var n=0;n<de.length;n++)he.push(C(de[n])),he[n].sortableIndex=de[n].sortableIndex,he[n].draggable=!1,he[n].style["will-change"]="",k(he[n],this.options.selectedClass,!1),de[n]===se&&k(he[n],this.options.chosenClass,!1);e._hideClone(),t()}},clone:function(t){var e=t.sortable,n=t.rootEl,o=t.dispatchSortableEvent,t=t.cancel;this.isMultiDrag&&(this.options.removeCloneOnHide||de.length&&le===e&&(me(!0,n),o("clone"),t()))},showClone:function(t){var e=t.cloneNowShown,n=t.rootEl,t=t.cancel;this.isMultiDrag&&(me(!1,n),he.forEach(function(t){R(t,"display","")}),e(),ue=!1,t())},hideClone:function(t){var e=this,n=(t.sortable,t.cloneNowHidden),t=t.cancel;this.isMultiDrag&&(he.forEach(function(t){R(t,"display","none"),e.options.removeCloneOnHide&&t.parentNode&&t.parentNode.removeChild(t)}),n(),ue=!0,t())},dragStartGlobal:function(t){t.sortable;!this.isMultiDrag&&le&&le.multiDrag._deselectMultiDrag(),de.forEach(function(t){t.sortableIndex=j(t)}),de=de.sort(function(t,e){return t.sortableIndex-e.sortableIndex}),ge=!0},dragStarted:function(t){var e,n=this,t=t.sortable;this.isMultiDrag&&(this.options.sort&&(t.captureAnimationState(),this.options.animation&&(de.forEach(function(t){t!==se&&R(t,"position","absolute")}),e=X(se,!1,!0,!0),de.forEach(function(t){t!==se&&T(t,e)}),pe=fe=!0)),t.animateAll(function(){pe=fe=!1,n.options.animation&&de.forEach(function(t){x(t)}),n.options.sort&&ve()}))},dragOver:function(t){var e=t.target,n=t.completed,t=t.cancel;fe&&~de.indexOf(e)&&(n(!1),t())},revert:function(t){var n,o,e=t.fromSortable,i=t.rootEl,r=t.sortable,a=t.dragRect;1<de.length&&(de.forEach(function(t){r.addAnimationState({target:t,rect:fe?X(t):a}),x(t),t.fromRect=a,e.removeAnimationState(t)}),fe=!1,n=!this.options.removeCloneOnHide,o=i,de.forEach(function(t,e){e=o.children[t.sortableIndex+(n?Number(e):0)];e?o.insertBefore(t,e):o.appendChild(t)}))},dragOverCompleted:function(t){var e,n=t.sortable,o=t.isOwner,i=t.insertion,r=t.activeSortable,a=t.parentEl,l=t.putSortable,t=this.options;i&&(o&&r._hideClone(),pe=!1,t.animation&&1<de.length&&(fe||!o&&!r.options.sort&&!l)&&(e=X(se,!1,!0,!0),de.forEach(function(t){t!==se&&(T(t,e),a.appendChild(t))}),fe=!0),o||(fe||ve(),1<de.length?(o=ue,r._showClone(n),r.options.animation&&!ue&&o&&he.forEach(function(t){r.addAnimationState({target:t,rect:ce}),t.fromRect=ce,t.thisAnimationDuration=null})):r._showClone(n)))},dragOverAnimationCapture:function(t){var e=t.dragRect,n=t.isOwner,t=t.activeSortable;de.forEach(function(t){t.thisAnimationDuration=null}),t.options.animation&&!n&&t.multiDrag.isMultiDrag&&(ce=a({},e),e=b(se,!0),ce.top-=e.f,ce.left-=e.e)},dragOverAnimationComplete:function(){fe&&(fe=!1,ve())},drop:function(t){var o,i,r,a,n,e,l,s=t.originalEvent,c=t.rootEl,u=t.parentEl,d=t.sortable,h=t.dispatchSortableEvent,p=t.oldIndex,t=t.putSortable,f=t||this.sortable;s&&(o=this.options,i=u.children,ge||(o.multiDragKey&&!this.multiDragKeyDown&&this._deselectMultiDrag(),k(se,o.selectedClass,!~de.indexOf(se)),~de.indexOf(se)?(de.splice(de.indexOf(se),1),ae=null,G({sortable:d,rootEl:c,name:"deselect",targetEl:se,originalEvent:s})):(de.push(se),G({sortable:d,rootEl:c,name:"select",targetEl:se,originalEvent:s}),s.shiftKey&&ae&&d.el.contains(ae)?(r=j(ae),a=j(se),~r&&~a&&r!==a&&function(){for(var e,t=r<a?(e=r,a):(e=a,r+1),n=o.filter;e<t;e++)~de.indexOf(i[e])||P(i[e],o.draggable,u,!1)&&(n&&("function"==typeof n?n.call(d,s,i[e],d):n.split(",").some(function(t){return P(i[e],t.trim(),u,!1)}))||(k(i[e],o.selectedClass,!0),de.push(i[e]),G({sortable:d,rootEl:c,name:"select",targetEl:i[e],originalEvent:s})))}()):ae=se,le=f)),ge&&this.isMultiDrag&&(fe=!1,(u[K].options.sort||u!==c)&&1<de.length&&(n=X(se),e=j(se,":not(."+this.options.selectedClass+")"),!pe&&o.animation&&(se.thisAnimationDuration=null),f.captureAnimationState(),pe||(o.animation&&(se.fromRect=n,de.forEach(function(t){var e;t.thisAnimationDuration=null,t!==se&&(e=fe?X(t):n,t.fromRect=e,f.addAnimationState({target:t,rect:e}))})),ve(),de.forEach(function(t){i[e]?u.insertBefore(t,i[e]):u.appendChild(t),e++}),p===j(se)&&(l=!1,de.forEach(function(t){t.sortableIndex!==j(t)&&(l=!0)}),l&&(h("update"),h("sort")))),de.forEach(function(t){x(t)}),f.animateAll()),le=f),(c===u||t&&"clone"!==t.lastPutMode)&&he.forEach(function(t){t.parentNode&&t.parentNode.removeChild(t)}))},nullingGlobal:function(){this.isMultiDrag=ge=!1,he.length=0},destroyGlobal:function(){this._deselectMultiDrag(),p(document,"pointerup",this._deselectMultiDrag),p(document,"mouseup",this._deselectMultiDrag),p(document,"touchend",this._deselectMultiDrag),p(document,"keydown",this._checkKeyDown),p(document,"keyup",this._checkKeyUp)},_deselectMultiDrag:function(t){if(!(void 0!==ge&&ge||le!==this.sortable||t&&P(t.target,this.options.draggable,this.sortable.el,!1)||t&&0!==t.button))for(;de.length;){var e=de[0];k(e,this.options.selectedClass,!1),de.shift(),G({sortable:this.sortable,rootEl:this.sortable.el,name:"deselect",targetEl:e,originalEvent:t})}},_checkKeyDown:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!0)},_checkKeyUp:function(t){t.key===this.options.multiDragKey&&(this.multiDragKeyDown=!1)}},a(t,{pluginName:"multiDrag",utils:{select:function(t){var e=t.parentNode[K];e&&e.options.multiDrag&&!~de.indexOf(t)&&(le&&le!==e&&(le.multiDrag._deselectMultiDrag(),le=e),k(t,e.options.selectedClass,!0),de.push(t))},deselect:function(t){var e=t.parentNode[K],n=de.indexOf(t);e&&e.options.multiDrag&&~n&&(k(t,e.options.selectedClass,!1),de.splice(n,1))}},eventProperties:function(){var n=this,o=[],i=[];return de.forEach(function(t){var e;o.push({multiDragElement:t,index:t.sortableIndex}),e=fe&&t!==se?-1:fe?j(t,":not(."+n.options.selectedClass+")"):j(t),i.push({multiDragElement:t,index:e})}),{items:r(de),clones:[].concat(he),oldIndicies:o,newIndicies:i}},optionListeners:{multiDragKey:function(t){return"ctrl"===(t=t.toLowerCase())?t="Control":1<t.length&&(t=t.charAt(0).toUpperCase()+t.substr(1)),t}}})}),jt});

// ════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════
//  APPLICATION VERSION & BUILD INFO
// ════════════════════════════════════════════════════════
const APP_VERSION = '10.4.0';
const APP_BUILD = '2026-05-05';
const APP_DB_VERSION = 3;  // V10: IndexedDB schema version — added _primary_version tracking

//  V7 FOUNDATION — PubSub Store + Migration + SortableJS init helpers
//  (Injected 2026-04-24 — See v7-development-plan.md for rationale)
// ════════════════════════════════════════════════════════

// ─── Q1: PubSub Store ──────────────────────────────────────
// Central state event bus. Lightweight (no Redux, no Proxy).
// Usage:
//   Store.subscribe('SCORE_CHANGE', (payload)=>{...});
//   Store.dispatch('SCORE_CHANGE', {teamId, delta});
// Backward-compatible: existing code that mutates `state` directly
// still works; new code should dispatch through Store.
const Store=(function(){
  const listeners=new Map();  // eventName → [fn, ...]
  const history=[];           // last 50 dispatched actions (debug)
  const MAX_SUBSCRIBERS_PER_EVENT=50;  // V11: Prevent memory leaks from repeated subscriptions
  return{
    subscribe(event,fn){
      if(!listeners.has(event))listeners.set(event,[]);
      const arr=listeners.get(event);
      // V11: Check for duplicate subscriptions (same event + same function)
      if(arr.indexOf(fn)>=0)return ()=>{};  // Already subscribed, skip
      // V11: Limit subscribers per event to prevent memory leaks
      if(arr.length>=MAX_SUBSCRIBERS_PER_EVENT){
        if(typeof ErrorBus!=='undefined')ErrorBus.capture(new Error('Max subscribers reached for: '+event),'Store.subscribe');
        return ()=>{};
      }
      arr.push(fn);
      return ()=>{  // unsubscribe
        const a=listeners.get(event);
        if(!a)return;
        const i=a.indexOf(fn);
        if(i>=0)a.splice(i,1);
      };
    },
    dispatch(event,payload){
      history.push({t:Date.now(),event,payload});
      if(history.length>50)history.shift();
      const arr=listeners.get(event);
      if(!arr)return;
      // V11: Wrap each subscriber call in try/catch so one failing subscriber doesn't break others
      arr.forEach(fn=>{
        try{fn(payload);}
        catch(e){if(typeof ErrorBus!=='undefined')ErrorBus.capture(e,'Store:'+event);else console.error('[Store]',event,e);}
      });
    },
    // V11: Unsubscribe all listeners for cleanup
    unsubscribeAll(){
      listeners.clear();
    },
    getHistory(){return[...history];},
    _listenersCount(){return Array.from(listeners.entries()).map(([k,v])=>[k,v.length]);}
  };
})();

// ─── Minimal ErrorBus (pre-T-2.1, for Store safety) ───────
// Full T-2.1 will replace the 46 empty catch blocks. For now,
// provide a sink so Store callbacks don't crash silently.
var _suppressStartupToasts=true;
setTimeout(function(){_suppressStartupToasts=false;},5000);
const ErrorBus=(function(){
  const log=[];
  // Only show toast for critical contexts, not AUTO catch blocks
  function _shouldShowToast(context){
    if(!context)return false;
    var ctx=String(context).toLowerCase();
    // Always show toast for FATAL/CRITICAL/user-action contexts
    if(ctx.indexOf('fatal')!==-1||ctx.indexOf('critical')!==-1||ctx.indexOf('user-action')!==-1)return true;
    // Suppress toasts for auto-generated catch blocks (catch#AUTO_N)
    if(/^catch#auto_/i.test(ctx))return false;
    // Suppress toasts for EventDelegate errors (they are non-critical handler errors)
    if(ctx.indexOf('eventdelegate')!==-1)return false;
    // Suppress toasts for common non-critical contexts
    if(ctx.indexOf('silent-catch')!==-1)return false;
    // For other contexts, show toast (e.g. explicit ErrorBus.capture calls with custom context)
    return true;
  }
  return{
    capture(err,context){
      const entry={t:Date.now(),context:context||'unknown',msg:(err&&err.message)||String(err),stack:err&&err.stack};
      console.error('['+entry.context+']',err);
      log.push(entry);
      if(log.length>100)log.shift();
      if(!_suppressStartupToasts&&_shouldShowToast(context)){
        try{if(typeof toast==='function')toast(I18n.t('toast.errorIn')+entry.context,'danger');}catch(e){/* silently ignore toast errors */}
      }
    },
    getLog(){return[...log];},
    clear(){log.length=0;}
  };
})();

// ── Silent Error Logger: replaces empty catch blocks ──
// Usage: catch(e){_logErr(e,'context')} instead of catch(_){}
// For truly ignorable errors (audio autoplay, already-stopped nodes), use catch(_){} which is fine.
// For data-critical operations (localStorage, IDB), always log.
const _logErr=function(err,context){
  if(typeof ErrorBus!=='undefined'&&ErrorBus.capture){
    ErrorBus.capture(err instanceof Error?err:new Error(String(err)),context||'silent-catch');
  }else{
    console.warn('[SilentCatch:'+context+']',err);
  }
};
// CONVENTION: 
// - catch(_){} = intentionally ignorable error (audio autoplay, already-stopped nodes, UI animation)
// - catch(e){_logErr(e,'ctx')} = error should be logged but not thrown (data operations, storage)
// - Future: migrate remaining catch(_){} to _logErr where appropriate

/* ════════════════════════════════════════════════════════
 *  EVENT DELEGATION SYSTEM — replaces inline onclick/onchange/oninput
 *  Register handlers by data-action attribute, uses event
 *  delegation on document.body for automatic cleanup and
 *  better performance than N individual listeners.
 * ════════════════════════════════════════════════════════ */
const EventDelegate=(function(){
  const _handlers=new Map();   // action → {event, handler, selector}
  const _bound=new Set();      // track bound event types

  function _getAction(el){
    // Walk up from el to find nearest data-action
    var node=el;
    while(node&&node!==document.body){
      var action=node.getAttribute&&node.getAttribute('data-action');
      if(action)return{action:action,el:node};
      node=node.parentElement;
    }
    return null;
  }

  function _dispatch(evt){
    var info=_getAction(evt.target);
    if(!info)return;
    var cfg=_handlers.get(info.action);
    if(!cfg)return;
    // If selector specified, check match
    if(cfg.selector&&!info.el.matches(cfg.selector))return;
    try{
      cfg.handler(evt,info.el);
    }catch(e){try{ErrorBus.capture(e,'EventDelegate:'+info.action)}catch(_){}}
  }

  return{
    /* Register a handler for a data-action name
     * @param {string} action - value of data-action attribute
     * @param {Function} handler - function(evt, el)
     * @param {object} [opts] - {event:'click'|'change'|'input'|..., selector:'.class'}
     */
    on:function(action,handler,opts){
      opts=opts||{};
      var eventType=opts.event||'click';
      _handlers.set(action,{handler:handler,selector:opts.selector||null,event:eventType});
      // Bind delegation listener for this event type if not already bound
      if(!_bound.has(eventType)){
        document.body.addEventListener(eventType,_dispatch,false);
        _bound.add(eventType);
      }
      return this;
    },
    /* Remove a handler */
    off:function(action){
      _handlers.delete(action);
      return this;
    },
    /* NOTE: migrateInline() has been REMOVED.
     * It used new Function() which broke scope access for handlers
     * that depended on outer variables. Inline onclick handlers are
     * intentionally kept as-is. Use EventDelegate.on() for new code. */
    /* Check if an action is registered */
    has:function(action){return _handlers.has(action);},
    /* Get all registered action names */
    actions:function(){return Array.from(_handlers.keys());}
  };
})();

/* ── EventDelegate: Key registrations for common inline actions ──
 *  These provide typed, debuggable handlers that replace the most
 *  common inline onclick patterns.  The migrateInline() call at
 *  startup handles everything else automatically.
 */
EventDelegate
  .on('show-login',   function(e,el){showView('login');})
  .on('show-intro',   function(e,el){showView('intro');})
  .on('show-admin',   function(e,el){showView('admin');})
  .on('show-teams',   function(e,el){showView('teams');})
  .on('show-scores',  function(e,el){showView('scores');})
  .on('show-credits', function(e,el){showView('credits');})
  .on('show-categories',function(e,el){showView('categories');})
  .on('show-teamstats',function(e,el){showView('teamstats');})
  .on('go-back',      function(e,el){showView(window._prevView||'scores');});

// ─── T-3.6: TimerRegistry (memory-leak prevention) ───
// Wraps setInterval/setTimeout so each timer has a context and can be purged en masse.
// Called automatically on view changes and beforeunload.
const TimerRegistry=(function(){
  const timers=new Map();  // id → {type, handle, context}
  let _idGen=0;
  return{
    setInterval(fn,ms,context){
      // V11: Clear any existing timer with the same context to prevent race conditions
      if(context)this.clearByContext(context);
      const id='ti_'+(++_idGen);
      const handle=window.setInterval(function(){try{fn()}catch(e){ErrorBus.capture(e,'timer:'+context)}},ms);
      timers.set(id,{type:'interval',handle,context:context||'unknown'});
      return id;
    },
    setTimeout(fn,ms,context){
      // V11: Clear any existing timer with the same context to prevent race conditions
      if(context)this.clearByContext(context);
      const id='to_'+(++_idGen);
      const handle=window.setTimeout(function(){
        try{fn()}catch(e){ErrorBus.capture(e,'timer:'+context)}
        finally{timers.delete(id);}
      },ms);
      timers.set(id,{type:'timeout',handle,context:context||'unknown'});
      return id;
    },
    clear(id){
      const t=timers.get(id);
      if(!t)return false;
      if(t.type==='interval')clearInterval(t.handle);
      else clearTimeout(t.handle);
      timers.delete(id);
      return true;
    },
    clearByContext(ctx){
      let n=0;
      for(const [id,t] of timers){
        if(t.context===ctx){
          if(t.type==='interval')clearInterval(t.handle);
          else clearTimeout(t.handle);
          timers.delete(id);
          n++;
        }
      }
      return n;
    },
    clearAll(){
      let n=0;
      for(const [id,t] of timers){
        if(t.type==='interval')clearInterval(t.handle);
        else clearTimeout(t.handle);
        n++;
      }
      timers.clear();
      return n;
    },
    size(){return timers.size;},
    list(){return Array.from(timers.entries()).map(([id,t])=>({id,type:t.type,context:t.context}));}
  };
})();

// Auto-clear registered timers on view change and before unload
window.addEventListener('beforeunload',function(){try{TimerRegistry.clearAll();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_50")}catch(_){}}});

// ─── T-1.3: AudioMixer — centralized audio channel coordinator ───
// 6 channels: bgm (background music), sfx (correct/wrong), wheel (spin music),
// question (audio question), tense (timer tension), podium (victory).
// Rule: playing on a channel STOPS whatever was previously on that channel.
const AudioMixer=(function(){
  const channels={bgm:null,sfx:null,wheel:null,question:null,tense:null,podium:null};
  const bgmState={wasPlayingBeforeDuck:false,duckedBy:null};
  
  function _stopNode(node){
    if(!node)return;
    try{
      if(typeof node.pause==='function'){node.pause();try{node.currentTime=0;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_51")}catch(_){}}}
      // V11: Release media resource to prevent memory leaks
      try{node.src='';node.load();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_52")}catch(_){}}
      if(typeof node.stop==='function')node.stop();
      if(typeof node.disconnect==='function')try{node.disconnect();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_53")}catch(_){}}
    }catch(e){ErrorBus.capture(e,'AudioMixer:_stopNode');}
  }
  
  return{
    // Play an audio src on a channel. Returns the created Audio element (or null).
    // opts: {loop, volume (0-1), onEnd, src (required if node not provided), node}
    play(channel,opts){
      opts=opts||{};
      if(!(channel in channels)){ErrorBus.capture(new Error('Unknown channel: '+channel),'AudioMixer.play');return null;}
      // Stop previous
      this.stop(channel);
      let node;
      if(opts.node){node=opts.node;}
      else if(opts.src){
        try{
          node=new Audio(opts.src);
          if(opts.loop)node.loop=true;
          if(typeof opts.volume==='number')node.volume=Math.max(0,Math.min(1,opts.volume));
          if(typeof opts.onEnd==='function')node.addEventListener('ended',opts.onEnd,{once:true});
          // V11: Always release src on ended to prevent memory leaks
          node.addEventListener('ended',function(){try{this.src='';this.load();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_54")}catch(_){}}},{once:true});
          node.play().catch(e=>{ErrorBus.capture(e,'AudioMixer.play:'+channel);});
        }catch(e){ErrorBus.capture(e,'AudioMixer.play:ctor');return null;}
      }
      channels[channel]=node;
      return node;
    },
    // Register an already-playing node on a channel (for legacy integration)
    register(channel,node){
      if(!(channel in channels))return false;
      // V10-fix: skip stop() if the same node is already registered — prevents destroying the node being re-registered
      if(channels[channel]!==node) this.stop(channel);
      channels[channel]=node;
      return true;
    },
    stop(channel){
      if(!(channel in channels))return false;
      if(channels[channel]){_stopNode(channels[channel]);channels[channel]=null;}
      return true;
    },
    stopAll(){
      Object.keys(channels).forEach(c=>this.stop(c));
      bgmState.duckedBy=null;bgmState.wasPlayingBeforeDuck=false;
    },
    isPlaying(channel){return !!channels[channel];},
    get(channel){return channels[channel]||null;},
    // Duck the BGM to a lower volume while another channel plays; restore on unduck.
    duck(byChannel,toVolume){
      if(!channels.bgm)return false;
      if(bgmState.duckedBy)return false;  // already ducked
      bgmState.duckedBy=byChannel;
      bgmState.prevVolume=channels.bgm.volume;
      try{channels.bgm.volume=Math.max(0,Math.min(1,toVolume||0.2));}catch(e){try{ErrorBus.capture(e,"catch#AUTO_55")}catch(_){}}
      return true;
    },
    unduck(byChannel){
      if(bgmState.duckedBy!==byChannel)return false;
      if(channels.bgm&&typeof bgmState.prevVolume==='number'){
        try{channels.bgm.volume=bgmState.prevVolume;}catch(e){try{ErrorBus.capture(e,"catch#AUTO_56")}catch(_){}}
      }
      bgmState.duckedBy=null;
      return true;
    },
    // Clean up only ended/paused channels without stopping active playback
    cleanup(){
      Object.keys(channels).forEach(c=>{
        const n=channels[c];
        if(n&&(n.ended||n.paused)){_stopNode(n);channels[c]=null;}
      });
    },
    // State snapshot for diagnostics
    snapshot(){
      const out={};
      Object.keys(channels).forEach(c=>{
        const n=channels[c];
        out[c]=n?{active:true,paused:n.paused===true,volume:n.volume,currentTime:n.currentTime}:null;
      });
      return out;
    }
  };
})();

// V11: Periodic audio cleanup (every 5 minutes) — releases ended audio resources
// V10-fix: Register with TimerRegistry for clean shutdown
TimerRegistry.setInterval(function(){
  try{
    // Only clean up ended audio resources, NOT actively playing or legitimately paused ones
    AudioMixer.cleanup();
    // Clean up any dangling audio elements that have ended (not paused — paused could be intentional)
    var _audioEls=document.querySelectorAll('audio');
    var _protectedEls=new Set([window._qAudioEl,window._quranAudio,window._tenseAudioEl,_customMusicEl].filter(Boolean));
    _audioEls.forEach(function(el){
      if(el.ended&&!_protectedEls.has(el)){
        try{el.src='';el.load();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_57")}catch(_){}}
      }
    });
  }catch(e){try{ErrorBus.capture(e,"catch#AUTO_58")}catch(_){}}
},300000,'audio-cleanup');

// Tracks whether BGM was playing before a wheel spin or admin panel open
// so we can resume it afterwards (T-6.2.b, T-6.4).

// ─── M3: NotificationManager — Web Notifications wrapper ───
const NotificationManager=(function(){
  let permission=typeof Notification!=='undefined'?Notification.permission:'denied';
  let hasAsked=false;
  function isSupported(){return typeof Notification!=='undefined';}
  function getPermission(){return isSupported()?Notification.permission:'unsupported';}
  async function request(){
    if(!isSupported())return 'unsupported';
    if(Notification.permission==='granted')return 'granted';
    if(Notification.permission==='denied')return 'denied';
    hasAsked=true;
    try{
      const result=await Notification.requestPermission();
      permission=result;
      return result;
    }catch(e){ErrorBus.capture(e,'Notification.request');return 'error';}
  }
  function notify(title,opts){
    if(!isSupported())return null;
    if(Notification.permission!=='granted')return null;
    // Don't notify if document is visible (user is here — no need)
    if(!document.hidden&&opts&&opts.skipIfVisible!==false)return null;
    try{
      const n=new Notification(title,Object.assign({
        icon:'',  // optional icon
        silent:false,
        requireInteraction:false
      },opts||{}));
      // Auto-close after 5s
      TimerRegistry.setTimeout(function(){try{n.close();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_59")}catch(_){}}},5000,'notify:'+title);
      return n;
    }catch(e){ErrorBus.capture(e,'Notification.create');return null;}
  }
  return{isSupported,getPermission,request,notify};
})();

// Subscribe to timer-end event to send notification when tab is backgrounded

// V7 M3: UI helper for the permission button
async function _requestNotificationPermission(){
  const btn=document.getElementById('btn-notif-permission');
  const status=document.getElementById('notif-perm-status');
  if(!NotificationManager.isSupported()){
    if(status)status.textContent=I18n.t('admin.notSupported')||'❌ غير مدعوم';
    if(btn)btn.disabled=true;
    return;
  }
  const current=NotificationManager.getPermission();
  if(current==='granted'){
    if(status)status.textContent=I18n.t('admin.enabled')||'✅ مُفعَّل';
    if(btn)btn.disabled=true;
    return;
  }
  if(current==='denied'){
    if(status)status.textContent=I18n.t('admin.denied')||'❌ مرفوض';
    return;
  }
  const result=await NotificationManager.request();
  if(result==='granted'){
    if(status)status.textContent=I18n.t('admin.enabled')||'✅ مُفعَّل';
    if(btn)btn.disabled=true;
    toast(I18n.t('toast.notificationsEnabled'),'success');
  }else{
    if(status)status.textContent=I18n.t('admin.rejected')||'❌ تم الرفض';
  }
}
// Auto-update button label on page load
document.addEventListener('DOMContentLoaded',function(){
  TimerRegistry.setTimeout(function(){
    const btn=document.getElementById('btn-notif-permission');
    const status=document.getElementById('notif-perm-status');
    if(!btn||!status)return;
    if(!NotificationManager.isSupported()){status.textContent=I18n.t('admin.notSupported')||'❌ غير مدعوم';btn.disabled=true;return;}
    const p=NotificationManager.getPermission();
    if(p==='granted'){status.textContent=I18n.t('admin.enabled')||'✅ مُفعَّل';btn.disabled=true;}
    else if(p==='denied'){status.textContent=I18n.t('admin.deniedShort')||'❌ مرفوض';}
    else{status.textContent=I18n.t('admin.clickToEnable')||'اضغط للتفعيل';}
  },500,'notif:ui-init');
});

Store.subscribe('TIMER_ENDED',function(payload){
  if(NotificationManager.getPermission()==='granted'&&document.hidden){
    NotificationManager.notify('⏰ انتهى الوقت',{
      body:payload&&payload.teamName?'انتهى وقت فريق '+payload.teamName:'انتهى الوقت للسؤال الحالي',
      tag:'quiz-timer-end'
    });
  }
});

const BgmResumeTracker={
  _wasPlaying:false,
  snapshot(){this._wasPlaying=!!(typeof state!=='undefined'&&state&&state.musicPlaying);return this._wasPlaying;},
  restore(){
    if(this._wasPlaying&&typeof startMusic==='function'&&typeof state!=='undefined'&&state&&!state.musicPlaying){
      try{startMusic(state.settings.musicType||'ambient');}catch(e){ErrorBus.capture(e,'BgmResume');}
    }
    this._wasPlaying=false;
  }
};

window.addEventListener('beforeunload',function(){try{AudioMixer.stopAll();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_60")}catch(_){}}});


// ─── T-3.1: ActionLock — prevent double-click / race conditions ───
const ActionLock=(function(){
  const locked=new Map();  // key → timestamp released
  return{
    isLocked(key){return locked.has(key);},
    run(key,fn,cooldown){
      cooldown=cooldown||500;
      if(locked.has(key))return{locked:true};
      locked.set(key,Date.now()+cooldown);
      try{const result=fn();return{locked:false,result};}
      catch(e){ErrorBus.capture(e,'ActionLock:'+key);return{locked:false,error:e};}
      finally{
        TimerRegistry.setTimeout(function(){locked.delete(key);},cooldown,'ActionLock:'+key);
      }
    },
    forceRelease(key){return locked.delete(key);},
    size(){return locked.size;}
  };
})();

// ─── T-2.2: Score validation + audit log ───
// Single chokepoint for ALL score mutations.
// Existing applyScore() is wrapped below (backward-compatible).
const _SCORE_AUDIT_MAX=500;
function changeScore(team,delta,reason){
  // Validation
  if(!team||typeof team!=='object'){ErrorBus.capture(new Error('changeScore: invalid team'),'changeScore');return false;}
  if(!Number.isFinite(delta)){ErrorBus.capture(new Error('changeScore: non-finite delta '+delta),'changeScore');return false;}
  if(Math.abs(delta)>100000){ErrorBus.capture(new Error('changeScore: delta out of range '+delta),'changeScore');return false;}
  if(delta===0)return false;
  const currentScore=(team.score||0);
  const newScore=Math.max(-99999,Math.min(99999,currentScore+delta));
  if(newScore===currentScore)return false;
  // Audit
  state.scoreAudit=state.scoreAudit||[];
  state.scoreAudit.push({t:Date.now(),teamId:team.id,before:currentScore,after:newScore,delta,reason:reason||'manual'});
  if(state.scoreAudit.length>_SCORE_AUDIT_MAX)state.scoreAudit.shift();
  // Apply
  team.score=newScore;
  // Notify
  try{Store.dispatch('SCORE_CHANGE',{teamId:team.id,before:currentScore,after:newScore,delta,reason});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_61")}catch(_){}}
  // ARIA announcement for screen readers
  try{announceToARIA((team.name||'')+' : '+newScore);}catch(e){try{ErrorBus.capture(e,"catch#AUTO_62")}catch(_){}}
  // Refresh team stats if visible
  try{refreshTeamStatsIfVisible();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_63")}catch(_){}}
  return true;
}
function undoLastScoreChange(){
  const audit=state.scoreAudit||[];
  if(audit.length===0){if(typeof toast==='function')toast(I18n.t('toast.noChangesToUndo'),'info');return false;}
  const last=audit[audit.length-1];
  const team=(state.teams||[]).find(t=>t.id===last.teamId);
  if(!team){audit.pop();return false;}
  team.score=last.before;
  audit.pop();
  try{Store.dispatch('SCORE_CHANGE',{teamId:team.id,before:last.after,after:last.before,delta:-(last.delta),reason:'undo'});}catch(e){try{ErrorBus.capture(e,"catch#AUTO_64")}catch(_){}}
  // V10-fix: Log save failures instead of silently swallowing
  try{saveState();}catch(e){console.warn('[saveState] Failed in undoScore:',e);}
  try{refreshTeamStatsIfVisible();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_65")}catch(_){}}
  if(typeof toast==='function')toast(I18n.t('toast.undone')+(last.delta>0?'+':'')+last.delta,'info');
  return true;
}
function getScoreAudit(limit){const a=state.scoreAudit||[];return limit?a.slice(-limit):a.slice();}


window.addEventListener('error',e=>ErrorBus.capture(e.error||new Error(e.message),'window.error'));
window.addEventListener('unhandledrejection',e=>ErrorBus.capture(e.reason||new Error('unhandled promise'),'promise'));

// ─── Q2: SortableJS helper (offline-bundled above) ─────────
// Initializes Sortable on a container and wires a callback.
// Replaces native HTML5 DnD which fails on iOS touch.
function initSortable(container,opts){
  if(!container)return null;
  if(typeof Sortable==='undefined'){console.warn('[Sortable] library not loaded');return null;}
  // If already initialized, destroy first (re-render case)
  if(container._sortable){try{container._sortable.destroy();}catch(e){try{ErrorBus.capture(e,"catch#AUTO_66")}catch(_){}}container._sortable=null;}
  const defaults={
    animation:150,
    ghostClass:'sortable-ghost',
    chosenClass:'sortable-chosen',
    dragClass:'sortable-drag',
    delay:150,           // hold-to-drag (mobile-friendly)
    delayOnTouchOnly:true,
    touchStartThreshold:5,
    forceFallback:false
  };
  try{
    const s=Sortable.create(container,Object.assign({},defaults,opts||{}));
    container._sortable=s;
    return s;
  }catch(e){ErrorBus.capture(e,'initSortable');return null;}
}

// ─── Q4: Migration from V4/V5/V6 keys + 7-day backup ──────
const MigrationV7=(function(){
  const BACKUP_KEY='quiz_v7_migration_backup';
  const BACKUP_TTL_DAYS=7;
  // V10-fix: Only include truly obsolete keys — NOT current keys like quiz_v4, quiz_v4_progress, etc.
  const OLD_KEYS=['quiz_v3','quiz_platform_v2'];
  
  function hasOldData(){
    return OLD_KEYS.some(k=>{try{return localStorage.getItem(k)!==null;}catch(e){_logErr(e,'localStorage:hasOldData');return false;}});
  }
  function snapshotOldData(){
    const snap={t:Date.now(),version:'v6-pre-migration',keys:{}};
    OLD_KEYS.forEach(k=>{try{const v=localStorage.getItem(k);if(v!==null)snap.keys[k]=v;}catch(e){_logErr(e,'localStorage:snapshotOldData')}});
    return snap;
  }
  function migrate(){
    if(!hasOldData()){return{migrated:false,reason:'no-old-keys'};}
    try{
      // Step 1: backup
      const snap=snapshotOldData();
      try{
        localStorage.setItem(BACKUP_KEY,JSON.stringify(snap));
      }catch(backupErr){
        // Backup failed (likely quota) — skip backup, still mark migration
        try{localStorage.removeItem(BACKUP_KEY);}catch(e){_logErr(e,'localStorage:removeBackup')}
      }
      // Step 2: mark migration (new keys already primary in this version)
      localStorage.setItem('quiz_v7_migrated_at',String(Date.now()));
      // Step 3: DO NOT delete old keys yet — loadState() still reads them as fallback.
      // They'll be pruned after 7 days (below).
      console.info('[MigrationV7] migration completed (backup '+(localStorage.getItem(BACKUP_KEY)?'created':'skipped')+')');
      return{migrated:true,backedUp:!!localStorage.getItem(BACKUP_KEY)};
    }catch(e){
      try{ErrorBus.capture(e,'MigrationV7.migrate');}catch(e2){_logErr(e2,'MigrationV7:migrate-inner')}
      return{migrated:false,error:String(e)};
    }
  }
  function pruneOldBackup(){
    try{
      const raw=localStorage.getItem(BACKUP_KEY);
      if(!raw)return false;
      const snap=JSON.parse(raw);
      const ageDays=(Date.now()-(snap.t||0))/86400000;
      if(ageDays>=BACKUP_TTL_DAYS){
        // Delete backup AND old keys (they've had 7 days of grace)
        localStorage.removeItem(BACKUP_KEY);
        OLD_KEYS.forEach(k=>{try{localStorage.removeItem(k);}catch(e){_logErr(e,'localStorage:pruneOldKeys')}});
        console.info('[MigrationV7] pruned backup ('+ageDays.toFixed(1)+' days old) and cleaned old keys');
        return true;
      }
      return false;
    }catch(_){return false;}
  }
  function restoreFromBackup(){
    try{
      const raw=localStorage.getItem(BACKUP_KEY);
      if(!raw){if(typeof toast==='function')toast(I18n.t('toast.noBackupToRestore'),'danger');return false;}
      const snap=JSON.parse(raw);
      Object.entries(snap.keys||{}).forEach(([k,v])=>{try{localStorage.setItem(k,v);}catch(e){_logErr(e,'localStorage:restoreKey')}});
      if(typeof toast==='function')toast(I18n.t('toast.backupRestored'),'success');
      return true;
    }catch(e){ErrorBus.capture(e,'MigrationV7.restore');return false;}
  }
  function daysUntilPrune(){
    try{
      const raw=localStorage.getItem(BACKUP_KEY);
      if(!raw)return null;
      const snap=JSON.parse(raw);
      const ageDays=(Date.now()-(snap.t||0))/86400000;
      return Math.max(0,BACKUP_TTL_DAYS-ageDays);
    }catch(_){return null;}
  }
  return{migrate,pruneOldBackup,restoreFromBackup,hasOldData,daysUntilPrune,BACKUP_KEY,BACKUP_TTL_DAYS};
})();
// Auto-run on load (silent on unexpected failures, first-boot defensive)
(function(){
  try{localStorage.getItem('___probe___');}catch(e){_logErr(e,'localStorage:probe');return;}
  try{MigrationV7.pruneOldBackup();}catch(e){_logErr(e,'MigrationV7:pruneAutoRun')}
  try{MigrationV7.migrate();}catch(e){_logErr(e,'MigrationV7:migrateAutoRun')}
})();

// V15.2: Safe global stubs to prevent ReferenceErrors from script dependency loading orders
window._pushRemoteState = window._pushRemoteState || function() {};

// ─── END V7 FOUNDATION ─────────────────────────────────────
