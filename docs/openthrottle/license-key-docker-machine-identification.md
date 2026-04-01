# License-key validation and machine identification for Docker distribution

**Cortex:** Plan-Id `d762148d-3528-4d01-b75f-86fcee6fb030` · Tasks: machine fingerprinting (§1), validation API (§2), edge cases (§3).

Investigation for dockerized **openthrottle-server** and **openthrottle-developer**: run images with a license key that must validate against our API. Goal: one licensed user may run multiple worktrees (same machine); multiple users sharing one key must be prevented.

This document covers:

1. **Machine fingerprinting** — ways to derive a stable machine/device identifier in Docker and runtime.
2. **License validation API and key-binding model** — validation API contract, server-side storage, and binding policy.
3. **Edge cases and recommendations** — offline grace, revocation, privacy, CI, and binding strictness.

---

## 1. Machine fingerprinting options and limitations

We need an identifier that is **stable for the same host** and **identical across multiple containers/worktrees on that host**, so that one license key can allow “many worktrees, one machine” while rejecting use of the same key on a different machine.

### 1.1 Identifier sources in Docker / runtime

| Source                             | Where it comes from                                     | Visible inside container?                   | Same across worktrees (same host)?                                      | Survives container restart?       | Survives image rebuild / pull? |
| ---------------------------------- | ------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- | ------------------------------ |
| **Container hostname**             | Container ID or Compose service name                    | Yes                                         | No (each container has its own)                                         | No (new container = new hostname) | No                             |
| **Container MAC address**          | Docker network per container                            | Yes (e.g. from `/sys/class/net/...`)        | No                                                                      | No                                | No                             |
| **Host hostname**                  | Host OS                                                 | Only if passed via env or mount             | Yes                                                                     | Yes                               | Yes                            |
| **Host MAC address**               | Host NIC                                                | Only if host exposes it (e.g. mount, agent) | Yes                                                                     | Yes                               | Yes                            |
| **Linux `machine-id`** (host)      | `/etc/machine-id` or `/var/lib/dbus/machine-id` on host | Only if mounted read-only into container    | Yes                                                                     | Yes                               | Yes                            |
| **Linux `machine-id`** (container) | Generated per container/instance                        | Yes                                         | No                                                                      | No (new container = new id)       | No                             |
| **Docker daemon ID**               | `docker info` (e.g. "ID" of the Docker engine)          | No (daemon is outside container)            | Yes if same daemon                                                      | Yes                               | Yes                            |
| **Named volume identity**          | Volume UUID/name                                        | Yes for paths inside that volume            | Per volume, not per host; different worktrees may use different volumes | Yes for that volume               | Yes                            |
| **Block device / filesystem UUID** | Host disk or container root fs                          | Container sees only its own root fs         | No (container fs)                                                       | N/A                               | N/A                            |
| **Custom file on host**            | e.g. `/var/lib/openthrottle/fingerprint`                | Only if mounted                             | Yes                                                                     | Yes (if we create it)             | Yes                            |

So: **container-scoped** values (hostname, container MAC, container machine-id, container fs) are unsuitable for “one machine, many worktrees.” We need **host-scoped** or **Docker-host–scoped** values.

### 1.2 How to get host-scoped identifiers into the container

- **Read-only mount of host paths**
  - Example: `-v /etc/machine-id:/etc/machine-id:ro` so the process inside the container reads the **host’s** `machine-id`.
  - Same host → same file → same value across all containers/worktrees on that host.
- **Environment variable set by host**
  - e.g. `OPENTHROTTLE_MACHINE_ID` or `OPENTHROTTLE_FINGERPRINT` set by the runner (Compose, K8s, script) from host data (`cat /etc/machine-id`, `docker info --format '{{.ID}}'`, etc.).
  - Requires the run-time (Compose, K8s, CLI) to inject the value; no change to the image.
- **Sidecar or host agent**
  - A small process on the host (or in a privileged container) that the app calls to get a fingerprint. More moving parts; only worth it if we want to avoid any host mounts or env.

For a first version, **mounting host `/etc/machine-id`** and/or **passing a fingerprint or machine-id via env** is the most straightforward.

### 1.3 What survives restarts vs rebuilds

- **Restarts (same host, same OS):**
  - Host `machine-id`, host hostname, host MAC, Docker daemon ID: **unchanged.**
  - Any fingerprint derived only from these: **unchanged.**
