import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO } from '../../core/brand-lines';
import { ChromeService } from '../../core/chrome.service';
import { LegalPage, LegalPageSlug } from './legal';

describe('LegalPage public contact', () => {
  let fixture: ComponentFixture<LegalPage>;
  const page$ = new BehaviorSubject(convertToParamMap({ page: 'privacidade' }));

  beforeEach(async () => {
    page$.next(convertToParamMap({ page: 'privacidade' }));
    await TestBed.configureTestingModule({
      imports: [LegalPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: page$ } },
        { provide: ChromeService, useValue: { setActive: () => undefined } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LegalPage);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  function show(page: LegalPageSlug): string {
    page$.next(convertToParamMap({ page }));
    fixture.detectChanges();
    return fixture.nativeElement.innerHTML as string;
  }

  it('uses the public mailto on privacidade and never a phone or WhatsApp', () => {
    const html = show('privacidade');
    const link = fixture.nativeElement.querySelector(
      `a[href="${PUBLIC_CONTACT_MAILTO}"]`,
    ) as HTMLAnchorElement | null;
    expect(link).withContext('privacy contact mailto').not.toBeNull();
    expect(link?.textContent?.trim()).toBe(PUBLIC_CONTACT_EMAIL);
    expect(html).not.toMatch(/tel:|wa\.me|whatsapp/i);
    expect(html).not.toContain('99999-0000');
  });

  it('leaves termos and cookies without tel:, wa.me, or WhatsApp', () => {
    for (const page of ['termos', 'cookies'] as const) {
      const html = show(page);
      expect(html).withContext(page).not.toMatch(/tel:|wa\.me|whatsapp/i);
      expect(html).withContext(page).not.toContain('99999-0000');
    }
  });
});
