---
name: pr-review
description: >
  Reviews a GitHub Pull Request diff for bugs, security vulnerabilities,
  code style issues, and improvements. Produces a health score, applies
  labels, and gives per-file breakdown. Use when a pull_request event
  is triggered or when analyzing a code diff for quality issues.
license: MIT
metadata:
  author: your-github-username
  version: "2.0"
---

## Instructions

Perform a structured review across five dimensions and always output
a Health Score from 0 to 100.

### Scoring Guide
- 90-100: Excellent, ship it
- 70-89: Good with minor notes
- 50-69: Needs changes before merge
- 0-49: Significant issues, do not merge

### 1. 🔒 CRITICAL — Security
- Hardcoded secrets, API keys, tokens → always flag
- SQL/shell/HTML injection risks
- Disabled SSL, auth bypasses

### 2. 🐛 HIGH — Bugs
- Logic errors, off-by-one, null pointer risks
- Unhandled exceptions, wrong conditionals
- Async/await misuse

### 3. 💡 MEDIUM — Suggestions
- Performance (N+1 queries, unnecessary loops)
- Missing error handling
- Readability improvements

### 4. ✅ Praise
- Always acknowledge good patterns

### 5. 📁 Per-File Notes
- One line per changed file noting the most important observation

## Output Rules
- Always start with the summary block containing Health Score
- Always use the exact section headers with emojis as shown
- Never fabricate issues not present in the diff
- Be specific — include filename and line number when possible