- **Image rebuild / pull:**
  - Fingerprint should depend only on host (or daemon) inputs, not on image contents, so **no change.**
- **New worktree on same host:**
  - Same host → same mounted `/etc/machine-id` (or same env) → **same fingerprint.** So one key can cover multiple worktrees on one machine.

### 1.4 What differs across worktrees (same host)

By design we want **no** difference: same host should yield the same fingerprint regardless of which repo/worktree or Compose project is running. So we must **avoid** using:

- Container ID, container hostname, container MAC, container `machine-id`, or any path/volume that is worktree-specific.

Using only host `machine-id` (or env set from host) keeps the fingerprint **identical across worktrees** on the same host.

### 1.5 Limitations

- **Cloned VMs / copied disks**
  - Linux `machine-id` is often **copied** with the image. So two clones have the **same** `machine-id` → same fingerprint → one key would work on both. This is a known limitation of machine-id binding; we can mitigate with “bind to one fingerprint” and revocation (later tasks).
- **Privacy**
  - `machine-id` is a unique device identifier. Sending it to our validation API is potentially sensitive (GDPR, device fingerprinting). Prefer sending a **hash** (e.g. SHA-256 of `machine-id` + app salt) so the server never sees the raw id; document in privacy policy and edge-cases section.
- **OS / environment differences**
  - **Linux:** `machine-id` is standard (systemd/dbus).
  - **macOS:** No `/etc/machine-id`; alternatives include hardware UUID (e.g. `ioreg -rd1 -c IOPlatformExpertDevice`) or a generated id stored under `~/Library` or `/var/db`.
  - **Windows:** Different again (e.g. machine GUID, or WMI).
  - **Docker Desktop (Mac/Windows):** The “host” seen by the container is often the VM behind Docker Desktop; that VM’s `machine-id` can be stable across restarts but may reset on Docker Desktop reinstall. We should document that and consider optional “allow re-binding” or “N devices per key” for devs on Mac/Windows.
- **Minimal / scratch images**
  - If the image has no shell and we don’t mount host paths, we must pass the fingerprint (or raw values) via **env** only.

### 1.6 Recommended fingerprint inputs and stability

**Recommended minimal set for Linux (including Docker on Linux):**

1. **Host `machine-id`**
   - Read from `/etc/machine-id` (mounted from host) or from env `OPENTHROTTLE_MACHINE_ID` set by the host.
   - Stable: until host reinstall or explicit `machine-id` regeneration; survives restarts, rebuilds, and worktrees.
2. **Optional: Docker daemon ID**
   - If we want to tie to “this Docker installation” as well (e.g. to distinguish two Docker installs on the same host), we can pass it via env (e.g. `OPENTHROTTLE_DOCKER_ID`) from `docker info --format '{{.ID}}'`.
   - Use only when running under Docker; omit for bare-metal or non-Docker runtimes.

**Fingerprint computation (recommendation):**

- `fingerprint = hash(salt || machine_id [|| docker_id])`
  - e.g. `SHA-256(OPENTHROTTLE_SALT + machine_id)` or `+ machine_id + docker_id` if we include Docker ID.
  - Salt is our secret (per product or global) so the raw machine-id is never sent or stored.
- Send only `fingerprint` (and license key) to the validation API.

**How often the fingerprint might change:**

- **Rarely** on a fixed Linux host: only when `/etc/machine-id` is recreated (new OS install, clone from template that regenerates it, or manual regeneration).
- **Docker Desktop (Mac/Windows):** VM `machine-id` can change on Docker Desktop reinstall or major upgrade; document this and consider “re-bind” or “N devices” policy (see edge-cases task).

This gives a **small set of inputs** (one required: host machine-id; one optional: Docker daemon ID) and a **reasonably stable** fingerprint that is identical across worktrees on the same host and differs across distinct machines or clones (with the cloning caveat above).

---

## 2. License validation API and key-binding model

The validation service is the single source of truth for whether a license key is valid and (optionally) bound to a given machine. Clients (openthrottle-server or openthrottle-developer running in Docker or bare metal) call this API at startup and/or periodically.

### 2.1 API contract

**Endpoint:** `POST /license/validate` (or equivalent under your API prefix). **HTTPS only**; no validation over plain HTTP.

**Request (JSON):**

