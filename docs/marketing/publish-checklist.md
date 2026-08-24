# Pre-publish checklist

**This gate exists because the failure mode is silent and irreversible.** Once a
frame with a token, a real email or a private repository name is on YouTube, taking
the video down does not un-see it. Automation makes this risk worse, not better,
because nobody is watching the frames.

Every video clears all of it. No exceptions for "it's only a Short".

## 1. Automated: the leak scan

```bash
pnpm nx run openthrottle-developer:video-scan --args="--script 03-first-plan"
```

Non-zero exit means do not publish. It scans:

- **every beat's on-screen text**, dumped by the runner as it records
  (`output/<slug>/text/*.txt` and the portrait pass's equivalent), and
- **the text that ships with the video** — the `.srt` and `metadata.json`, because a
  caption or a description leaks just as easily as a frame.

Rules, and why each one is there:

| Rule            | Severity | Catches                                                                     |
| --------------- | -------- | --------------------------------------------------------------------------- |
| `home-path`     | fail     | `/Users/<name>` — leaks a username and the shape of a machine               |
| `email-address` | fail     | a real address in an account menu or assignee field                         |
| `token-prefix`  | fail     | `sk-`, `ghp_`, `github_pat_`, `AKIA`, `xox…` — unambiguous live credentials |
| `jwt`           | fail     | a session someone can replay                                                |
| `denylist`      | fail     | a real org/repo/person name **in a frame**                                  |
| `high-entropy`  | warn     | long opaque strings — often a key, sometimes just a hash                    |
| `external-url`  | warn     | infrastructure URLs, and query strings that can carry a token               |

**`denylist` applies to frames only.** The standard description block is _supposed_
to contain the repository URL; a rule that fired on it would train everyone to ignore
the scanner. In a frame the same string means something much worse: the recording ran
against the **real database instead of the demo one**, which is the single worst
failure this pipeline can have.

The rules are unit tested (`scan/__tests__/scan-text.test.ts`) against leaks this
project has actually had — including the hard-coded `/Users/matt/...` path that
renders on the plan-create page. A gate nobody has seen fail is not a gate.

### What the scan cannot see

It reads the DOM, so it cannot see **text baked into an image** — a screenshot inside
the app, a logo, a rendered chart label, a video thumbnail. Nothing on this host can:
there is no OCR binary installed (`tesseract` is absent), and adding one buys
transcription errors along with coverage. Those remain human items below.

## 2. Automated: the content gates

```bash
pnpm exec tsx ./scripts/validate-video-scripts.ts --check   # narration within budget
pnpm nx run openthrottle-developer:video-assemble --args="--script <slug>"
```

- The script is within its spoken-word budget.
- Both masters exist at the right dimensions, and neither exceeds 60s for a Short.
- The `.srt` cue count matches the narration segment count.
- Audio measures about -14 LUFS at no more than -1.0 dBTP.

## 3. Human: does it deliver the claim?

Nothing below can be automated, and each has sunk a video somewhere:

- [ ] **The video demonstrates the claim in its title.** Not "related to" — the exact
      claim. This is a publish gate, not a preference.
- [ ] **Every UI state shown is real and current.** No aspirational features. This is
      the one mistake the scan cannot catch and the audience always does. Check the
      script's `blockedOn` is empty.
- [ ] **The first three seconds show the payoff.** If frame 1 is a login page or an
      empty state, re-record from the right place rather than trimming.
- [ ] **The pacing is watchable.** Would you finish it if it were not yours?
- [ ] **The narration sounds like a person.** If it sounds synthetic, the voice
      decision is not settled — see `NARRATION.md`. Do not ship a robotic voice
      because the pipeline is otherwise ready.
- [ ] **Captions are legible on a phone** and clear of the bottom 15% Shorts UI.
- [ ] **Nothing in frame is baked into an image** that the scan could not read.

## 4. Human: licensing and marks

- [ ] **Music bed:** licensed for commercial use on YouTube, and attributed in the
      description if the licence requires it. No bed at all is fine; an unlicensed
      bed is not.
- [ ] **Third-party logos and names** (Claude, Codex, OpenCode, Ollama, Docker, Nx…)
      appear only as nominative references to the real product, unaltered, and never
      in a way that implies endorsement. Extends the discipline already in
      `TRADEMARK.md` and `NOTICE`.
- [ ] **Fonts** used in cards are licensed for embedding in video.

## 5. Upload

- [ ] Title, description and tags come from `metadata.json`, not retyped.
- [ ] `.srt` uploaded alongside the video.
- [ ] Correct aspect: the 9:16 master for Shorts, the 16:9 for the main feed.
- [ ] Long-form only: a thumbnail from the template, and chapter markers.

## If something ships wrong anyway

Unlist first, then fix, then re-upload as a new video. Do not edit in place and hope —
the original keeps its watch history and its embeds. Then add whatever the scan
missed to `scan/rules.ts` or the denylist, with a test, so the next take cannot repeat
it.
