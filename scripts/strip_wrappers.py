#!/usr/bin/env python3
"""
Strip wrapping <script>...</script> and <style>...</style> tags from extracted
files so they can be referenced cleanly from index.html.

Also strips leading/trailing blank lines and ensures files end with a newline.
"""

import re
from pathlib import Path

ROOT = Path("/home/z/my-project/quiz-platform/src")

JS_FILES = list((ROOT / "vendor").glob("*.js")) + list((ROOT / "app").glob("*.js"))
CSS_FILES = list((ROOT / "styles").glob("*.css"))

print(f"Processing {len(JS_FILES)} JS files and {len(CSS_FILES)} CSS files...")

def strip_js(path: Path):
    text = path.read_text(encoding="utf-8")
    # Remove a leading "<script>" line (with optional attributes) and trailing "</script>"
    # Only strip if the file starts with it (otherwise leave alone).
    original = text
    # Match leading <script ...> on its own line
    text = re.sub(r'^\s*<script(?:\s[^>]*)?>\s*\n', '', text)
    # Match trailing </script> on its own line
    text = re.sub(r'\n\s*</script>\s*$', '', text)
    # Strip leading HTML comments like "<!-- Quill.js — EMBEDDED for offline use -->"
    text = re.sub(r'^\s*<!--[^>]*-->\s*\n', '', text)
    # Tidy: strip leading/trailing blank lines
    text = text.strip() + "\n"
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False

def strip_css(path: Path):
    text = path.read_text(encoding="utf-8")
    original = text
    text = re.sub(r'^\s*<style(?:\s[^>]*)?>\s*\n', '', text)
    text = re.sub(r'\n\s*</style>\s*$', '', text)
    text = re.sub(r'^\s*<!--[^>]*-->\s*\n', '', text)
    text = text.strip() + "\n"
    if text != original:
        path.write_text(text, encoding="utf-8")
        return True
    return False

changed_js = 0
for p in JS_FILES:
    if strip_js(p):
        changed_js += 1
        print(f"  ✓ JS  {p.relative_to(ROOT)}")

changed_css = 0
for p in CSS_FILES:
    if strip_css(p):
        changed_css += 1
        print(f"  ✓ CSS {p.relative_to(ROOT)}")

print(f"\n✓ Stripped wrappers from {changed_js} JS files and {changed_css} CSS files.")
