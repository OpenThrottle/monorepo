## 1.4.0 (2026-11-16)

### 🚀 Features

- **openthrottle-developer:** group OT Loop run output by attempt ([#734](https://github.com/OpenThrottle/monorepo/pull/734))
- **openthrottle-server:** put the work ledger behind a forge interface ([#867](https://github.com/OpenThrottle/monorepo/pull/867))
- **openthrottle-server:** keep source code off hosted embedding providers unless opted in ([#863](https://github.com/OpenThrottle/monorepo/pull/863))
- **openthrottle-developer:** show background work progress in the sidebar ([#856](https://github.com/OpenThrottle/monorepo/pull/856))
- **openthrottle-developer:** polish /search and graduate it out of beta ([#852](https://github.com/OpenThrottle/monorepo/pull/852))
- **openthrottle-server:** record worktree removal audit on deregister ([#850](https://github.com/OpenThrottle/monorepo/pull/850))
- **openthrottle-developer:** keep /plans* routes live on status changes ([#851](https://github.com/OpenThrottle/monorepo/pull/851))
- **openthrottle-server:** rank semantic_search with hybrid RRF ([#847](https://github.com/OpenThrottle/monorepo/pull/847))
- **openthrottle-server:** move code embeddings onto the unified embedder ([#843](https://github.com/OpenThrottle/monorepo/pull/843))
- **monorepo:** audit worktree removals and catch orphaned worktree servers ([#845](https://github.com/OpenThrottle/monorepo/pull/845))
- **node-client:** add hosted OpenAI and Gemini embedding providers ([#839](https://github.com/OpenThrottle/monorepo/pull/839))
- **openthrottle-server:** guaranteed embeddings with a local model, queue and reconciler ([#834](https://github.com/OpenThrottle/monorepo/pull/834))
- **openthrottle-server:** fill in ~/.openthrottle/.env on boot for zero-config telemetry ([#823](https://github.com/OpenThrottle/monorepo/pull/823))
- **openthrottle-agentic-loop:** deliver plan inbox messages to headless workers mid-attempt ([#816](https://github.com/OpenThrottle/monorepo/pull/816))

### 🩹 Fixes

- **openthrottle-server:** make the forge layer safe for repos that aren't OpenThrottle ([#870](https://github.com/OpenThrottle/monorepo/pull/870))
- **openthrottle-server:** keep search responsive while embeddings backfill ([#854](https://github.com/OpenThrottle/monorepo/pull/854))
- **agentic-hooks:** keep a run alive across a turn that ends on a question ([#849](https://github.com/OpenThrottle/monorepo/pull/849))
- **openthrottle-cms:** polish the fragment editor's add-child picker ([#844](https://github.com/OpenThrottle/monorepo/pull/844))
- **monorepo:** close the 2026-08 security sweep findings ([#835](https://github.com/OpenThrottle/monorepo/pull/835))
- **monorepo:** refuse to remove a worktree an unsettled plan run is using ([#830](https://github.com/OpenThrottle/monorepo/pull/830))
- **nestjs-repositories-cms:** show unpublished cms layouts only to cms writers ([#825](https://github.com/OpenThrottle/monorepo/pull/825))
- **openthrottle-agentic-utils:** render grok 1.x tool cards and explain cancelled turns ([#820](https://github.com/OpenThrottle/monorepo/pull/820))

### ❤️ Thank You

- Matthew Scholta @visormatt
