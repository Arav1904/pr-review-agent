import os, json, re, time, fnmatch, datetime, requests

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GROQ_API_KEY   = os.environ.get("GROQ_API_KEY")
GITHUB_TOKEN   = os.environ.get("GITHUB_TOKEN")
EVENT_PATH     = os.environ.get("GITHUB_EVENT_PATH")

def call_llm(prompt):
    if GEMINI_API_KEY:
        try:
            from google import genai
            client = genai.Client(api_key=GEMINI_API_KEY)
            response = client.models.generate_content(model="gemini-2.0-flash-lite", contents=prompt)
            print("Used Gemini")
            return response.text
        except Exception as e:
            print(f"Gemini error: {e}, trying Groq...")
    if GROQ_API_KEY:
        headers = {"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"}
        payload = {"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": prompt}], "max_tokens": 3000, "temperature": 0.3}
        for attempt in range(3):
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                print("Used Groq fallback")
                return resp.json()["choices"][0]["message"]["content"]
            elif resp.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"Groq rate limit, waiting {wait}s...")
                time.sleep(wait)
            else:
                raise Exception(f"Groq failed: {resp.status_code}")
    raise Exception("No working LLM - check API keys!")

def load_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""

def load_config():
    try:
        import yaml
        with open(".reviewbot.yml", "r") as f:
            cfg = yaml.safe_load(f)
            return cfg if cfg else {}
    except Exception:
        return {}

def load_memory():
    return load_file("memory/context.md")

def update_memory(pr_number, score, critical_count):
    os.makedirs("memory", exist_ok=True)
    entry = f"\n## PR #{pr_number} - {datetime.date.today()}\n- Health Score: {score}/100\n- Critical issues: {critical_count}\n"
    with open("memory/dailylog.md", "a", encoding="utf-8") as f:
        f.write(entry)
    print("Memory updated")

SOUL  = load_file("SOUL.md")
RULES = load_file("RULES.md")
SKILL = load_file("skills/pr-review/SKILL.md")
SYSTEM = f"{SOUL}\n\n---\n\n{RULES}\n\n---\n\n{SKILL}"

def gh_headers():
    return {"Authorization": f"Bearer {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"}

def get_pr_info():
    with open(EVENT_PATH, "r") as f:
        event = json.load(f)
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
    if len(diff_text) > 15000:
        diff_text = diff_text[:15000]
        print("Large diff truncated to 15000 chars")
    return repo_full, pr_number, diff_text, False, title, author

def get_pr_files(repo_full, pr_number):
    url  = f"https://api.github.com/repos/{repo_full}/pulls/{pr_number}/files"
    resp = requests.get(url, headers=gh_headers())
    return resp.json() if resp.status_code == 200 else []

def find_bot_comment(repo_full, pr_number):
    url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
    resp = requests.get(url, headers=gh_headers())
    if resp.status_code == 200:
        for c in resp.json():
            if "ReviewBot" in c.get("body", ""):
                return c["id"]
    return 0

def get_previous_score(repo_full, pr_number):
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

def post_or_update_comment(repo_full, pr_number, body, score):
    timestamp  = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    prev_score = get_previous_score(repo_full, pr_number)
    trend = ""
    if prev_score >= 0 and score >= 0:
        diff = score - prev_score
        if diff > 0:
            trend = f" | Score improved +{diff} pts"
        elif diff < 0:
            trend = f" | Score dropped {diff} pts"
        else:
            trend = " | No score change"
    footer = f"\n\n---\n*ReviewBot v3 powered by GitAgent + Gemini/Groq{trend} - {timestamp}*"
    full_body = body + footer
    cid = find_bot_comment(repo_full, pr_number)
    if cid:
        url  = f"https://api.github.com/repos/{repo_full}/issues/comments/{cid}"
        resp = requests.patch(url, headers=gh_headers(), json={"body": full_body})
        print(f"Comment updated: {resp.status_code}")
    else:
        url  = f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/comments"
        resp = requests.post(url, headers=gh_headers(), json={"body": full_body})
        if resp.status_code != 201:
            raise Exception(f"Post failed: {resp.status_code} - {resp.text}")
        print("First review comment posted!")

