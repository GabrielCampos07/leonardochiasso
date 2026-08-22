import { Component, OnInit, inject, signal } from '@angular/core';
import { BRAND_LINES } from '../../core/brand-lines';
import { ChromeService } from '../../core/chrome.service';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';
import { ContentService } from '../../core/content.service';
import { resolveMediaUrl } from '../../core/media-url';

@Component({
  selector: 'lc-alta-costura-page',
  standalone: true,
  imports: [ImageLightbox],
  templateUrl: './alta-costura.html',
  styleUrl: './alta-costura.scss',
})
export class AltaCosturaPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly content = inject(ContentService);
  readonly brand = BRAND_LINES.artCouture;
  readonly banner = resolveMediaUrl('assets/media/alta-costura/artcouture/banner.png');
  readonly wearers = this.content.wearers;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);

  ngOnInit(): void {
    this.chrome.setActive('default');
    this.content.loadWearers().subscribe();
  }

  openImage(src: string, alt: string): void {
    this.lightbox.set({ src, alt });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }
}
