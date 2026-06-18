#!/usr/bin/env python3
"""
Test hypothesis: file 24's outer IIFE (opened at line 147) closes at file 27's
line 425. If so, we can fix the boundary by moving the IIFE opening from file 24
to file 25 (or by merging the files).
"""

import re
from pathlib import Path

ROOT = Path("/home/z/my-project/quiz-platform/src/app")

# Read files 24, 25, 26, 27
f24 = (ROOT / "24-color-blind.js").read_text(encoding='utf-8')
f25 = (ROOT / "25-team-stats.js").read_text(encoding='utf-8')
f26 = (ROOT / "26-more-features.js").read_text(encoding='utf-8')
f27 = (ROOT / "27-a11y-phase3.js").read_text(encoding='utf-8')

# Extract file 24's content from line 147 onwards (the IIFE opening)
f24_lines = f24.split('\n')
iife_open_line = None
for i, line in enumerate(f24_lines):
    if line.startswith("(function(){") or line.startswith("(function() {"):
        if i > 100:  # Skip early IIFEs
            iife_open_line = i
            break

if iife_open_line is None:
    print("✗ Could not find IIFE opening in file 24")
    exit(1)

print(f"IIFE opening found at line {iife_open_line + 1} of file 24")
f24_iife_section = '\n'.join(f24_lines[iife_open_line:])

# Extract file 27's content up to and including line 425
f27_lines = f27.split('\n')
print(f"File 27 has {len(f27_lines)} lines")
# Line 425 is the extra `}` — include up to and including it
f27_up_to_425 = '\n'.join(f27_lines[:425])

# Construct the test IIFE
test_code = f24_iife_section + '\n' + f25 + '\n' + f26 + '\n' + f27_up_to_425 + '\n})();\n'

# Write to a temp file and test with node
test_file = Path("/home/z/my-project/quiz-platform/.test_iife.js")
test_file.write_text(test_code, encoding='utf-8')

print(f"Test code: {len(test_code)} bytes, {test_code.count(chr(10))} lines")
print(f"Written to {test_file}")
