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

  it('keeps one Ordem salva toast when the same text is shown again', fakeAsync(() => {
    const toast = new ToastService();
    toast.success('Ordem salva');
    const id = toast.message()?.id;
    tick(1000);
    toast.success('Ordem salva');
    expect(toast.message()?.id).toBe(id);
    expect(toast.message()?.text).toBe('Ordem salva');
    tick(3199);
    expect(toast.message()?.text).toBe('Ordem salva');
    tick(2);
    expect(toast.message()).toBeNull();
  }));

  it('uses a new id when the toast text changes', fakeAsync(() => {
    const toast = new ToastService();
    toast.success('Ordem salva');
    const id = toast.message()?.id;
    toast.success('Ordem restaurada.');
    expect(toast.message()?.id).not.toBe(id);
    expect(toast.message()?.text).toBe('Ordem restaurada.');
  }));

  it('dismisses the default toast sooner than the save toast', fakeAsync(() => {
    const toast = new ToastService();
    toast.info('Ordem atualizada.');
    tick(3200);
    expect(toast.message()).toBeNull();
  }));

  it('keeps an undo action for 5s and runs it once', fakeAsync(() => {
    const toast = new ToastService();
    const run = jasmine.createSpy('restore');
    toast.success('Arquivado.', {
      durationMs: 5000,
      action: { label: 'Desfazer', run },
    });
    expect(toast.message()?.action?.label).toBe('Desfazer');
    tick(4999);
    expect(toast.message()?.text).toBe('Arquivado.');
    toast.runAction();
    expect(run).toHaveBeenCalled();
    expect(toast.message()).toBeNull();
  }));
});
