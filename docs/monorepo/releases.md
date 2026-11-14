# Releases

The production applications and the monorepo as a whole carry real semantic versions. They come
from the conventional-commit titles of the PRs that land on `main`, so nobody bumps a version or
writes a changelog by hand. Plan: OT `36d1ca31`.

## What gets a version

The `applications` release group in [`nx.json`](../../nx.json) holds the projects that are
released:

| Project                                                                   | Version means                        | Tag                         |
| ------------------------------------------------------------------------- | ------------------------------------ | --------------------------- |
| `monorepo` (the root `package.json`)                                      | the product: OpenThrottle as a whole | `monorepo@4.6.0`            |
| `openthrottle-server`                                                     | the GraphQL API                      | `openthrottle-server@1.4.0` |
| `openthrottle-developer`, `-admin`, `-cms`, `-website`, `-app` (Electron) | that application                     | `<project>@<version>`       |

The selector is `monorepo` plus `tag:type:application` minus `tag:production:false`, so a new
production application joins automatically and the workbench never does. Packages are not
released: every package is `publish:false`. When one becomes publishable, give it its own
`packages` group. Nx refuses a group that matches no project, so don't add an empty one in advance.

Each application shows its version at runtime. The React Router apps show it in the sidebar or
site footer (`__APP_VERSION__`, injected from `package.json` by `@tools/dotfiles/app-version`).
The server reports it on `GET /health` and in the `serverInfo { version }` query. The Electron app
reports it through `app.getVersion()` and the About menu.

## How a version is chosen

Nx release reads the squash commits since each project's last tag, using the
**project graph**, the same affected logic as `nx affected`. A commit that changes only
`packages/nestjs-auth` still bumps `openthrottle-server`, because the server depends on it. The
root `monorepo` project is affected by every application, so the product version moves whenever
any application does.

| PR title                                                    | Bump  |
| ----------------------------------------------------------- | ----- |
| `feat(…)!: …` or a `BREAKING CHANGE:` footer                | major |
| `feat(…): …`                                                | minor |
| `fix`, `perf`, `revert`                                     | patch |
| `chore`, `docs`, `style`, `test`, `ci`, `build`, `refactor` | none  |

The scope does not matter (`useCommitScope: false`). A commit bumps every project it affects by its
type's full amount, so `feat(monorepo): …` that touches the server is a server minor bump. A
`schema.gql` change affects every GraphQL client app, so most API features bump several apps at
once.

**The PR title is the whole input.** `main` squash-merges with the PR title as the commit subject,
so a release is only as accurate as the titles that went into it. Put `!` in the title for a
breaking change. Don't rely on a footer in the PR body.

### Breaking API changes need `!`

CI's `gates` job runs [`scripts/check-graphql-breaking-changes.ts`](../../scripts/check-graphql-breaking-changes.ts)
on every PR. It diffs `applications/openthrottle-server/schema.gql` against the base branch with
`@graphql-inspector/core` and fails on any breaking change (a removed field, a type made nullable,
a removed enum value) unless the PR title carries `!`. So a server major version always means a
breaking API change. Usually the fix is to deprecate rather than remove
(`@deprecated(reason: "…")`). If you add `!` to the title afterwards, push a commit or re-run the
job: a title edit alone does not re-run CI.

```bash
BASE_REF=origin/main PR_TITLE='feat(openthrottle-server): …' pnpm run check:graphql-breaking-changes
```

## The release flow

```text
PR merges to main ──▶ release.yml ── publish (no-op) ── prepare ──▶ release PR on release/next
                                                                      │  (rewritten on every push)
release PR merges ──▶ release.yml ── publish: tags + GitHub releases ─┘
                 └──▶ openthrottle-docker.yml ── builds every image ── release-tags: v<product>, x.y.z
```

