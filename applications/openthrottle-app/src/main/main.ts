import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DESKTOP_DEEP_LINK_PROTOCOL,
  findDeepLink,
  toPlanRoute,
} from '@openthrottle/openthrottle-desktop-bridge';
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  Notification,
  screen,
  session,
  shell,
} from 'electron';

import type {
  SaveServerResult,
  ShellSettings,
} from '../bridge/types/shell-bridge.ts';
import { buildWindowOptions } from './buildWindowOptions.ts';
import {
  DEFAULT_OT_SERVER_URL,
  SERVER_START_TIMEOUT_MS,
} from './data/data.server-env.ts';
import { PROBE_TIMEOUT_MS, SETTINGS_FILE_NAME } from './data/data.settings.ts';
import {
  MIN_VISIBLE_PIXELS,
  WINDOW_STATE_FILE_NAME,
  WINDOW_STATE_SAVE_DELAY_MS,
} from './data/data.window-state.ts';
import { createDeepLinkRouter } from './desktop/createDeepLinkRouter.ts';
import { createNativeNotifier } from './desktop/createNativeNotifier.ts';
import { decideProtocolRegistration } from './desktop/decideProtocolRegistration.ts';
import { registerDesktopIpc } from './desktop/registerDesktopIpc.ts';
import { createGuardedSessionProvider } from './security/createGuardedSessionProvider.ts';
import {
  installSessionGuards,
  installWebContentsGuards,
} from './security/install-security-guards.ts';
import type { ServerSupervisor } from './server/createServerSupervisor.ts';
import { createServerSupervisor } from './server/createServerSupervisor.ts';
import { forkServerChild } from './server/forkServerChild.ts';
import { probeOrigin } from './server/probeOrigin.ts';
import type { ProbeOtServerResult } from './server/probeOtServer.ts';
import { probeOtServer } from './server/probeOtServer.ts';
import { createSettingsStore } from './settings/createSettingsStore.ts';
import { registerShellIpc } from './shell/registerShellIpc.ts';
import { buildAppMenu } from './utils/buildAppMenu.ts';
import { buildErrorPageUrl } from './utils/buildErrorPageUrl.ts';
import { buildPartitionName } from './utils/buildPartitionName.ts';
import { buildServerEnv } from './utils/buildServerEnv.ts';
import { decideStart } from './utils/decideStart.ts';
import { normalizeServerUrl } from './utils/normalizeServerUrl.ts';
import { resolveAppMode } from './utils/resolveAppMode.ts';
import { resolveDeveloperBuildDir } from './utils/resolveDeveloperBuildDir.ts';
import type { WindowState } from './window-state/createWindowStateStore.ts';
import { createWindowStateStore } from './window-state/createWindowStateStore.ts';
import { isBoundsVisible } from './window-state/isBoundsVisible.ts';

// electron-vite emits the main bundle and the server entry to out/main and the
// preload bundle to out/preload; the preload is CommonJS because a sandboxed
// preload cannot be ESM.
const MAIN_DIR = dirname(fileURLToPath(import.meta.url));
const PRELOAD_PATH = join(MAIN_DIR, '../preload/preload.cjs');
const SERVER_ENTRY_PATH = join(MAIN_DIR, 'server.js');

const mode = resolveAppMode({ env: process.env, isPackaged: app.isPackaged });
// out/main -> out/renderer: the connection screen, loaded with loadFile.
const SHELL_HTML_PATH = join(MAIN_DIR, '../renderer/index.html');
const SHELL_URL = pathToFileURL(SHELL_HTML_PATH).href;

let mainWindow: BrowserWindow | undefined;
// What mainWindow is showing; supervisor callbacks only touch an app window.
let windowKind: 'app' | 'connect' | 'dev' = 'app';
let supervisor: ServerSupervisor | undefined;
// The one origin the window may load in-app. The embedded origin changes (new
// port) after the supervisor's automatic restart, so the guards read it live.
let appOrigin: string | undefined;
// What the connection screen shows on its next getSettings call.
let connectionContext: ShellSettings = {
  notice: undefined,
  serverUrl: DEFAULT_OT_SERVER_URL,
};

const getAllowedOrigins = (): readonly string[] => {
  return appOrigin === undefined ? [] : [appOrigin];
};

// Permission handlers are per session: every partition goes through here.
const getGuardedSession = createGuardedSessionProvider({
  fromPartition: (partition) => session.fromPartition(partition),
  install: (partitionSession) => {
    installSessionGuards(partitionSession, { getAllowedOrigins });
  },
});

const getSettingsStore = (): ReturnType<typeof createSettingsStore> => {
  return createSettingsStore({
    filePath: join(app.getPath('userData'), SETTINGS_FILE_NAME),
    fs: {
      mkdir: async (path) => {
        await mkdir(path, { recursive: true });
      },
      readFile: (path) => readFile(path, 'utf8'),
      rename,
      writeFile: (path, contents) => writeFile(path, contents, 'utf8'),
    },
    tempSuffix: String(process.pid),
  });
};

