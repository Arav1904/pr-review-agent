"""
PR Review Agent v3 — GitAgent Standard
Powered by Gemini + Groq | Full diagnostics, code fixes, insights
"""
import os
import json
import re
import time
import fnmatch
import datetime
import requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN")
EVENT_PATH     = os.environ.get("GITHUB_EVENT_PATH")

# ── LLM caller — Gemini first, Groq fallback ─────────────
def call_llm(prompt: str) -> str:
    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-2.0-flash-lite",
                contents=prompt
            )
            print("✅ Used Gemini")
            return response.text
        except Exception as e:
            print(f"⚠️  Gemini error ({e.__class__.__name__}), trying Groq...")

    if GROQ_API_KEY:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 3000,
            "temperature": 0.3
        }
        for attempt in range(3):
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers, json=payload
            )
            if resp.status_code == 200:
                print("✅ Used Groq fallback")
                return resp.json()["choices"][0]["message"]["content"]
            elif resp.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"⏳ Groq rate limit, waiting {wait}s...")
                time.sleep(wait)
            else:
                raise Exception(f"Groq failed: {resp.status_code} — {resp.text}")

    raise Exception("❌ No working LLM — check API keys in GitHub Secrets!")

# ── File helpers ──────────────────────────────────────────
def load_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""

def load_config() -> dict:
    try:
        import yaml
        with open(".reviewbot.yml", "r") as f:
            cfg = yaml.safe_load(f)
            return cfg if cfg else {}
    except Exception:
        return {}

def load_memory() -> str:
    return load_file("memory/context.md")

def update_memory(pr_number: int, score: int, critical_count: int) -> None:
    os.makedirs("memory", exist_ok=True)
    entry = (
        f"\n## PR #{pr_number} — {datetime.date.today()}\n"
        f"- Health Score: {score}/100\n"
        f"- Critical issues found: {critical_count}\n"
    )
    with open("memory/dailylog.md", "a", encoding="utf-8") as f:
        f.write(entry)
    print("🧠 Memory updated")

# ── System prompt ─────────────────────────────────────────
SOUL   = load_file("SOUL.md")
RULES  = load_file("RULES.md")
SKILL  = load_file("skills/pr-review/SKILL.md")
SYSTEM = f"{SOUL}\n\n---\n\n{RULES}\n\n---\n\n{SKILL}"

# ── GitHub helpers ────────────────────────────────────────
def gh_headers() -> dict:
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }

def get_pr_info() -> tuple:
    with open(EVENT_PATH, "r") as f:
        event = json.load(f)

    # Support both pull_request and issue_comment events
    if "pull_request" in event:
        pr = event["pull_request"]
    elif "issue" in event:
        pr_url = event["issue"].get("pull_request", {}).get("url", "")
        if not pr_url:
            raise Exception("Not a PR comment")
        pr = requests.get(pr_url, headers=gh_headers()).json()
    else:
        raise Exception("Unknown event type")

    pr_number = pr["number"]
    repo_full = event["repository"]["full_name"]
    diff_url  = pr["diff_url"]
    is_draft  = pr.get("draft", False)
    title     = pr.get("title", "")
    author    = pr.get("user", {}).get("login", "unknown")

    if is_draft:
        return repo_full, pr_number, "", True, title, author

    diff_resp = requests.get(diff_url, headers=gh_headers())
    diff_text = diff_resp.text

    too_large = len(diff_text) > 15000
    if too_large:
        diff_text = diff_text[:15000]
        print(f"⚠️  Large diff truncated to 15000 chars")

    return repo_full, pr_number, diff_text, False, title, author

def get_pr_files(repo_full: str, pr_number: int) -> list:
    url  = f"https://api.github.com/repos/{repo_full}/pulls/{pr_number}/files"
    resp = requests.get(url, headers=gh_headers())
    if resp.status_code == 200:
        return resp.json()
    return []