| Field           | Type   | Required | Description                                                                                                                                         |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `licenseKey`    | string | Yes      | The license key (opaque string issued to the customer).                                                                                             |
| `fingerprint`   | string | No       | Machine fingerprint as defined in §1 (e.g. SHA-256 hash). Omit for “key only” check; include for binding and “same machine, many worktrees” policy. |
| `product`       | string | No       | Product/sku identifier (e.g. `openthrottle-server`, `openthrottle-developer`) for future use (entitlements, product-specific rules).                |
| `clientVersion` | string | No       | Optional client version for support and abuse analysis.                                                                                             |

**Response (JSON):**

| Field                 | Type              | Always present | Description                                                                                                        |
| --------------------- | ----------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| `valid`               | boolean           | Yes            | `true` if the key is valid and (when fingerprint is used) allowed for this fingerprint; `false` otherwise.         |
| `message`             | string            | No             | Human-readable message for denial or warning (e.g. “License revoked”, “Key already bound to another device”).      |
| `expiresAt`           | string (ISO 8601) | No             | Optional license or subscription end date.                                                                         |
| `allowedFingerprints` | string[]          | No             | Optional list of fingerprints currently bound to this key (for admin/debug only; consider omitting in production). |

**Example — valid, same fingerprint (many worktrees OK):**

