# 🚀 V15.0 Release Checklist

> **الإصدار**: V15.0 · **التاريخ المستهدف**: 15 أغسطس 2026
> **الحالة**: جاهز للإطلاق بعد إكمال هذا الـ checklist

---

## ✅ قبل الإطلاق (Pre-release)

### الكود
- [ ] دمج جميع PRs من `fix/v15.0-*` إلى `main`
- [ ] تحديث `package.json` version إلى `15.0.0`
- [ ] تحديث `android/app/build.gradle` versionCode إلى `15`, versionName إلى `"15.0"`
- [ ] تحديث `CHANGELOG.md` بقسم V15.0 كامل
- [ ] تحديث `README.md` (الإصدار، السمات الجديدة، لقطات الشاشة)
- [ ] التأكد من عدم وجود `console.log` في الإنتاج (ESLint `no-console: warn`)
- [ ] التأكد من عدم وجود TODO/FIXME حرجة في الكود

### الاختبارات
- [ ] `npm run lint` — ✅ 0 أخطاء
- [ ] `npm test` — ✅ جميع الاختبارات تنجح
- [ ] `npm run build` — ✅ ينجح، حجم البناء < 5.5 ميجابايت
- [ ] `node --check src/app/*.js` — ✅ جميع الملفات تجتاز
- [ ] اختبار يدوي شامل على:
  - [ ] Chrome (Desktop + Mobile)
  - [ ] Firefox (Desktop)
  - [ ] Safari (Desktop + iOS)
  - [ ] Samsung Internet (Android)
  - [ ] تطبيق أندرويد (APK على Pixel 4a + Samsung A32)

### الأداء
- [ ] Lighthouse Performance Score ≥ 85 (Mobile)
- [ ] Lighthouse Accessibility Score ≥ 90
- [ ] Lighthouse PWA Score = 100
- [ ] زمن FCP < 2 ثانية (3G)
- [ ] زمن TTI < 3 ثوانٍ (3G)
- [ ] حجم الحزمة < 5.5 ميجابايت (الهدف: < 5.1)
- [ ] حجم APK < 5 ميجابايت

### الأمان
- [ ] `npm audit` — 0 ثغرات حرجة (high/critical)
- [ ] فحص محتوى كلمة المرور الافتراضية (1234) — تأكيد في الإعدادات
- [ ] فحص CSP headers
- [ ] تأكيد عدم وجود API keys أو secrets في الكود
- [ ] فحص `.gitignore` للتأكد من عدم تتبّع ملفات حساسة

---

## 📦 الإطلاق (Release)

### 1. إنشاء Tag
```bash
git checkout main
git pull origin main
git tag -a v15.0.0 -m "V15.0 — Phase 1-4 complete

Bug fixes (24 tasks):
- P0: IDB batching, per-panel dirty flags, VirtualList, adjustScore DOM patch
- P1: hash navigation, TimerRegistry.register, freeze-fix migration, HomeButtonFix
- P1: loadAllMedia cancellation, cleanupMemory saveStateSync
- PERF: BroadcastChannel-only remote state sync

Infrastructure (Phase 2):
- Vitest + smoke tests
- GitHub Actions CI/CD (lint → test → build → APK)
- ESLint strict + Prettier + Husky hooks
- ARCHITECTURE.md + CONTRIBUTING.md

Performance (Phase 3):
- Terser + esbuild minification (38% smaller bundle)
- IntersectionObserver lazy loading
- Event delegation for touch gestures
- Cached querySelector
- R8 + resource shrinking for Android

New Features (Phase 4):
- iOS support via Capacitor
- PWA (Service Worker + manifest)
- Teacher analytics dashboard (PDF/Excel export)
- Multiplayer mode (WebSocket server)
- AI question generation
- LMS integration (Moodle, Google Classroom, QTI)
- French + Urdu language support

Total: 44/44 tasks complete (100%)"
git push origin v15.0.0
```

