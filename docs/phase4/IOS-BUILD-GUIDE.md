# 🍎 iOS Build Guide — Arabic Quiz Builder V15.0

> دليل بناء تطبيق iOS عبر Capacitor

---

## المتطلبات الأساسية

- **macOS** (يحتاج Xcode — لا يعمل على Linux/Windows)
- **Xcode 15+** مع iOS 17 SDK
- **CocoaPods** (`sudo gem install cocoapods`)
- **Apple Developer Account** ($99/سنة لتوزيع App Store)
- **Node.js 20+** و **npm**

---

## الخطوة 1: إضافة منصة iOS

```bash
# من جذر المشروع
npm install

# إضافة منصة iOS
npx cap add ios

# هذا ينشئ مجلد ios/ مع مشروع Xcode
```

## الخطوة 2: نسخ تكوين iOS

```bash
# استبدل capacitor.config.json بنسخة iOS
cp infrastructure/phase4/ios/capacitor.config.ios.json capacitor.config.json

# بناء الأصول الويب
npm run build

# مزامنة مع iOS
npx cap sync ios
```

## الخطوة 3: فتح في Xcode

```bash
npx cap open ios
```

### إعدادات Xcode المطلوبة

1. **Signing & Capabilities**:
   - Team: اختر Apple Developer account
   - Bundle Identifier: `com.ahmedahmed1223.arabicquizzbuilder`
   - Signing Certificate: Apple Distribution

2. **General**:
   - Version: `15.0`
   - Build: `1`
   - Deployment Target: `iOS 14.0`
   - Device Family: iPhone + iPad
   - Orientation: Portrait + Landscape

3. **App Icons**:
   - أضف AppIcon.appiconset في `Assets.xcassets`
   - أحجام مطلوبة: 20pt, 29pt, 40pt, 60pt, 76pt, 83.5pt, 1024pt
   - استخدم [appicon.net](https://appicon.net) للتوليد

4. **Launch Screen**:
   - استخدم splash.png الموجود في `android/app/src/main/res/drawable/`
   - لون الخلفية: `#08091a`

## الخطوة 4: بناء Debug (لاختبار الجهاز)

```bash
# بناء عبر CLI
npx cap build ios --scheme=Debug

# أو عبر Xcode: Product → Run (⌘R)
```

## الخطوة 5: بناء Release للأرشيف

```bash
# بناء Archive
npx cap build ios --scheme=Release

# أو عبر Xcode: Product → Archive
```

### رفع إلى App Store Connect

1. افتح **Xcode → Organizer** (Window → Organizer)
2. اختر الـ Archive الأخير
3. **Distribute App → App Store Connect**
4. اتبع المعالج: Upload → اختبار TestFlight → مراجعة App Store

---

## اعتبارات خاصة بـ iOS

### 1. دعم RTL
- التطبيق يدعم RTL افتراضياً (الكود يستخدم `dir="rtl"`)
- في `Info.plist`، أضف:
  ```xml
  <key>UIViewSemanticContentAttribute</key>
  <string>UISemanticContentAttributeForceRightToLeft</string>
  ```

### 2. Safe Area (شاشات iPhone X+)
- الكود يستخدم `viewport-fit=cover` + `env(safe-area-inset-*)` في CSS
- لا حاجة لتعديلات إضافية

### 3. لوحة المفاتيح
- `Keyboard.resize: "body"` يضمن أن لوحة المفاتيح لا تغطي المحتوى
- اختبر في الوضع الأفقي (landscape)

### 4. الاهتزاز (Haptics)
- `Haptics.style: "Medium"` يعمل تلقائياً عبر `@capacitor/haptics`
- لا حاجة لأذونات خاصة

### 5. Offline Support
- التطبيق يعمل دون اتصال بالكامل بعد التحميل الأولي
- لا حاجة لإعداد خاص في iOS

---

## استكشاف الأخطاء

### خطأ: "Unsupported Capacitor iOS version"
```bash
# حدّث Capacitor CLI
npm install @capacitor/cli@latest @capacitor/core@latest @capacitor/ios@latest
npx cap sync ios
```

### خطأ: "CocoaPods could not find compatible versions"
```bash
cd ios/App
pod repo update
pod install
cd ../..
npx cap sync ios
```

### خطأ: "Signing for 'App' requires a development team"
- في Xcode: App → Signing & Capabilities → اختر Team
- أو: `npx cap build ios --scheme=Debug --team=YOUR_TEAM_ID`

### التطبيق يفتح بشاشة بيضاء
```bash
# تحقق من وحدة التحكم في Safari
# Safari → Develop → Simulator → localhost
# ابحث عن أخطاء JavaScript
```

---

## أذونات iOS المطلوبة

الملف `ios/App/App/Info.plist` يجب أن يحتوي:

```xml
<!-- لتشغيل الصوت في الخلفية (اختياري) -->
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>

<!-- دعم الاتجاهات -->
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<!-- دعم RTL -->
<key>Localization native development region</key>
<string>ar</string>
```

---

## Build Scripts (إضافة لـ package.json)

```json
{
  "scripts": {
    "ios:sync": "npm run build && npx cap sync ios",
    "ios:open": "npx cap open ios",
    "ios:build": "npm run build && npx cap sync ios && npx cap open ios",
    "ios:debug": "npm run build && npx cap sync ios && npx cap run ios",
    "ios:release": "npm run build && npx cap sync ios && npx cap build ios --scheme=Release"
  }
}
```

---

## أحجام التطبيق المتوقعة

| الإصدار | الحجم |
|---|---|
| Debug IPA | ~15 ميجابايت (يحتوي رموز تصحيح) |
| Release IPA | ~8 ميجابايت (بعد R8 + thinning) |
| App Store Download | ~6 ميجابايت (بعد bitcode + slicing) |

---

## الخطوة التالية

بعد بناء IPA بنجاح:
1. ارفع إلى **TestFlight** للاختبار الداخلي
2. دعوة 25 مختبراً عبر البريد الإلكتروني
3. جمع الملاحظات لمدة أسبوع
4. إصلاح المشاكل الحرجة
5. تقديم لمراجعة App Store (1-7 أيام)

---

*آخر تحديث: 15 أغسطس 2026 · الإصدار: V15.0*
