# Scheduled job: daily @openthrottleai poster

Created through the OpenThrottle MCP scheduling tools (`OPENTHROTTLE_MCP_TOOLSETS=scheduling`),
so it lands at `approvalState=pending` and does not fire until a human approves it in the
developer app. Prompt and settings below are the reviewed copy: change them here first.

| Setting              | Value                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| name                 | `@openthrottleai daily poster`                                                                                   |
| driverId             | `claude`                                                                                                         |
| model                | `sonnet` (the cheap tier: the job only runs two commands)                                                        |
| scheduleKind         | `cron`                                                                                                           |
| cronPattern          | `0 7 * * *`                                                                                                      |
| timezone             | `America/Los_Angeles`                                                                                            |
| misfirePolicy        | `skip` (a late fire never posts yesterday's tweet)                                                               |
| timeoutMs            | `600000` (10 minutes)                                                                                            |
| repositoryCheckoutId | the primary OpenThrottle checkout, on `main`                                                                     |
| allowedCommands      | `pnpm run social:x-post`, `pnpm run social:x-post *`, `pnpm run social:x-metrics`, `pnpm run social:x-metrics *` |

Prerequisites: this package merged to `main` in that checkout; `OPENTHROTTLE_SOCIAL_PLAN_ID`,
`X_CLIENT_ID` and `X_REFRESH_TOKEN` in `~/.openthrottle/.env` (see the runbook).

Run-now refuses a pending job, so approve it first, then fire it once with run-now using the **dry-run prompt** (the same text with
`-- --dry-run` after each command), check its run history, then switch to the real prompt, which sends the job back for one more approval.

## Prompt

```text
You are the scheduled poster for the @openthrottleai X account. Run exactly these two commands from the repository root, in this order, and nothing else:

1. pnpm run social:x-post
2. pnpm run social:x-metrics

Run the second even if the first fails. Do not write, edit, compose, reword or post anything yourself, do not change any file, task or plan, and do not retry a command. Both commands are idempotent and record their own results in OpenThrottle.

When both have finished, reply with a short report: for each command, its exit code and its output verbatim. Exit codes: 0 = done or nothing to do, 1 = a task went BLOCKED or a service was unreachable, 2 = configuration is missing, 3 = a media post needs a human. If any exit code is not 0, start the report with "ATTENTION:" and one sentence naming which command and why.
```
