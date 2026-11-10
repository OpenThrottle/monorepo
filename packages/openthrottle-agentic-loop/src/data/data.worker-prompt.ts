/** @description Static copy for the worker prompt (docs/workflows/ot-loop-job.md § 3). */
export const WORKER_PROMPT_INTRO = `You are working one task from a plan, inside a git worktree at the repository root.`;

export const WORKER_PROMPT_REPOSITORY_RULES = `# Repository rules
Follow the repository's own AGENTS.md / CLAUDE.md / CONTRIBUTING.md. In particular, where they
apply: use the repo's generators before hand-writing files; no \`as\` casts or \`any\`; no deep package
imports; \`import type\` at the top level. You may run the project's checks for your own feedback,
one at a time.`;

export const WORKER_PROMPT_HARD_RULES = `# Hard rules
- Do NOT change any plan or task status in any tracker, and do NOT commit, push, or open a PR.
  The caller owns all of that.
- Do NOT edit files under .ot-loop/ other than the result file below.`;

export const WORKER_PROMPT_RESULT_INSTRUCTIONS = `# When you finish, write .ot-loop/result.json
Write a JSON object with this shape:

{
  "version": 1,
  "status": "done",
  "reason": "One paragraph summarizing what you did.",
  "commitMessage": "feat(scope): conventional commit header",
  "followUps": [
    {
      "title": "Short follow-up title",
      "description": "What the follow-up needs.",
      "category": "implementation"
    }
  ]
}

Field notes:
- version: always the number 1.
- status: "done" when the task is finished, "blocked" when you cannot finish it.
- reason: 1 to 2000 characters. Required for every status.
- commitMessage: a conventional-commit message (header, optional body) or null. Do not add
  Plan-Id or Task-Id footers or any attribution trailers.
- followUps: work the task revealed, at most 10 items; use [] when there is none. Each item has
  title (1 to 200 characters), description (up to 4000 characters) and category (string or null).

Write it last. If you cannot finish, write status "blocked" with the reason.`;
