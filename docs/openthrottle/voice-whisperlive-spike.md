# Voice-input spike: WhisperLive streaming contract

Part of the voice-input spike for the developer-app composer (OT plan
`197756b3-2ccb-49f2-9933-916f5b6bd4f9`). Local speech-to-text runs in Docker via
[Collabora WhisperLive](https://github.com/collabora/WhisperLive) (faster-whisper
backend) behind the opt-in `voice` compose profile — no audio leaves the machine,
mirroring the app's local-model philosophy.

## Running it

```bash
pnpm run voice:start        # docker compose --profile voice up whisper
```

The default `docker compose up` and `pnpm run database:start` are untouched — the
service only starts when the `voice` profile is requested. The image is **built
locally from WhisperLive source** (pinned to `v0.9.0`) via
`applications/openthrottle/Dockerfile.Whisper` for the host's native architecture —
see [Caveats](#caveats) for why the published upstream image is unusable on Apple
silicon. First boot downloads the model into the `whisper_model_cache` named volume
(subsequent boots are warm).

Environment (`.env.default`):

| Variable              | Default               | Meaning                                                                                                            |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `WHISPER_MODEL`       | `base.en`             | Model sent by openthrottle-server in the per-connection handshake. Fallback if the latency gate misses: `tiny.en`. |
| `WHISPER_PORT`        | `6030`                | Published host port for the WhisperLive websocket.                                                                 |
| `WHISPER_SERVICE_URL` | `ws://localhost:6030` | Server-side env-only URL. **No API operation ever accepts a URL from the client** (SSRF stance).                   |

Note: WhisperLive selects the model **per client connection** (from the JSON
handshake), not per server process — `WHISPER_MODEL` is consumed by
openthrottle-server when it opens the relay connection, and is exported on the
container only for visibility. Quantization: the faster-whisper backend runs
`int8` compute on CPU.

## Streaming contract

1. **Connect**: plain websocket to `WHISPER_SERVICE_URL` (container listens on
   `9090`, published as `WHISPER_PORT`).
2. **Config handshake (JSON text frame, client → server)**:

   ```json
   {
     "uid": "<unique session id>",
     "language": "en",
     "task": "transcribe",
     "model": "base.en",
     "use_vad": true
   }
   ```

   The server answers with `{"uid": "...", "message": "SERVER_READY", "backend": "faster_whisper"}`.
   Other lifecycle messages reuse the same envelope: `{"uid", "status": "WAIT", ...}`
   when all decode slots are busy, and `{"uid", "message": "DISCONNECT"}` when the
   server ends the session.

3. **Audio upstream (binary frames, client → server)**: raw **16kHz mono Float32
   PCM** (little-endian), no container, no header. ~250ms chunks (≈4000 samples /
   16KB per frame) is the sweet spot. To end the utterance, send the literal bytes
   `END_OF_AUDIO` **as a binary frame** — a text frame crashes the session
   (`a bytes-like object is required, not 'str'`).

4. **Transcripts downstream (JSON text frames, server → client)**: segment lists:

   ```json
   {
     "uid": "...",
     "segments": [
       {
         "start": "0.000",
         "end": "1.200",
         "text": " Hello world",
         "completed": true
       },
       { "start": "1.200", "end": "2.100", "text": " this is a te" }
     ]
   }
   ```

   **The tail segment revises**: segments without `completed: true` are
   re-transcribed and replaced wholesale on subsequent messages as more audio
   arrives — text can change, shrink, or merge. Only `completed: true` segments are
   stable. This is unlike append-only LLM token streams, and it is why the GraphQL
   transcription layer publishes **full-transcript snapshots** the client replaces
   by highest `sortOrder` (snapshot-replace), not deltas to accumulate.

## Validation findings (2026-07-02, M-series macOS, Docker native arm64)

Measured end to end through the real transport (authenticated graphql-ws →
`startTranscriptionStream` → base64 Int16 PCM chunk mutations at realtime
cadence → `transcriptionStreamChunkAdded` snapshots → `stopTranscriptionStream`)
with a 7.5s spoken sample:

| Model               | mic-start → first partial | speech-end → final     | Transcript quality                    |
| ------------------- | ------------------------- | ---------------------- | ------------------------------------- |
| `tiny.en` (warm)    | **1.68–1.72s ✅**         | 2.01s (= flush window) | Complete + accurate                   |
| `base.en` (warm)    | 2.27–2.89s ❌             | —                      | Truncated: inference lags realtime    |
| any model, emulated | never                     | never                  | Unusable (>200× slower than realtime) |

- The ≤2s gate **passes on `tiny.en`**, hence the default. On `base.en` the
  CPU falls behind realtime, so partials are late AND end-of-stream inference
  lag makes any fixed post-stop flush either truncate the transcript or add
  seconds of latency.
- "speech-end → final" is dominated by the deliberate 2s quiet window the relay
  waits after `END_OF_AUDIO` (WhisperLive emits no completion signal); with
  `tiny.en` the live transcript is already complete before stop (<1s lag).
- Session establishment (mutation → WhisperLive `SERVER_READY`) is ~300–800ms
  warm; the first-ever connect downloads the model (seconds — pre-warm by
  running `voice:start` ahead of a demo).

## Automated E2E path (documented, not built)

Real-mic testing cannot run headless. The future Maestro/automated path is
Chromium's fake-media flags, pointing at a 16kHz mono WAV:

```
--use-fake-device-for-media-capture
--use-fake-ui-for-media-capture
--use-file-for-fake-audio-capture=sample.wav
```

## Caveats

- **The published `ghcr.io/collabora/whisperlive-cpu` image is linux/amd64-only
  and unusable on Apple silicon**: under Rosetta/QEMU emulation, ctranslate2 int8
  inference measured >200× slower than realtime (a 1-second audio window did not
  complete inference in 4 minutes). That is why the compose service builds the
  image from source for the native arch instead of pulling.
- **Docker on macOS is still CPU-only** (no Metal passthrough) even with a native
  arm64 build. The spike's latency gate (≤2s time-to-first-partial, ≤2s transcript
  lag) is evaluated in the validation task; if `base.en` and `tiny.en` both miss,
  the verdict is "needs native Metal (whisper.cpp) or a GPU host".
- The transcribe path is **local-only for this spike** — no auth or rate limiting
  beyond session ownership + reaping in the GraphQL layer (recorded as a
  productionization gap in the plan write-up).
