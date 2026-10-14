import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PUBLIC_CONTACT_EMAIL, PUBLIC_CONTACT_MAILTO } from '../../../core/brand-lines';
import { ChromeService } from '../../../core/chrome.service';
import { WishlistService } from '../../../core/wishlist.service';
import { LcUtility } from './utility';

describe('LcUtility public contact', () => {
  let fixture: ComponentFixture<LcUtility>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcUtility],
      providers: [
        provideRouter([]),
        { provide: ChromeService, useValue: { navCollapsed: () => false, toggleMobile: () => undefined } },
        { provide: WishlistService, useValue: { count: () => 0 } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LcUtility);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows the atelier e-mail as a mailto link and never a phone number', () => {
    const link = fixture.nativeElement.querySelector('.utility__contact') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe(PUBLIC_CONTACT_MAILTO);
    expect(link.textContent).toContain(PUBLIC_CONTACT_EMAIL);
    expect(link.textContent).not.toContain('99999-0000');
    expect(link.textContent).not.toContain('(62)');
    expect(fixture.nativeElement.querySelector('.utility__phone')).toBeNull();
    expect(fixture.nativeElement.querySelector('.utility__email')?.textContent?.trim()).toBe(
      PUBLIC_CONTACT_EMAIL,
    );
  });
});
