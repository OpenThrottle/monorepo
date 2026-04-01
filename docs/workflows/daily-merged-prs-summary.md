# Daily merged PRs summary

GitHub Actions workflow that runs on a schedule (or manually) and summarizes pull requests merged in the repository for a given day.

## Where to see the summary

- **Job summary:** After a run, open the workflow run in **Actions → "Daily merged PRs summary"** and expand the **"Produce summary"** step. The step writes to **Job summary** (the Summary tab for that run), which shows:
  - Date covered
  - Count of merged PRs
  - Table of PR number, title, and author (when count > 0)

## How to run it

- **Manual run:** **Actions** → select **"Daily merged PRs summary"** → **Run workflow** (use **workflow_dispatch**).
- **Scheduled:** The workflow is configured for daily at **6:00 AM UTC** via `schedule`; the job is **disabled by default** (`if: false`).

## Enabling the scheduled job

The workflow file is present but the job does not run on the cron until enabled. To enable:

1. Open `.github/workflows/daily-merged-prs-summary.yml`.
2. Remove the `if: false` line under the `summary` job (or set it to `true`).

Ensure the repository has `GITHUB_TOKEN` (or appropriate token) with `pull-requests: read` so `gh search prs` can query merged PRs.
