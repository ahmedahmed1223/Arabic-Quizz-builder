#!/usr/bin/env python3
"""
Merge files 24, 25, 26, 27 into a single file because file 24's outer IIFE
(opened at line 147) wraps content in files 25, 26, and most of 27, closing
at file 27's last line.

The merged file becomes: 24-phase3-a11y-features.js
"""

import re
from pathlib import Path

ROOT = Path("/home/z/my-project/quiz-platform/src/app")

# Read all four files
f24 = (ROOT / "24-color-blind.js").read_text(encoding='utf-8')
f25 = (ROOT / "25-team-stats.js").read_text(encoding='utf-8')
f26 = (ROOT / "26-more-features.js").read_text(encoding='utf-8')
f27 = (ROOT / "27-a11y-phase3.js").read_text(encoding='utf-8')

# Concatenate with section headers for clarity
header = """// ════════════════════════════════════════════════════════════════════════
//  PHASE 3: ACCESSIBILITY & ADVANCED FEATURES (merged 24+25+26+27)
//  Color Blindness Filters · Event Delegation · Team Stats ·
//  Charts · More Features · ARIA Improvements · Google Sheets Import
//  NOTE: These sections are merged because file 24's outer IIFE spans
//        all of them (closing at the end of original file 27).
// ════════════════════════════════════════════════════════════════════════

"""

separator = "\n\n// ────────────────────────────────────────────────────────────\n//  Continued from previous section (merged boundary)\n// ────────────────────────────────────────────────────────────\n\n"

merged = header + f24 + separator + f25 + separator + f26 + separator + f27

# Write merged file
merged_path = ROOT / "24-phase3-a11y-features.js"
merged_path.write_text(merged, encoding='utf-8')
print(f"✓ Created merged file: {merged_path.name} ({len(merged)} bytes)")

# Delete the old files
for old in ["24-color-blind.js", "25-team-stats.js", "26-more-features.js", "27-a11y-phase3.js"]:
    (ROOT / old).unlink()
    print(f"  ✓ Deleted old file: {old}")
