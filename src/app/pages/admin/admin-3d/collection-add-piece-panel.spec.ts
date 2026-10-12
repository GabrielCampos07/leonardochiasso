import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CollectionAddPiecePanel,
  addPiecesActionLabel,
  addedPiecesLabel,
  filterAddPieceCandidates,
  parseAddPiecePrice,
  parseAddPieceStock,
} from './collection-add-piece-panel';

describe('addedPiecesLabel', () => {
  it('uses singular and plural Portuguese', () => {
    expect(addedPiecesLabel(0)).toBe('');
    expect(addedPiecesLabel(1)).toBe('1 peça adicionada');
    expect(addedPiecesLabel(3)).toBe('3 peças adicionadas');
  });
});

describe('addPiecesActionLabel', () => {
  it('includes the selected count', () => {
    expect(addPiecesActionLabel(0)).toBe('Adicionar');
    expect(addPiecesActionLabel(2)).toBe('Adicionar 2');
  });
});

describe('filterAddPieceCandidates', () => {
  const items = [
    { slug: 'cinto', name: 'Cinto de couro' },
    { slug: 'jaqueta', name: 'Jaqueta' },
  ];

  it('filters by name or slug', () => {
    expect(filterAddPieceCandidates(items, 'cin').map((i) => i.slug)).toEqual(['cinto']);
    expect(filterAddPieceCandidates(items, 'JAQU').map((i) => i.slug)).toEqual(['jaqueta']);
    expect(filterAddPieceCandidates(items, '')).toEqual(items);
  });
});

describe('parseAddPiecePrice', () => {
  it('accepts Brazilian decimals and empty optional values', () => {
    expect(parseAddPiecePrice('1.289,90', true)).toEqual({ ok: true, value: 1289.9 });
    expect(parseAddPiecePrice('', false)).toEqual({ ok: true, value: null });
    expect(parseAddPiecePrice('', true).ok).toBeFalse();
    expect(parseAddPiecePrice('-2', true).ok).toBeFalse();
  });
});

describe('parseAddPieceStock', () => {
  it('defaults to 1 and rejects fractions', () => {
    expect(parseAddPieceStock('')).toEqual({ ok: true, value: 1 });
    expect(parseAddPieceStock('4')).toEqual({ ok: true, value: 4 });
    expect(parseAddPieceStock('1.5').ok).toBeFalse();
  });
});

describe('CollectionAddPiecePanel', () => {
  let fixture: ComponentFixture<CollectionAddPiecePanel>;
  let component: CollectionAddPiecePanel;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionAddPiecePanel],
    }).compileComponents();
    fixture = TestBed.createComponent(CollectionAddPiecePanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('unitName', 'Organic Dreams');
    fixture.componentRef.setInput('candidates', [
      { slug: 'cinto', name: 'Cinto' },
      { slug: 'jaqueta', name: 'Jaqueta' },
    ]);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('emits the selected slugs as one grouped list', () => {
    const add = jasmine.createSpy('add');
    component.add.subscribe(add);
    const boxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    boxes[0]?.click();
    boxes[1]?.click();
    fixture.detectChanges();
    const save = fixture.nativeElement.querySelector('.add-piece__save') as HTMLButtonElement;
    expect(save.disabled).toBeFalse();
    save.click();
    expect(add).toHaveBeenCalledWith(['cinto', 'jaqueta']);
  });

  it('keeps failed selection after a partial add and shows the counter', () => {
    const boxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;
    boxes[0]?.click();
    boxes[1]?.click();
    component.finishAdd(['cinto']);
    fixture.componentRef.setInput('addedCount', 3);
    fixture.componentRef.setInput('itemErrors', [{ slug: 'jaqueta', message: 'Falhou' }]);
    fixture.componentRef.setInput('candidates', [{ slug: 'jaqueta', name: 'Jaqueta' }]);
    fixture.detectChanges();
    expect(component.selected.has('cinto')).toBeFalse();
    expect(component.selected.has('jaqueta')).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('3 peças adicionadas');
    expect(fixture.nativeElement.textContent).toContain('Falhou');
    expect((fixture.nativeElement.querySelector('.add-piece__save') as HTMLButtonElement).textContent).toContain(
      'Adicionar 1',
    );
  });

  it('filters the list from search and closes only via X', () => {
    const close = jasmine.createSpy('close');
    component.close.subscribe(close);
    const search = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    search.value = 'jaq';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    const names = [...fixture.nativeElement.querySelectorAll('.add-piece__row span')].map((el) => el.textContent);
    expect(names).toEqual(['Jaqueta']);
    expect(fixture.nativeElement.querySelector('.add-piece__cancel')).toBeNull();
    (fixture.nativeElement.querySelector('.add-piece__close') as HTMLButtonElement).click();
    expect(close).toHaveBeenCalled();
  });

  it('emits a short create payload from the second tab', () => {
    const created = jasmine.createSpy('create');
    component.create.subscribe(created);
    (fixture.nativeElement.querySelectorAll('.add-piece__tab')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const name = fixture.nativeElement.querySelector('input[name="addPieceName"]') as HTMLInputElement;
    const price = fixture.nativeElement.querySelector('input[name="addPiecePrice"]') as HTMLInputElement;
    const stock = fixture.nativeElement.querySelector('input[name="addPieceStock"]') as HTMLInputElement;
    name.value = 'Capa';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    price.value = '289,00';
    price.dispatchEvent(new Event('input', { bubbles: true }));
    stock.value = '2';
    stock.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }));
    expect(created).toHaveBeenCalledWith({
      name: 'Capa',
      price: 289,
      stock: 2,
      photo: null,
    });
    expect((fixture.nativeElement.querySelector('.add-piece__save') as HTMLButtonElement).textContent).toContain(
      'Criar e adicionar',
    );
  });

  it('keeps the create form open and shows a field error instead of emitting', () => {
    const created = jasmine.createSpy('create');
    component.create.subscribe(created);
    (fixture.nativeElement.querySelectorAll('.add-piece__tab')[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    const name = fixture.nativeElement.querySelector('input[name="addPieceName"]') as HTMLInputElement;
    const price = fixture.nativeElement.querySelector('input[name="addPiecePrice"]') as HTMLInputElement;
    name.value = 'Capa';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    price.value = '-10';
    price.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.nativeElement.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }));
    fixture.detectChanges();
    expect(created).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Preço inválido.');
  });

  it('keeps tap targets at least 44px on the sheet', () => {
    fixture.componentRef.setInput('sheet', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.add-piece--sheet')).toBeTruthy();
    const close = fixture.nativeElement.querySelector('.add-piece__close') as HTMLButtonElement;
    expect(getComputedStyle(close).minHeight).toBe('44px');
    expect(getComputedStyle(close).minWidth).toBe('44px');
  });
});
