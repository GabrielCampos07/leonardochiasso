import { OVERVIEW_FOCUS_ID } from './camera-guide';
import { hangerInVisibleWindow } from './rack-pan';
import { DRAFT_UNIT_ID } from './unit-layout';
import type { SceneLayout } from './types';

/**
 * Pieces that may swap from the ~30KB `thumb` to the full `pdp-*` photo.
 * Overview / draft stay on thumbs. A focused rack upgrades the framed window;
 * a focused piece upgrades that hanger and its immediate neighbors.
 */
export function inFocusUpgradeSlugs(
  layout: SceneLayout,
  focusedId: string,
  focusedHangerSlug: string | null,
  rackPanX = 0,
): string[] {
  if (focusedId === OVERVIEW_FOCUS_ID || focusedId === DRAFT_UNIT_ID) return [];
  const unit = layout.racks.find((rack) => rack.id === focusedId);
  if (!unit) return [];
  if (focusedHangerSlug) {
    const index = unit.hangers.findIndex((hanger) => hanger.slug === focusedHangerSlug);
    if (index < 0) return [focusedHangerSlug];
    return [unit.hangers[index - 1], unit.hangers[index], unit.hangers[index + 1]]
      .filter(Boolean)
      .map((hanger) => hanger!.slug);
  }
  return unit.hangers
    .filter((_, index) => hangerInVisibleWindow(index, unit.hangers.length, rackPanX))
    .map((hanger) => hanger.slug);
}
