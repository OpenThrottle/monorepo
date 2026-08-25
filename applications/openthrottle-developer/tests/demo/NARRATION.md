# Narration

Script markdown in, per-sentence audio plus timings out.

```bash
pnpm exec tsx applications/openthrottle-developer/tests/demo/narrate/narrate.ts \
  --script 03-first-plan
```

Produces `output/<slug>/audio/NNN-<beat>.wav` (48 kHz, loudness-normalised) and
`timings.json` — `{beat, file, index, startSeconds, endSeconds, durationSeconds, written}` per segment — which the assembly stage uses to align narration to picture
and to generate captions.

The narration column of `docs/marketing/scripts/<slug>.md` is the literal input.
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

| Backend        | Cost | Off-box? | Status                                                       |
| -------------- | ---- | -------- | ------------------------------------------------------------ |
| Piper (local)  | free | no       | **Ship default.** `en_US-hfc_male-medium`, installed locally |
| macOS `say`    | free | no       | Implemented. Rehearsal only — measurably flat (0.2 LU)       |
| Kokoro (local) | free | no       | Not installed, not evaluated. Out of scope                   |
| ElevenLabs     | paid | **yes**  | Not evaluated — needs an API key                             |
| OpenAI TTS     | paid | **yes**  | Not evaluated — needs an API key                             |
| Google TTS     | paid | **yes**  | Not evaluated — needs credentials                            |

Nothing in the shipped path sends narration off the box, which matters because
narration is text about unreleased work and "nothing leaves your box" is a claim the
product makes. The backend records `sendsDataOffBox` per take so that stays checkable
rather than assumed.

### Selecting a backend and voice

```bash
# Default — Piper, pinned ship voice. Nothing to pass.
pnpm exec tsx applications/openthrottle-developer/tests/demo/narrate/narrate.ts \
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
read         -> reed
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
