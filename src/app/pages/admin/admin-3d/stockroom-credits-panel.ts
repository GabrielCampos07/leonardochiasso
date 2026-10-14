import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { STOCKROOM_B_CREDITS, type StockroomCredit } from '../../../scene-engine/stockroom/stockroom-b-assets';
import { focusEditModal, listenDialogEscape } from './dialog-escape';

export const CREDITS_TITLE_ID = 'stockroom-credits-title';
export const RETURN_FOCUS_CLASS = 'is-return-focus';

/** Programmatic focus after a pointer close does not set :focus-visible; the class draws the ring. */
export function restoreOpenerFocus(el: HTMLElement): void {
  const clear = (): void => {
    el.classList.remove(RETURN_FOCUS_CLASS);
    el.removeEventListener('blur', clear);
  };
  el.addEventListener('blur', clear);
  el.classList.add(RETURN_FOCUS_CLASS);
  el.focus({ preventScroll: true });
}

const CC0_URL = 'https://creativecommons.org/publicdomain/zero/1.0/';

/** Kenney CC0 kits behind the floor, walls, windows and rugs. No attribution required; listed anyway. */
export const STOCKROOM_B_CC0_SOURCES: readonly StockroomCredit[] = [
  {
    key: 'kenney-furniture-kit',
    name: 'Furniture Kit (paredes, janelas, tapetes)',
    url: 'https://kenney.nl/assets/furniture-kit',
    author: 'Kenney',
    authorUrl: 'https://kenney.nl',
    license: 'CC0 1.0',
    licenseUrl: CC0_URL,
    modified: 'geometria comprimida (Meshopt), texturas WebP ≤ 512 px',
  },
  {
    key: 'kenney-mini-market',
    name: 'Mini Market (piso)',
    url: 'https://kenney.nl/assets/mini-market',
    author: 'Kenney',
    authorUrl: 'https://kenney.nl',
    license: 'CC0 1.0',
    licenseUrl: CC0_URL,
    modified: 'geometria comprimida (Meshopt), texturas WebP ≤ 512 px',
  },
];

/**
 * Créditos screen for the stockroom: every 3D model in the scene with author, source and licence.
 * Closes on ×, Esc or a backdrop click and hands focus back to `returnFocus` (the Créditos button).
 */
@Component({
  selector: 'lc-stockroom-credits-panel',
  standalone: true,
  templateUrl: './stockroom-credits-panel.html',
  styleUrl: './stockroom-credits-panel.scss',
})
export class StockroomCreditsPanel implements AfterViewInit, OnDestroy {
  @ViewChild('dialog') private dialogRef?: ElementRef<HTMLElement>;
  /** Focused again when the panel goes away; defaults to whatever had focus when it opened. */
  @Input() returnFocus: HTMLElement | null | undefined = null;
  @Output() readonly close = new EventEmitter<void>();

  readonly titleId = CREDITS_TITLE_ID;
  readonly ccBy = STOCKROOM_B_CREDITS;
  readonly cc0 = STOCKROOM_B_CC0_SOURCES;
  private stopEscape: (() => void) | null = null;
  private opener: HTMLElement | null = null;

  ngAfterViewInit(): void {
    const active = document.activeElement;
    this.opener = this.returnFocus ?? (active instanceof HTMLElement && active !== document.body ? active : null);
    this.stopEscape = listenDialogEscape(() => this.close.emit());
    focusEditModal(this.dialogRef?.nativeElement);
  }

  ngOnDestroy(): void {
    this.stopEscape?.();
    this.stopEscape = null;
    if (this.opener?.isConnected) restoreOpenerFocus(this.opener);
    this.opener = null;
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }
}
