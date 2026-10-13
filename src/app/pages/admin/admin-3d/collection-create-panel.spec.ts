import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CollectionCreatePanel, syncTextInputValue } from './collection-create-panel';

describe('syncTextInputValue', () => {
  it('does not rewrite the DOM while IME composition is active', () => {
    const el = document.createElement('input');
    el.value = 'Ver';
    el.setSelectionRange(3, 3);
    syncTextInputValue(el, 'Verao', true);
    expect(el.value).toBe('Ver');
    expect(el.selectionStart).toBe(3);
  });

  it('skips a write when the value already matches, keeping the caret', () => {
    const el = document.createElement('input');
    document.body.appendChild(el);
    el.value = 'Verao';
    el.focus();
    el.setSelectionRange(2, 2);
    syncTextInputValue(el, 'Verao', false);
    expect(el.value).toBe('Verao');
    expect(el.selectionStart).toBe(2);
    el.remove();
  });

  it('writes an external value and restores the caret when focused', () => {
    const el = document.createElement('input');
    document.body.appendChild(el);
    el.value = 'Ver';
    el.focus();
    el.setSelectionRange(3, 3);
    syncTextInputValue(el, 'Ve', false);
    expect(el.value).toBe('Ve');
    expect(el.selectionStart).toBe(2);
    el.remove();
  });
});

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

  function nameInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('.create-col__editor') as HTMLInputElement;
  }

  it('uses a native text input, not contenteditable', () => {
    const field = nameInput();
    expect(field).toBeTruthy();
    expect(field.tagName).toBe('INPUT');
    expect(field.type).toBe('text');
    expect(field.getAttribute('contenteditable')).toBeNull();
    expect(field.id).toBe('atelier-collection-name');
    expect(field.name).toBe('collectionName');
    expect(field.getAttribute('autocomplete')).toBe('off');
  });

  it('shows a live plate preview and saves on Enter without losing the caret', () => {
    const save = jasmine.createSpy('save');
    component.save.subscribe(save);
    const field = nameInput();
    field.value = 'Organic Dreams';
    field.setSelectionRange(8, 8);
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.componentRef.setInput('name', 'Organic Dreams');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.create-col__plate')?.textContent).toContain(
      'Organic Dreams',
    );
    expect(field.value).toBe('Organic Dreams');
    expect(field.selectionStart).toBe(8);
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(save).toHaveBeenCalled();
  });

  it('keeps typed letters during IME composition', () => {
    const names: string[] = [];
    component.nameChange.subscribe((value) => names.push(value));
    const field = nameInput();
    field.value = 'Ver';
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    field.value = 'Vera';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.componentRef.setInput('name', 'Vera');
    fixture.detectChanges();
    expect(field.value).toBe('Vera');
    field.value = 'Verao';
    field.dispatchEvent(new CompositionEvent('compositionend', { data: 'ao', bubbles: true }));
    fixture.componentRef.setInput('name', 'Verao');
    fixture.detectChanges();
    expect(field.value).toBe('Verao');
    expect(names).toContain('Vera');
    expect(names).toContain('Verao');
  });

  it('becomes a bottom sheet on mobile', () => {
    fixture.componentRef.setInput('sheet', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.create-col--sheet')).toBeTruthy();
  });
});
