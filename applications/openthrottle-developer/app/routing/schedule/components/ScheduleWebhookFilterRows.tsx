import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';

import type { ScheduleWebhookTriggerFragment } from '~/__generated__/graphql';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/data.copy';
import {
  WEBHOOK_FILTER_NO_VALUE_OPS,
  WEBHOOK_FILTER_OP,
  WEBHOOK_FILTER_OP_OPTIONS,
  WEBHOOK_LIMITS,
} from '~/routing/schedule/data/data.webhook';

export interface ScheduleWebhookFilterRowsProps {
  /** The saved filters to start from; empty on create. */
  readonly filters: ScheduleWebhookTriggerFragment['filters'];
}

interface FilterRow {
  readonly id: number;
  readonly op: string;
  readonly path: string;
  readonly value: string;
}

/**
 * @description The payload-filter editor: up to 16 rows of path, operator and value, all of which
 * must match for a delivery to run. Rows post as parallel `filterPath` / `filterOp` / `filterValue`
 * fields (a value is always posted, blank for exists / does-not-exist, so the columns stay aligned);
 * an `in` row takes comma-separated values. There is deliberately no regex operator.
 */
export const ScheduleWebhookFilterRows = (
  props: ScheduleWebhookFilterRowsProps,
): React.ReactElement => {
  const { filters } = props;

  // Hooks
  const nextId = React.useRef(filters.length);
  const [rows, setRows] = React.useState<FilterRow[]>(
    filters.map((filter, id) => ({
      id,
      op: filter.op,
      path: filter.path,
      value: filter.values?.join(', ') ?? filter.value ?? '',
    })),
  );

  // Setup
  const canAdd = rows.length < WEBHOOK_LIMITS.filtersMax;

  // Handlers
  const patchRow = (id: number, patch: Partial<FilterRow>): void => {
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };
  const addRow = (): void => {
    const id = nextId.current;
    nextId.current += 1;
    setRows((current) => [
      ...current,
      { id, op: WEBHOOK_FILTER_OP.equals, path: '', value: '' },
    ]);
  };
  const removeRow = (id: number): void => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <fieldset className="space-y-2" data-testid="ScheduleWebhookFilterRows">
      <legend className="text-sm font-medium">
        {SCHEDULE_WEBHOOK_COPY.filtersHeading}
      </legend>
      <p className="text-muted-foreground text-xs">
        {SCHEDULE_WEBHOOK_COPY.filterHelp}
      </p>

      {rows.map((row, index) => {
        const hasNoValue = WEBHOOK_FILTER_NO_VALUE_OPS.includes(row.op);
        const isIn = row.op === WEBHOOK_FILTER_OP.in;
        const valuePlaceholder = isIn
          ? SCHEDULE_WEBHOOK_COPY.filterValueInHelp
          : SCHEDULE_WEBHOOK_COPY.filterValueLabel;

        return (
          <div
            className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[2fr_1fr_2fr_auto]"
            key={row.id}
          >
            <Input
              aria-label={`${SCHEDULE_WEBHOOK_COPY.filterPathLabel} ${index + 1}`}
              name="filterPath"
              onChange={(event) =>
                patchRow(row.id, { path: event.target.value })
              }
              placeholder="pull_request.base.ref"
              value={row.path}
            />
            <Select
              name="filterOp"
              onValueChange={(op) => patchRow(row.id, { op })}
              value={row.op}
            >
              <SelectTrigger
                aria-label={`${SCHEDULE_WEBHOOK_COPY.filterOpLabel} ${index + 1}`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEBHOOK_FILTER_OP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              aria-label={`${SCHEDULE_WEBHOOK_COPY.filterValueLabel} ${index + 1}`}
              name="filterValue"
              onChange={(event) =>
                patchRow(row.id, { value: event.target.value })
              }
              placeholder={valuePlaceholder}
              readOnly={hasNoValue}
              value={hasNoValue ? '' : row.value}
            />
            <Button
              aria-label={`${SCHEDULE_WEBHOOK_COPY.filterRemove} ${index + 1}`}
              onClick={() => removeRow(row.id)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          </div>
        );
      })}

      <Button
        disabled={!canAdd}
        onClick={addRow}
        size="xs"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        {SCHEDULE_WEBHOOK_COPY.filterAdd}
      </Button>
    </fieldset>
  );
};
