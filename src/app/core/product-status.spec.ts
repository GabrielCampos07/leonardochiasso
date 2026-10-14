import { productStatusForApi } from './product.model';

describe('productStatusForApi', () => {
  it('sends the DTO field values draft and published', () => {
    expect(productStatusForApi('draft', 'published')).toBe('draft');
    expect(productStatusForApi('published', 'draft')).toBe('published');
  });

  it('does not send archived from the form control — falls back', () => {
    expect(productStatusForApi('archived', 'draft')).toBe('draft');
    expect(productStatusForApi(undefined, 'published')).toBe('published');
  });
});
