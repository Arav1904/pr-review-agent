#!/usr/bin/env python3
"""
ReviewBot — SOUL.md Config Wizard
Interactive CLI that generates a customized SOUL.md for your repository.

Usage:
    python tools/soul_wizard.py                    # interactive mode
    python tools/soul_wizard.py --output ./SOUL.md  # specify output path
    python tools/soul_wizard.py --preset strict     # use a built-in preset
    python tools/soul_wizard.py --preset startup    # startup-friendly preset

What is SOUL.md?
    SOUL.md defines the AI agent's personality, review priorities, and
    communication style. ReviewBot reads it at the start of every review.
"""

import argparse
import os
import sys
from datetime import datetime
from textwrap import dedent


# ─── Presets ─────────────────────────────────────────────────────────────────
PRESETS = {
    "strict": {
        "persona":    "Principal Engineer at a FAANG-level org",
        "tone":       "strict",
        "priorities": ["security", "correctness", "performance"],
        "style":      "Zero tolerance for technical debt. Every issue must be addressed before merge.",
        "examples":   True,
    },
    "startup": {
        "persona":    "Senior engineer at a fast-moving startup",
        "tone":       "friendly",
        "priorities": ["correctness", "security", "code_style"],
        "style":      "Pragmatic and concise. Ship it, but flag critical issues clearly.",
        "examples":   False,
    },
    "mentor": {
        "persona":    "Experienced mentor reviewing a junior developer's work",
        "tone":       "mentor",
        "priorities": ["correctness", "code_style", "documentation"],
        "style":      "Educational tone. Explain the why, not just the what. Encourage learning.",
        "examples":   True,
    },
    "open_source": {
        "persona":    "Open-source maintainer reviewing an external contribution",
        "tone":       "welcoming",
        "priorities": ["correctness", "documentation", "code_style"],
        "style":      "Thank contributors, be encouraging, but enforce project standards.",
        "examples":   True,
    },
}

TONE_OPTIONS = {
    "1": ("strict",     "Strict — no sugar-coating, high bar"),
    "2": ("direct",     "Direct — clear and concise, professional"),
    "3": ("friendly",   "Friendly — positive, constructive nudges"),
    "4": ("mentor",     "Mentor — educational, explains reasoning"),
    "5": ("welcoming",  "Welcoming — best for OSS contributions"),
}

PRIORITY_OPTIONS = {
    "1": "security",
    "2": "correctness",
    "3": "performance",
    "4": "code_style",
    "5": "documentation",
    "6": "test_coverage",
    "7": "breaking_changes",
    "8": "accessibility",
}


# ─── Colors (ANSI) ────────────────────────────────────────────────────────────
def c(text, code): return f"\033[{code}m{text}\033[0m"
def cyan(t):   return c(t, "96")
def green(t):  return c(t, "92")
def yellow(t): return c(t, "93")
def bold(t):   return c(t, "1")
def dim(t):    return c(t, "2")


# ─── Prompt helpers ───────────────────────────────────────────────────────────
def ask(prompt: str, default: str = "", required: bool = False) -> str:
    suffix = f" [{default}]" if default else ""
    while True:
        val = input(f"{cyan('?')} {prompt}{suffix}: ").strip()
        if not val and default:
            return default
        if not val and required:
            print(yellow("  This field is required."))
            continue
        return val or default


def ask_choice(prompt: str, options: dict, default_key: str = "1") -> tuple[str, str]:
    print(f"\n{cyan('?')} {prompt}")
    for k, v in options.items():
        label = v if isinstance(v, str) else v[1]
        marker = green("●") if k == default_key else dim("○")
        print(f"  {marker} {bold(k)}) {label}")
    choice = input(f"\n  Enter choice [{default_key}]: ").strip() or default_key
    result = options.get(choice, options[default_key])
    return (choice, result if isinstance(result, str) else result[0])


def ask_multi(prompt: str, options: dict) -> list[str]:
    print(f"\n{cyan('?')} {prompt}")
    for k, v in options.items():
        print(f"  {dim(k)}) {v}")
    raw = input("  Enter numbers separated by commas (e.g. 1,2,4): ").strip()
    keys = [k.strip() for k in raw.split(",") if k.strip() in options]
    return [options[k] for k in keys] if keys else [options["1"], options["2"]]


