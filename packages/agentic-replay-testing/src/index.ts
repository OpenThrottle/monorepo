export * from './config/config.backends.ts';
export * from './data/scenarios.ts';
export * from './types/scenario.ts';
export * from './types/transcript.ts';
export {
  buildFixtureText,
  type FixtureTextResult,
} from './utils/buildFixtureText.ts';
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
export { installReplayBin, type ReplayBin } from './utils/installReplayBin.ts';
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
  replayFixture,
  type ReplayFixtureOptions,
  type ReplayFixtureResult,
} from './utils/replay.ts';
export {
  compareOutbound,
  REPLAY_MISMATCH_EXIT_CODE,
  type ReplayBinOptions,
  type ReplayReport,
  runReplayBin,
  wasTerminated,
} from './utils/replay-bin.ts';
export { replayPaths } from './utils/replayPaths.ts';
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
export { parseTranscript, serializeTranscript } from './utils/transcript.ts';
