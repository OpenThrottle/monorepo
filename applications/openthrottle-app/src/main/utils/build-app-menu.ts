import type { MenuItemConstructorOptions } from 'electron';

export interface BuildAppMenuOptions {
  readonly appName: string;
  /** Opens the connection screen; `undefined` hides the item (dev mode has no connection screen). */
  readonly changeServer: (() => void) | undefined;
  /** Adds Reload / Force Reload / Toggle DevTools to View; true only for an unpackaged run. */
  readonly isDev: boolean;
  readonly isMac: boolean;
}

/**
 * @description The application menu template: on macOS the standard app menu
 * roles (about, services, hide, quit), then File (with "Change Server…"), Edit,
 * View and Window roles. Reload and DevTools appear only when `isDev`, so a
 * packaged app cannot be pointed at DevTools from the menu. Edit roles stay:
 * without them copy and paste do not work in the connection screen's input.
 */
export const buildAppMenu = (
  options: BuildAppMenuOptions,
): MenuItemConstructorOptions[] => {
  const { appName, changeServer, isDev, isMac } = options;
  const serverItems: MenuItemConstructorOptions[] = [];
  const appMenu: MenuItemConstructorOptions[] = [];
  const devItems: MenuItemConstructorOptions[] = [];

  if (changeServer !== undefined) {
    serverItems.push(
      { click: changeServer, label: 'Change Server…' },
      { type: 'separator' },
    );
  }

  if (isMac) {
    appMenu.push({
      label: appName,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  if (isDev) {
    devItems.push(
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
    );
  }

  return [
    ...appMenu,
    {
      label: 'File',
      submenu: [...serverItems, isMac ? { role: 'close' } : { role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        ...devItems,
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }]),
      ],
    },
  ];
};
