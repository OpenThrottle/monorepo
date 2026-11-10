import type {
  DriverModelLister,
  LoopTask,
  ModelRoutingPolicy,
  RouteTaskModelResult,
} from '../contract/index.ts';
import { routeTaskModel } from './route-task-model.ts';

export interface CreateModelRouterOptions {
  /** The driver's `discoverModels` listing; called once per router. */
  readonly discoverModels: DriverModelLister;
  readonly policy: ModelRoutingPolicy;
  /** The run's configured model; the honest fallback. */
  readonly runModel: string | undefined;
}

export interface ModelRouter {
  /** Plugs into `LoopDeps.modelFor`: the model passed to the driver and recorded on the session. */
  readonly modelFor: (task: LoopTask) => string | undefined;
  readonly route: (task: LoopTask) => RouteTaskModelResult;
}

/**
 * @description Discovers the driver's models once, then routes every task from that snapshot. A
 * failed discovery counts as "no models listed" and falls back to the run's model.
 * @public
 */
export const createModelRouter = async (
  options: CreateModelRouterOptions,
): Promise<ModelRouter> => {
  const { discoverModels, policy, runModel } = options;
  let driverModels: readonly string[];

  try {
    driverModels = await discoverModels();
  } catch {
    driverModels = [];
  }

  const route = (task: LoopTask): RouteTaskModelResult => {
    return routeTaskModel({
      category: task.category,
      driverModels,
      policy,
      runModel,
    });
  };

  return {
    modelFor: (task) => route(task).model,
    route,
  };
};
