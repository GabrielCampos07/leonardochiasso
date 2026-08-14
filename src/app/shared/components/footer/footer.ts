import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FOOTER_LINKS } from '../../../core/nav.config';
import { ROUTES } from '../../../core/routes';
import { AdminSessionService } from '../../../core/admin-session.service';

@Component({
  selector: 'lc-footer',
  standalone: true,
  imports: [RouterLink],
  template: `
    <footer class="footer">
      <div class="footer__cols">
        <div>
          <h3>ATENDIMENTO</h3>
          <ul>
            @for (link of links.atendimento; track link.label) {
              <li>
                @if (link.external && link.route) {
                  <a [href]="link.route">{{ link.label }}</a>
                } @else if (link.route) {
                  <a [routerLink]="link.route" [fragment]="link.fragment || undefined">{{
                    link.label
                  }}</a>
                } @else {
                  <a href="#" (click)="$event.preventDefault()">{{ link.label }}</a>
                }
              </li>
            }
          </ul>
        </div>
        <div>
          <h3>COLEÇÕES</h3>
          <ul>
            @for (link of links.colecoes; track link.label) {
              <li>
                <a [routerLink]="link.route">{{ link.label }}</a>
              </li>
            }
          </ul>
        </div>
        <div>
          <h3>LEGAL</h3>
          <ul>
            @for (link of links.legal; track link.label) {
              <li>
                @if (link.route) {
                  <a [routerLink]="link.route">{{ link.label }}</a>
                } @else {
                  <a href="#" (click)="$event.preventDefault()">{{ link.label }}</a>
                }
              </li>
            }
            @if (adminEnabled()) {
              <li>
                <a [routerLink]="admin">Área do ateliê</a>
              </li>
            }
          </ul>
        </div>
        <div>
          <h3>REDES</h3>
          <ul>
            @for (link of links.redes; track link.label) {
              <li>
                <a [href]="link.route!" target="_blank" rel="noopener">{{ link.label }}</a>
              </li>
            }
          </ul>
        </div>
      </div>

      <div class="footer__bottom">
        <a [routerLink]="home" class="footer__logo">
          <img
            src="assets/brand/logo-white.png"
            alt="Leonardo Chiasso"
            width="344"
            height="24"
          />
        </a>
        <p class="footer__copy">
          <span>© {{ year }} Leonardo Chiasso Labels</span>
          <span class="footer__credit">GCP Inovações e Tecnologia</span>
        </p>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      background: var(--lc-void);
      color: var(--lc-white);
      padding: 48px var(--lc-space-24) 40px;
    }
    @media (min-width: 768px) {
      .footer {
        padding: 48px 64px 40px;
      }
    }
    .footer__cols {
      max-width: var(--lc-max);
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px 48px;
    }
    @media (min-width: 700px) {
      .footer__cols {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    .footer__cols h3 {
      font-family: var(--lc-font-display);
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 10px;
      font-weight: 400;
    }
    .footer__cols ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .footer__cols a {
      display: block;
      font-family: var(--lc-font-body);
      font-weight: 300;
      font-size: 13px;
      color: var(--lc-white);
      margin-bottom: 10px;
    }
    .footer__cols a:hover {
      color: var(--lc-ash);
    }
    .footer__bottom {
      max-width: var(--lc-max);
      margin: 40px auto 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 24px;
    }
    @media (min-width: 700px) {
      .footer__bottom {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }
    }
    .footer__logo {
      display: block;
      max-width: min(344px, 80vw);
      flex-shrink: 0;
    }
    .footer__logo img {
      display: block;
      width: 100%;
      height: auto;
      max-height: 80px;
      object-fit: contain;
      object-position: left center;
    }
    .footer__copy {
      margin: 0;
      margin-left: auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-end;
      gap: 6px 10px;
      font-family: var(--lc-font-body);
      font-size: 11px;
      color: var(--lc-white);
      text-align: right;
    }
    .footer__credit {
      color: var(--lc-ash);
      font-size: 10px;
      letter-spacing: 0.04em;
    }
    .footer__credit::before {
      content: '·';
      margin-right: 10px;
    }
    @media (max-width: 699px) {
      .footer__copy {
        margin-left: 0;
        justify-content: flex-start;
        text-align: left;
      }
      .footer__credit::before {
        content: none;
      }
    }
  `,
})
export class LcFooter {
  private readonly adminSession = inject(AdminSessionService);

  readonly year = new Date().getFullYear();
  readonly links = FOOTER_LINKS;
  readonly home = ROUTES.home;
  readonly admin = ROUTES.admin;
  readonly adminEnabled = this.adminSession.isEnabled;
}
