# openthrottle-website — agent notes

Marketing and landing site (React Router v8, flat routes): home page, markdown docs, FAQ,
component demos, and a `sitemap.xml` resource route. Public and unauthenticated; the smallest
app in the family.

**Consumed by:** nothing — deployable app (Vercel; `vercel.json`, Vercel preset in
`react-router.config.ts` when `VERCEL=1`).

## Layout

- `app/routes/_index.tsx` + `app/routing/home/` — landing page.
- `app/routes/docs.$.tsx` + `app/docs-content/` — docs catch-all rendered via
  `@openthrottle/react-router-docs`.
- `app/routes/sitemap[.]xml.tsx` — resource route (mind the escaped-dot filename).
- `app/routing/demos/` — component demos behind the `demos.layout` route.
- `app/global/config/csp.ts` — this app's CSP options, consumed by `entry.server.tsx`.
- `app/services/graphql.server.ts` — the loader-only public GraphQL helper (`fetchPublicGraphql`).
- `app/routes/blog._index.tsx`, `blog.$blogSlug.tsx`, `blog.tags.$tagSlug.tsx` — public blog routes; each
  has a sibling `.tsx.graphql` query and loads through `app/routing/blog/utils/blog-loaders.server.ts`.
- `app/routing/blog/data/blog.graphql` — the shared `BlogPostSummary` fragment (operations live beside their route).
- `app/routes/blog.rss[.]xml.tsx` — RSS 2.0 resource route, served at `/blog/rss.xml` (static segment, so it wins
  over `blog.$blogSlug.tsx`). `app/routing/blog/data/blog-feeds.graphql` holds the feed + sitemap operations,
  `app/routing/blog/utils/blog-feeds.server.ts` runs them, `blog-rss.ts` renders the XML (`escapeXml`).
- `app/global/utils/blog-enabled.ts` — the blog switch (`isBlogEnabled`, `assertBlogEnabled`).

## Invariants & gotchas

- **One blog switch: `FEATURE_BLOG_ENABLED`** (public env tier in `@openthrottle/react-router-utils`, string
  `true`/`1`/`yes`; default **off** in `.env.default` and in code). It is read through `isBlogEnabled()` /
  `assertBlogEnabled()` in `app/global/utils/blog-enabled.ts` and gates **every** blog surface:
  the Blog link in `LandingNav` and `GlobalFooter`, the `/blog` + post + tag entries in `sitemap.xml`, **and the
  routes themselves** — the three blog loaders and `/blog/rss.xml` throw a 404 _before any API call_. That is
  deliberate: while the API is not publicly reachable, a stray `/blog` hit 404s instead of 500ing, and the blog
  ships fully dark (no links, no sitemap entries, no pages). Do not add a second switch; gate new blog surfaces
  with the same helper. Turn it on locally by setting `FEATURE_BLOG_ENABLED="true"` in the gitignored `.env`
  (worktree provisioning copies `.env.default`, so it starts off) and restarting the dev server. In production
  set it in the host's env (Vercel project) once the API is public; the serving process reads it at start.
- **Sitemap failure policy:** with the switch on, the sitemap walks `blogPosts` by cursor (200 per page, the API's
  max) and `blogTags`. If that fails it logs, serves the static paths plus `/blog` and shortens the cache to 60s
  rather than 500ing. The RSS route does not degrade (an API failure reaches the error boundary).
- **`executeGraphql` revives `DateTime` fields into `Date` objects** (the generated type is `any`); format them
  through `blog-format.ts` (`toBlogIsoDate`) rather than assuming strings.

- **GraphQL is public-only and server-side-only.** `codegen-graphql` is a real target again
  (the `____codegen-graphql____` placeholders are gone). Documents live as `*.graphql` files
  (shared ones under `app/routing/<area>/data/`, e.g. `app/routing/blog/data/blog.graphql`;
  route-sibling `*.tsx.graphql` also works) and generate typed documents into
  `app/__generated__/`, which is **committed** (the app `.gitignore` un-ignores it, same as
  `openthrottle-developer`). After editing a document or `applications/openthrottle-server/schema.gql`
  run `pnpm nx run openthrottle-website:codegen-graphql` and commit the output. Rules:
  - **Public queries only.** The website is unauthenticated: only operations the server marks
    `@Public()` (today the blog queries `blogPost`, `blogPosts`, `blogTags`). Never forward a
    cookie or `Authorization` header; never use `executeGraphqlWithAuth` here.
  - **Server-side loaders only.** Fetch through `fetchPublicGraphql` in
    `app/services/graphql.server.ts` (a thin wrapper over `executeGraphql` from
    `@openthrottle/react-router-graphql`, reading `API_URL_INTERNAL`, with a bounded timeout),
    called from a route `loader`. The `.server.ts` suffix keeps it out of the browser bundle.
  - **No client-side GraphQL fetches** — no `fetch`/Apollo/`graphql-ws` in components, hooks or
    `clientLoader`s, and no `useSubscription`. This is what lets the CSP stay self-only
    (`connect-src 'self'`); do not add the API origin to `additionalConnectSrc`. Data reaches
    the browser only as serialized loader data.
  - `@openthrottle/react-router-markdown` is a dependency for rendering blog bodies
    (`bodyMarkdown`); it renders trusted CommonMark as literal text, no raw HTML.
    Only `codegen-react-router` and `codegen-graphql` run as codegen.
- CSP (PR #143): same nonce wiring as the other apps (`entry.server.tsx` +
  `buildCsp`/`NonceContext`), but the website policy is self-only + nonces with no
  third-party origins. In production `API_URL_EXTERNAL` is absent until openthrottle-server
  ships publicly, so the builder degrades to `connect-src 'self'` with no report directives —
  preview/local is the observation surface (see the comment in `app/global/config/csp.ts`).
- Env plumbing: `vite.config.ts` loads all `.env` keys into `process.env`; there is no
  `VITE_*` surface. Keep `.env.default` aligned with `getEnvironment` in
  `@openthrottle/react-router-utils`. `OFFLINE_MODE=true` serves a placeholder from
  `entry.server.tsx`.
- `test-e2e` exists (workspace default, cwd `tests/e2e/`) but this app has no `tests/e2e/`
  directory yet — there are no flows to run.

## Pointers

- [README.md](./README.md) — env variable details and Vercel deployment notes.
