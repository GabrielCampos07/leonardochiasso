import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Admin3dBootService, showStaticAtelierBoot } from '../../core/admin-3d-boot.service';
import { AdminSessionService } from '../../core/admin-session.service';
import { ROUTES } from '../../core/routes';
import { AdminShell } from './admin-shell';

describe('AdminShell', () => {
  let fixture: ComponentFixture<AdminShell>;
  let boot: Admin3dBootService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminShell],
      providers: [
        provideRouter([
          { path: 'admin/3d', children: [] },
          { path: 'admin/produtos', children: [] },
        ]),
        {
          provide: AdminSessionService,
          useValue: {
            isLoggedIn: signal(true),
            logout: () => undefined,
          },
        },
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    await router.navigateByUrl(ROUTES.admin3d);
    boot = TestBed.inject(Admin3dBootService);
    fixture = TestBed.createComponent(AdminShell);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.documentElement.classList.remove('lc-atelier-booting');
    document.getElementById('lc-atelier-boot')?.remove();
  });

  it('opens Abrir o site in a new tab', () => {
    const link = fixture.nativeElement.querySelector('.admin-bar__nav a[href="/"]') as HTMLAnchorElement | null;
    expect(link?.textContent?.trim()).toBe('Abrir o site');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener');
  });

  it('keeps the admin header visible while Montando o ateliê… is showing', () => {
    expect(boot.ready()).toBeFalse();
    expect(fixture.componentInstance.showSceneBoot()).toBeTrue();

    const header = fixture.nativeElement.querySelector('.admin-bar') as HTMLElement | null;
    expect(header).withContext('header must stay in the DOM during boot').not.toBeNull();
    expect(header!.querySelector('#admin-view-list')).toBeTruthy();
    expect(header!.querySelector('#admin-view-3d')).toBeTruthy();
    expect(header!.querySelector('.admin-bar__nav')).toBeTruthy();

    const sceneBoot = fixture.nativeElement.querySelector('.admin-3d-route-boot') as HTMLElement | null;
    expect(sceneBoot).toBeTruthy();
    expect(sceneBoot!.textContent).toContain('Montando o ateliê');

    const style = getComputedStyle(header!);
    expect(style.display).not.toBe('none');
    expect(style.visibility).not.toBe('hidden');
    expect(Number.parseInt(style.zIndex, 10)).toBeGreaterThan(40);
  });

  it('drops the full-viewport HTML overlay once the shell chrome is painted', () => {
    const bootEl = document.createElement('div');
    bootEl.id = 'lc-atelier-boot';
    document.body.appendChild(bootEl);
    showStaticAtelierBoot();
    expect(document.documentElement.classList.contains('lc-atelier-booting')).toBeTrue();

    const next = TestBed.createComponent(AdminShell);
    next.detectChanges();

    expect(document.documentElement.classList.contains('lc-atelier-booting')).toBeFalse();
    expect(bootEl.classList.contains('is-on')).toBeFalse();
    expect(next.nativeElement.querySelector('.admin-bar')).toBeTruthy();
    expect(next.nativeElement.querySelector('.admin-3d-route-boot')).toBeTruthy();
    next.destroy();
    bootEl.remove();
  });
});
