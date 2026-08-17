import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';
import { toast, Toaster } from './Sonner';

const TOAST_TYPES = ['success', 'info', 'warning', 'error'] as const;

const meta = {
  component: Toaster,
  parameters: { controls: { disable: true } },
  title: 'Components/Sonner',
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * `Toaster` is the one component in the package that reads `next-themes`. There
 * is no `ThemeProvider` here — and there is none in the consuming apps either
 * (`openthrottle-developer` applies themes by writing `data-theme` and `.dark`
 * onto `<html>` directly), so `useTheme()` returns `system` in both. Sonner
 * therefore follows the OS setting rather than the workbench toolbar, while its
 * surface colors — which come from `--popover` / `--border` / `--radius` — do
 * track the toolbar. That split is faithful to production, not a workbench bug.
 */
export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Toaster />
      {TOAST_TYPES.map((type) => (
        <Button key={type} onClick={() => toast[type](`A ${type} toast`)}>
          {type}
        </Button>
      ))}
      <Button onClick={() => toast('A default toast')} variant="secondary">
        default
      </Button>
    </div>
  ),
};
