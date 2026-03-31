import os
import json
import requests
import google.generativeai as genai

# ── Config ──────────────────────────────────────────────
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN")
EVENT_PATH     = os.environ.get("GITHUB_EVENT_PATH")

genai.configure(api_key=GEMINI_API_KEY)

# ── Load SOUL + SKILL for system prompt ─────────────────
def load_file(path):
    try:
        with open(path, "r") as f:
            return f.read()
    except FileNotFoundError:
        return ""

SOUL  = load_file("SOUL.md")
RULES = load_file("RULES.md")
SKILL = load_file("skills/pr-review/SKILL.md")

SYSTEM_PROMPT = f"""
{SOUL}

---

{RULES}

---

{SKILL}
"""

# ── Fetch PR diff ────────────────────────────────────────
def get_pr_info():
    with open(EVENT_PATH, "r") as f:
        event = json.load(f)
    pr_number  = event["pull_request"]["number"]
    repo_full  = event["repository"]["full_name"]  # owner/repo
    diff_url   = event["pull_request"]["diff_url"]

    diff_resp  = requests.get(diff_url, headers={"Authorization": f"Bearer {GITHUB_TOKEN}"})
    diff_text  = diff_resp.text[:12000]  # truncate to avoid token overflow

    return repo_full, pr_number, diff_text

# ── Call Gemini ──────────────────────────────────────────
def generate_review(diff_text):
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash-exp",
        system_instruction=SYSTEM_PROMPT
    )
    prompt = f"""
Please review the following Pull Request diff and provide your structured review.
```diff
{diff_text}
```
"""
    response = model.generate_content(prompt)
    return response.text

# ── Post comment to GitHub ───────────────────────────────
def post_github_comment(repo_full, pr_number, comment):
    url = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }
    payload = {"body": comment}
    resp = requests.post(url, headers=headers, json=payload)
    if resp.status_code == 201:
        print("✅ Review posted successfully!")
    else:
        print(f"❌ Failed to post comment: {resp.status_code} — {resp.text}")

# ── Main ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("🤖 ReviewBot starting...")
    repo_full, pr_number, diff_text = get_pr_info()
    print(f"📋 Reviewing PR #{pr_number} in {repo_full}")
    
    if not diff_text.strip():
        print("⚠️  Empty diff — nothing to review.")
    else:
        review = generate_review(diff_text)
        post_github_comment(repo_full, pr_number, review)