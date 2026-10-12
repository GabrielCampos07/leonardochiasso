import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { CatalogCacheService } from './catalog-cache.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Invalida o cache de catálogo depois de qualquer requisição mutante
 * (POST/PUT/PATCH/DELETE) que termine com sucesso. Aplicado nos controllers do
 * admin, cobre criar, editar, mídia e coleções — inclusive escritas futuras.
 */
@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  constructor(private readonly cache: CatalogCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method?: string }>();
    const isMutating = MUTATING_METHODS.has((req?.method ?? '').toUpperCase());
    return next
      .handle()
      .pipe(tap(() => {
        if (isMutating) this.cache.clear();
      }));
  }
}