def ask_bool(prompt: str, default: bool = True) -> bool:
    d = "Y/n" if default else "y/N"
    val = input(f"{cyan('?')} {prompt} [{d}]: ").strip().lower()
    if not val:
        return default
    return val in ("y", "yes", "1", "true")


# ─── Generate SOUL.md ────────────────────────────────────────────────────────
def generate_soul(config: dict) -> str:
    priorities_str = "\n".join(f"- {p.replace('_',' ').title()}" for p in config["priorities"])
    ignore_str = "\n".join(f"- {p}" for p in config.get("ignore_patterns", []))

    examples_section = ""
    if config.get("include_examples"):
        examples_section = dedent(f"""
        ## Comment Style Examples

        **DO post comments like this:**
        > 🔒 **Security** — This SQL query is vulnerable to injection. Use parameterized queries instead.
        > `user_id = ?` with `execute(query, (user_id,))`

        **DON'T post comments like this:**
        > This could be better.

        Always include:
        1. **What** is wrong
        2. **Why** it matters
        3. **How** to fix it (with a code snippet when possible)
        """)

    slack_section = ""
    if config.get("slack_enabled"):
        slack_section = dedent(f"""
        ## Notification Behavior
        - Post a Slack summary after every review
        - Mention `@channel` only if health score < {config.get('alert_threshold', 60)}
        - Include top 3 issues in the Slack message
        """)

    return dedent(f"""
    # ReviewBot SOUL — {config['repo_name']}

    > This file defines how ReviewBot thinks, communicates, and prioritizes
    > when reviewing pull requests in this repository.
    > Generated by `tools/soul_wizard.py` on {datetime.now().strftime('%Y-%m-%d')}

    ---

    ## Identity

    You are **{config['persona']}** conducting code reviews for `{config['repo_name']}`.

    **Communication Tone:** {config['tone'].title()}

    {config['style']}

    ---

    ## Review Priorities

    When analyzing a pull request, focus on these areas in order:

    {priorities_str}

    ---

    ## Health Score Calibration

    | Score Range | Meaning                         | Action                          |
    |-------------|----------------------------------|----------------------------------|
    | 90–100      | Exceptional — publish-ready      | Approve immediately              |
    | 80–89       | Excellent — minor polish needed  | Approve with optional suggestions|
    | 60–79       | Good — a few items to address    | Request changes (non-blocking)   |
    | 40–59       | Needs Work — meaningful issues   | Request changes (blocking)       |
    | 0–39        | Critical — do not merge          | Block merge, flag for pair review|

    Deduct points based on:
    - **Security issues**: −15 to −30 per critical finding
    - **Correctness bugs**: −10 to −20 per confirmed bug
    - **Performance issues**: −5 to −15 depending on impact
    - **Style/docs**: −2 to −5 (never block a merge for style alone)

    ---

    ## What to Always Flag

    - Hardcoded secrets, tokens, or API keys (CRITICAL — score 0 immediately)
    - SQL/command injection vulnerabilities
    - Missing error handling in critical paths
    - Async race conditions or data races
    - Breaking changes to public APIs without documentation
    - `TODO` / `FIXME` comments left in production-bound code

    ---

    ## What to Never Flag

    - Personal code style preferences not covered by a linter
    - Minor naming variations that don't affect readability
    - File structure opinions unless the team has a written convention
    - Performance micro-optimizations with <1ms real-world impact

    ---

    ## Language-Specific Behavior
    {f"Focus review depth on: {', '.join(config.get('languages', ['JavaScript', 'Python']))}" if config.get('languages') else "Apply standard checks for all detected languages."}

    ---

    ## Ignore Patterns

    Skip review for files matching these patterns:
    {ignore_str if ignore_str else "- (none — review all changed files)"}

    ---
    {examples_section}
    {slack_section}
    ## Final Instruction

    End every review with:
    1. A **one-sentence executive summary** of the PR's quality
    2. The **Health Score** (0–100) in the format: `Health Score: XX/100`
    3. A **required actions list** (if any) — only truly blocking issues
    4. An **optional suggestions list** — nice-to-haves

    Always be specific. A comment with a code example is worth ten without.

    ---
    *Maintained by [@{config.get('maintainer', 'Arav1904')}](https://github.com/{config.get('maintainer', 'Arav1904')}) · ReviewBot v2.0*
    """).strip() + "\n"