def get_file_content(repo_full: str, filename: str, pr_number: int) -> str:
    """Fetch raw content of a file in the PR head."""
    url  = f"https://api.github.com/repos/{repo_full}/pulls/{pr_number}/files"
    resp = requests.get(url, headers=gh_headers())
    if resp.status_code != 200:
        return ""
    for f in resp.json():
        if f["filename"] == filename and "raw_url" in f:
            raw = requests.get(f["raw_url"], headers=gh_headers())
            return raw.text[:5000]
    return ""

def find_bot_comment(repo_full: str, pr_number: int) -> int:
    url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
    resp = requests.get(url, headers=gh_headers())
    if resp.status_code == 200:
        for c in resp.json():
            if "ReviewBot" in c.get("body", ""):
                return c["id"]
    return 0

def get_previous_score(repo_full: str, pr_number: int) -> int:
    cid = find_bot_comment(repo_full, pr_number)
    if not cid:
        return -1
    url  = f"https://api.github.com/repos/{repo_full}/issues/comments/{cid}"
    resp = requests.get(url, headers=gh_headers())
    if resp.status_code == 200:
        m = re.search(r"Health Score:\s*(\d+)", resp.json().get("body", ""))
        if m:
            return int(m.group(1))
    return -1

def post_or_update_comment(repo_full: str, pr_number: int, body: str, score: int) -> None:
    timestamp  = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    prev_score = get_previous_score(repo_full, pr_number)

    trend = ""
    if prev_score >= 0 and score >= 0:
        diff = score - prev_score
        if diff > 0:
            trend = f" | Score improved +{diff} pts from last review"
        elif diff < 0:
            trend = f" | Score dropped {diff} pts from last review"
        else:
            trend = " | No score change from last review"

    footer = (
        f"\n\n---\n"
        f"*[ReviewBot v3](https://github.com/Arav1904/pr-review-agent) "
        f"powered by [GitAgent](https://gitagent.sh) + Gemini/Groq"
        f"{trend} — {timestamp}*"
    )
    full_body = body + footer
    cid = find_bot_comment(repo_full, pr_number)

    if cid:
        url  = f"https://api.github.com/repos/{repo_full}/issues/comments/{cid}"
        resp = requests.patch(url, headers=gh_headers(), json={"body": full_body})
        print(f"{'✅' if resp.status_code == 200 else '❌'} Comment updated (trend: {trend or 'first'})")
    else:
        url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
        resp = requests.post(url, headers=gh_headers(), json={"body": full_body})
        if resp.status_code != 201:
            raise Exception(f"Post failed: {resp.status_code} — {resp.text}")
        print("✅ First review comment posted!")

def ensure_labels(repo_full: str) -> None:
    label_defs = [
        {"name": "lgtm",              "color": "0e8a16", "description": "Looks good to merge"},
        {"name": "needs-changes",     "color": "e11d48", "description": "Changes requested by ReviewBot"},
        {"name": "security-risk",     "color": "b91c1c", "description": "Security vulnerability detected"},
        {"name": "performance-issue", "color": "f59e0b", "description": "Performance problems detected"},
        {"name": "bug-detected",      "color": "dc2626", "description": "Bug found by ReviewBot"},
        {"name": "good-practices",    "color": "059669", "description": "Excellent coding practices"},
        {"name": "needs-tests",       "color": "7c3aed", "description": "Missing test coverage"},
        {"name": "breaking-change",   "color": "991b1b", "description": "May break existing functionality"},
    ]
    url      = f"https://api.github.com/repos/{repo_full}/labels"
    existing = []
    resp     = requests.get(url, headers=gh_headers())
    if resp.status_code == 200:
        existing = [l["name"] for l in resp.json()]
    for label in label_defs:
        if label["name"] not in existing:
            requests.post(url, headers=gh_headers(), json=label)

