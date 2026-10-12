import { fakeAsync, tick } from '@angular/core/testing';
import { SAVE_TOAST_MS, ToastService } from './toast.service';

describe('ToastService', () => {
  it('keeps Salvo. on screen for about 4s', fakeAsync(() => {
    const toast = new ToastService();
    toast.success('Salvo.', { durationMs: SAVE_TOAST_MS });
    expect(toast.message()?.text).toBe('Salvo.');
    tick(3999);
    expect(toast.message()?.text).toBe('Salvo.');
    tick(2);
    expect(toast.message()).toBeNull();
  }));

  it('dismisses the default toast sooner than the save toast', fakeAsync(() => {
    const toast = new ToastService();
    toast.info('Ordem atualizada.');
    tick(3200);
    expect(toast.message()).toBeNull();
  }));
});
