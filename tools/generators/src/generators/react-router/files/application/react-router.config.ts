import type { Config } from '@react-router/dev/config';
import { vercelPreset } from '@vercel/react-router/vite';

// https://vercel.com/docs/projects/environment-variables/system-environment-variables#VERCEL
const isVercel = process.env.VERCEL === '1';

export default {
  future: {
    unstable_optimizeDeps: true,
    v8_middleware: true,
    v8_passThroughRequests: true,
    v8_splitRouteModules: true,
    v8_trailingSlashAwareDataRequests: true,
    v8_viteEnvironmentApi: true,
  },
  presets: isVercel ? [vercelPreset()] : [],
  ssr: true,
} satisfies Config;
