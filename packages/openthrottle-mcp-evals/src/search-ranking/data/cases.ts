import type { SearchRankingCase, SearchTarget } from '../eval-case.ts';

const plan = (planId: string): SearchTarget => {
  return { kind: 'plan', planId };
};
const task = (taskId: string): SearchTarget => {
  return { kind: 'task', taskId };
};
const doc = (path: string): SearchTarget => {
  return { kind: 'documentation', path };
};

/**
 * @description The search-ranking cases, labelled against the primary OpenThrottle knowledge base on 2026-11-15
 * (1266 plans, 7099 tasks, 164 documentation rows). Identifier gold sets are every plan and task whose title,
 * summary or description contains the query verbatim; topic gold sets were picked by hand. Ids are stable —
 * reports key on them — so rename a case only by deleting it and adding a new one. Authoring rules:
 * ../README.md.
 */
export const SEARCH_RANKING_CASES: readonly SearchRankingCase[] = [
  // ── identifier: error strings, codes, env vars ─────────────────────────────
  {
    id: 'id-claim-plan-messages-input',
    kind: 'identifier',
    query: 'ClaimPlanMessagesInput',
    relevant: [plan('d158a5e1-9ed5-4f52-94ad-217d31df1ebd')],
    split: 'dev',
  },
  {
    id: 'id-use-body-parser',
    kind: 'identifier',
    query: 'useBodyParser',
    relevant: [task('82e4ed80-fae6-41f0-ae20-2ba23f540270')],
    split: 'dev',
  },
  {
    id: 'id-recursive-task-invocation',
    kind: 'identifier',
    query: 'Recursive task invocation',
    relevant: [task('ad6bb4c9-fe78-49e5-8e9a-0588dc14a6b4')],
    split: 'test',
  },
  {
    id: 'id-nx-shard-targets',
    kind: 'identifier',
    query: 'NX_SHARD_TARGETS',
    relevant: [plan('e3606c61-b72a-4fad-a475-4a8a4edbf4c9')],
    split: 'dev',
  },
  {
    id: 'id-embedding-models-dir',
    kind: 'identifier',
    query: 'EMBEDDING_MODELS_DIR',
    relevant: [
      task('89948848-fd8f-4d09-945f-41ac1e6e89bc'),
      task('9da61f42-1993-468c-a309-1d15d42a2c1f'),
      task('9d0861c5-e876-4c7d-b508-d48b1aa58629'),
    ],
    split: 'dev',
  },
  {
    id: 'id-ts1294',
    kind: 'identifier',
    query: 'TS1294',
    relevant: [
      plan('d510bf1b-741d-42b5-96ec-fbd3823fe468'),
      plan('e6571d31-ba6d-4b52-b212-ffdcb4691892'),
    ],
    split: 'dev',
  },
  {
    id: 'id-ts2835',
    kind: 'identifier',
    query: 'TS2835',
    relevant: [
      plan('37510d22-d756-4da3-8d78-9d5aa9af73b5'),
      plan('d96a657c-72ea-483e-97b2-b02f90c13b7b'),
      plan('92407327-a09f-47e9-8a22-cd3089588ebf'),
      plan('e6571d31-ba6d-4b52-b212-ffdcb4691892'),
    ],
    split: 'test',
  },
  {
    id: 'id-eval-human-labels',
    kind: 'identifier',
    query: 'eval_human_labels',
    relevant: [
      task('658bcb1d-258c-4bda-a70a-1f38fcc8c329'),
      task('2b6d1b4e-6e54-4146-bddf-0d4cac2d581f'),
      task('8b722906-956f-4725-b266-6d6133e613ca'),
      task('7acaeead-b33a-4a10-bc78-93d449a6c02c'),
      task('1daec916-8e2b-498c-bafe-9cec8b0ab6e3'),
    ],
    split: 'dev',
  },
  {
    id: 'id-strict-mcp-config',
    kind: 'identifier',
    query: '--strict-mcp-config',
    relevant: [
      plan('ebd394a1-de8a-4b28-8728-646919b3eaf0'),
      task('648a6779-f0cd-454c-b882-d3cce228de9b'),
      task('fa91f64f-bb04-4bf2-999c-baa811ca4aab'),
      task('359596a4-f3bf-43aa-8fc8-9b39124d1b78'),
    ],
    split: 'dev',
  },
  // ── identifier: file names ─────────────────────────────────────────────────
  {
    id: 'id-pnpm-workspace-state',
    kind: 'identifier',
    query: '.pnpm-workspace-state-v1.json',
    relevant: [task('c355af14-6f3f-4cdc-903f-1a5a999629f5')],
    split: 'dev',
  },
  {
    id: 'id-model-quantized-onnx',
    kind: 'identifier',
    query: 'model_quantized.onnx',
    relevant: [task('9da61f42-1993-468c-a309-1d15d42a2c1f')],
    split: 'dev',
  },
  {
    id: 'id-check-attribution-sh',
    kind: 'identifier',
    query: 'check-attribution.sh',
    relevant: [
      task('1484933c-b3ea-4f5d-b21c-a348786e79a7'),
      task('59cfcfe4-73d0-4d42-bb89-28c4fdd57fe9'),
      task('9035f02c-deed-4012-848e-576156e79d03'),
    ],
    split: 'test',
  },
  {
    id: 'id-esm-bundlers-doc',
    kind: 'identifier',
    query: 'esm-import-extensions-and-bundlers.md',
    relevant: [plan('960e3d71-ac40-4ba3-8ccd-01e05ba64daa')],
    split: 'dev',
  },
  {
    id: 'id-hook-primitive-shape-doc',
    kind: 'identifier',
    query: 'hook-primitive-shape.md',
    relevant: [task('0d04f979-e533-49b6-94de-e25ce5756def')],
    split: 'dev',
  },
  {
    id: 'id-attribution-guard-layers-doc',
    kind: 'identifier',
    query: 'attribution-guard-layers.md',
    relevant: [
      plan('40838811-e230-4c3b-a36a-04029792ddd4'),
      task('b696769d-4dea-4ee0-a799-551a869379aa'),
      task('72f6ec1f-6548-4b4c-b947-9a37e928a105'),
      task('f82202b9-9582-4c83-867e-b5cbc79cc322'),
      task('bec6a9d9-4cd0-420e-8de9-c0de4742ed02'),
    ],
    split: 'dev',
  },
  {
    id: 'id-google-cloud-doc',
    kind: 'identifier',
    query: 'Google-Cloud.md',
    relevant: [doc('monorepo/Google-Cloud.md')],
    split: 'dev',
  },
  // ── identifier: short plan ids cited by other plans ────────────────────────
  {
    id: 'id-short-0f0528ff',
    kind: 'identifier',
    query: '0f0528ff',
    relevant: [
      plan('01b63487-63c3-48ea-9938-9924aa765af1'),
      task('e2bd670f-6096-4a76-aade-a601c34b5c82'),
    ],
    split: 'dev',
  },
  {
    id: 'id-short-f058bb18',
    kind: 'identifier',
    query: 'f058bb18',
    relevant: [plan('af00f30f-575d-41b4-954e-2768706cce46')],
    split: 'test',
  },
  {
    id: 'id-short-18e16dfc',
    kind: 'identifier',
    query: '18e16dfc',
    relevant: [
      plan('9807f277-c9ec-4a0c-963a-f38116dab908'),
      task('9c7ef6aa-f738-4cd0-8a5f-b0987c0d0995'),
    ],
    split: 'dev',
  },
  // ── topic ──────────────────────────────────────────────────────────────────
  {
    id: 'topic-electron-desktop-app',
    kind: 'topic',
    query: 'electron desktop app that wraps the developer UI',
    relevant: [plan('24f3510f-6cc5-4f70-a01d-62ddbbdb3f94')],
    split: 'dev',
  },
  {
    id: 'topic-voice-input',
    kind: 'topic',
    query: 'dictate prompts by voice with a local speech-to-text model',
    relevant: [plan('197756b3-2ccb-49f2-9933-916f5b6bd4f9')],
    split: 'dev',
  },
  {
    id: 'topic-branch-name-overflow',
    kind: 'topic',
    query: 'a long branch name breaks the checkout picker layout',
    relevant: [plan('098096ff-1634-46e6-aa4e-8ca0271b24bc')],
    split: 'test',
  },
  {
    id: 'topic-nx-upgrade',
    kind: 'topic',
    query: 'upgrade Nx to the next major version',
    relevant: [plan('e3606c61-b72a-4fad-a475-4a8a4edbf4c9')],
    split: 'dev',
  },
  {
    id: 'topic-remove-gemini-driver',
    kind: 'topic',
    query: 'remove the Gemini CLI driver now that Antigravity replaces it',
    relevant: [plan('98e6be73-519b-42fa-9f36-67b534dc6cc3')],
    split: 'dev',
  },
  {
    id: 'topic-worktree-deleted-mid-run',
    kind: 'topic',
    query: `something deleted the worktree while the loop was still running in it`,
    relevant: [plan('8ebe13d4-91c7-4d0c-88e9-bb79ab1e0abc')],
    split: 'dev',
  },
  {
    id: 'topic-default-editor-agent',
    kind: 'topic',
    query: 'let users pick their default editor and default agent model',
    relevant: [plan('0da997f8-6746-466e-a8e0-54f8afccd543')],
    split: 'test',
  },
  {
    id: 'topic-scheduled-run-skips',
    kind: 'topic',
    query: `scheduled runs silently do nothing because there was nothing to run`,
    relevant: [plan('bcbb52a3-4206-4bb6-adf1-072ac5e04217')],
    split: 'dev',
  },
  {
    id: 'topic-chat-history-sidebar',
    kind: 'topic',
    query: 'keep chat conversations and list them in a sidebar',
    relevant: [plan('16c97e11-3b90-404e-95d1-ca42310e92df')],
    split: 'dev',
  },
  {
    id: 'topic-mcp-connection-drops',
    kind: 'topic',
    query: 'the stdio MCP server keeps disconnecting from the agent',
    relevant: [plan('7a58fe80-bb52-4ee0-8a6b-ed373266ea22')],
    split: 'dev',
  },
  {
    id: 'topic-embeddings-reliability',
    kind: 'topic',
    query: `embeddings are silently skipped; make them durable with a queue and a reconciler`,
    relevant: [plan('165e86ef-df13-4f12-869a-1c4723054e73')],
    split: 'dev',
  },
  {
    id: 'topic-phone-access',
    kind: 'topic',
    query: 'use OpenThrottle from my phone',
    relevant: [plan('fb96d4e4-04ca-429e-a3f9-ee01cdafc82b')],
    split: 'test',
  },
  {
    id: 'topic-standalone-install',
    kind: 'topic',
    query: `ship the desktop app with the server, Postgres and Redis bundled in`,
    relevant: [plan('4bec3d8e-9219-4867-a84c-df7b44aee490')],
    split: 'dev',
  },
  {
    id: 'topic-semver-releases',
    kind: 'topic',
    query: 'semantic versioning and release PRs for the applications',
    relevant: [plan('36d1ca31-0ca0-4c95-a612-e368b0e0929f')],
    split: 'dev',
  },
  {
    id: 'topic-eval-system',
    kind: 'topic',
    query: 'record agent trajectories and grade them with calibrated judges',
    relevant: [plan('af00f30f-575d-41b4-954e-2768706cce46')],
    split: 'dev',
  },
  {
    id: 'topic-plan-run-stuck-in-progress',
    kind: 'topic',
    query: 'a plan run that cannot make progress is left stuck in progress',
    relevant: [plan('d08a979b-dd25-4659-860f-c80f0819fb17')],
    split: 'test',
  },
  {
    id: 'topic-cross-repo-projects',
    kind: 'topic',
    query: `group plans across several repositories into one ordered initiative`,
    relevant: [plan('e013cc75-2792-4c06-b4ce-f9174980f692')],
    split: 'dev',
  },
  {
    id: 'topic-brand-palette-doc',
    kind: 'topic',
    query: 'which colors does the developer UI brand use',
    relevant: [doc('openthrottle/brand-palette.md')],
    split: 'dev',
  },
  {
    id: 'topic-compose-topology-doc',
    kind: 'topic',
    query: 'docker compose layout options for running OpenThrottle locally',
    relevant: [doc('openthrottle/compose-topology-phase-1.md')],
    split: 'dev',
  },
];
