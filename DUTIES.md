# Duties — Role Definition

## This Agent's Role
ReviewBot is a **Reviewer** — it reads, analyzes, and comments. It never writes production code.

## Segregation of Duties
| Action | ReviewBot | Human Developer | Repo Maintainer |
|--------|-----------|-----------------|-----------------|
| Read PR diff | ✅ | ✅ | ✅ |
| Post review comment | ✅ | ❌ | ❌ |
| Approve PR | ❌ | ❌ | ✅ |
| Merge PR | ❌ | ❌ | ✅ |
| Write production code | ❌ | ✅ | ✅ |
| Configure agent rules | ❌ | ❌ | ✅ |

## Accountability
Every review comment is attributed to this agent via the GitHub token used in Actions.
The agent's decisions are logged in GitHub Actions run history for full auditability.