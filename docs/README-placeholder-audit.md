# README placeholder audit

**Plan-Id:** 9f50e133-2090-4c89-921e-8ea830076c89
**Task-Id:** cdf58511-1e2b-4758-a952-5ac17d669ab7
**Date:** 2025-03-11

Audit of README.md files in the monorepo for placeholders: **Lorem ipsum**, **tbd...**, **FIXME**, and **very short** (minimal or empty) content.

---

## Summary

| Flag           | Count | Description                                                                     |
| -------------- | ----- | ------------------------------------------------------------------------------- |
| **Lorem**      | 12    | Contains Lorem ipsum placeholder text                                           |
| **tbd...**     | 2     | Contains "tbd..." in sections (Installation, Development, Suggestions, or Todo) |
| **FIXME**      | 1     | Generator template with FIXME instruction                                       |
| **Very short** | 0     | No additional READMEs flagged as “very short” beyond placeholder content above  |

---

## 1. Lorem ipsum (replace with real content)

| Path                                                                 | Notes                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `applications/openthrottle-server/README.md`                         | Full intro paragraph is Lorem; rest is LangGraph Studio commands. **Priority:** high (plan target). |
| `applications/openthrottle-admin/README.md`                          | Lorem paragraph.                                                                                    |
| `applications/openthrottle-cms/README.md`                            | Lorem paragraph.                                                                                    |
| `packages/openthrottle/nodejs-graphql/README.md`                     | Lorem paragraph.                                                                                    |
| `packages/openthrottle/react-router-utils/README.md`                 | Lorem paragraph.                                                                                    |
| `packages/openthrottle/react-router-auth/README.md`                  | Lorem paragraph.                                                                                    |
| `packages/openthrottle/react-router-chat/README.md`                  | Lorem paragraph.                                                                                    |
| `tools/generators/src/generators/package/files/react/README.md`      | Package generator template.                                                                         |
| `tools/generators/src/generators/package/files/node/README.md`       | Package generator template.                                                                         |
| `tools/generators/src/generators/package/files/nestjs/README.md`     | Package generator template.                                                                         |
| `tools/generators/src/generators/nestjs/files/application/README.md` | NestJS app generator template.                                                                      |
| `tools/generators/src/generators/remix/files/application/README.md`  | Remix app generator template.                                                                       |

---

## 2. tbd... (fill sections)

| Path                                  | Location                               | Notes                                                                                                              |
| ------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `applications/openthrottle/README.md` | Installation, Development, Suggestions | Three sections end with "tbd...". **Priority:** high (plan target).                                                |
| `applications/rocketcms/README.md`    | Todo list, one bullet                  | Single "tbd..." under "Deployments... how can I get around the file system". **Priority:** optional (plan target). |

---

## 3. FIXME (generator template)

| Path                                                                   | Notes                                                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `tools/generators/src/generators/react-native/files/package/README.md` | Line 3: `FIXME: Add a description for <%= name %>.` **Priority:** high (plan target). Replace with scaffold/instructions. |

---

## 4. Very short READMEs

READMEs with ≤7 lines that are **not** already flagged above were spot-checked:

- `tools/web-scraper/src/utils/README.md` (4 lines): Contains real content (Scraping options + link). **Not a placeholder.**
- `applications/barguide-app/README.md` (3 lines): Real app description. **Not a placeholder.**

No additional “very short” placeholder READMEs were found in the audited set. (Excluded: `.venv`, `.nx`, `node_modules`, and other generated/cache paths.)

---

## 5. Plan task mapping

| Task                                         | Target                                                                 | Audit finding                                      |
| -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| Replace openthrottle-server README           | `applications/openthrottle-server/README.md`                           | Lorem ipsum; add NestJS/GraphQL, Cortex, env, run. |
| Fill openthrottle app README                 | `applications/openthrottle/README.md`                                  | tbd... in Installation, Development, Suggestions.  |
| Improve React Native package README template | `tools/generators/src/generators/react-native/files/package/README.md` | FIXME; remove FIXME, add scaffold.                 |
| Optional: rocketcms README                   | `applications/rocketcms/README.md`                                     | One tbd... in Todo list.                           |

---

## 6. Full list of README.md files (no placeholder)

READMEs under `applications/`, `packages/`, `tools/`, `databases/`, `infra/`, `docs/`, `.cursor/` that were **not** flagged as containing Lorem, tbd..., or FIXME are assumed to have real or acceptable content. Full enumeration available via:

```bash
find . -name "README.md" -not -path "*/.git/*" -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.nx/*"
```

This audit did not change any files; it only lists and flags placeholders for follow-up tasks.
