import { Component, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChromeService } from '../../core/chrome.service';
import { legalPath, ROUTES } from '../../core/routes';

export type LegalPageSlug = 'privacidade' | 'termos' | 'cookies';

const LEGAL_PAGES: LegalPageSlug[] = ['privacidade', 'termos', 'cookies'];

const PAGE_META: Record<
  LegalPageSlug,
  { title: string; label: string; updated: string }
> = {
  privacidade: {
    title: 'Política de privacidade',
    label: 'Privacidade',
    updated: '31 de julho de 2026',
  },
  termos: {
    title: 'Termos de uso',
    label: 'Termos',
    updated: '31 de julho de 2026',
  },
  cookies: {
    title: 'Política de cookies',
    label: 'Cookies',
    updated: '31 de julho de 2026',
  },
};

function isLegalPage(value: string | null): value is LegalPageSlug {
  return LEGAL_PAGES.includes(value as LegalPageSlug);
}

@Component({
  selector: 'lc-legal-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="legal lc-container">
      <p class="lc-label-outline">Informações legais</p>
      <h1 class="legal__title">{{ meta().title }}</h1>
      <p class="legal__updated">Última atualização: {{ meta().updated }}</p>

      <aside class="legal__notice" role="note">
        <strong>Modelo — revisão jurídica pendente.</strong>
        Este texto é um rascunho operacional para orientar o desenvolvimento do
        site. Deve ser substituído ou validado por advogado(a) antes do go-live
        comercial.
      </aside>

      <nav class="legal__nav" aria-label="Páginas legais">
        @for (item of nav; track item.page) {
          <a
            class="legal__nav-link"
            [routerLink]="item.path"
            [class.legal__nav-link--active]="item.page === page()"
          >
            {{ item.label }}
          </a>
        }
      </nav>

      <div class="legal__body">
        @switch (page()) {
          @case ('privacidade') {
            <section>
              <h2>1. Quem somos</h2>
              <p>
                Leonardo Chiasso Labels (“nós”, “marca”) opera este site de
                e-commerce de moda de autor. Este documento descreve como
                tratamos dados pessoais em conformidade com a Lei Geral de
                Proteção de Dados (LGPD — Lei nº 13.709/2018).
              </p>
            </section>
            <section>
              <h2>2. Dados que podemos coletar</h2>
              <ul>
                <li>Identificação e contato: nome, e-mail, telefone, endereço de entrega.</li>
                <li>Dados de navegação: IP, dispositivo, páginas visitadas (quando houver analytics).</li>
                <li>Dados de pedido: itens, valores, histórico de compras.</li>
                <li>Preferências locais: carrinho e lista de favoritos armazenados no navegador.</li>
              </ul>
            </section>
            <section>
              <h2>3. Finalidades e bases legais</h2>
              <p>
                Utilizamos os dados para processar pedidos, prestar atendimento,
                cumprir obrigações legais e, com consentimento, enviar
                comunicações de marketing. As bases legais incluem execução de
                contrato, legítimo interesse e consentimento, conforme aplicável.
              </p>
            </section>
            <section>
              <h2>4. Compartilhamento</h2>
              <p>
                Podemos compartilhar dados com prestadores de pagamento,
                logística, hospedagem e ferramentas de e-mail, sempre sob
                contratos que exijam proteção adequada. Transferências
                internacionais seguirão mecanismos previstos na LGPD.
              </p>
            </section>
            <section>
              <h2>5. Seus direitos</h2>
              <p>
                Você pode solicitar confirmação de tratamento, acesso, correção,
                anonimização, portabilidade, eliminação e revogação de
                consentimento pelo canal
                <a href="mailto:atelier@leonardochiasso.com">atelier@leonardochiasso.com</a>.
                Responderemos em prazo razoável, conforme a LGPD.
              </p>
            </section>
            <section>
              <h2>6. Retenção e segurança</h2>
              <p>
                Mantemos os dados pelo tempo necessário às finalidades descritas
                e às exigências fiscais e consumeristas. Adotamos medidas
                técnicas e organizacionais proporcionais ao risco.
              </p>
            </section>
          }
          @case ('termos') {
            <section>
              <h2>1. Aceitação</h2>
              <p>
                Ao navegar ou comprar neste site, você declara ter lido e
                concordado com estes Termos de Uso e com a nossa Política de
                Privacidade.
              </p>
            </section>
            <section>
              <h2>2. Produtos e disponibilidade</h2>
              <p>
                Peças de edição limitada podem esgotar sem aviso prévio.
                Descrições, composições e imagens buscam fidelidade ao produto
                físico; pequenas variações artesanais ou de cor podem ocorrer.
              </p>
            </section>
            <section>
              <h2>3. Preços, frete e pagamento</h2>
              <p>
                Preços são exibidos em reais (BRL), salvo indicação contrária.
                Frete e prazos são informados antes da confirmação do pedido.
                Pagamentos são processados por parceiro certificado (ex.: Stripe).
              </p>
            </section>
            <section>
              <h2>4. Direito de arrependimento</h2>
              <p>
                Compras à distância permitem desistência em até 7 (sete) dias
                corridos a partir do recebimento, nos termos do Código de
                Defesa do Consumidor (CDC). Valores pagos, inclusive frete de
                envio, serão restituídos conforme a lei. O frete de devolução
                é de responsabilidade da loja quando aplicável.
              </p>
            </section>
            <section>
              <h2>5. Trocas e devoluções por defeito</h2>
              <p>
                Produtos com vício ou defeito serão tratados conforme o CDC.
                Políticas específicas de troca por conveniência, quando
                oferecidas, serão descritas em página dedicada e não substituem
                o direito legal de arrependimento.
              </p>
            </section>
            <section>
              <h2>6. Propriedade intelectual</h2>
              <p>
                Marcas, fotografias, textos e designs pertencem a Leonardo
                Chiasso Labels ou licenciadores. É proibida reprodução não
                autorizada.
              </p>
            </section>
            <section>
              <h2>7. Foro</h2>
              <p>
                Fica eleito o foro da comarca do domicílio do consumidor para
                dirimir controvérsias, conforme o CDC.
              </p>
            </section>
          }
          @case ('cookies') {
            <section>
              <h2>1. O que são cookies</h2>
              <p>
                Cookies são pequenos arquivos armazenados no seu navegador para
                lembrar preferências, manter sessões ou medir audiência.
              </p>
            </section>
            <section>
              <h2>2. Cookies essenciais</h2>
              <p>
                Utilizamos armazenamento local estritamente necessário ao
                funcionamento do site — por exemplo, carrinho e lista de
                favoritos — sem identificação publicitária.
              </p>
            </section>
            <section>
              <h2>3. Cookies analíticos e de marketing</h2>
              <p>
                No momento, não empregamos pixels de redes sociais nem ferramentas
                analíticas de terceiros. Caso passemos a utilizá-los, esta
                política será atualizada e, quando exigido, solicitaremos
                consentimento prévio.
              </p>
            </section>
            <section>
              <h2>4. Como gerenciar</h2>
              <p>
                Você pode limpar cookies e dados locais nas configurações do
                navegador. A remoção de cookies essenciais pode afetar
                funcionalidades como o carrinho.
              </p>
            </section>
          }
        }
      </div>

      <footer class="legal__footer">
        <a class="legal__back" [routerLink]="home">Voltar à loja</a>
      </footer>
    </article>
  `,
  styles: `
    .legal {
      padding: 64px 24px 96px;
      max-width: 720px;
      background: var(--lc-white);
      color: var(--lc-void);
    }
    .legal__title {
      font-family: var(--lc-font-display);
      font-weight: 300;
      font-size: clamp(1.75rem, 4vw, 2.25rem);
      letter-spacing: 0.04em;
      margin: 8px 0 8px;
    }
    .legal__updated {
      font-family: var(--lc-font-body);
      font-size: 0.85rem;
      color: var(--lc-ash);
      margin: 0 0 24px;
    }
    .legal__notice {
      font-family: var(--lc-font-body);
      font-size: 0.9rem;
      line-height: 1.6;
      padding: 16px 20px;
      margin-bottom: 32px;
      border-left: 3px solid var(--lc-void);
      background: color-mix(in srgb, var(--lc-void) 4%, var(--lc-white));
    }
    .legal__notice strong {
      font-family: var(--lc-font-display);
      font-weight: 400;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-size: 0.75rem;
    }
    .legal__nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 24px;
      margin-bottom: 40px;
      padding-bottom: 24px;
      border-bottom: 1px solid color-mix(in srgb, var(--lc-void) 12%, transparent);
    }
    .legal__nav-link {
      font-family: var(--lc-font-display);
      font-size: 0.7rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--lc-ash);
      text-decoration: none;
    }
    .legal__nav-link:hover,
    .legal__nav-link--active {
      color: var(--lc-void);
    }
    .legal__nav-link--active {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .legal__body section + section {
      margin-top: 32px;
    }
    .legal__body h2 {
      font-family: var(--lc-font-display);
      font-weight: 400;
      font-size: 0.8rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0 0 12px;
    }
    .legal__body p,
    .legal__body li {
      font-family: var(--lc-font-body);
      font-size: 0.95rem;
      line-height: 1.7;
      color: var(--lc-void);
    }
    .legal__body ul {
      margin: 0;
      padding-left: 1.25rem;
    }
    .legal__body li + li {
      margin-top: 8px;
    }
    .legal__body a {
      color: var(--lc-void);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .legal__footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 1px solid color-mix(in srgb, var(--lc-void) 12%, transparent);
    }
    .legal__back {
      font-family: var(--lc-font-display);
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--lc-void);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  `,
})
export class LegalPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly chrome = inject(ChromeService);

  readonly home = ROUTES.home;
  readonly page = signal<LegalPageSlug>('privacidade');
  readonly meta = signal(PAGE_META.privacidade);

  readonly nav = LEGAL_PAGES.map((p) => ({
    page: p,
    label: PAGE_META[p].label,
    path: legalPath(p),
  }));

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const param = params.get('page');
      if (!isLegalPage(param)) {
        void this.router.navigateByUrl(legalPath('privacidade'));
        return;
      }
      this.page.set(param);
      this.meta.set(PAGE_META[param]);
    });
  }

  ngOnInit(): void {
    this.chrome.setActive('default');
  }
}
