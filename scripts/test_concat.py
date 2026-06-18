#!/usr/bin/env python3
"""
Test: Concatenate file 24 (from line 147) + file 25 + file 26 + file 27.
If balanced, the IIFE from file 24 closes at the end of file 27.
"""

from pathlib import Path

ROOT = Path("/home/z/my-project/quiz-platform/src/app")

f24 = (ROOT / "24-color-blind.js").read_text(encoding='utf-8')
f25 = (ROOT / "25-team-stats.js").read_text(encoding='utf-8')
f26 = (ROOT / "26-more-features.js").read_text(encoding='utf-8')
f27 = (ROOT / "27-a11y-phase3.js").read_text(encoding='utf-8')

f24_lines = f24.split('\n')
# Find IIFE opening at line 147 (index 146)
f24_from_147 = '\n'.join(f24_lines[146:])  # line 147 is index 146

test_code = f24_from_147 + '\n' + f25 + '\n' + f26 + '\n' + f27 + '\n'

test_file = Path("/home/z/my-project/quiz-platform/.test_concat.js")
test_file.write_text(test_code, encoding='utf-8')
print(f"Written {len(test_code)} bytes to {test_file}")
