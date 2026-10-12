import { ADMIN_3D_TTFF_LOG, Admin3dBootService } from './admin-3d-boot.service';

describe('Admin3dBootService', () => {
  it('stays pending until the first scene frame', () => {
    const boot = new Admin3dBootService();
    boot.begin();
    expect(boot.ready()).toBeFalse();
    const ms = boot.markFirstFrame();
    expect(boot.ready()).toBeTrue();
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(boot.lastTtffMs()).toBe(ms);
    expect(boot.markFirstFrame()).toBe(ms);
  });

  it('logs time-to-first-frame once', () => {
    const boot = new Admin3dBootService();
    const info = spyOn(console, 'info');
    boot.begin();
    boot.markFirstFrame();
    boot.markFirstFrame();
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.calls.mostRecent().args[0])).toContain(ADMIN_3D_TTFF_LOG);
  });
});
