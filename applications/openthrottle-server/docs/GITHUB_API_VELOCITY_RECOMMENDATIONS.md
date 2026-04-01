# GitHub API velocity metrics – recommendations

Recommended stats to collect for demonstrating team/product velocity, with API usage and caveats. No implementation—recommendations only. Research audit: [GITHUB_API_VELOCITY_RESEARCH.md](./GITHUB_API_VELOCITY_RESEARCH.md).

_Plan-Id: 03b2680d-2bcc-4ddf-bfc7-63c7108e86ad._

---

## 1. Lines added / deleted (by period or author)

**What it shows:** Volume of code change over time or per contributor; useful for throughput and contribution distribution.

**APIs to use:**

- **REST:** `GET /repos/{owner}/{repo}/pulls/{pull_number}` — response includes `additions`, `deletions`, `changed_files`. List PRs first (`GET /repos/{owner}/{repo}/pulls?state=closed&...`), then fetch each PR for diff stats. Group by `merged_at` (or `created_at`) into weeks/months and by `user.login` for author.
- **GraphQL:** Prefer when aggregating many PRs: query `PullRequest` with `additions`, `deletions`, `changedFiles` and author/timeline fields in one request to avoid N+1.

**Caveats:**

- One REST request per PR for additions/deletions; list endpoint does not include them. For large repos, use GraphQL or accept higher request volume; respect rate limits (5,000/hour authenticated).
- Additions/deletions reflect the final diff (base vs head at merge/reference time), not intermediate commits.

---

## 2. Time from open to merged (e.g. median, P90)

**What it shows:** How long PRs sit before merge; good for cycle time and process bottlenecks.

**APIs to use:**

- **REST:** List or get PRs — every PR has `created_at` and `merged_at` (or `closed_at` if not merged). Compute duration as `merged_at - created_at` for merged PRs. No extra endpoint; filter merged PRs client-side and aggregate (median, P90) by period or label.
- **GraphQL:** Same fields (`createdAt`, `mergedAt`) on `PullRequest`; convenient when already querying PRs for other metrics.

**Caveats:**

- Only defined for merged PRs; exclude closed-but-not-merged for “time to merge.” For “time to close” (including closed unmerged), use `closed_at`.
- Time zones: API returns ISO 8601; decide consistently (e.g. UTC) for bucketing by day/week/month.

---

## 3. PR / issue counts by label or category

**What it shows:** Breakdown of work by type (e.g. bug, feature, docs) or priority; supports reporting by category.

**APIs to use:**

- **REST:** List PRs or issues — each item has `labels[]` with `name`, `description`, `color`. For issues (including PRs as issues), use `GET /repos/{owner}/{repo}/issues` with query param `labels=label1,label2` to filter server-side. For PR-only list, no server-side label filter; filter client-side by `labels` from list response.
- **Repo labels:** `GET /repos/{owner}/{repo}/labels` to enumerate or normalize label names.

**Caveats:**

- PR list endpoint does not support `labels` query; use Issues API with a filter that includes PRs, or fetch list and filter in app. Inconsistent labeling across repos will affect categorization.

---

## 4. PRs merged per week / month

**What it shows:** Throughput and trend of merged work over time.

**APIs to use:**

- **REST:** `GET /repos/{owner}/{repo}/pulls?state=closed&sort=updated&direction=desc` (or `state=all` then filter merged). The list response includes `merged_at` (non-null when merged), so you can bucket into calendar weeks/months without extra get-per-PR. Paginate with `per_page=100` and `page` (or `Link` header).
- **GraphQL:** Query `PullRequest` connection with `mergedAt`, filter `state: MERGED`; bucket by `mergedAt` in application.

**Caveats:**

- When using REST list, include only items where `merged_at` is present for “merged” counts; closed-but-not-merged PRs have `merged_at` null.

---

## 5. Review cycle time (optional)

**What it shows:** Time from first review or “changes requested” to approval/merge; indicates review responsiveness.

**APIs to use:**

- **REST:** `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews` — each review has `state` (APPROVED, CHANGES_REQUESTED, COMMENT) and `submitted_at`. Derive “review cycle” as time from first review (or first CHANGES_REQUESTED) to last APPROVED or to `merged_at`. Optionally use `GET .../issues/{issue_number}/timeline` for finer-grained events.
- **GraphQL:** `PullRequest.reviews` connection with `state` and `submittedAt` (or equivalent); same derivation in app.

**Caveats:**

- Heuristics required (e.g. first approval vs last approval; how to treat COMMENT-only reviews). Multiple rounds of changes requested add complexity; define “review cycle” clearly (e.g. last changes_requested → first subsequent approval).
- Paginate reviews; no `total_count` in body.

---

## 6. Commits per PR (optional)

**What it shows:** Size of PR in terms of commits; can complement “changed files” or lines for complexity.

**APIs to use:**

- **REST:** `GET /repos/{owner}/{repo}/pulls/{pull_number}/commits` — paginate (e.g. `per_page=100`) and count, or use `Link` header `rel="last"` to get last page number.
- **GraphQL:** `PullRequest.commits` connection with `totalCount` (no extra pagination for the count).

**Caveats:**

- REST requires pagination for exact count; GraphQL is more efficient if you already use it.

---

## 7. High-level summary

| Recommended stat                        | What it shows                   | Preferable API                                            | Caveats                                         |
| --------------------------------------- | ------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| Lines added/deleted by period or author | Throughput, contribution spread | GraphQL for many PRs; REST get-per-PR                     | N+1 on REST; rate limits                        |
| Time open → merged (median/P90)         | Cycle time                      | REST or GraphQL (list/get PR)                             | Only for merged; timezone consistency           |
| PR/issue counts by label                | Work by category                | REST list issues with `labels`; client filter for PR-only | PR list has no label filter                     |
| PRs merged per week/month               | Throughput trend                | REST list (use `merged_at`) or GraphQL                    | Filter to `merged_at` non-null for merged-only  |
| Review cycle time                       | Review responsiveness           | REST/GraphQL reviews + `submitted_at`                     | Define heuristic (e.g. last request → approval) |
| Commits per PR                          | PR size in commits              | GraphQL `totalCount`; REST paginate                       | REST: pagination only                           |

---

**Next steps (out of scope for this doc):** Choose a subset of metrics for v1, design storage/aggregation, then implement collectors using the above APIs and the research audit.
