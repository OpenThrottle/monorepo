# Root README.md structure and navigation audit

**Plan-Id:** 9954a6e1-692a-4e97-a2a9-845b35fba60d  
**Task-Id:** 30e65635-77cd-41a9-bf23-e2606c8474a6  
**Date:** 2025-03-11

Audit of the monorepo root `README.md` for **structure**, **headings**, **section order**, and **clarity for new contributors**. Scope: docs/ and root README only.

---

## 1. Current structure (headings)

| Level | Section                    | Notes                     |
| ----- | -------------------------- | ------------------------- |
| H1    | 🐙 Monorepo                | Title + intro + badges    |
| H2    | 🏠 Architecture            | Tree + NX explanation     |
| H2    | ⚙️ Installation            | Setup script              |
| H2    | 🧑‍💻 Development             | Commands, SWC, Python     |
| H3    | Common Commands            | pnpm/nx examples          |
| H3    | TypeScript Execution (SWC) | SWC config                |
| H3    | Python Applications        | venv/pipenv               |
| H2    | 📱 Builds                  | EAS, manual, workflows    |
| H3    | Manual Builds              | nx run intouch:build      |
| H3    | EAS Workflows              | eas workflow:run          |
| H2    | 🌳 Reserved Worktrees      | Git worktrees             |
| H3    | Using Reserved Worktrees   | How-to                    |
| H2    | ☁️ GCP Auth                | gcloud + link to docs     |
| H2    | 🛟 Troubleshooting         | Reset, DB, Expo, versions |

---

## 2. Section order assessment

**Flow for new contributors:** Get context → Install → Develop → Build (optional) → Advanced (worktrees, GCP) → Troubleshoot.

