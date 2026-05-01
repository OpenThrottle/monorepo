import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

// https://vercel.com/docs/projects/environment-variables/system-environment-variables#VERCEL
const isVercel = process.env.VERCEL === '1';

export default {
  future: {
    unstable_optimizeDeps: true,
  },
  presets: isVercel ? [vercelPreset()] : [],
  ssr: true,
} satisfies Config;
