/**
 * @description Shared types for the agent-assets semantic search route (`/agent-search`).
 * Normalizes DB (custom_prompt embeddings) and disk-fallback results into one row shape.
 */

/** Agent-asset prompt types surfaced by this search (subset of CustomPromptType). */
export const AGENT_ASSET_PROMPT_TYPES = [
  'skills',
  'rules',
  'personas',
] as const;

export type AgentAssetPromptType = (typeof AGENT_ASSET_PROMPT_TYPES)[number];

/** Tab values: an "all" tab plus one per prompt type. */
export const AGENT_SEARCH_TABS = [
  'all',
  'skills',
  'rules',
  'personas',
] as const;

export type AgentSearchTab = (typeof AGENT_SEARCH_TABS)[number];

/** Where a result came from: the DB semantic index or a live disk-scan fallback. */
export type AgentAssetResultSource = 'db' | 'disk';

/** Normalized result row rendered by AgentAssetCard (DB semantic or disk fallback). */
export interface AgentAssetResult {
  readonly content: string;
  /** Parent custom_prompt UUID; null for disk-fallback rows (not in the DB index). */
  readonly customPromptId: string | null;
  readonly description: string | null;
  readonly filePath: string | null;
  readonly id: string;
  readonly labels: readonly string[];
  readonly promptType: AgentAssetPromptType;
  /** Cosine similarity (0–1) for DB rows; null for disk keyword-ranked rows. */
  readonly similarity: number | null;
  readonly source: AgentAssetResultSource;
  readonly title: string;
}

/** Per-tab result counts for tab labels. */
export interface AgentSearchCounts {
  readonly all: number;
  readonly personas: number;
  readonly rules: number;
  readonly skills: number;
}
