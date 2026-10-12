import { rackWidth } from './collection-rack';
import { vitrineWidth } from './jewelry-vitrine';
import type { SceneUnitKind } from './types';

export const UNIT_GAP = 1.35;
export const DRAFT_UNIT_ID = '__draft__';
export const DRAFT_PLACEHOLDER_NAME = 'Nova coleção';

export function unitWidth(kind: SceneUnitKind, hangerCount = 0): number {
  return kind === 'vitrine' ? vitrineWidth(hangerCount) : rackWidth(hangerCount);
}

export function nextDraftSlot(
  units: ReadonlyArray<{ kind: SceneUnitKind; hangers: { length: number } }>,
  kind: SceneUnitKind,
): { x: number; width: number } {
  const width = unitWidth(kind, 0);
  let cursor = 0;
  for (const unit of units) {
    cursor += unitWidth(unit.kind, unit.hangers.length) + UNIT_GAP;
  }
  return { x: cursor + width / 2, width };
}
