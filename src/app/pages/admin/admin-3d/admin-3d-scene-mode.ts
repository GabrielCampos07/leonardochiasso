/**
 * Which admin 3D scene to mount.
 * - `atelier` (default): the current atelier scene.
 * - `cc0` (`?cc0=1`): option A, Kenney CC0 stockroom.
 * - `sketchfab` (`?sketchfab=1`): option B, pending the Sketchfab token.
 */
export type AdminSceneMode = 'atelier' | 'cc0' | 'sketchfab';

/** Options A/B are desktop-only. */
export const STOCKROOM_MIN_WIDTH = 1280;

export const STOCKROOM_HINT_COPY = 'Clique na caixa · arraste move · botão direito gira · scroll';

export const DESKTOP_ONLY_TITLE = 'Estoque 3D só no desktop';
export const DESKTOP_ONLY_HINT = `Abra numa janela com pelo menos ${STOCKROOM_MIN_WIDTH} px de largura, ou use a Lista.`;

export const SKETCHFAB_PENDING_TITLE = 'Opção B ainda não disponível';
export const SKETCHFAB_PENDING_HINT =
  'A cena com modelos Sketchfab (CC-BY) aguarda o token de download. Use ?cc0=1 para a opção A.';

function flagOn(value: string | null | undefined): boolean {
  return value === '1' || value === 'true';
}

export function adminSceneMode(params: { get(name: string): string | null }): AdminSceneMode {
  if (flagOn(params.get('cc0'))) return 'cc0';
  if (flagOn(params.get('sketchfab'))) return 'sketchfab';
  return 'atelier';
}

export function isDesktopOnlyBlocked(mode: AdminSceneMode, width: number): boolean {
  return mode !== 'atelier' && width < STOCKROOM_MIN_WIDTH;
}
