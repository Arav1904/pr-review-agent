# 🤖 PR Review Agent

**An AI-powered code reviewer that lives inside your git repository.**  
Define it. Version it. Deploy it. Zero infrastructure. Zero cost.

![GitAgent Standard](https://img.shields.io/badge/GitAgent-Standard%20v1.0-6366f1?style=for-the-badge&logo=git&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-Serverless-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_2.0_Flash-LLM-FF6F00?style=for-the-badge&logo=google&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_Llama_3.3-Fallback-00B4D8?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)
![Cost](https://img.shields.io/badge/Cost-Zero_Dollars-gold?style=for-the-badge)

---

## 📌 At a Glance

| | |
|---|---|
| 🧠 **What it does** | Reviews every Pull Request automatically using AI |
| 🏗️ **Built on** | GitAgent open standard — the repo IS the agent |
| ⚡ **Runtime** | GitHub Actions — serverless, no infrastructure |
| 🤖 **Primary LLM** | Google Gemini 2.0 Flash Lite |
| 🔄 **Fallback LLM** | Groq Llama 3.3 70B — auto-switches if quota exceeded |
| ⏱️ **Setup time** | 2 minutes for any repo |
| 💰 **Cost** | Completely free |

---

## 🎯 What Is This?

PR Review Agent is a fully autonomous AI code reviewer built on the [GitAgent open standard](https://gitagent.sh). It lives entirely inside your git repository — no server, no database, no external service to maintain.

Every behavioral decision is defined in version-controlled markdown files (`SOUL.md`, `RULES.md`, `SKILL.md`), making the agent fully transparent, auditable, and customizable via Pull Request. Want to change how the agent reviews? Edit `SOUL.md` and commit. The change is tracked in git history forever.

When any PR is opened or updated, the agent automatically reviews it and posts a structured comment directly on the PR — catching bugs, security issues, and teaching best practices before bad code reaches production.

---

## ✨ Everything This Agent Does

| Feature | Description |
|---------|-------------|
| 📊 **Health Score 0–100** | Every PR gets a precise numeric score, not just pass/fail |
| 🔴🟠🟡🟢 **Score Badge** | Visual rating: `critical` / `poor` / `fair` / `good` / `excellent` |
| 🔒 **Security Scanning** | Catches hardcoded secrets, SQL injection, command injection, unsafe eval, disabled SSL |
| 🐛 **Bug Detection** | Finds logic errors, division by zero, unclosed file handles, missing returns, null risks |
| 🔧 **Exact Code Fixes** | Before/after code snippets for every issue found, with plain English explanations |
| 🧠 **Key Insights** | 3–5 lessons the author should remember, written in simple encouraging language |
| 🏷️ **8 Auto-Labels** | Smart labeling based on what was found — security, bugs, performance, tests, and more |
| 💬 **Smart Comments** | Updates its existing comment on re-runs — no spam, always current |
| 📁 **Per-File Summary** | Individual assessment for every file changed in the PR |
| 📝 **PR Quality Check** | Flags missing PR descriptions, short titles, missing conventional commit format |
| 🧠 **Agent Memory** | Reads project context and tracks score history across all past reviews |
| ⚙️ **Fully Configurable** | Adjust strictness, focus areas, skip files, and add custom rules per repo |
| ⏭️ **Draft PR Detection** | Automatically skips draft PRs and reviews when marked ready |
| 🔁 **Score Trend Tracking** | Shows exactly how much the score improved or dropped from last review |
| 🔄 **Dual LLM Fallback** | Never goes down — automatically switches from Gemini to Groq if quota is hit |
| 💬 **Manual Re-trigger** | Type `/review` in any comment to run a fresh review anytime |
| 📦 **GitAgent Compliant** | Passes `gitagent validate` in CI on every push |
| 🌐 **Marketplace Action** | Any repo can adopt it in 2 minutes — no cloning required |

---

## 📸 Live Demo

### 🔴 Security Alert — Health Score: 14/100

```
🤖 ReviewBot Summary
Health Score: 14/100
Files reviewed: 1 | Verdict: Security Alert

🔒 Critical Issues
• Hardcoded API key in scripts/auth_service.py line 3
• SQL injection in authenticate() — string concatenation in SQL query
• os.system() called with user-controlled input in run_command()
• pickle.loads() on untrusted data in load_pickle()

🐛 Bugs and Logic Errors
None found.

🔧 Code Fixes

Fix 1 — Hardcoded API key in scripts/auth_service.py, line 3:
  BEFORE: API_KEY = "sk-prod-live-abc123xyz789"
  AFTER:  API_KEY = os.environ.get("API_KEY")
  Why: Hardcoding secrets commits them to git history permanently —
       anyone with repo access can read them forever.

Fix 2 — SQL injection in scripts/auth_service.py, line 9:
  BEFORE: query = "SELECT * FROM users WHERE username='" + username + "'"
  AFTER:  cursor.execute("SELECT * FROM users WHERE username=?", (username,))
  Why: String concatenation lets attackers inject arbitrary SQL and
       access or delete your entire database.

Fix 3 — Command injection in scripts/auth_service.py, line 13:
  BEFORE: os.system(cmd)
  AFTER:  subprocess.run(cmd.split(), shell=False)
  Why: Passing user input to os.system allows running any shell command
       on your server.

🧠 Key Insights
• Always store credentials in environment variables, never in code
• Use parameterized queries — they are immune to SQL injection by design
• Never pass user input to shell commands without strict validation
• pickle.loads() on untrusted data is remote code execution waiting to happen

📁 Per-File Summary
scripts/auth_service.py — 4 critical security vulnerabilities, do not merge

🔴 Score rating: critical | ReviewBot v3 — 2026-04-04 16:52 UTC
💬 Type /review in a comment to re-trigger this review anytime.
```

**Labels automatically applied:** `security-risk` `needs-changes`

---

### 🟢 Clean Code — Health Score: 88/100

```
🤖 ReviewBot Summary
Health Score: 88/100
Files reviewed: 1 | Verdict: LGTM

🔒 Critical Issues
None found.

🐛 Bugs and Logic Errors
None found.

💡 Suggestions
• scripts/user_service.py — Consider adding type hints to all public
  methods for better IDE support and self-documenting code.

✅ What Is Done Well
Excellent use of context managers for database connections — no resource
leaks possible. Parameterized queries throughout. Dataclasses reduce
boilerplate cleanly. Clear separation of concerns between layers.

🔧 Code Fixes
No fixes needed — code looks clean!

🧠 Key Insights
• Context managers (with statements) guarantee cleanup even if exceptions occur
• Dataclasses are excellent for plain data containers — less code, more readable
• Separation of concerns makes code easier to test and maintain independently

📁 Per-File Summary
scripts/user_service.py — Production-ready, strong patterns, minor doc suggestion

🟢 Score rating: excellent | Score improved +46 pts from last review
💬 Type /review in a comment to re-trigger this review anytime.
```

**Labels automatically applied:** `lgtm` `good-practices`

---

### 📊 Score Range Reference

The 7 sample files in this repo demonstrate every score range:

| File | Score | What It Demonstrates |
|------|:-----:|----------------------|
| `samples/critical_disaster.py` | ~5 | Hardcoded AWS keys, eval(), SQL injection, rm -rf / |
| `samples/high_severity.py` | ~18 | pickle.loads(), disabled SSL, no error handling |
| `samples/moderate_bugs.py` | ~35 | Division by zero, missing return values, bare loops |
| `samples/needs_improvement.py` | ~52 | Minimal typing, basic error handling, no logging |
| `samples/good_code.py` | ~71 | Parameterized queries, context managers, logging |
| `samples/excellent_code.py` | ~84 | Dataclasses, pagination, full type hints |
| `samples/perfect_code.py` | ~93 | Value objects, custom exceptions, full docstrings |

Open a PR with any of these files to see the agent in action.

---

## 🚀 Quick Start

### Option A — GitHub Action (Recommended, 2 minutes)

Add this file to your repo at `.github/workflows/pr-review.yml`:

```yaml
name: PR Review Agent

on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      contents: read
      issues: write
    steps:
      - uses: actions/checkout@v4
      - uses: Arav1904/pr-review-agent@main
        with:
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}
          groq_api_key: ${{ secrets.GROQ_API_KEY }}
```

Then add your free API keys as repository secrets:
1. Go to [aistudio.google.com](https://aistudio.google.com) → **Get API Key** → copy it
2. Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New secret**
3. Name: `GEMINI_API_KEY`, Value: your key
4. Optionally add `GROQ_API_KEY` from [console.groq.com](https://console.groq.com) as fallback
5. Open any Pull Request — the bot reviews it within 30 seconds

### Option B — Fork and Customize

```bash
git clone https://github.com/Arav1904/pr-review-agent.git
cd pr-review-agent
```

Fork it, add your secrets, and customize `SOUL.md` to change how the agent behaves. Every change goes through a PR — and ReviewBot reviews its own updates.

---

## ⚙️ Configuration

Create `.reviewbot.yml` in your repo root to customize behavior:

```yaml
# Review strictness: low / medium / high
strictness: medium

# Skip PRs marked as draft
skip_drafts: true

# Max diff size in characters before truncation
max_diff_size: 15000

# Disable auto-labeling if you manage labels yourself
skip_labels: false

# Which dimensions to focus on
focus:
  security: true       # hardcoded secrets, injection, unsafe functions
  bugs: true           # logic errors, unhandled exceptions, wrong conditions
  performance: true    # N+1 queries, unnecessary loops, slow patterns
  style: false         # set to true to also check naming and formatting

# Files to skip entirely (glob patterns supported)
skip_files:
  - "*.lock"
  - "*.min.js"
  - "migrations/*"
  - "*.generated.*"
  - "TEST.md"

# Rules that apply to every review in this repo
custom_rules:
  - "Flag any hardcoded credentials or API keys"
  - "Flag use of eval() or exec() on user input"
  - "Ensure all SQL queries use parameterized statements"
  - "Check for missing input validation on API endpoints"
```

---

## ⚡ How It Works

```
Developer opens or updates a PR
              │
              ▼
    GitHub Actions triggers
              │
              ▼
    gitagent validate
    Confirms GitAgent standard compliance
              │
              ▼
    Agent loads its identity files
    SOUL.md + RULES.md + SKILL.md + memory/context.md
              │
              ▼
    Fetches from GitHub API
    PR diff + changed file list + PR metadata + title + description
              │
              ▼
    Checks PR quality
    Title length, description present, conventional commit format
              │
              ▼
    Calls Gemini 2.0 Flash
    (auto-falls back to Groq Llama 3.3 if quota is exceeded)
              │
              ▼
    Parses the response
    Extracts Health Score, issues, fixes, insights
              │
              ├──► Posts or updates comment on PR
              ├──► Applies labels from 8-label system
              └──► Appends entry to memory/dailylog.md
```

---

## 🏷️ Label System

| Label | Color | Applied When |
|-------|-------|--------------|
| `lgtm` | 🟢 Green | Score ≥ 80, no critical issues or bugs |
| `needs-changes` | 🔴 Red | Score < 80 or any issue found |
| `security-risk` | 🟥 Dark Red | Any critical security vulnerability detected |
| `bug-detected` | 🔴 Red | Logic errors or bugs found |
| `performance-issue` | 🟡 Amber | Performance problems + score < 75 |
| `good-practices` | 🟢 Teal | Score ≥ 88, clean well-structured code |
| `needs-tests` | 🟣 Purple | Missing test coverage detected |
| `breaking-change` | 🟥 Dark Red | Backward compatibility risk detected |

---

## 📁 Repository Structure

```
pr-review-agent/
│
├── agent.yaml                  # GitAgent manifest — model, skills, tools, compliance
├── SOUL.md                     # Agent identity, personality, values, communication style
├── RULES.md                    # Hard constraints — must-always and must-never rules
├── DUTIES.md                   # Segregation of duties — what the agent can never do
│
├── skills/
│   └── pr-review/
│       └── SKILL.md            # Review skill with YAML frontmatter and full instructions
│
├── tools/
│   └── github-api.yaml         # Tool schema for GitHub REST API
│
├── workflows/
│   └── review.yaml             # Workflow definition
│
├── memory/
│   ├── context.md              # Project context — agent reads before every review
│   └── dailylog.md             # Auto-updated log of all past PR scores and findings
│
├── scripts/
│   └── pr_review.py            # Full runtime — 430 lines, all features implemented here
│
├── samples/                    # 7 example files covering every score range (0–93)
│   ├── critical_disaster.py    # ~5   — AWS keys, eval(), SQL injection, rm -rf /
│   ├── high_severity.py        # ~18  — pickle, disabled SSL, no error handling
│   ├── moderate_bugs.py        # ~35  — division by zero, missing returns
│   ├── needs_improvement.py    # ~52  — minimal typing, basic error handling
│   ├── good_code.py            # ~71  — parameterized queries, context managers
│   ├── excellent_code.py       # ~84  — dataclasses, pagination, full type hints
│   └── perfect_code.py         # ~93  — value objects, custom exceptions, full docs
│
├── action.yml                  # GitHub Marketplace action definition
├── .reviewbot.yml              # Default configuration
├── CONTRIBUTING.md             # How to customize and extend the agent
├── LICENSE                     # MIT
│
└── .github/
    └── workflows/
        └── pr-review.yml       # Two-job CI — validate then review
```

---

## 📐 GitAgent Standard

This agent is built entirely on the [GitAgent open standard](https://gitagent.sh) — a framework-agnostic, git-native format for defining AI agents.

The same way Docker standardized how software is packaged, GitAgent standardizes how AI agents are defined. Your agent becomes a portable, version-controlled, auditable artifact.

```bash
# Install the GitAgent CLI
npm i -g @open-gitagent/gitagent

# Validate this agent against the standard
gitagent validate

# Export to other runtimes
gitagent export --format claude-code
gitagent export --format openai
gitagent export --format system-prompt
gitagent export --format crewai
```

---

## 🛡️ Segregation of Duties

The agent is designed with strict role separation. It can review but never decide:

| Action | ReviewBot | Developer | Maintainer |
|--------|:---------:|:---------:|:----------:|
| Read PR diff | ✅ | ✅ | ✅ |
| Post review comment | ✅ | ❌ | ❌ |
| Apply labels | ✅ | ❌ | ✅ |
| Approve PR | ❌ | ❌ | ✅ |
| Merge PR | ❌ | ❌ | ✅ |
| Modify agent rules | ❌ | ❌ | ✅ |
| Write production code | ❌ | ✅ | ✅ |

---

## 🧰 Tech Stack

| Component | Technology | Cost |
|-----------|------------|:----:|
| Agent Standard | GitAgent v1.0 | Free |
| Primary LLM | Google Gemini 2.0 Flash Lite | Free |
| Fallback LLM | Groq Llama 3.3 70B | Free |
| Runtime | GitHub Actions | Free |
| Language | Python 3.11 | Free |
| PR Integration | GitHub REST API | Free |
| **Total** | | **$0** |

---

## ✅ Hackathon Compliance

- ✅ Uses GitAgent open standard — `agent.yaml`, `SOUL.md`, `RULES.md`, `DUTIES.md`, `SKILL.md`
- ✅ Brings the agent to life with gitclaw via `gitagent validate` in CI
- ✅ All code is open source in a public GitHub repository
- ✅ Built entirely during the hackathon window — no prior work
- ✅ Working demo — open any PR on this repo to see it live right now
- ✅ Serverless deployment via GitHub Actions — fully clawless-compatible
- ✅ Framework-agnostic — exports to Claude Code, OpenAI, CrewAI and more
- ✅ Available as a GitHub Marketplace Action — any team can adopt in 2 minutes

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to customize and extend this agent.

The most powerful thing about this project: every change to the agent goes through a Pull Request, and ReviewBot reviews its own updates. The repo is the agent. The agent reviews the repo.

---

## 📄 License

MIT — use it, fork it, build on it.

---

*Built for the GitAgent Hackathon 2026 · [GitAgent](https://gitagent.sh) + [Gemini](https://ai.google.dev) + [Groq](https://groq.com)*