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

## The ship voice is an OPEN DECISION

**What is implemented and working: macOS** `say`**, as the rehearsal voice.** It is on
every Mac, costs nothing, sends nothing off the box, and is enough to build and time
the whole pipeline against. **It is not good enough to publish.**

That is a measurement, not a preference. A rendered sample had a loudness range of
**0.2 LU** — effectively no prosody — and only the base voice set is installed on
this machine (`say -v '?'` lists no Premium or Enhanced Siri voices). With no
presenter, the voice _is_ the channel's identity, and a listener recognises this one
as synthetic inside a sentence.

The remaining candidates could not be evaluated here, and it would be dishonest to
pick one on paper:

| Backend        | Cost | Off-box? | Status                                                             |
| -------------- | ---- | -------- | ------------------------------------------------------------------ |
| macOS `say`    | free | no       | **Implemented.** Rehearsal only — measurably flat                  |
| Piper (local)  | free | no       | Installed locally (`en_US-hfc_male-medium`). Not the ship default. |
| Kokoro (local) | free | no       | Not installed. Needs Python plus a model                           |
| ElevenLabs     | paid | **yes**  | Needs an API key; not available here                               |
| OpenAI TTS     | paid | **yes**  | Needs an API key; not available here                               |
| Google TTS     | paid | **yes**  | Needs credentials; not available here                              |

Given this project's self-hosting stance, a local option that sounds good is worth a
real look before a hosted one — and the backend records `sendsDataOffBox` per take,
because narration is text about unreleased work and "nothing leaves your box" is a
claim the product makes.

### How to settle it

1. Install Piper with a good English voice and add a backend beside
   `backends/say.ts` (the interface is three fields; nothing else changes).
2. Render the same script — 01 is the pilot — through each candidate.
3. Listen to all of them back to back, on phone speakers, not headphones. Most
   viewers are on a phone.
4. Pick one and **do not change it mid-season**. A voice change reads as a different
   channel.

Then set `NARRATION_BACKEND` / `NARRATION_VOICE`, or change the default in
`narrate.ts`.

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
```

Substitution applies to the **spoken** text only. Captions use the written form, so
the viewer reads "MCP" while the voice says the letters.

Adding a term is one line. If a new backend pronounces something correctly on its
own, remove the entry rather than leaving a workaround that now sounds wrong.

## Why per-sentence files

The task asked for per-beat clips so that re-recording one beat does not invalidate
the take. Per-sentence is strictly finer, and it also produces caption-grade segment
timings for free — a caption cue is a phrase, not a beat.
