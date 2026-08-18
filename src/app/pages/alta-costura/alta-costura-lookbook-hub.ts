import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ChromeService } from '../../core/chrome.service';
import {
  GenderSlug,
  ROUTES,
  collectionPath,
  desfilePath,
  lookbookPath,
} from '../../core/routes';
import { ALTA_DESFILES } from './alta-costura.data';
import { LOOKBOOKS, hasLookbook } from './lookbook.data';

@Component({
  selector: 'lc-alta-costura-lookbook-hub-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './alta-costura-lookbook-hub.html',
  styleUrl: './alta-costura-lookbook-hub.scss',
})
export class AltaCosturaLookbookHubPage {
  private readonly chrome = inject(ChromeService);
  private readonly route = inject(ActivatedRoute);

  readonly home = ROUTES.home;
  readonly gender = signal<GenderSlug | null>(null);

  readonly genderQueryParams = computed(() => {
    const g = this.gender();
    return g ? { categoria: g } : null;
  });

  readonly collections = computed(() => {
    const masculine = this.gender() === 'masculino';
    return LOOKBOOKS.map((book) => {
      const show = ALTA_DESFILES.find((d) => d.slug === book.slug);
      const available = hasLookbook(book.slug);
      return {
        slug: book.slug,
        title: book.title,
        poster:
          masculine && show?.posterMasculino
            ? show.posterMasculino
            : (show?.poster ?? book.looks[0]?.cover ?? ''),
        lookCount: book.looks.length,
        available,
        shopHref: collectionPath(book.collectionSlug),
        looksHref: available ? lookbookPath(book.slug) : null,
        desfileHref: show && !show.comingSoon ? desfilePath(book.slug) : null,
      };
    });
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((q) => {
      const raw = q.get('categoria');
      const cat: GenderSlug | null =
        raw === 'feminino' || raw === 'masculino' ? raw : null;
      this.gender.set(cat);
      this.chrome.setActive(cat ?? 'default');
    });
  }
}
