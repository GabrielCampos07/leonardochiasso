/**
 * Which admin 3D scene to mount.
 * - `atelier` (default): the current atelier scene.
 * - `cc0` (`?cc0=1`): option A, Kenney CC0 stockroom (boxes on bookcases).
 * - `sketchfab` (`?sketchfab=1`): option B, Sketchfab CC-BY stockroom (hangers on wall rails).
 */
export type AdminSceneMode = 'atelier' | 'cc0' | 'sketchfab';

/** Options A/B are desktop-only. */
export const STOCKROOM_MIN_WIDTH = 1280;

export const STOCKROOM_HINT_COPY = 'Clique na caixa · arraste move · botão direito gira · scroll';
export const STOCKROOM_B_HINT_COPY = 'Clique na peça · arraste move · botão direito gira · scroll';

export const DESKTOP_ONLY_TITLE = 'Estoque 3D só no desktop';
export const DESKTOP_ONLY_HINT = `Abra numa janela com pelo menos ${STOCKROOM_MIN_WIDTH} px de largura, ou use a Lista.`;

function flagOn(value: string | null | undefined): boolean {
  return value === '1' || value === 'true';
}

export function adminSceneMode(params: { get(name: string): string | null }): AdminSceneMode {
  if (flagOn(params.get('cc0'))) return 'cc0';
  if (flagOn(params.get('sketchfab'))) return 'sketchfab';
  return 'atelier';
}

export function isStockroomMode(mode: AdminSceneMode): boolean {
  return mode !== 'atelier';
}

export function isDesktopOnlyBlocked(mode: AdminSceneMode, width: number): boolean {
  return isStockroomMode(mode) && width < STOCKROOM_MIN_WIDTH;
}

/** Option B ships CC-BY models, so it must offer the Créditos screen. */
export function sceneNeedsCredits(mode: AdminSceneMode): boolean {
  return mode === 'sketchfab';
}
