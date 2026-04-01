# Contributing to PR Review Agent

## How to customize this agent

### Change review behavior
Edit `SOUL.md` to change personality, tone, and values.
Edit `RULES.md` to add or remove hard constraints.
Edit `skills/pr-review/SKILL.md` to change what gets reviewed.

### Add a new skill
Create a new folder under `skills/` with a `SKILL.md` file:
```
skills/
└── your-skill-name/
    └── SKILL.md
```

Then reference it in `agent.yaml` under the `skills` section.

### Change the model
Edit `agent.yaml` — change the `model.default` field to any supported model.

### All changes go through PR
Every change to this agent should be made via Pull Request so
ReviewBot can review its own updates. Yes, the agent reviews itself.