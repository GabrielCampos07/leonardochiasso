import type { RackPanProgress } from './rack-pan';
import type { SceneHanger, SceneLayout, SceneRack, SceneUnitKind } from './types';

export type HangerPickHandler = (slug: string) => void;
export type HangerHoverHandler = (
  slug: string | null,
  pointer?: { x: number; y: number },
) => void;
export type FocusChangeHandler = (id: string) => void;
export type FirstFrameHandler = () => void;
export type SceneCompleteHandler = () => void;
export type LoadProgressHandler = (loaded: number, total: number) => void;
export type DraftAnchorHandler = (point: { x: number; y: number } | null) => void;
export type EmptyUnitHandler = (rackId: string) => void;
export type PanChangeHandler = () => void;

/**
 * What `/admin/3d` drives. The default atelier (`SceneEngine`) and the option A
 * stockroom (`StockroomEngine`, `?cc0=1`) both satisfy it.
 */
export interface AtelierEngine {
  onClick(handler: HangerPickHandler): void;
  onHover(handler: HangerHoverHandler): void;
  onFocusChange(handler: FocusChangeHandler): void;
  onFirstFrame(handler: FirstFrameHandler): void;
  onSceneComplete(handler: SceneCompleteHandler): void;
  onLoadProgress(handler: LoadProgressHandler): void;
  onDraftAnchor(handler: DraftAnchorHandler): void;
  onEmptyUnit(handler: EmptyUnitHandler): void;
  onPanChange(handler: PanChangeHandler): void;

  start(): void;
  setLayout(layout: SceneLayout): void;
  resize(): void;
  refitToChrome(): void;
  dispose(): void;

  focusRack(id: string, immediate?: boolean): void;
  focusOverview(immediate?: boolean): void;
  focusHanger(slug: string, immediate?: boolean): boolean;

  panRack(delta: -1 | 1): boolean;
  canPan(delta: -1 | 1): boolean;
  rackPanState(): RackPanProgress;

  showDraft(kind: SceneUnitKind, name: string, immediate?: boolean): { x: number; y: number };
  setDraftName(name: string): void;
  clearDraft(immediate?: boolean): void;
  commitDraft(unit: SceneRack, immediate?: boolean): void;

  addHanger(next: SceneHanger, immediate?: boolean): void;
  updateHanger(next: SceneHanger): void;
  removeHanger(slug: string, immediate?: boolean): void;
  sinkUnit(id: string, immediate?: boolean): void;
  restoreUnit(unit: SceneRack): void;
}
