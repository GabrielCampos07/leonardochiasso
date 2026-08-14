import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminJoiasCatalogService } from '../../core/admin-joias-catalog.service';
import { slugifyName, uniqueAdminSlug } from '../../core/admin-catalog.service';
import { JoiaPiece, joiaGallery } from '../../core/joias.data';
import {
  ADMIN_NEW_JOIA_SLUG,
  ROUTES,
  adminJoiaPath,
} from '../../core/routes';

function blankJoia(): JoiaPiece {
  return {
    id: '',
    slug: '',
    title: '',
    description: '',
    price: null,
    priceLabel: 'Sob consulta',
    image: '',
    images: [],
    medium: '',
  };
}

@Component({
  selector: 'lc-admin-joia-edit',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-joia-edit.html',
  styleUrl: './admin-product-edit.scss',
})
export class AdminJoiaEditPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalog = inject(AdminJoiasCatalogService);

  readonly listPath = ROUTES.adminJoias;
  readonly siteJoias = ROUTES.joias;
  readonly toast = signal('');
  readonly missing = signal(false);
  readonly isNew = signal(false);
  readonly draft = signal<JoiaPiece | null>(null);

  readonly imagesText = computed(() => {
    const p = this.draft();
    if (!p) return '';
    return joiaGallery(p).join('\n');
  });

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    if (slug === ADMIN_NEW_JOIA_SLUG) {
      this.isNew.set(true);
      this.draft.set(blankJoia());
      return;
    }
    const piece = this.catalog.get(slug);
    if (!piece) {
      this.missing.set(true);
      return;
    }
    this.draft.set(structuredClone(piece));
  }

  patchField<K extends keyof JoiaPiece>(key: K, value: JoiaPiece[K]): void {
    const cur = this.draft();
    if (!cur) return;
    this.draft.set({ ...cur, [key]: value });
  }

  onTitleChange(title: string): void {
    const cur = this.draft();
    if (!cur) return;
    if (this.isNew()) {
      const slug = uniqueAdminSlug(title, (s) => this.catalog.slugExists(s));
      this.draft.set({ ...cur, title, slug, id: slug });
      return;
    }
    this.draft.set({ ...cur, title });
  }

  onSlugChange(slug: string): void {
    const cur = this.draft();
    if (!cur || !this.isNew()) return;
    const clean = slugifyName(slug);
    this.draft.set({ ...cur, slug: clean, id: clean });
  }

  onImagesChange(text: string): void {
    const cur = this.draft();
    if (!cur) return;
    const images = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    this.draft.set({
      ...cur,
      images,
      image: images[0] ?? cur.image,
    });
  }

  save(): void {
    const cur = this.draft();
    if (!cur) return;
    if (!cur.title.trim()) {
      this.flash('Informe o título.');
      return;
    }
    let slug = cur.slug.trim() || slugifyName(cur.title);
    if (this.isNew()) {
      slug = uniqueAdminSlug(slug, (s) => this.catalog.slugExists(s));
      const next: JoiaPiece = {
        ...cur,
        id: slug,
        slug,
        title: cur.title.trim(),
        description: cur.description.trim(),
        priceLabel: cur.priceLabel.trim() || 'Sob consulta',
        medium: cur.medium?.trim() || undefined,
        videoSrc: cur.videoSrc?.trim() || undefined,
        image: cur.image?.trim() || joiaGallery(cur)[0],
        images: joiaGallery(cur),
      };
      this.catalog.create(next);
      this.flash('Joia criada.');
      void this.router.navigateByUrl(adminJoiaPath(next.slug), { replaceUrl: true });
      this.isNew.set(false);
      this.draft.set(next);
      return;
    }
    const next: JoiaPiece = {
      ...cur,
      title: cur.title.trim(),
      description: cur.description.trim(),
      priceLabel: cur.priceLabel.trim() || 'Sob consulta',
      medium: cur.medium?.trim() || undefined,
      videoSrc: cur.videoSrc?.trim() || undefined,
      image: cur.image?.trim() || joiaGallery(cur)[0],
      images: joiaGallery({ ...cur, images: cur.images }),
    };
    this.catalog.save(next);
    this.draft.set(next);
    this.flash('Joia salva.');
  }

  private flash(msg: string): void {
    this.toast.set(msg);
    window.setTimeout(() => this.toast.set(''), 3200);
  }
}
