import * as React from 'react';
import { cn } from '../utils/cn';
import { Badge } from './Badge';

export interface MultiSelectOption {
  readonly label: string;
  readonly value: string;
}

export interface MultiSelectProps {
  readonly className?: string;
  readonly onChange: (value: string[]) => void;
  readonly options: readonly MultiSelectOption[];
  readonly placeholder?: string;
  readonly value: readonly string[];
}

/**
 * @description Multi-select dropdown built on Select/DropdownMenu styling. Supports multiple selection with checkboxes; selected values shown as tags in the trigger.
 */
export const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (props, ref): React.JSX.Element => {
    const {
      className,
      onChange,
      options,
      placeholder = 'Select…',
      value,
    } = props;

    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const setRefs = React.useCallback(
      (el: HTMLDivElement | null): void => {
        (containerRef as React.RefObject<HTMLDivElement | null>).current = el;

        if (typeof ref === 'function') {
          ref(el);
        } else if (ref != null) {
          (ref as React.RefObject<HTMLDivElement | null>).current = el;
        }
      },
      [ref],
    );

    React.useEffect((): (() => void) | undefined => {
      const handleMouseDown = (event: MouseEvent): void => {
        const target = event.target as Node;
        if (
          containerRef.current != null &&
          !containerRef.current.contains(target)
        ) {
          setOpen(false);
        }
      };

      if (open) {
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
      }

      return undefined;
    }, [open]);

    const toggleOption = (optionValue: string): void => {
      const next = value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue];

      onChange(next);
    };

    const selectedOptions = options.filter((opt) => value.includes(opt.value));

    return (
      <div className={cn('relative', className)} ref={setRefs}>
        <button
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={placeholder}
          className={cn(
            'flex w-full flex-wrap items-center gap-2',
            'bg-background border-input border',
            'px-3 py-2 text-sm',
            'ring-offset-background rounded-md',
            'placeholder:text-muted-foreground',
            'focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          onClick={() => setOpen((prev) => !prev)}
          type="button"
        >
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <Badge
                className="truncate"
                // className="max-w-32 truncate"
                key={opt.value}
                variant="secondary"
              >
                {opt.label}
              </Badge>
            ))
          )}
        </button>
        {open && (
          <div
            className={cn(
              'bg-popover text-popover-foreground absolute top-full left-0 z-50 mt-1 max-h-96 min-w-32 overflow-auto rounded-md border p-1 shadow-md',
            )}
            role="listbox"
          >
            {options.map((opt) => {
              const selected = value.includes(opt.value);
              return (
                <div
                  aria-selected={selected}
                  className={cn(
                    'focus:bg-accent focus:text-accent-foreground relative flex cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    'hover:bg-accent hover:text-white',
                  )}
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  role="option"
                >
                  <span
                    aria-hidden={true}
                    className={cn(
                      'absolute left-2 flex h-4 w-4 items-center justify-center rounded border',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                  >
                    {selected ? (
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M5 12l5 5L19 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </span>
                  {opt.label}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  },
);

MultiSelect.displayName = 'MultiSelect';
