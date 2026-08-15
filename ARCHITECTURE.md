# 🏗️ ARCHITECTURE.md — بنية المشروع

> **الإصدار**: V15.0 · **آخر تحديث**: أغسطس 2026
> هذا الملف يشرح البنية التقنية للمشروع لمساعدة المطورين الجدد على الفهم في أقل من ساعة.

---

## 📑 فهرس المحتويات

1. [نظرة عامة على البنية](#1-نظرة-عامة-على-البنية)
2. [تدفق البيانات](#2-تدفق-البيانات)
3. [نمط IIFE المشترك](#3-نمط-iife-المشترك)
4. [ترتيب تحميل الوحدات](#4-ترتيب-تحميل-الوحدات)
5. [طبقات التخزين](#5-طبقات-التخزين)
6. [نظام المزامنة بين النوافذ](#6-نظام-المزامنة-بين-النوافذ)
7. [نظام المؤقتات (TimerRegistry)](#7-نظام-المؤقتات-timerregistry)
8. [نظام الأحداث (Store / AppState)](#8-نظام-الأحداث-store--appstate)
9. [نظام إمكانية الوصول (A11y)](#9-نظام-إمكانية-الوصول-a11y)
10. [البناء كملف واحد](#10-البناء-كملف-واحد)
11. [قرارات معمارية مهمة](#11-قرارات-معمارية-مهمة)

---

## 1. نظرة عامة على البنية

```
┌─────────────────────────────────────────────────────────────┐
│                    index.html (نقطة الدخول)                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  <script src="/src/app/01-foundation.js"></script>   │   │
│  │  <script src="/src/app/02-storage.js"></script>      │   │
│  │  ... (44 وحدة بترتيب رقمي)                            │   │
│  │  <script src="/src/app/45-solo-enhancer.js"></script>│   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  <link rel="stylesheet" href="/src/styles/main.css"> │   │
│  │  ... (12 طبقة CSS)                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  <!-- __BODY_MARKER__ → يُستبدل بقالب body في البناء -->    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              المتصفح / تطبيق أندرويد (Capacitor)             │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ LocalStorage│  │  IndexedDB   │  │ BroadcastChannel   │  │
│  │ (الحالة)    │  │  (الوسائط)   │  │ (مزامنة النوافذ)   │  │
│  └────────────┘  └──────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. تدفق البيانات

```
[المستخدم يُحرّر] → [دالة mutation] → [saveState()]
                                            │
                                            ▼
                                    [_saveStateNow()]
                                            │
                              ┌─────────────┴─────────────┐
                              ▼                           ▼
                    [LocalStorage]              [IndexedDB]
                    (JSON مضغوط)               (الوسائط فقط)
                              │                           │
                              └─────────────┬─────────────┘
                                            ▼
                                    [_pushRemoteState()]
                                            │
                                            ▼
                                    [BroadcastChannel]
                                            │
                                            ▼
                              [شاشة الجمهور + التحكم عن بُعد]
```

### دورة الحفظ (Save Lifecycle)

1. **Mutation**: دالة مثل `saveCategory()` تعدّل `state.categories`
2. **`saveState()`**: debounced بـ 500ms (لتجميع التغييرات المتتالية)
3. **`_saveStateNow()`**: يفحص `_mediaDirty` flag
   - إذا true: يكتب إلى LocalStorage **و** IndexedDB (الوسائط)
   - إذا false: يكتب إلى LocalStorage فقط (تخطّي IDB)
4. **`_pushRemoteState()`**: يدفع الحالة عبر BroadcastChannel (غير متزامن)

---

## 3. نمط IIFE المشترك

```javascript
// src/app/02-storage.js
const MediaDB = window.MediaDB = (function() {
  const DB_NAME = 'quiz_media_v1';
  let _db = null;
  
  function open() { /* ... */ }
  
  return {
    set: async function(k, v) { /* ... */ },
    get: async function(k) { /* ... */ },
    // ...
  };
})();
```

### لماذا IIFE؟
- **النطاق المعجمي المشترك**: جميع الوحدات تصل لنفس `state`, `I18n`, `MediaDB` دون `import`
- **متطلبات ملف واحد**: نمط IIFE يُدمج بسهولة في ملف HTML واحد عبر Vite plugin
- **ترتيب تحميل صارم**: التبعيات تُحمَّل قبل المُعتمِدات (بالبادئة الرقمية)

### عيوب النمط (مُخطط لمعالجتها في المرحلة 2)
- لا يمكن الاختبار المعزول (يجب تحميل التبعيات أولاً)
- لا يمكن إعادة الاستخدام في مشاريع أخرى
- لا Tree-shaking (كل شيء في النطاق العام)

---

## 4. ترتيب تحميل الوحدات

الترتيب **حرج** — تغييره يكسر التطبيق. البادئة الرقمية تفرض الترتيب:

| البادئة | الوحدة | الغرض | التبعيات |
|---|---|---|---|
| `00-` | icon-library | أيقونات SVG | لا شيء |
| `01-` | foundation | APP_VERSION, Store, ErrorBus, TimerRegistry | لا شيء |
| `02-` | storage | MediaDB (IndexedDB) | foundation |
| `03-` | media-helpers | مساعدات الوسائط | storage |
| `04-` | i18n | التدويل | foundation |
| `05-` | audio-assets | الأصوات المضمّنة | foundation |
| `06-` | compression | LZ-String | foundation |
| `07-` | state-mgmt | AppState, state object | foundation, i18n |
| `08-` | question-mgmt | CRUD الأسئلة | state, storage |
| `09-` | team-mgmt | CRUD الفرق | state, storage |
| `10-` | category-mgmt | CRUD الأقسام + saveState | state, storage, compression |
| `11-` | builtin-library | مكتبة الأسئلة | state |
| `11-` | play-logic | تدفق اللعبة | كل ما سبق |
| `12-` | timer | نظام المؤقت | state, TimerRegistry |
| `13-` | scoring | النقاط + السمات | state |
| `14-` | admin-panel | لوحة الإدارة + showView | كل ما سبق |
| `15-` | auth-security | المصادقة | state |
| `16-` | encryption | عرض الأقسام/الأسئلة | state |
| `17-` | history | سجل الجلسات | state, compression |
| `18-` | presentation | وضع العرض التقديمي | state |
| `19-` | certificates | الشهادات | state, jsPDF |
| `20-` | display-modes | أنماط العرض | state |
| `21-` | solo-mode | الوضع الفردي | state, timer |
| `22-` | features-v7 | ميزات V7 | state |
| `23-` | mobile-a11y | الجوال + A11y | state |
| `24-` | phase3-a11y | عمى الألوان، Google Sheets | state |
| `28-` | audio-assets-2 | أصوات V11 | foundation |
| `29-` | browser-compat | فحص المتصفح | foundation |
| `30-` | more-i18n | مفاتيح i18n + `_initApp` | i18n, state |
| `31-` | settings-panel | لوحة الإعدادات | state |
| `32-` | buzzer-sync | مزامنة الجرس | BroadcastChannel |
| `33-` | podium-music | موسيقى المنصة | foundation |
| `34-` | drag-touch | السحب باللمس | state |
| `35-` | order-search | ترتيب + بحث | state |
| `36-` | windows-templates | قوالب النوافذ | state |
| `37-` | windows-logic | منطق النوافذ | state, windows-templates |
| `38-` | periodic-cleanup | الأداء + VirtualList | state, TimerRegistry |
| `39-` | history-aria | API السجل + ARIA | state |
| `40-` | features-block | مكتبة خارجية + WYSIWYG | state |
| `41-` | final-enhancements | محرر السمات + لوحة المعلومات | state |
| `42-` | freeze-fix | منع التجمد + HomeButtonFix | state, TimerRegistry |
| `43-` | a11y-enhancer | A11y تلقائي | state |
| `44-` | stability-enhancer | تحسينات الاستقرار | state |
| `45-` | solo-enhancer | تحسينات الوضع الفردي | state |

---

## 5. طبقات التخزين

### LocalStorage (الحالة + التفضيلات)
- **المفتاح**: `quiz_v4` (مضغوط بـ LZ-String)
- **الحجم الأقصى**: ~5 ميجابايت
- **المحتوى**: settings, categories (بدون صور), teams (بدون صور), credits, soloProgress
- **النسخ الاحتياطي**: `quiz_v4_lz=1` flag يدل على الضغط

### IndexedDB (الوسائط)
- **قاعدة البيانات**: `quiz_media_v1`
- **المتجر (Object Store)**: `media`
- **المفاتيح**:
  - `s_<setting>` — إعدادات (customMusic, customCorrect, إلخ)
  - `ci_<catId>` — صورة القسم
  - `qm_<qId>` — mediaData السؤال
  - `qma_<qId>` — mediaAttachment السؤال
  - `qo_<qId>_<idx>` — صورة الخيار
  - `ti_<teamId>` — صورة الفريق
  - `mi_<teamId>_<idx>` — صورة العضو
  - `cr_<creditId>` — صورة الائتمان
  - `_core_state` — نسخة احتياطية كاملة (للتعافي من الكوارث)
  - `_primary_core` — الحالة الأساسية (بديل LocalStorage)

### آلية "true" Placeholder
عما يكون عنصر الوسائط كبير (>500 حرف)، يُخزَّن في IDB ويُستبدل في LocalState بـ `true` (placeholder). عند التحميل، `loadAllMedia` يملأ الـ placeholders من IDB.

---

## 6. نظام المزامنة بين النوافذ

```
[النافذة الرئيسية]                [شاشة الجمهور]          [التحكم عن بُعد]
       │                                │                       │
       │  _pushRemoteState()            │                       │
       │  ──────────────────────────▶   │                       │
       │  BroadcastChannel.postMessage  │                       │
       │                                │                       │
       │                                │  updateAll(payload)   │
       │                                │  ◀─────────────────── │
       │                                │                       │
       │  postMessage (fallback)        │                       │
       │  ──────────────────────────▶   │                       │
```

### المسارات
1. **BroadcastChannel** (أساسي): غير متزامن، متعدد التبويبات، لا يحجب الـ main thread
2. **postMessage** (احتياطي): مباشر بين النوافذ عبر `_audienceWin.postMessage()`
3. **localStorage snapshot** (debounced 1s): للتعافي بعد إعادة التحميل

---

## 7. نظام المؤقتات (TimerRegistry)

```javascript
// 01-foundation.js
const TimerRegistry = {
  setInterval(fn, ms, context),  // يُرجع id
  setTimeout(fn, ms, context),   // يُرجع id
  register(context, handle),     // V15.0: لتسجيل raw handles
  clear(id),                     // مسح واحد
  clearByContext(ctx),           // مسح مجموعة
  clearAll(),                    // مسح الكل (يُستدعى على beforeunload + showView)
  size(),                        // عدد المؤقتات النشطة
  list(),                        // قائمة بكل المؤقتات
};
```

### القاعدة الذهبية
**لا تستخدم raw `setInterval`/`setTimeout` أبداً**. استخدم دائماً `TimerRegistry.setInterval`/`setTimeout` مع `context` واصف (مثل `'view:admin'`, `'timer:solo'`). هذا يضمن:
- تنظيف تلقائي عند تغيير العرض (`showView` يستدعي `clearAll`)
- تنظيف تلقائي عند إغلاق الصفحة (`beforeunload` يستدعي `clearAll`)
- إمكانية التتبّع عبر `TimerRegistry.list()`

---

## 8. نظام الأحداث (Store / AppState)

```javascript
// 01-foundation.js
const Store = {
  subscribe(event, callback),  // اشتراك
  emit(event, data),           // إطلاق حدث
  // الأحداث الشائعة: 'VIEW_CHANGE', 'STATE_UPDATE', 'TEAM_SCORED'
};

// 07-state-mgmt.js
const AppState = {
  set(key, value),             // تحديث + إطلاق 'STATE_UPDATE'
  get(key),
  _valueChanged(oldVal, newVal),  // dirty check
};
```

---

## 9. نظام إمكانية الوصول (A11y)

### المكونات الرئيسية
- **`aria-live-region`**: عنصر يحمل `aria-live="polite"` للإعلانات (النقاط، تغيير العرض)
- **`announceToARIA(message)`**: دالة لإعلان رسائل لقارئ الشاشة
- **`43-a11y-enhancer.js`**: MutationObserver يضيف `aria-label` تلقائياً للأزرار
- **`prefers-reduced-motion`**: يُحترم في CSS (تعطيل الحركات)
- **`prefers-contrast: high`**: يُحترم في CSS (تباين عالي)
- **مرشحات عمى الألوان**: بروتانوبيا، ديوتيرانوبيا، ترايتانوبيا

---

## 10. البناء كملف واحد

### الإضافة المخصصة (`vite-plugin-inline-classic-assets.js`)

```javascript
// vite.config.js
import inlineClassicAssets from './vite-plugin-inline-classic-assets.js';

export default {
  plugins: [
    inlineClassicAssets(),  // يُضمّن كل <script src> و <link rel=stylesheet>
  ],
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,  // لا code splitting (ملف واحد)
      },
    },
  },
};
```

### ما يفعله الـ Plugin
1. يأخذ كل `<script src="/src/app/XX-name.js">` ويستبدله بـ `<script>...</script>` مضمّن
2. يحافظ على نمط IIFE (لا يُحوّل إلى ESM)
3. يستبدل `<!-- __BODY_MARKER__ -->` بقالب `body.html`
4. يرمّز base64 للسكربتات ذات أحرف تحكم (XLSX، jsPDF) لتفادي أخطاء parse5

---

## 11. قرارات معمارية مهمة

### لماذا Vite بدلاً من Webpack؟
- **السرعة**: HMR في < 100ms (Webpack يحتاج ثوانٍ)
- **البساطة**: إعداد أقل، لا YAML معقّد
- **الإخراج**: يدعم ملف واحد عبر `vite-plugin-singlefile` + الإضافة المخصصة

### لماذا Capacitor بدلاً من React Native / Flutter؟
- **إعادة استخدام الكود**: نفس كود الويب يعمل على أندرويد و iOS
- **الصيانة**: فريق واحد، قاعدة كود واحدة
- **التحديثات**: تحديث الويب لا يتطلب مراجعة المتجر

### لماذا IIFE بدلاً من ESM؟
- **تاريخي**: المشروع بدأ كملف HTML واحد ضخم
- **متطلبات ملف واحد**: IIFE يُدمج بسهولة
- **قيد الترحيل**: المرحلة 2 تبدأ ترحيل 30% إلى TypeScript/ESM

### لماذا LocalStorage + IndexedDB (وليس أحدهما)؟
- **LocalStorage**: سريع للقراءة (متزامن)، لكن محدود بـ 5MB
- **IndexedDB**: سعة كبيرة، لكن غير متزامن (يُجمّد UI إذا تسلسلي)
- **التقسيم**: الحالة الصغيرة في LS، الوسائط الكبيرة في IDB

---

*للأسئلة حول البنية، افتح Issue على GitHub مع تصنيف `question`.*
