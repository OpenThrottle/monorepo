/**
 * @description HTTP client for openthrottle-server GraphQL. Used by the Plans tree and detail view to load plans and tasks.
 * Sends Authorization: Bearer <token> when getToken returns a value.
 * @see docs/INTEGRATION.md
 */

import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { executeGraphqlAtUrl } from './graphql/index.ts';
import {
  CreatePlanDocument,
  GetListDistinctCategoriesDocument,
  GetPlanDocument,
  GetPlansByStatusVsCodeDocument,
  GetTasksByPlanIdDocument,
  CreatePlanInput,
} from './__generated__/graphql.js';
import { UnauthenticatedError } from './errors.ts';
import { sortPlanTasksByListOrder } from './sort-plan-tasks-by-list-order.ts';

type GetToken = () => Promise<string | undefined>;

/**
 * @description Client for openthrottle-server GraphQL read operations (plans, tasks).
 */
export class OpenThrottleApiClient {
  private readonly graphqlUrl: string;

  constructor(
    baseUrl: string,
    private readonly getToken: GetToken,
  ) {
    const normalized = baseUrl.replace(/\/$/, '');
    this.graphqlUrl = `${normalized}/graphql`;
  }

  /**
   * @description Run a GraphQL operation with current token (if any). Throws {@link UnauthenticatedError} on 401 so callers can show login UI.
   */
  private async request<TData, TVariables extends Record<string, unknown>>(
    document: TypedDocumentNode<TData, TVariables>,
    variables?: TVariables,
  ): Promise<TData> {
    const token = await this.getToken();
    try {
      return await executeGraphqlAtUrl(this.graphqlUrl, document, variables, {
        token,
      });
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : String(error);

      if (message.includes(' 401') || message.includes('401 ')) {
        throw new UnauthenticatedError(message);
      }

      throw error;
    }
  }

  /**
   * @description Create a plan from the given input (title, author, category required).
   */
  async createPlan(input: CreatePlanInput) {
    const response = await this.request(CreatePlanDocument, { input });

    return response.createPlan;
  }

  /**
   * @description List distinct category values for plan creation/filters.
   */
  async listDistinctCategories() {
    const response = await this.request(GetListDistinctCategoriesDocument);

    return response.listDistinctCategories;
  }

  /**
   * @description List plans with optional status filter and pagination.
   */
  async listPlansByStatus(options?: {
    limit?: number;
    offset?: number;
    sortBy?: 'created' | 'updated';
    sortOrder?: 'asc' | 'desc';
    statuses?: string[] | null;
  }) {
    const input = {
      assignees: null,
      limit: options?.limit ?? 500,
      offset: options?.offset ?? 0,
      project: null,
      projectId: null,
      sortBy: options?.sortBy ?? 'updated',
      sortOrder: options?.sortOrder ?? 'desc',
      statuses: options?.statuses ?? null,
      titleSubstring: null,
    };

    const response = await this.request(GetPlansByStatusVsCodeDocument, {
      input,
    });

    return response.listPlansByStatus;
  }

  /**
   * @description Fetch a single plan by ID.
   */
  async plan(id: string) {
    const response = await this.request(GetPlanDocument, { id });

    return response.plan;
  }

  /**
   * @description List tasks for a plan.
   */
  async tasksByPlanId(planId: string) {
    const response = await this.request(GetTasksByPlanIdDocument, {
      input: { planId },
    });

    return sortPlanTasksByListOrder(response.tasksByPlanId);
  }
}
