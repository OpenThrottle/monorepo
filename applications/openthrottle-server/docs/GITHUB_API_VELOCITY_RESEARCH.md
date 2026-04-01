# GitHub REST API (and GraphQL) – Velocity metrics research

Research audit of GitHub REST API and GraphQL for endpoints and fields that support team/product velocity metrics. No implementation—capture of APIs and fields only.

_Plan-Id: 03b2680d-2bcc-4ddf-bfc7-63c7108e86ad._

**References:** [GitHub REST API (Pulls)](https://docs.github.com/en/rest/pulls/pulls), [Issues](https://docs.github.com/en/rest/issues/issues), [Timeline](https://docs.github.com/en/rest/issues/timeline), [Reviews](https://docs.github.com/en/rest/pulls/reviews), [Commits](https://docs.github.com/en/rest/commits/commits), [Repos](https://docs.github.com/en/rest/repos/repos), [Rate limit](https://docs.github.com/en/rest/rate-limit/rate-limit), [Pagination](https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api).

---

## 1. PR / issue list and detail

### List pull requests

- **Endpoint:** `GET /repos/{owner}/{repo}/pulls`
- **Query params:** `state` (open | closed | all), `base`, `head`, `sort` (created | updated | popularity | long-running), `direction`, `per_page` (max **100**), `page`
- **Response fields (per item):** `number`, `state`, `title`, `user` (author), `created_at`, `updated_at`, `closed_at`, `merged_at`, `labels[]` (id, name, color, description), `html_url`, `commits_url`, `review_comments_url`, `comments_url`, `issue_url`, `diff_url`, `patch_url`
- **Does not include:** `additions`, `deletions`, `changed_files` on the list response

### Get a single pull request

- **Endpoint:** `GET /repos/{owner}/{repo}/pulls/{pull_number}`
- **Response:** Full pull request object. In addition to list fields, the single-PR response includes **`additions`**, **`deletions`**, and **`changed_files`** (integer counts for the PR diff). Use this endpoint when you need lines-added/deleted or file count per PR.
- **Caveat:** One request per PR; for many PRs this can be N+1. Consider GraphQL or batching.

### List issues (includes PRs when applicable)

- **Endpoint:** `GET /repos/{owner}/{repo}/issues` or `GET /issues` (authenticated user)
- **Query params:** `state`, `labels`, `sort`, `since`, `per_page` (max 100), `page`; for user: `filter`, `pulls` (boolean)
- **Response:** Issues and PRs; PRs include `pull_request` object (url, html_url, diff_url, patch_url). Each item has `labels[]`, `created_at`, `updated_at`, `closed_at`, `state`, `user`, `comments`, `number`
- **Note:** Issues API does not return `additions`/`deletions`/`changed_files`; use Pulls API for PR-specific stats.

---

## 2. Labels on PRs and issues

- **On list/get PR:** Each PR has `labels` array: `id`, `node_id`, `url`, `name`, `description`, `color`, `default`
- **On list/get issue:** Same `labels` structure
- **Repo labels:** `GET /repos/{owner}/{repo}/labels` for all repo labels (paginated, per_page max 100)
- **Filtering:** List issues with `labels` query param (comma-separated names, e.g. `bug,ui,@high`). List PRs do not support server-side filter by label; filter client-side or use Issues API with `pulls=true` and `labels=...`

---

## 3. Events / timeline (created_at, merged_at, closed_at, time open-to-merged)

### From PR/issue object

- **`created_at`**, **`updated_at`**, **`closed_at`**, **`merged_at`** are on the pull request (and issue) object from List PRs, Get PR, and List/Get issue. No extra call needed for time open-to-merged: compute from `created_at` and `merged_at` (or `closed_at` if not merged).

### Issue timeline events

- **Endpoint:** `GET /repos/{owner}/{repo}/issues/{issue_number}/timeline`
- **Query params:** `per_page` (max 100), `page`
- **Response:** Mixed event types (e.g. `labeled`, `closed`, `renamed`, comment events). Each has `created_at`; event type in `event`. Useful for finer-grained history (e.g. when labels changed, when closed). Not required for simple open-to-merged duration if you already have `merged_at`/`closed_at` on the PR.

---

## 4. Commits per PR

- **Endpoint:** `GET /repos/{owner}/{repo}/pulls/{pull_number}/commits`
- **Query params:** `per_page` (max 100), `page`
- **Response:** List of commits (sha, commit message, author, committer, url). **Total count:** use `Link` header (rel="last") or paginate and count. No `total_count` in body; pagination required for exact count.

---

## 5. Review counts

- **Endpoint:** `GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews`
- **Query params:** `per_page` (max 100), `page`
- **Response:** List of reviews; each has `id`, `user`, `body`, **`state`** (e.g. APPROVED, CHANGES_REQUESTED, COMMENT), `submitted_at`, `commit_id`, `html_url`
- **Count:** Paginate and count, or use `Link` header. No `total_count` in response body.
- **Review comments (inline):** `GET /repos/{owner}/{repo}/pulls/{pull_number}/comments` — paginated list of review comments (per_file/inline). Separate from “reviews” (the summary review event).

---

## 6. Repo stats

- **Get repository:** `GET /repos/{owner}/{repo}`
  - **Fields:** `open_issues_count`, `forks_count`, `stargazers_count`, `watchers_count`, `size`, `default_branch`, `pushed_at`, `created_at`, `updated_at`, `language`, `topics[]`, `has_issues`, `archived`, `visibility`
- **List repo languages:** `GET /repos/{owner}/{repo}/languages` — bytes per language (e.g. `{"TypeScript": 12345, "JavaScript": 6789}`)
- **List org repos:** `GET /orgs/{org}/repos` — `type`, `sort`, `per_page` (max 100), `page` for enumerating repos

---

## 7. Compare two commits (diff stats for base...head)

- **Endpoint:** `GET /repos/{owner}/{repo}/compare/{base}...{head}`
- **Response:** Includes `ahead_by`, `behind_by`, `total_commits`, `commits[]`, and a **`files`** array. Each file can include patch/diff info; the compare response is often used to get aggregate diff stats between two refs. For a PR, `base` = base branch and `head` = head branch (or PR head SHA). The compare response does **not** include top-level `additions`/`deletions`; use Get single PR (`additions`, `deletions`, `changed_files`) or sum per-file stats from the compare `files` array if needed.

---

## 8. Rate limits and pagination

### Rate limits (REST)

- **Core (non-search):** 5,000 requests/hour (authenticated). Unauthenticated: 60/hour.
- **Search API:** 30 requests/minute (separate from core).
- **Code search:** Stricter limit; separate bucket.
- **Check:** `GET /rate_limit` — response includes `resources.core` (limit, used, remaining, reset). Accessing this endpoint does not count against your REST API rate limit.

### Pagination

- **Mechanism:** `page` and `per_page` (max **100** for most endpoints). Response `Link` header: `rel="next"`, `rel="last"`, `rel="prev"`, `rel="first"` with URLs for other pages.
- **Best practice:** Use `per_page=100` to minimize requests; follow `Link` for next page. No cursor-based pagination for these endpoints (page-based only).

---

## 9. GraphQL relevance for velocity

- **PullRequest** type exposes: **`additions`**, **`deletions`**, **`changedFiles`**; **`createdAt`**, **`closedAt`**, **`mergedAt`**; **`commits`** (connection with `totalCount`); **`reviews`** (connection); **`labels`** (connection). Repository can query many PRs in one request with these fields, reducing N+1.
- **Rate limit:** GraphQL has a separate limit (e.g. 5,000 points per hour); query cost varies by requested fields and depth.
- **When to use:** Prefer GraphQL when aggregating many PRs with additions/deletions/changed_files and timeline/review data in fewer round-trips.

---

## 10. Summary table (candidate metrics → API support)

| Metric                             | REST endpoint(s)                                                                                  | Fields / approach                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Lines added/deleted, files changed | `GET /repos/{owner}/{repo}/pulls/{pull_number}`                                                   | `additions`, `deletions`, `changed_files`                 |
| PR/issue counts by period          | List PRs or issues with `state`, `since` (issues); filter by `created_at`/`merged_at` client-side | `created_at`, `merged_at`, `closed_at`, `state`           |
| Time open-to-merged                | List/Get PR or issue                                                                              | `created_at`, `merged_at` (or `closed_at`)                |
| Labels / categorization            | List/Get PR or issue; filter by label (issues)                                                    | `labels[]` (name, etc.)                                   |
| Commits per PR                     | `GET .../pulls/{pull_number}/commits`                                                             | Paginate; count or use Link header                        |
| Review count per PR                | `GET .../pulls/{pull_number}/reviews`                                                             | Paginate; count; `state` for approved/changes_requested   |
| Repo-level stats                   | `GET /repos/{owner}/{repo}`; `GET .../languages`                                                  | `open_issues_count`, `forks_count`, etc.; languages bytes |
| Timeline events (optional)         | `GET .../issues/{issue_number}/timeline`                                                          | `event`, `created_at`                                     |

This document is the research audit only. See [GITHUB_API_VELOCITY_RECOMMENDATIONS.md](./GITHUB_API_VELOCITY_RECOMMENDATIONS.md) for recommended stats to collect, what each shows, which API(s) to use, and caveats—with no implementation.