### 2. GitHub Actions سيُطلق تلقائياً
- [ ] CI pipeline ينجح على tag
- [ ] Release workflow يبني APK موقّع
- [ ] GitHub Release يُنشأ تلقائياً مع:
  - [ ] APK موقّع (arabic-quiz-v15.0.0.apk)
  - [ ] dist/index.html (نسخة الويب)
  - [ ] release notes من CHANGELOG.md

### 3. تحقق من GitHub Release
- [ ] افتح https://github.com/ahmedahmed1223/Arabic-Quizz-builder/releases
- [ ] تأكد من وجود Release باسم `v15.0.0`
- [ ] تأكد من وجود الأصول (APK + index.html)
- [ ] راجع release notes للتأكد من اكتمالها
- [ ] أضف لقطات شاشة إن لزم

---

## 📢 ما بعد الإطلاق (Post-release)

### الإعلان
- [ ] نشر على وسائل التواصل الاجتماعي (Twitter, Facebook, LinkedIn)
- [ ] إرسال بريد إلكتروني للمستخدمين الحاليين
- [ ] نشر في مجموعات المعلمين العرب
- [ ] كتابة مقال على Medium/Dev.to
- [ ] تحديث الموقع الرئيسي (إن وُجد)

### التوثيق
- [ ] تحديث Wiki على GitHub
- [ ] إنشاء فيديو تعليمي (5 دقائق)
- [ ] تحديث دليل المستخدم `user-guide.html`
- [ ] ترجمة الدليل للإنجليزية والفرنسية

### المراقبة
- [ ] تفعيل Google Analytics (إن لم يكن مفعّلاً)
- [ ] تفعيل Sentry للتتبّع الأخطاء (إن لم يكن مفعّلاً)
- [ ] مراقبة GitHub Issues يومياً في الأسبوع الأول
- [ ] الرد على المشاكل الحرجة خلال 24 ساعة
- [ ] تجميع feedback لـ V15.1

### المتاجر
- [ ] رفع APK إلى Google Play Store (إن وُجد حساب)
- [ ] رفع IPA إلى Apple App Store (إن وُجد حساب + macOS)
- [ ] تحديث معلومات المتجر (الوصف، لقطات الشاشة، التصنيف)

---

## 📊 مؤشرات النجاح (بعد شهر من الإطلاق)

| المؤشر | الهدف |
|---|---|
| عدد التنزيلات (APK + ويب) | ≥ 1000 |
| GitHub Stars | ≥ 50 |
| تقييم Google Play | ≥ 4.2/5 |
| معدل الأعطال (Crash rate) | < 0.5% |
| Issues مفتوحة | < 20 |
| زمن الاستجابة للـ Issues | < 48 ساعة |

---

## 🔄 ما بعد V15.0

### V15.1 (إصدار صيانة — شهر بعد الإطلاق)
- إصلاح الأخطاء المُكتشفة في Beta + الإطلاق العام
- تحسينات أداء إضافية بناءً على telemetry
- ترجمة كاملة للفرنسية والأوردو

### V16.0 (إصدار رئيسي — 3-6 أشهر بعد V15.0)
- ترحيل كامل إلى TypeScript + ESM
- وضع تعدد اللاعبين الموسّع (فرق عبر الإنترنت)
- تكامل أعمق مع LMS (Moodle plugin رسمي)
- مكتبة أسئلة مجتمعية (User-generated content)

---

## 🆘 استعادة الإصدار (Rollback Plan)

إذا اكتُشفت مشكلة حرجة بعد الإطلاق:

### Rollback سريع
```bash
# إعادة تفعيل الإصدار السابق
git checkout v14.2
git tag -f latest v14.2
git push -f origin latest
```

### Hotfix
```bash
git checkout -b hotfix/v15.0.1 v15.0.0
# إصلاح المشكلة
git commit -m "fix(v15.0.1): critical bug description"
git tag v15.0.1
git push origin hotfix/v15.0.1 --tags
```

### التواصل
- [ ] نشر إعلان على GitHub Releases
- [ ] إرسال بريد للمستخدمين المتأثرين
- [ ] تحديث الـ README بحالة المشكلة

---

*Release Checklist V15.0 — Arabic Quiz Builder · 15 أغسطس 2026*
