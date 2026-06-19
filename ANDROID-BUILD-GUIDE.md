# 📱 دليل بناء تطبيق أندرويد — Android Build Guide

> **دليل بناء تطبيق منصة المسابقات التفاعلية لأندرويد باستخدام Capacitor**

---

## 🛠 المتطلبات الأساسية

قبل البدء، تأكد من تثبيت:

| الأداة | الإصدار المطلوب | رابط التحميل |
|--------|-----------------|---------------|
| **Node.js** | 18+ | https://nodejs.org |
| **Android Studio** | Hedgehog+ (2023.1+) | https://developer.android.com/studio |
| **JDK** | 17 (مدمج مع Android Studio) | https://adoptium.net |
| **Android SDK** | API 34+ (عبر Android Studio) | ضمن Android Studio |

### متغيرات البيئة

بعد تثبيت Android Studio، أضف لمتغير `ANDROID_HOME` أو `ANDROID_SDK_ROOT`:

```bash
# Linux/macOS
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin

# Windows (PowerShell)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
```

---

## 🚀 البناء السريع

### 1. تثبيت الاعتماديات

```bash
cd Arabic-Quizz-builder
npm install
```

### 2. بناء التطبيق وفتحه في Android Studio

```bash
# الطريقة الأبسط: بناء + مزامنة + فتح في Android Studio
npm run android:build

# أو يدوياً:
npm run build
npx cap sync android
npx cap open android
```

### 3. بناء APK للتشغيل المباشر (Debug)

```bash
npm run android:debug
# الناتج: android/app/build/outputs/apk/debug/app-debug.apk
```

### 4. بناء APK للنشر (Release)

```bash
npm run android:release
# الناتج: android/app/build/outputs/apk/release/app-release-unsigned.apk
# (يلزم توقيعه بمفتاحك قبل النشر على Play Store)
```

---

## 📋 سكربتات npm المتاحة

| السكربت | الوظيفة |
|---------|---------|
| `npm run cap:copy` | بناء Vite + نسخ ملفات الويب لمجلد Android |
| `npm run cap:sync` | بناء Vite + مزامنة كاملة (نسخ + تحديث الإضافات) |
| `npm run cap:open` | فتح مشروع Android في Android Studio |
| `npm run android:build` | بناء كامل + فتح في Android Studio |
| `npm run android:debug` | بناء APK للتشغيل المباشر (غير موقّع) |
| `npm run android:release` | بناء APK للنشر (يلزم توقيع لاحقاً) |

---

## ⚙️ تكوين المشروع

### `capacitor.config.json`

يحتوي على إعدادات التطبيق:

| الإعداد | القيمة | الوصف |
|---------|--------|-------|
| `appId` | `com.ahmedahmed1223.arabicquizzbuilder` | المُعرّف الفريد للتطبيق |
| `appName` | `منصة المسابقات التفاعلية` | اسم التطبيق |
| `webDir` | `dist` | مجلد ملفات الويب المبنية |
| `backgroundColor` | `#08091a` | لون الخلفية أثناء التحميل |
| `SplashScreen.launchShowDuration` | `1500` | مدة عرض شاشة البداية (ms) |
| `StatusBar.style` | `DARK` | نمط شريط الحالة |
| `Haptics.enabled` | `true` | تفعيل الاهتزاز عند اللمس |

### ملفات التكوين في `android/`

| الملف | الوظيفة |
|-------|---------|
| `app/src/main/AndroidManifest.xml` | أذونات التطبيق + إعدادات النشاط |
| `app/src/main/res/values/strings.xml` | النصوص (اسم التطبيق بالعربية) |
| `app/src/main/res/xml/network_security_config.xml` | السماح بالاتصال الخارجي (للمكتبة الخارجية) |
| `app/src/main/java/.../MainActivity.java` | النشاط الرئيسي (شاشة كاملة، تسريع عتادي) |

---

## 🔐 الأذونات المطلوبة

| الإذن | السبب |
|-------|-------|
| `INTERNET` | جلب المكتبة الخارجية (3258+ سؤال) |
| `ACCESS_NETWORK_STATE` | التحقق من الاتصال |
| `VIBRATE` | الاهتزاز عند الإجابة الصحيحة/الخاطئة |
| `WRITE_EXTERNAL_STORAGE` | تصدير التقارير (Android ≤ 9) |
| `READ_EXTERNAL_STORAGE` | استيراد ملفات JSON/Excel (Android ≤ 12) |

