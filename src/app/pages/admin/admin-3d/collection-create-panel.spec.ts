import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollectionCreatePanel } from './collection-create-panel';

describe('CollectionCreatePanel', () => {
  let fixture: ComponentFixture<CollectionCreatePanel>;
  let component: CollectionCreatePanel;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CollectionCreatePanel],
    }).compileComponents();
    fixture = TestBed.createComponent(CollectionCreatePanel);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('name', '');
    fixture.componentRef.setInput('line', 'roupas');
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('shows a live plate preview and saves on Enter', () => {
    const save = jasmine.createSpy('save');
    component.save.subscribe(save);
    component.name = 'Organic Dreams';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.create-col__plate')?.textContent).toContain('Organic Dreams');
    const field = fixture.nativeElement.querySelector('.create-col__editor') as HTMLElement;
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(save).toHaveBeenCalled();
  });

  it('becomes a bottom sheet on mobile', () => {
    fixture.componentRef.setInput('sheet', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.create-col--sheet')).toBeTruthy();
  });
});
