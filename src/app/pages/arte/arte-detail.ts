import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ArtPiece, getArtPieceBySlug } from '../../core/arte.data';
import { ChromeService } from '../../core/chrome.service';
import { ROUTES, artePath } from '../../core/routes';
import { ArtMediaCarousel } from '../../shared/components/art-media-carousel/art-media-carousel';
import { ImageLightbox } from '../../shared/components/image-lightbox/image-lightbox';

@Component({
  selector: 'lc-arte-detail-page',
  standalone: true,
  imports: [RouterLink, ImageLightbox, ArtMediaCarousel],
  templateUrl: './arte-detail.html',
  styleUrl: './arte-detail.scss',
})
export class ArteDetailPage implements OnInit {
  private readonly chrome = inject(ChromeService);
  private readonly route = inject(ActivatedRoute);

  readonly home = ROUTES.home;
  readonly gallery = ROUTES.arte;
  readonly piece = signal<ArtPiece | null>(null);
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);

  readonly found = computed(() => this.piece() !== null);

  ngOnInit(): void {
    this.chrome.setActive('arte');
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.piece.set(getArtPieceBySlug(slug) ?? null);
  }

  backPath(): string {
    return artePath();
  }

  openImage(src: string, alt: string): void {
    this.lightbox.set({ src, alt });
  }

  closeLightbox(): void {
    this.lightbox.set(null);
  }
}
