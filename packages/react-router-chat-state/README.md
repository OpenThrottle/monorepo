# @openthrottle/react-router-chat-state

Persisted chat-toolbar state and derivation helpers shared by the OpenThrottle
React Router apps (developer + admin). Source-first (no build target) — consumers
transpile `src` directly.

## Public API

| Export                                                              | Description                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chatToolbarStateAtom`                                              | localStorage-backed Jotai atom holding the composer toolbar selections. Storage key `${APP_NAME}:chat:toolbar`, so developer vs admin namespace automatically |
| `ChatToolbarState`, `DEFAULT_CHAT_TOOLBAR_STATE`                    | The persisted shape + its default (Plan mode, `persist: true`, everything else unset)                                                                         |
| `normalizeChatToolbarState`                                         | Migration-aware coercion of unknown persisted JSON into a valid `ChatToolbarState`                                                                            |
| `reconcileChatToolbarState`                                         | PURE, derive-only reconciliation of the persisted blob against current loader data + backend capabilities                                                     |
| `decodeChatOption`, `buildModelGroups`, `capabilitiesForChatOption` | Model-id decoding, grouped model lists, and per-backend capability descriptors                                                                                |
| `decayElevatedPermissionModes`, `useSessionPermissionDecay`         | Per-session safety decay of elevated permission modes                                                                                                         |

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

## Nx targets

Source-first: validate with `lint`, `typecheck`, and `test` (no `build`).