---

## 🎨 تخصيص التطبيق

### تغيير أيقونة التطبيق

1. ضع أيقونة بدقة 1024×1024 في مجلد `resources/`
2. ثبّت `@capacitor/assets`:
   ```bash
   npm install @capacitor/assets --save-dev
   ```
3. شغّل:
   ```bash
   npx capacitor-assets generate --android
   ```

### تغيير شاشة البداية (Splash Screen)

1. ضع صورة `splash.png` بدقة 2732×2732 في `resources/`
2. شغّل:
   ```bash
   npx capacitor-assets generate --android
   ```

### تغيير اسم التطبيق

عدّل `android/app/src/main/res/values/strings.xml`:
```xml
<string name="app_name">اسمك الجديد</string>
```

---

## 📦 النشر على Google Play Store

### 1. توليد مفتاح التوقيع

```bash
keytool -genkey -v -keystore quiz-release.keystore -alias quiz-key -keyalg RSA -keysize 2048 -validity 10000
```

احفظ هذا الملف في مكان آمن ولا تفقده أبداً!

### 2. تكوين التوقيع في Gradle

أنشئ `android/keystore.properties`:
```properties
storeFile=../quiz-release.keystore
storePassword=كلمة-المرور-الخاصة-بك
keyAlias=quiz-key
keyPassword=كلمة-المرور-للمفتاح
```

عدّل `android/app/build.gradle` لإضافة التوقيع (ابحث عن `signingConfigs`).

### 3. بناء App Bundle للنشر

```bash
cd android
./gradlew bundleRelease
# الناتج: app/build/outputs/bundle/release/app-release.aab
```

### 4. رفع التطبيق

- اذهب لـ https://play.google.com/console
- أنشئ تطبيقاً جديداً
- ارفع ملف `.aab`
- املأ بيانات المتجر (الوصف، الصور، الفئة: تعليمي)
- أرسل للمراجعة

---

## 🐛 استكشاف الأخطاء

### خطأ: "SDK location not found"

```bash
# أنشئ ملف android/local.properties
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

### خطأ: "Gradle build failed"

```bash
# امسح ذاكرة Gradle المؤقتة
cd android
./gradlew clean
# أو احذف مجلد .gradle
rm -rf .gradle build app/build
```

### خطأ: "WebView shows blank screen"

```bash
# تأكد من البناء قبل المزامنة
npm run build
npx cap sync android
```

### التطبيق لا يصل للمكتبة الخارجية

تحقق من:
1. وجود إذن `INTERNET` في `AndroidManifest.xml` ✓ (موجود)
2. وجود `network_security_config.xml` ✓ (موجود)
3. اتصال الجهاز بالإنترنت

---

## 📱 اختبار على جهاز حقيقي

### تفعيل وضع المطور في أندرويد

1. إعدادات → حول الهاتف → اضغط على "رقم الإصدار" 7 مرات
2. إعدادات → خيارات المطور → فعّل "تصحيح USB"

### تشغيل التطبيق على الجهاز

```bash
# تأكد من ظهور الجهاز
adb devices

# شغّل التطبيق
npm run android:build
# ثم من Android Studio: Run على جهازك
```

---

## 🔄 سير عمل التحديثات

عند تعديل كود التطبيق:

```bash
# 1. عدّل الملفات في src/
# 2. أعد البناء
npm run build

# 3. مزامنة التغييرات لأندرويد
npx cap sync android

# 4. أعد التشغيل في Android Studio
# أو مباشرة:
npm run android:debug
```

---

## 📞 الدعم

- 🐞 تقارير الأخطاء: [GitHub Issues](https://github.com/ahmedahmed1223/Arabic-Quizz-builder/issues)
- 📖 دليل Capacitor: https://capacitorjs.com/docs
- 📖 دليل Android: https://developer.android.com/guide

---

**ملاحظة**: التطبيق يعمل بالكامل دون اتصال بعد التثبيت. المكتبة الخارجية (3258+ سؤال) تُحمّل عند أول استخدام وتُخزّن محلياً.
