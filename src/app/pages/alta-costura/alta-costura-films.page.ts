import { Component, OnInit, inject } from '@angular/core';
import { ChromeService } from '../../core/chrome.service';
import { AltaCosturaFilms } from './alta-costura-films';

/** Route wrapper — Feminino hero entry. */
@Component({
  selector: 'lc-alta-costura-films-page',
  standalone: true,
  imports: [AltaCosturaFilms],
  template: `<lc-alta-costura-films />`,
})
export class AltaCosturaFilmsPage implements OnInit {
  private readonly chrome = inject(ChromeService);

  ngOnInit(): void {
    this.chrome.setActive('feminino');
  }
}
