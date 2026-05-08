import * as React from 'react';
import classnames from 'classnames';
import {
  Card,
  CardContent,
  CardHeader,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';

export interface PlanWorkflowConfigExecutionProps {}

export const PlanWorkflowConfigExecution = (
  _props: PlanWorkflowConfigExecutionProps,
) => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="mt-8">
      <CardHeader className="pb-2 mb-4">Layer 2 — Execution backend</CardHeader>
      <CardContent>
        <fieldset
          aria-labelledby="workflow-run-layer2-legend"
          className={classnames('space-y-4')}
          data-testid="PlanWorkflowConfigExecution"
          disabled={true} // FIXME: When we have runners remove this
        >
          <p className="text-muted-foreground text-xs">
            Maps to <code className="text-xs">workflow-ralph --backend</code> (
            <code className="text-xs">WORKFLOW_RALPH_BACKEND</code> /{' '}
            <code className="text-xs">.workflow-ralph.json</code>
            ). Today only <code className="text-xs">cursor</code> is
            implemented; this panel stays fixed until additional backends ship.
          </p>
          <div className="space-y-2">
            <Label htmlFor="workflow-run-backend">Runner</Label>
            <Select disabled={true} value="cursor">
              <SelectTrigger
                aria-label="Execution backend (stub)"
                className="max-w-md"
                id="workflow-run-backend"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cursor">Cursor (current)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
};
