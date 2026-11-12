# @openthrottle/react-router-chat-state

Persisted chat-toolbar state and derivation helpers shared by the OpenThrottle
React Router apps (developer + admin). Source-first (no build target) — consumers
transpile `src` directly.

## Public API

| Export                                                              | Description                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chatToolbarStateAtom`                                              | localStorage-backed Jotai atom holding the composer toolbar selections. Storage key `${APP_NAME}:chat:toolbar`, so developer vs admin namespace automatically |
| `ChatToolbarState`, `DEFAULT_CHAT_TOOLBAR_STATE`                    | The persisted shape + its default (Plan mode, `persist: true`, `rememberPermissionMode: false`, everything else unset)                                        |
| `normalizeChatToolbarState`                                         | Migration-aware coercion of unknown persisted JSON into a valid `ChatToolbarState`                                                                            |
| `reconcileChatToolbarState`                                         | PURE, derive-only reconciliation of the persisted blob against current loader data + backend capabilities                                                     |
| `decodeChatOption`, `buildModelGroups`, `capabilitiesForChatOption` | Model-id decoding, grouped model lists, and per-backend capability descriptors                                                                                |
| `decayElevatedPermissionModes`, `useSessionPermissionDecay`         | Per-session safety decay of elevated permission modes                                                                                                         |
| `writeChatToolbarBackendPref`                                       | Last-used-wins write for permission mode / reasoning / service tier (active backend's `perBackend` entry + global fallback)                                   |

## Persistence & versioning

`chatToolbarStateAtom` is stamped with `CHAT_TOOLBAR_STATE_VERSION`. Bump it
whenever `ChatToolbarState` changes shape; `normalizeChatToolbarState` migrates
older blobs forward (preserving still-valid picks) rather than wiping them, and
degrades an unknown/newer version to `DEFAULT_CHAT_TOOLBAR_STATE`.

### `persist` (v3)

`ChatToolbarState.persist: boolean` (default `true`) backs the composer's
Saved / Private toggle. `false` is **Private mode** — the turn streams ephemerally
with no conversation row or message writes (see
`@openthrottle/react-router-chat` and the server's `startConversationStream`
`persist` flag). It is never capability-gated: `reconcileChatToolbarState` passes
it through unchanged, since every backend can run persisted or Private. Blobs from
before v3 migrate forward seeding `persist: true`.

### Permission modes: the session decay and `rememberPermissionMode` (v5)

Auto-accept edits and Full access apply changes without per-action review, so
by default they do not outlive a browser session: `useSessionPermissionDecay`
(mounted by `useHeaderChatController`) runs `decayElevatedPermissionModes` once
per session, gated by a `sessionStorage` sentinel. A reload in the same tab, or
opening and closing the chat, keeps the mode. A new tab or a new Electron window
resets it. Supervised never resets.

`ChatToolbarState.rememberPermissionMode: boolean` (default `false`) is the
user's opt-out of that safety net, surfaced as "Remember my choice" in the
permission dropdown. When it is `true` the decay leaves the state alone. Blobs
from before v5 migrate forward as `false`, so nobody is opted in silently.

Every surface that writes `permissionMode`, `reasoning` or `serviceTier` must go
through `writeChatToolbarBackendPref`, which writes the active backend's
`perBackend` entry and the global fallback together. The reconciler reads
`perBackend` first, so writing only the global field gets shadowed by an older
per-backend value and the control snaps back.

## Nx targets

Source-first: validate with `lint`, `typecheck`, and `test` (no `build`).