# ─── Interactive wizard ───────────────────────────────────────────────────────
def run_wizard(output_path: str):
    print(f"\n{bold('🤖 ReviewBot SOUL.md Config Wizard')}")
    print(dim("─" * 50))
    print("This wizard generates a SOUL.md file that defines")
    print("how the AI agent reviews PRs in your repository.\n")

    # Basic info
    repo_name  = ask("Repository name",   default="pr-review-agent")
    maintainer = ask("Your GitHub handle", default="Arav1904")

    # Persona
    persona = ask(
        "Agent persona (who should the AI pretend to be?)",
        default="Senior Staff Engineer"
    )

    # Tone
    _, tone = ask_choice("Review tone", TONE_OPTIONS, default_key="2")

    # Review style
    style = ask(
        "One-sentence review philosophy",
        default="Be precise, be actionable, and never block a PR for trivial style nits."
    )

    # Priorities
    priorities = ask_multi(
        "Select top review priorities (choose up to 4 by number, comma-separated)",
        PRIORITY_OPTIONS
    )

    # Languages
    langs_raw = ask("Languages used in this repo (comma-separated)", default="JavaScript, Python")
    languages = [l.strip() for l in langs_raw.split(",") if l.strip()]

    # Ignore patterns
    ignore_raw = ask("Ignore patterns (comma-separated, leave blank for none)", default="")
    ignore_patterns = [p.strip() for p in ignore_raw.split(",") if p.strip()]

    # Options
    include_examples = ask_bool("Include comment style examples in SOUL.md?", default=True)
    slack_enabled    = ask_bool("Enable Slack notifications?",                  default=False)
    alert_threshold  = 60
    if slack_enabled:
        t = ask("Alert threshold (send urgent Slack if score below)", default="60")
        try: alert_threshold = int(t)
        except: pass

    config = {
        "repo_name":        repo_name,
        "maintainer":       maintainer,
        "persona":          persona,
        "tone":             tone,
        "style":            style,
        "priorities":       priorities,
        "languages":        languages,
        "ignore_patterns":  ignore_patterns,
        "include_examples": include_examples,
        "slack_enabled":    slack_enabled,
        "alert_threshold":  alert_threshold,
    }

    soul_content = generate_soul(config)

    # Write file
    out = output_path or "./SOUL.md"
    with open(out, "w") as f:
        f.write(soul_content)

    print(f"\n{green('✓')} SOUL.md written to {bold(out)}")
    print(f"  {dim('Commit it to the root of your repository.')}")
    print(f"  {dim('ReviewBot will automatically use it on the next PR.')}\n")


def run_preset(preset_name: str, output_path: str):
    if preset_name not in PRESETS:
        print(f"Unknown preset '{preset_name}'. Available: {', '.join(PRESETS.keys())}")
        sys.exit(1)

    preset = PRESETS[preset_name]
    config = {
        "repo_name":        "pr-review-agent",
        "maintainer":       "Arav1904",
        "persona":          preset["persona"],
        "tone":             preset["tone"],
        "style":            preset["style"],
        "priorities":       preset["priorities"],
        "languages":        ["JavaScript", "Python"],
        "ignore_patterns":  ["**/*.lock", "**/dist/**"],
        "include_examples": preset["examples"],
        "slack_enabled":    False,
        "alert_threshold":  60,
    }
    soul_content = generate_soul(config)
    out = output_path or f"./SOUL-{preset_name}.md"
    with open(out, "w") as f:
        f.write(soul_content)
    print(green(f"✓ SOUL.md (preset: {preset_name}) written to {out}"))


# ─── Entry point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ReviewBot SOUL.md Config Wizard")
    parser.add_argument("--output", "-o", type=str, help="Output file path (default: ./SOUL.md)")
    parser.add_argument("--preset", "-p", type=str, choices=list(PRESETS.keys()),
                        help="Skip wizard and use a built-in preset")
    args = parser.parse_args()

    if args.preset:
        run_preset(args.preset, args.output)
    else:
        run_wizard(args.output)