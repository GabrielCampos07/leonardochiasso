import { Injectable } from '@nestjs/common';

/** TTL padrão dos GETs públicos de catálogo. */
export const CATALOG_CACHE_TTL_MS = 60_000;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Cache em memória (sem Redis / sem infra nova) para os GETs públicos de
 * catálogo. TTL curto (60 s) e invalidação total a cada escrita do admin,
 * garantindo que o admin nunca veja dado velho.
 *
 * Processo único (Hetzner, 1 container) → um Map em memória basta. Em caso de
 * múltiplas réplicas, cada uma tem o seu cache, todas com TTL de 60 s.
 */
@Injectable()
export class CatalogCacheService {
  private readonly store = new Map<string, Entry<unknown>>();
  /**
   * TTL fixo (não é parâmetro de construtor): um primitivo injetável no
   * construtor quebra a DI do Nest e derruba o boot da API. `withTtl` existe
   * só para testes.
   */
  private ttlMs = CATALOG_CACHE_TTL_MS;

  /** Apenas para testes: ajusta o TTL e devolve a própria instância. */
  withTtl(ttlMs: number): this {
    this.ttlMs = ttlMs;
    return this;
  }

  /** Retorna o valor em cache (se válido) ou executa `factory`, guarda e retorna. */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    now: number = Date.now(),
  ): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > now) {
      return hit.value as T;
    }
    const value = await factory();
    this.store.set(key, { value, expiresAt: now + this.ttlMs });
    return value;
  }

  /** Esvazia o cache inteiro — chamado em toda escrita do admin. */
  clear(): void {
    this.store.clear();
  }

  /** Número de entradas vivas (uso em testes/diagnóstico). */
  get size(): number {
    return this.store.size;
  }
}
