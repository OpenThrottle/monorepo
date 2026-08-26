# Marketing assets

Everything here is **authored as SVG and rasterised at build time**. Nothing
binary is checked in: PNGs go stale silently, SVGs diff in review, and the cards
carry per-video text that has to be substituted anyway.

| File                     | Size      | Where it is used                             |
| ------------------------ | --------- | -------------------------------------------- |
| `_mark.svg`              | 64×64     | The mark on its own; inlined into every card |
| `lower-third.svg`        | 1080×1920 | Shorts, in at 1.5s, holds 3s                 |
| `outro-card.svg`         | 1920×1080 | Every video, last 2s                         |
| `title-card.svg`         | 1920×1080 | **Long-form only**, first 2s                 |
| `thumbnail-template.svg` | 1280×720  | **Long-form only** thumbnail                 |
| `channel-avatar.svg`     | 800×800   | Channel avatar                               |
| `channel-banner.svg`     | 2560×1440 | Channel banner (1546×423 safe box)           |

The mark is a speedometer sweep, matching the Phosphor `Speedometer` icon that
`OpenThrottleLogo` (`packages/react-router-ui`) uses in the app. Colours come from
the app's dark theme via [`../format.json`](../format.json) — never hand-pick a
hex here.

## Text substitution

Cards with per-video text use literal ALL_CAPS placeholders so substitution is a
plain string replace with no template engine:

| Placeholder                    | In                       |
| ------------------------------ | ------------------------ |
| `TITLE_LINE_1`, `TITLE_LINE_2` | `lower-third.svg`        |
| `TITLE_TEXT`, `EPISODE_TEXT`   | `title-card.svg`         |
| `SCREENSHOT_HREF`              | `thumbnail-template.svg` |

Two title lines rather than one wrapped line is deliberate: SVG `<text>` does not
wrap, and letting the renderer decide the break produces a different card per
video. The script front-matter carries the break.

### Never convert a placeholder to outlines

A placeholder must stay a live `<text>` node. `lower-third.svg` was at one point
exported with its text converted to paths — with the placeholder words baked into the
outlines — so the string replace matched nothing and every video rendered a card
reading **`TITLE_LINE_1` / `TITLE_LINE_2`** over its own hook, three seconds in.

Nothing else catches this. `scan/leak-scan.ts` reads the DOM and is blind to text
baked into an image, which is why the publish checklist lists it as a human item.
`assemble/cards.ts` now throws when a substitution's placeholder is absent from the
SVG, so the same export mistake fails the build instead of shipping.

## Rasterising

**Primary path — Chromium, via the pipeline.** The assembly stage renders cards
by loading the substituted SVG in the same headless Chromium that records the
screencast and screenshotting it with a transparent background. No extra
dependency, and text renders with the same font stack and hinting as the footage
it sits on top of — which matters, because a card rasterised by a different
engine visibly disagrees with the app's type.

**Fallback — `rsvg-convert`**, for one-off manual exports (channel avatar and
banner, which are uploaded by hand and never touched by the pipeline):

```bash
brew install librsvg
rsvg-convert -w 800 -h 800 channel-avatar.svg -o /tmp/channel-avatar.png
rsvg-convert -w 2560 -h 1440 channel-banner.svg -o /tmp/channel-banner.png
```

Remove the dashed safe-box guide from `channel-banner.svg` before exporting for
upload — it is an authoring aid, not part of the design.

## Fonts

The cards name `Inter` and `JetBrains Mono` with system fallbacks. Headless
Chromium on a CI runner has neither, and will silently fall back to a metrically
different face — which changes where a two-line title breaks. Install both in any
image that renders cards, or accept the fallback consistently; do not mix.
