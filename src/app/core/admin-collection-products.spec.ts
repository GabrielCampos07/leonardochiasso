import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import {
  LISTA_ORDER_MAINTENANCE_NOTICE,
  LISTA_REORDER_ENABLED,
  STOCKROOM_REORDER_ENABLED,
} from './membership-order';
import {
  ADD_PIECE_STAGGER_MS,
  AdminCollectionProductsService,
  CollectionProductsLock,
  addPieceStaggerDelay,
  appendCollectionProductSlugs,
  mergeLiveOrderIntoMembership,
  partitionAppendResults,
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

describe('AdminCollectionProductsService', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(
    setProducts: (
      slug: string,
      productSlugs: string[],
      opts?: { keepMissing?: boolean },
    ) => ReturnType<AdminCollectionsApiService['setProducts']>,
    getProducts: (slug: string) => ReturnType<AdminCollectionsApiService['getProducts']> = () =>
      of({ productSlugs: [] }),
  ): AdminCollectionProductsService {
    TestBed.configureTestingModule({
      providers: [
        AdminCollectionProductsService,
        { provide: AdminCollectionsApiService, useValue: { setProducts, getProducts } },
      ],
    });
    return TestBed.inject(AdminCollectionProductsService);
  }

  it('does not append while STOCKROOM_REORDER_ENABLED is false', async () => {
    expect(STOCKROOM_REORDER_ENABLED).toBeFalse();
    const puts: string[][] = [];
    const service = setup((_slug, productSlugs) => {
      puts.push([...productSlugs]);
      return of(result('organic-dreams', productSlugs));
    });
    service.remember('organic-dreams', ['vestido-longo']);
    const err = await new Promise<Error>((resolve, reject) => {
      service.append('organic-dreams', ['cinto']).subscribe({
        next: () => reject(new Error('expected lock')),
        error: (e: unknown) => resolve(e as Error),
      });
    });
    expect(err.message).toBe(LISTA_ORDER_MAINTENANCE_NOTICE);
    expect(puts).toEqual([]);
    expect(service.current('organic-dreams')).toEqual(['vestido-longo']);
  });

  it('does not replace while LISTA_REORDER_ENABLED is false', async () => {
    expect(LISTA_REORDER_ENABLED).toBeFalse();
    const puts: string[][] = [];
    const service = setup((_slug, productSlugs) => {
      puts.push([...productSlugs]);
      return of(result('organic-dreams', productSlugs));
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
    const puts: { slugs: string[]; keepMissing?: boolean }[] = [];
    const service = setup(
      (_slug, productSlugs, opts) => {
        puts.push({ slugs: [...productSlugs], keepMissing: opts?.keepMissing });
        return of(result('organic-dreams', ['arquivo', ...productSlugs]));
      },
      () => NEVER,
    );

    const saved = await new Promise<SetCollectionProductsResult>((resolve, reject) => {
      service.replaceLiveOrder('organic-dreams', ['c', 'a', 'b']).subscribe({ next: resolve, error: reject });
    });

    expect(puts).toEqual([]);
    expect(saved.productSlugs).toEqual([]);
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
