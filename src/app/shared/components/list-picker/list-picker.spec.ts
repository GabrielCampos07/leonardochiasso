import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcListPicker } from './list-picker';

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

  it('shows the ?colecao= slug instead of an empty Coleção label', () => {
    fixture.componentRef.setInput('value', 'teste-colecao2');
    fixture.componentRef.setInput('resolvedLabel', 'Coleção');
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector('#lc-list-picker') as HTMLElement;
    expect(trigger.textContent?.replace(/\s+/g, ' ').trim()).toBe('teste-colecao2');
    expect(trigger.textContent).not.toContain('Selecione a coleção');
    expect(trigger.textContent).not.toContain('Coleção');
  });

  it('replaces the slug with the catalog name once it arrives', () => {
    fixture.componentRef.setInput('value', 'teste-colecao2');
    fixture.componentRef.setInput('resolvedLabel', 'TESTE-COLECAO2');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#lc-list-picker')?.textContent?.trim()).toBe(
      'TESTE-COLECAO2',
    );
  });
});
