import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LcButton } from '../button/button';

@Component({
  selector: 'lc-newsletter',
  standalone: true,
  imports: [FormsModule, LcButton],
  template: `
    <section class="news">
      <div class="news__inner">
        <h2 class="news__title">CADASTRE-SE EM NOSSA NEWSLETTER</h2>
        <p class="lc-body-s news__copy">Novidades, desfiles e o universo HempCouture.</p>
        <form class="news__form" (submit)="onSubmit($event)">
          <label class="lc-sr-only" for="lc-email">E-mail</label>
          <input
            id="lc-email"
            name="email"
            type="email"
            required
            placeholder="E-mail"
            [(ngModel)]="email"
          />
          <lc-button type="submit" label="CADASTRAR" />
        </form>
        @if (done) {
          <p class="news__done lc-caption">Cadastro recebido. Obrigado.</p>
        }
      </div>
    </section>
  `,
  styles: `
    .news {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 280px;
      padding: var(--lc-space-64) var(--lc-space-24);
      background: var(--lc-white);
    }
    .news__inner {
      max-width: 720px;
      margin: 0 auto;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    .news__title {
      font-family: var(--lc-font-display);
      font-weight: 300;
      font-size: 18px;
      letter-spacing: 0.1em;
      margin: 0;
      color: var(--lc-void);
    }
    .news__copy {
      margin: 0;
      color: var(--lc-void);
    }
    .news__form {
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 500px;
      border: 1px solid var(--lc-void);
      overflow: hidden;
    }
    @media (min-width: 600px) {
      .news__form {
        flex-direction: row;
        align-items: stretch;
      }
    }
    .news__form input {
      flex: 1;
      border: none;
      padding: 14px 20px;
      font-family: var(--lc-font-body);
      font-size: 13px;
      background: transparent;
      outline: none;
      min-height: 48px;
    }
    .news__form lc-button {
      display: flex;
      flex-shrink: 0;
    }
    .news__done {
      margin: 0;
    }
  `,
})
export class LcNewsletter {
  email = '';
  done = false;

  onSubmit(event: Event): void {
    event.preventDefault();
    this.done = true;
    this.email = '';
  }
}
