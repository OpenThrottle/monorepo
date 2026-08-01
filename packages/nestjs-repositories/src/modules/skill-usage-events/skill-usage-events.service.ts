/**
 * @description Typed persistence for skill_usage_events — harness-captured
 * skill invocations (ours + third-party). Owns writes from the ingest mutation;
 * stores args exactly as the client sent them (already privacy-processed).
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  SKILL_USAGE_PRIVACY_LEVELS,
  SkillUsageEvent,
  type SkillUsagePrivacyLevel,
  type SkillUsageScope,
} from './skill-usage-events.entity';

/**
 * One skill-usage event to persist. Mirrors the Phase 1 JSONL shape; `args`
 * must already be privacy-processed by the client (server never re-expands).
 */
export interface RecordSkillUsageInput {
  readonly agentId?: string | null;
  readonly agentType?: string | null;
  readonly args?: string | null;
  readonly cwd?: string | null;
  readonly gitBranch?: string | null;
  readonly hookEventName?: string | null;
  readonly invocationPath?: string | null;
  readonly occurredAt: Date;
  readonly privacyLevel?: SkillUsagePrivacyLevel;
  readonly promptId?: string | null;
  readonly scope: SkillUsageScope;
  readonly sessionId?: string | null;
  readonly skillName: string;
  readonly toolUseId?: string | null;
}

@Injectable()
export class SkillUsageEventsService {
  constructor(
    @InjectRepository(SkillUsageEvent)
    private readonly eventsRepository: Repository<SkillUsageEvent>,
  ) {}

  /** The underlying repository, for read/aggregate access by consumers. */
  getRepository(): Repository<SkillUsageEvent> {
    return this.eventsRepository;
  }

  /**
   * Insert one skill-usage event. Args are stored as-sent (client privacy
   * seam already applied). Returns the saved row.
   */
  async recordSkillUsage(
    input: RecordSkillUsageInput,
  ): Promise<SkillUsageEvent> {
    const row = this.eventsRepository.create({
      agentId: input.agentId ?? null,
      agentType: input.agentType ?? null,
      args: input.args ?? null,
      cwd: input.cwd ?? null,
      gitBranch: input.gitBranch ?? null,
      hookEventName: input.hookEventName ?? null,
      invocationPath: input.invocationPath ?? null,
      occurredAt: input.occurredAt,
      privacyLevel: input.privacyLevel ?? SKILL_USAGE_PRIVACY_LEVELS.TRUNCATED,
      promptId: input.promptId ?? null,
      scope: input.scope,
      sessionId: input.sessionId ?? null,
      skillName: input.skillName,
      toolUseId: input.toolUseId ?? null,
    });

    return this.eventsRepository.save(row);
  }
}
