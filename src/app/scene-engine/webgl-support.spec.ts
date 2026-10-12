import {
  isWebGLAvailable,
  tryCreate,
  WEBGL_UNAVAILABLE_ACTION,
  WEBGL_UNAVAILABLE_HINT,
  WEBGL_UNAVAILABLE_TITLE,
} from './webgl-support';

describe('isWebGLAvailable', () => {
  it('is false when getContext returns null', () => {
    expect(
      isWebGLAvailable(() => ({
        getContext: () => null,
      })),
    ).toBeFalse();
  });

  it('is false when getContext throws', () => {
    expect(
      isWebGLAvailable(() => ({
        getContext: () => {
          throw new Error('Error creating WebGL context');
        },
      })),
    ).toBeFalse();
  });

  it('is true when a WebGL context exists', () => {
    expect(
      isWebGLAvailable(() => ({
        getContext: (type: string) => (type === 'webgl2' ? ({} as RenderingContext) : null),
      })),
    ).toBeTrue();
  });
});

describe('tryCreate', () => {
  it('returns null when the factory throws, without rethrowing', () => {
    expect(
      tryCreate(() => {
        throw new Error('Error creating WebGL context');
      }),
    ).toBeNull();
  });

  it('returns the created instance', () => {
    expect(tryCreate(() => ({ ok: true }))).toEqual({ ok: true });
  });
});

describe('WebGL empty-state copy', () => {
  it('uses the atelier card title, hardware hint and list action', () => {
    expect(WEBGL_UNAVAILABLE_TITLE).toBe('Seu navegador está com o 3D desativado');
    expect(WEBGL_UNAVAILABLE_HINT).toContain('aceleração de hardware');
    expect(WEBGL_UNAVAILABLE_ACTION).toBe('Voltar para a Lista');
  });
});
