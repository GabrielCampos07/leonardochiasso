import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
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
  readonly desfiles = ALTA_DESFILES.map((d) => ({
    ...d,
    looksHref: hasLookbook(d.slug) ? lookbookPath(d.slug) : ROUTES.lookbook,
    href: desfilePath(d.slug),
  }));
}
