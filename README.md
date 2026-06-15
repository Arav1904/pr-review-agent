<div align="center">

# 🤖 ReviewBot — GitAgent ReviewBot

### An AI code reviewer that lives inside your GitHub repository

**Define it. Version it. Deploy it. Zero infrastructure. Zero cost.**

[![AI/ML Track](https://img.shields.io/badge/OSC%20AI%20Build%201.0-AI%2FML%20Track-58A6FF?style=flat-square)](https://github.com/Arav1904/pr-review-agent)
[![Status](https://img.shields.io/badge/Status-Final%20Submission-3FB950?style=flat-square)](#-shipped-for-final-submission)
[![Cost](https://img.shields.io/badge/Monthly%20Cost-%240-3FB950?style=flat-square)](#%EF%B8%8F-tech-stack)
[![Dashboard](https://img.shields.io/badge/Dashboard-Live%20on%20Vercel-BC8CFF?style=flat-square)](https://pr-review-agent-007.vercel.app/)
[![License](https://img.shields.io/badge/License-MIT-8B949E?style=flat-square)](#license)

[**🚀 Live Dashboard**](https://pr-review-agent-007.vercel.app/) &nbsp;·&nbsp; [**💻 GitHub Repo**](https://github.com/Arav1904/pr-review-agent) &nbsp;·&nbsp; [**⚡ Quick Start**](#-quick-start-2-minutes) &nbsp;·&nbsp; [**⚙️ Configuration**](#%EF%B8%8F-configuration-reference) &nbsp;·&nbsp; [**🧪 Verify New Features**](#-verifying-new-features-open-a-test-pr)

</div>

<br>

<div align="center">

| 🧠 Agent | 📊 Dashboard | 💬 Inline Comments | 🔔 Notifications | 🌐 Multi-Language | 🧙 Config Wizard |
|:---:|:---:|:---:|:---:|:---:|:---:|
| ✅ Live | ✅ Live | ✅ Live | ✅ Live | ✅ Live | ✅ Live |

</div>

---

<details open>
<summary><strong>📑 Table of Contents</strong></summary>

- [Overview](#-overview)
- [Why ReviewBot?](#-why-reviewbot)
- [How It Works](#-how-it-works--pr-open-to-full-review-in-30-seconds)
- [What ReviewBot Actually Posts](#-what-reviewbot-actually-posts)
- [Features](#-features)
- [Analytics Dashboard](#-analytics-dashboard)
- [Quick Start (2 Minutes)](#-quick-start-2-minutes)
- [Verifying New Features (Open a Test PR)](#-verifying-new-features-open-a-test-pr)
- [Configuration Reference](#%EF%B8%8F-configuration-reference)
- [Notifications](#-notifications)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Repository Structure](#-repository-structure)
- [Live Demo Results](#-live-demo-results)
- [Future Vision](#-future-vision)
- [Built By](#-built-by)

</details>

---

## 📖 Overview

ReviewBot is an autonomous AI code review agent that runs entirely inside **GitHub Actions**. The moment a pull request is opened or updated, ReviewBot reads the diff, scores it from **0–100**, finds security issues and bugs, suggests exact before/after code fixes, applies smart labels, posts inline comments on the exact lines that need attention, and notifies your team — all without a server, a database, or a subscription.

It is built on the **GitAgent standard** — the agent's entire personality, rules, and capabilities live in version-controlled markdown files (`SOUL.md`, `RULES.md`, `DUTIES.md`, `SKILL.md`) right next to your code. Want to change how the agent reviews code? Commit a change to `SOUL.md`. That's it — no redeploys, no dashboards to click through, no vendor lock-in.

Paired with ReviewBot is a **live analytics dashboard** — a standalone React app that visualizes every PR's health score, trends over time, and team leaderboards, deployable to Vercel in minutes.

---

## ✨ Why ReviewBot?

| Problem | ReviewBot's Answer |
|---|---|
| **60% of PRs merge without thorough review** (Stack Overflow Dev Survey 2023) | Every PR gets a full automated review in ~30 seconds — no PR slips through |
| **Bugs are 80× more expensive to fix in production** than at PR stage | Issues are caught and explained *before* merge, with exact fixes |
| **SonarQube / Reviewpad / CodeClimate cost ₹1L–₹10L/year** | ReviewBot runs on the GitHub Actions free tier — **$0/month**, forever |
| **Reviewers forget past patterns** | Agent memory tracks score history and recurring issues across every PR |
| **Setup takes days of DevOps work** | One workflow YAML + two free API keys = **2-minute adoption** on any repo |

---

## 🧠 How It Works — PR Open to Full Review in ~30 Seconds

```
┌─────────────┐    ┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  PR Opened  │ -> │   Actions   │ -> │     AI Review     │ -> │  Post + Label    │ -> │  Notify Team │
│             │    │   Trigger   │    │                    │    │                  │    │              │
│ Developer   │    │ GitHub      │    │ SOUL.md + RULES.md │    │ Inline comments  │    │ Slack +      │
│ opens/      │    │ Actions     │    │ + memory loaded.   │    │ pinned to diff   │    │ Email with   │
│ updates PR  │    │ fires the   │    │ Gemini 2.0 Flash   │    │ lines + 8 smart  │    │ score, top   │
│             │    │ workflow    │    │ analyzes diff,     │    │ labels applied   │    │ issue & link │
│             │    │ instantly   │    │ falls back to Groq │    │                  │    │              │
└─────────────┘    └─────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
                                                                         │
                                                                         v
                                                          ┌──────────────────────────┐
                                                          │  memory/score_trend.md    │
                                                          │  committed back to repo   │
                                                          │  → powers the dashboard   │
                                                          └──────────────────────────┘
```

`SOUL.md` + `RULES.md` + `SKILL.md` + `DUTIES.md` define the agent's personality, hard constraints, and capabilities — all version-controlled in git, editable via PR. The change is tracked in git history forever, like any other code change.

---

## 🎯 What ReviewBot Actually Posts

This isn't a mockup — this is the **real comment format** ReviewBot posts on every pull request, taken directly from a live review on this repo (`PR #12`):

> #### 🤖 ReviewBot Summary
> **Health Score: 14/100** 🔴
> Files reviewed: 1 · Verdict: **Security Alert**
>
> **🔒 Critical Issues**
> - Hardcoded API key — line 3
> - SQL injection in `authenticate()`
> - `os.system()` on user input — command injection
>
> **🔧 Code Fix #1 — line 3**
> ```diff
> - API_KEY = "sk-prod-abc123"
> + API_KEY = os.environ.get("API_KEY")
> ```
>
> **🔧 Code Fix #2 — SQL injection**
> ```diff
> - "SELECT * WHERE user=" + name
> + cursor.execute(q, (name,))
> ```
>
> 🔴 **critical** · Labels applied: `security-risk` `needs-changes`

And on the inline annotation side, ReviewBot pins comments directly to the offending line via GitHub's Review Comments API:

> **🔒 Security · ReviewBot** — *on `src/api/github_client.py`, line 42*
>
> This query is vulnerable to SQL injection. Use parameterized queries instead.
>
> ```python
> cursor.execute(q, (uid,))
> ```

No vague "looks good to me" — every comment names the exact problem, the exact line, and the exact fix.

---

## 🚀 Features

### Core Review Engine

- **Health Score (0–100)** — every PR gets a precise numeric score with a visual badge: critical / poor / fair / good / excellent
- **Security + Bug Scanning** — detects hardcoded secrets, SQL injection, `eval()` misuse, command injection, null pointer risks, missing error handling, and more
- **Exact Code Fixes** — before/after code snippets with a plain-English explanation for *every* flagged issue, not just a list of complaints
- **8-Label Auto-Classification** — `security-risk`, `lgtm`, `bug-detected`, `needs-tests`, `breaking-change`, `enhancement`, `documentation`, `chore` applied automatically
- **Agent Memory** — reads project context and maintains score history across every past PR; the agent gets smarter over time
- **Dual-LLM Fallback** — primary reviews run on **Google Gemini 2.0 Flash**; if quota is hit, the agent automatically falls back to **Groq Llama 3.3 70B**. The agent never goes down.

### 🆕 Shipped for Final Submission

These were promised on the roadmap for June 15 — **all seven are now live**:

| Feature | What it does | Where to see it |
|---|---|---|
| **📊 Analytics Web Dashboard** | Full React + Recharts dashboard deployed to Vercel — live GitHub sync or instant demo mode | [Live Dashboard](https://pr-review-agent-007.vercel.app/) |
| **🏆 Team PR Score Leaderboard** | Contributors ranked by average health score, consistency %, and net lines changed | Dashboard → *Leaderboard* tab |
| **📈 Trend Graphs Over Time** | Composed charts: health score + rolling average + code churn, all on one view | Dashboard → *Score Trends* tab |
| **💬 Inline Comment Annotations** | ReviewBot now comments directly on the exact line that needs attention, via GitHub's Review Comments API | Any open PR diff |
| **🔔 Slack + Email Notification Hooks** | Color-coded Slack Block Kit messages and dark-themed HTML email digests on every review | `scripts/notify.py` |
| **🧙 Custom SOUL.md Config Wizard** | Interactive CLI (`tools/soul_wizard.py`) with 4 built-in presets — Strict, Startup, Mentor, Open Source | `python tools/soul_wizard.py` |
| **🌐 Multi-Language Repo Support** | Per-language checks for JavaScript/TypeScript, Python, Java, Go, Rust, and CSS via `.reviewbot.yml` | `.reviewbot.yml` → `languages:` |

---

## 📊 Analytics Dashboard

**Live demo:** [pr-review-agent-007.vercel.app](https://pr-review-agent-007.vercel.app/)

A standalone Vite + React dashboard that turns every PR review into a visual story. No backend required — it talks directly to the GitHub REST API from the browser, or runs entirely on bundled demo data.

### Pages

- **Overview** — animated health-score ring with letter grade (A+ to F), repo-wide stats, score distribution, quality radar chart, label breakdown, and a 35-day GitHub-style activity heatmap
- **Score Trends** — composed chart combining health score, 3-PR rolling average, and code churn (additions/deletions) on dual Y-axes; average score broken down by label
- **Leaderboard** — contributors ranked by average score with consistency %, best/worst scores, and PR share
- **Pull Requests** — full searchable, filterable, sortable PR table; click any row to open a detail drawer with the AI's full verdict, files changed, and diff stats

### Standout Features

- **🪄 AI Insights Panel** — auto-generated, plain-English takeaways: quality trend direction, security exposure, top contributor, and file hotspots
- **🔍 Global Search (⌘K / Ctrl+K)** — command palette to instantly jump to any PR, contributor, label, or page
- **🎬 Demo Mode** — one click loads a realistic 14-PR dataset, so anyone can explore every feature without a token

### Local Development

```bash
cd dashboard
npm install
npm run dev        # → http://localhost:5173
```

### Deployment (Vercel)

| Setting | Value |
|---|---|
| Root Directory | `dashboard` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

Every push to `main` auto-deploys via Vercel's GitHub integration.

---

## ⚡ Quick Start (2 Minutes)

### 1. Add the workflow

Copy `.github/workflows/pr-review.yml` into your repository.

### 2. Add API keys

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Required | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | [Google AI Studio](https://aistudio.google.com/) — free tier |
| `GROQ_API_KEY` | ✅ Yes (fallback) | [Groq Console](https://console.groq.com/) — free tier |
| `SLACK_WEBHOOK_URL` | Optional | [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `NOTIFY_EMAIL` | Optional | Your email provider's SMTP credentials |

### 3. Open a PR

That's it. ReviewBot reviews it within ~30 seconds — health score, labels, inline annotations, and (if configured) Slack/email notifications all happen automatically.

---

## 🧪 Verifying New Features (Open a Test PR)

The fastest way to confirm everything — inline annotations, labels, Slack/email hooks, and the dashboard's live sync — is to open a real pull request against this repo and watch it flow end-to-end. Here's the exact VS Code workflow:

### 1. Pull the latest `main` and create a feature branch

```bash
# Make sure your local main is up to date
git checkout main
git pull origin main

# Create a new branch for the test
git checkout -b test/verify-new-features
```

### 2. Make a small, safe change

Edit something trivial but real — e.g. add a sentence to `README.md`, or add a new sample file to `samples/` so ReviewBot has something to score. Save the file in VS Code.

### 3. Stage, commit, and push the branch

```bash
git add .
git commit -m "test: verify dashboard + inline annotations + notification hooks"
git push -u origin test/verify-new-features
```

### 4. Open the PR

VS Code will show a popup ("Create Pull Request") after the push — click it, or use the **GitHub Pull Requests** extension sidebar. Alternatively, push then open the link GitHub prints in the terminal:

```
remote: Create a pull request for 'test/verify-new-features' on GitHub by visiting:
remote:      https://github.com/Arav1904/pr-review-agent/pull/new/test/verify-new-features
```

Set the base branch to `main` and click **Create Pull Request**.

### 5. Watch it work — checklist

| What to check | Where |
|---|---|
| Workflow run starts within seconds | Repo → **Actions** tab |
| ReviewBot posts a summary comment with Health Score | PR → **Conversation** tab |
| Inline comments appear pinned to specific lines | PR → **Files changed** tab |
| Labels auto-applied (`enhancement`, `documentation`, etc.) | PR sidebar → **Labels** |
| Slack message received (if `SLACK_WEBHOOK_URL` set) | Your configured Slack channel |
| Email digest received (if SMTP secrets set) | `NOTIFY_EMAIL` inbox |
| New PR appears in the dashboard | [Live Dashboard](https://pr-review-agent-007.vercel.app/) → connect with your token → **Pull Requests** tab |
| `memory/score_trend.md` updated | A follow-up commit from `ReviewBot[bot]` on your branch |

### 6. Clean up afterward

```bash
git checkout main
git branch -D test/verify-new-features
git push origin --delete test/verify-new-features
```

> 💡 **Tip:** to specifically test the *security* and *inline annotation* path, copy the contents of `samples/critical_disaster.py` into a new file in your branch — it's designed to trigger every check (hardcoded secrets, SQL injection, `os.system()` misuse) so you can see ReviewBot's worst-case output in action.

---

## ⚙️ Configuration Reference

All behavior is controlled by `.reviewbot.yml` at the repo root.

```yaml
version: "2.0"

soul:
  persona: "Senior Staff Engineer at a product-led startup"
  tone: "direct"          # strict | friendly | direct | mentor | welcoming
  depth: "thorough"        # quick | standard | thorough

review:
  score:
    excellent: 80
    good: 60
  checks:
    security: true
    performance: true
    bugs: true
    code_style: true
    documentation: true
    breaking_changes: true
  inline_annotations:
    enabled: true
    max_per_pr: 15
    min_severity: "warning"
  labels:
    enabled: true

languages:
  javascript: { enabled: true, security: true, extras: ["no-eval", "react-hooks"] }
  python:     { enabled: true, security: true, extras: ["type-hints", "docstrings"] }
  java:       { enabled: true, security: true }
  go:         { enabled: true, security: true }
  rust:       { enabled: true, security: false }
  css:        { enabled: true, security: false }
  ignore: ["**/*.lock", "**/dist/**", "**/node_modules/**"]

notifications:
  slack: { enabled: true,  trigger_on: [pr_opened, pr_reviewed, score_below_threshold] }
  email: { enabled: false, trigger_on: [score_below_threshold] }

llm:
  primary:  { provider: "gemini", model: "gemini-2.0-flash", temperature: 0.1 }
  fallback: { provider: "groq",   model: "llama-3.3-70b-versatile", temperature: 0.1 }

memory:
  enabled: true
  file: "memory/score_trend.md"

dashboard:
  enabled: true
  repo_owner: "Arav1904"
  repo_name: "pr-review-agent"
```

### SOUL.md Config Wizard

Generate a custom `SOUL.md` interactively:

```bash
python tools/soul_wizard.py
```

Or use a built-in preset:

```bash
python tools/soul_wizard.py --preset strict       # Zero tolerance, FAANG-level bar
python tools/soul_wizard.py --preset startup       # Pragmatic, ship-focused
python tools/soul_wizard.py --preset mentor        # Educational, explains the "why"
python tools/soul_wizard.py --preset open_source   # Welcoming to external contributors
```

---

## 🔔 Notifications

### Slack — Block Kit message

Sends a color-coded card on every review (green/yellow/red border matching health score), with PR title, author, score, issue count, top issue, and a **"View PR"** button:

```
🤖 ReviewBot — PR #12 Review Complete
─────────────────────────────────────
Health Score: 14/100  🔴 Security Alert
Repo: Arav1904/pr-review-agent
Author: @Arav1904

Top issue: Hardcoded API key on line 3
Critical issues: 3  ·  Code fixes suggested: 2

                                  [ View PR → ]
```

### Email — HTML digest

Sends a dark-themed summary via SMTP — large score badge rendered in the score's color, a metadata table (author, files changed, issue count), and a direct link back to the PR.

Both hooks ship **disabled or unconfigured by default** — adding the relevant secrets is the only step needed to turn them on. No risk to the existing review workflow if they're left off.

---

## 🏗️ Tech Stack

| Component | Technology | Cost |
|---|---|---|
| Primary LLM | Google Gemini 2.0 Flash Lite | Free |
| Fallback LLM | Groq Llama 3.3 70B Versatile | Free |
| Runtime | GitHub Actions (serverless) | Free |
| Agent Language | Python 3.11 | Free |
| PR Integration | GitHub REST API v3 | Free |
| Dashboard | React + Vite + Recharts | Free |
| Dashboard Hosting | Vercel | Free |
| Agent Standard | GitAgent v1.0 (Open Standard) | Free |
| **Total** | | **$0/month** |

### Dual-LLM Fallback Architecture

```
Gemini 2.0 Flash Lite ──quota hit?──> Groq Llama 3.3 70B ──> Structured Review Output
```

The agent never fails — there's always a working LLM available.

### GitAgent Standard

All behavior is defined in version-controlled files: `agent.yaml`, `SOUL.md`, `RULES.md`, `DUTIES.md`, `SKILL.md`. Export to other runtimes with:

```bash
gitagent export --format claude-code
gitagent export --format openai
gitagent export --format crewai
```

---

## 📁 Repository Structure

```
pr-review-agent/
├── .github/workflows/
│   └── pr-review.yml          # Main CI workflow — review, annotate, notify
├── dashboard/                  # Standalone React analytics dashboard
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   └── index.html
├── scripts/
│   ├── review_agent.py         # Core review logic, dual-LLM calls
│   ├── post_inline_comments.py # Posts annotations via Review Comments API
│   └── notify.py               # Slack + email notification hooks
├── tools/
│   └── soul_wizard.py          # Interactive SOUL.md generator
├── memory/
│   ├── context.md
│   └── score_trend.md          # Persisted score history → powers dashboard
├── samples/                     # Example files spanning the full score range
├── agent.yaml                   # GitAgent manifest
├── SOUL.md                      # Agent persona & priorities
├── RULES.md                     # Hard constraints
├── DUTIES.md                    # Capabilities & responsibilities
├── SKILL.md                     # Review skill definitions
├── .reviewbot.yml                # Master configuration
└── README.md
```

---

## 📈 Live Demo Results

Real PRs. Real scores. No mock data.

| Metric | Value |
|---|---|
| PRs reviewed live on the demo repo | 14 |
| Setup time for any GitHub repository | ~2 minutes |
| Cost on GitHub Actions free tier | $0/month |
| Avg time to review and post comment | ~30 seconds |

### Score Range — Sample Files in the Repo

Seven sample files spanning the full quality spectrum, each scored by ReviewBot to demonstrate calibration:

| File | Score | Visual |
|---|---|---|
| `perfect_code.py` | 93 | 🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜ |
| `excellent_code.py` | 84 | 🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜ |
| `good_code.py` | 71 | 🟦🟦🟦🟦🟦🟦🟦⬜⬜⬜ |
| `needs_improvement.py` | 52 | 🟨🟨🟨🟨🟨⬜⬜⬜⬜⬜ |
| `moderate_bugs.py` | 35 | 🟧🟧🟧⬜⬜⬜⬜⬜⬜⬜ |
| `high_severity.py` | 18 | 🟥🟥⬜⬜⬜⬜⬜⬜⬜⬜ |
| `critical_disaster.py` | 5 | 🟥⬜⬜⬜⬜⬜⬜⬜⬜⬜ |

### ReviewBot vs. Alternatives

| Tool | Annual Cost |
|---|---|
| SonarQube | ₹2L+ |
| Reviewpad | ₹1.5L+ |
| CodeClimate | ₹1L+ |
| **ReviewBot** | **₹0** |

---

## 🔭 Future Vision

- VS Code extension for inline review while you write
- Agent auto-commits suggested fixes (with approval gate)
- CI/CD quality-gate integration — block merges below a score threshold
- Team training & learning reports
- Enterprise on-premise deployment
- SaaS tier with team-wide analytics

---

## 👤 Built By

**Arav Ghiya**
K J Somaiya School of Engineering, Mumbai
📧 [aravghiya1904@gmail.com](mailto:aravghiya1904@gmail.com)
🔗 [linkedin.com/in/aravghiya1904](https://linkedin.com/in/aravghiya1904)

Built for **OSC AI Build 1.0 · AI/ML Track · HackCulture**

---

<div align="center">

### 🤖 ReviewBot is live. Open any PR — the agent reviews it in ~30 seconds.

[**🚀 Explore the Live Dashboard**](https://pr-review-agent-007.vercel.app/) &nbsp;·&nbsp; [**💻 View Source on GitHub**](https://github.com/Arav1904/pr-review-agent)

</div>

---

## License

MIT