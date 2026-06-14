#!/usr/bin/env python3
"""
ReviewBot — Inline Comment Annotations
Reads the AI review output (saved to /tmp/reviewbot_inline.json)
and posts surgical line-level comments on the PR diff.

Each comment is posted using the GitHub Review Comments API
(POST /repos/{owner}/{repo}/pulls/{pull_number}/comments)
which pins the comment to a specific file + line in the diff.
"""

import json
import os
import sys
import requests

# ─── Config ──────────────────────────────────────────────────────────────────
TOKEN        = os.environ["GITHUB_TOKEN"]
REPO         = os.environ["REPO_FULL_NAME"]          # e.g. "Arav1904/pr-review-agent"
PR_NUMBER    = int(os.environ["PR_NUMBER"])
HEAD_SHA     = os.environ["HEAD_SHA"]

BASE_URL     = f"https://api.github.com/repos/{REPO}/pulls/{PR_NUMBER}"
HEADERS      = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept":        "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}

INLINE_FILE  = "/tmp/reviewbot_inline.json"   # written by review_agent.py


# ─── Helpers ──────────────────────────────────────────────────────────────────
def get_existing_comments() -> set[str]:
    """Return set of 'file:line:body_hash' to avoid duplicate comments."""
    url  = f"{BASE_URL}/comments"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    if not resp.ok:
        return set()
    existing = set()
    for c in resp.json():
        key = f"{c.get('path','')}-{c.get('line',0)}"
        existing.add(key)
    return existing


def post_inline_comment(path: str, line: int, side: str, body: str) -> bool:
    """Post a single inline comment. Returns True on success."""
    payload = {
        "body":        body,
        "commit_id":   HEAD_SHA,
        "path":        path,
        "line":        line,
        "side":        side,          # "RIGHT" = new file, "LEFT" = old file
    }
    url  = f"{BASE_URL}/comments"
    resp = requests.post(url, headers=HEADERS, json=payload, timeout=15)
    if resp.status_code == 422:
        # Line may not exist in diff — fall back to a general review comment
        return post_general_comment(path, line, body)
    return resp.status_code in (200, 201)


def post_general_comment(path: str, line: int, body: str) -> bool:
    """Fallback: post as a general PR comment if the line isn't in the diff."""
    fallback_body = f"**`{path}` (line {line})**\n\n{body}"
    url  = f"https://api.github.com/repos/{REPO}/issues/{PR_NUMBER}/comments"
    resp = requests.post(url, headers=HEADERS, json={"body": fallback_body}, timeout=15)
    return resp.status_code in (200, 201)


def format_annotation_body(ann: dict) -> str:
    """Format a rich inline comment from an annotation dict."""
    severity_emoji = {
        "critical":    "🔴",
        "warning":     "🟡",
        "suggestion":  "💡",
        "info":        "ℹ️",
    }.get(ann.get("severity", "info"), "💬")

    category_badge = {
        "security":    "🔒 **Security**",
        "performance": "⚡ **Performance**",
        "bug":         "🐛 **Bug**",
        "style":       "🎨 **Style**",
        "logic":       "🧠 **Logic**",
        "docs":        "📚 **Docs**",
    }.get(ann.get("category", "general"), "🤖 **ReviewBot**")

    lines = [
        f"{severity_emoji} {category_badge}",
        "",
        ann.get("message", ""),
    ]

    if ann.get("suggestion"):
        lines += [
            "",
            "**Suggested fix:**",
            f"```{ann.get('language', '')}",
            ann["suggestion"],
            "```",
        ]

    if ann.get("why"):
        lines += ["", f"*Why: {ann['why']}*"]

    lines += ["", "---", "*Reviewed by [ReviewBot](https://github.com/Arav1904/pr-review-agent)*"]
    return "\n".join(lines)


# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    # Load inline annotations produced by review_agent.py
    if not os.path.exists(INLINE_FILE):
        print("No inline annotations file found — skipping.")
        return

    with open(INLINE_FILE) as f:
        annotations: list[dict] = json.load(f)

    if not annotations:
        print("No inline annotations to post.")
        return

    existing = get_existing_comments()
    posted, skipped, failed = 0, 0, 0

    for ann in annotations:
        path   = ann.get("file", "")
        line   = ann.get("line", 1)
        side   = ann.get("side", "RIGHT")   # RIGHT = new version of the file

        if not path or not line:
            skipped += 1
            continue

        # Dedup check
        key = f"{path}-{line}"
        if key in existing:
            print(f"  SKIP (already exists): {path}:{line}")
            skipped += 1
            continue

        body = format_annotation_body(ann)
        ok   = post_inline_comment(path, line, side, body)

        if ok:
            print(f"  ✓ Posted annotation on {path}:{line} ({ann.get('severity','?')})")
            existing.add(key)
            posted += 1
        else:
            print(f"  ✗ Failed to post on {path}:{line}")
            failed += 1

    print(f"\nDone — {posted} posted, {skipped} skipped, {failed} failed")

    # Exit non-zero only if we had failures and no posts at all
    if failed > 0 and posted == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()