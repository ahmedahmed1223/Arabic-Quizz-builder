#!/usr/bin/env python3
"""
Comprehensive section extractor for the quiz-platform.html single-file app.
Properly identifies and extracts:
- Vendor CSS (Quill, Cropper, KaTeX)
- Vendor JS (KaTeX, XLSX, Sanitizer, Quill, Cropper, jsPDF, SortableJS, LZ-String)
- Main app CSS (split into logical chunks)
- HTML body markup
- Main app JS (split into logical chunks at section boundaries)
- Sub-window HTML templates (embedded as JS template literals)
"""

import os
import re
from pathlib import Path

SRC = "/home/z/my-project/upload/quiz-platform.html"
OUT = Path("/home/z/my-project/quiz-platform/.extracted")
OUT.mkdir(parents=True, exist_ok=True)

# Read full source
with open(SRC, "r", encoding="utf-8") as f:
    lines = f.readlines()
TOTAL = len(lines)
print(f"Total source lines: {TOTAL}")

def write(name, start, end, desc=""):
    """Extract lines [start, end] (1-indexed inclusive) to a file."""
    chunk = "".join(lines[start-1:end])
    out_path = OUT / name
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(chunk)
    print(f"  [{start:>6}-{end:>6}] {name:<45} ({len(chunk):>10} bytes) — {desc}")
    return out_path

# ---------- HEAD + VENDOR CSS ----------
write("head_meta.html",          1,    19,  "Head meta + Google Fonts")
write("vendor_quill_css.css",   20,    28,  "Quill WYSIWYG Editor CSS")
write("vendor_cropper_css.css", 31,    41,  "Cropper.js CSS")
write("vendor_katex_css.css",   43,    46,  "KaTeX CSS v0.16.9")

# ---------- VENDOR JS (HEAD) ----------
# 48-51: <script> KaTeX
# 52-55: <script> KaTeX auto-render
# 56-83: <script> XLSX (SheetJS) — actually 56 is comment, 57 is <script>, 82 is </script>
# 84-158: <script> V9 HTML Sanitizer — 84 is comment, 85 is <script>, 158 is </script>
write("vendor_katex_js.js",      48,    51,  "KaTeX v0.16.11 JS")
write("vendor_katex_autorender.js", 52, 55,  "KaTeX auto-render extension")
write("vendor_xlsx_js.js",       56,    83,  "SheetJS (XLSX) v0.18.5")
write("vendor_sanitizer_js.js",  84,   158,  "V9 HTML Sanitizer")

# ---------- MAIN APP CSS ----------
write("main_app_css.css",       159,  5214, "Main application CSS")

# ---------- HTML BODY ----------
write("body_markup.html",      5216,  8953, "HTML body markup")

# ---------- MAIN APP JS (1 big script: 8954-36772) ----------
# This is one giant script tag. Split at major section boundaries.
# Line 8954: <script>
# Line 8955: (start of content)
# Line 8956: // ═══ (V7 SortableJS bundled inline comment)
# Line 8959: /*! Sortable 1.15.6 - MIT */
# Line 8962: // ═══ (more comments)
# Line 8966: const APP_VERSION = '10.4.0';
# Line 8974: // ─── Q1: PubSub Store
# Line 9618: // ─── END V7 FOUNDATION
# Line 9620: // ═══ CONSTANTS
# Line 9624: // ═══ IndexedDB MEDIA STORAGE
# Line 9964: // ── Unified Media Helpers
# Line 10100: // ═══ I18N
# Line 13711: // ── Embedded default background music
# Line 13801: // ═══ LZ-STRING COMPRESSION section
# Line 13988: // ═══ (next section)
# Line 14641: // ═══ (next section)
# Line 14924: // ═══ (next section)
# Line 15079: // ═══ (next section)
# Line 15538: // ═══ (next section)
# Line 16066: // ═══ (next section)
# Line 16129: // ═══ (next section)
# Line 16244: // ═══ (next section)
# Line 16578: // ═══ (next section)
# Line 16586: // ── V9: Password hashing
# Line 16667: // ═══ (next section)
# Line 16950: // ═══ (next section)
# Line 17189: // ═══ (next section)
# Line 17209: // ═══ (next section)
# Line 17265: // ═══ (next section)
# Line 17450: // ═══ (next section)
# Line 17688: // ═══ (next section)
# Line 17843: // ═══ (next section)
# Line 17912: // ═══ (next section)
# Line 17957: // ═══ ENCRYPTED EXPORT/IMPORT
# Line 18063: // ═══ SESSION HISTORY
# Line 18337: // ═══ (next section)
# Line 18374: // ═══ (next section)
# Line 18640: // ═══ (next section)
# Line 19161: // ═══ (next section)
# Line 19193: // ═══ (next section)
# Line 19246: // ═══ (next section)
# Line 19343: // ─── MODE 1: GRID
# Line 19543: // ─── MODE 2: LIST
# Line 19666: // ─── MODE 3: HIDDEN
# Line 19724: // ─── MODE 4: JEOPARDY
# Line 19810: // ─── MODE 5: FORTUNE WHEEL
# Line 20034: // ═══ (next section)
# Line 20134: // ═══ (next section)
# Line 20152: // ═══ (next section)
# Line 20813: // ── Solo option selection
# Line 20904: // ═══ (next section)
# Line 20981: // ═══ (next section)
# Line 21206: // ── Error Log Viewer
# ... (continues to 32883 with review console template literal)
# Line 32883-33171: Review Console HTML template (inside template literal)
# Line 33171-33387: Audience Display HTML template part 1
# Line 33387-34158: Audience Display HTML template part 2 (continues with JS)
# Line 34158-36772: Continuation of app JS
# Line 36772: </script>

