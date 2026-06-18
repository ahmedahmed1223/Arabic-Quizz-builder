#!/usr/bin/env python3
"""
Fix the boundary between 37-windows-logic.js and 38-periodic-cleanup.js.

File 37 ends with an open IIFE: (function Phase4_Init(){ 'use strict';
File 38 contains the body of that IIFE and closes it with })();

Move the IIFE opening from end of 37 to start of 38 so the IIFE stays intact.
"""

import re
from pathlib import Path

ROOT = Path("/home/z/my-project/quiz-platform/src/app")
F37 = ROOT / "37-windows-logic.js"
F38 = ROOT / "38-periodic-cleanup.js"

text37 = F37.read_text(encoding='utf-8')
text38 = F38.read_text(encoding='utf-8')

# Find the IIFE opening at the end of file 37
# Pattern: (function Phase4_Init(){ 'use strict';
pattern = r"\(function\s+Phase4_Init\(\)\s*\{\s*\n'use strict';\s*\n?\s*$"
m = re.search(pattern, text37)
if not m:
    print("✗ Could not find Phase4_Init IIFE opening at end of file 37.")
    print(f"  Last 200 chars: {text37[-200:]!r}")
    exit(1)

iife_open = text37[m.start():]
new_37 = text37[:m.start()].rstrip() + '\n'
new_38 = iife_open + '\n' + text38

F37.write_text(new_37, encoding='utf-8')
F38.write_text(new_38, encoding='utf-8')

print(f"✓ Moved {len(iife_open)} bytes (Phase4_Init IIFE opening) from 37 to 38.")
print(f"  File 37 now ends with: ...{new_37[-120:]!r}")
print(f"  File 38 now starts with: {new_38[:120]!r}")
