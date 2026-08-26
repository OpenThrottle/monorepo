# Narration

Script markdown in, per-sentence audio plus timings out.

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

## The ship voice is SETTLED: Piper, `en_US-hfc_male-medium`

Piper renders every take by default. macOS `say` stays in the tree as a rehearsal
backend, selectable with `--backend macos-say`, and nothing else.

The decision was made the way NARRATION.md said to make it: script 01 rendered
through both backends, played back to back on phone speakers rather than headphones,
because most viewers are on a phone. Piper won clearly. The measurement agrees with
the listen — `say` came out at a loudness range of **0.2 LU**, effectively no
prosody, while the Piper take measured **2.1 LU** on the same script. `say` is
recognisable as synthetic inside a sentence; Piper is not, on a phone speaker.

**The voice is now pinned and does not change mid-season.** A voice change reads as a
different channel. Repinning means re-rendering every published episode, so treat
`DEFAULT_PIPER_VOICE` in `narrate/backends/piper.ts` as frozen for Season 1.

### Season 2+ decision (2026-08 bake-off): GO on ElevenLabs, voice "Will"

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

- **ElevenLabs: GO.** The listen ranked Will and Liam (both ElevenLabs) above every
  Fish Audio contender; Will won the final pick and is pinned as
  `DEFAULT_ELEVENLABS_VOICE` (`bIHbv24MWmeRgasZH58o`, `eleven_multilingual_v2`).
- **Fish Audio: runner-up, kept in the tree.** The first candidate ("Slax") was
  rejected outright — announcer feel and the slowest read (42.9s on script 05, a
  short-format budget risk). "Ethan" (`536d3a5e000945adb7038665781a4aca`) came close
  and stays pinned for `--backend fish-audio`; Fish keeps the better reproducibility
  story (OpenAudio open weights) and ~10× lower cost, so it remains the fallback if
  ElevenLabs pricing or voice availability ever turns.
- **Season 1 stays frozen on Piper** per the repin rule above. The GO applies to
  Season 2+ / future content only.
- Every hosted take reads ~25–30% slower than Piper — capped shorts get less script
  budget under the new voice.
- Lexicon: no entries were removed. Removal requires hearing each backend read the
  written form; that per-term pass is still owed against the winning voice.

| Backend        | Cost | Off-box? | Status                                                                                          |
| -------------- | ---- | -------- | ----------------------------------------------------------------------------------------------- |
| Piper (local)  | free | no       | **Ship default.** `en_US-hfc_male-medium`, installed locally                                    |
| macOS `say`    | free | no       | Implemented. Rehearsal only — measurably flat (0.2 LU)                                          |
| Kokoro (local) | free | no       | Not installed, not evaluated. Out of scope                                                      |
| ElevenLabs     | paid | **yes**  | **GO for Season 2+.** Evaluated 2026-08; "Will" pinned — see decision note                      |
| Fish Audio     | paid | **yes**  | Evaluated 2026-08, runner-up. OpenAudio models; kept as `--backend fish-audio` ("Ethan" pinned) |
| OpenAI TTS     | paid | **yes**  | Not evaluated — needs an API key                                                                |
| Google TTS     | paid | **yes**  | Not evaluated — needs credentials                                                               |

Nothing in the shipped path sends narration off the box, which matters because
narration is text about unreleased work and "nothing leaves your box" is a claim the
product makes. The backend records `sendsDataOffBox` per take so that stays checkable
rather than assumed.

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
# Default — Piper, pinned ship voice. Nothing to pass.
pnpm exec tsx packages/openthrottle-showroom/src/narrate/narrate.ts \
  --script 01-what-is-openthrottle

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
single gain to every clip.

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

## Why per-sentence files

The task asked for per-beat clips so that re-recording one beat does not invalidate
the take. Per-sentence is strictly finer, and it also produces caption-grade segment
timings for free — a caption cue is a phrase, not a beat.
