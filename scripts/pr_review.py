import os
import json
import re
import requests
from google import genai

# ── Config ───────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN")
EVENT_PATH     = os.environ.get("GITHUB_EVENT_PATH")

client = genai.Client(api_key=GEMINI_API_KEY)

# ── Load agent files ──────────────────────────────────────
def load_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""

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

    diff_resp = requests.get(diff_url, headers=get_headers())
    diff_text = diff_resp.text[:15000]
    return repo_full, pr_number, diff_text

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

def post_or_update_comment(repo_full, pr_number, body):
    existing_id = find_existing_bot_comment(repo_full, pr_number)
    if existing_id:
        url  = f"https://api.github.com/repos/{repo_full}/issues/comments/{existing_id}"
        resp = requests.patch(url, headers=get_headers(), json={"body": body})
        if resp.status_code == 200:
            print("✅ Existing review comment updated!")
        else:
            print(f"❌ Update failed: {resp.status_code}")
    else:
        url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
        resp = requests.post(url, headers=get_headers(), json={"body": body})
        if resp.status_code == 201:
            print("✅ New review comment posted!")
        else:
            print(f"❌ Post failed: {resp.status_code} — {resp.text}")

def apply_labels(repo_full, pr_number, review_text, score):
    ensure_labels_exist(repo_full)
    labels = []
    review_lower = review_text.lower()
    if score >= 80:
        labels.append("lgtm")
    else:
        labels.append("needs-changes")
    if "critical" in review_lower or "security" in review_lower or "🔒" in review_text:
        labels.append("security-risk")

    url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/labels"
    resp = requests.post(url, headers=get_headers(), json={"labels": labels})
    if resp.status_code == 200:
        print(f"🏷️  Labels applied: {labels}")
    else:
        print(f"⚠️  Label apply failed: {resp.status_code}")

def ensure_labels_exist(repo_full):
    label_defs = [
        {"name": "lgtm",          "color": "0e8a16", "description": "Looks good to merge"},
        {"name": "needs-changes", "color": "e11d48", "description": "Changes requested by ReviewBot"},
        {"name": "security-risk", "color": "b91c1c", "description": "Security issue detected by ReviewBot"},
    ]
    url = f"https://api.github.com/repos/{repo_full}/labels"
    existing_resp = requests.get(url, headers=get_headers())
    existing = [l["name"] for l in existing_resp.json()] if existing_resp.status_code == 200 else []
    for label in label_defs:
        if label["name"] not in existing:
            requests.post(url, headers=get_headers(), json=label)

# ── Gemini review ─────────────────────────────────────────
def generate_review(diff_text, file_list):
    if not diff_text.strip():
        return "## 🤖 ReviewBot\nNo code changes detected — nothing to review.", 100

    files_str = "\n".join(f"- {f}" for f in file_list) if file_list else "Unknown"

    prompt = f"""{SYSTEM_PROMPT}

You are reviewing a Pull Request. Here are the files changed:
{files_str}

Review the following diff carefully and respond in this EXACT format:

## 🤖 ReviewBot Summary
**Health Score: [0-100]/100**
**Files reviewed:** {len(file_list)} | **Verdict:** [Needs Changes / LGTM / Security Alert]

---

### 🔒 CRITICAL Issues
[List any security issues, hardcoded secrets, injection risks. Write "None found." if clean.]

---

### 🐛 HIGH — Bugs & Logic Errors  
[List bugs, wrong logic, unhandled exceptions. Write "None found." if clean.]

---

### 💡 MEDIUM — Suggestions
[Performance, readability, missing error handling improvements.]

---

### ✅ What's Done Well
[Acknowledge good patterns and clean code.]

---

### 📁 Per-File Notes
[Brief note per changed file if relevant.]

Here is the diff to review:
```diff
{diff_text}
```

Remember: Health Score 0-100 where 100 is perfect code. Be honest and specific."""

    response = client.models.generate_content(
        model="gemini-2.0-flash-lite",
        contents=prompt
    )
    review_text = response.text

    # Extract health score
    score = 70  # default
    match = re.search(r"Health Score:\s*(\d+)", review_text)
    if match:
        score = int(match.group(1))

    return review_text, score

# ── Main ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("🤖 ReviewBot starting...")

    if not GEMINI_API_KEY:
        raise Exception("❌ GEMINI_API_KEY secret is missing!")
    if not GITHUB_TOKEN:
        raise Exception("❌ GITHUB_TOKEN is missing!")

    repo_full, pr_number, diff_text = get_pr_info()
    print(f"📋 Reviewing PR #{pr_number} in {repo_full}")
    print(f"📏 Diff size: {len(diff_text)} characters")

    file_list = get_pr_files(repo_full, pr_number)
    print(f"📂 Files changed: {file_list}")

    review, score = generate_review(diff_text, file_list)
    print(f"📊 Health Score: {score}/100")

    post_or_update_comment(repo_full, pr_number, review)
    apply_labels(repo_full, pr_number, review, score)
    print("🎉 Done!")