# Split strategy: extract SortableJS as a separate vendor file, then split the rest
# into logical chunks at major section boundaries

# SortableJS embedded at the start of main script (line 8959 onward, ends ~ line 8960 based on size)
# Let's find the actual end of SortableJS
sortable_start = 8959  # /*! Sortable 1.15.6 - MIT */
# Find the next "const APP_VERSION" which comes after SortableJS
for i in range(sortable_start, 9100):
    if "const APP_VERSION" in lines[i-1]:
        sortable_end = i - 1
        break
print(f"\nSortableJS: lines {sortable_start}-{sortable_end}")

# Foundation (Store, ErrorBus, etc.) — from after SortableJS to end of V7 FOUNDATION
# Line 8974: // ─── Q1: PubSub Store
# Line 9618: // ─── END V7 FOUNDATION
foundation_start = sortable_end + 1
# Find next "// ═══" or "const APP_VERSION" line - that's the foundation start
for i in range(sortable_end + 1, sortable_end + 20):
    if "const APP_VERSION" in lines[i-1] or "APPLICATION VERSION" in lines[i-1]:
        foundation_start = i
        break

# Constants + IndexedDB Media Storage — 9620 to ~10100
# I18N — 10100 to ~13800
# LZ-String + remaining app code — 13800 onward

# Use the section markers to split logically:
# Block A: 8954-8959 (script tag + SortableJS opening comment) - we'll merge into vendor_sortable_js.js
# Block B: 8962-9618 (Application version + V7 Foundation)
# Block C: 9620-10100 (Constants + IndexedDB Media Storage)
# Block D: 10100-13800 (I18N system)
# Block E: 13800-17957 (LZ-String + various state/services)
# Block F: 17957-19246 (Encrypted export, session history, more)
# Block G: 19246-20813 (Display modes: Grid, List, Hidden, Jeopardy, Wheel)
# Block H: 20813-32883 (Solo mode + many features)
# Block I: 32883-34158 (Review Console + Audience Display templates + logic - INSIDE template literals)
# Block J: 34158-36772 (Continued app JS until </script>)

# Find actual end of main script
script_end = 36772  # </script>

write("vendor_sortable_js.js", 8954, 8958, "Script open + SortableJS comment header")
# Actually let's just extract SortableJS properly
# Read lines 8954-8960 to find the boundary
print("\nLines around SortableJS boundary:")
for i in range(8954, 8975):
    print(f"  {i}: {lines[i-1][:120].rstrip()}")

