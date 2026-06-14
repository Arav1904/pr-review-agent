#!/usr/bin/env python3
"""
ReviewBot — Notification System
Supports two channels:
  --channel slack  → webhook POST (Block Kit message)
  --channel email  → SMTP (HTML email with score badge)

Environment variables are set in the GitHub Actions workflow.
Add secrets in: Settings → Secrets and variables → Actions
"""

import argparse
import json
import os
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests


# ─── Shared helpers ──────────────────────────────────────────────────────────
def score_color_hex(score: int) -> str:
    if score >= 80: return "#39ff14"
    if score >= 60: return "#ffc107"
    return "#ff4560"

def score_label(score: int) -> str:
    if score >= 80: return "Excellent ✅"
    if score >= 60: return "Good 🟡"
    return "Needs Work 🔴"

def load_review_summary() -> dict:
    """Load the review summary written by review_agent.py."""
    summary_file = "/tmp/reviewbot_summary.json"
    if os.path.exists(summary_file):
        with open(summary_file) as f:
            return json.load(f)
    # Fallback defaults
    return {
        "health_score":     0,
        "issues_count":     0,
        "security_flags":   0,
        "top_issue":        "No critical issues found.",
        "suggestion_count": 0,
    }


# ─── Slack ───────────────────────────────────────────────────────────────────
def notify_slack():
    webhook_url = os.getenv("SLACK_WEBHOOK_URL", "")
    if not webhook_url:
        print("SLACK_WEBHOOK_URL not set — skipping Slack notification.")
        return

    pr_number   = os.environ.get("PR_NUMBER",      "?")
    pr_title    = os.environ.get("PR_TITLE",       "PR Review")
    pr_url      = os.environ.get("PR_URL",         "#")
    pr_author   = os.environ.get("PR_AUTHOR",      "unknown")
    repo        = os.environ.get("REPO_FULL_NAME", "repo")
    summary     = load_review_summary()
    score       = summary.get("health_score", 0)
    color       = score_color_hex(score)
    status_txt  = score_label(score)

    # Build Slack Block Kit payload
    payload = {
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "header",
                        "text": {
                            "type": "plain_text",
                            "text": f"🤖 ReviewBot — PR #{pr_number} Review Complete",
                            "emoji": True
                        }
                    },
                    {
                        "type": "section",
                        "fields": [
                            { "type": "mrkdwn", "text": f"*Repository*\n`{repo}`" },
                            { "type": "mrkdwn", "text": f"*Author*\n@{pr_author}" },
                            { "type": "mrkdwn", "text": f"*Health Score*\n*{score}/100* — {status_txt}" },
                            { "type": "mrkdwn", "text": f"*Issues Found*\n{summary.get('issues_count', 0)} issue(s)" },
                        ]
                    },
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*PR Title:*\n<{pr_url}|{pr_title}>"
                        }
                    },
                    {
                        "type": "context",
                        "elements": [
                            {
                                "type": "mrkdwn",
                                "text": f"🔒 Security flags: {summary.get('security_flags', 0)} | "
                                        f"💡 Suggestions: {summary.get('suggestion_count', 0)} | "
                                        f"Top issue: _{summary.get('top_issue', 'None')}_"
                            }
                        ]
                    },
                    {
                        "type": "actions",
                        "elements": [
                            {
                                "type": "button",
                                "text": { "type": "plain_text", "text": "View PR →", "emoji": True },
                                "url": pr_url,
                                "style": "primary"
                            }
                        ]
                    },
                    { "type": "divider" }
                ]
            }
        ]
    }

    resp = requests.post(webhook_url, json=payload, timeout=10)
    if resp.status_code == 200:
        print("✓ Slack notification sent.")
    else:
        print(f"✗ Slack notification failed: {resp.status_code} {resp.text}")
        sys.exit(1)