def apply_labels(repo_full: str, pr_number: int, review_text: str, score: int) -> None:
    ensure_labels(repo_full)
    bot_labels = [
        "lgtm", "needs-changes", "security-risk",
        "performance-issue", "bug-detected", "good-practices",
        "needs-tests", "breaking-change"
    ]

    # Remove all existing bot labels cleanly
    for label in bot_labels:
        url = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/labels/{label}"
        requests.delete(url, headers=gh_headers())
    time.sleep(1)

    review_lower = review_text.lower()

    def section_has_issues(section_keyword: str) -> bool:
        if section_keyword not in review_lower:
            return False
        idx = review_lower.find(section_keyword)
        snippet = review_lower[idx:idx+300]
        return "none found" not in snippet and "none." not in snippet

    has_security     = section_has_issues("critical issues")
    has_bugs         = section_has_issues("bugs & logic")
    has_perf         = "performance" in review_lower and section_has_issues("medium")
    has_no_tests     = "test" in review_lower and ("missing test" in review_lower or "no test" in review_lower or "add test" in review_lower)
    has_breaking     = "breaking" in review_lower or "backward compat" in review_lower
    is_excellent     = score >= 88

    new_labels = []

    if has_security:
        new_labels += ["security-risk", "needs-changes"]
    elif has_bugs:
        new_labels += ["bug-detected", "needs-changes"]
    elif score < 80:
        new_labels.append("needs-changes")
    else:
        new_labels.append("lgtm")

    if has_perf and "performance-issue" not in new_labels:
        new_labels.append("performance-issue")
    if has_no_tests and "needs-tests" not in new_labels:
        new_labels.append("needs-tests")
    if has_breaking and "breaking-change" not in new_labels:
        new_labels.append("breaking-change")
    if is_excellent and "lgtm" in new_labels:
        new_labels.append("good-practices")

    url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/labels"
    resp = requests.post(url, headers=gh_headers(), json={"labels": new_labels})
    print(f"🏷️  Labels: {new_labels}" if resp.status_code == 200 else f"⚠️  Label failed: {resp.status_code}")

# ── Core review generator ─────────────────────────────────
def generate_review(diff_text: str, file_info: list, config: dict, memory: str) -> tuple:
    if not diff_text.strip():
        return "## 🤖 ReviewBot\nNo code changes detected — nothing to review.", 100

    strictness   = config.get("strictness", "medium")
    focus        = config.get("focus", {})
    custom_rules = config.get("custom_rules", [])

    filenames   = [f["filename"] for f in file_info]
    files_str   = "\n".join(f"- {f['filename']} (+{f.get('additions',0)}/-{f.get('deletions',0)} lines)" for f in file_info)
    custom_str  = "\nCustom rules:\n" + "\n".join(f"- {r}" for r in custom_rules) if custom_rules else ""
    memory_str  = f"\nProject context:\n{memory[:800]}" if memory else ""

    strictness_guide = {
        "low":    "Only flag critical bugs and security. Skip style.",
        "medium": "Balance thoroughness. Flag bugs, security, key suggestions.",
        "high":   "Be thorough. Flag everything including style."
    }.get(strictness, "Balance thoroughness.")

    prompt = f"""{SYSTEM}
{memory_str}
{custom_str}

Strictness: {strictness} — {strictness_guide}
Focus — Security: {focus.get('security', True)}, Bugs: {focus.get('bugs', True)}, Performance: {focus.get('performance', True)}, Style: {focus.get('style', False)}

Files changed:
{files_str}

Respond in EXACTLY this format — every section is required:

## ReviewBot Summary
**Health Score: [0-100]/100**
**Files reviewed:** {len(filenames)} | **Verdict:** [Needs Changes / LGTM / Security Alert / Bug Alert]

---

### Critical Issues
[Security vulnerabilities, hardcoded secrets, injection risks. Write "None found." if clean.]

---

### Bugs and Logic Errors
[Logic errors, unhandled exceptions, wrong conditions. Write "None found." if clean.]

---

### Suggestions
[Performance, readability, missing error handling. Be specific.]

---

### What Is Done Well
[Acknowledge clean patterns, good practices, well-structured code.]

---

### Code Fixes
[For EVERY issue found above, provide the exact fix in this format:]

**Fix 1 — [Issue name] in [filename]:**
```python
# BEFORE (problematic code)
[show the bad code]

# AFTER (fixed code)
[show the corrected code]
```
*Why this matters: [1-2 sentence plain English explanation]*

---

### Key Insights
[3-5 bullet points — important lessons and best practices the author should remember from this review, written in simple encouraging language]

---

### Per-File Summary
[One line per file: filename — main observation and score contribution]

Diff to review:
```diff
{diff_text}
```

SCORING RULES — be strict and precise:
- 93-100: Flawless code, production-ready, exemplary patterns
- 80-92: Clean code, minor suggestions only, no bugs
- 65-79: Good structure but improvements needed
- 45-64: Multiple issues, missing error handling, moderate bugs
- 25-44: Real bugs, poor practices, significant rework needed
- 10-24: Critical issues, serious bugs, unsafe code
- 0-9: Severe security vulnerabilities, dangerous code

Give exact numbers (67, 73, 81, 88) — not round numbers.
NEVER give 100 if any suggestion exists.
NEVER give above 91 for markdown/config files."""

    review_text = call_llm(prompt)

    # Extract score
    score = 70
    m = re.search(r"Health Score:\s*(\d+)", review_text)
    if m:
        score = int(m.group(1))

    # Override lazy scores
    code_exts = ('.py', '.js', '.ts', '.java', '.go', '.rb', '.cpp', '.c', '.cs', '.jsx', '.tsx')
    has_code  = any(f["filename"].endswith(code_exts) for f in file_info)

    def section_has_content(keyword: str) -> bool:
        lower = review_text.lower()
        if keyword not in lower:
            return False
        idx = lower.find(keyword)
        return "none found" not in lower[idx:idx+200]

    has_critical    = section_has_content("critical issues")
    has_bugs        = section_has_content("bugs and logic")
    has_suggestions = section_has_content("suggestions")

    if score == 100:
        if has_critical:
            score = 8
        elif has_bugs:
            score = 31
        elif has_suggestions and has_code:
            score = 79
        elif has_suggestions:
            score = 87
        elif has_code:
            score = 94
        else:
            score = 89

    # Prevent boring round numbers
    round_map = {90: 88, 80: 78, 70: 69, 60: 62, 50: 51, 40: 43, 30: 32, 20: 19, 10: 11}
    if score in round_map:
        score = round_map[score]

    score = max(0, min(100, score))
    return review_text, score

