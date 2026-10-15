/**
 * Which admin 3D scene to mount.
 * - `stockroom` (default): Sketchfab CC-BY stockroom (hangers on wall rails).
 *   `?sketchfab=1` and the retired `?cc0=1` land here too.
 * - `atelier` (`?atelier=1`): the previous atelier scene, the only one that runs below 1280 px.
 */
export type AdminSceneMode = 'atelier' | 'stockroom';

/** The stockroom is desktop-only. */
export const STOCKROOM_MIN_WIDTH = 1280;

export const STOCKROOM_HINT_GESTURE =
  'Clique na peça · arraste move · botão direito gira · scroll';
export const STOCKROOM_HINT_REORDER = 'segure a foto e solte sobre outra peça para reordenar';
export const STOCKROOM_HINT_COPY = `${STOCKROOM_HINT_GESTURE}\n${STOCKROOM_HINT_REORDER}`;

export const DESKTOP_ONLY_TITLE = 'Estoque 3D só no desktop';
export const DESKTOP_ONLY_HINT = `Abra numa janela com pelo menos ${STOCKROOM_MIN_WIDTH} px de largura, ou use a Lista.`;

function flagOn(value: string | null | undefined): boolean {
  return value === '1' || value === 'true';
}

export function adminSceneMode(params: { get(name: string): string | null }): AdminSceneMode {
  return flagOn(params.get('atelier')) ? 'atelier' : 'stockroom';
}

export function isStockroomMode(mode: AdminSceneMode): boolean {
  return mode === 'stockroom';
}

export function isDesktopOnlyBlocked(mode: AdminSceneMode, width: number): boolean {
  return isStockroomMode(mode) && width < STOCKROOM_MIN_WIDTH;
}

/** The stockroom ships CC-BY models, so it must offer the Créditos screen. */
export function sceneNeedsCredits(mode: AdminSceneMode): boolean {
  return isStockroomMode(mode);
}
