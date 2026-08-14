import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChromeService } from '../../core/chrome.service';
import {
  lookPath,
  lookbookPath,
  productPath,
} from '../../core/routes';
import {
  LookbookCollection,
  LookbookLook,
  getLookbook,
} from './lookbook.data';

@Component({
  selector: 'lc-alta-costura-look-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './alta-costura-look-detail.html',
  styleUrl: './alta-costura-look-detail.scss',
})
export class AltaCosturaLookPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chrome = inject(ChromeService);

  readonly book = signal<LookbookCollection | null>(null);
  readonly look = signal<LookbookLook | null>(null);
  readonly looksHref = signal('');
  readonly prevHref = signal<string | null>(null);
  readonly nextHref = signal<string | null>(null);
  readonly productHref = signal<string | null>(null);
  readonly activeImage = signal(0);

  ngOnInit(): void {
    this.chrome.setActive('default');
    this.route.paramMap.subscribe((params) => {
      const slug = params.get('slug') ?? '';
      const num = Number(params.get('lookNumber') ?? '');
      const found = getLookbook(slug);
      if (!found || !Number.isFinite(num)) {
        void this.router.navigateByUrl(lookbookPath(slug || 'niponic-dreams'));
        return;
      }
      const look = found.looks.find((l) => l.number === num);
      if (!look) {
        void this.router.navigateByUrl(lookbookPath(found.slug));
        return;
      }

      this.book.set(found);
      this.look.set(look);
      this.looksHref.set(lookbookPath(found.slug));
      this.activeImage.set(0);
      this.productHref.set(look.productSlug ? productPath(look.productSlug) : null);

      const idx = found.looks.findIndex((l) => l.number === num);
      const prev = found.looks[idx - 1];
      const next = found.looks[idx + 1];
      this.prevHref.set(prev ? lookPath(found.slug, prev.number) : null);
      this.nextHref.set(next ? lookPath(found.slug, next.number) : null);
    });
  }

  selectImage(i: number): void {
    this.activeImage.set(i);
  }
}
