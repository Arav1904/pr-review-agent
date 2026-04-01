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

# ── LLM caller with Gemini + Groq fallback ───────────────
def call_llm(prompt):
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
            if "429" in str(e):
                print("⚠️  Gemini quota exhausted, falling back to Groq...")
            else:
                print(f"⚠️  Gemini error, falling back to Groq: {e}")

    if GROQ_API_KEY:
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 2000,
            "temperature": 0.3
        }
        resp = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        )
        if resp.status_code == 200:
            print("✅ Used Groq fallback")
            return resp.json()["choices"][0]["message"]["content"]
        else:
            raise Exception(f"Groq failed: {resp.status_code} — {resp.text}")

    raise Exception("❌ No working LLM — check API keys!")

# ── File loaders ─────────────────────────────────────────
def load_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""

def load_config():
    import yaml
    defaults = {
        "strictness": "medium",
        "skip_drafts": True,
        "max_diff_size": 15000,
        "skip_labels": False,
        "focus": {"security": True, "bugs": True, "performance": True, "style": False},
        "skip_files": ["*.lock", "*.min.js"],
        "custom_rules": []
    }
    try:
        with open(".reviewbot.yml", "r") as f:
            user_config = yaml.safe_load(f)
            if user_config:
                defaults.update(user_config)
    except FileNotFoundError:
        pass
    return defaults

def load_memory():
    return load_file("memory/context.md")

def update_memory(pr_number, score, critical_count):
    os.makedirs("memory", exist_ok=True)
    entry = (
        f"\n## PR #{pr_number} — {datetime.date.today()}\n"
        f"- Health Score: {score}/100\n"
        f"- Critical issues: {critical_count}\n"
    )
    log_path = "memory/dailylog.md"
    with open(log_path, "a", encoding="utf-8") as f:
        f.write(entry)
    print(f"🧠 Memory updated")

# ── System prompt ─────────────────────────────────────────
SOUL  = load_file("SOUL.md")
RULES = load_file("RULES.md")
SKILL = load_file("skills/pr-review/SKILL.md")
SYSTEM_PROMPT = f"{SOUL}\n\n---\n\n{RULES}\n\n---\n\n{SKILL}"

# ── GitHub helpers ────────────────────────────────────────
def get_headers():
    return {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }

def get_pr_info():
    with open(EVENT_PATH, "r") as f:
        event = json.load(f)
    pr        = event["pull_request"]
    pr_number = pr["number"]
    repo_full = event["repository"]["full_name"]
    diff_url  = pr["diff_url"]
    is_draft  = pr.get("draft", False)
    title     = pr.get("title", "")
    author    = pr.get("user", {}).get("login", "unknown")

    if is_draft:
        return repo_full, pr_number, "", True, title, author

    diff_resp = requests.get(diff_url, headers=get_headers())
    diff_text = diff_resp.text[:15000]
    return repo_full, pr_number, diff_text, False, title, author

def get_pr_files(repo_full, pr_number):
    url  = f"https://api.github.com/repos/{repo_full}/pulls/{pr_number}/files"
    resp = requests.get(url, headers=get_headers())
    if resp.status_code == 200:
        return [f["filename"] for f in resp.json()]
    return []

def find_existing_bot_comment(repo_full, pr_number):
    url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
    resp = requests.get(url, headers=get_headers())
    if resp.status_code == 200:
        for comment in resp.json():
            if "🤖 ReviewBot" in comment.get("body", ""):
                return comment["id"]
    return None

def extract_previous_score(repo_full, pr_number):
    existing_id = find_existing_bot_comment(repo_full, pr_number)
    if not existing_id:
        return None
    url  = f"https://api.github.com/repos/{repo_full}/issues/comments/{existing_id}"
    resp = requests.get(url, headers=get_headers())
    if resp.status_code == 200:
        body = resp.json().get("body", "")
        match = re.search(r"Health Score:\s*(\d+)", body)
        if match:
            return int(match.group(1))
    return None

def post_or_update_comment(repo_full, pr_number, body, current_score=None):
    timestamp  = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    prev_score = extract_previous_score(repo_full, pr_number)

    trend = ""
    if prev_score is not None and current_score is not None:
        diff = current_score - prev_score
        if diff > 0:
            trend = f" ⬆️ +{diff} pts from last review"
        elif diff < 0:
            trend = f" ⬇️ {diff} pts from last review"
        else:
            trend = " ➡️ No change from last review"

    footer = (
        f"\n\n---\n"
        f"*🤖 ReviewBot v2.0 — [GitAgent](https://gitagent.sh) + Gemini/Groq"
        f"{trend} — {timestamp} — Push a commit to re-trigger.*"
    )
    full_body  = body + footer
    existing_id = find_existing_bot_comment(repo_full, pr_number)

    if existing_id:
        url  = f"https://api.github.com/repos/{repo_full}/issues/comments/{existing_id}"
        resp = requests.patch(url, headers=get_headers(), json={"body": full_body})
        if resp.status_code == 200:
            print(f"✅ Comment updated! Trend: {trend or 'first review'}")
        else:
            print(f"❌ Update failed: {resp.status_code}")
    else:
        url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
        resp = requests.post(url, headers=get_headers(), json={"body": full_body})
        if resp.status_code == 201:
            print("✅ First review posted!")
        else:
            raise Exception(f"Post failed: {resp.status_code} — {resp.text}")

