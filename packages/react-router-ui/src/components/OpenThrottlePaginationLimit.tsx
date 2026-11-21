import {
  cn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useNavigate } from 'react-router';

export interface OpenThrottlePaginationLimitProps {
  /** Builds the URL for a new page size; the caller decides which params survive (page resets to 1). */
  readonly buildHref: (limit: number) => string;
  readonly className?: string;
  /** Visible label, e.g. "Results per page". */
  readonly label: string;
  readonly limit: number;
  readonly options: readonly number[];
}

/**
 * @description Page-size select for a paginated list footer. Picking a size navigates to
 * `buildHref(size)`; a current limit outside `options` is still shown so the control never lies.
 * @public
 */
export const OpenThrottlePaginationLimit = (
  props: OpenThrottlePaginationLimitProps,
): React.ReactElement => {
  const { buildHref, className, label, limit, options } = props;

  // Hooks
  const navigate = useNavigate();

  // Setup
  const choices = options.includes(limit)
    ? options
    : [...options, limit].sort((a, b) => a - b);

  // Handlers
  const handleValueChange = (value: string): void => {
    const next = Number.parseInt(value, 10);

    if (Number.isNaN(next) || next === limit) {
      return;
    }

    void navigate(buildHref(next), { preventScrollReset: false });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn(
        'text-muted-foreground flex items-center gap-2 text-sm',
        className,
      )}
      data-testid="OpenThrottlePaginationLimit"
    >
      <span>{label}</span>
      <Select onValueChange={handleValueChange} value={String(limit)}>
        <SelectTrigger aria-label={label} className="h-8 w-20">
          <SelectValue>{limit}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {choices.map((option) => (
            <SelectItem key={option} value={String(option)}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
