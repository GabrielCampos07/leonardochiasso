import { Component, OnInit, inject } from '@angular/core';
import { BRAND_LINES } from '../../core/brand-lines';
import { ChromeService } from '../../core/chrome.service';

@Component({
  selector: 'lc-alta-costura-page',
  standalone: true,
  templateUrl: './alta-costura.html',
  styleUrl: './alta-costura.scss',
})
export class AltaCosturaPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  readonly brand = BRAND_LINES.artCouture;

  ngOnInit(): void {
    this.chrome.setActive('default');
  }
}
