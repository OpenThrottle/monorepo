## 4.6.0 (2026-11-16)

| Project                  | From  | To        |
| ------------------------ | ----- | --------- |
| `monorepo`               | 4.5.0 | **4.6.0** |
| `openthrottle-admin`     | 1.0.0 | **1.1.0** |
| `openthrottle-app`       | 1.0.0 | **1.1.0** |
| `openthrottle-cms`       | 1.0.0 | **1.1.0** |
| `openthrottle-developer` | 1.0.0 | **1.1.0** |
| `openthrottle-server`    | 1.3.0 | **1.4.0** |
| `openthrottle-website`   | 1.0.0 | **1.1.0** |

### 🚀 Features

- **openthrottle-server:** keep source code off hosted embedding providers unless opted in ([#863](https://github.com/OpenThrottle/monorepo/pull/863))
- **openthrottle-product:** restore the org profile stats card, drawn from live numbers ([#860](https://github.com/OpenThrottle/monorepo/pull/860))
- **openthrottle-product:** render the org profile with emoji and project status ([#859](https://github.com/OpenThrottle/monorepo/pull/859))
- **ci:** deploy a chosen app to Vercel from any branch on demand ([#855](https://github.com/OpenThrottle/monorepo/pull/855))
- **openthrottle-product:** build every product surface from one typed registry ([#853](https://github.com/OpenThrottle/monorepo/pull/853))
- **openthrottle-server:** move code embeddings onto the unified embedder ([#843](https://github.com/OpenThrottle/monorepo/pull/843))
- **node-client:** add hosted OpenAI and Gemini embedding providers ([#839](https://github.com/OpenThrottle/monorepo/pull/839))
- **openthrottle-server:** guaranteed embeddings with a local model, queue and reconciler ([#834](https://github.com/OpenThrottle/monorepo/pull/834))

### 🩹 Fixes

- **monorepo:** let release PRs through the merge-queue attribution guard ([#874](https://github.com/OpenThrottle/monorepo/pull/874))
- **monorepo:** push local baseline release tags that origin is missing ([#857](https://github.com/OpenThrottle/monorepo/pull/857))
- **openthrottle-server:** keep search responsive while embeddings backfill ([#854](https://github.com/OpenThrottle/monorepo/pull/854))
- **ci:** prune stale CodeQL caches and make node-setup saves opt-in ([#826](https://github.com/OpenThrottle/monorepo/pull/826))
- **ci:** stop Docker and plugin workflows saving duplicate Nx caches ([#824](https://github.com/OpenThrottle/monorepo/pull/824))

### 📖 Documentation

- **monorepo:** add the qa persona and index the agent personas ([#841](https://github.com/OpenThrottle/monorepo/pull/841))

### 🏡 Chore

- **monorepo:** stop committing the test-coverage baseline ([#814](https://github.com/OpenThrottle/monorepo/pull/814))
- **monorepo:** uninstall the vendored improve skill ([#822](https://github.com/OpenThrottle/monorepo/pull/822))
- **monorepo:** run subtree sync via TypeScript, pad CMS table, refresh vendored skills ([#821](https://github.com/OpenThrottle/monorepo/pull/821))

### ❤️ Thank You

- Matthew Scholta @visormatt
- Name