def ensure_labels_exist(repo_full):
    label_defs = [
        {"name": "lgtm",          "color": "0e8a16", "description": "Looks good to merge"},
        {"name": "needs-changes", "color": "e11d48", "description": "Changes requested by ReviewBot"},
        {"name": "security-risk", "color": "b91c1c", "description": "Security issue detected"},
    ]
    url      = f"https://api.github.com/repos/{repo_full}/labels"
    existing = []
    resp     = requests.get(url, headers=get_headers())
    if resp.status_code == 200:
        existing = [l["name"] for l in resp.json()]
    for label in label_defs:
        if label["name"] not in existing:
            requests.post(url, headers=get_headers(), json=label)

def apply_labels(repo_full, pr_number, review_text, score):
    ensure_labels_exist(repo_full)
    
    bot_labels = ["lgtm", "needs-changes", "security-risk"]
    
    # Step 1 — Remove each bot label individually
    for label in bot_labels:
        encoded = label.replace("-", "%2D")
        url = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/labels/{label}"
        resp = requests.delete(url, headers=get_headers())
        print(f"🗑️  Removed label '{label}': {resp.status_code}")
    
    time.sleep(2)
    
    # Step 2 — Determine correct labels
    review_lower = review_text.lower()
    
    # Check if CRITICAL section actually has issues
    critical_section = ""
    if "critical issues" in review_lower:
        parts = review_lower.split("critical issues")
        if len(parts) > 1:
            critical_section = parts[1][:200]
    
    has_security = (
        "critical issues" in review_lower and
        "none found" not in critical_section
    )
    
    if has_security:
        new_labels = ["security-risk", "needs-changes"]
    elif score >= 85:
        new_labels = ["lgtm"]
    else:
        new_labels = ["needs-changes"]
    
    # Step 3 — Apply fresh labels
    url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/labels"
    resp = requests.post(url, headers=get_headers(), json={"labels": new_labels})
    if resp.status_code == 200:
        print(f"🏷️  Labels applied: {new_labels}")
    else:
        print(f"⚠️  Label apply failed: {resp.status_code} — {resp.text}")
        
