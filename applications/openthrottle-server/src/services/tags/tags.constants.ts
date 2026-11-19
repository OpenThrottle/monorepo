/**
 * @description Well-known name of the tagging service account whose writes are
 * classified `server-llm` (the predict/refine tagging jobs authenticate as it).
 * Bootstrapped by the tagging-jobs slice via the migrations 044/045 machinery.
 */
export const TAGGING_SERVICE_ACCOUNT_NAME = 'tagging';
