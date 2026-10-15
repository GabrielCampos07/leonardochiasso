import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import {
  LISTA_ORDER_MAINTENANCE_NOTICE,
  LISTA_REORDER_ENABLED,
  STOCKROOM_REORDER_ENABLED,
} from './membership-order';
import { AdminCatalogService } from './admin-catalog.service';
import {
  ADD_PIECE_STAGGER_MS,
  AdminCollectionProductsService,
  CollectionProductsLock,
  MEMBERSHIP_WRITE_BAD_REQUEST,
  MEMBERSHIP_WRITE_BUSY,
  MEMBERSHIP_WRITE_CONFLICT,
  MEMBERSHIP_WRITE_NOT_FOUND,
  SerialTaskQueue,
  addPieceStaggerDelay,
  appendCollectionProductSlugs,
  membershipWriteErrorMessage,
  mergeLiveOrderIntoMembership,
  partitionAppendResults,
  planCollectionAddWrite,
} from './admin-collection-products';
import {
  AdminCollectionsApiService,
  type SetCollectionProductsResult,
} from './admin-collections-api.service';

function result(slug: string, productSlugs: string[]): SetCollectionProductsResult {
  return {
    id: slug,
    slug,
    name: slug,
    description: null,
    sortOrder: 0,
    publishedAt: null,
    productSlugs,
  };
}

function httpErr(status: number): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: String(status) });
}

describe('appendCollectionProductSlugs', () => {
  it('keeps the current pieces and appends newcomers at the end', () => {
    expect(appendCollectionProductSlugs(['vestido-longo', 'saia-midi'], ['cinto', 'saia-midi', 'jaqueta'])).toEqual([
      'vestido-longo',
      'saia-midi',
      'cinto',
      'jaqueta',
    ]);
  });

  it('does not drop existing slugs when adding a new piece', () => {
    const current = ['a', 'b', 'c'];
    expect(appendCollectionProductSlugs(current, ['nova'])).toEqual(['a', 'b', 'c', 'nova']);
    expect(appendCollectionProductSlugs(current, ['a'])).toEqual(['a', 'b', 'c']);
  });
});

