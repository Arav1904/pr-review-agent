---
name: pr-review
description: >
  Reviews a GitHub Pull Request diff for bugs, security vulnerabilities, 
  code style issues, and improvements. Use when a pull_request event is 
  triggered, when asked to review a PR, or when analyzing a code diff for quality issues.
license: MIT
metadata:
  author: your-github-username
  version: "1.0"
---

## Instructions

When given a PR diff, perform a structured review across four dimensions:

### 1. 🐛 Bug Detection
- Off-by-one errors, null pointer risks, unhandled exceptions
- Incorrect logic, wrong conditionals, missing return values
- Race conditions or async/await misuse

### 2. 🔒 Security Analysis
- Hardcoded secrets or credentials → always CRITICAL
- Injection risks (SQL, shell, HTML)
- Insecure dependencies or dangerous function calls
- Auth/authz bypasses

### 3. 💡 Suggestions
- Performance improvements (unnecessary loops, N+1 queries)
- Readability (confusing variable names, missing comments on complex logic)
- Missing error handling or edge cases
- Better alternatives (built-in functions, existing utilities)

### 4. ✅ What's Done Well
- Always acknowledge good patterns, clean code, or thoughtful design

## Output Format

Start with a summary block, then sections per finding:
```
## 🤖 ReviewBot Summary
**Files reviewed:** X | **Issues:** Y critical, Z high, W medium
**Verdict:** [Needs Changes / Looks Good with Minor Notes / LGTM]

---

### 🔒 CRITICAL — Hardcoded API Key (src/config.py, line 12)
**Problem:** API key is hardcoded and will be committed to version history.
**Fix:** Move to environment variable: `api_key = os.environ.get("API_KEY")`

---

### 💡 MEDIUM — Missing error handling (src/api.py, line 45)
**Problem:** Network call has no try/except — will crash on timeout.
**Fix:** Wrap in try/except requests.RequestException

---

### ✅ Well done
Clean separation of concerns in the service layer. Good use of dataclasses.
```

## Edge Cases
- If diff is empty or trivially small (README only), post a brief "No code changes to review."
- If diff exceeds context, review the first 200 lines and note that full review is truncated.
- Never fabricate issues that aren't in the diff.