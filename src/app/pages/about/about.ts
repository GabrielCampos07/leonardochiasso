import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ViewportScroller } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LcFabricSpec } from '../../shared/components/fabric-spec/fabric-spec';
import { ChromeService } from '../../core/chrome.service';
import { ABOUT_ANCHORS, ABOUT_MORE_LINKS } from '../../core/nav.config';
import { ROUTES } from '../../core/routes';

@Component({
  selector: 'lc-about-page',
  standalone: true,
  imports: [LcFabricSpec, RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class AboutPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly route = inject(ActivatedRoute);
  private readonly viewport = inject(ViewportScroller);

  readonly aboutRoute = ROUTES.about;
  readonly anchors = ABOUT_ANCHORS;
  readonly moreLinks = ABOUT_MORE_LINKS;

  readonly activeFragment = signal<string>(this.anchors[0].id);

  readonly stats = [
    { value: '40', unit: 'anos', note: 'de domínio técnico' },
    { value: '2', unit: 'fibras', note: 'cânhamo + seda' },
    { value: '6', unit: 'mercados', note: 'haute-conscience' },
    { value: '2', unit: 'gramaturas', note: 'Canvas · Cambraia' },
    { value: '1', unit: 'arquétipo', note: 'Alquimista' },
  ];

  constructor() {
    this.viewport.setOffset([0, 120]);

    this.route.fragment.pipe(takeUntilDestroyed()).subscribe((fragment) => {
      const ids = this.anchors.map((a) => a.id as string);
      this.activeFragment.set(
        fragment && ids.includes(fragment) ? fragment : this.anchors[0].id,
      );
    });
  }

  ngOnInit(): void {
    this.chrome.setActive('about');
  }
}
