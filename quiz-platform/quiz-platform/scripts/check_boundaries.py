#!/usr/bin/env python3
"""
Validate file boundaries: each extracted JS file should end at a safe point
(top-level statement boundary, not inside a function/template literal).

Strategy: count opening and closing braces, parentheses, brackets, and
template literal backticks. If they're unbalanced, the boundary is wrong.
"""

import re
from pathlib import Path

ROOT = Path("/home/z/my-project/quiz-platform/src/app")
files = sorted(ROOT.glob("*.js"))

print(f"Checking {len(files)} app JS files for boundary balance...\n")

def check_balance(text):
    """Returns dict of imbalanced tokens: {'{': 5, '`': 2, ...}"""
    # Strip strings and comments to count actual structural braces
    # This is approximate — for production code we'd need a proper parser.
    in_string = None
    in_line_comment = False
    in_block_comment = False
    in_template = False
    template_depth = 0
    escape = False

    counts = {'{': 0, '}': 0, '(': 0, ')': 0, '[': 0, ']': 0, '`': 0}
    i = 0
    while i < len(text):
        c = text[i]
        nxt = text[i+1] if i+1 < len(text) else ''
        if escape:
            escape = False
            i += 1
            continue
        if in_line_comment:
            if c == '\n':
                in_line_comment = False
            i += 1
            continue
        if in_block_comment:
            if c == '*' and nxt == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_string:
            if c == '\\':
                escape = True
                i += 2
                continue
            if c == in_string:
                in_string = None
            i += 1
            continue
        # Not in string or comment
        if c == '/' and nxt == '/':
            in_line_comment = True
            i += 2
            continue
        if c == '/' and nxt == '*':
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'"):
            in_string = c
            i += 1
            continue
        if c == '`':
            counts['`'] += 1
            i += 1
            continue
        if c in counts:
            counts[c] += 1
        i += 1

    # Check balance
    issues = []
    if counts['{'] != counts['}']:
        issues.append(f"braces {{={counts['{']} }}={counts['}']}")
    if counts['('] != counts[')']:
        issues.append(f"parens (={counts['(']} )={counts[')']}")
    if counts['['] != counts[']']:
        issues.append(f"brackets [={counts['[']} ]={counts[']']}")
    if counts['`'] % 2 != 0:
        issues.append(f"backticks `={counts['`']}")
    return issues, counts

for f in files:
    text = f.read_text(encoding='utf-8')
    issues, counts = check_balance(text)
    name = f.name
    if issues:
        print(f"  ⚠ {name}: {', '.join(issues)}")
    else:
        print(f"  ✓ {name}: balanced ({{={counts['{']} }}={counts['}']} (={counts['(']} )={counts[')']} [={counts['[']} ]={counts[']']} `={counts['`']})")
