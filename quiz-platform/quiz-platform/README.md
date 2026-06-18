# 🎯 منصة المسابقات التفاعلية — Quiz Platform

> **Interactive Quiz Platform** — A fully offline-capable, single-file web app for creating and hosting engaging quiz competitions. Built with Vite, restructured from a monolithic HTML file into a clean, modular project.

[![Build: Single File](https://img.shields.io/badge/build-single%20file-success)](#-build) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](#-license) [![Vite](https://img.shields.io/badge/Vite-5.x-646cff)](https://vitejs.dev/) [![Mobile Friendly](https://img.shields.io/badge/mobile-friendly-green)](#-responsive-design) [![Accessibility](https://img.shields.io/badge/a11y-WCAG%20AA-orange)](#-accessibility)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Build](#-build)
- [Responsive Design](#-responsive-design)
- [Accessibility](#-accessibility)
- [Browser Support](#-browser-support)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

This project is an **Arabic-first interactive quiz platform** that supports:

- **Team competitions** with scoring, lifelines, and tiebreakers
- **Solo mode** with level progression, stars, and achievements
- **Multiple question types**: text, true/false, fill-in-blank, order, match, math, Quran, image, audio, video
- **Multiple display modes**: grid, list, hidden cards, Jeopardy board, fortune wheel
- **Presentation mode** with projector/second-screen support via Remote Control + Audience Display
- **Offline-capable** — works completely without internet after first load

Originally a 6.4 MB single-file HTML app (40,139 lines), it has been **restructured into a clean, multi-file Vite project** that builds back to a single self-contained HTML file for offline distribution.

---

## ✨ Features

### 🎮 Game Modes
- **Team Mode** — Multiple teams compete with turn-based play, scoring, lifelines (50/50, skip, extra time)
- **Solo Mode** — Single player progresses through levels with stars, achievements, and leaderboard
- **Training Mode** — No timer, instant answer reveal for practice

### 📝 Question Types
- Text multiple choice (4 options)
- True/False
- Fill in the blank
- Order (arrange items)
- Match (pair items)
- Math (with KaTeX rendering)
- Quran memorization
- Image-based
- Audio-based
- Video-based

### 🎨 Display Modes
- **Grid** — Classic card grid
- **List** — Vertical list view
- **Hidden Cards** — Mystery flip cards
- **Jeopardy Board** — Value-based selection (100-500 points)
- **Fortune Wheel** — Spinning wheel for random selection

### 🛠 Admin Panel
- **Dashboard** with stats, charts, quick actions
- **Categories management** with search, drag-reorder, bulk import
- **Questions editor** with type-specific UI, templates, preview
- **Teams management** with members, colors, scores
- **Themes** — 19 built-in themes + custom theme editor
- **Import/Export** — JSON, Excel (XLSX), Google Sheets, encrypted backups
- **Settings** — Timer, scoring, sounds, accessibility, certificates

### 🎯 Presentation Features
- **Fullscreen mode** for projectors
- **Remote Control** window (phone-friendly)
- **Audience Display** window (second screen)
- **Buzzer mode** for live competitions
- **Whiteboard** overlay
- **Audience Poll** (simulated)
- **QR Code** generator for joining
- **Winner Certificate** with PDF export

### 🌐 Internationalization
- **Arabic** (RTL, primary)
- **English** (LTR)
- Switchable at runtime, persisted

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Build Tool** | Vite 5.x |
| **Single-File Output** | Custom `vite-plugin-inline-classic-assets.js` |
| **Vendor Libraries** | KaTeX 0.16.11, SheetJS (XLSX) 0.18.5, Quill, Cropper.js 1.6.1, jsPDF 2.5.1, SortableJS 1.15.6, LZ-String 1.5.0 |
| **Fonts** | Cairo, Tajawal, Amiri, Noto Naskh Arabic (Google Fonts) |
| **Storage** | IndexedDB (media) + LocalStorage (state) + LZ-String compression |
| **Security** | SHA-256 password hashing (Web Crypto), HTML sanitizer, CSP |

---

## 🗂 Project Structure

```
quiz-platform/
├── index.html                          # Main HTML entry
├── package.json                        # Dependencies & scripts
├── vite.config.js                      # Vite build configuration
├── vite-plugin-inline-classic-assets.js  # Custom plugin: inlines everything for single-file output
├── .gitignore                          # Git ignore rules
├── README.md                           # This file
│
├── scripts/                            # Build & maintenance scripts
│   ├── extract_sections.py             # Extract sections from original HTML
│   ├── move_to_project.py              # Move files into src/ layout
│   ├── strip_wrappers.py               # Strip <script>/<style> wrappers
│   ├── check_syntax.mjs                # Verify each file's JS syntax
│   ├── find_unbalanced.mjs             # Locate unbalanced braces/parens
│   ├── check_boundaries.py             # Check brace/paren balance
│   └── ... (more maintenance scripts)
│
└── src/
    ├── styles/                         # All CSS (vendor + app + enhancements)
    │   ├── vendor-quill.css            # Quill WYSIWYG editor styles
    │   ├── vendor-cropper.css          # Cropper.js styles
    │   ├── vendor-katex.css            # KaTeX math styles (with embedded fonts)
    │   ├── main.css                    # Main application CSS (~5000 lines)
    │   ├── animations.css              # V10 animation performance CSS
    │   ├── enhancements.css            # UI/UX enhancement layer 1 (design system)
    │   ├── enhancements-2.css          # Enhancement layer 2 (screen-specific)
    │   ├── enhancements-3.css          # Enhancement layer 3 (final polish)
    │   ├── enhancements-solo.css       # Solo mode enhancements
    │   ├── enhancements-admin.css      # Admin panel enhancements
    │   ├── enhancements-mobile.css     # Mobile responsiveness v1
    │   ├── enhancements-v2.css         # Categories search + presentation fixes
    │   └── enhancements-mobile-v2.css  # Mobile scroll & header fixes
    │
    ├── vendor/                         # Third-party libraries
    │   ├── katex.js                    # KaTeX v0.16.11
    │   ├── katex-autorender.js         # KaTeX auto-render
    │   ├── xlsx.js                     # SheetJS v0.18.5
    │   ├── sanitizer.js                # HTML sanitizer
    │   ├── quill.js                    # Quill WYSIWYG
    │   ├── cropper.js                  # Cropper.js v1.6.1
    │   └── jspdf.js                    # jsPDF v2.5.1
    │
    ├── app/                            # Application JavaScript (38 modules)
    │   ├── 01-foundation.js            # APP_VERSION, V7 Foundation (Store, ErrorBus, etc.)
    │   ├── 02-storage.js               # IndexedDB Media Storage
    │   ├── 03-media-helpers.js         # Unified media helpers
    │   ├── 04-i18n.js                  # Internationalization (Arabic/English)
    │   ├── 05-audio-assets.js          # Embedded background music
    │   ├── 06-compression.js           # LZ-String compression
    │   ├── 07-state-mgmt.js            # State management
    │   ├── 08-question-mgmt.js         # Question CRUD
    │   ├── 09-team-mgmt.js             # Team management
    │   ├── 10-category-mgmt.js         # Category management
    │   ├── 11-play-logic.js            # Main game flow
    │   ├── 12-timer.js                 # Timer system
    │   ├── 13-scoring.js               # Scoring + audit log
    │   ├── 14-admin-panel.js           # Admin panel + view switching
    │   ├── 15-auth-security.js         # Password hashing + auth
    │   ├── 16-encryption.js            # Encryption + state + categories/questions render
    │   ├── 17-history.js               # Encrypted export/import + session history
    │   ├── 18-presentation.js          # Presentation mode
    │   ├── 19-certificates.js          # Certificates + podium
    │   ├── 20-display-modes.js         # Display modes (Grid, List, Hidden, Jeopardy, Wheel)
    │   ├── 21-solo-mode.js             # Solo mode option selection + leaderboard
    │   ├── 22-features-v7.js           # V7 features (badges, hints, search, solo)
    │   ├── 23-mobile-a11y.js           # Mobile + accessibility + event delegation
    │   ├── 24-phase3-a11y-features.js  # Phase 3: color blindness, charts, Google Sheets
    │   ├── 28-audio-assets-2.js        # V11 embedded sounds
    │   ├── 29-browser-compat.js        # Browser compatibility check
    │   ├── 30-more-i18n.js             # Additional i18n keys
    │   ├── 31-settings-panel.js        # Settings panel
    │   ├── 32-buzzer-sync.js           # Cross-tab buzzer sync
    │   ├── 33-podium-music.js          # Podium music
    │   ├── 34-drag-touch.js            # Touch drag for options
    │   ├── 35-order-search.js          # Order question + search
    │   ├── 36-windows-templates.js     # Review Console + Audience Display templates
    │   ├── 37-windows-logic.js         # Window logic + visibility handling
    │   ├── 38-periodic-cleanup.js      # Performance: virtual scroll, lazy tabs, cleanup
    │   ├── 39-history-aria.js          # History API + ARIA + spinner
    │   ├── 40-features-block.js        # Five features: External Lib, WYSIWYG, Image Crop, Undo/Redo, Report Export
    │   ├── 41-final-enhancements.js    # Theme editor, animations, dashboard
    │   └── 42-freeze-fix.js            # Anti-freeze on browser minimize + Home button fix
    │
    └── templates/
        ├── body.html                   # Full body markup
        ├── head-meta.html              # Original head meta (reference)
        └── tail.html                   # Closing tags (reference)
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+**
- **npm 9+** (or pnpm/yarn)

### Installation

```bash
git clone <your-repo-url>
cd quiz-platform
npm install
```

### Development

```bash
npm run dev
```

Opens Vite dev server at `http://localhost:5173`.

### Default Login

- **Password**: `1234` (can be changed in Settings)

---

## 📦 Build

### Single-File Build (Production)

```bash
npm run build
```

Produces **`dist/index.html`** — a single self-contained HTML file (~7 MB) with all CSS, JS, and the body template inlined. Works completely offline.

### Preview Build

```bash
npm run preview
```

### Verify Single-File Output Works Offline

```bash
# Open the built file directly — should work with no network
open dist/index.html          # macOS
xdg-open dist/index.html      # Linux
start dist/index.html         # Windows
```

### How the Build Works

The custom Vite plugin (`vite-plugin-inline-classic-assets.js`):

1. **Inlines every `<script src="/src/...">`** as inline `<script>` blocks (preserves shared-global-scope IIFE pattern)
2. **Inlines every `<link rel="stylesheet" href="/src/...">`** as inline `<style>` blocks
3. **Replaces `<!-- __BODY_MARKER__ -->`** with the body template
4. **Base64-encodes scripts with control characters** (XLSX, jsPDF) to avoid parse5 errors

---

## 📱 Responsive Design

The app is fully responsive with breakpoints at:

| Breakpoint | Target | Layout Changes |
|---|---|---|
| ≤ 400px | Small phones | Compact spacing, 2-column grids |
| ≤ 640px | Phones | Single column, full-width buttons, stacked layouts |
| 641-768px | Large phones / small tablets | 2-column grids where appropriate |
| 769-1024px | Tablets | 2-3 column grids, adjusted spacing |
| ≥ 1025px | Desktop | Multi-column layouts, sticky sidebars |

### Mobile-Specific Features

- **Touch targets** ≥ 44px (WCAG recommended)
- **Bottom navigation** (scrollable, replaces top tabs on mobile)
- **Full-screen modals** with slide-up animation
- **Horizontal scrollable headers** (presentation mode)
- **Safe-area support** for iPhone notch
- **Momentum scrolling** with hidden scrollbars
- **Sticky search bar** in categories management

---

## ♿ Accessibility

- **WCAG AA contrast** for all text
- **Focus-visible rings** on all interactive elements
- **ARIA live regions** for score updates and announcements
- **Screen reader support** with proper labels
- **Keyboard navigation** (arrow keys, Enter, Escape, number keys for options)
- **High contrast mode** support (`prefers-contrast: high`)
- **Reduced motion** support (`prefers-reduced-motion: reduce`)
- **Skip to main content** link
- **Color blindness filters** (protanopia, deuteranopia, tritanopia)
- **Font size slider** (50%-200%)

---

## 🌐 Browser Support

- **Chrome/Edge 90+** ✅
- **Firefox 88+** ✅
- **Safari 14+** ✅
- **Mobile Safari 14+** ✅
- **Chrome Android 90+** ✅

Uses modern APIs: IndexedDB, Web Crypto, BroadcastChannel, MutationObserver, CSS Grid, backdrop-filter.

---

## 🤝 Contributing

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Edit files** in `src/app/` (keep numbered prefix for load order)
4. **Run syntax check**: `node scripts/check_syntax.mjs`
5. **Build**: `npm run build`
6. **Test** the output both on desktop and mobile
7. **Commit** your changes
8. **Open a Pull Request**

### Coding Standards

- **Arabic-first** — UI text in Arabic, with English translations in i18n
- **RTL support** — All layouts must work in RTL mode
- **Offline-capable** — No external dependencies at runtime
- **Progressive enhancement** — Core features work without JavaScript enhancements
- **Accessibility** — All new features must be keyboard-navigable and screen-reader-friendly

---

## 📜 License

MIT — see embedded library licenses (KaTeX, XLSX, Quill, Cropper, jsPDF, SortableJS, LZ-String) for third-party terms.

---

## 🙏 Acknowledgments

Built with:
- [Vite](https://vitejs.dev/) — Build tool
- [KaTeX](https://katex.org/) — Math typesetting
- [SheetJS](https://sheetjs.com/) — Excel import/export
- [Quill](https://quilljs.com/) — Rich text editor
- [Cropper.js](https://fengyuanchen.github.io/cropperjs/) — Image cropping
- [jsPDF](https://github.com/parallax/jsPDF) — PDF generation
- [SortableJS](https://sortablejs.github.io/Sortable/) — Drag-and-drop
- [LZ-String](https://github.com/pieroxy/lz-string/) — Compression

---

## 📊 Project Stats

| Metric | Value |
|---|---|
| Total source files | 60+ |
| Application JS modules | 38 |
| CSS enhancement layers | 10 |
| Vendor libraries | 7 |
| Build output size | ~7 MB (single file) |
| Languages supported | 2 (Arabic, English) |
| Themes | 19 built-in + custom |
| Question types | 10 |
| Display modes | 5 |
