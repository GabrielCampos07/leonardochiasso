import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  GenderSlug,
  ROUTES,
  desfilePath,
  lookbookPath,
} from '../../core/routes';
import { ALTA_DESFILES } from './alta-costura.data';
import { hasLookbook } from './lookbook.data';

/** Full-bleed desfile cards — shared by home and `/desfiles`. */
@Component({
  selector: 'lc-alta-costura-films',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './alta-costura-films.html',
  styleUrl: './alta-costura-films.scss',
})
export class AltaCosturaFilms {
  readonly gender = input<GenderSlug | null>(null);

  readonly looksQueryParams = computed(() => {
    const g = this.gender();
    return g ? { categoria: g } : null;
  });

  readonly desfiles = computed(() => {
    const masculine = this.gender() === 'masculino';
    return ALTA_DESFILES.map((d) => ({
      ...d,
      poster: masculine && d.posterMasculino ? d.posterMasculino : d.poster,
      posterPosition:
        masculine && d.posterMasculinoPosition
          ? d.posterMasculinoPosition
          : d.posterPosition,
      looksHref: hasLookbook(d.slug) ? lookbookPath(d.slug) : ROUTES.lookbook,
      href: desfilePath(d.slug),
    }));
  });
}
