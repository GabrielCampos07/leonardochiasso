import { ComponentFixture, TestBed } from '@angular/core/testing';
import { STOCKROOM_B_CREDITS } from '../../../scene-engine/stockroom/stockroom-b-assets';
import { CREDITS_TITLE_ID, STOCKROOM_B_CC0_SOURCES, StockroomCreditsPanel } from './stockroom-credits-panel';

describe('StockroomCreditsPanel', () => {
  let fixture: ComponentFixture<StockroomCreditsPanel>;
  let closed: number;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StockroomCreditsPanel] }).compileComponents();
    fixture = TestBed.createComponent(StockroomCreditsPanel);
    closed = 0;
    fixture.componentInstance.close.subscribe(() => closed++);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('is a labelled modal dialog', () => {
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe(CREDITS_TITLE_ID);
    expect(fixture.nativeElement.querySelector(`#${CREDITS_TITLE_ID}`).textContent).toContain('Créditos');
  });

  it('lists every model with its author, source and licence links', () => {
    const all = [...STOCKROOM_B_CREDITS, ...STOCKROOM_B_CC0_SOURCES];
    const items = fixture.nativeElement.querySelectorAll('[data-credit]') as NodeListOf<HTMLElement>;
    expect(items.length).toBe(all.length);
    for (const credit of all) {
      const item = fixture.nativeElement.querySelector(`[data-credit="${credit.key}"]`) as HTMLElement;
      const hrefs = Array.from(item.querySelectorAll('a')).map((a) => a.getAttribute('href'));
      expect(hrefs).toEqual([credit.url, credit.authorUrl, credit.licenseUrl]);
      expect(item.textContent).toContain(credit.author);
      expect(item.textContent).toContain(credit.license);
    }
    for (const credit of STOCKROOM_B_CREDITS) {
      const item = fixture.nativeElement.querySelector(`[data-credit="${credit.key}"]`) as HTMLElement;
      expect(item.textContent).toContain('Modificado');
    }
  });

  it('closes on Escape, the close button and a backdrop click, not on a click inside', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toBe(1);
    (fixture.nativeElement.querySelector('.credits__close') as HTMLButtonElement).click();
    expect(closed).toBe(2);
    (fixture.nativeElement.querySelector('.credits__dialog') as HTMLElement).click();
    expect(closed).toBe(2);
    (fixture.nativeElement.querySelector('.credits') as HTMLElement).click();
    expect(closed).toBe(3);
  });

  it('hands focus back to the Créditos button when it closes', async () => {
    fixture.destroy();
    const button = document.createElement('button');
    button.textContent = 'Créditos';
    document.body.appendChild(button);
    try {
      for (const close of ['escape', 'backdrop', 'button'] as const) {
        const panel = TestBed.createComponent(StockroomCreditsPanel);
        panel.componentInstance.returnFocus = button;
        panel.componentInstance.close.subscribe(() => panel.destroy());
        panel.detectChanges();
        await Promise.resolve();
        const dialog = panel.nativeElement.querySelector('.credits__dialog') as HTMLElement;
        expect(document.activeElement).withContext(close).toBe(dialog);
        if (close === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        if (close === 'backdrop') (panel.nativeElement.querySelector('.credits') as HTMLElement).click();
        if (close === 'button') (panel.nativeElement.querySelector('.credits__close') as HTMLButtonElement).click();
        expect(document.activeElement).withContext(close).toBe(button);
      }
    } finally {
      button.remove();
    }
  });

  it('falls back to the element that had focus when it opened', async () => {
    fixture.destroy();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    try {
      const panel = TestBed.createComponent(StockroomCreditsPanel);
      panel.detectChanges();
      await Promise.resolve();
      expect(document.activeElement).not.toBe(opener);
      panel.destroy();
      expect(document.activeElement).toBe(opener);
    } finally {
      opener.remove();
    }
  });

  it('stops listening for Escape once destroyed', () => {
    fixture.destroy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closed).toBe(0);
  });
});
