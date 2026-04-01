# Multi-Repo Open Source Strategy and Parent Workspace

This document outlines how to split this monorepo into multiple open-source monorepos (barguide, rocketcms, mattscholta) while keeping this repo as a **parent workspace** for unified cloning, search, and optional local linking.

## Goals

- **barguide** → [github.com/barguide](https://github.com/barguide): BarGuide apps + packages in a dedicated Nx monorepo.
- **rocketcms** → [github.com/rocketscms](https://github.com/rocketscms): RocketCMS app + packages in a dedicated Nx monorepo.
- **mattscholta** → [github.com/mattscholta](https://github.com/mattscholta): Professional/shared apps + packages in a dedicated Nx monorepo.
- **This repo**: Becomes the **parent** that can clone and open all of the above in one place (and keeps private apps: cortex, intouch, family sites, etc.).

Each child monorepo stays in close sync (Nx, NestJS, React Router, Expo, pnpm, shared tooling). This repo does **not** run a single Nx graph over the children; each repo is its own Nx root.

---

## What Is and Isn’t Possible

| Goal                                                                | Possible? | How                                                                                                                      |
| ------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| One clone that gives you all repos                                  | Yes       | Git submodules in this repo pointing to the three child repos (e.g. under `repositories/`).                              |
| Full-text search across all codebases in Cursor/VS Code             | Yes       | After `git submodule update --init --recursive`, all code lives on disk; search works across folders.                    |
| Single Nx dependency graph across parent + children                 | No        | Nx assumes one workspace root per repo. Each monorepo has its own `nx.json` and graph.                                   |
| Cross-repo “linking” (use a package from barguide inside this repo) | Partially | Via **published** packages (npm) or **pnpm link** / path overrides for local dev. Not `workspace:*` across repos.        |
| Keep tooling in sync (ESLint, TS, Prettier, Nx config)              | Yes       | Shared config package(s) published from one repo (e.g. mattscholta) or a small “meta” repo; all four repos depend on it. |

So: **yes, a parent repo is possible**, and it gives you one place to clone and search. What you give up is a single Nx graph and native `workspace:*` dependencies across repos.

---

## Recommended Layout

### Parent repo (this monorepo)

- **Stays as-is for its own code**: private apps (cortex, cortex-api, intouch, intouch-api, carlsbad-pipelines, charlizescholta, jaxscholta, kellischolta, iron-sights, nestjs-rest-api, etc.), shared `tools/`, `docs/`, `databases/`, `infra/`, and any packages that remain private.
- **Adds git submodules** for the open-source monorepos, e.g.:
  - `repositories/barguide` → `https://github.com/barguide/barguide` (or the actual repo URL)
  - `repositories/rocketcms` → `https://github.com/rocketscms/rocketcms`
  - `repositories/mattscholta` → `https://github.com/mattscholta/mattscholta`
- **Do not ignore** `repositories/` in `.gitignore` so that submodule **pointers** (commit SHAs) are committed. The **contents** of the child repos are not in the parent’s tree; they are filled in when you run `git submodule update --init --recursive`.

Result: clone the parent → init submodules → you have one root with private code plus three child folders. Cursor/VS Code can open the root and search across everything.

### Child repos (barguide, rocketcms, mattscholta)

- Each is a **standalone Nx + pnpm monorepo** with its own:
  - `nx.json`, `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`
  - `applications/` and `packages/` (only the apps/packages that belong to that product or org)
- They do **not** live inside the parent’s pnpm workspace. The parent’s `pnpm-workspace.yaml` does not list `repositories/*`.

---

## Step-by-Step: Getting There

### Phase 1: Create the child monorepos (without submodules yet)

1. **Create three new repositories** on GitHub (barguide, rocketscms, mattscholta). You can use a single “monorepo” repo per org (e.g. `barguide/barguide`, `rocketscms/rocketcms`, `mattscholta/mattscholta`) or name them clearly (e.g. `barguide/monorepo`).
2. **Extract and copy** into each repo:
   - **barguide**: `applications/barguide`, `applications/barguide-api`, `applications/barguide-app`, `packages/barguide/*`, plus root config (nx, pnpm, tsconfig, eslint, etc.). Optionally leave `barguide-llm` out or in a separate repo.
   - **rocketcms**: `applications/rocketcms`, `packages/rocketcms/*`, plus root config.
   - **mattscholta**: `applications/mattscholta`, `packages/mattscholta/*`, `packages/visormatt/*`, plus root config.
3. In each new repo, add a minimal root `package.json`, `pnpm-workspace.yaml`, `nx.json`, and `tsconfig.base.json` so it’s a valid Nx monorepo. Trim workspace globs so they only include that repo’s `applications/` and `packages/`.
4. **Shared config**: To keep tech and deps in sync, either:
   - Publish a shared config package (e.g. `@openthrottle/eslint-config`, `@openthrottle/tsconfig`) from the mattscholta monorepo and have all four repos depend on it, or
   - Copy a small set of config files into each repo and maintain them (e.g. via a script or doc that lists “sync these files from template”).

### Phase 2: Make this repo the parent

1. **Stop ignoring `repositories/`** in `.gitignore`: remove `repositories/*` (or adjust so only the submodule **dirs** are not ignored; the contents are managed by git submodules).
2. **Add submodules** (from repo root):
   ```bash
   git submodule add https://github.com/barguide/<repo-name> repositories/barguide
   git submodule add https://github.com/rocketscms/<repo-name> repositories/rocketcms
   git submodule add https://github.com/mattscholta/<repo-name> repositories/mattscholta
   ```
3. **Commit** the `.gitmodules` and the new `repositories/<name>` entries (the committed SHA for each submodule).
4. **Document** in this repo’s README or `docs/`:
   - Clone with submodules: `git clone --recurse-submodules <parent-repo-url>` or after clone: `git submodule update --init --recursive`.
   - That after init, full-text search in Cursor/VS Code will include `repositories/barguide`, `repositories/rocketcms`, `repositories/mattscholta`.

### Phase 3: Remove or redirect in-parent code (optional)

- **Option A (clean split)**: Remove from this repo the apps and packages that now live in the child repos. This repo then only has private apps + shared tools + submodules. No duplicate source of truth.
- **Option B (keep copies during transition)**: Keep the current folders (e.g. `applications/barguide`, `packages/barguide`) until you’re comfortable, then delete them and rely on submodules. You can use `.gitignore` or a branch to hide the duplicates during the transition.

---

## Linking Between Parent and Children (Local Dev)

- **Publish and depend**: Publish packages from barguide/rocketcms/mattscholta to npm (public or private) and add them as normal dependencies in this repo. Best for stable, versioned integration.
- **Local linking**: From a child repo (e.g. `repositories/barguide`), run `pnpm link --global` (or equivalent) for a package, then in this repo run `pnpm link <package-name>`. Or use pnpm overrides / `file:` in the parent’s `package.json` pointing at `repositories/barguide/packages/...` for a quick local loop. Prefer linking only when you’re actively developing across both; otherwise use published versions to avoid “works on my machine” drift.

---

## Why Not Put Children in `services/` and Ignore Them?

You already have `services/*` (and previously `repositories/*`) in `.gitignore`. If you put the three monorepos in `services/` and ignore them:

- **Search**: Cursor/VS Code won’t index ignored paths by default, so cross-repo search would not include them.
- **Linking**: Same as above—you can still use `pnpm link` or `file:` to point at `services/barguide`, but the parent repo doesn’t “track” those dirs in git.
- **Cloning**: New clones of the parent wouldn’t get the child repos at all unless you document a separate clone step and don’t ignore the dirs.

So: **use submodules under `repositories/` and do not ignore those submodule entries**. Then one clone + submodule init gives you all code and search. Keeping children in `services/` and ignoring them is possible only if you’re okay with no search and no tracking of which commit of each child you’re using.

---

## Summary

- **Yes**, you can have this monorepo act as a top-level parent to barguide, rocketcms, and mattscholta by adding them as **git submodules** under `repositories/` and **not** ignoring `repositories/` in git.
- **Search and “one place to open”** work after `git submodule update --init --recursive`.
- **Nx** stays per-repo; there is no single Nx graph across parent and children.
- **Cross-repo linking** is via published packages or pnpm link / path overrides, not workspace protocol across repos.
- Keeping **tech and deps in sync** is done with a shared config package or a small set of synced config files across the four Nx monorepos.

If you want, the next step can be a short **checklist** (e.g. in `docs/monorepo/`) or a **script** that creates the initial structure for one of the child repos (e.g. barguide) from the current tree.
