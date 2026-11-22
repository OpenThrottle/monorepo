# Narration

Script markdown in, per-sentence audio plus timings out. Fish Audio renders the
whole take in one request and slices it into those per-sentence files (see
[Whole-take rendering](#whole-take-rendering)); Piper and `say` render sentence by
sentence.

```bash
pnpm exec tsx packages/openthrottle-showroom/src/narrate/narrate.ts \
  --script 03-first-plan
```

Produces `output/<slug>/audio/NNN-<beat>.wav` (48 kHz, loudness-normalised) and
`timings.json` — `{beat, file, index, startSeconds, endSeconds, durationSeconds, written}` per segment — which the assembly stage uses to align narration to picture
and to generate captions.

The narration of the selected variant in `src/episodes/<id>/episode.ts` is the
literal input. `--variant <id>` renders a different take of the same episode.
Nothing is rewritten for the voice except pronunciation (below), so the script stays
the single source of truth.

## The default backend is Fish Audio (OpenAudio); Piper is the on-box path

Fish Audio renders every take by default, so `FISH_AUDIO_API_KEY` is required for a
default render. Piper stays in the tree as the on-box path — free, offline, and the
right choice for any text that is not going to be published. macOS `say` remains a
rehearsal backend only.

The pinned Fish voice is `DEFAULT_FISH_AUDIO_VOICE` in
`narrate/backends/fish-audio.ts`. A swap is planned, so nothing downstream should
assume the current id; every take records the voice it was rendered with.

### Why Piper beat macOS `say` (kept for the record)

The decision was made the way NARRATION.md said to make it: script 01 rendered
through both backends, played back to back on phone speakers rather than headphones,
because most viewers are on a phone. Piper won clearly. The measurement agrees with
the listen — `say` came out at a loudness range of **0.2 LU**, effectively no
prosody, while the Piper take measured **2.1 LU** on the same script. `say` is
recognisable as synthetic inside a sentence; Piper is not, on a phone speaker.

**Nothing is published yet, so nothing is frozen.** The mid-season freeze rule holds
in principle — a voice change reads as a different channel, and repinning means
re-rendering every published episode — but it starts applying at publication. Until
then Season 1 is the testing ground: re-rendering all 24 episodes is a ~$0.17 Fish
pass, and improving the season beats keeping it stable.

### The 2026-08 bake-off, and the decision that superseded it

Method mirrored the Piper-vs-`say` decision: scripts 01 (the original decider) and
05 (heaviest technical vocabulary) rendered through every contender with the lexicon
applied, normalised by the same one-gain-per-take pass, A/B'd back to back on phone
speakers. Measurements (ffmpeg `ebur128` on the normalised take) corroborated the
listen:

| Take (script 01)   | Integrated | LRA        | Pace  |
| ------------------ | ---------- | ---------- | ----- |
| ElevenLabs "Will"  | -16.8 LUFS | **7.9 LU** | 30.0s |
| ElevenLabs "Brian" | -16.1 LUFS | 6.3 LU     | 29.2s |
| Fish Audio "Ethan" | -16.1 LUFS | 5.6 LU     | 30.2s |
| Piper (libritts_r) | -16.7 LUFS | 4.0 LU     | 23.4s |

- **The listen ranked ElevenLabs first.** "Will" won it and is pinned as
  `DEFAULT_ELEVENLABS_VOICE` (`bIHbv24MWmeRgasZH58o`, `eleven_multilingual_v2`). That
  backend stays in the tree, unchanged and unused.
- **Fish Audio ships anyway, and is the default.** It came second on the listen and
  first on everything else that decides a season: ~10× lower cost (a full-season pass
  ≈ $0.17), pay-as-you-go instead of a subscription tier minimum, OpenAudio
  open-weight releases as a self-hosting escape hatch, and a word-timestamp endpoint
  that makes whole-take rendering possible at all. The gap on the phone-speaker
  listen was small; the gap on those was not. The first Fish candidate ("Slax") was
  rejected outright — announcer feel and the slowest read (42.9s on script 05, a
  short-format budget risk).
- **The pinned Fish voice is `DEFAULT_FISH_AUDIO_VOICE`, and a swap is pending.** The
  bake-off's Fish winner was "Ethan" (`536d3a5e000945adb7038665781a4aca`); the
  currently pinned id is deliberately a different one. Read the constant, not this
  paragraph.
- **Season 1 is unshipped and is the testing ground** — see above. The earlier
  "Season 1 stays frozen on Piper" line no longer applies.
- Every hosted take reads ~25–30% slower than Piper — capped shorts get less script
  budget under the new voice.
- Lexicon: no entries were removed. Removal requires hearing each backend read the
  written form; that per-term pass is still owed against the winning voice.

| Backend        | Cost | Off-box? | Status                                                                                |
| -------------- | ---- | -------- | ------------------------------------------------------------------------------------- |
| Piper (local)  | free | no       | On-box path. `en_US-hfc_male-medium`, installed locally. Use for anything unpublished |
| macOS `say`    | free | no       | Implemented. Rehearsal only — measurably flat (0.2 LU)                                |
| Kokoro (local) | free | no       | Not installed, not evaluated. Out of scope                                            |
| ElevenLabs     | paid | **yes**  | Won the 2026-08 listen; not adopted. In the tree, unchanged and unused                |
| Fish Audio     | paid | **yes**  | **Default.** OpenAudio models; voice pinned in code, swap pending                     |
| OpenAI TTS     | paid | **yes**  | Not evaluated — needs an API key                                                      |
| Google TTS     | paid | **yes**  | Not evaluated — needs credentials                                                     |

**The default path now sends narration off the box.** That is a real change — it used
to be the point that it did not. The line that keeps it honest is unchanged in
substance: hosted backends may only render script text intended for publication.
Season 1 narration is written to be published, so it qualifies. Draft copy,
experiments, and anything about unreleased work that is NOT going into an episode
renders on box, explicitly: `--backend piper`. The backend records `sendsDataOffBox`
per take so this stays checkable rather than assumed, and a default render prints the
off-box warning every time.

### Hosted providers: cost, privacy, reproducibility (bake-off notes)

Working numbers from the actual scripts: the 24 Season-1 scripts total ~11.3k spoken
characters (~470 per short, ~1.2–1.5k per longform), all ASCII so bytes ≈ characters.

**Cost.** A full-season render is small for both providers. ElevenLabs bills
subscription credits (1 credit/character on `eleven_multilingual_v2`): Free 10k/mo
does not cover one season pass; Starter $6/mo (30k) covers a season plus re-takes,
Creator $22/mo (121k) covers ~10 full-season passes — the tier minimum, not usage,
is the real cost while rendering. Fish Audio is pay-as-you-go at $15/M UTF-8 bytes
on `s1`/`s2-pro`/`s2.1-pro`: one full-season pass ≈ $0.17, so even a worst-case
repin re-render of everything published is under a dollar. Fish Audio is roughly
an order of magnitude cheaper for this workload.

**Privacy.** Both send narration text off box, and narration describes unreleased
work. ElevenLabs may use submitted data for model training with an account-level
opt-out; zero-retention is enterprise-only. Fish Audio's policy retains content "as
long as we need it" with no documented training opt-out. Neither is compatible with
rendering unreleased-work text casually. The gate that keeps "nothing leaves your
box" honest: hosted backends may only render script text that ships verbatim in a
published episode (the narration becomes public anyway); rehearsal and drafts stay
on Piper/`say`. `sendsDataOffBox` per take is the audit trail.

**Reproducibility.** Piper's onnx file is on disk — reproducible forever. ElevenLabs
premade voices have no pinning guarantee and closed weights: no escape hatch if a
voice changes or is retired. Fish Audio hosted voices are community-uploaded
`reference_id`s (they can be delisted), but the OpenAudio S1 family has open-weight
releases (S1-mini), so a self-hosted escape hatch exists if the reference audio is
kept locally.

### Selecting a backend and voice

```bash
# Default — Fish Audio, pinned voice. Needs FISH_AUDIO_API_KEY.
pnpm exec tsx packages/openthrottle-showroom/src/narrate/narrate.ts \
  --script 01-what-is-openthrottle

# On-box render. Free, offline, required for anything not being published.
pnpm exec tsx …/narrate.ts --script 01-what-is-openthrottle --backend piper

# Rehearsal pass through macOS say.
NARRATION_BACKEND=macos-say pnpm exec tsx …/narrate.ts --script 01-what-is-openthrottle

# Flags win over env; both accept a voice.
pnpm exec tsx …/narrate.ts --script 01-what-is-openthrottle --backend macos-say --voice Samantha
```

`--backend` / `NARRATION_BACKEND` and `--voice` / `NARRATION_VOICE`, in that
precedence. An unknown backend lists the available ids and exits non-zero. A missing
Piper binary or voice model fails loudly with the install command — it never falls
back to `say`, because a silent fallback would ship a rehearsal voice.

## Installing Piper (local)

rhasspy/piper is archived. The maintained CLI is [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl), installed as the `piper-tts` package. The binary and the voice model stay **on this machine** — do not commit either into git.

```bash
uv tool install piper-tts
# → ~/.local/bin/piper   (piper-tts 1.7.0)

mkdir -p ~/.local/share/piper/voices
~/.local/share/uv/tools/piper-tts/bin/python -m piper.download_voices \
  en_US-hfc_male-medium \
  --data-dir ~/.local/share/piper/voices
```

Pinned voice: `en_US-hfc_male-medium` (onnx + json, ~109 MB). Override the model directory with `PIPER_DATA_DIR` and the binary with `PIPER_BIN` if they are not at those defaults.

Smoke check:

```bash
piper --help
echo 'Open Throttle is local first.' | piper \
  -m en_US-hfc_male-medium \
  --data-dir ~/.local/share/piper/voices \
  -f /tmp/piper-smoke.wav
```

Missing binary or model must fail loudly in the narrate backend — never fall back to macOS `say`.

## Loudness: one measurement per take

Narration targets **-14 LUFS** with a **-1.0 dBTP** ceiling, both read from
`docs/marketing/format.json`.

Two things here were wrong on the first attempt and are worth not repeating:

**Per-sentence normalisation is wrong.** Integrated LUFS is not meaningful below
about three seconds — a 1.6-second clip measured -15.1 when asked for -14 — and
normalising each sentence independently flattens the relative level between them,
which is what makes narration sound like a series of announcements. The stage now
renders every clip raw, concatenates the take, measures **once**, and applies that
single gain to every clip. The whole-take path gets the same result more directly:
the take is already one file, so it is measured once, gain-and-resample is applied
in one pass, and the normalised take is sliced with no further filter.

**The peak ceiling was binding.** At -1.5 dBTP the take normalised to -15.3 LUFS,
because reaching -14 would have breached the peak. Moving to -1.0 dBTP — a standard
safe delivery ceiling — lets a take land at -14.3. Verified on two scripts: -14.3
and -14.7 LUFS, both at exactly -1.0 dBTP.

## Pronunciation

`narrate/lexicon.ts`. Every engine mangles this vocabulary by default and it is
audible immediately:

```
OpenThrottle -> Open Throttle      MCP  -> M C P        Nx      -> N X
pgvector     -> P G vector         CLI  -> C L I        pnpm    -> P N P M
Postgres     -> Postgress          9:16 -> nine by sixteen
Ollama       -> oh LAH ma          429  -> four twenty nine
read         -> reed               ready stays ready
```

Substitution applies to the **spoken** text only. Captions use the written form, so
the viewer reads "MCP" while the voice says the letters.

Adding a term is one line. If a new backend pronounces something correctly on its
own, remove the entry rather than leaving a workaround that now sounds wrong.

Every entry above survived the move to Piper — none was removed, because removing one
is only safe after hearing Piper read the written form, and Piper mangles this
vocabulary the same way `say` does. Re-check the list per script as new terms appear,
not per backend.

## Whole-take rendering

A backend that offers `renderTake` renders the whole script in ONE request, which
reads as one performance instead of a series of separately rendered sentences. The
word timings it returns locate each sentence boundary, the take is normalised once,
and it is sliced into the usual per-sentence files.

### How to render one

It is the **default whenever the backend offers `renderTake`**. Today that is Fish
Audio only, so a default render is whole-take with no flag:

```bash
# Default: whole take (Fish offers renderTake).
pnpm exec tsx …/narrate.ts --script 05-connect-ot-mcp

# Escape hatch: the per-sentence path on a backend that supports both.
pnpm exec tsx …/narrate.ts --script 05-connect-ot-mcp --per-sentence
```

`renderMode` in `timings.json` records which path produced the take:
`'whole-take'` or `'per-sentence'`. It is additive, so timings written before it
existed still read. `--no-cache` forces a fresh render on both paths.

| Backend      | Whole take | Notes                                              |
| ------------ | ---------- | -------------------------------------------------- |
| `fish-audio` | yes        | `/v1/tts/stream/with-timestamp`; the default       |
| `piper`      | no         | on box; per-sentence only, byte for byte as before |
| `macos-say`  | no         | rehearsal; per-sentence only                       |
| `elevenlabs` | no         | per-sentence only, deliberately not implemented    |

Piper, `say` and ElevenLabs are deliberately left on the per-sentence path: none of
them returns word timings that this stage uses, and the point of the change is Fish's
single-request read.

### Cache trade-off

The take cache keys on the full spoken text, so a one-word edit re-buys the whole
take (about $0.17 for a full 24-script season pass); an unchanged script replays for
free. The per-sentence cache is unchanged.

### Baseline measurement, and what is still owed

Method: episode 05, payoff-first variant, 605 spoken characters, `s2.1-pro-free`,
lexicon applied. The per-sentence path and the whole-take path (default, then
`chunk_length` 100, 200 and 300) were each normalised by the same single gain and
measured with ffmpeg `ebur128`. The code is `spike/fish-whole-take.ts`; its output,
including `report.md`, the raw and normalised wavs and the word timings, is in
`spike/output/fish-whole-take/` (gitignored, so it exists only on the machine that
ran it).

| Take (script 05)             | Integrated | LRA    | Duration |
| ---------------------------- | ---------- | ------ | -------- |
| Per-sentence                 | -14.4 LUFS | 2.3 LU | 31.49s   |
| Whole take, default          | -14.3 LUFS | 2.2 LU | 31.35s   |
| Whole take, chunk_length 100 | -14.2 LUFS | 2.0 LU | 30.50s   |
| Whole take, chunk_length 200 | -14.2 LUFS | 2.3 LU | 31.96s   |
| Whole take, chunk_length 300 | -14.3 LUFS | 2.1 LU | 29.55s   |

- **Loudness range does not separate the methods**, and the 2.4 s duration spread is
  run-to-run noise. The measurement cannot say whether whole-take sounds better.
- **Word timings were clean:** 101 of 101 words, in order, with no merges or splits,
  punctuation stripped, on an 80 ms grid.
- **`chunk_length` had no observable effect.** Every setting produced the same 3
  chunks of 268, 235 and 100 characters, split at sentence ends. The seams between
  chunks are 412 to 691 ms pauses (paragraph-like, against a 160 to 240 ms median
  sentence break) with no restart of the voice. The per-sentence path's joins run
  0 to 121 ms, two of them with no gap at all.
- **The stream surprise:** a chunk's last event already carries the start of the
  NEXT chunk's audio, so audio is concatenated in arrival order and never split by
  `chunk_seq`. Alignment is cumulative within a chunk, so the last event per
  `chunk_seq` counts.

**Pinned parameters:** `sample_rate: 44100` (48000 is rejected with a 400; the take is
resampled to format.json's rate in the single normalise pass), `chunk_length: 300`
(provisional, see above), and no `condition_on_previous_chunks`, `temperature` or
`top_p`, which are unverified on this endpoint.

**The listen has NOT happened.** The phone-speaker A/B of per-sentence against
whole-take (the same method as the bake-off above) is owed, and the verdict on
whether whole-take beats per-sentence is **pending**. The files to compare are
`spike/output/fish-whole-take/per-sentence.normalised.wav` and
`whole-default.normalised.wav` (plus `whole-100`, `whole-200`, `whole-300`) on the
machine that ran the spike. Until a person has listened, whole-take is the default on
the strength of the clean timings and the single-request read, not on a verdict. If
the listen goes the other way, `--per-sentence` is the way back.

### Season 1 re-render

All 24 episodes rendered whole-take with exit code 0 and no desyncs. Shorts came out
at 18.4 to 32.2 s against the 60 s cap; L1 is 86.3 s and L2 is 73.1 s against the
720 s cap. No script or lexicon edits were needed. **Still to do, by a person:** the
per-episode listen, and the per-term lexicon pass (each substitution re-heard through
the whole-take voice, since the lexicon entries were set against per-sentence
renders).

## Why per-sentence files

The task asked for per-beat clips so that re-recording one beat does not invalidate
the take. Per-sentence is strictly finer, and it also produces caption-grade segment
timings for free — a caption cue is a phrase, not a beat.

The per-sentence **file layout** (`NNN-<beat>.wav` and one `timings.json` segment per
sentence) is the contract with the assembly and caption stages, and it holds on BOTH
render paths. Whole-take rendering changes how the audio is produced, not what is
written: the take is cut into the same files at sentence boundaries found from word
timings, so `assemble/timeline.ts` and `assemble/captions.ts` do not know which path
ran.

## Word-level captions: not in v1

**Decision: caption cues stay sentence-level.** `assemble/captions.ts` keeps reading
`segment.written` and the segment's start and end from `timings.json`, exactly as
before. The whole-take path derives those segment times from word timings, but the
words themselves stop at the narration stage.

**Why the word timings do not map onto captions yet.** The timings are of the
**spoken** words and captions show the **written** form, and `lexicon.ts` is one-way:
it rewrites written to spoken and keeps no record of what became what. `MCP` is three
spoken words (`M C P`, which the service may return as one word or three), `9:16` is
`nine by sixteen`, `OpenThrottle` is two words, `read` is `reed`. Karaoke-style cues
would highlight a written word at the time its spoken words are heard, and nothing
says which spoken words belong to which written word. Guessing by position or length
is the proportional splitting that the sentence mapper refuses to do.

**What a word-level version would need:**

- **Token-level provenance from the lexicon.** `applyLexicon` would return the
  spoken text together with a list of spans, each saying that written characters
  `[a, b)` became spoken characters `[c, d)`. Unsubstituted text maps one to one.
  This is better than a reversible lexicon table, because the table is ambiguous the
  other way (`reed` could be a real word) and provenance is recorded at the moment of
  substitution, when the answer is known.
- **A written-word to spoken-word alignment** built from those spans and the same
  normalised-character walk that `mapWordsToSentences` already does: each written
  word owns the spoken words whose characters fall in its span, and its timing is
  the first of their starts to the last of their ends. A word that cannot be placed
  fails loudly, as the sentence mapper does.
- **A new field in `timings.json`**, for example per segment `words: { text, startSeconds, endSeconds }[]`
  in the written form, added alongside the existing fields (additive, like
  `renderMode`). `captions.ts` would emit one cue per word, or one cue per phrase
  with word-level highlight, only when the field is present, and fall back to the
  sentence cue otherwise. Per-sentence-path takes have no word timings and would
  keep sentence cues.

**Follow-up plan: no, not yet.** The cost is real: a lexicon change that touches
every substitution, a new alignment with its own failure modes, a `timings.json`
extension and caption rendering and styling work. The benefit is unproven: the
episodes are shorts of 18 to 32 seconds plus two long-forms of 73 and 86 seconds,
each with one short caption per sentence, which already reads in step with the
voice, and nobody has asked for karaoke styling. Revisit when a specific episode needs it, or when a caption style
is chosen that requires per-word timing. The groundwork is already in place: the
word timings are recorded per take in the render cache, and the sentence mapper is
the template for the alignment. Filing a plan now would be speculation.