```json
{
  "valid": true,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

**Example — denied, key bound to another fingerprint:**

```json
{
  "valid": false,
  "message": "License key is already bound to another device. Contact support to transfer or add a device."
}
```

**Example — revoked:**

```json
{
  "valid": false,
  "message": "This license has been revoked."
}
```

**HTTP status:** Use `200 OK` for both valid and invalid outcomes; put the result in the body so that network or proxy errors (4xx/5xx) are distinguishable from “valid: false”. Alternatively, use `200` for valid and `403` for denied/revoked; document the chosen convention and stick to it.

### 2.2 Server-side storage

The validation backend should persist at least the following (conceptual schema; implement in your DB of choice):

**License key record:**

| Column / field             | Purpose                                                              |
| -------------------------- | -------------------------------------------------------------------- |
| `key_id` / `id`            | Primary key (internal).                                              |
| `license_key`              | The opaque license key (store hashed if desired for extra security). |
| `status`                   | `active`, `revoked`, `expired`, etc.                                 |
| `revoked_at`               | Timestamp when revoked (if applicable).                              |
| `expires_at`               | Optional subscription or license end.                                |
| `created_at`, `updated_at` | Audit.                                                               |

**Key–fingerprint binding (optional but recommended):**

| Column / field      | Purpose                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| `id`                | Primary key.                                                                                          |
| `license_key_id`    | FK to license key.                                                                                    |
| `fingerprint`       | The hashed fingerprint sent by the client (do not store raw machine-id).                              |
| `bound_at`          | When this fingerprint was first bound.                                                                |
| `last_validated_at` | Last successful validation with this fingerprint (useful for revocation windows and abuse detection). |

**Policies:**

- **Allow same fingerprint, many worktrees:** If the client sends a fingerprint that is already bound to this key, respond `valid: true` (and optionally refresh `last_validated_at`). No limit on number of validations from the same fingerprint.
- **Reject new fingerprint when key already bound to N others:** When the client sends a **new** fingerprint (not yet in the binding table for this key), check how many **distinct** fingerprints are already bound to this key. If that count ≥ N (e.g. N = 1), respond `valid: false` with a message like “Key already bound to another device.” If N is 2 or 3 (e.g. laptop + desktop), allow up to N distinct fingerprints per key.
- **Revocation:** If the license key’s `status` is `revoked` (or `revoked_at` set), always return `valid: false` regardless of fingerprint.
- **First-use binding:** On the first successful validation for a key, if the client sends a fingerprint, record it as the first bound fingerprint. No “pre-registration” required unless you add an explicit activation flow later.

### 2.3 First-use binding vs allow N devices per key

- **First-use binding (N = 1):** Simplest. First machine to validate with the key becomes the single bound device; any other fingerprint is rejected. Good for “one user, one machine” or “one key per machine.” Same fingerprint can validate many times (many worktrees on same host).
- **Allow N devices (e.g. 2–3):** Store up to N distinct fingerprints per key. Typical use: one laptop + one desktop, or laptop + CI runner. When a new fingerprint is presented and the key already has N bindings, either reject or support an explicit “replace device” flow (e.g. customer portal: “remove old device, add new one”).
- **Recommendation:** Start with **N = 1** for strict “no key sharing”; introduce N > 1 or a “replace device” flow if support burden or legitimate multi-device use justifies it (see also §3 edge cases).

### 2.4 Rate limiting and abuse

- **Per key:** Throttle excessive validation requests per license key (e.g. max 1 request per minute per key from a given IP or fingerprint) to prevent brute-force or key-probing. Allow enough headroom for multiple containers on the same host (same fingerprint) starting within a short window.
- **Per IP / global:** Apply general rate limits to the validation endpoint to prevent DoS and credential stuffing. Return `429 Too Many Requests` with `Retry-After` when limits are exceeded.
- **Logging:** Log validation attempts (key hash, fingerprint hash, result, timestamp) for abuse analysis and support; avoid storing raw license keys or raw machine-ids in logs (see §1.5 privacy).

### 2.5 HTTPS only

- The validation API must be exposed only over **HTTPS**. No fallback to HTTP for license checks; treat any non-HTTPS validation as invalid or disabled in production.
- Clients should verify TLS (certificate chain); avoid disabling certificate verification for license calls.

---

## 3. Edge cases and recommendations

Things you might not have thought of: offline use, revocation timing, fingerprint stability, privacy, concurrent runs, telemetry, shared CI, and how strict to be with binding.

### 3.1 Offline grace period (cached validity vs hard fail)

- **Hard fail when offline:** If the client cannot reach the validation API (e.g. air-gapped or flaky network), treating the license as invalid is the strictest approach and prevents abuse. It can, however, block legitimate use (travel, VPN issues, or brief API outages).
- **Cached validity (grace period):** Cache a successful validation result for a limited time (e.g. 24–72 hours). While cached, allow the product to run without calling the API. After the cache expires, require a new validation; if still offline, then deny. This improves UX but adds complexity: cache storage (where? in a volume? encrypted?), clock skew (client time vs server time), and the risk that a revoked key keeps working until the cache expires.
- **Recommendation:** Document the chosen behaviour clearly. For Docker: a small grace window (e.g. 24–48 hours) with cache stored in a mounted volume or env-derived path is a reasonable compromise; make the grace duration and “last validated” visible in logs or admin UI so support can reason about it. Prefer “fail closed” (deny when in doubt) for high-compliance or high-abuse scenarios.

### 3.2 Key revocation and re-validation interval

- **Revocation:** When a key is revoked on the server, clients that already received `valid: true` will keep running until they re-validate. So **how often** the client re-validates determines how quickly revocation takes effect.
- **Re-validation interval:** Options: (1) Only at startup — revocation applies only after the next restart. (2) Periodic (e.g. every 24 hours) — balances responsiveness to revocation with API load and offline tolerance. (3) Short interval (e.g. every 15 minutes) — fast revocation but more traffic and worse offline behaviour.
- **Recommendation:** Re-validate at startup and periodically (e.g. every 24–48 hours). Document that revocation may take up to one re-validation cycle to take effect, and that cached validity (if used) can extend that window. For high-value keys, consider a shorter interval or a “revocation push” mechanism later (e.g. webhook or polling a lightweight endpoint).

### 3.3 Fingerprint stability across Docker image pulls / restarts

- **Image pull / rebuild:** The fingerprint is derived from **host** (or daemon) inputs, not from the image. So pulls and rebuilds do **not** change the fingerprint (see §1.3).
- **Container restart:** Same host, same mounts/env → same fingerprint. No change.
- **Docker Desktop (Mac/Windows):** The underlying VM’s `machine-id` can change on reinstall or major upgrade. That will produce a **new** fingerprint; with N = 1 binding, the user would be locked out until they re-bind or use a “replace device” flow. Document this and consider N = 2 or an explicit “re-bind after fingerprint change” flow for devs on Docker Desktop.
- **Cloned VMs / copied disks:** As in §1.5, cloned VMs often share the same `machine-id`, so fingerprint does **not** change; one key would still work on both. Binding strictness (N = 1) plus revocation and monitoring are the main levers.

### 3.4 GDPR / privacy of collecting machine id

- **Risk:** The raw machine-id (or any stable device identifier) is personal/device data under GDPR when it can be linked to a person. Sending it in plain text to the validation API increases exposure and retention concerns.
- **Mitigation:** (1) **Never send or store raw machine-id.** Use a one-way hash with a product-specific salt (e.g. `SHA-256(salt || machine_id)`) and send only the hash as the fingerprint. The server cannot reverse it to the original id. (2) **Minimise what you store:** Store only the hashed fingerprint and binding metadata; avoid logging raw identifiers. (3) **Privacy policy:** Disclose that a hashed device identifier is used for license binding and link to your privacy policy. (4) **Data retention:** Define how long you keep binding and validation logs; allow key holders to request deletion of their binding data where applicable.
- **Recommendation:** Hash on the client (or in a trusted layer) and treat the fingerprint as a non-reversible binding token. Document this in the license/privacy docs and in this section.

### 3.5 Concurrent run limits (optional)

- **Goal:** Optionally limit “how many instances can run at once with this key” (e.g. to prevent one key from running 100 containers in a farm).
- **Mechanism:** Server could track “active” validations (e.g. heartbeat or last_validated_at plus a TTL) and reject new validations when the count per key exceeds a cap. Requires defining “active” (time window, heartbeat, or startup-only) and handling clock skew and restarts.
- **Trade-off:** Adds server and client complexity (heartbeats, cleanup of stale entries). For “one machine, many worktrees” we already allow unlimited validations from the **same** fingerprint; a concurrent limit would apply across **all** fingerprints bound to the key (or globally per key).
- **Recommendation:** Start without concurrent run limits; add only if you see abuse (e.g. one key running many instances on many machines). If you add them, document the definition of “concurrent” and the cap clearly.

### 3.6 Telemetry vs minimal data

- **Telemetry:** Sending product version, OS, Docker version, or validation frequency can help with support and abuse detection but increases data collection and privacy surface.
- **Minimal:** Send only what’s strictly necessary: license key (or hash), fingerprint (hash), and perhaps product id. No version, no IP (or only for rate limiting and then discard).
- **Recommendation:** Prefer minimal: key + fingerprint + product. Add optional, consent-based telemetry later if needed; do not require telemetry for validation to succeed. If you log IP for rate limiting, state retention and purpose in the privacy policy.

### 3.7 Shared CI runners (same fingerprint, many users)

- **Scenario:** Shared CI (e.g. GitHub Actions, GitLab CI, or an on-prem runner pool) often runs jobs on a **pool of machines**. Many different users’ jobs may run on the same runner; the runner (or Docker host) may have a single `machine-id`. So many users could end up with the **same** fingerprint.
- **With N = 1 binding:** The first key that validates from that runner “binds” the key to that fingerprint. Other keys validating from the same runner would be rejected (different key, same fingerprint — no conflict). But if the **same** key is used by multiple developers whose jobs land on the same runner, they would share the binding and all get valid: true (same key, same fingerprint). That might be acceptable for a team key; for “one key per user” it could look like sharing.
- **With N devices per key:** Similar: one of the N slots could be “consumed” by the CI runner fingerprint, leaving fewer for developers’ laptops.
- **Recommendation:** Document that CI runners may share a fingerprint across jobs/users. Options: (1) Allow it — one “device” can be the CI runner; (2) Provide a “CI only” or “headless” key type that does not bind to a fingerprint (higher abuse risk); (3) Use a dedicated fingerprint for CI (e.g. env `OPENTHROTTLE_FINGERPRINT=ci-<runner-id>`) so each runner is distinct and binding is predictable. Choose based on how you sell and support CI usage.

### 3.8 Binding strictness: one fingerprint vs 2–3 (e.g. laptop + desktop)

- **N = 1 (one fingerprint per key):** Strongest “no sharing” guarantee. One machine (or one Docker host) per key. Same machine can run many worktrees/containers. Drawback: Docker Desktop fingerprint changes, or laptop replacement, can lock the user out until re-bind or support.
- **N = 2 or 3:** Allows laptop + desktop, or laptop + desktop + CI, without sharing the key with strangers. Eases legitimate multi-device use and Docker Desktop reinstall scenarios. Slightly weaker against key sharing (e.g. two colleagues could each use one “slot”).
- **Recommendation:** **Start with N = 1** for simplicity and strictness. Add N = 2–3 (or a “replace device” flow) if support requests or legitimate multi-device use justify it. Document the policy clearly and mention Docker Desktop / VM fingerprint changes in the “re-bind or replace device” flow.
