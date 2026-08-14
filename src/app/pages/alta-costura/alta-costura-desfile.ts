import { AfterViewInit, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChromeService } from '../../core/chrome.service';
import {
  ROUTES,
  collectionPath,
  lookbookPath,
} from '../../core/routes';
import { AltaDesfileShow, getAltaDesfile } from './alta-costura.data';
import { hasLookbook } from './lookbook.data';

@Component({
  selector: 'lc-alta-costura-desfile-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './alta-costura-desfile.html',
  styleUrl: './alta-costura-desfile.scss',
})
export class AltaCosturaDesfilePage implements OnInit, AfterViewInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chrome = inject(ChromeService);

  readonly back = ROUTES.desfiles;
  readonly show = signal<AltaDesfileShow | null>(null);
  readonly shopHref = signal<string>(ROUTES.home);
  readonly looksHref = signal<string | null>(null);

  ngOnInit(): void {
    this.chrome.setActive('default');
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const found = getAltaDesfile(slug);
    if (!found) {
      void this.router.navigateByUrl(ROUTES.desfiles);
      return;
    }
    this.show.set(found);
    this.shopHref.set(collectionPath(found.collectionSlug));
    this.looksHref.set(hasLookbook(found.slug) ? lookbookPath(found.slug) : null);
  }

  ngAfterViewInit(): void {
    if (this.route.snapshot.fragment === 'desfile-video') {
      // Wait a tick so the video section is in the DOM after @if (show).
      requestAnimationFrame(() => this.scrollToDesfile());
    }
  }

  scrollToDesfile(): void {
    document.getElementById('desfile-video')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
