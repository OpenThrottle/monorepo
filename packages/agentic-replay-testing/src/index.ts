export * from './config/config.backends.ts';
export * from './data/scenarios.ts';
export * from './types/scenario.ts';
export * from './types/transcript.ts';
export {
  type AcpNormalizer,
  type AcpNormalizerOptions,
  acpRedactKeys,
  createAcpNormalizer,
  redactHostCommands,
  redactMcpServers,
  stripMeta,
} from './utils/acp-normalize.ts';
export {
  type AcpReplayBinOptions,
  runAcpReplayBin,
  toLiveUuid,
} from './utils/acp-replay-bin.ts';
export { answerPermissions } from './utils/answerPermissions.ts';
export { buildAcpFixtureText } from './utils/buildAcpFixtureText.ts';
export {
  buildFixtureText,
  type FixtureTextResult,
} from './utils/buildFixtureText.ts';
export {
  type ChunkShape,
  chunkShape,
  compareChunkShapes,
  PARITY_FACETS,
  PARITY_TERMINALS,
  type ParityDifference,
  type ParityFacetsValue,
  type ParityTerminalsValue,
  type RetirementBlocker,
  type RetirementVerdict,
  retirementVerdict,
} from './utils/chunkParity.ts';
export {
  compareTranscripts,
  DRIFT_KINDS,
  type DriftFinding,
  type DriftKindsValue,
  stdoutShape,
  type TranscriptComparison,
} from './utils/compareTranscripts.ts';
export {
  advanceConversation,
  type ConversationState,
  driveScenarioTurn,
  type DriveScenarioTurnOptions,
  initialConversation,
} from './utils/drive-turn.ts';
export {
  type AcpReplayBin,
  installAcpReplayBin,
} from './utils/installAcpReplayBin.ts';
export { installReplayBin, type ReplayBin } from './utils/installReplayBin.ts';
export {
  prepareAcpReplay,
  type PreparedAcpReplay,
  replayAcpFixture,
  type ReplayAcpFixtureOptions,
  type ReplayAcpFixtureResult,
} from './utils/prepareAcpReplay.ts';
export {
  type PreparedReplay,
  prepareReplay,
  replayFixturePath,
  replaySessionStart,
} from './utils/prepareReplay.ts';
export {
  recordScenario,
  type RecordScenarioOptions,
  type RecordScenarioResult,
} from './utils/record.ts';
export {
  acpTranscriptStems,
  recordAcpScenario,
  type RecordAcpScenarioOptions,
  type RecordAcpScenarioResult,
} from './utils/recordAcp.ts';
export {
  replayFixture,
  type ReplayFixtureOptions,
  type ReplayFixtureResult,
} from './utils/replay.ts';
export {
  compareOutbound,
  describeMismatch,
  REPLAY_MISMATCH_EXIT_CODE,
  type ReplayBinOptions,
  type ReplayReport,
  runReplayBin,
  trapTermination,
  wasTerminated,
} from './utils/replay-bin.ts';
export { replayPaths } from './utils/replayPaths.ts';
export {
  type AcpRecordingShimOptions,
  runAcpRecordingShim,
} from './utils/runAcpRecordingShim.ts';
export {
  type RecordingShimOptions,
  runRecordingShim,
} from './utils/runRecordingShim.ts';
export {
  createSanitizer,
  DEFAULT_REDACT_KEYS,
  findSanitizerLeaks,
  type LeakCheckOptions,
  placeholderUuid,
  REDACTED,
  REDACTED_EMAIL,
  type Sanitizer,
  type SanitizerOptions,
  type SanitizerPath,
} from './utils/sanitizer.ts';
export {
  type ResolvedScenarioTurn,
  resolveScenarioTurn,
  type ScenarioMessage,
  scenarioRun,
  type ScenarioRunContext,
  transcriptStem,
} from './utils/scenarioRun.ts';
export {
  withBinEnv,
  withPathPrepended,
  writeNodeBin,
  type WriteNodeBinOptions,
  writePathAlias,
} from './utils/stub-bin.ts';
export {
  parseCliTranscript,
  parseTranscript,
  serializeTranscript,
} from './utils/transcript.ts';
