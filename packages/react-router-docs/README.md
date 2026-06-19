# @openthrottle/react-router-docs

Source-first docs/FAQ rendering layer for OpenThrottle React Router apps. Drop
Markdown files into a conventional folder and get `/docs` and `/faq` routes with
consistent nav and styling — no bespoke page code per app.

- **Convention:** [docs/openthrottle/docs-faq-convention.md](../../docs/openthrottle/docs-faq-convention.md)
- **Decision record:** [docs/openthrottle/docs-faq-delivery-adr.md](../../docs/openthrottle/docs-faq-delivery-adr.md)
- Source-first: no `build` target; consuming apps' Vite transpiles `src/`. Rendering is delegated to `@openthrottle/react-router-markdown` (SSR-capable).

## The app owns the glob

`import.meta.glob` resolves **relative to the file that calls it**, so a glob
inside this package could only see the package — not your app's content. The
**app** runs the glob and passes the module map in; the package never globs.

## Adding docs/FAQ to a new app

**1. Depend on the package** (`package.json`):

```jsonc
"dependencies": { "@openthrottle/react-router-docs": "workspace:^" }
```

Then `pnpm install` and `pnpm nx sync` (if Nx reports stale project references
after a sync, purge `.nx/workspace-data` and `.nx/cache`, then sync again).

**2. Add content** under `app/docs-content/` (see the convention for frontmatter):

```
app/docs-content/
  docs/
    index.md            # -> /docs
    getting-started.md  # -> /docs/getting-started
  faq/
    billing.md          # a question/answer, shown on /faq
```

**3. Build the manifest** (this is where the app owns the glob) —
`app/routing/docs/data/docsManifest.ts`:

```ts
import { buildDocsManifest } from '@openthrottle/react-router-docs';
import type { DocEntry } from '@openthrottle/react-router-docs';

const modules = import.meta.glob<string>('../../../docs-content/**/*.md', {
  eager: true,
  import: 'default',
  query: '?raw',
});

export const docsManifest: readonly DocEntry[] = buildDocsManifest({ modules });
```

**4. Mount routes** (flat-routes; wrap the shared components in your app's chrome):

```tsx
// app/routes/faq._index.tsx
import { FaqView } from '@openthrottle/react-router-docs';
import { docsManifest } from '~/routing/docs/data/docsManifest';

const faqEntries = docsManifest.filter((e) => e.section === 'faq');

export default function Component() {
  return <FaqView entries={faqEntries} />;
}
```

```tsx
// app/routes/docs.tsx (layout)
import { Outlet } from 'react-router';
import { DocsNav, buildDocsNav } from '@openthrottle/react-router-docs';
import { docsManifest } from '~/routing/docs/data/docsManifest';

const docsNav = buildDocsNav(docsManifest, 'docs');

export default function Component() {
  return (
    <div className="flex gap-8">
      <aside className="w-56 shrink-0">
        <DocsNav groups={docsNav} />
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
```

```tsx
// app/routes/docs._index.tsx  -> renders the /docs page
// app/routes/docs.$.tsx       -> looks up `/docs/${params['*']}` and renders it
import { DocPageView } from '@openthrottle/react-router-docs';
import { docsManifest } from '~/routing/docs/data/docsManifest';

const entry = docsManifest.find((e) => e.path === '/docs');
export default function Component() {
  return entry ? <DocPageView entry={entry} /> : null;
}
```

See `openthrottle-developer` for a complete reference wiring (layout + index +
splat + tests). For the **public website**, also emit a `description` meta tag
from `entry.description` for SEO — the renderer is SSR-capable, so content is in
the server HTML.

## Public API

| Export                                                                         | Kind      | Purpose                                                                 |
| ------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------- |
| `buildDocsManifest`                                                            | function  | Parse the app's glob module map into a normalized `DocEntry[]`.         |
| `buildDocsNav`                                                                 | function  | Group a manifest section into ordered `DocsNavGroup[]` for the sidebar. |
| `DocsNav`                                                                      | component | Sidebar nav (react-router `NavLink` groups).                            |
| `DocPageView`                                                                  | component | Render a single docs page's Markdown body (SSR-capable).                |
| `FaqView`                                                                      | component | Render FAQ entries as grouped accordions, deep-linkable via `#<slug>`.  |
| `DocEntry`, `DocsSection`, `DocsContentModules`, `DocsNavItem`, `DocsNavGroup` | types     | The manifest/nav data shapes.                                           |

`buildDocsManifest({ modules, includeDrafts? })` throws on a content file missing
a `title` — a real misconfiguration, surfaced at build time rather than silently
dropped.

## Authoring

Content is Markdown (CommonMark + GFM), **not MDX** — see the
[convention](../../docs/openthrottle/docs-faq-convention.md) for the frontmatter
schema (`title`, `description`, `slug`, `group`, `order`, `draft`), route
mapping, and nav ordering rules.