- **Strengths:** Installation and Development come early; Troubleshooting at the end is standard.
- **Gaps (addressed):**
  - ~~No **Table of Contents**~~ — **Done:** README has a ToC with anchor links (after intro).
  - ~~**docs/** and **contributor docs** not linked~~ — **Done:** "See also" line links to `docs/`, CONTRIBUTING.md, MONOREPO.md.
  - ~~**Architecture** tree missing `infra/`, `services/`~~ — **Done:** Tree includes `infra` and `services`.

---

## 3. Clarity for new contributors

- **Intro:** Clear and concise; explains “why this monorepo” and TypeScript focus.
- **Architecture:** Tree uses `├──` / `└──` and includes all main root dirs (applications, databases, docs, infra, packages, scripts, services, tools, etc.).
- **Installation:** Single call-to-action (`./scripts/setup.sh`) with IMPORTANT note — good.
- **Development:** Mix of BarGuide, Supabase, Cortex, and intouch; no single “start here” path for a generic new contributor (e.g. “first time? run these in order”).
- **Builds:** EAS/intouch-focused; readers not using React Native may skip — acceptable if audience is known.
- **Reserved Worktrees:** Useful for multi-branch workflow; could add one-line “what’s this?” for newcomers.
- **GCP Auth:** Points to `./docs/infra/gcloud-two-profiles.md` — good.
- **Troubleshooting:** Numbered scenarios; no typo in current README (previously "tbe" → "the" was fixed).

---

## 4. Recommendations (status)

1. **Table of Contents** — **Done.** README has anchor links to each H2 after the intro.
2. **Architecture tree** — **Done.** Tree includes `infra` and `services`; matches repo layout.
3. **"See also" / docs links** — **Done.** Line links to `docs/`, CONTRIBUTING.md, MONOREPO.md.
4. **Typo "tbe"** — **Done.** Not present in current README (fixed previously).

---

## 5. Summary

| Item                                                                | Status                              |
| ------------------------------------------------------------------- | ----------------------------------- |
| Heading hierarchy (H1 → H2 → H3)                                    | Consistent                          |
| Section order (install → develop → build → advanced → troubleshoot) | Logical                             |
| Table of Contents                                                   | Present (anchor links)              |
| Architecture tree vs repo                                           | Complete (includes infra, services) |
| Links to docs/ and contributor docs                                 | Present ("See also" line)           |
| Typo "tbe"                                                          | Not present (fixed)                 |

This file records the audit for task _Review README structure and navigation_. Re-verified 2025-03-11; README already reflects the recommended structure and navigation.

---

## 6. Link audit (badges, internal, external)

**Plan-Id:** 9954a6e1-692a-4e97-a2a9-845b35fba60d  
**Task-Id:** ea7ceb2b-ac7e-49ee-b2d4-1b77d0aa6c79  
**Date:** 2025-03-11

### 6.1 Badges

| Badge                  | Image URL                                              | Target URL                                           | Result                                                                                       |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Continuous Integration | `.../continuous-integration.yml/badge.svg?branch=main` | `.../continuous-integration.yml?query=branch%3Amain` | Workflow exists in `.github/workflows/`. Target returns 404 when repo is private (expected). |
| NX Release             | `.../nx-release.yml/badge.svg?branch=main`             | `.../nx-release.yml?query=branch%3Amain`             | Workflow exists. Same as above for private repo.                                             |
| BarGuide               | shields.io                                             | https://barguide.io                                  | Site blocks crawlers (robots.txt); URL format valid.                                         |
| MattScholta            | shields.io                                             | https://mattscholta.com                              | Resolves (200).                                                                              |
| RocketCMS              | shields.io                                             | https://rocketcms.org                                | Site blocks crawlers; URL format valid.                                                      |
| Rollbar                | shields.io                                             | https://app.rollbar.com/...                          | Dashboard URL; format valid.                                                                 |

Shields.io badge image URLs resolve (e.g. BarGuide badge returns SVG). No changes required for badges.

### 6.2 Internal links

| Link            | Path                                | Result            |
| --------------- | ----------------------------------- | ----------------- |
| docs/           | ./docs/                             | Directory exists. |
| CONTRIBUTING.md | ./CONTRIBUTING.md                   | File exists.      |
| MONOREPO.md     | ./MONOREPO.md                       | File exists.      |
| doc here (GCP)  | ./docs/infra/gcloud-two-profiles.md | File exists.      |

**Gap:** The Architecture tree mentions "see tools/" but the "See also" line did not link to `tools/`. Added [tools/](./tools/) to README "See also" for consistency.

### 6.3 Table-of-contents anchors

README uses `#-architecture`, `#️-installation`, `#-development`, `#-builds`, `#-reserved-worktrees`, `#️-gcp-auth`, `#-troubleshooting`. GitHub slugifies emoji headings (e.g. "🏠 Architecture") to ids that match this pattern. No change.

### 6.4 External links

| Link       | URL                                                                     | Result                                 |
| ---------- | ----------------------------------------------------------------------- | -------------------------------------- |
| NX         | https://nx.dev/                                                         | Resolves (200).                        |
| SWC        | https://swc.rs/                                                         | Resolves (200).                        |
| EAS        | https://expo.dev/accounts/visormatt/projects/intouch/development-builds | Page exists (Expo; may require login). |
| Expo issue | https://github.com/expo/eas-cli/issues/1201#issuecomment-1446997753     | Issue and comment exist (200).         |

All external links validated. No broken links found.

**Task completed:** ea7ceb2b-ac7e-49ee-b2d4-1b77d0aa6c79. Re-verified 2025-03-12 (root README only). No README changes required; badges, internal paths, and external URLs confirmed.

---

## 7. Consistency, style, and typos

**Plan-Id:** 9954a6e1-692a-4e97-a2a9-845b35fba60d  
**Task-Id:** 7f86b86a-d9be-49db-9581-03ced5bdd3fc  
**Date:** 2025-03-12

### 7.1 Tone and voice

- README uses a mix of first-person plural ("we", "our") and second-person ("you") and direct address ("Let me know"). This is consistent and appropriate for a maintainer-authored README.
- No changes recommended for tone.

### 7.2 Fixes applied

| Item                     | Location                    | Change                                                                           |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------- |
| Tree character           | Architecture tree last line | `└────` → `└──` (standard box-drawing)                                           |
| Wrong package manager    | Troubleshooting §2 Database | "npm scripts" → "pnpm scripts" (commands use pnpm)                               |
| EAS Workflows code block | Builds § EAS Workflows      | Comment "CD" → "cd"; added `cd applications/intouch` so block shows full command |
| Example abbreviation     | Builds, Troubleshooting §4  | "ex:" → "e.g." (two occurrences)                                                 |

### 7.3 Typos

- Grep for common typos (tbe, teh, taht, waht, etc.) found none.
- No other spelling errors identified.

### 7.4 Summary

| Item           | Status                         |
| -------------- | ------------------------------ |
| Tone/voice     | Consistent (we/our/you)        |
| Tree character | Fixed                          |
| npm vs pnpm    | Fixed (pnpm scripts)           |
| EAS code block | Fixed (cd command + lowercase) |
| "ex:" → "e.g." | Standardized (2 places)        |
| Typos          | None found                     |

**Task completed:** 7f86b86a-d9be-49db-9581-03ced5bdd3fc. Edits applied to root README.md.

---

## 8. Gaps and proposed edits (Task 5)

**Plan-Id:** 9954a6e1-692a-4e97-a2a9-845b35fba60d  
**Task-Id:** bfac9bcc-f359-4696-ae98-a56a26414037  
**Date:** 2025-03-12

### 8.1 Findings from prior tasks

- **Structure (Task 1):** ToC, architecture tree, and "See also" links were already in place; no missing sections.
- **Commands/paths (Task 2):** Verified; all commands, paths, and env references (e.g. `.env.default`, `databases/cortex`) are current.
- **Links (Task 3):** Badges, internal links (docs/, CONTRIBUTING, MONOREPO, tools/, GCP doc), and external links (NX, SWC, EAS, Expo issue) validated.
- **Consistency/style (Task 4):** Tree character, pnpm wording, EAS code block, and "e.g." standardization applied.

### 8.2 Gaps identified

| Gap                                   | Recommendation                                                                                                                                          | Action                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **AGENTS.md not linked**              | Root AGENTS.md is the agent/automation entrypoint (Nx, generators, workflows, OpenThrottle). New contributors and agents benefit from a single pointer. | **Applied:** Added [AGENTS.md](../AGENTS.md) to README "See also" line.                                                                                                                                                  |
| **No single "first time" path**       | Development lists several options (BarGuide, Supabase, Cortex, intouch) without a canonical "first time? do this."                                      | **Proposed only:** Optional one-line (e.g. "First time? Run `./scripts/setup.sh`, then see Development.") in Installation or Development. Not applied to keep README minimal; consider if onboarding doc is added later. |
| **Reserved Worktrees "what's this?"** | Audit suggested one-line for newcomers.                                                                                                                 | **Deferred:** Section is clear enough; optional enhancement.                                                                                                                                                             |

### 8.3 Edits applied in this task

- **README.md:** "See also" line now includes: `[AGENTS.md](./AGENTS.md) for agent and automation guidelines.`

### 8.4 Summary

| Item              | Status                              |
| ----------------- | ----------------------------------- |
| Outdated sections | None found                          |
| Missing sections  | None required; AGENTS.md link added |
| Gaps documented   | Yes (this section)                  |
| Edits applied     | AGENTS.md in "See also"             |

**Task completed:** bfac9bcc-f359-4696-ae98-a56a26414037. Root README audit complete; findings documented; one edit applied (AGENTS.md link).
