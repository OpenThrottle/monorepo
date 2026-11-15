import type { ProductPositioning } from '../types/product';

/**
 * @description The positioning canon, approved by the owner on 2026-11-15 (OT
 * task 65ebd642). It changes quarterly and only by a human; every surface
 * picks the length it needs. Pillars are in display order: memory,
 * runners, history, local.
 * @public
 */
export const PRODUCT_POSITIONING = {
  closing: `History is not only a record. Evals are built from real runs, and a scheduled job proposes updates from what landed, so each iteration of the system improves the next.`,
  lede: {
    long: `Chat tabs forget, Markdown plans drift, and issue trackers never see the agent run. OpenThrottle keeps intent, execution and outcome together. Write a plan, hand it to any agent CLI through a runner you can customize, and get back commits that point to the task that produced them. Everything runs locally on open-source software, and everything that happens becomes memory the next run can use.`,
    medium: `Turn plans into agent runs on runners you control, keep a full record of who did what and why, and let every iteration improve the next.`,
    short: `Plans in, traceable work out, smarter every iteration.`,
  },
  pillars: [
    {
      id: 'memory',
      long: `Intent belongs in a database, not a chat tab. OpenThrottle stores plans, tasks, notes and your repo docs in Postgres with hybrid semantic search, and exposes all of it over MCP, so every agent CLI and editor you use reads and writes the same source of truth with the same servers and permissions.`,
      medium: `Plans, tasks, notes and repo docs in one knowledge base with hybrid search, available in Claude Code, Cursor, Codex, OpenCode and Antigravity over MCP.`,
      name: `Plans as shared memory`,
      short: `Plans, tasks and docs your agents can search.`,
    },
    {
      id: 'runners',
      long: `OpenThrottle ships foundational runners and loops, not a single fixed agent. Today's starting points work a plan one task at a time: select, work, validate, commit. Choose one, change its prompts, hooks and model routing, or build your own. Each run gets its own git worktree, ports and, when needed, database, and runs can start now or be scheduled.`,
      medium: `Start from strong runners and loops, then customize them. Runs get isolated worktrees and can be queued or scheduled; any agent CLI does the work.`,
      name: `Runners you own`,
      short: `Foundational runners and loops you adapt and improve.`,
    },
    {
      id: 'history',
      long: `OpenThrottle treats work as a history you can query. Commits carry Plan-Id and Task-Id footers, runs record which agent and model did the work, usage is attributed to the task and the account that paid for it, and every run is captured as an open trajectory. When someone asks why a line of code exists, the answer is a plan, a task and a run, not a guess.`,
      medium: `Every commit carries its plan and task. Runs record the agent, model, tokens and outcome, so you can always ask what shipped and why the code exists.`,
      name: `Work as history`,
      short: `Who did what, when, and why, for every change.`,
    },
    {
      id: 'local',
      long: `The whole stack runs on your own hardware with open-source software: Postgres, Redis, the server, the developer app and a desktop shell. Embeddings run locally in-process with no API key; Ollama and hosted providers are opt-in. Your plans, history and code stay yours, under an Apache-2.0 license.`,
      medium: `Apache-2.0 and local first: Postgres, Redis and in-process embeddings on your own machine. Cloud models and providers are optional, never required.`,
      name: `Runs on your machine`,
      short: `Open source, local first, no lock-in.`,
    },
  ],
  tagline: {
    long: `OpenThrottle is an open-source, AI-native platform for planning and shipping software. Plans, tasks, docs, agent runs and commits live in one Postgres-backed system that your editor, your agents and your team all share over MCP. You choose a runner, shape it to how your team works, and run it on your own machine. Every run is recorded as history, and that history feeds the next plan, so the system gets better with each iteration.`,
    medium: `OpenThrottle is the AI-native platform for planning and shipping software: plans, agent runs and commits in one system you own.`,
    short: `The AI-native platform for planning and shipping software.`,
  },
} as const satisfies ProductPositioning;
