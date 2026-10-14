import { TestBed } from '@angular/core/testing';
import { of, tap, delay, throwError } from 'rxjs';
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
    setProducts: (slug: string, productSlugs: string[]) => ReturnType<AdminCollectionsApiService['setProducts']>,
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

  it('groups selected pieces into one PUT that still contains the pieces that already existed', async () => {
    const calls: string[][] = [];
    const service = setup((_slug, productSlugs) => {
      calls.push([...productSlugs]);
      return of(result('organic-dreams', productSlugs));
    });

    service.remember('organic-dreams', ['vestido-longo', 'saia-midi']);
    const saved = await new Promise<SetCollectionProductsResult>((resolve, reject) => {
      service.append('organic-dreams', ['cinto', 'jaqueta']).subscribe({ next: resolve, error: reject });
    });

    expect(calls).toEqual([['vestido-longo', 'saia-midi', 'cinto', 'jaqueta']]);
    expect(saved.productSlugs).toContain('vestido-longo');
    expect(saved.productSlugs).toContain('saia-midi');
    expect(saved.productSlugs.at(-2)).toBe('cinto');
    expect(saved.productSlugs.at(-1)).toBe('jaqueta');
    expect(service.current('organic-dreams')).toEqual(['vestido-longo', 'saia-midi', 'cinto', 'jaqueta']);
  });

  it('serializes two appends so the second PUT includes the first newcomer', async () => {
    const calls: string[][] = [];
    let inflight = 0;
    let maxInflight = 0;
    const service = setup((_slug, productSlugs) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      return of(result('organic-dreams', productSlugs)).pipe(
        delay(20),
        tap(() => {
          inflight -= 1;
          calls.push([...productSlugs]);
        }),
      );
    });

    service.remember('organic-dreams', ['a', 'b']);
    await Promise.all([
      new Promise((resolve, reject) =>
        service.append('organic-dreams', ['c']).subscribe({ next: resolve, error: reject }),
      ),
      new Promise((resolve, reject) =>
        service.append('organic-dreams', ['d']).subscribe({ next: resolve, error: reject }),
      ),
    ]);

    expect(maxInflight).toBe(1);
    expect(calls).toEqual([
      ['a', 'b', 'c'],
      ['a', 'b', 'c', 'd'],
    ]);
  });

  it('falls back to per-item PUTs and keeps the failed slug out of the saved list', async () => {
    let calls = 0;
    const service = setup((_slug, productSlugs) => {
      calls += 1;
      if (calls === 1) return throwError(() => new Error('grouped failed'));
      if (productSlugs.includes('ruim')) return throwError(() => ({ status: 400, error: { message: 'slug inválido' } }));
      return of(result('organic-dreams', productSlugs));
    });

    service.remember('organic-dreams', ['vestido']);
    const batch = await new Promise<{ added: string[]; failed: { slug: string; message: string }[] }>(
      (resolve, reject) => {
        service.tryAppend('organic-dreams', ['boa', 'ruim']).subscribe({ next: resolve, error: reject });
      },
    );

    expect(batch.added).toEqual(['boa']);
    expect(batch.failed.map((item) => item.slug)).toEqual(['ruim']);
    expect(service.current('organic-dreams')).toEqual(['vestido', 'boa']);
  });

  it('keeps archived members on the collection when a 3D drag reorders live hangers', async () => {
    const puts: string[][] = [];
    const service = setup(
      (_slug, productSlugs) => {
        puts.push([...productSlugs]);
        return of(result('organic-dreams', productSlugs));
      },
      () => of({ productSlugs: ['arquivo', 'a', 'b', 'c'] }),
    );

    const saved = await new Promise<SetCollectionProductsResult>((resolve, reject) => {
      service.replaceLiveOrder('organic-dreams', ['c', 'a', 'b']).subscribe({ next: resolve, error: reject });
    });

    expect(puts).toEqual([['arquivo', 'c', 'a', 'b']]);
    expect(saved.productSlugs).toContain('arquivo');
    expect(service.current('organic-dreams')).toEqual(['arquivo', 'c', 'a', 'b']);
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
