import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PUBLIC_CONTACT_MAILTO } from '../../../core/brand-lines';
import { AdminSessionService } from '../../../core/admin-session.service';
import { LcFooter } from './footer';

describe('LcFooter public contact', () => {
  let fixture: ComponentFixture<LcFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcFooter],
      providers: [
        provideRouter([]),
        { provide: AdminSessionService, useValue: { isEnabled: () => false } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LcFooter);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('keeps Atendimento as mailto links with no phone, tel:, or WhatsApp', () => {
    const html = fixture.nativeElement.innerHTML as string;
    expect(html).not.toMatch(/tel:|wa\.me|whatsapp/i);
    expect(html).not.toContain('99999-0000');
    expect(html).not.toContain('(62)');

    const hrefs = [...fixture.nativeElement.querySelectorAll('a')].map(
      (a: HTMLAnchorElement) => a.getAttribute('href') ?? '',
    );
    expect(hrefs.some((href) => href === PUBLIC_CONTACT_MAILTO)).toBeTrue();
    for (const href of hrefs) {
      expect(href).not.toMatch(/tel:|wa\.me|whatsapp/i);
    }
  });
});
