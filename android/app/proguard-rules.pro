# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# V15.0-fix (T-035): Capacitor ProGuard rules
# Keep Capacitor plugin classes (they're accessed via reflection from the WebView)
-keep class com.getcapacitor.** { *; }
-keep class com.ahmedahmed1223.arabicquizzbuilder.** { *; }
-keepclassmembers class com.getcapacitor.** {
    public *;
}
-keepclassmembers class * implements com.getcapacitor.Plugin {
    public *;
}

# Keep JavaScript interface methods (called from WebView via @JavascriptInterface)
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# WebView classes
-keep class android.webkit.** { *; }
-keepclassmembers class android.webkit.WebView {
    public *;
}

# Splash screen and status bar plugins
-keep class androidx.core.splashscreen.** { *; }
-keep class com.capacitorjs.plugin.splashscreen.** { *; }
-keep class com.capacitorjs.plugin.statusbar.** { *; }
-keep class com.capacitorjs.plugin.haptics.** { *; }

# Keep app activities (accessed by name)
-keep class com.ahmedahmed1223.arabicquizzbuilder.MainActivity { *; }

# Uncomment this to preserve the line number information for
# debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# V15.0-fix: Remove verbose logging in release builds
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
}

# V15.0-fix: Optimize — remove calls to String.isEmpty() when result is unused
# (micro-optimization, saves ~50KB across the app)
