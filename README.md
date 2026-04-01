# 🤖 PR Review Agent — GitAgent Hackathon 2026

> An AI-powered code reviewer that **lives inside your git repository**.  
> Define it. Version it. Deploy it. Zero infrastructure required.

[![GitAgent Standard](https://img.shields.io/badge/GitAgent-Standard%20v1.0-blue)](https://gitagent.sh)
[![GitHub Actions](https://img.shields.io/badge/Runs%20on-GitHub%20Actions-2088FF)](https://github.com/features/actions)
[![Model](https://img.shields.io/badge/Model-Gemini%202.0%20Flash-orange)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## 🎯 What Is This?

**PR Review Agent** is a fully autonomous AI code reviewer built on the [GitAgent open standard](https://gitagent.sh).

Every time a Pull Request is opened or updated, this agent:

- 📊 Generates a **Health Score (0–100)** for the PR
- 🔒 Flags **security vulnerabilities** (hardcoded secrets, SQL injection, etc.)
- 🐛 Catches **bugs and logic errors** before they hit production
- 🏷️ **Auto-labels** the PR (`lgtm`, `needs-changes`, `security-risk`)
- 💬 **Updates its comment** instead of spamming new ones
- 📁 Gives a **per-file breakdown** of issues

No server. No database. No infrastructure. Just a git repo.

---

## 🏗️ Architecture
```
pr-review-agent/
├── agent.yaml          # GitAgent manifest — identity, model, skills
├── SOUL.md             # Agent personality and communication style  
├── RULES.md            # Hard constraints and must-never rules
├── DUTIES.md           # Role definition and segregation of duties
├── skills/
│   └── pr-review/
│       └── SKILL.md    # Review skill — triggers, instructions, format
├── tools/
│   └── github-api.yaml # Tool schema for GitHub REST API
├── workflows/
│   └── review.yaml     # Workflow definition
├── scripts/
│   └── pr_review.py    # Runtime script executed by GitHub Actions
└── .github/
    └── workflows/
        └── pr-review.yml  # GitHub Actions trigger
```

This agent follows the **GitAgent standard** — every behavioral decision is defined in version-controlled markdown files, not hardcoded logic. Want to change how the agent reviews? Edit `SOUL.md` and commit. Full audit trail included.

---

## ⚡ How It Works
```
Developer opens PR
       │
       ▼
GitHub Actions triggers pr-review.yml
       │
       ▼
Agent reads SOUL.md + RULES.md + SKILL.md
       │
       ▼
Fetches PR diff + changed file list via GitHub API
       │
       ▼
Sends diff to Gemini 2.0 Flash with structured prompt
       │
       ▼
Parses review → extracts Health Score
       │
       ├──► Posts/updates comment on PR
       │
       └──► Applies labels (lgtm / needs-changes / security-risk)
```

---

## 🚀 Quick Start

### 1. Fork or clone this repo
```bash
git clone https://github.com/Arav1904/pr-review-agent.git
cd pr-review-agent
```

### 2. Get a free Gemini API key
Go to [aistudio.google.com](https://aistudio.google.com) → **Get API Key** → Create API key

### 3. Add secret to your repo
GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
```
Name:  GEMINI_API_KEY
Value: your_api_key_here
```

### 4. Open a Pull Request
That's it. The agent automatically triggers and posts a review like this:

---

## 📸 Demo

### What a review looks like:
```
## 🤖 ReviewBot Summary
**Health Score: 23/100**
**Files reviewed:** 2 | **Verdict:** Security Alert 🚨

---

### 🔒 CRITICAL Issues
**Hardcoded API Key** (scripts/sample.py, line 3)
API_KEY = "sk-1234567890abcdef" is committed to version history.
Fix: Use os.environ.get("API_KEY") instead.

---

### 🐛 HIGH — Bugs & Logic Errors
**SQL Injection** (scripts/sample.py, line 9)
String concatenation in SQL query allows injection attacks.
Fix: Use parameterized queries: cursor.execute("SELECT * FROM users WHERE username = ?", (username,))

**Division by Zero** (scripts/sample.py, line 12)
divide(a, b) has no guard against b=0.
Fix: Add if b == 0: raise ValueError("Cannot divide by zero")

**Unclosed File Handle** (scripts/sample.py, line 15)
open() without context manager leaks file handles.
Fix: Use with open(path) as f:

---

### 💡 MEDIUM — Suggestions
Consider adding type hints for better IDE support and documentation.

---

### ✅ What's Done Well
Clean function separation. Each function has a single responsibility.

---

### 📁 Per-File Notes
- scripts/sample.py: Multiple critical issues — do not merge
```

**Labels automatically applied:** `security-risk` `needs-changes`

---

## 🔧 Customization

### Change the agent's personality
Edit `SOUL.md` — make it stricter, friendlier, or domain-specific (security-focused, Python-only, etc.)

### Change review rules
Edit `RULES.md` — add must-always or must-never constraints

### Change what gets reviewed
Edit `skills/pr-review/SKILL.md` — add new review dimensions

### Change the model
Edit `agent.yaml` — swap `gemini-2.0-flash-lite` for any supported model

Every change is version-controlled. Every change is reviewable via PR. Every change is auditable via `git log`.

---

## 🔄 Export to Other Frameworks

Because this agent follows the GitAgent standard, it can be exported to other runtimes:
```bash
# Install GitAgent CLI
npm i -g @open-gitagent/gitagent

# Export to Claude Code
gitagent export --format claude-code

# Export to system prompt
gitagent export --format system-prompt

# Validate compliance
gitagent validate
```

---

## 🛡️ Segregation of Duties

| Action | ReviewBot | Developer | Maintainer |
|--------|-----------|-----------|------------|
| Read PR diff | ✅ | ✅ | ✅ |
| Post review comment | ✅ | ❌ | ❌ |
| Approve PR | ❌ | ❌ | ✅ |
| Merge PR | ❌ | ❌ | ✅ |
| Modify agent rules | ❌ | ❌ | ✅ |

---

## 🧰 Tech Stack

| Component | Technology |
|-----------|------------|
| Agent Standard | GitAgent v1.0 |
| AI Model | Google Gemini 2.0 Flash Lite |
| Runtime | GitHub Actions (serverless) |
| Language | Python 3.11 |
| API Integration | GitHub REST API |
| Cost | $0 |

---

## 📋 Hackathon Compliance

- ✅ Uses GitAgent open standard (`agent.yaml`, `SOUL.md`, `SKILL.md`, `DUTIES.md`)
- ✅ All code open source in public GitHub repository  
- ✅ Built during hackathon window
- ✅ Working demo — open any PR to see it live
- ✅ Serverless deployment via GitHub Actions
- ✅ Framework-agnostic — exportable to Claude Code, OpenAI, CrewAI

---

## 📄 License

MIT — use it, fork it, build on it.