def ensure_labels(repo_full):
    label_defs = [
        {"name": "lgtm",              "color": "0e8a16", "description": "Looks good to merge"},
        {"name": "needs-changes",     "color": "e11d48", "description": "Changes requested"},
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

def apply_labels(repo_full, pr_number, review_text, score):
    ensure_labels(repo_full)
    bot_labels = ["lgtm","needs-changes","security-risk","performance-issue","bug-detected","good-practices","needs-tests","breaking-change"]
    for label in bot_labels:
        requests.delete(f"https://api.github.com/repos/{repo_full}/issues/{pr_number}/labels/{label}", headers=gh_headers())
    time.sleep(1)
    review_lower = review_text.lower()
    def has_issues(keyword):
        if keyword not in review_lower:
            return False
        idx = review_lower.find(keyword)
        snippet = review_lower[idx:idx+300]
        return "none found" not in snippet and "none." not in snippet
    has_security = has_issues("critical issues") or has_issues("critical")
    has_bugs     = has_issues("bugs and logic") or has_issues("bugs")
    has_perf     = "performance" in review_lower and has_issues("suggestions")
    has_no_tests = any(x in review_lower for x in ["missing test", "no test", "add test"])
    has_breaking = "breaking" in review_lower
    is_excellent = score >= 88
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
    print(f"Labels: {new_labels}" if resp.status_code == 200 else f"Label failed: {resp.status_code}")

def generate_review(diff_text, file_info, config, memory):
    if not diff_text.strip():
        return "## ReviewBot\nNo code changes detected.", 100
    strictness   = config.get("strictness", "medium")
    focus        = config.get("focus", {})
    custom_rules = config.get("custom_rules", [])
    files_str    = "\n".join(f"- {f['filename']} (+{f.get('additions',0)}/-{f.get('deletions',0)} lines)" for f in file_info)
    custom_str   = "\nCustom rules:\n" + "\n".join(f"- {r}" for r in custom_rules) if custom_rules else ""
    memory_str   = f"\nProject context:\n{memory[:800]}" if memory else ""
    strictness_guide = {"low": "Only flag critical bugs and security.", "medium": "Balance thoroughness.", "high": "Flag everything including style."}.get(strictness, "Balance thoroughness.")
    prompt = f"""{SYSTEM}
{memory_str}
{custom_str}

Strictness: {strictness} - {strictness_guide}
Focus - Security: {focus.get("security", True)}, Bugs: {focus.get("bugs", True)}, Performance: {focus.get("performance", True)}, Style: {focus.get("style", False)}

Files changed:
{files_str}

Respond in EXACTLY this format:

## 🤖 ReviewBot Summary
**Health Score: [0-100]/100**
**Files reviewed:** {len(file_info)} | **Verdict:** [Needs Changes / LGTM / Security Alert / Bug Alert]

---

### 🔒 Critical Issues
[Security vulnerabilities, hardcoded secrets, injection risks. Write "None found." if clean.]

---

### 🐛 Bugs and Logic Errors
[Logic errors, unhandled exceptions. Write "None found." if clean.]

---

### 💡 Suggestions
[Performance, readability, missing error handling. Be specific with filenames and line numbers.]

---

### ✅ What Is Done Well
[Acknowledge clean patterns and good practices.]

---

### 🔧 Code Fixes
[For EVERY issue found, provide the exact fix:]

**Fix 1 - [Issue name] in [filename]:**
```python
# BEFORE
[bad code]
# AFTER
[fixed code]
```
*Why this matters: [1-2 sentence plain English explanation]*

---

### 🧠 Key Insights
[3-5 bullet points - important lessons the author should remember, in simple encouraging language]

---

### 📁 Per-File Summary
[One line per file: filename - main observation]

Diff to review:
```diff
{diff_text}
```

SCORING RULES:
- 93-100: Flawless, production-ready, exemplary
- 80-92: Clean, minor suggestions, no bugs
- 65-79: Good but improvements needed
- 45-64: Multiple issues, missing error handling
- 25-44: Real bugs, significant rework needed
- 10-24: Critical issues, unsafe code
- 0-9: Severe security vulnerabilities

Give exact numbers like 67, 73, 81 - not round numbers.
NEVER give 100 if any suggestion exists.
NEVER give above 91 for markdown or config files."""
    review_text = call_llm(prompt)
    score = 70
    m = re.search(r"Health Score:\s*(\d+)", review_text)
    if m:
        score = int(m.group(1))
    code_exts = (".py", ".js", ".ts", ".java", ".go", ".rb", ".cpp", ".c", ".cs", ".jsx", ".tsx")
    has_code  = any(f["filename"].endswith(code_exts) for f in file_info)
    def section_has_content(keyword):
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
    round_map = {90:88, 80:78, 70:69, 60:62, 50:51, 40:43, 30:32, 20:19, 10:11}
    if score in round_map:
        score = round_map[score]
    score = max(0, min(100, score))
    return review_text, score

if __name__ == "__main__":
    print("ReviewBot v3 starting...")
    if not GITHUB_TOKEN:
        raise Exception("GITHUB_TOKEN is missing!")
    config = load_config()
    print(f"Config loaded - strictness: {config.get('strictness', 'medium')}")
    repo_full, pr_number, diff_text, is_draft, title, author = get_pr_info()
    print(f"PR #{pr_number} '{title}' by @{author} in {repo_full}")
    if is_draft and config.get("skip_drafts", True):
        msg = "## ReviewBot\nDraft PR detected - review will run when you mark ready for review."
        post_or_update_comment(repo_full, pr_number, msg, -1)
        print("Draft notice posted.")
    else:
        print(f"Diff size: {len(diff_text)} chars")
        file_info = get_pr_files(repo_full, pr_number)
        skip_patterns = config.get("skip_files", [])
        filtered = [f for f in file_info if not any(fnmatch.fnmatch(f["filename"], p) for p in skip_patterns)]
        skipped = len(file_info) - len(filtered)
        if skipped:
            print(f"Skipping {skipped} files per config")
        print(f"Reviewing {len(filtered)} files")
        memory = load_memory()
        review, score = generate_review(diff_text, filtered, config, memory)
        print(f"Health Score: {score}/100")
        post_or_update_comment(repo_full, pr_number, review, score)
        apply_labels(repo_full, pr_number, review, score)
        update_memory(pr_number, score, review.lower().count("critical"))
        print("Done!")