const probe = (serverUrl: string): Promise<ProbeOtServerResult> => {
  return probeOtServer(serverUrl, {
    fetch: (url, init) => fetch(url, init),
    timeoutMs: PROBE_TIMEOUT_MS,
  });
};

const showError = async (reason: string): Promise<void> => {
  if (windowKind === 'app') {
    await mainWindow?.loadURL(buildErrorPageUrl(reason));
  }
};

const startEmbeddedServer = async (
  serverUrl: string,
  window: BrowserWindow,
): Promise<string | undefined> => {
  const env = buildServerEnv({
    buildDir: resolveDeveloperBuildDir({
      env: process.env,
      isPackaged: app.isPackaged,
      mainDir: MAIN_DIR,
    }),
    inherited: process.env,
    serverUrl,
    workspaceRoot: process.env['WORKSPACE_ROOT'],
  });

  supervisor = createServerSupervisor({
    fork: () => forkServerChild(SERVER_ENTRY_PATH, env),
    onFatal: (reason) => {
      void showError(reason);
    },
    onRestart: (origin) => {
      appOrigin = origin;

      if (windowKind === 'app') {
        void window.loadURL(origin);
      }
    },
    probe: (origin) => {
      return probeOrigin(origin, {
        fetch: (url, init) => fetch(url, init),
        intervalMs: 250,
        now: () => Date.now(),
        sleep: (ms) => new Promise((done) => setTimeout(done, ms)),
        timeoutMs: SERVER_START_TIMEOUT_MS,
      });
    },
    startTimeoutMs: SERVER_START_TIMEOUT_MS,
  });

  const result = await supervisor.start();

  if (result.ok) {
    appOrigin = result.origin;

    return result.origin;
  }

  await showError(result.reason);

  return undefined;
};

const getWindowStateStore = (): ReturnType<typeof createWindowStateStore> => {
  return createWindowStateStore({
    filePath: join(app.getPath('userData'), WINDOW_STATE_FILE_NAME),
    fs: {
      mkdir: (path) => {
        mkdirSync(path, { recursive: true });
      },
      readFile: (path) => readFileSync(path, 'utf8'),
      rename: renameSync,
      writeFile: (path, contents) => {
        writeFileSync(path, contents, 'utf8');
      },
    },
    tempSuffix: String(process.pid),
  });
};

// Saved bounds are restored only while they are still on a connected display.
const readRestorableWindowState = (): WindowState | undefined => {
  const saved = getWindowStateStore().read();
  const workAreas = screen.getAllDisplays().map((display) => display.workArea);

  if (saved === undefined) {
    return undefined;
  }

  return isBoundsVisible(saved.bounds, workAreas, MIN_VISIBLE_PIXELS)
    ? saved
    : undefined;
};

// Persists the app window's bounds: debounced while it moves or resizes, and
// synchronously when it closes (the process may be about to exit).
const trackWindowState = (window: BrowserWindow): void => {
  let timer: NodeJS.Timeout | undefined;

  const save = (): void => {
    clearTimeout(timer);

    if (window.isDestroyed()) {
      return;
    }

    getWindowStateStore().write({
      bounds: window.getNormalBounds(),
      isMaximized: window.isMaximized(),
    });
  };
  const schedule = (): void => {
    clearTimeout(timer);
    timer = setTimeout(save, WINDOW_STATE_SAVE_DELAY_MS);
  };

  window.on('move', schedule);
  window.on('resize', schedule);
  window.on('close', save);
};

// Focuses the window and, for a validated route, navigates it on the current
// app origin. Shared by deep links and native-notification clicks; with no
// route, or on the connection screen / error page (no app origin), it only
// focuses.
const openRoute = (route: string | undefined): void => {
  const window = mainWindow;

  if (window === undefined) {
    return;
  }

  if (window.isMinimized()) {
    window.restore();
  }

  window.show();
  window.focus();

  if (
    route !== undefined &&
    appOrigin !== undefined &&
    windowKind !== 'connect'
  ) {
    void window.loadURL(`${appOrigin}${route}`);
  }
};

const deepLinkRouter = createDeepLinkRouter({ openRoute });

