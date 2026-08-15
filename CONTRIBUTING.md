# 🤝 CONTRIBUTING.md — دليل المساهمة

> شكراً لاهتمامك بالمساهمة في منصة المسابقات التفاعلية! هذا الدليل يشرح كيف تساهم بفعالية.

---

## 📋 جدول المحتويات

- [البدء السريع](#-البدء-السريع)
- [سير العمل (Workflow)](#-سير-العمل-workflow)
- [معايير الكود](#-معايير-الكود)
- [رسائل الالتزام (Conventional Commits)](#-رسائل-الالتزام-conventional-commits)
- [الاختبارات](#-الاختبارات)
- [قائمة مراجعة Pull Request](#-قائمة-مراجعة-pull-request)
- [الإبلاغ عن الأخطاء](#-الإبلاغ-عن-الأخطاء)
- [اقتراح ميزات جديدة](#-اقتراح-ميزات-جديدة)

---

## 🚀 البدء السريع

### المتطلبات
- **Node.js 20+**
- **npm 10+** (أو pnpm/yarn)
- **Git 2.40+**
- (للبناء أندرويد) **Java 17** + **Android SDK 35**

### الإعداد

```bash
# 1. اعمل Fork للمستودع على GitHub
# 2. استنسخ fork الخاص بك
git clone https://github.com/<your-username>/Arabic-Quizz-builder.git
cd Arabic-Quizz-builder

# 3. أضف المستودع الأصلي كـ upstream
git remote add upstream https://github.com/ahmedahmed1223/Arabic-Quizz-builder.git

# 4. ثبّت الاعتماديات
npm install

# 5. ثبّت Husky hooks (pre-commit + commit-msg)
npm run prepare

# 6. شغّل خادم التطوير
npm run dev
```

افتح `http://localhost:5173` في المتصفح. كلمة المرور الافتراضية: `1234`.

---

## 🔄 سير العمل (Workflow)

### نموذج التفرّع (GitFlow المبسّط)

| الفرع | الغرض | الحماية |
|---|---|---|
| `main` | الإصدارات الإنتاجية فقط | موافقة 2 مراجعين + CI ناجح |
| `develop` | التكامل المستمر | CI ناجح |
| `feature/*` | ميزات جديدة | يُدمج في develop عبر PR |
| `fix/*` | إصلاحات أخطاء | يُدمج في develop عبر PR |
| `release/*` | إعداد الإصدارات | يُدمج في main و develop |
| `hotfix/*` | إصلاحات إنتاج عاجلة | يُدمج في main و develop |

### دورة حياة Pull Request

1. **أنشئ فرع**: `git checkout -b feature/amazing-feature` (من `develop`)
2. **اكتب الكود**: اتبع [معايير الكود](#-معايير-الكود)
3. **اكتب الاختبارات**: تغطية ≥ 70% للكود الجديد
4. **شغّل الفحوصات محلياً**:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
5. **اعمل commit**: اتبع [Conventional Commits](#-رسائل-الالتزام-conventional-commits)
6. **اعمل push**: `git push origin feature/amazing-feature`
7. **افتح PR**: على GitHub، استهدف `develop`
8. **انتظر المراجعة**: عالج ملاحظات المراجعين
9. **ادمج**: بعد موافقة 2 مراجعين + CI ناجح

---

## 📏 معايير الكود

### JavaScript
- **ES2022** كحد أقصى (لا توجد ميزات أحدث)
- **IIFE pattern** للوحدات الحالية (لا ESM حتى يكتمل الترحيل)
- **لا `var`** — استخدم `let` أو `const`
- **`===` دائماً** — لا `==` (يسبب أخطاء خفية)
- **لا `console.log`** في الإنتاج — استخدم `console.warn`/`console.error`/`console.info`
- **لا `eval`** أو `new Function()` (خطر أمني)
- **try/catch** لكل JSON.parse و localStorage و fetch
- **typeof guard** للمراجع التي قد لا تكون معرّفة (`if(typeof X!=='undefined')`)

### CSS
- **متغيرات CSS** للألوان (`var(--accent1)`) — لا قيم ثابتة
- **RTL أولاً** — كل التخطيطات يجب أن تعمل في وضع RTL
- **Mobile-first** — ابدأ بالشاشات الصغيرة، وسّع للكبيرة
- **`prefers-reduced-motion`** — احترم تفضيل تقليل الحركة
- **`prefers-contrast: high`** — احترم تفضيل التباين العالي

### HTML
- **`alt=""` للصور الزخرفية**، نص وصفي للصور المعنوية
- **`aria-label` للأزرار ذات الأيقونات فقط**
- **هرمية عناوين صحيحة** (h1 → h2 → h3، لا قفزات)
- **`role="main"` واحد فقط** في الصفحة

### التسمية
- **الدوال**: `camelCase` (`saveQuestion`, `renderAdmin`)
- **المتغيرات**: `camelCase` (`currentTeamIndex`, `_mediaDirty`)
- **الثوابت**: `UPPER_SNAKE_CASE` (`APP_VERSION`, `DB_NAME`)
- **الملفات**: `XX-name.js` حيث `XX` رقم الترتيب (`02-storage.js`)

---

## 📝 رسائل الالتزام (Conventional Commits)

### التنسيق
```
type(scope): subject

[optional body]

[optional footer]
```

### الأنواع
| النوع | الاستخدام | مثال |
|---|---|---|
| `feat` | ميزة جديدة | `feat(storage): add IDB batching` |
| `fix` | إصلاح خطأ | `fix(timer): correct register signature` |
| `refactor` | إعادة هيكلة | `refactor(render): extract per-panel dirty flags` |
| `perf` | تحسين أداء | `perf(sync): remove LS mirror in pushRemoteState` |
| `docs` | توثيق | `docs(arch): add ARCHITECTURE.md` |
| `test` | اختبارات | `test(storage): add smoke tests for MediaDB` |
| `chore` | مهام ثانوية | `chore(deps): bump vitest to 2.1.8` |
| `ci` | تكوين CI | `ci(actions): add Android APK job` |
| `style` | تنسيق فقط | `style(prettier): format all CSS files` |
| `build` | نظام البناء | `build(vite): update singlefile plugin` |
| `hotfix` | إصلاح إنتاج عاجل | `hotfix(security): patch XSS in question editor` |

### القواعد
- **الموضوع**: صيغة الأمر، حروف صغيرة، ≤ 72 حرف
- **النطاق (scope)**: اختياري، حروف صغيرة + شرطة
- **breaking change**: أضف `!` بعد النوع/النطاق: `feat(api)!: change endpoint format`

### أمثلة
```
feat(storage): add IDB batching for saveAllMedia

- Replace N sequential awaits with single getAll() transaction
- 10-50x faster for 200+ media items (5-10s → 100-500ms)
- Fallback to sequential reads for old browsers

Closes #123
```

---

## 🧪 الاختبارات

### تشغيل الاختبارات
```bash
npm test                  # تشغيل مرة واحدة
npm run test:watch        # وضع المراقبة
npm run test:coverage     # مع تقرير التغطية
npm run test:ui           # واجهة المستخدم للاختبارات
```

### كتابة الاختبارات

```javascript
// tests/unit/myModule.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('MyModule', () => {
  beforeEach(() => {
    // إعداد قبل كل اختبار
  });

  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### معايير التغطية
- **الوحدات الحرجة** (storage, state, play-logic, scoring, auth): **≥ 70%**
- **باقي الوحدات**: **≥ 50%**
- **الأسطر الجديدة في PR**: **≥ 70%**

---

## ✅ قائمة مراجعة Pull Request

قبل فتح PR، تأكد من:

- [ ] الكود يجتاز `npm run lint` بدون أخطاء
- [ ] الكود يجتاز `npm test` بدون أخطاء
- [ ] الكود يجتاز `npm run build` بدون أخطاء
- [ ] حجم البناء لم يزداد بأكثر من 500KB
- [ ] تغطية الاختبارات ≥ 70% للكود الجديد
- [ ] لا `console.log` في الكود (استخدم `console.warn`/`error`/`info`)
- [ ] لا `var` (استخدم `let`/`const`)
- [ ] لا `==` (استخدم `===`)
- [ ] كل `JSON.parse` و `localStorage` في try/catch
- [ ] `aria-label` للأزرار الجديدة ذات الأيقونات فقط
- [ ] `alt` وصفي للصور الجديدة
- [ ] يدعم RTL (اختبر بالعربية والإنجليزية)
- [ ] يدعم الجوال (اختبر على شاشة 375px)
- [ ] يحترم `prefers-reduced-motion`
- [ ] التوثيق محدّث (JSDoc، README، ARCHITECTURE إن لزم)
- [ ] رسائل الالتزام تتبع Conventional Commits
- [ ] لا ملفات مولّدة مُلتزمة (dist/, tests/coverage/, *.apk)
- [ ] ربط PR بـ GitHub Issue (Closes #123)

---

## 🐛 الإبلاغ عن الأخطاء

### قبل الإبلاغ
1. ابحث في [Issues الموجودة](https://github.com/ahmedahmed1223/Arabic-Quizz-builder/issues) لتجنب التكرار
2. تأكد أنك تستخدم أحدث إصدار
3. حاول إعادة إنتاج الخطأ في بيئة نظيفة

### تنسيق التقرير
```markdown
**وصف الخطأ**
وصف واضح ومختصر للمشكلة.

**خطوات الإعادة**
1. اذهب إلى '...'
2. انقر على '...'
3. مرّر لأسفل إلى '...'
4. شاهد الخطأ

**السلوك المتوقع**
وصف ما كنت تتوقع حدوثه.

**السلوك الفعلي**
وصف ما حدث فعلاً.

**لقطات الشاشة**
إن أمكن، أضف لقطات شاشة.

**البيئة**
- نظام التشغيل: [مثلاً Android 14]
- المتصفح: [مثلاً Chrome 120]
- الإصدار: [مثلاً V15.0]
- نوع الجهاز: [مثلاً Pixel 7]

**سياق إضافي**
أي معلومات أخرى مفيدة.
```

---

## 💡 اقتراح ميزات جديدة

### قبل الاقتراح
1. ابحث في Issues الموجودة
2. تحقق من [خطة التطوير](DEVELOPMENT_PLAN.md) — قد تكون الميزة مخططة بالفعل
3. ناقش الفكرة في Discussion قبل فتح Issue

### تنسيق الاقتراح
```markdown
**هل اقتراحك مرتبط بمشكلة؟**
وصف المشكلة. مثلاً: "أشعر بالإحباط عندما..."

**الحل المقترح**
وصف ما تريد حدوثه.

**البدائل المُفكَّر فيها**
وصف البدائل التي فكرت فيها.

**السياق الإضافي**
لقطات شاشة، روابط، أو معلومات أخرى.
```

---

## ❓ الأسئلة

- **GitHub Discussions**: للأسئلة العامة والنقاش
- **GitHub Issues**: للأخطاء والميزات المحددة
- **README.md**: نظرة عامة سريعة
- **ARCHITECTURE.md**: تفاصيل البنية التقنية
- **DEVELOPMENT_PLAN.md**: خارطة الطريق

---

شكراً لمساهمتك في تحسين المنصة للمجتمع العربي التعليمي! 🎉
