# @openthrottle/agentic-token-usage

Isomorphic (Node + browser safe) canonical token-usage normalization for OpenThrottle's agent-CLI chat backends.

Each conversation backend (claude, codex, cursor, grok, opencode, openai) reports token/cost accounting in a wildly different shape. This leaf folds all of them into one `NormalizedTokenUsage` value, so the **same** normalization runs on the server persistence path (`ConversationStreamService`) and in the browser chat UI (`@openthrottle/react-router-chat`) — no duplicate implementation to drift.

Pure functions only: no node built-ins, no React, no DOM.

## Exports

- `NormalizedTokenUsage` — the canonical, all-optional token-usage shape (`inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `reasoningTokens`, `totalTokens`, `costUsd`, `model`).
- `normalizeUsage(input)` — fold one backend's raw usage metadata (record or JSON string) into `NormalizedTokenUsage`; tolerant of missing/garbage input.
- `sumUsage(a, b)` — accumulate two usages (used to sum opencode's multiple mid-stream `step_finish` chunks into one turn total).
- `hasUsageCounts(usage)` — true when at least one numeric count is present (renderers/persistence use it to decide whether to show/write anything).
- `formatTokenCount(n)` / `formatUsageCost(costUsd)` — compact display helpers (`1.2k`, `$0.042`).

## Installation

Install with your preferred package manager (list pnpm first in this monorepo):

**pnpm:**

```bash
pnpm add @openthrottle/agentic-token-usage
```

**npm:**

```bash
npm install @openthrottle/agentic-token-usage
```
