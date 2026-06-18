#!/usr/bin/env python3
"""
Fix the boundary between 36-windows-templates.js and 37-windows-logic.js.

The original extraction cut mid-template-literal (the template ends with
</body></html>`; on line 34158 of the source). Move the closing portion
from file 37 to file 36 so the template literal stays intact.
"""

from pathlib import Path

ROOT = Path("/home/z/my-project/quiz-platform/src/app")
F36 = ROOT / "36-windows-templates.js"
F37 = ROOT / "37-windows-logic.js"

# Read both files
text36 = F36.read_text(encoding='utf-8')
text37 = F37.read_text(encoding='utf-8')

# File 36 ends with: "}\ninit();\n<\/script>\n"
# File 37 starts with: "</body></html>`;\n}\n\nfunction showHostHint(){"
# We need to move "</body></html>`;\n}\n\n" from start of 37 to end of 36.

# Find the marker "</body></html>`;" at the start of file 37
# (it's the closing of the template literal that was split)
marker = '</body></html>`;'
if not text37.startswith(marker):
    print("✗ File 37 does not start with the expected marker.")
    print(f"  First 100 chars: {text37[:100]!r}")
    exit(1)

# Find where the function boundary is — search for the next "function " declaration
# after the marker
idx = text37.find(marker)
# After the marker, expect: ";\n}\n\nfunction ..."
# Find the next "function " keyword after the marker
import re
m = re.search(r'\n\n(function |\(\s*function |\(\)\s*=>\s*\{)', text37[idx:])
if not m:
    print("✗ Could not find function boundary in file 37.")
    exit(1)

split_at = idx + m.start() + 2  # +2 to include the two newlines

move_to_36 = text37[:split_at]
new_37 = text37[split_at:]

# Append to file 36 (ensure newline separation)
if not text36.endswith('\n'):
    text36 += '\n'
new_36 = text36 + move_to_36

F36.write_text(new_36, encoding='utf-8')
F37.write_text(new_37, encoding='utf-8')

print(f"✓ Moved {len(move_to_36)} bytes from 37 to 36.")
print(f"  File 36 now ends with: ...{new_36[-100:]!r}")
print(f"  File 37 now starts with: {new_37[:100]!r}")
