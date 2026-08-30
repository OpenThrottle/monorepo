export {
  removeManagedExcludeBlock,
  resolveGitExcludePath,
  writeManagedExcludeBlock,
} from './git-exclude.ts';
export {
  deleteLedger,
  ledgerPathForRepo,
  listLedgerPaths,
  readLedger,
  resolveLedgerDir,
  writeLedger,
} from './ledger.ts';
export { ensureMaterialized, teardown } from './materialize.ts';
export {
  PERSONAL_SKILLS_DIR_ENV,
  PERSONAL_SKILLS_ENABLED_ENV,
  resolvePersonalSkillsDir,
  resolvePersonalSkillsRoot,
} from './personal-skills-config.ts';
export type {
  EnsureMaterializedOptions,
  EnsureMaterializedResult,
  TeardownOptions,
} from './materialize.ts';
export {
  FOREIGN_SKILL_INJECTION_MODE,
  FOREIGN_SKILL_LEDGER_DIR_ENV,
  FOREIGN_SKILL_TARGET_DIRS,
  GIT_EXCLUDE_BEGIN_MARKER,
  GIT_EXCLUDE_END_MARKER,
  GIT_EXCLUDE_OWNER,
} from './types.ts';
export type {
  ForeignSkillInjectionMode,
  GitExcludeOwner,
  ForeignSkillLedger,
  ForeignSkillLedgerEntry,
} from './types.ts';
