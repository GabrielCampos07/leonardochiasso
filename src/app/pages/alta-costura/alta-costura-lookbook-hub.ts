import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ChromeService } from '../../core/chrome.service';
import {
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
export class AltaCosturaLookbookHubPage implements OnInit {
  private readonly chrome = inject(ChromeService);

  readonly home = ROUTES.home;

  readonly collections = LOOKBOOKS.map((book) => {
    const show = ALTA_DESFILES.find((d) => d.slug === book.slug);
    const available = hasLookbook(book.slug);
    return {
      slug: book.slug,
      title: book.title,
      poster: show?.poster ?? book.looks[0]?.cover ?? '',
      lookCount: book.looks.length,
      available,
      shopHref: collectionPath(book.collectionSlug),
      looksHref: available ? lookbookPath(book.slug) : null,
      desfileHref: show && !show.comingSoon ? desfilePath(book.slug) : null,
    };
  });

  ngOnInit(): void {
    this.chrome.setActive('default');
  }
}
