import { PerspectiveCamera, Vector3 } from 'three';
import {
  PIECE_ZOOM_UPGRADE_DISTANCE,
  keepCursorWorldPoint,
  ndcFromClient,
  shouldClearPieceZoomUpgrade,
  shouldUpgradePieceFromZoom,
} from './cursor-zoom';

describe('cursor zoom', () => {
  it('maps a client point to NDC', () => {
    const ndc = ndcFromClient(50, 25, { left: 0, top: 0, width: 100, height: 100 });
    expect(ndc.x).toBeCloseTo(0, 5);
    expect(ndc.y).toBeCloseTo(0.5, 5);
  });

  it('upgrades a hanger only when the lens is close enough', () => {
    expect(shouldUpgradePieceFromZoom(PIECE_ZOOM_UPGRADE_DISTANCE, 'vestido-lg-bateau')).toBeTrue();
    expect(shouldUpgradePieceFromZoom(PIECE_ZOOM_UPGRADE_DISTANCE + 0.2, 'vestido-lg-bateau')).toBeFalse();
    expect(shouldUpgradePieceFromZoom(1.2, null)).toBeFalse();
  });

  it('clears the piece upgrade after zooming back out', () => {
    expect(shouldClearPieceZoomUpgrade(3, true)).toBeTrue();
    expect(shouldClearPieceZoomUpgrade(1.4, true)).toBeFalse();
    expect(shouldClearPieceZoomUpgrade(4, false)).toBeFalse();
  });

  it('slides the orbit target so a pinched zoom stays under the cursor', () => {
    const camera = new PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, 1.2, 4);
    camera.lookAt(0, 0.4, 0);
    camera.updateMatrixWorld();
    const target = new Vector3(0, 0.4, 0);
    const before = new Vector3(1.1, 0.4, 0);
    camera.position.set(0, 1.2, 2.6);
    camera.updateMatrixWorld();
    const moved = keepCursorWorldPoint(camera, target, { x: 0.55, y: 0 }, before);
    expect(moved).toBeTrue();
    expect(target.x).not.toBeCloseTo(0, 2);
  });
});
