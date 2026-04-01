# Case studies content model (openthrottle-website)

Content structure for the `/case-studies` section: list view, detail view, and source.

Use **"case studies"** terminology throughout (not blog, showcase, or customer stories).

---

## List shape (index `/case-studies`)

Each item in the case-studies list needs:

| Field         | Type              | Purpose                                                                            |
| ------------- | ----------------- | ---------------------------------------------------------------------------------- |
| `id`          | string            | Stable unique id (e.g. UUID or kebab).                                             |
| `slug`        | string            | URL segment for detail route (`/case-studies/:slug`). Must be URL-safe and unique. |
| `title`       | string            | Display title of the case study.                                                   |
| `excerpt`     | string            | Short summary for cards and meta description.                                      |
| `company`     | string            | Company or product name.                                                           |
| `logoUrl`     | string?           | Optional logo asset URL.                                                           |
| `publishedAt` | string (ISO date) | Optional; for ordering and "Published" display.                                    |
| `tags`        | string[]          | Optional; for filtering or badges.                                                 |

List data is an array of these list items. Order is defined by the source (e.g. by `publishedAt` desc, or explicit order field).

---

## Detail shape (detail `/case-studies/:slug`)

The detail page extends the list shape with body and optional structured content:

| Field           | Type         | Purpose                                     |
| --------------- | ------------ | ------------------------------------------- |
| All list fields | —            | Same as list shape.                         |
| `body`          | string       | Main content (HTML or Markdown/MDX string). |
| `metrics`       | Metric[]     | Optional key results (label + value).       |
| `testimonial`   | Testimonial? | Optional quote and attribution.             |
| `ctaLabel`      | string?      | Optional CTA button label.                  |
| `ctaUrl`        | string?      | Optional CTA link.                          |

**Metric**: `{ label: string; value: string }` (e.g. "Faster builds", "40%").
**Testimonial**: `{ quote: string; author: string; role?: string; company?: string }`.

---

## Source

- **Recommended (initial): static data**
  TypeScript/JSON in the app (e.g. `app/routing/case-studies/data/`) — same pattern as pricing (`routing/pricing/data/mock.pricing.ts`). Easy to version and type-check; no build-time content pipeline.

- **Optional later: MDX**
  One MDX file per case study with frontmatter mapping to the list/detail shapes. Requires an MDX loader and a way to enumerate files for the list.

- **Optional later: CMS**
  External CMS (e.g. Contentful, Sanity) with content types matching the list/detail shapes; fetch in loaders.

Types live in `app/routing/case-studies/types.ts` so routes and components can import them regardless of source.