// Creates the window and retires the previous one only afterwards, so the
// app never has zero windows (which would fire window-all-closed and quit).
const openWindow = (
  kind: 'app' | 'connect' | 'dev',
  partition: string | undefined,
): BrowserWindow => {
  if (partition !== undefined) {
    getGuardedSession(partition);
  }

  const state = kind === 'connect' ? undefined : readRestorableWindowState();
  const window = new BrowserWindow(
    buildWindowOptions(PRELOAD_PATH, partition, state?.bounds),
  );
  const previous = mainWindow;

  if (kind !== 'connect') {
    if (state?.isMaximized === true) {
      window.maximize();
    }

    trackWindowState(window);
  }

  mainWindow = window;
  windowKind = kind;

  window.once('closed', () => {
    if (mainWindow === window) {
      mainWindow = undefined;
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  previous?.close();

  return window;
};

// Switching servers: retire the old child, start one with the new
// API_URL_INTERNAL, and open the app on that origin's own partition. A server
// used before gets its partition (and session cookies) back.
const openApp = async (serverUrl: string): Promise<void> => {
  supervisor?.stop();
  supervisor = undefined;
  appOrigin = undefined;

  const window = openWindow('app', buildPartitionName(serverUrl));
  const origin = await startEmbeddedServer(serverUrl, window);

  if (origin !== undefined) {
    await window.loadURL(origin);
  }
};

const showConnectionScreen = async (context: ShellSettings): Promise<void> => {
  connectionContext = context;

  await openWindow('connect', undefined).loadFile(SHELL_HTML_PATH);
};

const changeServer = async (): Promise<void> => {
  const { serverUrl } = await getSettingsStore().read();

  await showConnectionScreen({
    notice: undefined,
    serverUrl: serverUrl ?? DEFAULT_OT_SERVER_URL,
  });
};

const saveServer = async (serverUrl: string): Promise<SaveServerResult> => {
  const result = await probe(serverUrl);

  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  const written = await getSettingsStore().write({ serverUrl });

  if (!written.ok) {
    return { ok: false, reason: `Could not save settings: ${written.reason}` };
  }

  // After this handler resolves: openApp replaces the window that invoked it.
  setImmediate(() => {
    void openApp(serverUrl);
  });

  return { ok: true, url: serverUrl };
};

const createWindow = async (): Promise<void> => {
  if (mode.kind === 'dev') {
    const devWindow = openWindow('dev', undefined);

    appOrigin = new URL(mode.url).origin;
    await devWindow.loadURL(mode.url);

    return;
  }

  const envUrl = normalizeServerUrl(process.env['OPENTHROTTLE_SERVER_URL']);
  const { serverUrl } = await getSettingsStore().read();
  const decision = await decideStart({
    defaultUrl: DEFAULT_OT_SERVER_URL,
    envUrl: envUrl.ok ? envUrl.url : undefined,
    probe,
    settingsUrl: serverUrl,
  });

  if (decision.kind === 'app') {
    await openApp(decision.serverUrl);

    return;
  }

  await showConnectionScreen({
    notice: decision.notice,
    serverUrl: decision.prefill,
  });
};

const start = async (): Promise<void> => {
  await app.whenReady();

  installWebContentsGuards({
    app,
    getAllowedOrigins,
    openExternal: (url) => {
      void shell.openExternal(url);
    },
  });
  installSessionGuards(session.defaultSession, { getAllowedOrigins });

  registerShellIpc({
    getSettings: () => Promise.resolve(connectionContext),
    ipcMain,
    probe,
    save: saveServer,
    shellUrl: SHELL_URL,
  });

  registerDesktopIpc({
    getAppOrigin: () => appOrigin,
    ipcMain,
    notify: createNativeNotifier({
      createNotification: (options) => {
        const notification = new Notification(options);

        return {
          onClick: (listener) => {
            notification.on('click', listener);
          },
          onClose: (listener) => {
            notification.on('close', listener);
          },
          show: () => {
            notification.show();
          },
        };
      },
      isSupported: () => Notification.isSupported(),
      isWindowFocused: () => mainWindow?.isFocused() === true,
      onActivate: (link) => {
        openRoute(link === undefined ? undefined : toPlanRoute(link));
      },
    }),
    openExternal: (url) => {
      void shell.openExternal(url);
    },
    platform: process.platform,
    version: app.getVersion(),
  });

  const registration = decideProtocolRegistration({
    argv: process.argv,
    defaultApp: process.defaultApp === true,
    execPath: process.execPath,
    isMac: process.platform === 'darwin',
    isPackaged: app.isPackaged,
  });

  if (registration.kind === 'register') {
    app.setAsDefaultProtocolClient(
      DESKTOP_DEEP_LINK_PROTOCOL,
      registration.execPath,
      [...registration.args],
    );
  }

  const openChangeServer = (): void => {
    void changeServer();
  };
  const isDev = mode.kind === 'dev';

  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      buildAppMenu({
        appName: app.name,
        changeServer: isDev ? undefined : openChangeServer,
        isDev: !app.isPackaged,
        isMac: process.platform === 'darwin',
      }),
    ),
  );

  // Windows/Linux launch the app with the link in argv (macOS uses open-url).
  const launchLink = findDeepLink(process.argv);

  if (launchLink !== undefined) {
    deepLinkRouter.handle(launchLink);
  }

  await createWindow();
  deepLinkRouter.markReady();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // macOS delivers links here, possibly before `ready`; the router queues them.
  app.on('open-url', (event, url) => {
    event.preventDefault();
    deepLinkRouter.handle(url);
  });

  app.on('second-instance', (_event, argv) => {
    const link = findDeepLink(argv);

    if (link === undefined) {
      openRoute(undefined);
    } else {
      deepLinkRouter.handle(link);
    }
  });

  app.on('before-quit', () => {
    supervisor?.stop();
  });

  app.on('window-all-closed', () => {
    supervisor?.stop();

    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  void start();
}