1. **Every push to `main`** runs [`release.yml`](../../.github/workflows/release.yml). Its
   `prepare` step (`pnpm run release:applications prepare`) runs Nx version and changelog for the
   group. It writes the bumped `package.json` versions and each project's `CHANGELOG.md`, and puts
   a table of every version under the product's heading in the root `CHANGELOG.md`. The workflow
   commits this to the bot branch `release/next` and opens or updates **one** PR titled
   `chore(release): openthrottle <product version>`. If nothing is releasable, it closes that PR.
2. **Review and merge the release PR** like any other, through the merge queue. Its diff is the
   release: versions and changelogs. Don't edit `release/next` by hand, because the next push to
   `main` rebuilds it from scratch.
3. **When it lands**, the next `release.yml` run's `publish` step tags every project whose version
   changed (`<project>@<version>`) and creates its GitHub release from that version's changelog
   section. The product release is titled `OpenThrottle <version>` and marked latest. Publishing
   scans the last 30 commits on `main` and skips anything already tagged. That's because GitHub
   cancels a pending run when a newer push queues behind it, so the release commit's own run is not
   guaranteed.
4. **Images.** The same merge makes [`openthrottle-docker.yml`](../../.github/workflows/openthrottle-docker.yml)
   build every image for the release commit. Its `release-tags` job then adds `v<product version>`
   to each image, plus `x.y.z`, `x.y` and `x` to the server and developer images. These are
   registry-side retags, not rebuilds.

To skip a release, leave the release PR open. It accumulates until you merge it. To cut one now,
merge it.

## Deploying and rolling back by version

Hetzner deploys one tag across every image, so the product version is the deployable unit:

```bash
gh workflow run hetzner-deploy.yml -f image_tag=v4.6.0
```

Rolling back is the same command with the previous `v…`. Automatic deploys after a build still use
`sha-<commit>`.

If a merge lands while the Docker workflow is busy, it can supersede the release commit's run. The
release commit then never gets its images or `v…` tags. Re-run that cancelled run from the Actions
tab: it runs at the release commit, and `release-tags` tags it.

## Setup and one-time steps

- **A GitHub App token.** Events created with the default `GITHUB_TOKEN` start no workflows, so a
  release PR opened with it would never get CI and the merge queue would never accept it.
  `release.yml` mints a token from a GitHub App with **Contents: read and write** and
  **Pull requests: read and write** on this repository, installed only here. It reads two secrets:
  `RELEASE_APP_CLIENT_ID` (the App's Client ID) and `RELEASE_APP_PRIVATE_KEY` (a generated private
  key). Only `main` is protected, so the App needs no ruleset bypass.
- **Baseline tags, once.** Without a tag, Nx falls back to the version on disk and reads all of
  history. Tag the commit that introduced this setup:

  ```bash
  pnpm run release:applications baseline --ref=<landed sha>   # dry run: lists the tags
  pnpm run release:applications baseline --ref=<landed sha> --push
  ```

## Running it locally

`prepare` and `publish` both take `--dry-run`:

```bash
pnpm run release:applications prepare --dry-run   # the versions and changelogs the next release PR would carry
pnpm run release:applications publish --dry-run   # what the last release commit would tag
```

A non-dry `prepare` rewrites `package.json` and `CHANGELOG.md` files in your checkout, so only run
it on a branch you can discard. Plain `nx release` is refused on purpose: `nx.json` sets git
options per subcommand (all off), and Nx rejects the top-level command with that configuration.
Use the script, or `nx release version` / `nx release changelog` directly.

## Known gaps

- **Changelogs list only direct commits.** Nx's changelog includes a commit in a project's
  `CHANGELOG.md` only when it touches that project's own files. A package-only fix bumps the
  server, but it doesn't appear in the server's changelog. An app bumped only through dependencies
  gets a "version bump only" entry.
- **The Docker version tags depend on the release commit's own build** (see above).
- **Two version sources in the developer app.** The settings diagnostics page also shows the
  Docker build arg `APP_VERSION` (`sha-…` or `latest`), which predates this setup.