# ─── Email ───────────────────────────────────────────────────────────────────
def notify_email():
    smtp_host   = os.getenv("SMTP_HOST",    "smtp.gmail.com")
    smtp_port   = int(os.getenv("SMTP_PORT", "587"))
    smtp_user   = os.getenv("SMTP_USER",    "")
    smtp_pass   = os.getenv("SMTP_PASS",    "")
    notify_to   = os.getenv("NOTIFY_EMAIL", smtp_user)

    if not smtp_user or not smtp_pass:
        print("SMTP credentials not set — skipping email notification.")
        return

    pr_number   = os.environ.get("PR_NUMBER",      "?")
    pr_title    = os.environ.get("PR_TITLE",       "PR Review")
    pr_url      = os.environ.get("PR_URL",         "#")
    pr_author   = os.environ.get("PR_AUTHOR",      "unknown")
    repo        = os.environ.get("REPO_FULL_NAME", "repo")
    summary     = load_review_summary()
    score       = summary.get("health_score", 0)
    color       = score_color_hex(score)
    status_txt  = score_label(score)

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body {{ font-family: 'Inter', Arial, sans-serif; background:#05070f; color:#f1f5f9; margin:0; padding:0; }}
    .container {{ max-width:560px; margin:40px auto; background:#0d1117; border:1px solid #1a2234; border-radius:16px; overflow:hidden; }}
    .header {{ background:linear-gradient(135deg,#00e5ff,#0055ff); padding:28px 32px; }}
    .header h1 {{ margin:0; font-size:22px; color:#05070f; font-weight:800; }}
    .header p {{ margin:6px 0 0; font-size:13px; color:#05070f99; }}
    .body {{ padding:32px; }}
    .score-badge {{ display:inline-block; background:{color}22; color:{color}; border:2px solid {color}; border-radius:12px; padding:12px 24px; font-size:32px; font-weight:900; font-family:monospace; }}
    .score-label {{ font-size:14px; color:{color}; margin-top:6px; font-weight:600; }}
    .meta-table {{ width:100%; border-collapse:collapse; margin:20px 0; }}
    .meta-table td {{ padding:10px 0; border-bottom:1px solid #1a2234; font-size:14px; }}
    .meta-table td:first-child {{ color:#8892a4; width:40%; }}
    .meta-table td:last-child {{ font-weight:600; }}
    .issue-box {{ background:#ff456015; border:1px solid #ff456030; border-radius:10px; padding:14px; margin:16px 0; font-size:13px; }}
    .cta {{ display:inline-block; background:linear-gradient(135deg,#00e5ff,#0055ff); color:#05070f; font-weight:700; padding:12px 28px; border-radius:10px; text-decoration:none; font-size:14px; margin-top:16px; }}
    .footer {{ text-align:center; padding:16px 32px; border-top:1px solid #1a2234; font-size:11px; color:#4a5568; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 ReviewBot — Review Complete</h1>
      <p>{repo} · PR #{pr_number}</p>
    </div>
    <div class="body">
      <div style="text-align:center; margin-bottom:28px;">
        <div class="score-badge">{score}</div>
        <div class="score-label">{status_txt}</div>
      </div>

      <table class="meta-table">
        <tr><td>Pull Request</td><td><a href="{pr_url}" style="color:#00e5ff;">{pr_title}</a></td></tr>
        <tr><td>Author</td><td>@{pr_author}</td></tr>
        <tr><td>Issues Found</td><td>{summary.get('issues_count', 0)}</td></tr>
        <tr><td>Security Flags</td><td>{summary.get('security_flags', 0)}</td></tr>
        <tr><td>Suggestions</td><td>{summary.get('suggestion_count', 0)}</td></tr>
      </table>

      {f'<div class="issue-box">⚠ Top issue: {summary.get("top_issue", "")}</div>' if summary.get("top_issue") else ""}

      <div style="text-align:center;">
        <a href="{pr_url}" class="cta">View PR on GitHub →</a>
      </div>
    </div>
    <div class="footer">
      Powered by ReviewBot · Gemini 2.0 Flash + Groq Llama 3.3 70B<br/>
      <a href="https://github.com/Arav1904/pr-review-agent" style="color:#4a5568;">github.com/Arav1904/pr-review-agent</a>
    </div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[ReviewBot] PR #{pr_number} — Health Score {score}/100 | {pr_title[:50]}"
    msg["From"]    = f"ReviewBot <{smtp_user}>"
    msg["To"]      = notify_to
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, notify_to, msg.as_string())
        print(f"✓ Email notification sent to {notify_to}")
    except Exception as e:
        print(f"✗ Email notification failed: {e}")
        sys.exit(1)


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--channel", choices=["slack", "email"], required=True)
    args = parser.parse_args()

    if args.channel == "slack":
        notify_slack()
    elif args.channel == "email":
        notify_email()