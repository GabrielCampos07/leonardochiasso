/** Close an edit modal with Esc even when the WebGL canvas still has focus. */
export function listenDialogEscape(close: () => void): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    close();
  };
  document.addEventListener('keydown', onKey, true);
  return () => document.removeEventListener('keydown', onKey, true);
}

export function focusEditModal(root: HTMLElement | null | undefined): void {
  if (!root) return;
  if (!root.hasAttribute('tabindex')) root.tabIndex = -1;
  queueMicrotask(() => root.focus({ preventScroll: true }));
}
