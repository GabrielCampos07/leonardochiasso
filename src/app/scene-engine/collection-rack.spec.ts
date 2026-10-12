import {
  FLOOR_Y,
  HANGER_BELOW_ORIGIN,
  hangerLocalY,
  rackBarTop,
  RACK_BAR_TOP,
  RACK_ROW_PITCH,
} from './collection-rack';

describe('rack label clearance', () => {
  it('keeps the top-row hanger name above the lower rail', () => {
    const labelWorldY = hangerLocalY(0) - HANGER_BELOW_ORIGIN;
    const lowerBarY = RACK_BAR_TOP - RACK_ROW_PITCH;
    expect(labelWorldY - lowerBarY).toBeGreaterThan(0.2);
  });

  it('keeps the lowest hanger of a 2-row and 3-row rack above the floor', () => {
    for (const rows of [2, 3]) {
      const barTop = rackBarTop(rows);
      const restY = hangerLocalY(rows - 1, barTop);
      const labelY = restY - HANGER_BELOW_ORIGIN;
      expect(labelY).toBeGreaterThan(FLOOR_Y + 0.04);
    }
  });
});
