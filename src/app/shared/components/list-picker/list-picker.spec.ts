import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LIST_PICKER_LOADING, LcListPicker } from './list-picker';

describe('LcListPicker', () => {
  let fixture: ComponentFixture<LcListPicker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LcListPicker],
    }).compileComponents();
    fixture = TestBed.createComponent(LcListPicker);
    fixture.componentRef.setInput('options', [
      { value: 'organic-dreams', label: 'Organic Dreams' },
    ]);
    fixture.componentRef.setInput('placeholder', 'Selecione a coleção');
    fixture.detectChanges();
  });

  it('shows Carregando… for a preselected value while the catalog loads — never the slug', () => {
    fixture.componentRef.setInput('value', 'teste-colecao2');
    fixture.componentRef.setInput('resolvedLabel', '');
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('#lc-list-picker') as HTMLElement;
    expect(trigger.textContent?.replace(/\s+/g, ' ').trim()).toBe(LIST_PICKER_LOADING);
    expect(trigger.getAttribute('aria-busy')).toBe('true');
    expect(trigger.textContent).not.toContain('teste-colecao2');
    expect(trigger.textContent).not.toContain('Selecione a coleção');
  });

  it('shows the catalog name once it arrives', () => {
    fixture.componentRef.setInput('value', 'teste-colecao2');
    fixture.componentRef.setInput('resolvedLabel', 'TESTE-COLECAO2');
    fixture.componentRef.setInput('loading', false);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('#lc-list-picker') as HTMLElement;
    expect(trigger.textContent?.trim()).toBe('TESTE-COLECAO2');
    expect(trigger.textContent).not.toContain('teste-colecao2');
  });
});