# ── Generate review ───────────────────────────────────────
def generate_review(diff_text, file_list, config=None, memory=""):
    if config is None:
        config = {}
    if not diff_text.strip():
        return "## 🤖 ReviewBot\nNo code changes detected — nothing to review.", 100

    strictness   = config.get("strictness", "medium")
    focus        = config.get("focus", {})
    custom_rules = config.get("custom_rules", [])
    files_str    = "\n".join(f"- {f}" for f in file_list) if file_list else "Unknown"

    strictness_guide = {
        "low":    "Only flag critical bugs and security issues. Skip minor style issues.",
        "medium": "Balance thoroughness. Flag bugs, security, and important suggestions.",
        "high":   "Be thorough. Flag everything including style and minor improvements."
    }.get(strictness, "Balance thoroughness.")

    custom_rules_str = ""
    if custom_rules:
        custom_rules_str = "\nCustom rules:\n" + "\n".join(f"- {r}" for r in custom_rules)

    memory_str = f"\nProject context:\n{memory[:800]}" if memory else ""

    prompt = f"""{SYSTEM_PROMPT}
{memory_str}
{custom_rules_str}

Strictness: {strictness} — {strictness_guide}
Focus: Security={focus.get('security',True)}, Bugs={focus.get('bugs',True)}, Performance={focus.get('performance',True)}, Style={focus.get('style',False)}

Files changed:
{files_str}

Respond in EXACTLY this format:

## 🤖 ReviewBot Summary
**Health Score: [0-100]/100**
**Files reviewed:** {len(file_list)} | **Verdict:** [Needs Changes / LGTM / Security Alert]

---

### 🔒 CRITICAL Issues
[Security issues, hardcoded secrets, injection risks. Write "None found." if clean.]

---

### 🐛 HIGH — Bugs & Logic Errors
[Bugs and logic errors. Write "None found." if clean.]

---

### 💡 MEDIUM — Suggestions
[Improvements and suggestions.]

---

### ✅ What's Done Well
[Acknowledge good patterns.]

---

### 📁 Per-File Notes
[One line per file.]

Diff:
```diff
{diff_text}
```

CRITICAL SCORING RULES — follow exactly, do not give lazy round numbers:
- 100: Reserved for absolutely perfect code — zero issues, zero suggestions, zero improvements possible. Extremely rare.
- 90-99: Excellent code, at most 1 trivial nitpick, no bugs, no security issues
- 75-89: Good code, a few small suggestions, no bugs or security issues
- 50-74: Moderate issues — missing error handling, minor bugs, or unclear logic
- 25-49: Real bugs present, multiple issues, needs significant work
- 1-24: Critical security vulnerabilities or severe bugs found
- NEVER give 100 if you wrote anything in Suggestions section
- NEVER give 100 if you wrote anything in Bugs section
- NEVER give above 92 for markdown, config, or text-only files
- Most real-world PRs should score between 62-88
- Give exact numbers like 67, 73, 81, 88 — not just round numbers like 70, 80, 90
CRITICAL SCORING RULES � follow exactly, do not give lazy round numbers:
- 100: Reserved for absolutely perfect code � zero issues, zero suggestions possible. Extremely rare.
- 90-99: Excellent code, at most 1 trivial nitpick, no bugs, no security issues
- 75-89: Good code, small suggestions, no bugs or security issues
- 50-74: Moderate issues, missing error handling, minor bugs
- 25-49: Real bugs present, needs significant work before merge
- 1-24: Critical security vulnerabilities or severe bugs found
- NEVER give 100 if you wrote anything in Suggestions section
- NEVER give 100 if you wrote anything in Bugs section
- NEVER give above 92 for markdown or text-only files
- Most real PRs should score between 62-88
- Give exact numbers like 67, 73, 81 � not round numbers like 70, 80, 90
Be specific with filenames and line numbers."""

    review_text = call_llm(prompt)

    # ── Extract score ─────────────────────────────────────
    score = 70
    match = re.search(r"Health Score:\s*(\d+)", review_text)
    if match:
        score = int(match.group(1))

    # ── Force variation — override lazy model scores ──────
    code_extensions = ['.py', '.js', '.ts', '.java', '.go', '.rb', '.cpp', '.c', '.cs', '.jsx', '.tsx']
    has_code = any(f.endswith(tuple(code_extensions)) for f in file_list)

    review_lower = review_text.lower()

    # Check each section for actual content vs "none found"
    has_critical = (
        "critical" in review_lower and
        "none found" not in (review_lower.split("critical issues")[1][:150] if "critical issues" in review_lower else "none found")
    )
    has_bugs = (
        "bugs" in review_lower and
        "none found" not in (review_lower.split("bugs")[1][:150] if "bugs" in review_lower else "none found")
    )
    has_suggestions = (
        "suggestions" in review_lower and
        "none" not in (review_lower.split("suggestions")[1][:150] if "suggestions" in review_lower else "none")
    )

    # Override 100 — it should almost never be given
    if score == 100:
        if has_critical:
            score = 12
        elif has_bugs:
            score = 48
        elif has_suggestions and has_code:
            score = 81
        elif has_suggestions and not has_code:
            score = 88
        elif not has_code:
            score = 91  # clean markdown/config
        else:
            score = 94  # genuinely clean code, no suggestions

    # Override other round numbers to feel more precise
    round_number_map = {90: 88, 80: 79, 70: 71, 60: 63, 50: 53, 40: 42, 30: 33, 20: 18, 10: 9}
    if score in round_number_map and score != 0:
        score = round_number_map[score]

    # Final clamp
    score = max(0, min(100, score))
    return review_text, score

# ── Main ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("🤖 ReviewBot v2.0 starting...")

    if not GITHUB_TOKEN:
        raise Exception("❌ GITHUB_TOKEN missing!")

    config = load_config()
    print(f"⚙️  Strictness: {config['strictness']}")

    repo_full, pr_number, diff_text, is_draft, title, author = get_pr_info()
    print(f"📋 PR #{pr_number} '{title}' by @{author}")

    if is_draft and config.get("skip_drafts", True):
        msg = (
            "## 🤖 ReviewBot\n"
            "⏭️ **Draft PR** — I'll review when you mark ready for review."
        )
        post_or_update_comment(repo_full, pr_number, msg)
        print("✅ Draft notice posted.")
    else:
        print(f"📏 Diff: {len(diff_text)} chars")
        file_list = get_pr_files(repo_full, pr_number)

        skip_patterns = config.get("skip_files", [])
        filtered = [f for f in file_list if not any(fnmatch.fnmatch(f, p) for p in skip_patterns)]
        skipped  = len(file_list) - len(filtered)
        if skipped:
            print(f"⏭️  Skipping {skipped} files per config")
        print(f"📂 Reviewing: {filtered}")

        memory = load_memory()
        review, score = generate_review(diff_text, filtered, config, memory)
        print(f"📊 Score: {score}/100")

        post_or_update_comment(repo_full, pr_number, review, score)

        if not config.get("skip_labels", False):
            apply_labels(repo_full, pr_number, review, score)

        update_memory(pr_number, score, review.lower().count("critical"))
        print("🎉 Done!")