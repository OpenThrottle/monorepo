/**
 * @description Optional LLM-based refinement when rule routing confidence is below a threshold (feature-flagged via AGENTS_MCP_ROUTER_LLM_FALLBACK).
 */

import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AgentsMcpRouteDecision } from './agents-mcp-router';
import {
  buildAgentsMcpLlmRoutingSystemPrompt,
  messageContentToString,
  parseAgentsMcpLlmRoutingJson,
} from './agents-mcp-router-llm.parse';

export interface AgentsRouterModelSnapshot {
  readonly modelName: string;
  readonly modelProvider: 'ollama' | 'openai';
}

@Injectable()
export class AgentsMcpRouterLlmService {
  constructor(private readonly config: ConfigService) {}

  /**
   * @description Returns the configured router LLM provider and model name when env is set; null when heuristic-only routing applies.
   */
  getActiveRouterModelSnapshot(): AgentsRouterModelSnapshot | null {
    const openAiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (openAiKey) {
      const modelName =
        this.config.get<string>('AGENTS_MCP_ROUTER_LLM_OPENAI_MODEL')?.trim() ||
        'gpt-4o-mini';

      return { modelName, modelProvider: 'openai' };
    }

    const ollamaBase = this.config.get<string>('OLLAMA_BASE_URL')?.trim();

    if (ollamaBase) {
      const modelName =
        this.config.get<string>('AGENTS_MCP_ROUTER_LLM_OLLAMA_MODEL')?.trim() ||
        this.config.get<string>('OLLAMA_CHAT_MODEL')?.trim() ||
        'llama3.2';

      return { modelName, modelProvider: 'ollama' };
    }

    return null;
  }

  /**
   * @description True when env enables LLM fallback and `decision` is below the configured confidence threshold.
   */
  shouldAttemptLlmRefinement(decision: AgentsMcpRouteDecision): boolean {
    if (!this.isLlmFallbackEnabled()) {
      return false;
    }

    return decision.confidence < this.confidenceThreshold();
  }

  /**
   * @description Runs a single chat completion and parses a structured routing JSON payload; returns null on missing model config or parse/invoke failure.
   */
  async refineRoute(input: {
    readonly message: string;
  }): Promise<AgentsMcpRouteDecision | null> {
    const model = this.createChatModel();

    if (model == null) {
      return null;
    }

    const system = buildAgentsMcpLlmRoutingSystemPrompt();

    try {
      const response = await model.invoke([
        new SystemMessage(system),
        new HumanMessage(input.message),
      ]);
      const raw = messageContentToString(response.content);

      return parseAgentsMcpLlmRoutingJson(raw);
    } catch {
      return null;
    }
  }

  private isLlmFallbackEnabled(): boolean {
    const v = this.config
      .get<string>('AGENTS_MCP_ROUTER_LLM_FALLBACK')
      ?.trim()
      .toLowerCase();

    return v === 'true' || v === '1' || v === 'yes';
  }

  private confidenceThreshold(): number {
    const raw = this.config.get<string>(
      'AGENTS_MCP_ROUTER_LLM_CONFIDENCE_THRESHOLD',
    );
    const n =
      raw != null && raw.trim() !== '' ? Number.parseFloat(raw.trim()) : 0.55;

    if (!Number.isFinite(n)) {
      return 0.55;
    }

    return Math.min(1, Math.max(0, n));
  }

  private createChatModel(): ChatOpenAI | ChatOllama | null {
    const openAiKey = this.config.get<string>('OPENAI_API_KEY')?.trim();

    if (openAiKey) {
      const modelName =
        this.config.get<string>('AGENTS_MCP_ROUTER_LLM_OPENAI_MODEL')?.trim() ||
        'gpt-4o-mini';

      return new ChatOpenAI({
        apiKey: openAiKey,
        maxRetries: 0,
        model: modelName,
        temperature: 0,
      });
    }

    const ollamaBase = this.config.get<string>('OLLAMA_BASE_URL')?.trim();

    if (ollamaBase) {
      const model =
        this.config.get<string>('AGENTS_MCP_ROUTER_LLM_OLLAMA_MODEL')?.trim() ||
        this.config.get<string>('OLLAMA_CHAT_MODEL')?.trim() ||
        'llama3.2';

      return new ChatOllama({
        baseUrl: ollamaBase,
        model,
        temperature: 0,
      });
    }

    return null;
  }
}
