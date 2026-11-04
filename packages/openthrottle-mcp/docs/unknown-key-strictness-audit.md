# Unknown-key strictness audit

**Status:** closed by the `.strict()` sweep below. OT plan `90c09906`, task `ba728a66`.

## The instance

`list_plans_by_status` takes **`statuses`** (an array). Called with the singular
`status: "BLOCKED"` it returned **four PENDING plans** and `totalCount: 949`, and
reported success.

The resolver was fine. Zod object schemas strip unknown keys by default, so
`listPlansByStatusToolParameters.safeParse({ status: 'BLOCKED' })` succeeded with
`parsed.data === {}` and the tool ran as an unfiltered list. From the caller's side
that is **indistinguishable from a correct empty-filter call** — which is what makes
it worse than an error.

## The class

All 68 registered tool parameter schemas had the same hole. What differed was whether
the strip was _silent_ or merely _confusing_, and that is the ranking that matters —
not the count.

### Bucket A — silently widened a result set (12 tools)

These accepted `{}`, so every field was optional and **any** misnamed key vanished
with nothing left to complain about. The tool then ran unfiltered and returned a
superset while reporting success.

```
agent_conversation_list   get_skill_availability   list_plans_by_status   list_sources
auth_status               health                   list_skill_tags        list_tag_action_rules
discover_agent_clis       list_notes               discover_local_models  end_session
```

Worst of the worst is `list_plans_by_status` — the reported instance, and the tool
every agent triage ("what is blocked", "how big is the backlog") runs through. The
failure scales precisely with how much the caller trusts the answer.

Eight of these (`health`, `auth_status`, `discover_*`, `list_notes`, `list_sources`,
`list_skill_tags`, `list_tag_action_rules`) declare **no parameters at all**
(`z.object({})`). That reads as harmless and is not: a caller who believes they are
filtering — `list_notes({ planId })` — got every note back, successfully.

### Bucket B — silently dropped an intended write (mutations)

`create_*`, `update_*`, `upsert_*`, `record_artifact`, `add_*`/`remove_*`. These have
at least one required field, so a misnamed **required** field did fail — but for the
wrong reason ("Title is required", never "you wrote `titel`"), which sends the caller
looking in the wrong place.

The real hazard is the misnamed **optional** field. `update_plan` requires only `id`;
everything else is `nullish`. So:

```jsonc
update_plan({ "id": "…", "sumary": "new summary" })   // ← typo
```

validated clean, sent `{ id }` to the server, and returned the unchanged plan as a
success. The caller has every reason to believe the write landed.

### Bucket C — noise

None. The id-only getters (`get_plan`, `get_task`, `get_note`, `get_document`) were
already loud, because dropping the unknown key left the required `id` missing. That
is how this defect was originally noticed: `get_plan({ planId })` errors, and only
because `id` happens to be required.

## The fix

`.strict()` on all 68 exported `*ToolParameters`, at the **export site** in
`src/tools/*.ts` — not at a registration chokepoint. Three reasons:

1. `tool-registry.ts` (`defineTool`) and `nest/openthrottle-mcp-mcp-surface.ts`
   (`asMcpParameters`) both read the same exported constant, and `tool-registry.test.ts`
   asserts **reference identity** between them. Wrapping at either registration site
   would have created a second object and broken that parity — or required a memoizing
   wrapper, which is cleverness in place of a one-line change.
2. The handlers in `src/tools/*` each `safeParse` at the top for direct, in-process
   invocation (documented in the `tool-registry.ts` header). Strictness at the export
   site covers that path too; strictness at the registry would not.
3. The generated `*InputSchema()` functions are regenerated from the GraphQL schema.
   The `.strict()` call lives in hand-written code that _consumes_ them, so codegen
   cannot silently revert it.

`get_activity_by_date` is the one special case: it is `.refine()`d, and `.refine()`
returns a `ZodEffects` with no `.strict()` of its own, so the call goes **before**
the refine.

### The failure reaches the agent readable

Checked, because `runTool` sanitizes thrown errors by category and would have replaced
the key with "internal error" — the same sanitizer trap recorded at `plan-runs.ts:73`.
It does not apply here: the `safeParse` guard runs _before_ `runTool`, and
`invalidArgsContent` → `formatZodError` passes an `unrecognized_keys` issue's message
through verbatim (its `path` is empty, so the humanizing branches do not fire).

Both zod families in the package name the key:

```
zod v3 (generated *InputSchema)
  Invalid arguments: Unrecognized key(s) in object: 'status'

zod v4 (ad-hoc z.object)
  Invalid arguments: Invalid input: expected string, received undefined; Unrecognized key: "planId"
```

On the dispatch path the MCP SDK's `validateToolInput` throws an `McpError` carrying
the same zod message, and its `normalizeObjectSchema` returns a real `ZodObject`
unchanged — so the strict flag is not rebuilt away in transit.

### Advertised schema

`.strict()` also emits `additionalProperties: false` into each tool's published JSON
Schema. That is deliberate: a client that validates locally can now reject the typo
before a call is ever made.

## Guard against regression

`src/tool-registry.strict-parameters.test.ts` asserts the invariant over
`developerMcpToolDefinitions` rather than per tool, so a tool added later cannot
quietly reintroduce the hole. It checks three things per tool: the unknown key is
**rejected**, the rejection is an `unrecognized_keys` issue (not an unrelated failure
that happens to be red), and the message **names the offending key**.

## Deliberate leniency

None. Every tool is strict.

Forward-compatibility is the usual argument for leniency — a newer client sending a
field an older server does not know. It does not apply to this surface: the client is
an LLM agent reading the tool's own advertised schema, so an unknown key is
overwhelmingly a hallucinated or misremembered parameter name, and that is exactly the
case that should be loud. If a tool ever genuinely needs to tolerate extra keys, make
it the exception, in this file, with the reason.
