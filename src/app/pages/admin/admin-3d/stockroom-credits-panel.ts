import { AfterViewInit, Component, ElementRef, EventEmitter, OnDestroy, Output, ViewChild } from '@angular/core';
import { STOCKROOM_B_CREDITS, type StockroomCredit } from '../../../scene-engine/stockroom/stockroom-b-assets';
import { focusEditModal, listenDialogEscape } from './dialog-escape';

export const CREDITS_TITLE_ID = 'stockroom-credits-title';

const CC0_URL = 'https://creativecommons.org/publicdomain/zero/1.0/';

/** Kenney CC0 kits option B reuses for floor, walls, windows and rugs. No attribution required; listed anyway. */
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

/** Créditos screen for option B: every 3D model in the scene with author, source and licence. */
@Component({
  selector: 'lc-stockroom-credits-panel',
  standalone: true,
  templateUrl: './stockroom-credits-panel.html',
  styleUrl: './stockroom-credits-panel.scss',
})
export class StockroomCreditsPanel implements AfterViewInit, OnDestroy {
  @ViewChild('dialog') private dialogRef?: ElementRef<HTMLElement>;
  @Output() readonly close = new EventEmitter<void>();

  readonly titleId = CREDITS_TITLE_ID;
  readonly ccBy = STOCKROOM_B_CREDITS;
  readonly cc0 = STOCKROOM_B_CC0_SOURCES;
  private stopEscape: (() => void) | null = null;

  ngAfterViewInit(): void {
    this.stopEscape = listenDialogEscape(() => this.close.emit());
    focusEditModal(this.dialogRef?.nativeElement);
  }

  ngOnDestroy(): void {
    this.stopEscape?.();
    this.stopEscape = null;
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }
}
