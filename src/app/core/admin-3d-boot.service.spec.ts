import {
  ADMIN_3D_SCENE_COMPLETE_LOG,
  ADMIN_3D_TTFF_LOG,
  Admin3dBootService,
  hideStaticAtelierBoot,
  showStaticAtelierBoot,
} from './admin-3d-boot.service';

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

  it('does not paint the full-viewport overlay on begin (it covers the admin header)', () => {
    const bootEl = document.createElement('div');
    bootEl.id = 'lc-atelier-boot';
    document.body.appendChild(bootEl);
    const boot = new Admin3dBootService();
    boot.begin();
    expect(document.documentElement.classList.contains('lc-atelier-booting')).toBeFalse();
    expect(bootEl.classList.contains('is-on')).toBeFalse();
    expect(boot.ready()).toBeFalse();
    showStaticAtelierBoot();
    expect(bootEl.classList.contains('is-on')).toBeTrue();
    boot.markFirstFrame();
    expect(document.documentElement.classList.contains('lc-atelier-booting')).toBeFalse();
    expect(bootEl.classList.contains('is-on')).toBeFalse();
    hideStaticAtelierBoot();
    expect(bootEl.classList.contains('is-on')).toBeFalse();
    bootEl.remove();
  });

  it('logs scene-complete once after the first frame', () => {
    const boot = new Admin3dBootService();
    const info = spyOn(console, 'info');
    boot.begin();
    boot.markFirstFrame();
    const ms = boot.markSceneComplete();
    boot.markSceneComplete();
    expect(ms).toBeGreaterThanOrEqual(0);
    expect(info.calls.allArgs().some((args) => String(args[0]).includes(ADMIN_3D_SCENE_COMPLETE_LOG))).toBeTrue();
    expect(info.calls.allArgs().filter((args) => String(args[0]).includes(ADMIN_3D_SCENE_COMPLETE_LOG)).length).toBe(1);
  });
});
