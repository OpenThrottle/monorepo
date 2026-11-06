import {
  Badge,
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronRightIcon } from 'lucide-react';
import * as React from 'react';

import { TrajectoryClampedText } from '~/routing/evals/components/TrajectoryClampedText';
import { TrajectorySubagent } from '~/routing/evals/components/TrajectorySubagent';
import {
  TRAJECTORY_ARGUMENTS_PREVIEW_CHARS,
  TRAJECTORY_CLAMP_LINES,
} from '~/routing/evals/config/defaults';
import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import type { TrajectoryToolCallView } from '~/routing/evals/types';
import {
  formatTrajectoryArguments,
  formatTrajectoryArgumentsPreview,
} from '~/routing/evals/utils/formatters';
import { isErrorResult } from '~/routing/evals/utils/timeline';

export interface TrajectoryToolCallProps {
  readonly className?: string;
  readonly view: TrajectoryToolCallView;
}

/**
 * @description One tool call: its function name, its arguments (a one-line
 * preview, expandable to indented JSON), the result(s) that answered it
 * directly underneath, and any subagent it spawned. Error results carry a
 * destructive border and an Error badge; a call rebuilt from its result says so.
 */
export const TrajectoryToolCall = (
  props: TrajectoryToolCallProps,
): React.ReactElement => {
  const { className, view } = props;
  const { call, isError, isSynthesized, results, subagents } = view;

  // Hooks
  const [argsOpen, setArgsOpen] = React.useState(false);

  // Setup
  const copy = TRAJECTORY_TIMELINE_COPY;
  const preview = formatTrajectoryArgumentsPreview(
    call.arguments,
    TRAJECTORY_ARGUMENTS_PREVIEW_CHARS,
  );

  // Handlers

  // Markup
  const errorBadge = (
    <Badge color="red" data-testid="TrajectoryToolCallErrorBadge" size="xs">
      {copy.error}
    </Badge>
  );
  const synthesizedBadge = (
    <Badge color="slate" data-testid="TrajectoryToolCallSynthesized" size="xs">
      {copy.synthesized}
    </Badge>
  );
  const resultItems = results.map((result, index) => {
    const failed = isErrorResult(result);

    return (
      <div
        className={cn(
          'border-l-2 pl-3',
          failed ? 'border-destructive' : 'border-border',
        )}
        data-error={failed}
        data-testid="TrajectoryToolCallResult"
        key={`${result.source_call_id ?? 'result'}-${index}`}
      >
        <TrajectoryClampedText
          maxLines={TRAJECTORY_CLAMP_LINES}
          mono={true}
          text={result.content === '' ? copy.emptyResult : result.content}
        />
      </div>
    );
  });
  const argsPreview = (
    <code className="text-muted-foreground min-w-0 truncate font-mono text-xs">
      {preview}
    </code>
  );
  const noResult = (
    <p className="text-muted-foreground text-xs">{copy.noResult}</p>
  );
  const subagentItems = subagents.map((subagent, index) => {
    return (
      <TrajectorySubagent
        key={subagent.trajectory_id ?? `subagent-${index}`}
        subagent={subagent}
      />
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={cn(
        'bg-card flex flex-col gap-2 rounded-md border p-3',
        isError ? 'border-destructive/60' : 'border-card-border',
        className,
      )}
      data-testid="TrajectoryToolCall"
    >
      <div className="flex flex-wrap items-center gap-2">
        <code className="font-mono text-sm font-semibold">
          {call.function_name}
        </code>
        {isError ? errorBadge : null}
        {isSynthesized ? synthesizedBadge : null}
      </div>

      <Collapsible onOpenChange={setArgsOpen} open={argsOpen}>
        <div className="flex min-w-0 items-center gap-2">
          <CollapsibleTrigger asChild={true}>
            <Button
              className="shrink-0"
              size="xs"
              type="button"
              variant="ghost"
            >
              <ChevronRightIcon
                className={cn('transition-transform', argsOpen && 'rotate-90')}
              />
              {copy.arguments}
            </Button>
          </CollapsibleTrigger>
          {argsOpen ? null : argsPreview}
        </div>
        <CollapsibleContent className="pt-2">
          <TrajectoryClampedText
            className="bg-muted/40 rounded-md p-2"
            maxLines={TRAJECTORY_CLAMP_LINES * 2}
            mono={true}
            text={formatTrajectoryArguments(call.arguments)}
          />
        </CollapsibleContent>
      </Collapsible>

      {results.length > 0 ? resultItems : noResult}
      {subagentItems}
    </li>
  );
};
