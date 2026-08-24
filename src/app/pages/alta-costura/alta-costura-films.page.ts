import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChromeService } from '../../core/chrome.service';
import { GenderSlug } from '../../core/routes';
import { AltaCosturaFilms } from './alta-costura-films';

/** Route wrapper — desfiles hub. */
@Component({
  selector: 'lc-alta-costura-films-page',
  standalone: true,
  imports: [AltaCosturaFilms],
  template: `<lc-alta-costura-films />`,
})
export class AltaCosturaFilmsPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const raw = this.route.snapshot.queryParamMap.get('categoria');
    const cat: GenderSlug | null =
      raw === 'feminino' || raw === 'masculino' ? raw : null;
    this.chrome.setActive(cat ?? 'default');
  }
}
