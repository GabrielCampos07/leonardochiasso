import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollectionAddPiecePanel } from './collection-add-piece-panel';

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
    fixture.nativeElement.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }));
    expect(add).toHaveBeenCalledWith(['cinto', 'jaqueta']);
  });
});
