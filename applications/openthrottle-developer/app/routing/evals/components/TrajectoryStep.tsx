import {
  Badge,
  Button,
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { BrainIcon, ChevronRightIcon } from 'lucide-react';
import * as React from 'react';

import { TrajectoryClampedText } from '~/routing/evals/components/TrajectoryClampedText';
import { TrajectorySubagent } from '~/routing/evals/components/TrajectorySubagent';
import { TrajectoryToolCall } from '~/routing/evals/components/TrajectoryToolCall';
import {
  TRAJECTORY_CLAMP_LINES,
  TRAJECTORY_PROMPT_CLAMP_LINES,
} from '~/routing/evals/config/defaults';
import { TRAJECTORY_TIMELINE_COPY } from '~/routing/evals/data/data.copy';
import {
  STEP_SOURCE_BADGE_COLOR,
  STEP_SOURCE_LABEL,
} from '~/routing/evals/data/data.step-source';
import type { TrajectoryStepView } from '~/routing/evals/types';

export interface TrajectoryStepProps {
  readonly className?: string;
  readonly view: TrajectoryStepView;
}

/**
 * @description One ATIF step: who spoke (agent / user / system, labelled and
 * muted for non-agent turns), the message (a user prompt collapses past a few
 * lines), the agent's reasoning collapsed by default, each tool call with its
 * result underneath, and any subagent a hand-back names so it can be expanded
 * at the turn it arrived. `content-visibility: auto` lets the browser skip
 * layout and paint for steps scrolled out of view.
 */
export const TrajectoryStep = (
  props: TrajectoryStepProps,
): React.ReactElement => {
  const { className, view } = props;
  const { linkedSubagents, step, toolCalls, unmatchedResults } = view;

  // Hooks
  const [reasoningOpen, setReasoningOpen] = React.useState(false);

  // Setup
  const copy = TRAJECTORY_TIMELINE_COPY;
  const isAgent = step.source === 'agent';
  const isUser = step.source === 'user';
  const maxLines = isUser
    ? TRAJECTORY_PROMPT_CLAMP_LINES
    : TRAJECTORY_CLAMP_LINES;
  const reasoning = step.reasoning_content ?? '';
  const hasMessage = step.message.trim() !== '';
  const hasCalls = toolCalls.length > 0;
  const sourceLabel = STEP_SOURCE_LABEL[step.source];

  // Handlers

  // Markup
  const message = (
    <TrajectoryClampedText
      maxLines={maxLines}
      mono={false}
      text={step.message}
    />
  );
  const model = (
    <span className="text-muted-foreground">{step.model_name}</span>
  );
  const emptyMessage = (
    <p className="text-muted-foreground text-xs italic">{copy.emptyMessage}</p>
  );
  const reasoningBlock = (
    <Collapsible onOpenChange={setReasoningOpen} open={reasoningOpen}>
      <CollapsibleTrigger asChild={true}>
        <Button size="xs" type="button" variant="ghost">
          <ChevronRightIcon
            className={cn('transition-transform', reasoningOpen && 'rotate-90')}
          />
          <BrainIcon />
          {copy.reasoning}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="text-muted-foreground pt-1 pl-2">
        <TrajectoryClampedText
          maxLines={TRAJECTORY_CLAMP_LINES}
          mono={false}
          text={reasoning}
        />
      </CollapsibleContent>
    </Collapsible>
  );
  const calls = (
    <ol className="flex flex-col gap-2">
      {toolCalls.map((callView, index) => {
        return (
          <TrajectoryToolCall
            key={`${callView.call.tool_call_id}-${index}`}
            view={callView}
          />
        );
      })}
    </ol>
  );
  const unmatched = (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-xs">{copy.unmatchedResults}</p>
      {unmatchedResults.map((result, index) => {
        return (
          <TrajectoryClampedText
            key={`${result.source_call_id ?? 'unmatched'}-${index}`}
            maxLines={TRAJECTORY_CLAMP_LINES}
            mono={true}
            text={result.content}
          />
        );
      })}
    </div>
  );
  const linked = (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground text-xs">{copy.handBackSubagent}</p>
      {linkedSubagents.map((subagent, index) => {
        return (
          <TrajectorySubagent
            key={subagent.trajectory_id ?? `linked-subagent-${index}`}
            subagent={subagent}
          />
        );
      })}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={cn(
        'flex flex-col gap-2 border-b py-4 [contain-intrinsic-size:auto_160px] [content-visibility:auto] last:border-b-0',
        !isAgent && 'bg-muted/40 text-muted-foreground -mx-2 rounded-md px-2',
        className,
      )}
      data-source={step.source}
      data-testid="TrajectoryStep"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground font-mono tabular-nums">
          {`${copy.step} ${step.step_id}`}
        </span>
        <Badge
          aria-label={sourceLabel}
          color={STEP_SOURCE_BADGE_COLOR[step.source]}
          data-testid="TrajectoryStepSource"
          size="xs"
        >
          {sourceLabel}
        </Badge>
        {step.model_name ? model : null}
      </div>

      {hasMessage ? message : null}
      {!hasMessage && !hasCalls ? emptyMessage : null}
      {reasoning.trim() === '' ? null : reasoningBlock}
      {hasCalls ? calls : null}
      {unmatchedResults.length > 0 ? unmatched : null}
      {linkedSubagents.length > 0 ? linked : null}
    </li>
  );
};
