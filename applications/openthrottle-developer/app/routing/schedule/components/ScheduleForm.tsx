import * as React from 'react';
import clsx from 'clsx';
import { Form, Link } from 'react-router';
import {
  Button,
  Input,
  InputCronExpression,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import { SCHEDULED_JOB_DRIVER_IDS } from '~/routing/schedule/data/data.drivers';
import { ScheduleMcpWarning } from '~/routing/schedule/components/ScheduleMcpWarning';
import { ScheduleRepositoryField } from '~/routing/schedule/components/ScheduleRepositoryField';
import type { DriverMcpOption } from '~/routing/schedule/data/data.driver-mcp';
import type { ScheduleRepositoryOption } from '~/routing/schedule/data/data.repositories';
import type { ScheduledAgentJobDetailQuery } from '~/__generated__/graphql';

type ScheduleDetail = NonNullable<
  ScheduledAgentJobDetailQuery['scheduledAgentJob']
>;

export interface ScheduleFormProps {
  action: 'create' | 'update';
  /** Available agent CLIs from discovery; drives the workspace-MCP advisory. */
  agentClis?: readonly DriverMcpOption[];
  className?: string;
  /** Action-level error to surface inline (validation / not-found). */
  error?: string;
  job?: ScheduleDetail;
  /** The caller's registered checkouts, for the repository picker. */
  repositories?: ScheduleRepositoryOption[];
}

export const ScheduleForm = (props: ScheduleFormProps): React.ReactElement => {
  const { action, agentClis, className, error, job, repositories } = props;

  // Hooks
  const initialDriverId = job?.driverId ?? SCHEDULED_JOB_DRIVER_IDS[0];
  const [driverId, setDriverId] = React.useState<string>(initialDriverId);

  // Setup
  const isCreate = action === 'create';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Form
      className={clsx('w-full max-w-2xl space-y-4', className)}
      data-testid="ScheduleForm"
      method="post"
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          defaultValue={job?.name}
          id="name"
          name="name"
          placeholder="Nightly dependency audit"
          required={true}
        />
      </div>

      <div>
        <Label htmlFor="cronPattern">Schedule (cron)</Label>
        <InputCronExpression
          defaultValue={job?.cronPattern}
          id="cronPattern"
          name="cronPattern"
          placeholder="0 9 * * *"
          required={true}
        />
      </div>

      <div>
        <Label htmlFor="prompt">Prompt</Label>
        <TextArea
          defaultValue={job?.prompt}
          id="prompt"
          name="prompt"
          placeholder="What should the agent do each run?"
          required={true}
          rows={6}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="driverId">Provider</Label>
          <select
            className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            defaultValue={initialDriverId}
            id="driverId"
            name="driverId"
            onChange={(event) => setDriverId(event.target.value)}
          >
            {SCHEDULED_JOB_DRIVER_IDS.map((driverId) => (
              <option key={driverId} value={driverId}>
                {driverId}
              </option>
            ))}
          </select>
          <ScheduleMcpWarning agentClis={agentClis} driverId={driverId} />
        </div>

        <div>
          <Label htmlFor="model">Model (optional)</Label>
          <Input
            defaultValue={job?.model ?? ''}
            id="model"
            name="model"
            placeholder="opus"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="timezone">Timezone (optional)</Label>
          <Input
            defaultValue={job?.timezone ?? ''}
            id="timezone"
            name="timezone"
            placeholder="America/Los_Angeles"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            IANA timezone; blank means UTC.
          </p>
        </div>
        <div>
          <Label htmlFor="timeoutMs">Timeout ms (optional)</Label>
          <Input
            defaultValue={job?.timeoutMs ?? ''}
            id="timeoutMs"
            name="timeoutMs"
            placeholder="900000"
            type="number"
          />
        </div>
      </div>

      <ScheduleRepositoryField
        cwd={job?.cwd ?? null}
        repositories={repositories ?? []}
        repositoryCheckoutId={job?.repositoryCheckoutId ?? null}
      />

      <div>
        <Label htmlFor="settingsJson">Settings JSON (optional)</Label>
        <TextArea
          defaultValue={
            job?.settingsJson && job.settingsJson !== '{}'
              ? job.settingsJson
              : ''
          }
          id="settingsJson"
          name="settingsJson"
          placeholder='{ "endpoint": { "baseUrl": "http://localhost:11434/v1" } }'
          rows={3}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Provider endpoint/worktree only. An API key here is rejected.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          defaultChecked={job?.enabled ?? true}
          name="enabled"
          type="checkbox"
          value="true"
        />
        Enabled
      </label>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3 pt-2">
        <Button type="submit">
          {isCreate ? 'Create schedule' : 'Save changes'}
        </Button>
        <Button asChild={true} variant="outline">
          <Link to="/schedule">Cancel</Link>
        </Button>
      </div>
    </Form>
  );
};
