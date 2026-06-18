#!/usr/bin/env python3
"""
Move extracted section files into the proper locations in the modular project.

Layout:
  src/vendor/         — third-party libraries (KaTeX, XLSX, Sortable, Quill, Cropper, jsPDF, Sanitizer)
  src/styles/         — CSS files (vendor + app)
  src/app/            — application JavaScript modules (split by logical section)
  src/templates/      — HTML body markup
  index.html          — main HTML entry
"""

import shutil
from pathlib import Path

EXTRACTED = Path("/home/z/my-project/quiz-platform/.extracted")
ROOT = Path("/home/z/my-project/quiz-platform")
SRC = ROOT / "src"

# Create target directories
for d in ["vendor", "styles", "app", "templates", "config"]:
    (SRC / d).mkdir(parents=True, exist_ok=True)

# ---------- Mapping: extracted_filename -> destination ----------
MOVES = [
    # Vendor CSS
    ("vendor_quill_css.css",       "src/styles/vendor-quill.css"),
    ("vendor_cropper_css.css",     "src/styles/vendor-cropper.css"),
    ("vendor_katex_css.css",       "src/styles/vendor-katex.css"),

    # Vendor JS
    ("vendor_katex_js.js",         "src/vendor/katex.js"),
    ("vendor_katex_autorender.js", "src/vendor/katex-autorender.js"),
    ("vendor_xlsx_js.js",          "src/vendor/xlsx.js"),
    ("vendor_sanitizer_js.js",     "src/vendor/sanitizer.js"),
    ("vendor_quill_js.js",         "src/vendor/quill.js"),
    ("vendor_cropper_js.js",       "src/vendor/cropper.js"),
    ("vendor_jspdf_js.js",         "src/vendor/jspdf.js"),

    # App CSS
    ("main_app_css.css",           "src/styles/main.css"),
    ("v10_animations.css",         "src/styles/animations.css"),

    # App JS — split into logical modules
    ("app_01_foundation.js",       "src/app/01-foundation.js"),
    ("app_02_storage.js",          "src/app/02-storage.js"),
    ("app_03_media_helpers.js",    "src/app/03-media-helpers.js"),
    ("app_04_i18n.js",             "src/app/04-i18n.js"),
    ("app_05_audio_assets.js",     "src/app/05-audio-assets.js"),
    ("app_06_compression.js",      "src/app/06-compression.js"),
    ("app_07_state_mgmt.js",       "src/app/07-state-mgmt.js"),
    ("app_08_question_mgmt.js",    "src/app/08-question-mgmt.js"),
    ("app_09_team_mgmt.js",        "src/app/09-team-mgmt.js"),
    ("app_10_category_mgmt.js",    "src/app/10-category-mgmt.js"),
    ("app_11_play_logic.js",       "src/app/11-play-logic.js"),
    ("app_12_timer.js",            "src/app/12-timer.js"),
    ("app_13_scoring.js",          "src/app/13-scoring.js"),
    ("app_14_admin_panel.js",      "src/app/14-admin-panel.js"),
    ("app_15_auth_security.js",    "src/app/15-auth-security.js"),
    ("app_16_encryption.js",       "src/app/16-encryption.js"),
    ("app_17_history.js",          "src/app/17-history.js"),
    ("app_18_presentation.js",     "src/app/18-presentation.js"),
    ("app_19_certificates.js",     "src/app/19-certificates.js"),
    ("app_20_display_modes.js",    "src/app/20-display-modes.js"),
    ("app_21_solo_mode.js",        "src/app/21-solo-mode.js"),
    ("app_22_features_v7.js",      "src/app/22-features-v7.js"),
    ("app_23_mobile_a11y.js",      "src/app/23-mobile-a11y.js"),
    ("app_24_color_blind.js",      "src/app/24-color-blind.js"),
    ("app_25_team_stats.js",       "src/app/25-team-stats.js"),
    ("app_26_more_features.js",    "src/app/26-more-features.js"),
    ("app_27_a11y_phase3.js",      "src/app/27-a11y-phase3.js"),
    ("app_28_audio_assets2.js",    "src/app/28-audio-assets-2.js"),
    ("app_29_browser_compat.js",   "src/app/29-browser-compat.js"),
    ("app_30_more_i18n.js",        "src/app/30-more-i18n.js"),
    ("app_31_settings_panel.js",   "src/app/31-settings-panel.js"),
    ("app_32_buzzer_sync.js",      "src/app/32-buzzer-sync.js"),
    ("app_33_podium_music.js",     "src/app/33-podium-music.js"),
    ("app_34_drag_touch.js",       "src/app/34-drag-touch.js"),
    ("app_35_order_search.js",     "src/app/35-order-search.js"),
    ("app_36_windows_templates.js","src/app/36-windows-templates.js"),
    ("app_37_windows_logic.js",    "src/app/37-windows-logic.js"),
    ("app_38_periodic_cleanup.js", "src/app/38-periodic-cleanup.js"),
    ("app_39_history_arial.js",    "src/app/39-history-aria.js"),
    ("app_40_features_block.js",   "src/app/40-features-block.js"),
    ("app_41_final_enhancements.js","src/app/41-final-enhancements.js"),

    # HTML body markup (will be embedded into index.html)
    ("body_markup.html",           "src/templates/body.html"),

    # Head meta (will be referenced from index.html)
    ("head_meta.html",             "src/templates/head-meta.html"),

    # Tail (closing tags)
    ("tail.html",                  "src/templates/tail.html"),
]

# Also clean up the stray "vendor_js_pre.txt" file if present
for src_name, dst_rel in MOVES:
    src_path = EXTRACTED / src_name
    dst_path = ROOT / dst_rel
    if not src_path.exists():
        print(f"  ⚠ SKIP (missing): {src_name}")
        continue
    dst_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src_path, dst_path)
    print(f"  ✓ {src_name:<40} → {dst_rel}")

print(f"\n✓ Moved {len(MOVES)} files into project structure.")
