import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { JoiaPiece } from '../../../core/joias.data';
import { AdminJoiasCatalogService } from '../../../core/admin-joias-catalog.service';
import { ToastService } from '../../../core/feedback/toast.service';
import { PRODUCT_EDIT_MODAL_TITLE_ID } from './product-edit-modal';
import { JoiaEditModal } from './joia-edit-modal';

const piece: JoiaPiece = {
  id: 'colar',
  slug: 'colar-dentes',
  title: 'Colar Dentes',
  description: '',
  price: null,
  priceLabel: 'Sob medida',
};

describe('JoiaEditModal', () => {
  let fixture: ComponentFixture<JoiaEditModal>;
  let close: jasmine.Spy;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [JoiaEditModal],
      providers: [
        { provide: DIALOG_DATA, useValue: { slug: piece.slug, piece } },
        { provide: DialogRef, useValue: { close } },
        { provide: AdminJoiasCatalogService, useValue: { get: () => piece } },
        { provide: ToastService, useValue: { info: () => undefined, success: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JoiaEditModal);
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('renders the jewelry title', () => {
    const heading = fixture.nativeElement.querySelector(`#${PRODUCT_EDIT_MODAL_TITLE_ID}`) as HTMLElement;
    expect(heading.textContent?.trim()).toBe('Editar joia · Colar Dentes');
  });

  it('gives every field an id, name, and autocomplete', () => {
    const fields = fixture.nativeElement.querySelectorAll('input, textarea, select') as NodeListOf<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >;
    expect(fields.length).toBeGreaterThanOrEqual(4);
    for (const field of Array.from(fields)) {
      expect(field.id).toBeTruthy();
      expect(field.name).toBeTruthy();
      expect(field.getAttribute('autocomplete')).toBeTruthy();
    }
  });

  it('closes on Escape while the canvas would have kept focus', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledWith(undefined);
  });

  it('shows Salvando… and disables save while the request is in flight', () => {
    const component = fixture.componentInstance;
    component.saving.set(true);
    fixture.detectChanges();
    const save = fixture.nativeElement.querySelector('.admin-edit__save') as HTMLButtonElement;
    expect(save.disabled).toBeTrue();
    expect(save.getAttribute('aria-busy')).toBe('true');
    expect(save.textContent).toContain('Salvando');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).not.toHaveBeenCalled();
  });
});
