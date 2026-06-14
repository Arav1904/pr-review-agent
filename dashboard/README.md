# 📊 Analytics Dashboard

**Live demo:** https://pr-review-agent-eight.vercel.app/

PR ReviewBot ships with a full analytics dashboard that visualizes everything
the AI agent tracks across your pull requests — health scores, trends,
contributor leaderboards, and per-PR deep dives.

### Features

- **Live GitHub sync** — paste a personal access token and the dashboard pulls
  real PR data, comments, and changed files directly from the GitHub API.
- **Demo mode** — no token needed. One click loads a realistic 14-PR dataset
  so judges/reviewers can explore every feature instantly.
- **Animated health ring** — repo-wide score visualized as a glowing dial
  with letter-grade (A+ to F).
- **AI Insights panel** — auto-generated, plain-English takeaways: quality
  trend direction, security exposure, top contributor, and file hotspots.
- **Activity heatmap** — GitHub-contribution-style grid of PR activity over
  the last 35 days.
- **Composed trend chart** — health score, rolling average, and code churn
  (additions/deletions) all on one chart.
- **Team leaderboard** — ranked contributors with avg score, consistency %,
  and net lines changed.
- **Global search (⌘K / Ctrl+K)** — instantly jump to any PR, contributor,
  label, or page from anywhere in the app.
- **PR detail drawer** — click any PR to see its full score breakdown, files
  changed, diff stats, and an AI-generated verdict.

### Local development

```bash
cd dashboard
npm install
npm run dev      # http://localhost:5173
```

### Deployment

The dashboard is a standalone Vite + React app deployed to Vercel with:

| Setting | Value |
|---|---|
| Root Directory | `dashboard` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Every push to `main` auto-deploys via Vercel's GitHub integration.