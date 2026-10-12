import { focusEditModal, listenDialogEscape } from './dialog-escape';

describe('listenDialogEscape', () => {
  it('closes on Escape from the document even if the canvas has focus', () => {
    const close = jasmine.createSpy('close');
    const detach = listenDialogEscape(close);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);
    detach();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('focusEditModal', () => {
  it('moves tabindex and focus onto the modal root', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    focusEditModal(root);
    expect(root.tabIndex).toBe(-1);
    return Promise.resolve().then(() => {
      expect(document.activeElement).toBe(root);
      root.remove();
    });
  });
});