# ── Manual trigger via comment ────────────────────────────
def is_manual_trigger() -> bool:
    if not EVENT_PATH:
        return False
    try:
        with open(EVENT_PATH) as f:
            event = json.load(f)
        comment = event.get("comment", {}).get("body", "").strip().lower()
        return comment in ["/review", "/reviewbot", "!review"]
    except Exception:
        return False

# ── Main ──────────────────────────────────────────────────
if __name__ == "__main__":
    print("🤖 ReviewBot v3 starting...")

    if not GITHUB_TOKEN:
        raise Exception("GITHUB_TOKEN is missing!")

    config = load_config()
    print(f"Config loaded — strictness: {config.get('strictness', 'medium')}")

    repo_full, pr_number, diff_text, is_draft, title, author = get_pr_info()
    print(f"PR #{pr_number} '{title}' by @{author} in {repo_full}")

    if is_draft and config.get("skip_drafts", True):
        msg = (
            "## ReviewBot\n"
            "Draft PR detected — review will run when you mark this ready for review.\n\n"
            "Push the 'Ready for review' button to trigger a full analysis."
        )
        post_or_update_comment(repo_full, pr_number, msg, -1)
        print("Draft notice posted.")
    else:
        print(f"Diff size: {len(diff_text)} chars")
        file_info = get_pr_files(repo_full, pr_number)

        # Filter skip_files from config
        skip_patterns = config.get("skip_files", [])
        filtered = [
            f for f in file_info
            if not any(fnmatch.fnmatch(f["filename"], p) for p in skip_patterns)
        ]
        skipped = len(file_info) - len(filtered)
        if skipped:
            print(f"Skipping {skipped} files per .reviewbot.yml")
        print(f"Reviewing {len(filtered)} files: {[f['filename'] for f in filtered]}")

        memory = load_memory()
        review, score = generate_review(diff_text, filtered, config, memory)
        print(f"Health Score: {score}/100")

        post_or_update_comment(repo_full, pr_number, review, score)
        apply_labels(repo_full, pr_number, review, score)
        update_memory(pr_number, score, review.lower().count("critical"))
        print("Done!")