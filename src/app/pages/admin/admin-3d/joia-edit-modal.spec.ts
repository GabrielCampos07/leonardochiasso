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

  it('closes on Escape while the canvas would have kept focus', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(close).toHaveBeenCalledWith(undefined);
  });
});
