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
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""

SOUL  = load_file("SOUL.md")
RULES = load_file("RULES.md")
SKILL = load_file("skills/pr-review/SKILL.md")

SYSTEM_PROMPT = f"{SOUL}\n\n---\n\n{RULES}\n\n---\n\n{SKILL}"

# ── Fetch PR diff ────────────────────────────────────────
def get_pr_info():
    with open(EVENT_PATH, "r") as f:
        event = json.load(f)

    pr_number = event["pull_request"]["number"]
    repo_full = event["repository"]["full_name"]
    diff_url  = event["pull_request"]["diff_url"]

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json"
    }

    diff_resp = requests.get(diff_url, headers=headers)
    diff_text = diff_resp.text[:12000]

    return repo_full, pr_number, diff_text

# ── Call Gemini ──────────────────────────────────────────
def generate_review(diff_text):
    if not diff_text.strip():
        return "## 🤖 ReviewBot\nNo code changes detected in this PR — nothing to review."

    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT
    )

    prompt = f"""Please review the following Pull Request diff and provide your structured review.
````diff
{diff_text}
```"""

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
        print(f"❌ Failed: {resp.status_code} — {resp.text}")
        raise Exception(f"GitHub comment failed: {resp.status_code}")

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

    review = generate_review(diff_text)
    print("✍️  Review generated, posting to GitHub...")
    post_github_comment(repo_full, pr_number, review)
