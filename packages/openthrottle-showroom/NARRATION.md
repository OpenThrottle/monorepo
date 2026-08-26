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
