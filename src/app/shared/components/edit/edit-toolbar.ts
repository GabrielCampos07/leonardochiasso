import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { resolveAdminCollectionContextFromUrl } from '../../../core/admin-collection-context';
import { AdminSessionService } from '../../../core/admin-session.service';
import {
  ADMIN_PRODUCT_COLLECTION_QUERY,
  adminNewProductPath,
} from '../../../core/routes';

@Component({
  selector: 'lc-edit-toolbar',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (admin.isLoggedIn()) {
      <div class="edit-bar" role="status" aria-live="polite">
        @if (admin.editMode()) {
          <span class="edit-bar__label">Modo edição</span>
          <span class="edit-bar__hint"
            >Clique nos campos destacados · troque fotos nos ícones</span
          >
          <a
            class="edit-bar__btn edit-bar__link"
            [routerLink]="newProductPath"
            [queryParams]="addProductQueryParams()"
          >
            Adicionar produto
          </a>
          <button type="button" class="edit-bar__btn" (click)="admin.toggleEditMode()">
            Visualizar
          </button>
        } @else {
          <span class="edit-bar__label">Ateliê</span>
          <span class="edit-bar__hint">Sessão admin ativa neste navegador</span>
          <button type="button" class="edit-bar__btn edit-bar__btn--primary" (click)="admin.toggleEditMode()">
            Editar
          </button>
        }
      </div>
    }
  `,
  styles: `
    .edit-bar {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px 20px;
      padding: 10px 16px max(10px, env(safe-area-inset-bottom, 0px));
      background: color-mix(in srgb, var(--lc-void) 92%, transparent);
      color: var(--lc-white);
      font-family: var(--lc-font-body);
      font-size: 12px;
    }
    .edit-bar__label {
      font-family: var(--lc-font-display);
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-size: 11px;
    }
    .edit-bar__hint {
      opacity: 0.72;
      text-align: center;
      max-width: 28rem;
      line-height: 1.4;
    }
    .edit-bar__btn {
      padding: 8px 14px;
      border: 1px solid color-mix(in srgb, var(--lc-white) 35%, transparent);
      background: transparent;
      color: var(--lc-white);
      font-family: var(--lc-font-display);
      font-size: 10px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .edit-bar__btn:hover {
      background: color-mix(in srgb, var(--lc-white) 12%, transparent);
    }
    .edit-bar__btn--primary {
      background: var(--lc-white);
      color: var(--lc-void);
      border-color: var(--lc-white);
    }
    .edit-bar__btn--primary:hover {
      background: color-mix(in srgb, var(--lc-white) 88%, transparent);
    }
    .edit-bar__link {
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
  `,
})
export class LcEditToolbar implements OnInit {
  private readonly router = inject(Router);
  readonly admin = inject(AdminSessionService);
  readonly newProductPath = adminNewProductPath();

  ngOnInit(): void {
    this.admin.hydrateStorefrontSession().subscribe();
  }

  /**
   * On `/colecao/:slug` (or `?colecao=` / `?collection=`), pass the slug so the
   * create form pre-fills. Elsewhere the form requires an explicit pick.
   */
  addProductQueryParams(): Record<string, string> | null {
    const ctx = resolveAdminCollectionContextFromUrl(this.router.url);
    return ctx.slug ? { [ADMIN_PRODUCT_COLLECTION_QUERY]: ctx.slug } : null;
  }
}