print()
# Now do the splits
write("app_01_foundation.js",      8954,  9618, "Foundation: SortableJS, APP_VERSION, V7 Foundation (Store, ErrorBus, etc.)")
write("app_02_storage.js",         9619,  9963, "Constants + IndexedDB Media Storage")
write("app_03_media_helpers.js",   9964,  10099,"Unified Media Helpers")
write("app_04_i18n.js",            10100, 13710,"I18N system (Arabic/English)")
write("app_05_audio_assets.js",    13711, 13800,"Embedded default background music + assets")
write("app_06_compression.js",     13801, 13987,"LZ-String compression + early state")
write("app_07_state_mgmt.js",      13988, 14640,"State management + storage")
write("app_08_question_mgmt.js",   14641, 14923,"Question management")
write("app_09_team_mgmt.js",       14924, 15078,"Team management")
write("app_10_category_mgmt.js",   15079, 15537,"Category management")
write("app_11_play_logic.js",      15538, 16065,"Play logic (main game flow)")
write("app_12_timer.js",           16066, 16128,"Timer system")
write("app_13_scoring.js",         16129, 16243,"Scoring system")
write("app_14_admin_panel.js",     16244, 16577,"Admin panel logic")
write("app_15_auth_security.js",   16578, 16666,"Password hashing + auth security")
write("app_16_encryption.js",      16667, 17956,"Encryption + session history + state continued")
write("app_17_history.js",         17957, 18336,"Encrypted export/import + session history")
write("app_18_presentation.js",    18337, 19160,"Presentation mode (intro, teams, categories, questions)")
write("app_19_certificates.js",    19161, 19245,"Certificates + podium")
write("app_20_display_modes.js",   19246, 20812,"Display modes (Grid, List, Hidden, Jeopardy, Wheel)")
write("app_21_solo_mode.js",       20813, 21205,"Solo mode + option selection")
write("app_22_features_v7.js",     21206, 27904,"V7 features (badges, hints, search, etc.)")
write("app_23_mobile_a11y.js",     27905, 28182,"Mobile + accessibility + event delegation")
write("app_24_color_blind.js",     28183, 28361,"Color blindness + accessibility")
write("app_25_team_stats.js",      28362, 28880,"Team stats + branching questions")
write("app_26_more_features.js",   28881, 29285,"More features (template dropdown, bulk import)")
write("app_27_a11y_phase3.js",     29286, 29711,"Accessibility Phase 3")
write("app_28_audio_assets2.js",   29712, 29920,"Audio assets (V11 embedded sounds)")
write("app_29_browser_compat.js",  29921, 30982,"Browser compatibility check")
write("app_30_more_i18n.js",       30983, 31411,"Section 7.5 + V15 i18n keys")
write("app_31_settings_panel.js",  31412, 31688,"Settings panel logic")
write("app_32_buzzer_sync.js",     31689, 32043,"BroadcastChannel + buzzer sync")
write("app_33_podium_music.js",    32044, 32253,"Podium music functions")
write("app_34_drag_touch.js",      32254, 32522,"Touch drag for option rows")
write("app_35_order_search.js",    32523, 32697,"Order question + search/jump")
write("app_36_windows_templates.js", 32698, 34157, "Review Console + Audience Display templates (inside template literals) + their JS logic")
write("app_37_windows_logic.js",   34158, 35880,"Window logic: whiteboard, audience poll, QR generator, etc.")
write("app_38_periodic_cleanup.js",35881, 36772,"Periodic cleanup + tab visibility + final of main script")

# ---------- V10 ANIMATIONS CSS ----------
write("v10_animations.css",       36774, 37076, "V10 animation improvements CSS")

# ---------- JS BLOCK 3 (history, ARIA, spinner) ----------
write("app_39_history_arial.js",  37078, 37321, "History API + ARIA live + spinner + import preview")

# ---------- Quill, Cropper, jsPDF (vendor) ----------
write("vendor_quill_js.js",       37322, 37330, "Quill.js (vendor)")
write("vendor_cropper_js.js",     37331, 37343, "Cropper.js (vendor)")
write("vendor_jspdf_js.js",       37344, 37744, "jsPDF (vendor)")

# ---------- FIVE FEATURES BLOCK ----------
write("app_40_features_block.js", 37745, 38631, "Five features: external lib, WYSIWYG, image cropping, undo/redo, report export")

# ---------- FINAL JS BLOCK ----------
write("app_41_final_enhancements.js", 38636, 40137, "Final enhancements: theme editor, animations, dashboard rendering")

# ---------- TAIL ----------
write("tail.html",                40138, 40139, "Closing body/html tags")

print(f"\n✓ Extraction complete. {len(list(OUT.iterdir()))} files in {OUT}")