describe('mergeLiveOrderIntoMembership', () => {
  it('keeps archived members in their slots when live hangers are reordered', () => {
    expect(mergeLiveOrderIntoMembership(['arquivo', 'a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      'arquivo',
      'c',
      'a',
      'b',
    ]);
    expect(mergeLiveOrderIntoMembership(['a', 'arquivo', 'b'], ['b', 'a'])).toEqual(['b', 'arquivo', 'a']);
  });

  it('keeps archived and draft members in the full list', () => {
    expect(
      mergeLiveOrderIntoMembership(['arquivo', 'draft-x', 'a', 'b', 'c'], ['c', 'a', 'b']),
    ).toEqual(['arquivo', 'draft-x', 'c', 'a', 'b']);
  });
});

describe('planCollectionAddWrite', () => {
  it('uses a collectionSlug PATCH move when the piece already belongs to another collection', () => {
    expect(planCollectionAddWrite('vestido', 'niponic-dreams', 'organic-dreams')).toEqual({
      kind: 'move',
      productSlug: 'vestido',
      fromSlug: 'organic-dreams',
      toSlug: 'niponic-dreams',
    });
  });

  it('uses POST append when the piece has no other collection', () => {
    expect(planCollectionAddWrite('vestido', 'organic-dreams', '')).toEqual({
      kind: 'append',
      productSlug: 'vestido',
      toSlug: 'organic-dreams',
    });
    expect(planCollectionAddWrite('vestido', 'organic-dreams', 'organic-dreams')).toEqual({
      kind: 'append',
      productSlug: 'vestido',
      toSlug: 'organic-dreams',
    });
  });
});

describe('membershipWriteErrorMessage', () => {
  it('maps 400/409/404/503 to clear pt-BR copy', () => {
    expect(membershipWriteErrorMessage(httpErr(400))).toBe(MEMBERSHIP_WRITE_BAD_REQUEST);
    expect(membershipWriteErrorMessage(httpErr(409))).toBe(MEMBERSHIP_WRITE_CONFLICT);
    expect(membershipWriteErrorMessage(httpErr(404))).toBe(MEMBERSHIP_WRITE_NOT_FOUND);
    expect(membershipWriteErrorMessage(httpErr(503))).toBe(MEMBERSHIP_WRITE_BUSY);
  });
});

describe('addPieceStaggerDelay', () => {
  it('keeps 80 ms between each added piece', () => {
    expect(ADD_PIECE_STAGGER_MS).toBe(80);
    expect(addPieceStaggerDelay(0)).toBe(0);
    expect(addPieceStaggerDelay(1)).toBe(80);
    expect(addPieceStaggerDelay(3)).toBe(240);
  });
});

describe('CollectionProductsLock', () => {
  it('never runs two tasks for the same collection in parallel', async () => {
    const lock = new CollectionProductsLock();
    let inflight = 0;
    let maxInflight = 0;
    const work = () =>
      lock.run('organic-dreams', async () => {
        inflight += 1;
        maxInflight = Math.max(maxInflight, inflight);
        await new Promise((resolve) => setTimeout(resolve, 15));
        inflight -= 1;
      });
    await Promise.all([work(), work(), work()]);
    expect(maxInflight).toBe(1);
  });
});

describe('SerialTaskQueue', () => {
  it('runs the second drag only after the first persist finishes, then recomputes', async () => {
    const queue = new SerialTaskQueue();
    let slugs = ['a', 'b', 'c'];
    let persistStarted = 0;
    let firstReleased!: () => void;
    const firstHold = new Promise<void>((resolve) => {
      firstReleased = resolve;
    });

    const drag1 = queue.run(async () => {
      const from = slugs.indexOf('a');
      const to = slugs.indexOf('b');
      const next = [...slugs];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      persistStarted += 1;
      await firstHold;
      slugs = next;
    });
    const drag2 = queue.run(async () => {
      const from = slugs.indexOf('a');
      const to = slugs.indexOf('c');
      const next = [...slugs];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      persistStarted += 1;
      slugs = next;
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(persistStarted).toBe(1);
    firstReleased();
    await Promise.all([drag1, drag2]);
    expect(persistStarted).toBe(2);
    expect(slugs).toEqual(['b', 'c', 'a']);
  });
});

describe('AdminCollectionProductsService', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(
    api: Partial<AdminCollectionsApiService>,
    catalog: Partial<{ updateViaApi: AdminCatalogService['updateViaApi'] }> = {},
  ): AdminCollectionProductsService {
    TestBed.configureTestingModule({
      providers: [
        AdminCollectionProductsService,
        {
          provide: AdminCollectionsApiService,
          useValue: {
            setProducts: () => of(result('organic-dreams', [])),
            getProducts: () => of({ productSlugs: [] }),
            appendProducts: () => of(result('organic-dreams', [])),
            removeProduct: () => of(result('organic-dreams', [])),
            ...api,
          },
        },
        {
          provide: AdminCatalogService,
          useValue: {
            updateViaApi: () => of({ slug: 'vestido', collectionSlug: 'niponic-dreams' }),
            ...catalog,
          },
        },
      ],
    });
    return TestBed.inject(AdminCollectionProductsService);
  }

  it('does not append while STOCKROOM_REORDER_ENABLED is false', async () => {
    if (STOCKROOM_REORDER_ENABLED) return;
    const appends: string[][] = [];
    const service = setup({
      appendProducts: (_slug, productSlugs) => {
        appends.push([...productSlugs]);
        return of(result('organic-dreams', productSlugs));
      },
    });
    service.remember('organic-dreams', ['vestido-longo']);
    const err = await new Promise<Error>((resolve, reject) => {
      service.append('organic-dreams', ['cinto']).subscribe({
        next: () => reject(new Error('expected lock')),
        error: (e: unknown) => resolve(e as Error),
      });
    });
    expect(err.message).toBe(LISTA_ORDER_MAINTENANCE_NOTICE);
    expect(appends).toEqual([]);
    expect(service.current('organic-dreams')).toEqual(['vestido-longo']);
  });

  it('does not replace while LISTA_REORDER_ENABLED is false', async () => {
    if (LISTA_REORDER_ENABLED) return;
    const puts: string[][] = [];
    const service = setup({
      setProducts: (_slug, productSlugs) => {
        puts.push([...productSlugs]);
        return of(result('organic-dreams', productSlugs));
      },
    });
    const err = await new Promise<Error>((resolve, reject) => {
      service.replace('organic-dreams', ['a', 'b']).subscribe({
        next: () => reject(new Error('expected lock')),
        error: (e: unknown) => resolve(e as Error),
      });
    });
    expect(err.message).toBe(LISTA_ORDER_MAINTENANCE_NOTICE);
    expect(puts).toEqual([]);
  });

  it('does not PUT live order while STOCKROOM_REORDER_ENABLED is false', async () => {
    if (STOCKROOM_REORDER_ENABLED) return;
    const puts: string[][] = [];
    const service = setup({
      setProducts: (_slug, productSlugs) => {
        puts.push([...productSlugs]);
        return of(result('organic-dreams', ['arquivo', ...productSlugs]));
      },
      getProducts: () => NEVER,
    });

    const saved = await new Promise<SetCollectionProductsResult>((resolve, reject) => {
      service.replaceLiveOrder('organic-dreams', ['c', 'a', 'b']).subscribe({ next: resolve, error: reject });
    });

    expect(puts).toEqual([]);
    expect(saved.productSlugs).toEqual([]);
  });

  it('PUTs the full member list including archived and draft', async () => {
    if (!STOCKROOM_REORDER_ENABLED) return;
    const puts: string[][] = [];
    const service = setup({
      getProducts: () => of({ productSlugs: ['arquivo', 'draft-x', 'a', 'b', 'c'] }),
      setProducts: (_slug, productSlugs) => {
        puts.push([...productSlugs]);
        return of(result('organic-dreams', productSlugs));
      },
    });
    await new Promise<SetCollectionProductsResult>((resolve, reject) => {
      service.replaceLiveOrder('organic-dreams', ['c', 'a', 'b']).subscribe({ next: resolve, error: reject });
    });
    expect(puts).toEqual([['arquivo', 'draft-x', 'c', 'a', 'b']]);
  });

  it('POSTs append and never a partial PUT', async () => {
    if (!STOCKROOM_REORDER_ENABLED) return;
    const appends: string[][] = [];
    const puts: string[][] = [];
    const service = setup({
      appendProducts: (_slug, productSlugs) => {
        appends.push([...productSlugs]);
        return of(result('organic-dreams', ['a', 'nova']));
      },
      setProducts: (_slug, productSlugs) => {
        puts.push([...productSlugs]);
        return of(result('organic-dreams', productSlugs));
      },
    });
    service.remember('organic-dreams', ['a']);
    await new Promise<SetCollectionProductsResult>((resolve, reject) => {
      service.append('organic-dreams', ['nova']).subscribe({ next: resolve, error: reject });
    });
    expect(appends).toEqual([['nova']]);
    expect(puts).toEqual([]);
    expect(service.current('organic-dreams')).toEqual(['a', 'nova']);
  });

  it('DELETEs a member and never a partial PUT', async () => {
    if (!LISTA_REORDER_ENABLED) return;
    const deleted: string[] = [];
    const puts: string[][] = [];
    const service = setup({
      removeProduct: (_slug, productSlug) => {
        deleted.push(productSlug);
        return of(result('organic-dreams', ['b']));
      },
      setProducts: (_slug, productSlugs) => {
        puts.push([...productSlugs]);
        return of(result('organic-dreams', productSlugs));
      },
    });
    await new Promise<SetCollectionProductsResult>((resolve, reject) => {
      service.remove('organic-dreams', 'a').subscribe({ next: resolve, error: reject });
    });
    expect(deleted).toEqual(['a']);
    expect(puts).toEqual([]);
    expect(service.current('organic-dreams')).toEqual(['b']);
  });

  it('reloads membership from the server after a write error and leaves no optimistic list', async () => {
    if (!STOCKROOM_REORDER_ENABLED) return;
    const service = setup({
      getProducts: () => of({ productSlugs: ['arquivo', 'a', 'b'] }),
      setProducts: () => throwError(() => httpErr(409)),
    });
    service.remember('organic-dreams', ['c', 'a', 'b']);
    const err = await new Promise<HttpErrorResponse>((resolve, reject) => {
      service.replaceLiveOrder('organic-dreams', ['b', 'a']).subscribe({
        next: () => reject(new Error('expected 409')),
        error: (e: unknown) => resolve(e as HttpErrorResponse),
      });
    });
    expect(err.status).toBe(409);
    expect(membershipWriteErrorMessage(err)).toBe(MEMBERSHIP_WRITE_CONFLICT);
    expect(service.current('organic-dreams')).toEqual(['arquivo', 'a', 'b']);
  });

  it('moves a piece between collections with PATCH collectionSlug, not POST append', async () => {
    const patches: { slug: string; payload: { collectionSlug?: string } }[] = [];
    const appends: string[][] = [];
    const service = setup(
      {
        appendProducts: (_slug, productSlugs) => {
          appends.push([...productSlugs]);
          return of(result('niponic-dreams', productSlugs));
        },
        getProducts: (slug) =>
          of({
            productSlugs: slug === 'organic-dreams' ? ['vestido'] : [],
          }),
      },
      {
        updateViaApi: (slug, payload) => {
          patches.push({ slug, payload });
          return of({ slug, collectionSlug: payload.collectionSlug ?? '' }) as ReturnType<
            AdminCatalogService['updateViaApi']
          >;
        },
      },
    );
    service.remember('organic-dreams', ['vestido']);
    service.remember('niponic-dreams', ['jaqueta']);
    await new Promise((resolve, reject) => {
      service
        .persistAddedProduct('niponic-dreams', 'vestido', 'organic-dreams')
        .subscribe({ next: resolve, error: reject });
    });
    expect(patches).toEqual([{ slug: 'vestido', payload: { collectionSlug: 'niponic-dreams' } }]);
    expect(appends).toEqual([]);
    expect(service.current('organic-dreams')).toEqual([]);
    expect(service.current('niponic-dreams')).toEqual(['jaqueta', 'vestido']);
  });

  it('reloads source and destination after a failed collection move', async () => {
    const service = setup(
      {
        getProducts: (slug) =>
          of({
            productSlugs: slug === 'organic-dreams' ? ['vestido'] : ['jaqueta'],
          }),
        appendProducts: () => throwError(() => new Error('append must not run')),
      },
      {
        updateViaApi: () => throwError(() => httpErr(409)),
      },
    );
    service.remember('organic-dreams', []);
    service.remember('niponic-dreams', ['jaqueta', 'vestido']);
    const err = await new Promise<HttpErrorResponse>((resolve, reject) => {
      service.persistAddedProduct('niponic-dreams', 'vestido', 'organic-dreams').subscribe({
        next: () => reject(new Error('expected 409')),
        error: (e: unknown) => resolve(e as HttpErrorResponse),
      });
    });
    expect(err.status).toBe(409);
    expect(service.current('organic-dreams')).toEqual(['vestido']);
    expect(service.current('niponic-dreams')).toEqual(['jaqueta']);
  });
});

describe('partitionAppendResults', () => {
  it('splits successful slugs from per-item errors', () => {
    expect(
      partitionAppendResults([
        { slug: 'a', ok: true },
        { slug: 'b', ok: false, message: 'Falhou' },
      ]),
    ).toEqual({
      added: ['a'],
      failed: [{ slug: 'b', message: 'Falhou' }],
    });
  });
});
