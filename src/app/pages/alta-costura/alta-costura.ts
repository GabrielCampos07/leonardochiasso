import { Component, OnInit, inject } from '@angular/core';
import { BRAND_LINES } from '../../core/brand-lines';
import { ChromeService } from '../../core/chrome.service';
import { ARTCOUTURE_WEARERS } from './artcouture-wearers.data';

@Component({
  selector: 'lc-alta-costura-page',
  standalone: true,
  templateUrl: './alta-costura.html',
  styleUrl: './alta-costura.scss',
})
export class AltaCosturaPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  readonly brand = BRAND_LINES.artCouture;
  readonly banner = 'assets/media/alta-costura/artcouture/banner.png';
  readonly wearers = ARTCOUTURE_WEARERS;

  ngOnInit(): void {
    this.chrome.setActive('default');
  }
}
