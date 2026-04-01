import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Button } from './Button';
import { Calendar } from './Calendar';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

export interface DatePickerProps {
  readonly className?: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly value?: Date;
  readonly onSelect?: (date: Date | undefined) => void;
}

/**
 * @description Single-date picker composed of Popover and Calendar. Uses date-fns for formatting.
 */
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      className,
      disabled = false,
      onSelect,
      placeholder = 'Pick a date',
      value,
    },
    ref,
  ): React.ReactElement => {
    const [open, setOpen] = React.useState(false);
    const [internalDate, setInternalDate] = React.useState<Date | undefined>(
      value,
    );
    const date = value ?? internalDate;

    const handleSelect = React.useCallback(
      (selected: Date | undefined): void => {
        if (value === undefined) {
          setInternalDate(selected);
        }
        onSelect?.(selected);
        setOpen(false);
      },
      [onSelect, value],
    );

    return (
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild={true}>
          <Button
            className={cn(
              'w-[280px] justify-start text-left font-normal',
              !date && 'text-muted-foreground',
              className,
            )}
            data-empty={!date}
            disabled={disabled}
            ref={ref}
            variant="outline"
          >
            <CalendarIcon />
            {date ? format(date, 'PPP') : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" onSelect={handleSelect} selected={date} />
        </PopoverContent>
      </Popover>
    );
  },
);

DatePicker.displayName = 'DatePicker';
