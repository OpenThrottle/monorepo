# Docs/FAQ content convention

Companion to the [docs/FAQ delivery ADR](./docs-faq-delivery-adr.md). Defines the per-app content convention that `@openthrottle/react-router-docs` consumes. OpenThrottle plan `f0f27c66-8dba-4e75-928b-c219f7a7ff5c` (tasks 4–5).

## 1. Content folder location

Each consuming app keeps docs/FAQ content under:

```
app/docs-content/
  docs/      # general documentation — prose pages, one route per file
  faq/       # FAQ entries — question/answer, rendered as an accordion
```

- Lives under `app/` so the **app's own Vite** resolves the `import.meta.glob` (the app owns the glob; see ADR §Architecture). The path is a convention, not enforced by the package — the app passes its glob result in, so an app may relocate it, but `app/docs-content/` is the documented default.
- `docs/` and `faq/` are the two recognized top-level sections. Subfolders within `docs/` are allowed and become nav groups (see §4).

## 2. File format

- **Markdown (`.md`)**, CommonMark + GitHub-Flavored Markdown. Compiled by `@openthrottle/react-router-markdown` with `format: 'md'`.
- **Not MDX.** `format: 'md'` treats `{…}` and `<…>` as literal text, so authors cannot embed JSX/expressions. This is deliberate: content is author-safe (no arbitrary code in the render path) and any contributor can write it. If a future page needs interactive components, that is a separate decision — not v1.
- One file = one docs page or one FAQ entry.

## 3. Frontmatter schema

YAML frontmatter delimited by `---`, parsed with the pure-JS **`yaml`** parser (added to the workspace catalog). The body after the frontmatter is the Markdown content. (`gray-matter` was avoided: it relies on Node's `Buffer` and throws in the browser, where the manifest is also built.)

| Field         | Type    | Required | Default                                | Purpose                                                                  |
| ------------- | ------- | -------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `title`       | string  | **yes**  | —                                      | Page title (docs) / question (faq). Used in nav, `<title>`, breadcrumb.  |
| `description` | string  | no       | —                                      | Meta description; emitted as `<meta name="description">` (website SEO).  |
| `slug`        | string  | no       | derived from file path (see §4)        | Override the path-derived route slug.                                    |
| `group`       | string  | no       | immediate subfolder name, else section | Sidebar group (docs) / category (faq).                                   |
| `order`       | number  | no       | `Number.MAX_SAFE_INTEGER` (then title) | Sort order **within its group** (per-group, not global — spike finding). |
| `draft`       | boolean | no       | `false`                                | When true, excluded from production builds; visible in dev only.         |

Unknown frontmatter keys are ignored (forward-compatible). The package validates `title` presence and `order` numeric type; malformed frontmatter fails loudly at manifest-build time (a real misconfiguration, surfaced early — not silently dropped).

## 4. Route mapping

Route path = the file path **relative to `docs-content/`**, minus the `.md` extension, unless `slug` overrides it.

| Content file                           | Route                   | Notes                                                                                               |
| -------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------- |
| `docs-content/docs/index.md`           | `/docs`                 | `index.md` maps to the section root.                                                                |
| `docs-content/docs/getting-started.md` | `/docs/getting-started` |                                                                                                     |
| `docs-content/docs/guides/deploy.md`   | `/docs/guides/deploy`   | nested folders nest in the path.                                                                    |
| `docs-content/faq/*.md`                | `/faq`                  | All FAQ entries render on one `/faq` page (accordion); each entry is anchor-linkable via `#<slug>`. |

- The base mount path (`/docs`, `/faq`) is where the app mounts the package's route module; the package maps the remaining path from the content tree.
- `slug` frontmatter, when present, replaces the path-derived slug for that page (the leading section segment is preserved).

## 5. Nav derivation

- **Grouping:** docs pages are grouped by `group` (default = immediate subfolder under `docs/`, or "General" for files directly in `docs/`).
- **Within a group:** sort by `order` ascending, then `title` ascending. Ordering is **per-group** — two pages in different groups may share an `order` value without ambiguity.
- **Group ordering (v1):** groups are listed alphabetically by group label. Explicit cross-group ordering is intentionally deferred; if needed later, add an optional `groupOrder` (e.g. a `_section.yml` per folder) without breaking existing content.
- **Breadcrumbs:** derived from the section + group + title, plugged into the existing `GlobalLayoutBreadcrumbsHandle` convention from `@openthrottle/react-router-ui-global`.

## 6. Docs vs FAQ content shapes

| Aspect  | Docs (`docs/`)                     | FAQ (`faq/`)                                                  |
| ------- | ---------------------------------- | ------------------------------------------------------------- |
| Unit    | One prose page per file            | One question/answer per file                                  |
| `title` | Page heading                       | The question (accordion trigger)                              |
| Body    | Full Markdown page                 | The answer (accordion content)                                |
| Routing | One route per page (`/docs/...`)   | One `/faq` page; entries grouped by `group`, anchor `#<slug>` |
| Layout  | Sidebar nav + breadcrumb + content | Grouped accordion list                                        |

## 7. Reference fixture (task 6)

The canonical example exercising this convention (grouped docs, a nested page, an index page, FAQ entries with categories) is authored as the package's test fixture during scaffolding (task 7) and reused as the adoption-guide example (task 11):

```
docs-content/
  docs/
    index.md                 # group: General, order: 1  -> /docs
    getting-started.md        # group: General, order: 2  -> /docs/getting-started
    guides/
      deploy.md               # group: Guides,  order: 1  -> /docs/guides/deploy
  faq/
    billing.md                # group: Billing, "How does billing work?"
    accounts.md               # group: Accounts, "How do I reset my password?"
```
