import { hangerLocalY, RACK_BAR_TOP, RACK_ROW_PITCH } from './collection-rack';

describe('rack label clearance', () => {
  it('keeps the top-row hanger name above the lower rail', () => {
    const labelWorldY = hangerLocalY(0) - 0.2;
    const lowerBarY = RACK_BAR_TOP - RACK_ROW_PITCH;
    expect(labelWorldY - lowerBarY).toBeGreaterThan(0.24);
  });
});
